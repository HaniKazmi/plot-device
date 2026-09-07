import { Search } from "@mui/icons-material";
import { Box, Chip, Dialog, InputBase, Stack, Typography, type Theme } from "@mui/material";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { usePhone } from "./breakpoints";
import { SheetBar } from "./SheetBar";
import { SegmentedControl, type SegmentOption } from "./SelectionComponents";
import type { SearchMode } from "./searchOpen";
import { COARSE_CONTROL_HEIGHT, focusRingSx, LABEL_SX, MUTED_FIGURE_SX } from "./typography";
import { cut } from "./population";

/**
 * One thing a value can be pressed for: the layer it opens, the page it narrows, the tab it takes
 * the reader to. The wording and the figure are the caller’s and `lead` is whatever mark it wants
 * beside them, so the shell never learns what a medium is.
 *
 * `line` is which of the strip’s two rows it stands on, stated rather than left to wrap: the first
 * holds the readings that leave the reader where they are, the second the ones that move them, and
 * a wrap would put that boundary wherever the widest value happened to push it.
 */
export interface PaletteReading {
  key: string;
  label: string;
  /** What it holds, already formatted — absent where the reading has no honest figure to give. */
  count?: string;
  lead?: ReactNode;
  line: 1 | 2;
  onOpen: () => void;
}

interface PaletteHitBase {
  key: string;
  title: string;
  matched?: [start: number, end: number];
  lead?: ReactNode;
  trailing?: ReactNode;
}

/**
 * One hit a line: what it is called, a line of facts beneath, something at its left — a thumbnail,
 * a swatch — and what choosing it does.
 */
interface PaletteRowHit extends PaletteHitBase {
  facts?: ReactNode;
  onOpen: () => void;
  readings?: undefined;
}

/**
 * One value with every reading of it beneath, each of them a press of its own.
 *
 * The value is stated once and its readings stand under it, rather than the value being redrawn
 * once per reading: a genre answers a shelf, a narrowing of the page and a jump into each tab
 * recording it, which is six rows of one name and one line of facts where this is a name and a
 * strip.
 */
interface PaletteValueHit extends PaletteHitBase {
  /** What kind of value it is, beside the name rather than under it: a category, or its media. */
  category?: ReactNode;
  /**
   * What the row states in place of its readings, drawn only while they are not.
   *
   * A value's counts belong in one place at a time: beside its name where the strip is shut, and
   * inside the chips where it is open, since a value stating "4 games" above a "Games 4" chip is
   * one fact said twice. The caller says what; the row says when.
   */
  summary?: ReactNode;
  readings: PaletteReading[];
}

/**
 * One press and one meaning: a reading that answers a query two ways is two presses, so everything
 * the box offers is reachable by the pointer, the finger and the keyboard alike rather than one of
 * them being a chord a touch screen has no key for.
 *
 * A union rather than one hit with optional readings, so a row is never handed a strip it cannot
 * draw and a value never a single press that would bypass its own.
 */
export type PaletteHit = PaletteRowHit | PaletteValueHit;

/**
 * A run of hits under one label, with how many the label stands for beyond the ones shown.
 *
 * `layout` is `"rows"` unless said otherwise: one hit a line, with its lead, facts and trailing
 * figure. `"chips"` puts the label and every hit on one line as chips — for a group of a few
 * short names a reader scans rather than reads, the tabs — where four rows would push the
 * groups below them off the box's first screen. A chip carries the lead and the title alone.
 */
export interface PaletteGroup {
  key: string;
  label: string;
  total: number;
  hits: PaletteHit[];
  layout?: "rows" | "chips";
  /**
   * Whether every value in the group draws its strip, or only the one the reader is on.
   *
   * The caller’s answer, since how many values a query matched is the caller’s own figure: one or
   * two arrive open, so a finger never pays a tap for nothing, and past that a wall of chips is
   * most of the list before a single work is reached.
   */
  alwaysOpen?: boolean;
}

/**
 * The palette's own width from `sm` up: wide enough for a title, a line of facts and a year on
 * one row, narrower than the page so it reads as a box over it rather than a page of its own.
 */
const PALETTE_WIDTH = 620;

