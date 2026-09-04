import { ExpandCircleDown } from "@mui/icons-material";
import { useState, type ReactNode } from "react";
import type { CardMediaImageProps, TypedCardMediaImage } from "./Card";
import type { ArtworkShape } from "./cardArrangement";
import { DrilldownDialog } from "./DrilldownDialog";
import { StatList, type GridListLayout, type StatListBaseProps } from "./Stats";
import { groupCaption, type DrilldownGroup } from "./statsData";

/**
 * A strip of grouped cards that drills into a group: each card fronts its group with the group's
 * biggest item, and opening one lists that group's members fullscreen.
 *
 * The card owns everything that is the same on every tab — the open handle, the expand badge that
 * sets it, mounting the dialog only while a group is picked, and the key a drill-down card carries
 * (the option prefixes it, so switching category remounts the grid rather than reusing cards under
 * a different grouping). What a domain supplies is what varies: its groups, how a group and a
 * member label themselves, which badge a member wears, the artwork and the colour its fronting
 * item wears.
 */
export const GroupedStatList = <T,>(props: {
  icon: ReactNode;
  title: string;
  controls?: ReactNode;
  /** The category the groups were built under; it prefixes the drill-down's card keys. */
  option: string;
  /** The groups, already measured and ordered largest-first. */
  groups: DrilldownGroup<T>[];
  labelComponent: (group: DrilldownGroup<T>) => string[][];
  /** The colour a group's fronting item wears, in whatever vocabulary the option speaks. */
  colourOf: (top: T) => CardMediaImageProps["colour"];
  MediaComponent: TypedCardMediaImage<T>;
  /** The order the drill-down opens in, applied to the one group picked. */
  dialogSort: (items: T[]) => T[];
  nameOf: (item: T) => string;
  dialogLabelComponent: (item: T) => string[][];
  dialogChipComponent?: (item: T) => CardMediaImageProps["chip"];
  width: StatListBaseProps<T>["width"];
  /** Grouped cards are one shape and the strip a grid; the drill-down takes the second spans. */
  pictureWidth: GridListLayout["pictureWidth"];
  dialogPictureWidth: GridListLayout["dialogPictureWidth"];
  shape?: ArtworkShape;
  divider?: boolean;
  /** How many groups the collapsed strip holds, where the shell's default is the wrong number. */
  collapsed?: number;
}) => {
  const { option, colourOf, MediaComponent, dialogSort, nameOf, dialogPictureWidth, shape } = props;
  const [dialogContent, setDialogContent] = useState<DrilldownGroup<T> | null>(null);

  const dialog = dialogContent ? (
    <DrilldownDialog
      title={dialogContent.name}
      onClose={() => setDialogContent(null)}
      // Sorted at open rather than when the groups are built, which would sort every category on
      // every render to serve the one being drilled into.
      content={dialogSort(dialogContent.all)}
      cardKey={(entry) => option + "-statslistcard-" + nameOf(entry)}
      labelComponent={props.dialogLabelComponent}
      chipComponent={props.dialogChipComponent}
      pictureWidth={dialogPictureWidth}
      shape={shape}
      MediaComponent={MediaComponent}
    />
  ) : null;

  return (
    <>
      <StatList
        icon={props.icon}
        controls={props.controls}
        title={props.title}
        content={props.groups}
        collapsed={props.collapsed}
        chipComponent={(entry) => ({
          icon: <ExpandCircleDown color="action" />,
          onClick: () => setDialogContent(entry),
        })}
        labelComponent={props.labelComponent}
        captionOf={(entry) => groupCaption(props.labelComponent(entry), entry.name)}
        MediaComponent={(cardProps) => (
          <MediaComponent
            {...cardProps}
            item={cardProps.item.top}
            colour={colourOf(cardProps.item.top)}
          />
        )}
        nameComponent={(entry) => entry.name}
        width={props.width}
        pictureWidth={props.pictureWidth}
        dialogPictureWidth={dialogPictureWidth}
        shape={shape}
        divider={props.divider}
      />
      {dialog}
    </>
  );
};
