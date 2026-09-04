import { Card, CardContent, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { capitalize } from "@mui/material/utils";
import { useState, type ReactNode } from "react";
import { ProportionalBar, Swatch } from "./Card";
import { SectionHeader } from "./SectionHeader";
import { dimSx } from "./typography";
import { useSelectBox } from "./SelectBoxHook";
import { topNWithOther, type TopGroup } from "./statsData";
import { format } from "../utils/mathUtils";
import { neutralFill, type Colour } from "../utils/types";
import { useScheme } from "./useScheme";
import { highchartsColors } from "../highcharts";

/** Named so the band below can offer every one of these but the category it is placing. */
interface TopListCardProps<O extends string, T> {
  /** The categories on offer, in select-box order — the order is load-bearing for the palette offset. */
  options: readonly O[];
  defaultOption: O;
  icons: Record<O, ReactNode>;
  /** The groups for an option, already measured and ordered largest-first. */
  groups: (option: O) => TopGroup<T>[];
  /** The colour a group's fronting item wears under this option, or `""` where none exists. */
  colourOf: (option: O, top: T) => Colour | "";
  measureLabel: string;
}

/**
 * A "Top X" card: a category select, a proportional bar over the leading groups, and a ranked
 * legend beneath it.
 *
 * The card owns everything that is the same on every tab — the select box, the top-five-plus-Other
 * reduction, and the colour policy: "Other" is always the neutral bucket, a group whose domain has
 * a colour vocabulary wears it, and one without takes a palette colour offset by the option's
 * index so switching category recolours consistently. What a domain supplies is exactly what
 * varies: its option list (whose order feeds that offset), an icon per option, how to group, and
 * its colour vocabularies.
 */
const TopListCard = <O extends string, T>(props: TopListCardProps<O, T>) => {
  const { options, icons, groups, colourOf, measureLabel } = props;
  const scheme = useScheme();

  const [option, controls] = useSelectBox(options, props.defaultOption);
  const colorOffset = options.indexOf(option) * 3;
  const [hovered, setHovered] = useState<string | null>(null);

  const most = topNWithOther(groups(option));

  const getColour = (struct: (typeof most)[0], index: number) => {
    if (struct.name === "Other") return neutralFill(scheme);
    const groupCol = struct.top ? colourOf(option, struct.top) : "";
    return groupCol || highchartsColors[(index + colorOffset) % highchartsColors.length];
  };

  const items = most.map((struct, index) => ({
    name: struct.name,
    count: struct.count,
    percent: struct.percent,
    colour: getColour(struct, index),
  }));

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card sx={{ height: "100%" }}>
        <SectionHeader
          title={`Top ${capitalize(option)}`}
          icon={icons[option]}
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
                  alignItems: "center",
                  ...dimSx(hovered, item.name),
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
                  noWrap
                  sx={{ flexGrow: 1 }}
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

/**
 * The Top band: one card per category the tab opens on, each free to be re-pointed at any of the
 * options from its own select.
 *
 * The band is a component rather than a fragment and a `.map` at each tab, because how many cards
 * it holds and what identifies one is a decision about the band, not about a tab. What a tab
 * supplies is which categories it opens on — and every other prop is the card's own, passed
 * straight through, so a card gains a prop without this shell learning what it is for.
 */
export const TopCategoryBand = <O extends string, T>({
  defaults,
  ...card
}: Omit<TopListCardProps<O, T>, "defaultOption"> & { defaults: readonly O[] }) => (
  <>
    {defaults.map((category) => (
      <TopListCard
        key={category}
        defaultOption={category}
        {...card}
      />
    ))}
  </>
);
