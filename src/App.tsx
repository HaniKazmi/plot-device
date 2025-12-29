import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import Tabs from "./tabs.ts";
import Google from "./Google.tsx";
import { preload } from "react-dom";
import { g_script, gapi_script } from "./utils/googleUtils.ts";

(window as unknown as { global: typeof window }).global ||= window;

const router = createHashRouter(
  createRoutesFromElements(
    <Route
      path="/"
      element={<Google />}
    >
      <Route
        index
        Component={Tabs[0].component}
        handle={{ tab: Tabs[0] }}
      />
      {Tabs.map((tab) => (
        <Route
          key={tab.id}
          path={tab.id}
          Component={tab.component}
          handle={{ tab: tab }}
        />
      ))}
    </Route>,
  ),
);

function App() {
  preload(g_script, { as: "script" });
  preload(gapi_script, { as: "script" });
  return <RouterProvider router={router} />;
}

export default App;
