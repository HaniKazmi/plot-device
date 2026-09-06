import { Search } from "@mui/icons-material";
import { Box, Dialog, InputBase, Stack, Typography, type Theme } from "@mui/material";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { usePhone } from "./breakpoints";
import { SheetBar } from "./SheetBar";
import { SegmentedControl, type SegmentOption } from "./SelectionComponents";
import type { SearchMode } from "./searchOpen";
import { focusRingSx, LABEL_SX, MUTED_FIGURE_SX } from "./typography";
import { cut } from "./population";

/**
 * One thing the palette can offer: what it is called, the run of that name the query matched, a
 * line of facts beneath, something to stand at its left — a thumbnail, a swatch — and what
 * choosing it does. The shell draws these and knows nothing about what any of them is.
 *
 * `secondary` is a second thing one hit can do — an attribute filtering the page under ↵ and
 * standing on the Omnibus's own shelf under ⌘↵ — taken as a word and a callback, so the shell
 * offers it without learning what a shelf is.
 */
export interface PaletteHit {
  key: string;
  title: string;
  matched?: [start: number, end: number];
  facts?: ReactNode;
  lead?: ReactNode;
  trailing?: ReactNode;
  onOpen: () => void;
  secondary?: { label: string; onOpen: () => void };
}

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
}

/**
 * The palette's own width from `sm` up: wide enough for a title, a line of facts and a year on
 * one row, narrower than the page so it reads as a box over it rather than a page of its own.
 */
const PALETTE_WIDTH = 620;

/** The space a hit's lead is given, whatever it holds: a artwork thumbnail at 44×30, or a swatch. */
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
 * A row, lit by keyboard or pointer through one `selected` flag rather than a hover style of its
 * own: the arrow keys and the pointer would otherwise light two rows at once, and a tap has no
 * leave event to unlight one. The pointer moving onto a row selects it, which is the hover.
 */
const hitSx = (theme: Theme) => ({
  display: "grid",
  gridTemplateColumns: `${LEAD_WIDTH}px minmax(0, 1fr) auto`,
  gap: 1.5,
  alignItems: "center",
  width: "100%",
  paddingX: 2,
  paddingY: 1,
  border: 0,
  borderLeft: "3px solid transparent",
  background: "none",
  color: "inherit",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  '&[aria-selected="true"]': {
    backgroundColor: "action.selected",
    borderLeftColor: "primary.main",
  },
  // Inside the row's own edge: a row spans the box, so a ring outside it has nowhere to be drawn.
  ...focusRingSx(theme, -2),
});

/**
 * A chip, lit by the same flag a row is. It carries the option role and the selection colour a
 * row does, so the keyboard walks through it as through any other hit.
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
  cursor: "pointer",
  "& svg": { fontSize: 18 },
  '&[aria-selected="true"]': {
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

const Key = ({ children }: { children: string }) => (
  <Box
    component="kbd"
    sx={KEY_SX}
  >
    {children}
  </Box>
);

/** Scrolls the selected row into view. */
const revealSelected = (list: HTMLElement | null) => {
  const row = list?.querySelector('[aria-selected="true"]');
  if (row) row.scrollIntoView({ block: "nearest" });
};

/** Where a remembered key stands in the flat list, or the first row where it stands nowhere. */
const indexOfKey = (hits: PaletteHit[], key: string | null) =>
  Math.max(
    0,
    hits.findIndex((hit) => hit.key === key),
  );

/** Opens a hit; shared by the key handler and the rows. */
const openHit = (hit: PaletteHit) => hit.onOpen();

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

/** A hit's name with the matched run underlined in the accent, so the eye lands where the query did. */
const Title = ({ title, matched }: { title: string; matched?: [number, number] }) => {
  if (!matched) return <>{title}</>;
  const [start, end] = matched;
  return (
    <>
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
    </>
  );
};

