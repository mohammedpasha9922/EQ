/**
 * Calculator Manager (Mode Manager)
 * Responsible for switching between calculator modes without rebuilding the page.
 * Each calculator mode provides: buttons, input logic, calculation logic.
 * Everything else (result screen, speech, copy, paste, history, keyboard, display)
 * is shared through the shared core modules.
 */

import {
  getResultScreen,
  getSpeechEngine,
  getClipboardEngine,
  getHistoryEngine,
  getKeyboardHandler,
  getDisplayRenderer
} from './core/index.js';

/**
 * Calculator Manager
 * Registers calculator modes and switches between them.
 */
class CalculatorManager {
  constructor() {
    this.modes = new Map();
    this.activeMode = null;
    this.activeModeName = null;
    this.modeSwitchButtons = typeof document !== 'undefined' ? document.querySelectorAll('.mode-switch') : [];

    // Wire up shared services
    this.keyboard = getKeyboardHandler();
    // Note: The keyboard listener is attached by the app's own handleKeydown
    // to avoid double-processing. The shared handler is used for mode routing.
    // The coordinator never hardcodes a specific mode/panel; each mode declares
    // the panel it owns via mode.panelId.
  }

  /**
   * Get the currently active mode object.
   * @returns {object|null} The active mode.
   */
  getActiveMode() {
    return this.activeMode;
  }

  /**
   * Get a registered mode by name.
   * @param {string} name - The mode name.
   * @returns {object|undefined} The mode, or undefined if not registered.
   */
  getMode(name) {
    return this.modes.get(name);
  }

  /**
   * Get the names of all registered modes.
   * @returns {string[]} Registered mode names.
   */
  getRegisteredModes() {
    return Array.from(this.modes.keys());
  }

  /**
   * Alias for getRegisteredModes().
   * @returns {string[]} Registered mode names.
   */
  getAvailableModes() {
    return this.getRegisteredModes();
  }

  /**
   * Register a calculator mode.
   * @param {string} name - Unique mode name (e.g. 'general', 'scientific').
   * @param {object} mode - The mode definition.
   * @param {string} mode.id - Unique id matching the mode-switch button data-mode.
   * @param {string} mode.label - Localized label for the mode-switch button.
   * @param {Function} mode.mount - Called when the mode becomes active (receives shared services).
   * @param {Function} [mode.unmount] - Called when the mode is deactivated.
   * @param {Function} [mode.activate] - Optional activation hook.
   * @param {Function} [mode.deactivate] - Optional deactivation hook.
   */
  registerMode(name, mode) {
    this.modes.set(name, mode);
  }

  /**
   * Get the currently active mode name.
   * @returns {string|null} The active mode name.
   */
  getActiveModeName() {
    return this.activeModeName;
  }

  /**
   * Get the shared services object passed to every mode.
   * @returns {object} Shared services.
   */
  getSharedServices() {
    return {
      resultScreen: getResultScreen(),
      speech: getSpeechEngine(),
      clipboard: getClipboardEngine(),
      history: getHistoryEngine(),
      keyboard: this.keyboard,
      display: getDisplayRenderer()
    };
  }

  /**
   * Register the standard mode-switch buttons on the page.
   * @param {Function} onClick - Callback invoked with (modeName, button).
   */
  bindModeSwitchButtons(onClick) {
    this.modeSwitchButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        if (onClick) onClick(mode, btn);
      });
    });
  }

  /**
   * Switch to a calculator mode.
   * @param {string} name - The mode name to activate.
   */
  switchMode(name) {
    // Ignore redundant switches to the already-active mode so lifecycle
    // hooks are not re-run for the same mode.
    if (this.activeModeName === name) return;

    const mode = this.modes.get(name);
    if (!mode) return;

    // Hide the previously active mode's panel (if it declares one)
    if (this.activeMode && this.activeMode.panelId && typeof document !== 'undefined') {
      const prevPanel = document.getElementById(this.activeMode.panelId);
      if (prevPanel) prevPanel.classList.remove('active');
    }

    // Deactivate current mode
    if (this.activeMode) {
      if (this.activeMode.deactivate) this.activeMode.deactivate();
      if (this.activeMode.unmount) this.activeMode.unmount();
    }

    // Update mode-switch button active states
    this.modeSwitchButtons.forEach((btn) => {
      const isActive = btn.getAttribute('data-mode') === name;
      btn.classList.toggle('active', isActive);
    });

    // Show the newly active mode's panel (if it declares one).
    // The coordinator never hardcodes a specific mode; each mode owns its panel.
    if (mode.panelId && typeof document !== 'undefined') {
      const panel = document.getElementById(mode.panelId);
      if (panel) panel.classList.add('active');
    }

    // Activate new mode
    this.activeMode = mode;
    this.activeModeName = name;
    this.keyboard.setMode(mode);
    if (mode.activate) mode.activate();
    if (mode.mount) mode.mount(this.getSharedServices());

    // Notify any listeners
    if (this._onModeChange) {
      this._onModeChange(name, mode);
    }
  }

  /**
   * Register a listener for mode changes.
   * @param {Function} callback - Called with (modeName, mode).
   */
  onModeChange(callback) {
    this._onModeChange = callback;
  }
}

// Singleton instance shared across the application
let instance = null;

/**
 * Get the shared CalculatorManager instance.
 * @returns {CalculatorManager} The shared instance.
 */
export function getCalculatorManager() {
  if (!instance) {
    instance = new CalculatorManager();
  }
  return instance;
}

export default getCalculatorManager;