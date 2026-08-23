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
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // Speech synthesis not available
    }
  }

  /**
   * Cancel any ongoing speech.
   */
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