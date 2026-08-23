/**
 * Shared History Engine
 * Single shared history engine used by every calculator mode.
 * Handles the 24-hour history system with persistence, rendering, and export.
 */

const HISTORY_KEY = 'eq-history';
const HISTORY_LIMIT = 1000;
const HISTORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Shared History Engine
 * Manages the 24-hour auto-expiring calculation history.
 */
class HistoryEngine {
  constructor() {
    this.history = [];
    this.countdownTimer = null;
    this.onChange = null; // Callback when history changes (e.g. to re-render)
  }

  /**
   * Set a callback invoked whenever history data changes.
   * @param {function} callback - The callback function.
   */
  setOnChange(callback) {
    this.onChange = callback;
  }

  /**
   * Notify listeners of a change.
   */
  notifyChange() {
    if (this.onChange) this.onChange(this.history);
  }

  /**
   * Clean up entries older than 24 hours.
   */
  cleanupExpired() {
    const now = Date.now();
    const before = this.history.length;
    this.history = this.history.filter((entry) => (now - (entry.timestamp || now)) < HISTORY_TTL);
    if (this.history.length !== before) {
      this.save();
    }
  }

  /**
   * Migrate legacy history entries to the current format.
   * @param {object} entry - The raw entry.
   * @returns {object} The migrated entry.
   */
  migrateEntry(entry) {
    const ts = entry.timestamp || entry.date || Date.now();
    const d = new Date(ts);
    if (!entry.date) {
      entry.date = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    if (!entry.time) {
      entry.time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (!entry.id) {
      entry.id = 'h-' + ts.toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }
    if (!entry.note) entry.note = '';
    if (!entry.timestamp) entry.timestamp = ts;
    return entry;
  }

  /**
   * Load history from localStorage.
   */
  load() {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        this.history = parsed
          .filter((entry) => entry && (now - (entry.timestamp || now)) < HISTORY_TTL)
          .map((entry) => this.migrateEntry(entry))
          .slice(0, HISTORY_LIMIT);
      } else {
        this.history = [];
      }
    } catch (e) {
      this.history = [];
    }
  }

  /**
   * Save history to localStorage.
   */
  save() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history.slice(0, HISTORY_LIMIT)));
    } catch (e) { /* ignore */ }
  }

  /**
   * Add a new history entry.
   * @param {string} expression - The calculation expression.
   * @param {string} result - The calculation result.
   */
  add(expression, result) {
    const now = Date.now();
    // Duplicate prevention: skip if an identical expression+result was added within the last 2 seconds
    const duplicate = this.history.some((entry) =>
      entry.expression === expression &&
      entry.result === result &&
      (now - (entry.timestamp || 0)) < 2000
    );
    if (duplicate) {
      return;
    }

    const d = new Date(now);
    const entry = {
      id: 'h-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      expression,
      result,
      timestamp: now,
      date: d.toLocaleDateString('en-CA'), // YYYY-MM-DD
      time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      note: ''
    };

    this.cleanupExpired();
    this.history.unshift(entry);
    if (this.history.length > HISTORY_LIMIT) {
      this.history = this.history.slice(0, HISTORY_LIMIT);
    }
    this.save();
    this.notifyChange();
  }

  /**
   * Update the note on a history entry.
   * @param {string} id - The entry id.
   * @param {string} note - The new note text.
   */
  updateNote(id, note) {
    const entry = this.history.find((h) => h.id === id);
    if (entry) {
      entry.note = note;
      this.save();
    }
  }

  /**
   * Format remaining time as "Xh Ym Zs".
   * @param {number} ms - Remaining milliseconds.
   * @returns {string} Formatted remaining time.
   */
  formatRemainingTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Start the live countdown interval.
   * @param {function} tick - Called every second with the remaining entries.
   */
  startCountdown(tick) {
    this.stopCountdown();
    this.countdownTimer = setInterval(() => {
      this.cleanupExpired();
      if (tick) tick(this.history);
    }, 1000);
  }

  /**
   * Stop the live countdown interval.
   */
  stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Export history entries as JSON.
   * @param {Array} entries - The entries to export.
   * @returns {object} The export payload.
   */
  buildExportPayload(entries) {
    return JSON.stringify({ exportedAt: new Date().toISOString(), entries }, null, 2);
  }
}

// Singleton instance shared across all calculator modes
let instance = null;

/**
 * Get the shared HistoryEngine instance.
 * @returns {HistoryEngine} The shared instance.
 */
export function getHistoryEngine() {
  if (!instance) {
    instance = new HistoryEngine();
  }
  return instance;
}

export default getHistoryEngine;