/** The space a hit's lead is given, whatever it holds: a banner thumbnail at 44×30, or a swatch. */
export const LEAD_WIDTH = 44;
export const LEAD_HEIGHT = 30;

/**
 * The dialog's paper, seated near the top rather than centred: a list that grows and shrinks with
 * every keystroke would otherwise jump about its own middle. Built here because the phone's shape
 * is a breakpoint key, which the React Compiler cannot lower inline.
 */
const paperSx = (theme: Theme) => ({
  width: `min(${PALETTE_WIDTH}px, calc(100vw - 32px))`,
  maxHeight: "min(70vh, 640px)",
  display: "flex",
  flexDirection: "column",
  [theme.breakpoints.up("sm")]: { marginTop: "9vh", alignSelf: "flex-start" },
  [theme.breakpoints.down("sm")]: { width: "100%", maxHeight: "none" },
});

const CONTAINER_SX = { "& .MuiDialog-container": { alignItems: "flex-start" } } as const;

/**
 * What the box is held to, standing in the field ahead of the caret.
 *
 * In the field rather than above it, because it narrows what the field does: a word typed here
 * searches inside the category, and a chip anywhere else would read as a filter on results the
 * field had already found. It is the kit's own small chip, so the coarse target its ✕ grows under a
 * finger — the height, the corner and the label's own padding — comes from the theme rather than
 * from here, where a copy would state one third of it.
 */
const ScopeChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
  <Chip
    size="small"
    color="primary"
    label={label}
    onDelete={onClear}
    aria-label={`Leave ${label}`}
    sx={{ flex: "none", fontWeight: 600 }}
  />
);

/**
 * The input row, under the mode segment at every width. A breakpoint key again, so a function at
 * module scope.
 */
const inputRowSx = (theme: Theme) => ({
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  paddingX: 2,
  paddingY: 1.25,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
  [theme.breakpoints.down("sm")]: { paddingY: 0.75, gap: 1 },
});

/** The two things the box can be, as the words that switch between them. */
const MODE_SEGMENTS: readonly SegmentOption<SearchMode>[] = [
  { value: "find", label: "Find" },
  { value: "page", label: "This page" },
];

/**
 * Whether a key press landed somewhere Tab is the box's to take: the input, or the mode segment
 * itself. Everywhere else — a menu inside This page, a popover's own year picker — Tab is the
 * focus trap's, and stealing it would leave a reader unable to walk out of a list by keyboard.
 */
const inModeSwitchReach = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.dataset.searchInput !== undefined || target.closest("[data-search-mode]"));

/**
 * The line the arrows move between, and the only thing carrying the lit state.
 *
 * A row holding one press *is* that press; a value's row holds its name and its whole strip. The
 * light has to be on what contains them rather than on either, or a value with its readings open
 * would be lit along its title alone. Lit by keyboard and pointer through one flag rather than a
 * hover style of its own: the two would otherwise light two rows at once, and a tap has no leave
 * event to unlight one. The pointer moving onto a row selects it, which is the hover.
 */
const ROW_SX = {
  borderLeft: "3px solid transparent",
  '&[aria-selected="true"]': {
    backgroundColor: "action.selected",
    borderLeftColor: "primary.main",
  },
} as const;

/**
 * What every press surface in the list has in common: a button stripped back to the row it draws,
 * with its focus ring inside its own edge — a row spans the box, so a ring outside it has nowhere
 * to be drawn.
 */
const pressSx = (theme: Theme) => ({
  width: "100%",
  paddingX: 2,
  border: 0,
  background: "none",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  ...focusRingSx(theme, -2),
});
const hitSx = (theme: Theme) => ({
  ...pressSx(theme),
  display: "grid",
  gridTemplateColumns: `${LEAD_WIDTH}px minmax(0, 1fr) auto`,
  gap: 1.5,
  alignItems: "center",
  paddingY: 1,
});

/**
 * A value's own line: its mark, its name, what kind of value it is, and — for a series — the years
 * it ran. One line rather than the two a hit takes, the counts having moved into the readings
 * below, where each of them is also the press that acts on it.
 */
const valueSx = (theme: Theme) => ({
  ...pressSx(theme),
  display: "flex",
  alignItems: "center",
  gap: 1,
  paddingTop: 1,
  paddingBottom: 0.5,
});

