import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Clock,
  FilmSlate,
  FolderOpen,
  HardDrive,
  Plus,
  SignOut,
  Sparkle,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react";

import { formatTime } from "../lib/timeline.js";

function formatUpdated(timestamp, language) {
  if (!timestamp) return "";
  try {
    return new Intl.DateTimeFormat(language || "en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

function ProjectCard({ project, language, t, opening, onOpen, onDelete }) {
  const updated = formatUpdated(project.updatedAt, language);
  const size = formatSize(project.size);
  return (
    <article className="home-project-card">
      <button
        className="home-project-thumb"
        type="button"
        onClick={() => onOpen(project)}
        aria-label={`${t("openProject", "Open project")}: ${project.name}`}
        disabled={opening}
      >
        {project.thumbnail ? (
          <img src={project.thumbnail} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="home-project-thumb-empty" aria-hidden="true">
            <FilmSlate size={34} weight="duotone" />
          </span>
        )}
        <span className="home-project-thumb-play" aria-hidden="true">
          {opening ? <SpinnerGap className="is-spinning" size={18} weight="bold" /> : <ArrowRight size={16} weight="bold" />}
        </span>
      </button>
      <div className="home-project-body">
        <h3 className="home-project-name" title={project.name}>{project.name}</h3>
        <div className="home-project-meta">
          <span><Clock size={12} />{formatTime(project.duration)}</span>
          {project.ratioId ? <span>{project.ratioId}</span> : null}
          <span>{project.clipCount === 1 ? t("clipCountOne", "1 clip") : t("clipCount", "{count} clips").replace("{count}", String(project.clipCount || 0))}</span>
          {size ? <span>{size}</span> : null}
        </div>
        <p className="home-project-updated">{updated}</p>
      </div>
      <div className="home-project-actions">
        <button className="home-project-open" type="button" onClick={() => onOpen(project)} disabled={opening}>
          {opening ? <SpinnerGap className="is-spinning" size={15} weight="bold" /> : <FolderOpen size={15} weight="bold" />}
          {opening ? t("openingProject", "Opening…") : t("openProject", "Open project")}
        </button>
        <button
          className="home-project-delete"
          type="button"
          aria-label={`${t("deleteProject", "Delete project")}: ${project.name}`}
          title={t("deleteProject", "Delete project")}
          onClick={() => onDelete(project)}
          disabled={opening}
        >
          <Trash size={16} />
        </button>
      </div>
    </article>
  );
}

export function HomeScreen({
  t,
  language,
  projects = [],
  loading = false,
  error = "",
  openingId = "",
  authSession = null,
  onNewProject,
  onOpenProject,
  onDeleteProject,
  onRefresh,
  onSignOut,
}) {
  const [showAll, setShowAll] = useState(false);
  const displayName = authSession?.name || authSession?.email || (authSession ? t("guestAccount", "Guest") : "");
  const visibleProjects = useMemo(
    () => (showAll ? projects : projects.slice(0, 6)),
    [projects, showAll],
  );
  const projectLabel = projects.length === 1
    ? t("savedProjectCountOne", "1 project")
    : t("savedProjectCount", "{count} projects").replace("{count}", String(projects.length));

  useEffect(() => {
    if (projects.length <= 6) setShowAll(false);
  }, [projects.length]);

  return (
    <div className="home-screen" role="dialog" aria-modal="true" aria-labelledby="home-title">
      <div className="home-aurora" aria-hidden="true" />
      <header className="home-topbar">
        <div className="home-brand">
          <img src="/icons/clipcraft-reel.jpg" alt="" width="1041" height="1081" decoding="async" />
          <span className="home-brand-wordmark">ClipCraft <em>AI</em></span>
        </div>
        <div className="home-account">
          {displayName ? <span className="home-account-chip">{displayName}</span> : null}
          {onSignOut ? (
            <button className="home-signout" type="button" onClick={onSignOut} title={t("signOut", "Sign out")}>
              <SignOut size={15} weight="bold" />
              <span>{t("signOut", "Sign out")}</span>
            </button>
          ) : null}
        </div>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <span className="home-logo-frame">
            <img
              className="home-logo"
              src="/icons/clipcraft-reel.jpg"
              alt="ClipCraft AI film reel logo"
              width="1041"
              height="1081"
              decoding="async"
            />
          </span>
          <h1 id="home-title" className="home-title">ClipCraft <em>AI</em></h1>
          <p className="home-lede">
            {t("homeTagline", "Your browser-native video studio. Start a new project or pick up where you left off.")}
          </p>
          <button className="home-new-project" type="button" onClick={onNewProject}>
            <Plus size={20} weight="bold" />
            {t("newProject", "New project")}
          </button>
          <span className="home-local-note">
            <Sparkle size={13} weight="fill" aria-hidden="true" />
            {t("homeLocalNote", "Everything runs on this device — no uploads, no watermark.")}
          </span>
        </section>

        <section className="home-projects" aria-labelledby="saved-projects-title">
          <div className="home-projects-head">
            <div>
              <h2 id="saved-projects-title">{t("savedProjects", "Saved Projects")}</h2>
              <p>{projects.length ? projectLabel : t("savedProjectsHint", "Projects you save in the editor appear here.")}</p>
            </div>
            <span className="home-projects-storage">
              <HardDrive size={13} weight="bold" />
              {t("storedOnDevice", "Stored on this device")}
            </span>
          </div>

          {loading ? (
            <div className="home-project-grid" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <div className="home-project-card is-skeleton" key={index} aria-hidden="true">
                  <div className="home-project-thumb" />
                  <div className="home-project-body">
                    <span className="home-skeleton-line" />
                    <span className="home-skeleton-line is-short" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="home-empty is-error" role="alert">
              <HardDrive size={26} weight="duotone" aria-hidden="true" />
              <strong>{t("savedProjectsUnavailable", "Saved projects are unavailable")}</strong>
              <span>{error}</span>
              {onRefresh ? (
                <button type="button" onClick={onRefresh}>{t("retry", "Retry")}</button>
              ) : null}
            </div>
          ) : projects.length === 0 ? (
            <div className="home-empty">
              <FilmSlate size={30} weight="duotone" aria-hidden="true" />
              <strong>{t("noSavedProjects", "No saved projects yet")}</strong>
              <span>
                {t("noSavedProjectsHint", "Open a project, add your media, then use Save Project next to Export. It will show up here.")}
              </span>
            </div>
          ) : (
            <>
              <div className="home-project-grid">
                {visibleProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    language={language}
                    t={t}
                    opening={openingId === project.id}
                    onOpen={onOpenProject}
                    onDelete={onDeleteProject}
                  />
                ))}
              </div>
              {projects.length > 6 ? (
                <button className="home-projects-more" type="button" onClick={() => setShowAll((value) => !value)}>
                  {showAll
                    ? t("showFewerProjects", "Show fewer")
                    : t("showAllProjects", "Show all {count} projects").replace("{count}", String(projects.length))}
                </button>
              ) : null}
            </>
          )}
        </section>

        <footer className="home-footer">
          {t(
            "homeFooterNote",
            "Saved projects live in this browser. Export a .timeline package from the File menu to move a project to another device.",
          )}
        </footer>
      </main>
    </div>
  );
}

export function SaveProjectDialog({ t, defaultName, busy, thumbnail, summary, onClose, onSave }) {
  const [name, setName] = useState(defaultName || "");

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onClose]);

  const submit = (event) => {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <div
      className="save-project-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form className="save-project-dialog" role="dialog" aria-modal="true" aria-labelledby="save-project-title" onSubmit={submit}>
        <header className="save-project-head">
          <span className="save-project-icon" aria-hidden="true"><HardDrive size={20} weight="duotone" /></span>
          <div>
            <h2 id="save-project-title">{t("saveProject", "Save Project")}</h2>
            <p>{t("saveProjectHint", "Saves the full timeline and media into this browser so you can reopen it any time.")}</p>
          </div>
        </header>

        <div className="save-project-preview">
          {thumbnail ? (
            <img src={thumbnail} alt="" decoding="async" />
          ) : (
            <span aria-hidden="true"><FilmSlate size={26} weight="duotone" /></span>
          )}
          <div>
            <strong>{t("savedProjects", "Saved Projects")}</strong>
            <span>{summary || t("saveProjectLocal", "Stored locally on this device")}</span>
          </div>
        </div>

        <label className="save-project-field">
          <span>{t("projectName", "Project name")}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("projectNamePlaceholder", "My awesome video")}
            autoFocus
            maxLength={120}
            disabled={busy}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>

        <footer className="save-project-actions">
          <button type="button" className="save-project-cancel" onClick={onClose} disabled={busy}>
            {t("cancel", "Cancel")}
          </button>
          <button type="submit" className="save-project-confirm" disabled={busy || !name.trim()}>
            {busy ? <SpinnerGap className="is-spinning" size={16} weight="bold" /> : null}
            {busy
              ? t("savingProject", "Saving…")
              : t("saveProjectAction", "Save project")}
          </button>
        </footer>
      </form>
    </div>
  );
}
