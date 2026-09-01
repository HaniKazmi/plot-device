import { HashRouter, Routes, Route } from "react-router-dom";
import Tabs from "./tabs.ts";
import Google from "./Google.tsx";
import { preload } from "react-dom";
import { g_script, gapi_script } from "./contexts/GoogleAuthContext.tsx";

// A Node-style `global`, for a dependency that expects one. Behind a `typeof` check because this
// is a module-scope statement: bare, merely importing this file throws wherever `window` is absent,
// which is every non-browser context that might reach the entry point.
if (typeof window !== "undefined") {
  (window as unknown as { global: typeof window }).global ||= window;
}

function App() {
  preload(g_script, { as: "script" });
  preload(gapi_script, { as: "script" });
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
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
