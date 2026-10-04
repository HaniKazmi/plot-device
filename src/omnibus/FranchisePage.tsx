import { Article, CalendarMonth, History, Layers, Palette, Place, TheaterComedy } from "@mui/icons-material";
import { Card, CardContent, Link, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { LedgerList } from "../common/Card";
import { CURRENT_PLAINDATE, CURRENT_YEAR, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import type { OmniItem } from "../common/medium";
import { countByMedium } from "../common/medium";
import { NoticeCard } from "../common/NoticeCard";
import { Section, SectionRail, StatBand } from "../common/SectionRail";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption, type YearDispatch } from "../common/SelectionComponents";
import { StatCard, TotalsBand } from "../common/Stats";
import { Swatch } from "../common/Swatch";
import { TopCategoryBand } from "../common/TopList";
import type { TimelineLayout } from "../common/TimelineSection";
import { segments } from "../common/segments";
import { useScheme } from "../common/useScheme";
import { franchiseToColour, MEDIA, mediumToColour, mediumToLabel, mediumUnit } from "../utils/types";
import type { Library } from "../app/library";
import { measureOf } from "../app/library";
import { galleryColour, worksIn } from "../app/galleryData";
import { MediaCounts } from "../app/MediaCounts";
import type { Measure } from "../app/types";
import { barColour, useCurrentTab } from "../tabs";
import OmnibusBarchart from "./Barchart";
import FranchiseCredits from "./FranchiseCredits";
import FranchiseLibrary from "./FranchiseLibrary";
import FranchiseProviders from "./FranchiseProviders";
import OmniTimeline from "./Timeline";
import {
  dossierRows,
  FRANCHISE_TOPS,
  franchiseItems,
  franchiseLines,
  franchiseRank,
  franchiseTop,
  franchiseYears,
  sharedValue,
  type FranchiseTop,
} from "./franchiseData";
import { FRANCHISE_CHIPS, FRANCHISE_SECTIONS } from "./sections";

const MEASURES: readonly SegmentOption<Measure>[] = segments(["Hours", "Items"] as const);

/** The two readings of when a franchise ran: its entries on a timeline, or its hours year by year. */
type Reading = "timeline" | "years";

const READINGS: readonly SegmentOption<Reading>[] = [
  { value: "timeline", label: "Timeline" },
  { value: "years", label: "By year" },
];

/**
 * The timeline's layouts, opening on Pictures: a franchise is few enough items for every one of
 * them to be its own picture, where a tab's library of hundreds would be lanes of thumbnails.
 */
const WHEN_LAYOUTS: readonly TimelineLayout[] = ["Pictures", "Across", "Stacked", "Grid"];

/** The two ranked cards the page opens on, each free to be re-pointed from its own select. */
const DEFAULT_TOPS: readonly FranchiseTop[] = ["genre", "where"];

const TOP_ICONS: Record<FranchiseTop, ReactNode> = {
  genre: <TheaterComedy />,
  where: <Place />,
  style: <Palette />,
  decade: <CalendarMonth />,
};

/**
 * One franchise across every medium the reader met it in: how much of it there is, when it ran,
 * who made it, and every work of it on shelves.
 *
 * The page is the Omnibus's own sections over one franchise's rows, so a figure here and the same
 * figure on the Omnibus cannot be counted two ways. It holds its own measure and its own year
 * scope rather than the Omnibus's: the rail's filters narrow the whole union, and a franchise
 * reached from search is not a narrowing of whatever the Omnibus was last left showing.
 */
const FranchisePage = ({ franchise, library, items }: { franchise: string; library: Library; items: OmniItem[] }) => {
  const scheme = useScheme();
  const tab = useCurrentTab();
  const [measure, setMeasure] = useState<Measure>("Hours");
  const [reading, setReading] = useState<Reading>("timeline");
  const [scope, setScope] = useState<{ yearType: YearType; yearTo: YearNumber }>({
    yearType: "upto",
    yearTo: CURRENT_YEAR,
  });
  const own = franchiseItems(items, franchise);
  if (own.length === 0) {
    return (
      <NoticeCard
        title={`Nothing called ${franchise}`}
        body="No game, show, film or book in the library names this franchise."
        action={
          <Link
            component={RouterLink}
            to="/omnibus"
          >
            Back to the Omnibus
          </Link>
        }
      />
    );
  }

  const colour = franchiseToColour({ franchise }, scheme);
  const { rank, of } = franchiseRank(items, franchise);
  const counts = countByMedium(own);
  const mixed = Object.keys(counts).length > 1;
  // A card ranking one value is a single full bar; the dossier states that value in a line instead,
  // by the same test (`sharedValue`), so the card and the line cannot both stand or both be absent.
  const tops = FRANCHISE_TOPS.filter((top) => top !== "where" || !sharedValue(own, (item) => item.venue));
  const dispatch: YearDispatch = (action) => setScope({ yearType: action.yearType, yearTo: action.yearTo });
  const lead = (
    <SegmentedControl
      options={READINGS}
      value={reading}
      onChange={setReading}
      ariaLabel="When as"
    />
  );

  return (
    <FranchiseProviders library={library}>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Link
            component={RouterLink}
            to="/omnibus"
            variant="body2"
            underline="hover"
          >
            ‹ Omnibus
          </Link>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center" }}
          >
            {colour && (
              <Swatch
                colour={colour}
                size={20}
              />
            )}
            <Typography
              variant="h4"
              component="h1"
            >
              {franchise}
            </Typography>
          </Stack>
          <MediaCounts
            counts={counts}
            wordFor={mediumUnit}
            scheme={scheme}
          />
        </Stack>
        <SectionRail
          sections={FRANCHISE_CHIPS}
          measure={
            <SegmentedControl
              options={MEASURES}
              value={measure}
              onChange={setMeasure}
              ariaLabel="Count in"
            />
          }
          phoneGround={barColour(tab, scheme)}
        />
        <Section id={FRANCHISE_SECTIONS.vitals}>
          <StatBand>
            <StatCard
              icon={<History />}
              title="All time"
              content={[
                ["Hours", measureOf(own, "Hours")],
                ["Works", worksIn(own)],
                ["Years", franchiseYears(own, CURRENT_PLAINDATE)],
                [`Rank of ${of}`, rank],
              ]}
              span={{ xs: 12, sm: 12, md: mixed ? 6 : 12 }}
            />
            {mixed && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <TotalsBand
                      title="Media"
                      icon={<Layers />}
                      data={own}
                      measureFunc={(rows) => measureOf(rows, measure)}
                      group={MEDIA}
                      groupOf={(item) => item.medium}
                      groupToColour={(medium) => mediumToColour(medium, scheme)}
                      groupToLabel={mediumToLabel}
                      measureLabel={measure}
                    />
                  </CardContent>
                </Card>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: "100%" }}>
                <SectionHeader
                  icon={<Article />}
                  title="Dossier"
                />
                <CardContent>
                  <LedgerList
                    rows={dossierRows(own, franchiseLines(own, CURRENT_PLAINDATE), CURRENT_PLAINDATE)}
                    columns={{ xs: 1, md: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            <TopCategoryBand
              defaults={DEFAULT_TOPS.filter((top) => tops.includes(top))}
              options={tops}
              icons={TOP_ICONS}
              groups={(top) => franchiseTop(own, top, measure)}
              colourOf={(top, name: string) => (top === "where" ? "" : (galleryColour(name, top, scheme) ?? ""))}
              measureLabel={measure}
            />
          </StatBand>
        </Section>
        <Section id={FRANCHISE_SECTIONS.when}>
          {reading === "timeline" ? (
            <OmniTimeline
              data={own}
              yearType={scope.yearType}
              yearTo={scope.yearTo}
              grouping="series"
              layouts={WHEN_LAYOUTS}
              dispatch={dispatch}
              title="When"
              lead={lead}
            />
          ) : (
            <OmnibusBarchart
              data={own}
              measure={measure}
              lead={lead}
            />
          )}
        </Section>
        <Section id={FRANCHISE_SECTIONS.credits}>
          <FranchiseCredits
            items={own}
            library={items}
          />
        </Section>
        <Section id={FRANCHISE_SECTIONS.library}>
          <FranchiseLibrary items={own} />
        </Section>
      </Stack>
    </FranchiseProviders>
  );
};

export default FranchisePage;
