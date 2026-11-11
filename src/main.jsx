import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage.jsx";
import { registerModelCacheServiceWorker } from "./lib/serviceWorker.js";
import { connectHostSession } from "./lib/hostSession.js";
import { getStoredLanguage } from "./i18n.js";
import { hostText } from "./i18nHost.js";
import "./styles.css";

const rootElement = document.getElementById("root");
const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";

if (currentPath === "/privacy-policy") {
  document.title = "Privacy Policy — ClipCraft";
  createRoot(rootElement).render(
    <React.StrictMode>
      <PrivacyPolicyPage />
    </React.StrictMode>,
  );
} else {
  registerModelCacheServiceWorker();

  void connectHostSession().then((hostSession) => {
    createRoot(rootElement).render(
      <React.StrictMode>
        <App hostSession={hostSession} />
      </React.StrictMode>,
    );
  }).catch(() => {
    const message = document.createElement("p");
    message.setAttribute("role", "alert");
    message.textContent = hostText(getStoredLanguage(), "expired");
    rootElement.replaceChildren(message);
  });
}