/**
 * One box over all the libraries, and — in its other mode — over the page behind it.
 *
 * A dialog from `sm` up and a fullscreen sheet below it, the mode segment in the pinned bar every
 * sheet in the app wears; `usePhone` is read as a value because the two are different trees rather
 * than one at two sizes. The caller owns the query, the groups and This page's own rows, so the
 * shell renders whatever it is handed and stays domain-blind; it owns the keyboard — ↑↓ through
 * every hit as one list, ↵ on the selected, ⌘↵ on its second action, ⇥ between the modes — so a
 * reader can type and press return without touching the pointer.
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
  /** The current page's own settings and filters, drawn in place of the groups in `page` mode. */
  pageContent?: ReactNode;
  /** What stands on This page's last line: the population its settings have left, and Clear. */
  footer?: ReactNode;
  /** What ⌘↵ does to a hit that has a second action, for the keyboard line Find ends on. */
  chordHint?: string;
  /**
   * Whether the box is on screen, which is not the same question as whether it is open: a dialog
   * renders its children all the way through the exit transition. A caller building its contents
   * on `open` alone empties the box the reader is watching close — the hits go, and the line that
   * says nothing was found takes their place for the length of the fade.
   */
  onDrawn: (drawn: boolean) => void;
}) => {
  const { open, mode, onMode, focusRequest, onClose, query, onQueryChange, groups } = props;
  const { loading, emptyState, placeholder, pageContent, footer, chordHint, onDrawn } = props;
  const phone = usePhone();
  const finding = mode === "find";
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    if (finding) return focusSoon(inputRef);
    // Asked for on the way into This page as well as on the way out of it: a reader who typed in
    // Find and then switched still has the caret in the box, and on a phone that is a keyboard
    // standing over the lists the switch was made to reach.
    inputRef.current?.blur();
  }, [open, finding, focusRequest]);

  // Keyed by group as well as hit, since one entry can stand in two groups — a franchise both
  // searched lately and met lately — and one flag must light one row.
  const flat = groups.flatMap((group) => group.hits.map((hit) => ({ ...hit, key: `${group.key}:${hit.key}` })));
  // Option ids are the row's place in the flat list, not its key: a key carries a franchise's own
  // name, and an IDREF with a space in it names nothing.
  const flatIndex = new Map(flat.map((hit, index) => [hit.key, index]));
  const selectedIndex = indexOfKey(flat, selectedKey);
  const selected = flat.at(selectedIndex);

  // The row the keys moved to is brought into view; a pointer's own selection is already there.
  useEffect(() => {
    revealSelected(listRef.current);
  }, [selectedIndex]);

  const move = (step: number) => {
    if (flat.length === 0) return;
    const next = (selectedIndex + step + flat.length) % flat.length;
    setSelectedKey(flat[next].key);
  };

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
    } else if (event.key === "Enter" && selected) {
      event.preventDefault();
      // ⌘↵ takes a hit's second action where it has one, and its first where it does not: a chord
      // that silently did nothing on four hits out of five would read as the box having missed it.
      const chord = event.metaKey || event.ctrlKey;
      if (chord && selected.secondary) selected.secondary.onOpen();
      else openHit(selected);
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
      onClose={onClose}
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
            "aria-activedescendant": selected ? `search-hit-${selectedIndex}` : undefined,
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
          role="listbox"
          aria-label="Results"
          sx={{ overflowY: "auto", flexGrow: 1, paddingY: 0.5 }}
        >
          {/* The groups are drawn whatever the loading state, so a group the caller can answer before
            the libraries land — the tabs — is on screen exactly when the keys can reach it. */}
          {groups.map((group) =>
            group.layout === "chips" ? (
              <Stack
                key={group.key}
                role="group"
                aria-label={group.label}
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap", alignItems: "center", paddingX: 2, paddingY: 1 }}
              >
                <Typography
                  variant="caption"
                  sx={{ ...LABEL_SX, color: "text.secondary", marginRight: 0.5 }}
                >
                  {group.label}
                </Typography>
                {group.hits.map((hit) => (
                  <Box
                    key={hit.key}
                    component="button"
                    type="button"
                    role="option"
                    id={`search-hit-${flatIndex.get(`${group.key}:${hit.key}`)}`}
                    aria-selected={`${group.key}:${hit.key}` === selected?.key}
                    tabIndex={-1}
                    onMouseMove={() => {
                      if (`${group.key}:${hit.key}` !== selected?.key) setSelectedKey(`${group.key}:${hit.key}`);
                    }}
                    onClick={hit.onOpen}
                    sx={chipSx}
                  >
                    {hit.lead}
                    <Title
                      title={hit.title}
                      matched={hit.matched}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box
                key={group.key}
                role="group"
                aria-label={group.label}
                sx={{ paddingBottom: 0.5 }}
              >
                <Stack
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
                {group.hits.map((hit) => (
                  <Box
                    key={hit.key}
                    component="button"
                    type="button"
                    role="option"
                    id={`search-hit-${flatIndex.get(`${group.key}:${hit.key}`)}`}
                    aria-selected={`${group.key}:${hit.key}` === selected?.key}
                    tabIndex={-1}
                    onMouseMove={() => {
                      if (`${group.key}:${hit.key}` !== selected?.key) setSelectedKey(`${group.key}:${hit.key}`);
                    }}
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
                    <Box sx={{ textAlign: "right" }}>
                      {hit.trailing}
                      {/* Offered on the lit row alone: a chord printed against every hit is a legend
                        five lines long for a key that answers one of them. */}
                      {hit.secondary && `${group.key}:${hit.key}` === selected?.key && (
                        <Typography
                          variant="caption"
                          component="div"
                          noWrap
                          sx={{ color: "text.secondary" }}
                        >
                          ⌘↵ {hit.secondary.label}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
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
            flat.length === 0 && emptyState
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
          {finding ? <PaletteKeys chord={chordHint} /> : footer}
        </Stack>
      )}
    </Dialog>
  );
};

/** The keys the box answers to, on the last line of Find wherever there is a keyboard to press. */
const PaletteKeys = ({ chord }: { chord?: string }) => (
  <>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", display: "flex", gap: 0.5, alignItems: "center" }}
    >
      <Key>↑</Key>
      <Key>↓</Key> move
    </Typography>
    <Typography
      variant="caption"
      sx={{ color: "text.secondary", display: "flex", gap: 0.5, alignItems: "center" }}
    >
      <Key>↵</Key> open or filter
    </Typography>
    {chord && (
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "flex", gap: 0.5, alignItems: "center" }}
      >
        <Key>⌘↵</Key> {chord}
      </Typography>
    )}
  </>
);
