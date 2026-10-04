import { HashRouter, Routes, Route } from "react-router-dom";
import Tabs from "./tabs.ts";
import Google from "./Google.tsx";
import Franchise from "./omnibus/Franchise.tsx";
import { FRANCHISE_ROUTE } from "./app/franchisePage.ts";

// A Node-style `global`, for a dependency that expects one. Behind a `typeof` check because this
// is a module-scope statement: bare, merely importing this file throws wherever `window` is absent,
// which is every non-browser context that might reach the entry point.
if (typeof window !== "undefined") {
  (window as unknown as { global: typeof window }).global ||= window;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={<Google />}
        >
          <Route
            index
            Component={Tabs[0].component}
          />
          {Tabs.map((tab) => (
            <Route
              key={tab.id}
              path={tab.id}
              Component={tab.component}
            />
          ))}
          {/* A franchise's own page, standing under the Omnibus: the path's first segment names
              the tab the chrome draws around it. */}
          <Route
            path={FRANCHISE_ROUTE}
            Component={Franchise}
          />
          {/* Anything else lands where the index does, which is what keeps the outlet and the
              chrome naming one tab: `tabForPath` answers `Tabs[0]` for a path it does not know, so
              the bar and the theme draw this tab whether or not a route matches. Without the route
              they draw it over an outlet holding nothing — a blank page under a full app bar. */}
          <Route
            path="*"
            Component={Tabs[0].component}
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
