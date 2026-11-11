import {
  ArrowsHorizontal,
  Check,
  Crop,
  Scan,
  SpinnerGap,
  Trash,
  X,
} from "@phosphor-icons/react";

import { RATIO_OPTIONS } from "../config/editor.js";

const MOTIONS = [
  ["locked", "Locked", "Keep the frame steady"],
  ["smooth", "Smooth", "Follow the subject naturally"],
  ["responsive", "Responsive", "React quickly to motion"],
];

export function SmartFramePanel({ t, smartFrame }) {
  const segment = smartFrame?.segment;
  const job = smartFrame?.job || {};
  const stats = smartFrame?.draft?.stats || smartFrame?.applied?.stats || null;
  const presentation = smartFrame?.draft?.presentation || smartFrame?.applied?.presentation || "crop";
  const canAnalyze = Boolean(segment && ["image", "video"].includes(segment.type));
  return (
    <div className="smart-frame-panel">
      <section className="smart-frame-intro">
        <span className="smart-frame-intro-icon"><Crop size={22} weight="duotone" /></span>
        <div>
          <strong>{t("smartFrameCurrentClip", "Fit the current clip")}</strong>
          <p>{t("smartFrameCurrentClipHint", "Detect the subject sparsely, track motion with optical flow, and build a smooth crop path.")}</p>
          <small className="smart-frame-acceleration">{t("smartFrameGpuPreferred", "WebGPU detection preferred · WASM fallback automatic")}</small>
        </div>
      </section>

      {!canAnalyze ? (
        <div className="smart-frame-empty">
          <Scan size={26} weight="duotone" />
          <strong>{t("smartFrameSelectClip", "Select an image or video clip first")}</strong>
          <span>{t("smartFrameSelectClipHint", "Smart Frame only changes the selected Visuals clip.")}</span>
        </div>
      ) : (
        <>
          <div className="smart-frame-section-heading">
            <strong>{t("smartFrameTargetRatio", "Target aspect ratio")}</strong>
            <span>{t("smartFrameCurrentClip", "Current clip")}</span>
          </div>
          <div className="smart-frame-ratios" role="radiogroup" aria-label={t("smartFrameTargetRatio", "Target aspect ratio")}>
            {RATIO_OPTIONS.map((option) => (
              <button
                className={smartFrame.targetRatioId === option.id ? "is-active" : ""}
                type="button"
                role="radio"
                aria-checked={smartFrame.targetRatioId === option.id}
                key={option.id}
                disabled={job.running}
                onClick={() => smartFrame.setTargetRatioId(option.id)}
              >
                <i style={{ aspectRatio: `${option.width}/${option.height}` }} />
                <strong>{option.label}</strong>
              </button>
            ))}
          </div>

          <div className="smart-frame-section-heading">
            <strong>{t("smartFrameMotion", "Camera follow")}</strong>
            <span>{t("smartFrameMotionHint", "Re-solve the path only; models are not downloaded again")}</span>
          </div>
          <div className="smart-frame-motion-options">
            {MOTIONS.map(([id, label, hint]) => (
              <button
                className={smartFrame.settings.motion === id ? "is-active" : ""}
                type="button"
                key={id}
                disabled={job.running}
                onClick={() => smartFrame.setSettings({ motion: id })}
              >
                <strong>{t(`smartFrameMotion_${id}`, label)}</strong>
                <span>{t(`smartFrameMotionHint_${id}`, hint)}</span>
              </button>
            ))}
          </div>

          <label className="smart-frame-padding">
            <span><strong>{t("smartFramePadding", "Subject padding")}</strong><em>{Math.round(smartFrame.settings.padding * 100)}%</em></span>
            <input
              type="range"
              min="0.06"
              max="0.32"
              step="0.01"
              value={smartFrame.settings.padding}
              disabled={job.running}
              onChange={(event) => smartFrame.setSettings({ padding: Number(event.target.value) })}
            />
          </label>

          <button className="panel-primary smart-frame-analyze" type="button" onClick={smartFrame.analyze}>
            {job.running ? <SpinnerGap className="is-spinning" size={18} /> : <Scan size={18} weight="bold" />}
            {job.running
              ? t("smartFrameCancelAnalysis", "Cancel analysis")
              : smartFrame.draft
                ? t("smartFrameAnalyzeAgain", "Re-analyze current clip")
                : t("smartFrameAnalyzeClip", "Analyze and preview framing")}
          </button>

          {job.stage !== "idle" ? (
            <div className={`smart-frame-progress is-${job.stage}`} role="status" aria-live="polite">
              <div>
                <span>{job.stage === "setup" ? t("smartFrameModelSetup", "Preparing model") : t("smartFrameClipAnalysis", "Analyzing clip")}</span>
                <strong>{Math.round(job.progress || 0)}%</strong>
              </div>
              <i><b style={{ width: `${Math.max(0, Math.min(100, job.progress || 0))}%` }} /></i>
              <p>{job.phase}</p>
            </div>
          ) : null}

          {smartFrame.draft || smartFrame.applied ? (
            <>
              <div className="smart-frame-compare" role="group" aria-label={t("smartFrameCompare", "Before / after")}>
                <button type="button" className={smartFrame.compareMode === "original" ? "is-active" : ""} onClick={() => smartFrame.setCompareMode("original")}>
                  {t("smartFrameBefore", "Original")}
                </button>
                <button type="button" className={smartFrame.compareMode === "after" ? "is-active" : ""} onClick={() => smartFrame.setCompareMode("after")}>
                  {t("smartFrameAfter", "Framed result")}
                </button>
              </div>
              {stats ? (
                <>
                  <div className="smart-frame-stats">
                    <span><strong>{stats.anchorCount || 0}</strong>{t("smartFrameAnchors", "Detected anchors")}</span>
                    <span><strong>{stats.flowCount || 0}</strong>{t("smartFrameFlowFrames", "Optical flow frames")}</span>
                    <span><strong>{smartFrame.draft?.cropKeyframes?.length || smartFrame.applied?.cropKeyframes?.length || 0}</strong>{t("smartFramePathPoints", "Path keyframes")}</span>
                  </div>
                  <p className={`smart-frame-runtime is-${stats.runtimeBackend || "unknown"}`}>
                    {stats.runtimeBackend === "webgpu"
                      ? `${t("smartFrameWebGpuRuntime", "WebGPU subject detection · WASM optical flow")}${stats.analysisMs ? ` · ${(stats.analysisMs / 1000).toFixed(1)}s` : ""}`
                      : stats.runtimeBackend === "wasm"
                        ? `${t("smartFrameWasmRuntime", "WASM compatibility mode")}${stats.analysisMs ? ` · ${(stats.analysisMs / 1000).toFixed(1)}s` : ""}`
                        : t("smartFrameLegacyRuntime", "Old analysis · re-analyze to enable WebGPU")}
                  </p>
                </>
              ) : null}
              {presentation === "safe-contain" ? (
                <p className="smart-frame-safe-contain">
                  {t("smartFrameSafeContain", "This ratio cannot keep the full head with cropping alone, so smart stage framing is used; other ratios still use subject-follow cropping.")}
                </p>
              ) : null}
              <div className="smart-frame-actions">
                <button type="button" className="panel-secondary" onClick={smartFrame.cancel} disabled={job.running}>
                  <X size={16} />{t("cancel", "Cancel")}
                </button>
                <button type="button" className="panel-primary" onClick={smartFrame.apply} disabled={job.running || !smartFrame.dirty}>
                  <Check size={16} weight="bold" />{t("apply", "Apply")}
                </button>
              </div>
              {smartFrame.applied && !smartFrame.dirty ? (
                <button className="smart-frame-remove" type="button" onClick={smartFrame.remove}>
                  <Trash size={15} />{t("smartFrameRemove", "Remove Smart Frame from this clip")}
                </button>
              ) : null}
            </>
          ) : null}
        </>
      )}
      <p className="smart-frame-local-note">
        <ArrowsHorizontal size={15} />
        {t("smartFrameLocalNote", "Media stays in the browser; preview, project restore, and export use the same crop path.")}
      </p>
    </div>
  );
}
