import { Box, Stack, Typography } from "@mui/material";
import { Swatch } from "../common/Card";
import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { FranchiseStrip } from "../common/FranchiseStrip";
import { useFranchiseUnion } from "../common/franchiseUnion";
import { MUTED_FIGURE_SX, LABEL_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import { franchiseToColour, MEDIA, mediumToColour, mediumUnit } from "../utils/types";
import type { OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { MIXED_CARD_SIZING, workLabels } from "./cardData";
import { mediumBand } from "./mediumBand";
import { franchiseFacts, franchiseWorks } from "./searchData";
import { useOmniItems } from "./omniItems";
import type { YearMonthDay } from "../common/date";

/** The swatch beside the title, a size up from the inline one a ledger row wears. */
const TITLE_SWATCH_SIZE = 14;

/**
 * Every medium the franchise reaches, counted in its own unit and wearing its fill — the strip
 * caption's own legend, stated once above the facts so the header reads before the strip does.
 */
const MediaCounts = ({ items }: { items: OmniItem[] }) => {
  const scheme = useScheme();
  return (
    <Stack
      direction="row"
      spacing={1.5}
      useFlexGap
      sx={{ flexWrap: "wrap" }}
    >
      {MEDIA.map((medium) => {
        const count = items.filter((item) => item.medium === medium).length;
        if (count === 0) return null;
        return (
          <Typography
            key={medium}
            variant="caption"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontWeight: 600 }}
          >
            <Box
              component="span"
              sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: mediumToColour(medium, scheme) }}
            />
            {mediumUnit(medium, count)}
          </Typography>
        );
      })}
    </Stack>
  );
};

const Fact = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Typography
      variant="caption"
      component="div"
      sx={{ ...LABEL_SX, ...MUTED_FIGURE_SX, fontSize: 10.5 }}
    >
      {label}
    </Typography>
    <Typography
      variant="subtitle2"
      sx={{ fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </Typography>
  </Box>
);

/**
 * Everything in one franchise, across the four media.
 *
 * The gallery's franchise drill-down with a header that says what the franchise is before listing
 * it: its media counted, four facts, and the franchise strip drawn with no entry singled out —
 * the view is about the whole series, not one card's place in it. The works below are one card
 * per work, newest first, on the same collapse the shelves use, each opening its own expanded
 * card over this one. Mounting is the caller's, as the drill-down's is.
 */
export const FranchiseView = ({
  franchise,
  epoch,
  onClose,
}: {
  franchise: string;
  /** Where the strip's context bar opens: the union's own epoch, so two views share one scale. */
  epoch: YearMonthDay;
  onClose: () => void;
}) => {
  const scheme = useScheme();
  const items = useOmniItems() ?? [];
  const entries = useFranchiseUnion(franchise) ?? [];
  const own = items.filter((item) => item.franchise === franchise);
  const works = franchiseWorks(items, franchise, CURRENT_PLAINDATE);
  const facts = franchiseFacts(own);
  const colour = franchiseToColour({ franchise }, scheme);

  return (
    <DrilldownDialog
      title={
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
          {colour && (
            <Swatch
              colour={colour}
              size={TITLE_SWATCH_SIZE}
            />
          )}
          <span>{franchise}</span>
          <Typography
            variant="body2"
            component="span"
            sx={MUTED_FIGURE_SX}
          >
            {works.length === 1 ? "1 work" : `${works.length} works`}
          </Typography>
        </Stack>
      }
      onClose={onClose}
      header={
        own.length > 0 && (
          <Stack
            spacing={2}
            sx={{ paddingX: 2, paddingBottom: 1 }}
          >
            <MediaCounts items={own} />
            <Stack
              direction="row"
              spacing={3}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Fact
                label="First met"
                value={String(facts.firstYear)}
              />
              <Fact
                label="Last"
                value={facts.last ? formatDate(facts.last) : "Now"}
              />
              <Fact
                label="Hours"
                value={String(facts.hours)}
              />
              <Fact
                label="Media"
                value={`${facts.media} of ${MEDIA.length}`}
              />
            </Stack>
            {entries.length > 1 && (
              <FranchiseStrip
                entries={entries}
                franchise={franchise}
                epoch={epoch}
                today={CURRENT_PLAINDATE}
              />
            )}
          </Stack>
        )
      }
      content={works}
      cardKey={(item) => `franchise-${item.key}`}
      labelComponent={workLabels}
      band={mediumBand(scheme)}
      rowSizing={MIXED_CARD_SIZING}
      MediaComponent={OmniCardMediaImage}
    />
  );
};
