import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// eslint-disable-next-line
import App from "./finance/App";
import * as serviceWorker from "./serviceWorker";
import Google from "./vg/Google";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

root.render(
  <React.StrictMode>
    <Google />
    {/*<App />*/}
  </React.StrictMode>
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
