import ReactDOM from "react-dom/client";
import "./index.css";
import Google from "./Google";
// import * as serviceWorker from "./serviceWorker";
import reportWebVitals from "./reportWebVitals";
import "./utils/arrayUtils";
import React from "react";
import { RouterProvider, createHashRouter, createRoutesFromElements } from "react-router-dom";
import { Route } from "react-router-dom";
import Tabs from "./tabs";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
const router = createHashRouter(
  createRoutesFromElements(
    <Route path="/" element={<Google />}>
      <Route index element={Tabs[0].component} handle={{ tab: Tabs[0]}} />
      {Tabs.map((tab) => (
        <Route key={tab.id} path={tab.id} element={tab.component} handle={{ tab: tab}} />
      ))}
    </Route>
  )
);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
// serviceWorker.unregister();
