import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowSquareOut,
  Check,
  CopySimple,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  LockSimple,
  SpinnerGap,
  User,
  WarningCircle,
  X,
} from "@phosphor-icons/react";

import {
  clearGoogleClientId,
  continueAsGuest,
  createAccount,
  getGoogleClientId,
  isValidEmail,
  preloadGoogleIdentity,
  setGoogleClientId,
  signIn,
  signInWithGoogle,
  validatePassword,
} from "../lib/accountAuth.js";

const SPLASH_HOLD_MS = 3200;
const SPLASH_EXIT_MS = 520;
const GOOGLE_CONSOLE_URL = "https://console.cloud.google.com/apis/credentials";

function GoogleMark() {
  return (
    <svg className="auth-google-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1-.76-4.59c0-1.6.27-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function ClipCraftWordmark({ id }) {
  return (
    <>
      <h1 id={id} className="entrance-wordmark"><span>ClipCraft</span> <em>AI</em></h1>
      <svg className="entrance-swoosh" viewBox="0 0 360 22" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="clipcraft-swoosh-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2a6dff" />
            <stop offset="55%" stopColor="#4f6bff" />
            <stop offset="100%" stopColor="#c026ff" />
          </linearGradient>
        </defs>
        <path
          d="M3 5.5C70 17.5 250 20.5 357 3.5"
          fill="none"
          stroke="url(#clipcraft-swoosh-gradient)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

export function SplashScreen({ onEnter }) {
  const [leaving, setLeaving] = useState(false);
  const finishedRef = useRef(false);
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  const advance = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setLeaving(true);
    window.setTimeout(() => onEnterRef.current?.(), SPLASH_EXIT_MS);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(advance, SPLASH_HOLD_MS);
    const handleKey = (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Escape") advance();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKey);
    };
  }, [advance]);

  return (
    <div
      className={`splash-screen${leaving ? " is-leaving" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="ClipCraft AI entrance"
      onClick={advance}
    >
      <img
        className="splash-artwork"
        src="/clipcraft-entrance.jpg"
        alt="ClipCraft AI — cinematic AI video editor"
        decoding="async"
      />
      <span className="splash-shine" aria-hidden="true" />
      <div className="splash-enter-row">
        <span className="splash-enter-hint">Click to enter</span>
        <span className="splash-progress" aria-hidden="true"><i /></span>
      </div>
    </div>
  );
}

function GoogleSetupDialog({ onClose, onSaved }) {
  const origin = window.location.origin;
  const [draft, setDraft] = useState(() => getGoogleClientId());
  const [hasSaved, setHasSaved] = useState(() => Boolean(getGoogleClientId()));
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const copyOrigin = async () => {
    try {
      await navigator.clipboard.writeText(origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(`Copy did not work. Select the origin manually: ${origin}`);
    }
  };

  const save = (event) => {
    event.preventDefault();
    setError("");
    try {
      const saved = setGoogleClientId(draft);
      setHasSaved(true);
      preloadGoogleIdentity();
      onSaved(saved);
    } catch (failure) {
      setError(failure?.message || "Could not save that client ID.");
    }
  };

  const forget = () => {
    clearGoogleClientId();
    setDraft("");
    setHasSaved(false);
    setError("Saved client ID removed. Paste a new one to enable Google sign-in.");
  };

  return (
    <div
      className="google-setup-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="google-setup-card" role="dialog" aria-modal="true" aria-labelledby="google-setup-title">
        <header className="google-setup-head">
          <span className="google-setup-icon" aria-hidden="true"><GoogleMark /></span>
          <div className="google-setup-heading">
            <h2 id="google-setup-title">Enable Google sign-in</h2>
            <p>Uses your own Google OAuth client. No keys are shared with ClipCraft.</p>
          </div>
          <button type="button" className="google-setup-close" aria-label="Close Google setup" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <ol className="google-setup-steps">
          <li>
            <span>1</span>
            <p>
              Open{" "}
              <a href={GOOGLE_CONSOLE_URL} target="_blank" rel="noreferrer noopener">
                Google Cloud Console — Credentials <ArrowSquareOut size={13} />
              </a>{" "}
              and create an <strong>OAuth client ID</strong> with application type <strong>Web application</strong>.
            </p>
          </li>
          <li>
            <span>2</span>
            <div>
              <p>Add this exact origin under <strong>Authorized JavaScript origins</strong>:</p>
              <div className="google-setup-origin">
                <code>{origin}</code>
                <button type="button" onClick={copyOrigin}>
                  {copied ? <Check size={14} weight="bold" /> : <CopySimple size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </li>
          <li>
            <span>3</span>
            <p>
              On the <strong>OAuth consent screen</strong>, choose <strong>External</strong>, then add your Gmail address as a{" "}
              <strong>test user</strong>.
            </p>
          </li>
          <li>
            <span>4</span>
            <p>
              Paste the client ID below. Copy the whole value ending in <code>.apps.googleusercontent.com</code>.
            </p>
          </li>
        </ol>

        <form className="google-setup-form" onSubmit={save} noValidate>
          <label className="sr-only" htmlFor="google-client-id">Google OAuth client ID</label>
          <input
            id="google-client-id"
            value={draft}
            placeholder="1234567890-abc123.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck="false"
            onChange={(event) => setDraft(event.target.value)}
          />
          {error ? <p className="google-setup-error" role="alert">{error}</p> : null}
          <button type="submit" className="google-setup-save">Save and continue</button>
        </form>

        <footer className="google-setup-foot">
          <span>Sign-in stores only your name, email, and avatar in this browser.</span>
          {hasSaved ? (
            <button type="button" onClick={forget}>Remove saved client ID</button>
          ) : null}
        </footer>
      </section>
    </div>
  );
}

export function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleFix, setGoogleFix] = useState("");
  const [googleSetupOpen, setGoogleSetupOpen] = useState(false);
  const isCreate = mode === "create";

  useEffect(() => {
    preloadGoogleIdentity();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");
    setGoogleFix("");
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (isCreate) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy("email");
    try {
      const session = isCreate ? await createAccount(email, password) : await signIn(email, password);
      onAuthenticated(session);
    } catch (failure) {
      if (failure?.code === "ACCOUNT_EXISTS") {
        setMode("signin");
        setError("An account with this email already exists. Enter your password to sign in.");
      } else if (failure?.code === "ACCOUNT_NOT_FOUND") {
        setMode("create");
        setError("No account found for this email yet. Create one below.");
      } else {
        setError(failure?.message || "Something went wrong. Please try again.");
      }
      setBusy("");
    }
  };

  const continueWithGoogle = async () => {
    if (busy) return;
    setError("");
    setNotice("");
    setGoogleFix("");
    if (!getGoogleClientId()) {
      setGoogleSetupOpen(true);
      return;
    }
    setBusy("google");
    try {
      const session = await signInWithGoogle();
      onAuthenticated(session);
    } catch (failure) {
      if (failure?.code === "GOOGLE_NOT_CONFIGURED") {
        setBusy("");
        setGoogleSetupOpen(true);
        return;
      }
      const code = failure?.code;
      setGoogleFix(
        code === "GOOGLE_CLIENT_REJECTED" || code === "INVALID_CLIENT_ID"
          ? "setup"
          : code === "GOOGLE_NO_ACCOUNT" || code === "GOOGLE_PROMPT_UNAVAILABLE"
            ? "signin"
            : "",
      );
      setError(failure?.message || "Google sign-in could not be completed.");
      setBusy("");
    }
  };

  const handleGoogleConfigured = () => {
    setGoogleSetupOpen(false);
    setGoogleFix("");
    setError("");
    void continueWithGoogle();
  };

  const continueWithGuest = () => {
    if (busy) return;
    setError("");
    setNotice("");
    setGoogleFix("");
    onAuthenticated(continueAsGuest());
  };

  const switchMode = () => {
    setMode(isCreate ? "signin" : "create");
    setError("");
    setNotice("");
    setGoogleFix("");
  };

  return (
    <div className="auth-screen" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-backdrop" aria-hidden="true" />

      <section className="auth-card">
        <header className="auth-brand">
          <img
            src="/icons/clipcraft-reel.jpg"
            alt="ClipCraft film reel logo"
            width="1041"
            height="1081"
            decoding="async"
          />
          <ClipCraftWordmark id="auth-title" />
        </header>

        <form className="auth-form" onSubmit={submit} noValidate aria-busy={Boolean(busy)}>
          <div className="auth-field">
            <EnvelopeSimple size={20} weight="regular" aria-hidden="true" />
            <label className="sr-only" htmlFor="auth-email">Email ID</label>
            <input
              id="auth-email"
              type="email"
              name="email"
              value={email}
              placeholder="Email ID"
              autoComplete="email"
              autoFocus
              inputMode="email"
              spellCheck="false"
              disabled={Boolean(busy)}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="auth-field">
            <LockSimple size={20} weight="regular" aria-hidden="true" />
            <label className="sr-only" htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              name="password"
              value={password}
              placeholder="Password"
              autoComplete={isCreate ? "new-password" : "current-password"}
              disabled={Boolean(busy)}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="auth-eye"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <Eye size={20} /> : <EyeSlash size={20} />}
            </button>
          </div>

          {error ? (
            <div className="auth-message is-error" role="alert">
              <WarningCircle size={16} weight="fill" aria-hidden="true" />
              <span>{error}</span>
              {googleFix === "setup" ? (
                <button type="button" className="auth-message-action" onClick={() => setGoogleSetupOpen(true)}>
                  Google setup
                </button>
              ) : null}
              {googleFix === "signin" ? (
                <button
                  type="button"
                  className="auth-message-action"
                  onClick={() => window.open("https://accounts.google.com/", "_blank", "noopener,noreferrer")}
                >
                  Sign in to Google
                </button>
              ) : null}
            </div>
          ) : null}
          {notice ? (
            <p className="auth-message is-notice" role="status">
              <WarningCircle size={16} weight="fill" aria-hidden="true" />
              <span>{notice}</span>
            </p>
          ) : null}

          <button className="auth-submit" type="submit" disabled={Boolean(busy)}>
            {busy === "email" ? <SpinnerGap className="is-spinning" size={19} weight="bold" aria-hidden="true" /> : null}
            {isCreate ? "Create an account" : "Sign in"}
          </button>
        </form>

        <div className="auth-divider" aria-hidden="true"><span>or</span></div>

        <button
          type="button"
          className="auth-google"
          onClick={continueWithGoogle}
          disabled={Boolean(busy)}
        >
          {busy === "google"
            ? <SpinnerGap className="is-spinning" size={20} weight="bold" aria-hidden="true" />
            : <GoogleMark />}
          Continue with Google
        </button>

        <button type="button" className="auth-guest" onClick={continueWithGuest} disabled={Boolean(busy)}>
          <User size={20} weight="regular" />
          Continue as guest
        </button>

        <footer className="auth-switch">
          <span>{isCreate ? "Already have an account?" : "New to ClipCraft?"}</span>
          <button type="button" onClick={switchMode}>{isCreate ? "Sign in" : "Create an account"}</button>
        </footer>
      </section>

      {googleSetupOpen ? (
        <GoogleSetupDialog
          onClose={() => setGoogleSetupOpen(false)}
          onSaved={handleGoogleConfigured}
        />
      ) : null}
    </div>
  );
}
