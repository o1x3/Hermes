import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { applyCachedTheme } from "@/stores/settingsStore";

// Apply cached theme synchronously before React mounts to avoid FOUC
applyCachedTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
