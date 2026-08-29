import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "../assets/base.css";
import "../css/landing.css";
import "../css/style.css";
import { startBeijingThemeClock } from "./app/chrome";
import { AppRouter } from "./app/router";
import { AntdProvider } from "./theme/AntdProvider";
import "./app/brand-mark.css";

startBeijingThemeClock();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root was not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <AntdProvider>
      <AppRouter />
    </AntdProvider>
  </StrictMode>,
);
