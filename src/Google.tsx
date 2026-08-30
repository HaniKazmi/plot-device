import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useState } from "react";
import NavBar from "./NavBar";
import { Outlet } from "react-router-dom";
import { GoogleAuthProvider } from "./contexts/GoogleAuthContext.tsx";
import { useCurrentTab } from "./tabs.ts";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

const GoogleAuth = () => {
  const [guestMode, setGuestMode] = useState(false);

  return (
    <GoogleAuthProvider>
      <NavBar setGuestMode={setGuestMode} />
      <Container maxWidth={"xl"}>
        <Outlet context={{ guestMode }} />
      </Container>
    </GoogleAuthProvider>
  );
};

const Graphs = () => {
  const currTab = useCurrentTab();
  const theme = getTheme(currTab);

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
      <CssBaseline />
      <GoogleAuth />
    </ThemeProvider>
  );
};

// MUI's stock palette, read once for the two fallback colours rather than rebuilt per call.
const { palette: defaultPalette } = createTheme();

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
          background: { default: "#14171a", paper: "#1d2126" },
          text: { primary: "#e8eaed", secondary: "#9aa4af" },
          divider: "#2c3238",
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
          root: ({ theme, ownerState }) => ({
            "&:hover":
              ownerState.variant === "outlined"
                ? { borderColor: theme.vars.palette.primary.main }
                : { boxShadow: theme.shadows[4] },
          }),
        },
      },
      // Flattened, and otherwise left to MUI's own dark-mode behaviour: the accent fills the bar in
      // light mode and `background.paper` takes over in dark. `enableColorOnDark` would hold the
      // accent across both, at the cost of a saturated bar against a dark page — and the tab
      // indicator already says which tab is current without it.
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
