import { Close, Search } from "@mui/icons-material";
import { Box, Dialog, IconButton, InputBase, Stack, Typography, type Theme } from "@mui/material";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { usePhone } from "./breakpoints";
import { stickySheetHeader } from "./fullscreenSheet";
import { LABEL_SX, MUTED_FIGURE_SX } from "./typography";

/**
 * One thing the palette can offer: what it is called, the run of that name the query matched, a
 * line of facts beneath, something to stand at its left — a thumbnail, a swatch — and what
 * choosing it does. The shell draws these and knows nothing about what any of them is.
 */
export interface PaletteHit {
  key: string;
  title: string;
  matched?: [start: number, end: number];
  facts?: ReactNode;
  lead?: ReactNode;
  trailing?: ReactNode;
  onOpen: () => void;
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
 * The input row: the whole width from `sm` up, and the phone's pinned sheet bar below it, where
 * the ✕ is the sheet's own word for leaving. A breakpoint key again, so a function at module
 * scope.
 */
const inputRowSx = (theme: Theme) => ({
  display: "flex",
  alignItems: "center",
  gap: 1.5,
  paddingX: 2,
  paddingY: 1.25,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
  [theme.breakpoints.down("sm")]: {
    ...stickySheetHeader(theme),
    // Longhands rather than `paddingY`, which the sx pipeline resolves after the spread and which
    // would write over the notch inset the pinned bar pays for above its content.
    paddingTop: `calc(env(safe-area-inset-top) + ${theme.spacing(0.75)})`,
    paddingBottom: 0.75,
    gap: 1,
  },
});

/**
 * A row, lit by keyboard or pointer through one `selected` flag rather than a hover style of its
 * own: the arrow keys and the pointer would otherwise light two rows at once, and a tap has no
 * leave event to unlight one. The pointer moving onto a row selects it, which is the hover.
 */
const HIT_SX = {
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
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
} as const;

/**
 * A chip, lit by the same flag a row is. It carries the option role and the selection colour a
 * row does, so the keyboard walks through it as through any other hit.
 */
const CHIP_SX = {
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
  "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: -2 },
} as const;

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
 * One box over all the libraries, and a grouped list of what it finds.
 *
 * A dialog from `sm` up and a fullscreen sheet below it, the input in the pinned bar every sheet
 * in the app wears; `usePhone` is read as a value because the two are different trees rather than
 * one at two sizes. The caller owns the query and the groups, so the shell renders whatever it is
 * handed and stays domain-blind; it owns the keyboard — ↑↓ through every hit as one list, ↵ on
 * the selected, first hit selected as soon as there is one — so a reader can type and press
 * return without touching the pointer.
 */
export const SearchPalette = (props: {
  open: boolean;
  /** Counts the times the box was asked for; a new count while open puts the caret back in it. */
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
}) => {
  const { open, focusRequest, onClose, query, onQueryChange, groups, loading, emptyState, placeholder } = props;
  const phone = usePhone();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return focusSoon(inputRef);
  }, [open, focusRequest]);

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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && selected) {
      event.preventDefault();
      openHit(selected);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={phone}
      maxWidth={false}
      sx={CONTAINER_SX}
      slotProps={{ paper: { sx: paperSx } }}
      aria-label="Search"
      // On the dialog as well as the input, so the arrows and ↵ answer wherever focus has landed.
      onKeyDown={onKeyDown}
    >
      <Box sx={inputRowSx}>
        <Search color="action" />
        <InputBase
          autoFocus
          fullWidth
          inputRef={inputRef}
          value={query}
          placeholder={placeholder}
          onChange={(event) => onQueryChange(event.target.value)}
          inputProps={{
            "aria-label": "Search",
            "aria-activedescendant": selected ? `search-hit-${selectedIndex}` : undefined,
            autoCapitalize: "off",
            autoCorrect: "off",
            spellCheck: false,
            enterKeyHint: "go",
          }}
          sx={{ fontSize: { xs: 16, sm: 18 } }}
        />
        {phone ? (
          <IconButton
            aria-label="Close"
            onClick={onClose}
            edge="end"
          >
            <Close />
          </IconButton>
        ) : (
          <Key>esc</Key>
        )}
      </Box>
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
                  sx={CHIP_SX}
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
                  {group.total > group.hits.length ? `${group.hits.length} of ${group.total}` : group.total}
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
                  sx={HIT_SX}
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
      {!phone && (
        <Stack
          direction="row"
          spacing={2}
          sx={{ paddingX: 2, paddingY: 1, borderTop: 1, borderColor: "divider", alignItems: "center" }}
        >
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
            <Key>↵</Key> open
          </Typography>
        </Stack>
      )}
    </Dialog>
  );
};