/** The strip: two stated lines, not one that wraps (see `PaletteReading.line`). */
const STRIP_SX = { display: "flex", flexDirection: "column", gap: 0.75, paddingX: 2, paddingBottom: 1.25 } as const;

const STRIP_LINE_SX = { display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center" } as const;

/**
 * A chip: the kit's own, at 28px under a pointer and the coarse 32 under a finger, where the type
 * stays put and only the target grows. Lit by `data-active`, which is the cell the keyboard is on
 * inside the row it has selected — a second mark, since the row's own light says which value.
 */
const chipSx = (theme: Theme) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 0.75,
  height: 28,
  paddingX: 1.25,
  borderRadius: 14,
  border: "1px solid",
  borderColor: "divider",
  background: "none",
  color: "inherit",
  font: "inherit",
  fontSize: 13,
  fontWeight: 500,
  whiteSpace: "nowrap",
  cursor: "pointer",
  "& svg": { fontSize: 18 },
  // The corner follows the height, or a chip grown for a finger is a rounded rectangle beside the
  // kit's own, which the theme rounds to half its height in this same query.
  "@media (pointer: coarse)": { height: COARSE_CONTROL_HEIGHT, borderRadius: COARSE_CONTROL_HEIGHT / 2 },
  '&[data-active="true"]': {
    backgroundColor: "action.selected",
    borderColor: "primary.main",
  },
  ...focusRingSx(theme, -2),
});

const KEY_SX = {
  fontSize: 10.5,
  paddingX: 0.5,
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 0.5,
  lineHeight: 1.6,
  color: "text.secondary",
} as const;

/** A key hint: the glyph and what it does, on one baseline. */
const HINT_SX = { color: "text.secondary", display: "flex", gap: 0.5, alignItems: "center" } as const;

const Key = ({ children }: { children: string }) => (
  <Box
    component="kbd"
    sx={KEY_SX}
  >
    {children}
  </Box>
);

/**
 * Whether an arrow is the box's to take. A modified one is the field's — ⇧← extends a selection,
 * ⌥← and ⌘← jump a word and a line — and the box has nothing to answer any of them with.
 */
const plainArrow = (event: KeyboardEvent) => !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey;

/**
 * Scrolls what the keys moved to into view: the live cell where there is one, and otherwise the
 * selected row.
 *
 * The cell first because a chips group is a single row holding a dozen presses — ←→ walk inside it
 * without changing which row is selected, and a dozen chips wrap to several lines, so revealing the
 * row would leave the chip walked to sitting below the fold on the line it wrapped onto.
 */
const revealSelected = (list: HTMLElement | null) => {
  const target = list?.querySelector('[data-active="true"]') ?? list?.querySelector('[aria-selected="true"]');
  if (target) target.scrollIntoView({ block: "nearest" });
};

/** One press the keyboard can reach: a whole hit, or one reading inside a value's strip. */
interface Cell {
  key: string;
  onOpen: () => void;
}

/** One line the arrows move between, and everything pressable along it. */
interface Row {
  key: string;
  cells: Cell[];
}

/** Where a remembered key stands, or the first entry where it stands nowhere. */
const indexOfKey = (list: readonly { key: string }[], key: string | null) =>
  Math.max(
    0,
    list.findIndex((entry) => entry.key === key),
  );

/** What a hit does where the shell has no reading of its own to open. */
const pressOf = (hit: PaletteHit) => (hit.readings ? hit.readings[0].onOpen : hit.onOpen);

/**
 * The lines the arrows move between, and the presses along each.
 *
 * A chips group is one line however many chips it holds: they already stand on one row, so ↓
 * stepping rightwards across them reads as the wrong key. Everything else is a line per hit — one
 * press for a work, one per reading for a value.
 *
 * Keyed by group as well as hit, since one entry can stand in two groups — a franchise met lately
 * and found again by name — and one flag must light one row.
 */
const rowsOfGroup = (group: PaletteGroup): Row[] => {
  if (group.layout === "chips") {
    return [
      { key: group.key, cells: group.hits.map((hit) => ({ key: `${group.key}:${hit.key}`, onOpen: pressOf(hit) })) },
    ];
  }
  return group.hits.map((hit) => {
    const key = `${group.key}:${hit.key}`;
    return {
      key,
      cells: hit.readings
        ? hit.readings.map((reading) => ({ key: `${key}:${reading.key}`, onOpen: reading.onOpen }))
        : [{ key, onOpen: hit.onOpen }],
    };
  });
};

