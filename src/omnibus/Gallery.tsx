import { ExpandCircleDown, PhotoLibrary } from "@mui/icons-material";
import { Card, CardContent, IconButton, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Card";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { FILMSTRIP_HEIGHT, Filmstrip } from "../common/Filmstrip";
import { SectionHeader } from "../common/SectionHeader";
import { useSelectBox } from "../common/SelectBoxHook";
import type { DrilldownGroup } from "../common/statsData";
import { format } from "../utils/mathUtils";
import { omniKey, type OmniItem } from "./adapter";
import OmniCardMediaImage from "./CardMediaImage";
import { omniLabels, omniMediumChip } from "./cardData";
import {
  GALLERY_CATEGORIES,
  galleryColour,
  galleryGroups,
  galleryStripOrder,
  type GalleryCategory,
} from "./galleryData";
import type { Measure } from "./types";

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
 * whole shelf.
 */
const Gallery = ({ data, measure }: { data: OmniItem[]; measure: Measure }) => {
  const [category, controls] = useSelectBox(GALLERY_CATEGORIES, "genre");
  const [drilldown, setDrilldown] = useState<DrilldownGroup<OmniItem> | null>(null);

  const groups = galleryGroups(data, category, measure);
  const title = categoryTitles[category];

  return (
    <>
      <Card>
        <SectionHeader
          icon={<PhotoLibrary />}
          title={`Shelves by ${title}`}
          count={
            groups.length > SHELVES_SHOWN
              ? `${format(SHELVES_SHOWN)} of ${format(groups.length)}`
              : format(groups.length)
          }
          action={controls}
        />
        <CardContent>
          <Stack spacing={2}>
            {groups.slice(0, SHELVES_SHOWN).map((group) => (
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
      </Card>
      {/* Mounted only while a shelf is picked, so the full list is never built behind a closed
          dialog — a shelf can hold several hundred items where the strip shows twenty. */}
      {drilldown && (
        <DrilldownDialog
          title={`${title} · ${drilldown.name}`}
          onClose={() => setDrilldown(null)}
          content={galleryStripOrder(drilldown.all)}
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
  group: DrilldownGroup<OmniItem>;
  category: GalleryCategory;
  measure: Measure;
  onOpen: () => void;
}) => {
  const colour = galleryColour(group.name, category);
  const shown = galleryStripOrder(group.all);

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
      <Filmstrip height={FILMSTRIP_HEIGHT}>
        {shown.slice(0, PICTURES_SHOWN).map((item) => (
          <OmniCardMediaImage
            key={omniKey(item)}
            item={item}
            lazy
            chip={omniMediumChip(item)}
            // Bare artwork, so the shelf fixes the height and each picture keeps its own width: a
            // banner and a poster stand at one height in the shapes they were made in. Nothing here
            // carries words, which is the one surface the arrangement rule has nothing to say about.
            sx={{ height: FILMSTRIP_HEIGHT, width: "auto", display: "block" }}
          />
        ))}
      </Filmstrip>
    </Stack>
  );
};

export default Gallery;
