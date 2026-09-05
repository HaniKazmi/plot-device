import { Container, createTheme, CssBaseline, ThemeProvider, type Theme } from "@mui/material";
import { useState } from "react";
import NavBar from "./NavBar";
import { BottomTabs } from "./BottomTabs";
import { BrowserTint } from "./BrowserTint";
import { BOTTOM_TABS_CLEARANCE, safeAreaGutters } from "./common/chrome";
import {
  COARSE_CONTROL_HEIGHT,
  CONTROL_HEIGHT,
  CONTROL_RADIUS,
  CONTROL_TYPE_SX,
  NUMERIC_LABEL_SX,
} from "./common/typography";
import { Outlet } from "react-router-dom";
import { GoogleAuthProvider } from "./contexts/GoogleAuthContext.tsx";
import { LibraryProvider } from "./app/LibraryProvider.tsx";
import { FranchiseUnionProvider } from "./app/franchiseUnion.tsx";
import { SearchHost } from "./app/Search.tsx";
import { barColour, useCurrentTab } from "./tabs.ts";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

const GoogleAuth = () => {
  const [guestMode, setGuestMode] = useState(false);

  return (
    <GoogleAuthProvider>
      {/* Above the bar as well as the tabs: every tab reads its own sheet from here, and the bar
          answers for the library as a whole — what a page can show before anything is authorised
          is a question about the cache, not about the token. */}
      <LibraryProvider guestMode={guestMode}>
        <NavBar
          guestMode={guestMode}
          setGuestMode={setGuestMode}
        />
        <Container
          maxWidth={"xl"}
          // The bottom navigation is fixed, so it paints over whatever the page ends with unless the
          // page stops short of it. Only below `sm`, where the bar is drawn at all. The side gutters
          // restate the container's own with the device's insets added (`safeAreaGutters`).
          sx={(theme) => ({ paddingBottom: { xs: BOTTOM_TABS_CLEARANCE, sm: 0 }, ...safeAreaGutters(theme) })}
        >
          {/* Above every tab, because a card on any of them draws the franchise across all four. */}
          <FranchiseUnionProvider>
            <Outlet />
            {/* Inside the provider, since the palette lists the union's own items; opened from the
                app bar above through a store rather than a flag lifted over both. */}
            <SearchHost />
          </FranchiseUnionProvider>
        </Container>
        <BottomTabs />
        <BrowserTint />
      </LibraryProvider>
    </GoogleAuthProvider>
  );
};

const Graphs = () => {
  const currTab = useCurrentTab();
  const theme = getTheme(currTab);
  // A tab with no `darkBar` (none currently exist) falls back to `DARK_PAPER`, matching the plain
  // bar `getTheme` leaves `AppBar.darkBg` defaulting to in that case.
  const darkThemeColour = barColour(currTab, "dark") ?? DARK_PAPER;

  return (
    <ThemeProvider
      theme={theme}
      noSsr
    >
      <meta
        name="theme-color"
        content={theme.palette.primary.main}
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content={darkThemeColour}
        media="(prefers-color-scheme: dark)"
      />
      <CssBaseline />
      <GoogleAuth />
    </ThemeProvider>
  );
};

// MUI's stock palette, read once for the two fallback colours rather than rebuilt per call.
const { palette: defaultPalette } = createTheme();

// The dark scheme's own text and paper, named once so `getTheme`'s palette, its `AppBar` fallback
// and `Graphs`' dark `theme-color` meta all read the same two literals rather than three copies
// that could drift.
const DARK_TEXT = "#e8eaed";
const DARK_PAPER = "#1d2126";

/**
 * The tab's primary at a stated strength, as a wash rather than a tint: a lit segment's ground,
 * a hovered control's.
 *
 * Composed from the channel triple through the CSS variable, so one rule reads on both papers —
 * a solid colour mixed for the white paper is a different colour against the dark one, and the
 * variable is what the scheme switch actually moves. `mainChannel` is what `cssVariables: true`
 * emits for exactly this.
 */
const primaryWash = (theme: Theme, strength: number) => `rgba(${theme.vars.palette.primary.mainChannel} / ${strength})`;

/**
 * One ring for the whole kit: a segment inside a group, a chip in the rail and a picker's button
 * all answer a keyboard the same way, so a reader tabbing through a header finds the focus in one
 * place rather than in whatever each MUI component draws by default.
 *
 * Outside the part's own edge, since several of them are drawn edge to edge — a group's segments
 * share their borders, and a ring inside would be half hidden by the neighbour.
 */
const focusRing = (theme: Theme) => ({
  "&:focus-visible": { outline: `2px solid ${theme.vars.palette.primary.main}`, outlineOffset: 2 },
});

// Themes are cached per tab: building one walks both colour schemes, typography, shadows and
// the whole CSS-variable map, and a stable identity also stops the MUI tree re-evaluating `sx`
// on navigation. Bounded by the number of tabs.
const themeCache = new Map<string, ReturnType<typeof createTheme>>();

