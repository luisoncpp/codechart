// @Architecture(descriptionShort="Application entry point mounting the React app")
import React from "react";
import ReactDOM from "react-dom/client";
import "./app/Private/global.css";
import { App } from "./app";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
