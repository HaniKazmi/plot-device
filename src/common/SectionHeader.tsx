import { CardHeader, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { MUTED_FIGURE_SX } from "./typography";

/**
 * The header every chart card wears: an icon and a title on the left, how much the section is
 * showing beside the title, and its controls pinned right.
 *
 * Built on `CardHeader` rather than a stack of its own, because the theme already tightens
 * `MuiCardHeader` and a hand-rolled header would need that spacing kept in step by hand.
 *
 * The count is a population, not a figure to read against another: it says what the section is
 * over before the reader looks at the chart, and a title that says "Every playthrough" is worth
 * little without it. Muted and small so it reads as an annotation on the title, and
 * `tabular-nums` so it does not reflow as the filters move it through the digit widths.
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
 * Below `sm` the controls take a row of their own. `CardHeader` seats its action beside the title
 * at every width, so a title and three or four controls divide 375px between them and the title
 * wraps to a word a line — "Shelves / by / Genre" beside a select, two toggles and an expand. The
 * action's own negative margins are dropped there with it, since they exist to hold it clear of a
 * title it is not beside at that width, and are kept everywhere else.
 */
export const SectionHeader = ({
  icon,
  title,
  count,
  action,
}: {
  icon?: ReactNode;
  title: string;
  /** What the section is over, already worded by its domain — "338 games", "612 seasons". */
  count?: string;
  action?: ReactNode;
}) => (
  <CardHeader
    sx={{
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
    }}
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
          sx={{ alignItems: "baseline", flexWrap: "wrap" }}
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
      </Stack>
    }
    slotProps={{ title: { variant: "h6", component: "div" } }}
    action={action}
  />
);
