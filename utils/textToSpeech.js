// Simple, reusable Text-to-Speech helpers using the browser Web Speech API

export const isSpeechSupported = () => {
  if (typeof window === "undefined") return false;
  return (
    "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function"
  );
};

let currentUtterance = null;
let preferredVoice = null;

// Change this one value to set the default voice for the whole app.
// Options: "kids_friendly", "neutral_us", "male_us", "british_en"
const DEFAULT_VOICE_PROFILE = "kids_friendly";

const VOICE_PROFILE_PATTERNS = {
  kids_friendly: [
    /Google US English Female/i,
    /Microsoft Zira/i,
    /Samantha/i,
    /female|woman/i,
  ],
  neutral_us: [/Google US English/i, /en-US/i],
  male_us: [/male|man/i, /David|Guy|Mark/i],
  british_en: [/en-GB/i, /Daniel|Kate|Serena/i],
};

const selectPreferredVoice = () => {
  if (!isSpeechSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Cache once so it stays consistent across refreshes
  if (preferredVoice) return preferredVoice;

  const profilePatterns =
    VOICE_PROFILE_PATTERNS[DEFAULT_VOICE_PROFILE] ||
    VOICE_PROFILE_PATTERNS.kids_friendly;

  preferredVoice =
    voices.find((v) =>
      profilePatterns.some(
        (pattern) => pattern.test(v.name) || pattern.test(v.lang)
      )
    ) || voices.find((v) => v.lang.startsWith("en"));

  return preferredVoice;
};

/**
 * Speak the provided text using a child-friendly, female-sounding voice:
 * - English (en-US)
 * - Slower speaking rate
 * - Slightly higher pitch for warmth
 */
export const speakText = (text, options = {}) => {
  if (!isSpeechSupported() || !text) return null;

  // Slower default rate so kids can follow comfortably
  const {
    rate = 0.6,
    pitch = 1.05,
    lang = "en-US",
    onboundary,
    onend,
    onerror,
  } = options;

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;

  const voice = selectPreferredVoice();
  if (voice) {
    utterance.voice = voice;
  }

  if (typeof onboundary === "function") utterance.onboundary = onboundary;
  if (typeof onend === "function") utterance.onend = onend;
  if (typeof onerror === "function") utterance.onerror = onerror;

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);

  return utterance;
};

/**
 * Pause the current speech so it can be resumed from the same position.
 */
export const pauseSpeaking = () => {
  if (!isSpeechSupported()) return;
  if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
    window.speechSynthesis.pause();
  }
};

/**
 * Resume speaking from where it was paused.
 */
export const resumeSpeaking = () => {
  if (!isSpeechSupported()) return;
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

/**
 * Stop any ongoing speech and reset.
 */
export const stopSpeaking = () => {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
};

// Ensure voices are loaded and preferred voice is selected once
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    selectPreferredVoice();
  };
}
