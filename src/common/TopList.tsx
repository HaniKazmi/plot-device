import { Card, CardContent, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useState, type ReactNode } from "react";
import { ProportionalBar, Swatch } from "./Card";
import { SectionHeader } from "./SectionHeader";
import { format } from "../utils/mathUtils";

export interface TopListItem {
  name: string;
  count: number;
  percent: number;
  colour: string;
}

/**
 * A "Top X" card: a proportional bar over the leading groups with a ranked legend beneath it.
 *
 * Items arrive already coloured and already reduced to percentages — how a domain groups, caps
 * and colours its categories is exactly what varies between tabs, so none of it lives here.
 * What is shared is the presentation and the hover: pointing at a legend row or a bar segment
 * dims everything else, tying the two together.
 */
export const TopListCard = ({
  title,
  icon,
  controls,
  items,
  measureLabel,
}: {
  title: string;
  icon: ReactNode;
  controls?: ReactNode;
  items: TopListItem[];
  measureLabel: string;
}) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card sx={{ height: "100%" }}>
        <SectionHeader
          title={title}
          icon={icon}
          action={controls}
        />
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 1 },
            height: "100%",
          }}
        >
          <ProportionalBar
            items={items}
            hovered={hovered}
            onHover={setHovered}
          />
          <Stack
            direction="column"
            spacing={1}
            sx={{
              alignItems: "stretch",
              mt: 2,
            }}
          >
            {items.map((item) => (
              <Stack
                key={`col-${item.name}`}
                direction="row"
                spacing={1}
                onMouseEnter={() => setHovered(item.name)}
                onMouseLeave={() => setHovered(null)}
                sx={{
                  width: "100%",
                  alignItems: "center",
                  opacity: hovered && hovered !== item.name ? 0.3 : 1,
                  transition: "opacity 0.2s",
                  cursor: "default",
                }}
              >
                <Swatch
                  colour={item.colour}
                  // Larger than the inline mark a wrapping legend uses: this legend is a ranked
                  // column, so the swatch leads each row rather than sitting inside a line of it.
                  size={16}
                />
                <Typography
                  variant="body2"
                  sx={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {item.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ flexShrink: 0 }}
                >
                  {`${format(item.count)} ${measureLabel}`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};
