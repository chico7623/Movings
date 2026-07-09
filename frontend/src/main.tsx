/**
 * Frontend entrypoint. Mounts React into the DOM and starts the Movings app.
 */
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { applyMovingsTheme, MovingsTheme } from "./hooks/useTheme";

const savedTheme = typeof window !== "undefined" ? window.localStorage.getItem("movings_theme") : null;
applyMovingsTheme((savedTheme || "dark") as MovingsTheme);

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
} else {
  console.error("Não foi encontrado o elemento root no HTML.");
}
