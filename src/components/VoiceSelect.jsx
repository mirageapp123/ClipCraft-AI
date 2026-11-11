export function VoiceSelect({
  voices = [],
  selectedVoice,
  selectedVoiceId,
  setSelectedVoiceId,
  t,
  id = "voice-select",
}) {
  const englishVoices = voices.filter((voice) => voice.language === "English");
  const otherVoices = voices.filter((voice) => voice.language !== "English");
  const fallbackId = selectedVoice?.id || voices[0]?.id || "";
  const value = voices.some((voice) => voice.id === selectedVoiceId) ? selectedVoiceId : fallbackId;

  return (
    <div className="voice-select-field">
      <label className="field-label" htmlFor={id}>
        {t("chooseVoice", "Choose voice")}
      </label>
      <select
        id={id}
        className="voice-select"
        value={value}
        onChange={(event) => setSelectedVoiceId?.(event.target.value)}
      >
        {englishVoices.length ? (
          <optgroup label={`${t("englishVoices", "English voices")} (${englishVoices.length})`}>
            {englishVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} — {voice.gender}
              </option>
            ))}
          </optgroup>
        ) : null}
        {otherVoices.length ? (
          <optgroup label={t("otherLanguageVoices", "Other languages")}>
            {otherVoices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} — {voice.language} · {voice.gender}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
      {selectedVoice ? (
        <small className="voice-select-detail">
          {selectedVoice.detail} · {selectedVoice.gender}
        </small>
      ) : null}
    </div>
  );
}
