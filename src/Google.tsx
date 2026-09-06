import { Container, createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { useState, type ReactNode } from "react";
import NavBar from "./NavBar";
import { BottomTabs } from "./BottomTabs";
import { BrowserTint } from "./BrowserTint";
import { BOTTOM_TABS_CLEARANCE, safeAreaGutters, useScrolledPastBar } from "./common/chrome";
import { usePhone } from "./common/breakpoints";
import {
  COARSE_CONTROL_HEIGHT,
  CONTROL_HEIGHT,
  CONTROL_RADIUS,
  CONTROL_TYPE_SX,
  focusRingSx,
  NUMERIC_LABEL_SX,
  primaryWash,
} from "./common/typography";
import { Outlet } from "react-router-dom";
import { GoogleAuthProvider } from "./contexts/GoogleAuthContext.tsx";
import { LibraryProvider } from "./app/LibraryProvider.tsx";
import { FranchiseUnionProvider } from "./app/franchiseUnion.tsx";
import { SearchHost } from "./app/Search.tsx";
import { useAuthState } from "./app/authState.ts";
import { usePage } from "./app/page.ts";
import { pageCount } from "./app/pageState.ts";
import { NothingMatchesContext } from "./common/nothingMatchesContext.ts";
import { isNarrowedEmpty } from "./common/population.ts";
import { isAllTime, scopeLabel } from "./common/scope.ts";
import { CURRENT_YEAR } from "./common/date.ts";
import { EmptyCard } from "./app/EmptyCard.tsx";
import { ErrorBoundary } from "./common/ErrorBoundary.tsx";
import { barColour, useCurrentTab } from "./tabs.ts";
import type { Tab } from "./tabs.ts";
import type {} from "@mui/material/themeCssVarsAugmentation";

/**
 * The tab, or the reason there is none to draw.
 *
 * A component of its own because the state is read from a hook and `GoogleAuth` below mounts the
 * providers that answer it, so it is above them and cannot ask. Every other state renders the
 * outlet: a tab holding a cached copy paints it with the strip above saying so, and one still
 * fetching paints what it has, which is what a cache-first page is for.
 */
/**
 * Whether the page being drawn has been narrowed to nothing, answered once for every shell on it.
 *
 * The test is the page's own population and not any one chart's: a library with nothing in it draws
 * no message and offers no way back, and only the page knows which of its two settings — the
 * filters or the year scope — the reader has moved. Answered here, above the outlet, because the
 * tab's own tree is a dozen shells deep and each of them would otherwise be handed a node it never
 * looks at.
 *
 * It costs one pass of the page's own predicate over its library per filter change — the same pass
 * the box's footer makes for the same figure — and the outlet below it is the caller's own element,
 * so a change here re-renders this and not the page.
 */
const NothingMatchesProvider = ({ children }: { children: ReactNode }) => {
  const { page, state, dispatch } = usePage();
  const filtersActive = page !== undefined && page.store.activeCountOf(state) > 0;
  const scoped = !isAllTime(state.yearTo, state.yearType, CURRENT_YEAR);

  return (
    <NothingMatchesContext
      value={{
        active: page ? isNarrowedEmpty(pageCount(page, state), filtersActive, scoped) : false,
        filtersActive,
        scope: scoped ? scopeLabel(state.yearTo, state.yearType, CURRENT_YEAR) : undefined,
        clearFilters: () => dispatch({ type: "resetFilters" }),
        // The whole scope, exactly as the picker's own "All time" sets it.
        clearScope: () => dispatch({ type: "scope", yearTo: CURRENT_YEAR, yearType: "upto" }),
      }}
    >
      {children}
    </NothingMatchesContext>
  );
};

/**
 * The boundary around the page, keyed on the tab it stands over.
 *
 * A boundary holds its error until something remounts it, and the reader's own way out of a page
 * that threw is another tab — keyed on the tab id, a change of tab builds a fresh boundary and the
 * next page draws, where one boundary for the app would keep the card up until a reload. The key
 * is the whole reason this is a component: `ErrorBoundary` is domain-blind and reads no route.
 */
const PageBoundary = ({ children }: { children: ReactNode }) => {
  const tab = useCurrentTab();

  return <ErrorBoundary key={tab.id}>{children}</ErrorBoundary>;
};

const PageContent = () =>
  useAuthState() === "empty" ? (
    <EmptyCard />
  ) : (
    <NothingMatchesProvider>
      <Outlet />
    </NothingMatchesProvider>
  );

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
            {/* Below the bar and the providers, and around the page alone: a throw in a chart, a
                converter's colour lookup or a card leaves the app bar, the tabs and the search
                standing, which is what the reader leaves the broken page by. The search host is a
                sibling rather than a child, so a page's throw cannot take it down with the page,
                and the boundary's tab key cannot remount it and drop the query it holds. */}
            <PageBoundary>
              <PageContent />
            </PageBoundary>
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

/**
 * The two `theme-color` metas, in a component of its own nested inside the `ThemeProvider` below:
 * `usePhone` reads a breakpoint off the nearest theme in context, which is the one `Graphs` is
 * itself in the middle of providing — called from `Graphs`' own body the hook would find no theme
 * above it at all, this being the outermost `ThemeProvider` in the tree.
 */
const ThemeColorMetas = ({
  theme,
  darkThemeColour,
}: {
  theme: ReturnType<typeof getTheme>;
  darkThemeColour: string;
}) => {
  const phone = usePhone();
  // Below `sm`, once the page has scrolled past the app bar, the two metas state the page's own
  // ground: nothing at the top of the screen still says which tab is open, so the status bar over
  // it should read as the page it is above. Safari answers none of this — it samples the strip
  // `BrowserTint` draws and, past the bar, there is none, so it falls to its own translucent bar —
  // but a browser that does honour the meta lands on the ground the page actually paints rather
  // than on a tab colour scrolled out of reach. Stated rather than dropped, because a meta removed
  // is a meta the installed app answers from its manifest instead, which names the Omnibus's purple
  // whatever tab is open.
  const scrolledPastBar = useScrolledPastBar();
  const onPage = phone && scrolledPastBar;

  return (
    <>
      <meta
        name="theme-color"
        content={onPage ? LIGHT_PAGE_GROUND : theme.palette.primary.main}
        media="(prefers-color-scheme: light)"
      />
      <meta
        name="theme-color"
        content={onPage ? DARK_PAGE_GROUND : darkThemeColour}
        media="(prefers-color-scheme: dark)"
      />
    </>
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
      <ThemeColorMetas
        theme={theme}
        darkThemeColour={darkThemeColour}
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

// The two schemes' own page ground, named once so `getTheme`'s palette and the scrolled-past
// `theme-color` metas cannot drift onto a value that is not what the page at that edge paints.
const LIGHT_PAGE_GROUND = "#f6f7f9";
const DARK_PAGE_GROUND = "#14171a";

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
          background: { default: LIGHT_PAGE_GROUND, paper: "#ffffff" },
          text: { primary: "#1b1f24", secondary: "#6a737d" },
          divider: "#e1e4e8",
        },
      },
      dark: {
        palette: {
          // The bar's own `rule` rather than the primary that tint is mixed from. A primary is
          // solved against the white paper: on the dark one Games' carries 3.6:1 and Shows' 3.4,
          // enough for a band and short of what a lit segment's 12px word or a picker's lit edge
          // needs, where `rule` is that same hue solved lighter and clears 5:1 on the paper
          // (`DarkBar`, `tabs.ts`). The bar keeps the tint, through the `AppBar.darkBg` override
          // below; a chart's single-group series keeps the light literal, `Barchart` reading
          // `theme.palette` rather than `theme.vars`.
          primary: { main: tab.darkBar?.rule ?? primaryColour },
          secondary: { main: secondaryColour },
          background: { default: DARK_PAGE_GROUND, paper: DARK_PAPER },
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
        styleOverrides: (theme) => ({
          // The grey flash a mobile browser paints on every tap target is drawn at the target's
          // own box, so on a chart it lights a whole row group behind a bar a few pixels wide.
          // The app answers a tap with the card it opens, which is a stronger acknowledgement
          // than a flash. Inherited, so the body is the only place it has to be said.
          body: { WebkitTapHighlightColor: "transparent" },
          // What shows past the page's ends when a phone rubber-bands, and what Safari extends
          // under its status bar: the tab's own bar colour while the page is against the app bar,
          // so a pull past the top opens no band of paper between the status bar and the bar, and
          // the page's ground once scrolled past it (`data-past-bar`, set by `BrowserTint.tsx` on
          // the boundary the tint strip already keys on), where the bar colour would tint the
          // status bar over a page that has scrolled the bar away. Both `html` and `body`, since
          // Safari reads the body's and paints nothing above the document's edge, so a bar
          // reaching up past it shows nothing. At every width: a desktop Safari rubber-bands too,
          // and the app bar is what stands at the top there as well. The dark half is stated
          // under the same media query MUI emits the dark palette in, there being no
          // `colorSchemeSelector`.
          "html, body": {
            backgroundColor: barColour(tab, "light"),
            "@media (prefers-color-scheme: dark)": { backgroundColor: barColour(tab, "dark") ?? DARK_PAPER },
          },
          "html[data-past-bar], html[data-past-bar] body": {
            backgroundColor: theme.vars.palette.background.default,
          },
          // The page's ground moves onto the app's own root, the body having given it up: the
          // root is what the page is drawn in, and it stands at least a screen tall so a short
          // page does not end on the bar colour.
          "#root": {
            minHeight: "100svh",
            backgroundColor: theme.vars.palette.background.default,
          },
        }),
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
            ...focusRingSx(theme),
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
            ...focusRingSx(theme),
          }),
        },
      },
      // The rail chip: navigation, and the one part of the kit drawn as a pill. Sized on the
      // small chip alone, which is what a rail asks for — a chip standing over artwork or in a
      // list of values is a label rather than a mark on a scale and keeps MUI's own size.
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            "& .MuiChip-label:empty": { paddingLeft: 0 },
            ...focusRingSx(theme),
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
            ...focusRingSx(theme),
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
