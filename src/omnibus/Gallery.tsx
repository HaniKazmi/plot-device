import { ExpandCircleDown, PhotoLibrary, Schedule, Sort } from "@mui/icons-material";
import { Box, CardContent, IconButton, Stack, Typography } from "@mui/material";
import { useState, type ReactNode } from "react";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Card";
import { CURRENT_PLAINDATE } from "../common/date";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { FILMSTRIP_HEIGHT, Filmstrip } from "../common/Filmstrip";
import { SectionHeader } from "../common/SectionHeader";
import { useSelectBox } from "../common/SelectBoxHook";
import { IconToggleGroup } from "../common/SelectionComponents";
import { EXPANDED_CARDS, ExpandableCard } from "../common/Stats";
import { format } from "../utils/mathUtils";
import { omniKey, type OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { omniLabels, omniMediumChip } from "./cardData";
import {
  GALLERY_CATEGORIES,
  GALLERY_SORTS,
  galleryColour,
  galleryGroups,
  type GalleryCategory,
  type GallerySort,
  type Shelf as ShelfGroup,
} from "./galleryData";
import { mediumToColour, mediumToName, type Measure } from "./types";
import { LABEL_SX } from "../common/typography";

/**
 * How many shelves the section draws, and how many pictures stand on one before the rest are left
 * to the drill-down.
 *
 * The shelves are ordered by size, so the cut falls where a shelf stops carrying much of the
 * library; the header states the full count, the way the crossings section does, so the cut is
 * visible rather than silent. A shelf's own cut is what keeps a scroll of six strips to a few
 * dozen pictures rather than the whole union laid out sideways.
 */
const SHELVES_SHOWN = 6;
const PICTURES_SHOWN = 20;

/**
 * The band under each picture naming its medium, and how tall it stands.
 *
 * A shelf mixes three media at one height, so which one a picture is has to be said somewhere — and
 * a chip in the corner says it by covering the artwork it is labelling, on every card, on six
 * shelves at once. Under the picture the band has room of its own and the artwork is left whole;
 * it is filled in the medium's colour, the same fill the chart legends and the Media band use.
 *
 * The height is stated rather than left to the line, because the strip fixes its children's height
 * and the artwork takes all of it that this band does not.
 */
const MEDIUM_LABEL_HEIGHT = 22;

/**
 * How many shelves the fullscreen view draws.
 *
 * Derived from the picture budget rather than picked, because a shelf is twenty cards and it is
 * cards that cost: expanded, this holds the same number of them a drill-down dialog does. Grouping
 * by franchise yields 115 shelves against 12 genres, so a view that simply dropped the cap would
 * mount over two thousand cards on one of the four categories and none of the others.
 */
const SHELVES_EXPANDED = Math.floor(EXPANDED_CARDS / PICTURES_SHOWN);

/**
 * How a sort reads, and what it is drawn as.
 *
 * Icons rather than a second select: the barchart directly above this card switches its own four
 * views the same way, and two dropdowns side by side in one header read as one compound setting
 * rather than two independent ones.
 */
const sortControls: Record<GallerySort, { label: string; icon: ReactNode }> = {
  size: { label: "Largest", icon: <Sort /> },
  recent: { label: "Recent", icon: <Schedule /> },
};

/** How a category reads in the header, where the field name alone would mean the other thing. */
const categoryTitles: Record<GalleryCategory, string> = {
  genre: "Genre",
  franchise: "Franchise",
  rating: "Rating",
  // Not the decade it was made in — shows carry no release date — so the header says which decade
  // it means rather than letting the reader assume the home tabs' sense of the word.
  decade: "Decade Met",
};

/**
 * The library as pictures: a shelf per group, each a row of artwork at one height.
 *
 * The three walls this is assembled from do not agree on a shape — banners on the Games tab,
 * posters on the other two — so the mixing is the whole point of the surface, and nothing is
 * cropped to hide it. A picture opens its own tab's expanded card; the shelf's own handle opens the
 * whole shelf, and the section's opens the shelves the collapsed card had no room for.
 */
const Gallery = ({ data, measure }: { data: OmniItem[]; measure: Measure }) => {
  const [category, controls] = useSelectBox(GALLERY_CATEGORIES, "genre");
  const [sort, setSort] = useState<GallerySort>("size");
  const [drilldown, setDrilldown] = useState<ShelfGroup | null>(null);

  const groups = galleryGroups(data, category, measure, sort, CURRENT_PLAINDATE);
  const title = categoryTitles[category];

  return (
    <>
      <ExpandableCard
        expandable={groups.length > SHELVES_SHOWN}
        renderContent={(isDialog, toggle) => {
          // Answered once and shared, so the header states the cut the wall actually makes.
          const limit = isDialog ? SHELVES_EXPANDED : SHELVES_SHOWN;
          const shown = Math.min(groups.length, limit);

          return (
            <>
              <SectionHeader
                icon={<PhotoLibrary />}
                title={`Shelves by ${title}`}
                count={shown < groups.length ? `${format(shown)} of ${format(groups.length)}` : format(groups.length)}
                action={
                  <Stack
                    direction="row"
                    sx={{ alignItems: "center" }}
                  >
                    {controls}
                    <IconToggleGroup
                      options={GALLERY_SORTS}
                      value={sort}
                      setValue={setSort}
                      render={(option) => sortControls[option]}
                    />
                    {toggle}
                  </Stack>
                }
              />
              <CardContent>
                <Stack spacing={2}>
                  {groups.slice(0, limit).map((group) => (
                    <Shelf
                      key={`${category}-${group.name}`}
                      group={group}
                      category={category}
                      measure={measure}
                      onOpen={() => setDrilldown(group)}
                    />
                  ))}
                </Stack>
              </CardContent>
            </>
          );
        }}
      />
      {/* Mounted only while a shelf is picked, so the full list is never built behind a closed
          dialog — a shelf can hold several hundred items where the strip shows twenty. */}
      {drilldown && (
        <DrilldownDialog
          title={`${title} · ${drilldown.name}`}
          onClose={() => setDrilldown(null)}
          content={drilldown.all}
          cardKey={(item) => `${category}-${omniKey(item)}`}
          labelComponent={omniLabels}
          chipComponent={omniMediumChip}
          pictureWidth={[6, 4, 2]}
          MediaComponent={OmniCardMediaImage}
        />
      )}
    </>
  );
};

/**
 * One shelf: what it is called and how much of the library is on it, then the pictures.
 *
 * The name carries a swatch only where the app paints that field elsewhere, so a genre and a
 * certificate are marked and a franchise is not.
 */
const Shelf = ({
  group,
  category,
  measure,
  onOpen,
}: {
  group: ShelfGroup;
  category: GalleryCategory;
  measure: Measure;
  onOpen: () => void;
}) => {
  const colour = galleryColour(group.name, category);

  return (
    <Stack spacing={0.5}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center" }}
      >
        {colour && (
          <Swatch
            colour={colour}
            size={INLINE_SWATCH_SIZE}
          />
        )}
        <Typography
          variant="subtitle2"
          noWrap
        >
          {group.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", flexGrow: 1, fontVariantNumeric: "tabular-nums" }}
        >
          {`${format(group.count)} ${measure}`}
        </Typography>
        <IconButton
          size="small"
          onClick={onOpen}
          aria-label={`Open ${group.name}`}
        >
          <ExpandCircleDown color="action" />
        </IconButton>
      </Stack>
      <Filmstrip height={FILMSTRIP_HEIGHT + MEDIUM_LABEL_HEIGHT}>
        {group.all.slice(0, PICTURES_SHOWN).map((item) => (
          <OmniCardMediaImage
            key={omniKey(item)}
            item={item}
            lazy
            // Stacked whatever the artwork's shape, because the shelf pinned the height: left to
            // the shape rule a poster would take its label in a column beside it and the row would
            // hold two card layouts at two widths.
            mediaLayout="stacked"
            footerComponent={<MediumLabel item={item} />}
            // The shelf fixes the height and each picture keeps its own width, so a banner and a
            // poster stand at one height in the shapes they were made in.
            sx={{ height: FILMSTRIP_HEIGHT, width: "auto", display: "block" }}
          />
        ))}
      </Filmstrip>
    </Stack>
  );
};

/**
 * What a picture is: the band filled in that medium's own colour, the way the badge it replaces
 * was, with type derived from the fill rather than fixed — the same rule every chip and status
 * tile in the app follows, and the reason a gold band and a blue one are both legible.
 */
const MediumLabel = ({ item }: { item: OmniItem }) => {
  const colour = mediumToColour(item.medium);

  return (
    <Box
      sx={(theme) => ({
        height: MEDIUM_LABEL_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingX: 1,
        fontSize: 11,
        fontWeight: 600,
        backgroundColor: colour,
        color: theme.palette.getContrastText(colour),
        ...LABEL_SX,
      })}
    >
      {mediumToName(item.medium)}
    </Box>
  );
};

export default Gallery;
