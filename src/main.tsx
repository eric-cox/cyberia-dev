import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Глобальная обработка ошибок
window.addEventListener("error", (event) => {
  console.error("[Global Error]", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[Unhandled Rejection]", event.reason);
});

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("[React Init Error]", error);
  document.body.innerHTML = `
    <div style="color: white; padding: 20px; font-family: monospace;">
      <h1>Error initializing game</h1>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}