/**
 * A group drawn as chips: the tabs to go to, and the vocabularies to browse.
 *
 * Wrapped rather than scrolled, so every chip is on screen at once. The twelve categories come to
 * about 1,050px of run, which is two lines in the 620px dialog and four at 390 — more height than a
 * scroller costs, and worth it: the row is what teaches that a category can be named at all, and a
 * name a reader has to scroll sideways to find teaches nobody. It is also what keeps ←→ honest,
 * every cell being somewhere the list can already reveal.
 *
 * The label sits outside the row, a grid row holding anything but its own cells being no row.
 */
const ChipsGroup = ({
  group,
  selected,
  cellProps,
  onSelect,
  pointerMoved,
}: {
  group: PaletteGroup;
  /** Whether the keys are on this row, which is what a grid row states about itself. */
  selected: boolean;
  cellProps: (cell: string) => { id: string | undefined; "data-active": string | undefined };
  onSelect: (rowKey: string, cell: string) => void;
  pointerMoved: (event: MouseEvent) => boolean;
}) => (
  <Box
    role="rowgroup"
    aria-label={group.label}
    sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, paddingX: 2, paddingY: 1 }}
  >
    <Typography
      variant="caption"
      sx={{ ...LABEL_SX, color: "text.secondary" }}
    >
      {group.label}
    </Typography>
    <Stack
      role="row"
      aria-selected={selected}
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ flexWrap: "wrap", alignItems: "center" }}
    >
      {group.hits.map((hit) => {
        const cell = `${group.key}:${hit.key}`;
        return (
          <Box
            key={hit.key}
            component="button"
            type="button"
            role="gridcell"
            tabIndex={-1}
            {...cellProps(cell)}
            onMouseMove={(event) => {
              if (pointerMoved(event)) onSelect(group.key, cell);
            }}
            onClick={pressOf(hit)}
            sx={chipSx}
          >
            {hit.lead}
            <Title
              title={hit.title}
              matched={hit.matched}
            />
          </Box>
        );
      })}
    </Stack>
  </Box>
);

/**
 * Puts the caret in the box once the dialog has opened, with the previous query selected so the
 * next letters replace it. `autoFocus` alone loses to the dialog's focus trap, which takes the
 * container itself a tick after mount, so the first letters typed go nowhere; a frame later the
 * trap has settled and the input keeps the focus it is given.
 */
const focusSoon = (inputRef: RefObject<HTMLInputElement | null>) => {
  // A timer rather than an animation frame: a frame never comes in a tab that is not painting,
  // and the caret has to land wherever the chord was pressed. The ref is read inside it, since
  // the dialog's portal mounts the box a commit after `open` turns true and the ref is still
  // empty when the effect runs.
  const timer = setTimeout(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, 0);
  return () => clearTimeout(timer);
};

/**
 * A hit's name with the matched run underlined in the accent, so the eye lands where the query did.
 *
 * One element and never a fragment, matched or not: a chip is an `inline-flex` with a gap between
 * its lead and its label, and three loose nodes are three flex items — which puts that gap inside
 * the word, "Gameplay" reading as "Gam eplay" on exactly the chips the underline is drawn for.
 */
const Title = ({ title, matched }: { title: string; matched?: [number, number] }) => {
  if (!matched) return <span>{title}</span>;
  const [start, end] = matched;
  return (
    <span>
      {title.slice(0, start)}
      <Box
        component="mark"
        sx={{
          background: "none",
          color: "inherit",
          textDecoration: "underline",
          textDecorationColor: "primary.main",
          textDecorationThickness: 2,
          textUnderlineOffset: 2,
        }}
      >
        {title.slice(start, end)}
      </Box>
      {title.slice(end)}
    </span>
  );
};

