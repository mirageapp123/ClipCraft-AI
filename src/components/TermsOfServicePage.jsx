import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  FileText,
  Gavel,
  GithubLogo,
  Scales,
  ShieldCheck,
} from "@phosphor-icons/react";

const REPOSITORY_URL = "https://github.com/MartinDelophy/ai-video-editor";
const ISSUES_URL = "https://github.com/MartinDelophy/ai-video-editor/issues";
const LICENSES_URL = "https://github.com/MartinDelophy/ai-video-editor/blob/main/MODEL_LICENSES.md";

const HIGHLIGHTS = [
  {
    icon: FileText,
    title: "Free and open source",
    body: "The ClipCraft editor is published under the MIT licence. You can read, self-host, and modify the application code.",
  },
  {
    icon: CheckCircle,
    title: "Your work stays yours",
    body: "You keep all rights to the media you import and to the videos you export. Editing and generation happen in your browser.",
  },
  {
    icon: Gavel,
    title: "Use it responsibly",
    body: "You are responsible for the rights, permissions, and laws that apply to the content you edit, generate, or publish.",
  },
];

function TermsSection({ id, title, children }) {
  return (
    <section className="privacy-section" id={id}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function TermsOfServicePage() {
  return (
    <div className="privacy-page">
      <div className="privacy-aurora" aria-hidden="true" />

      <header className="privacy-nav">
        <a className="privacy-brand" href="/">
          <img src="/icons/clipcraft-reel.jpg" alt="" width="38" height="38" />
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
            <Scales size={15} weight="bold" aria-hidden="true" />
            Terms of Service
          </span>
          <h1>
            Clear terms for a
            <br />
            <span>local-first editor.</span>
          </h1>
          <p className="privacy-lede">
            These terms describe the agreement between you and ClipCraft when you use the browser editor.
            They explain what you can expect from the application, what the app expects from you, and how
            this free, open-source tool is provided.
          </p>
          <div className="privacy-meta">
            <span>Last updated: November 16, 2026</span>
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
          <TermsSection id="acceptance" title="1. Acceptance of these terms">
            <p>
              By opening or using ClipCraft, you agree to these terms. If you do not agree with them, please
              do not use the application. If you use ClipCraft on behalf of an organisation, you confirm that
              you are allowed to accept these terms for that organisation.
            </p>
          </TermsSection>

          <TermsSection id="service" title="2. About the service">
            <p>
              ClipCraft is a browser-based video editor that runs on your device. The application is provided
              free of charge, without an account server, and the source code is available in the{" "}
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
                public repository <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
              </a>
              .
            </p>
            <p>
              Features may be added, changed, or removed over time. Because the editor runs locally, an
              available feature can still depend on your browser, device hardware, and locally cached model
              files.
            </p>
          </TermsSection>

          <TermsSection id="accounts" title="3. Accounts and local data">
            <p>
              Accounts you create in ClipCraft are stored in this browser, not on a ClipCraft server. You are
              responsible for the device and browser profile where your account, session, projects, and
              preferences are kept. Clearing site data removes them permanently.
            </p>
            <p>
              How the application stores and handles data is described in the{" "}
              <a href="/privacy-policy">Privacy Policy</a>.
            </p>
          </TermsSection>

          <TermsSection id="content" title="4. Your content">
            <ul className="privacy-list">
              <li>
                <strong>You keep your rights.</strong> You retain ownership of the images, video, audio, text,
                and other material you import, and of the videos you export.
              </li>
              <li>
                <strong>You are responsible for permissions.</strong> You must have the rights, licences, and
                consent needed for any media, voice, face, or trademark that appears in your content —
                including consent from people whose likeness or voice you use.
              </li>
              <li>
                <strong>Your media stays local.</strong> Imported media and project data are processed in your
                browser. ClipCraft does not upload them to a ClipCraft server.
              </li>
            </ul>
          </TermsSection>

          <TermsSection id="acceptable-use" title="5. Acceptable use">
            <p>You agree not to use ClipCraft to:</p>
            <ul className="privacy-list">
              <li>Break any law or regulation that applies to you.</li>
              <li>Infringe copyright, trademarks, privacy, publicity, or other rights of any person.</li>
              <li>
                Create or distribute sexual content involving minors, content that harasses or threatens
                people, or content intended to deceive others about a real person’s words or actions.
              </li>
              <li>
                Bypass, disable, or interfere with security features of the application, the browser, or any
                connected service.
              </li>
              <li>
                Use a connected third-party service, plugin, or model in a way that violates that provider’s
                terms or acceptable-use policy.
              </li>
            </ul>
            <p>
              You are also responsible for following the rules of any platform where you publish the videos
              you create.
            </p>
          </TermsSection>

          <TermsSection id="ai" title="6. AI-generated output">
            <p>
              AI features — voiceovers, music, captions, repair, subject effects, and talking avatars — run in
              your browser. Generated output can be inaccurate, incomplete, or unexpected, so you should
              review it before you rely on or publish it.
            </p>
            <p>
              ClipCraft does not guarantee that generated output is unique or free of third-party rights.
              Model files may be distributed under their own licences, which are listed in the{" "}
              <a href={LICENSES_URL} target="_blank" rel="noreferrer noopener">
                model licence notes <ArrowUpRight size={12} weight="bold" aria-hidden="true" />
              </a>
              .
            </p>
          </TermsSection>

          <TermsSection id="third-parties" title="7. Third-party services and links">
            <p>
              Some optional features connect directly from your browser to external providers. For example,
              model files are downloaded from Hugging Face or ModelScope, Google Sign-In is loaded from Google,
              and the Plugins panel can connect to self-hosted services or hosted providers. Those services
              are governed by their own terms and privacy policies, and ClipCraft is not responsible for
              them.
            </p>
            <p>
              Links to external websites are provided for convenience. Following one takes you to a site that
              ClipCraft does not control.
            </p>
          </TermsSection>

          <TermsSection id="licence" title="8. Open-source licence">
            <p>
              The ClipCraft application code is released under the MIT licence, which permits use, copying,
              modification, and distribution with the licence notice preserved. This licence covers the
              application code only; AI model files, fonts, stock media, and third-party libraries keep their
              own licences.
            </p>
          </TermsSection>

          <TermsSection id="disclaimer" title="9. Disclaimer of warranties">
            <p>
              ClipCraft is provided “as is” and “as available”, without warranties of any kind, whether
              express or implied, including fitness for a particular purpose, accuracy, and
              non-infringement. The application is a creative tool, not legal, professional, or financial
              advice, and no guarantee is made that it will be uninterrupted, error-free, or compatible with
              every device.
            </p>
          </TermsSection>

          <TermsSection id="liability" title="10. Limitation of liability">
            <p>
              To the maximum extent permitted by law, ClipCraft and its contributors are not liable for any
              indirect, incidental, special, consequential, or punitive damages, or for any loss of data,
              projects, profits, or goodwill arising from your use of the application. Because ClipCraft is
              provided free of charge, this limitation applies to the fullest extent allowed by the law that
              governs your use.
            </p>
            <div className="privacy-note">
              <ShieldCheck size={16} weight="duotone" aria-hidden="true" />
              <span>
                Keep your own copies of finished work. Browser storage can be cleared by you, by the browser,
                or by the device, and local project data is not backed up by ClipCraft.
              </span>
            </div>
          </TermsSection>

          <TermsSection id="changes" title="11. Changes to these terms">
            <p>
              These terms may be updated when the application changes. The date at the top of this page shows
              the latest revision, and the current version is always published at this address. Continuing to
              use ClipCraft after a change means you accept the updated terms.
            </p>
          </TermsSection>

          <TermsSection id="termination" title="12. Termination">
            <p>
              You may stop using ClipCraft at any time and clear its site data to remove local accounts,
              sessions, and preferences. Access may be withdrawn, or the application discontinued, if these
              terms are seriously breached or if continuing would create legal or security risk.
            </p>
          </TermsSection>

          <TermsSection id="contact" title="13. Contact">
            <p>
              Questions about these terms can be raised in the project’s issue tracker. There is no ClipCraft
              account server to contact, and no support email is operated for the application.
            </p>
            <a className="privacy-contact" href={ISSUES_URL} target="_blank" rel="noreferrer noopener">
              <GithubLogo size={18} weight="fill" aria-hidden="true" />
              Open an issue on GitHub
              <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
            </a>
          </TermsSection>
        </article>
      </main>

      <footer className="privacy-footer">
        <span>© 2026 ClipCraft. Local-first by design.</span>
        <nav aria-label="Footer">
          <a href="/">Editor</a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer noopener">
            Source code
          </a>
          <a href="/terms-of-service" aria-current="page">
            Terms of Service
          </a>
        </nav>
      </footer>
    </div>
  );
}
