/**
 * Shared Speech Engine
 * Single shared speech engine used by every calculator mode.
 * Handles speaking results via the Web Speech API.
 */

const LOCALE_TO_SPEECH_LANG = {
  ar: 'ar-SA',
  es: 'es-ES',
  fr: 'fr-FR',
  ru: 'ru-RU',
  de: 'de-DE',
  tr: 'tr-TR',
  ku: 'ku',
  en: 'en-US'
};

/**
 * Shared Speech Engine
 * Provides localized speech synthesis for calculator results.
 */
class SpeechEngine {
  /**
   * Map an app locale to a speech-synthesis language code.
   * @param {string} locale - The app locale (e.g. 'en', 'ar').
   * @returns {string} The speech language code.
   */
  getSpeechLang(locale) {
    return LOCALE_TO_SPEECH_LANG[locale] || 'en-US';
  }

  /**
   * Speak the given text using the Web Speech API.
   * @param {string} text - The text to speak.
   * @param {string} locale - The app locale for language selection.
   */
  speak(text, locale = 'en') {
    try {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getSpeechLang(locale);
      if (locale === 'ku') {
        // PHASE 37H — real Kurdish voice only: ku/ckb/kmr lang codes or
        // Kurdish/Sorani/Kurmanji in the voice name. Never accept an
        // English voice as Kurdish; if none found, keep lang="ku" with
        // no assigned voice (no silent English fallback).
        try {
          if (typeof window.speechSynthesis.getVoices === 'function') {
            const voices = window.speechSynthesis.getVoices() || [];
            const kuVoice = voices.find((v) => /^ku([-_]|$)/i.test(v.lang || ''))
              || voices.find((v) => /^(ckb|kmr)([-_]|$)/i.test(v.lang || ''))
              || voices.find((v) => /kurdish|sorani|kurmanji|kurmanc|کوردی|kurd/i.test(v.name || ''));
            if (kuVoice && !/^en([-_]|$)/i.test(kuVoice.lang || '')) {
              utterance.voice = kuVoice;
              utterance.lang = kuVoice.lang || 'ku';
            }
          }
        } catch (e2) {
          // Voice enumeration unavailable — keep requested Kurdish locale.
        }
        // PHASE 37H guard: if the platform pre-attached an English/default voice
        // object to this fresh Kurdish utterance (no real Kurdish voice found),
        // clear it so the platform is honestly asked for Kurdish (lang="ku").
        try {
          const v2 = utterance.voice;
          if (v2 && (/^en([-_]|$)/i.test(v2.lang || '') || /microsoft\s+(david|mark|zira)/i.test(v2.name || ''))) {
            try { utterance.voice = null; } catch (ee) { /* ignore */ }
            utterance.lang = 'ku';
          }
        } catch (e3) { /* ignore */ }
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Speech synthesis not available
    }
  }
  cancel() {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {
      // Ignore
    }
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared SpeechEngine instance.
 * @returns {SpeechEngine} The shared instance.
 */
export function getSpeechEngine() {
  if (!instance) {
    instance = new SpeechEngine();
  }
  return instance;
}
export default getSpeechEngine;