/**
 * One box over all the libraries, and — in its other mode — over the page behind it.
 *
 * A dialog from `sm` up and a fullscreen sheet below it, the mode segment in the pinned bar every
 * sheet in the app wears; `usePhone` is read as a value because the two are different trees rather
 * than one at two sizes. The caller owns the query, the groups and This page's own rows, so the
 * shell renders whatever it is handed and stays domain-blind; it owns the keyboard — ↑↓ through
 * every hit as one list, ↵ on the selected, ⇥ between the modes — so a reader can type and press
 * return without touching the pointer.
 *
 * **The keyboard rises for Find and stays down for This page.** A phone's This page is lists to be
 * tapped, and a keyboard over them covers exactly what the reader opened the box to press — so the
 * focus is asked for on the mode and the request count together, which is what makes a switch
 * *into* Find raise it while opening in This page does not.
 */
export const SearchPalette = (props: {
  open: boolean;
  mode: SearchMode;
  onMode: (mode: SearchMode) => void;
  /** Counts the times the box was asked for; a new count in Find puts the caret back in it. */
  focusRequest: number;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  groups: PaletteGroup[];
  /** Shown in place of the groups while the libraries are still landing. */
  loading: boolean;
  /** What stands under the box before a query answers anything: nothing typed, or nothing found. */
  emptyState: ReactNode;
  placeholder: string;
  /**
   * The category Find is held to, where the reader has named one: its own word, and the way out.
   *
   * A label and a callback rather than the category itself, so the shell stays as blind to what a
   * category is as it is to what a hit opens.
   */
  scope?: { label: string; onClear: () => void };
  /** The current page's own settings and filters, drawn in place of the groups in `page` mode. */
  pageContent?: ReactNode;
  /** What stands on This page's last line: the population its settings have left, and Clear. */
  footer?: ReactNode;
  /**
   * Whether the box is on screen, which is not the same question as whether it is open: a dialog
   * renders its children all the way through the exit transition. A caller building its contents
   * on `open` alone empties the box the reader is watching close — the hits go, and the line that
   * says nothing was found takes their place for the length of the fade.
   */
  onDrawn: (drawn: boolean) => void;
}) => {
  const { open, mode, onMode, focusRequest, onClose, query, onQueryChange, groups, scope } = props;
  const { loading, emptyState, placeholder, pageContent, footer, onDrawn } = props;
  const phone = usePhone();
  const finding = mode === "find";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [cellKey, setCellKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pointerAt = useRef<{ x: number; y: number } | null>(null);
  /** Whether the live selection was reached by a key, which is the only kind the list scrolls for. */
  const byKeyboard = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (finding) return focusSoon(inputRef);
    // Asked for on the way into This page as well as on the way out of it: a reader who typed in
    // Find and then switched still has the caret in the box, and on a phone that is a keyboard
    // standing over the lists the switch was made to reach.
    inputRef.current?.blur();
  }, [open, finding, focusRequest]);

  const rows = groups.flatMap(rowsOfGroup);
  // Cell ids are a place rather than a key: a key carries a franchise's own name, and an IDREF
  // with a space in it names nothing. Built once, so the id a cell wears and the id the input
  // points at are the same string rather than two constructions of it.
  const cellId = new Map(
    rows.flatMap((row, rowIndex) => row.cells.map((cell, index) => [cell.key, `search-cell-${rowIndex}-${index}`])),
  );
  const selectedIndex = indexOfKey(rows, selectedKey);
  const selectedRow = rows.at(selectedIndex);
  const cells = selectedRow?.cells ?? [];
  // Held by key and resolved against the row in hand, so arriving at another row falls back to its
  // first reading rather than to whatever index the last row had reached.
  const cellIndex = indexOfKey(cells, cellKey);
  const active = cells.at(cellIndex);

  // What the *keys* moved to is brought into view. A pointer's own selection is already under the
  // pointer, and revealing it is worse than useless: hovering a collapsed value mounts its strip,
  // which makes the live cell a node that did not exist a frame earlier, and scrolling that into
  // view slides another row under a stationary cursor, which selects it, which scrolls again. The
  // cell is in the dependencies as well as the row, since ←→ move within a row without leaving it.
  useEffect(() => {
    if (!byKeyboard.current) return;
    byKeyboard.current = false;
    revealSelected(listRef.current);
  }, [selectedIndex, active?.key]);

  /**
   * Whether the pointer actually moved, which is what a row's own selection is allowed to follow.
   *
   * Safari dispatches a `mousemove` at the cursor's own position whenever content scrolls under a
   * stationary pointer, and an arrow key scrolls the list to reveal what it selected — so the row
   * that slides under the mouse takes the selection straight back, and holding ↑ reads as the list
   * jumping to wherever the pointer happens to rest. Comparing the position is what tells a
   * reader's own movement from the page moving beneath them; Chrome sends no event for the second
   * and so needs no telling.
   */
  const pointerMoved = (event: MouseEvent) => {
    const last = pointerAt.current;
    pointerAt.current = { x: event.clientX, y: event.clientY };
    return last === null || last.x !== event.clientX || last.y !== event.clientY;
  };

  const move = (step: number) => {
    if (rows.length === 0) return;
    byKeyboard.current = true;
    const next = (selectedIndex + step + rows.length) % rows.length;
    setSelectedKey(rows[next].key);
  };

  /**
   * Along the row the reader is on, and only where it holds more than one press.
   *
   * Where it holds one, ←→ stay the caret's. The box's field is the one place in the app a reader
   * types, so taking the arrows from it everywhere would leave a typo mid-query reachable by the
   * pointer alone; on a value's row, where the arrows have readings to walk, that is the trade the
   * strip is worth.
   */
  const moveCell = (step: number) => {
    // Nothing until the reader has picked a row. `indexOfKey` answers the first row for a key that
    // stands nowhere, so the box opens with a row selected that nobody navigated to — and the first
    // of them is a chips group, one row holding a cell per tab. Read off the held key instead, so
    // the arrows are the caret's until ↑↓ or a pointer has said otherwise.
    if (selectedKey === null || cells.length < 2) return false;
    byKeyboard.current = true;
    const next = (cellIndex + step + cells.length) % cells.length;
    setCellKey(cells[next].key);
    return true;
  };

  /**
   * Both at once, from the inner element.
   *
   * `mousemove` bubbles, and `pointerMoved` answers only the first caller of a given move — so a
   * chip that set the cell alone would leave the row's own handler reading the position it had
   * just written and declining to select the row the chip stands in.
   */
  const selectCell = (rowKey: string, cell: string) => {
    setSelectedKey(rowKey);
    setCellKey(cell);
  };

  /** Where a cell stands, as the id the input points at and the mark saying it is the live one. */
  const cellProps = (cell: string) => ({
    id: cellId.get(cell),
    "data-active": cell === active?.key ? "true" : undefined,
  });

  /**
   * A value: its own line, and the strip of readings beneath where the strip is drawn at all.
   *
   * The title line is the row's header rather than a cell — the keyboard's presses are the
   * readings, and a title that were one would give the strip's first chip a second id. Pressed, it
   * does what the row's state says: on a value already showing its readings it opens the first of
   * them, which is what a pointer always means, having selected the row by moving onto it; on a
   * collapsed one it reveals them, which is a finger's first tap and the tap that rule costs.
   */
  const valueBlock = (hit: PaletteValueHit, rowKey: string, open: boolean) => (
    <>
      <Box
        component="button"
        type="button"
        role="rowheader"
        tabIndex={-1}
        onClick={() => (open ? hit.readings[0].onOpen() : setSelectedKey(rowKey))}
        sx={valueSx}
      >
        {hit.lead}
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: 600 }}
        >
          <Title
            title={hit.title}
            matched={hit.matched}
          />
        </Typography>
        {hit.category && (
          <Typography
            variant="caption"
            noWrap
            component="span"
            sx={{ color: "text.secondary", minWidth: 0 }}
          >
            {hit.category}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginLeft: "auto", paddingLeft: 1 }}>
          {!open && hit.summary}
          {hit.trailing}
        </Box>
      </Box>
      {open && (
        <Box sx={STRIP_SX}>
          {/* The lines the readings actually claim, so widening `PaletteReading.line` cannot leave a
              line silently undrawn. */}
          {[...new Set(hit.readings.map((reading) => reading.line))]
            .toSorted((a, b) => a - b)
            .map((line) => {
              const along = hit.readings.filter((reading) => reading.line === line);
              return (
                <Box
                  key={line}
                  sx={STRIP_LINE_SX}
                >
                  {along.map((reading) => {
                    const cell = `${rowKey}:${reading.key}`;
                    return (
                      <Box
                        key={reading.key}
                        component="button"
                        type="button"
                        role="gridcell"
                        tabIndex={-1}
                        {...cellProps(cell)}
                        onMouseMove={(event) => {
                          if (pointerMoved(event)) selectCell(rowKey, cell);
                        }}
                        onClick={reading.onOpen}
                        sx={chipSx}
                      >
                        {reading.lead}
                        {reading.label}
                        {reading.count !== undefined && (
                          <Box
                            component="span"
                            sx={MUTED_FIGURE_SX}
                          >
                            {reading.count}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
        </Box>
      )}
    </>
  );

  const onKeyDown = (event: KeyboardEvent) => {
    // ⇥ where the box owns it: the input and the segment. Everywhere else it belongs to the focus
    // trap, and a list inside This page has to be walkable out of.
    if (event.key === "Tab" && !event.altKey && inModeSwitchReach(event.target)) {
      event.preventDefault();
      onMode(finding ? "page" : "find");
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "ArrowRight" && plainArrow(event)) {
      if (moveCell(1)) event.preventDefault();
    } else if (event.key === "ArrowLeft" && plainArrow(event)) {
      if (moveCell(-1)) event.preventDefault();
    } else if (event.key === "Enter" && active) {
      event.preventDefault();
      active.onOpen();
    } else if (event.key === "Backspace" && scope && !query) {
      // The chip-in-a-field idiom: with nothing left to delete, the next ⌫ takes the chip.
      scope.onClear();
    }
  };

  const modeSwitch = (
    <Box data-search-mode>
      <SegmentedControl
        options={MODE_SEGMENTS}
        value={mode}
        onChange={onMode}
        ariaLabel="What the box is for"
      />
    </Box>
  );

  return (
    <Dialog
      open={open}
      // Escape leaves the scope before it leaves the box, so the way out is one key pressed twice
      // rather than two keys to learn. Read off MUI's own reason: a backdrop press means close,
      // whatever the box is held to. The bar's ✕ closes outright for the same reason.
      onClose={(_event, reason) => (reason === "escapeKeyDown" && scope ? scope.onClear() : onClose())}
      fullScreen={phone}
      maxWidth={false}
      sx={CONTAINER_SX}
      slotProps={{
        paper: { sx: paperSx },
        transition: { onEnter: () => onDrawn(true), onExited: () => onDrawn(false) },
      }}
      aria-label="Search"
      // On the dialog as well as the input, so the arrows and ↵ answer wherever focus has landed.
      onKeyDown={onKeyDown}
    >
      {/* The segment stands where every other layer states its title, because what the box *is*
          changes with it — a list of hits, or this page's own settings — and a word above the
          segment saying the same thing is two headers. */}
      {phone && (
        <SheetBar
          title={modeSwitch}
          titleNoWrap={false}
          onClose={onClose}
        />
      )}
      <Box sx={inputRowSx}>
        <Search color="action" />
        {scope && (
          <ScopeChip
            label={scope.label}
            onClear={scope.onClear}
          />
        )}
        <InputBase
          // Asked for in Find alone, so a phone opening This page does not raise the keyboard over
          // the lists it opened to show. The effect above asks again once the trap has settled.
          autoFocus={finding}
          fullWidth
          inputRef={inputRef}
          value={query}
          placeholder={placeholder}
          onChange={(event) => onQueryChange(event.target.value)}
          inputProps={{
            "aria-label": finding ? "Search" : "Narrow this page",
            // What ⌘K reads to tell a press inside the box from one anywhere else, since the label
            // above says which mode the box is in rather than which element this is.
            "data-search-input": "",
            "aria-activedescendant": active && cellId.get(active.key),
            autoCapitalize: "off",
            autoCorrect: "off",
            spellCheck: false,
            enterKeyHint: "go",
          }}
          sx={{ fontSize: { xs: 16, sm: 18 } }}
        />
        {!phone && <Key>esc</Key>}
      </Box>
      {!phone && (
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            paddingX: 2,
            paddingY: 1,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {modeSwitch}
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            ⇥ switches
          </Typography>
        </Stack>
      )}
      {!finding ? (
        <Box sx={{ overflowY: "auto", flexGrow: 1 }}>{pageContent}</Box>
      ) : (
        <Box
          ref={listRef}
          role="grid"
          aria-label="Results"
          sx={{ overflowY: "auto", flexGrow: 1, paddingY: 0.5 }}
        >
          {/* The groups are drawn whatever the loading state, so a group the caller can answer before
            the libraries land — the tabs — is on screen exactly when the keys can reach it. */}
          {groups.map((group) =>
            group.layout === "chips" ? (
              <ChipsGroup
                key={group.key}
                group={group}
                selected={selectedRow?.key === group.key}
                cellProps={cellProps}
                onSelect={selectCell}
                pointerMoved={pointerMoved}
              />
            ) : (
              <Box
                key={group.key}
                role="rowgroup"
                aria-label={group.label}
                sx={{ paddingBottom: 0.5 }}
              >
                <Stack
                  role="presentation"
                  direction="row"
                  sx={{ justifyContent: "space-between", paddingX: 2, paddingY: 0.75 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ ...LABEL_SX, color: "text.secondary" }}
                  >
                    {group.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={MUTED_FIGURE_SX}
                  >
                    {cut(group.hits.length, group.total)}
                  </Typography>
                </Stack>
                {group.hits.map((hit) => {
                  const rowKey = `${group.key}:${hit.key}`;
                  const lit = rowKey === selectedRow?.key;
                  return (
                    <Box
                      key={hit.key}
                      role="row"
                      aria-selected={lit}
                      sx={ROW_SX}
                      onMouseMove={(event) => {
                        if (pointerMoved(event)) setSelectedKey(rowKey);
                      }}
                    >
                      {hit.readings ? (
                        valueBlock(hit, rowKey, group.alwaysOpen === true || lit)
                      ) : (
                        <Box
                          component="button"
                          type="button"
                          role="gridcell"
                          tabIndex={-1}
                          {...cellProps(rowKey)}
                          onClick={hit.onOpen}
                          sx={hitSx}
                        >
                          <Box sx={{ width: LEAD_WIDTH, height: LEAD_HEIGHT, display: "grid", placeItems: "center" }}>
                            {hit.lead}
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ fontWeight: 500 }}
                            >
                              <Title
                                title={hit.title}
                                matched={hit.matched}
                              />
                            </Typography>
                            {hit.facts && (
                              <Typography
                                variant="caption"
                                noWrap
                                component="div"
                                sx={{ color: "text.secondary" }}
                              >
                                {hit.facts}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ textAlign: "right" }}>{hit.trailing}</Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ),
          )}
          {loading ? (
            <Typography
              variant="body2"
              sx={{ ...MUTED_FIGURE_SX, padding: 2 }}
            >
              Loading the libraries…
            </Typography>
          ) : (
            rows.length === 0 && emptyState
          )}
        </Box>
      )}
      {/* In Find the last line is the keyboard, which a phone has none of; in This page it is the
          caller's own — the population the settings above have left, and the Clear that undoes
          them — which every width states. */}
      {(finding ? !phone : Boolean(footer)) && (
        <Stack
          direction="row"
          spacing={2}
          sx={{
            paddingX: 2,
            paddingY: 1,
            paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
            borderTop: 1,
            borderColor: "divider",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {finding ? <PaletteKeys scope={scope?.label} /> : footer}
        </Stack>
      )}
    </Dialog>
  );
};

/**
 * The keys the box answers to, on the last line of Find wherever there is a keyboard to press.
 *
 * Under a scope the last of them names the way out by the category it leaves, since ⌫ on an empty
 * field is the one key here whose meaning a reader cannot guess from what is on screen.
 */
const PaletteKeys = ({ scope }: { scope?: string }) => (
  <>
    <Typography
      variant="caption"
      sx={HINT_SX}
    >
      <Key>↑</Key>
      <Key>↓</Key> move
    </Typography>
    <Typography
      variant="caption"
      sx={HINT_SX}
    >
      <Key>←</Key>
      <Key>→</Key> reading
    </Typography>
    <Typography
      variant="caption"
      sx={HINT_SX}
    >
      <Key>↵</Key> open
    </Typography>
    {scope && (
      <Typography
        variant="caption"
        sx={HINT_SX}
      >
        <Key>⌫</Key> leave {scope}
      </Typography>
    )}
  </>
);
