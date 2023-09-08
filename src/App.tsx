import { createHashRouter, createRoutesFromElements, Route, RouterProvider } from "react-router-dom";
import Tabs from "./tabs.ts";
import Google from "./Google.tsx";

(window as unknown as { global: typeof window }).global ||= window;

const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<Google />}>
      <Route index element={Tabs[0].component} handle={{ tab: Tabs[0] }} />
      {Tabs.map((tab) => (
        <Route key={tab.id} path={tab.id} element={tab.component} handle={{ tab: tab }} />
      ))}
    </Route>
  )
);

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;
