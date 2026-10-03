import React from "react";
import { createRoot } from "react-dom/client";
import "./lib/i18n";
import App from "./app/App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
