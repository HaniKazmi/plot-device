import { Box, ButtonBase, Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useState, type ReactNode } from "react";
import { usePhone } from "./breakpoints";

/**
 * The ⌄ that reveals the chart, turned over to ⌃ once it is drawn.
 *
 * One glyph rotated rather than two, so the control the reader presses is the same object before
 * and after — a swap would read as a different button appearing where the last one was pressed.
 */
const CHEVRON_SX = { transition: "transform 150ms", transform: "rotate(180deg)" } as const;

/**
 * The fold row as a second way in.
 *
 * The summary and its picture are what a reader is looking at when they decide they want the
 * chart, and the ⌄ is a 32px target at the far end of the card from them; the row answers the same
 * press, so a thumb resting on the words does not have to travel. It is a `ButtonBase` for the
 * press feedback alone — a `div` and out of the tab order, since the ⌄ in the header is the named
 * control and a second stop for one action is a tab that reports nothing new. Laid out as the
 * block it stands in rather than as a button: the centring and the type `ButtonBase` imposes are
 * for a label, and this is a paragraph over a sparkline.
 */
const FOLD_ROW_SX = {
  display: "block",
  width: "100%",
  textAlign: "left",
  borderRadius: 1,
  cursor: "pointer",
} as const;

/** How tall a preview stands: enough for a shape, short enough that it is not the chart. */
const SPARK_HEIGHT = 44;
/** A column with nothing in it still says the year happened. */
const SPARK_FLOOR = 2;

/** What a folded card states in place of its chart, built only where one is folded. */
export interface Fold {
  /** What the chart says, in one line, for a reader who does not open it. */
  summary: string;
  /** The chart's shape at a glance: a sparkline, a proportional bar. */
  preview?: ReactNode;
}

/** What a caller's header is told about the state it is heading. */
export interface FoldHeader {
  /**
   * Whether the chart itself is on screen — always true from `sm` up, where nothing folds.
   *
   * A header's live controls are the caller's to withhold on this: a split, a view or a set of
   * rings is a choice about a chart that is not mounted, and a folded card's one line is drawn
   * from the same pivot whatever they say, so pressing one changes nothing the reader can see.
   */
  shown: boolean;
  /** The ⌄ that reveals the chart, for the header's own control slot. Nothing from `sm` up. */
  toggle: ReactNode;
}

interface FoldProps {
  /**
   * The card's own `SectionHeader`, which heads both states — built from what the fold tells it,
   * so the controls it carries and the ⌄ it ends with follow the state rather than being drawn
   * over a chart that is not there.
   */
  header: (fold: FoldHeader) => ReactNode;
  /**
   * The line and the picture the fold stands on, as a thunk.
   *
   * A thunk because both are derived from the chart's own data — a second pivot of the barchart,
   * the sunburst's first ring — and from `sm` up nothing reads them. Called past the width check
   * and once for the pair, so a card that needs the same pivot for both does not build it twice.
   * `Card`'s `detailComponent` defers a subtree the same way.
   */
  fold: () => Fold;
  children: ReactNode;
}

/**
 * A chart card that opens on request.
 *
 * On a phone the charts are the most expensive thing on the page and the least of what it is for:
 * a sunburst, a barchart and a timeline cost about three screens of scrolling before the library
 * a reader came to browse. Folded, each is its header, a picture of its own shape and one line of
 * words — which is what most readings of a chart come to anyway — and the chart itself mounts only
 * when asked for. From `sm` up nothing here applies and the card is the card it always was.
 *
 * `children` bring their own `CardContent`, so a chart keeps whatever padding its own shell asks
 * for and this shell owns only the card, the header and the fold row.
 *
 * The state is a card's own and lives for as long as the page does: leaving the tab unmounts it,
 * which is the same answer a reader gets from every other chart control here.
 */
export const FoldedChart = (props: FoldProps) => (
  <Card>
    <FoldedContent {...props} />
  </Card>
);

/**
 * The same card without its `Card`, for a section that already stands in one.
 *
 * `ExpandableCard` owns the card it can also present fullscreen, so a section that both folds on a
 * phone and opens a dialog — the crossings — nests this inside that card rather than putting one
 * card's border and corners inside another's.
 */
export const FoldedContent = ({ header, fold, children }: FoldProps) => {
  const phone = usePhone();
  const [shown, setShown] = useState(false);

  if (!phone)
    return (
      <>
        {header({ shown: true, toggle: null })}
        {children}
      </>
    );

  const { summary, preview } = fold();
  const toggle = (
    <IconButton
      aria-label={shown ? "Hide chart" : "Show chart"}
      aria-expanded={shown}
      onClick={() => setShown(!shown)}
    >
      <ExpandMore sx={shown ? CHEVRON_SX : undefined} />
    </IconButton>
  );

  return (
    <>
      {header({ shown, toggle })}
      {shown && children}
      <CardContent>
        <ButtonBase
          component="div"
          tabIndex={-1}
          onClick={() => setShown(!shown)}
          sx={FOLD_ROW_SX}
        >
          <Stack spacing={1}>
            {!shown && preview}
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {summary}
            </Typography>
          </Stack>
        </ButtonBase>
      </CardContent>
    </>
  );
};

/**
 * A column per value at its share of the largest, as a row of boxes rather than a chart.
 *
 * The barchart's preview is the shape of its own pivot — where the library's years are heavy and
 * where they are thin — and that shape is a dozen `div`s. Mounting a charting library to draw it
 * would cost the whole thing the fold exists to defer.
 */
export const Sparkline = ({ values }: { values: number[] }) => {
  const peak = Math.max(...values, 0);
  if (values.length === 0 || peak === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={0.25}
      aria-hidden
      sx={{ height: SPARK_HEIGHT, alignItems: "flex-end" }}
    >
      {values.map((value, index) => (
        <Box
          key={index}
          sx={{
            flexGrow: 1,
            flexBasis: 0,
            borderRadius: 0.5,
            backgroundColor: "primary.main",
            height: Math.max((value / peak) * SPARK_HEIGHT, SPARK_FLOOR),
          }}
        />
      ))}
    </Stack>
  );
};
