// Simple, reusable Text-to-Speech helpers using the browser Web Speech API

export const isSpeechSupported = () => {
  if (typeof window === "undefined") return false;
  return (
    "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"
  );
};

/**
 * Speak the provided text using a child-friendly voice configuration.
 * - English (en-US)
 * - Slower speaking rate
 * - Slightly higher pitch
 */
export const speakText = (text, options = {}) => {
  if (!isSpeechSupported() || !text) return null;

  const { rate = 0.85, pitch = 1.1 } = options;

  // Stop any ongoing speech so we don't overlap
  window.speechSynthesis.cancel();

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = pitch;

  window.speechSynthesis.speak(utterance);

  return utterance;
};

/**
 * Stop any ongoing speech safely.
 */
export const stopSpeaking = () => {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
};