const getTheme = (tab: Tab) => {
  const cached = themeCache.get(tab.id);
  if (cached) return cached;

  const primaryColour = tab.primaryColour ?? defaultPalette.primary.main;
  const secondaryColour = tab.secondaryColour ?? defaultPalette.secondary.main;
  const theme = createTheme({
    cssVariables: true,
    // Both schemes are written out because `colorSchemes.light` replaces the top-level `palette`
    // rather than adding to it: a value named on one side only leaves the other on MUI's stock
    // blue, so the tab accent would silently vanish in dark mode.
    //
    // The surface values are the ramp the index at hani.fyi and the simkl status page also use.
    // None of the three can share a stylesheet — the status page serves under `default-src 'none'`
    // — so each holds its own copy, and a change here is a change in all three.
    colorSchemes: {
      light: {
        palette: {
          primary: { main: primaryColour },
          secondary: { main: secondaryColour },
          background: { default: "#f6f7f9", paper: "#ffffff" },
          text: { primary: "#1b1f24", secondary: "#6a737d" },
          divider: "#e1e4e8",
        },
      },
      dark: {
        palette: {
          primary: { main: primaryColour },
          secondary: { main: secondaryColour },
          background: { default: "#14171a", paper: DARK_PAPER },
          text: { primary: DARK_TEXT, secondary: "#9aa4af" },
          divider: "#2c3238",
          // Left unset, `AppBar.darkBg`/`darkColor` default to `background.paper`/`text.primary` —
          // the plain-paper bar `MuiAppBar` below is otherwise built for. Naming the tab's own tint
          // here (`darkBar`, `tabs.ts`) is what the dark scheme reads instead, through the
          // `enableColorOnDark`-off path MUI's `AppBar` already has for exactly this override.
          ...(tab.darkBar && { AppBar: { darkBg: tab.darkBar.tint, darkColor: DARK_TEXT } }),
        },
      },
    },
    shape: { borderRadius: 8 },
    // `CssBaseline` otherwise sets Roboto, which is not loaded here and resolves to Helvetica.
    // `system-ui` is the one stack all three sites can name: the status page can load no webfont.
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      // `h6` is the section-title role every card header takes, so weighting and tightening it
      // here is what makes a page of cards read as one set of headings rather than as whatever
      // each shell happened to ask for. 650 is a step above the body's semibold without reaching
      // the bold the panel titles inside a card use, which keeps a heading above its own content.
      h6: { fontWeight: 650, letterSpacing: "-0.01em" },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // The grey flash a mobile browser paints on every tap target is drawn at the target's
          // own box, so on a chart it lights a whole row group behind a bar a few pixels wide.
          // The app answers a tap with the card it opens, which is a stronger acknowledgement
          // than a flash. Inherited, so the body is the only place it has to be said.
          body: { WebkitTapHighlightColor: "transparent" },
        },
      },
      // A hairline instead of a raised edge, which is how the other two sites separate a card from
      // the page. Floating surfaces — menus, dialogs, popovers — keep their elevation: a shadow is
      // what says they sit above the content rather than in it, and a border cannot say that.
      MuiCard: {
        defaultProps: {
          variant: "outlined",
        },
        styleOverrides: {
          // Hover has to follow the variant, because the two have nothing in common to change: an
          // outlined card owns a border and no shadow, an elevation card the reverse. Setting the
          // border colour on a card that has no border is a rule that silently does nothing.
          //
          // Behind `hover: hover` because a touch screen has no leave event: the last card tapped
          // keeps its lit border until the next tap lands elsewhere, and a wall of cards ends up
          // with one apparently selected that the reader only scrolled past.
          root: ({ theme, ownerState }) => ({
            "@media (hover: hover)": {
              "&:hover":
                ownerState.variant === "outlined"
                  ? { borderColor: theme.vars.palette.primary.main }
                  : { boxShadow: theme.shadows[4] },
            },
          }),
        },
      },
      // Flattened, and `enableColorOnDark` stays off: the accent fills the bar at full strength in
      // the light scheme, and holding it at that strength against the dark page too would be the
      // light bar's own treatment redrawn on the wrong ground. The dark scheme instead takes each
      // tab's own 22% tint through the `AppBar.darkBg` override above, distinguishable from its
      // neighbours without paying that saturation cost.
      MuiAppBar: {
        defaultProps: {
          elevation: 0,
        },
      },
      // The segment: one of a small closed set, lit in the tab's own primary. The lit wash is
      // twice MUI's own `selectedOpacity`, which at 8% on the dark paper is a tint a reader has
      // to hunt for; the word turns primary and gains a weight with it, so the state survives
      // being read at 12px.
      MuiToggleButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            ...CONTROL_TYPE_SX,
            minHeight: CONTROL_HEIGHT,
            // A stated height rather than symmetrical padding: `theme.typography.button`'s own
            // line height puts a 12px word at 21px, so padding sized for the word makes the
            // control 31. A minimum instead of a height, so a segment holding an icon rather
            // than a word grows to it instead of overflowing.
            padding: "0 10px",
            borderRadius: CONTROL_RADIUS,
            color: theme.vars.palette.text.primary,
            backgroundColor: theme.vars.palette.background.paper,
            // Reset before the hover is stated, because MUI's own rule sits outside any pointer
            // query: a touch screen has no leave event, so the last segment tapped would keep
            // the hovered wash until another tap landed elsewhere and two would read as lit.
            "&:hover": { backgroundColor: theme.vars.palette.background.paper },
            "&.Mui-selected": {
              color: theme.vars.palette.primary.main,
              fontWeight: 600,
              backgroundColor: primaryWash(theme, 0.16),
              "&:hover": { backgroundColor: primaryWash(theme, 0.16) },
            },
            "@media (hover: hover)": {
              "&:hover": { backgroundColor: primaryWash(theme, 0.08) },
              "&.Mui-selected:hover": { backgroundColor: primaryWash(theme, 0.24) },
            },
            "@media (pointer: coarse)": { minHeight: COARSE_CONTROL_HEIGHT },
            ...focusRing(theme),
          }),
        },
      },
      // The group's own corner, which MUI takes from `shape.borderRadius` — the card's 8, where
      // a control is a 6. The buttons inside square their touching edges off that value, so the
      // two have to agree or the group's outline steps at its ends.
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: { borderRadius: CONTROL_RADIUS },
        },
      },
      // The action: one icon, one meaning — open as a layer, reveal in place, close. A square
      // the size of a segment, so a header's controls stand level whichever of the two they are.
      // The app bar states its own size (`NavBar.tsx`): the bar is a filled surface with nothing
      // beside its buttons to be level with, where a 28px square reads as a control that shrank.
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            width: CONTROL_HEIGHT,
            height: CONTROL_HEIGHT,
            padding: 0,
            borderRadius: CONTROL_RADIUS,
            "& .MuiSvgIcon-root": { fontSize: 18 },
            "&:hover": { backgroundColor: "transparent" },
            "@media (hover: hover)": { "&:hover": { backgroundColor: primaryWash(theme, 0.08) } },
            "@media (pointer: coarse)": { width: COARSE_CONTROL_HEIGHT, height: COARSE_CONTROL_HEIGHT },
            ...focusRing(theme),
          }),
        },
      },
      // The rail chip: navigation, and the one part of the kit drawn as a pill. Sized on the
      // small chip alone, which is what a rail asks for — a chip standing over artwork or in a
      // filter sheet is a label rather than a mark on a scale and keeps MUI's own size.
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            "& .MuiChip-label:empty": { paddingLeft: 0 },
            ...focusRing(theme),
          }),
          sizeSmall: {
            "@media (pointer: coarse)": {
              height: COARSE_CONTROL_HEIGHT,
              borderRadius: COARSE_CONTROL_HEIGHT / 2,
            },
            // Tabular figures because most of these labels are years: proportional digits change a
            // label's width with the numerals in it, so a row of them shifts sideways as the
            // highlight moves through it. On the label rather than the chip, since the chip's own
            // rule about an empty one has to keep outweighing this.
            "& .MuiChip-label": {
              ...NUMERIC_LABEL_SX,
              paddingLeft: 9,
              paddingRight: 9,
              "@media (pointer: coarse)": { paddingLeft: 11, paddingRight: 11 },
            },
          },
        },
      },
      // The worded action — a picker's own button, a count that is its own control. Only the
      // small size, which is the kit's: the app bar's buttons are the bar's furniture and stand
      // at the size a filled bar gives them.
      MuiButton: {
        styleOverrides: {
          sizeSmall: ({ theme }) => ({
            ...CONTROL_TYPE_SX,
            // A word carrying an action, against the segments' plain labels beside it.
            fontWeight: 600,
            minHeight: CONTROL_HEIGHT,
            // MUI's own floor is 64px, which pads "Date" out to twice its width in a header
            // where the controls are read as a row.
            minWidth: 0,
            padding: "0 10px",
            borderRadius: CONTROL_RADIUS,
            "@media (pointer: coarse)": { minHeight: COARSE_CONTROL_HEIGHT },
            ...focusRing(theme),
          }),
        },
      },
      // A menu item is read, not scanned: 14px against the kit's 12, since the menu is the one
      // surface where the options are stated in full rather than abbreviated to fit a row.
      MuiMenuItem: {
        styleOverrides: {
          root: { fontSize: 14 },
        },
      },
      MuiCardHeader: {
        styleOverrides: {
          content: {
            alignSelf: "flex-start",
          },
          root: {
            paddingBottom: 4,
          },
        },
      },
    },
  });

  themeCache.set(tab.id, theme);
  return theme;
};

export default Graphs;
