import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useState } from "react";
import NavBar from "./NavBar";
import { BottomTabs } from "./BottomTabs";
import { BrowserTint } from "./BrowserTint";
import { BOTTOM_TABS_CLEARANCE, safeAreaGutters } from "./common/chrome";
import { Outlet } from "react-router-dom";
import { GoogleAuthProvider } from "./contexts/GoogleAuthContext.tsx";
import { FranchiseUnionProvider } from "./omnibus/franchiseUnion.tsx";
import { SearchHost } from "./omnibus/Search.tsx";
import { barColour, useCurrentTab } from "./tabs.ts";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

const GoogleAuth = () => {
  const [guestMode, setGuestMode] = useState(false);

  return (
    <GoogleAuthProvider>
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
        <FranchiseUnionProvider guestMode={guestMode}>
          <Outlet context={{ guestMode }} />
          {/* Inside the provider, since the palette lists the union's own items; opened from the
              app bar above through a store rather than a flag lifted over both. */}
          <SearchHost />
        </FranchiseUnionProvider>
      </Container>
      <BottomTabs />
      <BrowserTint />
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
      MuiChip: {
        styleOverrides: {
          root: {
            "& .MuiChip-label:empty": { paddingLeft: 0 },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            textTransform: "capitalize",
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            textTransform: "capitalize",
          },
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
