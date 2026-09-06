import { Box, CardHeader, Stack, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import { MUTED_FIGURE_SX } from "./typography";
import { ScrollFade } from "./ScrollFade";
import { useScrollEdges } from "./useScrollEdges";
import { QUIET_SIDEWAYS_SCROLL } from "./scrollbarSx";

/**
 * The header where the action takes a row of its own below `sm`. A slot that stays beside the title
 * needs no rule at all, `CardHeader`'s own defaults being exactly that.
 */
const STACKED_HEADER_SX = {
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  "& .MuiCardHeader-action": {
    // `CardHeader` pulls its action up and out by 4px and 8px so the controls sit against the
    // card's own edge rather than inside the header's padding. That is right wherever the
    // action is beside the title, so it is restored at `sm` and up and only undone below it,
    // where the action is a row of its own and has nothing to hold itself clear of. In pixels
    // because `sx` reads a bare margin number as theme spacing, which would make `-4` −32px.
    marginTop: { xs: 1, sm: "-4px" },
    marginRight: { xs: 0, sm: "-8px" },
    alignSelf: { xs: "stretch", sm: "flex-start" },
  },
};

/**
 * The action slot below `sm`: one scrolling line rather than a wrap.
 *
 * `CardHeader` gives the action whatever width the title has left, and below `sm` that is the
 * whole card, stacked under the title by `STACKED_HEADER_SX`. A title and three or four 32px parts
 * still do not all fit a phone's width — the sunburst's three pickers, or Movies' and Books'
 * axis and split pickers beside the four view segments — so the row scrolls past its own edge
 * instead of wrapping a picker's label across two lines. `ScrollFade` and the hidden-scrollbar
 * recipe are the rail's own, so a header's overflow reads the same way the section rail's does.
 *
 * Always mounted rather than gated on `usePhone`, since the choice is what a fixed set of `sx`
 * rules already makes: above `sm` the row is unconstrained and never scrolls, so the fades stay
 * off and the wrapper is otherwise inert.
 */
const ActionRow = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();
  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();

  return (
    <ScrollFade
      edges={edges}
      ground={theme.vars.palette.background.paper}
    >
      <Box
        ref={scrollRef}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          overflowX: { xs: "auto", sm: "visible" },
          flexWrap: { xs: "nowrap", sm: "wrap" },
          // A flex item shrinks to fit its container by default, which below `sm` would squeeze
          // the row instead of letting it run past the edge — the one child here is `action`
          // itself, whatever `Stack` or fragment a caller built it from. Above `sm` nothing here
          // is short of room, so holding it at its natural size changes nothing.
          "& > *": { flexShrink: 0 },
          ...QUIET_SIDEWAYS_SCROLL,
        }}
      >
        {children}
      </Box>
    </ScrollFade>
  );
};

/**
 * The header every chart card wears: an icon and a title on the left, how much the section is
 * showing beside the title, and its controls pinned right.
 *
 * Built on `CardHeader` rather than a stack of its own, because the theme already tightens
 * `MuiCardHeader` and a hand-rolled header would need that spacing kept in step by hand.
 *
 * The count is a population, and stated only where it is not the page's own: the section rail's
 * chip says how much of the library the filters left, so a header repeating it is one number
 * printed twice a screen apart. What is left is a section counting something else — "792 seasons"
 * on a tab whose population is shows — which is a figure no other surface offers. Muted and small
 * so it reads as an annotation on the title, and `tabular-nums` so it does not reflow as the
 * filters move it through the digit widths.
 *
 * `title` is rendered at `h6` — the section-title role the theme weights — and the whole line is
 * a `div`, because the count inside it is a `Typography` of its own and a block inside the span
 * `CardHeader` would otherwise wrap the title in is not valid markup.
 *
 * A shell with one visual identity hardcodes its own icon — every barchart is a barchart — while a
 * header a domain builds passes one, because the section it heads is the domain's to name.
 *
 * The icon rides inside the title row rather than in `CardHeader`'s avatar slot: the avatar
 * centres itself against the whole header, and a header whose controls stack two or three selects
 * high leaves the icon floating below the title line it belongs to. The theme pins the content to
 * the top, so a row the icon is part of keeps the two together at any header height.
 *
 * Below `sm` the controls take a row of their own — `ActionRow`, above — rather than sitting
 * beside the title `CardHeader` seats them at by default: a title and three or four controls
 * divide 375px between them and the title wraps to a word a line — "Shelves / by / Genre" beside a
 * select, two toggles and an expand. The action's own negative margins are dropped there with it,
 * since they exist to hold it clear of a title it is not beside at that width, and are kept
 * everywhere else.
 *
 * `compactActions` is the exception, and the caller states it because only the caller knows what it
 * put in the slot: a single icon button costs a title nothing to sit beside, and a row of its own
 * for it is 40px of blank line with an icon at the far end. A card whose only action is its expand
 * toggle passes it — the caller's own test, rather than a measurement, since what the slot holds is
 * known before it is drawn.
 *
 * `titleAction` is the other end of that: a control that belongs beside the title however full the
 * controls row gets, and `FoldedChart` is its only caller. The fold's ⌄ is the one control that
 * cannot travel — a control row that scrolls can carry a setting past its edge, but not the way to
 * the chart those settings are about — so it is seated in the title row instead.
 */
export const SectionHeader = ({
  icon,
  title,
  count,
  action,
  titleAction,
  compactActions,
}: {
  icon?: ReactNode;
  title: string;
  /**
   * What the section is over, already worded by its domain (`common/population.ts`) — "792
   * seasons". Left off wherever that is the page's own population, which the rail states.
   */
  count?: string;
  action?: ReactNode;
  /** A control pinned to the right of the title row, never carried into the scrolling action row. */
  titleAction?: ReactNode;
  /** Whether the action slot holds no more than one icon button, which stays on the title row. */
  compactActions?: boolean;
}) => (
  <CardHeader
    sx={compactActions ? undefined : STACKED_HEADER_SX}
    title={
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center" }}
      >
        {icon}
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "baseline", flexWrap: "wrap", flexGrow: 1, minWidth: 0 }}
        >
          <span>{title}</span>
          {count && (
            <Typography
              variant="body2"
              sx={MUTED_FIGURE_SX}
            >
              {count}
            </Typography>
          )}
        </Stack>
        {titleAction}
      </Stack>
    }
    slotProps={{ title: { variant: "h6", component: "div" } }}
    action={compactActions || !action ? action : <ActionRow>{action}</ActionRow>}
  />
);
