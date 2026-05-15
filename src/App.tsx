import { HashRouter, Routes, Route } from "react-router-dom";
import Tabs from "./tabs.ts";
import Google from "./Google.tsx";
import { preload } from "react-dom";
import { g_script, gapi_script } from "./utils/googleUtils.ts";

(window as unknown as { global: typeof window }).global ||= window;

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
