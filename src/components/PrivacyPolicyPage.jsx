import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  Cookie,
  Database,
  GithubLogo,
  HardDrive,
  LockKey,
  ShieldCheck,
} from "@phosphor-icons/react";

const REPOSITORY_URL = "https://github.com/MartinDelophy/ai-video-editor";
const ISSUES_URL = "https://github.com/MartinDelophy/ai-video-editor/issues";

const HIGHLIGHTS = [
  {
    icon: HardDrive,
    title: "Local-first editing",
    body: "Imported media, timeline edits, previews, and exports are handled by your browser. ClipCraft does not operate an account server or a media-upload server.",
  },
  {
    icon: LockKey,
    title: "Accounts stay on this device",
    body: "Email accounts and sessions are stored in this browser's local storage. Passwords are kept only as a salted PBKDF2-SHA256 hash, never as plain text.",
  },
  {
    icon: Cookie,
    title: "No tracking or ad cookies",
    body: "The app contains no analytics, telemetry, advertising pixels, or tracking cookies. Your editing activity is not reported anywhere.",
  },
];

function PolicySection({ id, title, children }) {
  return (
    <section className="privacy-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="privacy-page">
      <div className="privacy-aurora" aria-hidden="true" />

      <header className="privacy-nav">
        <a className="privacy-brand" href="/">
          <img src="/icons/timeline-studio-icon.svg" alt="" width="38" height="38" />
          <span className="privacy-wordmark">
            ClipCraft <em>AI</em>
          </span>
        </a>
        <a className="privacy-back" href="/">
          <ArrowLeft size={15} weight="bold" aria-hidden="true" />
          Back to editor
        </a>
      </header>

      <main className="privacy-main">
        <section className="privacy-hero">
          <span className="privacy-eyebrow">
            <ShieldCheck size={15} weight="bold" aria-hidden="true" />
            Privacy Policy
          </span>
          <h1>
            Your projects stay
            <br />
            <span>on your device.</span>
          </h1>
          <p className="privacy-lede">
            ClipCraft is a local-first, browser-based video editor. This page explains exactly what the
            application stores, what leaves your browser, and the choices you have. It describes the behaviour
            of the ClipCraft application code only — no more and no less.
          </p>
          <div className="privacy-meta">
            <span>Last updated: November 11, 2026</span>
            <span className="privacy-meta-dot" aria-hidden="true" />
            <span>Applies to the ClipCraft web application</span>
          </div>
        </section>

        <div className="privacy-highlights">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <article className="privacy-highlight" key={title}>
              <span className="privacy-highlight-icon">
                <Icon size={19} weight="duotone" aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <article className="privacy-doc">
          <PolicySection id="scope" title="1. Scope of this policy">
            <p>
              This policy covers the ClipCraft web application and the data it handles in your browser. If you
              reach ClipCraft through a third-party website, launcher, or hosting provider, that provider may
              apply its own terms and privacy policy in addition to this page.
            </p>
            <p>
              ClipCraft is open source. The behaviour described here can be reviewed in the{" "}
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
                public repository <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection id="on-device" title="2. Information stored on your device">
            <p>
              ClipCraft keeps its working state inside your browser. Nothing in this section is transmitted to
              a ClipCraft server, because the application does not run one.
            </p>
            <ul className="privacy-list">
              <li>
                <strong>Editor working data.</strong> Media you import, timeline clips, effects, captions, and
                previews are held in the memory of the current browser tab. Reloading or closing the tab
                discards unsaved changes. The “Autosaved” indicator in the top bar shows the time of the last
                edit in the current session; a project is written to a file only when you export or download
                it, or when you use the optional local host service described in section 6.
              </li>
              <li>
                <strong>Account records.</strong> If you create an email account, the email address, display
                name, and a password hash are saved in this browser’s <code>localStorage</code> under{" "}
                <code>clipcraft-accounts-v1</code>. The password itself is never stored. It is converted with
                PBKDF2-SHA256 using a random 16-byte salt and 150,000 iterations.
              </li>
              <li>
                <strong>Session record.</strong> Your current sign-in is saved under{" "}
                <code>clipcraft-session-v1</code> and contains the provider (email, Google, or guest), email
                address, display name, profile picture URL, and creation time.
              </li>
              <li>
                <strong>Preferences.</strong> Interface language, voice favourites, caption settings, and
                similar options are stored locally so the editor can restore them on your next visit.
              </li>
              <li>
                <strong>Caches.</strong> AI model files are cached in the browser’s Cache Storage and, for some
                voice models, the Origin Private File System. Saved voice profiles live in the IndexedDB
                database <code>timeline-studio-voice-library</code>. Cached files exist only to avoid
                re-downloading them and can be removed by clearing site data.
              </li>
            </ul>
            <div className="privacy-note">
              <Database size={16} weight="duotone" aria-hidden="true" />
              <span>
                You can remove all of this at any time by clearing site data for ClipCraft in your browser
                settings. Doing so also removes your local accounts, saved voice profiles, and cached models.
              </span>
            </div>
          </PolicySection>

          <PolicySection id="ai" title="3. AI features and model downloads">
            <p>
              Generation features — voiceovers, music, captions, repair, subject effects, and talking avatars
              — run inside your browser using WebAssembly, WebGPU, or the browser’s built-in AI capabilities.
              The media and text you process are handled on your device.
            </p>
            <p>
              Model files are downloaded from Hugging Face (<code>huggingface.co</code>,{" "}
              <code>cdn-lfs.huggingface.co</code>) or ModelScope (<code>www.modelscope.cn</code>) the first
              time a feature needs them. As with any web request, those providers receive standard technical
              information such as your IP address, browser user agent, and the requested file. ClipCraft does
              not send your imported media, prompts, or project content to those hosts.
            </p>
          </PolicySection>

          <PolicySection id="google" title="4. Google Sign-In">
            <p>
              Signing in with Google is optional. When you choose it, the app loads Google Identity Services
              from <code>accounts.google.com</code> and Google authenticates your account. ClipCraft receives
              a Google ID token and decodes the name, email address, and profile picture from it locally. The
              app never receives your Google password, and it does not call Google APIs with the token. Google’s
              handling of your account is governed by Google’s own privacy policy.
            </p>
            <p>
              You can use ClipCraft without Google by creating a local email account or by continuing as a
              guest.
            </p>
          </PolicySection>

          <PolicySection id="third-parties" title="5. Requests to third-party services">
            <p>
              Some optional features contact external services directly from your browser. These requests
              happen only when you use the related feature:
            </p>
            <ul className="privacy-list">
              <li>
                <strong>Stock media search.</strong> Search terms and paging requests are sent to Wikimedia
                Commons (<code>commons.wikimedia.org</code>), Pexels (<code>api.pexels.com</code>), and
                Openverse (<code>api.openverse.org</code>) when you search for stock images, video, or audio.
              </li>
              <li>
                <strong>Caption fonts.</strong> Font stylesheets are requested from Google Fonts
                (<code>fonts.googleapis.com</code>) when a caption font is loaded.
              </li>
              <li>
                <strong>Google Identity Services.</strong> Loaded from <code>accounts.google.com</code> only
                when you start a Google sign-in.
              </li>
              <li>
                <strong>External links.</strong> Links to GitHub, YouTube, Discord, or X open in a new page and
                are governed by those sites’ policies.
              </li>
            </ul>
            <p>
              Like any request made by a browser, these services receive standard technical data such as your
              IP address, user agent, and the requested URL. ClipCraft does not attach your project content or
              account details to these requests.
            </p>
          </PolicySection>

          <PolicySection id="host" title="6. Optional local host service">
            <p>
              The open-source build includes an optional host service that you can run on your own machine.
              When it is enabled — the page includes a <code>timeline-studio-host</code> meta tag — the editor
              can communicate with that service at the same origin under <code>/api/v1</code> to save project
              snapshots and project media.
            </p>
            <p>
              That storage belongs to the local service you chose to run, not to a ClipCraft cloud service.
              If you do not run the host, this integration stays inactive and the editor continues to work
              entirely in your browser tab.
            </p>
          </PolicySection>

          <PolicySection id="not-collected" title="7. What ClipCraft does not do">
            <ul className="privacy-checklist">
              <li>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                <span>No analytics, telemetry, crash reporting, or behaviour tracking.</span>
              </li>
              <li>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                <span>No advertising networks, tracking pixels, or profiling.</span>
              </li>
              <li>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                <span>No selling or sharing of personal information.</span>
              </li>
              <li>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                <span>No uploading of your videos, audio, or images to a ClipCraft server.</span>
              </li>
              <li>
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                <span>No access to files you have not explicitly selected or recorded.</span>
              </li>
            </ul>
            <p>
              The server that delivers the ClipCraft website may keep standard access logs as part of normal
              hosting. That data is handled by the hosting provider under its own policy; ClipCraft’s
              application code does not receive or use it.
            </p>
          </PolicySection>

          <PolicySection id="choices" title="8. Your choices">
            <ul className="privacy-list">
              <li>
                <strong>Sign out</strong> to remove the local session record from this browser.
              </li>
              <li>
                <strong>Clear site data</strong> to delete local accounts, preferences, voice profiles, and
                cached models.
              </li>
              <li>
                <strong>Skip Google</strong> and use a local account or guest mode instead.
              </li>
              <li>
                <strong>Export your project</strong> before closing the tab, because working data in the tab is
                not persisted automatically outside the optional host service.
              </li>
              <li>
                <strong>Use private browsing</strong> if you prefer storage to be discarded when the window
                closes; some features that need local storage may be unavailable.
              </li>
            </ul>
          </PolicySection>

          <PolicySection id="children" title="9. Children’s privacy">
            <p>
              ClipCraft is a general-purpose creative tool and is not directed at children. Because the
              application does not operate an account server or collect personal information centrally, it
              does not knowingly collect personal information from children. Parents and guardians can clear
              the browser’s site data at any time to remove locally stored information.
            </p>
          </PolicySection>

          <PolicySection id="changes" title="10. Changes to this policy">
            <p>
              This policy may be updated when the application changes. The date at the top of this page shows
              the latest revision. Because ClipCraft is open source, changes to the relevant behaviour are
              visible in the public repository.
            </p>
          </PolicySection>

          <PolicySection id="contact" title="11. Contact">
            <p>
              Questions about this policy or the app’s data handling can be raised in the project’s issue
              tracker. There is no ClipCraft account server to contact, and no support email is operated for
              the application.
            </p>
            <a className="privacy-contact" href={ISSUES_URL} target="_blank" rel="noreferrer noopener">
              <GithubLogo size={18} weight="fill" aria-hidden="true" />
              Open an issue on GitHub
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </a>
          </PolicySection>
        </article>
      </main>

      <footer className="privacy-footer">
        <span>© 2026 ClipCraft. Local-first by design.</span>
        <nav aria-label="Footer">
          <a href="/">Editor</a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
            Source code
          </a>
          <a href="/privacy-policy" aria-current="page">
            Privacy Policy
          </a>
        </nav>
      </footer>
    </div>
  );
}
