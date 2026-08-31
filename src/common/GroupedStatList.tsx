import { ExpandCircleDown } from "@mui/icons-material";
import { useState, type ReactNode } from "react";
import type { CardMediaImageProps, TypedCardMediaImage } from "./Card";
import { DrilldownDialog } from "./DrilldownDialog";
import { StatList, type StatsListProps } from "./Stats";
import type { DrilldownGroup } from "./statsData";

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
  width: StatsListProps<T>["width"];
  pictureWidth: StatsListProps<T>["pictureWidth"];
  dialogPictureWidth: StatsListProps<T>["dialogPictureWidth"];
  divider?: boolean;
}) => {
  const { option, colourOf, MediaComponent, dialogSort, nameOf, dialogPictureWidth } = props;
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
        chipComponent={(entry) => ({
          icon: <ExpandCircleDown color="action" />,
          onClick: () => setDialogContent(entry),
        })}
        labelComponent={props.labelComponent}
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
        divider={props.divider}
      />
      {dialog}
    </>
  );
};
