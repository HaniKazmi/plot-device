import { CardHeader, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

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
    avatar={icon}
    title={
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "baseline", flexWrap: "wrap" }}
      >
        <span>{title}</span>
        {count && (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
          >
            {count}
          </Typography>
        )}
      </Stack>
    }
    slotProps={{ title: { variant: "h6", component: "div" } }}
    action={action}
  />
);

export default SectionHeader;
