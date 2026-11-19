export function isEditorTextEntryTarget(target) {
  return target instanceof Element && Boolean(target.closest(
    "input, textarea, select, [contenteditable='true'], audio[controls], video[controls]",
  ));
}

export function isEditorInteractiveTarget(target) {
  return target instanceof Element && Boolean(target.closest(
    "button, a, [role='button'], [role='menuitem'], [role='menuitemradio'], [role='slider']",
  ));
}

export function isEditorShortcutBlockedByModal() {
  if (typeof document === "undefined") return false;
  // Only real modal dialogs should block editing shortcuts. The settings and
  // export popovers also use role="dialog" but are non-modal, so users can read
  // the shortcut guide and try the keys without closing the panel first.
  const modals = document.querySelectorAll("[role='dialog'][aria-modal='true']");
  for (const modal of modals) {
    if (modal.matches(".preview-stage.is-focus-preview")) continue;
    return true;
  }
  return false;
}

export function releasePointerActivatedFocus(event) {
  if (event?.detail > 0) event.currentTarget?.blur?.();
}

export function getPrimaryShortcutModifier() {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
}

export function formatShortcutLabel(label, shortcut) {
  return shortcut ? `${label} · ${shortcut}` : label;
}
