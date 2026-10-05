import { Article, CalendarMonth, History, Layers, Palette, Place, TheaterComedy } from "@mui/icons-material";
import { Card, CardContent, Link, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { LedgerList } from "../common/Card";
import { CURRENT_PLAINDATE, CURRENT_YEAR, type YearNumber } from "../common/date";
import { yearPredicates, type YearType } from "../common/filterReducer";
import type { OmniItem } from "../common/medium";
import { countByMedium } from "../common/medium";
import { NoticeCard } from "../common/NoticeCard";
import { Section, SectionRail, StatBand } from "../common/SectionRail";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption, type YearDispatch } from "../common/SelectionComponents";
import { StatCard, TotalsBand } from "../common/Stats";
import { Swatch } from "../common/Swatch";
import { TopCategoryBand } from "../common/TopList";
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
  franchiseItems,
  franchiseLines,
  franchiseRank,
  franchiseTop,
  franchiseYears,
  rankedTops,
  type FranchiseTop,
} from "./franchiseData";
import { FRANCHISE_CHIPS, FRANCHISE_SECTIONS } from "./sections";

const MEASURES: readonly SegmentOption<Measure>[] = segments(["Hours", "Items"] as const);

/** The two ranked cards the page opens on, each free to be re-pointed from its own select. */
const DEFAULT_TOPS: readonly FranchiseTop[] = ["genre", "where"];

/**
 * The ranked cards whose groups are values of a filter category, so each leads to everything
 * carrying it. Style alone: Where mixes a platform, a network and a format under one word, the
 * decade is no narrowing, and the genre card counts every genre an item carries where the genre
 * category reads the first — a secondary genre's group would open a layer missing the works it counts.
 */
const LINKED_TOPS: readonly FranchiseTop[] = ["style"];

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
  // A card ranking one value is a single full bar; the dossier states that value in a line instead.
  const tops = rankedTops(own);
  // The year scope narrows the timeline alone, the one section that sets it, by the year each item
  // closed as the Omnibus reads it.
  const inScope = yearPredicates<OmniItem>(scope, (item) => item.year);
  const scoped = own.filter((item) => inScope.every((keep) => keep(item)));
  const dispatch: YearDispatch = (action) => setScope({ yearType: action.yearType, yearTo: action.yearTo });

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
              categories={LINKED_TOPS}
            />
          </StatBand>
        </Section>
        <Section id={FRANCHISE_SECTIONS.when}>
          <OmniTimeline
            data={scoped}
            yearType={scope.yearType}
            yearTo={scope.yearTo}
            grouping="series"
            // Opening on Pictures: a franchise is few enough works for every one to be its own
            // picture at full size, which a tab's library reaches only by scrolling sideways.
            initialLayout="Pictures"
            dispatch={dispatch}
            title="When"
          />
        </Section>
        {/* Its own section rather than a second reading behind a switch in When: a switch there
            hides one of the two, and the timeline's header already holds what a mark is and how
            the marks are laid out. */}
        <Section id={FRANCHISE_SECTIONS.years}>
          <OmnibusBarchart
            data={own}
            measure={measure}
          />
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
