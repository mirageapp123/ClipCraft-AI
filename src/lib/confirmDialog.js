let activeClose = null;

const ICONS = {
  default: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 3.3 2.4c-.7.3-.9.8-.9 1.6"/><circle cx="12" cy="16.6" r="0.9" fill="currentColor" stroke="none"/>',
  danger: '<path d="M12 3 2.6 20.4h18.8L12 3Z"/><path d="M12 9v4.6"/><circle cx="12" cy="17.2" r="0.9" fill="currentColor" stroke="none"/>',
};

/**
 * In-app replacement for window.confirm. Sandboxed frames and host webviews can
 * silently block the native dialog, which made destructive actions look broken.
 * Resolves true when the user confirms, false otherwise.
 */
export function confirmAction({
  title = "Are you sure?",
  message = "",
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  tone = "default",
} = {}) {
  if (typeof document === "undefined") return Promise.resolve(false);
  activeClose?.(false);
  return new Promise((resolve) => {
    const previousFocus = document.activeElement;
    const backdrop = document.createElement("div");
    backdrop.className = "save-project-backdrop app-confirm-backdrop";
    backdrop.setAttribute("role", "presentation");

    const dialog = document.createElement("section");
    dialog.className = "save-project-dialog app-confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "app-confirm-title");

    const head = document.createElement("header");
    head.className = "save-project-head";
    const icon = document.createElement("span");
    icon.className = `save-project-icon app-confirm-icon${tone === "danger" ? " is-danger" : ""}`;
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[tone] || ICONS.default}</svg>`;

    const text = document.createElement("div");
    const heading = document.createElement("h2");
    heading.id = "app-confirm-title";
    heading.textContent = title;
    text.append(heading);
    if (message) {
      const paragraph = document.createElement("p");
      paragraph.id = "app-confirm-message";
      paragraph.textContent = message;
      text.append(paragraph);
      dialog.setAttribute("aria-describedby", "app-confirm-message");
    }
    head.append(icon, text);

    const actions = document.createElement("footer");
    actions.className = "save-project-actions app-confirm-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "save-project-cancel";
    cancel.textContent = cancelLabel;
    const proceed = document.createElement("button");
    proceed.type = "button";
    proceed.className = `save-project-confirm app-confirm-primary${tone === "danger" ? " is-danger" : ""}`;
    proceed.textContent = confirmLabel;
    actions.append(cancel, proceed);

    dialog.append(head, actions);
    backdrop.append(dialog);
    document.body.append(backdrop);

    const close = (value) => {
      if (activeClose === close) activeClose = null;
      document.removeEventListener("keydown", onKey, true);
      backdrop.remove();
      if (previousFocus instanceof HTMLElement) {
        try { previousFocus.focus({ preventScroll: true }); } catch { /* The trigger may be gone. */ }
      }
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(false);
      }
    };

    cancel.addEventListener("click", () => close(false));
    proceed.addEventListener("click", () => close(true));
    backdrop.addEventListener("mousedown", (event) => {
      if (event.target === backdrop) close(false);
    });
    document.addEventListener("keydown", onKey, true);
    activeClose = close;
    (tone === "danger" ? cancel : proceed).focus({ preventScroll: true });
  });
}
