import { numberToWords as numberToWordsImpl } from './numberToWords.js';
import CurrencyService from './currencyService.js';

// Shared architecture imports
import {
  Decimal as SharedDecimal,
  numberToWords as sharedNumberToWords,
  roundDisplayValue,
  resultNumberToWords,
  getResultScreen,
  getSpeechEngine,
  getClipboardEngine,
  getHistoryEngine,
  getKeyboardHandler,
  getDisplayRenderer
} from './src/core/index.js';
import { getCalculatorManager } from './src/CalculatorManager.js';
import StandardCalculator from './src/modes/StandardCalculator.js';

// Backward-compatible alias: route all local numberToWords calls through the shared engine
const numberToWords = sharedNumberToWords;

// Shared service instances (lazy singletons)
const sharedServices = {
  get resultScreen() { return getResultScreen(); },
  get speech() { return getSpeechEngine(); },
  get clipboard() { return getClipboardEngine(); },
  get history() { return getHistoryEngine(); },
  get keyboard() { return getKeyboardHandler(); },
  get display() { return getDisplayRenderer(); }
};

const DecimalCtor = typeof globalThis !== 'undefined' && globalThis.Decimal ? globalThis.Decimal : (typeof window !== 'undefined' ? window.Decimal : null);
const Decimal = DecimalCtor || class {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return String(this.value);
  }
  add(other) { return new this.constructor(Number(this.value) + Number(other?.toString?.() || other)); }
  sub(other) { return new this.constructor(Number(this.value) - Number(other?.toString?.() || other)); }
  mul(other) { return new this.constructor(Number(this.value) * Number(other?.toString?.() || other)); }
  div(other) { return new this.constructor(Number(this.value) / Number(other?.toString?.() || other)); }
};

const primaryDisplay = typeof document !== 'undefined' ? document.getElementById('primaryDisplay') : null;
const expressionDisplay = typeof document !== 'undefined' ? document.getElementById('expressionDisplay') : null;
const secondaryDisplay = typeof document !== 'undefined' ? document.getElementById('secondaryDisplay') : null;
const modeSwitchButtons = typeof document !== 'undefined' ? document.querySelectorAll('.mode-switch') : [];
const generalCalculatorPanel = typeof document !== 'undefined' ? document.getElementById('generalCalculatorPanel') : null;
const historyPanel = typeof document !== 'undefined' ? document.getElementById('historyPanel') : null;
const drawerToggle = typeof document !== 'undefined' ? document.getElementById('drawerToggle') : null;
const drawer = typeof document !== 'undefined' ? document.getElementById('drawer') : null;
const drawerOverlay = typeof document !== 'undefined' ? document.getElementById('drawerOverlay') : null;
const currencyMenuButton = typeof document !== 'undefined' ? document.getElementById('currencyMenuButton') : null;
const currencyMenuWrap = typeof document !== 'undefined' ? document.getElementById('currencyMenuWrap') : null;
const currencyMenuPopover = typeof document !== 'undefined' ? document.getElementById('currencyMenuPopover') : null;
const currencyPopoverItems = typeof document !== 'undefined' ? document.querySelectorAll('.currency-popover-item') : [];
const languageSelect = typeof document !== 'undefined' ? document.getElementById('languageSelect') : null;
const topBarLanguageSelect = typeof document !== 'undefined' ? document.getElementById('topBarLanguageSelect') : null;
const themeButtons = typeof document !== 'undefined' ? document.querySelectorAll('.theme-option') : [];
const percentAmount = typeof document !== 'undefined' ? document.getElementById('percentAmount') : null;
const percentRate = typeof document !== 'undefined' ? document.getElementById('percentRate') : null;
const percentPanel = typeof document !== 'undefined' ? document.getElementById('percentPanel') : null;
const percentToggle = typeof document !== 'undefined' ? document.getElementById('percentToggle') : null;
const percentBackButton = typeof document !== 'undefined' ? document.getElementById('percentBackButton') : null;
const percentRefreshButton = typeof document !== 'undefined' ? document.getElementById('percentRefreshButton') : null;
const keypadGrid = typeof document !== 'undefined' ? document.querySelector('.keypad-grid') : null;
const historyList = typeof document !== 'undefined' ? document.getElementById('historyList') : null;
const noteInput = typeof document !== 'undefined' ? document.getElementById('noteInput') : null;
const addNoteButton = typeof document !== 'undefined' ? document.getElementById('addNoteButton') : null;
const quickNoteInput = typeof document !== 'undefined' ? document.getElementById('quickNoteInput') : null;
const saveQuickNoteButton = typeof document !== 'undefined' ? document.getElementById('saveQuickNoteButton') : null;
const quickNotesList = typeof document !== 'undefined' ? document.getElementById('quickNotesList') : null;
const collapseQuickNotesButton = typeof document !== 'undefined' ? document.getElementById('collapseQuickNotes') : null;
const quickNotesPanel = typeof document !== 'undefined' ? document.getElementById('quickNotesPanel') : null;
const sendNoteButton = typeof document !== 'undefined' ? document.getElementById('sendNoteBtn') : null;
const exportNotePdfBtn = typeof document !== 'undefined' ? document.getElementById('exportNotePdfBtn') : null;
// PHASE 06: Notes PDF Preview elements (read-only viewer over the exported blob).
const notePreviewPdfBtn = typeof document !== 'undefined' ? document.getElementById('notePreviewPdfBtn') : null;
const notePdfPreviewModal = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewModal') : null;
const notePdfPreviewClose = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewClose') : null;
const notePdfPreviewShare = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewShare') : null;
// PHASE 07: basic toolbar — More menu + Print/Save + zoom level readout.
const notePdfPreviewMoreBtn = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewMoreBtn') : null;
const notePdfMoreMenu = typeof document !== 'undefined' ? document.getElementById('notePdfMoreMenu') : null;
const notePdfPrintBtn = typeof document !== 'undefined' ? document.getElementById('notePdfPrintBtn') : null;
const notePdfSaveBtn = typeof document !== 'undefined' ? document.getElementById('notePdfSaveBtn') : null;
const notePdfMoreRotateBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMoreRotateBtn') : null;
const notePdfMoreFitBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMoreFitBtn') : null;
const notePdfMoreZoomInBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMoreZoomInBtn') : null;
const notePdfMoreZoomOutBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMoreZoomOutBtn') : null;
const notePdfMorePrevBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMorePrevBtn') : null;
const notePdfMoreNextBtn = typeof document !== 'undefined' ? document.getElementById('notePdfMoreNextBtn') : null;
const notePdfZoomLevel = typeof document !== 'undefined' ? document.getElementById('notePdfZoomLevel') : null;
const notePdfPreviewStage = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewStage') : null;
const notePdfPreviewCanvas = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewCanvas') : null;
const notePdfPreviewTitleEl = typeof document !== 'undefined' ? document.getElementById('notePdfPreviewTitleEl') : null;
const notePdfPageIndicator = typeof document !== 'undefined' ? document.getElementById('notePdfPageIndicator') : null;
const notePdfPrevPageBtn = typeof document !== 'undefined' ? document.getElementById('notePdfPrevPageBtn') : null;
const notePdfNextPageBtn = typeof document !== 'undefined' ? document.getElementById('notePdfNextPageBtn') : null;
const notePdfZoomInBtn = typeof document !== 'undefined' ? document.getElementById('notePdfZoomInBtn') : null;
const notePdfZoomOutBtn = typeof document !== 'undefined' ? document.getElementById('notePdfZoomOutBtn') : null;
const notePdfZoomFitBtn = typeof document !== 'undefined' ? document.getElementById('notePdfZoomFitBtn') : null;
const notePdfRotateBtn = typeof document !== 'undefined' ? document.getElementById('notePdfRotateBtn') : null;
// PHASE 08: PDF preview annotation overlay + tools (preview-only layer, never the note).
const notePdfAnnoLayer = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoLayer') : null;
const notePdfAnnoCanvas = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoCanvas') : null;
const notePdfAnnoTextBoxes = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoTextBoxes') : null;
const notePdfAnnoEditBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoEditBtn') : null;
const notePdfAnnoTextBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoTextBtn') : null;
const notePdfAnnoHighlightBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoHighlightBtn') : null;
const notePdfAnnoDrawBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoDrawBtn') : null;
const notePdfAnnoUnderlineBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoUnderlineBtn') : null;
const notePdfAnnoStrikeBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoStrikeBtn') : null;
const notePdfAnnoRectBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoRectBtn') : null;
const notePdfAnnoCircleBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoCircleBtn') : null;
const notePdfAnnoLineBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoLineBtn') : null;
const notePdfAnnoNoteBtn = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoNoteBtn') : null;
const notePdfAnnoDeleteChip = typeof document !== 'undefined' ? document.getElementById('notePdfAnnoDeleteChip') : null;
// PHASE 09: PDF document options (template / header / footer / watermark) preview controls.
const notePdfDocToggleBtn = typeof document !== 'undefined' ? document.getElementById('notePdfDocToggleBtn') : null;
const notePdfDocOptionsEl = typeof document !== 'undefined' ? document.getElementById('notePdfDocOptions') : null;
const notePdfDocTemplate = typeof document !== 'undefined' ? document.getElementById('notePdfDocTemplate') : null;
const notePdfDocHeader = typeof document !== 'undefined' ? document.getElementById('notePdfDocHeader') : null;
const notePdfDocFooter = typeof document !== 'undefined' ? document.getElementById('notePdfDocFooter') : null;
const notePdfDocWmOn = typeof document !== 'undefined' ? document.getElementById('notePdfDocWmOn') : null;
const notePdfDocWmText = typeof document !== 'undefined' ? document.getElementById('notePdfDocWmText') : null;
const exportHistoryButton = typeof document !== 'undefined' ? document.getElementById('exportHistory') : null;
const selectAllHistoryButton = typeof document !== 'undefined' ? document.getElementById('selectAllHistory') : null;
const historyBackButton = typeof document !== 'undefined' ? document.getElementById('historyBackButton') : null;
const scientificToggle = typeof document !== 'undefined' ? document.getElementById('scientificToggle') : null;
const scientificPanel = typeof document !== 'undefined' ? document.getElementById('scientificPanel') : null;
const speechButton = typeof document !== 'undefined' ? document.getElementById('speechButton') : null;
const soundToggle = typeof document !== 'undefined' ? document.getElementById('soundToggle') : null;
const appSoundToggle = typeof document !== 'undefined' ? document.getElementById('appSoundToggle') : null;
const appSoundModes = typeof document !== 'undefined' ? document.getElementById('appSoundModes') : null;
const soundProfileSelect = typeof document !== 'undefined' ? document.getElementById('soundProfileSelect') : null;
const speakerToggle = typeof document !== 'undefined' ? document.getElementById('speakerToggle') : null;
const iosInstallModal = typeof document !== 'undefined' ? document.getElementById('iosInstallModal') : null;
const closeIosInstallModalButton = typeof document !== 'undefined' ? document.getElementById('closeIosInstallModal') : null;
const dismissIosInstallModalButton = typeof document !== 'undefined' ? document.getElementById('dismissIosInstallModal') : null;
const iosInstallTitle = typeof document !== 'undefined' ? document.getElementById('iosInstallTitle') : null;
const iosInstallSubtitle = typeof document !== 'undefined' ? document.getElementById('iosInstallSubtitle') : null;
const iosInstallStep1 = typeof document !== 'undefined' ? document.getElementById('iosInstallStep1') : null;
const iosInstallStep2 = typeof document !== 'undefined' ? document.getElementById('iosInstallStep2') : null;
const notesManagerModal = typeof document !== 'undefined' ? document.getElementById('notesManagerModal') : null;
const closeNotesManagerButton = typeof document !== 'undefined' ? document.getElementById('closeNotesManager') : null;
const addFolderButton = typeof document !== 'undefined' ? document.getElementById('addFolderButton') : null;
const foldersList = typeof document !== 'undefined' ? document.getElementById('foldersList') : null;
const openNewNoteButton = typeof document !== 'undefined' ? document.getElementById('openNewNoteButton') : null;
const refeshNotesButton = typeof document !== 'undefined' ? document.getElementById('refreshNotesButton') : null;
const notesList = typeof document !== 'undefined' ? document.getElementById('notesList') : null;
const fullScreenNoteModal = typeof document !== 'undefined' ? document.getElementById('fullScreenNoteModal') : null;
const closeFullScreenNoteButton = typeof document !== 'undefined' ? document.getElementById('closeFullScreenNote') : null;
const noteTitleInput = typeof document !== 'undefined' ? document.getElementById('noteTitleInput') : null;
const noteSavedIndicator = typeof document !== 'undefined' ? document.getElementById('noteSavedIndicator') : null;
const noteFolderSelect = typeof document !== 'undefined' ? document.getElementById('noteFolderSelect') : null;
const noteBodyInput = typeof document !== 'undefined' ? document.getElementById('noteBodyInput') : null;
const noteBoldBtn = typeof document !== 'undefined' ? document.getElementById('noteBoldBtn') : null;
const noteItalicBtn = typeof document !== 'undefined' ? document.getElementById('noteItalicBtn') : null;
const noteUnderlineBtn = typeof document !== 'undefined' ? document.getElementById('noteUnderlineBtn') : null;
// Text alignment buttons reuse the same noteFormatButtons wiring (data-format =
// justifyLeft/justifyCenter/justifyRight → applyNoteFormat → execCommand).
const noteAlignLeftBtn = typeof document !== 'undefined' ? document.getElementById('noteAlignLeftBtn') : null;
const noteAlignCenterBtn = typeof document !== 'undefined' ? document.getElementById('noteAlignCenterBtn') : null;
const noteAlignRightBtn = typeof document !== 'undefined' ? document.getElementById('noteAlignRightBtn') : null;
const noteTextColorBtn = typeof document !== 'undefined' ? document.getElementById('noteTextColorBtn') : null;
const noteTextColorInput = typeof document !== 'undefined' ? document.getElementById('noteTextColorInput') : null;
// PHASE 03 — Headings + Lists (Notes editor only). The heading control is a
// compact fixed-option <select> reusing the existing toolbar styling; the two
// list buttons reuse .note-format-btn exactly like Bold/Italic/Underline.
const noteHeadingSelect = typeof document !== 'undefined' ? document.getElementById('noteHeadingSelect') : null;
const noteBulletListBtn = typeof document !== 'undefined' ? document.getElementById('noteBulletListBtn') : null;
const noteNumberListBtn = typeof document !== 'undefined' ? document.getElementById('noteNumberListBtn') : null;
// PART 04 — Notes Editor: Checklist + Divider toolbar buttons.
const noteChecklistBtn = typeof document !== 'undefined' ? document.getElementById('noteChecklistBtn') : null;
const noteDividerBtn = typeof document !== 'undefined' ? document.getElementById('noteDividerBtn') : null;
// PART 05 — single-entry Aa text-formatting panel (moves text formatting behind Aa).
const noteAaBtn = typeof document !== 'undefined' ? document.getElementById('noteAaBtn') : null;
const noteAaPanel = typeof document !== 'undefined' ? document.getElementById('noteAaPanel') : null;
const noteHighlightBtn = typeof document !== 'undefined' ? document.getElementById('noteHighlightBtn') : null;
const noteHighlightPalette = typeof document !== 'undefined' ? document.getElementById('noteHighlightPalette') : null;
const noteStyleNormalBtn = typeof document !== 'undefined' ? document.getElementById('noteStyleNormalBtn') : null;
const noteStyleH1Btn = typeof document !== 'undefined' ? document.getElementById('noteStyleH1Btn') : null;
const noteStyleH2Btn = typeof document !== 'undefined' ? document.getElementById('noteStyleH2Btn') : null;
const noteStyleH3Btn = typeof document !== 'undefined' ? document.getElementById('noteStyleH3Btn') : null;
const noteFontSmallBtn = typeof document !== 'undefined' ? document.getElementById('noteFontSmallBtn') : null;
const noteFontNormalBtn = typeof document !== 'undefined' ? document.getElementById('noteFontNormalBtn') : null;
const noteFontLargeBtn = typeof document !== 'undefined' ? document.getElementById('noteFontLargeBtn') : null;

// Preset swatches for the in-app Text Color palette. Reuses the existing note
// text-color logic (applyNoteTextColor / normalizeNoteTextColor) when applied.
const NOTE_TEXT_COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Dark gray', color: '#44403c' },
  { name: 'Gray', color: '#9e9e9e' },
  { name: 'White', color: '#ffffff' },
  { name: 'Red', color: '#e53935' },
  { name: 'Orange', color: '#fb8c00' },
  { name: 'Yellow', color: '#fdd835' },
  { name: 'Green', color: '#43a047' },
  { name: 'Emerald', color: '#009688' },
  { name: 'Cyan', color: '#00acc1' },
  { name: 'Blue', color: '#1e88e5' },
  { name: 'Indigo', color: '#3949ab' },
  { name: 'Purple', color: '#8e24aa' },
  { name: 'Pink', color: '#e91e63' }
];

// Preset swatches for the in-app Cell Background Color palette. Colors chosen to
// be suitable for table-cell backgrounds (light/pastel tones — no dark extremes
// that would make cell text illegible). Reuses the existing
// applyCellBackgroundColor() / normalizeNoteTextColor() pipeline when applied.
const NOTE_CELL_BG_COLORS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Gray', color: '#eeeeee' },
  { name: 'Light red', color: '#ffcdd2' },
  { name: 'Light orange', color: '#ffe0b2' },
  { name: 'Light yellow', color: '#fff9c4' },
  { name: 'Light green', color: '#c8e6c9' },
  { name: 'Light cyan', color: '#b2ebf2' },
  { name: 'Light blue', color: '#bbdefb' },
  { name: 'Light indigo', color: '#c5cae9' },
  { name: 'Light pink', color: '#f8bbd0' },
  { name: 'Light purple', color: '#e1bee7' },
  { name: 'Pastel red', color: '#e57373' },
  { name: 'Pastel cyan', color: '#80deea' },
    { name: 'Pastel blue', color: '#90caf9' }
];

// PART 07 — Color Presets: coordinated sets that reuse the existing color
// handlers (applyNoteTextColor, applyNoteHighlight, applyCellBackgroundColor).
// Presets apply only to currently selected content in the Notes Editor — never
// the global app theme or any other module.
const NOTE_COLOR_PRESETS = [
  { id: 'simple',      name: 'Simple',      text: '#1f2933', highlight: '#fff176', cellBg: '#ffffff', border: '#9e9e9e' },
  { id: 'academic',    name: 'Academic',    text: '#1e3a5f', highlight: '#e3f2fd', cellBg: '#f8f9fa', border: '#4a6fa5' },
  { id: 'business',    name: 'Business',    text: '#2c3e50', highlight: '#bbdefb', cellBg: '#eef2f7', border: '#34495e' },
  { id: 'engineering', name: 'Engineering', text: '#003049', highlight: '#a5d6a7', cellBg: '#fef3c7', border: '#6b46c1' },
  { id: 'modern',      name: 'Modern',      text: '#0f172a', highlight: '#fecaca', cellBg: '#ffffff', border: '#cbd5e1' }
];
const noteCellBgColorBtn = typeof document !== 'undefined' ? document.getElementById('noteCellBgColorBtn') : null;
const noteCellBgColorInput = typeof document !== 'undefined' ? document.getElementById('noteCellBgColorInput') : null;
const noteTableBtn = typeof document !== 'undefined' ? document.getElementById('noteTableBtn') : null;
const noteTablePanel = typeof document !== 'undefined' ? document.getElementById('noteTablePanel') : null;
const noteTableRows = typeof document !== 'undefined' ? document.getElementById('noteTableRows') : null;
const noteTableCols = typeof document !== 'undefined' ? document.getElementById('noteTableCols') : null;
const noteTableHeader = typeof document !== 'undefined' ? document.getElementById('noteTableHeader') : null;
const noteTableInsertBtn = typeof document !== 'undefined' ? document.getElementById('noteTableInsertBtn') : null;
const noteTableCancelBtn = typeof document !== 'undefined' ? document.getElementById('noteTableCancelBtn') : null;
// PART 07 — Color Presets container in the Aa panel (reuses existing color handlers).
const noteAaPresetsRow = typeof document !== 'undefined' ? document.getElementById('noteAaPresetsRow') : null;
// PART 07 — Color Presets: coordinated sets reusing existing color handlers.
const drawerCloseButton = typeof document !== 'undefined' ? document.getElementById('drawerCloseButton') : null;
const drawerMenuItems = typeof document !== 'undefined' ? document.querySelectorAll('.drawer-menu-item') : [];

// Smart Documents (standalone home page)
const smartDocsModal = typeof document !== 'undefined' ? document.getElementById('smartDocsModal') : null;
const closeSmartDocsButton = typeof document !== 'undefined' ? document.getElementById('closeSmartDocs') : null;

// Notes UI extras
const folderTabsScroll = typeof document !== 'undefined' ? document.getElementById('folderTabsScroll') : null;
const addFolderBtn = typeof document !== 'undefined' ? document.getElementById('addFolderButton') : null;
const notesListPanel = typeof document !== 'undefined' ? document.getElementById('notesListPanel') : null;
const deletedListPanel = typeof document !== 'undefined' ? document.getElementById('deletedListPanel') : null;
const deletedNotesList = typeof document !== 'undefined' ? document.getElementById('deletedNotesList') : null;
const notesEmptyState = typeof document !== 'undefined' ? document.getElementById('notesEmptyState') : null;
const deletedEmptyState = typeof document !== 'undefined' ? document.getElementById('deletedEmptyState') : null;
const emptyNewNoteBtn = typeof document !== 'undefined' ? document.getElementById('emptyNewNoteBtn') : null;
const notesSearchInput = typeof document !== 'undefined' ? document.getElementById('notesSearchInput') : null;
const notesSortSelect = typeof document !== 'undefined' ? document.getElementById('notesSortSelect') : null;
const notesSearchEmpty = typeof document !== 'undefined' ? document.getElementById('notesSearchEmpty') : null;
const navNotesBtn = typeof document !== 'undefined' ? document.getElementById('navNotesBtn') : null;
const navDeletedBtn = typeof document !== 'undefined' ? document.getElementById('navDeletedBtn') : null;
const saveFullScreenNote = typeof document !== 'undefined' ? document.getElementById('saveFullScreenNote') : null;
const deleteCurrentNote = typeof document !== 'undefined' ? document.getElementById('deleteCurrentNote') : null;
const deleteConfirmModal = typeof document !== 'undefined' ? document.getElementById('deleteConfirmModal') : null;
const deleteConfirmCancel = typeof document !== 'undefined' ? document.getElementById('deleteConfirmCancel') : null;
const deleteConfirmOk = typeof document !== 'undefined' ? document.getElementById('deleteConfirmOk') : null;
const settingsModal = typeof document !== 'undefined' ? document.getElementById('settingsModal') : null;
const settingsCloseButton = typeof document !== 'undefined' ? document.getElementById('settingsCloseButton') : null;
// Help & About (self-contained, only opens from Settings)
const helpAboutButton = typeof document !== 'undefined' ? document.getElementById('helpAboutButton') : null;
const helpModal = typeof document !== 'undefined' ? document.getElementById('helpModal') : null;
const helpBackButton = typeof document !== 'undefined' ? document.getElementById('helpBackButton') : null;
const helpCloseButton = typeof document !== 'undefined' ? document.getElementById('helpCloseButton') : null;
const currencyFromSelect = typeof document !== 'undefined' ? document.getElementById('currencyFromSelect') : null;
const currencyToSelect = typeof document !== 'undefined' ? document.getElementById('currencyToSelect') : null;
const currencyFromAmount = typeof document !== 'undefined' ? document.getElementById('currencyFromAmount') : null;
const currencyConverterCloseButton = typeof document !== 'undefined' ? document.getElementById('currencyConverterCloseButton') : null;
const currencyToAmount = typeof document !== 'undefined' ? document.getElementById('currencyToAmount') : null;
const currencyDirectoryButton = typeof document !== 'undefined' ? document.getElementById('currencyDirectoryButton') : null;
const currencyCloseButton = typeof document !== 'undefined' ? document.getElementById('currencyCloseButton') : null;
const currencySearchInput = typeof document !== 'undefined' ? document.getElementById('currencySearchInput') : null;
const currencyList = typeof document !== 'undefined' ? document.getElementById('currencyList') : null;
const currencyStatusMessage = typeof document !== 'undefined' ? document.getElementById('currencyStatusMessage') : null;
const refreshRatesButton = typeof document !== 'undefined' ? document.getElementById('refreshRatesButton') : null;
const currencyDirectoryModal = typeof document !== 'undefined' ? document.getElementById('currencyDirectoryModal') : null;
const currencyConverterModal = typeof document !== 'undefined' ? document.getElementById('currencyConverterModal') : null;
// Currency Rates screen elements
const currencyRatesModal = typeof document !== 'undefined' ? document.getElementById('currencyRatesModal') : null;
const currencyRatesTitle = typeof document !== 'undefined' ? document.getElementById('currencyRatesTitle') : null;
const currencyRatesBackButton = typeof document !== 'undefined' ? document.getElementById('currencyRatesBackButton') : null;
const currencyRatesCloseButton = typeof document !== 'undefined' ? document.getElementById('currencyRatesCloseButton') : null;
const currencyRatesSearchInput = typeof document !== 'undefined' ? document.getElementById('currencyRatesSearchInput') : null;
const currencyRatesStatus = typeof document !== 'undefined' ? document.getElementById('currencyRatesStatus') : null;
const currencyRatesList = typeof document !== 'undefined' ? document.getElementById('currencyRatesList') : null;
// Currency Favorites screen elements
const currencyFavoritesModal = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesModal') : null;
const currencyFavoritesTitle = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesTitle') : null;
const currencyFavoritesBackButton = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesBackButton') : null;
const currencyFavoritesStatus = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesStatus') : null;
const currencyFavoritesEmpty = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesEmpty') : null;
const currencyFavoritesList = typeof document !== 'undefined' ? document.getElementById('currencyFavoritesList') : null;

// Currency service instance
let currencyServiceInstance = null;

// New currency UI elements
const swapCurrenciesButton = typeof document !== 'undefined' ? document.getElementById('swapCurrenciesButton') : null;
const showFavoritesButton = typeof document !== 'undefined' ? document.getElementById('showFavoritesButton') : null;
const showRecentButton = typeof document !== 'undefined' ? document.getElementById('showRecentButton') : null;
const favoriteFromButton = typeof document !== 'undefined' ? document.getElementById('favoriteFromButton') : null;
const favoriteToButton = typeof document !== 'undefined' ? document.getElementById('favoriteToButton') : null;
const conversionRateDisplay = typeof document !== 'undefined' ? document.getElementById('conversionRateDisplay') : null;
const currencyWords = typeof document !== 'undefined' ? document.getElementById('currencyWords') : null;
const cacheIndicator = typeof document !== 'undefined' ? document.getElementById('cacheIndicator') : null;
const converterModeButtons = typeof document !== 'undefined' ? document.querySelectorAll('.converter-mode-btn') : [];
const marketRateField = typeof document !== 'undefined' ? document.getElementById('marketRateField') : null;
const marketRateInput = typeof document !== 'undefined' ? document.getElementById('marketRateInput') : null;
const marketRatePrefix = typeof document !== 'undefined' ? document.getElementById('marketRatePrefix') : null;
const marketRateSuffix = typeof document !== 'undefined' ? document.getElementById('marketRateSuffix') : null;
const converterFromFlag = typeof document !== 'undefined' ? document.getElementById('converterFromFlag') : null;
const converterFromLabel = typeof document !== 'undefined' ? document.getElementById('converterFromLabel') : null;
const converterToFlag = typeof document !== 'undefined' ? document.getElementById('converterToFlag') : null;
const converterToLabel = typeof document !== 'undefined' ? document.getElementById('converterToLabel') : null;
const currencySpeakButton = typeof document !== 'undefined' ? document.getElementById('currencySpeakButton') : null;
const currencyResetButton = typeof document !== 'undefined' ? document.getElementById('currencyResetButton') : null;

// Custom-rate converter (تحويل بسعر مخصص) elements
const customRateModal = typeof document !== 'undefined' ? document.getElementById('customRateModal') : null;
const customRateBackButton = typeof document !== 'undefined' ? document.getElementById('customRateBackButton') : null;
const customRateResetButton = typeof document !== 'undefined' ? document.getElementById('customRateResetButton') : null;
const customRateInput = typeof document !== 'undefined' ? document.getElementById('customRateInput') : null;
const customAmountInput = typeof document !== 'undefined' ? document.getElementById('customAmountInput') : null;
const customRateResult = typeof document !== 'undefined' ? document.getElementById('customRateResult') : null;
const customRateWords = typeof document !== 'undefined' ? document.getElementById('customRateWords') : null;
const customRateSpeakButton = typeof document !== 'undefined' ? document.getElementById('customRateSpeakButton') : null;

const translations = {
  en: {
    eyebrow: '',
    adBarLabel: 'Advertisement',
    title: 'EQ7',
    install: 'Install App',
    actions: 'Actions',
    notesManagerTitle: 'Notes Manager',
    notesManagerSubtitle: 'Organize notes in folders and open a full screen editor.',
    foldersTitle: 'Folders',
    addFolder: '+ Folder',
    newNoteButton: 'New Full Screen Note',
    notesTitle: 'Notes',
    refreshNotes: 'Refresh',
    fullScreenNoteTitle: 'Full Screen Note',
    noteFolderLabel: 'Folder',
    noteTitleLabel: 'Title',
    noteTitlePlaceholder: 'Note title',
    folderSelectLabel: 'Folder',
        noteBodyPlaceholder: 'Start writing...',
    noteTableInsertPopupTitle: 'Insert Table',
  noteHeadingMenuLabel: 'Heading',
  noteHeading1Label: 'Heading 1',
  noteHeading2Label: 'Heading 2',
  noteHeading3Label: 'Heading 3',
  noteNormalTextLabel: 'Normal text',
    noteTableRowsLabel: 'Rows',
    noteTableColsLabel: 'Cols',
    noteTableHeaderRowLabel: 'Header row',
    noteTableInsertBtnLabel: 'Insert Table',
    noteImageOpacity: 'Opacity', noteImageSendBack: 'Send to Back',
    noteTablePresetCustomLabel: 'Custom',
    untitled: 'Untitled',
  pdfPreviewTitle: 'PDF Preview',
  pdfPrevPage: 'Previous page',
  pdfNextPage: 'Next page',
  pdfZoomIn: 'Zoom in',
  pdfZoomOut: 'Zoom out',
  pdfZoomFit: 'Fit page',
  pdfRotate: 'Rotate',
  pdfShare: 'Share / Save PDF',
  pdfClose: 'Close preview',
    pdfMore: 'More tools', pdfPrint: 'Print', pdfSave: 'Save to device',
  pdfAnnoEdit: 'Edit annotations', pdfAnnoText: 'Add text', pdfAnnoHighlight: 'Highlight', pdfAnnoDraw: 'Draw', pdfAnnoUnderline: 'Underline', pdfAnnoStrike: 'Strike-through', pdfAnnoRect: 'Rectangle', pdfAnnoCircle: 'Circle', pdfAnnoLine: 'Line', pdfAnnoClear: 'Clear page annotations', pdfAnnoNote: 'Add note',
  // PHASE 09 — Notes PDF professional documents / templates.
  pdfDocOptions: 'Document options', pdfDocTemplate: 'Template', pdfDocHeader: 'Header', pdfDocFooter: 'Footer', pdfDocWatermark: 'Watermark', pdfDocWmText: 'Watermark text',
  pdfTplBlank: 'Blank', pdfTplReport: 'Report', pdfTplInvoice: 'Invoice', pdfTplReceipt: 'Receipt', pdfTplContract: 'Contract', pdfTplCv: 'CV', pdfTplBusiness: 'Business Report', pdfTplEngineering: 'Engineering Report', pdfTplLetter: 'Letter',
    folderPersonal: 'Personal',
    percentTab: 'Percentage',
    settingsTab: 'Settings',
    historyTab: 'History',
    percentTitle: 'Percentage Calculator',
    percentBack: 'Back',
    amountLabel: 'Amount',
    rateLabel: 'Percentage Rate',
    settingsTitle: 'Settings & Customization',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    historyTitle: '24-Hour History',
    historyBack: 'Back',
    historyRemaining: 'remaining',
    selectAll: 'Select All',
    exportButton: 'Share / Export',
    companyNameBtn: 'Company Name',
    quickNotesTitle: 'Quick Notes',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Save',
    quickNotesPlaceholder: 'Write a note',
    historyNotePlaceholder: 'Tag this calculation',
    historyInsertResult: 'Insert Result',
    historySpeakResult: 'Read result aloud',
    historyLabel: 'History',
    noteLabel: 'Note',
    noteInputPlaceholder: '+ New note',
    noteSaved: 'Note saved',
    noteEdit: 'Edit',
    noteShare: 'Share',
    emptyHistory: 'No history yet',
    noteTableAddRow: '+ Row',
    noteTableAddCol: '+ Col',
    noteTableDelRow: '- Row',
    noteTableDelCol: '- Col',
    noteTableMergeCells: 'Merge Cells',
    noteTableSplitCell: 'Split Cell',
    copied: 'Result copied',
    pasted: 'Number pasted',
    installed: 'App is ready to install',
    noSelection: 'Select an item to share',
    shareTitle: 'EQ7 Calculator History',
    shareMessage: 'Exported from EQ7 Calculator',
    themeOled: 'OLED Black',
    themeCharcoal: 'Charcoal Dark',
    themeTitanium: 'Titanium Slate',
    themeLight: 'Minimal Light',
    themeDark: 'OLED Black',
    themeViolet: 'Titanium Slate',
    languageEnglish: 'English',
    noteTableBorderAll: 'All Borders',
    noteTableBorderOutside: 'Outside Borders',
    noteTableBorderInside: 'Inside Borders',
    noteTableBorderNone: 'No Borders',
    noteTableHAlignLeft: 'Left',
    noteTableHAlignCenter: 'Center',
    noteTableHAlignRight: 'Right',
    noteTableVAlignTop: 'Top',
    noteTableVAlignMiddle: 'Middle',
    noteTableVAlignBottom: 'Bottom',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Top',
    drawerSide: 'Side',
    expand: 'Expand',
    Minimize: 'Minimize',
    installModalSubtitle: 'Add it to your Home Screen',
    installModalClose: 'Got it',
    settingsSubtitle: 'Customize app language, theme and feedback.',
    appSoundsLabel: 'App Sounds',
    soundHapticsLabel: 'Button sound & haptics',
    soundHapticsCaption: 'Enable click sounds and vibration',
    soundProfileLabel: 'Button Sound Profile',
    profileClassic: 'Classic',
    profileSoft: 'Soft',
    profileModern: 'Modern',
    profileClick: 'Click',
    profileSilent: 'Silent',
    speakerLabel: 'Speaker / Voice Reading',
    speakerCaption: 'When ON, the result is read aloud automatically after pressing = . When OFF, reading is manual via the speaker button only.',
    modeGeneral: 'General Calculator',
    scientificToggle: 'Scientific',
    deg: 'DEG',
    rad: 'RAD',
    grad: 'GRAD',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Result',
    currencyConverterTitle: 'Convert Currencies',
    currencyConverterSubtitle: 'Convert amounts instantly with live rates.',
    resetButton: 'Reset',
    swapButton: 'Swap',
    favoritesButton: 'Favorites',
    recentButton: 'Recent',
    fromLabel: 'From',
    toLabel: 'To',
    convertedLabel: 'Converted',
    bankRateMode: '🏦 Bank Rate',
    marketRateMode: '🏪 Market Rate',
    marketRateFieldLabel: 'Market Exchange Rate',
    cachedLabel: 'Cached',
    refreshButton: 'Refresh',
    globalDirectoryButton: 'Global directory',
    currencyDirectoryTitle: 'Global Currencies Directory',
    currencyDirectorySubtitle: 'Search paper currencies by country name or currency code.',
    currencySearchPlaceholder: 'Search country or code',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'History',
    drawerNotes: 'Notes',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Scan / Create PDF',
    pdfCardScanDesc: 'Create a PDF from documents',
    pdfCardOpenTitle: 'Open PDF',
    pdfCardOpenDesc: 'Edit an existing PDF',
    pdfRecentTitle: 'Recent PDFs',
    pdfRecentEmpty: 'No recent PDFs yet.',
    pdfComingSoon: 'Coming in an upcoming update.',
    smartDocsTitle: '📄 Smart Documents',
    smartDocsDesc: 'Manage your documents from a single home page. New tools will appear here.',
    smartDocsHeading: 'What would you like to do?',
    smartDocsStep1: 'Start',
    smartDocsStep2: 'Edit',
    smartDocsStep3: 'Review',
    smartDocsStep4: 'Export',
    smartDocsCardScanTitle: 'Scan a Document',
    smartDocsCardScanDesc: 'Take a photo of a paper or a contract and turn it into editable content.',
    smartDocsCardImportTitle: 'Import a File',
    smartDocsCardImportDesc: 'Choose a PDF or a supported file from your device.',
    smartDocsCardNewTitle: 'New Document',
    smartDocsCardNewDesc: 'A blank page to start from scratch.',
    smartDocsCardTemplatesTitle: 'Templates',
    smartDocsCardTemplatesDesc: 'Ready-made templates to get started quickly.',
    smartTemplatesBusiness: 'Business',
    smartTemplatesPersonal: 'Personal',
    smartTemplatesCustom: 'Custom',
    smartTemplatesInvoice: 'Invoice',
    smartTemplatesQuote: 'Quote',
    smartTemplatesPaymentAgreement: 'Payment Agreement',
    smartTemplatesServiceContract: 'Service Contract',
    smartTemplatesSimpleAgreement: 'Simple Agreement',
    smartTemplatesPaymentReceipt: 'Payment Receipt',
    smartTemplatesRentalAgreement: 'Rental Agreement',
    smartTemplatesMyTemplates: 'My Templates',
    smartScanTitle: '📸 Scan a Document',
    smartScanCapture: 'Capture',
    smartScanUploadFallback: 'Choose an image from your device instead',
    smartScanDetecting: 'Detecting document',
    smartScanCorrecting: 'Correcting image',
    smartScanImproving: 'Improving image',
    smartScanReading: 'Reading text',
    smartScanProcessing: 'Processing…',
    smartScanReviewTitle: 'Review OCR result',
    smartScanPreviewLabel: 'Processed document',
    smartScanEditHint: 'You can edit the recognized text before accepting.',
    smartScanRescan: 'Rescan',
    smartScanAccept: 'Accept Result',
    smartScanStructTitle: 'Detected structure',
    smartScanReviewNote: 'Document recognized. Review the content before creating the PDF.',
    smartScanStatusNeeds: 'Needs review',
    smartScanStatusEdited: 'Edited — your corrections will be used in the PDF',
    smartScanStructHeading: 'Heading',
    smartScanStructParagraph: 'Paragraph',
    smartScanStructTable: 'Table',
    smartScanStructNumber: 'Number',
    smartScanStructDate: 'Date',
    smartScanStructField: 'Field',
    smartScanCameraUnavailable: 'Camera is not available on this device.',
    smartScanPermissionDenied: 'Camera permission was denied.',
    smartScanNoText: 'No text was detected. Try again or add an image.',
    smartScanOcrFailed: 'Reading text failed. Please try again.',
    smartScanAccepted: 'Result accepted and ready for editing.',
    smartScanEditTitle: 'Editable document', smartScanEditDocTitlePh: 'Document title',
    smartScanCreatePdf: 'Create PDF', smartScanPdfCreating: 'Creating PDF…',
    smartScanPdfCreated: 'PDF created from the edited document.',
    smartScanOfflinePdf: 'Offline — the PDF library could not be loaded.',
    smartScanPdfFailed: 'Could not create PDF.',
        smartImportTitle: '📂 Import a File',
    pdfAddTitle: 'Add to PDF', pdfAddText: 'Text', pdfAddImage: 'Image', pdfAddLogo: 'Logo', pdfAddSignature: 'Signature', pdfAddStamp: 'Stamp', pdfAddDate: 'Date', pdfAddTable: 'Table',
    smartImportPickPrompt: 'Choose a PDF file from your device.',
    smartImportChoose: 'Choose File',
    smartImportPreparing: 'Preparing Document…',
    smartImportAnalyzing: 'Analyzing the document…',
    smartImportScannedTitle: 'Scanned Document Detected',
    smartImportScannedMsg: 'It looks like this document contains scanned pages. Would you like to use text recognition?',
    smartImportUseOcr: 'Use OCR',
    smartImportKeepImages: 'Keep Pages as Images',
    smartImportOcrProcessing: 'OCR Processing…',
    smartImportFailed: 'Failed to Import',
    smartImportRetry: 'Retry',
    smartImportInvalidFile: 'This file is not a valid PDF. Please choose a PDF file.',
    smartImportCorrupt: 'The PDF appears to be corrupted or could not be read. Please try another file.',
    smartImportEmpty: 'This document has no usable content.',
    smartImportOcrFailed: 'Text recognition failed. Please try again.',
    smartEditorTitle: 'Editor',
    smartEditorHint: 'Document content',
    smartEditorPlaceholder: 'Imported content will appear here…',
    smartToolbarDefault: 'New Document',
    smartUntitledDoc: 'Untitled Document',
    smartToolbarUndo: 'Undo',
    smartToolbarRedo: 'Redo',
    smartToolbarBold: 'Bold',
    smartToolbarItalic: 'Italic',
    smartToolbarUnderline: 'Underline',
    smartDocumentBackLabel: 'Smart Documents',
    smartToolbarAdd: 'Add',
    smartAddHeading: 'Heading',
    smartAddNewPage: 'New Page',
    smartPageDesignNone: 'No border',
    smartPageDesignSimple: 'Simple',
    smartPageDesignClassic: 'Classic',
    smartPageDesignFormal: 'Formal',
    smartPageDesignModern: 'Modern',
    // PART 17 — Signature tool
    smartSigDraw: 'Draw', smartSigType: 'Type', smartSigImage: 'Image',
    smartSigInsert: 'Insert', smartSigClear: 'Clear', smartSigCancel: 'Cancel',
    smartSigNamePh: 'Your name', smartSigChoose: 'Choose an image of your signature',
    // PART 18 — Signature protection status (EQ Signature Status)
    smartSigStatusSigned: '\u2713 Signed',
    smartSigStatusModified: '\u26A0 The document was changed after signing',
    smartSigResign: 'Re-sign',
    // PART 11 — text formatting controls
    smartTextFont: 'Font', smartTextSize: 'Size', smartTextFontDefault: 'Default',
    smartTextBold: 'Bold', smartTextItalic: 'Italic', smartTextUnderline: 'Underline',
    smartTextAlignLeft: 'Align left', smartTextAlignCenter: 'Center', smartTextAlignRight: 'Align right',
    smartTextDirection: 'Direction', smartTextDirAuto: 'Auto', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Line spacing',
    smartToolbarText: 'Text',
    smartToolbarTable: 'Table',
    smartTableRows: 'Rows', smartTableColumns: 'Columns',
    smartTableCreate: 'Create table',
    smartTableAddRow: 'Add row', smartTableDelRow: 'Delete row',
    smartTableAddCol: 'Add column', smartTableDelCol: 'Delete column',
    smartTableAlignLeft: 'Align left', smartTableAlignCenter: 'Center', smartTableAlignRight: 'Align right',
    smartToolbarSignature: 'Signature',
    smartToolbarMore: 'More',
    smartToolbarImage: 'Image',
    smartImageDelete: 'Delete image',
    smartToolbarLogo: 'Logo',
    smartLogoPosition: 'Logo position',
    smartLogoTopRight: 'Top right',
    smartLogoTopLeft: 'Top left',
    smartLogoCenter: 'Center',
    smartToolbarDivider: 'Divider',
    smartToolbarBorder: 'Border',
    smartToolbarPage: 'Page',
    smartToolbarPageNumber: 'Page number',
    smartToolbarPageSettings: 'Page settings',
    smartBlankNavPage: 'Page',
    smartBlankNavPrev: 'Previous',
    smartBlankNavNext: 'Next',
    // PART 19 — page management
    smartBlankNavOf: 'of',
    smartPageAdd: 'Add page', smartPageCopy: 'Copy page', smartPageDelete: 'Delete page',
    // PART 20 — saving work
    smartToolbarSave: 'Save', smartSavedToast: 'Document saved',
    smartPdfTextColor: 'Text Color',
    smartPdfStyle: 'Style', smartPdfStyleNone: 'No Style', smartPdfStyleSimple: 'Simple', smartPdfStyleBusiness: 'Business', smartPdfStyleAcademic: 'Academic', smartPdfStyleEngineering: 'Engineering', smartPdfAdd: 'Add', smartPdfAddText: 'Text', smartPdfAddImage: 'Image', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signature', smartPdfAddStamp: 'Stamp', smartPdfAddDate: 'Date', smartPdfAddTable: 'Table', smartPdfMark: 'Mark', smartPdfMarkHighlight: 'Highlight', smartPdfMarkUnderline: 'Underline', smartPdfMarkDraw: 'Draw', smartPdfMarkComment: 'Comment', smartPdfMarkDone: 'Done', smartPdfMarkCancel: 'Cancel', smartPdfCommentTitle: 'Comment', smartPdfCommentText: 'Comment text', smartPdfCommentAdd: 'Add Comment', smartPdfMarkSelectText: 'Select text to mark first', smartPdfMarkDrawHint: 'Draw on the page', smartPdfMarkCommentLabel: 'Comment text', smartPdfMarkAddComment: 'Add Comment', pdfTblRow: 'Add Row', pdfTblRowDel: 'Delete Row', pdfTblCol: 'Add Column', pdfTblColDel: 'Delete Column', pdfTblAlignL: 'Left', pdfTblAlignC: 'Center', pdfTblAlignR: 'Right', pdfTblBold: 'Bold', pdfTblItalic: 'Italic', pdfTblTextColor: 'Text Color', pdfTblBg: 'Background', pdfTblBorder: 'Border Color', pdfTblNoBorder: 'No border', pdfTblRowH: 'Row height', pdfTblControls: 'Table controls', smartPdfPages: 'Pages', pdfPgAdd: 'Add Page', pdfPgDel: 'Delete Page', pdfPgRot: 'Rotate', pdfPgDup: 'Duplicate', pdfPgAdded: 'Page added', pdfPgDeleted: 'Page deleted', pdfPgRotated: 'Rotated', pdfPgDuplicated: 'Page duplicated', pdfPgLast: 'A document must keep at least one page',
    smartSaveFailed: "Couldn't save. Please try again.",
    smartUnsavedTitle: 'Do you want to save your changes before exiting?',
    smartReviewButton: 'Review', smartReviewExit: 'Back to editing',
    smartPdfExportButton: 'Export PDF', smartPdfExportTitle: 'Export PDF', smartPdfExportFilenameLabel: 'File name',
    smartPdfExportPagesLabel: 'Pages', smartPdfExportAllPages: 'All pages', smartPdfExportCurrentPage: 'Current page',
    smartPdfExportQualityLabel: 'Quality', smartPdfExportNormal: 'Normal', smartPdfExportHigh: 'High',
    smartPdfExportDo: 'Export', smartPdfExportCancel: 'Cancel',
    smartPdfExportSuccess: 'PDF exported successfully.', smartPdfExportFailed: 'PDF generation failed.',
    // PART 34 — human-readable operation states (no technical details in the UI)
    smartPdfPreparing: 'Preparing document…', smartPdfPrepareFailed: "Couldn't prepare the PDF. Please try again.",
    smartPdfResultTitle: 'Document created successfully', smartPdfResultFileLabel: 'File',
    smartPdfOpen: 'Open PDF', smartPdfShare: 'Share', smartPdfSend: 'Send', smartPdfClose: 'Close',
    smartPdfShareUnsupported: 'Direct sharing is not supported on this device. The PDF was downloaded.',
    smartPdfShareCancelled: 'Sharing cancelled.', smartPdfShareFailed: 'Sharing failed. The PDF was downloaded.',
    smartPdfOpenFailed: 'Could not open the PDF in this browser.',
    // PART 31 — Preview (stage before final PDF export). The preview shows the
    // exact rasterized pages the export pipeline embeds, then Save PDF / Share.
    smartPdfPreviewTitle: 'Preview',
    smartPdfPreviewNote: 'This is the file that will be saved.',
    smartPdfSave: 'Save PDF',
    smartUnsavedSave: 'Save', smartUnsavedExit: 'Exit without saving', smartUnsavedCancel: 'Cancel',
    // PART 33 — New Document protection
    smartUnsavedNewTitle: 'You have unsaved changes.',
    smartUnsavedSaveContinue: 'Save and continue',
    smartUnsavedStartNew: 'Start new document',
    smartSaveAndContinueFailed: 'Save failed. Your changes were not lost.',
    smartDraftBannerTitle: 'Draft saved on this device', smartDraftResume: 'Resume draft',
    smartDraftsTitle: 'Your drafts', smartDraftsEmpty: 'No saved drafts yet', smartDraftsNewDoc: 'Blank document',
    smartDraftResumeBtn: 'Resume editing', smartDraftDeleteBtn: 'Delete',
    smartDraftDelTitle: 'Delete this draft?', smartDraftDelConfirm: 'Delete',
    smartRelNow: 'just now', smartRelMin: 'a minute ago', smartRelMins: '{n} minutes ago',
    smartRelHour: 'an hour ago', smartRelHours: '{n} hours ago', smartRelYesterday: 'yesterday', smartRelDays: '{n} days ago',
    drawerConverter: 'Direct Currency Converter',
    drawerDirectory: 'Global Currency Directory & Search',
    drawerInstall: 'Install App',
    drawerSettings: 'Settings',
    installModalTitle: 'Install on iPhone',
    installModalStep1: 'Step 1: Tap the Share button (⎘ / ⇡) at the bottom or top of the browser.',
    installModalStep2: 'Step 2: Choose "Add to Home Screen" from the menu.',
    currencyOptionSearch: 'Search Currency',
    currencyOptionPrices: 'Live Currency Prices',
    featureRequiresInternet: 'This feature requires an internet connection.',
    currencyOptionConvert: 'Convert Currencies',
    currencyOptionFavorites: 'Favorite Currencies',
    currencyFavoritesTitle: 'Favorites',
    currencyFavoritesEmpty: 'No favorite currencies yet',
    currencyFavoritesEmptyHint: 'Tap the star on any currency to add it here',
    currencyOptionCustomRate: 'Convert at Custom Rate',
    customRateTitle: 'Convert at Custom Rate',
    customRateFieldLabel: 'Exchange Rate',
    currencyRatesTitle: 'Currency Rates',
    currencyRatesSearchPlaceholder: 'Search currency or code',
    currencyRatesEmpty: 'No currencies found',
    currencyRatesLoading: 'Loading rates…',
    currencyRatesError: 'Rates unavailable',
    recentlyDeletedTitle: 'Recently Deleted',
    emptyNotesText: 'No notes yet',
    emptyNotesAction: '+ New Note',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Search notes...',
    recentNotesLabel: 'Recent',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortAz: 'A–Z',
    renameNote: 'Rename',
    duplicateNote: 'Duplicate',
    pinNote: 'Pin',
    unpinNote: 'Unpin',
    noteMoreActions: 'More actions',
    noteNamePrompt: 'Note name:',
    noteEmptyName: 'Note name cannot be empty.',
    copySuffix: ' (copy)',
    noNotesFound: 'No notes found',
    createFirstNote: 'Create your first note',
    updatedToday: 'Updated today',
    updatedYesterday: 'Updated yesterday',
    updatedDaysAgo: 'Updated {n} days ago',
    notePinnedToast: 'Note pinned',
    noteUnpinnedToast: 'Note unpinned',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Text Style',
    noteStyleNormalLabel: 'Text',
    noteBasicLabel: 'Basic',
    noteAlignLabel: 'Alignment',
    noteFontSizeLabel: 'Font Size',
    noteFontSmallLabel: 'Small',
    noteFontNormalLabel: 'Normal',
    noteFontLargeLabel: 'Large',
    noteColorsLabel: 'Colors',
    notePresetsLabel: 'Presets',
    presetSimple: 'Simple',
    presetAcademic: 'Academic',
    presetBusiness: 'Business',
    presetEngineering: 'Engineering',
    presetModern: 'Modern',
    noteStylesLabel: 'Styles',
    noteStyleSimple: 'Simple',
    noteStyleAcademic: 'Academic',
    noteStyleBusiness: 'Business',
    noteStyleEngineering: 'Engineering',
    noteStyleModern: 'Modern',
    noteStyleNone: 'None',
    noteFramesLabel: 'Frame',
    noteFrameNone: 'None',
    noteFrameClassic: 'Classic',
    noteFrameDashed: 'Dashed',
    noteFrameSoft: 'Soft',
    pdfExportTitle: 'PDF Export',
    pdfExportStyle: 'Style',
    pdfExportTitleLabel: 'Title',
    pdfExportTitlePh: 'Note title (optional)',
    pdfExportDate: 'Date',
    pdfExportCompany: 'Use Company Profile',
    pdfExportPreview: 'Preview',
    pdfExportCreate: 'Create PDF',
    pdfExportClose: 'Close export dialog',
    noteSavedLabel: 'Saved ✓',
    emptyDeletedText: 'No deleted notes',
    deleteConfirmTitle: 'Delete permanently?',
    deleteConfirmText: 'This action cannot be undone.',
    cancelBtn: 'Cancel',
    deletePermanentBtn: 'Delete',
    doneBtn: 'Done',
    deleteNoteBtn: 'Delete note',
    restoreBtn: 'Restore',
    unfiled: 'Unfiled',
    folderNamePrompt: 'Folder name:',
    folderEmptyName: 'Folder name cannot be empty.',
    folderDuplicateName: 'A folder with this name already exists.',
    renameFolder: 'Rename folder',
    deleteFolder: 'Delete folder',
    folderDeleteConfirmTitle: 'Delete folder?',
    folderDeleteConfirmText: 'Notes in this folder will be moved to Unfiled and kept.',
    helpTitle: 'Help & About',
    helpSubtitle: 'Learn how to use EQ7 and discover its features.',
    helpAboutTitle: 'About the App',
    helpAboutDesc: 'EQ7 is a smart, all-in-one calculator that combines everyday math, scientific and percentage tools, currency conversion and much more in one simple, easy-to-use app.',
    helpWhyTitle: 'Why was EQ7 created?',
    helpWhyDesc: 'The idea is simple: one calculator instead of many, built for speed, clarity and everyday use.',
    helpWhyL1: 'Fast everyday calculations',
    helpWhyL2: 'Scientific tools such as square root, powers and parentheses',
    helpWhyL3: 'Easy percentage calculations',
    helpWhyL4: 'Currency conversion and live rates',
    helpWhyL5: 'Notes and calculation history',
    helpWhyL6: 'Simple, clear and quick to use',
    helpWhyL7: 'Works as an installable app (PWA) on different devices',
    helpSectionsTitle: 'Explaining the App Sections',
    helpSecGeneralTitle: 'General Calculator',
    helpSecGeneralDesc: 'The main calculator for everyday operations: add, subtract, multiply and divide.',
    helpSecGeneralEx: 'Example: 12 + 7 = 19.',
    helpSecScientificTitle: 'Scientific Tools',
    helpSecScientificDesc: 'Tap "Scientific" to use the square root, square and parentheses buttons inside the same calculator.',
    helpSecScientificEx: 'Example: √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Percentage Calculator',
    helpSecPercentDesc: 'Quickly work out a percentage of an amount without extra steps.',
    helpSecPercentEx: 'Example: 15% of 200 = 30.',
    helpSecHistoryTitle: 'History',
    helpSecHistoryDesc: 'EQ7 remembers what you calculated in the last 24 hours so you can review or share it.',
    helpSecNotesTitle: 'Notes',
    helpSecNotesDesc: 'Save quick notes, organize them in folders, and edit them in a full-screen editor.',
    helpSecCurrencyTitle: 'Currency Tools',
    helpSecCurrencyDesc: 'Search currencies, see live rates, convert between currencies, use a custom rate, and keep your favorites.',
    helpSecSettingsTitle: 'Settings',
    helpSecSettingsDesc: 'Change the language, the theme and the sound feedback exactly how you like.',
    helpButtonsTitle: 'How to Use the Calculator',
    helpBtnNumbers: 'Tap to type digits.',
    helpBtnAdd: 'Adds the next number.',
    helpBtnSub: 'Subtracts the next number.',
    helpBtnMul: 'Multiplies by the next number.',
    helpBtnDiv: 'Divides by the next number.',
    helpBtnEquals: 'Shows the result.',
    helpBtnAc: 'Clears everything and starts fresh.',
    helpBtnBack: 'Deletes the last digit you typed.',
    helpBtnDecimal: 'Adds a decimal point.',
    helpBtnScientific: 'Scientific / Percentage: switches the extra tools on and off.',
    helpBtnSpeak: 'Speaks the current result aloud.',
    helpSettingsExplainTitle: 'Settings',
    helpSetLanguage: 'Language: switches the whole app between the available languages.',
    helpSetTheme: 'Theme: choose OLED Black, Charcoal Dark, Titanium Slate or Minimal Light.',
    helpSetSoundsTitle: 'App Sounds: the master switch for sound and haptic feedback.',
    helpSetSoundsDesc: 'When App Sounds is ON, button sound and haptics are allowed. Turn it OFF to silence that feedback, and ON again to allow it.',
    helpSetSoundsSpeech: 'Speech/TTS is separate from App Sounds and is not turned off by App Sounds.',
    helpCurrencyTitle: 'Currency Converter',
    helpCurrencyDesc: 'Pick the currency you have (From) and the one you want (To), then type an amount.',
    helpCurrencySwap: 'Use the swap button to reverse the two currencies.',
    helpCurrencyFavorites: 'Use the star to mark a currency as a favorite, and open Favorite Currencies from the currency menu.',
    helpCurrencyCustomRate: 'Convert at Custom Rate lets you enter your own exchange rate.',
    helpCurrencyLive: 'Live prices come from the online service; if it is unavailable, cached rates may be used.',
    helpInstallTitle: 'Install & Offline',
    helpInstallDesc1: 'You can install EQ7 as an app on supported devices.',
    helpInstallDesc2: 'Some features work offline using stored resources, but live currency rates and app updates need an internet connection.',
    helpBenefitsTitle: 'Why Use EQ7?',
    helpBenefit1: 'All-in-one calculator',
    helpBenefit2: 'Fast everyday calculations',
    helpBenefit3: 'Scientific and percentage tools',
    helpBenefit4: 'Currency conversion',
    helpBenefit5: 'History and notes',
    helpBenefit6: 'Multi-language interface',
    helpBenefit7: 'Responsive design and PWA support',
    helpLangTitle: 'Languages',
    helpLangDesc: 'EQ7 is fully translated. Choose your language in the top bar or in Settings, and the whole app — including this help page — updates instantly.'
  },
  es: {
    eyebrow: '',
    adBarLabel: 'Publicidad',
    title: 'EQ7',
    install: 'Instalar app',
    actions: 'Acciones',
    notesManagerTitle: 'Gestor de notas',
    notesManagerSubtitle: 'Organiza notas en carpetas y abre un editor de pantalla completa.',
    foldersTitle: 'Carpetas',
    addFolder: '+ Carpeta',
    newNoteButton: 'Nueva nota de pantalla completa',
    notesTitle: 'Notas',
    refreshNotes: 'Actualizar',
    fullScreenNoteTitle: 'Nota de pantalla completa',
    noteFolderLabel: 'Carpeta',
    noteTitleLabel: 'Título',
    noteTitlePlaceholder: 'Título de la nota',
    folderSelectLabel: 'Carpeta',
        noteBodyPlaceholder: 'Empieza a escribir...',
    percentTab: 'Porcentaje',
    settingsTab: 'Ajustes',
    historyTab: 'Historial',
    percentTitle: 'Calculadora de porcentaje',
    percentBack: 'Volver',
    amountLabel: 'Cantidad',
    rateLabel: 'Tasa de porcentaje',
    settingsTitle: 'Ajustes y personalización',
    languageLabel: 'Idioma',
    themeLabel: 'Tema',
    historyTitle: 'Historial de 24 horas',
    historyBack: 'Volver',
    historyRemaining: 'restante',
    selectAll: 'Seleccionar todo',
    exportButton: 'Compartir / Exportar',
    companyNameBtn: 'Nombre de la empresa',
    quickNotesTitle: 'Notas rápidas',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Guardar',
    quickNotesPlaceholder: 'Escribe una nota',
    historyNotePlaceholder: 'Etiqueta este cálculo',
    historyInsertResult: 'Insertar resultado',
    historySpeakResult: 'Leer el resultado en voz alta',
    historyLabel: 'Historial',
    noteLabel: 'Nota',
    noteInputPlaceholder: '+ Nueva nota',
    noteSaved: 'Nota guardada',
    noteEdit: 'Editar',
    noteShare: 'Compartir',
    emptyHistory: 'Sin historial todavía',
    noteTableAddRow: '+ Fila',
    noteTableAddCol: '+ Columna',
    noteTableDelRow: '- Fila',
    noteTableDelCol: '- Columna',
    noteTableMergeCells: 'Combinar celdas',
    noteTableSplitCell: 'Dividir celda',
    copied: 'Resultado copiado',
    pasted: 'Número pegado',
    installed: 'La app está lista para instalar',
    noSelection: 'Selecciona un elemento para compartir',
    shareTitle: 'Historial de Calculadora EQ7',
    shareMessage: 'Exportado desde Calculadora EQ7',
    themeOled: 'Negro OLED',
    themeCharcoal: 'Carbon oscuro',
    themeTitanium: 'Titanio pizarra',
    themeLight: 'Claro minimalista',
    themeDark: 'Negro OLED',
    themeViolet: 'Titanio pizarra',
    languageEnglish: 'English',
    noteTableBorderAll: 'Todos los bordes',
    noteTableBorderOutside: 'Fuera de los bordes',
    noteTableBorderInside: 'Dentro de los bordes',
    noteTableBorderNone: 'Sin bordes',
    noteTableHAlignLeft: 'Izquierda',
    noteTableHAlignCenter: 'Centro',
    noteTableHAlignRight: 'Derecha',
    noteTableVAlignTop: 'Arriba',
    noteTableVAlignMiddle: 'Medio',
    noteTableVAlignBottom: 'Abajo',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Superior',
    drawerSide: 'Lateral',
    expand: 'Expandir',
    Minimize: 'Minimizar',
    installModalSubtitle: 'Añádela a tu pantalla de inicio',
    installModalClose: 'Entendido',
    settingsSubtitle: 'Personaliza idioma, tema y comentarios.',
    appSoundsLabel: 'Sonidos de la app',
    soundHapticsLabel: 'Sonido y hápticos',
    soundHapticsCaption: 'Activar sonidos de clic y vibración',
    soundProfileLabel: 'Perfil de sonido de botones',
    profileClassic: 'Clásico',
    profileSoft: 'Suave',
    profileModern: 'Moderno',
    profileClick: 'Clic',
    profileSilent: 'Silencio',
    speakerLabel: 'Altavoz / Lectura por voz',
    speakerCaption: 'Cuando está ACTIVADO, el resultado se lee en voz alta automáticamente al pulsar = . Cuando está APAGADO, la lectura es manual solo con el botón del altavoz.',
    modeGeneral: 'Calculadora general',
    scientificToggle: 'Científica',
    deg: 'GRADOS',
    rad: 'RADIANES',
    grad: 'GRADOS',
    sin: 'sen',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Resultado',
    currencyConverterTitle: 'Conversor directo de divisas',
    currencyConverterSubtitle: 'Convierte cantidades al instante con tarifas en vivo.',
    swapButton: 'Intercambiar',
    favoritesButton: 'Favoritos',
    recentButton: 'Recientes',
    fromLabel: 'De',
    toLabel: 'A',
    convertedLabel: 'Convertido',
    bankRateMode: '🏦 Tarifa bancaria',
    marketRateMode: '🏪 Tarifa de mercado',
    marketRateFieldLabel: 'Tipo de cambio de mercado',
    cachedLabel: 'En caché',
    refreshButton: 'Actualizar',
    globalDirectoryButton: 'Directorio global',
    currencyDirectoryTitle: 'Directorio global de divisas',
    currencyDirectorySubtitle: 'Busca divisas por nombre de país o código.',
    currencySearchPlaceholder: 'Buscar país o código',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'Historial',
    drawerNotes: 'Notas',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Escanear / Crear PDF',
    pdfCardScanDesc: 'Crear un PDF a partir de documentos',
    pdfCardOpenTitle: 'Abrir PDF',
    pdfCardOpenDesc: 'Editar un PDF existente',
    pdfRecentTitle: 'PDF recientes',
    pdfRecentEmpty: 'Aún no hay PDF recientes.',
    pdfComingSoon: 'Disponible en una próxima actualización.',
    noteTableInsertPopupTitle: 'Insertar tabla',
  noteHeadingMenuLabel: 'Encabezado',
  noteHeading1Label: 'Encabezado 1',
  noteHeading2Label: 'Encabezado 2',
  noteHeading3Label: 'Encabezado 3',
  noteNormalTextLabel: 'Texto normal',
    noteTableRowsLabel: 'Filas',
    noteTableColsLabel: 'Columnas',
    noteTableHeaderRowLabel: 'Fila de encabezado',
    noteTableInsertBtnLabel: 'Insertar tabla',
    noteTablePresetCustomLabel: 'Personalizada',
    untitled: 'Sin título',
  pdfPreviewTitle: 'Vista previa del PDF',
  pdfPrevPage: 'Página anterior',
  pdfNextPage: 'Página siguiente',
  pdfZoomIn: 'Acercar',
  pdfZoomOut: 'Alejar',
  pdfZoomFit: 'Ajustar página',
  pdfRotate: 'Girar',
  pdfShare: 'Compartir / Guardar PDF',
  pdfClose: 'Cerrar vista previa',
    pdfMore: 'Más herramientas', pdfPrint: 'Imprimir', pdfSave: 'Guardar en el dispositivo',
  pdfAnnoEdit: 'Editar anotaciones', pdfAnnoText: 'Añadir texto', pdfAnnoHighlight: 'Resaltar', pdfAnnoDraw: 'Dibujar', pdfAnnoUnderline: 'Subrayar', pdfAnnoStrike: 'Tachar', pdfAnnoRect: 'Rectángulo', pdfAnnoCircle: 'Círculo', pdfAnnoLine: 'Línea', pdfAnnoClear: 'Borrar anotaciones de la página', pdfAnnoNote: 'Añadir nota',
  pdfDocOptions: 'Opciones del documento', pdfDocTemplate: 'Plantilla', pdfDocHeader: 'Encabezado', pdfDocFooter: 'Pie de página', pdfDocWatermark: 'Marca de agua', pdfDocWmText: 'Texto de marca de agua',
  pdfTplBlank: 'En blanco', pdfTplReport: 'Informe', pdfTplInvoice: 'Factura', pdfTplReceipt: 'Recibo', pdfTplContract: 'Contrato', pdfTplCv: 'CV', pdfTplBusiness: 'Informe empresarial', pdfTplEngineering: 'Informe de ingeniería', pdfTplLetter: 'Carta',
    folderPersonal: 'Personal',
    resetButton: 'Restablecer',
    featureRequiresInternet: 'Esta función requiere una conexión a Internet.',
    smartDocsTitle: '📄 Documentos inteligentes',
    smartDocsDesc: 'Gestiona tus documentos desde una sola página principal. Aquí aparecerán nuevas herramientas.',
    smartDocsHeading: '¿Qué deseas hacer?',
    smartDocsStep1: 'Inicio',
    smartDocsStep2: 'Edición',
    smartDocsStep3: 'Revisión',
    smartDocsStep4: 'Exportación',
    smartDocsCardScanTitle: 'Escanear un documento',
    smartDocsCardScanDesc: 'Toma una foto de un papel o contrato y conviértela en contenido editable.',
    smartDocsCardImportTitle: 'Importar archivo',
    smartDocsCardImportDesc: 'Elige un PDF o un archivo compatible desde tu dispositivo.',
    smartDocsCardNewTitle: 'Nuevo documento',
    smartDocsCardNewDesc: 'Una página en blanco para empezar desde cero.',
    smartDocsCardTemplatesTitle: 'Plantillas',
    smartDocsCardTemplatesDesc: 'Plantillas listas para empezar rápidamente.',
    smartTemplatesBusiness: 'Negocios',
    smartTemplatesPersonal: 'Personal',
    smartTemplatesCustom: 'Personalizado',
    smartTemplatesInvoice: 'Factura',
    smartTemplatesQuote: 'Cotización',
    smartTemplatesPaymentAgreement: 'Acuerdo de pago',
    smartTemplatesServiceContract: 'Contrato de servicios',
    smartTemplatesSimpleAgreement: 'Acuerdo simple',
    smartTemplatesPaymentReceipt: 'Recibo de pago',
    smartTemplatesRentalAgreement: 'Contrato de alquiler',
    smartTemplatesMyTemplates: 'Mis plantillas',
    smartScanTitle: '📸 Escanear un documento',
    smartScanCapture: 'Capturar',
    smartScanUploadFallback: 'Elige una imagen de tu dispositivo en su lugar',
    smartScanDetecting: 'Detectando documento',
    smartScanCorrecting: 'Corrigiendo imagen',
    smartScanImproving: 'Mejorando imagen',
    smartScanReading: 'Leyendo texto',
    smartScanProcessing: 'Procesando…',
    smartScanReviewTitle: 'Revisar resultado de OCR',
    smartScanPreviewLabel: 'Documento procesado',
    smartScanEditHint: 'Puedes editar el texto reconocido antes de aceptarlo.',
    smartScanRescan: 'Volver a escanear',
    smartScanAccept: 'Aceptar resultado',
    smartScanStructTitle: 'Estructura detectada',
smartScanReviewNote: 'Documento reconocido. Revisa el contenido antes de crear el PDF.',
    smartScanStatusNeeds: 'Requiere revisión',
    smartScanStatusEdited: 'Editado: se usarán tus correcciones en el PDF',
    smartScanStructHeading: 'Encabezado',
    smartScanStructParagraph: 'Párrafo',
    smartScanStructTable: 'Tabla',
    smartScanStructNumber: 'Número',
    smartScanStructDate: 'Fecha',
    smartScanStructField: 'Campo',
    smartScanCameraUnavailable: 'La cámara no está disponible en este dispositivo.',
    smartScanPermissionDenied: 'Se denegó el permiso de la cámara.',
    smartScanNoText: 'No se detectó texto. Inténtalo de nuevo o añade una imagen.',
    smartScanOcrFailed: 'Falló la lectura del texto. Inténtalo de nuevo.',
    smartScanAccepted: 'Resultado aceptado y listo para editar.',
    smartScanEditTitle: 'Documento editable', smartScanEditDocTitlePh: 'Título del documento',
    smartScanCreatePdf: 'Crear PDF', smartScanPdfCreating: 'Creando PDF…',
    smartScanPdfCreated: 'PDF creado a partir del documento editado.',
    smartScanOfflinePdf: 'Sin conexión: no se pudo cargar la biblioteca PDF.',
    smartScanPdfFailed: 'No se pudo crear el PDF.',
        smartImportTitle: '📂 Importar archivo',
    pdfAddTitle: 'Añadir al PDF', pdfAddText: 'Texto', pdfAddImage: 'Imagen', pdfAddLogo: 'Logotipo', pdfAddSignature: 'Firma', pdfAddStamp: 'Sello', pdfAddDate: 'Fecha', pdfAddTable: 'Tabla',
    smartImportPickPrompt: 'Elige un archivo PDF desde tu dispositivo.',
    smartImportChoose: 'Elegir archivo',
    smartImportPreparing: 'Preparando documento…',
    smartImportAnalyzing: 'Analizando el documento…',
    smartImportScannedTitle: 'Documento escaneado detectado',
    smartImportScannedMsg: 'Parece que este documento contiene páginas escaneadas. ¿Quieres usar el reconocimiento de texto?',
    smartImportUseOcr: 'Usar OCR',
    smartImportKeepImages: 'Mantener páginas como imágenes',
    smartImportOcrProcessing: 'Procesando OCR…',
    smartImportFailed: 'Error al importar',
    smartImportRetry: 'Reintentar',
    smartImportInvalidFile: 'Este archivo no es un PDF válido. Elige un archivo PDF.',
    smartImportCorrupt: 'El PDF parece estar dañado o no se pudo leer. Prueba con otro archivo.',
    smartImportEmpty: 'Este documento no tiene contenido útil.',
    smartImportOcrFailed: 'Falló el reconocimiento de texto. Inténtalo de nuevo.',
    smartEditorTitle: 'Editor',
    smartEditorHint: 'Contenido del documento',
    smartEditorPlaceholder: 'El contenido importado aparecerá aquí…',
    smartToolbarDefault: 'Documento nuevo',
    smartUntitledDoc: 'Documento sin título',
    smartToolbarUndo: 'Deshacer',
    smartToolbarRedo: 'Rehacer',
    smartToolbarBold: 'Negrita',
    smartToolbarItalic: 'Cursiva',
    smartToolbarUnderline: 'Subrayar',
    smartDocumentBackLabel: 'Documentos inteligentes',
    smartToolbarAdd: 'Añadir',
    smartAddHeading: 'Título',
    smartAddNewPage: 'Nueva página',
    smartPageDesignNone: 'Sin borde',
    smartPageDesignSimple: 'Sencillo',
    smartPageDesignClassic: 'Clásico',
    smartPageDesignFormal: 'Formal',
    smartPageDesignModern: 'Moderno',
    // PART 17 — Firma
    smartSigDraw: 'Dibujar', smartSigType: 'Escribir', smartSigImage: 'Imagen',
    smartSigInsert: 'Insertar', smartSigClear: 'Borrar', smartSigCancel: 'Cancelar',
    smartSigNamePh: 'Tu nombre', smartSigChoose: 'Elige una imagen de tu firma',
    // PART 18 — Signature protection status (EQ Signature Status)
    smartSigStatusSigned: '\u2713 Firmado',
    smartSigStatusModified: '\u26A0 El documento se modific\u00f3 despu\u00e9s de la firma',
    smartSigResign: 'Volver a firmar',
    smartTextFont: 'Fuente', smartTextSize: 'Tamaño', smartTextFontDefault: 'Predeterminado',
    smartTextBold: 'Negrita', smartTextItalic: 'Cursiva', smartTextUnderline: 'Subrayado',
    smartTextAlignLeft: 'Alinear a la izquierda', smartTextAlignCenter: 'Centrar', smartTextAlignRight: 'Alinear a la derecha',
    smartTextDirection: 'Dirección', smartTextDirAuto: 'Auto', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Interlineado',
    smartToolbarText: 'Texto',
    smartToolbarTable: 'Tabla',
    smartTableRows: 'Filas', smartTableColumns: 'Columnas',
    smartTableCreate: 'Crear tabla',
    smartTableAddRow: 'Añadir fila', smartTableDelRow: 'Eliminar fila',
    smartTableAddCol: 'Añadir columna', smartTableDelCol: 'Eliminar columna',
    smartTableAlignLeft: 'Alinear a la izquierda', smartTableAlignCenter: 'Centrar', smartTableAlignRight: 'Alinear a la derecha',
    smartToolbarSignature: 'Firma',
    smartToolbarMore: 'Más',
    smartToolbarImage: 'Imagen',
    smartImageDelete: 'Eliminar imagen',
    smartToolbarLogo: 'Logotipo',
    smartLogoPosition: 'Posición del logotipo',
    smartLogoTopRight: 'Arriba a la derecha',
    smartLogoTopLeft: 'Arriba a la izquierda',
    smartLogoCenter: 'Centro',
    smartToolbarDivider: 'Separador',
    smartToolbarBorder: 'Borde',
    smartToolbarPage: 'Página',
    smartToolbarPageNumber: 'Número de página',
    smartToolbarPageSettings: 'Configuración de página',
    smartBlankNavPage: 'Página',
    smartBlankNavPrev: 'Anterior',
    smartBlankNavNext: 'Siguiente',
    // PART 19 — gestión de páginas
    smartBlankNavOf: 'de',
    smartPageAdd: 'Añadir página', smartPageCopy: 'Copiar página', smartPageDelete: 'Eliminar página',
    // PART 20 — guardar el trabajo
    smartToolbarSave: 'Guardar', smartSavedToast: 'Documento guardado',
    smartPdfTextColor: 'Color del texto',
    smartPdfStyle: 'Estilo', smartPdfStyleNone: 'Sin estilo', smartPdfStyleSimple: 'Sencillo', smartPdfStyleBusiness: 'Empresarial', smartPdfStyleAcademic: 'Académico', smartPdfStyleEngineering: 'Ingeniería',
    smartSaveFailed: 'No se pudo guardar. Inténtalo de nuevo.',
    smartUnsavedTitle: '¿Guardar los cambios antes de salir?',
    smartReviewButton: 'Revisar', smartReviewExit: 'Volver a la edición',
    smartPdfExportButton: 'Exportar PDF', smartPdfExportTitle: 'Exportar PDF', smartPdfExportFilenameLabel: 'Nombre del archivo',
    smartPdfExportPagesLabel: 'Páginas', smartPdfExportAllPages: 'Todas las páginas', smartPdfExportCurrentPage: 'Página actual',
    smartPdfExportQualityLabel: 'Calidad', smartPdfExportNormal: 'Normal', smartPdfExportHigh: 'Alta',
    smartPdfExportDo: 'Exportar', smartPdfExportCancel: 'Cancelar',
    smartPdfExportSuccess: 'PDF exportado correctamente.', smartPdfExportFailed: 'Error al generar el PDF.',
    smartPdfPreparing: 'Preparando documento…', smartPdfPrepareFailed: 'No se pudo preparar el PDF. Inténtalo de nuevo.',
    smartPdfResultTitle: 'Documento creado correctamente', smartPdfResultFileLabel: 'Archivo',
    smartPdfOpen: 'Abrir PDF', smartPdfShare: 'Compartir', smartPdfSend: 'Enviar', smartPdfClose: 'Cerrar',
    smartPdfShareUnsupported: 'La compartición directa no es compatible con este dispositivo. El PDF se ha descargado.',
    smartPdfShareCancelled: 'Compartición cancelada.', smartPdfShareFailed: 'Error al compartir. El PDF se ha descargado.',
    smartPdfOpenFailed: 'No se pudo abrir el PDF en este navegador.',
    // PART 31 — Preview
    smartPdfPreviewTitle: 'Vista previa',
    smartPdfPreviewNote: 'Este es el archivo que se guardará.',
    smartPdfSave: 'Guardar PDF',
    smartUnsavedSave: 'Guardar', smartUnsavedExit: 'Salir sin guardar', smartUnsavedCancel: 'Cancelar',
    // PART 33 — Nuevo documento (protección)
    smartUnsavedNewTitle: 'Tiene cambios sin guardar.',
    smartUnsavedSaveContinue: 'Guardar y continuar',
    smartUnsavedStartNew: 'Iniciar un documento nuevo',
    smartSaveAndContinueFailed: 'No se pudo guardar. Sus cambios no se perdieron.',
    smartDraftBannerTitle: 'Borrador guardado en este dispositivo', smartDraftResume: 'Continuar borrador',
    smartDraftsTitle: 'Tus borradores', smartDraftsEmpty: 'No hay borradores guardados', smartDraftsNewDoc: 'Documento en blanco',
    smartDraftResumeBtn: 'Continuar editando', smartDraftDeleteBtn: 'Eliminar',
    smartDraftDelTitle: '¿Eliminar este borrador?', smartDraftDelConfirm: 'Eliminar',
    smartRelNow: 'ahora mismo', smartRelMin: 'hace un minuto', smartRelMins: 'hace {n} minutos',
    smartRelHour: 'hace una hora', smartRelHours: 'hace {n} horas', smartRelYesterday: 'ayer', smartRelDays: 'hace {n} días',
    drawerConverter: 'Conversor directo de divisas',
    drawerDirectory: 'Directorio global de divisas',
    drawerInstall: 'Instalar app',
    drawerSettings: 'Ajustes',
    installModalTitle: 'Instalar en iPhone',
    installModalStep1: 'Paso 1: Toca el botón Compartir (⎘ / ⇡) en la parte inferior o superior del navegador.',
    installModalStep2: 'Paso 2: Elige "Añadir a pantalla de inicio" en el menú.',
    currencyOptionSearch: 'Buscar moneda',
    currencyOptionPrices: 'Precios de monedas en vivo',
    currencyOptionConvert: 'Convertir monedas',
    currencyOptionFavorites: 'Monedas favoritas',
    currencyFavoritesTitle: 'Favoritas',
    currencyFavoritesEmpty: 'Aún no hay monedas favoritas',
    currencyFavoritesEmptyHint: 'Toca la estrella de cualquier moneda para añadirla aquí',
    currencyOptionCustomRate: 'Convertir a tarifa personalizada',
    customRateTitle: 'Convertir a tarifa personalizada',
    customRateFieldLabel: 'Tipo de cambio',
    currencyRatesTitle: 'Tipos de cambio',
    currencyRatesSearchPlaceholder: 'Buscar moneda o código',
    currencyRatesEmpty: 'No se encontraron monedas',
    currencyRatesLoading: 'Cargando tipos…',
    currencyRatesError: 'Tipos no disponibles',
    recentlyDeletedTitle: 'Eliminados recientemente',
    emptyNotesText: 'No hay notas',
    emptyNotesAction: '+ Nueva nota',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Buscar notas...',
    recentNotesLabel: 'Recientes',
    sortNewest: 'Más recientes',
    sortOldest: 'Más antiguas',
    sortAz: 'A–Z',
    renameNote: 'Renombrar',
    duplicateNote: 'Duplicar',
    pinNote: 'Fijar',
    unpinNote: 'Quitar fijación',
    noteMoreActions: 'Más acciones',
    noteNamePrompt: 'Nombre de la nota:',
    noteEmptyName: 'El nombre de la nota no puede estar vacío.',
    copySuffix: ' (copia)',
    noNotesFound: 'No se encontraron notas',
    createFirstNote: 'Crea tu primera nota',
    updatedToday: 'Actualizada hoy',
    updatedYesterday: 'Actualizada ayer',
    updatedDaysAgo: 'Actualizada hace {n} días',
    notePinnedToast: 'Nota fijada',
    noteUnpinnedToast: 'Nota desfijada',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Estilo',
    noteStyleNormalLabel: 'Texto',
    noteBasicLabel: 'Básico',
    noteAlignLabel: 'Alineación',
    noteFontSizeLabel: 'Tamaño de fuente',
    noteFontSmallLabel: 'Pequeña',
    noteFontNormalLabel: 'Normal',
    noteFontLargeLabel: 'Grande',
    noteColorsLabel: 'Colores',
    notePresetsLabel: 'Plantillas',
    presetSimple: 'Sencillo',
    presetAcademic: 'Académico',
    presetBusiness: 'Negocios',
    presetEngineering: 'Ingeniería',
    presetModern: 'Moderno',
    noteStylesLabel: 'Estilos',
    noteStyleSimple: 'Sencillo',
    noteStyleAcademic: 'Académico',
    noteStyleBusiness: 'Negocios',
    noteStyleEngineering: 'Ingeniería',
    noteStyleModern: 'Moderno',
    noteStyleNone: 'Ninguno',
    noteFramesLabel: 'Marco',
    noteFrameNone: 'Ninguno',
    noteFrameClassic: 'Clásico',
    noteFrameDashed: 'Discontinuo',
    noteFrameSoft: 'Suave',
    pdfExportTitle: 'Exportar PDF',
    pdfExportStyle: 'Estilo',
    pdfExportTitleLabel: 'Título',
    pdfExportTitlePh: 'Título de la nota (opcional)',
    pdfExportDate: 'Fecha',
    pdfExportCompany: 'Usar perfil de empresa',
    pdfExportPreview: 'Vista previa',
    pdfExportCreate: 'Crear PDF',
    pdfExportClose: 'Cerrar diálogo de exportación',
    noteSavedLabel: 'Guardado ✓',
    emptyDeletedText: 'No hay notas eliminadas',
    deleteConfirmTitle: '¿Eliminar permanentemente?',
    deleteConfirmText: 'Esta acción no se puede deshacer.',
    cancelBtn: 'Cancelar',
    deletePermanentBtn: 'Eliminar',
    doneBtn: 'Hecho',
    deleteNoteBtn: 'Eliminar nota',
    restoreBtn: 'Restaurar',
    unfiled: 'Sin carpeta',
    folderNamePrompt: 'Nombre de la carpeta:',
    folderEmptyName: 'El nombre de la carpeta no puede estar vacío.',
    folderDuplicateName: 'Ya existe una carpeta con este nombre.',
    renameFolder: 'Renombrar carpeta',
    deleteFolder: 'Eliminar carpeta',
    folderDeleteConfirmTitle: '¿Eliminar carpeta?',
    folderDeleteConfirmText: 'Las notas de esta carpeta se moverán a Sin carpeta y se conservarán.',
    helpTitle: 'Ayuda y Acerca de',
    helpSubtitle: 'Aprende a usar EQ7 y descubre sus funciones.',
    helpAboutTitle: 'Acerca de la aplicación',
    helpAboutDesc: 'EQ7 es una calculadora inteligente y completa que reúne en una sola aplicación sencilla las operaciones diarias, las herramientas científicas y de porcentaje, la conversión de moneda y mucho más.',
    helpWhyTitle: '¿Por qué se creó EQ7?',
    helpWhyDesc: 'La idea es simple: una sola calculadora en lugar de muchas, pensada para la rapidez, la claridad y el uso diario.',
    helpWhyL1: 'Cálculos diarios rápidos',
    helpWhyL2: 'Herramientas científicas como raíz cuadrada, potencias y paréntesis',
    helpWhyL3: 'Cálculos de porcentaje fáciles',
    helpWhyL4: 'Conversión de moneda y tasas en vivo',
    helpWhyL5: 'Notas e historial de cálculos',
    helpWhyL6: 'Sencilla, clara y rápida de usar',
    helpWhyL7: 'Funciona como aplicación instalable (PWA) en distintos dispositivos',
    helpSectionsTitle: 'Explicación de las secciones de la aplicación',
    helpSecGeneralTitle: 'Calculadora general',
    helpSecGeneralDesc: 'La calculadora principal para operaciones diarias: sumar, restar, multiplicar y dividir.',
    helpSecGeneralEx: 'Ejemplo: 12 + 7 = 19.',
    helpSecScientificTitle: 'Herramientas científicas',
    helpSecScientificDesc: 'Pulsa "Scientific" para usar los botones de raíz cuadrada, cuadrado y paréntesis en la misma calculadora.',
    helpSecScientificEx: 'Ejemplo: √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Calculadora de porcentaje',
    helpSecPercentDesc: 'Calcula rápidamente un porcentaje de una cantidad sin pasos extra.',
    helpSecPercentEx: 'Ejemplo: 15% de 200 = 30.',
    helpSecHistoryTitle: 'Historial',
    helpSecHistoryDesc: 'EQ7 recuerda lo que calculaste en las últimas 24 horas para que puedas revisarlo o compartirlo.',
    helpSecNotesTitle: 'Notas',
    helpSecNotesDesc: 'Guarda notas rápidas, organízalas en carpetas y edítalas en un editor a pantalla completa.',
    helpSecCurrencyTitle: 'Herramientas de moneda',
    helpSecCurrencyDesc: 'Busca monedas, consulta tasas en vivo, convierte monedas, usa una tasa personalizada y guarda tus favoritas.',
    helpSecSettingsTitle: 'Configuración',
    helpSecSettingsDesc: 'Cambia el idioma, el tema y el sonido a tu gusto.',
    helpButtonsTitle: 'Cómo usar la calculadora',
    helpBtnNumbers: 'Pulsa para escribir dígitos.',
    helpBtnAdd: 'Suma el siguiente número.',
    helpBtnSub: 'Resta el siguiente número.',
    helpBtnMul: 'Multiplica por el siguiente número.',
    helpBtnDiv: 'Divide entre el siguiente número.',
    helpBtnEquals: 'Muestra el resultado.',
    helpBtnAc: 'Borra todo y empieza de nuevo.',
    helpBtnBack: 'Elimina el último dígito escrito.',
    helpBtnDecimal: 'Añade un punto decimal.',
    helpBtnScientific: 'Scientific / Percentage: activa o desactiva las herramientas extra.',
    helpBtnSpeak: 'Lee el resultado actual en voz alta.',
    helpSettingsExplainTitle: 'Configuración',
    helpSetLanguage: 'Idioma: cambia toda la aplicación entre los idiomas disponibles.',
    helpSetTheme: 'Tema: elige entre Negro OLED, Carbon oscuro, Titanio pizarra o Claro minimalista.',
    helpSetSoundsTitle: 'Sonidos de la aplicación: interruptor principal del sonido y vibración.',
    helpSetSoundsDesc: 'Cuando Sonidos está activado, el sonido de los botones y la vibración están permitidos. Desactívalo para silenciarlos y actívalo de nuevo para permitirlos.',
    helpSetSoundsSpeech: 'Voz/TTS es independiente de Sonidos y no se desactiva con Sonidos.',
    helpCurrencyTitle: 'Conversor de moneda',
    helpCurrencyDesc: 'Elige la moneda que tienes (De) y la que quieres (A), y escribe una cantidad.',
    helpCurrencySwap: 'Usa el botón de intercambio para invertir las dos monedas.',
    helpCurrencyFavorites: 'Usa la estrella para marcar una moneda como favorita y abre Favoritos desde el menú de moneda.',
    helpCurrencyCustomRate: 'Conversión a tasa personalizada te permite introducir tu propio tipo de cambio.',
    helpCurrencyLive: 'Los precios en vivo vienen del servicio online; si no está disponible, pueden usarse tasas en caché.',
    helpInstallTitle: 'Instalar y sin conexión',
    helpInstallDesc1: 'Puedes instalar EQ7 como aplicación en dispositivos compatibles.',
    helpInstallDesc2: 'Algunas funciones funcionan sin conexión con recursos guardados, pero las tasas en vivo y las actualizaciones necesitan internet.',
    helpBenefitsTitle: '¿Por qué usar EQ7?',
    helpBenefit1: 'Calculadora todo en uno',
    helpBenefit2: 'Cálculos diarios rápidos',
    helpBenefit3: 'Herramientas científicas y de porcentaje',
    helpBenefit4: 'Conversión de moneda',
    helpBenefit5: 'Historial y notas',
    helpBenefit6: 'Interfaz multilingüe',
    helpBenefit7: 'Diseño adaptable y soporte PWA',
    helpLangTitle: 'Idiomas',
    helpLangDesc: 'EQ7 está totalmente traducido. Elige tu idioma en la barra superior o en Configuración y toda la aplicación, incluida esta página de ayuda, se actualiza al instante.'
  , smartPdfAdd: 'Añadir', smartPdfAddText: 'Texto', smartPdfAddImage: 'Imagen', smartPdfAddLogo: 'Logotipo', smartPdfAddSignature: 'Firma', smartPdfAddStamp: 'Sello', smartPdfAddDate: 'Fecha', smartPdfAddTable: 'Tabla', smartPdfMark: 'Marcar', smartPdfMarkHighlight: 'Resaltar', smartPdfMarkUnderline: 'Subrayar', smartPdfMarkDraw: 'Dibujar', smartPdfMarkComment: 'Comentario', smartPdfMarkDone: 'Hecho', smartPdfMarkCancel: 'Cancelar', smartPdfCommentTitle: 'Comentario', smartPdfCommentText: 'Texto del comentario', smartPdfCommentAdd: 'Añadir comentario', smartPdfMarkSelectText: 'Selecciona primero el texto a marcar', smartPdfMarkDrawHint: 'Dibuja en la página', smartPdfMarkCommentLabel: 'Texto del comentario', smartPdfMarkAddComment: 'Añadir comentario', pdfTblRow: 'Añadir fila', pdfTblRowDel: 'Eliminar fila', pdfTblCol: 'Añadir columna', pdfTblColDel: 'Eliminar columna', pdfTblAlignL: 'Izquierda', pdfTblAlignC: 'Centro', pdfTblAlignR: 'Derecha', pdfTblBold: 'Negrita', pdfTblItalic: 'Cursiva', pdfTblTextColor: 'Color del texto', pdfTblBg: 'Fondo', pdfTblBorder: 'Color del borde', pdfTblNoBorder: 'Sin borde', pdfTblRowH: 'Altura de fila', pdfTblControls: 'Controles de tabla', smartPdfPages: 'Páginas', pdfPgAdd: 'Añadir página', pdfPgDel: 'Eliminar página', pdfPgRot: 'Rotar', pdfPgDup: 'Duplicar', pdfPgAdded: 'Página añadida', pdfPgDeleted: 'Página eliminada', pdfPgRotated: 'Rotado', pdfPgDuplicated: 'Página duplicada', pdfPgLast: 'Un documento debe conservar al menos una página'
, smartPdfAdd: 'Añadir', smartPdfAddText: 'Texto', smartPdfAddImage: 'Imagen', smartPdfAddLogo: 'Logotipo', smartPdfAddSignature: 'Firma', smartPdfAddStamp: 'Sello', smartPdfAddDate: 'Fecha', smartPdfAddTable: 'Tabla', smartPdfMark: 'Marcar', smartPdfMarkHighlight: 'Resaltar', smartPdfMarkUnderline: 'Subrayar', smartPdfMarkDraw: 'Dibujar', smartPdfMarkComment: 'Comentario', smartPdfMarkDone: 'Hecho', smartPdfMarkCancel: 'Cancelar', smartPdfCommentTitle: 'Comentario', smartPdfCommentText: 'Texto del comentario', smartPdfCommentAdd: 'Añadir comentario', smartPdfMarkSelectText: 'Selecciona primero el texto a marcar', smartPdfMarkDrawHint: 'Dibuja en la página', smartPdfMarkCommentLabel: 'Texto del comentario', smartPdfMarkAddComment: 'Añadir comentario', pdfTblRow: 'Añadir fila', pdfTblRowDel: 'Eliminar fila', pdfTblCol: 'Añadir columna', pdfTblColDel: 'Eliminar columna', pdfTblAlignL: 'Izquierda', pdfTblAlignC: 'Centro', pdfTblAlignR: 'Derecha', pdfTblBold: 'Negrita', pdfTblItalic: 'Cursiva', pdfTblTextColor: 'Color del texto', pdfTblBg: 'Fondo', pdfTblBorder: 'Color del borde', pdfTblNoBorder: 'Sin borde', pdfTblRowH: 'Altura de fila', pdfTblControls: 'Controles de tabla', smartPdfPages: 'Páginas', pdfPgAdd: 'Añadir página', pdfPgDel: 'Eliminar página', pdfPgRot: 'Rotar', pdfPgDup: 'Duplicar', pdfPgAdded: 'Página añadida', pdfPgDeleted: 'Página eliminada', pdfPgRotated: 'Rotado', pdfPgDuplicated: 'Página duplicada', pdfPgLast: 'Un documento debe conservar al menos una página'
},
  ar: {
    eyebrow: '',
    adBarLabel: 'إعلان',
    title: 'EQ7',
    install: 'تثبيت التطبيق',
    actions: 'إجراءات',
    notesManagerTitle: 'مدير الملاحظات',
    notesManagerSubtitle: 'نظم الملاحظات في مجلدات وافتح محرراً بملء الشاشة.',
    foldersTitle: 'المجلدات',
    addFolder: '+ مجلد',
    newNoteButton: 'ملاحظة جديدة بملء الشاشة',
    notesTitle: 'الملاحظات',
    refreshNotes: 'تحديث',
    fullScreenNoteTitle: 'ملاحظة بملء الشاشة',
    noteFolderLabel: 'المجلد',
    noteTitleLabel: 'العنوان',
    noteTitlePlaceholder: 'عنوان الملاحظة',
    folderSelectLabel: 'المجلد',
        noteBodyPlaceholder: 'ابدأ الكتابة...',
    noteTableInsertPopupTitle: 'إدراج جدول',
  noteHeadingMenuLabel: 'عنوان',
  noteHeading1Label: 'عنوان 1',
  noteHeading2Label: 'عنوان 2',
  noteHeading3Label: 'عنوان 3',
  noteNormalTextLabel: 'نص عادي',
    noteTableRowsLabel: 'صفوف',
    noteTableColsLabel: 'أعمدة',
    noteTableHeaderRowLabel: 'صف العنوان',
    noteTableInsertBtnLabel: 'إدراج جدول',
    noteImageOpacity: 'الشفافية', noteImageSendBack: 'جعل الصورة خلف النص',
    noteTablePresetCustomLabel: 'مخصص',
    untitled: 'بدون عنوان',
  pdfPreviewTitle: 'معاينة PDF',
  pdfPrevPage: 'الصفحة السابقة',
  pdfNextPage: 'الصفحة التالية',
  pdfZoomIn: 'تكبير',
  pdfZoomOut: 'تصغير',
  pdfZoomFit: 'ملاءمة الصفحة',
  pdfRotate: 'تدوير',
  pdfShare: 'مشاركة / حفظ PDF',
  pdfClose: 'إغلاق المعاينة',
    pdfMore: 'أدوات إضافية', pdfPrint: 'طباعة', pdfSave: 'حفظ على الجهاز',
  pdfAnnoEdit: 'تحرير التعليقات', pdfAnnoText: 'إضافة نص', pdfAnnoHighlight: 'تظليل', pdfAnnoDraw: 'رسم', pdfAnnoUnderline: 'تسطير', pdfAnnoStrike: 'شطب', pdfAnnoRect: 'مستطيل', pdfAnnoCircle: 'دائرة', pdfAnnoLine: 'خط', pdfAnnoClear: 'مسح تعليقات الصفحة', pdfAnnoNote: 'إضافة ملاحظة',
  pdfDocOptions: 'خيارات المستند', pdfDocTemplate: 'قالب', pdfDocHeader: 'الترويسة', pdfDocFooter: 'التذييل', pdfDocWatermark: 'علامة مائية', pdfDocWmText: 'نص العلامة المائية',
  pdfTplBlank: 'فارغ', pdfTplReport: 'تقرير', pdfTplInvoice: 'فاتورة', pdfTplReceipt: 'إيصال', pdfTplContract: 'عقد', pdfTplCv: 'سيرة ذاتية', pdfTplBusiness: 'تقرير أعمال', pdfTplEngineering: 'تقرير هندسي', pdfTplLetter: 'رسالة',
    folderPersonal: 'شخصي',
    percentTab: 'النسبة المئوية',
    settingsTab: 'الإعدادات',
    historyTab: 'السجل',
    percentTitle: 'حاسبة النسبة المئوية',
    percentBack: 'رجوع',
    amountLabel: 'المبلغ',
    rateLabel: 'نسبة مئوية',
    settingsTitle: 'الإعدادات والتخصيص',
    languageLabel: 'اللغة',
    themeLabel: 'المظهر',
    historyTitle: 'سجل 24 ساعة',
    historyBack: 'رجوع',
    historyRemaining: 'متبقي',
    selectAll: 'تحديد الكل',
    exportButton: 'مشاركة / تصدير',
    companyNameBtn: 'اسم الشركة',
    quickNotesTitle: 'الملاحظات السريعة',
    quickNotesToggle: '▼',
    quickNotesAdd: 'حفظ',
    quickNotesPlaceholder: 'اكتب ملاحظة',
    noteTableAddRow: '+ صف',
    noteTableAddCol: '+ عمود',
    noteTableDelRow: '- صف',
    noteTableDelCol: '- عمود',
    noteTableMergeCells: 'دمج الخلايا',
    noteTableSplitCell: 'تقسيم الخلية',
    noteTableBorderAll: 'جميع الحدود',
    noteTableBorderOutside: 'حدود خارجية',
    noteTableBorderInside: 'حدود داخلية',
    noteTableBorderNone: 'لا يوجد حد',
    noteTableHAlignLeft: 'يسار',
    noteTableHAlignCenter: 'مركز',
    noteTableHAlignRight: 'يمين',
    noteTableVAlignTop: 'أعلى',
    noteTableVAlignMiddle: 'وسط',
    noteTableVAlignBottom: 'أسفل',
    historyNotePlaceholder: 'ضع علامة على هذه العملية',
    historyInsertResult: 'إدراج النتيجة',
    historySpeakResult: 'قراءة الناتج بصوت عالٍ',
    historyLabel: 'السجل',
    noteLabel: 'ملاحظة',
    noteInputPlaceholder: '+ ملاحظة جديدة',
    noteSaved: 'تم حفظ الملاحظة',
    noteEdit: 'تعديل',
    noteShare: 'مشاركة',
    emptyHistory: 'لا يوجد سجل بعد',
    copied: 'تم نسخ النتيجة',
    pasted: 'تم لصق الرقم',
    installed: 'التطبيق جاهز للتثبيت',
    noSelection: 'حدد عنصراً للمشاركة',
    shareTitle: 'سجل حاسبة EQ7',
    shareMessage: 'تم التصدير من حاسبة EQ7',
    themeOled: 'الأسود والبرتقالي',
    themeCharcoal: 'الفحمي والفيروزي',
    themeTitanium: 'الرصاصي الصخري',
    themeLight: 'الفاتح النظيف',
    themeDark: 'الأسود والبرتقالي',
    themeViolet: 'الرصاصي الصخري',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'أعلى',
    drawerSide: 'جانب',
    expand: 'توسيع',
    Minimize: 'تصغير',
    installModalSubtitle: 'أضفه إلى الشاشة الرئيسية',
    installModalClose: 'حسناً',
    settingsSubtitle: 'خصص اللغة والمظهر والتغذية الراجعة.',
    appSoundsLabel: 'أصوات التطبيق',
    soundHapticsLabel: 'صوت الأزرار والاهتزاز',
    soundHapticsCaption: 'تفعيل أصوات النقر والاهتزاز',
    soundProfileLabel: 'نمط صوت الأزرار',
    profileClassic: 'كلاسيكي',
    profileSoft: 'ناعم',
    profileModern: 'حديث',
    profileClick: 'نقرة',
    profileSilent: 'صامت',
    speakerLabel: 'السماعة / القراءة الصوتية',
    speakerCaption: 'عند التشغيل تُقرأ النتيجة تلقائيًا بعد الضغط على =. عند الإيقاف تكون القراءة يدوية من زر السماعة فقط.',
    modeGeneral: 'آلة حاسبة عامة',
    scientificToggle: 'علمية',
    deg: 'درجة',
    rad: 'راديان',
    grad: 'غراد',
    sin: 'جيب',
    cos: 'جيب تمام',
    tan: 'ظل',
    asin: 'جيب عكسي',
    acos: 'جيب تمام عكسي',
    atan: 'ظل عكسي',
    percentResultLabel: 'النتيجة',
    currencyConverterTitle: 'تحويل العملات',
    currencyConverterSubtitle: 'حول المبالغ فوراً بأسعار حية.',
    resetButton: 'إعادة تعيين',
    swapButton: 'تبديل',
    favoritesButton: 'المفضلة',
    recentButton: 'الأخيرة',
    fromLabel: 'من',
    toLabel: 'إلى',
    convertedLabel: 'محول',
    bankRateMode: '🏦 سعر البنك',
    marketRateMode: '🏪 سعر السوق',
    marketRateFieldLabel: 'سعر صرف السوق',
    cachedLabel: 'مخبأ',
    refreshButton: 'تحديث',
    globalDirectoryButton: 'الدليل العالمي',
    currencyDirectoryTitle: 'دليل العملات العالمي',
    currencyDirectorySubtitle: 'ابحث عن العملات الورقية حسب اسم الدولة أو رمز العملة.',
    currencySearchPlaceholder: 'ابحث عن دولة أو رمز',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'السجل',
    drawerNotes: 'الملاحظات',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'مسح / إنشاء PDF',
    pdfCardScanDesc: 'إنشاء PDF من المستندات',
    pdfCardOpenTitle: 'فتح PDF',
    pdfCardOpenDesc: 'تحرير PDF موجود',
    pdfRecentTitle: 'أحدث ملفات PDF',
    pdfRecentEmpty: 'لا توجد ملفات PDF حديثة بعد.',
    pdfComingSoon: 'سيتوفر في تحديث قادم.',
    smartDocsTitle: '📄 المستندات الذكية',
    smartDocsDesc: 'أدِر مستنداتك من صفحة رئيسية واحدة. ستظهر أدوات جديدة هنا.',
    smartDocsHeading: 'ماذا تريد أن تفعل؟',
    smartDocsStep1: 'البدء',
    smartDocsStep2: 'التحرير',
    smartDocsStep3: 'المراجعة',
    smartDocsStep4: 'التصدير',
    smartDocsCardScanTitle: 'مسح مستند',
    smartDocsCardScanDesc: 'لتصوير ورقة أو عقد وتحويله إلى محتوى قابل للتحرير.',
    smartDocsCardImportTitle: 'استيراد ملف',
    smartDocsCardImportDesc: 'اختيار PDF أو ملف مدعوم من الجهاز.',
    smartDocsCardNewTitle: 'مستند جديد',
    smartDocsCardNewDesc: 'صفحة بيضاء تبدأ منها من الصفر.',
    smartDocsCardTemplatesTitle: 'القوالب',
    smartDocsCardTemplatesDesc: 'قوالب جاهزة تبدأ منها بسرعة.',
    smartTemplatesBusiness: 'الأعمال',
    smartTemplatesPersonal: 'الشخصية',
    smartTemplatesCustom: 'مخصصة',
    smartTemplatesInvoice: 'فاتورة',
    smartTemplatesQuote: 'عرض سعر',
    smartTemplatesPaymentAgreement: 'اتفاقية دفع',
    smartTemplatesServiceContract: 'عقد خدمات',
    smartTemplatesSimpleAgreement: 'اتفاقية بسيطة',
    smartTemplatesPaymentReceipt: 'إيصال دفع',
    smartTemplatesRentalAgreement: 'اتفاقية إيجار',
    smartTemplatesMyTemplates: 'قوالبي',
    smartScanTitle: '📸 مسح مستند',
    smartScanCapture: 'التقاط',
    smartScanUploadFallback: 'اختر صورة من جهازك بدلًا من ذلك',
    smartScanDetecting: 'اكتشاف حدود المستند',
    smartScanCorrecting: 'تصحيح الصورة',
    smartScanImproving: 'تحسين الصورة',
    smartScanReading: 'قراءة النص',
    smartScanProcessing: 'جارٍ المعالجة…',
    smartScanReviewTitle: 'مراجعة نتيجة القراءة',
    smartScanPreviewLabel: 'المستند المعالج',
    smartScanEditHint: 'يمكنك تعديل النص المُستخرج قبل القبول.',
    smartScanRescan: 'إعادة المسح',
    smartScanAccept: 'قبول النتيجة',
    smartScanStructTitle: 'البنية المكتشفة',
    smartScanReviewNote: 'راجع المحتوى قبل إنشاء ملف PDF.',
    smartScanStatusNeeds: 'مراجعة مطلوبة',
    smartScanStatusEdited: 'تم التعديل: سيتم استخدام تصحيحاتك في ملف PDF.',
    smartScanStructHeading: 'عنوان',
    smartScanStructParagraph: 'فقرة',
    smartScanStructTable: 'جدول',
    smartScanStructNumber: 'رقم',
    smartScanStructDate: 'تاريخ',
    smartScanStructField: 'حقل',
    smartScanCameraUnavailable: 'الكاميرا غير متاحة على هذا الجهاز.',
    smartScanPermissionDenied: 'تم رفض إذن الكاميرا.',
    smartScanNoText: 'لم يتم التعرف على أي نص. أعد المحاولة أو أضف صورة.',
    smartScanOcrFailed: 'فشلت قراءة النص. حاول مجددًا.',
    smartScanAccepted: 'تم قبول النتيجة وجاهزة للتحرير.',
    smartScanEditTitle: 'مستند قابل للتحرير', smartScanEditDocTitlePh: 'عنوان المستند',
    smartScanCreatePdf: 'إنشاء PDF', smartScanPdfCreating: 'جارٍ إنشاء PDF…',
    smartScanPdfCreated: 'تم إنشاء PDF من المستند المعدّل.',
    smartScanOfflinePdf: 'غير متصل — تعذّر تحميل مكتبة PDF.',
    smartScanPdfFailed: 'تعذّر إنشاء PDF.',
        smartImportTitle: '📂 استيراد ملف',
    pdfAddTitle: 'إضافة إلى PDF', pdfAddText: 'نص', pdfAddImage: 'صورة', pdfAddLogo: 'شعار', pdfAddSignature: 'توقيع', pdfAddStamp: 'ختم', pdfAddDate: 'تاريخ', pdfAddTable: 'جدول',
    smartImportPickPrompt: 'اختر ملف PDF من جهازك.',
    smartImportChoose: 'اختيار ملف',
    smartImportPreparing: 'جارٍ تجهيز المستند…',
    smartImportAnalyzing: 'جارٍ تحليل المستند…',
    smartImportScannedTitle: 'تم اكتشاف مستند مصوّر',
    smartImportScannedMsg: 'يبدو أن هذا المستند يحتوي على صفحات مصوّرة. هل تريد استخدام التعرف على النص؟',
    smartImportUseOcr: 'استخدام OCR',
    smartImportKeepImages: 'إبقاء الصفحات كصور',
    smartImportOcrProcessing: 'جارٍ معالجة OCR…',
    smartImportFailed: 'فشل الاستيراد',
    smartImportRetry: 'إعادة المحاولة',
    smartImportInvalidFile: 'هذا الملف ليس PDF صالحًا. اختر ملف PDF.',
    smartImportCorrupt: 'يبدو أن ملف PDF تالف أو تعذّرت قراءته. جرّب ملفًا آخر.',
    smartImportEmpty: 'لا يحتوي هذا المستند على محتوى مفيد.',
    smartImportOcrFailed: 'فشل التعرف على النص. حاول مجددًا.',
    smartEditorTitle: 'المحرر',
    smartEditorHint: 'محتوى المستند',
    smartEditorPlaceholder: 'سيظهر المحتوى المستورد هنا…',
    smartToolbarDefault: 'مستند جديد',
    smartUntitledDoc: 'مستند بدون عنوان',
    smartToolbarUndo: 'تراجع',
    smartToolbarRedo: 'إعادة',
    smartToolbarBold: 'غامق',
    smartToolbarItalic: 'مائل',
    smartToolbarUnderline: 'تسطير',
    smartDocumentBackLabel: 'المستندات الذكية',
    smartToolbarAdd: 'إضافة',
    smartAddHeading: 'عنوان',
    smartAddNewPage: 'صفحة جديدة',
    smartPageDesignNone: 'بدون إطار',
    smartPageDesignSimple: 'بسيط',
    smartPageDesignClassic: 'كلاسيكي',
    smartPageDesignFormal: 'رسمي',
    smartPageDesignModern: 'حديث',
    // PART 17 — التوقيع
    smartSigDraw: 'رسم', smartSigType: 'كتابة', smartSigImage: 'صورة',
    smartSigInsert: 'إدراج', smartSigClear: 'مسح', smartSigCancel: 'إلغاء',
    smartSigNamePh: 'اكتب اسمك', smartSigChoose: 'اختر صورة توقيعك',
    // PART 18 — حالة حماية التوقيع (حالة EQ)
    smartSigStatusSigned: '✓ تم التوقيع',
    smartSigStatusModified: '⚠ تم تعديل المستند بعد التوقيع',
    smartSigResign: 'إعادة التوقيع',
    smartTextFont: 'الخط', smartTextSize: 'الحجم', smartTextFontDefault: 'افتراضي',
    smartTextBold: 'عريض', smartTextItalic: 'مائل', smartTextUnderline: 'تسطير',
    smartTextAlignLeft: 'محاذاة لليسار', smartTextAlignCenter: 'وسط', smartTextAlignRight: 'محاذاة لليمين',
    smartTextDirection: 'اتجاه النص', smartTextDirAuto: 'تلقائي', smartTextDirLtr: 'من اليسار إلى اليمين', smartTextDirRtl: 'من اليمين إلى اليسار',
    smartTextSpacing: 'تباعد الأسطر',
    smartToolbarText: 'نص',
    smartToolbarTable: 'جدول',
    smartTableRows: 'الصفوف', smartTableColumns: 'الأعمدة',
    smartTableCreate: 'إنشاء الجدول',
    smartTableAddRow: 'إضافة صف', smartTableDelRow: 'حذف صف',
    smartTableAddCol: 'إضافة عمود', smartTableDelCol: 'حذف عمود',
    smartTableAlignLeft: 'محاذاة لليسار', smartTableAlignCenter: 'وسط', smartTableAlignRight: 'محاذاة لليمين',
    smartToolbarSignature: 'توقيع',
    smartToolbarMore: 'المزيد',
    smartToolbarImage: 'صورة',
    smartImageDelete: 'حذف الصورة',
    smartToolbarLogo: 'شعار',
    smartLogoPosition: 'موضع الشعار',
    smartLogoTopRight: 'أعلى اليمين',
    smartLogoTopLeft: 'أعلى اليسار',
    smartLogoCenter: 'الوسط',
    smartToolbarDivider: 'فاصل',
    smartToolbarBorder: 'إطار',
    smartToolbarPage: 'صفحة',
    smartToolbarPageNumber: 'ترقيم',
    smartToolbarPageSettings: 'إعدادات الصفحة',
    smartBlankNavPage: 'صفحة',
    smartBlankNavPrev: 'السابق',
    smartBlankNavNext: 'التالي',
    // PART 19 — إدارة الصفحات
    smartBlankNavOf: 'من',
    smartPageAdd: 'إضافة صفحة', smartPageCopy: 'نسخ الصفحة', smartPageDelete: 'حذف الصفحة',
    // PART 20 — حفظ العمل
    smartToolbarSave: 'حفظ', smartSavedToast: 'تم حفظ المستند',
    smartPdfTextColor: 'لون النص',
    smartPdfStyle: 'نمط', smartPdfStyleNone: 'بدون نمط', smartPdfStyleSimple: 'بسيط', smartPdfStyleBusiness: 'أعمال', smartPdfStyleAcademic: 'أكاديمي', smartPdfStyleEngineering: 'هندسي',
    smartPdfAdd: 'إضافة', smartPdfAddText: 'نص', smartPdfAddImage: 'صورة', smartPdfAddLogo: 'شعار', smartPdfAddSignature: 'توقيع', smartPdfAddStamp: 'ختم', smartPdfAddDate: 'تاريخ', smartPdfAddTable: 'جدول', smartPdfMark: 'وضع علامة', smartPdfMarkHighlight: 'تمييز', smartPdfMarkUnderline: 'تسطير', smartPdfMarkDraw: 'رسم', smartPdfMarkComment: 'تعليق', smartPdfMarkDone: 'تم', smartPdfMarkCancel: 'إلغاء', smartPdfCommentTitle: 'تعليق', smartPdfCommentText: 'نص التعليق', smartPdfCommentAdd: 'إضافة تعليق', smartPdfMarkSelectText: 'حدد النص أولاً لوضع علامة', smartPdfMarkDrawHint: 'ارسم على الصفحة', smartPdfMarkCommentLabel: 'نص التعليق', smartPdfMarkAddComment: 'إضافة تعليق', pdfTblRow: 'إضافة صف', pdfTblRowDel: 'حذف صف', pdfTblCol: 'إضافة عمود', pdfTblColDel: 'حذف عمود', pdfTblAlignL: 'يسار', pdfTblAlignC: 'وسط', pdfTblAlignR: 'يمين', pdfTblBold: 'عريض', pdfTblItalic: 'مائل', pdfTblTextColor: 'لون النص', pdfTblBg: 'الخلفية', pdfTblBorder: 'لون الحدود', pdfTblNoBorder: 'بدون حدود', pdfTblRowH: 'ارتفاع الصف', pdfTblControls: 'أدوات الجدول', smartPdfPages: 'الصفحات', pdfPgAdd: 'إضافة صفحة', pdfPgDel: 'حذف صفحة', pdfPgRot: 'تدوير', pdfPgDup: 'تكرار الصفحة', pdfPgAdded: 'تمت إضافة صفحة', pdfPgDeleted: 'تم حذف الصفحة', pdfPgRotated: 'تم التدوير', pdfPgDuplicated: 'تم تكرار الصفحة', pdfPgLast: 'يجب إبقاء صفحة واحدة على الأقل',
    smartSaveFailed: 'تعذر الحفظ. حاول مرة أخرى.',
    smartUnsavedTitle: 'هل تريد حفظ التغييرات قبل الخروج؟',
    smartReviewButton: 'مراجعة', smartReviewExit: 'العودة إلى التحرير',
    smartPdfExportButton: 'تصدير PDF', smartPdfExportTitle: 'تصدير PDF', smartPdfExportFilenameLabel: 'اسم الملف',
    smartPdfExportPagesLabel: 'الصفحات', smartPdfExportAllPages: 'جميع الصفحات', smartPdfExportCurrentPage: 'الصفحة الحالية',
    smartPdfExportQualityLabel: 'الجودة', smartPdfExportNormal: 'عادية', smartPdfExportHigh: 'عالية',
    smartPdfExportDo: 'تصدير', smartPdfExportCancel: 'إلغاء',
    smartPdfExportSuccess: 'تم تصدير PDF بنجاح.', smartPdfExportFailed: 'فشل إنشاء ملف PDF.',
    smartPdfPreparing: 'جارٍ تجهيز المستند…', smartPdfPrepareFailed: 'تعذر تجهيز ملف PDF. حاول مرة أخرى.',
    smartPdfResultTitle: 'تم إنشاء المستند بنجاح', smartPdfResultFileLabel: 'الملف',
    smartPdfOpen: 'فتح PDF', smartPdfShare: 'مشاركة', smartPdfSend: 'إرسال', smartPdfClose: 'إغلاق',
    smartPdfShareUnsupported: 'المشاركة المباشرة غير مدعومة على هذا الجهاز. تم تنزيل ملف PDF.',
    smartPdfShareCancelled: 'تم إلغاء المشاركة.', smartPdfShareFailed: 'فشلت المشاركة. تم تنزيل ملف PDF.',
    smartPdfOpenFailed: 'تعذر فتح ملف PDF في هذا المتصفح.',
    // PART 31 — المعاينة قبل التصدير النهائي
    smartPdfPreviewTitle: 'معاينة',
    smartPdfPreviewNote: 'هذا هو الملف الذي سيُحفظ.',
    smartPdfSave: 'حفظ PDF',
    smartUnsavedSave: 'حفظ', smartUnsavedExit: 'خروج بدون حفظ', smartUnsavedCancel: 'إلغاء',
    // PART 33 — مستند جديد (حماية التغييرات غير المحفوظة)
    smartUnsavedNewTitle: 'لديك تغييرات غير محفوظة.',
    smartUnsavedSaveContinue: 'حفظ والمتابعة',
    smartUnsavedStartNew: 'بدء مستند جديد',
    smartSaveAndContinueFailed: 'فشل الحفظ. لم تُفقد تغييراتك.',
    smartDraftBannerTitle: 'مسودة محفوظة على هذا الجهاز', smartDraftResume: 'متابعة المسودة',
    smartDraftsTitle: 'مسوداتك', smartDraftsEmpty: 'لا توجد مسودات محفوظة', smartDraftsNewDoc: 'مستند فارغ',
    smartDraftResumeBtn: 'متابعة التحرير', smartDraftDeleteBtn: 'حذف',
    smartDraftDelTitle: 'حذف هذه المسودة؟', smartDraftDelConfirm: 'حذف',
    smartRelNow: 'الآن', smartRelMin: 'منذ دقيقة', smartRelMins: 'منذ {n} دقائق',
    smartRelHour: 'منذ ساعة', smartRelHours: 'منذ {n} ساعات', smartRelYesterday: 'أمس', smartRelDays: 'منذ {n} أيام',
    drawerConverter: 'محول العملات المباشر',
    drawerDirectory: 'الدليل العالمي للعملات والبحث',
    drawerInstall: 'تثبيت التطبيق',
    drawerSettings: 'الإعدادات',
    installModalTitle: 'التثبيت على iPhone',
    installModalStep1: 'الخطوة 1: اضغط على زر المشاركة (⎘ / ⇡) في أسفل أو أعلى المتصفح.',
    installModalStep2: 'الخطوة 2: اختر "إضافة إلى الشاشة الرئيسية" من القائمة.',
    currencyOptionSearch: 'البحث عن عملة',
    currencyOptionPrices: 'أسعار العملات المباشرة',
    featureRequiresInternet: 'تحتاج هذه الميزة إلى اتصال بالإنترنت.',
    currencyOptionConvert: 'تحويل العملات',
    currencyOptionFavorites: 'العملات المفضلة',
    currencyFavoritesTitle: 'المفضلة',
    currencyFavoritesEmpty: 'لا توجد عملات مفضلة بعد',
    currencyFavoritesEmptyHint: 'اضغط على النجمة لأي عملة لإضافتها هنا',
    currencyOptionCustomRate: 'تحويل بسعر مخصص',
    customRateTitle: 'تحويل بسعر مخصص',
    customRateFieldLabel: 'سعر الصرف',
    currencyRatesTitle: 'أسعار العملات',
    currencyRatesSearchPlaceholder: 'ابحث عن عملة أو رمز',
    currencyRatesEmpty: 'لا توجد عملات',
    currencyRatesLoading: 'جارٍ تحميل الأسعار…',
    currencyRatesError: 'الأسعار غير متاحة',
    recentlyDeletedTitle: 'المحذوفة مؤخراً',
    emptyNotesText: 'لا توجد ملاحظات',
    emptyNotesAction: '+ ملاحظة جديدة',
    // N02 — Notes Home
    searchNotesPlaceholder: 'ابحث في الملاحظات...',
    recentNotesLabel: 'الأحدث',
    sortNewest: 'الأحدث',
    sortOldest: 'الأقدم',
    sortAz: 'أبجدي',
    renameNote: 'إعادة تسمية',
    duplicateNote: 'نسخ',
    pinNote: 'تثبيت',
    unpinNote: 'إلغاء التثبيت',
    noteMoreActions: 'إجراءات أخرى',
    noteNamePrompt: 'اسم الملاحظة:',
    noteEmptyName: 'لا يمكن أن يكون اسم الملاحظة فارغًا.',
    copySuffix: ' (نسخة)',
    noNotesFound: 'لا توجد ملاحظات مطابقة',
    createFirstNote: 'أنشئ ملاحظتك الأولى',
    updatedToday: 'عُدِّلت اليوم',
    updatedYesterday: 'عُدِّلت أمس',
    updatedDaysAgo: 'عُدِّلت قبل {n} أيام',
    notePinnedToast: 'تم تثبيت الملاحظة',
    noteUnpinnedToast: 'تم إلغاء تثبيت الملاحظة',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'نمط النص',
    noteStyleNormalLabel: 'نص',
    noteBasicLabel: 'أساسي',
    noteAlignLabel: 'محاذاة',
    noteFontSizeLabel: 'حجم الخط',
    noteFontSmallLabel: 'صغير',
    noteFontNormalLabel: 'عادي',
    noteFontLargeLabel: 'كبير',
    noteColorsLabel: 'ألوان',
    notePresetsLabel: 'قوالب',
    presetSimple: 'بسيط',
    presetAcademic: 'أكاديمي',
    presetBusiness: 'أعمال',
    presetEngineering: 'هندسي',
    presetModern: 'حديث',
    noteStylesLabel: 'الأنماط',
    noteStyleSimple: 'بسيط',
    noteStyleAcademic: 'أكاديمي',
    noteStyleBusiness: 'أعمال',
    noteStyleEngineering: 'هندسي',
    noteStyleModern: 'عصري',
    noteStyleNone: 'بدون',
    noteFramesLabel: 'الإطار',
    noteFrameNone: 'بدون',
    noteFrameClassic: 'كلاسيكي',
    noteFrameDashed: 'متقطع',
    noteFrameSoft: 'ناعم',
    pdfExportTitle: 'تصدير PDF',
    pdfExportStyle: 'النمط',
    pdfExportTitleLabel: 'العنوان',
    pdfExportTitlePh: 'عنوان الملاحظة (اختياري)',
    pdfExportDate: 'التاريخ',
    pdfExportCompany: 'استخدام ملف الشركة',
    pdfExportPreview: 'معاينة',
    pdfExportCreate: 'إنشاء PDF',
    pdfExportClose: 'إغلاق نافذة التصدير',
    noteSavedLabel: 'تم الحفظ ✓',
    emptyDeletedText: 'لا توجد ملاحظات محذوفة',
    deleteConfirmTitle: 'حذف نهائي؟',
    deleteConfirmText: 'لا يمكن التراجع عن هذا الإجراء.',
    cancelBtn: 'إلغاء',
    deletePermanentBtn: 'حذف نهائي',
    doneBtn: 'تم',
    deleteNoteBtn: 'حذف الملاحظة',
    restoreBtn: 'استعادة',
    unfiled: 'بدون مجلد',
    folderNamePrompt: 'اسم المجلد:',
    folderEmptyName: 'لا يمكن أن يكون اسم المجلد فارغًا.',
    folderDuplicateName: 'يوجد مجلد بهذا الاسم بالفعل.',
    renameFolder: 'إعادة تسمية المجلد',
    deleteFolder: 'حذف المجلد',
    folderDeleteConfirmTitle: 'حذف المجلد؟',
    folderDeleteConfirmText: 'ستُنقل ملاحظات هذا المجلد إلى "بدون مجلد" وسيتم الاحتفاظ بها.',
    helpTitle: 'المساعدة والمعلومات',
    helpSubtitle: 'تعلّم كيفية استخدام EQ7 واكتشف مزاياه.',
    helpAboutTitle: 'عن التطبيق',
    helpAboutDesc: 'EQ7 حاسبة ذكية وشاملة تجمع بين الحسابات اليومية والأدوات العلمية وحساب النسبة المئوية وتحويل العملات وكل ذلك في تطبيق واحد سهل الاستخدام.',
    helpWhyTitle: 'لماذا أُنشئ EQ7؟',
    helpWhyDesc: 'الفكرة بسيطة: حاسبة واحدة بدلًا من عدة حاسبات، مصمّمة للسرعة والوضوح والاستخدام اليومي.',
    helpWhyL1: 'حسابات يومية سريعة',
    helpWhyL2: 'أدوات علمية مثل الجذر التربيعي والأُسس والأقواس',
    helpWhyL3: 'حساب النسبة المئوية بسهولة',
    helpWhyL4: 'تحويل العملات والأسعار المباشرة',
    helpWhyL5: 'الملاحظات وسجل الحسابات',
    helpWhyL6: 'بسيط وواضح وسريع في الاستخدام',
    helpWhyL7: 'يعمل كتطبيق قابل للتثبيت (PWA) على أجهزة مختلفة',
    helpSectionsTitle: 'شرح أقسام التطبيق',
    helpSecGeneralTitle: 'الحاسبة العامة',
    helpSecGeneralDesc: 'الحاسبة الرئيسية للعمليات اليومية: الجمع والطرح والضرب والقسمة.',
    helpSecGeneralEx: 'مثال: 12 + 7 = 19.',
    helpSecScientificTitle: 'الأدوات العلمية',
    helpSecScientificDesc: 'اضغط على "Scientific" لاستخدام أزرار الجذر التربيعي والتربيع والأقواس داخل الحاسبة نفسها.',
    helpSecScientificEx: 'مثال: √9 = 3، 2^3 = 8.',
    helpSecPercentTitle: 'حاسبة النسبة المئوية',
    helpSecPercentDesc: 'احسب نسبة مئوية من مبلغ معيّن بسرعة ودون خطوات إضافية.',
    helpSecPercentEx: 'مثال: 15% من 200 = 30.',
    helpSecHistoryTitle: 'السجل',
    helpSecHistoryDesc: 'يحفظ EQ7 ما حاسبته في آخر 24 ساعة لتعيد الاطلاع عليه أو تشاركه.',
    helpSecNotesTitle: 'الملاحظات',
    helpSecNotesDesc: 'احفظ ملاحظات سريعة ونظّمها في مجلدات وعدّلها في محرّر بملء الشاشة.',
    helpSecCurrencyTitle: 'أدوات العملات',
    helpSecCurrencyDesc: 'ابحث عن العملات واطّلع على الأسعار المباشرة وحوّل بين العملات واستخدم سعرًا مخصصًا واحفظ المفضلة.',
    helpSecSettingsTitle: 'الإعدادات',
    helpSecSettingsDesc: 'غيّر اللغة والسمة والتنبيهات الصوتية بالطريقة التي تناسبك.',
    helpButtonsTitle: 'كيف تستخدم الحاسبة',
    helpBtnNumbers: 'اضغط لكتابة الأرقام.',
    helpBtnAdd: 'يضيف الرقم التالي.',
    helpBtnSub: 'يطرح الرقم التالي.',
    helpBtnMul: 'يضرب في الرقم التالي.',
    helpBtnDiv: 'يقسم على الرقم التالي.',
    helpBtnEquals: 'يعرض النتيجة.',
    helpBtnAc: 'يمسح كل شيء ويبدأ من جديد.',
    helpBtnBack: 'يحذف آخر رقم كتبته.',
    helpBtnDecimal: 'يضيف فاصلة عشرية.',
    helpBtnScientific: 'Scientific / Percentage: يعمل على تشغيل الأدوات الإضافية أو إيقافها.',
    helpBtnSpeak: 'يقرأ النتيجة الحالية بصوت مسموع.',
    helpSettingsExplainTitle: 'الإعدادات',
    helpSetLanguage: 'اللغة: تغيّر لغة التطبيق بالكامل بين اللغات المتاحة.',
    helpSetTheme: 'السمة: اختر الأسود والبرتقالي أو الفحمي والفيروزي أو الرصاصي الصخري أو الفاتح النظيف.',
    helpSetSoundsTitle: 'أصوات التطبيق: المفتاح الرئيسي لأصوات الأزرار والاهتزاز.',
    helpSetSoundsDesc: 'عند تفعيل أصوات التطبيق تُسمع أصوات الأزرار ويكون الاهتزاز مسموحًا. أوقِفه لكتم ذلك، وأعد تشغيله للسماح به مرة أخرى.',
    helpSetSoundsSpeech: 'النطق/TTS منفصل عن أصوات التطبيق ولا يتوقف بإيقافها.',
    helpCurrencyTitle: 'محوّل العملات',
    helpCurrencyDesc: 'اختر العملة التي لديك (من) والعملة التي تريدها (إلى)، ثم أدخل المبلغ.',
    helpCurrencySwap: 'استخدم زر التبديل لعكس العملتين.',
    helpCurrencyFavorites: 'استخدم النجمة لوضع علامة على عملة كمفضلة وافتح "العملات المفضلة" من قائمة العملات.',
    helpCurrencyCustomRate: 'التحويل بسعر مخصص يسمح لك بإدخال سعر الصرف الخاص بك.',
    helpCurrencyLive: 'الأسعار المباشرة تأتي من الخدمة عبر الإنترنت؛ وإذا كانت غير متاحة قد تُستخدم الأسعار المخزنة.',
    helpInstallTitle: 'التثبيت والعمل دون اتصال',
    helpInstallDesc1: 'يمكنك تثبيت EQ7 كتطبيق على الأجهزة المدعومة.',
    helpInstallDesc2: 'بعض الميزات تعمل دون اتصال باستخدام موارد مخزنة، لكن الأسعار المباشرة وتحديثات التطبيق تحتاج إلى اتصال بالإنترنت.',
    helpBenefitsTitle: 'لماذا تستخدم EQ7؟',
    helpBenefit1: 'حاسبة شاملة للكل',
    helpBenefit2: 'حسابات يومية سريعة',
    helpBenefit3: 'أدوات علمية وحساب نسبة مئوية',
    helpBenefit4: 'تحويل العملات',
    helpBenefit5: 'السجل والملاحظات',
    helpBenefit6: 'واجهة متعددة اللغات',
    helpBenefit7: 'تصميم متجاوب ودعم PWA',
    helpLangTitle: 'اللغات',
    helpLangDesc: 'EQ7 مترجم بالكامل. اختر لغتك من الشريط العلوي أو من الإعدادات، وسيتم تحديث التطبيق بالكامل — بما في ذلك صفحة المساعدة هذه — فورًا.'
  },
  fr: {
    eyebrow: '',
    adBarLabel: 'Publicité',
    title: 'EQ7',
    install: 'Installer l\'application',
    actions: 'Actions',
    notesManagerTitle: 'Gestionnaire de notes',
    notesManagerSubtitle: 'Organisez les notes dans des dossiers et ouvrez un éditeur plein écran.',
    foldersTitle: 'Dossiers',
    addFolder: '+ Dossier',
    newNoteButton: 'Nouvelle note plein écran',
    notesTitle: 'Notes',
    refreshNotes: 'Actualiser',
    fullScreenNoteTitle: 'Note plein écran',
    noteFolderLabel: 'Dossier',
    noteTitleLabel: 'Titre',
    noteTitlePlaceholder: 'Titre de la note',
    folderSelectLabel: 'Dossier',
        noteBodyPlaceholder: 'Commencez à écrire...',
    percentTab: 'Pourcentage',
    settingsTab: 'Paramètres',
    historyTab: 'Historique',
    percentTitle: 'Calculatrice de pourcentage',
    percentBack: 'Retour',
    amountLabel: 'Montant',
    rateLabel: 'Taux de pourcentage',
    settingsTitle: 'Paramètres et personnalisation',
    languageLabel: 'Langue',
    themeLabel: 'Thème',
    historyTitle: 'Historique 24 heures',
    historyBack: 'Retour',
    historyRemaining: 'restant',
    selectAll: 'Tout sélectionner',
    exportButton: 'Partager / Exporter',
    companyNameBtn: 'Nom de l\'entreprise',
    quickNotesTitle: 'Notes rapides',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Enregistrer',
    quickNotesPlaceholder: 'Écrire une note',
    historyNotePlaceholder: 'Étiqueter ce calcul',
    historyInsertResult: 'Insérer le résultat',
    historySpeakResult: 'Lire le résultat à voix haute',
    historyLabel: 'Historique',
    noteLabel: 'Note',
    noteInputPlaceholder: '+ Nouvelle note',
    noteSaved: 'Note enregistrée',
    noteEdit: 'Modifier',
    noteShare: 'Partager',
    emptyHistory: 'Pas encore d\'historique',
    noteTableAddRow: '+ Ligne',
    noteTableAddCol: '+ Colonne',
    noteTableDelRow: '- Ligne',
    noteTableDelCol: '- Colonne',
    noteTableMergeCells: 'Fusionner les cellules',
    noteTableSplitCell: 'Fractionner la cellule',
    noteTableBorderAll: 'Toutes les bordures',
    noteTableBorderOutside: 'Bords extérieurs',
    noteTableBorderInside: 'Bords intérieurs',
    noteTableBorderNone: 'Aucun bord',
    noteTableHAlignLeft: 'Gauche',
    noteTableHAlignCenter: 'Centre',
    noteTableHAlignRight: 'Droite',
    noteTableVAlignTop: 'Top',
    noteTableVAlignMiddle: 'Moyen',
    noteTableVAlignBottom: 'Bas',
    copied: 'Résultat copié',
    pasted: 'Nombre collé',
    installed: 'L\'application est prête à être installée',
    noSelection: 'Sélectionnez un élément à partager',
    shareTitle: 'Historique de Calculatrice EQ7',
    shareMessage: 'Exporté depuis Calculatrice EQ7',
    themeOled: 'Noir OLED',
    themeCharcoal: 'Charbon fonce',
    themeTitanium: 'Titane ardoise',
    themeLight: 'Clair minimal',
    themeDark: 'Noir OLED',
    themeViolet: 'Titane ardoise',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Haut',
    drawerSide: 'Côté',
    expand: 'Développer',
    Minimize: 'Réduire',
    installModalSubtitle: 'Ajoutez-le à votre écran d\'accueil',
    installModalClose: 'Compris',
    settingsSubtitle: 'Personnalisez la langue, le thème et les commentaires.',
    appSoundsLabel: 'Sons de l\'application',
    soundHapticsLabel: 'Son et haptique',
    soundHapticsCaption: 'Activer les sons de clic et les vibrations',
    soundProfileLabel: 'Profil sonore des boutons',
    profileClassic: 'Classique',
    profileSoft: 'Douce',
    profileModern: 'Moderne',
    profileClick: 'Clic',
    profileSilent: 'Silencieux',
    speakerLabel: 'Haut-parleur / Lecture vocale',
    speakerCaption: "Lorsqu'il est ACTIVÉ, le résultat est lu à voix haute automatiquement après avoir appuyé sur = . Lorsqu'il est DÉSACTIVÉ, la lecture est manuelle uniquement via le bouton du haut-parleur.",
    modeGeneral: 'Calculatrice générale',
    scientificToggle: 'Scientifique',
    deg: 'DEG',
    rad: 'RAD',
    grad: 'GRAD',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Résultat',
    currencyConverterTitle: 'Convertisseur de devises direct',
    currencyConverterSubtitle: 'Convertissez des montants instantanément avec les taux en direct.',
    swapButton: 'Échanger',
    favoritesButton: 'Favoris',
    recentButton: 'Récent',
    fromLabel: 'De',
    toLabel: 'Vers',
    convertedLabel: 'Converti',
    bankRateMode: '🏦 Taux bancaire',
    marketRateMode: '🏪 Taux du marché',
    marketRateFieldLabel: 'Taux de change du marché',
    cachedLabel: 'En cache',
    refreshButton: 'Actualiser',
    globalDirectoryButton: 'Répertoire mondial',
    currencyDirectoryTitle: 'Répertoire mondial des devises',
    currencyDirectorySubtitle: 'Recherchez des devises par nom de pays ou code.',
    currencySearchPlaceholder: 'Rechercher un pays ou un code',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'Historique',
    drawerNotes: 'Notes',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Scanner / Créer un PDF',
    pdfCardScanDesc: 'Créer un PDF à partir de documents',
    pdfCardOpenTitle: 'Ouvrir un PDF',
    pdfCardOpenDesc: 'Modifier un PDF existant',
    pdfRecentTitle: 'PDF récents',
    pdfRecentEmpty: 'Aucun PDF récent pour le moment.',
    pdfComingSoon: 'Disponible dans une prochaine mise à jour.',
    noteTableInsertPopupTitle: 'Insérer un tableau',
  noteHeadingMenuLabel: 'Titre',
  noteHeading1Label: 'Titre 1',
  noteHeading2Label: 'Titre 2',
  noteHeading3Label: 'Titre 3',
  noteNormalTextLabel: 'Texte normal',
    noteTableRowsLabel: 'Lignes',
    noteTableColsLabel: 'Colonnes',
    noteTableHeaderRowLabel: 'Ligne d’en-tête',
    noteTableInsertBtnLabel: 'Insérer le tableau',
    noteTablePresetCustomLabel: 'Personnalisée',
    untitled: 'Sans titre',
  pdfPreviewTitle: 'Aperçu du PDF',
  pdfPrevPage: 'Page précédente',
  pdfNextPage: 'Page suivante',
  pdfZoomIn: 'Zoom avant',
  pdfZoomOut: 'Zoom arrière',
  pdfZoomFit: 'Ajuster la page',
  pdfRotate: 'Pivoter',
  pdfShare: 'Partager / Enregistrer le PDF',
  pdfClose: 'Fermer l’aperçu',
    pdfMore: 'Plus d’outils', pdfPrint: 'Imprimer', pdfSave: 'Enregistrer sur l’appareil',
  pdfAnnoEdit: 'Modifier les annotations', pdfAnnoText: 'Ajouter du texte', pdfAnnoHighlight: 'Surligner', pdfAnnoDraw: 'Dessiner', pdfAnnoUnderline: 'Souligner', pdfAnnoStrike: 'Barrer', pdfAnnoRect: 'Rectangle', pdfAnnoCircle: 'Cercle', pdfAnnoLine: 'Ligne', pdfAnnoClear: 'Effacer les annotations de la page', pdfAnnoNote: 'Ajouter une note',
  pdfDocOptions: 'Options du document', pdfDocTemplate: 'Modèle', pdfDocHeader: 'En-tête', pdfDocFooter: 'Pied de page', pdfDocWatermark: 'Filigrane', pdfDocWmText: 'Texte du filigrane',
  pdfTplBlank: 'Vierge', pdfTplReport: 'Rapport', pdfTplInvoice: 'Facture', pdfTplReceipt: 'Reçu', pdfTplContract: 'Contrat', pdfTplCv: 'CV', pdfTplBusiness: "Rapport d'affaires", pdfTplEngineering: "Rapport d'ingénierie", pdfTplLetter: 'Lettre',
    folderPersonal: 'Personnel',
    resetButton: 'Réinitialiser',
    featureRequiresInternet: 'Cette fonctionnalité nécessite une connexion Internet.',
    smartDocsTitle: '📄 Documents intelligents',
    smartDocsDesc: 'Gérez vos documents depuis une page d’accueil unique. De nouveaux outils apparaîtront ici.',
    smartDocsHeading: 'Que voulez-vous faire ?',
    smartDocsStep1: 'Démarrer',
    smartDocsStep2: 'Modifier',
    smartDocsStep3: 'Révision',
    smartDocsStep4: 'Exportation',
    smartDocsCardScanTitle: 'Numériser un document',
    smartDocsCardScanDesc: 'Prenez une photo d’un papier ou d’un contrat et transformez-la en contenu modifiable.',
    smartDocsCardImportTitle: 'Importer un fichier',
    smartDocsCardImportDesc: 'Choisissez un PDF ou un fichier pris en charge depuis votre appareil.',
    smartDocsCardNewTitle: 'Nouveau document',
    smartDocsCardNewDesc: 'Une page blanche pour partir de zéro.',
    smartDocsCardTemplatesTitle: 'Modèles',
    smartDocsCardTemplatesDesc: 'Des modèles prêts à l’emploi pour démarrer rapidement.',
    smartTemplatesBusiness: 'Affaires',
    smartTemplatesPersonal: 'Personnel',
    smartTemplatesCustom: 'Personnalisé',
    smartTemplatesInvoice: 'Facture',
    smartTemplatesQuote: 'Devis',
    smartTemplatesPaymentAgreement: 'Accord de paiement',
    smartTemplatesServiceContract: 'Contrat de services',
    smartTemplatesSimpleAgreement: 'Accord simple',
    smartTemplatesPaymentReceipt: 'Reçu de paiement',
    smartTemplatesRentalAgreement: 'Contrat de location',
    smartTemplatesMyTemplates: 'Mes modèles',
    smartScanTitle: '📸 Numériser un document',
    smartScanCapture: 'Capturer',
    smartScanUploadFallback: 'Choisissez plutôt une image de votre appareil',
    smartScanDetecting: 'Détection des bordures du document',
    smartScanCorrecting: 'Correction de l’image',
    smartScanImproving: 'Amélioration de l’image',
    smartScanReading: 'Lecture du texte',
    smartScanProcessing: 'Traitement…',
    smartScanReviewTitle: 'Revoir le résultat de l’OCR',
    smartScanPreviewLabel: 'Document traité',
    smartScanEditHint: 'Vous pouvez modifier le texte reconnu avant de l’accepter.',
    smartScanRescan: 'Re-numériser',
    smartScanAccept: 'Accepter le résultat',
    smartScanStructTitle: 'Structure détectée',
smartScanReviewNote: 'Document reconnu. Vérifiez le contenu avant de créer le PDF.',
    smartScanStatusNeeds: 'Doit être vérifié',
    smartScanStatusEdited: 'Modifié — vos corrections seront utilisées dans le PDF',
    smartScanStructHeading: 'Titre',
    smartScanStructParagraph: 'Paragraphe',
    smartScanStructTable: 'Tableau',
    smartScanStructNumber: 'Nombre',
    smartScanStructDate: 'Date',
    smartScanStructField: 'Champ',
    smartScanCameraUnavailable: 'La caméra n’est pas disponible sur cet appareil.',
    smartScanPermissionDenied: 'L’autorisation de la caméra a été refusée.',
    smartScanNoText: 'Aucun texte détecté. Réessayez ou ajoutez une image.',
    smartScanOcrFailed: 'La lecture du texte a échoué. Veuillez réessayer.',
    smartScanAccepted: 'Résultat accepté et prêt à être modifié.',
    smartScanEditTitle: 'Document modifiable', smartScanEditDocTitlePh: 'Titre du document',
    smartScanCreatePdf: 'Créer un PDF', smartScanPdfCreating: 'Création du PDF…',
    smartScanPdfCreated: 'PDF créé à partir du document modifié.',
    smartScanOfflinePdf: 'Hors ligne — la bibliothèque PDF n\u2019a pas pu être chargée.',
    smartScanPdfFailed: 'Impossible de créer le PDF.',
        smartImportTitle: '📂 Importer un fichier',
    pdfAddTitle: 'Ajouter au PDF', pdfAddText: 'Texte', pdfAddImage: 'Image', pdfAddLogo: 'Logo', pdfAddSignature: 'Signature', pdfAddStamp: 'Cachet', pdfAddDate: 'Date', pdfAddTable: 'Tableau',
    smartImportPickPrompt: 'Choisissez un fichier PDF depuis votre appareil.',
    smartImportChoose: 'Choisir un fichier',
    smartImportPreparing: 'Préparation du document…',
    smartImportAnalyzing: 'Analyse du document…',
    smartImportScannedTitle: 'Document numérisé détecté',
    smartImportScannedMsg: 'Ce document semble contenir des pages numérisées. Voulez-vous utiliser la reconnaissance de texte ?',
    smartImportUseOcr: 'Utiliser l’OCR',
    smartImportKeepImages: 'Garder les pages en images',
    smartImportOcrProcessing: 'Traitement OCR…',
    smartImportFailed: 'Échec de l’importation',
    smartImportRetry: 'Réessayer',
    smartImportInvalidFile: 'Ce fichier n’est pas un PDF valide. Choisissez un fichier PDF.',
    smartImportCorrupt: 'Le PDF semble corrompu ou illisible. Essayez un autre fichier.',
    smartImportEmpty: 'Ce document ne contient aucun contenu utile.',
    smartImportOcrFailed: 'La reconnaissance de texte a échoué. Veuillez réessayer.',
    smartEditorTitle: 'Éditeur',
    smartEditorHint: 'Contenu du document',
    smartEditorPlaceholder: 'Le contenu importé apparaîtra ici…',
    smartToolbarDefault: 'Nouveau document',
    smartUntitledDoc: 'Document sans titre',
    smartToolbarUndo: 'Annuler',
    smartToolbarRedo: 'Refaire',
    smartToolbarBold: 'Gras',
    smartToolbarItalic: 'Italique',
    smartToolbarUnderline: 'Souligné',
    smartDocumentBackLabel: 'Documents intelligents',
    smartToolbarAdd: 'Ajouter',
    smartAddHeading: 'Titre',
    smartAddNewPage: 'Nouvelle page',
    smartPageDesignNone: 'Sans bordure',
    smartPageDesignSimple: 'Simple',
    smartPageDesignClassic: 'Classique',
    smartPageDesignFormal: 'Formel',
    smartPageDesignModern: 'Moderne',
    // PART 17 — Signature
    smartSigDraw: 'Dessiner', smartSigType: 'Écrire', smartSigImage: 'Image',
    smartSigInsert: 'Insérer', smartSigClear: 'Effacer', smartSigCancel: 'Annuler',
    smartSigNamePh: 'Votre nom', smartSigChoose: 'Choisissez une image de votre signature',
    // PART 18 — Statut de protection de la signature (EQ Signature Status)
    smartSigStatusSigned: '\u2713 Sign\u00e9',
    smartSigStatusModified: '\u26A0 Le document a \u00e9t\u00e9 modifi\u00e9 apr\u00e8s la signature',
    smartSigResign: 'Signer \u00e0 nouveau',
    smartTextFont: 'Police', smartTextSize: 'Taille', smartTextFontDefault: 'Par défaut',
    smartTextBold: 'Gras', smartTextItalic: 'Italique', smartTextUnderline: 'Souligné',
    smartTextAlignLeft: 'Aligner à gauche', smartTextAlignCenter: 'Centrer', smartTextAlignRight: 'Aligner à droite',
    smartTextDirection: 'Direction', smartTextDirAuto: 'Auto', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Interligne',
    smartToolbarText: 'Texte',
    smartToolbarTable: 'Tableau',
    smartTableRows: 'Lignes', smartTableColumns: 'Colonnes',
    smartTableCreate: 'Créer le tableau',
    smartTableAddRow: 'Ajouter une ligne', smartTableDelRow: 'Supprimer une ligne',
    smartTableAddCol: 'Ajouter une colonne', smartTableDelCol: 'Supprimer une colonne',
    smartTableAlignLeft: 'Aligner à gauche', smartTableAlignCenter: 'Centrer', smartTableAlignRight: 'Aligner à droite',
    smartToolbarSignature: 'Signature',
    smartToolbarMore: 'Plus',
    smartToolbarImage: 'Image',
    smartImageDelete: 'Supprimer l’image',
    smartToolbarLogo: 'Logo',
    smartLogoPosition: 'Position du logo',
    smartLogoTopRight: 'En haut à droite',
    smartLogoTopLeft: 'En haut à gauche',
    smartLogoCenter: 'Centre',
    smartToolbarDivider: 'Séparateur',
    smartToolbarBorder: 'Bordure',
    smartToolbarPage: 'Page',
    smartToolbarPageNumber: 'Numéro de page',
    smartToolbarPageSettings: 'Paramètres de page',
    smartBlankNavPage: 'Page',
    smartBlankNavPrev: 'Précédent',
    smartBlankNavNext: 'Suivant',
    // PART 19 — gestion des pages
    smartBlankNavOf: 'sur',
    smartPageAdd: 'Ajouter une page', smartPageCopy: 'Copier la page', smartPageDelete: 'Supprimer la page',
    // PART 20 — enregistrement du travail
    smartToolbarSave: 'Enregistrer', smartSavedToast: 'Document enregistré',
    smartPdfTextColor: 'Couleur du texte',
    smartPdfStyle: 'Style', smartPdfStyleNone: 'Aucun style', smartPdfStyleSimple: 'Simple', smartPdfStyleBusiness: 'Affaires', smartPdfStyleAcademic: 'Académique', smartPdfStyleEngineering: 'Ingénierie',
    smartSaveFailed: "Impossible d'enregistrer. Veuillez réessayer.",
    smartUnsavedTitle: 'Voulez-vous enregistrer les modifications avant de quitter ?',
    smartReviewButton: 'Révision', smartReviewExit: "Retour à l'édition",
    smartPdfExportButton: 'Exporter en PDF', smartPdfExportTitle: 'Exporter en PDF', smartPdfExportFilenameLabel: 'Nom du fichier',
    smartPdfExportPagesLabel: 'Pages', smartPdfExportAllPages: 'Toutes les pages', smartPdfExportCurrentPage: 'Page actuelle',
    smartPdfExportQualityLabel: 'Qualité', smartPdfExportNormal: 'Normale', smartPdfExportHigh: 'Haute',
    smartPdfExportDo: 'Exporter', smartPdfExportCancel: 'Annuler',
    smartPdfExportSuccess: 'PDF exporté avec succès.', smartPdfExportFailed: "Échec de la génération du PDF.",
    smartPdfPreparing: 'Préparation du document…', smartPdfPrepareFailed: "Impossible de préparer le PDF. Veuillez réessayer.",
    smartPdfResultTitle: 'Document créé avec succès', smartPdfResultFileLabel: 'Fichier',
    smartPdfOpen: 'Ouvrir le PDF', smartPdfShare: 'Partager', smartPdfSend: 'Envoyer', smartPdfClose: 'Fermer',
    smartPdfShareUnsupported: 'Le partage direct n’est pas pris en charge sur cet appareil. Le PDF a été téléchargé.',
    smartPdfShareCancelled: 'Partage annulé.', smartPdfShareFailed: 'Échec du partage. Le PDF a été téléchargé.',
    smartPdfOpenFailed: 'Impossible d’ouvrir le PDF dans ce navigateur.',
    // PART 31 — Aperçu
    smartPdfPreviewTitle: 'Aperçu',
    smartPdfPreviewNote: 'Ceci est le fichier qui sera enregistré.',
    smartPdfSave: 'Enregistrer le PDF',
    smartUnsavedSave: 'Enregistrer', smartUnsavedExit: 'Quitter sans enregistrer', smartUnsavedCancel: 'Annuler',
    // PART 33 — Nouveau document (protection)
    smartUnsavedNewTitle: 'Vous avez des modifications non enregistrées.',
    smartUnsavedSaveContinue: 'Enregistrer et continuer',
    smartUnsavedStartNew: 'Créer un nouveau document',
    smartSaveAndContinueFailed: 'Échec de l’enregistrement. Vos modifications ne sont pas perdues.',
    smartDraftBannerTitle: 'Brouillon enregistré sur cet appareil', smartDraftResume: 'Reprendre le brouillon',
    smartDraftsTitle: 'Vos brouillons', smartDraftsEmpty: 'Aucun brouillon enregistré', smartDraftsNewDoc: 'Document vierge',
    smartDraftResumeBtn: 'Reprendre l’édition', smartDraftDeleteBtn: 'Supprimer',
    smartDraftDelTitle: 'Supprimer ce brouillon ?', smartDraftDelConfirm: 'Supprimer',
    smartRelNow: 'à l’instant', smartRelMin: 'il y a une minute', smartRelMins: 'il y a {n} minutes',
    smartRelHour: 'il y a une heure', smartRelHours: 'il y a {n} heures', smartRelYesterday: 'hier', smartRelDays: 'il y a {n} jours',
    drawerConverter: 'Convertisseur de devises direct',
    drawerDirectory: 'Répertoire mondial des devises & recherche',
    drawerInstall: 'Installer l\'application',
    drawerSettings: 'Paramètres',
    installModalTitle: 'Installer sur iPhone',
    installModalStep1: 'Étape 1 : Appuyez sur le bouton Partager (⎘ / ⇡) en bas ou en haut du navigateur.',
    installModalStep2: 'Étape 2 : Choisissez "Ajouter à l\'écran d\'accueil" dans le menu.',
    currencyOptionSearch: 'Rechercher une devise',
    currencyOptionPrices: 'Cours des devises en direct',
    currencyOptionConvert: 'Convertir des devises',
    currencyOptionFavorites: 'Devises favorites',
    currencyFavoritesTitle: 'Favoris',
    currencyFavoritesEmpty: 'Aucune devise favorite pour le moment',
    currencyFavoritesEmptyHint: 'Appuyez sur l\'étoile d\'une devise pour l\'ajouter ici',
    currencyOptionCustomRate: 'Convertir à un taux personnalisé',
    customRateTitle: 'Convertir à un taux personnalisé',
    customRateFieldLabel: 'Taux de change',
    currencyRatesTitle: 'Taux de change',
    currencyRatesSearchPlaceholder: 'Rechercher une devise ou un code',
    currencyRatesEmpty: 'Aucune devise trouvée',
    currencyRatesLoading: 'Chargement des taux…',
    currencyRatesError: 'Taux indisponibles',
    recentlyDeletedTitle: 'Récemment supprimé',
    emptyNotesText: 'Pas de notes',
    emptyNotesAction: '+ Nouvelle note',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Rechercher des notes...',
    recentNotesLabel: 'Récentes',
    sortNewest: 'Plus récentes',
    sortOldest: 'Plus anciennes',
    sortAz: 'A–Z',
    renameNote: 'Renommer',
    duplicateNote: 'Dupliquer',
    pinNote: 'Épingler',
    unpinNote: 'Désépingler',
    noteMoreActions: 'Autres actions',
    noteNamePrompt: 'Nom de la note :',
    noteEmptyName: 'Le nom de la note ne peut pas être vide.',
    copySuffix: ' (copie)',
    noNotesFound: 'Aucune note trouvée',
    createFirstNote: 'Créez votre première note',
    updatedToday: 'Mise à jour aujourd\'hui',
    updatedYesterday: 'Mise à jour hier',
    updatedDaysAgo: 'Mise à jour il y a {n} jours',
    notePinnedToast: 'Note épinglée',
    noteUnpinnedToast: 'Note désépinglée',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Style de texte',
    noteStyleNormalLabel: 'Texte',
    noteBasicLabel: 'De base',
    noteAlignLabel: 'Alignement',
    noteFontSizeLabel: 'Taille de police',
    noteFontSmallLabel: 'Petit',
    noteFontNormalLabel: 'Normal',
    noteFontLargeLabel: 'Grand',
    noteColorsLabel: 'Couleurs',
    notePresetsLabel: 'Préréglages',
    presetSimple: 'Simple',
    presetAcademic: 'Académique',
    presetBusiness: 'Professionnel',
    presetEngineering: 'Ingénierie',
    presetModern: 'Moderne',
    noteStylesLabel: 'Styles',
    noteStyleSimple: 'Simple',
    noteStyleAcademic: 'Académique',
    noteStyleBusiness: 'Business',
    noteStyleEngineering: 'Ingénierie',
    noteStyleModern: 'Moderne',
    noteStyleNone: 'Aucun',
    noteFramesLabel: 'Cadre',
    noteFrameNone: 'Aucun',
    noteFrameClassic: 'Classique',
    noteFrameDashed: 'Pointillé',
    noteFrameSoft: 'Doux',
    pdfExportTitle: 'Exporter en PDF',
    pdfExportStyle: 'Style',
    pdfExportTitleLabel: 'Titre',
    pdfExportTitlePh: 'Titre de la note (facultatif)',
    pdfExportDate: 'Date',
    pdfExportCompany: 'Utiliser le profil d\'entreprise',
    pdfExportPreview: 'Aperçu',
    pdfExportCreate: 'Créer le PDF',
    pdfExportClose: 'Fermer la fenêtre d\'exportation',
    noteSavedLabel: 'Enregistré ✓',
    emptyDeletedText: 'Aucune note supprimée',
    deleteConfirmTitle: 'Supprimer définitivement ?',
    deleteConfirmText: 'Cette action est irréversible.',
    cancelBtn: 'Annuler',
    deletePermanentBtn: 'Supprimer',
    doneBtn: 'Terminé',
    deleteNoteBtn: 'Supprimer la note',
    restoreBtn: 'Restaurer',
    unfiled: 'Sans dossier',
    folderNamePrompt: 'Nom du dossier :',
    folderEmptyName: 'Le nom du dossier ne peut pas être vide.',
    folderDuplicateName: 'Un dossier portant ce nom existe déjà.',
    renameFolder: 'Renommer le dossier',
    deleteFolder: 'Supprimer le dossier',
    folderDeleteConfirmTitle: 'Supprimer le dossier ?',
    folderDeleteConfirmText: 'Les notes de ce dossier seront déplacées vers Sans dossier et conservées.',
    helpTitle: 'Aide et à propos',
    helpSubtitle: 'Apprenez à utiliser EQ7 et découvrez ses fonctionnalités.',
    helpAboutTitle: 'À propos de l’application',
    helpAboutDesc: 'EQ7 est une calculatrice intelligente et complète qui réunit calculs du quotidien, outils scientifiques et de pourcentage, conversion de devises et bien plus dans une seule application simple à utiliser.',
    helpWhyTitle: 'Pourquoi EQ7 a-t-il été créé ?',
    helpWhyDesc: 'L’idée est simple : une seule calculatrice au lieu de plusieurs, pensée pour la rapidité, la clarté et l’usage quotidien.',
    helpWhyL1: 'Calculs quotidiens rapides',
    helpWhyL2: 'Outils scientifiques : racine carrée, puissances et parenthèses',
    helpWhyL3: 'Calculs de pourcentage faciles',
    helpWhyL4: 'Conversion de devises et taux en direct',
    helpWhyL5: 'Notes et historique des calculs',
    helpWhyL6: 'Simple, claire et rapide à utiliser',
    helpWhyL7: 'Fonctionne comme application installable (PWA) sur différents appareils',
    helpSectionsTitle: 'Explication des sections de l’application',
    helpSecGeneralTitle: 'Calculatrice générale',
    helpSecGeneralDesc: 'La calculatrice principale pour les opérations quotidiennes : additionner, soustraire, multiplier et diviser.',
    helpSecGeneralEx: 'Exemple : 12 + 7 = 19.',
    helpSecScientificTitle: 'Outils scientifiques',
    helpSecScientificDesc: 'Touchez « Scientific » pour utiliser les boutons racine carrée, carré et parenthèses dans la même calculatrice.',
    helpSecScientificEx: 'Exemple : √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Calculatrice de pourcentage',
    helpSecPercentDesc: 'Calculez rapidement un pourcentage d’un montant sans étapes supplémentaires.',
    helpSecPercentEx: 'Exemple : 15 % de 200 = 30.',
    helpSecHistoryTitle: 'Historique',
    helpSecHistoryDesc: 'EQ7 mémorise ce que vous avez calculé au cours des 24 dernières heures pour le revoir ou le partager.',
    helpSecNotesTitle: 'Notes',
    helpSecNotesDesc: 'Enregistrez des notes rapides, rangez-les dans des dossiers et modifiez-les dans un éditeur plein écran.',
    helpSecCurrencyTitle: 'Outils de devises',
    helpSecCurrencyDesc: 'Recherchez des devises, consultez les taux en direct, convertissez, utilisez un taux personnalisé et gardez vos favoris.',
    helpSecSettingsTitle: 'Paramètres',
    helpSecSettingsDesc: 'Modifiez la langue, le thème et les sons selon vos envies.',
    helpButtonsTitle: 'Comment utiliser la calculatrice',
    helpBtnNumbers: 'Touchez pour saisir des chiffres.',
    helpBtnAdd: 'Ajoute le nombre suivant.',
    helpBtnSub: 'Soustrait le nombre suivant.',
    helpBtnMul: 'Multiplie par le nombre suivant.',
    helpBtnDiv: 'Divise par le nombre suivant.',
    helpBtnEquals: 'Affiche le résultat.',
    helpBtnAc: 'Efface tout et recommence.',
    helpBtnBack: 'Supprime le dernier chiffre saisi.',
    helpBtnDecimal: 'Ajoute une virgule décimale.',
    helpBtnScientific: 'Scientific / Percentage : active ou désactive les outils supplémentaires.',
    helpBtnSpeak: 'Lit le résultat actuel à voix haute.',
    helpSettingsExplainTitle: 'Paramètres',
    helpSetLanguage: 'Langue : change toute l’application entre les langues disponibles.',
    helpSetTheme: 'Thème : choisissez Noir OLED, Charbon foncé, Titane ardoise ou Clair minimal.',
    helpSetSoundsTitle: 'Sons de l’application : interrupteur principal des sons et de la vibration.',
    helpSetSoundsDesc: 'Lorsque Sons est activé, les sons des boutons et la vibration sont autorisés. Désactivez-le pour les couper et activez-le à nouveau pour les permettre.',
    helpSetSoundsSpeech: 'La voix/TTS est séparée des Sons et n’est pas désactivée par Sons.',
    helpCurrencyTitle: 'Convertisseur de devises',
    helpCurrencyDesc: 'Choisissez la devise que vous avez (De) et celle que vous voulez (À), puis saisissez un montant.',
    helpCurrencySwap: 'Utilisez le bouton d’échange pour inverser les deux devises.',
    helpCurrencyFavorites: 'Utilisez l’étoile pour marquer une devise comme favorite et ouvrez Devises favorites depuis le menu devises.',
    helpCurrencyCustomRate: 'Convertir à taux personnalisé vous permet de saisir votre propre taux de change.',
    helpCurrencyLive: 'Les prix en direct proviennent du service en ligne ; s’il est indisponible, des taux en cache peuvent être utilisés.',
    helpInstallTitle: 'Installer et hors ligne',
    helpInstallDesc1: 'Vous pouvez installer EQ7 comme application sur les appareils pris en charge.',
    helpInstallDesc2: 'Certaines fonctionnalités fonctionnent hors ligne avec des ressources stockées, mais les taux en direct et les mises à jour nécessitent une connexion Internet.',
    helpBenefitsTitle: 'Pourquoi utiliser EQ7 ?',
    helpBenefit1: 'Calculatrice tout-en-un',
    helpBenefit2: 'Calculs quotidiens rapides',
    helpBenefit3: 'Outils scientifiques et de pourcentage',
    helpBenefit4: 'Conversion de devises',
    helpBenefit5: 'Historique et notes',
    helpBenefit6: 'Interface multilingue',
    helpBenefit7: 'Design responsive et support PWA',
    helpLangTitle: 'Langues',
    helpLangDesc: 'EQ7 est entièrement traduit. Choisissez votre langue dans la barre supérieure ou dans les Paramètres, et toute l’application — y compris cette page d’aide — se met à jour instantanément.'
  , smartPdfAdd: 'Ajouter', smartPdfAddText: 'Texte', smartPdfAddImage: 'Image', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signature', smartPdfAddStamp: 'Tampon', smartPdfAddDate: 'Date', smartPdfAddTable: 'Tableau', smartPdfMark: 'Marquer', smartPdfMarkHighlight: 'Surligner', smartPdfMarkUnderline: 'Souligner', smartPdfMarkDraw: 'Dessiner', smartPdfMarkComment: 'Commentaire', smartPdfMarkDone: 'Terminé', smartPdfMarkCancel: 'Annuler', smartPdfCommentTitle: 'Commentaire', smartPdfCommentText: 'Texte du commentaire', smartPdfCommentAdd: 'Ajouter un commentaire', smartPdfMarkSelectText: "Sélectionnez d'abord le texte à marquer", smartPdfMarkDrawHint: 'Dessinez sur la page', smartPdfMarkCommentLabel: 'Texte du commentaire', smartPdfMarkAddComment: 'Ajouter un commentaire', pdfTblRow: 'Ajouter une ligne', pdfTblRowDel: 'Supprimer la ligne', pdfTblCol: 'Ajouter une colonne', pdfTblColDel: 'Supprimer la colonne', pdfTblAlignL: 'Gauche', pdfTblAlignC: 'Centre', pdfTblAlignR: 'Droite', pdfTblBold: 'Gras', pdfTblItalic: 'Italique', pdfTblTextColor: 'Couleur du texte', pdfTblBg: 'Arrière-plan', pdfTblBorder: 'Couleur de la bordure', pdfTblNoBorder: 'Sans bordure', pdfTblRowH: 'Hauteur de ligne', pdfTblControls: 'Contrôles du tableau', smartPdfPages: 'Pages', pdfPgAdd: 'Ajouter une page', pdfPgDel: 'Supprimer la page', pdfPgRot: 'Pivoter', pdfPgDup: 'Dupliquer', pdfPgAdded: 'Page ajoutée', pdfPgDeleted: 'Page supprimée', pdfPgRotated: 'Pivoté', pdfPgDuplicated: 'Page dupliquée', pdfPgLast: 'Un document doit conserver au moins une page'
, smartPdfAdd: 'Ajouter', smartPdfAddText: 'Texte', smartPdfAddImage: 'Image', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signature', smartPdfAddStamp: 'Tampon', smartPdfAddDate: 'Date', smartPdfAddTable: 'Tableau', smartPdfMark: 'Marquer', smartPdfMarkHighlight: 'Surligner', smartPdfMarkUnderline: 'Souligner', smartPdfMarkDraw: 'Dessiner', smartPdfMarkComment: 'Commentaire', smartPdfMarkDone: 'Terminé', smartPdfMarkCancel: 'Annuler', smartPdfCommentTitle: 'Commentaire', smartPdfCommentText: 'Texte du commentaire', smartPdfCommentAdd: 'Ajouter un commentaire', smartPdfMarkSelectText: "Sélectionnez d'abord le texte à marquer", smartPdfMarkDrawHint: 'Dessinez sur la page', smartPdfMarkCommentLabel: 'Texte du commentaire', smartPdfMarkAddComment: 'Ajouter un commentaire', pdfTblRow: 'Ajouter une ligne', pdfTblRowDel: 'Supprimer la ligne', pdfTblCol: 'Ajouter une colonne', pdfTblColDel: 'Supprimer la colonne', pdfTblAlignL: 'Gauche', pdfTblAlignC: 'Centre', pdfTblAlignR: 'Droite', pdfTblBold: 'Gras', pdfTblItalic: 'Italique', pdfTblTextColor: 'Couleur du texte', pdfTblBg: 'Arrière-plan', pdfTblBorder: 'Couleur de la bordure', pdfTblNoBorder: 'Sans bordure', pdfTblRowH: 'Hauteur de ligne', pdfTblControls: 'Contrôles du tableau', smartPdfPages: 'Pages', pdfPgAdd: 'Ajouter une page', pdfPgDel: 'Supprimer la page', pdfPgRot: 'Pivoter', pdfPgDup: 'Dupliquer', pdfPgAdded: 'Page ajoutée', pdfPgDeleted: 'Page supprimée', pdfPgRotated: 'Pivoté', pdfPgDuplicated: 'Page dupliquée', pdfPgLast: 'Un document doit conserver au moins une page'
},
  ru: {
    eyebrow: '',
    adBarLabel: 'Реклама',
    title: 'EQ7',
    install: 'Установить приложение',
    actions: 'Действия',
    notesManagerTitle: 'Менеджер заметок',
    notesManagerSubtitle: 'Организуйте заметки в папках и открывайте полноэкранный редактор.',
    foldersTitle: 'Папки',
    addFolder: '+ Папка',
    newNoteButton: 'Новая полноэкранная заметка',
    notesTitle: 'Заметки',
    refreshNotes: 'Обновить',
    fullScreenNoteTitle: 'Полноэкранная заметка',
    noteFolderLabel: 'Папка',
    noteTitleLabel: 'Заголовок',
    noteTitlePlaceholder: 'Заголовок заметки',
    folderSelectLabel: 'Папка',
        noteBodyPlaceholder: 'Начните писать...',
    percentTab: 'Проценты',
    settingsTab: 'Настройки',
    historyTab: 'История',
    percentTitle: 'Калькулятор процентов',
    percentBack: 'Назад',
    amountLabel: 'Сумма',
    rateLabel: 'Процентная ставка',
    settingsTitle: 'Настройки и кастомизация',
    languageLabel: 'Язык',
    themeLabel: 'Тема',
    historyTitle: 'История за 24 часа',
    historyBack: 'Назад',
    historyRemaining: 'осталось',
    selectAll: 'Выбрать все',
    exportButton: 'Поделиться / Экспорт',
    companyNameBtn: 'Название компании',
    quickNotesTitle: 'Быстрые заметки',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Сохранить',
    quickNotesPlaceholder: 'Напишите заметку',
    historyNotePlaceholder: 'Пометьте этот расчет',
    historyInsertResult: 'Вставить результат',
    historySpeakResult: 'Прочитать результат вслух',
    historyLabel: 'История',
    noteLabel: 'Заметка',
    noteInputPlaceholder: '+ Новая заметка',
    noteSaved: 'Заметка сохранена',
    noteEdit: 'Редактировать',
    noteShare: 'Поделиться',
    emptyHistory: 'История пуста',
    noteTableAddRow: '+ Строка',
    noteTableAddCol: '+ Столбец',
    noteTableDelRow: '- Строка',
    noteTableDelCol: '- Столбец',
    noteTableMergeCells: 'Объединить ячейки',
    noteTableSplitCell: 'Разделить ячейку',
    noteTableBorderAll: 'Все границы',
    noteTableBorderOutside: 'Внешние границы',
    noteTableBorderInside: 'Внутренние границы',
    noteTableBorderNone: 'Без границ',
    noteTableHAlignLeft: 'Лево',
    noteTableHAlignCenter: 'Центр',
    noteTableHAlignRight: 'Право',
    noteTableVAlignTop: 'Верх',
    noteTableVAlignMiddle: 'Средний',
    noteTableVAlignBottom: 'Низ',
    copied: 'Результат скопирован',
    pasted: 'Число вставлено',
    installed: 'Приложение готово к установке',
    noSelection: 'Выберите элемент для публикации',
    shareTitle: 'История калькулятора EQ7',
    shareMessage: 'Экспортировано из калькулятора EQ7',
    themeOled: 'OLED Черная',
    themeCharcoal: 'Угольно-темная',
    themeTitanium: 'Титановый сланец',
    themeLight: 'Светлая минимальная',
    themeDark: 'OLED Черная',
    themeViolet: 'Титановый сланец',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Сверху',
    drawerSide: 'Сбоку',
    expand: 'Развернуть',
    Minimize: 'Свернуть',
    installModalSubtitle: 'Добавьте его на главный экран',
    installModalClose: 'Понятно',
    settingsSubtitle: 'Настройте язык, тему и отзывы.',
    appSoundsLabel: 'Звуки приложения',
    soundHapticsLabel: 'Звук кнопок и тактильная связь',
    soundHapticsCaption: 'Включить звуки кликов и вибрацию',
    soundProfileLabel: 'Профиль звука кнопок',
    profileClassic: 'Классический',
    profileSoft: 'Мягкий',
    profileModern: 'Современный',
    profileClick: 'Щелчок',
    profileSilent: 'Без звука',
    speakerLabel: 'Динамик / Озвучивание',
    speakerCaption: 'Когда ВКЛЮЧЕНО, результат озвучивается автоматически после нажатия = . Когда ВЫКЛЮЧЕНО, чтение только вручную кнопкой динамика.',
    modeGeneral: 'Обычный калькулятор',
    scientificToggle: 'Научный',
    deg: 'DEG',
    rad: 'RAD',
    grad: 'GRAD',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Результат',
    currencyConverterTitle: 'Прямой конвертер валют',
    currencyConverterSubtitle: 'Мгновенная конвертация сумм по актуальным курсам.',
    swapButton: 'Поменять',
    favoritesButton: 'Избранное',
    recentButton: 'Недавние',
    fromLabel: 'Из',
    toLabel: 'В',
    convertedLabel: 'Конвертировано',
    bankRateMode: '🏦 Банковский курс',
    marketRateMode: '🏪 Рыночный курс',
    marketRateFieldLabel: 'Рыночный обменный курс',
    cachedLabel: 'Кэшировано',
    refreshButton: 'Обновить',
    globalDirectoryButton: 'Глобальный справочник',
    currencyDirectoryTitle: 'Глобальный справочник валют',
    currencyDirectorySubtitle: 'Поиск бумажных валют по названию страны или коду.',
    currencySearchPlaceholder: 'Поиск страны или кода',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'История',
    drawerNotes: 'Заметки',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Сканировать / Создать PDF',
    pdfCardScanDesc: 'Создать PDF из документов',
    pdfCardOpenTitle: 'Открыть PDF',
    pdfCardOpenDesc: 'Редактировать существующий PDF',
    pdfRecentTitle: 'Недавние PDF',
    pdfRecentEmpty: 'Пока нет недавних PDF.',
    pdfComingSoon: 'Появится в ближайшем обновлении.',
    noteTableInsertPopupTitle: 'Вставить таблицу',
  noteHeadingMenuLabel: 'Заголовок',
  noteHeading1Label: 'Заголовок 1',
  noteHeading2Label: 'Заголовок 2',
  noteHeading3Label: 'Заголовок 3',
  noteNormalTextLabel: 'Обычный текст',
    noteTableRowsLabel: 'Строки',
    noteTableColsLabel: 'Столбцы',
    noteTableHeaderRowLabel: 'Строка заголовка',
    noteTableInsertBtnLabel: 'Вставить таблицу',
    noteTablePresetCustomLabel: 'Свой',
    untitled: 'Без названия',
  pdfPreviewTitle: 'Предпросмотр PDF',
  pdfPrevPage: 'Предыдущая страница',
  pdfNextPage: 'Следующая страница',
  pdfZoomIn: 'Увеличить',
  pdfZoomOut: 'Уменьшить',
  pdfZoomFit: 'По размеру страницы',
  pdfRotate: 'Повернуть',
  pdfShare: 'Поделиться / Сохранить PDF',
  pdfClose: 'Закрыть предпросмотр',
    pdfMore: 'Ещё инструменты', pdfPrint: 'Печать', pdfSave: 'Сохранить на устройство',
  pdfAnnoEdit: 'Изменить аннотации', pdfAnnoText: 'Добавить текст', pdfAnnoHighlight: 'Выделить', pdfAnnoDraw: 'Рисовать', pdfAnnoUnderline: 'Подчеркнуть', pdfAnnoStrike: 'Зачеркнуть', pdfAnnoRect: 'Прямоугольник', pdfAnnoCircle: 'Круг', pdfAnnoLine: 'Линия', pdfAnnoClear: 'Очистить аннотации страницы', pdfAnnoNote: 'Добавить заметку',
  pdfDocOptions: 'Параметры документа', pdfDocTemplate: 'Шаблон', pdfDocHeader: 'Заголовок', pdfDocFooter: 'Нижний колонтитул', pdfDocWatermark: 'Водяной знак', pdfDocWmText: 'Текст водяного знака',
  pdfTplBlank: 'Пустой', pdfTplReport: 'Отчёт', pdfTplInvoice: 'Счёт', pdfTplReceipt: 'Квитанция', pdfTplContract: 'Договор', pdfTplCv: 'Резюме', pdfTplBusiness: 'Деловой отчёт', pdfTplEngineering: 'Инженерный отчёт', pdfTplLetter: 'Письмо',
    folderPersonal: 'Личное',
    resetButton: 'Сбросить',
    featureRequiresInternet: 'Для этой функции требуется подключение к Интернету.',
    smartDocsTitle: '📄 Умные документы',
    smartDocsDesc: 'Управляйте документами с единой главной страницы. Здесь появятся новые инструменты.',
    smartDocsHeading: 'Что вы хотите сделать?',
    smartDocsStep1: 'Начало',
    smartDocsStep2: 'Редактирование',
    smartDocsStep3: 'Проверка',
    smartDocsStep4: 'Экспорт',
    smartDocsCardScanTitle: 'Сканировать документ',
    smartDocsCardScanDesc: 'Сфотографируйте бумагу или договор и превратите его в редактируемый контент.',
    smartDocsCardImportTitle: 'Импортировать файл',
    smartDocsCardImportDesc: 'Выберите PDF или поддерживаемый файл с вашего устройства.',
    smartDocsCardNewTitle: 'Новый документ',
    smartDocsCardNewDesc: 'Белая страница, чтобы начать с нуля.',
    smartDocsCardTemplatesTitle: 'Шаблоны',
    smartDocsCardTemplatesDesc: 'Готовые шаблоны для быстрого старта.',
    smartTemplatesBusiness: 'Бизнес',
    smartTemplatesPersonal: 'Личное',
    smartTemplatesCustom: 'Свои',
    smartTemplatesInvoice: 'Счёт',
    smartTemplatesQuote: 'Коммерческое предложение',
    smartTemplatesPaymentAgreement: 'Соглашение об оплате',
    smartTemplatesServiceContract: 'Договор на услуги',
    smartTemplatesSimpleAgreement: 'Простое соглашение',
    smartTemplatesPaymentReceipt: 'Квитанция об оплате',
    smartTemplatesRentalAgreement: 'Договор аренды',
    smartTemplatesMyTemplates: 'Мои шаблоны',
    smartScanTitle: '📸 Сканировать документ',
    smartScanCapture: 'Сфотографировать',
    smartScanUploadFallback: 'Вместо этого выберите изображение на устройстве',
    smartScanDetecting: 'Определение границ документа',
    smartScanCorrecting: 'Исправление изображения',
    smartScanImproving: 'Улучшение изображения',
    smartScanReading: 'Чтение текста',
    smartScanProcessing: 'Обработка…',
    smartScanReviewTitle: 'Проверить результат OCR',
    smartScanPreviewLabel: 'Обработанный документ',
    smartScanEditHint: 'Вы можете отредактировать распознанный текст перед принятием.',
    smartScanRescan: 'Повторить сканирование',
    smartScanAccept: 'Принять результат',
    smartScanStructTitle: 'Обнаруженная структура',
smartScanReviewNote: 'Dokument erkannt. Prüfen Sie den Inhalt, bevor Sie die PDF erstellen.',
    smartScanStatusNeeds: 'Überprüfung erforderlich',
    smartScanStatusEdited: 'Bearbeitet — Ihre Korrekturen werden in der PDF verwendet',
    smartScanStructHeading: 'Заголовок',
    smartScanStructParagraph: 'Абзац',
    smartScanStructTable: 'Таблица',
    smartScanStructNumber: 'Число',
    smartScanStructDate: 'Дата',
    smartScanStructField: 'Поле',
    smartScanCameraUnavailable: 'Камера недоступна на этом устройстве.',
    smartScanPermissionDenied: 'Разрешение на использование камеры отклонено.',
    smartScanNoText: 'Текст не обнаружен. Повторите попытку или добавьте изображение.',
    smartScanOcrFailed: 'Не удалось прочитать текст. Попробуйте снова.',
    smartScanAccepted: 'Результат принят и готов к редактированию.',
    smartScanEditTitle: 'Редактируемый документ', smartScanEditDocTitlePh: 'Название документа',
    smartScanCreatePdf: 'Создать PDF', smartScanPdfCreating: 'Создание PDF…',
    smartScanPdfCreated: 'PDF создан из отредактированного документа.',
    smartScanOfflinePdf: 'Нет сети — не удалось загрузить библиотеку PDF.',
    smartScanPdfFailed: 'Не удалось создать PDF.',
        smartImportTitle: '📂 Импортировать файл',
    pdfAddTitle: 'Добавить в PDF', pdfAddText: 'Текст', pdfAddImage: 'Изображение', pdfAddLogo: 'Логотип', pdfAddSignature: 'Подпись', pdfAddStamp: 'Печать', pdfAddDate: 'Дата', pdfAddTable: 'Таблица',
    smartImportPickPrompt: 'Выберите PDF-файл с вашего устройства.',
    smartImportChoose: 'Выбрать файл',
    smartImportPreparing: 'Подготовка документа…',
    smartImportAnalyzing: 'Анализ документа…',
    smartImportScannedTitle: 'Обнаружен отсканированный документ',
    smartImportScannedMsg: 'Похоже, этот документ содержит отсканированные страницы. Хотите использовать распознавание текста?',
    smartImportUseOcr: 'Использовать OCR',
    smartImportKeepImages: 'Сохранить страницы как изображения',
    smartImportOcrProcessing: 'Обработка OCR…',
    smartImportFailed: 'Не удалось импортировать',
    smartImportRetry: 'Повторить',
    smartImportInvalidFile: 'Это недействительный PDF-файл. Выберите PDF-файл.',
    smartImportCorrupt: 'Похоже, PDF повреждён или не читается. Попробуйте другой файл.',
    smartImportEmpty: 'В этом документе нет полезного содержимого.',
    smartImportOcrFailed: 'Не удалось распознать текст. Попробуйте снова.',
    smartEditorTitle: 'Редактор',
    smartEditorHint: 'Содержимое документа',
    smartEditorPlaceholder: 'Импортированное содержимое появится здесь…',
    smartToolbarDefault: 'Новый документ',
    smartUntitledDoc: 'Документ без названия',
    smartToolbarUndo: 'Отменить',
    smartToolbarRedo: 'Повторить',
    smartToolbarBold: 'Жирный',
    smartToolbarItalic: 'Курсив',
    smartToolbarUnderline: 'Подчеркнуть',
    smartDocumentBackLabel: 'Умные документы',
    smartToolbarAdd: 'Добавить',
    smartAddHeading: 'Заголовок',
    smartAddNewPage: 'Новая страница',
    smartPageDesignNone: 'Без рамки',
    smartPageDesignSimple: 'Простой',
    smartPageDesignClassic: 'Классический',
    smartPageDesignFormal: 'Официальный',
    smartPageDesignModern: 'Современный',
    // PART 17 — Signature tool
    smartSigDraw: 'Рисовать', smartSigType: 'Ввести', smartSigImage: 'Изображение',
    smartSigInsert: 'Вставить', smartSigClear: 'Очистить', smartSigCancel: 'Отмена',
    smartSigNamePh: 'Ваше имя', smartSigChoose: 'Выберите изображение вашей подписи',
    // PART 18 — Статус защиты подписи (EQ Signature Status)
    smartSigStatusSigned: '\u2713 Подписано',
    smartSigStatusModified: '\u26A0 Документ был изменён после подписи',
    smartSigResign: 'Подписать заново',
    smartTextFont: 'Шрифт', smartTextSize: 'Размер', smartTextFontDefault: 'По умолчанию',
    smartTextBold: 'Полужирный', smartTextItalic: 'Курсив', smartTextUnderline: 'Подчёркнутый',
    smartTextAlignLeft: 'По левому краю', smartTextAlignCenter: 'По центру', smartTextAlignRight: 'По правому краю',
    smartTextDirection: 'Направление', smartTextDirAuto: 'Авто', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Междустрочный интервал',
    smartToolbarText: 'Текст',
    smartToolbarTable: 'Таблица',
    smartTableRows: 'Строки', smartTableColumns: 'Столбцы',
    smartTableCreate: 'Создать таблицу',
    smartTableAddRow: 'Добавить строку', smartTableDelRow: 'Удалить строку',
    smartTableAddCol: 'Добавить столбец', smartTableDelCol: 'Удалить столбец',
    smartTableAlignLeft: 'По левому краю', smartTableAlignCenter: 'По центру', smartTableAlignRight: 'По правому краю',
    smartToolbarSignature: 'Подпись',
    smartToolbarMore: 'Ещё',
    smartToolbarImage: 'Изображение',
    smartImageDelete: 'Удалить изображение',
    smartToolbarLogo: 'Логотип',
    smartLogoPosition: 'Положение логотипа',
    smartLogoTopRight: 'Вверху справа',
    smartLogoTopLeft: 'Вверху слева',
    smartLogoCenter: 'По центру',
    smartToolbarDivider: 'Разделитель',
    smartToolbarBorder: 'Рамка',
    smartToolbarPage: 'Страница',
    smartToolbarPageNumber: 'Номер страницы',
    smartToolbarPageSettings: 'Настройки страницы',
    smartBlankNavPage: 'Страница',
    smartBlankNavPrev: 'Назад',
    smartBlankNavNext: 'Вперед',
    // PART 19 — управление страницами
    smartBlankNavOf: 'из',
    smartPageAdd: 'Добавить страницу', smartPageCopy: 'Копировать страницу', smartPageDelete: 'Удалить страницу',
    // PART 20 — сохранение работы
    smartToolbarSave: 'Сохранить', smartSavedToast: 'Документ сохранён',
    smartPdfTextColor: 'Цвет текста',
    smartPdfStyle: 'Стиль', smartPdfStyleNone: 'Без стиля', smartPdfStyleSimple: 'Простой', smartPdfStyleBusiness: 'Деловой', smartPdfStyleAcademic: 'Академический', smartPdfStyleEngineering: 'Инженерный',
    smartSaveFailed: 'Не удалось сохранить. Попробуйте ещё раз.',
    smartUnsavedTitle: 'Сохранить изменения перед выходом?',
    smartReviewButton: 'Просмотр', smartReviewExit: 'Вернуться к редактированию',
    smartPdfExportButton: 'Экспорт PDF', smartPdfExportTitle: 'Экспорт PDF', smartPdfExportFilenameLabel: 'Имя файла',
    smartPdfExportPagesLabel: 'Страницы', smartPdfExportAllPages: 'Все страницы', smartPdfExportCurrentPage: 'Текущая страница',
    smartPdfExportQualityLabel: 'Качество', smartPdfExportNormal: 'Обычное', smartPdfExportHigh: 'Высокое',
    smartPdfExportDo: 'Экспортировать', smartPdfExportCancel: 'Отмена',
    smartPdfExportSuccess: 'PDF успешно экспортирован.', smartPdfExportFailed: 'Не удалось создать PDF.',
    smartPdfPreparing: 'Подготовка документа…', smartPdfPrepareFailed: 'Не удалось подготовить PDF. Попробуйте ещё раз.',
    smartPdfResultTitle: 'Документ успешно создан', smartPdfResultFileLabel: 'Файл',
    smartPdfOpen: 'Открыть PDF', smartPdfShare: 'Поделиться', smartPdfSend: 'Отправить', smartPdfClose: 'Закрыть',
    smartPdfShareUnsupported: 'Прямой обмен не поддерживается на этом устройстве. PDF был скачан.',
    smartPdfShareCancelled: 'Обмен отменён.', smartPdfShareFailed: 'Не удалось поделиться. PDF был скачан.',
    smartPdfOpenFailed: 'Не удалось открыть PDF в этом браузере.',
    // PART 31 — Предпросмотр
    smartPdfPreviewTitle: 'Предпросмотр',
    smartPdfPreviewNote: 'Это файл, который будет сохранён.',
    smartPdfSave: 'Сохранить PDF',
    smartUnsavedSave: 'Сохранить', smartUnsavedExit: 'Выйти без сохранения', smartUnsavedCancel: 'Отмена',
    // PART 33 — Новый документ (защита)
    smartUnsavedNewTitle: 'У вас есть несохранённые изменения.',
    smartUnsavedSaveContinue: 'Сохранить и продолжить',
    smartUnsavedStartNew: 'Создать новый документ',
    smartSaveAndContinueFailed: 'Не удалось сохранить. Ваши изменения не потеряны.',
    smartDraftBannerTitle: 'Черновик сохранён на этом устройстве', smartDraftResume: 'Продолжить черновик',
    smartDraftsTitle: 'Ваши черновики', smartDraftsEmpty: 'Нет сохранённых черновиков', smartDraftsNewDoc: 'Пустой документ',
    smartDraftResumeBtn: 'Продолжить редактирование', smartDraftDeleteBtn: 'Удалить',
    smartDraftDelTitle: 'Удалить этот черновик?', smartDraftDelConfirm: 'Удалить',
    smartRelNow: 'только что', smartRelMin: 'минуту назад', smartRelMins: '{n} мин. назад',
    smartRelHour: 'час назад', smartRelHours: '{n} ч. назад', smartRelYesterday: 'вчера', smartRelDays: '{n} дн. назад',
    drawerConverter: 'Прямой конвертер валют',
    drawerDirectory: 'Глобальный справочник валют и поиск',
    drawerInstall: 'Установить приложение',
    drawerSettings: 'Настройки',
    installModalTitle: 'Установка на iPhone',
    installModalStep1: 'Шаг 1: Нажмите кнопку «Поделиться» (⎘ / ⇡) внизу или вверху браузера.',
    installModalStep2: 'Шаг 2: Выберите «На главный экран» в меню.',
    currencyOptionSearch: 'Поиск валюты',
    currencyOptionPrices: 'Живые курсы валют',
    currencyOptionConvert: 'Конвертация валют',
    currencyOptionFavorites: 'Избранные валюты',
    currencyFavoritesTitle: 'Избранное',
    currencyFavoritesEmpty: 'Пока нет избранных валют',
    currencyFavoritesEmptyHint: 'Нажмите на звезду любой валюты, чтобы добавить её сюда',
    currencyOptionCustomRate: 'Конвертация по собственному курсу',
    customRateTitle: 'Конвертация по собственному курсу',
    customRateFieldLabel: 'Обменный курс',
    currencyRatesTitle: 'Курсы валют',
    currencyRatesSearchPlaceholder: 'Поиск валюты или кода',
    currencyRatesEmpty: 'Валюты не найдены',
    currencyRatesLoading: 'Загрузка курсов…',
    currencyRatesError: 'Курсы недоступны',
    recentlyDeletedTitle: 'Недавно удалённые',
    emptyNotesText: 'Нет заметок',
    emptyNotesAction: '+ Новая заметка',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Поиск заметок...',
    recentNotesLabel: 'Недавние',
    sortNewest: 'Новые',
    sortOldest: 'Старые',
    sortAz: 'А–Я',
    renameNote: 'Переименовать',
    duplicateNote: 'Дублировать',
    pinNote: 'Закрепить',
    unpinNote: 'Открепить',
    noteMoreActions: 'Ещё действия',
    noteNamePrompt: 'Название заметки:',
    noteEmptyName: 'Название заметки не может быть пустым.',
    copySuffix: ' (копия)',
    noNotesFound: 'Заметки не найдены',
    createFirstNote: 'Создайте первую заметку',
    updatedToday: 'Обновлено сегодня',
    updatedYesterday: 'Обновлено вчера',
    updatedDaysAgo: 'Обновлено {n} дн. назад',
    notePinnedToast: 'Заметка закреплена',
    noteUnpinnedToast: 'Заметка откреплена',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Стиль текста',
    noteStyleNormalLabel: 'Текст',
    noteBasicLabel: 'Базовый',
    noteAlignLabel: 'Выравнивание',
    noteFontSizeLabel: 'Размер шрифта',
    noteFontSmallLabel: 'Мелкий',
    noteFontNormalLabel: 'Обычный',
    noteFontLargeLabel: 'Крупный',
    noteColorsLabel: 'Цвета',
    notePresetsLabel: 'Предустановки',
    presetSimple: 'Простой',
    presetAcademic: 'Академический',
    presetBusiness: 'Деловой',
    presetEngineering: 'Инженерный',
    presetModern: 'Современный',
    noteStylesLabel: 'Стили',
    noteStyleSimple: 'Простой',
    noteStyleAcademic: 'Академический',
    noteStyleBusiness: 'Деловой',
    noteStyleEngineering: 'Инженерный',
    noteStyleModern: 'Современный',
    noteStyleNone: 'Нет',
    noteFramesLabel: 'Рамка',
    noteFrameNone: 'Нет',
    noteFrameClassic: 'Классическая',
    noteFrameDashed: 'Пунктирная',
    noteFrameSoft: 'Мягкая',
    pdfExportTitle: 'Экспорт в PDF',
    pdfExportStyle: 'Стиль',
    pdfExportTitleLabel: 'Название',
    pdfExportTitlePh: 'Название заметки (необязательно)',
    pdfExportDate: 'Дата',
    pdfExportCompany: 'Использовать профиль компании',
    pdfExportPreview: 'Предпросмотр',
    pdfExportCreate: 'Создать PDF',
    pdfExportClose: 'Закрыть окно экспорта',
    noteSavedLabel: 'Сохранено ✓',
    emptyDeletedText: 'Нет удалённых заметок',
    deleteConfirmTitle: 'Удалить навсегда?',
    deleteConfirmText: 'Это действие нельзя отменить.',
    cancelBtn: 'Отмена',
    deletePermanentBtn: 'Удалить',
    doneBtn: 'Готово',
    deleteNoteBtn: 'Удалить заметку',
    restoreBtn: 'Восстановить',
    unfiled: 'Без папки',
    folderNamePrompt: 'Название папки:',
    folderEmptyName: 'Название папки не может быть пустым.',
    folderDuplicateName: 'Папка с таким названием уже существует.',
    renameFolder: 'Переименовать папку',
    deleteFolder: 'Удалить папку',
    folderDeleteConfirmTitle: 'Удалить папку?',
    folderDeleteConfirmText: 'Заметки из этой папки будут перемещены в «Без папки» и сохранены.',
    helpTitle: 'Справка и о приложении',
    helpSubtitle: 'Узнайте, как пользоваться EQ7 и познакомьтесь с его функциями.',
    helpAboutTitle: 'О приложении',
    helpAboutDesc: 'EQ7 — это умный многофункциональный калькулятор, который объединяет повседневные расчёты, научные и процентные инструменты, конвертацию валют и многое другое в одном простом приложении.',
    helpWhyTitle: 'Зачем был создан EQ7?',
    helpWhyDesc: 'Идея проста: один калькулятор вместо нескольких, созданный для скорости, ясности и повседневного использования.',
    helpWhyL1: 'Быстрые повседневные расчёты',
    helpWhyL2: 'Научные инструменты: квадратный корень, степени и скобки',
    helpWhyL3: 'Лёгкие расчёты процентов',
    helpWhyL4: 'Конвертация валют и актуальные курсы',
    helpWhyL5: 'Заметки и история вычислений',
    helpWhyL6: 'Просто, понятно и быстро в использовании',
    helpWhyL7: 'Работает как устанавливаемое приложение (PWA) на разных устройствах',
    helpSectionsTitle: 'Объяснение разделов приложения',
    helpSecGeneralTitle: 'Обычный калькулятор',
    helpSecGeneralDesc: 'Основной калькулятор для повседневных операций: сложение, вычитание, умножение и деление.',
    helpSecGeneralEx: 'Пример: 12 + 7 = 19.',
    helpSecScientificTitle: 'Научные инструменты',
    helpSecScientificDesc: 'Нажмите «Scientific», чтобы использовать кнопки квадратного корня, квадрата и скобок в том же калькуляторе.',
    helpSecScientificEx: 'Пример: √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Калькулятор процентов',
    helpSecPercentDesc: 'Быстро вычислите процент от суммы без лишних действий.',
    helpSecPercentEx: 'Пример: 15% от 200 = 30.',
    helpSecHistoryTitle: 'История',
    helpSecHistoryDesc: 'EQ7 запоминает ваши вычисления за последние 24 часа, чтобы вы могли их просмотреть или поделиться ими.',
    helpSecNotesTitle: 'Заметки',
    helpSecNotesDesc: 'Сохраняйте быстрые заметки, размещайте их по папкам и редактируйте в полноэкранном редакторе.',
    helpSecCurrencyTitle: 'Инструменты валют',
    helpSecCurrencyDesc: 'Ищите валюты, смотрите актуальные курсы, конвертируйте, используйте собственный курс и сохраняйте избранное.',
    helpSecSettingsTitle: 'Настройки',
    helpSecSettingsDesc: 'Изменяйте язык, тему и звуковые уведомления по своему вкусу.',
    helpButtonsTitle: 'Как пользоваться калькулятором',
    helpBtnNumbers: 'Нажмите, чтобы ввести цифры.',
    helpBtnAdd: 'Прибавляет следующее число.',
    helpBtnSub: 'Вычитает следующее число.',
    helpBtnMul: 'Умножает на следующее число.',
    helpBtnDiv: 'Делит на следующее число.',
    helpBtnEquals: 'Показывает результат.',
    helpBtnAc: 'Очищает всё и начинает заново.',
    helpBtnBack: 'Удаляет последнюю введённую цифру.',
    helpBtnDecimal: 'Добавляет десятичную точку.',
    helpBtnScientific: 'Scientific / Percentage: включает или выключает дополнительные инструменты.',
    helpBtnSpeak: 'Озвучивает текущий результат.',
    helpSettingsExplainTitle: 'Настройки',
    helpSetLanguage: 'Язык: переключает всё приложение между доступными языками.',
    helpSetTheme: 'Тема: выберите OLED Черная, Угольно-темная, Титановый сланец или Светлая минимальная.',
    helpSetSoundsTitle: 'Звуки приложения: главный переключатель звука и вибрации.',
    helpSetSoundsDesc: 'Когда Звуки включены, звук кнопок и вибрация разрешены. Выключите их, чтобы отключить, и включите снова, чтобы разрешить.',
    helpSetSoundsSpeech: 'Озвучивание/ТТС отдельно от Звуков и не отключается Звуками.',
    helpCurrencyTitle: 'Конвертер валют',
    helpCurrencyDesc: 'Выберите валюту, которая у вас есть (Из), и нужную вам (В), затем введите сумму.',
    helpCurrencySwap: 'Используйте кнопку обмена, чтобы поменять валюты местами.',
    helpCurrencyFavorites: 'Используйте звезду, чтобы отметить валюту как избранную, и откройте Избранные валюты из меню валют.',
    helpCurrencyCustomRate: 'Конвертация по собственному курсу позволяет ввести свой обменный курс.',
    helpCurrencyLive: 'Актуальные цены поступают из онлайн-сервиса; если он недоступен, могут использоваться сохранённые курсы.',
    helpInstallTitle: 'Установка и офлайн',
    helpInstallDesc1: 'Вы можете установить EQ7 как приложение на поддерживаемых устройствах.',
    helpInstallDesc2: 'Некоторые функции работают офлайн на сохранённых данных, но актуальные курсы и обновления приложения требуют подключения к интернету.',
    helpBenefitsTitle: 'Зачем использовать EQ7?',
    helpBenefit1: 'Всё в одном калькуляторе',
    helpBenefit2: 'Быстрые повседневные расчёты',
    helpBenefit3: 'Научные и процентные инструменты',
    helpBenefit4: 'Конвертация валют',
    helpBenefit5: 'История и заметки',
    helpBenefit6: 'Многоязычный интерфейс',
    helpBenefit7: 'Адаптивный дизайн и поддержка PWA',
    helpLangTitle: 'Языки',
    helpLangDesc: 'EQ7 полностью переведён. Выберите язык в верхней панели или в Настройках, и всё приложение — включая эту страницу справки — обновится мгновенно.'
  , smartPdfAdd: 'Добавить', smartPdfAddText: 'Текст', smartPdfAddImage: 'Изображение', smartPdfAddLogo: 'Логотип', smartPdfAddSignature: 'Подпись', smartPdfAddStamp: 'Штамп', smartPdfAddDate: 'Дата', smartPdfAddTable: 'Таблица', smartPdfMark: 'Отметка', smartPdfMarkHighlight: 'Выделение', smartPdfMarkUnderline: 'Подчёркивание', smartPdfMarkDraw: 'Рисование', smartPdfMarkComment: 'Комментарий', smartPdfMarkDone: 'Готово', smartPdfMarkCancel: 'Отмена', smartPdfCommentTitle: 'Комментарий', smartPdfCommentText: 'Текст комментария', smartPdfCommentAdd: 'Добавить комментарий', smartPdfMarkSelectText: 'Сначала выделите текст для отметки', smartPdfMarkDrawHint: 'Рисуйте на странице', smartPdfMarkCommentLabel: 'Текст комментария', smartPdfMarkAddComment: 'Добавить комментарий', pdfTblRow: 'Добавить строку', pdfTblRowDel: 'Удалить строку', pdfTblCol: 'Добавить столбец', pdfTblColDel: 'Удалить столбец', pdfTblAlignL: 'Слева', pdfTblAlignC: 'По центру', pdfTblAlignR: 'Справа', pdfTblBold: 'Полужирный', pdfTblItalic: 'Курсив', pdfTblTextColor: 'Цвет текста', pdfTblBg: 'Фон', pdfTblBorder: 'Цвет рамки', pdfTblNoBorder: 'Без рамки', pdfTblRowH: 'Высота строки', pdfTblControls: 'Управление таблицей', smartPdfPages: 'Страницы', pdfPgAdd: 'Добавить страницу', pdfPgDel: 'Удалить страницу', pdfPgRot: 'Повернуть', pdfPgDup: 'Дублировать', pdfPgAdded: 'Страница добавлена', pdfPgDeleted: 'Страница удалена', pdfPgRotated: 'Повёрнуто', pdfPgDuplicated: 'Страница дублирована', pdfPgLast: 'В документе должна оставаться хотя бы одна страница'
, smartPdfAdd: 'Добавить', smartPdfAddText: 'Текст', smartPdfAddImage: 'Изображение', smartPdfAddLogo: 'Логотип', smartPdfAddSignature: 'Подпись', smartPdfAddStamp: 'Штамп', smartPdfAddDate: 'Дата', smartPdfAddTable: 'Таблица', smartPdfMark: 'Отметка', smartPdfMarkHighlight: 'Выделение', smartPdfMarkUnderline: 'Подчёркивание', smartPdfMarkDraw: 'Рисование', smartPdfMarkComment: 'Комментарий', smartPdfMarkDone: 'Готово', smartPdfMarkCancel: 'Отмена', smartPdfCommentTitle: 'Комментарий', smartPdfCommentText: 'Текст комментария', smartPdfCommentAdd: 'Добавить комментарий', smartPdfMarkSelectText: 'Сначала выделите текст для отметки', smartPdfMarkDrawHint: 'Рисуйте на странице', smartPdfMarkCommentLabel: 'Текст комментария', smartPdfMarkAddComment: 'Добавить комментарий', pdfTblRow: 'Добавить строку', pdfTblRowDel: 'Удалить строку', pdfTblCol: 'Добавить столбец', pdfTblColDel: 'Удалить столбец', pdfTblAlignL: 'Слева', pdfTblAlignC: 'По центру', pdfTblAlignR: 'Справа', pdfTblBold: 'Полужирный', pdfTblItalic: 'Курсив', pdfTblTextColor: 'Цвет текста', pdfTblBg: 'Фон', pdfTblBorder: 'Цвет рамки', pdfTblNoBorder: 'Без рамки', pdfTblRowH: 'Высота строки', pdfTblControls: 'Управление таблицей', smartPdfPages: 'Страницы', pdfPgAdd: 'Добавить страницу', pdfPgDel: 'Удалить страницу', pdfPgRot: 'Повернуть', pdfPgDup: 'Дублировать', pdfPgAdded: 'Страница добавлена', pdfPgDeleted: 'Страница удалена', pdfPgRotated: 'Повёрнуто', pdfPgDuplicated: 'Страница дублирована', pdfPgLast: 'В документе должна оставаться хотя бы одна страница'
},
  de: {
    eyebrow: '',
    adBarLabel: 'Werbung',
    title: 'EQ7',
    install: 'App installieren',
    actions: 'Aktionen',
    notesManagerTitle: 'Notizverwaltung',
    notesManagerSubtitle: 'Organisieren Sie Notizen in Ordnern und öffnen Sie einen Vollbild-Editor.',
    foldersTitle: 'Ordner',
    addFolder: '+ Ordner',
    newNoteButton: 'Neue Vollbild-Notiz',
    notesTitle: 'Notizen',
    refreshNotes: 'Aktualisieren',
    fullScreenNoteTitle: 'Vollbild-Notiz',
    noteFolderLabel: 'Ordner',
    noteTitleLabel: 'Titel',
    noteTitlePlaceholder: 'Notiztitel',
    folderSelectLabel: 'Ordner',
        noteBodyPlaceholder: 'Beginnen Sie zu schreiben...',
    percentTab: 'Prozent',
    settingsTab: 'Einstellungen',
    historyTab: 'Verlauf',
    percentTitle: 'Prozentrechner',
    percentBack: 'Zurück',
    amountLabel: 'Betrag',
    rateLabel: 'Prozentsatz',
    settingsTitle: 'Einstellungen & Anpassung',
    languageLabel: 'Sprache',
    themeLabel: 'Design',
    historyTitle: '24-Stunden-Verlauf',
    historyBack: 'Zurück',
    historyRemaining: 'verbleibend',
    selectAll: 'Alle auswählen',
    exportButton: 'Teilen / Exportieren',
    companyNameBtn: 'Firmenname',
    quickNotesTitle: 'Schnellnotizen',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Speichern',
    quickNotesPlaceholder: 'Notiz schreiben',
    historyNotePlaceholder: 'Diese Berechnung taggen',
    historyInsertResult: 'Ergebnis einfügen',
    historySpeakResult: 'Ergebnis vorlesen',
    historyLabel: 'Verlauf',
    noteLabel: 'Notiz',
    noteInputPlaceholder: '+ Neue Notiz',
    noteSaved: 'Notiz gespeichert',
    noteEdit: 'Bearbeiten',
    noteShare: 'Teilen',
    emptyHistory: 'Noch kein Verlauf',
    noteTableAddRow: '+ Zeile',
    noteTableAddCol: '+ Spalte',
    noteTableDelRow: '- Zeile',
    noteTableDelCol: '- Spalte',
    noteTableMergeCells: 'Zellen zusammenführen',
    noteTableSplitCell: 'Zelle teilen',
    noteTableBorderAll: 'Alle Ränder',
    noteTableBorderOutside: 'Äußere Ränder',
    noteTableBorderInside: 'Innere Ränder',
    noteTableBorderNone: 'Keine Ränder',
    noteTableHAlignLeft: 'Links',
    noteTableHAlignCenter: 'Mitte',
    noteTableHAlignRight: 'Rechts',
    noteTableVAlignTop: 'Oben',
    noteTableVAlignMiddle: 'Mittig',
    noteTableVAlignBottom: 'Unten',
    copied: 'Ergebnis kopiert',
    pasted: 'Zahl eingefügt',
    installed: 'App ist bereit zur Installation',
    noSelection: 'Wählen Sie ein Element zum Teilen',
    shareTitle: 'EQ7-Rechner-Verlauf',
    shareMessage: 'Exportiert aus EQ7-Rechner',
    themeOled: 'OLED Schwarz',
    themeCharcoal: 'Kohle Dunkel',
    themeTitanium: 'Titan Schiefer',
    themeLight: 'Hell Minimal',
    themeDark: 'OLED Schwarz',
    themeViolet: 'Titan Schiefer',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Oben',
    drawerSide: 'Seite',
    expand: 'Erweitern',
    Minimize: 'Minimieren',
    installModalSubtitle: 'Zur Startseite hinzufügen',
    installModalClose: 'Verstanden',
    settingsSubtitle: 'Sprache, Design und Feedback anpassen.',
    appSoundsLabel: 'App-Sounds',
    soundHapticsLabel: 'Tastenton & Haptik',
    soundHapticsCaption: 'Klickgeräusche und Vibration aktivieren',
    soundProfileLabel: 'Tastenton-Profil',
    profileClassic: 'Klassisch',
    profileSoft: 'Sanft',
    profileModern: 'Modern',
    profileClick: 'Klick',
    profileSilent: 'Stumm',
    speakerLabel: 'Lautsprecher / Sprachausgabe',
    speakerCaption: 'Wenn EIN, wird das Ergebnis nach dem Drücken von = automatisch vorgelesen. Wenn AUS, erfolgt das Vorlesen nur manuell über die Lautsprecher-Taste.',
    modeGeneral: 'Allgemeiner Rechner',
    scientificToggle: 'Wissenschaftlich',
    deg: 'DEG',
    rad: 'RAD',
    grad: 'GRAD',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Ergebnis',
    currencyConverterTitle: 'Direkter Währungsrechner',
    currencyConverterSubtitle: 'Beträge sofort mit Live-Kursen umrechnen.',
    swapButton: 'Tauschen',
    favoritesButton: 'Favoriten',
    recentButton: 'Zuletzt',
    fromLabel: 'Von',
    toLabel: 'Zu',
    convertedLabel: 'Umgerechnet',
    bankRateMode: '🏦 Bankkurs',
    marketRateMode: '🏪 Marktkurs',
    marketRateFieldLabel: 'Markt-Wechselkurs',
    cachedLabel: 'Zwischengespeichert',
    refreshButton: 'Aktualisieren',
    globalDirectoryButton: 'Globales Verzeichnis',
    currencyDirectoryTitle: 'Globales Währungsverzeichnis',
    currencyDirectorySubtitle: 'Papierwährungen nach Ländername oder Währungscode suchen.',
    currencySearchPlaceholder: 'Land oder Code suchen',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'Verlauf',
    drawerNotes: 'Notizen',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Scannen / PDF erstellen',
    pdfCardScanDesc: 'Aus Dokumenten ein PDF erstellen',
    pdfCardOpenTitle: 'PDF öffnen',
    pdfCardOpenDesc: 'Vorhandenes PDF bearbeiten',
    pdfRecentTitle: 'Letzte PDFs',
    pdfRecentEmpty: 'Noch keine aktuellen PDFs.',
    pdfComingSoon: 'In einem kommenden Update verfügbar.',
    noteTableInsertPopupTitle: 'Tabelle einfügen',
  noteHeadingMenuLabel: 'Überschrift',
  noteHeading1Label: 'Überschrift 1',
  noteHeading2Label: 'Überschrift 2',
  noteHeading3Label: 'Überschrift 3',
  noteNormalTextLabel: 'Normaler Text',
    noteTableRowsLabel: 'Zeilen',
    noteTableColsLabel: 'Spalten',
    noteTableHeaderRowLabel: 'Kopfzeile',
    noteTableInsertBtnLabel: 'Tabelle einfügen',
    noteTablePresetCustomLabel: 'Benutzerdefiniert',
    untitled: 'Unbenannt',
  pdfPreviewTitle: 'PDF-Vorschau',
  pdfPrevPage: 'Vorherige Seite',
  pdfNextPage: 'Nächste Seite',
  pdfZoomIn: 'Vergrößern',
  pdfZoomOut: 'Verkleinern',
  pdfZoomFit: 'Seite einpassen',
  pdfRotate: 'Drehen',
  pdfShare: 'PDF teilen / speichern',
  pdfClose: 'Vorschau schließen',
    pdfMore: 'Weitere Werkzeuge', pdfPrint: 'Drucken', pdfSave: 'Auf Gerät speichern',
  pdfAnnoEdit: 'Anmerkungen bearbeiten', pdfAnnoText: 'Text hinzufügen', pdfAnnoHighlight: 'Hervorheben', pdfAnnoDraw: 'Zeichnen', pdfAnnoUnderline: 'Unterstreichen', pdfAnnoStrike: 'Durchstreichen', pdfAnnoRect: 'Rechteck', pdfAnnoCircle: 'Kreis', pdfAnnoLine: 'Linie', pdfAnnoClear: 'Seitenanmerkungen löschen', pdfAnnoNote: 'Notiz hinzufügen',
  pdfDocOptions: 'Dokumentoptionen', pdfDocTemplate: 'Vorlage', pdfDocHeader: 'Kopfzeile', pdfDocFooter: 'Fußzeile', pdfDocWatermark: 'Wasserzeichen', pdfDocWmText: 'Wasserzeichen-Text',
  pdfTplBlank: 'Leer', pdfTplReport: 'Bericht', pdfTplInvoice: 'Rechnung', pdfTplReceipt: 'Quittung', pdfTplContract: 'Vertrag', pdfTplCv: 'Lebenslauf', pdfTplBusiness: 'Geschäftsbericht', pdfTplEngineering: 'Ingenieurbericht', pdfTplLetter: 'Brief',
    folderPersonal: 'Persönlich',
    resetButton: 'Zurücksetzen',
    featureRequiresInternet: 'Diese Funktion erfordert eine Internetverbindung.',
    smartDocsTitle: '📄 Intelligente Dokumente',
    smartDocsDesc: 'Verwalten Sie Ihre Dokumente von einer einzigen Hauptseite. Neue Tools werden hier erscheinen.',
    smartDocsHeading: 'Was möchten Sie tun?',
    smartDocsStep1: 'Start',
    smartDocsStep2: 'Bearbeiten',
    smartDocsStep3: 'Überprüfung',
    smartDocsStep4: 'Export',
    smartDocsCardScanTitle: 'Dokument scannen',
    smartDocsCardScanDesc: 'Fotografieren Sie ein Papier oder einen Vertrag und wandeln Sie es in bearbeitbaren Inhalt um.',
    smartDocsCardImportTitle: 'Datei importieren',
    smartDocsCardImportDesc: 'Wählen Sie eine PDF- oder unterstützte Datei von Ihrem Gerät.',
    smartDocsCardNewTitle: 'Neues Dokument',
    smartDocsCardNewDesc: 'Eine leere Seite, um von vorne zu beginnen.',
    smartDocsCardTemplatesTitle: 'Vorlagen',
    smartDocsCardTemplatesDesc: 'Fertige Vorlagen für einen schnellen Start.',
    smartTemplatesBusiness: 'Geschäftlich',
    smartTemplatesPersonal: 'Persönlich',
    smartTemplatesCustom: 'Benutzerdefiniert',
    smartTemplatesInvoice: 'Rechnung',
    smartTemplatesQuote: 'Angebot',
    smartTemplatesPaymentAgreement: 'Zahlungsvereinbarung',
    smartTemplatesServiceContract: 'Dienstleistungsvertrag',
    smartTemplatesSimpleAgreement: 'Einfache Vereinbarung',
    smartTemplatesPaymentReceipt: 'Zahlungsbeleg',
    smartTemplatesRentalAgreement: 'Mietvertrag',
    smartTemplatesMyTemplates: 'Meine Vorlagen',
    smartScanTitle: '📸 Dokument scannen',
    smartScanCapture: 'Aufnehmen',
    smartScanUploadFallback: 'Wählen Sie stattdessen ein Bild von Ihrem Gerät aus',
    smartScanDetecting: 'Dokumentgrenzen erkennen',
    smartScanCorrecting: 'Bild korrigieren',
    smartScanImproving: 'Bild verbessern',
    smartScanReading: 'Text lesen',
    smartScanProcessing: 'Verarbeite…',
    smartScanReviewTitle: 'OCR-Ergebnis überprüfen',
    smartScanPreviewLabel: 'Verarbeitetes Dokument',
    smartScanEditHint: 'Sie können den erkannten Text vor dem Annehmen bearbeiten.',
    smartScanRescan: 'Erneut scannen',
    smartScanAccept: 'Ergebnis akzeptieren',
    smartScanStructTitle: 'Erkannte Struktur',
smartScanReviewNote: 'Belge tanındı. PDF oluşturmadan önce içeriği gözden geçirin.',
    smartScanStatusNeeds: 'İnceleme gerekli',
    smartScanStatusEdited: 'Düzenlendi — düzeltmeleriniz PDF’de kullanılacak',
    smartScanStructHeading: 'Überschrift',
    smartScanStructParagraph: 'Absatz',
    smartScanStructTable: 'Tabelle',
    smartScanStructNumber: 'Zahl',
    smartScanStructDate: 'Datum',
    smartScanStructField: 'Feld',
    smartScanCameraUnavailable: 'Die Kamera ist auf diesem Gerät nicht verfügbar.',
    smartScanPermissionDenied: 'Kamera-Berechtigung wurde verweigert.',
    smartScanNoText: 'Kein Text erkannt. Bitte erneut versuchen oder ein Bild hinzufügen.',
    smartScanOcrFailed: 'Das Lesen des Textes ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    smartScanAccepted: 'Ergebnis akzeptiert und bereit zum Bearbeiten.',
    smartScanEditTitle: 'Editierbares Dokument', smartScanEditDocTitlePh: 'Dokumenttitel',
    smartScanCreatePdf: 'PDF erstellen', smartScanPdfCreating: 'PDF wird erstellt…',
    smartScanPdfCreated: 'PDF aus dem bearbeiteten Dokument erstellt.',
    smartScanOfflinePdf: 'Offline — die PDF-Bibliothek konnte nicht geladen werden.',
    smartScanPdfFailed: 'PDF konnte nicht erstellt werden.',
        smartImportTitle: '📂 Datei importieren',
    pdfAddTitle: 'Zum PDF hinzufügen', pdfAddText: 'Text', pdfAddImage: 'Bild', pdfAddLogo: 'Logo', pdfAddSignature: 'Unterschrift', pdfAddStamp: 'Stempel', pdfAddDate: 'Datum', pdfAddTable: 'Tabelle',
    smartImportPickPrompt: 'Wählen Sie eine PDF-Datei von Ihrem Gerät.',
    smartImportChoose: 'Datei auswählen',
    smartImportPreparing: 'Dokument wird vorbereitet…',
    smartImportAnalyzing: 'Dokument wird analysiert…',
    smartImportScannedTitle: 'Gescanntes Dokument erkannt',
    smartImportScannedMsg: 'Dieses Dokument scheint gescannte Seiten zu enthalten. Möchten Sie Texterkennung verwenden?',
    smartImportUseOcr: 'OCR verwenden',
    smartImportKeepImages: 'Seiten als Bilder behalten',
    smartImportOcrProcessing: 'OCR-Verarbeitung…',
    smartImportFailed: 'Import fehlgeschlagen',
    smartImportRetry: 'Erneut versuchen',
    smartImportInvalidFile: 'Dies ist keine gültige PDF-Datei. Wählen Sie eine PDF-Datei.',
    smartImportCorrupt: 'Die PDF scheint beschädigt oder nicht lesbar zu sein. Versuchen Sie eine andere Datei.',
    smartImportEmpty: 'Dieses Dokument hat keinen brauchbaren Inhalt.',
    smartImportOcrFailed: 'Texterkennung fehlgeschlagen. Bitte erneut versuchen.',
    smartEditorTitle: 'Editor',
    smartEditorHint: 'Dokumentinhalt',
    smartEditorPlaceholder: 'Importierter Inhalt erscheint hier…',
    smartToolbarDefault: 'Neues Dokument',
    smartUntitledDoc: 'Unbenanntes Dokument',
    smartToolbarUndo: 'Rückgängig',
    smartToolbarRedo: 'Wiederholen',
    smartToolbarBold: 'Fett',
    smartToolbarItalic: 'Kursiv',
    smartToolbarUnderline: 'Unterstreichen',
    smartDocumentBackLabel: 'Intelligente Dokumente',
    smartToolbarAdd: 'Hinzufügen',
    smartAddHeading: 'Überschrift',
    smartAddNewPage: 'Neue Seite',
    smartPageDesignNone: 'Ohne Rahmen',
    smartPageDesignSimple: 'Einfach',
    smartPageDesignClassic: 'Klassisch',
    smartPageDesignFormal: 'Formell',
    smartPageDesignModern: 'Modern',
    // PART 17 — Unterschrift
    smartSigDraw: 'Zeichnen', smartSigType: 'Schreiben', smartSigImage: 'Bild',
    smartSigInsert: 'Einfügen', smartSigClear: 'Löschen', smartSigCancel: 'Abbrechen',
    smartSigNamePh: 'Ihr Name', smartSigChoose: 'Wählen Sie ein Bild Ihrer Unterschrift',
    // PART 18 — Signaturschutz-Status (EQ Signature Status)
    smartSigStatusSigned: '\u2713 Unterschrieben',
    smartSigStatusModified: '\u26A0 Das Dokument wurde nach der Unterschrift ge\u00e4ndert',
    smartSigResign: 'Erneut unterschreiben',
    // PART 11 — text formatting controls
    smartTextFont: 'Schrift', smartTextSize: 'Größe', smartTextFontDefault: 'Standard',
    smartTextBold: 'Fett', smartTextItalic: 'Kursiv', smartTextUnderline: 'Unterstrichen',
    smartTextAlignLeft: 'Linksbündig', smartTextAlignCenter: 'Zentriert', smartTextAlignRight: 'Rechtsbündig',
    smartTextDirection: 'Richtung', smartTextDirAuto: 'Auto', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Zeilenabstand',
    smartToolbarText: 'Text',
    smartToolbarTable: 'Tabelle',
    smartTableRows: 'Zeilen', smartTableColumns: 'Spalten',
    smartTableCreate: 'Tabelle erstellen',
    smartTableAddRow: 'Zeile hinzufügen', smartTableDelRow: 'Zeile löschen',
    smartTableAddCol: 'Spalte hinzufügen', smartTableDelCol: 'Spalte löschen',
    smartTableAlignLeft: 'Linksbündig', smartTableAlignCenter: 'Zentriert', smartTableAlignRight: 'Rechtsbündig',
    smartToolbarSignature: 'Unterschrift',
    smartToolbarMore: 'Mehr',
    smartToolbarImage: 'Bild',
    smartImageDelete: 'Bild löschen',
    smartToolbarLogo: 'Logo',
    smartLogoPosition: 'Logo-Position',
    smartLogoTopRight: 'Oben rechts',
    smartLogoTopLeft: 'Oben links',
    smartLogoCenter: 'Mitte',
    smartToolbarDivider: 'Trennlinie',
    smartToolbarBorder: 'Rahmen',
    smartToolbarPage: 'Seite',
    smartToolbarPageNumber: 'Seitenzahl',
    smartToolbarPageSettings: 'Seiteneinstellungen',
    smartBlankNavPage: 'Seite',
    smartBlankNavPrev: 'Zurück',
    smartBlankNavNext: 'Weiter',
    // PART 19 — Seitenverwaltung
    smartBlankNavOf: 'von',
    smartPageAdd: 'Seite hinzufügen', smartPageCopy: 'Seite kopieren', smartPageDelete: 'Seite löschen',
    // PART 20 — Arbeit speichern
    smartToolbarSave: 'Speichern', smartSavedToast: 'Dokument gespeichert',
    smartPdfTextColor: 'Textfarbe',
    smartPdfStyle: 'Stil', smartPdfStyleNone: 'Kein Stil', smartPdfStyleSimple: 'Einfach', smartPdfStyleBusiness: 'Business', smartPdfStyleAcademic: 'Akademisch', smartPdfStyleEngineering: 'Engineering',
    smartSaveFailed: 'Speichern nicht möglich. Bitte erneut versuchen.',
    smartUnsavedTitle: 'Möchten Sie die Änderungen vor dem Beenden speichern?',
    smartReviewButton: 'Prüfen', smartReviewExit: 'Zurück zum Bearbeiten',
    smartPdfExportButton: 'PDF exportieren', smartPdfExportTitle: 'PDF exportieren', smartPdfExportFilenameLabel: 'Dateiname',
    smartPdfExportPagesLabel: 'Seiten', smartPdfExportAllPages: 'Alle Seiten', smartPdfExportCurrentPage: 'Aktuelle Seite',
    smartPdfExportQualityLabel: 'Qualität', smartPdfExportNormal: 'Normal', smartPdfExportHigh: 'Hoch',
    smartPdfExportDo: 'Exportieren', smartPdfExportCancel: 'Abbrechen',
    smartPdfExportSuccess: 'PDF erfolgreich exportiert.', smartPdfExportFailed: 'PDF-Erzeugung fehlgeschlagen.',
    smartPdfPreparing: 'Dokument wird vorbereitet…', smartPdfPrepareFailed: 'PDF konnte nicht vorbereitet werden. Bitte erneut versuchen.',
    smartPdfResultTitle: 'Dokument erfolgreich erstellt', smartPdfResultFileLabel: 'Datei',
    smartPdfOpen: 'PDF öffnen', smartPdfShare: 'Teilen', smartPdfSend: 'Senden', smartPdfClose: 'Schließen',
    smartPdfShareUnsupported: 'Direktes Teilen wird auf diesem Gerät nicht unterstützt. Die PDF wurde heruntergeladen.',
    smartPdfShareCancelled: 'Teilen abgebrochen.', smartPdfShareFailed: 'Teilen fehlgeschlagen. Die PDF wurde heruntergeladen.',
    smartPdfOpenFailed: 'Die PDF konnte in diesem Browser nicht geöffnet werden.',
    // PART 31 — Vorschau
    smartPdfPreviewTitle: 'Vorschau',
    smartPdfPreviewNote: 'Dies ist die Datei, die gespeichert wird.',
    smartPdfSave: 'PDF speichern',
    smartUnsavedSave: 'Speichern', smartUnsavedExit: 'Beenden ohne Speichern', smartUnsavedCancel: 'Abbrechen',
    // PART 33 — Neues Dokument (Schutz)
    smartUnsavedNewTitle: 'Sie haben nicht gespeicherte Änderungen.',
    smartUnsavedSaveContinue: 'Speichern und fortfahren',
    smartUnsavedStartNew: 'Neues Dokument starten',
    smartSaveAndContinueFailed: 'Speichern fehlgeschlagen. Ihre Änderungen sind nicht verloren.',
    smartDraftBannerTitle: 'Entwurf auf diesem Gerät gespeichert', smartDraftResume: 'Entwurf fortsetzen',
    smartDraftsTitle: 'Deine Entwürfe', smartDraftsEmpty: 'Keine gespeicherten Entwürfe', smartDraftsNewDoc: 'Leeres Dokument',
    smartDraftResumeBtn: 'Bearbeitung fortsetzen', smartDraftDeleteBtn: 'Löschen',
    smartDraftDelTitle: 'Diesen Entwurf löschen?', smartDraftDelConfirm: 'Löschen',
    smartRelNow: 'gerade eben', smartRelMin: 'vor einer Minute', smartRelMins: 'vor {n} Minuten',
    smartRelHour: 'vor einer Stunde', smartRelHours: 'vor {n} Stunden', smartRelYesterday: 'gestern', smartRelDays: 'vor {n} Tagen',
    drawerConverter: 'Direkter Währungsrechner',
    drawerDirectory: 'Globales Währungsverzeichnis & Suche',
    drawerInstall: 'App installieren',
    drawerSettings: 'Einstellungen',
    installModalTitle: 'Auf iPhone installieren',
    installModalStep1: 'Schritt 1: Tippen Sie auf die Schaltfläche Teilen (⎘ / ⇡) unten oder oben im Browser.',
    installModalStep2: 'Schritt 2: Wählen Sie „Zum Home-Bildschirm hinzufügen" aus dem Menü.',
    currencyOptionSearch: 'Währung suchen',
    currencyOptionPrices: 'Live-Währungskurse',
    currencyOptionConvert: 'Währungen umrechnen',
    currencyOptionFavorites: 'Favoriten-Währungen',
    currencyFavoritesTitle: 'Favoriten',
    currencyFavoritesEmpty: 'Noch keine Favoriten-Währungen',
    currencyFavoritesEmptyHint: 'Tippen Sie auf den Stern einer Währung, um sie hier hinzuzufügen',
    currencyOptionCustomRate: 'Zu benutzerdefiniertem Kurs umrechnen',
    customRateTitle: 'Zu benutzerdefiniertem Kurs umrechnen',
    customRateFieldLabel: 'Wechselkurs',
    currencyRatesTitle: 'Wechselkurse',
    currencyRatesSearchPlaceholder: 'Währung oder Code suchen',
    currencyRatesEmpty: 'Keine Währungen gefunden',
    currencyRatesLoading: 'Kurse werden geladen…',
    currencyRatesError: 'Kurse nicht verfügbar',
    recentlyDeletedTitle: 'Kürzlich gelöscht',
    emptyNotesText: 'Keine Notizen',
    emptyNotesAction: '+ Neue Notiz',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Notizen suchen...',
    recentNotesLabel: 'Zuletzt',
    sortNewest: 'Neueste',
    sortOldest: 'Älteste',
    sortAz: 'A–Z',
    renameNote: 'Umbenennen',
    duplicateNote: 'Duplizieren',
    pinNote: 'Anheften',
    unpinNote: 'Lösen',
    noteMoreActions: 'Weitere Aktionen',
    noteNamePrompt: 'Notizname:',
    noteEmptyName: 'Der Notizname darf nicht leer sein.',
    copySuffix: ' (Kopie)',
    noNotesFound: 'Keine Notizen gefunden',
    createFirstNote: 'Erstelle deine erste Notiz',
    updatedToday: 'Heute aktualisiert',
    updatedYesterday: 'Gestern aktualisiert',
    updatedDaysAgo: 'Vor {n} Tagen aktualisiert',
    notePinnedToast: 'Notiz angeheftet',
    noteUnpinnedToast: 'Notiz gelöst',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Textstil',
    noteStyleNormalLabel: 'Text',
    noteBasicLabel: 'Basis',
    noteAlignLabel: 'Ausrichtung',
    noteFontSizeLabel: 'Schriftgröße',
    noteFontSmallLabel: 'Klein',
    noteFontNormalLabel: 'Normal',
    noteFontLargeLabel: 'Groß',
    noteColorsLabel: 'Farben',
    notePresetsLabel: 'Voreinstellungen',
    presetSimple: 'Einfach',
    presetAcademic: 'Akademisch',
    presetBusiness: 'Geschäft',
    presetEngineering: 'Ingenieur',
    presetModern: 'Modern',
    noteStylesLabel: 'Stile',
    noteStyleSimple: 'Einfach',
    noteStyleAcademic: 'Akademisch',
    noteStyleBusiness: 'Geschäftlich',
    noteStyleEngineering: 'Technisch',
    noteStyleModern: 'Modern',
    noteStyleNone: 'Keine',
    noteFramesLabel: 'Rahmen',
    noteFrameNone: 'Keine',
    noteFrameClassic: 'Klassisch',
    noteFrameDashed: 'Gestrichelt',
    noteFrameSoft: 'Weich',
    pdfExportTitle: 'Als PDF exportieren',
    pdfExportStyle: 'Stil',
    pdfExportTitleLabel: 'Titel',
    pdfExportTitlePh: 'Titel der Notiz (optional)',
    pdfExportDate: 'Datum',
    pdfExportCompany: 'Firmenprofil verwenden',
    pdfExportPreview: 'Vorschau',
    pdfExportCreate: 'PDF erstellen',
    pdfExportClose: 'Exportdialog schließen',
    noteSavedLabel: 'Gespeichert ✓',
    emptyDeletedText: 'Keine gelöschten Notizen',
    deleteConfirmTitle: 'Endgültig löschen?',
    deleteConfirmText: 'Diese Aktion kann nicht rückgängig gemacht werden.',
    cancelBtn: 'Abbrechen',
    deletePermanentBtn: 'Löschen',
    doneBtn: 'Fertig',
    deleteNoteBtn: 'Notiz löschen',
    restoreBtn: 'Wiederherstellen',
    unfiled: 'Ohne Ordner',
    folderNamePrompt: 'Ordnername:',
    folderEmptyName: 'Der Ordnername darf nicht leer sein.',
    folderDuplicateName: 'Ein Ordner mit diesem Namen existiert bereits.',
    renameFolder: 'Ordner umbenennen',
    deleteFolder: 'Ordner löschen',
    folderDeleteConfirmTitle: 'Ordner löschen?',
    folderDeleteConfirmText: 'Die Notizen in diesem Ordner werden zu „Ohne Ordner“ verschoben und bleiben erhalten.',
    helpTitle: 'Hilfe und Info',
    helpSubtitle: 'Erfahren Sie, wie Sie EQ7 nutzen und entdecken Sie seine Funktionen.',
    helpAboutTitle: 'Über die App',
    helpAboutDesc: 'EQ7 ist ein intelligenter All-in-One-Rechner, der Alltagsmathematik, wissenschaftliche und Prozentwerkzeuge, Währungsrechnung und vieles mehr in einer einfachen, benutzerfreundlichen App vereint.',
    helpWhyTitle: 'Warum wurde EQ7 entwickelt?',
    helpWhyDesc: 'Die Idee ist einfach: ein Rechner statt vieler, gemacht für Schnelligkeit, Klarheit und den Alltag.',
    helpWhyL1: 'Schnelle tägliche Berechnungen',
    helpWhyL2: 'Wissenschaftliche Werkzeuge wie Quadratwurzel, Potenzen und Klammern',
    helpWhyL3: 'Einfache Prozentberechnungen',
    helpWhyL4: 'Währungsrechnung und Live-Kurse',
    helpWhyL5: 'Notizen und Berechnungsverlauf',
    helpWhyL6: 'Einfach, klar und schnell zu bedienen',
    helpWhyL7: 'Funktioniert als installierbare App (PWA) auf verschiedenen Geräten',
    helpSectionsTitle: 'Erklärung der App-Bereiche',
    helpSecGeneralTitle: 'Allgemeiner Rechner',
    helpSecGeneralDesc: 'Der Hauptrechner für den Alltag: Addieren, Subtrahieren, Multiplizieren und Dividieren.',
    helpSecGeneralEx: 'Beispiel: 12 + 7 = 19.',
    helpSecScientificTitle: 'Wissenschaftliche Werkzeuge',
    helpSecScientificDesc: 'Tippen Sie auf „Scientific“, um die Quadratwurzel-, Quadrat- und Klammerntasten im selben Rechner zu nutzen.',
    helpSecScientificEx: 'Beispiel: √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Prozentrechner',
    helpSecPercentDesc: 'Berechnen Sie schnell einen Prozentsatz einer Summe ohne Extra-Schritte.',
    helpSecPercentEx: 'Beispiel: 15 % von 200 = 30.',
    helpSecHistoryTitle: 'Verlauf',
    helpSecHistoryDesc: 'EQ7 merkt sich, was Sie in den letzten 24 Stunden berechnet haben, damit Sie es überprüfen oder teilen können.',
    helpSecNotesTitle: 'Notizen',
    helpSecNotesDesc: 'Speichern Sie Schnellnotizen, ordnen Sie sie in Ordnern und bearbeiten Sie sie in einem Vollbild-Editor.',
    helpSecCurrencyTitle: 'Währungswerkzeuge',
    helpSecCurrencyDesc: 'Suchen Sie Währungen, sehen Sie Live-Kurse, rechnen Sie um, nutzen Sie einen eigenen Kurs und speichern Sie Favoriten.',
    helpSecSettingsTitle: 'Einstellungen',
    helpSecSettingsDesc: 'Ändern Sie Sprache, Design und Klang wie es Ihnen gefällt.',
    helpButtonsTitle: 'So verwenden Sie den Rechner',
    helpBtnNumbers: 'Tippen, um Ziffern einzugeben.',
    helpBtnAdd: 'Addiert die nächste Zahl.',
    helpBtnSub: 'Subtrahiert die nächste Zahl.',
    helpBtnMul: 'Multipliziert mit der nächsten Zahl.',
    helpBtnDiv: 'Dividiert durch die nächste Zahl.',
    helpBtnEquals: 'Zeigt das Ergebnis.',
    helpBtnAc: 'Löscht alles und beginnt neu.',
    helpBtnBack: 'Löscht die letzte eingegebene Ziffer.',
    helpBtnDecimal: 'Fügt ein Dezimalkomma hinzu.',
    helpBtnScientific: 'Scientific / Percentage: schaltet die Zusatzwerkzeuge ein und aus.',
    helpBtnSpeak: 'Spricht das aktuelle Ergebnis vor.',
    helpSettingsExplainTitle: 'Einstellungen',
    helpSetLanguage: 'Sprache: wechselt die gesamte App zwischen den verfügbaren Sprachen.',
    helpSetTheme: 'Design: wählen Sie OLED Schwarz, Kohle Dunkel, Titan Schiefer oder Hell Minimal.',
    helpSetSoundsTitle: 'App-Töne: der Hauptschalter für Ton- und Vibrationsrückmeldung.',
    helpSetSoundsDesc: 'Wenn App-Töne eingeschaltet ist, sind Tastenton und Vibration erlaubt. Schalten Sie es aus, um diese Rückmeldung zu stummen, und wieder ein, um sie zu erlauben.',
    helpSetSoundsSpeech: 'Sprache/TTS ist getrennt von App-Tönen und wird von App-Tönen nicht ausgeschaltet.',
    helpCurrencyTitle: 'Währungsrechner',
    helpCurrencyDesc: 'Wählen Sie die Währung, die Sie haben (Von), und die gewünschte (Nach), und geben Sie einen Betrag ein.',
    helpCurrencySwap: 'Nutzen Sie die Tausch-Taste, um die beiden Währungen zu vertauschen.',
    helpCurrencyFavorites: 'Nutzen Sie den Stern, um eine Währung als Favorit zu markieren, und öffnen Sie Favoriten-Währungen aus dem Währungsmenü.',
    helpCurrencyCustomRate: 'Mit „Eigener Kurs umrechnen“ können Sie Ihren eigenen Wechselkurs eingeben.',
    helpCurrencyLive: 'Live-Preise kommen vom Online-Dienst; ist er nicht verfügbar, können zwischengespeicherte Kurse verwendet werden.',
    helpInstallTitle: 'Installieren und offline',
    helpInstallDesc1: 'Sie können EQ7 auf unterstützten Geräten als App installieren.',
    helpInstallDesc2: 'Einige Funktionen funktionieren offline mit gespeicherten Ressourcen, aber Live-Kurse und App-Updates benötigen eine Internetverbindung.',
    helpBenefitsTitle: 'Warum EQ7 verwenden?',
    helpBenefit1: 'All-in-One-Rechner',
    helpBenefit2: 'Schnelle tägliche Berechnungen',
    helpBenefit3: 'Wissenschaftliche und Prozentwerkzeuge',
    helpBenefit4: 'Währungsrechnung',
    helpBenefit5: 'Verlauf und Notizen',
    helpBenefit6: 'Mehrsprachige Oberfläche',
    helpBenefit7: 'Responsives Design und PWA-Support',
    helpLangTitle: 'Sprachen',
    helpLangDesc: 'EQ7 ist vollständig übersetzt. Wählen Sie Ihre Sprache in der oberen Leiste oder in den Einstellungen, und die gesamte App – einschließlich dieser Hilfeseite – wird sofort aktualisiert.'
  , smartPdfAdd: 'Hinzufügen', smartPdfAddText: 'Text', smartPdfAddImage: 'Bild', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signatur', smartPdfAddStamp: 'Stempel', smartPdfAddDate: 'Datum', smartPdfAddTable: 'Tabelle', smartPdfMark: 'Markieren', smartPdfMarkHighlight: 'Hervorheben', smartPdfMarkUnderline: 'Unterstreichen', smartPdfMarkDraw: 'Zeichnen', smartPdfMarkComment: 'Kommentar', smartPdfMarkDone: 'Fertig', smartPdfMarkCancel: 'Abbrechen', smartPdfCommentTitle: 'Kommentar', smartPdfCommentText: 'Kommentartext', smartPdfCommentAdd: 'Kommentar hinzufügen', smartPdfMarkSelectText: 'Zuerst den zu markierenden Text auswählen', smartPdfMarkDrawHint: 'Auf der Seite zeichnen', smartPdfMarkCommentLabel: 'Kommentartext', smartPdfMarkAddComment: 'Kommentar hinzufügen', pdfTblRow: 'Zeile hinzufügen', pdfTblRowDel: 'Zeile löschen', pdfTblCol: 'Spalte hinzufügen', pdfTblColDel: 'Spalte löschen', pdfTblAlignL: 'Links', pdfTblAlignC: 'Mitte', pdfTblAlignR: 'Rechts', pdfTblBold: 'Fett', pdfTblItalic: 'Kursiv', pdfTblTextColor: 'Textfarbe', pdfTblBg: 'Hintergrund', pdfTblBorder: 'Rahmenfarbe', pdfTblNoBorder: 'Kein Rahmen', pdfTblRowH: 'Zeilenhöhe', pdfTblControls: 'Tabellensteuerung', smartPdfPages: 'Seiten', pdfPgAdd: 'Seite hinzufügen', pdfPgDel: 'Seite löschen', pdfPgRot: 'Drehen', pdfPgDup: 'Duplizieren', pdfPgAdded: 'Seite hinzugefügt', pdfPgDeleted: 'Seite gelöscht', pdfPgRotated: 'Gedreht', pdfPgDuplicated: 'Seite dupliziert', pdfPgLast: 'Ein Dokument muss mindestens eine Seite behalten'
, smartPdfAdd: 'Hinzufügen', smartPdfAddText: 'Text', smartPdfAddImage: 'Bild', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'Signatur', smartPdfAddStamp: 'Stempel', smartPdfAddDate: 'Datum', smartPdfAddTable: 'Tabelle', smartPdfMark: 'Markieren', smartPdfMarkHighlight: 'Hervorheben', smartPdfMarkUnderline: 'Unterstreichen', smartPdfMarkDraw: 'Zeichnen', smartPdfMarkComment: 'Kommentar', smartPdfMarkDone: 'Fertig', smartPdfMarkCancel: 'Abbrechen', smartPdfCommentTitle: 'Kommentar', smartPdfCommentText: 'Kommentartext', smartPdfCommentAdd: 'Kommentar hinzufügen', smartPdfMarkSelectText: 'Zuerst den zu markierenden Text auswählen', smartPdfMarkDrawHint: 'Auf der Seite zeichnen', smartPdfMarkCommentLabel: 'Kommentartext', smartPdfMarkAddComment: 'Kommentar hinzufügen', pdfTblRow: 'Zeile hinzufügen', pdfTblRowDel: 'Zeile löschen', pdfTblCol: 'Spalte hinzufügen', pdfTblColDel: 'Spalte löschen', pdfTblAlignL: 'Links', pdfTblAlignC: 'Mitte', pdfTblAlignR: 'Rechts', pdfTblBold: 'Fett', pdfTblItalic: 'Kursiv', pdfTblTextColor: 'Textfarbe', pdfTblBg: 'Hintergrund', pdfTblBorder: 'Rahmenfarbe', pdfTblNoBorder: 'Kein Rahmen', pdfTblRowH: 'Zeilenhöhe', pdfTblControls: 'Tabellensteuerung', smartPdfPages: 'Seiten', pdfPgAdd: 'Seite hinzufügen', pdfPgDel: 'Seite löschen', pdfPgRot: 'Drehen', pdfPgDup: 'Duplizieren', pdfPgAdded: 'Seite hinzugefügt', pdfPgDeleted: 'Seite gelöscht', pdfPgRotated: 'Gedreht', pdfPgDuplicated: 'Seite dupliziert', pdfPgLast: 'Ein Dokument muss mindestens eine Seite behalten'
},
  tr: {
    eyebrow: '',
    adBarLabel: 'Reklam',
    title: 'EQ7',
    install: 'Uygulamayı Yükle',
    actions: 'Eylemler',
    notesManagerTitle: 'Not Yöneticisi',
    notesManagerSubtitle: 'Notları klasörlerde düzenleyin ve tam ekran düzenleyici açın.',
    foldersTitle: 'Klasörler',
    addFolder: '+ Klasör',
    newNoteButton: 'Yeni Tam Ekran Not',
    notesTitle: 'Notlar',
    refreshNotes: 'Yenile',
    fullScreenNoteTitle: 'Tam Ekran Not',
    noteFolderLabel: 'Klasör',
    noteTitleLabel: 'Başlık',
    noteTitlePlaceholder: 'Not başlığı',
    folderSelectLabel: 'Klasör',
        noteBodyPlaceholder: 'Yazmaya başla...',
    percentTab: 'Yüzde',
    settingsTab: 'Ayarlar',
    historyTab: 'Geçmiş',
    percentTitle: 'Yüzde Hesaplayıcı',
    percentBack: 'Geri',
    amountLabel: 'Miktar',
    rateLabel: 'Yüzde Oranı',
    settingsTitle: 'Ayarlar ve Özelleştirme',
    languageLabel: 'Dil',
    themeLabel: 'Tema',
    historyTitle: '24 Saatlik Geçmiş',
    historyBack: 'Geri',
    historyRemaining: 'kalan',
    selectAll: 'Tümünü Seç',
    exportButton: 'Paylaş / Dışa Aktar',
    companyNameBtn: 'Şirket Adı',
    quickNotesTitle: 'Hızlı Notlar',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Kaydet',
    quickNotesPlaceholder: 'Not yaz',
    historyNotePlaceholder: 'Bu hesaplamayı etiketle',
    historyInsertResult: 'Sonucu ekle',
    historySpeakResult: 'Sonucu sesli oku',
    historyLabel: 'Geçmiş',
    noteLabel: 'Not',
    noteInputPlaceholder: '+ Yeni not',
    noteSaved: 'Not kaydedildi',
    noteEdit: 'Düzenle',
    noteShare: 'Paylaş',
    emptyHistory: 'Henüz geçmiş yok',
    noteTableAddRow: '+ Satır',
    noteTableAddCol: '+ Sütun',
    noteTableDelRow: '- Satır',
    noteTableDelCol: '- Sütun',
    noteTableMergeCells: 'Hucreleri Birleştir',
    noteTableSplitCell: 'Hücreyi Böl',
    noteTableBorderAll: 'Tüm Sınırlar',
    noteTableBorderOutside: 'Dış Sınırlar',
    noteTableBorderInside: 'İç Sınırlar',
    noteTableBorderNone: 'Sınır Yok',
    noteTableHAlignLeft: 'Sol',
    noteTableHAlignCenter: 'Orta',
    noteTableHAlignRight: 'Sağ',
    noteTableVAlignTop: 'Üst',
    noteTableVAlignMiddle: 'Orta',
    noteTableVAlignBottom: 'Alt',
    copied: 'Sonuç kopyalandı',
    pasted: 'Sayı yapıştırıldı',
    installed: 'Uygulama yüklenmeye hazır',
    noSelection: 'Paylaşmak için bir öğe seçin',
    shareTitle: 'EQ7 Hesap Makinesi Geçmişi',
    shareMessage: 'EQ7 Hesap Makinesi\'nden dışa aktarıldı',
    themeOled: 'OLED Siyah',
    themeCharcoal: 'Komur Koyu',
    themeTitanium: 'Titanyum Arduvaz',
    themeLight: 'Minimal Acik',
    themeDark: 'OLED Siyah',
    themeViolet: 'Titanyum Arduvaz',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',

    languageKurdish: 'کوردی',
    drawerTop: 'Üst',
    drawerSide: 'Yan',
    expand: 'Genişlet',
    Minimize: 'Küçült',
    installModalSubtitle: 'Ana ekranınıza ekleyin',
    installModalClose: 'Anladım',
    settingsSubtitle: 'Dil, tema ve geri bildirimi özelleştirin.',
    appSoundsLabel: 'Uygulama Sesleri',
    soundHapticsLabel: 'Ses ve dokunsal geri bildirim',
    soundHapticsCaption: 'Tıklama seslerini ve titreşimi etkinleştir',
    soundProfileLabel: 'Tuş Ses Profili',
    profileClassic: 'Klasik',
    profileSoft: 'Yumuşak',
    profileModern: 'Modern',
    profileClick: 'Tık',
    profileSilent: 'Sessiz',
    speakerLabel: 'Hoparlör / Sesli Okuma',
    speakerCaption: 'AÇIK olduğunda sonuç = tuşuna bastıktan sonra otomatik olarak sesli okunur. KAPALI olduğunda okuma yalnızca hoparlör düğmesinden manuel yapılır.',
    modeGeneral: 'Genel Hesap Makinesi',
    scientificToggle: 'Bilimsel',
    deg: 'DEG',
    rad: 'RAD',
    grad: 'GRAD',
    sin: 'sin',
    cos: 'cos',
    tan: 'tan',
    asin: 'asin',
    acos: 'acos',
    atan: 'atan',
    percentResultLabel: 'Sonuç',
    currencyConverterTitle: 'Doğrudan Döviz Çevirici',
    currencyConverterSubtitle: 'Tutarları canlı kurlarla anında çevirin.',
    swapButton: 'Değiştir',
    favoritesButton: 'Favoriler',
    recentButton: 'Son',
    fromLabel: 'Kimden',
    toLabel: 'Kime',
    convertedLabel: 'Dönüştürüldü',
    bankRateMode: '🏦 Banka Kuru',
    marketRateMode: '🏪 Piyasa Kuru',
    marketRateFieldLabel: 'Piyasa Döviz Kuru',
    cachedLabel: 'Önbellekte',
    refreshButton: 'Yenile',
    globalDirectoryButton: 'Küresel dizin',
    currencyDirectoryTitle: 'Küresel Döviz Rehberi',
    currencyDirectorySubtitle: 'Ülke adına veya para birimi koduna göre kağıt para arayın.',
    currencySearchPlaceholder: 'Ülke veya kod ara',
    drawerEyebrow: '',
    drawerTitle: 'EQ7',
    drawerHistory: 'Geçmiş',
    drawerNotes: 'Notlar',
    drawerPdf: 'PDF',
    pdfWorkspaceTitle: 'PDF',
    pdfCardScanTitle: 'Tara / PDF oluştur',
    pdfCardScanDesc: 'Belgelerden PDF oluştur',
    pdfCardOpenTitle: 'PDF aç',
    pdfCardOpenDesc: 'Mevcut PDF\'yi düzenle',
    pdfRecentTitle: 'Son PDF\'ler',
    pdfRecentEmpty: 'Henüz son PDF yok.',
    pdfComingSoon: 'Yakında gelen bir güncellemede.',
    noteTableInsertPopupTitle: 'Tablo ekle',
  noteHeadingMenuLabel: 'Başlık',
  noteHeading1Label: 'Başlık 1',
  noteHeading2Label: 'Başlık 2',
  noteHeading3Label: 'Başlık 3',
  noteNormalTextLabel: 'Normal metin',
    noteTableRowsLabel: 'Satırlar',
    noteTableColsLabel: 'Sütunlar',
    noteTableHeaderRowLabel: 'Başlık satırı',
    noteTableInsertBtnLabel: 'Tablo ekle',
    noteTablePresetCustomLabel: 'Özel',
    untitled: 'Başlıksız',
  pdfPreviewTitle: 'PDF Önizleme',
  pdfPrevPage: 'Önceki sayfa',
  pdfNextPage: 'Sonraki sayfa',
  pdfZoomIn: 'Yakınlaştır',
  pdfZoomOut: 'Uzaklaştır',
  pdfZoomFit: 'Sayfayı sığdır',
  pdfRotate: 'Döndür',
  pdfShare: 'PDF paylaş / kaydet',
  pdfClose: 'Önizlemeyi kapat',
    pdfMore: 'Daha fazla araç', pdfPrint: 'Yazdır', pdfSave: 'Cihaza kaydet',
  pdfAnnoEdit: 'Açıklamaları düzenle', pdfAnnoText: 'Metin ekle', pdfAnnoHighlight: 'Vurgula', pdfAnnoDraw: 'Çiz', pdfAnnoUnderline: 'Altını çiz', pdfAnnoStrike: 'Üstünü çiz', pdfAnnoRect: 'Dikdörtgen', pdfAnnoCircle: 'Daire', pdfAnnoLine: 'Çizgi', pdfAnnoClear: 'Sayfa açıklamalarını temizle', pdfAnnoNote: 'Not ekle',
  pdfDocOptions: 'Belge seçenekleri', pdfDocTemplate: 'Şablon', pdfDocHeader: 'Üst Bilgi', pdfDocFooter: 'Alt Bilgi', pdfDocWatermark: 'Filigran', pdfDocWmText: 'Filigran metni',
  pdfTplBlank: 'Boş', pdfTplReport: 'Rapor', pdfTplInvoice: 'Fatura', pdfTplReceipt: 'Makbuz', pdfTplContract: 'Sözleşme', pdfTplCv: 'Özgeçmiş', pdfTplBusiness: 'İş raporu', pdfTplEngineering: 'Mühendislik raporu', pdfTplLetter: 'Mektup',
    folderPersonal: 'Kişisel',
    resetButton: 'Sıfırla',
    featureRequiresInternet: 'Bu özellik internet bağlantısı gerektirir.',
    smartDocsTitle: '📄 Akıllı Belgeler',
    smartDocsDesc: 'Belgelerinizi tek bir ana sayfadan yönetin. Burada yeni araçlar görünecek.',
    smartDocsHeading: 'Ne yapmak istersiniz?',
    smartDocsStep1: 'Başlangıç',
    smartDocsStep2: 'Düzenleme',
    smartDocsStep3: 'İnceleme',
    smartDocsStep4: 'Dışa Aktarma',
    smartDocsCardScanTitle: 'Belge Tara',
    smartDocsCardScanDesc: 'Bir kağıdın veya sözleşmenin fotoğrafını çekin ve düzenlenebilir içeriğe dönüştürün.',
    smartDocsCardImportTitle: 'Dosya İçe Aktar',
    smartDocsCardImportDesc: 'Cihazınızdan bir PDF veya desteklenen dosya seçin.',
    smartDocsCardNewTitle: 'Yeni Belge',
    smartDocsCardNewDesc: 'Sıfırdan başlamak için boş bir sayfa.',
    smartDocsCardTemplatesTitle: 'Şablonlar',
    smartDocsCardTemplatesDesc: 'Hızlı başlamak için hazır şablonlar.',
    smartTemplatesBusiness: 'İş',
    smartTemplatesPersonal: 'Kişisel',
    smartTemplatesCustom: 'Özel',
    smartTemplatesInvoice: 'Fatura',
    smartTemplatesQuote: 'Teklif',
    smartTemplatesPaymentAgreement: 'Ödeme Sözleşmesi',
    smartTemplatesServiceContract: 'Hizmet Sözleşmesi',
    smartTemplatesSimpleAgreement: 'Basit Anlaşma',
    smartTemplatesPaymentReceipt: 'Ödeme Makbuzu',
    smartTemplatesRentalAgreement: 'Kira Sözleşmesi',
    smartTemplatesMyTemplates: 'Şablonlarım',
    smartScanTitle: '📸 Belge Tara',
    smartScanCapture: 'Yakala',
    smartScanUploadFallback: 'Cihazınızdan bir görüntü seçin',
    smartScanDetecting: 'Belge kenarlarını tespit et',
    smartScanCorrecting: 'Görüntüyü düzelt',
    smartScanImproving: 'Görüntüyü iyileştir',
    smartScanReading: 'Metni oku',
    smartScanProcessing: 'İşleniyor…',
    smartScanReviewTitle: 'OCR sonucunu gözden geçir',
    smartScanPreviewLabel: 'İşlenmiş belge',
    smartScanEditHint: 'Kabul etmeden önce tanınan metni düzenleyebilirsiniz.',
smartScanReviewNote: 'تم التعرف على المستند. راجع المحتوى قبل إنشاء ملف PDF.',
    smartScanStatusNeeds: 'يحتاج إلى مراجعة',
    smartScanStatusEdited: 'تم التعديل — ستُستخدم تصحيحاتك في ملف PDF',
    smartScanRescan: 'Yeniden tara',
    smartScanAccept: 'Sonucu kabul et',
    smartScanStructTitle: 'Algılanan yapı',
    smartScanStructHeading: 'Başlık',
    smartScanStructParagraph: 'Paragraf',
    smartScanStructTable: 'Tablo',
    smartScanStructNumber: 'Sayı',
    smartScanStructDate: 'Tarih',
    smartScanStructField: 'Alan',
    smartScanCameraUnavailable: 'Bu cihazda kamera mevcut değil.',
    smartScanPermissionDenied: 'Kamera izni reddedildi.',
    smartScanNoText: 'Metin algılanamadı. Tekrar deneyin veya bir görüntü ekleyin.',
    smartScanOcrFailed: 'Metin okuma başarısız oldu. Lütfen tekrar deneyin.',
    smartScanAccepted: 'Sonuç kabul edildi ve düzenleme için hazır.',
    smartScanEditTitle: 'Düzenlenebilir belge', smartScanEditDocTitlePh: 'Belge başlığı',
    smartScanCreatePdf: 'PDF oluştur', smartScanPdfCreating: 'PDF oluşturuluyor…',
    smartScanPdfCreated: 'Düzenlenen belgeden PDF oluşturuldu.',
    smartScanOfflinePdf: 'Çevrimdışı — PDF kitaplığı yüklenemedi.',
    smartScanPdfFailed: 'PDF oluşturulamadı.',
        smartImportTitle: '📂 Dosya İçe Aktar',
    pdfAddTitle: 'PDF\'ye Ekle', pdfAddText: 'Metin', pdfAddImage: 'Görsel', pdfAddLogo: 'Logo', pdfAddSignature: 'İmza', pdfAddStamp: 'Müstahap', pdfAddDate: 'Tarih', pdfAddTable: 'Tablo',
    smartImportPickPrompt: 'Cihazınızdan bir PDF dosyası seçin.',
    smartImportChoose: 'Dosya Seç',
    smartImportPreparing: 'Belge hazırlanıyor…',
    smartImportAnalyzing: 'Belge analiz ediliyor…',
    smartImportScannedTitle: 'Taranmış belge algılandı',
    smartImportScannedMsg: 'Bu belge taranmış sayfalar içeriyor gibi görünüyor. Metin tanımayı kullanmak ister misiniz?',
    smartImportUseOcr: 'OCR Kullan',
    smartImportKeepImages: 'Sayfaları görsel olarak tut',
    smartImportOcrProcessing: 'OCR İşleniyor…',
    smartImportFailed: 'İçe aktarma başarısız',
    smartImportRetry: 'Tekrar dene',
    smartImportInvalidFile: 'Bu geçerli bir PDF dosyası değil. Bir PDF dosyası seçin.',
    smartImportCorrupt: 'PDF bozuk veya okunamıyor gibi görünüyor. Başka bir dosya deneyin.',
    smartImportEmpty: 'Bu belgede kullanışlı içerik yok.',
    smartImportOcrFailed: 'Metin tanıma başarısız oldu. Tekrar deneyin.',
    smartEditorTitle: 'Düzenleyici',
    smartEditorHint: 'Belge içeriği',
    smartEditorPlaceholder: 'İçe aktarılan içerik burada görünecek…',
    smartToolbarDefault: 'Yeni Belge',
    smartUntitledDoc: 'Adsız Belge',
    smartToolbarUndo: 'Geri Al',
    smartToolbarRedo: 'Yeniden Yap',
    smartToolbarBold: 'Kalın',
    smartToolbarItalic: 'Eğik',
    smartToolbarUnderline: 'Altı Çizgi',
    smartDocumentBackLabel: 'Akıllı Belgeler',
    smartToolbarAdd: 'Ekle',
    smartAddHeading: 'Başlık',
    smartAddNewPage: 'Yeni Sayfa',
    smartPageDesignNone: 'Çerçevesiz',
    smartPageDesignSimple: 'Basit',
    smartPageDesignClassic: 'Klasik',
    smartPageDesignFormal: 'Resmi',
    smartPageDesignModern: 'Modern',
    // PART 17 — İmza
    smartSigDraw: 'Çiz', smartSigType: 'Yaz', smartSigImage: 'Resim',
    smartSigInsert: 'Ekle', smartSigClear: 'Temizle', smartSigCancel: 'İptal',
    smartSigNamePh: 'Adınız', smartSigChoose: 'İmzanızın resmini seçin',
    // PART 18 — İmza koruma durumu (EQ Signature Status)
    smartSigStatusSigned: '\u2713 İmzalı',
    smartSigStatusModified: '\u26A0 Belge imzaland\u0131ktan sonra de\u011fi\u015ftirildi',
    smartSigResign: 'Yeniden imzala',
    smartTextFont: 'Yazı tipi', smartTextSize: 'Boyut', smartTextFontDefault: 'Varsayılan',
    smartTextBold: 'Kalın', smartTextItalic: 'İtalik', smartTextUnderline: 'Altı çizili',
    smartTextAlignLeft: 'Sola hizala', smartTextAlignCenter: 'Ortala', smartTextAlignRight: 'Sağa hizala',
    smartTextDirection: 'Yön', smartTextDirAuto: 'Otomatik', smartTextDirLtr: 'LTR', smartTextDirRtl: 'RTL',
    smartTextSpacing: 'Satır aralığı',
    smartToolbarText: 'Metin',
    smartToolbarTable: 'Tablo',
    smartTableRows: 'Satırlar', smartTableColumns: 'Sütunlar',
    smartTableCreate: 'Tablo oluştur',
    smartTableAddRow: 'Satır ekle', smartTableDelRow: 'Satır sil',
    smartTableAddCol: 'Sütun ekle', smartTableDelCol: 'Sütun sil',
    smartTableAlignLeft: 'Sola hizala', smartTableAlignCenter: 'Ortala', smartTableAlignRight: 'Sağa hizala',
    smartToolbarSignature: 'İmza',
    smartToolbarMore: 'Daha Fazla',
    smartToolbarImage: 'Resim',
    smartImageDelete: 'Resmi sil',
    smartToolbarLogo: 'Logo',
    smartLogoPosition: 'Logo konumu',
    smartLogoTopRight: 'Sağ üst',
    smartLogoTopLeft: 'Sol üst',
    smartLogoCenter: 'Orta',
    smartToolbarDivider: 'Ayırıcı',
    smartToolbarBorder: 'Kenarı',
    smartToolbarPage: 'Sayfa',
    smartToolbarPageNumber: 'Sayfa Numarası',
    smartToolbarPageSettings: 'Sayfa Ayarları',
    smartBlankNavPage: 'Sayfa',
    smartBlankNavPrev: 'Önceki',
    smartBlankNavNext: 'Sonraki',
    // PART 19 — sayfa yönetimi
    smartBlankNavOf: '/',
    smartPageAdd: 'Sayfa ekle', smartPageCopy: 'Sayfayı kopyala', smartPageDelete: 'Sayfayı sil',
    // PART 20 — çalışmayı kaydetme
    smartToolbarSave: 'Kaydet', smartSavedToast: 'Belge kaydedildi',
    smartPdfTextColor: 'Metin rengi',
    smartPdfStyle: 'Stil', smartPdfStyleNone: 'Stil Yok', smartPdfStyleSimple: 'Basit', smartPdfStyleBusiness: 'İş', smartPdfStyleAcademic: 'Akademik', smartPdfStyleEngineering: 'Mühendislik',
    smartSaveFailed: 'Kaydedilemedi. Lütfen tekrar deneyin.',
    smartUnsavedTitle: 'Çıkmadan önce değişiklikleri kaydetmek istiyor musunuz?',
    smartReviewButton: 'İnceleme', smartReviewExit: 'Düzenlemeye dön',
    smartPdfExportButton: "PDF'e aktar", smartPdfExportTitle: "PDF'e aktar", smartPdfExportFilenameLabel: 'Dosya adı',
    smartPdfExportPagesLabel: 'Sayfalar', smartPdfExportAllPages: 'Tüm sayfalar', smartPdfExportCurrentPage: 'Geçerli sayfa',
    smartPdfExportQualityLabel: 'Kalite', smartPdfExportNormal: 'Normal', smartPdfExportHigh: 'Yüksek',
    smartPdfExportDo: 'Aktar', smartPdfExportCancel: 'İptal',
    smartPdfExportSuccess: "PDF başarıyla dışa aktarıldı.", smartPdfExportFailed: 'PDF oluşturulamadı.',
    smartPdfPreparing: 'Belge hazırlanıyor…', smartPdfPrepareFailed: 'PDF hazırlanamadı. Lütfen tekrar deneyin.',
    smartPdfResultTitle: 'Belge başarıyla oluşturuldu', smartPdfResultFileLabel: 'Dosya',
    smartPdfOpen: 'PDF\'i aç', smartPdfShare: 'Paylaş', smartPdfSend: 'Gönder', smartPdfClose: 'Kapat',
    smartPdfShareUnsupported: 'Bu cihazda doğrudan paylaşım desteklenmiyor. PDF indirildi.',
    smartPdfShareCancelled: 'Paylaşım iptal edildi.', smartPdfShareFailed: 'Paylaşım başarısız oldu. PDF indirildi.',
    smartPdfOpenFailed: 'PDF bu tarayıcıda açılamadı.',
    // PART 31 — Önizleme
    smartPdfPreviewTitle: 'Önizleme',
    smartPdfPreviewNote: 'Kaydedilecek dosya budur.',
    smartPdfSave: 'PDF\'yi Kaydet',
    smartUnsavedSave: 'Kaydet', smartUnsavedExit: 'Kaydetmeden çık', smartUnsavedCancel: 'İptal',
    // PART 33 — Yeni belge (koruma)
    smartUnsavedNewTitle: 'Kaydedilmemiş değişiklikleriniz var.',
    smartUnsavedSaveContinue: 'Kaydet ve devam et',
    smartUnsavedStartNew: 'Yeni belge başlat',
    smartSaveAndContinueFailed: 'Kaydetme başarısız. Değişiklikleriniz kaybolmadı.',
    smartDraftBannerTitle: 'Taslak bu cihazda kaydedildi', smartDraftResume: 'Taslağa devam et',
    smartDraftsTitle: 'Taslaklarınız', smartDraftsEmpty: 'Kayıtlı taslak yok', smartDraftsNewDoc: 'Boş belge',
    smartDraftResumeBtn: 'Düzenlemeye devam et', smartDraftDeleteBtn: 'Sil',
    smartDraftDelTitle: 'Bu taslak silinsin mi?', smartDraftDelConfirm: 'Sil',
    smartRelNow: 'şu an', smartRelMin: 'bir dakika önce', smartRelMins: '{n} dakika önce',
    smartRelHour: 'bir saat önce', smartRelHours: '{n} saat önce', smartRelYesterday: 'dün', smartRelDays: '{n} gün önce',
    drawerConverter: 'Doğrudan Döviz Çevirici',
    drawerDirectory: 'Küresel Döviz Rehberi ve Arama',
    drawerInstall: 'Uygulamayı Yükle',
    drawerSettings: 'Ayarlar',
    installModalTitle: 'iPhone\'a Yükle',
    installModalStep1: 'Adım 1: Tarayıcının altındaki veya üstündeki Paylaş düğmesine dokunun (⎘ / ⇡).',
    installModalStep2: 'Adım 2: Menüden "Ana Ekrana Ekle"yi seçin.',
    currencyOptionSearch: 'Para birimi ara',
    currencyOptionPrices: 'Canlı kur fiyatları',
    currencyOptionConvert: 'Para birimi çevir',
    currencyOptionFavorites: 'Favori para birimleri',
    currencyFavoritesTitle: 'Favoriler',
    currencyFavoritesEmpty: 'Henüz favori para birimi yok',
    currencyFavoritesEmptyHint: 'Herhangi bir para birimindeki yıldıza dokunarak buraya ekleyin',
    currencyOptionCustomRate: 'Özel kur ile çevir',
    customRateTitle: 'Özel kur ile çevir',
    customRateFieldLabel: 'Döviz kuru',
    currencyRatesTitle: 'Döviz kurları',
    currencyRatesSearchPlaceholder: 'Para birimi veya kod ara',
    currencyRatesEmpty: 'Para birimi bulunamadı',
    currencyRatesLoading: 'Kurlar yükleniyor…',
    currencyRatesError: 'Kurlar kullanılamıyor',
    recentlyDeletedTitle: 'Son Silinenler',
    emptyNotesText: 'Henüz not yok',
    emptyNotesAction: '+ Yeni not',
    // N02 — Notes Home
    searchNotesPlaceholder: 'Notlarda ara...',
    recentNotesLabel: 'Son Notlar',
    sortNewest: 'En Yeni',
    sortOldest: 'En Eski',
    sortAz: 'A–Z',
    renameNote: 'Yeniden Adlandır',
    duplicateNote: 'Çoğalt',
    pinNote: 'Sabitle',
    unpinNote: 'Sabitlemeyi Kaldır',
    noteMoreActions: 'Diğer İşlemler',
    noteNamePrompt: 'Not adı:',
    noteEmptyName: 'Not adı boş olamaz.',
    copySuffix: ' (kopya)',
    noNotesFound: 'Not bulunamadı',
    createFirstNote: 'İlk notunu oluştur',
    updatedToday: 'Bugün güncellendi',
    updatedYesterday: 'Dün güncellendi',
    updatedDaysAgo: '{n} gün önce güncellendi',
    notePinnedToast: 'Not sabitlendi',
    noteUnpinnedToast: 'Not sabitlemesi kaldırıldı',
    // PART 05 — Aa text-formatting panel labels
    noteTextStyleLabel: 'Metin Stili',
    noteStyleNormalLabel: 'Metin',
    noteBasicLabel: 'Temel',
    noteAlignLabel: 'Hizalama',
    noteFontSizeLabel: 'Yazı Boyutu',
    noteFontSmallLabel: 'Küçük',
    noteFontNormalLabel: 'Normal',
    noteFontLargeLabel: 'Büyük',
    noteColorsLabel: 'Renkler',
    notePresetsLabel: 'Ön ayarlar',
    presetSimple: 'Basit',
    presetAcademic: 'Akademik',
    presetBusiness: 'İş',
    presetEngineering: 'Mühendislik',
    presetModern: 'Modern',
    noteStylesLabel: 'Stiller',
    noteStyleSimple: 'Basit',
    noteStyleAcademic: 'Akademik',
    noteStyleBusiness: 'İş',
    noteStyleEngineering: 'Mühendislik',
    noteStyleModern: 'Modern',
    noteStyleNone: 'Yok',
    noteFramesLabel: 'Çerçeve',
    noteFrameNone: 'Yok',
    noteFrameClassic: 'Klasik',
    noteFrameDashed: 'Kesikli',
    noteFrameSoft: 'Yumuşak',
    pdfExportTitle: 'PDF Dışa Aktar',
    pdfExportStyle: 'Stil',
    pdfExportTitleLabel: 'Başlık',
    pdfExportTitlePh: 'Not başlığı (isteğe bağlı)',
    pdfExportDate: 'Tarih',
    pdfExportCompany: 'Şirket Profilini Kullan',
    pdfExportPreview: 'Önizleme',
    pdfExportCreate: 'PDF Oluştur',
    pdfExportClose: 'Dışa aktarma penceresini kapat',
    noteSavedLabel: 'Kaydedildi ✓',
    emptyDeletedText: 'Silinen not yok',
    deleteConfirmTitle: 'Kalıcı olarak silinsin mi?',
    deleteConfirmText: 'Bu işlem geri alınamaz.',
    cancelBtn: 'İptal',
    deletePermanentBtn: 'Sil',
    doneBtn: 'Bitti',
    deleteNoteBtn: 'Notu sil',
    restoreBtn: 'Geri yükle',
    unfiled: 'Klasörsüz',
    folderNamePrompt: 'Klasör adı:',
    folderEmptyName: 'Klasör adı boş olamaz.',
    folderDuplicateName: 'Bu ada sahip bir klasör zaten var.',
    renameFolder: 'Klasörü yeniden adlandır',
    deleteFolder: 'Klasörü sil',
    folderDeleteConfirmTitle: 'Klasör silinsin mi?',
    folderDeleteConfirmText: 'Bu klasördeki notlar Klasörsüz bölümüne taşınır ve korunur.',
    helpTitle: 'Yardım ve Hakkında',
    helpSubtitle: 'EQ7’yu nasıl kullanacağınızı öğrenin ve özelliklerini keşfedin.',
    helpAboutTitle: 'Uygulama Hakkında',
    helpAboutDesc: 'EQ7, günlük matematiği, bilimsel ve yüzde araçlarını, döviz çevirmeyi ve çok daha fazlasını tek bir basit, kullanımı kolay uygulamada birleştiren akıllı, çok yönlü bir hesap makinesidir.',
    helpWhyTitle: 'EQ7 neden oluşturuldu?',
    helpWhyDesc: 'Fikir basit: birçok hesap makinesi yerine tek bir hesap makinesi; hız, netlik ve günlük kullanım için tasarlanmıştır.',
    helpWhyL1: 'Hızlı günlük hesaplamalar',
    helpWhyL2: 'Karekök, üsler ve parantezler gibi bilimsel araçlar',
    helpWhyL3: 'Kolay yüzde hesaplamaları',
    helpWhyL4: 'Döviz çevirme ve canlı kurlar',
    helpWhyL5: 'Notlar ve hesap geçmişi',
    helpWhyL6: 'Basit, anlaşılır ve hızlı kullanım',
    helpWhyL7: 'Farklı cihazlarda kurulabilir bir uygulama (PWA) olarak çalışır',
    helpSectionsTitle: 'Uygulama Bölümlerinin Açıklaması',
    helpSecGeneralTitle: 'Genel Hesap Makinesi',
    helpSecGeneralDesc: 'Günlük işlemler için ana hesap makinesi: toplama, çıkarma, çarpma ve bölme.',
    helpSecGeneralEx: 'Örnek: 12 + 7 = 19.',
    helpSecScientificTitle: 'Bilimsel Araçlar',
    helpSecScientificDesc: 'Aynı hesap makinesinde karekök, kare ve parantez düğmelerini kullanmak için “Scientific”e dokunun.',
    helpSecScientificEx: 'Örnek: √9 = 3, 2^3 = 8.',
    helpSecPercentTitle: 'Yüzde Hesaplayıcı',
    helpSecPercentDesc: 'Ekstra adım olmadan bir tutarın yüzdesini hızlıca hesaplayın.',
    helpSecPercentEx: 'Örnek: 200’ün %15’i = 30.',
    helpSecHistoryTitle: 'Geçmiş',
    helpSecHistoryDesc: 'EQ7, son 24 saatte hesapladıklarınızı hatırlar, böylece inceleyebilir veya paylaşabilirsiniz.',
    helpSecNotesTitle: 'Notlar',
    helpSecNotesDesc: 'Hızlı notlar kaydedin, bunları klasörlerde düzenleyin ve tam ekran düzenleyicide yönetin.',
    helpSecCurrencyTitle: 'Döviz Araçları',
    helpSecCurrencyDesc: 'Para birimleri arayın, canlı kurları görün, çevirin, özel kur kullanın ve favorilerinizi saklayın.',
    helpSecSettingsTitle: 'Ayarlar',
    helpSecSettingsDesc: 'Dili, temayı ve ses geri bildirimini dilediğiniz gibi değiştirin.',
    helpButtonsTitle: 'Hesap Makinesi Nasıl Kullanılır',
    helpBtnNumbers: 'Rakam yazmak için dokunun.',
    helpBtnAdd: 'Sonraki sayıyı ekler.',
    helpBtnSub: 'Sonraki sayıyı çıkarır.',
    helpBtnMul: 'Sonraki sayıyla çarpar.',
    helpBtnDiv: 'Sonraki sayıya böler.',
    helpBtnEquals: 'Sonucu gösterir.',
    helpBtnAc: 'Her şeyi temizler ve sıfırdan başlar.',
    helpBtnBack: 'Yazdığınız son rakamı siler.',
    helpBtnDecimal: 'Ondalık ayracı ekler.',
    helpBtnScientific: 'Scientific / Percentage: ekstra araçları açar veya kapatır.',
    helpBtnSpeak: 'Geçerli sonucu sesli olarak okur.',
    helpSettingsExplainTitle: 'Ayarlar',
    helpSetLanguage: 'Dil: tüm uygulamayı mevcut diller arasında değiştirir.',
    helpSetTheme: 'Tema: OLED Siyah, Komur Koyu, Titanyum Arduvaz veya Minimal Acik seçin.',
    helpSetSoundsTitle: 'Uygulama Sesleri: ses ve dokunsal geri bildirimin ana anahtarı.',
    helpSetSoundsDesc: 'Uygulama Sesleri açıkken düğme sesi ve titreşim etkindir. Bunu kapatmak kapatır, tekrar açmak izin verir.',
    helpSetSoundsSpeech: 'Konuşma/TTS, Uygulama Seslerinden ayrıdır ve Uygulama Sesleri tarafından kapatılmaz.',
    helpCurrencyTitle: 'Döviz Çevirici',
    helpCurrencyDesc: 'Sahip olduğunuz para birimini (Gönderen) ve istediğinizi (Alan) seçin, ardından bir tutar girin.',
    helpCurrencySwap: 'İki para birimini ters çevirmek için değiştirme düğmesini kullanın.',
    helpCurrencyFavorites: 'Bir para birimini favori olarak işaretlemek için yıldızı kullanın ve döviz menüsünden Favorileri açın.',
    helpCurrencyCustomRate: 'Özel kur ile çevirme, kendi döviz kurunuzu girmenizi sağlar.',
    helpCurrencyLive: 'Canlı fiyatlar çevrimiçi hizmetten gelir; hizmet yoksa önbelleğe alınmış kurlar kullanılabilir.',
    helpInstallTitle: 'Yükleme ve Çevrimdışı',
    helpInstallDesc1: 'EQ7’yu desteklenen cihazlara bir uygulama olarak kurabilirsiniz.',
    helpInstallDesc2: 'Bazı özellikler depolanan kaynaklarla çevrimdışı çalışır, ancak canlı kurlar ve uygulama güncellemeleri internet bağlantısı gerektirir.',
    helpBenefitsTitle: 'Neden EQ7?',
    helpBenefit1: 'Hepsi bir arada hesap makinesi',
    helpBenefit2: 'Hızlı günlük hesaplamalar',
    helpBenefit3: 'Bilimsel ve yüzde araçları',
    helpBenefit4: 'Döviz çevirme',
    helpBenefit5: 'Geçmiş ve notlar',
    helpBenefit6: 'Çok dilli arayüz',
    helpBenefit7: 'Duyarlı tasarım ve PWA desteği',
    helpLangTitle: 'Diller',
    helpLangDesc: 'EQ7 tamamen çevrilmiştir. Dilinizi üst çubukta veya Ayarlar’da seçin; bu yardım sayfası dahil tüm uygulama anında güncellenir.'
  , smartPdfAdd: 'Ekle', smartPdfAddText: 'Metin', smartPdfAddImage: 'Görüntü', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'İmza', smartPdfAddStamp: 'Damga', smartPdfAddDate: 'Tarih', smartPdfAddTable: 'Tablo', smartPdfMark: 'İşaretle', smartPdfMarkHighlight: 'Vurgula', smartPdfMarkUnderline: 'Altı çizgi', smartPdfMarkDraw: 'Çiz', smartPdfMarkComment: 'Yorum', smartPdfMarkDone: 'Tamam', smartPdfMarkCancel: 'İptal', smartPdfCommentTitle: 'Yorum', smartPdfCommentText: 'Yorum metni', smartPdfCommentAdd: 'Yorum ekle', smartPdfMarkSelectText: 'Önce işaretlenecek metni seçin', smartPdfMarkDrawHint: 'Sayfaya çizin', smartPdfMarkCommentLabel: 'Yorum metni', smartPdfMarkAddComment: 'Yorum ekle', pdfTblRow: 'Satır ekle', pdfTblRowDel: 'Satır sil', pdfTblCol: 'Sütun ekle', pdfTblColDel: 'Sütun sil', pdfTblAlignL: 'Sol', pdfTblAlignC: 'Orta', pdfTblAlignR: 'Sağ', pdfTblBold: 'Kalın', pdfTblItalic: 'İtalik', pdfTblTextColor: 'Metin rengi', pdfTblBg: 'Arka plan', pdfTblBorder: 'Kenarlık rengi', pdfTblNoBorder: 'Kenarlık yok', pdfTblRowH: 'Satır yüksekliği', pdfTblControls: 'Tablo kontrolleri', smartPdfPages: 'Sayfalar', pdfPgAdd: 'Sayfa ekle', pdfPgDel: 'Sayfa sil', pdfPgRot: 'Döndür', pdfPgDup: 'Çoğalt', pdfPgAdded: 'Sayfa eklendi', pdfPgDeleted: 'Sayfa silindi', pdfPgRotated: 'Döndürüldü', pdfPgDuplicated: 'Sayfa çoğaltıldı', pdfPgLast: 'Bir belge en az bir sayfa içermelidir'
, smartPdfAdd: 'Ekle', smartPdfAddText: 'Metin', smartPdfAddImage: 'Görüntü', smartPdfAddLogo: 'Logo', smartPdfAddSignature: 'İmza', smartPdfAddStamp: 'Damga', smartPdfAddDate: 'Tarih', smartPdfAddTable: 'Tablo', smartPdfMark: 'İşaretle', smartPdfMarkHighlight: 'Vurgula', smartPdfMarkUnderline: 'Altı çizgi', smartPdfMarkDraw: 'Çiz', smartPdfMarkComment: 'Yorum', smartPdfMarkDone: 'Tamam', smartPdfMarkCancel: 'İptal', smartPdfCommentTitle: 'Yorum', smartPdfCommentText: 'Yorum metni', smartPdfCommentAdd: 'Yorum ekle', smartPdfMarkSelectText: 'Önce işaretlenecek metni seçin', smartPdfMarkDrawHint: 'Sayfaya çizin', smartPdfMarkCommentLabel: 'Yorum metni', smartPdfMarkAddComment: 'Yorum ekle', pdfTblRow: 'Satır ekle', pdfTblRowDel: 'Satır sil', pdfTblCol: 'Sütun ekle', pdfTblColDel: 'Sütun sil', pdfTblAlignL: 'Sol', pdfTblAlignC: 'Orta', pdfTblAlignR: 'Sağ', pdfTblBold: 'Kalın', pdfTblItalic: 'İtalik', pdfTblTextColor: 'Metin rengi', pdfTblBg: 'Arka plan', pdfTblBorder: 'Kenarlık rengi', pdfTblNoBorder: 'Kenarlık yok', pdfTblRowH: 'Satır yüksekliği', pdfTblControls: 'Tablo kontrolleri', smartPdfPages: 'Sayfalar', pdfPgAdd: 'Sayfa ekle', pdfPgDel: 'Sayfa sil', pdfPgRot: 'Döndür', pdfPgDup: 'Çoğalt', pdfPgAdded: 'Sayfa eklendi', pdfPgDeleted: 'Sayfa silindi', pdfPgRotated: 'Döndürüldü', pdfPgDuplicated: 'Sayfa çoğaltıldı', pdfPgLast: 'Bir belge en az bir sayfa içermelidir'},
  ku: {
    "eyebrow": "",
    "adBarLabel": "ڕیکلام",
    "title": "EQ7",
    "install": "دامەزراندنی بەرنامە",
    "actions": "کردارەکان",
    "notesManagerTitle": "بەڕێوەبەری تێبینییەکان",
    "notesManagerSubtitle": "تێبینییەکان لەناو فۆڵدەرەکاندا ڕێکبخە و سەرنووسەری تەواوی شاشە بکەرەوە.",
    "foldersTitle": "فۆڵدەرەکان",
    "addFolder": "+ فۆڵدەر",
    "newNoteButton": "تێبینی نوێی تەواوی شاشە",
    "notesTitle": "تێبینییەکان",
    "refreshNotes": "نوێکردنەوە",
    "fullScreenNoteTitle": "تێبینی تەواوی شاشە",
    "noteFolderLabel": "فۆڵدەر",
    "noteTitleLabel": "ناونیشان",
    "noteTitlePlaceholder": "ناونیشانی تێبینی",
    "folderSelectLabel": "فۆڵدەر",
    "noteBodyPlaceholder": "دەست بە نووسین بکە...",
    "noteTableInsertPopupTitle": "زیادکردنی خشتە",
    "noteHeadingMenuLabel": "سەرنووسە",
    "noteHeading1Label": "سەرنووسەی 1",
    "noteHeading2Label": "سەرنووسەی 2",
    "noteHeading3Label": "سەرنووسەی 3",
    "noteNormalTextLabel": "دەقی ئاسایی",
    "noteTableRowsLabel": "ڕیزەکان",
    "noteTableColsLabel": "ستوونەکان",
    "noteTableHeaderRowLabel": "ڕیزی سەرەکی",
    "noteTableInsertBtnLabel": "زیادکردنی خشتە",
    "noteImageOpacity": "شفافی",
    "noteImageSendBack": "وێنە بکە پاش نووسین",
    "noteTablePresetCustomLabel": "تایبەت",
    "untitled": "بێ ناونیشان",
    "pdfPreviewTitle": "پێشبینینی PDF",
    "pdfPrevPage": "پەڕەی پێشوو",
    "pdfNextPage": "پەڕەی دواتر",
    "pdfZoomIn": "گەورەکردنەوە",
    "pdfZoomOut": "بچووککردنەوە",
    "pdfZoomFit": "گونجاندنی پەڕە",
    "pdfRotate": "سووڕاندنەوە",
    "pdfShare": "هاوبەشکردن / پاشەکەوتکردنی PDF",
    "pdfClose": "داخستنی پێشبینین",
    "pdfMore": "ئامرازە زیاترەکان",
    "pdfPrint": "چاپکردن",
    "pdfSave": "پاشەکەوتکردن لە ئامێرەکە",
    "pdfAnnoEdit": "دەستکاری لێدوانەکان",
    "pdfAnnoText": "زیادکردنی دەق",
    "pdfAnnoHighlight": "بەرچاوکردن",
    "pdfAnnoDraw": "وێنەکێشان",
    "pdfAnnoUnderline": "ژێرهێڵکردن",
    "pdfAnnoStrike": "هێڵکاری سەر",
    "pdfAnnoRect": "لاکێشە",
    "pdfAnnoCircle": "بازنە",
    "pdfAnnoLine": "هێڵ",
    "pdfAnnoClear": "سڕینەوەی لێدوانەکانی پەڕە",
    "pdfAnnoNote": "زیادکردنی تێبینی",
    "pdfDocOptions": "هەڵبژاردەکانی بەڵگە",
    "pdfDocTemplate": "قاڵب",
    "pdfDocHeader": "سەرپەڕە",
    "pdfDocFooter": "ژێرپەڕە",
    "pdfDocWatermark": "نیشانی ئاوی",
    "pdfDocWmText": "دەقی نیشانی ئاوی",
    "pdfTplBlank": "بەتاڵ",
    "pdfTplReport": "ڕاپۆرت",
    "pdfTplInvoice": "فاکتوور",
    "pdfTplReceipt": "وەسڵ",
    "pdfTplContract": "پەیماننامە",
    "pdfTplCv": "سیڤی",
    "pdfTplBusiness": "ڕاپۆرتی بازرگانی",
    "pdfTplEngineering": "ڕاپۆرتی ئەندازیاری",
    "pdfTplLetter": "نامە",
    "folderPersonal": "تایبەت",
    "percentTab": "سەدا",
    "settingsTab": "ڕێکخستنەکان",
    "historyTab": "مێژوو",
    "percentTitle": "حیسابکەری سەدا",
    "percentBack": "گەڕانەوە",
    "amountLabel": "بڕ",
    "rateLabel": "ڕێژەی سەدا",
    "settingsTitle": "ڕێکخستن و تایبەتمەندی",
    "languageLabel": "زمان",
    "themeLabel": "ڕوانگە",
    "historyTitle": "مێژووی 24 کاتژمێر",
    "historyBack": "گەڕانەوە",
    "historyRemaining": "ماوە",
    "selectAll": "هەڵبژاردنی هەموو",
    "exportButton": "هاوبەشکردن / دەرهێنان",
    "companyNameBtn": "ناوی کۆمپانیا",
    "quickNotesTitle": "تێبینی خێرا",
    "quickNotesToggle": "▼",
    "quickNotesAdd": "پاشەکەوتکردن",
    "quickNotesPlaceholder": "تێبینی بنووسە",
    "historyNotePlaceholder": "نیشانەکردنی ئەم حیسابە",
    "historyInsertResult": "زیادکردنی ئەنجام",
    "historySpeakResult": "خوێندنەوەی ئەنجام بە دەنگ",
    "historyLabel": "مێژوو",
    "noteLabel": "تێبینی",
    "noteInputPlaceholder": "+ تێبینی نوێ",
    "noteSaved": "تێبینی پاشەکەوتکرا",
    "noteEdit": "دەستکاری",
    "noteShare": "هاوبەشکردن",
    "emptyHistory": "هێشتا مێژوو نییە",
    "noteTableAddRow": "+ ڕیز",
    "noteTableAddCol": "+ ستوون",
    "noteTableDelRow": "- ڕیز",
    "noteTableDelCol": "- ستوون",
    "noteTableMergeCells": "تێکەڵکردنی خانەکان",
    "noteTableSplitCell": "دابەشکردنی خانە",
    "copied": "ئەنجام هەڵگیرا",
    "pasted": "ژمارە لێنرا",
    "installed": "بەرنامە ئامادەیە بۆ دامەزراندن",
    "noSelection": "شتێک هەڵبژێرە بۆ هاوبەشکردن",
    "shareTitle": "مێژووی حیسابکەری EQ7",
    "shareMessage": "لە حیسابکەری EQ7 دەرهێنراوە",
    "themeOled": "الأسود والبرتقالي",
    "themeCharcoal": "الفحمي والفيروزي",
    "themeTitanium": "الرصاصي الصخري",
    "themeLight": "الفاتح النظيف",
    "themeDark": "الأسود والبرتقالي",
    "themeViolet": "الرصاصي الصخري",
    "languageEnglish": "English",
    "noteTableBorderAll": "هەموو سنوورەکان",
    "noteTableBorderOutside": "سنوورە دەرەکییەکان",
    "noteTableBorderInside": "سنوورە ناوەکییەکان",
    "noteTableBorderNone": "بێ سنوور",
    "noteTableHAlignLeft": "چەپ",
    "noteTableHAlignCenter": "ناوەڕاست",
    "noteTableHAlignRight": "ڕاست",
    "noteTableVAlignTop": "سەرەوە",
    "noteTableVAlignMiddle": "ناوەڕاست",
    "noteTableVAlignBottom": "خوارەوە",
    "languageSpanish": "Español",
    "languageArabic": "العربية",
    "languageFrench": "Français",
    "languageRussian": "Русский",
    "languageGerman": "Deutsch",
    "languageTurkish": "Türkçe",
    "languageKurdish": "کوردی",
    "drawerTop": "سەرەوە",
    "drawerSide": "لەلایەوە",
    "expand": "کردنەوە",
    "Minimize": "بچووککردنەوە",
    "installModalSubtitle": "زیادی بکە بۆ شاشەی سەرەکی",
    "installModalClose": "تێگەیشتم",
    "settingsSubtitle": "زمان، ڕوانگە و کاردانەوەی بەرنامەکە ڕێکبخە.",
    "appSoundsLabel": "دەنگەکانی بەرنامە",
    "soundHapticsLabel": "دەنگی دوگمە و هەست",
    "soundHapticsCaption": "چالاککردنی دەنگی کلیک و لەرینەوە",
    "soundProfileLabel": "پرۆفایلی دەنگی دوگمە",
    "profileClassic": "کلاسیک",
    "profileSoft": "نەرم",
    "profileModern": "مۆدێرن",
    "profileClick": "کلیک",
    "profileSilent": "بێدەنگ",
    "speakerLabel": "قسەکەر / خوێندنەوە بە دەنگ",
    "speakerCaption": "کاتێک چالاکە، ئەنجامەکە دوای پەنجەدان بە = بە شێوەیەکی خۆکار خوێنراوە. کاتێک ناچالاکە، خوێندنەوەکە تەنها لە ڕێگەی دوگمەی قسەکەرەوە دەکرێت.",
    "modeGeneral": "حیسابکەری گشتی",
    "scientificToggle": "زانستی",
    "percentResultLabel": "ئەنجام",
    "currencyConverterTitle": "گۆڕینی دراو",
    "currencyConverterSubtitle": "بڕەکان بە شێوەیەکی خێرا بە نرخی ڕاستەوخۆ بگۆڕە.",
    "resetButton": "بەگەڕخستنەوە",
    "swapButton": "ئاڵوگۆڕ",
    "favoritesButton": "دڵخوازەکان",
    "recentButton": "نوێترین",
    "fromLabel": "لە",
    "toLabel": "بۆ",
    "convertedLabel": "گۆڕدراو",
    "bankRateMode": "🏦 نرخی بانک",
    "marketRateMode": "🏪 نرخی بازار",
    "marketRateFieldLabel": "نرخی ئاڵوگۆڕی بازار",
    "cachedLabel": "پاشەکەوتکراو",
    "refreshButton": "نوێکردنەوە",
    "globalDirectoryButton": "فەهرەستی جیهانی",
    "currencyDirectoryTitle": "فەهرەستی جیهانی دراوەکان",
    "currencyDirectorySubtitle": "دراوە کاغەزییەکان بە ناوی وڵات یان کۆدی دراو بگەڕە.",
    "currencySearchPlaceholder": "گەڕان بە وڵات یان کۆد",
    "drawerEyebrow": "",
    "drawerTitle": "EQ7",
    "drawerHistory": "مێژوو",
    "drawerNotes": "تێبینییەکان",
    "drawerPdf": "PDF",
    "pdfWorkspaceTitle": "PDF",
    "pdfCardScanTitle": "سکانکردن / دروستکردنی PDF",
    "pdfCardScanDesc": "لە بەڵگەکانەوە PDF دروست بکە",
    "pdfCardOpenTitle": "کردنەوەی PDF",
    "pdfCardOpenDesc": "دەستکاری PDF ی هەبوو",
    "pdfRecentTitle": "PDF ی نوێ",
    "pdfRecentEmpty": "هێشتا PDF ی نوێ نییە.",
    "pdfComingSoon": "لە نوێکردنەوەی داهاتوودا دێت.",
    "smartDocsTitle": "📄 بەڵگە ژیرەکان",
    "smartDocsDesc": "بەڵگەکانت لە پەڕەیەکی سەرەکییەوە بەڕێوەببە. ئامرازە نوێیەکان لێرە دەردەکەون.",
    "smartDocsHeading": "دەتەوێت چی بکەیت؟",
    "smartDocsStep1": "دەستپێکردن",
    "smartDocsStep2": "دەستکاری",
    "smartDocsStep3": "پێداچوونەوە",
    "smartDocsStep4": "دەرهێنان",
    "smartDocsCardScanTitle": "سکانکردنی بەڵگەیەک",
    "smartDocsCardScanDesc": "وێنەی کاغەزێک یان پەیماننامەیەک بگرە و بیکە بە ناوەڕۆکی دەستکاریکراو.",
    "smartDocsCardImportTitle": "هاواردنی فایل",
    "smartDocsCardImportDesc": "PDF یەک یان فایلێکی پشتگیریکراو لە ئامێرەکەت هەڵبژێرە.",
    "smartDocsCardNewTitle": "بەڵگەی نوێ",
    "smartDocsCardNewDesc": "پەڕەیەکی بەتاڵ بۆ دەستپێکردن لە سفرەوە.",
    "smartDocsCardTemplatesTitle": "قاڵبەکان",
    "smartDocsCardTemplatesDesc": "قاڵبی ئامادە بۆ دەستپێکردنی خێرا.",
    "smartTemplatesBusiness": "بازرگانی",
    "smartTemplatesPersonal": "تایبەت",
    "smartTemplatesCustom": "تایبەت",
    "smartTemplatesInvoice": "فاکتوور",
    "smartTemplatesQuote": "نرخنامە",
    "smartTemplatesPaymentAgreement": "ڕێکەوتنامەی پارەدان",
    "smartTemplatesServiceContract": "پەیماننامەی ڕاژە",
    "smartScanTitle": "📸 سکانکردنی بەڵگە",
    "smartScanEditHint": "دەتوانیت دەقی ناسینراو دەستکاری بکەیت پێش وەرگرتن.",
    "smartScanRescan": "سکانکردنەوە",
    "smartScanAccept": "وەرگرتنی ئەنجام",
    "smartScanStructTitle": "ساختە دۆزراوەکان",
    "smartScanReviewNote": "بەڵگە ناسینرا. دەقی ناوەڕۆکە بپێداچووە پێش دروستکردنی PDF.",
    "smartScanStatusNeeds": "پێویستی پێداچوونەوەیە",
    "smartScanStatusEdited": "دەستکاریکراو — ڕاستکردنەکانت لە PDF دا بەکاردەبرێن",
    "smartScanStructHeading": "سەرنووسە",
    "smartScanStructParagraph": "بەش",
    "smartScanStructTable": "خشتە",
    "smartScanStructNumber": "ژمارە",
    "smartScanStructDate": "بەروار",
    "smartScanStructField": "هەڵگە",
    "smartScanCameraUnavailable": "کامێرا لەسەر ئەم ئامێرە بەردەست نییە.",
    "smartScanPermissionDenied": "ڕێگا بە کامێراکە نەدرا.",
    "smartScanNoText": "هیچ دەق دۆز نەکراو. دووبارە هەوڵ بکە یان وێنەیەک زیاد بکە.",
    "smartScanOcrFailed": "خوێندنەوەی دەق شکستی خوارد. تکایە دووبارە هەوڵ بکەرەوە.",
    "smartScanAccepted": "ئەنجام وەرگیرا و ئامادەیە بۆ دەستکاری.",
    "smartScanEditTitle": "بەڵگەی دەستکاریکراو",
    "smartScanEditDocTitlePh": "ناونیشانی بەڵگە",
    "smartScanCreatePdf": "دروستکردنی PDF",
    "smartScanPdfCreating": "دروستکردنی PDF...",
    "smartScanPdfCreated": "PDF لە بەڵگەی دەستکاریکراوەوە دروستکرا.",
    "smartScanOfflinePdf": "ناتۆراو — کتێبخانەی PDF نەتوانرا باربکرێت.",
    "smartScanPdfFailed": "نەتوانرا PDF دروست بکەین.",
    "smartImportTitle": "📂 هاواردنی فایل",
    "pdfAddTitle": "زیادکردن بۆ PDF",
    "pdfAddText": "دەق",
    "pdfAddImage": "وێنە",
    "pdfAddLogo": "لۆگۆ",
    "pdfAddSignature": "واژۆ",
    "pdfAddStamp": "مۆر",
    "pdfAddDate": "بەروار",
    "pdfAddTable": "خشتە",
    "smartImportPickPrompt": "فایلی PDF یەک لە ئامێرەکەت هەڵبژێرە.",
    "smartImportChoose": "هەڵبژاردنی فایل",
    "smartImportPreparing": "ئامادەکردنی بەڵگە...",
    "smartImportAnalyzing": "شیکردنەوەی بەڵگەکە...",
    "smartImportScannedTitle": "بەڵگەی سکانکراو دۆزکرا",
    "smartImportScannedMsg": "واکوایە ئەم بەڵگە پەڕەی سکانکراوی لەخۆیەتی. دەتەوێت بە ناسینەوەی دەق بەکارببەیت؟",
    "smartImportUseOcr": "بەکارهێنانی ناسینەوە",
    "smartImportKeepImages": "پاشەکەوتکردنی پەڕەکان وەک وێنە",
    "smartImportOcrProcessing": "ناوەڕۆکی ناسینەوە...",
    "smartImportFailed": "شکستی لە هاواردن",
    "smartImportRetry": "دووبارە هەوڵکردنەوە",
    "smartImportInvalidFile": "ئەم فایلە PDF ی ڕەوای نییە. تکایە فایلی PDF هەڵبژێرە.",
    "smartImportCorrupt": "واکوایە PDF یەکە بەرایشێکی هەیە یان نەتوانرا بخوێنرێت. تکایە فایلێکی تر هەڵبژێرە.",
    "smartImportEmpty": "ئەم بەڵگە هیچ ناوەڕۆکی بەکارهێنراوی نییە.",
    "smartImportOcrFailed": "ناسینەوەی دەق شکستی خوارد. تکایە دووبارە هەوڵ بکەرەوە.",
    "smartEditorTitle": "دەستکاریکەر",
    "smartEditorHint": "ناوەڕۆکی بەڵگە",
    "smartEditorPlaceholder": "ناوەڕۆکی هاواردکراو لێرە دەردەکەوێت...",
    "smartToolbarDefault": "بەڵگەی نوێ",
    "smartToolbarUndo": "گەڕانەوە",
    "smartToolbarRedo": "دووبارەکردنەوە",
    "smartToolbarBold": "قەڵەو",
    "smartToolbarItalic": "لاری",
    "smartToolbarUnderline": "ژێرهێڵ",
    "smartDocumentBackLabel": "بەڵگە ژیرەکان",
    "smartToolbarAdd": "زیادکردن",
    "smartAddHeading": "سەرنووسە",
    "smartAddNewPage": "پەڕەی نوێ",
    "smartPageDesignNone": "بێ سنوور",
    "smartPageDesignSimple": "ئاسان",
    "smartPageDesignClassic": "کلاسیک",
    "smartPageDesignFormal": "فەرمی",
    "smartPageDesignModern": "مۆدێرن",
    "smartSigDraw": "وێنەکێشان",
    "smartSigType": "نووسین",
    "smartSigImage": "وێنە",
    "smartSigInsert": "زیادکردن",
    "smartSigClear": "سڕینەوە",
    "smartSigCancel": "هەڵوەشاندنەوە",
    "smartSigNamePh": "ناوت",
    "smartSigChoose": "وێنەی واژۆکەت هەڵبژێرە",
    "smartSigStatusSigned": "✓ واژۆکراو",
    "smartSigStatusModified": "⚠ بەڵگەکە دوای واژۆکردن گۆڕدراوە",
    "smartSigResign": "دووبارە واژۆکردنەوە",
    "smartTextFont": "فۆنت",
    "smartTextSize": "قەبارە",
    "smartTextFontDefault": "بنەمایی",
    "smartTextBold": "قەڵەو",
    "smartTextItalic": "لاری",
    "smartTextUnderline": "ژێرهێڵ",
    "smartTextAlignLeft": "ڕێکخستن بۆ چەپ",
    "smartTextAlignCenter": "ناوەڕاست",
    "smartTextAlignRight": "ڕێکخستن بۆ ڕاست",
    "smartTextDirection": "ئاڕاستەکردن",
    "smartTextDirAuto": "خۆکار",
    "smartTextDirLtr": "LTR",
    "smartTextDirRtl": "RTL",
    "smartTextSpacing": "بۆشایی ڕیزەکان",
    "smartToolbarText": "دەق",
    "smartToolbarTable": "خشتە",
    "smartTableRows": "ڕیزەکان",
    "smartTableColumns": "ستوونەکان",
    "smartTableCreate": "دروستکردنی خشتە",
    "smartTableAddRow": "زیادکردنی ڕیز",
    "smartTableDelRow": "سڕینەوەی ڕیز",
    "smartTableAddCol": "زیادکردنی ستوون",
    "smartTableDelCol": "سڕینەوەی ستوون",
    "smartTableAlignLeft": "ڕێکخستن بۆ چەپ",
    "smartTableAlignCenter": "ناوەڕاست",
    "smartTableAlignRight": "ڕێکخستن بۆ ڕاست",
    "smartToolbarSignature": "واژۆ",
    "smartToolbarMore": "زیاتر",
    "smartToolbarImage": "وێنە",
    "smartImageDelete": "سڕینەوەی وێنە",
    "smartToolbarLogo": "لۆگۆ",
    "smartLogoPosition": "شوێنی لۆگۆ",
    "smartLogoTopRight": "لەسەر بۆ ڕاست",
    "smartLogoTopLeft": "لەسەر بۆ چەپ",
    "smartLogoCenter": "ناوەڕاست",
    "smartToolbarDivider": "جیاکەرەوە",
    "smartToolbarBorder": "سنوور",
    "smartToolbarPage": "پەڕە",
    "smartToolbarPageNumber": "ژمارەی پەڕە",
    "smartToolbarPageSettings": "ڕێکخستنەکانی پەڕە",
    "smartBlankNavPage": "پەڕە",
    "smartBlankNavPrev": "پێشوو",
    "smartBlankNavNext": "دواتر",
    "smartPageAdd": "زیادکردنی پەڕە",
    "smartPageCopy": "کۆپیکردنی پەڕە",
    "smartPageDelete": "سڕینەوەی پەڕە",
    "smartToolbarSave": "پاشەکەوتکردن",
    "smartSavedToast": "بەڵگە پاشەکەوتکرا",
    "smartPdfTextColor": "ڕەنگی دەق",
    "smartPdfStyle": "شێواز",
    "smartPdfStyleNone": "بێ شێواز",
    "smartPdfStyleSimple": "ئاسان",
    "smartPdfStyleBusiness": "بازرگانی",
    "smartPdfStyleAcademic": "ئەکادیمی",
    "smartPdfStyleEngineering": "ئەندازیاری",
    "smartPdfAdd": "زیادکردن",
    "smartPdfAddText": "دەق",
    "smartPdfAddImage": "وێنە",
    "smartPdfAddLogo": "لۆگۆ",
    "smartPdfAddSignature": "واژۆ",
    "smartPdfAddStamp": "مۆر",
    "smartPdfAddDate": "بەروار",
    "smartPdfAddTable": "خشتە",
    "smartPdfMark": "نیشانەکردن",
    "smartPdfMarkHighlight": "بەرچاوکردن",
    "smartPdfMarkUnderline": "ژێرهێڵکردن",
    "smartPdfMarkDraw": "وێنەکێشان",
    "smartPdfMarkComment": "لێدوان",
    "smartPdfMarkDone": "تەواو",
    "smartPdfMarkCancel": "هەڵوەشاندنەوە",
    "smartPdfCommentTitle": "لێدوان",
    "smartPdfCommentText": "دەقی لێدوان",
    "smartPdfCommentAdd": "زیادکردنی لێدوان",
    "smartPdfMarkSelectText": "پێشوو دەقەکە هەڵبژێرە بۆ نیشانەکردن",
    "smartPdfMarkDrawHint": "لەسەر پەڕەکە وێنە بکێشە",
    "smartPdfMarkCommentLabel": "دەقی لێدوان",
    "smartPdfMarkAddComment": "زیادکردنی لێدوان",
    "pdfTblRow": "زیادکردنی ڕیز",
    "pdfTblRowDel": "سڕینەوەی ڕیز",
    "pdfTblCol": "زیادکردنی ستوون",
    "pdfTblColDel": "سڕینەوەی ستوون",
    "pdfTblAlignL": "چەپ",
    "pdfTblAlignC": "ناوەڕاست",
    "pdfTblAlignR": "ڕاست",
    "pdfTblBold": "قەڵەو",
    "pdfTblItalic": "لاری",
    "pdfTblTextColor": "ڕەنگی دەق",
    "pdfTblBg": "پاشینەوان",
    "pdfTblBorder": "ڕەنگی سنوور",
    "pdfTblNoBorder": "بێ سنوور",
    "pdfTblRowH": "بەرزی ڕیز",
    "pdfTblControls": "کۆنترۆڵەکانی خشتە",
    "smartPdfPages": "پەڕەکان",
    "pdfPgAdd": "زیادکردنی پەڕە",
    "pdfPgDel": "سڕینەوەی پەڕە",
    "pdfPgRot": "سووڕاندنەوە",
    "pdfPgDup": "کۆپیکردن",
    "pdfPgAdded": "پەڕە زیادکرا",
    "pdfPgDeleted": "پەڕە سڕایەوە",
    "pdfPgRotated": "سووڕاندراوە",
    "pdfPgDuplicated": "پەڕە کۆپیکرا",
    "pdfPgLast": "بەڵگە دەبێت بەلایەنی کەم لە یەک پەڕەی تێبکەی",
    "smartSaveFailed": "نەتوانرا پاشەکەوتبکەین. تکایە دووبارە هەوڵ بکەرەوە.",
    "smartUnsavedTitle": "دەتەوێت گۆڕانکارییەکانت پاشەکەوتبکەیت پێش دەرچوون؟",
    "smartReviewButton": "پێداچوونەوە",
    "smartReviewExit": "گەڕانەوە بۆ دەستکاری",
    "smartPdfExportButton": "دەرهێنانی PDF",
    "smartPdfExportTitle": "دەرهێنانی PDF",
    "smartPdfExportFilenameLabel": "ناوی فایل",
    "smartPdfExportPagesLabel": "پەڕەکان",
    "smartPdfExportAllPages": "هەموو پەڕەکان",
    "smartPdfExportCurrentPage": "پەڕەی ئێستا",
    "smartPdfExportQualityLabel": "کوالیتی",
    "smartPdfExportNormal": "ئاسایی",
    "smartPdfExportHigh": "بەرز",
    "smartPdfExportDo": "دەرهێنان",
    "smartPdfExportCancel": "هەڵوەشاندنەوە",
    "smartPdfExportSuccess": "PDF بە سەرکەوتووی دەرهێنرا.",
    "smartPdfExportFailed": "دروستکردنی PDF شکستی خوارد.",
    "smartPdfPreparing": "ئامادەکردنی بەڵگە...",
    "smartPdfPrepareFailed": "نەتوانرا PDF ئامادە بکەین. تکایە دووبارە هەوڵ بکەرەوە.",
    "smartPdfResultTitle": "بەڵگە بە سەرکەوتووی دروستکرا",
    "smartPdfResultFileLabel": "فایل",
    "smartPdfOpen": "کردنەوەی PDF",
    "smartPdfShare": "هاوبەشکردن",
    "smartPdfSend": "ناردن",
    "smartPdfClose": "داخستن",
    "smartPdfShareUnsupported": "هاوبەشکردنی ڕاستەوخۆ لەسەر ئەم ئامێرە پشتگیر نییە. PDF یەکە دابەزیرکرا.",
    "smartPdfShareCancelled": "هاوبەشکردن هەڵوەشایەوە.",
    "smartPdfShareFailed": "هاوبەشکردن شکستی خوارد. PDF یەکە دابەزیرکرا.",
    "smartPdfOpenFailed": "نەتوانرا PDF یەکە لەم براوسەرەدا بکەینەوە.",
    "smartPdfPreviewTitle": "پێشبینین",
    "smartPdfPreviewNote": "ئەمە ئەو فایلەیە کە دەپاشەکەوتکرێت.",
    "smartUnsavedSave": "پاشەکەوتکردن",
    "smartUnsavedExit": "دەرچوون بەبێ پاشەکەوتکردن",
    "smartUnsavedCancel": "هەڵوەشاندنەوە",
    "smartUnsavedNewTitle": "گۆڕانکارییە پاشەکەوتنەکراوەکانت هەیە.",
    "smartUnsavedSaveContinue": "پاشەکەوتکردن و بەردەوامبوون",
    "smartUnsavedStartNew": "دەستپێکردنی بەڵگەی نوێ",
    "smartSaveAndContinueFailed": "پاشەکەوتکردن شکستی خوارد. گۆڕانکارییەکانت لەدەست نەچوون.",
    "smartDraftBannerTitle": "پێشنووس لەسەر ئەم ئامێرە پاشەکەوتکرا",
    "smartDraftResume": "بەردەوامبوون لە پێشنووس",
    "smartDraftsTitle": "پێشنووسەکانت",
    "smartDraftsEmpty": "هێشتا هیچ پێشنووسێک پاشەکەوت نەکراوە",
    "smartDraftsNewDoc": "بەڵگەی بەتاڵ",
    "smartDraftResumeBtn": "بەردەوامبوون لە دەستکاری",
    "smartDraftDeleteBtn": "سڕینەوە",
    "smartDraftDelTitle": "ئەم پێشنووسە بسڕەوە؟",
    "smartDraftDelConfirm": "سڕینەوە",
    "smartRelNow": "ئێستا",
    "smartRelMin": "خولەکێک پێش ئێستا",
    "smartRelMins": "{n} خولەک پێش ئێستا",
    "smartRelHour": "کاتژمێرێک پێش ئێستا",
    "smartRelHours": "{n} کاتژمێر پێش ئێستا",
    "smartRelYesterday": "دوێنێ",
    "smartRelDays": "{n} ڕۆژ پێش ئێستا",
    "drawerConverter": "گۆڕەری ڕاستەوخۆی دراو",
    "drawerDirectory": "فەهرەست و گەڕانی جیهانی دراو",
    "drawerInstall": "دامەزراندنی بەرنامە",
    "drawerSettings": "ڕێکخستنەکان",
    "installModalTitle": "دامەزراندن لە ئایفۆن",
    "installModalStep1": "هەنگاوی 1: دوگمەی هاوبەشکردن (⎘ / ⇡) لە بن یان سەری براوسەرەکە دابگرە.",
    "installModalStep2": "هەنگاوی 2: لە لێستەکە \"زیادکردن بۆ شاشەی سەرەکی\" هەڵبژێرە.",
    "currencyOptionSearch": "گەڕانی دراو",
    "currencyOptionPrices": "نرخە ڕاستەوخۆییەکان",
    "featureRequiresInternet": "ئەم تایبەتمەندییە پێویستی بە پەیوەندی ئینتەرنێت هەیە.",
    "currencyOptionConvert": "گۆڕینی دراو",
    "currencyOptionFavorites": "دراوە دڵخوازەکان",
    "currencyFavoritesTitle": "دڵخوازەکان",
    "currencyFavoritesEmpty": "هێشتا هیچ دراوێکی دڵخواز نییە",
    "currencyFavoritesEmptyHint": "ئەستێرەکە لەسەر هەر دراوێک دابگرە بۆ زیادکردنی لێرە",
    "currencyOptionCustomRate": "گۆڕین بە نرخی تایبەت",
    "customRateTitle": "گۆڕین بە نرخی تایبەت",
    "customRateFieldLabel": "نرخی ئاڵوگۆڕ",
    "currencyRatesTitle": "نرخەکانی دراو",
    "currencyRatesSearchPlaceholder": "گەڕان بە دراو یان کۆد",
    "currencyRatesEmpty": "هیچ دراو دۆز نەکرا",
    "currencyRatesLoading": "بارکردنی نرخەکان...",
    "recentlyDeletedTitle": "نوێترین سڕدراوەکان",
    "emptyNotesText": "هێشتا هیچ تێبینییەک نییە",
    "emptyNotesAction": "+ تێبینی نوێ",
    "searchNotesPlaceholder": "گەڕان لەناو تێبینییەکان...",
    "recentNotesLabel": "نوێترین",
    "sortNewest": "نوێترین",
    "sortOldest": "کۆنترین",
    "sortAz": "ئا–ز",
    "renameNote": "گۆڕینی ناو",
    "duplicateNote": "کۆپیکردن",
    "pinNote": "پینکردن",
    "unpinNote": "لابردنی پین",
    "noteMoreActions": "کردارە زیاترەکان",
    "noteNamePrompt": "ناوی تێبینی:",
    "noteEmptyName": "ناوی تێبینی نابێت بەتاڵ بێت.",
    "copySuffix": " (کۆپی)",
    "noNotesFound": "هیچ تێبینی دۆز نەکرا",
    "createFirstNote": "یەکەم تێبینیت دروست بکە",
    "updatedToday": "ئەمڕۆ نوێکراوە",
    "updatedYesterday": "دوێنێ نوێکراوە",
    "updatedDaysAgo": "{n} ڕۆژ پێش ئێستا نوێکراوە",
    "notePinnedToast": "تێبینی پینکرا",
    "noteUnpinnedToast": "پینی تێبینی لابرا",
    "noteTextStyleLabel": "شێوازی دەق",
    "noteStyleNormalLabel": "دەق",
    "noteBasicLabel": "بنەرایی",
    "noteAlignLabel": "ڕێکخستن",
    "noteFontSizeLabel": "قەبارەی فۆنت",
    "noteFontSmallLabel": "بچووک",
    "noteFontNormalLabel": "ئاسایی",
    "noteFontLargeLabel": "گەورە",
    "noteColorsLabel": "ڕەنگەکان",
    "notePresetsLabel": "پێشڕێکخستنەکان",
    "presetSimple": "ئاسان",
    "presetAcademic": "ئەکادیمی",
    "presetBusiness": "بازرگانی",
    "presetEngineering": "ئەندازیاری",
    "presetModern": "مۆدێرن",
    "noteStylesLabel": "شێوازەکان",
    "noteStyleSimple": "ئاسان",
    "noteStyleAcademic": "ئەکادیمی",
    "noteStyleBusiness": "بازرگانی",
    "noteStyleEngineering": "ئەندازیاری",
    "noteStyleModern": "مۆدێرن",
    "noteStyleNone": "هیچ",
    "noteFramesLabel": "چارچێوە",
    "noteFrameNone": "هیچ",
    "noteFrameClassic": "کلاسیک",
    "noteFrameDashed": "هێڵی بشکاو",
    "noteFrameSoft": "نەرم",
    "pdfExportTitle": "دەرهێنانی PDF",
    "pdfExportStyle": "شێواز",
    "pdfExportTitleLabel": "ناونیشان",
    "pdfExportTitlePh": "ناونیشانی تێبینی (هەڵبژارە)",
    "pdfExportDate": "بەروار",
    "pdfExportCompany": "پڕۆفایلی کۆمپانیا بەکاربهێنە",
    "pdfExportPreview": "پێشبینین",
    "pdfExportCreate": "دروستکردنی PDF",
    "pdfExportClose": "داخستنی دەرگەی دەرهێنان",
    "noteSavedLabel": "پاشەکەوتکرا ✓",
    "emptyDeletedText": "هیچ تێبینی سڕدراو نییە",
    "deleteConfirmTitle": "بە تەواوی بسڕەوە؟",
    "deleteConfirmText": "ئەم کردارە ناتوانرێت بەگەڕبکەیتەوە.",
    "cancelBtn": "هەڵوەشاندنەوە",
    "deletePermanentBtn": "سڕینەوە",
    "doneBtn": "تەواو",
    "deleteNoteBtn": "سڕینەوەی تێبینی",
    "restoreBtn": "گەڕاندنەوە",
    "unfiled": "بێ فۆڵدەر",
    "folderNamePrompt": "ناوی فۆڵدەر:",
    "folderEmptyName": "ناوی فۆڵدەر نابێت بەتاڵ بێت.",
    "folderDuplicateName": "فۆڵدەرێک بەم ناوەکە پێشتر هەیە.",
    "renameFolder": "گۆڕینی ناوی فۆڵدەر",
    "deleteFolder": "سڕینەوەی فۆڵدەر",
    "folderDeleteConfirmTitle": "فۆڵدەرەکە بسڕەوە؟",
    "helpTitle": "یارمەتی و دەربارەی بەرنامە",
    "helpSubtitle": "فێربە کە دەتوانیت چۆن EQ7 بەکارببەیت و تایبەتمەندییەکانت دۆز بکەیتەوە.",
    "helpAboutTitle": "دەربارەی بەرنامەکە",
    "helpAboutDesc": "EQ7 حیسابکەرییەکی ژیر، گشتییە کە بیرکاری ژمارەی ڕۆژانە، ئامرازە زانستی و سەدا، گۆڕینی دراو و زۆر شتی تر لەناو یەک بەرنامەی ئاسان، بەکارهێنانی سادەدا تێکەڵ دەکات.",
    "helpWhyTitle": "بۆچی EQ7 دروستکرا؟",
    "helpWhyDesc": "بیرۆکەکە ئاسانە: یەک حیسابکەر لەجیاتی زۆر حیسابکەر، بۆ خێرایی، ڕوونی و بەکارهێنانی ڕۆژانە دروستکراوە.",
    "helpWhyL1": "حیسابی خێرای ڕۆژانە",
    "helpWhyL2": "ئامرازە زانستییەکان وەک ڕەگی چوارگۆشە، توان و باڕانتیز",
    "helpWhyL3": "حیسابکردنی ئاسانی سەدا",
    "helpWhyL4": "گۆڕینی دراو و نرخە ڕاستەوخۆییەکان",
    "helpWhyL5": "تێبینییەکان و مێژووی حیسابکردن",
    "helpWhyL6": "ئاسان، ڕوون و خێرا لە بەکارهێنان",
    "helpWhyL7": "وەک بەرنامەیەکی دامەزراندنکراو (PWA) لەسەر ئامێرە جیاوەکان کاردەکات",
    "helpSectionsTitle": "ڕونکردنەوەی بەشی بەرنامەکە",
    "helpSecGeneralTitle": "حیسابکەری گشتی",
    "helpSecGeneralDesc": "حیسابکەری سەرەکی بۆ کردارە ڕۆژانەییەکان: کۆکردنەوە، دەرکردن، لێکدان و دابەشکردن.",
    "helpSecGeneralEx": "نموونە: 12 + 7 = 19.",
    "helpSecScientificTitle": "ئامرازە زانستییەکان",
    "helpSecScientificDesc": "\"زانستی\" دابگرە بۆ بەکارهێنانی دوگمەی ڕەگی چوارگۆشە، توان و باڕانتیز لەناو هەمان حیسابکەرەکە.",
    "helpSecScientificEx": "نموونە: √9 = 3، 2^3 = 8.",
    "helpSecPercentTitle": "حیسابکەری سەدا",
    "helpSecPercentDesc": "بە خێرایی سەدایەکی بڕێک لە بەبێ هەنگاوی زیاتری بدۆزەوە.",
    "helpSecPercentEx": "نموونە: ٪15 لە 200 = 30.",
    "helpSecHistoryTitle": "مێژوو",
    "helpSecHistoryDesc": "EQ7 ئەوەی لە ماوەی 24 کاتژمێری ڕابردووت حیسابتکردە، بیری دەکاتەوە بۆ ئەوەی بپێداچوویتەوە یان هاوبەشی بکەیت.",
    "helpSecNotesTitle": "تێبینییەکان",
    "helpSecNotesDesc": "تێبینی خێراکان پاشەکەوتبکە، لەناو فۆڵدەرەکاندا ڕێکیبخە و لە سەرنووسەری تەواوی شاشەدا دەستکاریان بکە.",
    "helpSecCurrencyTitle": "ئامرازەکانی دراو",
    "helpSecCurrencyDesc": "دراوەکان بگەڕە، نرخە ڕاستەوخۆییەکان ببینە، لەنێوان دراوەکاندا بگۆڕە، نرخی تایبەت بەکاربهێنە و دڵخوازەکانت بپارێزە.",
    "helpSecSettingsTitle": "ڕێکخستنەکان",
    "helpSecSettingsDesc": "زمان، ڕوانگە و کاردانەوەی دەنگی بەرنامەکە بە شێوەی خۆت بگۆڕە.",
    "helpButtonsTitle": "چۆنیەتی بەکارهێنانی حیسابکەرەکە",
    "helpBtnNumbers": "دابگرە بۆ نووسینی ژمارەکان.",
    "helpBtnAdd": "ژمارەی دواتری زیاد دەکات.",
    "helpBtnSub": "ژمارەی دواتری دەربدەکات.",
    "helpBtnMul": "بە ژمارەی دواتری لێکی دەکات.",
    "helpBtnDiv": "بە ژمارەی دواتری دابەشی دەکات.",
    "helpBtnEquals": "ئەنجامەکە نیشان دەکات.",
    "helpBtnAc": "هەموو شتێک سڕدەکاتەوە و لە سفرەوە دەستپێدەکات.",
    "helpBtnBack": "دوایین ژمارەکەی کە نووسیتەت سڕدەکاتەوە.",
    "helpBtnDecimal": "خاڵی دەسییەک زیاد دەکات.",
    "helpBtnScientific": "زانستی / سەدا: ئامرازە زیاترەکان دەگرێت و بیان دەگرێت.",
    "helpBtnSpeak": "ئەنجامی ئێستاکە بە دەنگ دەیخوێنێتەوە.",
    "helpSettingsExplainTitle": "ڕێکخستنەکان",
    "helpSetLanguage": "زمان: تەواوی بەرنامەکە لەنێوان زمانە بەردەستەکاندا دەگۆڕێت.",
    "helpSetTheme": "ڕوانگە: الأسود والبرتقالي یان الفحمي والفيروزي یان الرصاصي الصخري یان الفاتح النظيف هەڵبژێرە.",
    "helpSetSoundsTitle": "دەنگەکانی بەرنامە: سوییچە سەرەکییەکەی دەنگ و کاردانەوەی هەست.",
    "helpSetSoundsDesc": "کاتێک دەنگەکانی بەرنامە چالاکە، دەنگی دوگمە و لەرینەوە ڕێگەپێدراوە. کوژاندنەوەکەی دەنگەکانەکە خاو دەکات و دووبارە چالاککردنەوەکەی ڕێگەی پێدەکات.",
    "helpSetSoundsSpeech": "قسەکردن/TTS جیا لە دەنگەکانی بەرنامەیە و لەلایەن کوژاندنەوەی دەنگەکانەکوە ناکوژرێتەوە.",
    "helpCurrencyTitle": "گۆڕەری دراو",
    "helpCurrencyDesc": "دراوەکەی کە لەسەرەتە (لە) و ئەوەی کە دەتەوێت (بۆ) هەڵبژێرە، دوای ئەوە بڕێک بنووسە.",
    "helpCurrencySwap": "دوگمەی ئاڵوگۆڕ بەکاربهێنە بۆ پێچەوانەکردنی دوو دراوەکە.",
    "helpCurrencyFavorites": "ئەستێرەکە بەکاربهێنە بۆ نیشانەکردنی دراوێک وەک دڵخواز، و لە لێستەی دراوەکانەوە دڵخوازەکان بکەرەوە.",
    "helpCurrencyCustomRate": "گۆڕین بە نرخی تایبەت ڕێگات دەکات بۆ ناوەکانت خۆت بنووسیت.",
    "helpCurrencyLive": "نرخە ڕاستەوخۆییەکان لە ڕاژەی ئۆنلاینەوە دێن؛ ئەگەر بەردەست نەبوون، ڕەنگە نرخە پاشەکەوتکراوەکان بەکاربهێنرێن.",
    "helpInstallTitle": "دامەزراندن و ئۆفلاین",
    "helpInstallDesc1": "دەتوانیت EQ7 وەک بەرنامەیەک لەسەر ئامێرە پشتگیرکراوەکاندا دامەزەری.",
    "helpInstallDesc2": "هەندێک لە تایبەتمەندییەکان بە بەکارهێنانی سەرچاوە پاشەکەوتکراوەکان بە شێوەی ئۆفلاین کاردەکەن، بەڵام نرخە ڕاستەوخۆییەکان و نوێکردنەوەکانی بەرنامە پێویستی بە پەیوەندی ئینتەرنێت هەیە.",
    "helpBenefitsTitle": "بۆچی EQ7 بەکاربهێنیت؟",
    "helpBenefit1": "حیسابکەری هەموو لەناو یەک",
    "helpBenefit2": "حیسابی خێرای ڕۆژانە",
    "helpBenefit3": "ئامرازە زانستی و سەدا",
    "helpBenefit4": "گۆڕینی دراو",
    "helpBenefit5": "مێژوو و تێبینییەکان",
    "helpBenefit6": "ڕووکاری فرەزمان",
    "helpBenefit7": "شێوازی وەڵامدەر و پشتگیری PWA",
    "helpLangTitle": "زمانەکان",
    "helpLangDesc": "EQ7 بە تەواوی وەرگێڕدراوە. زمانەکەت لە باڕی سەرەکی یان لە ڕێکخستنەکاندا هەڵبژێرە، و تەواوی بەرنامەکە — لەگەڵ ئەم پەڕەی یارمەتییەوە — دەستبەجێ نوێدەکاتەوە.",
    "smartTemplatesSimpleAgreement": "ڕێکەوتنامەی ئاسان",
    "smartTemplatesPaymentReceipt": "وەسڵی پارەدان",
    "smartTemplatesRentalAgreement": "ڕێکەوتنامەی کرێ",
    "smartTemplatesMyTemplates": "قاڵبەکانی من",
    "smartScanCapture": "گرتن",
    "smartScanUploadFallback": "لەجیاتی ئەوە وێنەیەک لە ئامێرەکەت هەڵبژێرە",
    "smartScanDetecting": "دۆزینەوەی بەڵگە",
    "smartScanCorrecting": "ڕاستکردنەوەی وێنە",
    "smartScanImproving": "باشترکردنی وێنە",
    "smartScanReading": "خوێندنەوەی دەق",
    "smartScanProcessing": "پرۆسێسکردن...",
    "smartScanReviewTitle": "پێداچوونەوەی ئەنجامی ناسینەوە",
    "smartScanPreviewLabel": "بەڵگەی پرۆسێسکراو",
    "smartUntitledDoc": "بەڵگەی بێ ناونیشان",
    "smartBlankNavOf": "لە",
    "smartPdfSave": "پاشەکەوتکردنی PDF",
    "currencyRatesError": "نرخەکان بەردەست نین",
    "folderDeleteConfirmText": "تێبینییەکانی ناو ئەم فۆڵدەرە دەگوازرێنەوە بۆ بەشی بێ فۆڵدەر و دەپارێزرێن.",
  }
};

// ============================================================
// STATE
// ============================================================
const state = {
  locale: 'en',
  theme: 'oled',
  currentExpression: '',
  waitingForOperand: false,
  lastInputWasEquals: false,
  currentOperator: null,
  previousOperand: null,
  history: [],
  notes: [],
  quickNotes: [],
  folders: [],
  activeFolder: null,
  noteData: { notes: [], folders: [], activeFolder: null },
  percentPanelOpen: false,
  scientificPanelOpen: false,
  soundEnabled: true,
  appSoundEnabled: true,
  soundProfile: 'classic',
  speakerEnabled: true,
  hasPressedEquals: false,
  displayValue: '0',
  expression: '',
  pendingOperator: null,
  storedValue: null,
  startNewNumber: true,
  historyCountdownTimer: null,
  noteSaveTimer: null,
    currentOpenNote: null,
  noteTableFocus: null,
  // PHASE 2: explicit multi-cell selection for Merge Cells.
  // { cells: [td], tableWrap: <div.note-table-wrap>, anchorCell: <td> } | null
  noteTableCellSelection: null,
  currentNotesView: 'notes', // 'notes' | 'deleted'
  noteSearch: '', // N02 — Notes Home live search query
  noteSort: 'newest', // N02 — 'newest' | 'oldest' | 'az'
  pendingDeleteNoteId: null,
  isRTL: false,
  rates: null,
  ratesLastUpdated: null,
  ratesStatus: 'loading',
  converterMode: 'bank',
  marketRate: null,
  currencyFrom: null,
  currencyTo: null,
  currentQuickNotesTab: 'all'
};

// Legacy aliases
const history = {
  entries: []
};

const quickNotes = [];

// Legacy persist/load aliases for storage
const NOTE_STORAGE_KEY = 'eq-notes';
const QUICK_NOTES_KEY = 'eq-quick-notes';
const FOLDERS_KEY = 'eq-note-folders';
const NOTES_MANAGER_KEY = 'eq-note-manager-notes';
const LANGUAGE_KEY = 'eq-language';
const THEME_KEY = 'eq-theme';
const HISTORY_KEY = 'eq-history';
const APP_SOUND_KEY = 'eq-app-sound';
const SOUND_MODE_KEY = 'eq-sound-mode';
const SOUND_PROFILE_KEY = 'eq-sound-profile';
const SPEAKER_KEY = 'eq-speaker';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function showToast(message, duration = 1600) {
  if (typeof document === 'undefined') return;
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function showClipboardToast(message) {
  showToast(message, 2000);
}

// ============================================================
// PART 21 — OFFLINE-FIRST
// Smart Documents features are fully local (DOM/localStorage), so they run
// unchanged without internet. Only genuinely network-dependent features
// (live currency rates, CDN-loaded PDF library) get clear, translated,
// non-blocking feedback when used offline. No alert()/confirm()/prompt(),
// no infinite loading, no freeze.
// ============================================================
function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}
function internetRequiredMessage() {
  const t = translations[state.locale] || translations.en;
  return t.featureRequiresInternet || 'This feature requires an internet connection.';
}
function showInternetRequiredToast() {
  showToast('⚠ ' + internetRequiredMessage(), 2600);
}

function triggerButtonFeedback() {
  // App Sounds master switch must be ON and the individual sound mode must be
  // enabled for button feedback (click sound + haptics) to fire. Speech/TTS is
  // completely unaffected by this switch.
  if (!state.appSoundEnabled || !state.soundEnabled) return;
  playButtonSound(state.soundProfile);
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  } catch (e) { /* ignore */ }
}

// ============================================================
// APP SOUND PROFILES (Button click sounds)
// Small, dependency-free Web Audio blips. Each profile just tweaks
// the waveform, pitch, length and number of steps. 'silent' plays nothing.
// ============================================================
const SOUND_PROFILES = {
  classic: { type: 'square', freq: 620, duration: 0.07, gain: 0.04, steps: 1 },
  soft: { type: 'sine', freq: 430, duration: 0.12, gain: 0.03, steps: 1 },
  modern: { type: 'sine', freq: 740, duration: 0.05, gain: 0.035, steps: 2, stepFreq: 80 },
  click: { type: 'square', freq: 1300, duration: 0.03, gain: 0.02, steps: 1 },
  silent: null
};

let buttonAudioContext = null;

function getButtonAudioContext() {
  try {
    if (typeof window === 'undefined') return null;
    if (!buttonAudioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      buttonAudioContext = new AC();
    }
    if (buttonAudioContext.state === 'suspended') {
      buttonAudioContext.resume().catch(() => {});
    }
    return buttonAudioContext;
  } catch (e) { return null; }
}

function playButtonSound(profile) {
  const cfg = SOUND_PROFILES[profile] || SOUND_PROFILES.classic;
  if (!cfg) return; // silent profile
  const ctx = getButtonAudioContext();
  if (!ctx) return;
  try {
    const steps = cfg.steps || 1;
    const stepGap = 0.05;
    for (let i = 0; i < steps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.type;
      osc.frequency.value = cfg.freq + (i * (cfg.stepFreq || 0));
      const now = ctx.currentTime + (i * stepGap);
      gain.gain.setValueAtTime(cfg.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + cfg.duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + cfg.duration + 0.02);
    }
  } catch (e) { /* ignore */ }
}

// ============================================================
// APP SOUND + SPEAKER PREFERENCES (persistence)
// ============================================================
function loadSoundPreferences() {
  try {
    const appSound = localStorage.getItem(APP_SOUND_KEY);
    if (appSound !== null) state.appSoundEnabled = appSound === 'true';
    const soundMode = localStorage.getItem(SOUND_MODE_KEY);
    if (soundMode !== null) state.soundEnabled = soundMode === 'true';
    const profile = localStorage.getItem(SOUND_PROFILE_KEY);
    if (profile && Object.prototype.hasOwnProperty.call(SOUND_PROFILES, profile)) {
      state.soundProfile = profile;
    }
    const speaker = localStorage.getItem(SPEAKER_KEY);
    if (speaker !== null) state.speakerEnabled = speaker === 'true';
  } catch (e) { /* ignore */ }
}

function saveSoundPreferences() {
  try {
    localStorage.setItem(APP_SOUND_KEY, String(state.appSoundEnabled));
    localStorage.setItem(SOUND_MODE_KEY, String(state.soundEnabled));
    localStorage.setItem(SOUND_PROFILE_KEY, state.soundProfile);
  } catch (e) { /* ignore */ }
}

function saveSpeakerPreference() {
  try {
    localStorage.setItem(SPEAKER_KEY, String(state.speakerEnabled));
  } catch (e) { /* ignore */ }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  let num;
  try {
    if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
      num = new Decimal(value.toString());
    } else {
      num = new Decimal(String(value));
    }
  } catch (e) {
    // Non-numeric value (e.g. a scientific expression string like "sqrt(3)" or "3^2"):
    // render it as-is instead of crashing the display pipeline.
    return String(value);
  }
  const str = num.toString();
  // Expand scientific notation for display
  let expanded;
  try {
    expanded = num.toFixed && !str.includes('e') && !str.includes('E') ? str : String(num);
  } catch (e) {
    expanded = str;
  }
  // Add thousands separators to integer part
  const [whole, fraction] = expanded.split('.');
  const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction !== undefined ? `${formattedWhole}.${fraction}` : formattedWhole;
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  } catch (e) {
    return String(value);
  }
}

function formatRemainingTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (typeof navigator.platform === 'string' && /Mac/.test(navigator.platform) && navigator.maxTouchPoints > 1);
}

function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function getLocaleFromStorage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) || 'en';
  } catch (e) {
    return 'en';
  }
}

// ============================================================
// CALCULATOR LOGIC
// ============================================================
// The authoritative standard-calculator input/calculation logic now lives in
// StandardCalculator (src/modes/StandardCalculator.js). The functions below
// are thin compatibility wrappers so the existing UI/event wiring and the
// keyboard path continue to work unchanged while delegating to the mode.
let standardCalculator = null; // Populated in initialize().

function updatePrimaryDisplay() {
  if (primaryDisplay) {
    // Result path (after `=`) shows a display-only rounded copy; live typed
    // values stay at full precision. state.displayValue is never mutated.
    let val = state.displayValue;
    if (state.hasPressedEquals === true) {
      val = roundDisplayValue(val, 4);
    }
    primaryDisplay.textContent = formatNumber(val);
  }
}

function updateSecondaryDisplay() {
  if (secondaryDisplay) {
    if (state.displayValue !== '' && !isNaN(Number(state.displayValue))) {
      let words;
      if (state.hasPressedEquals === true) {
        // Result path: rounded parts-of-100 input (never a giant decimal tail).
        let wordsInput = roundDisplayValue(state.displayValue, 2);
        if (wordsInput === '') wordsInput = '0';
        words = resultNumberToWords(wordsInput, state.locale);
      } else {
        words = numberToWords(state.displayValue, state.locale);
      }
      secondaryDisplay.textContent = words;
    } else {
      secondaryDisplay.textContent = 'Zero';
    }
  }
}

function updateExpressionDisplay() {
  if (expressionDisplay) {
    expressionDisplay.textContent = state.expression || '';
  }
}

function syncExpressionDisplay() {
  const built = buildExpressionString();
  if (expressionDisplay) {
    expressionDisplay.textContent = built;
  }
  state.expression = built;
}

function buildExpressionString() {
  if (standardCalculator) return standardCalculator.buildExpressionString();
  return '';
}

function displayOperator(op) {
  const symbolMap = { '*': '×', '/': '÷', '+': '+', '-': '−' };
  return symbolMap[op] || op;
}

function appendDigit(digit) {
  if (standardCalculator) {
    standardCalculator.appendDigit(digit);
  }
}

function applyOperator(op) {
  if (standardCalculator) {
    standardCalculator.applyOperator(op);
  }
}

function handlePercent() {
  if (standardCalculator) {
    standardCalculator.handlePercent();
  }
}

function handleEquals() {
  if (standardCalculator) {
    standardCalculator.handleEquals();
  }
}

function clearAll() {
  if (standardCalculator) {
    standardCalculator.clearAll();
  }
}

function backspace() {
  if (standardCalculator) {
    standardCalculator.backspace();
  }
}

function appendScientificValue(value) {
  triggerButtonFeedback();
  // PHASE 39: ALL scientific inputs (√ / x² / ( / )) are built into the SAME
  // free-expression buffer that `=` evaluates. This removes the previous
  // divergence where sqrt/^2 mutated only displayValue (via a display-only
  // "sqrt(...)" string) while the evaluator held a different expression, which
  // produced broken results such as "sqrt(9*)" and wrong Number-to-Words.
  // PHASE 40: new scientific keys (x^y / 1/x / ± / pi / e / ! / %) reuse the
  // same single buffer via StandardCalculator.appendScientificToken; the
  // extended shared ExpressionEvaluator stays the only evaluator.
  if (standardCalculator && typeof standardCalculator.appendScientific === 'function') {
    standardCalculator.appendScientific(value);
  } else if (standardCalculator && typeof standardCalculator.appendScientificToken === 'function') {
    standardCalculator.appendScientificToken(value);
  }
}

// ============================================================
// CLIPBOARD
// ============================================================
async function copyResult() {
  triggerButtonFeedback();
  const text = state.displayValue;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showClipboardToast(translations[state.locale].copied || 'Result copied');
    } else {
      throw new Error('Clipboard API not available');
    }
  } catch (e) {
    // Fallback: temporary textarea + execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (e2) {
      success = false;
    }
    document.body.removeChild(textarea);
    if (success) {
      showClipboardToast(translations[state.locale].copied || 'Result copied');
    } else {
      showToast('Copy failed');
    }
  }
}

async function pasteNumber(userInitiated = false) {
  triggerButtonFeedback();
  try {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      throw new Error('Clipboard API not available');
    }
    const text = await navigator.clipboard.readText();
    // Accept only valid numeric values: digits, decimal point, optional minus sign
    const cleaned = text.replace(/[^\d.-]/g, '');
    if (cleaned && !isNaN(Number(cleaned))) {
      state.displayValue = cleaned;
      state.startNewNumber = false;
      state.hasPressedEquals = false;
      updatePrimaryDisplay();
      updateSecondaryDisplay();
      syncExpressionDisplay();
      showClipboardToast(translations[state.locale].pasted || 'Number pasted');
    } else if (userInitiated) {
      showToast('Paste failed');
    }
  } catch (e) {
    if (userInitiated) {
      showToast('Paste failed');
    }
  }
}

// ============================================================
// SPEECH
// ============================================================
// Tracks whether the main calculator is currently reading aloud so that the
// same speaker button acts as a toggle: first press starts, second press stops
// immediately, and a later press reads again from the start.
// ============================================================
// PHASE 37E — shared speech-locale mapping (TTS language selection).
// Keeps the EXACT locale→speech-lang mapping every TTS call site used
// before (ar/es/fr/ru/de/tr/en unchanged) and adds correct Kurdish
// handling: when the app language is `ku`, the utterance requests a
// Kurdish locale (never falling back to English just because no Kurdish
// voice is installed), and if the OS/Chrome does expose a Kurdish voice
// it is selected explicitly. Text content is never translated.
// ============================================================
const SPEECH_LANG_BY_LOCALE = { ar: 'ar-SA', es: 'es-ES', fr: 'fr-FR', ru: 'ru-RU', de: 'de-DE', tr: 'tr-TR', en: 'en-US', ku: 'ku' };
function getSpeechLangForLocale(locale) {
  return SPEECH_LANG_BY_LOCALE[locale] || 'en-US';
}
function applySpeechLocale(utterance, locale) {
  utterance.lang = getSpeechLangForLocale(locale);
  if (locale === 'ku') {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.getVoices === 'function') {
        const voices = window.speechSynthesis.getVoices() || [];
        // PHASE 37H — real Kurdish voice only: ku/ckb/kmr lang codes or
        // Kurdish/Sorani/Kurmanji in the voice name. Never accept an
        // English voice as Kurdish; if none found, keep lang="ku" with
        // no assigned voice (no silent English fallback).
        const kuVoice = voices.find((v) => /^ku([-_]|$)/i.test(v.lang || ''))
          || voices.find((v) => /^(ckb|kmr)([-_]|$)/i.test(v.lang || ''))
          || voices.find((v) => /kurdish|sorani|kurmanji|kurmanc|کوردی|kurd/i.test(v.name || ''));
        if (kuVoice && !/^en([-_]|$)/i.test(kuVoice.lang || '')) {
          utterance.voice = kuVoice;
          utterance.lang = kuVoice.lang || 'ku';
        }
      }
    } catch (e) {
      // Voice enumeration unavailable — keep the requested Kurdish locale.
    }
    // PHASE 37H guard: if the platform pre-attached an English/default voice
    // object to this fresh Kurdish utterance (no real Kurdish voice found),
    // clear it so the platform is honestly asked for Kurdish (lang="ku").
    try {
      const v = utterance.voice;
      if (v && (/^en([-_]|$)/i.test(v.lang || '') || /microsoft\s+(david|mark|zira)/i.test(v.name || ''))) {
        try { utterance.voice = null; } catch (e2) { /* ignore */ }
        utterance.lang = 'ku';
      }
    } catch (e) { /* ignore */ }
  }
}

let speechActive = false;

function stopCurrentSpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // no-op
  }
  speechActive = false;
}

function speakCurrentResult(force = false) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Toggle: if currently reading, stop immediately. The manual speaker
    // button (no `force`) toggles read/stop as before. The automatic on-`=`
    // read (force=true) must ALWAYS speak the new result, not let the manual
    // button's speechActive state swallow it — keeping the Settings Speaker
    // toggle and the calculator's speakerEnabled on a single read path.
    if (!force && speechActive) {
      stopCurrentSpeech();
      return;
    }
    // Arabic/English/Kurdish speech: speak the number as words (integer + parts-of-100
    // for ar/en; Kurdish number-to-words for ku) so TTS never says the decimal separator,
    // and so a long decimal tail is never spoken as a giant number. On-screen display
    // stays unchanged.
    const text = (state.locale === 'ar' || state.locale === 'en' || state.locale === 'ku') && !Number.isNaN(Number(state.displayValue))
      ? resultNumberToWords(roundDisplayValue(state.displayValue, 2), state.locale)
      : `${state.displayValue}`;
    const utterance = new SpeechSynthesisUtterance(text);
    applySpeechLocale(utterance, state.locale);
    utterance.onstart = () => { speechActive = true; };
    utterance.onend = () => { speechActive = false; };
    utterance.onerror = () => { speechActive = false; };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Speech synthesis not available
  }
}

// ============================================================
// LANGUAGE / I18N
// ============================================================
function setLanguage(locale) {
  state.locale = locale;
  // PHASE 37G: keep the mode-level locale snapshot in sync so the speech
  // fallback path (StandardCalculator -> SpeechEngine) uses the live locale.
  try { if (standardCalculator) standardCalculator.locale = locale; } catch (e) { /* ignore */ }
  try {
    localStorage.setItem(LANGUAGE_KEY, locale);
  } catch (e) { /* ignore */ }
  const html = document.documentElement;
  html.lang = locale;
  html.dir = (locale === 'ar' || locale === 'ku') ? 'rtl' : 'ltr';
  document.body.setAttribute('data-language', locale);
  state.isRTL = (locale === 'ar' || locale === 'ku');
  updateTexts();
  if (languageSelect) languageSelect.value = locale;
  if (topBarLanguageSelect) topBarLanguageSelect.value = locale;
  renderHistory();
  renderFolders();
  renderNotes();
  if (percentPanel && !percentPanel.classList.contains('percent-open')) {
    updatePercentPanel();
  }
  updateInstallModalContent();
  // Re-render the currency rates screen so localized currency names update live
  if (currencyRatesModal && currencyRatesModal.classList.contains('show')) {
    renderCurrencyRates();
  }
  // Re-render the favorites screen so localized names/text update live
  if (currencyFavoritesModal && currencyFavoritesModal.classList.contains('show')) {
    renderCurrencyFavorites();
  }
}

function updateTexts() {
  if (typeof document === 'undefined') return;
  const locale = state.locale;
  const t = translations[locale] || translations.en;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const value = t[key];
    if (value !== undefined && value !== null) {
      el.textContent = value;
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    const value = t[key];
    if (value !== undefined && value !== null) {
      el.setAttribute('placeholder', value);
    }
  });
  // PART 28 — localized tooltips: same existing system, new attribute channel
  // (title attributes are user-facing hover text and must not leak English).
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    const value = t[key];
    if (value !== undefined && value !== null) {
      el.setAttribute('title', value);
    }
  });
}

function updateInstallModalContent() {
  const t = translations[state.locale] || translations.en;
  if (iosInstallTitle) iosInstallTitle.textContent = t.installModalTitle || '';
  if (iosInstallSubtitle) iosInstallSubtitle.textContent = t.installModalSubtitle || '';
  if (iosInstallStep1) iosInstallStep1.textContent = t.installModalStep1 || '';
  if (iosInstallStep2) iosInstallStep2.textContent = t.installModalStep2 || '';
}

// ============================================================
// THEME
// ============================================================
const THEME_IDS = ['oled', 'charcoal', 'titanium', 'light'];
const THEME_ALIASES = { dark: 'oled', violet: 'titanium' };
const THEME_BACKGROUNDS = { oled: '#000000', charcoal: '#111417', titanium: '#1c1f26', light: '#f8fafc' };

function normalizeThemeId(theme) {
  if (THEME_ALIASES[theme]) return THEME_ALIASES[theme];
  if (THEME_IDS.indexOf(theme) !== -1) return theme;
  return 'oled';
}

function getSavedTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return normalizeThemeId(saved);
  } catch (e) { /* ignore */ }
  return 'oled';
}

function setTheme(theme) {
  const id = normalizeThemeId(theme);
  state.theme = id;
  document.body.setAttribute('data-theme', id);
  // Keep the document root (<html>) painted with the current theme's base color
  // so overscroll / rubber-band areas never flash white.
  document.documentElement.style.backgroundColor = THEME_BACKGROUNDS[id] || THEME_BACKGROUNDS.oled;
  const colorScheme = id === 'light' ? 'light' : 'dark';
  document.body.style.colorScheme = colorScheme;
  try { localStorage.setItem(THEME_KEY, id); } catch (e) { /* ignore */ }
  const buttons = (typeof document !== 'undefined' && document.querySelectorAll)
    ? document.querySelectorAll('.theme-option') : [];
  buttons.forEach((btn) => {
    const btnTheme = normalizeThemeId(btn.getAttribute('data-theme'));
    btn.classList.toggle('active', btnTheme === id);
  });
  try {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_BACKGROUNDS[id] || THEME_BACKGROUNDS.oled);
  } catch (e) { /* ignore */ }
}

// ============================================================
// SCIENTIFIC PANEL
// ============================================================
function setScientificPanelOpen(open) {
  state.scientificPanelOpen = open;
  if (scientificPanel) {
    scientificPanel.classList.toggle('open', open);
  }
  if (scientificToggle) {
    scientificToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

function toggleScientificPanel() {
  triggerButtonFeedback();
  setScientificPanelOpen(!state.scientificPanelOpen);
}

// ============================================================
// PERCENTAGE PANEL
// ============================================================
function updatePercentPanel() {
  const amount = percentAmount ? parseFloat(percentAmount.value) : NaN;
  const rate = percentRate ? parseFloat(percentRate.value) : NaN;
  if (isNaN(amount) || isNaN(rate)) {
    if (sharedServices.display) {
      sharedServices.display.updatePrimary('0');
      sharedServices.display.updateSecondary('Zero', state.locale);
    }
    return;
  }
  const result = (amount * rate) / 100;
  state.displayValue = String(result);
  if (sharedServices.display) {
    sharedServices.display.updatePrimary(result);
    sharedServices.display.updateSecondary(result, state.locale);
  }
}

function calculatePercent() {
  updatePercentPanel();
}

function setPercentPanelOpen(open) {
  state.percentPanelOpen = open;
  if (percentPanel) {
    percentPanel.classList.toggle('percent-open', open);
    percentPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }
  if (percentToggle) {
    percentToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (keypadGrid) {
    keypadGrid.classList.toggle('percent-open', open);
  }
  if (open) {
    updatePercentPanel();
  } else {
    if (percentAmount) percentAmount.value = '';
    if (percentRate) percentRate.value = '';
    if (standardCalculator) {
      standardCalculator.refreshDisplay();
    }
  }
}

function togglePercentPanel() {
  triggerButtonFeedback();
  setPercentPanelOpen(!state.percentPanelOpen);
}

// ============================================================
// MODES
// ============================================================
function setActiveMode(mode) {
  modeSwitchButtons.forEach((btn) => {
    const isActive = btn.getAttribute('data-mode') === mode;
    btn.classList.toggle('active', isActive);
  });
  if (generalCalculatorPanel) {
    generalCalculatorPanel.classList.toggle('active', mode === 'general');
  }
}

// ============================================================
// HISTORY SYSTEM
// ============================================================
const HISTORY_LIMIT = 1000;
const HISTORY_TTL = 24 * 60 * 60 * 1000; // 24 hours

function cleanupExpiredHistory() {
  const now = Date.now();
  const before = state.history.length;
  state.history = state.history.filter(entry => (now - (entry.timestamp || now)) < HISTORY_TTL);
  if (state.history.length !== before) {
    saveHistory();
  }
}

function migrateHistoryEntry(entry) {
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

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      state.history = parsed
        .filter(entry => entry && (now - (entry.timestamp || now)) < HISTORY_TTL)
        .map(migrateHistoryEntry)
        .slice(0, HISTORY_LIMIT);
    } else {
      state.history = [];
    }
  } catch (e) {
    state.history = [];
  }
  history.entries = state.history;
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(0, HISTORY_LIMIT)));
  } catch (e) { /* ignore */ }
}

function addHistory(expression, result) {
  const now = Date.now();
  // Duplicate prevention: skip if an identical expression+result was added within the last 2 seconds
  const duplicate = state.history.some(entry =>
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

  cleanupExpiredHistory();
  state.history.unshift(entry);
  if (state.history.length > HISTORY_LIMIT) {
    state.history = state.history.slice(0, HISTORY_LIMIT);
  }
  history.entries = state.history;
  saveHistory();
  renderHistory();
}

const historyDateFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
const historyTimeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function formatEntryDate(ts, locale) {
  try {
    return new Intl.DateTimeFormat(locale || 'en', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts);
  } catch (e) {
    return historyDateFormatter.format(ts);
  }
}

function formatEntryTime(ts, locale) {
  try {
    return new Intl.DateTimeFormat(locale || 'en', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(ts);
  } catch (e) {
    return historyTimeFormatter.format(ts);
  }
}

function renderHistory() {
  if (!historyList) return;
  const t = translations[state.locale] || translations.en;
  if (!state.history.length) {
    historyList.innerHTML = `<li class="empty-history">${t.emptyHistory || 'No history yet'}</li>`;
    return;
  }
  const now = Date.now();
  const remainingPrefix = t.historyRemaining || 'remaining';
  historyList.innerHTML = state.history.map((entry) => {
    const ts = entry.timestamp || Date.now();
    const remaining = Math.max(0, HISTORY_TTL - (now - ts));
    const remainingLabel = `${formatRemainingTime(remaining)} ${remainingPrefix}`;
    const dateStr = entry.date || formatEntryDate(ts, state.locale);
    const timeStr = entry.time || formatEntryTime(ts, state.locale);
    return `
      <li class="history-entry" data-id="${entry.id}">
        <div class="history-entry-header">
          <label class="history-check">
            <input type="checkbox" class="history-select" />
            <span class="history-id-badge">#${escapeHtml(entry.id.slice(0, 4))}</span>
          </label>
          <button class="history-speak-btn" type="button" data-id="${entry.id}" title="${t.historySpeakResult || 'Read result aloud'}" aria-label="${t.historySpeakResult || 'Read result aloud'}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>
          </button>
        </div>
        <div class="history-expression">${escapeHtml(entry.expression)}</div>
        <div class="history-result-row">
          <div class="history-result">= ${escapeHtml(entry.result)}</div>
        </div>
        <div class="history-datetime">
          <span class="history-date"><i class="fa-regular fa-calendar" aria-hidden="true"></i>${escapeHtml(dateStr)}</span>
          <span class="history-time"><i class="fa-regular fa-clock" aria-hidden="true"></i>${escapeHtml(timeStr)}</span>
        </div>
        <div class="history-remaining-row">
          <span class="history-remaining" data-ts="${ts}">${remainingLabel}</span>
        </div>
        <div class="history-note-row">
          <input class="history-note-input" type="text" placeholder="${t.historyNotePlaceholder || 'Tag this calculation'}"
            value="${escapeHtml(entry.note || '')}" data-id="${entry.id}" />
          <button class="history-edit-note-btn" data-id="${entry.id}" title="${t.noteEdit || 'Edit Note'}">
            <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
          </button>
          <button class="history-insert-smart-btn" data-id="${entry.id}" title="${t.historyInsertResult || 'Insert Result'}">
            <i class="fa-regular fa-file-lines" aria-hidden="true"></i>
          </button>
          <button class="history-share-btn" data-id="${entry.id}" title="${t.noteShare || 'Share'}">
            <i class="fa-regular fa-share-from-square" aria-hidden="true"></i>
          </button>
        </div>
      </li>
    `;
  }).join('');
  // NOTE: PDF priming was REMOVED from this path on purpose. renderHistory()
  // runs after every `=` press, and primePdfBlobCache() here triggered
  // html2pdf/html2canvas full-document clones (~2–3.5s main-thread blocking),
  // causing the white background flash. PDFs are now built lazily ONLY when
  // actually needed via ensurePdfBlob() / ensureSelectionPdf(), which keep the
  // same pdfBlobCache / selectionPdfCache and the same buildHistoryPdfBlob()
  // generator — no PDF functionality was removed.
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// HISTORY — per-entry "read result aloud" speaker button.
// Reuses the SAME SpeechSynthesis pipeline, number-to-words helper and
// language mapping as the calculator's manual speaker button
// (speakCurrentResult) — no new TTS engine is introduced.
// ============================================================
let historySpeechActive = false;

function stopHistorySpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // no-op
  }
  historySpeechActive = false;
  document.querySelectorAll('.history-speak-btn.speaking').forEach((b) => b.classList.remove('speaking'));
}

function speakHistoryEntryResult(entryId) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Toggle behavior identical to every other speaker button in the app:
    // a second tap while reading stops the audio immediately.
    if (historySpeechActive) {
      stopHistorySpeech();
      return;
    }
    const entry = state.history.find((h) => h.id === entryId);
    if (!entry) return;
    const btn = historyList ? historyList.querySelector(`.history-speak-btn[data-id="${entryId}"]`) : null;
    const raw = String(entry.result == null ? '' : entry.result).trim();
    if (!raw) return;
    const cleaned = raw.replace(/[,\s]/g, '');
    const isNumeric = cleaned !== '' && !Number.isNaN(Number(cleaned));
    // Arabic/English/Kurdish speech reads the number as words (same rule as the
    // calculator display speaker) so TTS never says decimal separators.
    const text = isNumeric && (state.locale === 'ar' || state.locale === 'en' || state.locale === 'ku')
      ? resultNumberToWords(roundDisplayValue(cleaned, 2), state.locale)
      : raw;
    const utterance = new SpeechSynthesisUtterance(text);
    applySpeechLocale(utterance, state.locale);
    utterance.onstart = () => {
      historySpeechActive = true;
      if (btn) btn.classList.add('speaking');
    };
    utterance.onend = () => {
      historySpeechActive = false;
      if (btn) btn.classList.remove('speaking');
    };
    utterance.onerror = () => {
      historySpeechActive = false;
      if (btn) btn.classList.remove('speaking');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Speech synthesis not available
  }
}

function openHistory() {
  cleanupExpiredHistory();
  if (historyPanel) {
    historyPanel.classList.add('open');
    historyPanel.setAttribute('aria-hidden', 'false');
  }
  renderHistory();
  startHistoryCountdown();
  updateHistoryCountdown();
}

function closeHistory() {
  if (historyPanel) {
    historyPanel.classList.remove('open');
    historyPanel.setAttribute('aria-hidden', 'true');
  }
  stopHistoryCountdown();
}

// ============================================================
// PART 35 — History → Insert Result → Smart Document
// The ONLY allowed bridge between History and Smart Documents.
// ONE-WAY copy semantics: a plain-string snapshot of the entry
// (expression / result / note / total) is copied into a NEW
// Smart Document via the EXISTING smartBlankOpen() path and the
// existing content-surface block model (.smart-doc-* elements).
// After insertion the document owns its own copies: editing the
// document never touches History, and History is not referenced,
// so deleting either side leaves the other intact. No shared
// mutable state, no old-PDF involvement, no new storage.
// ============================================================
function insertResultIntoSmartDocument(entryId) {
  const entry = state.history.find((en) => en && en.id === entryId);
  if (!entry) return false;
  // Copy snapshot NOW (strings are immutable values — true copy semantics).
  const snapshot = {
    expression: String(entry.expression || ''),
    result: String(entry.result || ''),
    note: String(entry.note || ''),
    total: String(entry.result || '')
  };
  closeHistory();
  // Existing Smart Documents "New Document" start path (PART 6).
  smartBlankOpen();
  const surface = smartActivePageContent();
  if (!surface) return false;
  const dir = (state.locale === 'ar') ? 'rtl' : 'ltr';
  const mk = (tag, cls, ds, text) => {
    const el = document.createElement(tag);
    el.className = cls;
    el.setAttribute('contenteditable', 'true');
    el.dataset.smartElement = ds;
    el.textContent = text;
    el.setAttribute('dir', dir);
    el.style.direction = dir;
    el.style.textAlign = (dir === 'rtl') ? 'right' : 'left';
    surface.appendChild(el);
    return el;
  };
  mk('h2', 'smart-doc-heading', 'heading', snapshot.expression);
  mk('p', 'smart-doc-text-block', 'text', '= ' + snapshot.result);
  if (snapshot.note) {
    mk('p', 'smart-doc-text-block', 'text', snapshot.note);
  }
  mk('p', 'smart-doc-text-block', 'text', 'Total: ' + snapshot.total);
  return true;
}

function selectAllHistory() {
  const checkboxes = document.querySelectorAll('.history-select');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  primeCurrentSelection(); // warm the combined PDF for the new selection
}

// Lazy-load an external script only when it is actually needed (PDF generation).
// FIRST-CLICK FIX: previously, when a <script> tag for the PDF library already
// existed (created by the init-time preload but still downloading from the CDN),
// this returned immediately WITHOUT waiting for the actual load. A PDF tap that
// landed while the preload was still in flight then proceeded with
// window.html2pdf still undefined and the export threw ("library unavailable") —
// that is why the PDF button appeared to "ignore" the first tap and only worked
// after additional taps once the CDN had finished. Now we wait for the real
// load/error of the existing tag (sharing one promise per URL so concurrent
// callers block on the same fetch), and resolve instantly when the library is
// already available. This changes nothing about PDF output — only that the very
// first tap waits for the library instead of failing on it.
const _externalScriptPromises = Object.create(null);

function loadExternalScript(src) {
  if (_externalScriptPromises[src]) return _externalScriptPromises[src];
  const p = new Promise((resolve, reject) => {
    const fail = () => reject(new Error('Failed to load script: ' + src));
    // Already available -> nothing to fetch.
    if (typeof window.html2pdf !== 'undefined') { resolve(); return; }
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      // A tag already exists (e.g. the init-time preload). It may still be
      // downloading — resolve only when it ACTUALLY finishes or errors, never on
      // tag-presence alone. This is what makes the very first PDF tap wait for
      // the preload instead of failing while html2pdf is still undefined.
      if (existing.__eqScriptDone) { existing.__eqScriptDone.ok ? resolve() : fail(); return; }
      existing.addEventListener('load', () => { existing.__eqScriptDone = { ok: true }; resolve(); }, { once: true });
      existing.addEventListener('error', () => { existing.__eqScriptDone = { ok: false }; fail(); }, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => { s.__eqScriptDone = { ok: true }; resolve(); };
    s.onerror = () => { s.__eqScriptDone = { ok: false }; fail(); };
    document.head.appendChild(s);
  });
  _externalScriptPromises[src] = p;
  return p;
}

// --- PDF library preload (first-tap share) -------------------------------
// Root cause of "Share needs several taps": html2pdf was loaded lazily FROM THE
// CDN on the click path (inside buildHistoryPdfBlob). That network fetch runs
// AFTER the user's gesture and exceeds the transient user-activation window, so
// navigator.share() lost activation and the sheet did not open on the first tap.
// Fix: preload the library once, in the background, so no CDN fetch is ever needed
// on the tap path. buildHistoryPdfBlob already skips loading when window.html2pdf
// is defined, so it simply re-uses this preloaded library (method unchanged).
const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
let pdfLibReadyPromise = null;

function preloadPdfLibrary() {
  if (!pdfLibReadyPromise) {
    pdfLibReadyPromise = (typeof window.html2pdf !== 'undefined')
      ? Promise.resolve()
      : loadExternalScript(PDF_LIB_URL).catch(() => { /* handled on demand later */ });
  }
  return pdfLibReadyPromise;
}
// --- PDF-only helpers (scoped strictly to buildHistoryPdfBlob) ---------------
// Parse an entry's final Result into a number for the PDF Total row. Only plain,
// logically summable numeric Results count; anything else (text, "sqrt(3)", "أ",
// NaN, Infinity, empty) is returned as null and excluded so the Total can never
// break or show NaN/undefined. This never re-parses the expression — it only reads
// the final Result already stored in the entry.
function pdfNumericResult(result) {
  if (typeof result === 'number') return Number.isFinite(result) ? result : null;
  if (typeof result !== 'string') return null;
  let s = result.trim();
  if (!s) return null;
  // Parentheses mean a negative number: (1,234) -> -1234
  let negative = false;
  if (s.charAt(0) === '(' && s.charAt(s.length - 1) === ')') {
    negative = true;
    s = s.slice(1, -1);
  }
  // Drop thousands separators and a trailing percent sign (percentage/discount
  // results), and normalize any Arabic-Indic / Persian digits to 1234567890.
  s = s.replace(/,/g, '')
    .replace(/%/g, '')
    .replace(/[٠-٩۰-۹]/g, (d) => '٠١٢٣٤٥٦٧٨٩٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// Determine the optimal horizontal text alignment for a PDF table cell based on
// its content. Arabic text → right; numeric-dominant content → right; else left.
function pdfCellAlign(text) {
  const s = String(text || '').trim();
  if (!s) return 'center';
  // Arabic Unicode ranges (U+0600–U+06FF, U+0750–U+077F, U+08A0–U+08FF, U+FB50–U+FDFF, U+FE70–U+FEFF)
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s)) return 'right';
  // Count digits vs letters for mixed numeric/alpha content
  const ns = s.replace(/\s/g, '');
  const digits = (ns.match(/\d/g) || []).length;
  const letters = (ns.match(/[a-zA-Z]/g) || []).length;
  if (digits > letters) return 'right';
  return 'left';
}

// Determine the HTML dir attribute for a PDF table cell. Arabic content → 'rtl', else 'auto'.
function pdfCellDir(text) {
  const s = String(text || '').trim();
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(s) ? 'rtl' : 'auto';
}

// --- PDF-only: write the Total in Arabic words (scoped to buildHistoryPdfBlob) ----
// Converts a final numeric Total into its classical written format for the PDF,
// exactly as requested (e.g. 2200 -> "ألفان ومئتان"). This is a self-contained,
// PDF-local implementation (no external library, no change to the shared
// numberToWords engine) so the written form matches the required classical
// grammar (dual "ألفان", "مئتان") rather than the shared engine's "اثنان ألف".
function pdfArTensAndOnes(n) {
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  if (n < 10) return ones[n];
  if (n === 10) return 'عشرة';
  if (n === 11) return 'أحد عشر';
  if (n === 12) return 'اثنا عشر';
  if (n < 20) return ones[n % 10] + ' عشر';
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? tens[t] : ones[o] + ' و' + tens[t];
}

function pdfArUnderThousand(n) {
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return pdfArTensAndOnes(rest);
  const base = hundreds[h];
  return rest ? base + ' و' + pdfArTensAndOnes(rest) : base;
}

// Words for a count placed before a masculine plural unit noun (آلاف، ملايين).
function pdfArMagnitudeBeforeUnit(v) {
  if (v === 2) return '';
  if (v <= 10) return ['', 'واحد', 'ألفان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة'][v];
  return pdfArUnderThousand(v);
}

function pdfArGroupWithUnit(value, sing, dual, plural, accusative) {
  if (value === 1) return sing;
  if (value === 2) return dual;
  if (value <= 10) return pdfArMagnitudeBeforeUnit(value) + ' ' + plural;
  // 11..99 take the accusative (ألفًا، مليونًا), hundreds use the nominative (خمسمائة ألف).
  if (value < 100) return pdfArUnderThousand(value) + ' ' + accusative;
  return pdfArUnderThousand(value) + ' ' + sing;
}

function pdfArInteger(n) {
  if (n === 0) return 'صفر';
  n = Math.abs(Math.trunc(n));
  const billions = Math.floor(n / 1000000000);
  const millions = Math.floor((n % 1000000000) / 1000000);
  const thousands = Math.floor((n % 1000000) / 1000);
  const rest = n % 1000;
  const parts = [];
  if (billions) parts.push(pdfArGroupWithUnit(billions, 'مليار', 'ملياران', 'مليارات', 'مليارًا'));
  if (millions) parts.push(pdfArGroupWithUnit(millions, 'مليون', 'مليونان', 'ملايين', 'مليونًا'));
  if (thousands) parts.push(pdfArGroupWithUnit(thousands, 'ألف', 'ألفان', 'آلاف', 'ألفًا'));
  if (rest) parts.push(pdfArUnderThousand(rest));
  return parts.join(' و');
}

// Written form of a numeric Total for the PDF only. Arabic uses the local
// classical converter + "فقط"; every other locale reuses the already-imported
// shared engine (app appends "only" for English, keeps others language-neutral).
function pdfNumberToWords(num, locale) {
  if (typeof num !== 'number' || !Number.isFinite(num)) return '';
  const isAr = (locale || 'en') === 'ar';
  const negative = num < 0;
  // Words are built from the ROUNDED presentation value (financial 2-decimal
  // rounding of a COPY), never from the raw floating-point value — so
  // 18243.9566 reads "…and 96/100" and 100 reads "One hundred" with no
  // "point nine five six six…" garbage and no "00/100".
  const r = Math.round(Math.abs(num) * 100) / 100;
  const integer = Math.trunc(r);
  const cents = Math.round((r - integer) * 100);

  let words;
  if (isAr) {
    words = pdfArInteger(integer);
    if (cents > 0) words += ' و' + pdfArInteger(cents) + ' جزءًا من مئة';
    words += ' فقط';
    if (negative) words = 'سالب ' + words;
  } else {
    // The app global may resolve to the real engine or be absent. Guard it so a
    // missing/empty/undefined engine result can never leak the literal word
    // "undefined" into the Grand Total: fall back to the plain number string
    // (the existing PDF-only safe fallback). The total is never re-calculated.
    let computed = '';
    if (typeof numberToWords === 'function') {
      try { computed = String(numberToWords(integer, locale) ?? '').trim(); } catch (e) { computed = ''; }
    }
    const uselessEngine = computed === '' || computed === 'undefined' || computed === 'null';
    const intWords = uselessEngine ? String(integer) : computed;
    words = cents > 0 ? `${intWords} and ${cents}/100` : intWords;
    if (locale === 'en') words += ' only';
    if (negative) words = `minus ${words}`;
  }
  // GRAND TOTAL SAFETY NET (History-PDF words line only): no matter which
  // converter branch ran, the written line must NEVER contain the literal
  // "undefined"/"null" — e.g. an Arabic magnitude count (a total >= 1e12) that
  // the local Arabic converter cannot wordify would otherwise emit
  // "undefined مليار". If the converter ever produces an unusable line, fall
  // back to the clean formatted numeric total (reusing the PDF presentation
  // formatter), so only the numeric Grand Total is shown and never the word
  // "undefined". The numeric total value itself is never altered.
  if (!words || /undefined|null/i.test(words)) {
    const numText = pdfFormatNumber(integer);
    if (isAr) {
      words = (negative ? 'سالب ' : '') + numText + (cents > 0 ? ` و${cents} جزءًا من مئة` : '') + ' فقط';
    } else {
      words = (negative ? 'minus ' : '') + numText + (cents > 0 ? ` and ${cents}/100` : '') + (locale === 'en' ? ' only' : '');
    }
  }
  return words;
}

// Build the "Exported at" date/time line for the PDF only. In Arabic it keeps the
// Header date/time for the History PDF ONLY: returns { time, date } rendered
// on two lines (time on top, date underneath) with Latin (English) digits so
// the timestamp never renders broken or with Arabic-Indic numerals. No locale
// separator can appear between the two lines.
function formatPdfExportedAt(date) {
  // Two-line header layout (time on top, date underneath) with Latin digits.
  // Numeric dd/mm/yyyy for every locale so no locale separator (",", "__", …)
  // can ever appear between the time and the date.
  const p = (n) => String(n).padStart(2, '0');
  const dd = p(date.getDate()), mm = p(date.getMonth() + 1), yyyy = date.getFullYear();
  let h = date.getHours();
  const min = p(date.getMinutes());
  const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
  return { time: `${h}:${min} ${ampm}`, date: `${dd}/${mm}/${yyyy}` };
}
// PDF-only: localized full weekday name for the History-PDF header, derived
// from the SAME export date so it always matches the displayed date. Scoped
// strictly to the History PDF header — never affects stored values, the
// calculator, or any other locale system (reuses state.locale selection).
const PDF_WEEKDAYS = {
  en: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  ar: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
  es: ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],
  fr: ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'],
  ru: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
  de: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
  tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],
  ku: ['یەکشەممە','دووشەممە','سێشەممە','چوارشەممە','پێنجشەممە','هەینی','شەممە']
};
function pdfWeekdayName(date, locale) {
  const list = PDF_WEEKDAYS[locale] || PDF_WEEKDAYS.en;
  // JS Date.getDay(): 0=Sun,1=Mon,...,6=Sat. Each list above is Sunday-first so
  // it is indexed directly by getDay(), e.g. en[0]='Sunday', ar[0]='الأحد'.
  return list[date.getDay()] || list[0];
}
// --- PDF-only PRESENTATION formatters (scoped strictly to buildHistoryPdfBlob) --
// These never touch stored History values, Calculator state, or calculation
// precision — they format a COPY of the value purely for PDF display.

// Round a copied numeric value to AT MOST `maxDecimals` (default 4) decimal
// places and drop trailing zeros: 268.16666… -> "268.1667", 25.0000 -> "25".
function pdfRoundedString(n, maxDecimals = 4) {
  let fixed = Math.abs(n).toFixed(maxDecimals);      // copy-only rounding
  fixed = fixed.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''); // strip trailing zeros
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (n < 0 ? '-' : '') + grouped + (decPart ? '.' + decPart : '');
}

// Compact scientific presentation for PDF result cells ONLY. Used when the
// integer magnitude would otherwise overflow the cell width. Strictly a
// display-only COPY of the value — the raw stored result is never modified.
// Example: 1000000000000000000000000000000000000000 -> "1 × 10^39".
function pdfScientificString(n) {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  let exp = Math.floor(Math.log10(abs));
  let mant = abs / Math.pow(10, exp);
  // Trim the mantissa to at most 2 decimals (copy-only rounding, no trailing zeros).
  let m = String(Math.round(mant * 100) / 100);
  // Renormalize if rounding the mantissa pushed it up to exactly 10
  // (e.g. 9.999 × 10^38 -> 1 × 10^39) so we never print "10 × 10^…".
  if (parseFloat(m) === 10) {
    mant = mant / 10;
    exp += 1;
    m = String(Math.round(mant * 100) / 100);
  }
  // Uses the same "×" / "^" notation the expression column already renders.
  return `${sign}${m} × 10^${exp}`;
}

// Full presentation formatter for any Result/Total shown in the PDF:
// rounding (≤4 decimals) + trailing-zero trim + thousands separators.
// Latin digits/commas are forced (even in Arabic) to match EQ's latn-digit policy.
function pdfFormatNumber(value) {
  const n = pdfNumericResult(value);
  if (n === null) return String(value == null ? '' : value);
  // Overflow guard (magnitude-based, so it also catches the raw "1e+39" that
  // toFixed emits for very large inputs): a value whose integer part is 16+
  // digits (abs >= 1e15, already beyond Number.MAX_SAFE_INTEGER territory)
  // would render as an endless digit string or a raw exponential and burst the
  // 20% result cell — show a compact scientific-notation COPY instead.
  // Normal-size values keep the exact existing formatting untouched.
  let out = (n !== 0 && Math.abs(n) >= 1e15) ? pdfScientificString(n) : pdfRoundedString(n);
  // Preserve a percent suffix if the stored result carried one (e.g. "25%").
  if (/%/.test(String(value))) out += '%';
  return out;
}

// Presentation normalizer for the Calculation column ONLY. The raw stored
// expression is never modified — this formats a copy: × ÷ symbols, single
// spaces around binary operators, thousands separators inside plain numbers.
function pdfFormatExpression(expr) {
  let s = String(expr || '').trim().replace(/\s+/g, ' ');
  s = s.replace(/\*/g, '×').replace(/\//g, '÷');
  // Thousands-separate every plain number token (integer or decimal).
  s = s.replace(/\d+(?:\.\d+)?/g, (m) => {
    const [i, f] = m.split('.');
    const gi = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return f ? gi + '.' + f : gi;
  });
  // Exactly one space around each operator…
  s = s.replace(/[+\-×÷^]/g, ' $& ').replace(/\s+/g, ' ').trim();
  // …except where it is a SIGN: leading minus, or a sign right after "(" or
  // after another operator ("3 × -2").
  s = s.replace(/^([-+])\s+/, '$1');
  s = s.replace(/\(\s+([-+])\s+/g, '($1 ');
  s = s.replace(/([+\-×÷^])\s+([-+])\s+/g, '$1 $2 ');
  return s;
}


// --- History-PDF-only report strings -----------------------------------------
// Scoped strictly to buildHistoryPdfBlob. Reuses the app's existing locale
// selection (state.locale) and its existing direction rule (ar -> rtl, else ltr,
// mirroring applyLanguage's documentElement.dir logic). No new i18n system —
// these are only the report labels that were previously hardcoded in English.
const PDF_REPORT_I18N = {
  en: { subtitle: 'Calculation History', colCalc: 'Calculation', colResult: 'Result', colNote: 'Note',
        total: 'Total', totalFull: 'Total: ', footerNote: 'EQ7 — Smart calculations, currency conversion, financial tools, history, and professional PDF reports.',
        titlePh: 'Report title (optional)', companyNameBtn: 'Company Name' },
  ar: { subtitle: 'سجل الحسابات', colCalc: 'الحساب', colResult: 'النتيجة', colNote: 'ملاحظة',
        total: 'المجموع', totalFull: 'المجموع الكلي: ', footerNote: 'EQ7 — حاسبة ذكية للحسابات، تحويل العملات، الأدوات المالية، السجل، وتقارير PDF الاحترافية.',
        titlePh: 'عنوان التقرير (اختياري)', companyNameBtn: 'اسم الشركة' },
  es: { subtitle: 'Historial de cálculos', colCalc: 'Cálculo', colResult: 'Resultado', colNote: 'Nota',
        total: 'Total', totalFull: 'Total: ', footerNote: 'EQ7 — Cálculos inteligentes, conversión de divisas, herramientas financieras, historial e informes PDF profesionales.',
        titlePh: 'Título del informe (opcional)', companyNameBtn: 'Nombre de la empresa' },
  fr: { subtitle: 'Historique des calculs', colCalc: 'Calcul', colResult: 'Résultat', colNote: 'Note',
        total: 'Total', totalFull: 'Total : ', footerNote: 'EQ7 — Calculs intelligents, conversion de devises, outils financiers, historique et rapports PDF professionnels.',
        titlePh: 'Titre du rapport (facultatif)', companyNameBtn: 'Nom de l\'entreprise' },
  ru: { subtitle: 'История вычислений', colCalc: 'Вычисление', colResult: 'Результат', colNote: 'Заметка',
        total: 'Итого', totalFull: 'Итого: ', footerNote: 'EQ7 — Умные вычисления, конвертация валют, финансовые инструменты, история и профессиональные PDF-отчёты.',
        titlePh: 'Название отчёта (необязательно)', companyNameBtn: 'Название компании' },
  de: { subtitle: 'Berechnungsverlauf', colCalc: 'Berechnung', colResult: 'Ergebnis', colNote: 'Notiz',
        total: 'Summe', totalFull: 'Summe: ', footerNote: 'EQ7 — Intelligente Berechnungen, Währungsumrechnung, Finanzwerkzeuge, Verlauf und professionelle PDF-Berichte.',
        titlePh: 'Berichtstitel (optional)', companyNameBtn: 'Firmenname' },
  tr: { subtitle: 'Hesap Geçmişi', colCalc: 'Hesaplama', colResult: 'Sonuç', colNote: 'Not',
        total: 'Toplam', totalFull: 'Toplam: ', footerNote: 'EQ7 — Akıllı hesaplamalar, döviz dönüşümü, finans araçları, geçmiş ve profesyonel PDF raporları.',
        titlePh: 'Rapor başlığı (isteğe bağlı)', companyNameBtn: 'Şirket Adı'},
  ku: { subtitle: 'مێژووی حیسابکردن', colCalc: 'حیسابکردن', colResult: 'ئەنجام', colNote: 'تێبینی', total: 'کۆی گشتی', totalFull: 'کۆی گشتی: ', footerNote: 'EQ7 — حیسابی ژیر، گۆڕینی دراو، ئامرازە داراییەکان، مێژوو و ڕاپۆرتی پرۆفیشناڵی PDF.', titlePh: 'ناونیشانی ڕاپۆرت (هەڵبژاردەیی)', companyNameBtn: 'ناوی کۆمپانیا' }
};
// Same direction rule the app already uses in applyLanguage: Arabic -> rtl, all
// other supported app languages -> ltr. Reused, not a new RTL/LTR system.
function pdfReportLocaleDir(locale) { return (locale === 'ar' || locale === 'ku') ? 'rtl' : 'ltr'; }

async function buildHistoryPdfBlob(entries, customTitle) {
  const t = translations[state.locale] || translations.en;
  const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';

  // Optional per-export custom report title (e.g. a shop/company name).
  // Empty/undefined -> existing default title. Never persisted anywhere.
  const titleText = String(customTitle || '').trim();

  // Load the PDF library lazily, only when exporting History (normal app load stays untouched).
  if (typeof window.html2pdf === 'undefined') {
    // PART 21: the library comes from a CDN — offline, fail fast with clear feedback.
    if (isOffline()) throw new Error('no-internet');
    await loadExternalScript(PDF_LIB_URL);
  }
  if (typeof window.html2pdf === 'undefined') {
    throw new Error('PDF library unavailable');
  }

  // Build a structured table: one row per selected History entry, ordered and
  // numbered sequentially (1, 2, 3, ... — dynamic index from the data, no cap)
  // while preserving the on-screen History order. Columns: # | Calculation |
  // Result | Note. Empty notes show an em-dash placeholder. Same data as the
  // card layout — visual/layout change only. dir/pdfCellDir still applied per
  // value so Arabic content renders RTL even though every cell is centered.
  const rows = entries.map((entry, i) => {
    const desc = String(entry.note || '').trim();
    const descDir = pdfCellDir(desc);
    const exprShown = pdfFormatExpression(entry.expression);
    const resultShown = pdfFormatNumber(entry.result);
    const exprDir = pdfCellDir(exprShown);
    const resultDir = pdfCellDir(resultShown);
    // RESULT-column overflow guard: reduce the value's font size dynamically
    // once it gets long enough to threaten the fixed 20% column width, so the
    // number is always contained inside its own cell and never bleeds into the
    // Calculation column. Normal/short numbers keep the default size untouched.
    // The shared th/td rule already provides the fallback `overflow-wrap:anywhere`
    // / `word-break:break-word` if a value is still too wide at the smallest tier.
    const resultSizeClass =
      resultShown.length > 29 ? ' r-xl' :
      resultShown.length > 21 ? ' r-md' :
      resultShown.length > 13 ? ' r-sm' : '';
    return `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-expr" dir="${exprDir}">${escapeHtml(exprShown)}</td>
        <td class="col-result${resultSizeClass}" dir="${resultDir}">${escapeHtml(resultShown)}</td>
        <td class="col-note" dir="${descDir}">${desc ? escapeHtml(desc) : '&mdash;'}</td>
      </tr>`;
  }).join('');

  const isArabic = (state.locale || 'en') === 'ar';
  // Reformat the exported timestamp for the PDF only (Arabic fixed; English unchanged).
  const exportDate = new Date(); // single export-timestamp source: time, date & day all derive from this same date
  const { time: hdrTime, date: hdrDate } = formatPdfExportedAt(exportDate);
  const hdrWeekday = pdfWeekdayName(exportDate, state.locale || 'en');

  // Report strings follow the currently selected application language (all 7
  // supported locales fall back to English if a key is ever missing).
  const repLocale = state.locale || 'en';
  const repDir = pdfReportLocaleDir(repLocale);
  const R = PDF_REPORT_I18N[repLocale] || PDF_REPORT_I18N.en;

  // Total for the PDF: sum only the valid numeric Results of the entries in THIS
  // PDF (the exact set passed in — for Top share that is the selected set, for a
  // pencil share it is the single entry). Non-numeric/text results are excluded so
  // the Total is never NaN/undefined. The expression is never re-parsed.
  let pdfTotal = 0;
  let pdfHasNumeric = false;
  for (const entry of entries) {
    const n = pdfNumericResult(entry.result);
    if (n !== null) {
      pdfTotal += n;
      pdfHasNumeric = true;
    }
  }
  const totalLabel = R.total;
  const totalText = pdfHasNumeric ? pdfFormatNumber(pdfTotal) : '—';
  // Written form of the Total for the PDF only (e.g. "المجموع الكلي: 2200"
  // followed on the next line by "ألفان ومئتان فقط"). Built only when there is a
  // real summable numeric total — never guessed from empty/text/NaN results.
  const totalWords = pdfHasNumeric ? pdfNumberToWords(pdfTotal, state.locale || 'en') : '';
  const totalSummaryHtml = pdfHasNumeric ? `
    <div class="total-summary"${repDir === 'rtl' ? ' dir="rtl"' : ''}>
      <div class="total-summary-total">${escapeHtml(R.totalFull)}${escapeHtml(totalText)}</div>
      <div class="total-summary-words">${escapeHtml(totalWords)}</div>
    </div>` : '';

  // EQ's own brand shown inside the report so a recipient instantly knows the
  // PDF came from EQ Calculator, regardless of the file name. The single footer
  // line (EQ7 + short description) follows the selected app language — subtle,
  // not an advertisement.
  const brandTitle = 'EQ7 Calculator';
  const brandSub = R.subtitle;
  const footerNote = R.footerNote;

  // Official product domain. Intentionally empty until the real domain is
  // provided later. When set it renders as a clickable app link + QR code in
  // the footer — never invent or embed a fake URL.
  const APP_DOMAIN = '';

  const html = `<!DOCTYPE html>
<html lang="${escapeHtml(repLocale)}" dir="${repDir}">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #000000; background: #ffffff; text-align: center; }
  .report { width: 794px; padding: 36px 40px; margin: 0 auto; }
  /* Professional 3-part header: EQ7 logo (LEFT edge) | top-center title (TRUE
     PAGE CENTER) | date/time (RIGHT edge). direction is forced to ltr so the
     PHYSICAL positions never swap in RTL — the logo stays on the left edge and
     the date on the right edge regardless of the app language; text inside each
     part still follows the app language direction. The title is a full-width
     flow block, so it is centered on the real PDF PAGE center (the header is
     symmetric inside the page padding) — not on the center of the gap between
     logo and date. Logo/date are absolutely positioned at the edges so they can
     no longer push the title off-center. */
  .report-header { position: relative; min-height: 66px;
                   border-bottom: 3px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px;
                   text-align: center; direction: ltr; }
  .hdr-logo { position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
  .hdr-brand { display: block; font-size: 30px; font-weight: 800; color: #0891b2; letter-spacing: 1px; line-height: 1; }
  /* Top-center title/company text. Centered block on the page. max-width keeps
     every wrapped line inside the symmetric safe zone between the edge logo and
     edge date blocks, so multi-line company names stay page-centered and can
     never overlap either side block. overflow-wrap handles very long names. */
  .hdr-title { margin: 0 auto; max-width: 300px; }
  .hdr-date { position: absolute; right: 0; top: 50%; transform: translateY(-50%);
              text-align: right; color: #000000; line-height: 1.35; padding-inline-end: 8px; }
  .hdr-date .hdr-time { font-size: 13px; font-weight: 700; }
  .hdr-date .hdr-date2 { font-size: 12px; font-weight: 600; }
  .hdr-date .hdr-weekday { font-size: 12px; font-weight: 500; margin-top: 2px; }
  .report-header h1 { font-size: 24px; color: #000000; margin-bottom: 4px; letter-spacing: .5px; overflow-wrap: anywhere; }
  .report-header .sub { font-size: 13px; color: #000000; font-weight: 700; }
  /* Structured centered table: # | Calculation | Result | Note */
  table.history-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.history-table thead { display: table-header-group; } /* repeat header on every PDF page */
  table.history-table th,
  table.history-table td {
    border: 1px solid #cbd5e1;
    padding: 7px 8px;
    text-align: center;
    vertical-align: middle;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  table.history-table thead th { background: #0d9488; color: #ffffff; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; }
  table.history-table tbody tr { page-break-inside: avoid; break-inside: avoid; background: #ffffff; }
  table.history-table tbody tr:nth-child(even) { background: #f1f5f9; }
  td.col-num, th.col-num { width: 8%; color: #000000; font-weight: 700; }
  td.col-expr, th.col-expr { width: 37%; color: #000000; font-weight: 600; }
  td.col-result, th.col-result { width: 20%; color: #000000; font-weight: 800; }
  /* RESULT-column overflow tiers: only long values get a smaller font so they stay
     inside the fixed-width Result cell. No base rule — normal numbers keep the
     exact existing (inherited) size. Any still-too-wide value wraps via the
     shared overflow-wrap:anywhere / word-break:break-word fallback. */
  td.col-result.r-sm { font-size: 12px; }
  td.col-result.r-md { font-size: 10px; }
  td.col-result.r-xl { font-size: 9px; }
  td.col-note, th.col-note { width: 35%; color: #334155; }
  .total-summary { margin: 20px auto 0; max-width: 480px; padding: 12px 16px; background: #e0f2f1;
                   border: 1px solid #0d9488; border-radius: 6px; text-align: center;
                   page-break-inside: avoid; break-inside: avoid; }
  .total-summary .total-summary-total { font-size: 15px; color: #000000; font-weight: 800; }
  .total-summary .total-summary-words { margin-top: 4px; font-size: 13px; color: #000000; }
  .report-footer { margin-top: 28px; padding-top: 12px; border-top: 2px solid #0891b2; text-align: center; }
  .report-footer .footer-brand { font-size: 12px; color: #000000; font-weight: 700; }
  .report-footer .footer-domain { display: inline-block; margin-top: 8px; font-size: 12px; color: #000000; }
  .report-footer .footer-domain-sub { font-size: 10px; color: #000000; }
</style>
</head>
<body>
  <div class="report" id="report" dir="${repDir}">
    <div class="report-header">
      <div class="hdr-logo"><span class="hdr-brand">EQ7</span></div>
      <div class="hdr-title"${repDir === 'rtl' ? ' dir="rtl"' : ''}>${titleText
        ? `<h1${pdfCellDir(titleText) === 'rtl' ? ' dir="rtl" style="letter-spacing:0"' : ''}>${escapeHtml(titleText)}</h1>`
        : `<h1>${escapeHtml(brandTitle)}</h1><div class="sub">${escapeHtml(brandSub)}</div>`}</div>
      <div class="hdr-date"${repDir === 'rtl' ? ' dir="rtl"' : ''}><div class="hdr-time">${escapeHtml(hdrTime)}</div><div class="hdr-date2">${escapeHtml(hdrDate)}</div><div class="hdr-weekday">${escapeHtml(hdrWeekday)}</div></div>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-expr"${pdfCellDir(R.colCalc) === 'rtl' ? ' dir="rtl" style="letter-spacing:0"' : ''}>${escapeHtml(R.colCalc)}</th>
          <th class="col-result"${pdfCellDir(R.colResult) === 'rtl' ? ' dir="rtl" style="letter-spacing:0"' : ''}>${escapeHtml(R.colResult)}</th>
          <th class="col-note"${pdfCellDir(R.colNote) === 'rtl' ? ' dir="rtl" style="letter-spacing:0"' : ''}>${escapeHtml(R.colNote)}</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${totalSummaryHtml}
    <div class="report-footer">
      <div class="footer-brand"${repDir === 'rtl' ? ' dir="rtl"' : ''}>${escapeHtml(footerNote)}</div>
      ${APP_DOMAIN ? `<a class="footer-domain" href="${escapeHtml(APP_DOMAIN)}" target="_blank">Open EQ7 Calculator</a>` : ''}
      ${APP_DOMAIN ? `<div class="footer-domain-sub">${escapeHtml(APP_DOMAIN)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;

  // Render the report inside an isolated, off-screen iframe and capture it to a PDF.
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    // html2pdf.does: cloneNode(this.prop.src) and re-parents the clone into the MAIN
    // document (worker.toContainer -> overlay/container on document.body) so html2canvas
    // can screenshot it. Stylesheets from this isolated iframe do NOT travel with that
    // node, so without this the clone would inherit the app's dark color (#f8fafc text)
    // and render invisibly on the white PDF page. Inject the report CSS into the main
    // document so the re-parented clone renders black on white, then remove it in cleanup.
    let mainStyle = null;
    const cleanup = () => {
      try { document.body.removeChild(frame); } catch (e) { /* already removed */ }
      if (mainStyle) { try { document.head.removeChild(mainStyle); } catch (e) { /* already removed */ } }
    };

    const doc = frame.contentDocument;
    if (!doc) {
      cleanup();
      reject(new Error('Could not access report iframe'));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // Put the report stylesheet where html2pdf's clone will actually be rendered.
    mainStyle = document.createElement('style');
    mainStyle.id = 'eq-pdf-report-style';
    mainStyle.textContent = '#report{color:#000000;background:#ffffff;}' +
      (doc.querySelector('style') ? doc.querySelector('style').textContent : '');
    document.head.appendChild(mainStyle);

    // Give the browser a tick so fonts/layout are ready before capturing.
    setTimeout(() => {
      const el = doc.getElementById('report');
      if (!el) {
        cleanup();
        reject(new Error('Report element missing'));
        return;
      }
      window.html2pdf()
        .set({
          margin: 16,
          filename: 'eq-history.pdf',
          image: { type: 'png' },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(el)
        .toPdf()
        .output('blob')
        .then((blob) => { cleanup(); resolve(blob); })
        .catch((err) => { cleanup(); reject(err); });
    }, 120);
  });
}

// Behavioral seam so browser harnesses can build the REAL History PDF blob
// directly (the app is an ES module, so its functions are not on window).
// Mirrors the existing __smart* / __smartSave test-seam convention.
if (typeof window !== 'undefined') {
  window.__historyPdfBlob = buildHistoryPdfBlob;
}

// --- Optional Company Name for the History PDF header (History export only) --
// A DEDICATED button ("Company Name" / "اسم الشركة" etc., all 7 app languages)
// opens this small non-blocking bar. The chosen name is saved and reused by the
// Share button, which never opens this bar. Tiny inline UI — no alert/prompt, no
// global dialog, no permanent change to the default report title.
const HISTORY_COMPANY_KEY = 'eq-history-company-name';
let historyPdfTitleBar = null;

function savedCompanyName() {
  try { return (localStorage.getItem(HISTORY_COMPANY_KEY) || '').trim(); } catch (e) { return ''; }
}
function saveCompanyName(v) {
  try { const s = (v || '').trim(); if (s) localStorage.setItem(HISTORY_COMPANY_KEY, s); else localStorage.removeItem(HISTORY_COMPANY_KEY); } catch (e) {}
}

function openCompanyNamePicker() {
  const R = PDF_REPORT_I18N[state.locale] || PDF_REPORT_I18N.en;
  if (historyPdfTitleBar) { historyPdfTitleBar.remove(); historyPdfTitleBar = null; }
  const bar = document.createElement('div');
  bar.setAttribute('dir', (state.locale === 'ar' || state.locale === 'ku') ? 'rtl' : 'ltr');
  bar.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:10000;' +
    'display:flex;gap:8px;align-items:center;background:#ffffff;color:#000000;border:1px solid #cbd5e1;' +
    'border-radius:10px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.18);max-width:92vw;';
  const label = document.createElement('span');
  label.textContent = R.companyNameBtn || 'Company Name';
  label.style.cssText = 'font-size:13px;color:#000000;white-space:nowrap;';
  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = R.companyNameBtn || 'Company Name';
  input.setAttribute('aria-label', input.placeholder);
  input.value = savedCompanyName();
  input.style.cssText = 'font:inherit;font-size:14px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:8px;min-width:200px;background:#ffffff;color:#000000;';
  const done = (val) => { saveCompanyName(val); bar.remove(); historyPdfTitleBar = null; };
  const useBtn = document.createElement('button');
  useBtn.type = 'button'; useBtn.textContent = '✓'; useBtn.setAttribute('aria-label', 'OK');
  useBtn.style.cssText = 'font:inherit;font-size:16px;padding:6px 14px;border:0;border-radius:8px;background:#0d9488;color:#ffffff;cursor:pointer;';
  useBtn.addEventListener('click', () => done(input.value));
  const defBtn = document.createElement('button');
  defBtn.type = 'button'; defBtn.textContent = '✕'; defBtn.setAttribute('aria-label', 'Clear');
  defBtn.style.cssText = 'font:inherit;font-size:16px;padding:6px 12px;border:0;border-radius:8px;background:#e2e8f0;color:#000000;cursor:pointer;';
  defBtn.addEventListener('click', () => done(''));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(input.value); });
  bar.appendChild(label); bar.appendChild(input); bar.appendChild(useBtn); bar.appendChild(defBtn);
  document.body.appendChild(bar);
  historyPdfTitleBar = bar;
  input.focus(); input.select();
}

function onCompanyNameButton() { openCompanyNamePicker(); }

let shareHistoryInFlight = false; // one Share at a time — no duplicate dialogs
async function exportHistory() {
  if (shareHistoryInFlight) return; // ignore extra clicks while a Share is already open
  shareHistoryInFlight = true;
  try {
    await exportHistoryInner();
  } finally {
    shareHistoryInFlight = false; // always re-arm, even after abort/failure
  }
}

async function exportHistoryInner() {
  triggerButtonFeedback();
  const t = translations[state.locale] || translations.en;
  // Take ONLY the currently selected History entries — never falls back to all.
  const selectedEntries = getSelectedEntries();

  // No selection -> no PDF, no Share. Clear feedback and stop.
  if (!selectedEntries.length) {
    showToast(t.noSelection || 'Select an item to share');
    return;
  }

  // Share is DIRECT: no name input bar, no confirmation, no wait. Just reuse a
  // previously saved Company Name (from the dedicated Company Name button) if
  // one exists, otherwise the existing default report title.
  const companyName = savedCompanyName();
  let pdfBlob;
  try {
    // BOTH variants (default title and saved Company Name) go through the
    // selection cache. The cache variant for the saved name is primed in the
    // background by primeCurrentSelection(), so this await is a microtask on
    // the click path — the transient user activation stays alive and the
    // native Share Sheet opens on the very first click. If not yet primed it
    // is built here once and cached for the next click.
    pdfBlob = await ensureSelectionPdf(selectedEntries, companyName);
  } catch (err) {
    // PART 21: offline → clear translated feedback instead of a generic failure.
    if (err && err.message === 'no-internet') showInternetRequiredToast();
    else showToast('PDF generation failed');
    return;
  }
  if (!pdfBlob) {
    showToast('PDF generation failed');
    return;
  }
  const filename = `eq-history-${Date.now()}.pdf`;
  const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

  // Native System Share Sheet — exactly like the per-entry Share button: the
  // device's own Share apps (WhatsApp / Telegram / Email / etc.). No window.open,
  // no automatic download, no popup workaround, no clipboard fallback.
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: t.shareTitle || 'EQ7 Calculator History',
        text: t.shareMessage || 'Exported from EQ7 Calculator'
      });
      return;
    } catch (e) {
      // User dismissed the Share Sheet -> not an error.
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
        return;
      }
      showToast(t.shareFailed || 'Share failed');
      return;
    }
  }

  // No File Sharing support in this environment -> stop clearly, never a Download.
  showToast('File sharing is not supported in this environment');
}

function updateEntryNote(id, note) {
  const entry = state.history.find(h => h.id === id);
  if (entry) {
    entry.note = note;
    saveHistory();
  }
}

// --- Share PDF priming (first-tap fix) ------------------------------------
// Root cause of "Share sometimes needs two or three clicks": shareEntry used to
// do all its work on the click path — load the html2pdf library from the CDN and
// render the PDF AFTER the user pressed Share. By the time navigator.share() ran,
// the browser's transient user activation was already lost (a network fetch + PDF
// render easily exceeds the activation window), so the first tap failed.
// Fix: prepare and cache each History entry's REAL PDF in the background BEFORE
// the tap. Then shareEntry merely awaits an already-prepared blob (a microtask,
// not real async work) and the native Share Sheet opens on the very first tap.
// The existing buildHistoryPdfBlob([entry]) generator is reused as-is.
const pdfBlobCache = new Map(); // entry.id -> Promise<Blob>

// Selection-set PDF priming so the TOP Share button never renders on the click path.
// The combined PDF for the currently selected entries is prepared in the background
// the moment the user ticks a checkbox, and cached by a signature of the selection.
const selectionPdfCache = new Map(); // sorted-id-signature -> Promise<Blob>

function getSelectedEntries() {
  return Array.from(document.querySelectorAll('.history-select:checked')).map(cb =>
    state.history.find(h => h.id === cb.closest('.history-entry')?.getAttribute('data-id'))
  ).filter(Boolean);
}

function selectionSignature(entries) {
  return entries.map(e => e.id).sort().join('|');
}

function ensureSelectionPdf(entries, customName) {
  if (!entries || !entries.length) return Promise.resolve(null);
  const name = String(customName || '').trim();
  const sig = selectionSignature(entries) + (name ? '\u0000' + name : '');
  let p = selectionPdfCache.get(sig);
  if (!p) {
    p = buildHistoryPdfBlob(entries, name || undefined).catch((err) => {
      selectionPdfCache.delete(sig);
      throw err;
    });
    selectionPdfCache.set(sig, p);
  }
  return p;
}

function primeCurrentSelection() {
  const sel = getSelectedEntries();
  if (!sel.length) return;
  ensureSelectionPdf(sel); // default-title variant
  // Warm the saved-Company-Name variant too. Without this the named export
  // re-rendered the whole PDF on the click path, the transient user activation
  // expired before navigator.share(), and the first tap silently did nothing.
  const companyName = savedCompanyName();
  if (companyName) ensureSelectionPdf(sel, companyName);
}

function primePdfBlobCache() {
  if (!navigator.share || !navigator.canShare) return; // nothing to share to here
  // Serially pre-build a small queue of the most recent entries (background,
  // non-blocking). This warms the CDN library and the blobs off the click path.
  const entries = state.history.filter(e => e && !pdfBlobCache.has(e.id)).slice(0, 5);
  let chain = Promise.resolve();
  for (const entry of entries) {
    chain = chain.then(() => {
      if (pdfBlobCache.has(entry.id)) return;
      const p = buildHistoryPdfBlob([entry]).catch(() => {
        pdfBlobCache.delete(entry.id); // allow a later build attempt
        return null;
      });
      pdfBlobCache.set(entry.id, p);
      return p;
    });
  }
}

function ensurePdfBlob(entry) {
  if (!entry) return Promise.resolve(null);
  let p = pdfBlobCache.get(entry.id);
  if (!p) {
    // Fallback for entries not yet primed (e.g. just calculated): build now. The
    // library is already warm, so this stays inside the user-activation window.
    p = buildHistoryPdfBlob([entry]).catch((err) => {
      pdfBlobCache.delete(entry.id);
      throw err;
    });
    pdfBlobCache.set(entry.id, p);
  }
  return p;
}
async function shareEntry(id) {
  const t = translations[state.locale] || translations.en;
  const entry = state.history.find(h => h.id === id);
  if (!entry) return;

  // The REAL PDF for this entry was prepared ahead of the tap (primePdfBlobCache)
  // and cached by entry id, so this await resolves without real async work on the
  // click path. That keeps the user activation alive and the native Share Sheet
  // opens on the very first tap — no second/third click. It reuses the exact same
  // buildHistoryPdfBlob([entry]) generator and shares a real PDF file.
  let pdfBlob;
  try {
    pdfBlob = await ensurePdfBlob(entry);
  } catch (err) {
    // PART 21: offline → clear translated feedback instead of a generic failure.
    if (err && err.message === 'no-internet') showInternetRequiredToast();
    else showToast('PDF generation failed');
    return;
  }
  if (!pdfBlob) {
    showToast('PDF generation failed');
    return;
  }

  const pdfFile = new File([pdfBlob], 'EQ7-Calculator-History.pdf', { type: 'application/pdf' });

  // Native System Share Sheet, exactly like the original behavior — open the device's own
  // Share Sheet (WhatsApp / Telegram / Email / etc.), but sharing the real PDF instead of text.
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: 'EQ7 Calculator',
        text: 'Created with EQ7 Calculator'
      });
      return;
    } catch (e) {
      // User dismissed the Share Sheet -> not an error.
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
        return;
      }
      // Any other real failure on a share-capable device: surface it and stop, rather
      // than silently turning a Share into a Download.
      showToast(t.shareFailed || 'Share failed');
      return;
    }
  }

  // The current environment does NOT support File Sharing via navigator.share().
  // Stop clearly — never silently turn Share into a Save/Download or a popup workaround.
  showToast('File sharing is not supported in this environment');
}

function startHistoryCountdown() {
  stopHistoryCountdown();
  state.historyCountdownTimer = setInterval(updateHistoryCountdown, 1000);
}

function stopHistoryCountdown() {
  if (state.historyCountdownTimer) {
    clearInterval(state.historyCountdownTimer);
    state.historyCountdownTimer = null;
  }
}

function updateHistoryCountdown() {
  const now = Date.now();
  const t = translations[state.locale] || translations.en;
  const remainingLabel = t.historyRemaining || 'remaining';
  cleanupExpiredHistory();
  if (!state.history.length) {
    if (historyList) renderHistory();
    stopHistoryCountdown();
    return;
  }
  // Performance: use cached data-ts timestamps, no per-element lookup
  document.querySelectorAll('.history-entry').forEach((el) => {
    const remainingEl = el.querySelector('.history-remaining');
    if (!remainingEl) return;
    const ts = Number(remainingEl.getAttribute('data-ts')) || 0;
    if (!ts) {
      el.remove();
      return;
    }
    const remaining = HISTORY_TTL - (now - ts);
    if (remaining <= 0) {
      el.remove();
      return;
    }
    remainingEl.textContent = `${formatRemainingTime(remaining)} ${remainingLabel}`;
  });
}

// ============================================================
// NOTES SYSTEM
// ============================================================
const UNFILED_FOLDER_ID = '__unfiled__';

function loadNoteData() {
  try {
    const foldersRaw = localStorage.getItem(FOLDERS_KEY);
    const notesRaw = localStorage.getItem(NOTES_MANAGER_KEY);
    state.folders = foldersRaw ? JSON.parse(foldersRaw) : [];
    state.noteData.notes = notesRaw ? JSON.parse(notesRaw) : [];
    state.noteData.folders = state.folders;
    state.noteData.activeFolder = state.activeFolder;
    if (!state.folders.length) {
      const defaultFolder = { id: 'personal', name: 'Personal', createdAt: Date.now() };
      state.folders = [defaultFolder];
      saveFolders();
    }
  } catch (e) {
    state.folders = [];
    state.noteData.notes = [];
  }
}

function saveFolders() {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(state.folders));
  } catch (e) { /* ignore */ }
}

function saveNotesData() {
  try {
    localStorage.setItem(NOTES_MANAGER_KEY, JSON.stringify(state.noteData.notes));
  } catch (e) { /* ignore */ }
}

function persistNoteData() {
  saveFolders();
  saveNotesData();
}

function getActiveFolder() {
  return state.activeFolder || (state.folders.length ? state.folders[0].id : UNFILED_FOLDER_ID);
}

function setActiveFolder(folderId) {
  state.activeFolder = folderId;
  state.noteData.activeFolder = folderId;
  renderNotes();
}

function getNotesForActiveFolder() {
  const folderId = getActiveFolder();
  const active = getActiveNotes();
  if (folderId === UNFILED_FOLDER_ID) {
    return active.filter(n => !n.folderId || !state.folders.some(f => f.id === n.folderId));
  }
  return active.filter(n => n.folderId === folderId);
}

function getFolderOptions() {
  return state.folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
}

function renderFolders() {
  renderFolderTabs();
}

function openNotesManager() {
  if (notesManagerModal) {
    notesManagerModal.classList.add('show');
    notesManagerModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  loadNoteData();
  switchNotesView('notes');
  // N02 — reset search on open and sync the sort control (default: Newest).
  state.noteSearch = '';
  if (notesSearchInput) notesSearchInput.value = '';
  if (notesSortSelect) notesSortSelect.value = state.noteSort || 'newest';
  renderFolderTabs();
  renderNotes();
}

function closeNotesManager() {
  if (notesManagerModal) {
    notesManagerModal.classList.remove('show');
    notesManagerModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// ============================================================
// SMART DOCUMENTS — CLEAN RESET
// The previous Smart Documents tools (scan/OCR, PDF import + in-place
// PDF editor, blank document editor, tables/images/logo/signature tools,
// templates, drafts storage, review and PDF export) were removed in the
// Smart Documents clean-reset phase. The existing entry point
// (#smartDocsModal) is KEPT and opens an EMPTY workspace. The seams below
// remain as no-op hooks so the History bridge (PART 35) and any remaining
// callers keep working without errors.
// ============================================================
let smartDocsStep = 1; // single empty stage after the reset

function smartDocStepsReached() { /* stepper UI removed with the reset */ }

function setSmartDocsStep(rawStep) {
  smartDocsStep = Math.min(4, Math.max(1, parseInt(rawStep, 10) || 1));
  return smartDocsStep;
}

function renderSmartDocsSteps() { /* no stepper UI after the reset */ }

// No-op hook kept for behavioral tests / future phases.
window.__smartDocsWorkflow = {
  setStep: (n) => setSmartDocsStep(n),
  getStep: () => smartDocsStep,
  render: () => renderSmartDocsSteps()
};

// Scan seam reduced to a stable no-op surface (nothing to scan anymore).
window.__smartScan = {
  getState: () => ({ stage: 'home', step: smartDocsStep, result: null, recognized: null, inkRatio: 0, structure: null, activeTracks: [], cameraMode: 'auto' }),
  open: () => { openSmartDocs(); },
  setOcrResult: () => {},
  clearOcrResult: () => {},
  analyzeStructure: () => null,
  debugMode: () => {},
  reset: () => {},
  stopCamera: () => {},
  activeTracks: () => [],
  isStreamStopped: () => true
};

// PART 35 (History bridge) targets — the bridge still works: it opens the
// empty Smart Documents workspace; there is no content surface after the
// reset, so the snapshot copy step resolves to null and stops cleanly.
function smartBlankOpen() { openSmartDocs(); }
function smartActivePageContent() { return null; }

// SHARED PDF LIBRARY LOADERS — kept verbatim because they are used by OTHER
// features (PDF V1 page-count/export and the History PDF export), not only by
// the removed Smart Documents tools. Nothing here is Smart-Documents UI logic.
// --- PDF parsing / text extraction  (independent of OCR) ---
async function smartImportLoadPdfJs() {
  if (window.pdfjsLib) {
    if (window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
    return window.pdfjsLib;
  }
  const s = document.createElement('script');
  s.src = '/__pdfdiag/vendor/pdf.min.js';
  await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('pdfjs load failed')); document.head.appendChild(s); });
  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/__pdfdiag/vendor/pdf.worker.min.js';
  return window.pdfjsLib;
}

// Lazily loaded pdf-lib (vendored UMD build exposes window.PDFLib).
let smartPdfLibPromise = null;
async function smartImportLoadPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  if (!smartPdfLibPromise) {
    smartPdfLibPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/__pdfdiag/vendor/pdf-lib.min.js';
      s.onload = () => res(window.PDFLib);
      s.onerror = () => rej(new Error('pdf-lib load failed'));
      document.head.appendChild(s);
    });
  }
  return smartPdfLibPromise;
}

// ============================================================
// PHASE 01 — PDF Reports Workspace (entry point only).
// A clean, standalone workspace for upcoming PDF Reports phases.
// No PDF tooling here yet — it reuses the existing modal
// navigation pattern (show / aria-hidden / modal-open) exactly
// like the other drawer destinations. Back button uses the same
// close path. (No new navigation system.)
// ============================================================
function openPdfReportsWorkspace() {
  const ws = document.getElementById('pdfReportsWorkspace');
  if (!ws) return;
  ws.classList.add('show');
  ws.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closePdfReportsWorkspace() {
  const ws = document.getElementById('pdfReportsWorkspace');
  if (!ws) return;
  ws.classList.remove('show');
  ws.setAttribute('aria-hidden', 'true');
  // Release the body lock only if no other modal/workspace is still open.
  const anyOpen = document.querySelector('.modal.show, .workspace-overlay.show, .settings-modal-backdrop.show');
  if (!anyOpen) document.body.classList.remove('modal-open');
}

// ============================================================
// PDF V1 — Phase 1: Document Import ONLY (scoped to #pdfReportsWorkspace).
// Upload PDF via native file picker + desktop drag & drop, then view it in
// the same workspace with the native browser PDF viewer (iframe + blob URL).
// No export/print/share/edit/Phase-2 features live here.
// ============================================================
let pdfV1ObjectUrl = null;
let pdfV1Wired = false;

function pdfV1ShowError(message) {
  const err = document.getElementById('pdfV1Error');
  if (!err) return;
  if (!message) {
    err.textContent = '';
    err.hidden = true;
    return;
  }
  err.textContent = message;
  err.hidden = false;
}

function pdfV1IsPdfFile(file) {
  if (!file) return false;
  const name = String(file.name || '').toLowerCase();
  const type = String(file.type || '').toLowerCase();
  if (type === 'application/pdf') return true;
  if (type === 'application/x-pdf' || type === 'application/acrobat') return true;
  if (name.endsWith('.pdf')) return true;
  return false;
}

function pdfV1OpenFile(file) {
  if (!file) return false;
  if (!pdfV1IsPdfFile(file)) {
    pdfV1ShowError('That file is not a PDF. Please choose a .pdf file.');
    return false;
  }
  pdfV1ShowError('');
  try {
    if (pdfV1ObjectUrl) URL.revokeObjectURL(pdfV1ObjectUrl);
  } catch (e) { /* ignore */ }
  pdfV1ObjectUrl = URL.createObjectURL(file);
  const viewer = document.getElementById('pdfV1Viewer');
  const wrap = document.getElementById('pdfV1ViewerWrap');
  const nameEl = document.getElementById('pdfV1FileName');
  if (viewer) viewer.setAttribute('src', pdfV1ObjectUrl);
  if (nameEl) nameEl.textContent = file.name || 'document.pdf';
  if (wrap) wrap.hidden = false;
  try { if (typeof pdfV1P2AfterOpen === 'function') pdfV1P2AfterOpen(file); } catch (e) {}
  return true;
}

function pdfV1WireImport() {
  if (pdfV1Wired) return;
  const input = document.getElementById('pdfV1FileInput');
  const dropzone = document.getElementById('pdfV1Dropzone');
  const browse = document.getElementById('pdfV1BrowseBtn');
  const change = document.getElementById('pdfV1ChangeBtn');
  if (!input || !dropzone) return;
  pdfV1Wired = true;

  const openPicker = () => {
    pdfV1ShowError('');
    input.click();
  };
  if (browse) browse.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
  if (change) change.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
  dropzone.addEventListener('click', openPicker);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return; // user cancelled the picker — stay on the import screen
    pdfV1OpenFile(file);
    input.value = '';
  });

  // Desktop/laptop drag & drop (scoped to this workspace dropzone only).
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('pdfv1-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('pdfv1-dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const files = (e.dataTransfer && e.dataTransfer.files) || [];
    if (!files.length) return;
    pdfV1OpenFile(files[0]);
  });
}

function openSmartDocs() {
  if (smartDocsModal) {
    smartDocsModal.classList.add('show');
    smartDocsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  // The workspace always opens on its single empty stage after the reset.
  setSmartDocsStep(1);
}

function closeSmartDocs() {
  if (smartDocsModal) {
    smartDocsModal.classList.remove('show');
    smartDocsModal.setAttribute('aria-hidden', 'true');
    if (document.body.classList.contains('modal-open') &&
        !(notesManagerModal && notesManagerModal.classList.contains('show'))) {
      document.body.classList.remove('modal-open');
    }
  }
}

// PDF V1 — Phase 2: Light Overlay ONLY (scoped to #pdfReportsWorkspace).
// Session-local per-page items over the current page area only.
// Pointer Events cover mouse + touch + pen. Stage uses LTR coords.
let pdfV1P2PageCount = 1;
let pdfV1P2Cur = 1;
let pdfV1P2Seq = 1;
let pdfV1P2Items = {};
let pdfV1P2Sel = null;
let pdfV1P2Wired = false;
let pdfV1P2SigInk = false;

function pdfV1P2El(id) { return document.getElementById(id); }
function pdfV1P2List() {
  const k = String(pdfV1P2Cur);
  if (!pdfV1P2Items[k]) pdfV1P2Items[k] = [];
  return pdfV1P2Items[k];
}
function pdfV1P2Lang() {
  try {
    const l = (document.documentElement && document.documentElement.getAttribute('lang')) || '';
    if (l) return l.toLowerCase();
  } catch (e) {}
  return 'en';
}
function pdfV1P2AfterOpen(file) {
  pdfV1P2Items = {};
  pdfV1P2Cur = 1;
  pdfV1P2Sel = null;
  pdfV1P2PageCount = 1;
  try { pdfV1P2File = file || null; } catch (e) {} // Phase 3: keep the File for Export only
  try { pdfV1P2Wire(); } catch (e) {}
  try {
    const t = pdfV1P2El('pdfV1Tools');
    if (t) t.hidden = false;
    const sw = pdfV1P2El('pdfV1SigWrap');
    if (sw) sw.hidden = true;
    const tr = pdfV1P2El('pdfV1TextRow');
    if (tr) tr.hidden = true;
  } catch (e) {}
  pdfV1P2PaintPager();
  pdfV1P2Render();
  try {
    const p = pdfV1P2CountPages(file);
    if (p && typeof p.then === 'function') {
      p.then((n) => {
        if (n && n > 1) pdfV1P2PageCount = n;
        pdfV1P2PaintPager();
        pdfV1P2Render();
      }).catch(() => {});
    }
  } catch (e) {}
}
async function pdfV1P2CountPages(file) {
  try {
    if (!file) return 1;
    const buf = await file.arrayBuffer();
    let lib = null;
    try {
      if (typeof smartImportLoadPdfJs === 'function') lib = await smartImportLoadPdfJs();
      else if (window.pdfjsLib) lib = window.pdfjsLib;
    } catch (e) { lib = window.pdfjsLib || null; }
    if (!lib || !lib.getDocument) return 1;
    const task = lib.getDocument({ data: buf });
    const doc = await (task && task.promise ? task.promise : task);
    const n = doc && doc.numPages ? Number(doc.numPages) : 1;
    try { if (doc && typeof doc.destroy === 'function') await doc.destroy(); } catch (e) {}
    return (n >= 1 && n <= 5000) ? n : 1;
  } catch (e) { return 1; }
}
function pdfV1P2PaintPager() {
  const lbl = pdfV1P2El('pdfV1PgLabel');
  if (lbl) {
    const ar = pdfV1P2Lang().indexOf('ar') === 0;
    lbl.textContent = ar
      ? ('صفحة التراكب ' + pdfV1P2Cur + ' من ' + pdfV1P2PageCount)
      : ('Page ' + pdfV1P2Cur + ' of ' + pdfV1P2PageCount);
  }
  const prev = pdfV1P2El('pdfV1PrevPg');
  const next = pdfV1P2El('pdfV1NextPg');
  if (prev) prev.disabled = !(pdfV1P2Cur > 1);
  if (next) next.disabled = !(pdfV1P2Cur < pdfV1P2PageCount);
  const del = pdfV1P2El('pdfV1DelBtn');
  if (del) del.disabled = !pdfV1P2Sel;
}
function pdfV1P2Clamp(it) {
  const keep = 0.05;
  const w = Math.min(0.95, Math.max(0.06, Number(it.w) || 0.2));
  let h = Math.min(0.95, Math.max(0.05, Number(it.h) || 0.15));
  it.w = w; it.h = h;
  it.x = Math.min(1 - keep, Math.max(keep - w, Number(it.x) || 0));
  it.y = Math.min(1 - keep, Math.max(keep - h, Number(it.y) || 0));
  return it;
}
function pdfV1P2Rect() {
  const l = pdfV1P2El('pdfV1Layer');
  return l ? l.getBoundingClientRect() : { left: 0, top: 0, width: 1, height: 1 };
}
function pdfV1P2Style(el, it, layer) {
  // Enforce the locked aspect for image items at render time (prevents any
  // drift when the layer size changed between creation and display).
  if (it.kind !== 'text' && it.aspect && layer) {
    it.h = Math.min(0.95, Math.max(0.05, it.w * (Math.max(1, layer.clientWidth) / Math.max(1, layer.clientHeight)) / it.aspect));
  }
  el.style.left = (it.x * 100) + '%';
  el.style.top = (it.y * 100) + '%';
  el.style.width = (it.w * 100) + '%';
  el.style.height = (it.h * 100) + '%';
  if (it.kind === 'text') {
    const inner = el.querySelector('.pdfv1-item-text');
    if (inner && layer && layer.clientHeight) {
      inner.style.fontSize = Math.max(10, Math.min(44, layer.clientHeight * it.h * 0.42)) + 'px';
    }
  }
}
function pdfV1P2Render() {
  const layer = pdfV1P2El('pdfV1Layer');
  if (!layer) return;
  layer.innerHTML = '';
  pdfV1P2List().forEach((it) => {
    const el = document.createElement('div');
    el.className = 'pdfv1-item' + (pdfV1P2Sel === it.id ? ' pdfv1-selected' : '');
    el.dataset.pid = String(it.id);
    el.setAttribute('tabindex', '0');
    if (it.kind === 'text') {
      const inner = document.createElement('div');
      inner.className = 'pdfv1-item-text';
      inner.textContent = it.text || '';
      el.appendChild(inner);
    } else {
      const img = document.createElement('img');
      img.alt = '';
      img.draggable = false;
      img.src = it.src;
      el.appendChild(img);
    }
    const hd = document.createElement('div');
    hd.className = 'pdfv1-handle';
    hd.textContent = '◢';
    el.appendChild(hd);
    pdfV1P2Style(el, it, layer);
    pdfV1P2Gest(el, it, hd);
    layer.appendChild(el);
  });
  pdfV1P2PaintPager();
}
function pdfV1P2Select(id) {
  pdfV1P2Sel = id || null;
  const layer = pdfV1P2El('pdfV1Layer');
  if (layer) {
    Array.prototype.forEach.call(layer.children, (c) => {
      c.classList.toggle('pdfv1-selected', c.dataset && c.dataset.pid === String(pdfV1P2Sel));
    });
  }
  pdfV1P2PaintPager();
}
function pdfV1P2Gest(el, it, hd) {
  el.addEventListener('pointerdown', (e) => {
    if (e.target === hd || (e.target.closest && e.target.closest('.pdfv1-handle'))) return;
    e.preventDefault();
    pdfV1P2Select(it.id);
    const r = pdfV1P2Rect();
    const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y;
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    const mv = (ev) => {
      it.x = ox + (ev.clientX - sx) / Math.max(1, r.width);
      it.y = oy + (ev.clientY - sy) / Math.max(1, r.height);
      pdfV1P2Clamp(it);
      pdfV1P2Style(el, it, pdfV1P2El('pdfV1Layer'));
    };
    const up = () => {
      try { el.removeEventListener('pointermove', mv); } catch (err) {}
      try { el.removeEventListener('pointerup', up); } catch (err) {}
      try { el.removeEventListener('pointercancel', up); } catch (err) {}
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); pdfV1P2Del(); }
  });
  hd.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    pdfV1P2Select(it.id);
    const r = pdfV1P2Rect();
    const sx = e.clientX, sy = e.clientY, ow = it.w, oh = it.h;
    try { hd.setPointerCapture(e.pointerId); } catch (err) {}
    const mv = (ev) => {
      const dx = (ev.clientX - sx) / Math.max(1, r.width);
      const dy = (ev.clientY - sy) / Math.max(1, r.height);
      if (it.kind === 'text') {
        it.w = ow + dx;
        it.h = oh + dy;
      } else {
        let nw = ow + dx;
        const proj = dy * (Math.max(1, r.height) / Math.max(1, r.width)) * (it.aspect || 1);
        if (Math.abs(proj) > Math.abs(dx)) nw = ow + proj;
        it.w = Math.min(0.95, Math.max(0.06, nw));
        const asp = it.aspect && it.aspect > 0 ? it.aspect : 1;
        it.h = it.w * (Math.max(1, r.width) / Math.max(1, r.height)) / asp;
      }
      pdfV1P2Clamp(it);
      if (it.kind !== 'text') {
        const r2 = pdfV1P2Rect();
        const asp = it.aspect && it.aspect > 0 ? it.aspect : 1;
        it.h = it.w * (Math.max(1, r2.width) / Math.max(1, r2.height)) / asp;
      }
      pdfV1P2Style(el, it, pdfV1P2El('pdfV1Layer'));
    };
    const up = () => {
      try { hd.removeEventListener('pointermove', mv); } catch (err) {}
      try { hd.removeEventListener('pointerup', up); } catch (err) {}
      try { hd.removeEventListener('pointercancel', up); } catch (err) {}
    };
    hd.addEventListener('pointermove', mv);
    hd.addEventListener('pointerup', up);
    hd.addEventListener('pointercancel', up);
  });
}
function pdfV1P2AddImg(src, aspect) {
  const layer = pdfV1P2El('pdfV1Layer');
  const lw = (layer && layer.clientWidth) || 600;
  const lh = (layer && layer.clientHeight) || 700;
  const asp = aspect && aspect > 0 ? aspect : 1;
  const w = 0.34;
  let h = w * (lw / Math.max(1, lh)) / asp;
  if (!(h > 0) || h > 0.6) h = 0.22;
  const it = { id: pdfV1P2Seq++, kind: 'img', x: (1 - w) / 2, y: 0.36, w: w, h: h, src: src, text: '', aspect: asp };
  pdfV1P2Clamp(it);
  pdfV1P2List().push(it);
  pdfV1P2Select(it.id);
  pdfV1P2Render();
}
function pdfV1P2AddText(str) {
  const t = String(str || '').slice(0, 80).trim();
  if (!t) return false;
  const it = { id: pdfV1P2Seq++, kind: 'text', x: 0.28, y: 0.42, w: 0.44, h: 0.11, src: '', text: t, aspect: 0 };
  pdfV1P2Clamp(it);
  pdfV1P2List().push(it);
  pdfV1P2Select(it.id);
  pdfV1P2Render();
  return true;
}
function pdfV1P2AddDate() {
  let s = '';
  try {
    const loc = pdfV1P2Lang();
    const tag = loc.indexOf('ar') === 0 ? 'ar' : loc;
    s = new Date().toLocaleDateString(tag, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { s = new Date().toLocaleDateString(); }
  return pdfV1P2AddText(s);
}
function pdfV1P2Del() {
  if (!pdfV1P2Sel) return;
  const list = pdfV1P2List();
  const i = list.findIndex((o) => String(o.id) === String(pdfV1P2Sel));
  if (i >= 0) list.splice(i, 1);
  pdfV1P2Select(null);
  pdfV1P2Render();
}
function pdfV1P2ReadImg(file, cb) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    const url = String(rd.result || '');
    const im = new Image();
    im.onload = () => {
      const a = (im.naturalWidth && im.naturalHeight) ? (im.naturalWidth / im.naturalHeight) : 1;
      cb(url, a || 1);
    };
    im.onerror = () => cb(url, 1);
    im.src = url;
  };
  rd.readAsDataURL(file);
}
function pdfV1P2PadReset() {
  const c = pdfV1P2El('pdfV1SigCanvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  pdfV1P2SigInk = false;
}
function pdfV1P2PadPos(e) {
  const c = pdfV1P2El('pdfV1SigCanvas');
  const r = c.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * (c.width / Math.max(1, r.width)),
    y: (e.clientY - r.top) * (c.height / Math.max(1, r.height))
  };
}
function pdfV1P2PadWire() {
  const c = pdfV1P2El('pdfV1SigCanvas');
  if (!c || c.dataset.pdfv1wired === '1') return;
  c.dataset.pdfv1wired = '1';
  const ctx = c.getContext('2d');
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0f172a';
  let down = false, last = null;
  c.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    down = true;
    last = pdfV1P2PadPos(e);
    try { c.setPointerCapture(e.pointerId); } catch (err) {}
  });
  c.addEventListener('pointermove', (e) => {
    if (!down) return;
    e.preventDefault();
    const p = pdfV1P2PadPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
    pdfV1P2SigInk = true;
  });
  const up = () => { down = false; last = null; };
  c.addEventListener('pointerup', up);
  c.addEventListener('pointercancel', up);
  c.addEventListener('contextmenu', (e) => e.preventDefault());
}
function pdfV1P2Wire() {
  if (pdfV1P2Wired) return;
  const need = ['pdfV1StampBtn', 'pdfV1SigDrawBtn', 'pdfV1SigUploadBtn', 'pdfV1TextBtn', 'pdfV1DateBtn', 'pdfV1Layer'];
  if (!need.every((id) => !!pdfV1P2El(id))) return;
  pdfV1P2Wired = true;
  pdfV1P2El('pdfV1StampBtn').addEventListener('click', () => {
    const i = pdfV1P2El('pdfV1StampInput');
    if (i) i.click();
  });
  pdfV1P2El('pdfV1SigUploadBtn').addEventListener('click', () => {
    const i = pdfV1P2El('pdfV1SigFileInput');
    if (i) i.click();
  });
  pdfV1P2El('pdfV1StampInput').addEventListener('change', (e) => {
    const f = e.target && e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) pdfV1P2ReadImg(f, (url, a) => pdfV1P2AddImg(url, a));
  });
  pdfV1P2El('pdfV1SigFileInput').addEventListener('change', (e) => {
    const f = e.target && e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) pdfV1P2ReadImg(f, (url, a) => pdfV1P2AddImg(url, a));
  });
  pdfV1P2El('pdfV1SigDrawBtn').addEventListener('click', () => {
    const w = pdfV1P2El('pdfV1SigWrap');
    if (w) w.hidden = false;
    pdfV1P2PadWire();
    pdfV1P2PadReset();
  });
  pdfV1P2El('pdfV1SigClearBtn').addEventListener('click', pdfV1P2PadReset);
  pdfV1P2El('pdfV1SigCancelBtn').addEventListener('click', () => {
    const w = pdfV1P2El('pdfV1SigWrap');
    if (w) w.hidden = true;
  });
  pdfV1P2El('pdfV1SigPlaceBtn').addEventListener('click', () => {
    if (!pdfV1P2SigInk) return;
    const c = pdfV1P2El('pdfV1SigCanvas');
    let url = '';
    try { url = c.toDataURL('image/png'); } catch (e) { return; }
    const asp = (c.width && c.height) ? (c.width / c.height) : 2.3;
    const w = pdfV1P2El('pdfV1SigWrap');
    if (w) w.hidden = true;
    pdfV1P2AddImg(url, asp);
  });
  pdfV1P2El('pdfV1TextBtn').addEventListener('click', () => {
    const r = pdfV1P2El('pdfV1TextRow');
    if (r) r.hidden = false;
    const inp = pdfV1P2El('pdfV1TextInput');
    if (inp) inp.focus();
  });
  pdfV1P2El('pdfV1TextCancelBtn').addEventListener('click', () => {
    const r = pdfV1P2El('pdfV1TextRow');
    if (r) r.hidden = true;
  });
  pdfV1P2El('pdfV1TextAddBtn').addEventListener('click', () => {
    const inp = pdfV1P2El('pdfV1TextInput');
    if (pdfV1P2AddText(inp ? inp.value : '')) {
      if (inp) inp.value = '';
      const r = pdfV1P2El('pdfV1TextRow');
      if (r) r.hidden = true;
    }
  });
  pdfV1P2El('pdfV1DateBtn').addEventListener('click', pdfV1P2AddDate);
  pdfV1P2El('pdfV1DelBtn').addEventListener('click', pdfV1P2Del);
  try { if (typeof pdfV1ExportWire === 'function') pdfV1ExportWire(); } catch (e) {} // Phase 3

  pdfV1P2El('pdfV1PrevPg').addEventListener('click', () => {
    if (pdfV1P2Cur > 1) { pdfV1P2Cur -= 1; pdfV1P2Select(null); pdfV1P2Render(); }
  });
  pdfV1P2El('pdfV1NextPg').addEventListener('click', () => {
    if (pdfV1P2Cur < pdfV1P2PageCount) { pdfV1P2Cur += 1; pdfV1P2Select(null); pdfV1P2Render(); }
  });
  pdfV1P2El('pdfV1Layer').addEventListener('pointerdown', (e) => {
    if (e.target && e.target.id === 'pdfV1Layer') pdfV1P2Select(null);
  });
  window.addEventListener('resize', () => {
    try {
      const r = pdfV1P2Rect();
      Object.keys(pdfV1P2Items).forEach((k) => {
        (pdfV1P2Items[k] || []).forEach((it) => {
          if (it.kind !== 'text' && it.aspect) {
            it.h = it.w * (Math.max(1, r.width) / Math.max(1, r.height)) / it.aspect;
            pdfV1P2Clamp(it);
          }
        });
      });
      pdfV1P2Render();
    } catch (e) {}
  });
}

// ============================================================
// PDF V1 — Phase 3: EXPORT ONLY (scoped to #pdfReportsWorkspace).
// Merges the Phase 2 per-page overlays into the ORIGINAL PDF using the
// already-vendored pdf-lib (smartImportLoadPdfLib — no new dependency).
// The original page content streams are NEVER re-rendered or rasterized:
// pdf-lib keeps every original page (vector text, embedded images, exact
// page size / orientation / ratio) untouched and we only APPEND overlay
// operators to each page in a strict page-by-page loop. Each page's
// temporaries (embedded image handle / small text canvas) are released
// before the next page starts. No giant document canvas is ever created.
// Limitation (recorded): text/date overlays are rendered through a small
// per-item canvas → PNG so Arabic shaping and RTL survive (pdf-lib's
// standard fonts cannot encode Arabic). This is a tiny item-sized canvas,
// never a page/document-sized one.
// ============================================================
let pdfV1P2File = null;      // current PDF File (kept for Export only)
let pdfV1ExportBusy = false; // guards against double-click re-entry

function pdfV1ExportLangIsAr() {
  try { return String(pdfV1P2Lang()).indexOf('ar') === 0; } catch (e) { return false; }
}

function pdfV1ExportBtnLabel(i, n) {
  if (pdfV1ExportLangIsAr()) return i ? ('جارٍ التصدير ' + i + ' / ' + n) : '⬇️ تصدير';
  return i ? ('Exporting ' + i + ' / ' + n) : '⬇️ Export';
}

function pdfV1ExportDataUrlMime(src) {
  return /^data:image\/jpeg/i.test(String(src)) ? 'jpeg' : 'png';
}

// Release a temporary canvas' backing store immediately (memory safety).
function pdfV1ExportReleaseCanvas(c) {
  try { c.width = 0; c.height = 0; } catch (e) {}
}

// Render ONE text/date overlay into a SMALL item-sized transparent PNG canvas.
// Mirrors the viewer chip (.pdfv1-item-text): light chip, dark navy bold text,
// centered, natural bidi/RTL handled by the canvas text engine.
function pdfV1ExportTextToPng(it, boxWpt, boxHpt) {
  const scale = 3; // render density (capped so we never build a huge bitmap)
  const w = Math.round(Math.max(8, Math.min(2200, boxWpt * scale)));
  const h = Math.round(Math.max(8, Math.min(2200, boxHpt * scale)));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('text canvas unavailable');
  // Chip background + border (matches the viewer overlay style).
  ctx.fillStyle = 'rgba(255, 255, 235, 0.92)';
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, Math.min(12, h * 0.3));
    ctx.fill();
  } else {
    ctx.fillRect(1, 1, w - 2, h - 2);
  }
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = Math.max(1, Math.round(scale * 0.7));
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(1, 1, w - 2, h - 2, Math.min(12, h * 0.3));
    ctx.stroke();
  } else {
    ctx.strokeRect(1, 1, w - 2, h - 2);
  }
  // Text: same proportional size as the viewer (box height * 0.42, bold).
  const fs = Math.max(6, h * 0.42);
  ctx.font = 'bold ' + fs + 'px sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  try { ctx.direction = 'auto'; } catch (e) {}
  ctx.fillText(String(it.text || ''), w / 2, h / 2, Math.max(6, w * 0.94));
  const url = c.toDataURL('image/png');
  pdfV1ExportReleaseCanvas(c); // release the temporary surface right away
  return url;
}

// PDF V1 — Phase 4: Native file share of the SAME Phase 3 output blob.
// Uses the real Web Share API with FILES (never url/text). The OS decides which
// apps appear in the native Share Sheet. Rules:
//  - File sharing unsupported  -> return false  (caller uses the existing Download)
//  - User cancelled the sheet  -> return true   (NOT an error, NO forced download)
//  - Unexpected share failure  -> in-workspace error shown, return false (Download fallback)
async function pdfV1ExportTryShare(blob, filename) {
  try {
    if (!navigator.share || !navigator.canShare) return false; // no Web Share API -> download
    const pdfFile = new File([blob], filename, { type: 'application/pdf' });
    if (!navigator.canShare({ files: [pdfFile] })) return false; // FILE sharing unsupported -> download
    await navigator.share({ files: [pdfFile], title: filename });
    return true; // handed to the OS sheet (or the user dismissed it)
  } catch (e) {
    // User dismissed / aborted the native Share Sheet -> not an error, no download.
    if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return true;
    // Real failure -> show it inside the PDF Workspace, then fall back to Download.
    try { pdfV1ShowError(pdfV1ExportLangIsAr() ? 'تعذّرت المشاركة. سيتم التنزيل بدلاً من ذلك.' : 'Sharing failed. Downloading instead.'); } catch (err) {}
    return false;
  }
}

// Existing Phase 3 Download path, byte-for-byte (same blob, same naming logic).
function pdfV1ExportDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 5000);
}

async function pdfV1Export() {
  if (pdfV1ExportBusy) return;
  const btn = pdfV1P2El('pdfV1ExportBtn');
  if (!pdfV1P2File) {
    pdfV1ShowError(pdfV1ExportLangIsAr() ? 'افتح ملف PDF أولاً ثم صدّر.' : 'Open a PDF first, then Export.');
    return;
  }
  pdfV1ExportBusy = true;
  const origLabel = btn ? btn.textContent : '';
  try {
    if (btn) btn.disabled = true;
    // Existing vendored pdf-lib loader (no new dependency).
    const lib = (typeof smartImportLoadPdfLib === 'function') ? await smartImportLoadPdfLib() : window.PDFLib;
    if (!lib || !lib.PDFDocument) throw new Error('pdf-lib unavailable');
    const bytes = await pdfV1P2File.arrayBuffer();
    const pdf = await lib.PDFDocument.load(bytes, { ignoreEncryption: true });
    const n = pdf.getPageCount();
    if (!n || n < 1) throw new Error('no pages');
    // ---- page-by-page loop (page isolation + chunked memory use) ----
    for (let p = 1; p <= n; p++) {
      if (btn) btn.textContent = pdfV1ExportBtnLabel(p, n);
      const items = pdfV1P2Items[String(p)] || [];
      if (!items.length) continue; // this page keeps its original content only
      const page = pdf.getPage(p - 1);
      const size = page.getSize();
      const pw = size.width, ph = size.height; // original page size preserved
      for (let k = 0; k < items.length; k++) {
        const it = items[k];
        const bw = Math.max(1, it.w * pw);
        const bh = Math.max(1, it.h * ph);
        const bx = Math.max(0, Math.min(pw - 1, it.x * pw));
        const by = Math.max(0, ph - it.y * ph - bh); // flip: viewer y is top-origin
        if (it.kind === 'text') {
          const url = pdfV1ExportTextToPng(it, bw, bh);
          const img = await pdf.embedPng(url);
          page.drawImage(img, { x: bx, y: by, width: bw, height: bh });
        } else {
          const mime = pdfV1ExportDataUrlMime(it.src);
          const img = (mime === 'jpeg') ? await pdf.embedJpg(it.src) : await pdf.embedPng(it.src);
          page.drawImage(img, { x: bx, y: by, width: bw, height: bh });
        }
        // per-item temporaries die here; embedded handles live only in the doc
      }
    }
    const out = await pdf.save();
    // ---- finalize: share the SAME output via the native sheet when supported,
    // otherwise fall back to the existing Download (never both) ----
    const blob = new Blob([out], { type: 'application/pdf' });
    const base = String(pdfV1P2File.name || 'document.pdf').replace(/\.pdf$/i, '');
    const filename = base + '-edited.pdf';
    const shared = await pdfV1ExportTryShare(blob, filename);
    if (!shared) pdfV1ExportDownload(blob, filename);
  } catch (e) {
    // Error handling: no crash, no stuck loading state, error shown in-workspace.
    try { pdfV1ShowError(pdfV1ExportLangIsAr() ? 'فشل التصدير. حاول مرة أخرى.' : 'Export failed. Please try again.'); } catch (err) {}
  } finally {
    pdfV1ExportBusy = false;
    if (btn) { btn.disabled = false; btn.textContent = origLabel; }
  }
}

function pdfV1ExportWire() {
  const btn = pdfV1P2El('pdfV1ExportBtn');
  if (!btn || btn.dataset.pdfv1exportwired === '1') return;
  btn.dataset.pdfv1exportwired = '1';
  btn.addEventListener('click', () => {
    try { pdfV1Export(); } catch (e) {
      try { pdfV1ShowError('Export failed. Please try again.'); } catch (err) {}
    }
  });
}
function folderNameExists(name, excludeId) {
  const norm = name.trim().toLowerCase();
  return state.folders.some(f => f.id !== excludeId && f.name.trim().toLowerCase() === norm);
}

function makeFolderId() {
  return 'folder-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
function addFolder() {
  const t = translations[state.locale] || translations.en;
  const name = window.prompt(t.folderNamePrompt || 'Folder name:');
  if (name === null) return; // user cancelled
  const trimmed = name.trim();
  if (!trimmed) {
    window.alert(t.folderEmptyName || 'Folder name cannot be empty.');
    return;
  }
  if (folderNameExists(trimmed)) {
    window.alert(t.folderDuplicateName || 'A folder with this name already exists.');
    return;
  }
  const folder = {
    id: makeFolderId(),
    name: trimmed,
    createdAt: Date.now()
  };
  state.folders.push(folder);
  saveFolders();
  renderFolders();
}

function renameFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = translations[state.locale] || translations.en;
  const name = window.prompt(t.folderNamePrompt || 'Folder name:', folder.name);
  if (name === null) return; // user cancelled
  const trimmed = name.trim();
  if (!trimmed) {
    window.alert(t.folderEmptyName || 'Folder name cannot be empty.');
    return;
  }
  if (folderNameExists(trimmed, folderId)) {
    window.alert(t.folderDuplicateName || 'A folder with this name already exists.');
    return;
  }
  folder.name = trimmed;
  saveFolders();
  renderFolders();
}

function deleteFolder(folderId) {
  const folder = state.folders.find(f => f.id === folderId);
  if (!folder) return;
  const t = translations[state.locale] || translations.en;
  const confirmed = window.confirm(
    (t.folderDeleteConfirmTitle || 'Delete folder?') +
    '\n\n' +
    (t.folderDeleteConfirmText || 'Notes in this folder will be moved to Unfiled and kept.')
  );
  if (!confirmed) return;
  state.folders = state.folders.filter(f => f.id !== folderId);
  // Move its notes to Unfiled instead of deleting them.
  state.noteData.notes.forEach(n => {
    if (n.folderId === folderId) n.folderId = UNFILED_FOLDER_ID;
  });
  if (getActiveFolder() === folderId) {
    const next = state.folders.length ? state.folders[0].id : UNFILED_FOLDER_ID;
    state.activeFolder = next;
    state.noteData.activeFolder = next;
  }
  persistNoteData();
  renderFolders();
  renderNotes();
}

function isNoteBlockTag(tag) {
  return tag === 'DIV' || tag === 'P' || tag === 'LI' || tag === 'H1' || tag === 'H2' ||
    tag === 'H3' || tag === 'H4' || tag === 'BLOCKQUOTE';
}
function extractNoteBodyAndFormatting(root) {
  const text = [];
  const runs = [];
  let offset = 0;

  function pushRun(start, end, f) {
    if (end <= start) return;
    if (!f.b && !f.i && !f.u && !f.c && !f.align && !f.h && !f.list) return;
    runs.push({ start, end, bold: !!f.b, italic: !!f.i, underline: !!f.u, color: f.c || undefined, align: f.align || undefined, heading: f.h || undefined, list: f.list || undefined });
  }

  function walk(node, f) {
    if (node.nodeType === 3) { // TEXT node
      let v = String(node.nodeValue).replace(/\u00a0/g, ' ');
      if (!v) return;
      const start = offset;
      text.push(v);
      offset += v.length;
      pushRun(start, offset, f);
      return;
    }
    if (node.nodeType !== 1) return; // ignore comments / other nodes
    const tag = (node.tagName || '').toUpperCase();
    if (tag === 'BR') { text.push('\n'); offset++; return; }
    let nf = f;
    try {
      const cs = window.getComputedStyle(node);
      const nodeColor = readExplicitNodeColor(node);
      // Capture block text alignment (left/center/right) so justified paragraphs
      // survive the serialize → storage → reopen round-trip. 'start'/'end' and
      // anything non-physical is treated as "no explicit alignment".
      let nodeAlign = null;
      const taInline = node.style && typeof node.style.textAlign === 'string' ? node.style.textAlign : '';
      const taComputed = cs && typeof cs.textAlign === 'string' ? cs.textAlign : '';
      if (/^(left|center|right)$/i.test(taInline)) nodeAlign = taInline.toLowerCase();
      else if (/^(left|center|right)$/i.test(taComputed)) nodeAlign = taComputed.toLowerCase();
      nf = {
        b: f.b || tag === 'B' || tag === 'STRONG' || parseFloat(cs.fontWeight) >= 600,
        i: f.i || tag === 'I' || tag === 'EM' || cs.fontStyle === 'italic',
        u: f.u || tag === 'U' || (cs.textDecorationLine && cs.textDecorationLine.indexOf('underline') >= 0),
        c: f.c || nodeColor,
        align: nodeAlign || f.align,
        // Block-level heading/list inheritance (PHASE 03): H1/H2/H3 ancestors and
        // UL/OL ancestors are recorded so headings and lists survive the
        // serialize → storage → reopen round-trip in the same runs model.
        h: f.h || (tag === 'H1' ? 1 : tag === 'H2' ? 2 : tag === 'H3' ? 3 : 0),
        list: f.list || (tag === 'UL' ? 'ul' : tag === 'OL' ? 'ol' : null)
      };
    } catch (e) { nf = f; }
    for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], nf);
    if (isNoteBlockTag(tag) && text.length && text[text.length - 1] !== '\n') {
      text.push('\n');
      offset++;
    }
  }

  walk(root, { b: false, i: false, u: false, c: null, h: 0, list: null });

  let body = text.join('');
  const keep = body.replace(/\n+$/, '').length;      // drop trailing blank lines
  const keptRuns = [];
  for (const r of runs) {
    if (r.end <= keep) keptRuns.push(r);
    else if (r.start < keep) keptRuns.push({ start: r.start, end: keep, bold: r.bold, italic: r.italic, underline: r.underline, color: r.color, align: r.align, heading: r.heading, list: r.list });
  }
  body = keep < body.length ? body.slice(0, keep) : body;

  // Merge adjacent runs with identical flags and color (keeps the model minimal).
  const merged = [];
  for (const r of keptRuns) {
    const last = merged[merged.length - 1];
    if (last && last.end === r.start && last.bold === r.bold && last.italic === r.italic && last.underline === r.underline && last.color === r.color && last.align === r.align && last.heading === r.heading && last.list === r.list) {
      last.end = r.end;
    } else {
      merged.push({ start: r.start, end: r.end, bold: r.bold, italic: r.italic, underline: r.underline, color: r.color, align: r.align, heading: r.heading, list: r.list });
    }
  }
  return { body, formatting: merged };
}

function escapeNoteText(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeNoteTextColor(raw) {
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  if (!v) return null;
  const canonical = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)
    ? v
    : null;
  if (canonical) {
    const hex = canonical.replace('#', '');
    if (hex.length === 3) return '#' + hex.split('').map((ch) => ch + ch).join('').toLowerCase();
    return '#' + hex.toLowerCase();
  }
  const rgbMatch = v.match(/^rgba?\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*[0-9.]+\s*)?\)$/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch.slice(1).map((part) => Math.max(0, Math.min(255, Number(part) || 0)));
  const toHex = (n) => Number(n).toString(16).padStart(2, '0');
  const out = '#' + parts.map(toHex).join('');
  return /^#[0-9a-f]{6}$/i.test(out) ? out.toLowerCase() : null;
}

function readExplicitNodeColor(node) {
  if (!node || node.nodeType !== 1) return null;
  const el = node;
  const styleColor = el.style && typeof el.style.color === 'string' ? el.style.color : '';
  if (styleColor) {
    const n = normalizeNoteTextColor(styleColor);
    if (n) return n;
  }
  const attrColor = el.getAttribute ? el.getAttribute('color') : null;
  if (attrColor) {
    const n = normalizeNoteTextColor(attrColor);
    if (n) return n;
  }
  const styleText = el.getAttribute ? el.getAttribute('style') : '';
  if (styleText) {
    // Match ONLY the CSS `color` property as a real property name. A negative
    // lookbehind excludes `background-color` / `border-color` / `outline-color`
    // etc., so a cell/background color is never mistaken for a text color
    // (Phase 04 fix: colored-cell text disappearing after reopen).
    const m = styleText.match(/(?<![\w-])color\s*:\s*([^;]+)/i);
    if (m) {
      const n = normalizeNoteTextColor(m[1]);
      if (n) return n;
    }
  }
  return null;
}

function readExplicitCellBackgroundColor(node) {
  if (!node || node.nodeType !== 1) return null;
  const el = node;
  const styleBg = el.style && typeof el.style.backgroundColor === 'string' ? el.style.backgroundColor : '';
  if (styleBg) {
    const n = normalizeNoteTextColor(styleBg);
    if (n) return n;
  }
  const styleText = el.getAttribute ? el.getAttribute('style') : '';
  if (styleText) {
    const m = styleText.match(/background-color\s*:\s*([^;]+)/i);
    if (m) {
      const n = normalizeNoteTextColor(m[1]);
      if (n) return n;
    }
  }
  return null;
}

function buildNoteBodyHTML(body, formatting) {
  const text = String(body || '');
  const runs = (Array.isArray(formatting) ? formatting : [])
    .filter(r => r && typeof r.start === 'number' && typeof r.end === 'number')
    .sort((a, b) => a.start - b.start);
  // PHASE 03: when any run carries a heading or list marker, use the block-aware
  // renderer. Notes WITHOUT headings/lists keep the exact legacy output below,
  // byte-for-byte (zero regression for existing notes and their checks).
  if (runs.some(r => r.heading || r.list)) {
    return buildNoteBodyHTMLWithBlocks(text, runs);
  }
  const alignCss = (v) => (/^(left|center|right)$/i.test(String(v || '')) ? String(v).toLowerCase() : null);
  let html = '';
  let pos = 0;
  for (const r of runs) {
    let s = Math.max(0, Math.floor(r.start));
    let e = Math.min(text.length, Math.floor(r.end));
    if (e <= s) continue;
    if (s < pos) s = pos;
    if (s > pos) html += escapeNoteText(text.slice(pos, s));
    let seg = escapeNoteText(text.slice(s, e));
    const b = !!r.bold, i = !!r.italic, u = !!r.underline;
    const c = normalizeNoteTextColor(r.color);
    if (c) seg = '<span style="color:' + c + ';">' + seg + '</span>';
    if (b) seg = '<b>' + seg + '</b>';
    if (i) seg = '<i>' + seg + '</i>';
    if (u) seg = '<u>' + seg + '</u>';
    const al = alignCss(r.align);
    if (al) {
      // Re-apply a stored paragraph alignment. Each newline inside the aligned
      // segment starts a new aligned block (a block div breaks the line itself,
      // so its '\n' is consumed instead of becoming an extra <br>).
      seg = seg.split('\n').map((line) => '<div style="text-align:' + al + ';">' + (line || '<br>') + '</div>').join('');
      if (text[e] === '\n') e += 1;
    }
    html += seg;
    pos = e;
  }
  if (pos < text.length) html += escapeNoteText(text.slice(pos));
  return html.replace(/\n/g, '<br>');
}

// ============================================================
// NOTE HEADINGS + LISTS (PHASE 03)
// Block-aware renderer used ONLY when at least one formatting run carries a
// `heading` (1|2|3) or `list` ('ul'|'ol') marker. It reuses the exact same
// escaping + inline model (<b>/<i>/<u>/<span style=color>) as the legacy
// renderer above; block structure (headings / list items / alignment) is
// re-created per line from the runs. Storage stays plain text + runs — no raw
// user HTML is ever stored or parsed, so output remains XSS-inert. Because the
// Notes→PDF pipeline reuses buildNoteBodyHTML, headings and lists flow into
// the PDF automatically with no PDF-engine change.
// ============================================================
function noteInlineSegmentHTML(text, s, e, runs) {
  let html = '';
  let pos = s;
  for (const r of runs) {
    const rs = Math.max(0, Math.floor(r.start));
    const re = Math.min(text.length, Math.floor(r.end));
    if (re <= rs) continue;
    const s2 = Math.max(s, rs);
    const e2 = Math.min(e, re);
    if (e2 <= s2) continue;
    // Emit any unformatted gap BEFORE this run (mirrors the legacy renderer).
    if (s2 > pos) html += escapeNoteText(text.slice(pos, s2));
    let seg = escapeNoteText(text.slice(s2, e2));
    const c = normalizeNoteTextColor(r.color);
    if (c) seg = '<span style="color:' + c + ';">' + seg + '</span>';
    if (r.bold) seg = '<b>' + seg + '</b>';
    if (r.italic) seg = '<i>' + seg + '</i>';
    if (r.underline) seg = '<u>' + seg + '</u>';
    html += seg;
    if (e2 > pos) pos = e2;
  }
  if (pos < e) html += escapeNoteText(text.slice(pos, e));
  return html;
}

function noteRunAlignCss(r) {
  return r && /^(left|center|right)$/i.test(String(r.align || '')) ? String(r.align).toLowerCase() : null;
}

function buildNoteBodyHTMLWithBlocks(text, runs) {
  const lines = text.split('\n');
  const out = [];
  let openList = null; // 'ul' | 'ol'
  const closeList = () => { if (openList) { out.push('</' + openList + '>'); openList = null; } };
  let pos = 0;
  for (const line of lines) {
    const ls = pos;
    const le = pos + line.length;
    pos = le + 1; // skip the '\n' separator
    // Block type of this line = first run intersecting it that carries one.
    let heading = 0, listType = null, align = null;
    for (const r of runs) {
      if (Math.floor(r.end) <= ls || Math.floor(r.start) >= le) continue;
      if (!heading && r.heading) heading = Math.max(1, Math.min(3, Math.floor(r.heading)));
      if (!listType && (r.list === 'ul' || r.list === 'ol')) listType = r.list;
      if (!align) align = noteRunAlignCss(r);
      if (heading && listType && align) break;
    }
    const inner = noteInlineSegmentHTML(text, ls, le, runs) || (line ? '' : '<br>');
    const alignStyle = align ? ' style="text-align:' + align + ';"' : '';
    if (listType) {
      if (openList !== listType) { closeList(); out.push('<' + listType + ' dir="auto">'); openList = listType; }
      out.push('<li dir="auto"' + alignStyle + '>' + (inner || '<br>') + '</li>');
    } else {
      closeList();
      if (heading) out.push('<h' + heading + alignStyle + '>' + (inner || '<br>') + '</h' + heading + '>');
      else if (align) out.push('<div' + alignStyle + '>' + (inner || '<br>') + '</div>');
      else out.push(inner || '<br>');
    }
  }
  closeList();
  // Join with <br> only between inline-level neighbours; never insert <br>
  // inside a <ul>/<ol> (would render stray blank lines in editor and PDF).
  const isBlockish = (seg) => /^<(ul|ol|li|h[123]|div)/.test(seg) || /^<\/(ul|ol)>$/.test(seg);
  let html = '';
  for (let i = 0; i < out.length; i++) {
    const seg = out[i];
    if (!seg) continue;
    if (html && !isBlockish(seg) && !/<\/(ul|ol|h[123]|div|li)>$/.test(html)) html += '<br>';
    html += seg;
  }
  return html;
}

// ============================================================
// NOTE TABLE SUPPORT (PHASE 2)
// Stored as a NEW optional field `note.bodyBlocks`:
//   [ {type:'text', body, formatting}, {type:'table', header, rows:[[Cell,...],...]} ]
//   Cell = { text, formatting }   (formatting = runs over `text`)
// Legacy notes (no tables) keep the old `note.body` + `note.bodyFormatting` model
// byte-for-byte identical to before. bodyBlocks is ONLY introduced when a table is
// actually present in the document. All cell text is escaped at render time and only
// TEXT nodes are ever read back, so stored data stays inert and XSS-free.
// ============================================================

function buildNoteBlocksHTML(blocks) {
  const out = [];
  (Array.isArray(blocks) ? blocks : []).forEach((b) => {
    if (!b) return;
    if (b.type === 'table') {
      out.push(buildTableBlockHTML(b));
    } else if (b.type === 'checklist') {
      out.push(buildChecklistBlockHTML(b)); // PART 04
    } else if (b.type === 'divider') {
      out.push('<hr class="note-divider" contenteditable="false">'); // PART 04
    } else if (b.type === 'image') { // PART 09
      out.push(buildNoteImageBlockHTML(b));
    } else {
      out.push('<div class="note-block">' + buildNoteBodyHTML(b.body, b.formatting) + '</div>');
    }
  });
  return out.join('');
}

// ============================================================
// PART 04 — CHECKLIST + DIVIDER blocks inside the Notes Editor.
// Reuses the existing bodyBlocks model ({type:'checklist',items:[{text,checked}]},
// {type:'divider'}) + scheduleNoteSave autosave. Checklist text is a normal
// contenteditable span (legacy formatting pipeline can still read plain text);
// toggling only flips a CSS class, so persistence is a pure model round-trip.
// ============================================================
function escapeNoteCheckText(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildChecklistBlockHTML(block) {
  const items = Array.isArray(block && block.items) ? block.items : [];
  const lis = items.map((it) => {
    const checked = !!(it && it.checked);
    const text = it && typeof it.text === 'string' ? it.text : '';
    return '<li class="note-check-item' + (checked ? ' checked' : '') + '">' +
      '<span class="note-check-box" role="checkbox" aria-checked="' + checked + '" aria-label="Toggle checklist item" title="Toggle"></span>' +
      '<span class="note-check-text" contenteditable="true">' + escapeNoteCheckText(text) + '</span>' +
      '</li>';
  }).join('');
  return '<ul class="note-checklist" contenteditable="false">' + lis + '</ul>';
}

function parseChecklistBlock(listEl) {
  const items = Array.from(listEl.querySelectorAll('li.note-check-item')).map((li) => ({
    text: (li.querySelector('.note-check-text')?.textContent || ''),
    checked: li.classList.contains('checked')
  }));
  return { type: 'checklist', items };
}

function insertNoteChecklist() {
  if (!noteBodyInput) return;
  const block = { type: 'checklist', items: [{ text: '', checked: false }, { text: '', checked: false }] };
  const tmp = document.createElement('div');
  tmp.innerHTML = buildChecklistBlockHTML(block);
  const listEl = tmp.firstElementChild;
  const trailing = document.createElement('div');
  trailing.className = 'note-block';
  trailing.innerHTML = '<br>';
  const sel = window.getSelection();
  let range = (sel && sel.rangeCount && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer))
    ? sel.getRangeAt(0).cloneRange() : null;
  if (range) {
    range.deleteContents();
    range.insertNode(listEl);
    listEl.parentNode.insertBefore(trailing, listEl.nextSibling);
  } else {
    noteBodyInput.appendChild(listEl);
    noteBodyInput.appendChild(trailing);
  }
  const firstText = listEl.querySelector('.note-check-text');
  if (firstText) firstText.focus();
  scheduleNoteSave();
}

function insertNoteDivider() {
  if (!noteBodyInput) return;
  const hr = document.createElement('hr');
  hr.className = 'note-divider';
  hr.setAttribute('contenteditable', 'false');
  const trailing = document.createElement('div');
  trailing.className = 'note-block';
  trailing.innerHTML = '<br>';
  const sel = window.getSelection();
  let range = (sel && sel.rangeCount && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer))
    ? sel.getRangeAt(0).cloneRange() : null;
  // PART 04 — if the caret sits inside a nested block (e.g. a checklist item),
  // hoist the anchor to a direct child of the editor root so the divider lands
  // at the top level and serializes as its own block.
  let hoisted = false;
  if (range) {
    let sc = range.startContainer;
    if (sc.nodeType === 3) sc = sc.parentElement;
    if (sc && sc !== noteBodyInput) {
      let anchor = sc;
      while (anchor && anchor.parentElement !== noteBodyInput) anchor = anchor.parentElement;
      if (anchor) {
        anchor.parentElement.insertBefore(hr, anchor.nextSibling);
        hr.parentElement.insertBefore(trailing, hr.nextSibling);
        hoisted = true;
      } else {
        range = null;
      }
    }
  }
  if (hoisted) {
    // inserted at top level next to the anchor block
  } else if (range) {
    range.deleteContents();
    range.insertNode(hr);
    hr.parentNode.insertBefore(trailing, hr.nextSibling);
  } else {
    noteBodyInput.appendChild(hr);
    noteBodyInput.appendChild(trailing);
  }
  scheduleNoteSave();
}


// =============================================================
// PART 09 — IMAGES inside the Notes Editor.
// A REAL <img> block inside the note (not a screenshot, not a
// flattened canvas, not a background image). Stored in bodyBlocks as
//   { type:'image', src:<dataURL>, alt, width:<display px>, align }
// Reuses the existing bodyBlocks engine (table/checklist/divider).
// Interaction (select / resize / move / align / delete) mirrors the
// stabilised Smart-Image pattern but is scoped to Notes and round-trips
// through the existing serializeNoteEditor pipeline, so images persist
// in localStorage, render in the editor, and export to Preview + PDF.
// =============================================================
const NOTE_IMAGE_ALIGNS = ['left', 'center', 'right'];
const NOTE_IMAGE_MIN_W = 48;
const NOTE_IMAGE_MAX_W = 1280;
const NOTE_IMAGE_MIN_OPACITY = 0.1;
let noteImageSelected = null;    // active .note-image-block element
let noteImageDrag = null;        // { kind:'resize'|'move', ... }
let noteImagePointerId = null;

function clampNoteImageWidth(w) {
  w = Math.round(typeof w === 'number' ? w : (parseFloat(w) || 0));
  if (!Number.isFinite(w) || w <= 0) w = 320;
  return Math.max(NOTE_IMAGE_MIN_W, Math.min(w, NOTE_IMAGE_MAX_W));
}

// Opacity is IMAGE-ONLY (never applied to a parent that contains text).
function clampNoteImageOpacity(o) {
  o = (typeof o === 'number' ? o : (parseFloat(o) || 1));
  if (!Number.isFinite(o)) o = 1;
  return Math.min(1, Math.max(NOTE_IMAGE_MIN_OPACITY, Math.round(o * 100) / 100));
}

function normalizeNoteImageAlign(a) {
  return NOTE_IMAGE_ALIGNS.indexOf(a) !== -1 ? a : 'left';
}

// --- Data → DOM -------------------------------------------------
function buildNoteImageBlockHTML(block) {
  const src = (block && typeof block.src === 'string') ? block.src : '';
  const alt = (block && typeof block.alt === 'string') ? block.alt : '';
  const w = clampNoteImageWidth(block && block.width);
  const align = normalizeNoteImageAlign(block && block.align);
  const op = clampNoteImageOpacity(block && block.opacity);
  const behind = !!(block && block.behind);
  const t = translations[state.locale] || translations.en;
  const opPct = Math.round(op * 100);
  const flNum = Number.isFinite(parseFloat(block && block.floatLeft)) ? Math.max(0, Math.round(parseFloat(block.floatLeft))) : 0;
  const ftNum = Number.isFinite(parseFloat(block && block.floatTop)) ? Math.max(0, Math.round(parseFloat(block.floatTop))) : 0;
  const imgStyle = 'width:' + w + 'px;opacity:' + op;
  return '<div class="note-image-block' + (behind ? ' is-behind' : '') + '" contenteditable="false" data-image-align="' + align + '" data-image-width="' + w + '" data-image-opacity="' + op + '" data-image-behind="' + (behind ? '1' : '0') + '"' +
    (behind ? ' data-float-left="' + flNum + '" data-float-top="' + ftNum + '" style="position:absolute;left:' + flNum + 'px;top:' + ftNum + 'px;"' : '') + '>' +
    '<div class="note-image-frame">' +
      '<img class="note-image-elem" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" draggable="false" style="' + imgStyle + '">' +
      '<div class="note-image-grip nw" data-grip="nw"></div>' +
      '<div class="note-image-grip ne" data-grip="ne"></div>' +
      '<div class="note-image-grip sw" data-grip="sw"></div>' +
      '<div class="note-image-grip se" data-grip="se"></div>' +
      '<div class="note-image-ctl">' +
        '<div class="note-image-ctl-row note-image-ctl-row-nudge">' +
          '<button type="button" class="note-image-nudge note-image-nudge-up" data-nudge="up" aria-label="Move up" title="Move up (↑)">&#9650;</button>' +
          '<button type="button" class="note-image-nudge note-image-nudge-left" data-nudge="left" aria-label="Move left" title="Move left (←)">&#9664;</button>' +
          '<button type="button" class="note-image-nudge note-image-nudge-right" data-nudge="right" aria-label="Move right" title="Move right (→)">&#9654;</button>' +
          '<button type="button" class="note-image-nudge note-image-nudge-down" data-nudge="down" aria-label="Move down" title="Move down (↓)">&#9660;</button>' +
        '</div>' +
        '<div class="note-image-ctl-row note-image-ctl-row-zoom">' +
          '<button type="button" class="note-image-zoom-minus" data-zoom="minus" aria-label="Zoom out 5%" title="Zoom out 5% (−)">&#8722;</button>' +
          '<button type="button" class="note-image-zoom-plus" data-zoom="plus" aria-label="Zoom in 5%" title="Zoom in 5% (+)">&#43;</button>' +
        '</div>' +
        '<div class="note-image-ctl-row note-image-ctl-row-align">' +
          '<button type="button" class="note-image-align" data-align="left" aria-label="Align left" title="Align left">&#8592;</button>' +
          '<button type="button" class="note-image-align" data-align="center" aria-label="Align center" title="Align center">&#8596;</button>' +
          '<button type="button" class="note-image-align" data-align="right" aria-label="Align right" title="Align right">&#8594;</button>' +
          '<button type="button" class="note-image-del" aria-label="Delete image" title="Delete image">&times;</button>' +
          '<div class="note-image-ctl-row">' +
            '<span class="note-image-opacity-label" data-i18n="noteImageOpacity">' + (t.noteImageOpacity || 'Opacity') + '</span>' +
            '<input type="range" class="note-image-opacity" min="' + NOTE_IMAGE_MIN_OPACITY + '" max="1" step="0.05" value="' + op + '" aria-label="Image opacity">' +
            '<span class="note-image-opacity-val">' + opPct + '%</span>' +
          '</div>' +
          '<button type="button" class="note-image-back" aria-pressed="' + behind + '" data-i18n-title="noteImageSendBack" title="' + (t.noteImageSendBack || 'Send to Back') + '">' + (t.noteImageSendBack || 'Send to Back') + '</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

// DOM → Data (mirrors parseChecklistBlock/parseTableBlock).
function parseNoteImageBlock(el) {
  const img = el.querySelector('.note-image-elem');
  const block = { type: 'image' };
  if (img) {
    block.src = img.getAttribute('src') || '';
    block.alt = img.getAttribute('alt') || '';
    block.width = clampNoteImageWidth(img.style ? img.style.width : (parseFloat(el.getAttribute('data-image-width')) || 0));
  } else {
    block.src = el.getAttribute('data-image-src') || '';
    block.width = clampNoteImageWidth(el.getAttribute('data-image-width'));
  }
  block.align = normalizeNoteImageAlign(el.getAttribute('data-image-align'));
  block.opacity = clampNoteImageOpacity(el.getAttribute('data-image-opacity'));
  block.behind = el.getAttribute('data-image-behind') === '1';
  if (block.behind) {
    const fl = parseFloat(el.getAttribute('data-float-left'));
    const ft = parseFloat(el.getAttribute('data-float-top'));
    block.floatLeft = Number.isFinite(fl) ? Math.max(0, Math.round(fl)) : 0;
    block.floatTop = Number.isFinite(ft) ? Math.max(0, Math.round(ft)) : 0;
  }
  return block;
}

function noteImageResetState() {
  noteImageDrag = null;
  noteImagePointerId = null;
}

function noteImageBlockWrapOf(el) {
  return el && el.closest && el.closest('.note-image-block') ? el.closest('.note-image-block') : null;
}

// --- Selection -------------------------------------------------
function noteImageSelect(blockEl) {
  if (!blockEl) return;
  noteImageDeselect();
  noteImageSelected = blockEl;
  blockEl.classList.add('is-selected');
  blockEl.setAttribute('aria-selected', 'true');
}

function noteImageDeselect() {
  if (noteImageSelected) {
    noteImageSelected.classList.remove('is-selected');
    noteImageSelected.setAttribute('aria-selected', 'false');
  }
  noteImageSelected = null;
  noteImageResetState();
}

function noteImageDelete(blockEl) {
  if (!blockEl) return;
  if (blockEl === noteImageSelected) noteImageSelected = null;
  if (blockEl.parentNode) blockEl.parentNode.removeChild(blockEl);
  noteImageResetState();
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
}

// --- Send to Back (float the image behind the text) -----------
// The block becomes position:absolute inside #noteBodyInput (which CSS puts
// in its own stacking context) so the img paints BELOW the note text while
// staying fully visible and fully controllable. No z-index:-1 is used.
function noteImageApplyBehind(blockEl, behind) {
  if (!blockEl) return;
  const wasBehind = blockEl.getAttribute('data-image-behind') === '1';
  const bodyRect = noteBodyInput.getBoundingClientRect();
  if (behind && !wasBehind) {
    const r = blockEl.getBoundingClientRect();
    const curLeft = parseFloat(blockEl.getAttribute('data-float-left'));
    const curTop = parseFloat(blockEl.getAttribute('data-float-top'));
    const fl = Number.isFinite(curLeft) ? curLeft : Math.max(0, Math.round(r.left - bodyRect.left));
    const ft = Number.isFinite(curTop) ? curTop : Math.max(0, Math.round(r.top - bodyRect.top + noteBodyInput.scrollTop));
    blockEl.setAttribute('data-float-left', String(fl));
    blockEl.setAttribute('data-float-top', String(ft));
    blockEl.style.position = 'absolute';
    blockEl.style.left = fl + 'px';
    blockEl.style.top = ft + 'px';
  } else if (!behind && wasBehind) {
    blockEl.style.position = '';
    blockEl.style.left = '';
    blockEl.style.top = '';
  }
  blockEl.setAttribute('data-image-behind', behind ? '1' : '0');
  blockEl.classList.toggle('is-behind', !!behind);
  const back = blockEl.querySelector('.note-image-back');
  if (back) back.setAttribute('aria-pressed', behind ? 'true' : 'false');
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
}

// Clamp a floating image so it never overflows the note editor.
function noteImageClampFloat(blockEl, left, top) {
  if (!blockEl || !noteBodyInput) return { left: 0, top: 0 };
  const maxLeft = Math.max(0, (noteBodyInput.clientWidth || 0) - (blockEl.offsetWidth || 0));
  const maxTop = Math.max(0, (noteBodyInput.scrollHeight || 0) - (blockEl.offsetHeight || 0));
  return {
    left: Math.min(maxLeft, Math.max(0, Math.round(left))),
    top: Math.min(maxTop, Math.max(0, Math.round(top)))
  };
}

// --- Opacity (image only — text never inherits it) -------------
function noteImageApplyOpacity(blockEl, value) {
  if (!blockEl) return;
  const op = clampNoteImageOpacity(value);
  const img = blockEl.querySelector('.note-image-elem');
  if (img) img.style.opacity = String(op);
  blockEl.setAttribute('data-image-opacity', String(op));
  const slider = blockEl.querySelector('.note-image-opacity');
  if (slider) slider.value = String(op);
  const val = blockEl.querySelector('.note-image-opacity-val');
  if (val) val.textContent = Math.round(op * 100) + '%';
}

// --- Resize (aspect ratio locked via width, height:auto) -------
function noteImageStartResize(blockEl, grip, e) {
  const img = blockEl.querySelector('.note-image-elem');
  if (!img) return;
  noteImageSelect(blockEl);
  const startW = clampNoteImageWidth(parseFloat(img.style ? img.style.width : '') || blockEl.getBoundingClientRect().width);
  img.style.width = startW + 'px';
  noteImageDrag = { kind: 'resize', blockEl, img, startW, startX: e.clientX };
  noteImagePointerId = e.pointerId;
  blockEl.classList.add('is-interacting');
  blockEl.style.touchAction = 'none';
  try { blockEl.setPointerCapture(e.pointerId); } catch (err) {}
  const onMove = (ev) => {
    const d = noteImageDrag;
    if (!d || d.kind !== 'resize') return;
    let nw = d.startW + (ev.clientX - d.startX) * (grip === 'nw' || grip === 'sw' ? -1 : 1);
    // Never let a resized image overflow the note editor horizontally.
    if (d.blockEl.getAttribute('data-image-behind') === '1' && noteBodyInput) {
      const curLeft = parseFloat(d.blockEl.getAttribute('data-float-left')) || 0;
      nw = Math.min(nw, (noteBodyInput.clientWidth || NOTE_IMAGE_MAX_W) - curLeft);
    }
    nw = clampNoteImageWidth(nw);
    d.img.style.width = nw + 'px';
    d.blockEl.setAttribute('data-image-width', String(nw));
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    if (noteImageDrag && noteImageDrag.kind === 'resize') {
      noteImageDrag.blockEl.classList.remove('is-interacting');
      noteImageDrag.blockEl.style.touchAction = '';
    }
    noteImageResetState();
    if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
  };
  e.preventDefault();
  e.stopPropagation();
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}
// --- Move (drag re-orders the block within the note stream) ----
function noteImageMoveBlockEl(blockEl, clientY) {
  if (!noteBodyInput) return;
  const siblings = Array.from(noteBodyInput.children).filter((c) => c.nodeType === 1 && c !== blockEl);
  for (let i = 0; i < siblings.length; i++) {
    const other = siblings[i];
    const r = other.getBoundingClientRect();
    if (!r) continue;
    if (clientY < r.top + r.height / 2) {
      if (blockEl.nextSibling !== other) noteBodyInput.insertBefore(blockEl, other);
      return;
    }
  }
  if (blockEl.nextSibling !== null) noteBodyInput.appendChild(blockEl);
}

function noteImageStartMove(blockEl, e) {
  noteImageSelect(blockEl);
  blockEl.classList.add('is-moving');
  let moved = false;
  const startY = e.clientY;
  const startX = e.clientX;
  // Free-move applies to BOTH behind images (already floating) and normal
  // flow images. A flow image converts to an in-place floating block on the
  // first real drag threshold so it can be positioned anywhere inside the
  // note content — the behind/send-to-back state is never touched.
  const isBehind = blockEl.getAttribute('data-image-behind') === '1';
  const isFloat = () => isBehind || blockEl.classList.contains('is-floating');
  const bodyRect = noteBodyInput ? noteBodyInput.getBoundingClientRect() : null;
  const startLeft = (parseFloat(blockEl.getAttribute('data-float-left')) || 0);
  const startTop = (parseFloat(blockEl.getAttribute('data-float-top')) || 0);
  noteImageDrag = { kind: 'move', blockEl, startY };
  noteImagePointerId = e.pointerId;
  blockEl.style.touchAction = 'none';
  try { blockEl.setPointerCapture(e.pointerId); } catch (err) {}
  let dragLeft = startLeft;
  let dragTop = startTop;
  const onMove = (ev) => {
    const d = noteImageDrag;
    if (!d || d.kind !== 'move') return;
    if (!moved && Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) > 6) {
      moved = true;
      blockEl.classList.add('is-moving-active');
      if (!isFloat() && noteBodyInput) {
        // Convert the flow image to an in-place floating block (keeps size,
        // aspect ratio, opacity and the behind state exactly as they are).
        const r = blockEl.getBoundingClientRect();
        dragLeft = Math.max(0, Math.round(r.left - bodyRect.left));
        dragTop = Math.max(0, Math.round(r.top - bodyRect.top + noteBodyInput.scrollTop));
        blockEl.setAttribute('data-float-left', String(dragLeft));
        blockEl.setAttribute('data-float-top', String(dragTop));
        blockEl.style.position = 'absolute';
        blockEl.style.left = dragLeft + 'px';
        blockEl.style.top = dragTop + 'px';
        blockEl.classList.add('is-floating');
      } else {
        dragLeft = startLeft;
        dragTop = startTop;
      }
    }
    if (!moved) return;
    // Free move inside the note area — clamped, no horizontal overflow.
    const pos = noteImageClampFloat(blockEl, dragLeft + (ev.clientX - startX), dragTop + (ev.clientY - startY));
    blockEl.style.left = pos.left + 'px';
    blockEl.style.top = pos.top + 'px';
    blockEl.setAttribute('data-float-left', String(pos.left));
    blockEl.setAttribute('data-float-top', String(pos.top));
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('mousecancel', onUp);
    if (noteImageDrag && noteImageDrag.kind === 'move') {
      blockEl.classList.remove('is-moving');
      blockEl.classList.remove('is-moving-active');
      blockEl.style.touchAction = '';
    }
    noteImageResetState();
    if (moved && typeof scheduleNoteSave === 'function') scheduleNoteSave();
  };
  e.preventDefault();
  e.stopPropagation();
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('mousecancel', onUp);
}

// --- Align -----------------------------------------------------
function noteImageSetAlign(blockEl, align) {
  if (!blockEl || NOTE_IMAGE_ALIGNS.indexOf(align) === -1) return;
  blockEl.setAttribute('data-image-align', align);
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
// --- Nudge (arrow movement) ----------------------------------------- 
// Move the selected image by translateX/Y in pixels. Only floating (absolute)
// images with explicit float-left/float-top positions can be nudged.
function noteImageNudge(blockEl, dx, dy) {
  if (!blockEl) return;
  const fl = parseFloat(blockEl.getAttribute('data-float-left')) || 0;
  const ft = parseFloat(blockEl.getAttribute('data-float-top')) || 0;
  if (!Number.isFinite(fl) || !Number.isFinite(ft)) return;
  const pos = noteImageClampFloat(blockEl, fl + dx, ft + dy);
  blockEl.style.left = pos.left + 'px';
  blockEl.style.top = pos.top + 'px';
  blockEl.setAttribute('data-float-left', String(pos.left));
  blockEl.setAttribute('data-float-top', String(pos.top));
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
}

// --- Zoom (+ / -) ----------------------------------------------------
// Scale the image width by the given factor (e.g. 1.05 for +5%, 0.9524 for -5%).
// Aspect ratio is preserved (height:auto). Width is clamped to [NOTE_IMAGE_MIN_W, NOTE_IMAGE_MAX_W].
function noteImageZoom(blockEl, factor) {
  if (!blockEl) return;
  const img = blockEl.querySelector('.note-image-elem');
  if (!img) return;
  const w = clampNoteImageWidth(parseFloat(img.style.width) || parseFloat(blockEl.getAttribute('data-image-width')) || NOTE_IMAGE_MIN_W);
  const newW = clampNoteImageWidth(Math.round(w * factor));
  if (newW === w) return;
  img.style.width = newW + 'px';
  blockEl.setAttribute('data-image-width', String(newW));
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
}
}

// --- Bind controls on a freshly inserted image block ------------
function bindNoteImageBlock(blockEl) {
  if (!blockEl || blockEl.dataset.noteImageBound) return;
  blockEl.dataset.noteImageBound = '1';
  const img = blockEl.querySelector('.note-image-elem');
  if (img) img.addEventListener('pointerdown', (e) => noteImageStartMove(blockEl, e));
  blockEl.querySelectorAll('.note-image-grip').forEach((g) => {
    g.addEventListener('pointerdown', (e) => noteImageStartResize(blockEl, g.getAttribute('data-grip') || 'se', e));
  });
  blockEl.querySelectorAll('.note-image-align').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      noteImageSetAlign(blockEl, btn.getAttribute('data-align') || 'left');
    });
  });
  // Tap-to-select on the block frame (without starting a move). The img and
  // the grips start their own move/resize handlers — they select themselves,
  // and re-selecting here would reset the drag state mid-gesture.
  blockEl.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest && e.target.closest('.note-image-elem, .note-image-grip, .note-image-ctl')) return;
    if (noteImageSelected !== blockEl) noteImageSelect(blockEl);
  });
  // Opacity slider — image-only opacity, clamped to [0.1, 1.0].
  const opacity = blockEl.querySelector('.note-image-opacity');
  if (opacity) {
    opacity.addEventListener('pointerdown', (e) => e.stopPropagation());
    opacity.addEventListener('input', () => {
      noteImageApplyOpacity(blockEl, opacity.value);
      if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
    });
  }
  // Send to Back / Bring to Front toggle.
  const back = blockEl.querySelector('.note-image-back');
  if (back) {
    back.addEventListener('pointerdown', (e) => e.stopPropagation());
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      noteImageApplyBehind(blockEl, blockEl.getAttribute('data-image-behind') !== '1');
    });
  }
  const del = blockEl.querySelector('.note-image-del');
  if (del) {
    del.addEventListener('pointerdown', (e) => e.stopPropagation());
    del.addEventListener('click', (e) => { e.stopPropagation(); noteImageDelete(blockEl); });
  // Nudge (arrow) buttons — move the image 2px per tap in the chosen direction.
  blockEl.querySelectorAll('.note-image-nudge').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dir = btn.getAttribute('data-nudge');
      if (!dir) return;
      const dx = dir === 'left' ? -NOTE_IMAGE_NUDGE : dir === 'right' ? NOTE_IMAGE_NUDGE : 0;
      const dy = dir === 'up' ? -NOTE_IMAGE_NUDGE : dir === 'down' ? NOTE_IMAGE_NUDGE : 0;
      noteImageNudge(blockEl, dx, dy);
    });
  });
  // Zoom (+ / -) buttons — scale the image by 5% per tap, clamped to allowed range.
  blockEl.querySelectorAll('.note-image-zoom-minus, .note-image-zoom-plus').forEach((btn) => {
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const op = btn.getAttribute('data-zoom');
      if (op !== 'plus' && op !== 'minus') return;
      const factor = op === 'plus' ? NOTE_IMAGE_ZOOM_STEP : 1 / NOTE_IMAGE_ZOOM_STEP;
      noteImageZoom(blockEl, factor);
    });
  });
  }
  // Restored/inserted floating image: re-clamp to the current editor size.
  if (blockEl.getAttribute('data-image-behind') === '1' && noteBodyInput) {
    const pos = noteImageClampFloat(blockEl, parseFloat(blockEl.getAttribute('data-float-left')) || 0, parseFloat(blockEl.getAttribute('data-float-top')) || 0);
    blockEl.style.left = pos.left + 'px';
    blockEl.style.top = pos.top + 'px';
    blockEl.setAttribute('data-float-left', String(pos.left));
    blockEl.setAttribute('data-float-top', String(pos.top));
  }
  // Keep restored opacity/label in sync with the stored attribute.
  noteImageApplyOpacity(blockEl, blockEl.getAttribute('data-image-opacity'));
}

// Re-bind image controls after renderNoteBody swaps innerHTML.
// While a "behind" image is NOT selected it is fully pointer-transparent
// (CSS), so the text above it stays 100% interactive. This adds the single
// delegated path that keeps such images re-selectable: clicking empty note
// area inside a behind image's rect selects it; clicking anywhere else in
// the note body (text, other blocks, empty space) deselects the selection.
function noteImageEnsureBodyClicks() {
  if (!noteBodyInput || noteBodyInput.dataset.noteImageClicksBound) return;
  noteBodyInput.dataset.noteImageClicksBound = '1';
  noteBodyInput.addEventListener('click', (e) => {
    // Direct clicks on text/other blocks: only clear an image selection.
    if (e.target !== noteBodyInput) {
      if (noteImageSelected && !(e.target.closest && e.target.closest('.note-image-block'))) noteImageDeselect();
      return;
    }
    // Click hit the container itself (empty area or a pointer-transparent
    // behind-image): re-select a behind image under the click point.
    const behind = noteBodyInput.querySelectorAll('.note-image-block.is-behind:not(.is-selected)');
    for (let i = 0; i < behind.length; i++) {
      const r = behind[i].getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        noteImageSelect(behind[i]);
        e.preventDefault();
        return;
      }
    }
    if (noteImageSelected) noteImageDeselect();
  });
}

function initNoteImageBlocks(root) {
  if (!root) return;
  noteImageEnsureBodyClicks();
  root.querySelectorAll('.note-image-block').forEach((el) => bindNoteImageBlock(el));
}

// Safely render an optional colspan/rowspan attribute from stored cell data.
// Values are coerced to a finite integer > 1 (anything else -> omit) so stored
// data can never inject markup into the attribute. (PHASE 2: Merge Cells)
// Accepts BOTH the camelCase key (rowSpan / colSpan — what parseTableBlock and
// earlier serializers write) and the lowercase key (rowspan / colspan), so a
// stored merged/split cell always round-trips across EDITOR → SERIALIZE →
// STORAGE → LOAD → RENDER regardless of which casing the data uses. This
// mirrors notePdfCellSpanAttr(), keeping the editor render and the PDF render
// consistent. (PHASE 01: DATA MODEL HARDENING)
function noteTableCellSpanAttr(cell, prop) {
  if (!cell) return '';
  const a = cell[prop];
  const b = cell[prop === 'colspan' ? 'colSpan' : 'rowSpan'];
  const raw = (typeof a === 'number' ? a : (typeof b === 'number' ? b : NaN));
  const v = Math.floor(raw);
  return Number.isFinite(v) && v > 1 ? ' ' + prop + '="' + v + '"' : '';
}

function noteTableCellBackgroundStyle(cell) {
  const value = normalizeNoteTextColor(cell && cell.backgroundColor);
  return value ? ' style="background-color:' + value + ';"' : '';
}

// ============================================================
// TABLE BORDERS (PHASE 2 continuation)
// Table-level border configuration stored as an optional string field
// `block.borderStyle` on the table block: one of 'all' | 'outside' | 'inside' | 'none'.
// Absent/invalid values always mean 'all' (the original, pre-feature look), so
// legacy notes/tables without this field keep rendering exactly as before.
// The value is only ever taken from a fixed allow-list (never raw user HTML),
// and is rendered purely as a `data-border-style` attribute consumed by CSS.
// ============================================================
const NOTE_TABLE_BORDER_STYLES = ['all', 'outside', 'inside', 'none'];
const NOTE_TABLE_BORDER_LABELS = { all: 'All Borders', outside: 'Outside Borders', inside: 'Inside Borders', none: 'No Borders' };

function normalizeNoteTableBorderStyle(value) {
  return NOTE_TABLE_BORDER_STYLES.indexOf(value) !== -1 ? value : 'all';
}

// Safe HTML attribute for the stored border style. Only emitted for non-default
// values so legacy markup (no attribute at all) stays byte-for-byte unchanged.
function noteTableBorderAttr(block) {
  const style = block && typeof block.borderStyle === 'string' ? block.borderStyle : '';
  return NOTE_TABLE_BORDER_STYLES.indexOf(style) !== -1 && style !== 'all' ? ' data-border-style="' + style + '"' : '';
}

// Fixed 4-option <select> markup (no interpolation of untrusted data — the
// only variable part is which fixed option carries the `selected` attribute).
function noteTableBorderSelectHTML(borderStyle) {
  const current = normalizeNoteTableBorderStyle(borderStyle);
  const t = translations[state.locale] || translations.en;
  let html = '<select class="note-table-border-select" data-table-border-select aria-label="Table borders" title="Table borders">';
  NOTE_TABLE_BORDER_STYLES.forEach((val) => {
    html += '<option value="' + val + '" data-i18n="' + ('noteTableBorder' + val.charAt(0).toUpperCase() + val.slice(1)) + '"' + (val === current ? ' selected' : '') + '>' + (t['noteTableBorder' + val.charAt(0).toUpperCase() + val.slice(1)] || NOTE_TABLE_BORDER_LABELS[val]) + '</option>';
  });
  html += '</select>';
  return html;
}

// ============================================================
// CELL ALIGNMENT (PHASE 3)
// Per-cell horizontal (left/center/right) and vertical (top/middle/bottom)
// alignment, stored as optional string fields `cell.alignH` / `cell.alignV`.
// Values are taken ONLY from a fixed allow-list (never user input / raw HTML)
// and rendered as `data-h-align` / `data-v-align` attributes consumed by CSS.
// Cells without these fields (legacy tables, never-aligned cells) keep the
// original look (`text-align:start` / `vertical-align:top`) byte-for-byte.
// ============================================================
const NOTE_TABLE_H_ALIGN = ['left', 'center', 'right'];
const NOTE_TABLE_V_ALIGN = ['top', 'middle', 'bottom'];
const NOTE_TABLE_H_ALIGN_LABELS = { left: 'Left', center: 'Center', right: 'Right' };
const NOTE_TABLE_V_ALIGN_LABELS = { top: 'Top', middle: 'Middle', bottom: 'Bottom' };

function normalizeNoteTableHAlign(value) {
  return NOTE_TABLE_H_ALIGN.indexOf(value) !== -1 ? value : 'left';
}
function normalizeNoteTableVAlign(value) {
  return NOTE_TABLE_V_ALIGN.indexOf(value) !== -1 ? value : 'top';
}

// Safe alignment attributes for a <td>. Only emitted for cells with an
// explicitly-stored value, so legacy cells stay byte-for-byte unchanged.
function noteTableCellAlignAttr(cell) {
  const h = cell && typeof cell.alignH === 'string' ? cell.alignH : '';
  const v = cell && typeof cell.alignV === 'string' ? cell.alignV : '';
  let out = '';
  if (NOTE_TABLE_H_ALIGN.indexOf(h) !== -1) out += ' data-h-align="' + h + '"';
  if (NOTE_TABLE_V_ALIGN.indexOf(v) !== -1) out += ' data-v-align="' + v + '"';
  return out;
}

// Compact fixed-option <select> controls for the table toolbar (only the fixed
// option list is interpolated, exactly like the border <select>).
function noteTableHAlignSelectHTML(alignH) {
  const current = normalizeNoteTableHAlign(alignH);
  const t = translations[state.locale] || translations.en;
  let html = '<select class="note-table-border-select note-table-align-select" data-table-h-align-select aria-label="Horizontal alignment" title="Horizontal alignment">';
  NOTE_TABLE_H_ALIGN.forEach((val) => {
    html += '<option value="' + val + '" data-i18n="' + ('noteTableHAlign' + val.charAt(0).toUpperCase() + val.slice(1)) + '"' + (val === current ? ' selected' : '') + '>' + (t['noteTableHAlign' + val.charAt(0).toUpperCase() + val.slice(1)] || NOTE_TABLE_H_ALIGN_LABELS[val]) + '</option>';
  });
  html += '</select>';
  return html;
}
function noteTableVAlignSelectHTML(alignV) {
  const current = normalizeNoteTableVAlign(alignV);
  const t = translations[state.locale] || translations.en;
  let html = '<select class="note-table-border-select note-table-align-select" data-table-v-align-select aria-label="Vertical alignment" title="Vertical alignment">';
  NOTE_TABLE_V_ALIGN.forEach((val) => {
    html += '<option value="' + val + '" data-i18n="' + ('noteTableVAlign' + val.charAt(0).toUpperCase() + val.slice(1)) + '"' + (val === current ? ' selected' : '') + '>' + (t['noteTableVAlign' + val.charAt(0).toUpperCase() + val.slice(1)] || NOTE_TABLE_V_ALIGN_LABELS[val]) + '</option>';
  });
  html += '</select>';
  return html;
}
// ============================================================
// NOTE TABLE RESIZE (PHASE: RESIZE)
// Optional column widths / row heights stored at the table-block level
// as `block.colWidths` / `block.rowHeights` (arrays of integer px).
// Both are OPTIONAL: legacy tables without them keep the original
// rendering byte-for-byte. All sizes are normalized to bounded integer
// "px" before ever being written into a style attribute, so a stored
// value can never become arbitrary CSS/HTML.
// ============================================================
const NOTE_TABLE_COL_WIDTH_MIN = 60;
const NOTE_TABLE_COL_WIDTH_MAX = 800;
const NOTE_TABLE_ROW_HEIGHT_MIN = 20;
const NOTE_TABLE_ROW_HEIGHT_MAX = 800;

// Parse a raw size (number or "NNpx" string) into a bounded integer or null.
function noteTableSizePxToInt(v) {
  let n;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string') {
    const m = /^\s*(\d+(?:\.\d+)?)\s*px\s*$/i.exec(v);
    if (!m) return null;
    n = parseFloat(m[1]);
  } else return null;
  return Number.isFinite(n) ? Math.floor(n) : null;
}
function clampNoteTableColWidth(n) { return Math.max(NOTE_TABLE_COL_WIDTH_MIN, Math.min(NOTE_TABLE_COL_WIDTH_MAX, Math.floor(n))); }
function clampNoteTableRowHeight(n) { return Math.max(NOTE_TABLE_ROW_HEIGHT_MIN, Math.min(NOTE_TABLE_ROW_HEIGHT_MAX, Math.floor(n))); }
function normalizeNoteTableColWidth(v) { const n = noteTableSizePxToInt(v); return n === null ? null : clampNoteTableColWidth(n); }
function normalizeNoteTableRowHeight(v) { const n = noteTableSizePxToInt(v); return n === null ? null : clampNoteTableRowHeight(n); }
function noteTableHasColWidths(widths) { return Array.isArray(widths) && widths.some((w) => normalizeNoteTableColWidth(w) !== null); }

// <colgroup> with only numeric, bounded col widths (a plain <col> elsewhere).
function noteTableColgroupHTML(block, colCount) {
  const widths = Array.isArray(block && block.colWidths) ? block.colWidths : null;
  let html = '<colgroup>';
  for (let i = 0; i < colCount; i++) {
    const w = (widths && i < widths.length) ? normalizeNoteTableColWidth(widths[i]) : null;
    html += (w === null ? '<col>' : '<col style="width:' + w + 'px;">');
  }
  return html + '</colgroup>';
}
// Optional per-row height as a safe "height:Npx" attribute on the <tr>.
function noteTableRowHeightAttr(block, r) {
  if (!block || !Array.isArray(block.rowHeights)) return '';
  const h = normalizeNoteTableRowHeight(block.rowHeights[r]);
  return h === null ? '' : ' style="height:' + h + 'px;"';
}
// Read columns back from the <colgroup> (stored only when a width exists).
function parseNoteTableColWidths(tableEl) {
  const cols = tableEl.querySelectorAll('col');
  if (!cols.length) return null;
  let any = false;
  const arr = Array.from(cols).map((col) => {
    const v = normalizeNoteTableColWidth(col.style && col.style.width ? col.style.width : null);
    if (v !== null) any = true;
    return v;
  });
  return any ? arr : null;
}
function parseNoteTableRowHeights(tbody) {
  const trs = Array.from(tbody.querySelectorAll('tr'));
  if (!trs.length) return null;
  let any = false;
  const arr = trs.map((tr) => {
    const v = normalizeNoteTableRowHeight(tr.style && tr.style.height ? tr.style.height : null);
    if (v !== null) any = true;
    return v;
  });
  return any ? arr : null;
}

// ============================================================
// RESIZE INTERACTION (in-table drag handles; no prompt, no settings modal)
// Thin transparent handles centered on each column/row border. Only the
// handle element has pointer-events; the rest of the overlay is inert so it
// never blocks text entry or cell selection. Dragging updates the real
// <col>/<tr> style sizes and is persisted through scheduleNoteSave().
// ============================================================
let noteResizeDrag = null; // { kind, wrap, table, index, startX|startY, startWidths|startHeights }

function initNoteTableResizers(root) {
  if (!root) return;
  const wraps = root.querySelectorAll ? root.querySelectorAll('.note-table-wrap') : [];
  wraps.forEach(placeNoteResizeHandles);
}

function placeNoteResizeHandles(wrap) {
  if (!wrap) return;
  const table = wrap.querySelector('table.note-table');
  if (!table) return;
  const tbody = table.querySelector('tbody') || table;
  const trs = Array.from(tbody.querySelectorAll('tr'));
  let layer = wrap.querySelector('.note-table-resize');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'note-table-resize';
    layer.setAttribute('aria-hidden', 'true');
    wrap.appendChild(layer);
  }
  if (!layer.__resizeBound) {
    layer.addEventListener('pointerdown', onNoteResizePointerDown);
    layer.__resizeBound = true;
  }
  const cols = Array.from(table.querySelectorAll('col'));
  const colCount = cols.length;
  const wrapRect = wrap.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  const tW = table.offsetWidth || 100;
  const tH = table.offsetHeight || 100;
  layer.style.position = 'absolute';
  layer.style.top = Math.round(tableRect.top - wrapRect.top) + 'px';
  layer.style.left = Math.round(tableRect.left - wrapRect.left) + 'px';
  layer.style.width = tW + 'px';
  layer.style.height = tH + 'px';

  let colHandles = Array.from(layer.querySelectorAll('.note-col-handle'));
  if (colCount > 1 && colHandles.length !== colCount - 1) {
    colHandles.forEach((h) => h.remove());
    colHandles = [];
    for (let i = 0; i < colCount - 1; i++) {
      const h = document.createElement('div');
      h.className = 'note-col-handle';
      h.setAttribute('data-resize', 'col');
      h.setAttribute('data-col', String(i));
      layer.appendChild(h);
      colHandles.push(h);
    }
  }
  const colWidths = cols.map((c) => c.offsetWidth || 0);
  let accX = 0;
  const boundaries = [];
  for (let i = 0; i < colCount; i++) { boundaries.push(accX); accX += colWidths[i]; }
  colHandles.forEach((h, i) => {
    const bx = boundaries[i] + colWidths[i];
    h.style.position = 'absolute';
    h.style.left = (bx - 5) + 'px';
    h.style.top = '0px';
    h.style.width = '10px';
    h.style.height = tH + 'px';
  });

  let rowHandles = Array.from(layer.querySelectorAll('.note-row-handle'));
  if (trs.length > 1 && rowHandles.length !== trs.length - 1) {
    rowHandles.forEach((h) => h.remove());
    rowHandles = [];
    for (let i = 0; i < trs.length - 1; i++) {
      const h = document.createElement('div');
      h.className = 'note-row-handle';
      h.setAttribute('data-resize', 'row');
      h.setAttribute('data-row', String(i));
      layer.appendChild(h);
      rowHandles.push(h);
    }
  }
  const rowH = trs.map((tr) => tr.offsetHeight || 0);
  let accY = 0;
  rowHandles.forEach((h, i) => {
    const by = accY + rowH[i];
    h.style.position = 'absolute';
    h.style.top = (by - 5) + 'px';
    h.style.left = '0px';
    h.style.width = tW + 'px';
    h.style.height = '10px';
    accY += rowH[i];
  });
}

function onNoteResizePointerDown(e) {
  const handle = e.target && e.target.closest ? e.target.closest('.note-col-handle, .note-row-handle') : null;
  if (!handle || noteResizeDrag || e.button === 2) return;
  e.preventDefault();
  const wrap = handle.closest('.note-table-wrap');
  if (!wrap) return;
  const table = wrap.querySelector('table.note-table');
  if (!table) return;
  const kind = handle.getAttribute('data-resize');
  const idxRaw = handle.getAttribute(kind === 'col' ? 'data-col' : 'data-row');
  const index = parseInt(idxRaw, 10);
  if (!Number.isFinite(index) || index < 0) return;
  const tbody = table.querySelector('tbody') || table;
  if (kind === 'col') {
    const cols = Array.from(table.querySelectorAll('col'));
    if (!cols.length || index + 1 >= cols.length) return;
    const startWidths = cols.map((c) => clampNoteTableColWidth(Math.round(c.getBoundingClientRect().width)));
    if (!table.classList.contains('note-table-fixed')) table.classList.add('note-table-fixed');
    startWidths.forEach((w, i) => { cols[i].style.width = w + 'px'; });
    noteResizeDrag = { kind, wrap, table, index, startX: e.clientX, startWidths };
  } else {
    const trs = Array.from(tbody.querySelectorAll('tr'));
    if (!trs.length || index + 1 >= trs.length) return;
    const startHeights = trs.map((tr) => clampNoteTableRowHeight(Math.round(tr.getBoundingClientRect().height)));
    startHeights.forEach((h, i) => { if (trs[i].style) trs[i].style.height = h + 'px'; });
    noteResizeDrag = { kind, wrap, table, index, startY: e.clientY, startHeights };
  }
  handle.classList.add('is-dragging');
  window.addEventListener('pointermove', onNoteResizePointerMove);
  window.addEventListener('pointerup', onNoteResizePointerUp);
  window.addEventListener('pointercancel', onNoteResizePointerUp);
}

function onNoteResizePointerMove(e) {
  const d = noteResizeDrag;
  if (!d) return;
  if (d.kind === 'col') {
    const target = clampNoteTableColWidth(d.startWidths[d.index] + (e.clientX - d.startX));
    const cols = d.table.querySelectorAll('col');
    if (cols[d.index]) cols[d.index].style.width = target + 'px';
  } else {
    const target = clampNoteTableRowHeight(d.startHeights[d.index] + (e.clientY - d.startY));
    const tbody = d.table.querySelector('tbody') || d.table;
    const trs = Array.from(tbody.querySelectorAll('tr'));
    if (trs[d.index]) trs[d.index].style.height = target + 'px';
  }
  placeNoteResizeHandles(d.wrap);
}

function onNoteResizePointerUp() {
  window.removeEventListener('pointermove', onNoteResizePointerMove);
  window.removeEventListener('pointerup', onNoteResizePointerUp);
  window.removeEventListener('pointercancel', onNoteResizePointerUp);
  document.querySelectorAll('.note-col-handle.is-dragging, .note-row-handle.is-dragging').forEach((h) => h.classList.remove('is-dragging'));
  if (!noteResizeDrag) return;
  noteResizeDrag = null;
  const root = document.getElementById('noteBodyInput');
  if (root) initNoteTableResizers(root);
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
}

function buildTableBlockHTML(block) {
  const rows = Array.isArray(block.rows) ? block.rows : [];
  let html = '<div class="note-table-wrap" contenteditable="false">';
  const hasColW = noteTableHasColWidths(block.colWidths);
  const colCount = rows.length ? (Array.isArray(rows[0]) ? rows[0].length : 0) : 0;
  html += '<table class="note-table' + (block.header ? ' note-table-hasheader' : '') + (hasColW ? ' note-table-fixed' : '') + '"' + noteTableBorderAttr(block) + '>' + noteTableColgroupHTML(block, colCount) + '<tbody>';
  rows.forEach((row, r) => {
    html += '<tr' + noteTableRowHeightAttr(block, r) + '>';
    (Array.isArray(row) ? row : []).forEach((cell) => {
      const text = cell && typeof cell.text === 'string' ? cell.text : '';
      const fmt = cell && Array.isArray(cell.formatting) ? cell.formatting : null;
      html += '<td class="note-cell" contenteditable="true"' + noteTableCellSpanAttr(cell, 'colspan') + noteTableCellSpanAttr(cell, 'rowspan') + noteTableCellBackgroundStyle(cell) + noteTableCellAlignAttr(cell) + '>' + buildNoteBodyHTML(text, fmt) + '</td>';
    });
    html += '</tr>';
  });
  html += '</tbody></table><div class="note-table-resize" aria-hidden="true"></div></div>';
  return html;
}

// ============================================================
// NOTE → PDF EXPORT (PHASE 6)
// Self-contained renderers that turn a saved Note into a clean,
// printable PDF page. Text runs reuse buildNoteBodyHTML (the exact
// same guaranteed escaping + <b>/<i>/<u>/color model used by the
// editor), so stored user content stays escaped/inert exactly as
// the rest of the app expects. Tables are rendered by a PDF-only
// <table> adapter that mirrors the editor's saved model (borders,
// background colour, per-cell alignment, column widths, row
// heights, merge/split spans, optional header row) WITHOUT the
// editor's toolbar / resize handles / contenteditable chrome.
//
// Intelligent automatic layout is applied ONLY as a fallback for
// cells the user never explicitly formatted:
//   - long text wraps and never overflows the cell/page,
//   - numeric/Arabic content auto-aligns (right), English auto-left,
//   - normal content is vertically centred,
//   - Arabic cells get dir="rtl".
// Every EXPLICIT user choice (alignH / alignV / borderStyle /
// colWidths / rowHeights / backgroundColor / spans / formatting)
// remains authoritative in the PDF.
// ============================================================

// Robust colspan/rowspan attribute for a PDF cell. Tolerates both the
// camelCase (rowSpan) and lowercase (rowspan) keys produced by earlier
// serializers; only a finite integer > 1 is ever emitted, so stored data
// can never inject markup into the attribute.
function notePdfCellSpanAttr(cell, prop) {
  if (!cell) return '';
  const a = cell[prop];
  const b = cell[prop === 'colspan' ? 'colSpan' : 'rowSpan'];
  const raw = (typeof a === 'number' ? a : (typeof b === 'number' ? b : NaN));
  const v = Math.floor(raw);
  return Number.isFinite(v) && v > 1 ? ' ' + prop + '="' + v + '"' : '';
}

// dir attribute for a PDF cell from its text (Arabic → rtl, else auto).
function notePdfCellDirAttr(cell) {
  const text = cell && typeof cell.text === 'string' ? cell.text : '';
  return ' dir="' + pdfCellDir(text) + '"';
}

// Choose a readable default text colour for a cell given its background hex.
// Returns black or white based on relative luminance so that user-set cell
// backgrounds never make the text unreadable/disappear. This is ONLY the
// fallback colour: explicit per-run note text colours (buildNoteBodyHTML emits
// them as inline <span style="color:…">) always override it, so user-authored
// text colours are preserved exactly. No cell background is removed or dimmed.
function notePdfContrastTextColor(bgHex) {
  const m = /^#([0-9a-f]{6})$/i.exec(bgHex || '');
  if (!m) return '#000000';
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#ffffff';
}

// Single inline style attribute for a PDF cell. Combines:
//   - explicit normalized background colour (if any),
//   - a readable default text colour that contrasts with that background
//     (only the fallback; explicit per-run colours still win),
//   - horizontal text-align: explicit alignH if present, else auto via pdfCellAlign,
//   - vertical-align: explicit alignV if present, else middle,
//   - wrapping rules so content stays inside the cell.
// Every value comes from an allow-list / normalized colour / fixed string —
// never raw user input, so there is no CSS injection surface.
function notePdfTableCellStyle(cell) {
  const parts = ['white-space:normal;word-break:break-word;overflow-wrap:anywhere;'];
  const text = cell && typeof cell.text === 'string' ? cell.text : '';
  const bg = normalizeNoteTextColor(cell && cell.backgroundColor);
  if (bg) {
    parts.push('background-color:' + bg + ';');
    parts.push('color:' + notePdfContrastTextColor(bg) + ';');
  }
  const h = cell && typeof cell.alignH === 'string' ? cell.alignH : '';
  parts.push('text-align:' + (NOTE_TABLE_H_ALIGN.indexOf(h) !== -1 ? h : pdfCellAlign(text)) + ';');
  const v = cell && typeof cell.alignV === 'string' ? cell.alignV : '';
  const vv = NOTE_TABLE_V_ALIGN.indexOf(v) !== -1 ? v : 'middle';
  parts.push('vertical-align:' + vv + ';');
  return ' style="' + parts.join('') + '"';
}

// One cell of the PDF table. `isHeader` switches to <th> so the header
// row renders distinctly and can repeat across pages (the CSS uses
// display:table-header-group).
function notePdfTableCellHTML(cell, isHeader) {
  const tag = isHeader ? 'th' : 'td';
  const text = cell && typeof cell.text === 'string' ? cell.text : '';
  const fmt = cell && Array.isArray(cell.formatting) ? cell.formatting : null;
  return '<' + tag + ' class="eq-pdf-note-cell"' +
    notePdfCellSpanAttr(cell, 'colspan') +
    notePdfCellSpanAttr(cell, 'rowspan') +
    notePdfCellDirAttr(cell) +
    notePdfTableCellStyle(cell) +
    '>' + buildNoteBodyHTML(text, fmt) + '</' + tag + '>';
}

// One <tr> of the PDF table. r is the row index within block.rows so
// explicit row heights map 1:1.
function buildNotePdfRowHTML(block, row, r, headerRow) {
  let html = '<tr' + noteTableRowHeightAttr(block, r) + '>';
  (Array.isArray(row) ? row : []).forEach((cell) => {
    html += notePdfTableCellHTML(cell, headerRow);
  });
  return html + '</tr>';
}

// PDF-only <colgroup>. The editor's noteTableColgroupHTML stores absolute px
// widths (60–800px per column), which is correct on screen but lets a wide
// table overflow the A4 page during PDF capture: html2canvas screenshots the
// element at its laid-out width, so columns beyond the page edge would be
// clipped (lost last columns). The PDF instead converts the saved px widths
// into percentages that preserve the user's RELATIVE column proportions while
// always summing to 100% of the printable page width. Unspecified columns get
// the mean explicit width as a neutral weight (or equal shares when no
// explicit widths exist). Reuses the editor's normalization/clamping, so no
// new size model is introduced and stored data is unchanged.
function notePdfColgroupHTML(block, colCount) {
  const widths = Array.isArray(block && block.colWidths) ? block.colWidths : null;
  const px = [];
  let total = 0, count = 0;
  for (let i = 0; i < colCount; i++) {
    const w = (widths && i < widths.length) ? normalizeNoteTableColWidth(widths[i]) : null;
    px.push(w);
    if (w !== null) { total += w; count++; }
  }
  const avg = count ? total / count : 1;
  const weights = px.map((w) => (w !== null ? w : avg));
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  let html = '<colgroup>';
  for (let i = 0; i < colCount; i++) {
    html += '<col style="width:' + (weights[i] * 100 / sum).toFixed(4) + '%;">';
  }
  return html + '</colgroup>';
}

// Standalone PDF <table> for a saved table block. Reuses the editor's safe
// <colgroup>/row-height helpers for explicit sizes; absent widths/heights
// fall back to natural content-driven sizing. The header row (block.header)
// becomes a real <thead>, which the PDF CSS both styles distinctly and uses
// for best-effort header repetition on multi-page tables.
function buildNoteTableBlockPdfHTML(block) {
  const rows = Array.isArray(block && block.rows) ? block.rows : [];
  const isHeader = !!(block && block.header);
  const borderStyle = block && typeof block.borderStyle === 'string'
    ? (NOTE_TABLE_BORDER_STYLES.indexOf(block.borderStyle) !== -1 ? block.borderStyle : 'all')
    : 'all';
  let colCount = 0;
  rows.forEach((r) => { if (Array.isArray(r) && r.length > colCount) colCount = r.length; });
  let html = '<table class="eq-pdf-note-table' +
    (noteTableHasColWidths(block && block.colWidths) ? ' eq-pdf-fixed' : '') + '"' +
    (borderStyle !== 'all' ? ' data-border-style="' + borderStyle + '"' : '') +
    '>' + notePdfColgroupHTML(block, colCount);
  if (isHeader) {
    html += '<thead>';
    if (rows.length) html += buildNotePdfRowHTML(block, rows[0], 0, true);
    html += '</thead><tbody>';
    for (let r = 1; r < rows.length; r++) html += buildNotePdfRowHTML(block, rows[r], r, false);
    html += '</tbody>';
  } else {
    html += '<tbody>';
    (Array.isArray(rows) ? rows : []).forEach((row, r) => {
      html += buildNotePdfRowHTML(block, row, r, false);
    });
    html += '</tbody>';
  }
  return html + '</table>';
}

// Printable PDF block for an image (PART 09). Aspect ratio preserved by
// width + height:auto; alignment via data-image-align with block margins.
// Behind (watermark/background) images are rendered INSIDE the same container
// as the text so html2canvas/html2pdf captures them as one stacked element —
// the image paints below the text with the stored opacity, never separated
// or dropped below the text layer in the generated PDF.
function buildNotePdfImageBlockHTML(block) {
  const src = (block && typeof block.src === 'string') ? block.src : '';
  const alt = (block && typeof block.alt === 'string') ? block.alt : '';
  const w = clampNoteImageWidth(block && block.width);
  const align = normalizeNoteImageAlign(block && block.align);
  const op = clampNoteImageOpacity(block && block.opacity);
  const behind = !!(block && block.behind);
  if (behind) {
    // Watermark/background: render as an absolute layer inside a relative
    // wrapper that ALSO holds the text block, so the PDF renderer keeps them
    // in one stacking context (image below, text above) exactly like the editor.
    const fl = Number.isFinite(parseFloat(block && block.floatLeft)) ? Math.max(0, Math.round(parseFloat(block.floatLeft))) : 0;
    const ft = Number.isFinite(parseFloat(block && block.floatTop)) ? Math.max(0, Math.round(parseFloat(block.floatTop))) : 0;
    return '<div class="eq-pdf-watermark-block" data-image-align="' + align + '" style="position:relative;min-height:40px;">' +
      '<img class="eq-pdf-watermark" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" ' +
        'style="position:absolute;left:' + fl + 'px;top:' + ft + 'px;width:' + w + 'px;opacity:' + op + ';z-index:0;">' +
      '<div class="eq-pdf-text-on-watermark" style="position:relative;z-index:1;width:100%;"></div>' +
      '</div>';
  }
  return '<div class="eq-pdf-image-block" data-image-align="' + align + '">' +
    '<img class="eq-pdf-image" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" style="width:' + w + 'px">' +
    '</div>';
}

// Printable body of a note: text blocks + PDF tables, all content escaped.
function buildNotePdfBodyHTML(blocks) {
  const out = [];
  (Array.isArray(blocks) ? blocks : []).forEach((b) => {
    if (!b) return;
    if (b.type === 'table') {
      out.push('<div class="eq-pdf-table-wrap">' + buildNoteTableBlockPdfHTML(b) + '</div>');
    } else if (b.type === 'checklist') { // PART 04
      const items = (Array.isArray(b.items) ? b.items : []).map((it) =>
        '<div class="eq-pdf-check-item">' +
        '<span class="eq-pdf-check-box' + (it && it.checked ? ' on' : '') + '">' + (it && it.checked ? '\u2611' : '\u2610') + '</span>' +
        '<span class="eq-pdf-check-text' + (it && it.checked ? ' done' : '') + '">' + buildNoteBodyHTML(typeof (it && it.text) === 'string' ? it.text : '', []) + '</span>' +
        '</div>'
      ).join('');
      out.push('<div class="eq-pdf-checklist">' + items + '</div>');
    } else if (b.type === 'divider') { // PART 04
      out.push('<hr class="eq-pdf-divider">');
    } else if (b.type === 'image') { // PART 09
      out.push(buildNotePdfImageBlockHTML(b));
    } else {
      out.push('<div class="eq-pdf-text-block">' + buildNoteBodyHTML(b.body, b.formatting) + '</div>');
    }
  });
  return out.join('');
}

// Build the full, self-contained A4 HTML page for a Note. Uses bodyBlocks
// when present (tables), else the legacy body+formatting model — so legacy
// notes export through the same escaped pipeline. Layout/order, branding and
// footer mirror the History report; only the note body is page-specific.
function buildNotePdfHtml(note) {
  const t = translations[state.locale] || translations.en;
  const brandTitle = 'EQ7 Calculator';
  const brandSub = 'Note';
  const footerNote = 'Created with EQ7 Calculator';
  const footerTagline = 'Smart calculations. Simple results.';
  const title = (note && typeof note.title === 'string' && note.title) || (t.untitled || 'Untitled');
  const hasBlocks = Array.isArray(note && note.bodyBlocks) && note.bodyBlocks.length;
  const bodyHtml = hasBlocks
    ? buildNotePdfBodyHTML(note.bodyBlocks)
    : '<div class="eq-pdf-text-block">' + buildNoteBodyHTML(note && note.body, note && note.bodyFormatting) + '</div>';
  const ts = (note && note.updatedAt) || Date.now();
  const exportedAt = String(new Date(ts).toLocaleString(t.locale || undefined));
  const titleDir = pdfCellDir(title);
  // Body direction: explicit note.dir wins, else auto-detected from the body text
  // so Arabic notes render RTL (text-align start = right) in the print surface.
  const bodyDir = (note && note.dir === 'rtl') || (note && note.dir === 'ltr')
    ? note.dir
    : pdfCellDir((note && typeof note['body'] === 'string' && note['body']) || title);

  // PHASE 09: session presentation options (template / header / footer / watermark).
  const docOptions = notePdfDocOptions || {};
  const tplName = NOTE_PDF_TPL_NAMES.indexOf(docOptions.template) !== -1 ? docOptions.template : 'report';
  const tplClass = tplName === 'report' ? '' : ' eq-pdf-tpl-' + tplName;
  // PART 08 — carry the note's Style/Frame onto the PDF report container so the
  // exported PDF keeps the chosen starting design (fonts/headings/spacing/colors/
  // table styling + frame). Zero-specificity rules are injected in the PDF <style>.
  // `note.style` is what the notes editor persists; the legacy `note.styleId`
  // spelling is still honoured for notes saved by older builds.
  const pdfStyleId = (note && typeof note.style === 'string' && NOTE_STYLE_IDS.indexOf(note.style) !== -1) ? note.style
    : ((note && typeof note.styleId === 'string' && NOTE_STYLE_IDS.indexOf(note.styleId) !== -1) ? note.styleId : '');
  const pdfFrameId = (note && typeof note.frame === 'string' && NOTE_FRAME_IDS.indexOf(note.frame) !== -1) ? note.frame : '';
  // INSTANT EXPORT — there are no dialog overrides anymore. The PDF always uses
  // the note's own title (falling back to "Untitled" so an export never blocks),
  // the note's own Style/Frame and the export date, and the Company Profile is
  // never injected into a note export.
  const exportTitle = title;
  const pdfStyleClass = pdfStyleId ? ' note-style-' + pdfStyleId : '';
  const pdfFrameClass = pdfFrameId ? ' note-frame-' + pdfFrameId : '';

  const wm = (docOptions.watermark && docOptions.watermark.on && String(docOptions.watermark.text || '').trim())
    ? { text: String(docOptions.watermark.text).trim(), opacity: typeof docOptions.watermark.opacity === 'number' ? docOptions.watermark.opacity : 0.1 }
    : null;
  const showHeader = docOptions.header !== false;
  const showFooter = docOptions.footer !== false;
  const d = new Date(ts);
  const footerMeta = String(d.toLocaleDateString(t.locale || undefined)) + ' \u00B7 ' +
    String(d.toLocaleTimeString(t.locale || undefined)) + ' \u00B7 ' +
    String(d.toLocaleDateString(t.locale || undefined, { weekday: 'long' }));

  const html = `<!DOCTYPE html>
<html lang="${t.locale || 'en'}">
<head>
<meta charset="utf-8">
<title>EQ7 Note PDF</title>
<style>
  .eq-note-report { color:#000000; background:#ffffff; font-family:"Segoe UI", Tahoma, "Noto Sans", "Noto Naskh Arabic", Arial, sans-serif; font-size:13px; line-height:1.6; }
  .eq-note-header { border-bottom:2px solid #0891b2; padding-bottom:8px; margin-bottom:14px; page-break-after:avoid; break-after:avoid; }
  .eq-note-header h1 { margin:0; font-size:18px; color:#000000; letter-spacing:0.3px; }
  .eq-note-header .sub { font-size:12px; color:#000000; margin-top:2px; }
  .eq-note-header .meta { font-size:11px; color:#000000; margin-top:3px; }
  .eq-note-title { font-size:20px; color:#000000; margin:14px 0 10px; line-height:1.4; white-space:normal; word-break:break-word; overflow-wrap:anywhere; page-break-after:avoid; break-after:avoid; }
  .eq-pdf-text-block { color:#000000; margin:0 0 12px; font-size:13px; line-height:1.6; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap; unicode-bidi:plaintext; text-align:start; }
  .eq-pdf-text-block:last-child { margin-bottom:0; }
  /* PHASE 03 — headings/lists flow from buildNoteBodyHTML into the PDF via the
     existing pipeline; only presentation CSS for the block tags is added. */
  .eq-note-body h1, .eq-note-body h2, .eq-note-body h3 { color:#000000; margin:14px 0 6px; line-height:1.35; word-break:break-word; overflow-wrap:anywhere; page-break-after:avoid; break-after:avoid; }
  .eq-note-body h1:first-child, .eq-note-body h2:first-child, .eq-note-body h3:first-child { margin-top:0; }
  .eq-note-body h1 { font-size:19px; font-weight:700; }
  .eq-note-body h2 { font-size:16.5px; font-weight:700; }
  .eq-note-body h3 { font-size:14.5px; font-weight:700; }
  .eq-note-body ul, .eq-note-body ol { margin:6px 0 12px; padding-inline-start:24px; padding-inline-end:0; }
  .eq-note-body li { margin:2px 0; line-height:1.6; word-break:break-word; overflow-wrap:anywhere; text-align:start; unicode-bidi:plaintext; }
  .eq-pdf-table-wrap { margin:12px 0; max-width:100%; }
  .eq-pdf-image-block { margin:8px 0; max-width:100%; }
  .eq-pdf-image-block .eq-pdf-image { display:block; height:auto; max-width:100%; }
  .eq-pdf-image-block[data-image-align="left"] .eq-pdf-image { margin-right:auto; }
  .eq-pdf-image-block[data-image-align="center"] .eq-pdf-image { margin-left:auto; margin-right:auto; }
  .eq-pdf-image-block[data-image-align="right"] .eq-pdf-image { margin-left:auto; }
  /* Watermark/background (behind) images: one stacked element with the text so
     html2canvas collects both layers into the same PDF tile at the stored opacity. */
  .eq-pdf-watermark-block { position:relative; margin:8px 0; min-height:32px; max-width:100%; }
  .eq-pdf-watermark-block .eq-pdf-watermark { display:block; height:auto; max-width:100%; }
  .eq-pdf-watermark-block .eq-pdf-text-on-watermark { word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap; }
  .eq-pdf-image-block { margin:8px 0; max-width:100%; }
  .eq-pdf-note-table.eq-pdf-fixed { table-layout:fixed; width:100%; max-width:100%; }
  .eq-pdf-note-table th, .eq-pdf-note-table td { border:1px solid #cbd5e1; padding:6px 8px; font-size:12px; line-height:1.45; color:#000000; }
  .eq-pdf-note-table thead { display:table-header-group; }
  .eq-pdf-note-table thead { break-inside:avoid; page-break-inside:avoid; }
  .eq-pdf-note-table thead th { background:#0d9488; color:#ffffff; font-weight:700; font-size:12px; line-height:1.4; text-align:center; vertical-align:middle; }
    .eq-pdf-note-table tbody tr { page-break-inside:avoid; break-inside:avoid; page-break-after:auto; }
  /* A single row taller than one page would otherwise overflow A4 (the avoid rule
     above forces it whole). Allow a forced break inside such a row so long tables
     never clip or push content off the page — only applies at genuine page height. */
  .eq-pdf-note-table tbody tr.tall { page-break-inside:auto; break-inside:auto; page-break-after:auto; }
  .eq-pdf-note-table { page-break-inside:auto; break-inside:auto; }
  .eq-pdf-note-table [dir="rtl"] { direction:rtl; }
  .eq-pdf-note-table[data-border-style="none"] th,
  .eq-pdf-note-table[data-border-style="none"] td { border:none; }
  .eq-pdf-note-table[data-border-style="outside"] th,
  .eq-pdf-note-table[data-border-style="outside"] td { border:none; }
  .eq-pdf-note-table[data-border-style="outside"] { border:1px solid #cbd5e1; }
  .eq-pdf-note-table[data-border-style="inside"] { border:none; }
  .eq-pdf-note-table[data-border-style="inside"] th,
  .eq-pdf-note-table[data-border-style="inside"] td { border:1px solid #cbd5e1; }
  .eq-pdf-note-table[data-border-style="inside"] tr:first-child th,
  .eq-pdf-note-table[data-border-style="inside"] tr:first-child td { border-top:none; }
  .eq-pdf-note-table[data-border-style="inside"] tr:last-child th,
  .eq-pdf-note-table[data-border-style="inside"] tr:last-child td { border-bottom:none; }
  .eq-pdf-note-table[data-border-style="inside"] th:first-child,
  .eq-pdf-note-table[data-border-style="inside"] td:first-child { border-left:none; }
  .eq-pdf-note-table[data-border-style="inside"] th:last-child,
  .eq-pdf-note-table[data-border-style="inside"] td:last-child { border-right:none; }
  .eq-note-footer { margin-top:24px; padding-top:10px; border-top:2px solid #0891b2; text-align:center; page-break-inside:avoid; break-inside:avoid; line-height:1.6; }
  .eq-note-footer .fb { display:block; font-size:12px; line-height:1.6; color:#000000; font-weight:700; margin:0 0 2px; padding:0; }
  .eq-note-footer .ft { display:block; font-size:11px; line-height:1.6; color:#000000; font-style:italic; margin-top:2px; padding:0; }
  .eq-note-footer .fmt { display:block; font-size:11px; line-height:1.6; color:#334155; margin-top:2px; padding:0; }
  .eq-note-report { position:relative; }
  .eq-pdf-watermark { position:absolute; top:45%; left:0; right:0; text-align:center; transform:rotate(-25deg); font-size:52px; font-weight:700; color:#000; letter-spacing:2px; white-space:nowrap; pointer-events:none; z-index:0; }
  .eq-note-header, .eq-note-title, .eq-note-body { position:relative; z-index:1; }
  .eq-pdf-header-note { font-size:12px; color:#334155; margin-top:3px; word-break:break-word; overflow-wrap:anywhere; }
  .eq-note-report.eq-pdf-tpl-invoice .eq-note-header { border-bottom-color:#0d9488; }
  .eq-note-report.eq-pdf-tpl-invoice .eq-note-header h1, .eq-note-report.eq-pdf-tpl-invoice .eq-note-title { color:#0d9488; }
  .eq-note-report.eq-pdf-tpl-receipt .eq-note-header { border-bottom-color:#2563eb; }
  .eq-note-report.eq-pdf-tpl-receipt .eq-note-header h1, .eq-note-report.eq-pdf-tpl-receipt .eq-note-title { color:#2563eb; }
  .eq-note-report.eq-pdf-tpl-contract .eq-note-header { border-bottom-color:#334155; }
  .eq-note-report.eq-pdf-tpl-contract .eq-note-header h1, .eq-note-report.eq-pdf-tpl-contract .eq-note-title { color:#1e293b; }
  .eq-note-report.eq-pdf-tpl-cv .eq-note-header { border-bottom-color:#0891b2; }
  .eq-note-report.eq-pdf-tpl-cv .eq-note-header h1, .eq-note-report.eq-pdf-tpl-cv .eq-note-title { color:#0e7490; }
  .eq-note-report.eq-pdf-tpl-business .eq-note-header { border-bottom-color:#4f46e5; }
  .eq-note-report.eq-pdf-tpl-business .eq-note-header h1, .eq-note-report.eq-pdf-tpl-business .eq-note-title { color:#4338ca; }
  .eq-note-report.eq-pdf-tpl-engineering .eq-note-header { border-bottom-color:#ea580c; }
  .eq-note-report.eq-pdf-tpl-engineering .eq-note-header h1, .eq-note-report.eq-pdf-tpl-engineering .eq-note-title { color:#c2410c; }
  .eq-note-report.eq-pdf-tpl-letter .eq-note-header { border-bottom-color:#7c3aed; }
  .eq-note-report.eq-pdf-tpl-letter .eq-note-header h1, .eq-note-report.eq-pdf-tpl-letter .eq-note-title { color:#6d28d9; }
  /* PART 08 — Note Styles: zero-specificity (:where) starting-design rules so
     every manual inline format in the body always wins. Same visual language
     as the editor surface. */
  :where(.eq-note-report.note-style-simple) .eq-note-body { font-family:Georgia,'Times New Roman',serif; line-height:1.7; }
  :where(.eq-note-report.note-style-simple) .eq-note-body h1 { font-size:19px; letter-spacing:0.01em; }
  :where(.eq-note-report.note-style-simple) .eq-note-body h2 { font-size:16px; }
  :where(.eq-note-report.note-style-academic) .eq-note-body { font-family:'Segoe UI',system-ui,sans-serif; line-height:1.75; color:#1f2933; }
  :where(.eq-note-report.note-style-academic) .eq-note-body h1 { font-size:19px; border-bottom:2px solid #94a3b8; padding-bottom:4px; }
  :where(.eq-note-report.note-style-academic) .eq-note-body h2 { font-size:16.5px; color:#0f766e; }
  :where(.eq-note-report.note-style-academic) .eq-note-body h3 { font-size:14.5px; color:#334155; }
  :where(.eq-note-report.note-style-academic) .eq-pdf-note-table th { background:#e2e8f0; color:#1e293b; }
  :where(.eq-note-report.note-style-business) .eq-note-body { font-family:'Segoe UI',system-ui,sans-serif; line-height:1.65; color:#1e293b; }
  :where(.eq-note-report.note-style-business) .eq-note-body h1 { font-size:19px; color:#1e3a5f; }
  :where(.eq-note-report.note-style-business) .eq-note-body h2 { font-size:16.5px; color:#2c5282; }
  :where(.eq-note-report.note-style-business) .eq-pdf-note-table th { background:#1e3a5f; color:#ffffff; }
  :where(.eq-note-report.note-style-business) .eq-pdf-note-table td { border-color:#cbd5e1; }
  :where(.eq-note-report.note-style-engineering) .eq-note-body { font-family:Consolas,'Cascadia Mono',monospace; line-height:1.6; color:#263238; }
  :where(.eq-note-report.note-style-engineering) .eq-note-body h1 { font-size:18px; color:#b45309; }
  :where(.eq-note-report.note-style-engineering) .eq-note-body h2 { font-size:16px; color:#c2410c; }
  :where(.eq-note-report.note-style-engineering) .eq-pdf-note-table th { background:#455a64; color:#ffffff; }
  :where(.eq-note-report.note-style-engineering) .eq-pdf-note-table td { border-color:#90a4ae; }
  :where(.eq-note-report.note-style-modern) .eq-note-body { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; line-height:1.7; color:#0f172a; }
  :where(.eq-note-report.note-style-modern) .eq-note-body h1 { font-size:20px; font-weight:800; }
  :where(.eq-note-report.note-style-modern) .eq-note-body h2 { font-size:17px; font-weight:700; color:#0d9488; }
  :where(.eq-note-report.note-style-modern) .eq-pdf-note-table th { background:#0d9488; color:#ffffff; }
  /* PART 08 — Frames: simple page treatments on the PDF report container. */
  :where(.eq-note-report.note-frame-classic) .eq-note-body { border:1px solid #cbd5e1; border-radius:8px; padding:14px; }
  :where(.eq-note-report.note-frame-dashed) .eq-note-body { border:2px dashed rgba(13,148,136,0.55); border-radius:10px; padding:14px; }
  :where(.eq-note-report.note-frame-soft) .eq-note-body { border:none; border-radius:12px; padding:14px; background:rgba(13,148,136,0.05); }
  @page { size: A4; margin: 16pt; } @media print { .eq-note-report.note-print-area { direction:inherit; width:100%; } .eq-note-report.note-print-area p, .eq-note-report.note-print-area li { text-align:start; unicode-bidi:plaintext; } .eq-note-report.note-print-area ul, .eq-note-report.note-print-area ol { padding-inline-start:20px; padding-inline-end:0; } .eq-note-report.note-print-area h1, .eq-note-report.note-print-area h2, .eq-note-report.note-print-area h3 { page-break-after:avoid; break-after:avoid; } .eq-note-report.note-print-area .eq-pdf-image-block, .eq-note-report.note-print-area .eq-pdf-table-wrap { page-break-inside:avoid; break-inside:avoid; } }
</style>
</head>
<body>
  <div class="eq-note-report${tplClass}${pdfStyleClass}${pdfFrameClass}" id="note-report">
    ${wm ? '<div class="eq-pdf-watermark" style="opacity:' + wm.opacity + '">' + escapeHtml(wm.text) + '</div>' : ''}
    <div class="eq-note-header">
      <h1>${escapeHtml(brandTitle)}</h1>
      <div class="sub">${escapeHtml(brandSub)}</div>
      ${showHeader ? '<div class="eq-pdf-header-note" dir="' + titleDir + '">' + escapeHtml(exportTitle) + '</div>' : ''}
      <div class="meta"${pdfCellDir(title + ' ' + (note && (note.body || ''))) === 'rtl' ? ' dir="rtl"' : ''}>${escapeHtml(exportedAt)}</div>
    </div>
    <h2 class="eq-note-title" dir="${pdfCellDir(exportTitle)}">${escapeHtml(exportTitle)}</h2>
    <div class="eq-note-body"${bodyDir === 'rtl' ? ' dir="rtl"' : ''}>${bodyHtml}</div>
    <div class="eq-note-footer">
      <div class="fb">${escapeHtml(footerNote)}</div>
      ${showFooter ? '<div class="fmt">' + escapeHtml(footerMeta) + '</div>' : ''}
      <div class="ft">${escapeHtml(footerTagline)}</div>
    </div>
  </div>
</body>
</html>`;
  return html;
}

// ----------------------------------------------------------------------------
// PHASE — Send-as-PDF FIRST-CLICK FIX (Notes only).
// Root cause (confirmed from code): the Export/Send-as-PDF handler awaited
// buildNotePdfBlob on the click path, which runs HEAVY async work (html2pdf
// CDN fetch + hidden iframe + 120ms + html2canvas rasterization) AFTER the
// user gesture. By the time navigator.share({files}) fired, the browser's
// transient user-activation window had lapsed, so the native Share Sheet did
// NOT open on the FIRST press (needed a 2nd/3rd press). The History export
// already solved this exact problem with a pre-warmed blob cache
// (primePdfBlobCache / ensurePdfBlob); Notes never got the equivalent.
//
// Fix: a small, session-only, bounded cache keyed by the note's CONTENT
// (title + body + formatting runs + blocks + presentation options + locale).
// The blob is pre-warmed in the background whenever the note is opened or
// auto-saved, so the first real Share/Export tap resolves from cache with no
// heavy async work on the gesture path — preserving navigator.share activation.
// This does NOT change the PDF engine, PDF styling, storage, data model, or
// the Share API. The generator below is unchanged; it is only wrapped by the
// cache. Cached blobs carry the PDF header/footer timestamp captured at prime
// time (identical trade-off to the accepted History prime-cache behaviour).
const notePdfBlobCache = new Map(); // noteCacheKey -> Promise<Blob>
const NOTE_PDF_CACHE_MAX = 3;

function notePdfCacheKey(note) {
  const o = notePdfDocOptions || {};
  let blocks = '';
  let fmt = '';
  try { blocks = (note && Array.isArray(note.bodyBlocks)) ? JSON.stringify(note.bodyBlocks) : ''; } catch (e) { blocks = ''; }
  try { fmt = (note && Array.isArray(note.bodyFormatting)) ? JSON.stringify(note.bodyFormatting) : ''; } catch (e) { fmt = ''; }
  return [
    note && note.id, note && note.title, note && note.body,
    state.locale, o.template, o.header, o.footer,
    o.watermark && o.watermark.on, o.watermark && o.watermark.text,
    blocks, fmt
  ].join('|');
}

// Pre-warm the current open note's PDF in the background (bounded, idempotent).
// Called on note-open and after autosave so a later first tap hits the cache.
function primeNotePdfBlob() {
  const note = state && state.currentOpenNote;
  if (!note || !note.id) return;
  if (typeof window.html2pdf === 'undefined') return; // leave first-tap fallback to the library loader
  scheduleNotePdfPrime();
}

let notePdfPrimeTimer = null;
function scheduleNotePdfPrime() {
  if (notePdfPrimeTimer) clearTimeout(notePdfPrimeTimer);
  notePdfPrimeTimer = setTimeout(() => {
    notePdfPrimeTimer = null;
    const note = state && state.currentOpenNote;
    if (!note || !note.id) return;
    const key = notePdfCacheKey(note);
    if (notePdfBlobCache.has(key)) return;
    const p = buildNotePdfBlobUncached(note).catch(() => {
      // PHASE — Preview fix: a failed background generation must NEVER be
      // cached. The old prime used a bare catch that returned null, so the first
      // Preview/Send tap after a failed prime got the cached null -> "invalid
      // PDF" -> preview modal closed instantly (white page). Evict the key so
      // the next tap retries the real generator.
      notePdfBlobCache.delete(key);
      return null;
    });
    notePdfBlobCache.set(key, p);
    while (notePdfBlobCache.size > NOTE_PDF_CACHE_MAX) {
      const k = notePdfBlobCache.keys().next().value;
      notePdfBlobCache.delete(k);
    }
  }, 120);
}

// Public generator: resolve from the warm cache when the note content (and
// presentation options) are unchanged, else build (and warm) it. Everything the
// pipeline produced is identical to the generator's output — only the timing of
// when the heavy work runs changes (background vs on-tap).
async function buildNotePdfBlob(note) {
  const key = note ? notePdfCacheKey(note) : null;
  if (key && notePdfBlobCache.has(key)) return notePdfBlobCache.get(key);
  const p = buildNotePdfBlobUncached(note);
  // PHASE — Preview fix: a rejected generation must never stay cached, or every
  // later tap fails instantly from the cached rejection. Evict on failure;
  // the successful path is untouched.
  const guarded = p.catch((e) => { notePdfBlobCache.delete(key); throw e; });
  if (key) {
    notePdfBlobCache.set(key, guarded);
    while (notePdfBlobCache.size > NOTE_PDF_CACHE_MAX) {
      const k = notePdfBlobCache.keys().next().value;
      notePdfBlobCache.delete(k);
    }
  }
  return guarded;
}

// Render a Note to a PDF Blob using the same html2pdf/html2canvas/jsPDF
// pipeline as the History export (proven approach), with the note body
// rendered from its stored blocks while preserving every table feature and
// applying intelligent automatic layout only as a fallback.
async function buildNotePdfBlobUncached(note) {
  if (typeof window.html2pdf === 'undefined') {
    // PART 21: the library comes from a CDN — offline, fail fast with clear feedback.
    if (isOffline()) throw new Error('no-internet');
    await loadExternalScript(PDF_LIB_URL);
  }
  if (typeof window.html2pdf === 'undefined') {
    throw new Error('PDF library unavailable');
  }
  const html = buildNotePdfHtml(note);
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    // html2pdf clones the source into the MAIN document to screenshot it, so the
    // iframe's stylesheet must also be present in the main document, exactly like
    // the History export. It is removed in cleanup.
    let mainStyle = null;
    let renderWorker = null;
    const cleanup = () => {
      if (renderWorker) {
        // A provider without the full Worker API (stub/shim/legacy build) may
        // carry no .prop state bag at all — guard so cleanup can never throw
        // inside the render promise (a throw here would leave the 👁️ Preview
        // awaiting forever on a blank white page).
        const props = renderWorker.prop;
        if (props) {
          if (props.canvas) { props.canvas.width = 0; props.canvas.height = 0; }
          if (props.overlay) props.overlay.remove();
          props.canvas = props.img = props.container = props.overlay = props.src = props.pdf = null;
        }
      }
      try { document.body.removeChild(frame); } catch (e) { /* already removed */ }
      if (mainStyle) { try { document.head.removeChild(mainStyle); } catch (e) { /* already removed */ } }
    };

    const doc = frame.contentDocument;
    if (!doc) {
      cleanup();
      reject(new Error('Could not access note iframe'));
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    mainStyle = document.createElement('style');
    mainStyle.id = 'eq-pdf-note-style';
    mainStyle.textContent = '#note-report{color:#000000;background:#ffffff;}' +
      (doc.querySelector('style') ? doc.querySelector('style').textContent : '');
    document.head.appendChild(mainStyle);

    // Allow a tick so fonts/layout are ready before capturing.
    setTimeout(() => {
      const el = doc.getElementById('note-report');
      if (!el) {
        cleanup();
        reject(new Error('Note report element missing'));
        return;
      }
      renderWorker = window.html2pdf()
        .set({
          margin: 16,
          filename: 'eq-note.pdf',
          // Raster pages as high-quality JPEG instead of lossless PNG: A4 page
          // PNGs at scale:2 inflate a small note to ~5.6MB. JPEG @ 0.95 with a
          // white background is visually indistinguishable at print resolution
          // but typically 5–8× smaller. scale stays 2 so text/tables stay crisp.
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
          // Use the same pagebreak mode as the proven History export (css +
          // legacy): honor the existing CSS break rules for table rows, thead,
          // and footer. (Previously an 'avoid-all' mode was tried to stop a
          // text block from being sliced mid-line, but 'avoid-all' treats every
          // block as unbreakable and inserts a full-page spacer before the
          // first block — producing a blank first page with the content pushed
          // onto page 2. That blank-first-page bug outweighs the marginal
          // cosmetic benefit, so Notes now matches the proven History config.)
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(el);
      // PHASE — Eye/Preview blank-white-screen fix. Feature-detect the
      // paginated pipeline before using it: html2pdf.js 0.10.1's Worker has
      // toContainer(), but a shimmed/partial window.html2pdf (external stubs,
      // legacy builds) exposes only the legacy set/from/toPdf/output chain.
      // Trusting toContainer() blindly threw synchronously inside this
      // setTimeout — the outer promise never settled, openNotePdfPreview
      // awaited forever, and the 👁️ Preview modal hung on a blank white page
      // with the indicator stuck at "…". When toContainer() is missing, run
      // the proven legacy pipeline instead (same jsPDF engine, same bytes).
      let pipeline;
      try {
        pipeline = (renderWorker && typeof renderWorker.toContainer === 'function')
          ? renderWorker.toContainer().then(async function () {
          // Paginate the DOM once. Match html2canvas rounding and html2pdf's
          // raster page height; raster-pixel offsets prevent cumulative drift.
          const overlay = this.prop.overlay;
          const rect = this.prop.container.getBoundingClientRect();
          const scale = this.opt.html2canvas.scale;
          const width = Math.ceil(rect.width) * scale;
          const height = Math.ceil(rect.height) * scale;
          const pageHeight = Math.floor(width * this.prop.pageSize.inner.ratio);
          const pages = Math.ceil(height / pageHeight);
          const captureOptions = this.opt.html2canvas;
          for (let page = 0; page < pages; page++) {
            const offset = page * pageHeight;
            const sliceHeight = Math.min(pageHeight, height - offset);
            try {
              // One A4 raster (~13 MB RGBA at scale 2), regardless of Note
              // length. Never allocate a full-document canvas or data URL.
              await this.set({ html2canvas: Object.assign({}, captureOptions, {
                y: offset / scale, height: sliceHeight / scale
              }) }).toCanvas();
              if (page === 0) {
                // Keep the existing jsPDF creation and first-page encoding.
                await this.toPdf();
              } else {
                this.prop.pdf.addPage();
                this.prop.pdf.addImage(this.prop.canvas.toDataURL('image/jpeg', 0.95),
                  'jpeg', 16, 16, this.prop.pageSize.inner.width,
                  sliceHeight < pageHeight ? sliceHeight * this.prop.pageSize.inner.width / width : this.prop.pageSize.inner.height);
              }
            } finally {
              if (this.prop.canvas) {
                this.prop.canvas.width = 0;
                this.prop.canvas.height = 0;
                this.prop.canvas = null;
              }
            }
            // toCanvas removes its overlay. Reuse the already-paginated DOM
            // without inserting page-break padding again for each slice.
            if (page + 1 < pages) document.body.appendChild(overlay);
          }
          this.prop.pdf.setPage(pages);
          return this.prop.pdf.output('blob');
          })
          : Promise.resolve(renderWorker.toPdf()).then((w) => w.output('blob'));
      } catch (errPipeline) { cleanup(); reject(errPipeline); return; }
      pipeline
        .then((blob) => { cleanup(); resolve(blob); })
        .catch((err) => { cleanup(); reject(err); });
        }, 120);
  });
}

// Build a safe, readable .pdf filename from a note title. Preserves Arabic,
// English and digits while stripping bidi-override controls (filename
// spoofing) and OS-unsafe / control characters. Always ends with '.pdf'.
function notePdfFilename(title) {
  let s = String(title == null ? '' : title)
    .replace(/[\u202A-\u202E\u200E\u200F]/g, '')   // strip bidi controls
    .replace(/[\\/:*?"<>|\r\n\t]/g, '_')           // OS-unsafe / control chars
    .replace(/\s+/g, ' ')                         // collapse whitespace
    .trim();
  if (!s) s = 'eq-note';
  if (s.length > 80) s = s.slice(0, 80);
  return s + '.pdf';
}

// ============================================================================
// PHASE 06 — NOTES PDF PREVIEW + PAGE NAVIGATION
// Read-only preview over the REAL PDF blob produced by the existing
// buildNotePdfBlob pipeline (same bytes the export/share path delivers — no
// engine, data-model or serialization changes). Pages are rasterized with
// pdf.js (lazy CDN load, same pattern as the existing PDF_LIB_URL preload) so
// the user sees exactly what the export produces, with prev/next navigation,
// page indicator, zoom in/out/fit, rotate (presentation-only) and the same
// share/save flow. Preview never mutates the note.
// ============================================================================

const NOTE_PDF_PREVIEW_LIB_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const NOTE_PDF_PREVIEW_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const NOTE_PDF_PREVIEW_ZOOM_MIN = 0.5;
const NOTE_PDF_PREVIEW_ZOOM_MAX = 3;

// Non-persistent, editor-session-only preview state (never stored).
const notePdfPreviewState = {
  doc: null,          // pdf.js document proxy
  blobUrl: null,      // object URL of the previewed blob
  page: 1,            // 1-based current page
  totalPages: 0,
  zoom: 1,            // multiplier on top of the fit-width baseline
  fitScale: 1,        // scale that fits the page width into the stage
  rotation: 0,        // 0/90/180/270 degrees, presentation-only
  renderTask: null,   // in-flight pdf.js render task (cancelled on re-render)
  generating: false,  // guards double-open while the blob is being built
  viewport: null,     // PHASE 08: current pdf.js viewport (scale+rotation) for annotation mapping
  noteId: null        // which note the preview belongs to
};

// ============================================================================
// PHASE 09 — NOTES PDF PROFESSIONAL DOCUMENTS / TEMPLATES
// Session-only presentation options applied when building the Notes → PDF HTML
// (buildNotePdfHtml reads this module state). Choosing a template, toggling the
// header/footer, and configuring a text watermark affect ONLY presentation of
// the exported/previewed document. They never touch the note model, the stored
// body/bodyBlocks, tables, spans, widths/heights or storage keys, and they do
// not rebuild the html2pdf engine. Real multi-page "N / M" numbering and PDF
// metadata (Title/Subject/...) require engine-level support (Phase 10) and are
// intentionally not fabricated here.
// ============================================================================
const NOTE_PDF_TPL_NAMES = ['blank', 'report', 'invoice', 'receipt', 'contract', 'cv', 'business', 'engineering', 'letter'];

const notePdfDocOptions = {
  template: 'report',
  header: true,
  footer: true,
  watermark: { on: false, text: '', opacity: 0.1, position: 'center' }
};

function resetNotePdfDocOptions() {
  notePdfDocOptions.template = 'report';
  notePdfDocOptions.header = true;
  notePdfDocOptions.footer = true;
  notePdfDocOptions.watermark.on = false;
  notePdfDocOptions.watermark.text = '';
}

// INSTANT EXPORT PHASE — the Note → PDF export setup dialog was removed entirely.
// There is no `notePdfExportOptions` object and no dialog DOM wiring left: the
// header PDF button exports the open note in one click using the note's own title,
// its own Style/Frame and the current (today) export date. Nothing about the
// export is configurable from the UI anymore, and nothing is ever written to the
// note by the export path.

// ============================================================================
// Company Profile — PERSISTENCE LAYER ONLY (no UI).
// The Company Profile *interface* (editor-header button, manager modal, media
// uploads, previews and the signature canvas) was removed with its phase. The
// persisted store itself is intentionally KEPT because other features still
// READ it:
//   * Smart Documents PDF editor — "Use Saved Logo" reads cp.logo
//     (smartPdfPickLogo), and the History / selection PDF branding reads the
//     saved logo + stamp.
//   * savedCompanyName() / HISTORY_COMPANY_KEY — the legacy company-name line.
// NOTE: the Note → PDF export does NOT read the profile anymore — the export
// dialog's "Use Company Profile" option was removed with the instant-export
// phase, so a note export never injects logo / stamp / signature / address /
// contact / footer into the PDF.
// No DOM lookups, no listeners and no modal code remain in this section.
// ============================================================================
const COMPANY_PROFILE_KEY = 'eq-note-company-profile';

// NOTE: this alias is NOT Company Profile code — it points at the Notes
// text-colour input (#noteTextColorInput), which is owned by the Notes
// text-colour feature, so it is deliberately left untouched here.
let cpTextColorInput = typeof document !== 'undefined' ? document.getElementById('noteTextColorInput') : null;
function loadCompanyProfile() {
  try {
    const raw = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}
function saveCompanyProfile(o) {
  try {
    const clean = {
      companyName: (o && typeof o.companyName === 'string') ? o.companyName.trim() : '',
      address: (o && typeof o.address === 'string') ? o.address.trim() : '',
      phone: (o && typeof o.phone === 'string') ? o.phone.trim() : '',
      email: (o && typeof o.email === 'string') ? o.email.trim() : '',
      website: (o && typeof o.website === 'string') ? o.website.trim() : '',
      logo: (o && typeof o.logo === 'string') ? o.logo.slice(0, 2000000) : '',
      signature: (o && typeof o.signature === 'string') ? o.signature.slice(0, 1200000) : '',
      stamp: (o && typeof o.stamp === 'string') ? o.stamp.slice(0, 1200000) : '',
      footer: (o && typeof o.footer === 'string') ? o.footer.trim() : ''
    };
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(clean));
    // Backward-compatible with the existing History/Part 11 company-name store.
    // The History helper may not be reliable in every path, so write the SAME
    // legacy key directly (no duplicate key) to guarantee savedCompanyName()
    // keeps returning the profile name for the History PDF branding.
    if (clean.companyName) {
      try { saveCompanyName(clean.companyName); } catch (e) {}
      try { localStorage.setItem(HISTORY_COMPANY_KEY, clean.companyName); } catch (e) {}
    }
    return clean;
  } catch (e) { return null; }
}

// ============================================================================
// PART 11 setup dialog — REMOVED (instant export phase).
// The Note → PDF export dialog no longer exists: no Style / Title / Date /
// Company Profile controls, no Preview / Create PDF action pair, no backdrop,
// no session-only option state and no DOM lookup. The header PDF button exports
// immediately from the note's own data (see performNotePdfExport below).
// ============================================================================



// Lazily load pdf.js (cdnjs) and point it at its worker. NOTE: this MUST NOT
// go through loadExternalScript(), whose code short-circuits whenever html2pdf
// is already loaded (`if (typeof window.html2pdf !== 'undefined') return`).
// Because preloadPdfLibrary() loads html2pdf at app boot, that guard made every
// Preview attempt resolve WITHOUT actually loading pdf.js, leaving
// window.pdfjsLib undefined → "PDF preview library unavailable" → the preview
// modal closed instantly (white page). Load pdf.js directly here (Preview-only).
async function ensureNotePdfPreviewLib() {
  if (typeof window.pdfjsLib !== 'undefined') {
    try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = NOTE_PDF_PREVIEW_WORKER_URL; } catch (e) { /* keep default */ }
    return window.pdfjsLib;
  }
  if (isOffline()) throw new Error('no-internet');
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = NOTE_PDF_PREVIEW_LIB_URL;
    s.async = true;
    s.onload = () => {
      try { if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = NOTE_PDF_PREVIEW_WORKER_URL; } catch (e) { /* keep default */ }
      resolve();
    };
    s.onerror = () => reject(new Error('PDF preview library unavailable'));
    document.head.appendChild(s);
  });
  if (typeof window.pdfjsLib === 'undefined') throw new Error('PDF preview library unavailable');
  return window.pdfjsLib;
}

// Open the preview for the currently open note. Flushes live edits first
// (same as export), then reuses buildNotePdfBlob — one pipeline, one output.
async function openNotePdfPreview() {
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  if (!note) { showToast('No note open'); return; }
  if (notePdfPreviewState.generating) return;
  notePdfPreviewState.generating = true;
  // Live edits are flushed in the wiring layer (registered before the open
  // listener), mirroring the export-handler flush pattern — the preview
  // itself is read-only over the generated blob and never mutates the note.
  // Show the workspace immediately with a translated title + progress state.
  const noteTitle = (note.title && String(note.title).trim()) || (t.untitled || 'Untitled');
  if (notePdfPreviewTitleEl) notePdfPreviewTitleEl.textContent = noteTitle;
  if (notePdfPageIndicator) notePdfPageIndicator.textContent = '…';
    if (notePdfPreviewModal) {
    notePdfPreviewModal.classList.add('show');
    notePdfPreviewModal.setAttribute('aria-hidden', 'false');
  }
  // Lock body scroll so the editor behind the preview cannot scroll on
  // mobile/tablet (same modal-open pattern every other modal uses).
  document.body.classList.add('modal-open');
  applyNotePdfPreviewLabels(t);
  syncNotePdfDocControls(); // PHASE 09: reflect current presentation options on open.
  try {
    const blob = await buildNotePdfBlob(note);
    if (!blob || blob.type !== 'application/pdf') throw new Error('invalid PDF');
    const lib = await ensureNotePdfPreviewLib();
    // Revoke any previous preview URL, then load the fresh bytes.
    if (notePdfPreviewState.blobUrl) { try { URL.revokeObjectURL(notePdfPreviewState.blobUrl); } catch (e) { /* noop */ } }
    const url = URL.createObjectURL(blob);
    const buf = await blob.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    if (notePdfPreviewState.noteId && notePdfPreviewState.noteId !== note.id) {
      // A newer preview opened meanwhile — discard this stale load.
      try { doc.destroy(); URL.revokeObjectURL(url); } catch (e2) { /* noop */ }
      return;
    }
    notePdfPreviewState.blobUrl = url;
    notePdfPreviewState.doc = doc;
    notePdfPreviewState.noteId = note.id;
    notePdfPreviewState.totalPages = doc.numPages;
    notePdfPreviewState.page = 1;
    notePdfPreviewState.rotation = 0;
    notePdfPreviewState.zoom = 1; // never carry a previous preview's zoom into a new one
    await renderNotePdfPreviewPage();
  } catch (err) {
    closeNotePdfPreview();
    if (err && err.message === 'no-internet') showInternetRequiredToast();
    else showToast('PDF generation failed: ' + (err && err.message ? err.message : err));
  } finally {
    notePdfPreviewState.generating = false;
    updateNotePdfPreviewButtons();
  }
}

function closeNotePdfPreview() {
  if (notePdfPreviewState.renderTask) { try { notePdfPreviewState.renderTask.cancel(); } catch (e) { /* noop */ } }
  notePdfPreviewState.renderTask = null;
  if (notePdfPreviewState.doc) { try { notePdfPreviewState.doc.destroy(); } catch (e) { /* noop */ } }
  notePdfPreviewState.doc = null;
  if (notePdfPreviewState.blobUrl) { try { URL.revokeObjectURL(notePdfPreviewState.blobUrl); } catch (e) { /* noop */ } }
  notePdfPreviewState.blobUrl = null;
  notePdfPreviewState.noteId = null;
  notePdfPreviewState.page = 1;
  notePdfPreviewState.totalPages = 0;
  hideNotePdfMoreMenu(); // PHASE 07: never leave the More menu open across opens.
  resetNotePdfAnnotations(); // PHASE 08: drop preview annotations (never persisted).
  resetNotePdfDocOptions(); // PHASE 09: session-only document options are not persisted.
  hideNotePdfDocOptions(); // PHASE 09: collapse the options panel on close.
    if (notePdfPreviewModal) {
    notePdfPreviewModal.classList.remove('show');
    notePdfPreviewModal.setAttribute('aria-hidden', 'true');
  }
  // Release the body scroll lock only when no parent Notes modal/workspace is
  // still open (mirror fullScreenNoteModal's guarded release), so the editor
  // behind the preview stays locked until it itself closes.
  const p6StillOpen = (fullScreenNoteModal && fullScreenNoteModal.classList.contains('show')) ||
    (notesManagerModal && notesManagerModal.classList.contains('show')) ||
    document.querySelector('.modal.show, .workspace-overlay.show');
  if (!p6StillOpen) document.body.classList.remove('modal-open');
}

// Render the current page at the current zoom/rotation into the canvas.
// Zoom 1 means "fit page width" (fitScale); the multiplier range is bounded.
async function renderNotePdfPreviewPage() {
  const { doc, page, zoom, fitScale, rotation } = notePdfPreviewState;
  if (!doc || !notePdfPreviewCanvas) return;
  if (notePdfPreviewState.renderTask) { try { notePdfPreviewState.renderTask.cancel(); } catch (e) { /* noop */ } notePdfPreviewState.renderTask = null; }
  const pdfPage = await doc.getPage(page);
  // Fit against the stage's CONTENT width (excluding its horizontal padding) so
  // a fit-zoom page fills the visible area exactly and its right edge is never
  // hidden underneath the padding / forcing a stray horizontal scroll (the page
  // must not look clipped). Falls back to the clientWidth when padding is 0.
  let stageWidth = (notePdfPreviewStage && notePdfPreviewStage.clientWidth) ? notePdfPreviewStage.clientWidth : 600;
  if (notePdfPreviewStage && typeof window.getComputedStyle === 'function') {
    try {
      const cs = window.getComputedStyle(notePdfPreviewStage);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const content = stageWidth - padL - padR;
      if (content > 0) stageWidth = content;
    } catch (e) { /* keep clientWidth fallback */ }
  }
  const base = pdfPage.getViewport({ scale: 1, rotation });
  notePdfPreviewState.fitScale = Math.max(0.2, Math.min(4, stageWidth / base.width));
  const scale = Math.max(NOTE_PDF_PREVIEW_ZOOM_MIN, Math.min(NOTE_PDF_PREVIEW_ZOOM_MAX, notePdfPreviewState.fitScale * zoom));
  const viewport = pdfPage.getViewport({ scale, rotation });
  notePdfPreviewState.viewport = viewport;
  const dpr = window.devicePixelRatio || 1;
  const canvas = notePdfPreviewCanvas;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = Math.floor(viewport.width) + 'px';
  canvas.style.height = Math.floor(viewport.height) + 'px';
  const ctx = canvas.getContext('2d');
  const task = pdfPage.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
  notePdfPreviewState.renderTask = task;
  try { await task.promise; } catch (e) { if (!e || e.name !== 'RenderingCancelledException') throw e; }
  if (notePdfPageIndicator) notePdfPageIndicator.textContent = page + ' / ' + notePdfPreviewState.totalPages;
  updateNotePdfPreviewButtons();
  // PHASE 08: re-project the annotation overlay for the freshly rasterized page
  // (zoom/rotate/resize/page all funnel through this renderer, so the overlay
  // stays anchored automatically). Deferred a frame so layout is current.
  if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(renderNotePdfAnnotations);
  else renderNotePdfAnnotations();
}

function goToNotePdfPreviewPage(next) {
  const { totalPages } = notePdfPreviewState;
  if (!totalPages) return;
  const target = Math.max(1, Math.min(totalPages, next));
  if (target === notePdfPreviewState.page) return;
  notePdfPreviewState.page = target;
  renderNotePdfPreviewPage().catch((err) => showToast('PDF preview failed: ' + (err && err.message ? err.message : err)));
}

function adjustNotePdfPreviewZoom(delta) {
  notePdfPreviewState.zoom = Math.max(NOTE_PDF_PREVIEW_ZOOM_MIN, Math.min(NOTE_PDF_PREVIEW_ZOOM_MAX, notePdfPreviewState.zoom + delta));
  renderNotePdfPreviewPage().catch((err) => showToast('PDF preview failed: ' + (err && err.message ? err.message : err)));
}

function resetNotePdfPreviewZoom() {
  notePdfPreviewState.zoom = 1; // 1 = fit page width
  renderNotePdfPreviewPage().catch((err) => showToast('PDF preview failed: ' + (err && err.message ? err.message : err)));
}

// Presentation-only rotation (0/90/180/270). Never touches the note or blob.
function rotateNotePdfPreview() {
  notePdfPreviewState.rotation = (notePdfPreviewState.rotation + 90) % 360;
  renderNotePdfPreviewPage().catch((err) => showToast('PDF preview failed: ' + (err && err.message ? err.message : err)));
}

function updateNotePdfPreviewButtons() {
  const { page, totalPages } = notePdfPreviewState;
  if (notePdfPrevPageBtn) notePdfPrevPageBtn.disabled = page <= 1;
  if (notePdfNextPageBtn) notePdfNextPageBtn.disabled = !totalPages || page >= totalPages;
  if (notePdfZoomOutBtn) notePdfZoomOutBtn.disabled = notePdfPreviewState.zoom <= NOTE_PDF_PREVIEW_ZOOM_MIN;
  if (notePdfZoomInBtn) notePdfZoomInBtn.disabled = notePdfPreviewState.zoom >= NOTE_PDF_PREVIEW_ZOOM_MAX;
  // PHASE 07: live zoom percentage readout (zoom 1 = fit width).
  if (notePdfZoomLevel) {
    const pct = Math.round((notePdfPreviewState.fitScale || 1) * (notePdfPreviewState.zoom || 1) * 100);
    notePdfZoomLevel.textContent = pct + '%';
  }
  if (notePdfMorePrevBtn) notePdfMorePrevBtn.disabled = page <= 1;
  if (notePdfMoreNextBtn) notePdfMoreNextBtn.disabled = !totalPages || page >= totalPages;
  if (notePdfMoreZoomOutBtn) notePdfMoreZoomOutBtn.disabled = notePdfPreviewState.zoom <= NOTE_PDF_PREVIEW_ZOOM_MIN;
  if (notePdfMoreZoomInBtn) notePdfMoreZoomInBtn.disabled = notePdfPreviewState.zoom >= NOTE_PDF_PREVIEW_ZOOM_MAX;
  const hasBlob = !!notePdfPreviewState.blobUrl;
  if (notePdfSaveBtn) notePdfSaveBtn.disabled = !hasBlob;
  if (notePdfPrintBtn) notePdfPrintBtn.disabled = !hasBlob;
}

// Localize the preview controls for the active language (all 7 locales carry
// the pdfPreview* keys). Called on open so a mid-session language change is
// picked up on the next open; uses the existing translations object only.
function applyNotePdfPreviewLabels(t) {
  const set = (el, key) => { if (el && t[key]) el.setAttribute('aria-label', t[key]); };
  set(notePdfPreviewClose, 'pdfClose');
  set(notePdfPreviewShare, 'pdfShare');
  set(notePdfPrevPageBtn, 'pdfPrevPage');
  set(notePdfNextPageBtn, 'pdfNextPage');
  set(notePdfZoomInBtn, 'pdfZoomIn');
  set(notePdfZoomOutBtn, 'pdfZoomOut');
  set(notePdfZoomFitBtn, 'pdfZoomFit');
  set(notePdfRotateBtn, 'pdfRotate');
  // PHASE 07: basic toolbar labels.
  set(notePdfPreviewMoreBtn, 'pdfMore');
  set(notePdfSaveBtn, 'pdfSave');
  set(notePdfPrintBtn, 'pdfPrint');
  // PHASE 08: annotation tool labels (7-language i18n keys already exist).
  set(notePdfAnnoEditBtn, 'pdfAnnoEdit');
  set(notePdfAnnoTextBtn, 'pdfAnnoText');
  set(notePdfAnnoHighlightBtn, 'pdfAnnoHighlight');
  set(notePdfAnnoDrawBtn, 'pdfAnnoDraw');
  set(notePdfAnnoUnderlineBtn, 'pdfAnnoUnderline');
  set(notePdfAnnoStrikeBtn, 'pdfAnnoStrike');
  set(notePdfAnnoRectBtn, 'pdfAnnoRect');
  set(notePdfAnnoCircleBtn, 'pdfAnnoCircle');
  set(notePdfAnnoLineBtn, 'pdfAnnoLine');
  set(notePdfAnnoNoteBtn, 'pdfAnnoNote');
  if (notePdfAnnoDeleteChip) notePdfAnnoDeleteChip.setAttribute('aria-label', t.pdfAnnoDelete || 'Delete annotation');
  // PHASE 09: document options toggle + watermark input labels.
  set(notePdfDocToggleBtn, 'pdfDocOptions');
}

// PHASE 07 — More (⋯) menu. Groups the secondary basic tools; on small
// screens the inline duplicates are hidden by CSS and the menu becomes the
// single entry point. Pure presentation state — no note data involved.
function hideNotePdfMoreMenu() {
  if (notePdfMoreMenu) notePdfMoreMenu.hidden = true;
  if (notePdfPreviewMoreBtn) notePdfPreviewMoreBtn.setAttribute('aria-expanded', 'false');
}

function toggleNotePdfMoreMenu() {
  if (!notePdfMoreMenu) return;
  const show = notePdfMoreMenu.hidden;
  notePdfMoreMenu.hidden = !show;
  if (notePdfPreviewMoreBtn) notePdfPreviewMoreBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
}

// Save the FINAL PDF (base blob, or base + burned-in annotations when any
// exist) via notePdfFinalPreviewUrl — burn-in runs at most once and is shared
// with Share/Print; with no annotations the original blob is saved unchanged.
async function saveNotePdfPreview() {
  if (!notePdfPreviewState.blobUrl) return;
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  const noteTitle = (note && note.title && String(note.title).trim()) || (t.untitled || 'Untitled');
  const a = document.createElement('a');
  a.href = await notePdfFinalPreviewUrl();
  a.download = notePdfFilename(noteTitle);
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { try { document.body.removeChild(a); } catch (e) { /* noop */ } }, 100);
}

// Print the FINAL PDF blob (with burned-in annotations when present) through
// the browser's native print pipeline (hidden iframe + blob URL).
async function printNotePdfPreview() {
  if (!notePdfPreviewState.blobUrl) return;
  const finalUrl = await notePdfFinalPreviewUrl();
  if (!finalUrl) return;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const cleanup = () => { try { document.body.removeChild(frame); } catch (e) { /* noop */ } };
  frame.addEventListener('load', () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch (e) { showToast('Print failed: ' + (e && e.message ? e.message : e)); }
    // Give the print dialog time to consume the blob URL before teardown.
    setTimeout(cleanup, 60000);
  });
  frame.src = finalUrl;
}

// Share / Save from the preview: reuses the exact export handler semantics
// (native share sheet with the real PDF File, then reliable download fallback)
// against the ALREADY-GENERATED preview blob URL — no second generation.
async function shareNotePdfPreview() {
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  if (!notePdfPreviewState.blobUrl) return;
  try {
    // Same FINAL blob as Save/Print (burned-in annotations when present).
    const blob = await (await fetch(await notePdfFinalPreviewUrl())).blob();
    const noteTitle = (note && note.title && String(note.title).trim()) || (t.untitled || 'Untitled');
    const filename = notePdfFilename(noteTitle);
    const pdfFile = new File([blob], filename, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({ files: [pdfFile], title: noteTitle, text: t.shareMessage || 'Exported from EQ7 Calculator' });
        return;
      } catch (e) {
        if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return;
      }
    }
    const a = document.createElement('a');
    a.href = await notePdfFinalPreviewUrl();
    a.download = filename;
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try { document.body.removeChild(a); } catch (e) { /* noop */ } }, 100);
  } catch (err) {
    showToast('PDF generation failed: ' + (err && err.message ? err.message : err));
  }
}

// ============================================================================
// PHASE 08 — NOTES PDF PREVIEW ANNOTATIONS (overlay layer, preview-only)
// Independent, non-destructive annotation layer over the RASTERIZED preview
// page. The exported Notes PDF has no text layer, so "edit" = placing/overlay
// ing a text box (never editing the underlying page) and highlight/underline/
// strike/shapes are drawn as vector overlays. Geometry is stored in PDF
// user-space points (bottom-left origin) and mapped to screen via the pdf.js
// viewport (scale + rotation), so annotations stay anchored across zoom,
// rotate, resize and page navigation. Keyed per page in this object ONLY —
// never in the note model, never persisted, NOT burned into the exported PDF
// (Save/Share/Print keep delivering the original PDF). (PHASE 08)
// ============================================================================
const NOTE_PDF_ANNO_DRAW_TOOLS = ['highlight', 'draw', 'underline', 'strike', 'rect', 'circle', 'line'];
const NOTE_PDF_ANNO_STROKE = {
  highlight: 'rgba(255,214,0,0.45)', underline: '#2563eb', strike: '#dc2626',
  rect: '#0d9488', circle: '#0d9488', line: '#0d9488', draw: '#ef4444', note: '#fbbf24'
};
const NOTE_PDF_ANNO_DEFAULT_SIZE = 12; // points; scaled by viewport for screen

const notePdfAnnoState = { tool: 'edit', byPage: {}, drag: null, drawing: false, sel: null };

function notePdfAnnoList() {
  const p = notePdfPreviewState.page || 1;
  if (!notePdfAnnoState.byPage[p]) notePdfAnnoState.byPage[p] = [];
  return notePdfAnnoState.byPage[p];
}

// First-strong-direction detection for annotation text (Arabic => rtl).
function notePdfAnnoDir(text) {
  return /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(text || '')) ? 'rtl' : 'ltr';
}

// Ratio between the DISPLAYED page size (canvas may be capped by the stage's
// max-width on zoom-in / small screens) and the pdf.js viewport size. When the
// canvas is capped, annotations must be scaled by this factor to stay glued to
// the page content (no drift on zoom / resize). 1 when there is no cap.
function notePdfAnnoDisplayScale() {
  const viewport = notePdfPreviewState.viewport;
  const pageCanvas = notePdfPreviewCanvas;
  if (!viewport || !viewport.width || !pageCanvas) return 1;
  const r = pageCanvas.getBoundingClientRect();
  return (r && r.width) ? r.width / viewport.width : 1;
}
// Effective px-per-PDF-point on the displayed page (viewport scale * display cap).
function notePdfAnnoFontScale() {
  const viewport = notePdfPreviewState.viewport;
  return (viewport ? viewport.scale : 1) * notePdfAnnoDisplayScale();
}

// Pointer event -> PDF user-space point (bottom-left origin via pdf.js viewport).
function notePdfAnnoPointFromEvent(evt) {
  const viewport = notePdfPreviewState.viewport;
  if (!viewport || !notePdfAnnoLayer) return { x: 0, y: 0 };
  const r = notePdfAnnoLayer.getBoundingClientRect();
  const s = notePdfAnnoDisplayScale();
  const p = viewport.convertToPdfPoint((evt.clientX - r.left) / s, (evt.clientY - r.top) / s);
  return { x: p[0], y: p[1] };
}

// PDF point -> screen CSS px (handles rotation + scale + display cap).
function notePdfAnnoPointToScreen(x, y) {
  const viewport = notePdfPreviewState.viewport;
  if (!viewport) return { x: 0, y: 0 };
  const p = viewport.convertToViewportPoint(x, y);
  const s = notePdfAnnoDisplayScale();
  return { x: p[0] * s, y: p[1] * s };
}

// PHASE 11 — REAL ANNOTATION BURN-IN (Notes → PDF only).
// Reuses the ALREADY-EXISTING pdf-lib vendor build (window.PDFLib, loaded by
// smartImportLoadPdfLib for the imported-PDF feature) — no new library is
// added. Annotations live in PDF user-space points (page 1, rotation 0),
// captured via viewport.convertToPdfPoint, so they are zoom/rotation/resize
// independent. Burn-in = draw them into each page's real content stream with
// pdf-lib; the base PDF's vector content, fonts, pages, size, order,
// templates/watermark/header/footer and EQ7 branding are untouched.
function notePdfAnnoHasAny() {
  const byPage = notePdfAnnoState.byPage || {};
  for (const p in byPage) { if (Array.isArray(byPage[p]) && byPage[p].length) return true; }
  return false;
}

// Burn ONE text annotation into the PDF page content stream.
// Latin-1 (English/European) text uses pdf-lib's vector drawText (crisp, small).
// Non-Latin-1 (Arabic/Cyrillic, and mixed Arabic+English, numerals, symbols) is
// rasterized with the browser's canvas text engine — which performs Arabic
// shaping + BiDi + RTL/LTR — and embedded as a PNG via pdf-lib's existing
// embedPng. No new dependency, and NO text is silently dropped. The annotation
// anchor (a.x, a.y) is the PDF bottom-left BASELINE; it is preserved exactly by
// the vector path and mapped to the image's own baseline by the raster path.
async function notePdfAnnoBurnText(pdfDoc, page, a, font) {
  const text = String(a.text || '');
  if (!text) return;
  const PDFLib = window.PDFLib;
  const rgb = (PDFLib && typeof PDFLib.rgb === 'function') ? PDFLib.rgb : null;
  const color = rgb ? rgb(0, 0, 0) : undefined;
  const size = a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE;
  const latinOnly = /^[\u0000-\u00FF]*$/.test(text);
  if (latinOnly) {
    page.drawText(text, { x: a.x, y: a.y, size, font, color });
    return;
  }
  // --- Arabic / mixed path: rasterize via canvas, then embed as PNG ---------
  const dir = (a && a.dir) || notePdfAnnoDir(text);
  const pad = Math.max(2, Math.ceil(size * 0.4));
  const cssFont = Math.max(10, Math.round(size)) + 'px "Segoe UI", "Noto Naskh Arabic", Tahoma, Arial, sans-serif';
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = cssFont;
  const textW = Math.ceil(measure.measureText(text).width);
  const width = Math.max(1, textW + pad * 2);
  const height = Math.max(1, Math.ceil(size * 1.5) + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.font = cssFont;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = dir === 'rtl' ? 'right' : 'left';
  if (dir === 'rtl') { try { ctx.direction = 'rtl'; } catch (e) { /* unsupported -> BiDi still shapes */ } }
  ctx.fillStyle = '#000000';
  ctx.fillText(text, dir === 'rtl' ? width - pad : pad, height - pad);
  let png;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const b64 = dataUrl.indexOf(',') !== -1 ? dataUrl.split(',')[1] : dataUrl;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    png = await pdfDoc.embedPng(bytes);
  } catch (e) {
    // Lowest-risk fallback: never abort the whole save. Reuse vector drawText
    // (won't shape Arabic, but keeps Latin fragments) or skip this annotation.
    try { page.drawText(text, { x: a.x, y: a.y, size, font, color }); } catch (err) { /* noop */ }
    return;
  }
  // Place the image so its canvas baseline (at `height - pad` from the top)
  // lands exactly on the annotation baseline a.y.
  const top = a.y - (height - pad);
  page.drawImage(png, { x: a.x, y: top, width, height });
}

// Draw every annotation of one page onto a pdf-lib page. Coordinates are
// already PDF user-space (bottom-left origin) from capture time, so no
// screen/zoom/rotation conversion happens here — the values are final.
async function notePdfAnnoBurnPage(pdfDoc, page, annos, font) {
  const { rgb } = window.PDFLib;
  const C = {
    highlight: rgb(1, 0.84, 0), underline: rgb(0.15, 0.39, 0.93),
    strike: rgb(0.86, 0.15, 0.15), rect: rgb(0.05, 0.58, 0.53),
    circle: rgb(0.05, 0.58, 0.53), line: rgb(0.05, 0.58, 0.53), draw: rgb(0.94, 0.27, 0.27), note: rgb(0.98, 0.75, 0.14)
  };
  for (const a of annos) {
    if (!a) continue;
    if (a.type === 'text') {
      const text = String(a.text || '');
      if (!text) continue;
      await notePdfAnnoBurnText(pdfDoc, page, a, font);
      continue;
    }
    if (a.type === 'note') {
      // Paint the amber marker centered on the anchor (bottom-left), then burn
      // the note text directly on top of it (Latin vector / Arabic raster path).
      page.drawSquare({ x: a.x, y: a.y + (a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * 1.4, size: (a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * 1.6, color: C.note });
      if (String(a.text || '').trim()) {
        const tex = Object.assign({}, a, { y: a.y + (a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * 3.2 });
        await notePdfAnnoBurnText(pdfDoc, page, tex, font);
      }
      continue;
    }
    if (a.type === 'draw' && Array.isArray(a.points) && a.points.length > 1) {
      for (let i = 1; i < a.points.length; i++) {
        page.drawLine({ start: { x: a.points[i - 1][0], y: a.points[i - 1][1] }, end: { x: a.points[i][0], y: a.points[i][1] }, thickness: 2, color: C.draw });
      }
      return;
    }
    const x1 = a.x1, y1 = a.y1, x2 = a.x2, y2 = a.y2;
    const nx = Math.min(x1, x2), mx = Math.max(x1, x2), ny = Math.min(y1, y2), my = Math.max(y1, y2);
    if (a.type === 'highlight') {
      page.drawRectangle({ x: nx, y: ny, width: mx - nx, height: my - ny, color: C.highlight, opacity: 0.45 });
    } else if (a.type === 'underline') {
      page.drawLine({ start: { x: nx, y: ny + 1 }, end: { x: mx, y: ny + 1 }, thickness: 2, color: C.underline });
    } else if (a.type === 'strike') {
      page.drawLine({ start: { x: nx, y: (ny + my) / 2 }, end: { x: mx, y: (ny + my) / 2 }, thickness: 2, color: C.strike });
    } else if (a.type === 'line') {
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 2, color: C.line });
    } else if (a.type === 'rect') {
      page.drawRectangle({ x: nx, y: ny, width: mx - nx, height: my - ny, borderColor: C.rect, borderWidth: 1.5 });
    } else if (a.type === 'circle') {
      page.drawEllipse({ x: (nx + mx) / 2, y: (ny + my) / 2, xScale: Math.max(1, (mx - nx) / 2), yScale: Math.max(1, (my - ny) / 2), borderColor: C.circle, borderWidth: 1.5 });
    }
  }
}

// Required Phase-11 coordinator: take the base note PDF blob, load it with the
// existing pdf-lib vendor build, burn ALL annotations (across every page) into
// the real content streams, and re-encode to a final PDF Blob. Latin text uses
// the vector Helvetica font; Arabic/mixed text is rasterized by the browser
// canvas and embedded as PNG (see notePdfAnnoBurnText). No annotations were
// checked by the caller before calling this — callers guard with
// notePdfAnnoHasAny() to preserve the original blob when there is nothing to burn.
async function notePdfAnnoBurnAnnotations(baseBlob) {
  const PDFLib = (typeof smartImportLoadPdfLib === 'function') ? await smartImportLoadPdfLib() : window.PDFLib;
  if (!PDFLib || !PDFLib.PDFDocument) throw new Error('pdf-lib unavailable');
  const bytes = await baseBlob.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const byPage = notePdfAnnoState.byPage || {};
  for (const p in byPage) {
    const idx = parseInt(p, 10) - 1;
    const annos = Array.isArray(byPage[p]) ? byPage[p] : [];
    if (!annos.length || !(idx >= 0 && idx < pages.length)) continue;
    await notePdfAnnoBurnPage(pdfDoc, pages[idx], annos, font);
  }
  return new Blob([await pdfDoc.save()], { type: 'application/pdf' });
}

// Produce the FINAL PDF blob: base blob when no annotations exist (legacy path
// untouched), otherwise base + burn-in applied once via the notePdfAnnoBurnAnnotations
// coordinator. Never mutates the note, the annotation state, or the base blob URL.
async function buildFinalNotePdfBlob(baseBlob) {
  if (!notePdfAnnoHasAny()) return baseBlob; // no annotations -> original PDF unchanged
  return notePdfAnnoBurnAnnotations(baseBlob);
}

// PHASE 11 — one final URL shared by Save / Share / Print. Burn-in runs at
// most once per annotation state: the cache key is the serialized annotation
// set, so any add/move/delete/clear produces a new key (and a fresh burn)
// while zoom/rotate/page changes reuse the cached final blob. With no
// annotations the ORIGINAL base blob URL is returned untouched (legacy path).
async function notePdfFinalPreviewUrl() {
  const st = notePdfPreviewState;
  if (!st.blobUrl) return null;
  const key = notePdfAnnoHasAny() ? JSON.stringify(notePdfAnnoState.byPage || {}) : 'none';
  if (st.finalUrl && st.finalKey === key) return st.finalUrl;
  if (st.finalUrl && st.finalUrl !== st.blobUrl) { try { URL.revokeObjectURL(st.finalUrl); } catch (e) { /* noop */ } }
  if (key === 'none') { st.finalUrl = st.blobUrl; st.finalKey = key; return st.blobUrl; }
  const baseBlob = await (await fetch(st.blobUrl)).blob();
  const finalBlob = await buildFinalNotePdfBlob(baseBlob);
  st.finalUrl = URL.createObjectURL(finalBlob);
  st.finalKey = key;
  return st.finalUrl;
}

function notePdfAnnoActiveTool(tool) {
  notePdfAnnoState.drag = null;
  notePdfAnnoState.drawing = false;
      notePdfAnnoState.tool = (typeof tool === 'string' && /^(edit|text|highlight|draw|underline|strike|rect|circle|line|note)$/.test(tool)) ? tool : 'edit';
  const map = { edit: notePdfAnnoEditBtn, text: notePdfAnnoTextBtn, highlight: notePdfAnnoHighlightBtn, draw: notePdfAnnoDrawBtn, underline: notePdfAnnoUnderlineBtn, strike: notePdfAnnoStrikeBtn, rect: notePdfAnnoRectBtn, circle: notePdfAnnoCircleBtn, line: notePdfAnnoLineBtn, note: notePdfAnnoNoteBtn };
  for (const k in map) {
    const el = map[k];
    if (el) { el.setAttribute('aria-pressed', k === notePdfAnnoState.tool ? 'true' : 'false'); el.classList.toggle('anno-active', k === notePdfAnnoState.tool); }
  }
  if (typeof notePdfAnnoToolBtns !== 'undefined' && notePdfAnnoToolBtns) {
    notePdfAnnoToolBtns.forEach((b) => { if (b) b.classList.toggle('anno-active', b._noteAnnoTool === notePdfAnnoState.tool); });
  }
  hideNotePdfAnnoDeleteChip();
}
// Draw one committed/draft annotation to the overlay canvas (screen CSS-px space).
function notePdfAnnoPaint(ctx, anno) {
  if (anno.type === 'text') return; // text is rendered as HTML boxes
  // Note marker (📝 pin) stays in PDF user-space so it survives zoom/page changes.
  if (anno.type === 'note') {
    const s = notePdfAnnoPointToScreen(anno.x, anno.y);
    const sizePx = Math.max(8, Math.round((anno.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
    const h = sizePx * 2.2;
    ctx.save();
    ctx.fillStyle = NOTE_PDF_ANNO_STROKE.note || '#fbbf24';
    // pin shape: rounded square + small triangle tail
    const r = Math.max(3, sizePx * 0.6);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - h + r);
    ctx.lineTo(s.x, s.y - r);
    ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
    ctx.lineTo(s.x + h - r, s.y);
    ctx.quadraticCurveTo(s.x + h, s.y, s.x + h, s.y - r);
    ctx.lineTo(s.x + h, s.y - h + r);
    ctx.quadraticCurveTo(s.x + h, s.y - h, s.x + h - r, s.y - h);
    ctx.lineTo(s.x + r, s.y - h);
    ctx.quadraticCurveTo(s.x, s.y - h, s.x, s.y - h + r);
    ctx.closePath(); ctx.fill();
    if (notePdfAnnoState.sel === anno) { ctx.setLineDash([3, 3]); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); }
    ctx.restore();
    return;
  }
  const A = (x, y) => notePdfAnnoPointToScreen(x, y);
  const p1 = A(anno.x1, anno.y1), p2 = A(anno.x2, anno.y2);
  if (anno.type === 'draw' && Array.isArray(anno.points)) {
    ctx.save();
    ctx.beginPath();
    anno.points.forEach((pt, i) => { const s = A(pt[0], pt[1]); if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
    ctx.strokeStyle = NOTE_PDF_ANNO_STROKE.draw; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke(); ctx.restore();
    return;
  }
  const color = NOTE_PDF_ANNO_STROKE[anno.type] || '#0d9488';
  const nx = Math.min(p1.x, p2.x), mx = Math.max(p1.x, p2.x), ny = Math.min(p1.y, p2.y), my = Math.max(p1.y, p2.y);
  ctx.save();
  if (anno.type === 'highlight') {
    ctx.fillStyle = color; ctx.fillRect(nx, ny, mx - nx, my - ny);
  } else if (anno.type === 'underline') {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx, my - 1); ctx.lineTo(mx, my - 1); ctx.stroke();
  } else if (anno.type === 'strike') {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(nx, (ny + my) / 2); ctx.lineTo(mx, (ny + my) / 2); ctx.stroke();
  } else if (anno.type === 'line') {
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
  } else if (anno.type === 'rect') {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(nx, ny, mx - nx, my - ny);
  } else if (anno.type === 'circle') {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.ellipse((nx + mx) / 2, (ny + my) / 2, Math.max(1, (mx - nx) / 2), Math.max(1, (my - ny) / 2), 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
// Selection highlight drawn around the active (selected) canvas annotation.
function notePdfAnnoPaintSelection(ctx, anno) {
  const viewport = notePdfPreviewState.viewport;
  if (!viewport || !anno) return;
  const A = (x, y) => notePdfAnnoPointToScreen(x, y);
  ctx.save();
  ctx.setLineDash([4, 3]); ctx.strokeStyle = '#0d9488'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(13,148,136,0.12)';
  if (anno.type === 'note' || anno.type === 'text') {
    const s = A(anno.x, anno.y);
    const sizePx = Math.max(8, Math.round((anno.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
    const w = Math.max(24, (String(anno.text || '').length) * sizePx * 0.55);
    ctx.strokeRect(s.x - 2, s.y - sizePx - 2, w + 4, sizePx + 4);
  } else if (anno.type === 'draw' && Array.isArray(anno.points)) {
    let nx = Infinity, ny = Infinity, mx = -Infinity, my = -Infinity;
    anno.points.forEach((pt) => { const s = A(pt[0], pt[1]); nx = Math.min(nx, s.x); ny = Math.min(ny, s.y); mx = Math.max(mx, s.x); my = Math.max(my, s.y); });
    if (mx > nx && my > ny) { ctx.strokeRect(nx - 2, ny - 2, mx - nx + 4, my - ny + 4); }
  } else {
    const p1 = A(anno.x1, anno.y1), p2 = A(anno.x2, anno.y2);
    const nx = Math.min(p1.x, p2.x), mx = Math.max(p1.x, p2.x), ny = Math.min(p1.y, p2.y), my = Math.max(p1.y, p2.y);
    ctx.strokeRect(nx - 2, ny - 2, mx - nx + 4, my - ny + 4);
  }
  ctx.setLineDash([]); ctx.restore();
}
// Point-in-annotation test done in SCREEN space (robust for boxes drawn above
// the baseline, dashes, thin lines). `pt` is in PDF user-space from the event.
function notePdfAnnoHitTest(pt) {
  const viewport = notePdfPreviewState.viewport;
  if (!viewport || !notePdfAnnoLayer) return null;
  
  const sp = notePdfAnnoPointToScreen(pt.x, pt.y);
  const cx = sp.x, cy = sp.y;
  const list = notePdfAnnoList();
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (!a) continue;
    let box = null;
    if (a.type === 'note' || a.type === 'text') {
      const s = notePdfAnnoPointToScreen(a.x, a.y);
      const sizePx = Math.max(8, Math.round((a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
      const w = Math.max(24, (String(a.text || '').length) * sizePx * 0.6);
      box = { x: s.x, y: s.y - sizePx, w: w, h: sizePx + 2 };
    } else if (a.type === 'draw' && Array.isArray(a.points)) {
      let nx = Infinity, ny = Infinity, mx = -Infinity, my = -Infinity;
      a.points.forEach((p) => { const s = notePdfAnnoPointToScreen(p[0], p[1]); nx = Math.min(nx, s.x); ny = Math.min(ny, s.y); mx = Math.max(mx, s.x); my = Math.max(my, s.y); });
      box = { x: nx - 4, y: ny - 4, w: (mx - nx) + 8, h: (my - ny) + 8 };
    } else {
      const p1 = notePdfAnnoPointToScreen(a.x1, a.y1), p2 = notePdfAnnoPointToScreen(a.x2, a.y2);
      box = { x: Math.min(p1.x, p2.x) - 4, y: Math.min(p1.y, p2.y) - 4, w: Math.abs(p2.x - p1.x) + 8, h: Math.abs(p2.y - p1.y) + 8 };
    }
    if (box && cx >= box.x && cx <= box.x + box.w && cy >= box.y && cy <= box.y + box.h) return a;
  }
  return null;
}
// Begin / step / end a move of `anno` under the edit tool (canvas annotations + notes).
function notePdfAnnoBeginMove(e, anno) {
  notePdfAnnoState.sel = anno;
  notePdfAnnoState.move = { anno, anchor: { x: anno.x, y: anno.y, x2: anno.x2, y2: anno.y2 }, start: notePdfAnnoPointFromEvent(e) };
  try { notePdfAnnoLayer.setPointerCapture(e.pointerId); } catch (err) { /* optional */ }
  updateNotePdfAnnoDeleteChip();
}
function notePdfAnnoStepMove(e) {
  const m = notePdfAnnoState.move;
  if (!m) return;
  const cur = notePdfAnnoPointFromEvent(e);
  const dx = cur.x - m.start.x, dy = cur.y - m.start.y;
  const a = m.anno;
  if (a.type === 'draw' && Array.isArray(a.points)) {
    a.points.forEach((pt) => { pt[0] += dx; pt[1] += dy; });
  } else if (a.type === 'note' || a.type === 'text') {
    a.x = m.anchor.x + dx; a.y = m.anchor.y + dy;
  } else if (a.type === 'line') {
    a.x1 = m.anchor.x + dx; a.y1 = m.anchor.y + dy; a.x2 = m.anchor.x2 + dx; a.y2 = m.anchor.y2 + dy;
  } else {
    a.x1 = m.anchor.x + dx; a.y1 = m.anchor.y + dy; a.x2 = m.anchor.x2 + dx; a.y2 = m.anchor.y2 + dy;
  }
  renderNotePdfAnnotations();
}
function notePdfAnnoEndMove(e) {
  if (!notePdfAnnoState.move) return;
  notePdfAnnoState.move = null;
  try { if (notePdfAnnoLayer.hasPointerCapture(e.pointerId)) notePdfAnnoLayer.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
  renderNotePdfAnnotations();
}
// Position the individual-delete chip on the selected annotation (or hide it).
function updateNotePdfAnnoDeleteChip() {
  if (!notePdfAnnoDeleteChip) return;
  const anno = notePdfAnnoState.sel;
  if (!anno || !notePdfPreviewState.viewport || !notePdfAnnoLayer) { hideNotePdfAnnoDeleteChip(); return; }
  const A = (x, y) => notePdfAnnoPointToScreen(x, y);
  let box;
  if (anno.type === 'note' || anno.type === 'text') {
    const s = A(anno.x, anno.y);
    const sizePx = Math.max(8, Math.round((anno.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
    const w = Math.max(24, (String(anno.text || '').length) * sizePx * 0.55);
    box = { x: s.x, y: s.y - sizePx - 2, w: w, h: sizePx + 4 };
  } else if (anno.type === 'draw' && Array.isArray(anno.points)) {
    let nx = Infinity, ny = Infinity, mx = -Infinity, my = -Infinity;
    anno.points.forEach((pt) => { const s = A(pt[0], pt[1]); nx = Math.min(nx, s.x); ny = Math.min(ny, s.y); mx = Math.max(mx, s.x); my = Math.max(my, s.y); });
    box = { x: nx, y: ny, w: mx - nx, h: my - ny };
  } else {
    const p1 = A(anno.x1, anno.y1), p2 = A(anno.x2, anno.y2);
    const nx = Math.min(p1.x, p2.x), mx = Math.max(p1.x, p2.x), ny = Math.min(p1.y, p2.y), my = Math.max(p1.y, p2.y);
    box = { x: nx, y: ny, w: mx - nx, h: my - ny };
  }
  notePdfAnnoDeleteChip.style.left = (box.x + box.w - 10) + 'px';
  notePdfAnnoDeleteChip.style.top = (box.y - 10) + 'px';
  notePdfAnnoDeleteChip.hidden = false;
}
function hideNotePdfAnnoDeleteChip() {
  if (notePdfAnnoDeleteChip) notePdfAnnoDeleteChip.hidden = true;
  notePdfAnnoState.sel = null;
}
// Delete the currently selected annotation (current page only). Invalidates the
// cached final burned blob so Save/Share/Print can never ship stale annotations.
function notePdfAnnoDeleteSelected() {
  const sel = notePdfAnnoState.sel;
  if (!sel) return;
  const p = notePdfPreviewState.page || 1;
  const list = notePdfAnnoState.byPage[p];
  if (Array.isArray(list)) notePdfAnnoState.byPage[p] = list.filter((x) => x !== sel);
  notePdfAnnoState.sel = null;
  if (notePdfPreviewState.finalUrl && notePdfPreviewState.finalUrl !== notePdfPreviewState.blobUrl) {
    try { URL.revokeObjectURL(notePdfPreviewState.finalUrl); } catch (e) { /* noop */ }
  }
  notePdfPreviewState.finalUrl = null;
  notePdfPreviewState.finalKey = null;
  updateNotePdfAnnoDeleteChip();
  renderNotePdfAnnotations();
}

// Size/place the overlay over the rendered page canvas, repaint committed +
// drag annotations, and rebuild the editable text boxes for the current page.
function renderNotePdfAnnotations() {
  if (!notePdfAnnoCanvas || !notePdfPreviewCanvas || !notePdfAnnoLayer || !notePdfAnnoTextBoxes) return;
  const viewport = notePdfPreviewState.viewport;
  const stage = notePdfPreviewStage, pageCanvas = notePdfPreviewCanvas;
  if (!viewport || !stage || !pageCanvas) return;
  const cRect = pageCanvas.getBoundingClientRect();
  const sRect = stage.getBoundingClientRect();
  notePdfAnnoLayer.style.left = (cRect.left - sRect.left) + 'px';
  notePdfAnnoLayer.style.top = (cRect.top - sRect.top) + 'px';
  // Size the overlay to the DISPLAYED page (the canvas may be capped by the
  // stage max-width on zoom-in / small screens). Coordinates are scaled to the
  // displayed size via notePdfAnnoPointToScreen so annotations never drift.
  const dw = Math.max(1, Math.floor(cRect.width)), dh = Math.max(1, Math.floor(cRect.height));
  notePdfAnnoLayer.style.width = dw + 'px';
  notePdfAnnoLayer.style.height = dh + 'px';
  const dpr = window.devicePixelRatio || 1;
  const ctx = notePdfAnnoCanvas.getContext('2d');
  notePdfAnnoCanvas.width = Math.floor(dw * dpr);
  notePdfAnnoCanvas.height = Math.floor(dh * dpr);
  notePdfAnnoCanvas.style.width = dw + 'px';
  notePdfAnnoCanvas.style.height = dh + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, dw, dh);
  const visible = notePdfAnnoList();
  const preview = (notePdfAnnoState.drag && notePdfAnnoState.drawing) ? [notePdfAnnoState.drag] : [];
  preview.forEach((a) => notePdfAnnoPaint(ctx, a));
  visible.forEach((a) => notePdfAnnoPaint(ctx, a));
  if (notePdfAnnoState.sel && visible.indexOf(notePdfAnnoState.sel) !== -1) notePdfAnnoPaintSelection(ctx, notePdfAnnoState.sel);
  // Rebuild text boxes (contenteditable HTML overlays).
  // PHASE — edit-mode fix: preserve typing focus across rebuilds. A background
  // re-render (trailing rAF/resize) rebuilds these boxes while the user is
  // typing; replacing the focused element silently drops focus (no blur event
  // fires on removal) and the user's keystrokes would go nowhere. Remember the
  // focused box's annotation index and restore focus to it after the rebuild.
  const focusedBox = document.activeElement;
  const refocusIdx = (focusedBox && focusedBox.classList && focusedBox.classList.contains('note-pdf-anno-textbox'))
    ? parseInt(focusedBox.getAttribute('data-anno-idx'), 10) : -1;
  notePdfAnnoTextBoxes.innerHTML = '';
  visible.filter((a) => a.type === 'text' || a.type === 'note').forEach((a, annoIdx) => {
    const box = document.createElement('div');
    box.className = 'note-pdf-anno-textbox' + (a.type === 'note' ? ' note-pdf-anno-notebox' : '');
    box.setAttribute('data-anno-idx', String(annoIdx));
    const s = notePdfAnnoPointToScreen(a.x, a.y);
    const sizePx = Math.max(8, Math.round((a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
    box.style.left = Math.floor(s.x) + 'px';
    box.style.top = (Math.floor(s.y) - sizePx) + 'px'; // anchor is baseline bottom-left
    box.style.fontSize = sizePx + 'px';
    box.dir = a.dir || notePdfAnnoDir(a.text);
    box.contentEditable = 'true';
    box.spellcheck = false;
    box.textContent = a.text || '';
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); box.blur(); } });
    box.addEventListener('input', () => {
      a.text = box.textContent || '';
      // Keep the annotation direction in sync with the (mixed) typed content so
      // Arabic text renders/shapes correctly and Latin stays LTR.
      const d = notePdfAnnoDir(a.text);
      if (a.dir !== d) { a.dir = d; box.dir = d; }
    });
    box.addEventListener('blur', () => {
      if (!(a.text || '').trim()) {
        notePdfAnnoState.byPage[notePdfPreviewState.page || 1] = visible.filter((x) => x !== a);
      }
      renderNotePdfAnnotations();
    });
    // Drag-move the box (pointer events => mouse + touch). Anchor stays fixed
    // for the whole drag so delta is from the drag start, never accumulates.
    box.addEventListener('pointerdown', (e) => {
      if (notePdfAnnoState.tool === 'draw' || notePdfAnnoState.drawing || notePdfAnnoState.tool === 'edit') { notePdfAnnoState.sel = a; updateNotePdfAnnoDeleteChip(); if (notePdfAnnoState.tool === 'edit') return; }
      e.preventDefault();
      e.stopPropagation();
      const start = notePdfAnnoPointFromEvent(e);
      const anchor = { x: a.x, y: a.y };
      box.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const cur = notePdfAnnoPointFromEvent(ev);
        a.x = anchor.x + (cur.x - start.x);
        a.y = anchor.y + (cur.y - start.y);
        notePdfAnnoPaintBoxOnly(box, a);
      };
      const end = () => { box.removeEventListener('pointermove', move); box.removeEventListener('pointerup', end); box.removeEventListener('pointercancel', end); };
      box.addEventListener('pointermove', move);
      box.addEventListener('pointerup', end);
      box.addEventListener('pointercancel', end);
    });
    notePdfAnnoTextBoxes.appendChild(box);
  });
  // Restore typing focus to the same annotation's box after the rebuild.
  if (refocusIdx >= 0) {
    const bs = notePdfAnnoTextBoxes.querySelectorAll('.note-pdf-anno-textbox');
    const target = (refocusIdx < bs.length) ? bs[refocusIdx] : (bs.length ? bs[bs.length - 1] : null);
    if (target) { try { target.focus(); } catch (e) { /* focus is best-effort */ } }
  }
  updateNotePdfAnnoDeleteChip();
}
// Reposition one text box without a full rebuild (used while drag-moving).
function notePdfAnnoPaintBoxOnly(box, a) {
  const viewport = notePdfPreviewState.viewport;
  if (!viewport || !box) return;
  const s = notePdfAnnoPointToScreen(a.x, a.y);
  const sizePx = Math.max(8, Math.round((a.fontSize || NOTE_PDF_ANNO_DEFAULT_SIZE) * notePdfAnnoFontScale()));
  box.style.left = Math.floor(s.x) + 'px';
  box.style.top = (Math.floor(s.y) - sizePx) + 'px';
}

function notePdfAnnoOnPointerDown(e) {
  const tool = notePdfAnnoState.tool;
  if (tool === 'text') {
    // PHASE — edit-mode fix: the box is created and focused here during
    // pointerdown, but the browser's DEFAULT mousedown then blurs it (focus
    // falls back to body) and the blur handler instantly deletes the empty
    // annotation — so a text box could never survive a click. Preventing the
    // default keeps focus on the new box so the user can actually type.
    e.preventDefault();
    const pt = notePdfAnnoPointFromEvent(e);
    notePdfAnnoList().push({ type: 'text', x: pt.x, y: pt.y, fontSize: NOTE_PDF_ANNO_DEFAULT_SIZE, text: '', dir: 'ltr' });
    renderNotePdfAnnotations();
    const boxes = notePdfAnnoTextBoxes && notePdfAnnoTextBoxes.querySelectorAll('.note-pdf-anno-textbox');
    if (boxes && boxes.length) boxes[boxes.length - 1].focus();
    // Deferred re-focus: whatever consumed focus after the pointer handler
    // (suppressed default handling / overlay rebuild) settles first, the new
    // box must end up focused or the user cannot type into it.
    setTimeout(() => {
      try {
        const bs = notePdfAnnoTextBoxes.querySelectorAll('.note-pdf-anno-textbox');
        if (bs.length) bs[bs.length - 1].focus();
      } catch (e2) { /* focus is best-effort */ }
    }, 0);
    return;
  }
  if (tool === 'note') {
    e.preventDefault(); e.stopPropagation();
    const pt = notePdfAnnoPointFromEvent(e);
    notePdfAnnoList().push({ type: 'note', x: pt.x, y: pt.y, fontSize: NOTE_PDF_ANNO_DEFAULT_SIZE, text: '', dir: 'ltr' });
    renderNotePdfAnnotations();
    const boxes = notePdfAnnoTextBoxes && notePdfAnnoTextBoxes.querySelectorAll('.note-pdf-anno-textbox');
    if (boxes && boxes.length) { try { boxes[boxes.length - 1].focus(); } catch (e2) { /* best-effort */ } }
    return;
  }
  if (tool === 'edit') {
    e.preventDefault(); e.stopPropagation();
    const pt = notePdfAnnoPointFromEvent(e);
    const hit = notePdfAnnoHitTest(pt);
    if (hit) notePdfAnnoBeginMove(e, hit); else { notePdfAnnoState.sel = null; updateNotePdfAnnoDeleteChip(); }
    return;
  }
  if (NOTE_PDF_ANNO_DRAW_TOOLS.indexOf(tool) === -1) return;
  const pt = notePdfAnnoPointFromEvent(e);
  notePdfAnnoState.drawing = true;
  notePdfAnnoState.drag = tool === 'draw'
    ? { type: 'draw', points: [[pt.x, pt.y]] }
    : { type: tool, x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y };
  try { notePdfAnnoLayer.setPointerCapture(e.pointerId); } catch (err) { /* capture optional */ }
  renderNotePdfAnnotations();
}

function notePdfAnnoOnPointerMove(e) {
  if (notePdfAnnoState.move) { notePdfAnnoStepMove(e); return; }
  if (!notePdfAnnoState.drawing || !notePdfAnnoState.drag) return;
  const pt = notePdfAnnoPointFromEvent(e);
  const d = notePdfAnnoState.drag;
  if (d.type === 'draw') d.points.push([pt.x, pt.y]);
  else { d.x2 = pt.x; d.y2 = pt.y; }
  renderNotePdfAnnotations();
}

function notePdfAnnoOnPointerUp(e) {
  if (notePdfAnnoState.move) { notePdfAnnoEndMove(e); return; }
  if (!notePdfAnnoState.drawing || !notePdfAnnoState.drag) return;
  notePdfAnnoState.drawing = false;
  const d = notePdfAnnoState.drag;
  notePdfAnnoState.drag = null;
  try { if (notePdfAnnoLayer.hasPointerCapture(e.pointerId)) notePdfAnnoLayer.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
  if (d.type === 'draw') {
    if (d.points.length > 1) notePdfAnnoList().push(d);
  } else {
    const x1 = Math.min(d.x1, d.x2), x2 = Math.max(d.x1, d.x2), y1 = Math.min(d.y1, d.y2), y2 = Math.max(d.y1, d.y2);
    if (x2 - x1 > 1 || y2 - y1 > 1) {
      const anno = { type: d.type };
      if (d.type === 'line') { anno.x1 = d.x1; anno.y1 = d.y1; anno.x2 = d.x2; anno.y2 = d.y2; }
      else { anno.x1 = x1; anno.y1 = y1; anno.x2 = x2; anno.y2 = y2; }
      notePdfAnnoList().push(anno);
    }
  }
  renderNotePdfAnnotations();
}

// Clear only the current page's annotations (from the More menu).
function clearNotePdfAnnotations() {
  notePdfAnnoState.byPage[notePdfPreviewState.page || 1] = [];
  // Invalidate the cached final (burned) blob so a stale PDF containing the
  // just-removed annotations can never be produced by Save/Share/Print.
  if (notePdfPreviewState.finalUrl && notePdfPreviewState.finalUrl !== notePdfPreviewState.blobUrl) {
    try { URL.revokeObjectURL(notePdfPreviewState.finalUrl); } catch (e) { /* noop */ }
  }
  notePdfPreviewState.finalUrl = null;
  notePdfPreviewState.finalKey = null;
  renderNotePdfAnnotations();
}

// Full reset on close: frees state (never persisted anywhere).
function resetNotePdfAnnotations() {
  notePdfAnnoState.byPage = {};
  notePdfAnnoState.drag = null;
  notePdfAnnoState.drawing = false;
     notePdfAnnoState.tool = 'edit';
   notePdfAnnoState.sel = null;
   if (notePdfAnnoCanvas && notePdfAnnoCanvas.getContext) notePdfAnnoCanvas.getContext('2d').clearRect(0, 0, notePdfAnnoCanvas.width, notePdfAnnoCanvas.height);
   if (notePdfAnnoTextBoxes) notePdfAnnoTextBoxes.innerHTML = '';
   hideNotePdfAnnoDeleteChip();
   const map = { edit: notePdfAnnoEditBtn, text: notePdfAnnoTextBtn, highlight: notePdfAnnoHighlightBtn, draw: notePdfAnnoDrawBtn, underline: notePdfAnnoUnderlineBtn, strike: notePdfAnnoStrikeBtn, rect: notePdfAnnoRectBtn, circle: notePdfAnnoCircleBtn, line: notePdfAnnoLineBtn, note: notePdfAnnoNoteBtn };
  for (const k in map) {
    const el = map[k];
    if (el) { el.setAttribute('aria-pressed', k === 'edit' ? 'true' : 'false'); el.classList.toggle('anno-active', k === 'edit'); }
  }
}

// ============================================================================
// PHASE 09 — PDF document options controls (template/header/footer/watermark)
// Session-only presentation settings for Notes → PDF. Changing a control only
// updates notePdfDocOptions (read by buildNotePdfHtml) and regenerates the
// preview blob via the existing pipeline — it never touches note data.
// ============================================================================
function syncNotePdfDocControls() {
  if (!notePdfDocTemplate) return;
  notePdfDocTemplate.value = (NOTE_PDF_TPL_NAMES.indexOf(notePdfDocOptions.template) !== -1) ? notePdfDocOptions.template : 'report';
  if (notePdfDocHeader) notePdfDocHeader.checked = notePdfDocOptions.header !== false;
  if (notePdfDocFooter) notePdfDocFooter.checked = notePdfDocOptions.footer !== false;
  if (notePdfDocWmOn) notePdfDocWmOn.checked = !!(notePdfDocOptions.watermark && notePdfDocOptions.watermark.on);
  if (notePdfDocWmText) notePdfDocWmText.value = (notePdfDocOptions.watermark && notePdfDocOptions.watermark.text) ? notePdfDocOptions.watermark.text : '';
}

function refreshNotePdfPreviewDocOptions() {
  if (!notePdfDocTemplate) return;
  notePdfDocOptions.template = notePdfDocTemplate.value;
  notePdfDocOptions.header = !!(notePdfDocHeader && notePdfDocHeader.checked);
  notePdfDocOptions.footer = !!(notePdfDocFooter && notePdfDocFooter.checked);
  notePdfDocOptions.watermark.on = !!(notePdfDocWmOn && notePdfDocWmOn.checked);
  notePdfDocOptions.watermark.text = (notePdfDocWmText && notePdfDocWmText.value) ? String(notePdfDocWmText.value) : '';
  // Regenerate the preview with the updated presentation (existing pipeline).
  openNotePdfPreview();
}

function toggleNotePdfDocOptions() {
  if (!notePdfDocOptionsEl) return;
  const show = notePdfDocOptionsEl.hidden;
  notePdfDocOptionsEl.hidden = !show;
  if (notePdfDocToggleBtn) notePdfDocToggleBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
}

function hideNotePdfDocOptions() {
  if (notePdfDocOptionsEl) notePdfDocOptionsEl.hidden = true;
  if (notePdfDocToggleBtn) notePdfDocToggleBtn.setAttribute('aria-expanded', 'false');
}

// ============================================================================
// Native print path for Notes → PDF (primary). Presents the note as a dedicated
// print surface (an off-screen iframe containing ONLY the note HTML built by
// buildNotePdfHtml — same data model, same formatting rules, same RTL/LTR logic,
// no duplication) and invokes the browser's native print dialog, where the user
// saves as PDF. Browser pagination handles arbitrarily long notes (1000+ A4
// pages) with memory usage proportional to the live document — NOT the raster
// size of every page — so this path never builds one giant full-note canvas.
// Falls back to the existing buildNotePdfBlob pipeline (bounded chunked canvas
// renderer) when the print surface cannot be opened (e.g., contentWindow
// unavailable), so the proven export still works on every platform.
// ============================================================================
// ============================================================================
// PHASE — MOBILE NOTES → PDF PRINT ISOLATION FIX.
// Root cause (audited): on iOS Safari and several Android WebKit builds,
// printing from an off-screen iframe (contentWindow.print()) does NOT print
// the iframe document — the engine prints the TOP document instead. Result:
// the calculator shell (display / keypad / feature nav / header) leaks into
// the saved PDF, the note inherits the app's muted colours and opacity
// (washed-out text) and the iframe's @page A4 rule never applies.
// Fix: on mobile, print through the TOP document itself using a dedicated,
// fully isolated print surface (#eq-print-surface): every app shell element
// is display:none in @media print, only the note surface is printed, with the
// note's own @page { size:A4; margin:16pt } reused verbatim and text forced
// opaque near-black. Desktop keeps the proven iframe path unchanged, and the
// chunked-canvas buildNotePdfBlob fallback stays fully intact.
// ============================================================================
function isMobilePrintUserAgent() {
  try {
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod|IEMobile|BlackBerry|Opera Mini|Mobile\b/i.test(ua);
  } catch (e) { return false; }
}

// Extract the <style> body and <body> content from the self-contained note
// document produced by buildNotePdfHtml (same source of truth as the iframe
// path — no second renderer, no duplicated logic).
function eqExtractNotePrintParts(html) {
  const styleMatch = /<style>([\s\S]*?)<\/style>/i.exec(html);
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const dirMatch = /<html[^>]*\sdir=["']([^"']+)["']/i.exec(html);
  return {
    style: styleMatch ? styleMatch[1] : '',
    body: bodyMatch ? bodyMatch[1] : '',
    dir: dirMatch ? dirMatch[1] : ''
  };
}

const EQ_PRINT_SURFACE_ID = 'eq-print-surface';
// Isolation rules appended to the note's own print CSS. Scoped strictly to
// #eq-print-surface — the Notes editor, calculator and every other feature
// keep their exact screen styling.
const EQ_PRINT_ISOLATION_CSS = [
  '@media print {',
  '  html, body { background:#ffffff !important; margin:0 !important; padding:0 !important; overflow:visible !important; width:auto !important; }',
  '  body > *:not(#' + EQ_PRINT_SURFACE_ID + ') { display:none !important; }',
  '  #' + EQ_PRINT_SURFACE_ID + ' { display:block !important; position:static !important; left:auto !important; top:auto !important; width:auto !important; height:auto !important; margin:0 !important; padding:0 !important; overflow:visible !important; opacity:1 !important; filter:none !important; visibility:visible !important; mix-blend-mode:normal !important; background:#ffffff !important; }',
  '  #' + EQ_PRINT_SURFACE_ID + ' * { opacity:1 !important; filter:none !important; mix-blend-mode:normal !important; visibility:visible !important; }',
  '  #' + EQ_PRINT_SURFACE_ID + ' .eq-note-report { color:#000000 !important; background:#ffffff !important; width:100% !important; min-height:0 !important; }',
  '  #' + EQ_PRINT_SURFACE_ID + ' .eq-note-header, #' + EQ_PRINT_SURFACE_ID + ' .eq-note-title, #' + EQ_PRINT_SURFACE_ID + ' .eq-note-body { color:#000000 !important; }',
  '  #' + EQ_PRINT_SURFACE_ID + ' .eq-pdf-text-block { color:#000000 !important; }',
  '}',
  '@media screen {',
  '  #' + EQ_PRINT_SURFACE_ID + ' { position:fixed; left:-9999px; top:0; width:794px; height:0; overflow:hidden; border:0; pointer-events:none; opacity:0; }',
  '}'
].join('\n');

function tryInDocumentPrintNote(note) {
  let surface = null;
  let cleaned = false;
  const cleanup = function () {
    if (cleaned) return;
    cleaned = true;
    if (surface && surface.parentNode) {
      try { surface.parentNode.removeChild(surface); } catch (e) {}
    }
    surface = null;
  };
  try {
    const parts = eqExtractNotePrintParts(buildNotePdfHtml(note));
    if (!parts.body) return false;
    // Remove any stale surface from a previous attempt.
    const stale = document.getElementById(EQ_PRINT_SURFACE_ID);
    if (stale && stale.parentNode) { try { stale.parentNode.removeChild(stale); } catch (e0) {} }
    surface = document.createElement('div');
    surface.id = EQ_PRINT_SURFACE_ID;
    surface.setAttribute('aria-hidden', 'true');
    if (parts.dir) surface.setAttribute('dir', parts.dir);
    const styleEl = document.createElement('style');
    styleEl.id = 'eq-print-surface-style';
    styleEl.textContent = parts.style + '\n' + EQ_PRINT_ISOLATION_CSS;
    surface.appendChild(styleEl);
    // parts.body comes from buildNotePdfHtml where every dynamic value is
    // escapeHtml-ed before interpolation — safe to parse as markup here.
    const wrap = document.createElement('div');
    wrap.innerHTML = parts.body;
    while (wrap.firstChild) surface.appendChild(wrap.firstChild);
    // Mark the report root so the note document's own @media print pagination
    // rules (.eq-note-report.note-print-area) apply, exactly like the iframe.
    const report = surface.querySelector('#note-report');
    if (report) report.classList.add('note-print-area');
    document.body.appendChild(surface);
    let printed = false;
    const doPrint = function () {
      if (printed) return;
      printed = true;
      try { window.addEventListener('afterprint', cleanup); } catch (e1) {}
      try { window.print(); } catch (e) { /* fall through to chunked-canvas path */ }
      // Safety net: always tear the surface down after the print cycle.
      setTimeout(cleanup, 60000);
    };
    setTimeout(doPrint, 120);
    return true;
  } catch (e) {
    cleanup();
    return false;
  }
}

function tryNativePrintNote(note) {
  if (typeof window.print !== 'function') return false;
  if (!note) return false;
  // Mobile: iframe print() prints the top document on iOS/Android WebKit, so
  // route through the isolated in-document surface instead (see block above).
  if (isMobilePrintUserAgent() && tryInDocumentPrintNote(note)) return true;
  const html = buildNotePdfHtml(note);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;pointer-events:none;';
  document.body.appendChild(frame);
  const w = frame.contentWindow;
  if (!w) { try { document.body.removeChild(frame); } catch (e) {} return false; }
  const doc = w.document;
  if (!doc) { try { document.body.removeChild(frame); } catch (e) {} return false; }
  doc.open();
  doc.write(html);
  doc.close();
  let initiated = false;
  const doPrint = function () {
    if (initiated) return;
    initiated = true;
    try { w.focus(); } catch (e) {}
    w.print();
  };
  w.onload = function () { setTimeout(doPrint, 50); };
  if (doc.readyState === 'complete') {
    setTimeout(doPrint, 50);
  } else {
    setTimeout(doPrint, 200);
  }
  w.onafterprint = function () {
    try { document.body.removeChild(frame); } catch (e) {}
  };
  return true;
}

// ============================================================================
// INSTANT EXPORT — perform the actual Note → PDF export. Direct pipeline:
// Note → buildNotePdfBlob (existing, cached) → Native Share Sheet → fallback
// download. NO print step: window.print() / print surfaces are never used on
// this path (Print Preview must not appear). AbortError/NotAllowedError from
// the Share Sheet restore state only — no download, no error, no re-generate.
// One PDF generation per tap; the same cached blob is shared, never rebuilt.
// Called directly by the header PDF button: one click, no setup dialog.
// ============================================================================
async function performNotePdfExport() {
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  if (!note) {
    showToast('No note open');
    return;
  }
  // Flush any live edits so the exported PDF reflects the note on screen.
  // (The flush lives in the click-handler wiring — see initNotePdf* section —
  // so the export function itself stays free of note mutations.)
  let blob;
  try {
    blob = await buildNotePdfBlob(note);
  } catch (err) {
    if (err && err.message === 'no-internet') showInternetRequiredToast();
    else showToast('PDF generation failed: ' + (err.message || err));
    return;
  }
  if (!blob || blob.type !== 'application/pdf') {
    showToast('PDF generation failed: invalid PDF');
    return;
  }
  const exportTitle = (note.title && String(note.title).trim()) || (t.untitled || 'Untitled');
  const filename = notePdfFilename(exportTitle);
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({ files: [pdfFile], title: exportTitle, text: t.shareMessage || 'Exported from EQ7 Calculator' });
      return;
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.style.position = 'fixed'; a.style.left = '-9999px'; a.style.top = '-9999px';
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// Wire the preview workspace. Called from initialize with the other Notes
// Wire the preview workspace. Called from initialize with the other Notes
// handlers; every control guards its element so the module is inert if the
// markup is ever absent.
function initNotePdfPreviewControls() {
  if (notePreviewPdfBtn) {
    notePreviewPdfBtn.addEventListener('click', () => { openNotePdfPreview(); });
  }
  if (notePdfPreviewClose) notePdfPreviewClose.addEventListener('click', closeNotePdfPreview);
  if (notePdfPreviewModal) {
    notePdfPreviewModal.addEventListener('click', (e) => { if (e.target === notePdfPreviewModal) closeNotePdfPreview(); });
  }
  if (notePdfPrevPageBtn) notePdfPrevPageBtn.addEventListener('click', () => goToNotePdfPreviewPage(notePdfPreviewState.page - 1));
  if (notePdfNextPageBtn) notePdfNextPageBtn.addEventListener('click', () => goToNotePdfPreviewPage(notePdfPreviewState.page + 1));
  if (notePdfZoomInBtn) notePdfZoomInBtn.addEventListener('click', () => adjustNotePdfPreviewZoom(0.25));
  if (notePdfZoomOutBtn) notePdfZoomOutBtn.addEventListener('click', () => adjustNotePdfPreviewZoom(-0.25));
  if (notePdfZoomFitBtn) notePdfZoomFitBtn.addEventListener('click', resetNotePdfPreviewZoom);
  if (notePdfRotateBtn) notePdfRotateBtn.addEventListener('click', rotateNotePdfPreview);
  if (notePdfPreviewShare) notePdfPreviewShare.addEventListener('click', shareNotePdfPreview);
  // PHASE 07: basic toolbar — More menu, Save, Print. Menu items delegate to
  // the SAME handlers as the inline controls (no duplicate logic).
  if (notePdfPreviewMoreBtn) notePdfPreviewMoreBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotePdfMoreMenu(); });
  if (notePdfMoreMenu) {
    notePdfMoreMenu.addEventListener('click', (e) => {
      const item = e.target.closest('[data-note-pdf-more-action]');
      if (!item) return;
      hideNotePdfMoreMenu();
      const action = item.getAttribute('data-note-pdf-more-action');
      if (action === 'prev') goToNotePdfPreviewPage(notePdfPreviewState.page - 1);
      else if (action === 'next') goToNotePdfPreviewPage(notePdfPreviewState.page + 1);
      else if (action === 'zoom-in') adjustNotePdfPreviewZoom(0.25);
      else if (action === 'zoom-out') adjustNotePdfPreviewZoom(-0.25);
      else if (action === 'fit') resetNotePdfPreviewZoom();
      else if (action === 'rotate') rotateNotePdfPreview();
      else if (action === 'save') saveNotePdfPreview();
      else if (action === 'print') printNotePdfPreview();
      else if (action === 'anno-underline') notePdfAnnoActiveTool('underline');
      else if (action === 'anno-strike') notePdfAnnoActiveTool('strike');
      else if (action === 'anno-rect') notePdfAnnoActiveTool('rect');
      else if (action === 'anno-circle') notePdfAnnoActiveTool('circle');
      else if (action === 'anno-line') notePdfAnnoActiveTool('line');
      else if (action === 'anno-note') notePdfAnnoActiveTool('note');
      else if (action === 'anno-clear') clearNotePdfAnnotations();
    });
  }
  if (notePdfSaveBtn) notePdfSaveBtn.addEventListener('click', saveNotePdfPreview);
  if (notePdfPrintBtn) notePdfPrintBtn.addEventListener('click', printNotePdfPreview);
  // PHASE 08: annotation tools (inline + pointer drawing on the overlay layer).
  if (notePdfAnnoEditBtn) notePdfAnnoEditBtn.addEventListener('click', () => notePdfAnnoActiveTool('edit'));
  if (notePdfAnnoTextBtn) notePdfAnnoTextBtn.addEventListener('click', () => notePdfAnnoActiveTool('text'));
  if (notePdfAnnoHighlightBtn) notePdfAnnoHighlightBtn.addEventListener('click', () => notePdfAnnoActiveTool('highlight'));
  if (notePdfAnnoDrawBtn) notePdfAnnoDrawBtn.addEventListener('click', () => notePdfAnnoActiveTool('draw'));
  // PHASE 07: inline secondary annotation tools.
  if (notePdfAnnoUnderlineBtn) notePdfAnnoUnderlineBtn.addEventListener('click', () => notePdfAnnoActiveTool('underline'));
  if (notePdfAnnoStrikeBtn) notePdfAnnoStrikeBtn.addEventListener('click', () => notePdfAnnoActiveTool('strike'));
  if (notePdfAnnoRectBtn) notePdfAnnoRectBtn.addEventListener('click', () => notePdfAnnoActiveTool('rect'));
  if (notePdfAnnoCircleBtn) notePdfAnnoCircleBtn.addEventListener('click', () => notePdfAnnoActiveTool('circle'));
  if (notePdfAnnoLineBtn) notePdfAnnoLineBtn.addEventListener('click', () => notePdfAnnoActiveTool('line'));
  if (notePdfAnnoNoteBtn) notePdfAnnoNoteBtn.addEventListener('click', () => notePdfAnnoActiveTool('note'));
  // Delete of the selected annotation via the chip or Delete/Backspace key.
  if (notePdfAnnoDeleteChip) notePdfAnnoDeleteChip.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); notePdfAnnoDeleteSelected(); });
  if (notePdfPreviewModal) {
    notePdfPreviewModal.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && notePdfAnnoState.sel) { e.preventDefault(); notePdfAnnoDeleteSelected(); }
    });
  }
  if (notePdfAnnoLayer) {
    notePdfAnnoLayer.addEventListener('pointerdown', notePdfAnnoOnPointerDown);
    notePdfAnnoLayer.addEventListener('pointermove', notePdfAnnoOnPointerMove);
    notePdfAnnoLayer.addEventListener('pointerup', notePdfAnnoOnPointerUp);
    notePdfAnnoLayer.addEventListener('pointercancel', notePdfAnnoOnPointerUp);
  }
  // PHASE 09: document options — toggle, sync, and regenerate preview on change.
  if (notePdfDocToggleBtn) notePdfDocToggleBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleNotePdfDocOptions(); });
  if (notePdfDocTemplate) notePdfDocTemplate.addEventListener('change', refreshNotePdfPreviewDocOptions);
  if (notePdfDocHeader) notePdfDocHeader.addEventListener('change', refreshNotePdfPreviewDocOptions);
  if (notePdfDocFooter) notePdfDocFooter.addEventListener('change', refreshNotePdfPreviewDocOptions);
  if (notePdfDocWmOn) notePdfDocWmOn.addEventListener('change', refreshNotePdfPreviewDocOptions);
  if (notePdfDocWmText) notePdfDocWmText.addEventListener('change', refreshNotePdfPreviewDocOptions);
  // Close the More menu on any outside click or Escape (modal-scoped).
  if (notePdfPreviewModal) {
    notePdfPreviewModal.addEventListener('click', (e) => {
      if (!notePdfMoreMenu || notePdfMoreMenu.hidden) return;
      if (e.target === notePdfPreviewMoreBtn || notePdfMoreMenu.contains(e.target)) return;
      hideNotePdfMoreMenu();
    });
    notePdfPreviewModal.addEventListener('click', (e) => {
      if (notePdfDocOptionsEl && !notePdfDocOptionsEl.hidden) {
        if (e.target === notePdfDocToggleBtn || notePdfDocOptionsEl.contains(e.target)) return;
        hideNotePdfDocOptions();
      }
    });
    notePdfPreviewModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && notePdfMoreMenu && !notePdfMoreMenu.hidden) {
        e.stopPropagation();
        hideNotePdfMoreMenu();
      }
    });
    notePdfPreviewModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && notePdfDocOptionsEl && !notePdfDocOptionsEl.hidden) {
        e.stopPropagation();
        hideNotePdfDocOptions();
      }
    });
  }
  // Re-fit on resize/orientation change so fit-zoom stays correct.
  if (notePdfPreviewStage && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      if (notePdfPreviewModal && notePdfPreviewModal.classList.contains('show') && notePdfPreviewState.doc) {
        renderNotePdfPreviewPage().catch(() => { /* transient resize races are non-fatal */ });
      }
    }).observe(notePdfPreviewStage);
  }
}

// Flatten blocks into a single plain-text preview string (keeps the notes-list
// preview and any legacy consumers reading `note.body` working for table notes).
function flattenBlocksForPreview(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((b) => {
    if (b && b.type === 'table') {
      return (Array.isArray(b.rows) ? b.rows : []).map((row) =>
        (Array.isArray(row) ? row : []).map((c) => (c && typeof c.text === 'string' ? c.text : '')).join(' | ')
      ).join('\n');
    }
    if (b && b.type === 'checklist') { // PART 04
      return (Array.isArray(b.items) ? b.items : []).map((it) => (it && it.checked ? '[x] ' : '[ ] ') + (it && typeof it.text === 'string' ? it.text : '')).join('\n');
    }
    if (b && b.type === 'divider') return '---'; // PART 04
    if (b && b.type === 'image') return '[Image]'; // PART 09
    return b ? (b.body || '') : '';
  }).join('\n');
}

function parseTableBlock(tableEl) {
  const tbody = tableEl.querySelector('tbody') || tableEl;
  const trs = Array.from(tbody.querySelectorAll('tr'));
  const header = !!tableEl.classList.contains('note-table-hasheader');
    const rows = trs.map((tr) =>
    Array.from(tr.querySelectorAll('td, th')).map((td) => {
      const ex = extractNoteBodyAndFormatting(td);
      const cell = { text: ex.body, formatting: ex.formatting || [] };
      const bg = normalizeNoteTextColor(td.style && td.style.backgroundColor ? td.style.backgroundColor : readExplicitCellBackgroundColor(td));
      if (bg) cell.backgroundColor = bg;
      const ha = td.getAttribute('data-h-align');
      if (ha !== null && NOTE_TABLE_H_ALIGN.indexOf(ha) !== -1) cell.alignH = ha;
      const va = td.getAttribute('data-v-align');
      if (va !== null && NOTE_TABLE_V_ALIGN.indexOf(va) !== -1) cell.alignV = va;
      const colSpan = parseInt(td.getAttribute('colspan'), 10);
      const rowSpan = parseInt(td.getAttribute('rowspan'), 10);
      if (Number.isInteger(colSpan) && colSpan > 1) cell.colspan = colSpan;
      if (Number.isInteger(rowSpan) && rowSpan > 1) cell.rowSpan = rowSpan;
      return cell;
    })
  );
  const borderStyle = normalizeNoteTableBorderStyle(tableEl.getAttribute('data-border-style'));
  const block = { type: 'table', header, rows };
  if (borderStyle !== 'all') block.borderStyle = borderStyle;
  const colWidths = parseNoteTableColWidths(tableEl);
  if (colWidths) block.colWidths = colWidths;
  const rowHeights = parseNoteTableRowHeights(tbody);
  if (rowHeights) block.rowHeights = rowHeights;
  return block;
}
// Serialize the current editor DOM. Returns {body, formatting} for the legacy
// model when no table is present (identical to the old behaviour), or
// {body, blocks} when tables are present.
function serializeNoteEditor() {
  const root = noteBodyInput;
  if (!root) return { body: '', formatting: [] };
  const hasTable = !!root.querySelector('.note-table-wrap, table.note-table');
  const hasChecklist = !!root.querySelector('ul.note-checklist'); // PART 04
  const hasDivider = !!root.querySelector('hr.note-divider'); // PART 04
  const hasImage = !!root.querySelector('.note-image-block'); // PART 09
  if (!hasTable && !hasChecklist && !hasDivider && !hasImage) return extractNoteBodyAndFormatting(root);
  const blocks = [];
  let textBuf = [];
  const flush = () => {
    if (!textBuf.length) return;
    const wrap = document.createElement('div');
    textBuf.forEach((n) => wrap.appendChild(n.cloneNode(true)));
    const ex = extractNoteBodyAndFormatting(wrap);
    if (ex.body || (ex.formatting && ex.formatting.length)) {
      blocks.push({ type: 'text', body: ex.body, formatting: ex.formatting });
    }
    textBuf = [];
  };
  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === 1 && (child.classList.contains('note-table-wrap') || child.tagName === 'TABLE')) {
      flush();
      const tableEl = child.tagName === 'TABLE' ? child : (child.querySelector('table.note-table') || child);
      blocks.push(parseTableBlock(tableEl));
    } else if (child.nodeType === 1 && child.classList.contains('note-checklist')) { // PART 04
      flush();
      blocks.push(parseChecklistBlock(child));
    } else if (child.nodeType === 1 && child.tagName === 'HR' && child.classList.contains('note-divider')) { // PART 04
      flush();
      blocks.push({ type: 'divider' });
    } else if (child.nodeType === 1 && child.classList.contains('note-image-block')) { // PART 09
      flush();
      blocks.push(parseNoteImageBlock(child));
    } else {
      textBuf.push(child);
    }
  });
  flush();
  if (!blocks.some((b) => b.type === 'table' || b.type === 'checklist' || b.type === 'divider' || b.type === 'image')) return extractNoteBodyAndFormatting(root);
  return { body: flattenBlocksForPreview(blocks), blocks };
}

// Render the note into the editor using bodyBlocks when present, else legacy body.
function renderNoteBody(note) {
  if (!noteBodyInput) return;
  if (Array.isArray(note.bodyBlocks) && note.bodyBlocks.length) {
    noteBodyInput.innerHTML = buildNoteBlocksHTML(note.bodyBlocks);
  } else {
    noteBodyInput.innerHTML = buildNoteBodyHTML(note.body, note.bodyFormatting);
  }
  initNoteTableResizers(noteBodyInput);
  // PART 09 — re-bind image block controls after the innerHTML swap.
  initNoteImageBlocks(noteBodyInput);
  // PART 08 — re-apply the stored Style/Frame classes on the editor surface.
  applyNoteStyleSurfaceClasses(note);
}

// PART 08 — Note Styles + Frames. Data-driven "starting design" layer:
// application only toggles CSS classes on the note body surface (zero-
// specificity :where() rules in styles.css). Content, PART 05/06/07
// formatting and every manual override remain fully editable — the style
// is a starting design, never a lock, and never re-applies itself.
const NOTE_STYLE_IDS = ['simple', 'academic', 'business', 'engineering', 'modern'];
const NOTE_FRAME_IDS = ['none', 'classic', 'dashed', 'soft'];
function applyNoteStyleSurfaceClasses(note) {
  if (!noteBodyInput) return;
  NOTE_STYLE_IDS.forEach((id) => noteBodyInput.classList.toggle('note-style-' + id, !!note && note.noteStyle === id));
  NOTE_FRAME_IDS.forEach((id) => noteBodyInput.classList.toggle('note-frame-' + id, !!note && note.noteFrame === id));
  const styleRow = document.getElementById('noteAaStylesRow');
  if (styleRow) {
    styleRow.querySelectorAll('.note-aa-style-btn').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-style-id') === ((note && note.noteStyle) || 'none'));
    });
  }
  const frameRow = document.getElementById('noteAaFramesRow');
  if (frameRow) {
    frameRow.querySelectorAll('.note-aa-frame-btn').forEach((b) => {
      b.classList.toggle('is-active', b.getAttribute('data-frame-id') === ((note && note.noteFrame) || 'none'));
    });
  }
}

function buildTableElement(rows, cols, header) {
  const wrap = document.createElement('div');
  wrap.className = 'note-table-wrap';
  wrap.setAttribute('contenteditable', 'false');
  const table = document.createElement('table');
  table.className = 'note-table' + (header ? ' note-table-hasheader' : '');
  const colgroup = document.createElement('colgroup');
  for (let c = 0; c < cols; c++) colgroup.appendChild(document.createElement('col'));
  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'note-cell';
      td.setAttribute('contenteditable', 'true');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(colgroup);
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}
// Cached caret position captured when the insert panel is opened, so inserting
// works even after focus has moved to the panel's inputs/buttons.
let noteTableCaretRange = null;

function captureNoteTableCaret() {
  noteTableCaretRange = null;
  if (!noteBodyInput) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const r = sel.getRangeAt(0);
  if (noteBodyInput.contains(r.commonAncestorContainer)) {
    noteTableCaretRange = r.cloneRange();
  }
}

function insertTable(rows, cols, header) {
  if (!noteBodyInput) return;
  rows = Math.max(1, Math.min(20, Math.floor(rows) || 2));
  cols = Math.max(1, Math.min(20, Math.floor(cols) || 2));
  const wrap = buildTableElement(rows, cols, !!header);
  let range = null;
  const sel = window.getSelection();
  if (sel && sel.rangeCount && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    range = sel.getRangeAt(0).cloneRange();
  } else if (noteTableCaretRange && noteBodyInput.contains(noteTableCaretRange.commonAncestorContainer)) {
    range = noteTableCaretRange.cloneRange();
  }
  const trailing = document.createElement('div');
  trailing.className = 'note-block';
  trailing.innerHTML = '<br>';
  if (range) {
    range.deleteContents();
    range.insertNode(wrap);
    range.setStartAfter(wrap);
    range.collapse(true);
    wrap.parentNode.insertBefore(trailing, wrap.nextSibling);
  } else {
    noteBodyInput.appendChild(wrap);
    noteBodyInput.appendChild(trailing);
  }
  noteTableCaretRange = null;
  placeNoteResizeHandles(wrap);
  // Reveal the contextual table toolbar immediately so the user understands the
  // table can still be edited. Reuses the existing focusin handler (which shows
  // the toolbar when a .note-cell receives focus) — no new listener, no duplicate
  // controls. Fall back to body focus if no cell exists. (PHASE 02A)
  const firstCell = wrap.querySelector('td.note-cell');
  if (firstCell) firstCell.focus();
  else noteBodyInput.focus();
  scheduleNoteSave();
}

function handleTableAction(action, wrapEl) {
  if (!wrapEl) return;
  const table = wrapEl.querySelector('table.note-table');
  if (!table) return;
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  if (!rows.length) return;
  const colCount = Array.from(rows[0].querySelectorAll('td, th')).length;
  const focus = state.noteTableFocus && state.noteTableFocus.cell;
  const cellValid = !!focus && table.contains(focus);
  const focusTr = cellValid ? focus.closest('tr') : null;
  const rowIndex = focusTr ? rows.indexOf(focusTr) : -1;
  const colIndex = cellValid ? Array.from(focus.parentNode.querySelectorAll('td, th')).indexOf(focus) : -1;
  if (action === 'add-row') {
    const tr = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.className = 'note-cell';
      td.setAttribute('contenteditable', 'true');
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  } else if (action === 'add-col') {
    rows.forEach((tr) => {
      const td = document.createElement('td');
      td.className = 'note-cell';
      td.setAttribute('contenteditable', 'true');
      tr.appendChild(td);
    });
  } else if (action === 'del-row') {
    if (rows.length <= 1) return;
    const idx = rowIndex >= 0 ? rowIndex : rows.length - 1;
    if (rows[idx]) tbody.removeChild(rows[idx]);
    if (table.classList.contains('note-table-hasheader') && idx === 0) {
      table.classList.remove('note-table-hasheader');
    }
  } else if (action === 'del-col') {
    if (colCount <= 1) return;
    const idx = colIndex >= 0 ? colIndex : colCount - 1;
    rows.forEach((tr) => {
      const cell = Array.from(tr.querySelectorAll('td, th'))[idx];
      if (cell) cell.parentNode.removeChild(cell);
    });
  } else if (action === 'merge-cells') {
    mergeSelectedCells(wrapEl);
  } else if (action === 'split-cell') {
    splitMergedCell(wrapEl);
  }
  state.noteTableFocus = null;
  updateSplitCellButton();
  updateCellAlignControls();
  placeNoteResizeHandles(wrapEl);
  scheduleNoteSave();
}

// Apply a border style ('all' | 'outside' | 'inside' | 'none') to the table
// inside `wrapEl`. Only the `data-border-style` attribute on the <table> is
// touched — cell content, formatting, background color, colspan/rowspan and
// the select's own markup are left completely untouched.
function applyNoteTableBorderStyle(wrapEl, value) {
  if (!wrapEl) return;
  const table = wrapEl.querySelector('table.note-table');
  if (!table) return;
  const style = normalizeNoteTableBorderStyle(value);
  if (style === 'all') table.removeAttribute('data-border-style');
  else table.setAttribute('data-border-style', style);
  scheduleNoteSave();
}

function toggleNoteTablePanel(forceShow) {
  if (!noteTablePanel) return;
  const willShow = forceShow === undefined ? noteTablePanel.classList.contains('hidden') : forceShow;
  if (willShow) {
    captureNoteTableCaret();
    noteTablePanel.classList.remove('hidden');
  } else {
    noteTablePanel.classList.add('hidden');
    noteTableCaretRange = null;
  }
}
// ============================================================
// MERGE CELLS (PHASE 2)
// Selection comes from an explicit shift+click rectangle tracked in
// `state.noteTableCellSelection`, or (as a fallback for drag-selection) from the
// browser's native selection range. Only a contiguous rectangular block of
// *single* cells (rowspan=1 / colspan=1) may be merged; any other selection is
// rejected without touching the DOM or persisting anything.
// ============================================================

// Get the selected cells covered by a native DOM selection range within `table`.
function selectedCellsFromRange(sel, table) {
  if (!sel || !sel.rangeCount) return [];
  const range = sel.getRangeAt(0);
  if (range.collapsed) return [];
  const out = [];
  const cells = table ? table.querySelectorAll('td, th') : [];
  for (const cell of cells) {
    let cr;
    try { cr = document.createRange(); cr.selectNodeContents(cell); }
    catch (e) { continue; }
    // ranges intersect unless one is entirely before the other
    if (cr.compareBoundaryPoints(Range.END_TO_START, range) <= 0) continue;
    if (range.compareBoundaryPoints(Range.END_TO_START, cr) <= 0) continue;
    out.push(cell);
  }
  return out;
}

// Build a flat grid of cells with their top-left row/col and span footprint,
// respecting existing rowspan/colspan anywhere else in the table.
function noteTableCellGrid(table) {
  const tbody = table.querySelector('tbody') || table;
  const trs = Array.from(tbody.querySelectorAll('tr'));
  const grid = [];
  const occupied = [];
  for (let ri = 0; ri < trs.length; ri++) {
    const cells = Array.from(trs[ri].querySelectorAll('td, th'));
    let c = 0;
    for (const el of cells) {
      const cs = Math.max(1, parseInt(el.getAttribute('colspan'), 10) || 1);
      const rs = Math.max(1, parseInt(el.getAttribute('rowspan'), 10) || 1);
      while (occupied[ri] && occupied[ri][c]) c++;
      for (let r = ri; r < ri + rs; r++) {
        if (!occupied[r]) occupied[r] = [];
        for (let k = 0; k < cs; k++) occupied[r][c + k] = true;
      }
      grid.push({ el, row: ri, col: c, rowspan: rs, colspan: cs });
      c++;
    }
  }
  grid.at = (r, c) => grid.find((g) => g.row === r && g.col === c) || null;
  return grid;
}

// Return every cell in the rectangle between two cells (shift+click selection).
function computeCellRectangle(a, b) {
  const table = a && b && a.closest('table.note-table');
  if (!table || !table.contains(b)) return [];
  const rows = Array.from(table.querySelectorAll('tr'));
  const findPos = (el) => {
    for (let ri = 0; ri < rows.length; ri++) {
      const cells = Array.from(rows[ri].querySelectorAll('td, th'));
      const ci = cells.indexOf(el);
      if (ci >= 0) return { r: ri, c: ci };
    }
    return null;
  };
  const pa = findPos(a), pb = findPos(b);
  if (!pa || !pb) return [];
  const r1 = Math.min(pa.r, pb.r), r2 = Math.max(pa.r, pb.r);
  const c1 = Math.min(pa.c, pb.c), c2 = Math.max(pa.c, pb.c);
  const out = [];
  for (let r = r1; r <= r2; r++) {
    const cells = Array.from(rows[r].querySelectorAll('td, th'));
    for (let c = c1; c <= c2; c++) if (cells[c]) out.push(cells[c]);
  }
  return out;
}

function highlightNoteTableCellSelection(cells) {
  document.querySelectorAll('.note-cell-selected').forEach((el) => el.classList.remove('note-cell-selected'));
  cells.forEach((c) => c.classList.add('note-cell-selected'));
}

function clearNoteTableCellSelection() {
  document.querySelectorAll('.note-cell-selected').forEach((el) => el.classList.remove('note-cell-selected'));
  state.noteTableCellSelection = null;
}

// Click a cell (no modifier): make it the anchor of a fresh selection.
function setCellSelection(cell) {
  clearNoteTableCellSelection();
  const wrap = cell && cell.closest('.note-table-wrap');
  if (!wrap) return;
  state.noteTableCellSelection = { cells: [cell], tableWrap: wrap, anchorCell: cell };
}

// Shift+click another cell: rectangle-select from the anchor to it.
function extendCellSelection(cell) {
  const cur = state.noteTableCellSelection;
  const wrap = cell && cell.closest('.note-table-wrap');
  if (!wrap) return;
  if (!cur || cur.tableWrap !== wrap || !cur.anchorCell) { setCellSelection(cell); return; }
  const rect = computeCellRectangle(cur.anchorCell, cell);
  if (!rect.length) { setCellSelection(cell); return; }
  clearNoteTableCellSelection();
  state.noteTableCellSelection = { cells: rect, tableWrap: wrap, anchorCell: cur.anchorCell };
  if (rect.length >= 2) highlightNoteTableCellSelection(rect);
}

// When a table control button (incl. Merge Cells) is mousedowned, capture the
// current native drag-selection as the merge selection, in case the explicit
// shift+click selection was not used. Existing explicit selections win.
function snapshotLiveTableSelection(wrap) {
  try {
    const cur = state.noteTableCellSelection;
    if (cur && cur.tableWrap === wrap && cur.cells.length >= 2) return;
    const table = wrap.querySelector('table.note-table');
    if (!table) return;
    const live = selectedCellsFromRange(window.getSelection(), table);
    if (live.length >= 2) {
      clearNoteTableCellSelection();
      state.noteTableCellSelection = { cells: live, tableWrap: wrap, anchorCell: live[0] };
      highlightNoteTableCellSelection(live);
    }
  } catch (e) { /* best-effort */ }
}

// Concatenate cells' {text, formatting} into one cell, joining texts with a
// newline (logical reading order) and re-offsetting every formatting run so
// bold/italic/underline survive byte-for-byte.
function mergeCellContents(cells) {
  let text = '';
  const runs = [];
  let backgroundColor = null;
  cells.forEach((cell, idx) => {
    if (idx === 0) backgroundColor = normalizeNoteTextColor(cell && cell.backgroundColor) || backgroundColor;
    if (idx > 0) text += '\n';
    const base = text.length;
    const cellLen = (cell.text || '').length;
    text += (cell.text || '');
    (cell.formatting || []).forEach((run) => {
      const s = Math.max(0, Math.min(run.start, cellLen));
      const e = Math.min(cellLen, Math.max(0, run.end));
      if (e <= s) return;
      const color = normalizeNoteTextColor(run.color);
      runs.push({ start: base + s, end: base + e, bold: !!run.bold, italic: !!run.italic, underline: !!run.underline, color: color || undefined });
    });
  });
  return { text, formatting: runs, backgroundColor };
}

function invalidMerge(message) {
  if (typeof showToast === 'function') showToast(message || 'Cannot merge those cells.', 2200);
}

function mergeSelectedCells(wrapEl) {
  try {
    if (!wrapEl) return;
    const table = wrapEl.querySelector('table.note-table');
    if (!table) { invalidMerge('No table to merge.'); return; }

    // Selected cells: explicit shift+click selection first, live selection second.
    let cells = [];
    const sel = state.noteTableCellSelection;
    if (sel && sel.tableWrap === wrapEl && sel.cells.length >= 2) {
      cells = sel.cells;
    } else {
      const live = selectedCellsFromRange(window.getSelection(), table);
      if (live.length >= 2) cells = live;
    }
    if (cells.length < 2) { invalidMerge('Select two or more adjacent cells to merge.'); return; }

    const grid = noteTableCellGrid(table);
    const entries = [];
    for (const cell of cells) {
      const g = grid.find((x) => x.el === cell);
      if (!g) { invalidMerge('Invalid selection.'); return; }
      entries.push(g);
    }
    for (const g of entries) {
      if (g.rowspan > 1 || g.colspan > 1) { invalidMerge('Cannot merge a cell that is already part of a merged region.'); return; }
    }
    let r1 = Infinity, r2 = -Infinity, c1 = Infinity, c2 = -Infinity;
    entries.forEach((g) => { r1 = Math.min(r1, g.row); r2 = Math.max(r2, g.row); c1 = Math.min(c1, g.col); c2 = Math.max(c2, g.col); });
    const area = (r2 - r1 + 1) * (c2 - c1 + 1);
    if (entries.length !== area) {
      invalidMerge('Invalid selection: choose a contiguous rectangular block of adjacent cells.');
      return;
    }
    const rect = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const g = grid.at(r, c);
      if (!g || g.rowspan > 1 || g.colspan > 1 || !entries.includes(g)) {
        invalidMerge('Invalid selection: non-adjacent or incomplete selection.');
        return;
      }
      rect.push(g);
    }

    const sourceData = rect.map((g) => {
      const ex = extractNoteBodyAndFormatting(g.el);
      const bg = normalizeNoteTextColor(g.el.style && g.el.style.backgroundColor ? g.el.style.backgroundColor : readExplicitCellBackgroundColor(g.el));
      return { text: ex.body, formatting: ex.formatting || [], backgroundColor: bg || undefined };
    });
    const merged = mergeCellContents(sourceData);

    const anchor = rect[0];
    anchor.el.setAttribute('colspan', c2 - c1 + 1);
    anchor.el.setAttribute('rowspan', r2 - r1 + 1);
    anchor.el.style.backgroundColor = merged.backgroundColor || anchor.el.style.backgroundColor || '';
    anchor.el.innerHTML = buildNoteBodyHTML(merged.text, merged.formatting);
    for (let i = 1; i < rect.length; i++) {
      if (rect[i].el.parentNode) rect[i].el.parentNode.removeChild(rect[i].el);
    }
    clearNoteTableCellSelection();
    // handleTableAction() calls scheduleNoteSave() right after we return.
  } catch (err) {
    invalidMerge('Could not merge cells.');
  }
}

// ============================================================
// SPLIT CELL (PHASE 2)
// Reverse of Merge Cells: splits a single merged region (colspan>1 or rowspan>1)
// back into its individual cells while keeping the original merged content intact
// inside the anchor cell. Other cells are reused untouched.
// ============================================================
function invalidSplit(message) {
  if (typeof showToast === 'function') showToast(message || 'Cannot split this cell.', 2200);
}

// Toggle the "Split Cell" control so it only appears when the currently selected
// / focused cell is an actual merged region (colspan>1 or rowspan>1).
function updateSplitCellButton() {
  document.querySelectorAll('.note-table-wrap').forEach((wrap) => {
    const btn = wrap.querySelector('[data-table-action="split-cell"]');
    if (!btn) return;
    const table = wrap.querySelector('table.note-table');
    const isMerged = (cell) => !!cell && ((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1);
    let active = false;
    const sel = state.noteTableCellSelection;
    if (sel && sel.tableWrap === wrap) {
      active = Array.from(sel.cells || []).some(isMerged);
    } else if (table && state.noteTableFocus && state.noteTableFocus.cell && table.contains(state.noteTableFocus.cell)) {
      active = isMerged(state.noteTableFocus.cell);
    }
    btn.hidden = !active;
  });
}

function splitMergedCell(wrapEl) {
  try {
    if (!wrapEl) return;
    const table = wrapEl.querySelector('table.note-table');
    if (!table) { invalidSplit('No table to split.'); return; }
    const tbody = table.querySelector('tbody') || table;

    // Resolve the merged cell: prefer the current selection, fall back to focus.
    let target = null;
    const sel = state.noteTableCellSelection;
    const isMerged = (cell) => !!cell && ((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1);
    if (sel && sel.tableWrap === wrapEl) {
      target = Array.from(sel.cells || []).find(isMerged) || null;
      if (!target && sel.anchorCell && isMerged(sel.anchorCell)) target = sel.anchorCell;
    }
    if (!target && state.noteTableFocus && state.noteTableFocus.cell && table.contains(state.noteTableFocus.cell) && isMerged(state.noteTableFocus.cell)) {
      target = state.noteTableFocus.cell;
    }
    if (!target) { invalidSplit('Select a merged cell to split.'); return; }

    const cs = target.colSpan || 1;
    const rs = target.rowSpan || 1;
    if (cs <= 1 && rs <= 1) { invalidSplit('This cell is not merged.'); return; }

    const grid = noteTableCellGrid(table);
    const g = grid.find((x) => x.el === target);
    if (!g) { invalidSplit('Invalid cell.'); return; }
    const r0 = g.row, c0 = g.col;
    const r1 = r0 + rs - 1, c1 = c0 + cs - 1;

    // Preserve merged content byte-for-byte by keeping the element markup; only the
    // span attributes are removed. Arabic/English/numbers and bold/italic/underline
    // runs therefore survive unchanged inside the anchor cell.
    const anchorHTML = target.innerHTML;
    target.removeAttribute('colspan');
    target.removeAttribute('rowspan');

    // 2D layout of the rebuilt table. Each slot:
    //   {fresh:true}  -> brand-new empty cell (footprint expansion beyond anchor)
    //   {target:true} -> the original merged anchor cell
    //   {el:...}      -> an existing untouched cell element
    //   null          -> covered by a row/col span from an earlier cell (skip)
    let rowCount = 0, colCount = 0;
    grid.forEach((x) => {
      rowCount = Math.max(rowCount, x.row + x.rowspan);
      colCount = Math.max(colCount, x.col + x.colspan);
    });
    const layout = [];
    for (let r = 0; r < rowCount; r++) layout.push(new Array(colCount).fill(null));

    layout[r0][c0] = { target: true };
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (r === r0 && c === c0) continue;
        layout[r][c] = { fresh: true };
      }
    }

    grid.forEach((x) => {
      if (x.el === target) return;
      layout[x.row][x.col] = { el: x.el, rowspan: x.rowspan, colspan: x.colspan };
      for (let r = x.row + 1; r < x.row + x.rowspan; r++) {
        for (let c = x.col; c < x.col + x.colspan; c++) layout[r][c] = null;
      }
    });

    // Rebuild the rows reusing untouched cell elements and creating empties for the
    // footprint positions beyond the anchor. Other rows/columns are not disturbed.
    const oldRows = Array.from(tbody.querySelectorAll('tr'));
    // Preserve any explicit row sizes across the rebuild (Resize compatibility):
    // unrelated rows keep their height, and the previously-merged row's height is
    // carried across all rows of the split footprint.
    const oldRowHeights = oldRows.map((tr) => (tr && tr.style && tr.style.height ? tr.style.height : ''));
    const anchorTr = target.closest('tr');
    const mergedHeight = anchorTr && anchorTr.style && anchorTr.style.height ? anchorTr.style.height : '';
    const newRows = [];
    for (let r = 0; r < rowCount; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < colCount; c++) {
        const slot = layout[r][c];
        if (!slot) continue;
        if (slot.fresh) {
          const td = document.createElement('td');
          td.className = 'note-cell';
          td.setAttribute('contenteditable', 'true');
          tr.appendChild(td);
        } else if (slot.target) {
          tr.appendChild(target);
        } else if (slot.el) {
          tr.appendChild(slot.el);
        }
      }
      newRows.push(tr);
    }
    oldRows.forEach((tr) => { if (tr.parentNode) tbody.removeChild(tr); });
    newRows.forEach((tr) => tbody.appendChild(tr));
    // Re-apply captured row sizes so Resize data survives a Split (Resize compatibility).
    newRows.forEach((tr, i) => {
      const preserved = oldRowHeights[i] || (i >= r0 && i <= r1 ? mergedHeight : '');
      if (preserved && tr.style) tr.style.height = preserved;
    });

    // Re-assert anchor markup last so its content/formatting is fully preserved.
    const preservedBg = normalizeNoteTextColor(target.style && target.style.backgroundColor ? target.style.backgroundColor : readExplicitCellBackgroundColor(target));
    target.innerHTML = anchorHTML;
    if (preservedBg) target.style.backgroundColor = preservedBg;

    clearNoteTableCellSelection();
    state.noteTableFocus = null;
    // handleTableAction() (re)hides the control and calls scheduleNoteSave() next.
  } catch (err) {
    invalidSplit('Could not split cells.');
  }
}

// __TABLE_END__

// Apply a formatting command to the current editor selection (native behaviour:
// selected text gets formatted; no selection arms the format for next input).
function applyNoteFormat(cmd) {
  if (!noteBodyInput) return;
  // Focus the editor only when focus is not already inside it. When the
  // selection lives in a nested table cell (focus is the <td>), forcing the
  // editor root to focus would collapse the selection and break B/I/U there.
  const active = document.activeElement;
  if (active !== noteBodyInput && !(noteBodyInput.contains(active))) {
    noteBodyInput.focus();
  }
  try {
    document.execCommand(cmd, false, null);
  } catch (e) { /* formatting is best-effort */ }
  scheduleNoteSave();
}

// ============================================================
// NOTE HEADINGS + LISTS (PHASE 03) — apply-side
// Heading: native formatBlock (h1/h2/h3/p) on the current block — works with
// a text selection or a collapsed caret, RTL/LTR alike. Lists: native
// insert(Unordered|Ordered)List. Both reuse applyNoteFormat's focus rules so
// selections inside table cells and nested editors behave identically.
// ============================================================
let noteHeadingCaretRange = null; // reserved: caret snapshot if future UX needs it

function focusNoteBodyPreservingCaret() {
  if (!noteBodyInput) return null;
  const sel = window.getSelection && window.getSelection();
  let savedRange = null;
  if (sel && sel.rangeCount && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    savedRange = sel.getRangeAt(0).cloneRange();
  }
  const active = document.activeElement;
  if (active !== noteBodyInput && !noteBodyInput.contains(active)) {
    noteBodyInput.focus();
    if (savedRange) {
      try { sel.removeAllRanges(); sel.addRange(savedRange); } catch (e) { /* best-effort */ }
    }
  }
  return savedRange;
}

function applyNoteHeading(tag) {
  const v = String(tag || '').toLowerCase();
  if (!noteBodyInput || !/^(h1|h2|h3|p)$/.test(v)) return;
  focusNoteBodyPreservingCaret();
  try {
    document.execCommand('formatBlock', false, v);
  } catch (e) { /* best-effort */ }
  scheduleNoteSave();
}

function applyNoteList(cmd) {
  if (!noteBodyInput || (cmd !== 'insertUnorderedList' && cmd !== 'insertOrderedList')) return;
  focusNoteBodyPreservingCaret();
  try {
    document.execCommand(cmd, false, null);
  } catch (e) { /* best-effort */ }
  scheduleNoteSave();
}

function preserveActiveSelectionRange() {
  const sel = window.getSelection && window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range) return null;
  try { return range.cloneRange(); } catch (e) { return null; }
}

function restoreActiveSelectionRange(range) {
  if (!range) return;
  const sel = window.getSelection && window.getSelection();
  if (!sel) return;
  try {
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) { /* best-effort */ }
}

function applyNoteTextColor(colorValue) {
  const safe = normalizeNoteTextColor(colorValue);
  if (!safe || !noteBodyInput) return;
  const savedRange = preserveActiveSelectionRange();
  try {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('foreColor', false, safe);
  } catch (e) { /* best-effort */ }
  restoreActiveSelectionRange(savedRange);
  scheduleNoteSave();
}

// Reflect the last chosen text color on the toolbar glyph's underline so the
// user can see which color will be applied next (same idea as Word's font-color
// button). Purely visual — it never touches the note content or the theme.
function updateNoteTextColorButton() {
  if (!noteTextColorBtn || !noteTextColorInput) return;
  const glyph = noteTextColorBtn.querySelector('.fmt-color');
  if (!glyph) return;
  const c = normalizeNoteTextColor(noteTextColorInput.value);
  if (c) glyph.style.setProperty('--note-text-color-current', c);
}

// PART 05 — Font size (Aa panel). Uses the native contenteditable engine via
// execCommand('fontSize', 1..7) with styleWithCSS so it produces a persistent
// inline <span style="font-size:…"> on the selected text (or arms the size for
// the next input on a collapsed caret). Reuses the same selection-preserving
// focus rules as the other formatting commands.
function applyNoteFontSize(token) {
  const value = Number(token);
  if (!noteBodyInput || !/^([1-7])$/.test(String(token))) return;
  focusNoteBodyPreservingCaret();
  try {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('fontSize', false, String(value));
  } catch (e) { /* best-effort */ }
  scheduleNoteSave();
}

// PART 05 — Highlight (Aa panel). Applies a highlighter background to the current
// selection using the native hiliteColor command (styleWithCSS produces an inline
// background style that autosaves, persists across reload, and prints).
function applyNoteHighlight(colorValue) {
  const safe = normalizeNoteTextColor(colorValue);
  if (!safe || !noteBodyInput) return;
  const savedRange = preserveActiveSelectionRange();
  try {
    document.execCommand('styleWithCSS', false, true);
    document.execCommand('hiliteColor', false, safe);
  } catch (e) {
    // Safari/older engines fall back to backColor for the same visual result.
    try { document.execCommand('backColor', false, safe); } catch (e2) { /* best-effort */ }
  }
  restoreActiveSelectionRange(savedRange);
  scheduleNoteSave();
}

function getSelectedNoteTableCellForBackground() {
  const selected = state.noteTableCellSelection && Array.isArray(state.noteTableCellSelection.cells) && state.noteTableCellSelection.cells.length
    ? state.noteTableCellSelection.cells[0]
    : null;
  return selected || (state.noteTableFocus && state.noteTableFocus.cell ? state.noteTableFocus.cell : null);
}

function applyCellBackgroundColor(colorValue, targetCell = null) {
  const safe = normalizeNoteTextColor(colorValue);
  const cell = targetCell || getSelectedNoteTableCellForBackground();
  if (!safe || !cell || !cell.closest || !cell.closest('.note-cell')) return;
  cell.style.backgroundColor = safe;
  scheduleNoteSave();
}

function updateNoteCellBackgroundButton() {
  if (!noteCellBgColorBtn) return;
  const cell = getSelectedNoteTableCellForBackground();
  const enabled = !!(cell && cell.closest && cell.closest('.note-cell'));
  noteCellBgColorBtn.disabled = !enabled;
  noteCellBgColorBtn.setAttribute('aria-disabled', String(!enabled));
}

// The cells an alignment action should currently affect: all explicitly
// selected cells, else the focused cell. Empty array = nothing to do.
function getTargetNoteTableCells() {
  const selected = state.noteTableCellSelection && Array.isArray(state.noteTableCellSelection.cells) && state.noteTableCellSelection.cells.length
    ? state.noteTableCellSelection.cells
    : null;
  if (selected && selected.length) return selected;
  if (state.noteTableFocus && state.noteTableFocus.cell) return [state.noteTableFocus.cell];
  return [];
}

// Apply an alignment ('h' or 'v') to every currently selected/focused cell.
// Only allow-listed values are written; anything else is safely ignored.
function applyCellAlign(axis, value) {
  const h = axis === 'h' ? normalizeNoteTableHAlign(value) : null;
  const v = axis === 'v' ? normalizeNoteTableVAlign(value) : null;
  if (!h && !v) return;
  const cells = getTargetNoteTableCells();
  if (!cells.length) return;
  for (const cell of cells) {
    if (!cell || !cell.closest || !cell.closest('.note-cell')) continue;
    if (h) cell.setAttribute('data-h-align', h);
    if (v) cell.setAttribute('data-v-align', v);
  }
  updateCellAlignControls();
  scheduleNoteSave();
}

// Reflect the focused/selected cell's alignment in every table toolbar control.
function updateCellAlignControls() {
  const cells = getTargetNoteTableCells();
  const cell = cells.length ? cells[0] : null;
  const h = normalizeNoteTableHAlign(cell && cell.getAttribute ? cell.getAttribute('data-h-align') : null);
  const v = normalizeNoteTableVAlign(cell && cell.getAttribute ? cell.getAttribute('data-v-align') : null);
  document.querySelectorAll('[data-table-h-align-select]').forEach((sel) => { sel.value = h; });
  document.querySelectorAll('[data-table-v-align-select]').forEach((sel) => { sel.value = v; });
}

function openFullScreenNote(noteId) {
  const notes = state.noteData.notes;
  let note = null;
  if (noteId) {
    note = notes.find(n => n.id === noteId);
  }
  if (!note) {
    note = {
      id: 'note-' + Date.now().toString(36),
      title: '',
      body: '',
      folderId: getActiveFolder(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    notes.push(note);
    saveNotesData();
  }
  state.currentOpenNote = note;
  state.noteTableFocus = null;
  state.noteTableCellSelection = null;
  // PART 08 — restore the saved note Style / Frame on open (no re-render of
  // content; classes only, so manual formatting is never touched).
  if (noteBodyInput) {
    noteBodyInput.classList.remove('note-style-simple', 'note-style-academic', 'note-style-business', 'note-style-engineering', 'note-style-modern');
    noteBodyInput.classList.remove('note-frame-none', 'note-frame-classic', 'note-frame-dashed', 'note-frame-soft', 'note-frame-shadow');
    if (note.noteStyle && note.noteStyle !== 'none') noteBodyInput.classList.add('note-style-' + note.noteStyle);
    if (note.noteFrame) noteBodyInput.classList.add('note-frame-' + note.noteFrame);
    noteBodyInput.setAttribute('data-note-style', note.noteStyle || 'none');
    noteBodyInput.setAttribute('data-note-frame', note.noteFrame || 'none');
  }
  updateNoteCellBackgroundButton();
  updateCellAlignControls();
  if (noteTitleInput) noteTitleInput.value = note.title;
  renderNoteBody(note);
  // PART 08 — apply the note's stored Style/Frame (scoped classes only; the
  // content itself is untouched, manual formatting stays fully available).
  applyNoteStyleSurfaceClasses(note);
  // PHASE — first-click Send-as-PDF: warm the PDF in the background so the
  // first Share/Export tap resolves from cache (no heavy async on the gesture).
  primeNotePdfBlob();
  if (fullScreenNoteModal) {
    fullScreenNoteModal.classList.add('show');
    fullScreenNoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    // N03 — new note: put the cursor straight into the Title so the user can
    // start writing immediately (no extra screens).
    if (!noteId && noteTitleInput) {
      try { noteTitleInput.focus({ preventScroll: true }); } catch (e) { noteTitleInput.focus(); }
    }
  }
}

function closeFullScreenNote() {
  saveCurrentOpenNote();
  state.currentOpenNote = null;
  state.noteTableCellSelection = null;
  if (fullScreenNoteModal) {
    fullScreenNoteModal.classList.remove('show');
    fullScreenNoteModal.setAttribute('aria-hidden', 'true');
    // Keep the body locked while the Notes manager is still open beneath the editor.
    if (!notesManagerModal || !notesManagerModal.classList.contains('show')) {
      document.body.classList.remove('modal-open');
    }
  }
}

function saveCurrentOpenNote() {
  if (!state.currentOpenNote) return;
  const note = state.currentOpenNote;
  note.title = noteTitleInput ? noteTitleInput.value.trim() : note.title;
  if (noteBodyInput) {
    const res = serializeNoteEditor();
    if (res.blocks) {
      note.bodyBlocks = res.blocks;
      note.body = res.body;
      delete note.bodyFormatting;
    } else {
      note.body = res.body;
      if (res.formatting && res.formatting.length) {
        note.bodyFormatting = res.formatting;
      } else {
        delete note.bodyFormatting;
      }
      delete note.bodyBlocks;
    }
  }
  if (noteFolderSelect) {
    note.folderId = noteFolderSelect.value;
  }
  note.updatedAt = Date.now();
  // PART 08 — persist Style/Frame ids on the note object (kept alongside the
  // existing fields; removed when the user picks "None").
  if (noteBodyInput) {
    const styleMatch = Array.from(noteBodyInput.classList).find((c) => c.startsWith('note-style-'));
    const frameMatch = Array.from(noteBodyInput.classList).find((c) => c.startsWith('note-frame-'));
    if (styleMatch) note.style = styleMatch.slice('note-style-'.length); else delete note.style;
    if (frameMatch) note.frame = frameMatch.slice('note-frame-'.length); else delete note.frame;
  }
  saveNotesData();
  renderNotes();
  renderFolderTabs();
  // N03 — confirm autosave to the user ("Saved ✓", non-blocking).
  if (noteSavedIndicator) noteSavedIndicator.classList.add('show');
  // PHASE — first-click Send-as-PDF: after any save/autosave the note content is
  // stable, so warm the PDF in the background for the next Share/Export tap.
  primeNotePdfBlob();
}

async function sendCurrentNote() {
  const note = state.currentOpenNote;
  if (!note) {
    showToast('No note open');
    return;
  }

  // Build a shareable representation of the note
  const t = translations[state.locale] || translations.en;

  // Check for Web Share API support
  if (navigator.share && navigator.canShare) {
    try {
      // Share the note as text with title and body
      // This preserves content including Arabic/English/numbers/mixed text
      // and provides a useful representation via the native share sheet
      const shareText = buildNoteShareText(note);
      if (!shareText || shareText.trim().length === 0) {
        showToast('No content to share');
        return;
      }

      await navigator.share({
        title: note.title || t.untitled || 'Untitled',
        text: shareText
      });
      return;
    } catch (err) {
      // User dismissed the Share Sheet -> not an error
      if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
        return;
      }
      showToast(t.shareFailed || 'Share failed');
      return;
    }
  }

  // Web Share API not available - use minimal fallback: copy to clipboard
  try {
    const shareText = buildNoteShareText(note);
    if (!shareText || shareText.trim().length === 0) {
      showToast('No content to share');
      return;
    }

    // Use the modern navigator.clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareText);
      showToast('Note copied to clipboard');
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        // ignore
      }
      document.body.removeChild(textarea);
      showToast('Note copied to clipboard');
    }
  } catch (err) {
    showToast('Failed to copy to clipboard');
  }
}
function buildNoteShareText(note) {
  if (!note) return '';

  const t = translations[state.locale] || translations.en;
  const title = note.title || t.untitled || 'Untitled';
  const body = note.body || '';

  // Build shareable text with title and body
  let text = `${title}\n\n`;

  if (body.trim()) {
    text += `${body}\n\n`;
  }

  // Add table representation if note has bodyBlocks with tables
  // This preserves table cell content (Arabic/English/numbers/mixed)
  const bodyBlocks = note.bodyBlocks || [];
  const hasTable = bodyBlocks.some(b => b.type === 'table');
  if (hasTable) {
    text += '\nTable:\n';
    for (const block of bodyBlocks) {
      if (block.type === 'table' && block.rows) {
        const header = block.header ? ' (with header)' : '';
        text += `-${header}\n`;
        for (const row of block.rows) {
          const cellTexts = row.map(cell => cell.text || '').filter(t => t.trim());
          if (cellTexts.length > 0) {
            text += '  ' + cellTexts.join(' | ') + '\n';
          }
        }
      }
    }
  }

  // Add note info
  text += `— Exported from EQ7 Calculator`;

  return text;
}

function scheduleNoteSave() {
  // N03 — hide the Saved ✓ indicator while edits are pending (debounced save follows).
  if (noteSavedIndicator) noteSavedIndicator.classList.remove('show');
  if (state.noteSaveTimer) clearTimeout(state.noteSaveTimer);
  state.noteSaveTimer = setTimeout(() => {
    saveCurrentOpenNote();
  }, 350);
}

function deleteNote(noteId) {
  const note = state.noteData.notes.find(n => n.id === noteId);
  if (note) {
    note.deletedAt = Date.now();
    note.originalFolderId = note.folderId;
    saveNotesData();
    if (state.currentNotesView === 'deleted') {
      renderDeletedNotes();
    } else {
      renderNotes();
    }
  }
}

function restoreNote(noteId) {
  const note = state.noteData.notes.find(n => n.id === noteId);
  if (note) {
    if (note.originalFolderId) {
      note.folderId = note.originalFolderId;
      delete note.originalFolderId;
    }
    delete note.deletedAt;
    saveNotesData();
    renderDeletedNotes();
  }
}

function permanentDeleteNote(noteId) {
  const wasCurrent = state.currentOpenNote && state.currentOpenNote.id === noteId;
  state.noteData.notes = state.noteData.notes.filter(n => n.id !== noteId);
  saveNotesData();
  if (wasCurrent) {
    closeFullScreenNote();
  }
  if (state.currentNotesView === 'deleted') {
    renderDeletedNotes();
  }
}

function getActiveNotes() {
  return state.noteData.notes.filter(n => !n.deletedAt);
}

function getDeletedNotes() {
  return state.noteData.notes
    .filter(n => n.deletedAt)
    .sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

function switchNotesView(view) {
  state.currentNotesView = view;
  if (navNotesBtn) navNotesBtn.classList.toggle('active', view === 'notes');
  if (navDeletedBtn) navDeletedBtn.classList.toggle('active', view === 'deleted');
  if (notesListPanel) notesListPanel.classList.toggle('hidden', view !== 'notes');
  if (deletedListPanel) deletedListPanel.classList.toggle('hidden', view !== 'deleted');
  if (view === 'notes') {
    renderNotes();
  } else {
    renderDeletedNotes();
  }
}

// --- N02 — Notes Home: search / sort / relative time / card helpers ---

function noteSearchText(note) {
  let text = (note.title || '') + ' ' + (note.body || '');
  if (Array.isArray(note.bodyBlocks)) {
    try { text += ' ' + JSON.stringify(note.bodyBlocks); } catch (e) { /* ignore */ }
  }
  return text.toLowerCase();
}

function noteRelativeTime(note) {
  const t = translations[state.locale] || translations.en;
  const ts = note.updatedAt || note.createdAt || Date.now();
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return t.updatedToday || 'Updated today';
  if (days === 1) return t.updatedYesterday || 'Updated yesterday';
  return (t.updatedDaysAgo || 'Updated {n} days ago').replace('{n}', String(days));
}

function sortNotesHomeList(notes) {
  const mode = state.noteSort || 'newest';
  const list = notes.slice();
  if (mode === 'az') {
    // Deterministic A–Z: named notes alphabetical, untitled/empty-titled last.
    const named = list.filter((n) => (n.title || '').trim());
    const unnamed = list.filter((n) => !(n.title || '').trim());
    named.sort((a, b) => (a.title || '').localeCompare(b.title || '', state.locale));
    const sorted = named.concat(unnamed);
    // Pinned notes always float to the top (stable, secondary to the chosen sort).
    sorted.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return sorted;
  } else if (mode === 'oldest') {
    // PART 10 — Sort "Oldest": ascending by last-modified (fallback to created).
    list.sort((a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0));
  } else {
    list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
  }
  // Pinned notes always float to the top (stable, secondary to the chosen sort).
  list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  return list;
}

function getNotesHomeList() {
  const q = (state.noteSearch || '').trim().toLowerCase();
  // With an active query, search spans ALL folders; otherwise show the active folder view.
  const source = q ? getActiveNotes() : getNotesForActiveFolder();
  const filtered = q ? source.filter(n => noteSearchText(n).includes(q)) : source;
  return sortNotesHomeList(filtered);
}

function closeNoteMenus(except) {
  document.querySelectorAll('#notesList .note-menu.open').forEach(menu => {
    if (menu !== except) menu.classList.remove('open');
  });
}

function renameNoteById(noteId) {
  const note = state.noteData.notes.find(n => n.id === noteId);
  if (!note) return;
  const t = translations[state.locale] || translations.en;
  const answer = window.prompt(t.noteNamePrompt || 'Note name:', note.title || '');
  if (answer === null) return;
  const trimmed = answer.trim();
  if (!trimmed) {
    window.alert(t.noteEmptyName || 'Note name cannot be empty.');
    return;
  }
  note.title = trimmed;
  note.updatedAt = Date.now();
  saveNotesData();
  renderNotes();
}

function duplicateNoteById(noteId) {
  const note = state.noteData.notes.find(n => n.id === noteId);
  if (!note) return;
  const t = translations[state.locale] || translations.en;
  const copy = JSON.parse(JSON.stringify(note));
  copy.id = 'note-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  copy.title = (note.title || '') + (t.copySuffix || ' (copy)');
  copy.createdAt = Date.now();
  copy.updatedAt = Date.now();
  copy.pinned = false;
  const idx = state.noteData.notes.findIndex(n => n.id === noteId);
  state.noteData.notes.splice(idx >= 0 ? idx + 1 : state.noteData.notes.length, 0, copy);
  saveNotesData();
  renderNotes();
}

function toggleNotePin(noteId) {
  const note = state.noteData.notes.find(n => n.id === noteId);
  if (!note) return;
  note.pinned = !note.pinned;
  saveNotesData();
  renderNotes();
}

const PIN_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>';
const MORE_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';


function renderNotes() {
  if (!notesList) return;
  const notes = getNotesHomeList();
  const t = translations[state.locale] || translations.en;
  const query = (state.noteSearch || '').trim();
  const totalActive = getActiveNotes().length;

  notesList.innerHTML = notes.map(note => {
    const preview = (note.body || '').slice(0, 80);
    const pinLabel = note.pinned ? (t.unpinNote || 'Unpin') : (t.pinNote || 'Pin');
    return `
      <li class="note-item ${note.pinned ? 'pinned' : ''}" data-note-id="${note.id}">
        <div class="note-item-main">
          <span class="note-item-title">${escapeHtml(note.title || t.untitled || 'Untitled')}</span>
          ${preview ? `<span class="note-item-preview">${escapeHtml(preview)}</span>` : ''}
          <span class="note-item-meta">${escapeHtml(noteRelativeTime(note))}</span>
        </div>
        ${note.pinned ? `<span class="note-pin-badge" title="${escapeHtml(t.unpinNote || 'Unpin')}" aria-label="${escapeHtml(t.unpinNote || 'Unpin')}">${PIN_SVG}</span>` : ''}
        <button class="note-menu-btn" type="button" data-action="menu" data-note-id="${note.id}" aria-label="${escapeHtml(t.noteMoreActions || 'More actions')}" title="${escapeHtml(t.noteMoreActions || 'More actions')}">${MORE_SVG}</button>
        <div class="note-menu hidden" role="menu">
          <button type="button" role="menuitem" data-action="rename" data-note-id="${note.id}">${escapeHtml(t.renameNote || 'Rename')}</button>
          <button type="button" role="menuitem" data-action="duplicate" data-note-id="${note.id}">${escapeHtml(t.duplicateNote || 'Duplicate')}</button>
          <button type="button" role="menuitem" data-action="pin" data-note-id="${note.id}">${escapeHtml(pinLabel)}</button>
          <button type="button" role="menuitem" class="danger" data-action="delete" data-note-id="${note.id}">${escapeHtml(t.deleteNoteBtn || 'Delete')}</button>
        </div>
      </li>`;
  }).join('');

  // Empty states: "no notes at all" vs "no search results" (distinct, per N02 §6/§15).
  if (notesEmptyState) notesEmptyState.classList.toggle('hidden', !(totalActive === 0 && !query));
  if (notesSearchEmpty) notesSearchEmpty.classList.toggle('hidden', !(query && notes.length === 0));
}

function renderDeletedNotes() {
  if (!deletedNotesList) return;
  const notes = getDeletedNotes();
  const t = translations[state.locale] || translations.en;
  deletedNotesList.innerHTML = notes.map(note => {
    const dateStr = new Date(note.deletedAt || Date.now()).toLocaleDateString(state.locale, {
      month: 'short', day: 'numeric'
    });
    return `
      <li class="note-item" data-note-id="${note.id}">
        <div class="note-item-main">
          <span class="note-item-title">${escapeHtml(note.title || t.untitled || 'Untitled')}</span>
          <span class="note-item-meta">${t.deleteConfirmText || 'Deleted'} · ${escapeHtml(dateStr)}</span>
        </div>
        <div class="note-item-actions">
          <button class="note-action-btn restore" data-action="restore" data-note-id="${note.id}" aria-label="Restore" title="${t.restoreBtn || 'Restore'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="note-action-btn danger" data-action="permanent-delete" data-note-id="${note.id}" aria-label="Delete permanently" title="${t.deletePermanentBtn || 'Delete'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </li>`;
  }).join('');

  if (deletedEmptyState) deletedEmptyState.classList.toggle('hidden', notes.length > 0);
}

function renderFolderTabs() {
  if (!folderTabsScroll) return;
  const t = translations[state.locale] || translations.en;
  const active = getActiveFolder();
  const unfiledNotes = getActiveNotes().filter(n => !n.folderId || !state.folders.some(f => f.id === n.folderId));
  const unfiledLabel = escapeHtml(t.unfiled || 'Unfiled') + (unfiledNotes.length ? ` (${unfiledNotes.length})` : '');
  const unfiledTab = `<button class="folder-tab ${active === UNFILED_FOLDER_ID ? 'active' : ''}" data-folder-id="${UNFILED_FOLDER_ID}" type="button">${unfiledLabel}</button>`;
  const folderTabs = state.folders.map(folder => {
    const isActive = folder.id === active;
    // Localize the untouched system default "Personal" folder at render time only;
    // never modify the stored folder name (preserves any user rename).
    const folderLabel = (folder.id === 'personal' && folder.name === 'Personal')
      ? (t.folderPersonal || folder.name)
      : folder.name;
    return `<span class="folder-tab-group ${isActive ? 'active' : ''}" data-folder-id="${folder.id}">
      <button class="folder-tab ${isActive ? 'active' : ''}" data-folder-id="${folder.id}" type="button">${escapeHtml(folderLabel)}</button>
      <button class="folder-tab-btn rename" data-action="rename" data-folder-id="${folder.id}" type="button" title="${escapeHtml(t.renameFolder || 'Rename folder')}" aria-label="${escapeHtml(t.renameFolder || 'Rename folder')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button>
      <button class="folder-tab-btn delete" data-action="delete" data-folder-id="${folder.id}" type="button" title="${escapeHtml(t.deleteFolder || 'Delete folder')}" aria-label="${escapeHtml(t.deleteFolder || 'Delete folder')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
    </span>`;
  }).join('');
  folderTabsScroll.innerHTML = unfiledTab + folderTabs;
}

function showDeleteConfirm(noteId) {
  state.pendingDeleteNoteId = noteId;
  if (deleteConfirmModal) {
    deleteConfirmModal.classList.add('show');
    deleteConfirmModal.setAttribute('aria-hidden', 'false');
  }
}

function hideDeleteConfirm() {
  state.pendingDeleteNoteId = null;
  if (deleteConfirmModal) {
    deleteConfirmModal.classList.remove('show');
    deleteConfirmModal.setAttribute('aria-hidden', 'true');
  }
}

function handleNotesListClick(e) {
  const item = e.target.closest('.note-item');
  if (!item) return;
  const noteId = item.getAttribute('data-note-id');
  openFullScreenNote(noteId);
}

function handleFolderClick(e) {
  const deleteBtn = e.target.closest('.folder-delete-btn');
  if (deleteBtn) {
    const folderId = deleteBtn.getAttribute('data-folder-id');
    deleteFolder(folderId);
    return;
  }
  const item = e.target.closest('.folder-item');
  if (item) {
    const folderId = item.getAttribute('data-folder-id');
    setActiveFolder(folderId);
    renderFolders();
  }
}

// ============================================================
// QUICK NOTES
// ============================================================
export function getQuickNoteLabels(locale) {
  const labels = {
    en: { title: 'Quick Notes', addButton: '+ New Note', placeholder: 'Write a note' },
    ar: { title: 'الملاحظات السريعة', addButton: '+ ملاحظة جديدة', placeholder: 'اكتب ملاحظة' },
    es: { title: 'Notas rápidas', addButton: '+ Nueva nota', placeholder: 'Escribe una nota' },
    fr: { title: 'Notes rapides', addButton: '+ Nouvelle note', placeholder: 'Écrire une note' },
    ru: { title: 'Быстрые заметки', addButton: '+ Новая заметка', placeholder: 'Напишите заметку' },
    de: { title: 'Schnellnotizen', addButton: '+ Neue Notiz', placeholder: 'Notiz schreiben' },
    tr: { title: 'Hızlı Notlar', addButton: '+ Yeni Not', placeholder: 'Not yaz' }
  };
  return labels[locale] || labels.en;
}

function addQuickNote(text) {
  if (!text || !text.trim()) return;
  const note = {
    id: Date.now().toString(36),
    text: text.trim(),
    createdAt: Date.now()
  };
  state.notes.unshift(note);
  if (state.notes.length > 20) state.notes = state.notes.slice(0, 20);
  saveQuickNotes();
  renderQuickNotesFallback();
}

function addGeneralQuickNote(text) {
  if (!text || !text.trim()) return;
  const note = {
    id: Date.now().toString(36),
    text: text.trim(),
    createdAt: Date.now()
  };
  state.quickNotes.unshift(note);
  if (state.quickNotes.length > 20) state.quickNotes = state.quickNotes.slice(0, 20);
  saveGeneralQuickNotes();
  renderQuickNotesFallback();
}

function deleteQuickNote(id, source) {
  if (source === 'general') {
    state.quickNotes = state.quickNotes.filter(n => n.id !== id);
    saveGeneralQuickNotes();
  } else {
    state.notes = state.notes.filter(n => n.id !== id);
    saveQuickNotes();
  }
  renderQuickNotesFallback();
}

function saveQuickNotes() {
  try {
    localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(state.notes));
  } catch (e) { /* ignore */ }
}

function saveGeneralQuickNotes() {
  try {
    localStorage.setItem(QUICK_NOTES_KEY, JSON.stringify(state.quickNotes));
  } catch (e) { /* ignore */ }
}

function loadQuickNotes() {
  try {
    const stored = localStorage.getItem(NOTE_STORAGE_KEY);
    state.notes = stored ? JSON.parse(stored) : [];
    const storedGeneral = localStorage.getItem(QUICK_NOTES_KEY);
    state.quickNotes = storedGeneral ? JSON.parse(storedGeneral) : [];
  } catch (e) {
    state.notes = [];
    state.quickNotes = [];
  }
}

function renderQuickNotesFallback() {
  // Legacy UI elements may not exist; this is a fallback for storage-only quick notes
}

function renderQuickNotes() {
  renderQuickNotesFallback();
}

function toggleQuickNotesPanel() {
  // Legacy panel may not exist
}

// ============================================================
// CURRENCY UI
// ============================================================
function setCurrencyStatus(message, isError = false) {
  if (currencyStatusMessage) {
    currencyStatusMessage.textContent = message;
    currencyStatusMessage.classList.toggle('error', isError);
  }
}

function fetchCurrencyRates() {
  return new Promise((resolve, reject) => {
    if (!currencyServiceInstance) {
      reject(new Error('Currency service not initialized'));
      return;
    }
    currencyServiceInstance.refreshCurrencyData()
      .then(() => {
        state.rates = currencyServiceInstance.getState().rates;
        state.ratesLastUpdated = currencyServiceInstance.getLastUpdated();
        resolve(state.rates);
      })
      .catch(reject);
  });
}

async function initializeCurrencyServiceInBackground() {
  try {
    currencyServiceInstance = CurrencyService;
    const result = await currencyServiceInstance.initializeCurrencyService();
    state.rates = result.rates;
    state.ratesLastUpdated = currencyServiceInstance.getLastUpdated();
    state.ratesStatus = currencyServiceInstance.isUsingCachedData() ? 'cached' : 'ready';
    updateCurrencyUI();
    populateCurrencySelects();
    if (currencyStatusMessage) {
      const cached = currencyServiceInstance.isUsingCachedData();
      if (currencyServiceInstance.getError()) {
        setCurrencyStatus('Rates unavailable - using cached rates', true);
      } else {
        setCurrencyStatus('Rates updated');
      }
      if (cacheIndicator) {
        cacheIndicator.style.display = cached ? 'flex' : 'none';
      }
    }
    updateConverterOutput();
  } catch (e) {
    console.error('Currency service init failed:', e);
    setCurrencyStatus('Currency service unavailable', true);
  }
}

function populateCurrencySelects() {
  if (!currencyServiceInstance) return;
  const catalog = currencyServiceInstance.getCatalog();
  if (!catalog || !catalog.length) return;

  const optionsHTML = catalog.map(c =>
    `<option value="${c.code}">${c.flag} ${c.code} — ${escapeHtml(c.name)}</option>`
  ).join('');

  if (currencyFromSelect) {
    currencyFromSelect.innerHTML = optionsHTML;
    currencyFromSelect.value = 'USD';
  }
  if (currencyToSelect) {
    currencyToSelect.innerHTML = optionsHTML;
    currencyToSelect.value = 'IQD';
  }
  updateCurrencyUI();
}

function updateCurrencyUI() {
  if (!currencyServiceInstance) return;
  const state_ = currencyServiceInstance.getState();
  state.currencyFrom = state_.catalog.find(c => c.code === 'USD') || null;
  state.currencyTo = state_.catalog.find(c => c.code === 'IQD') || null;
  const fromCode = currencyFromSelect ? currencyFromSelect.value : 'USD';
  const toCode = currencyToSelect ? currencyToSelect.value : 'IQD';
  updateFavoriteButtons(fromCode, toCode);
  updateConverterOutput();
}

function expandScientific(str) {
  if (!str.includes('e') && !str.includes('E')) return str;
  const [mantissa, expStr] = str.split(/[eE]/);
  const exp = parseInt(expStr, 10);
  const [intPart, fracPart = ''] = mantissa.split('.');
  const digits = intPart + fracPart;
  const decimalPos = intPart.length + exp;
  if (decimalPos <= 0) {
    return '0.' + '0'.repeat(-decimalPos) + digits;
  }
  if (decimalPos >= digits.length) {
    return digits + '0'.repeat(decimalPos - digits.length);
  }
  return digits.slice(0, decimalPos) + '.' + digits.slice(decimalPos);
}

function formatCleanNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  const num = Number(value);
  if (isNaN(num)) return '0';
  if (!isFinite(num)) return String(num);
  // Use 15 significant digits to round away floating-point artifacts
  // while preserving meaningful precision for display.
  let cleaned;
  try {
    cleaned = num.toPrecision(15);
  } catch (e) {
    return formatNumber(String(num));
  }
  // Expand scientific notation to a plain decimal string
  cleaned = expandScientific(cleaned);
  // Limit display to a maximum of 2 decimal places for converter output,
  // showing no decimals for whole numbers (trailing zeros are trimmed below).
  let rounded = Number(cleaned).toFixed(2);
  if (rounded === 'NaN') {
    rounded = cleaned;
  }
  rounded = expandScientific(rounded);
  // Trim trailing zeros (and trailing decimal point)
  rounded = rounded.replace(/\.?0+$/, '');
  // Add thousands separators
  return formatNumber(rounded);
}

// Update the flag + label shown on the From/To currency strips based on the
// currently selected currency. Arabic shows "flag Localized Name — CODE",
// other locales show the simpler "flag CODE" (cleaner non-Arabic UI).
function updateConverterStrips() {
  if (!currencyServiceInstance) return;
  const fromCode = currencyFromSelect ? currencyFromSelect.value : '';
  const toCode = currencyToSelect ? currencyToSelect.value : '';
  const isArabic = (state.locale || '') === 'ar';
  const fromCur = fromCode ? currencyServiceInstance.getCurrencyByCode(fromCode) : null;
  const toCur = toCode ? currencyServiceInstance.getCurrencyByCode(toCode) : null;
  if (converterFromFlag) converterFromFlag.textContent = fromCur ? fromCur.flag : '';
  if (converterToFlag) converterToFlag.textContent = toCur ? toCur.flag : '';
  if (converterFromLabel) {
    converterFromLabel.textContent = fromCur
      ? (isArabic ? `${getLocalizedCurrencyName(fromCur)} — ${fromCur.code}` : fromCur.code)
      : '';
  }
  if (converterToLabel) {
    converterToLabel.textContent = toCur
      ? (isArabic ? `${getLocalizedCurrencyName(toCur)} — ${toCur.code}` : toCur.code)
      : '';
  }
}

function updateConverterOutput() {
  if (!currencyServiceInstance || !currencyFromSelect || !currencyToSelect || !currencyFromAmount) return;
  updateConverterStrips();
  const fromCode = currencyFromSelect.value;
  const toCode = currencyToSelect.value;
  const amount = parseFloat(currencyFromAmount.value);

  let result = 0;
  if (!isNaN(amount)) {
    if (state.converterMode === 'market' && state.marketRate !== null) {
      // Use Decimal for precise market rate calculation
      try {
        result = new Decimal(String(amount)).mul(new Decimal(String(state.marketRate))).toNumber();
      } catch (e) {
        result = amount * state.marketRate;
      }
    } else {
      result = currencyServiceInstance.convertCurrency(amount, fromCode, toCode);
    }
  }

  const displayResult = formatCleanNumber(result);

  if (currencyToAmount) {
    currencyToAmount.textContent = displayResult;
  }

  // Update rate display
  if (conversionRateDisplay) {
    const rate = state.converterMode === 'market' && state.marketRate !== null
      ? state.marketRate
      : currencyServiceInstance.convertCurrency(1, fromCode, toCode);
    const rateText = `1 ${fromCode} = ${formatCleanNumber(rate)} ${toCode}`;
    conversionRateDisplay.textContent = rateText;
  }

  // Update market rate field
  if (marketRatePrefix) marketRatePrefix.textContent = `1 ${fromCode} =`;
  if (marketRateSuffix) marketRateSuffix.textContent = toCode;
  if (marketRateField) {
    marketRateField.hidden = state.converterMode !== 'market';
  }

  // Update words display: number written in words followed by the localized
  // currency name, reusing the existing Number-To-Words system.
  if (currencyWords && result !== 0) {
    const toCur = toCode ? currencyServiceInstance.getCurrencyByCode(toCode) : null;
    const currencyName = toCur ? getLocalizedCurrencyName(toCur) : '';
    // numberToWords expects a plain decimal string, but the on-screen
    // displayResult contains thousands separators (e.g. "1,250.5") which the
    // engine cannot parse (it returns "invalid number"). Strip the commas so
    // the words match the visible number exactly, without changing it.
    const wordsValue = displayResult.replace(/,/g, '');
    currencyWords.textContent = currencyName
      ? `${numberToWords(wordsValue, state.locale)} ${currencyName}`
      : numberToWords(wordsValue, state.locale);
  } else if (currencyWords) {
    currencyWords.textContent = '';
  }
}

function updateFavoriteButtons(fromCode, toCode) {
  if (!currencyServiceInstance) return;
  const isFromFav = currencyServiceInstance.isFavorite(fromCode);
  const isToFav = currencyServiceInstance.isFavorite(toCode);
  if (favoriteFromButton) {
    const icon = favoriteFromButton.querySelector('i');
    if (icon) {
      icon.className = isFromFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
    }
    favoriteFromButton.classList.toggle('active', isFromFav);
  }
  if (favoriteToButton) {
    const icon = favoriteToButton.querySelector('i');
    if (icon) {
      icon.className = isToFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
    }
    favoriteToButton.classList.toggle('active', isToFav);
  }
}

function swapCurrencies() {
  if (!currencyFromSelect || !currencyToSelect) return;
  const from = currencyFromSelect.value;
  const to = currencyToSelect.value;
  currencyFromSelect.value = to;
  currencyToSelect.value = from;
  if (currencyServiceInstance) {
    currencyServiceInstance.addToRecent(from);
    currencyServiceInstance.addToRecent(to);
  }
  updateFavoriteButtons(currencyFromSelect.value, currencyToSelect.value);
  updateConverterOutput();
}

function toggleFavorite(side) {
  if (!currencyServiceInstance) return;
  const code = side === 'from'
    ? (currencyFromSelect ? currencyFromSelect.value : null)
    : (currencyToSelect ? currencyToSelect.value : null);
  if (!code) return;
  if (currencyServiceInstance.isFavorite(code)) {
    currencyServiceInstance.removeFromFavorites(code);
  } else {
    currencyServiceInstance.addToFavorites(code);
  }
  updateFavoriteButtons(
    currencyFromSelect ? currencyFromSelect.value : '',
    currencyToSelect ? currencyToSelect.value : ''
  );
}

function showFavoritesList() {
  if (!currencyServiceInstance || !currencyFromSelect || !currencyToSelect) return;
  const favorites = currencyServiceInstance.getFavorites();
  const codes = favorites.map(f => f.code);
  if (!codes.length) {
    showToast('No favorites yet');
    return;
  }
  const currentFrom = currencyFromSelect.value;
  currencyFromSelect.innerHTML = codes.map(code => {
    const c = currencyServiceInstance.getCurrencyByCode(code);
    return c ? `<option value="${c.code}">${c.flag} ${c.code}</option>` : '';
  }).join('');
  currencyFromSelect.value = currentFrom;
  updateFavoriteButtons(currencyFromSelect.value, currencyToSelect.value);
  updateConverterOutput();
}

function showRecentList() {
  if (!currencyServiceInstance || !currencyFromSelect || !currencyToSelect) return;
  const recent = currencyServiceInstance.getRecent();
  const codes = recent.map(r => r.code);
  if (!codes.length) {
    showToast('No recent currencies');
    return;
  }
  const currentFrom = currencyFromSelect.value;
  currencyFromSelect.innerHTML = codes.map(code => {
    const c = currencyServiceInstance.getCurrencyByCode(code);
    return c ? `<option value="${c.code}">${c.flag} ${c.code}</option>` : '';
  }).join('');
  currencyFromSelect.value = currentFrom;
  updateFavoriteButtons(currencyFromSelect.value, currencyToSelect.value);
  updateConverterOutput();
}

function handleCurrencySearch(event) {
  if (!currencyServiceInstance || !currencyList) return;
  const query = event.target.value;
  const results = currencyServiceInstance.searchCurrencies(query);
  currencyList.innerHTML = results.map(c => `
    <li class="currency-list-item" data-code="${c.code}">
      <span class="currency-flag">${c.flag}</span>
      <span class="currency-code">${c.code}</span>
      <span class="currency-name">${escapeHtml(c.name)}</span>
      <span class="currency-country">${escapeHtml(c.country)}</span>
    </li>
  `).join('');
}

function renderCurrencyDirectoryWithService() {
  if (!currencyServiceInstance || !currencyList) return;
  const catalog = currencyServiceInstance.getCatalog();
  if (!catalog || !catalog.length) {
    currencyList.innerHTML = '<li class="empty-list">Loading...</li>';
    return;
  }
  currencyList.innerHTML = catalog.map(c => `
    <li class="currency-list-item" data-code="${c.code}">
      <span class="currency-flag">${c.flag}</span>
      <span class="currency-code">${c.code}</span>
      <span class="currency-name">${escapeHtml(c.name)}</span>
      <span class="currency-country">${escapeHtml(c.country)}</span>
    </li>
  `).join('');
}

function openCurrencyDirectory() {
  if (currencyDirectoryModal) {
    currencyDirectoryModal.classList.add('show');
    currencyDirectoryModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  renderCurrencyDirectoryWithService();
  if (currencySearchInput) {
    currencySearchInput.value = '';
  }
}

function closeCurrencyDirectory() {
  if (currencyDirectoryModal) {
    currencyDirectoryModal.classList.remove('show');
    currencyDirectoryModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// ============================================================
// CURRENCY RATES SCREEN (accessed via Currency Menu -> Search Currency)
// ============================================================
// Localized (Arabic) names for the supported ISO codes. English names come
// straight from CurrencyService; these are only used when the app is Arabic.
const CURRENCY_NAMES_AR = {
  AED: 'درهم إماراتي', AFN: 'أفغاني', ALL: 'ليك ألباني', AMD: 'درام أرميني',
  AOA: 'كوانزا أنغولي', ARS: 'بيزو أرجنتيني', AUD: 'دولار أسترالي',
  AZN: 'مانات أذربيجاني', BAM: 'مارك بوسني', BBD: 'دولار باربادوسي',
  BDT: 'تاكا بنغلاديشي', BGN: 'ليف بلغاري', BHD: 'دينار بحريني',
  BIF: 'فرنك بوروندي', BND: 'دولار بروناي', BOB: 'بوليفيانو بوليفي',
  BRL: 'ريال برازيلي', BWP: 'بولا بوتسواني', BYN: 'روبل بيلاروسي',
  CAD: 'دولار كندي', CHF: 'فرنك سويسري', CLP: 'بيزو تشيلي',
  CNY: 'يوان صيني', COP: 'بيزو كولومبي', CRC: 'كولون كوستاريكي',
  CZK: 'كورونا تشيكية', DKK: 'كرونة دنماركية', DOP: 'بيزو دومينيكي',
  DZD: 'دينار جزائري', EGP: 'جنيه مصري', ETB: 'بير إثيوبي', EUR: 'يورو',
  GBP: 'جنيه إسترليني', GEL: 'لاري جورجي', GHS: 'سيدي غاني',
  GTQ: 'كتزل غواتيمالي', HKD: 'دولار هونغ كونغ', HNL: 'لمبيرة هندوراسية',
  HTG: 'جورد هايتي', HUF: 'فورنت مجري', IDR: 'روبية إندونيسية',
  ILS: 'شيكل إسرائيلي', INR: 'روبية هندية', IQD: 'دينار عراقي',
  IRR: 'ريال إيراني', ISK: 'كرونة آيسلندية', JMD: 'دولار جامايكي',
  JOD: 'دينار أردني', JPY: 'ين ياباني', KES: 'شلن كيني',
  KGS: 'سوم قيرغيزي', KHR: 'ريال كمبودي', KRW: 'وون كوري جنوبي',
  KWD: 'دينار كويتي', KZT: 'تنغي كازاخستاني', LAK: 'كيب لاوسي',
  LBP: 'ليرة لبنانية', LKR: 'روبية سريلانكية', MAD: 'درهم مغربي',
  MGA: 'أرياري مدغشقري', MKD: 'دينار مقدوني', MUR: 'روبية موريشيوسية',
  MXN: 'بيزو مكسيكي', MYR: 'رينغيت ماليزي', NGN: 'نيرة نيجيرية',
  NOK: 'كرونة نرويجية', NPR: 'روبية نيبالية', NZD: 'دولار نيوزيلندي',
  OMR: 'ريال عماني', PAB: 'بالبوا بنمي', PEN: 'سول بيروفي',
  PHP: 'بيزو فلبيني', PKR: 'روبية باكستانية', PLN: 'زلوتي بولندي',
  QAR: 'ريال قطري', RON: 'ليو روماني', RSD: 'دينار صربي',
  RUB: 'روبل روسي', SAR: 'ريال سعودي', SEK: 'كرونة سويدية',
  SGD: 'دولار سنغافوري', THB: 'بات تايلاندي', TRY: 'ليرة تركية',
  TTD: 'دولار ترينيداد وتوباغو', TWD: 'دولار تايواني',
  UAH: 'هريفنا أوكرانية', USD: 'دولار أمريكي', UZS: 'سوم أوزبكي',
  VND: 'دونغ فيتنامي', ZAR: 'راند جنوب أفريقي', ZMW: 'كواشا زامبي'
};

function getLocalizedCurrencyName(currency) {
  if (!currency) return '';
  if ((state.locale || '') === 'ar') {
    return CURRENCY_NAMES_AR[currency.code] || currency.name || currency.code;
  }
  return currency.name || currency.code;
}

function getCurrencyRatesBase() {
  if (currencyServiceInstance && currencyServiceInstance.getState) {
    return currencyServiceInstance.getState().base || 'USD';
  }
  return 'USD';
}

// Format a rate value with commas and up to 4 decimals (matches service style).
function formatRatesValue(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    }).format(value);
  } catch (e) {
    return String(value);
  }
}

function currencyRatesRateText(code) {
  if (!currencyServiceInstance) return '';
  const base = getCurrencyRatesBase();
  let rate = 1;
  try {
    rate = currencyServiceInstance.getExchangeRate ? currencyServiceInstance.getExchangeRate(code) : null;
  } catch (e) {
    rate = null;
  }
  if (rate === null || rate === undefined || isNaN(rate)) return '';
  return `1 ${base} = ${formatRatesValue(rate)} ${code}`;
}

function setCurrencyRatesStatus(message, type) {
  if (!currencyRatesStatus) return;
  currencyRatesStatus.textContent = message || '';
  currencyRatesStatus.hidden = !message;
  currencyRatesStatus.className = 'currency-rates-status' + (type ? ' ' + type : '');
}

function renderCurrencyRates() {
  if (!currencyRatesList) return;
  const t = translations[state.locale] || translations.en;

  if (!currencyServiceInstance) {
    setCurrencyRatesStatus(t.currencyRatesLoading || 'Loading rates…', 'loading');
    currencyRatesList.innerHTML = '';
    return;
  }

  const catalog = currencyServiceInstance.getCatalog();
  if (!catalog || !catalog.length) {
    setCurrencyRatesStatus(t.currencyRatesLoading || 'Loading rates…', 'loading');
    currencyRatesList.innerHTML = '';
    return;
  }

  const query = currencyRatesSearchInput ? (currencyRatesSearchInput.value || '').trim().toLowerCase() : '';
  const results = catalog.filter(c => {
    if (!query) return true;
    return (
      (c.code || '').toLowerCase().includes(query) ||
      (c.name || '').toLowerCase().includes(query) ||
      (c.country || '').toLowerCase().includes(query) ||
      (getLocalizedCurrencyName(c) || '').toLowerCase().includes(query)
    );
  });

  setCurrencyRatesStatus('', '');

  if (!results.length) {
    setCurrencyRatesStatus(t.currencyRatesEmpty || 'No currencies found', 'empty');
    currencyRatesList.innerHTML = '';
    return;
  }

  const serviceErr = currencyServiceInstance.getError ? currencyServiceInstance.getError() : null;
  const hasRates = currencyServiceInstance.getState() && currencyServiceInstance.getState().rates &&
    Object.keys(currencyServiceInstance.getState().rates).length > 0;

  currencyRatesList.innerHTML = results.map(c => {
    const isFav = currencyServiceInstance && currencyServiceInstance.isFavorite ? currencyServiceInstance.isFavorite(c.code) : false;
    const rateText = currencyRatesRateText(c.code);
    const priceHtml = rateText
      ? `<span class="currency-rates-price">${escapeHtml(rateText)}</span>`
      : `<span class="currency-rates-price muted">—</span>`;
    const starIcon = isFav ? 'fa-solid fa-star' : 'fa-regular fa-star';
    return `
      <li class="currency-rates-item" data-code="${escapeHtml(c.code)}">
        <span class="currency-rates-flag">${c.flag}</span>
        <span class="currency-rates-info">
          <span class="currency-rates-code">${escapeHtml(c.code)}</span>
          <span class="currency-rates-name">${escapeHtml(getLocalizedCurrencyName(c))}</span>
        </span>
        <span class="currency-rates-right">
          ${priceHtml}
          <button class="currency-rates-fav${isFav ? ' active' : ''}" data-code="${escapeHtml(c.code)}" type="button" aria-label="Toggle favorite">
            <i class="${starIcon}"></i>
          </button>
        </span>
      </li>
    `;
  }).join('');

  if (serviceErr && !hasRates) {
    setCurrencyRatesStatus(t.currencyRatesError || 'Rates unavailable', 'error');
  }
}

function openCurrencyRates() {
  closeCurrencyConverter();
  if (currencyRatesModal) {
    currencyRatesModal.classList.add('show');
    currencyRatesModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  if (currencyRatesSearchInput) currencyRatesSearchInput.value = '';
  renderCurrencyRates();
  if (currencyRatesSearchInput) {
    setTimeout(() => currencyRatesSearchInput.focus(), 100);
  }
}

function closeCurrencyRates() {
  if (currencyRatesModal) {
    currencyRatesModal.classList.remove('show');
    currencyRatesModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// ============================================================
// CURRENCY FAVORITES SCREEN (accessed via Currency Menu -> Favorites)
// ============================================================
function setCurrencyFavoritesStatus(message, type) {
  if (!currencyFavoritesStatus) return;
  currencyFavoritesStatus.textContent = message || '';
  currencyFavoritesStatus.hidden = !message;
  currencyFavoritesStatus.className = 'currency-favorites-status' + (type ? ' ' + type : '');
}

async function openCurrencyFavorites() {
  closeCurrencyConverter();
  if (currencyFavoritesModal) {
    currencyFavoritesModal.classList.add('show');
    currencyFavoritesModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  renderCurrencyFavorites();
  // Fetch the latest live prices automatically when the screen opens.
  // Rates come exclusively from the existing CurrencyService API (no hardcoded values).
  if (currencyServiceInstance && typeof currencyServiceInstance.refreshCurrencyData === 'function') {
    try {
      await currencyServiceInstance.refreshCurrencyData();
      state.rates = currencyServiceInstance.getState().rates;
    } catch (e) {
      // Keep current/cached rates if the network call fails.
    }
    renderCurrencyFavorites();
  }
}

function closeCurrencyFavorites() {
  if (currencyFavoritesModal) {
    currencyFavoritesModal.classList.remove('show');
    currencyFavoritesModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

function renderCurrencyFavorites() {
  if (!currencyFavoritesList) return;
  const t = translations[state.locale] || translations.en;
  if (currencyFavoritesEmpty) currencyFavoritesEmpty.hidden = true;
  setCurrencyFavoritesStatus('', '');

  if (!currencyServiceInstance) {
    setCurrencyFavoritesStatus(t.currencyRatesLoading || 'Loading favorites…', 'loading');
    currencyFavoritesList.innerHTML = '';
    return;
  }

  const favorites = currencyServiceInstance.getFavorites();
  if (!favorites.length) {
    currencyFavoritesList.innerHTML = '';
    if (currencyFavoritesEmpty) {
      currencyFavoritesEmpty.hidden = false;
      const textEl = currencyFavoritesEmpty.querySelector('[data-i18n="currencyFavoritesEmpty"]');
      if (textEl) textEl.textContent = t.currencyFavoritesEmpty || '';
      const hintEl = currencyFavoritesEmpty.querySelector('[data-i18n="currencyFavoritesEmptyHint"]');
      if (hintEl) hintEl.textContent = t.currencyFavoritesEmptyHint || '';
    }
    return;
  }

  currencyFavoritesList.innerHTML = favorites.map(c => {
    const rateText = currencyRatesRateText(c.code);
    const priceHtml = rateText
      ? `<span class="currency-favorites-price">${escapeHtml(rateText)}</span>`
      : `<span class="currency-favorites-price muted">—</span>`;
    return `
      <li class="currency-favorites-item" data-code="${escapeHtml(c.code)}">
        <span class="currency-favorites-flag">${c.flag}</span>
        <span class="currency-favorites-info">
          <span class="currency-favorites-code">${escapeHtml(c.code)}</span>
          <span class="currency-favorites-name">${escapeHtml(getLocalizedCurrencyName(c))}</span>
        </span>
        <span class="currency-favorites-right">
          ${priceHtml}
          <button class="currency-favorites-fav" data-code="${escapeHtml(c.code)}" type="button" aria-label="Remove from favorites">
            <i class="fa-solid fa-star"></i>
          </button>
        </span>
      </li>
    `;
  }).join('');
}

function openCurrencyConverter() {
  if (currencyConverterModal) {
    currencyConverterModal.classList.add('show');
    currencyConverterModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  if (currencyFromAmount) {
    currencyFromAmount.value = '1';
  }
  updateConverterOutput();
  focusCurrencyConverter();
}

function closeCurrencyConverter() {
  if (currencyConverterModal) {
    currencyConverterModal.classList.remove('show');
    currencyConverterModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

function focusCurrencyConverter() {
  if (currencyFromAmount) {
    setTimeout(() => currencyFromAmount.focus(), 100);
  }
}

// Speak the current converted result aloud, reusing the same localized speech
// behavior as the rest of the app. Tracks speaking state so that a second tap
// while speaking stops the audio immediately, and a later tap speaks again.
let currencySpeechActive = false;

function stopCurrencySpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // no-op
  }
  currencySpeechActive = false;
  if (currencySpeakButton) currencySpeakButton.classList.remove('speaking');
}

function speakCurrencyResult() {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Toggle: if currently reading, stop immediately.
    if (currencySpeechActive) {
      stopCurrencySpeech();
      return;
    }
    const text = currencyToAmount ? currencyToAmount.textContent : '';
    if (!text || text === '0' || text === '—') return;
    const utterance = new SpeechSynthesisUtterance(text);
    applySpeechLocale(utterance, state.locale);
    utterance.onstart = () => {
      currencySpeechActive = true;
      if (currencySpeakButton) currencySpeakButton.classList.add('speaking');
    };
    utterance.onend = () => {
      currencySpeechActive = false;
      if (currencySpeakButton) currencySpeakButton.classList.remove('speaking');
    };
    utterance.onerror = () => {
      currencySpeechActive = false;
      if (currencySpeakButton) currencySpeakButton.classList.remove('speaking');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Speech synthesis not available
  }
}

// Reset the conversion screen to its start state: clear the amount, clear the
// result, and leave the currency strips ready for a fresh selection. All other
// converter features (favorites, recent, mode, etc.) remain untouched.
function resetCurrencyConverter() {
  if (currencyFromAmount) currencyFromAmount.value = '';
  updateConverterOutput();
  if (currencyToAmount) currencyToAmount.textContent = '0';
  if (conversionRateDisplay) conversionRateDisplay.textContent = '—';
  if (currencyWords) currencyWords.textContent = '';
}

// ============================================================
// CUSTOM-RATE CONVERTER (تحويل بسعر مخصص)
// A minimal screen: the user enters an exchange rate and an
// amount; the result is simply  amount × rate  (no API involved).
// ============================================================
let customRateSpeechActive = false;

function openCustomRateConverter() {
  // Make sure other currency screens are not layered underneath.
  closeCurrencyConverter();
  closeCurrencyRates();
  if (customRateModal) {
    customRateModal.classList.add('show');
    customRateModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  updateCustomRateResult();
  if (customRateInput) {
    setTimeout(() => customRateInput.focus(), 100);
  }
}

function closeCustomRateConverter() {
  stopCustomRateSpeech();
  if (customRateModal) {
    customRateModal.classList.remove('show');
    customRateModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// Reset the whole screen back to its initial state: stop any speech,
// clear the rate, the amount, the result and the written-out words.
function resetCustomRateConverter() {
  stopCustomRateSpeech();
  if (customRateInput) customRateInput.value = '';
  if (customAmountInput) customAmountInput.value = '';
  if (customRateResult) customRateResult.textContent = '0';
  if (customRateWords) customRateWords.textContent = '';
}

// Update the result live as soon as both values are entered: result = amount × rate.
function updateCustomRateResult() {
  if (!customRateResult) return;
  const rate = customRateInput ? parseFloat(customRateInput.value) : NaN;
  const amount = customAmountInput ? parseFloat(customAmountInput.value) : NaN;
  if (isNaN(rate) || isNaN(amount)) {
    customRateResult.textContent = '0';
    if (customRateWords) customRateWords.textContent = '';
    return;
  }
  const result = new Decimal(String(amount)).mul(rate).toString();
  customRateResult.textContent = formatNumber(result);
  if (customRateWords) {
    customRateWords.textContent = numberToWords(result, state.locale);
  }
}

function stopCustomRateSpeech() {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  } catch (e) {
    // no-op
  }
  customRateSpeechActive = false;
  if (customRateSpeakButton) customRateSpeakButton.classList.remove('speaking');
}

// Speak the current result using the same localized Speech system as the
// rest of the app. No autoplay: it only reads when the user presses the
// speaker button (once), stops on a second press while reading, and reads
// again from the start on a later press.
function speakCustomRateResult() {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    // Toggle: if currently reading, stop immediately.
    if (customRateSpeechActive) {
      stopCustomRateSpeech();
      return;
    }
    const text = customRateResult ? customRateResult.textContent : '';
    if (!text || text === '0' || text === '—') return;
    const utterance = new SpeechSynthesisUtterance(text);
    applySpeechLocale(utterance, state.locale);
    utterance.onstart = () => {
      customRateSpeechActive = true;
      if (customRateSpeakButton) customRateSpeakButton.classList.add('speaking');
    };
    utterance.onend = () => {
      customRateSpeechActive = false;
      if (customRateSpeakButton) customRateSpeakButton.classList.remove('speaking');
    };
    utterance.onerror = () => {
      customRateSpeechActive = false;
      if (customRateSpeakButton) customRateSpeakButton.classList.remove('speaking');
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Speech synthesis not available
  }
}

function setConverterMode(mode) {
  state.converterMode = mode;
  converterModeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-converter-mode') === mode);
  });
  if (marketRateField) {
    marketRateField.hidden = mode !== 'market';
  }
  if (mode === 'market' && marketRateInput && marketRateInput.value) {
    state.marketRate = parseFloat(marketRateInput.value);
  }
  updateConverterOutput();
}

// ============================================================
// DRAWER & MODALS
// ============================================================
function toggleDrawer() {
  triggerButtonFeedback();
  if (!drawer || !drawerOverlay) return;
  const isOpen = drawer.classList.contains('open');
  drawer.classList.toggle('open', !isOpen);
  drawerOverlay.classList.toggle('open', !isOpen);
  // PHASE 37F — tap outside: overlay is only interactive with its `.show`
  // class (styles.css `.drawer-overlay.show`), so it must be toggled too.
  drawerOverlay.classList.toggle('show', !isOpen);
  document.body.classList.toggle('modal-open', !isOpen);
}

function closeDrawer() {
  if (!drawer || !drawerOverlay) return;
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  drawerOverlay.classList.remove('show');
  document.body.classList.remove('modal-open');
}

// ============================================================
// CURRENCY POPOVER (independent from drawer & language popover)
// ============================================================
function openCurrencyMenu() {
  if (currencyMenuPopover) {
    currencyMenuPopover.classList.add('open');
    currencyMenuPopover.setAttribute('aria-hidden', 'false');
  }
  if (currencyMenuButton) {
    currencyMenuButton.setAttribute('aria-expanded', 'true');
  }
}

function closeCurrencyMenu() {
  if (currencyMenuPopover) {
    currencyMenuPopover.classList.remove('open');
    currencyMenuPopover.setAttribute('aria-hidden', 'true');
  }
  if (currencyMenuButton) {
    currencyMenuButton.setAttribute('aria-expanded', 'false');
  }
}

function toggleCurrencyMenu() {
  if (currencyMenuPopover && currencyMenuPopover.classList.contains('open')) {
    closeCurrencyMenu();
  } else {
    openCurrencyMenu();
  }
}

function handleCurrencyAction(action) {
  // Close the popover first, then navigate to the existing interface.
  closeCurrencyMenu();
  switch (action) {
    case 'search':
      // Currency Rates screen (أسعار العملات) — the standalone currency rates list
      openCurrencyRates();
      break;
    case 'prices':
      // Direct Currency Converter displays the live API rates (existing interface)
      openCurrencyConverter();
      break;
    case 'convert':
      // Direct Currency Converter (existing converter, unchanged)
      openCurrencyConverter();
      break;
    case 'customRate':
      // Custom-rate converter (تحويل بسعر مخصص) — new minimal screen
      openCustomRateConverter();
      break;
    case 'favorites':
      // Standalone Favorites screen — opens with live rates fetched automatically
      openCurrencyFavorites();
      break;
  }
}

function handleDrawerMenuItem(action) {
  closeDrawer();
  switch (action) {
    case 'open-history':
      openHistory();
      break;
    case 'open-notes':
      openNotesManager();
      break;
    case 'open-smart-docs':
      openSmartDocs();
      break;
    case 'open-pdf-reports':
      openPdfReportsWorkspace();
      break;
    case 'open-install':
      openInstallModal();
      break;
    case 'open-settings':
      openSettingsModal();
      break;
  }
}

function openSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.add('show');
    settingsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  if (languageSelect) languageSelect.value = state.locale;
  if (topBarLanguageSelect) topBarLanguageSelect.value = state.locale;
  if (appSoundToggle) appSoundToggle.checked = state.appSoundEnabled;
  if (soundToggle) {
    soundToggle.checked = state.soundEnabled;
    soundToggle.disabled = !state.appSoundEnabled;
  }
  if (soundProfileSelect) soundProfileSelect.value = state.soundProfile;
  if (speakerToggle) speakerToggle.checked = state.speakerEnabled;
  if (appSoundModes) {
    appSoundModes.closest('.app-sounds-group')?.classList.toggle('app-sounds-off', !state.appSoundEnabled);
  }
}

function closeSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.remove('show');
    settingsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

function openHelpModal() {
  if (helpModal) {
    helpModal.classList.add('show');
    helpModal.setAttribute('aria-hidden', 'false');
  }
  // Help opens on top of Settings, so the body must stay locked.
  document.body.classList.add('modal-open');
}

function closeHelpModal() {
  if (helpModal) {
    helpModal.classList.remove('show');
    helpModal.setAttribute('aria-hidden', 'true');
  }
  // Settings remains open behind the help page -> keep the body locked.
  const settingsShown = settingsModal && settingsModal.classList.contains('show');
  if (settingsShown) document.body.classList.add('modal-open');
  else document.body.classList.remove('modal-open');
}

function openInstallModal() {
  if (iosInstallModal) {
    iosInstallModal.classList.add('show');
    iosInstallModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  updateInstallModalContent();
}

function closeInstallModal() {
  if (iosInstallModal) {
    iosInstallModal.classList.remove('show');
    iosInstallModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

// ============================================================
// KEYBOARD INPUT
// ============================================================
function handleKeydown(event) {
  // Phase 1: preserves the original monolith keyboard behavior exactly.
  // The shared KeyboardHandler remains available for future modes, but the
  // active Standard Calculator is still driven by the monolith's own functions
  // to guarantee 100% backward compatibility (history, live evaluation, etc.).
  const key = event.key;
  const activeEl = document.activeElement;
  const activeTag = activeEl ? activeEl.tagName : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || (activeEl && activeEl.isContentEditable)) {
    return;
  }
  if (/^\d$/.test(key)) {
    appendDigit(key);
  } else if (key === '.') {
    appendDigit('.');
  } else if (key === '+' || key === '-' || key === '*' || key === '/') {
    applyOperator(key);
  } else if (key === '(' || key === ')') {
    // PHASE 37G (Test Point 8): keyboard parentheses route to the same
    // free-expression buffer as the ( ) buttons. No other keys change.
    event.preventDefault();
    appendScientificValue(key);
  } else if (key === '^') {
    // PHASE 40: scientific power key uses the same free-expression buffer.
    // '%' keeps opening the Percentage panel (no behavior change).
    event.preventDefault();
    appendScientificValue(key);
  } else if (key === '%') {
    togglePercentPanel();
  } else if (key === 'Enter' || key === '=') {
    event.preventDefault();
    handleEquals();
  } else if (key === 'Backspace') {
    event.preventDefault();
    backspace();
  } else if (key === 'Escape') {
    clearAll();
  }
}

// ============================================================
// SERVICE WORKER
// ============================================================
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch((error) => {
          console.error('Service worker registration failed:', error);
        });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    });
  }
}

// ============================================================
// VIEWPORT SYNC
// ============================================================
function syncViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--app-height', `${vh}px`);
}

// ============================================================
// WIRE EVENTS
// ============================================================
function wireEvents() {
  // Keypad number buttons
  document.querySelectorAll('.keypad-btn.number').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerButtonFeedback();
      appendDigit(btn.getAttribute('data-value'));
    });
  });

  // Keypad operator buttons
  document.querySelectorAll('.keypad-btn.operator').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerButtonFeedback();
      applyOperator(btn.getAttribute('data-value'));
    });
  });

  // Equals button
  const equalsBtn = document.querySelector('.keypad-btn.equals');
  if (equalsBtn) {
    equalsBtn.addEventListener('click', handleEquals);
  }

  // Control buttons (AC, backspace, copy, paste)
  document.querySelectorAll('.control-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      switch (action) {
        case 'clear':
          clearAll();
          break;
        case 'backspace':
          backspace();
          break;
        case 'copy':
          copyResult();
          break;
        case 'paste':
          pasteNumber(true);
          break;
      }
    });
  });

  // Scientific buttons
  document.querySelectorAll('.scientific-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      appendScientificValue(btn.getAttribute('data-scientific'));
    });
  });

  // Angle mode buttons
  document.querySelectorAll('.angle-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-angle-mode');
      if (mode && standardCalculator) {
        // Update state
        state.angleMode = mode;
        // Update UI
        document.querySelectorAll('.angle-mode-btn').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-angle-mode') === mode);
        });
        // Update ExpressionEvaluator angle mode
        if (typeof setAngleMode === 'function') {
          setAngleMode(mode);
        }
        triggerButtonFeedback();
      }
    });
  });

  // Scientific toggle
  if (scientificToggle) {
    scientificToggle.addEventListener('click', toggleScientificPanel);
  }

  // Percent toggle
  if (percentToggle) {
    percentToggle.addEventListener('click', togglePercentPanel);
  }

  // Percent panel back button
  if (percentBackButton) {
    percentBackButton.addEventListener('click', () => {
      setPercentPanelOpen(false);
    });
  }

  // Percent refresh button
  if (percentRefreshButton) {
    percentRefreshButton.addEventListener('click', () => {
      triggerButtonFeedback();
      if (percentAmount) percentAmount.value = '';
      if (percentRate) percentRate.value = '';
      if (sharedServices.display) {
        sharedServices.display.updatePrimary('0');
        sharedServices.display.updateSecondary('Zero', state.locale);
      }
    });
  }

  // Percent inputs
  if (percentAmount) {
    percentAmount.addEventListener('input', calculatePercent);
  }
  if (percentRate) {
    percentRate.addEventListener('input', calculatePercent);
  }

  // Speech button
  if (speechButton) {
    speechButton.addEventListener('click', () => {
      triggerButtonFeedback();
      speakCurrentResult();
    });
  }

  // History buttons
  if (historyBackButton) {
    historyBackButton.addEventListener('click', closeHistory);
  }
  if (selectAllHistoryButton) {
    selectAllHistoryButton.addEventListener('click', selectAllHistory);
  }
  if (exportHistoryButton) {
    exportHistoryButton.addEventListener('click', exportHistory);
  }
  const historyCompanyNameBtn = typeof document !== 'undefined' ? document.getElementById('historyCompanyNameBtn') : null;
  if (historyCompanyNameBtn) {
    historyCompanyNameBtn.addEventListener('click', onCompanyNameButton);
  }
  if (historyList) {
    historyList.addEventListener('click', (e) => {
      const shareBtn = e.target.closest('.history-share-btn');
      if (shareBtn) {
        shareEntry(shareBtn.getAttribute('data-id'));
      }
      const editNoteBtn = e.target.closest('.history-edit-note-btn');
      if (editNoteBtn) {
        const entryId = editNoteBtn.getAttribute('data-id');
        const noteInput = editNoteBtn.closest('.history-note-row')?.querySelector('.history-note-input');
        if (noteInput) {
          noteInput.focus();
        }
      }
      // PART 35 — History → Insert Result → Smart Document (one-way copy)
      const insertBtn = e.target.closest('.history-insert-smart-btn');
      if (insertBtn) {
        insertResultIntoSmartDocument(insertBtn.getAttribute('data-id'));
      }
      // Per-entry speaker button — reads THAT entry's result via the
      // existing SpeechSynthesis pipeline (no new TTS engine).
      const speakEntryBtn = e.target.closest('.history-speak-btn');
      if (speakEntryBtn) {
        triggerButtonFeedback();
        speakHistoryEntryResult(speakEntryBtn.getAttribute('data-id'));
      }
    });
    historyList.addEventListener('change', (e) => {
      const input = e.target.closest('.history-note-input');
      if (input) {
        updateEntryNote(input.getAttribute('data-id'), input.value);
      }
      if (e.target.matches('.history-select')) {
        primeCurrentSelection(); // warm the combined PDF for the new selection
      }
    });
  }

  // Drawer
  if (drawerToggle) {
    drawerToggle.addEventListener('click', toggleDrawer);
  }
  if (drawerCloseButton) {
    drawerCloseButton.addEventListener('click', closeDrawer);
  }
  if (drawerOverlay) {
    drawerOverlay.addEventListener('click', closeDrawer);
  }
  // PHASE 37F — swipe to close (touch/pen only, mouse untouched).
  // Uses the existing state.isRTL (app direction logic); no new RTL system.
  // Threshold-based: only closes when horizontal movement toward the closing
  // edge exceeds 60px and dominates the vertical axis, so in-drawer scrolling
  // and normal taps (X / menu buttons) are unaffected.
  if (drawer && typeof state !== 'undefined' && state) {
    let swStartX = 0, swStartY = 0, swTracking = false, swClosed = false, swJustClosed = false;
    drawer.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return;
      if (!drawer.classList.contains('open')) return;
      swStartX = ev.clientX;
      swStartY = ev.clientY;
      swTracking = true;
      swClosed = false;
    }, { passive: true });
    drawer.addEventListener('pointermove', (ev) => {
      if (!swTracking || swClosed) return;
      const dx = ev.clientX - swStartX;
      const dy = ev.clientY - swStartY;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll gesture
      const closingDelta = state.isRTL ? dx : -dx; // RTL closes right, LTR closes left
      if (closingDelta > 60) {
        swClosed = true;
        swTracking = false;
        swJustClosed = true;
        closeDrawer();
        // Auto-clear so a missed/absent click event can never eat a later tap.
        setTimeout(() => { swJustClosed = false; }, 350);
      }
    }, { passive: true });
    drawer.addEventListener('pointerup', () => {
      swTracking = false;
    }, { passive: true });
    drawer.addEventListener('pointercancel', () => {
      swTracking = false;
    }, { passive: true });
    // After a swipe-close, suppress the click that follows pointerup so the
    // finger doesn't accidentally trigger a drawer menu button / navigation.
    drawer.addEventListener('click', (ev) => {
      if (swJustClosed) {
        swJustClosed = false;
        ev.stopPropagation();
        ev.preventDefault();
      }
    }, true);
  }
  drawerMenuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      handleDrawerMenuItem(action);
    });
  });

  // PHASE 1 — header install control + Feature Navigation Bar.
  // Both reuse the EXISTING handlers (openInstallModal / handleDrawerMenuItem);
  // no new feature logic is introduced here.
  const topBarInstallButton = typeof document !== 'undefined' ? document.getElementById('topBarInstallButton') : null;
  if (topBarInstallButton) {
    topBarInstallButton.addEventListener('click', () => {
      triggerButtonFeedback();
      openInstallModal();
    });
  }
  document.querySelectorAll('.feature-nav-btn[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      triggerButtonFeedback();
      const action = btn.getAttribute('data-action');
      if (action === 'open-currency') {
        e.stopPropagation();
        toggleCurrencyMenu();
        return;
      }
      // PDF V1 — Phase 1 TARGET LOCK: the circled 📄 button in the Feature
      // Navigation Bar (button.feature-nav-btn[data-action="open-smart-docs"]
      // inside #featureNavBar) opens the EXISTING #pdfReportsWorkspace.
      // Drawer open-smart-docs still opens Smart Docs; Smart Docs code untouched.
      if (action === 'open-smart-docs' && btn.closest && btn.closest('#featureNavBar')) {
        e.stopPropagation();
        openPdfReportsWorkspace();
        return;
      }
      handleDrawerMenuItem(action);
    });
  });

  // Language selects
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }
  if (topBarLanguageSelect) {
    topBarLanguageSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // Currency menu
  if (currencyMenuButton) {
    currencyMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCurrencyMenu();
    });
  }
  currencyPopoverItems.forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
      handleCurrencyAction(action);
    });
  });

  // Close currency menu on outside click (popover + its trigger block both count
  // as "inside"). Item clicks are handled by their own listeners above, so this
  // only closes when the user clicks truly outside both.
  document.addEventListener('click', (e) => {
    if (currencyMenuPopover && currencyMenuPopover.classList.contains('open')) {
      const insideTrigger = currencyMenuWrap && currencyMenuWrap.contains(e.target);
      const insidePopover = currencyMenuPopover.contains(e.target);
      if (!insideTrigger && !insidePopover) {
        closeCurrencyMenu();
      }
    }
  });

  // Close currency menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCurrencyMenu();
    }
  });

  // Theme buttons
  document.querySelectorAll('.theme-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerButtonFeedback();
      setTheme(btn.getAttribute('data-theme'));
    });
  });

  // App Sounds master toggle (gates all app sound modes below)
  if (appSoundToggle) {
    appSoundToggle.addEventListener('change', (e) => {
      state.appSoundEnabled = e.target.checked;
      if (soundToggle) soundToggle.disabled = !e.target.checked;
      if (appSoundModes) {
        appSoundModes.closest('.app-sounds-group')?.classList.toggle('app-sounds-off', !e.target.checked);
      }
      saveSoundPreferences();
    });
  }

  // Sound toggle (per sound mode)
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
      saveSoundPreferences();
    });
  }

  // Sound profile selector (button click sound). Selecting a non-silent profile
  // plays a short preview. The chosen profile is persisted.
  if (soundProfileSelect) {
    soundProfileSelect.addEventListener('change', (e) => {
      state.soundProfile = e.target.value;
      saveSoundPreferences();
      playButtonSound(state.soundProfile);
    });
  }

  // Speaker / Voice Reading toggle (auto-read on =). Independent of App Sounds.
  if (speakerToggle) {
    speakerToggle.addEventListener('change', (e) => {
      state.speakerEnabled = e.target.checked;
      saveSpeakerPreference();
    });
  }

  // Settings modal
  if (settingsCloseButton) {
    settingsCloseButton.addEventListener('click', closeSettingsModal);
  }
  // PHASE 01 — PDF Reports workspace Back button (existing close pattern).
  const pdfReportsBackBtn = document.getElementById('pdfReportsBackBtn');
  if (pdfReportsBackBtn) {
    pdfReportsBackBtn.addEventListener('click', closePdfReportsWorkspace);
  }
  // PDF V1 — Phase 1 import wiring (scoped to #pdfReportsWorkspace only).
  try { pdfV1WireImport(); } catch (e) {}
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  // Help & About (only reachable from Settings)
  if (helpAboutButton) {
    helpAboutButton.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerButtonFeedback();
      openHelpModal();
    });
  }
  if (helpBackButton) {
    helpBackButton.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerButtonFeedback();
      closeHelpModal();
    });
  }
  if (helpCloseButton) {
    helpCloseButton.addEventListener('click', closeHelpModal);
  }
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelpModal();
    });
  }

  // iOS install modal
  if (closeIosInstallModalButton) {
    closeIosInstallModalButton.addEventListener('click', closeInstallModal);
  }
  if (dismissIosInstallModalButton) {
    dismissIosInstallModalButton.addEventListener('click', closeInstallModal);
  }
  if (iosInstallModal) {
    iosInstallModal.addEventListener('click', (e) => {
      if (e.target === iosInstallModal) closeInstallModal();
    });
  }

  // Notes manager
  if (closeNotesManagerButton) {
    closeNotesManagerButton.addEventListener('click', closeNotesManager);
  }
  if (notesManagerModal) {
    notesManagerModal.addEventListener('click', (e) => {
      if (e.target === notesManagerModal) closeNotesManager();
    });
  }

  // Smart Documents — CLEAN RESET: only the close/back entry remains.
  if (closeSmartDocsButton) {
    closeSmartDocsButton.addEventListener('click', closeSmartDocs);
  }
  if (smartDocsModal) {
    smartDocsModal.addEventListener('click', (e) => {
      if (e.target === smartDocsModal) closeSmartDocs();
    });
    smartDocsModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeSmartDocs(); }
    });
  }

  if (addFolderButton) {
    addFolderButton.addEventListener('click', addFolder);
  }
  if (openNewNoteButton) {
    openNewNoteButton.addEventListener('click', () => {
      // Open the editor on top of the notes manager so that after saving
      // the user returns to the Folders / Notes list automatically.
      openFullScreenNote(null);
    });
  }
  if (emptyNewNoteBtn) {
    emptyNewNoteBtn.addEventListener('click', () => {
      setTimeout(() => openFullScreenNote(null), 150);
    });
  }
  if (navNotesBtn) {
    navNotesBtn.addEventListener('click', () => switchNotesView('notes'));
  }
  if (navDeletedBtn) {
    navDeletedBtn.addEventListener('click', () => switchNotesView('deleted'));
  }
  if (folderTabsScroll) {
    folderTabsScroll.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('.folder-tab-btn[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const folderId = actionBtn.getAttribute('data-folder-id');
        const action = actionBtn.getAttribute('data-action');
        if (folderId && action === 'rename') renameFolder(folderId);
        else if (folderId && action === 'delete') deleteFolder(folderId);
        return;
      }
      const tab = e.target.closest('.folder-tab');
      if (!tab) return;
      const folderId = tab.getAttribute('data-folder-id');
      setActiveFolder(folderId);
      renderFolderTabs();
      renderNotes();
    });
  }
  if (notesList) {
    notesList.addEventListener('click', (e) => {
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        e.stopPropagation();
        const noteId = actionBtn.getAttribute('data-note-id');
        const action = actionBtn.getAttribute('data-action');
        if (action === 'menu') {
          // N02 — toggle the per-card More menu (one open at a time).
          const menu = actionBtn.parentElement.querySelector('.note-menu');
          const willOpen = menu && !menu.classList.contains('open');
          closeNoteMenus();
          if (menu && willOpen) menu.classList.add('open');
          return;
        }
        closeNoteMenus();
        if (!noteId) return;
        if (action === 'rename') renameNoteById(noteId);
        else if (action === 'duplicate') duplicateNoteById(noteId);
        else if (action === 'pin') toggleNotePin(noteId);
        else if (action === 'delete') deleteNote(noteId);
        return;
      }
      closeNoteMenus();
      const item = e.target.closest('.note-item');
      if (!item) return;
      const noteId = item.getAttribute('data-note-id');
      if (noteId) openFullScreenNote(noteId);
    });
  }
  // N02 — Notes Home search + sort.
  if (notesSearchInput) {
    notesSearchInput.addEventListener('input', () => {
      state.noteSearch = notesSearchInput.value || '';
      renderNotes();
    });
  }
  if (notesSortSelect) {
    notesSortSelect.addEventListener('change', () => {
      state.noteSort = notesSortSelect.value || 'newest';
      renderNotes();
    });
  }
  // N02 — close any open card menu when clicking elsewhere in Notes Home.
  if (notesManagerModal) {
    notesManagerModal.addEventListener('click', (e) => {
      if (!e.target.closest('.note-menu') && !e.target.closest('.note-menu-btn')) closeNoteMenus();
    });
  }
  if (deletedNotesList) {
    deletedNotesList.addEventListener('click', (e) => {
      const restoreBtn = e.target.closest('[data-action="restore"]');
      if (restoreBtn) {
        e.stopPropagation();
        const noteId = restoreBtn.getAttribute('data-note-id');
        if (noteId) restoreNote(noteId);
        return;
      }
      const delBtn = e.target.closest('[data-action="permanent-delete"]');
      if (delBtn) {
        e.stopPropagation();
        const noteId = delBtn.getAttribute('data-note-id');
        if (noteId) showDeleteConfirm(noteId);
        return;
      }
      const item = e.target.closest('.note-item');
      if (!item) return;
      const noteId = item.getAttribute('data-note-id');
      if (noteId) openFullScreenNote(noteId);
    });
  }

  // Delete confirm
  if (deleteConfirmCancel) {
    deleteConfirmCancel.addEventListener('click', hideDeleteConfirm);
  }
  if (deleteConfirmOk) {
    deleteConfirmOk.addEventListener('click', () => {
      if (state.pendingDeleteNoteId) {
        permanentDeleteNote(state.pendingDeleteNoteId);
      }
      hideDeleteConfirm();
    });
  }
  if (deleteConfirmModal) {
    deleteConfirmModal.addEventListener('click', (e) => {
      if (e.target === deleteConfirmModal) hideDeleteConfirm();
    });
  }

  // Full screen note
  if (closeFullScreenNoteButton) {
    closeFullScreenNoteButton.addEventListener('click', closeFullScreenNote);
  }
  if (fullScreenNoteModal) {
    fullScreenNoteModal.addEventListener('click', (e) => {
      if (e.target === fullScreenNoteModal) closeFullScreenNote();
    });
  }
  if (noteTitleInput) {
    noteTitleInput.addEventListener('input', scheduleNoteSave);
  }
  if (noteBodyInput) {
    noteBodyInput.addEventListener('input', scheduleNoteSave);
  }
  // Backward-compat shim: the editor used to be a <textarea> whose `.value`
  // get/set cleared the content. Keep that contract so any external code/harness
  // that sets `#noteBodyInput.value` still clears it. Production code never uses it.
  if (noteBodyInput && typeof noteBodyInput.value !== 'string') {
    try {
      Object.defineProperty(noteBodyInput, 'value', {
        configurable: true,
        get() { return this.innerText || ''; },
        set(v) { this.innerHTML = ''; if (v) this.innerText = String(v); }
      });
    } catch (e) { /* non-fatal */ }
  }
  // Format toolbar: prevent mousedown so the button never steals focus/collapses
  // the editor selection; apply the command on click (native toggle behaviour).
  const noteFormatButtons = [noteBoldBtn, noteItalicBtn, noteUnderlineBtn, noteAlignLeftBtn, noteAlignCenterBtn, noteAlignRightBtn];
  noteFormatButtons.forEach((btn) => {
    if (!btn) return;
    const cmd = btn.dataset && btn.dataset.format;
    if (!cmd) return;
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => applyNoteFormat(cmd));
  });
  // PHASE 03 — Heading select + List buttons (same selection-preserving rules:
  // mousedown prevented so the editor selection never collapses; command applied
  // on click/change; the select acts as a command menu and resets after use).
  [noteBulletListBtn, noteNumberListBtn].forEach((btn) => {
    if (!btn) return;
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      applyNoteList(btn === noteBulletListBtn ? 'insertUnorderedList' : 'insertOrderedList');
    });
  });
  // PART 04 — Checklist + Divider toolbar buttons (same pattern as the list
  // buttons: mousedown prevented so the editor selection never collapses).
  if (noteChecklistBtn) {
    noteChecklistBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteChecklistBtn.addEventListener('click', () => insertNoteChecklist());
  }
  if (noteDividerBtn) {
    noteDividerBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteDividerBtn.addEventListener('click', () => insertNoteDivider());
  }
  // PART 04 — delegated toggle for checklist boxes (click flips the checked
  // class + autosaves; keyboard/touch both go through the same click event).
  if (noteBodyInput) {
    noteBodyInput.addEventListener('click', (e) => {
      const box = e.target.closest('.note-check-box');
      if (!box) return;
      e.preventDefault();
      const li = box.closest('li.note-check-item');
      if (!li) return;
      li.classList.toggle('checked');
      box.setAttribute('aria-checked', li.classList.contains('checked') ? 'true' : 'false');
      scheduleNoteSave();
    });
  }
  if (noteHeadingSelect) {
    noteHeadingSelect.addEventListener('mousedown', (e) => {
      // Snapshot the editor caret so applying a heading targets the right block
      // even though opening the <select> moves focus away from the editor.
      noteHeadingCaretRange = null;
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.rangeCount && noteBodyInput && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        noteHeadingCaretRange = sel.getRangeAt(0).cloneRange();
      }
    });
    noteHeadingSelect.addEventListener('change', () => {
      const v = noteHeadingSelect.value;
      noteHeadingSelect.value = ''; // reset to the neutral "Heading ▾" state
      if (!v) return;
      if (noteHeadingCaretRange) {
        try {
          noteBodyInput.focus();
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(noteHeadingCaretRange);
        } catch (e) { /* best-effort */ }
        noteHeadingCaretRange = null;
      }
      applyNoteHeading(v);
    });
  }
  // --- Text Color ---
  // In-app color palette for the existing toolbar button. Opens a compact preset
  // swatch grid inside the app (no reliance on the native OS color dialog), and
  // on selection applies the color ONLY to the currently selected text by reusing
  // the existing applyNoteTextColor()/restoreActiveSelectionRange() pipeline. The
  // native <input type="color"> remains as a fallback path for browsers that can't
  // render the palette, and keeps the app functionally equivalent if it does.
  if (noteTextColorBtn && noteTextColorInput) {
    let pendingNoteTextColorRange = null;
    let paletteBuilt = false;
    const textColorPalette = document.getElementById('noteTextColorPalette');

    function openNoteTextColorPalette() {
      if (!textColorPalette) return false;
      if (!paletteBuilt) {
        NOTE_TEXT_COLORS.forEach((c) => {
          const s = document.createElement('button');
          s.type = 'button';
          s.className = 'note-text-color-swatch';
          s.style.setProperty('--swatch', c.color);
          s.setAttribute('data-color', c.color);
          s.setAttribute('aria-label', c.name);
          s.title = c.name;
                    textColorPalette.appendChild(s);
        });
        paletteBuilt = true;
      }
      textColorPalette.classList.remove('hidden');
      return true;
    }
    function closeNoteTextColorPalette() {
      if (textColorPalette) textColorPalette.classList.add('hidden');
    }
    function applyChosenNoteTextColor(colorValue) {
      // Reuse the exact existing flow: capture is already stored, restore the
      // saved range, then apply the color to that selection only.
      const saved = pendingNoteTextColorRange;
      pendingNoteTextColorRange = null;
      closeNoteTextColorPalette();
      restoreActiveSelectionRange(saved);
      if (noteTextColorInput) noteTextColorInput.value = colorValue;
      applyNoteTextColor(colorValue);
      updateNoteTextColorButton();
    }

    noteTextColorBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteTextColorBtn.addEventListener('click', () => {
      // Capture the editor selection first so it survives opening the palette.
      pendingNoteTextColorRange = preserveActiveSelectionRange();
      if (textColorPalette && !textColorPalette.classList.contains('hidden')) {
        closeNoteTextColorPalette();
        return;
      }
      if (openNoteTextColorPalette()) return;
      // Fallback only when the in-app palette cannot be shown — open the native
      // color input. Never auto-applies a default color here.
      try {
        noteTextColorInput.showPicker();
      } catch (e) { /* showPicker unavailable/rejected -> .click() below */ }
      // Guaranteed native open within the SAME user gesture when the palette is unavailable.
      noteTextColorInput.click();
    });

    if (textColorPalette) {
      // Keep selection while picking a color (mousedown on a swatch must not
      // steal focus from the editor).
      textColorPalette.addEventListener('mousedown', (e) => {
        if (e.target && e.target.closest && e.target.closest('.note-text-color-swatch')) e.preventDefault();
      });
      // A single repeated click listener applies the chosen color immediately.
      textColorPalette.addEventListener('click', (e) => {
        const sw = e.target && e.target.closest ? e.target.closest('[data-color]') : null;
        if (!sw) return;
        applyChosenNoteTextColor(sw.getAttribute('data-color'));
      });
    }

    // Close the palette when the user clicks/taps anywhere outside it.
    document.addEventListener('mousedown', (e) => {
      if (!textColorPalette || textColorPalette.classList.contains('hidden')) return;
      if (noteTextColorBtn && noteTextColorBtn.contains(e.target)) return;
      if (e.target && e.target.closest && e.target.closest('#noteTextColorPalette')) return;
      closeNoteTextColorPalette();
    });

    // Kept for the native fallback path: applying a color from [input value].
    noteTextColorInput.addEventListener('input', () => {
      const color = noteTextColorInput.value;
      const saved = pendingNoteTextColorRange;
      pendingNoteTextColorRange = null;
      closeNoteTextColorPalette();
      restoreActiveSelectionRange(saved);
      applyNoteTextColor(color);
      updateNoteTextColorButton();
    });
  }
  // --- PART 05: single-entry Aa text-formatting panel ---
  // Moves text formatting (style / basic / alignment / font size / colors) behind
  // one Aa button. The bold/italic/underline/align/text-color buttons that were
  // relocated into #noteAaPanel keep their pre-existing ids and wiring above
  // (noteFormatButtons + text-color palette), so their behaviour is unchanged.
  if (noteAaBtn && noteAaPanel) {
    let pendingHighlightRange = null;
    let highlightPaletteBuilt = false;
    const closeAaTextColorPalette = () => {
      const tp = document.getElementById('noteTextColorPalette');
      if (tp) tp.classList.add('hidden');
    };
    const closeAaHighlightPalette = () => {
      if (noteHighlightPalette) noteHighlightPalette.classList.add('hidden');
    };
    const closeAaPanel = () => {
      noteAaPanel.classList.add('hidden');
      noteAaBtn.setAttribute('aria-expanded', 'false');
      closeAaHighlightPalette();
      closeAaTextColorPalette();
    };
    const openAaPanel = () => {
      closeAaHighlightPalette();
      closeAaTextColorPalette();
      // PART 07 — build preset swatch buttons once, reusing the existing color
      // handlers (applyNoteTextColor / applyNoteHighlight / applyCellBackgroundColor).
      if (noteAaPresetsRow && !noteAaPresetsRow.hasChildNodes()) {
        NOTE_COLOR_PRESETS.forEach((preset) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'note-aa-preset-swatches';
          btn.setAttribute('data-preset', preset.id);
          btn.setAttribute('aria-label', preset.name);
          btn.title = preset.name;
          // Mini preview: text dot + highlight band + cell-bg + border
          btn.innerHTML =
            '<span class="note-aa-preset-text" style="--p-text:' + preset.text + '"></span>' +
            '<span class="note-aa-preset-highlight" style="--p-hl:' + preset.highlight + '"></span>' +
            '<span class="note-aa-preset-cell" style="--p-cell:' + preset.cellBg + ';--p-border:' + preset.border + '"></span>';
          noteAaPresetsRow.appendChild(btn);
        });
      }
      // PART 08 — keep Styles & Frames rows in sync with the open note.
      applyNoteStyleSurfaceClasses(state.currentOpenNote);
      noteAaPanel.classList.remove('hidden');
      noteAaBtn.setAttribute('aria-expanded', 'true');
    };
    noteAaBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteAaBtn.addEventListener('click', () => {
      if (!noteAaPanel.classList.contains('hidden')) closeAaPanel();
      else openAaPanel();
    });
    document.addEventListener('mousedown', (e) => {
      if (noteAaPanel.classList.contains('hidden')) return;
      if (noteAaBtn && noteAaBtn.contains(e.target)) return;
      if (e.target && e.target.closest && e.target.closest('#noteAaPanel')) return;
      closeAaPanel();
    });
    // PART 07 — Apply a color preset. Delegates to the SAME existing per-element
    // color handlers used by the individual pickers (no new color engine, no
    // global-theme / cross-module side effects). The border color is used only in
    // the swatch preview; the text/highlight/cell-fill colors are applied inline.
    if (noteAaPresetsRow) {
      noteAaPresetsRow.addEventListener('click', (e) => {
        const button = e.target && e.target.closest ? e.target.closest('.note-aa-preset-swatches') : null;
        if (!button) return;
        const preset = NOTE_COLOR_PRESETS.find((p) => p.id === button.getAttribute('data-preset'));
        if (!preset) return;
        applyNoteTextColor(preset.text);
        applyNoteHighlight(preset.highlight);
        applyCellBackgroundColor(preset.cellBg);
        // Brief active-state feedback on the applied swatch.
        noteAaPresetsRow.querySelectorAll('.note-aa-preset-swatches.is-active')
          .forEach((el) => el.classList.remove('is-active'));
        button.classList.add('is-active');
        closeAaPanel();
      });
    }
    // =========================================================================
    // PART 08 — Note Styles & Frames (data-driven, additive over the existing
    // engine). A style is a named design preset stored on the note object and
    // applied as scoped CSS classes on the editor body — it NEVER blocks or
    // rewrites manual formatting (no content mutation, no auto re-apply).
    // Reuses: PART 05 Aa panel, PART 07 preset row pattern, existing autosave.
    // =========================================================================
    const NOTE_STYLES = [
      { id: 'simple',      label: 'Simple',      i18n: 'noteStyleSimple' },
      { id: 'academic',    label: 'Academic',    i18n: 'noteStyleAcademic' },
      { id: 'business',    label: 'Business',    i18n: 'noteStyleBusiness' },
      { id: 'engineering', label: 'Engineering', i18n: 'noteStyleEngineering' },
      { id: 'modern',      label: 'Modern',      i18n: 'noteStyleModern' },
      { id: 'none',        label: 'None',        i18n: 'noteStyleNone' }
    ];
    const NOTE_FRAMES = [
      { id: 'none',    label: 'None',    i18n: 'noteFrameNone' },
      { id: 'classic', label: 'Classic', i18n: 'noteFrameClassic' },
      { id: 'dashed',  label: 'Dashed',  i18n: 'noteFrameDashed' },
      { id: 'soft',    label: 'Soft',    i18n: 'noteFrameSoft' }
    ];
    const noteAaStylesRow = typeof document !== 'undefined' ? document.getElementById('noteAaStylesRow') : null;
    const noteAaFramesRow = typeof document !== 'undefined' ? document.getElementById('noteAaFramesRow') : null;
    // Returns the editor body element (same element serialize/render use).
    const getNoteStyleTarget = () => noteBodyInput;
    // Strip every style/frame class, then apply the requested ones.
    const NOTE_STYLE_CLASS_RE = /^note-style-[a-z]+$/;
    const NOTE_FRAME_CLASS_RE = /^note-frame-[a-z]+$/;
    function applyNoteStyleClass(styleId) {
      const el = getNoteStyleTarget();
      if (!el) return;
      Array.from(el.classList).filter((c) => NOTE_STYLE_CLASS_RE.test(c)).forEach((c) => el.classList.remove(c));
      if (styleId && styleId !== 'none') el.classList.add('note-style-' + styleId);
    }
    function applyNoteFrameClass(frameId) {
      const el = getNoteStyleTarget();
      if (!el) return;
      Array.from(el.classList).filter((c) => NOTE_FRAME_CLASS_RE.test(c)).forEach((c) => el.classList.remove(c));
      if (frameId && frameId !== 'none') el.classList.add('note-frame-' + frameId);
    }
    // Reflect the note's stored style/frame onto the editor body + active states.
    function syncNoteStyleUI() {
      const note = state.currentOpenNote;
      const el = getNoteStyleTarget();
      if (!el) return;
      const styleId = (note && note.noteStyle) || '';
      const frameId = (note && note.noteFrame) || 'none';
      applyNoteStyleClass(styleId);
      applyNoteFrameClass(frameId);
      if (noteAaStylesRow) {
        noteAaStylesRow.querySelectorAll('.note-aa-style-btn').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-style-id') === styleId);
        });
      }
      if (noteAaFramesRow) {
        noteAaFramesRow.querySelectorAll('.note-aa-frame-btn').forEach((b) => {
          b.classList.toggle('is-active', b.getAttribute('data-frame-id') === frameId);
        });
      }
    }
    // Build the style buttons once (data-driven from NOTE_STYLES).
    if (noteAaStylesRow && !noteAaStylesRow.hasChildNodes()) {
      NOTE_STYLES.forEach((s) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'note-aa-style-btn' + (s.id === 'none' ? ' note-aa-style-none' : '');
        b.setAttribute('data-style-id', s.id);
        if (s.i18n) b.setAttribute('data-i18n', s.i18n);
        b.textContent = s.label;
        b.setAttribute('aria-label', s.label);
        b.title = s.label;
        noteAaStylesRow.appendChild(b);
      });
    }
    // Build the frame buttons once (data-driven from NOTE_FRAMES).
    if (noteAaFramesRow && !noteAaFramesRow.hasChildNodes()) {
      NOTE_FRAMES.forEach((f) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'note-aa-frame-btn';
        b.setAttribute('data-frame-id', f.id);
        if (f.i18n) b.setAttribute('data-i18n', f.i18n);
        b.textContent = f.label;
        b.setAttribute('aria-label', f.label);
        b.title = f.label;
        noteAaFramesRow.appendChild(b);
      });
    }
    // Style click: apply the scoped class, persist on the note, autosave.
    // Content is untouched — manual formatting stays fully functional.
    if (noteAaStylesRow) {
      noteAaStylesRow.addEventListener('click', (e) => {
        const button = e.target && e.target.closest ? e.target.closest('.note-aa-style-btn') : null;
        if (!button) return;
        const styleId = button.getAttribute('data-style-id');
        const note = state.currentOpenNote;
        if (note) { note.noteStyle = styleId; note.updatedAt = Date.now(); }
        applyNoteStyleClass(styleId);
        noteAaStylesRow.querySelectorAll('.note-aa-style-btn').forEach((b) => b.classList.toggle('is-active', b === button));
        scheduleNoteSave();
      });
    }
    // Frame click: same pattern as styles.
    if (noteAaFramesRow) {
      noteAaFramesRow.addEventListener('click', (e) => {
        const button = e.target && e.target.closest ? e.target.closest('.note-aa-frame-btn') : null;
        if (!button) return;
        const frameId = button.getAttribute('data-frame-id');
        const note = state.currentOpenNote;
        if (note) { note.noteFrame = frameId === 'none' ? '' : frameId; note.updatedAt = Date.now(); }
        applyNoteFrameClass(frameId);
        noteAaFramesRow.querySelectorAll('.note-aa-frame-btn').forEach((b) => b.classList.toggle('is-active', b === button));
        scheduleNoteSave();
      });
    }

    // Text Style buttons (Normal / H1 / H2 / H3) — reuse applyNoteHeading.

    // Text Style buttons (Normal / H1 / H2 / H3) — reuse applyNoteHeading.
    [noteStyleNormalBtn, noteStyleH1Btn, noteStyleH2Btn, noteStyleH3Btn].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        applyNoteHeading(btn.getAttribute('data-style'));
        closeAaPanel();
      });
    });
    // Font size buttons — reuse applyNoteFontSize.
    [noteFontSmallBtn, noteFontNormalBtn, noteFontLargeBtn].forEach((btn) => {
      if (!btn) return;
      btn.addEventListener('mousedown', (e) => e.preventDefault());
      btn.addEventListener('click', () => {
        applyNoteFontSize(btn.getAttribute('data-size'));
        closeAaPanel();
      });
    });
    // Highlight: button toggles a compact swatch palette; applying restores the
    // captured selection then applies the background (same pattern as text color).
    if (noteHighlightBtn) {
      noteHighlightBtn.addEventListener('mousedown', (e) => e.preventDefault());
      noteHighlightBtn.addEventListener('click', () => {
        if (noteHighlightPalette && !noteHighlightPalette.classList.contains('hidden')) {
          closeAaHighlightPalette();
          return;
        }
                        pendingHighlightRange = preserveActiveSelectionRange();
        if (!noteHighlightPalette) return;
        if (!highlightPaletteBuilt) {
          const NOTE_HIGHLIGHT_COLORS = [
            { name: 'Yellow', color: '#fff176' },
            { name: 'Green', color: '#a5d6a7' },
            { name: 'Blue', color: '#90caf9' },
            { name: 'Pink', color: '#f48fb1' },
            { name: 'Purple', color: '#ce93d8' },
            { name: 'Orange', color: '#ffcc80' }
          ];
          NOTE_HIGHLIGHT_COLORS.forEach((c) => {
            const s = document.createElement('button');
            s.type = 'button';
            s.className = 'note-aa-highlight-swatch';
            s.style.setProperty('--swatch', c.color);
            s.setAttribute('data-color', c.color);
            s.setAttribute('aria-label', c.name);
            s.title = c.name;
            noteHighlightPalette.appendChild(s);
          });
          highlightPaletteBuilt = true;
        }
        noteHighlightPalette.classList.remove('hidden');
      });
    }
    if (noteHighlightPalette) {
      noteHighlightPalette.addEventListener('mousedown', (e) => {
        if (e.target && e.target.closest('.note-aa-highlight-swatch')) e.preventDefault();
      });
      noteHighlightPalette.addEventListener('click', (e) => {
        const sw = e.target && e.target.closest ? e.target.closest('[data-color]') : null;
        if (!sw) return;
        const r = pendingHighlightRange;
        pendingHighlightRange = null;
        if (r) restoreActiveSelectionRange(r);
        applyNoteHighlight(sw.getAttribute('data-color'));
                closeAaHighlightPalette();
      });
    }
    // close the PART 05 Aa panel block before the Cell Background section
    }
    // --- Cell Background Color ---
    // In-app color palette for the existing toolbar button. Opens a compact preset
    // swatch grid inside the app (no reliance on the native OS color dialog), and
    // on selection applies the color ONLY to the currently selected table cell by
    // reusing the existing applyCellBackgroundColor() pipeline. The native
    // <input type="color"> remains as a fallback path for browsers that can't
    // render the palette, and keeps the app functionally equivalent if it does.
    if (noteCellBgColorBtn && noteCellBgColorInput) {
      let pendingTargetCell = null;
      let cellBgPaletteBuilt = false;
      const cellBgColorPalette = document.getElementById('noteCellBgColorPalette');

    function openNoteCellBgColorPalette() {
      if (!cellBgColorPalette) return false;
      if (!cellBgPaletteBuilt) {
        NOTE_CELL_BG_COLORS.forEach((c) => {
          const s = document.createElement('button');
          s.type = 'button';
          s.className = 'note-cell-bg-color-swatch';
          s.style.setProperty('--swatch', c.color);
          s.setAttribute('data-color', c.color);
          s.setAttribute('aria-label', c.name);
          s.title = c.name;
          cellBgColorPalette.appendChild(s);
        });
        cellBgPaletteBuilt = true;
      }
      cellBgColorPalette.classList.remove('hidden');
      return true;
    }
    function closeNoteCellBgColorPalette() {
      if (cellBgColorPalette) cellBgColorPalette.classList.add('hidden');
    }
    function applyChosenNoteCellBgColor(colorValue) {
      // Reuse the existing flow: the captured target cell is used first so the
      // color lands on the cell the user was targeting when they opened the
      // palette (selection may have shifted while the picker was open).
      const cell = pendingTargetCell || getSelectedNoteTableCellForBackground();
      pendingTargetCell = null;
      closeNoteCellBgColorPalette();
      if (cell) applyCellBackgroundColor(colorValue, cell);
      if (noteCellBgColorInput) noteCellBgColorInput.value = colorValue;
      updateNoteCellBackgroundButton();
    }

    noteCellBgColorBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteCellBgColorBtn.addEventListener('click', () => {
      // Capture the target cell first so the color lands on the right cell even
      // if the picker steals focus (mirrors text-color range capture).
      const cell = getSelectedNoteTableCellForBackground();
      pendingTargetCell = cell;
      if (cellBgColorPalette && !cellBgColorPalette.classList.contains('hidden')) {
        closeNoteCellBgColorPalette();
        pendingTargetCell = null;
        return;
      }
      if (openNoteCellBgColorPalette()) return;
      // Fallback only when the in-app palette cannot be shown — open the native
      // color input. Never auto-applies a default color here.
      try {
        noteCellBgColorInput.showPicker();
      } catch (e) { /* showPicker unavailable/rejected -> .click() below */ }
      // Guaranteed native open within the SAME user gesture when the palette is unavailable.
      noteCellBgColorInput.click();
    });

    if (cellBgColorPalette) {
      // Keep selection while picking a color (mousedown on a swatch must not
      // steal focus from the editor).
      cellBgColorPalette.addEventListener('mousedown', (e) => {
        if (e.target && e.target.closest && e.target.closest('.note-cell-bg-color-swatch')) e.preventDefault();
      });
      // A single repeated click listener applies the chosen color immediately.
      cellBgColorPalette.addEventListener('click', (e) => {
        const sw = e.target && e.target.closest ? e.target.closest('[data-color]') : null;
        if (!sw) return;
        applyChosenNoteCellBgColor(sw.getAttribute('data-color'));
      });
    }

    // Close the palette when the user clicks/taps anywhere outside it.
    document.addEventListener('mousedown', (e) => {
      if (!cellBgColorPalette || cellBgColorPalette.classList.contains('hidden')) return;
      if (noteCellBgColorBtn && noteCellBgColorBtn.contains(e.target)) return;
      if (e.target && e.target.closest && e.target.closest('#noteCellBgColorPalette')) return;
      closeNoteCellBgColorPalette();
    });

    // Kept for the native fallback path: applying a color from [input value].
    noteCellBgColorInput.addEventListener('input', () => {
      const color = noteCellBgColorInput.value;
      const cell = pendingTargetCell || getSelectedNoteTableCellForBackground();
      pendingTargetCell = null;
      closeNoteCellBgColorPalette();
      applyCellBackgroundColor(color, cell);
      updateNoteCellBackgroundButton();
    });
  }
  // Table toolbar button: never steal focus on mousedown. The actual click wiring
  // (reveal the mobile table toolbar above the keyboard on coarse-pointer devices,
  // or fall back to the small insert-table panel) lives in the mobile-table-toolbar
  // block below, where it can reach the existing toolbar and its handlers.
  if (noteTableBtn) {
    noteTableBtn.addEventListener('mousedown', (e) => e.preventDefault());
  }
  if (noteTableInsertBtn) {
    noteTableInsertBtn.addEventListener('click', () => {
      const rows = noteTableRows ? parseInt(noteTableRows.value, 10) : 2;
      const cols = noteTableCols ? parseInt(noteTableCols.value, 10) : 2;
      const header = !!(noteTableHeader && noteTableHeader.checked);
      insertTable(rows, cols, header);
      toggleNoteTablePanel(false);
    });
  }
  if (noteTableCancelBtn) {
    noteTableCancelBtn.addEventListener('click', () => toggleNoteTablePanel(false));
  }
  // PART 06 — Create Table preset grids (2×2 / 3×3 / 4×5 / Custom). Reuse the
  // existing insertTable(r,c,header) so the table is always a real <table>
  // element (edit/resize/format/save/preview/PDF stay intact). "Custom" keeps
  // focus so the user can use the rows/cols/header fields + Insert button below.
  if (noteTablePanel) {
    noteTablePanel.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-preset');
        let rows = 2, cols = 2;
        if (p === '3x3') { rows = 3; cols = 3; }
        else if (p === '4x5') { rows = 4; cols = 5; }
        else if (p === 'custom') return; // keep panel open for Custom fields
        insertTable(rows, cols, false);
        toggleNoteTablePanel(false);
      });
    });
  }
  if (noteTablePanel) {
    noteTablePanel.addEventListener('click', (e) => { if (e.target === noteTablePanel) toggleNoteTablePanel(false); });
  }
 if (noteBodyInput) {
  // Inside the editor: track focused table cell + delegated table controls.
  // Mobile table toolbar: shown as a compact, horizontally-scrollable toolbar above
  // the keyboard when a table cell is focused on coarse-pointer / mobile devices.
  const isMobile = navigator.maxTouchPoints && navigator.maxTouchPoints > 1;
  const isCoarsePointer = typeof navigator !== 'undefined' && navigator.pointerTypes && navigator.pointerTypes.includes('coarse');
  const supportsCoarse = isMobile || isCoarsePointer || typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  let mobileTableToolbar = null;
  let mobileTableWrap = null;

  function isMobileDevice() {
    return supportsCoarse;
  }

  function createMobileTableToolbar() {
    if (mobileTableToolbar) return mobileTableToolbar;

    const toolbar = document.createElement('div');
    toolbar.className = 'note-mobile-table-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Table actions');
    // Keep the toolbar hidden until a table cell is focused; visibility is
    // toggled by showMobileTableToolbar / hideMobileTableToolbar.
    toolbar.style.display = 'none';

    // Build toolbar controls from the EXISTING table toolbar template so the same
    // actions and the same <select>s are exposed (reused, not re-implemented).
    const t = translations[state.locale] || translations.en;

    toolbar.innerHTML = [
      '<button type="button" class="note-table-ctl" data-table-action="add-row" data-i18n="noteTableAddRow" title="Add row">' + (t.noteTableAddRow || '+ Row') + '</button>',
      '<button type="button" class="note-table-ctl" data-table-action="add-col" data-i18n="noteTableAddCol" title="Add column">' + (t.noteTableAddCol || '+ Col') + '</button>',
      '<button type="button" class="note-table-ctl" data-table-action="del-row" data-i18n="noteTableDelRow" title="Delete row">' + (t.noteTableDelRow || '- Row') + '</button>',
      '<button type="button" class="note-table-ctl" data-table-action="del-col" data-i18n="noteTableDelCol" title="Delete column">' + (t.noteTableDelCol || '- Col') + '</button>',
      // PHASE 02A — single visual separator: common row/column actions stay grouped
      // and prominent on the left (LTR) / right (RTL); advanced formatters (merge,
      // split, borders, alignment) remain present but visually separated so the
      // toolbar does not look crowded. One element only — no new buttons/toggles.
      '<span class="note-table-toolbar-sep" role="separator" aria-hidden="true"></span>',
      '<button type="button" class="note-table-ctl" data-table-action="merge-cells" data-i18n="noteTableMergeCells" title="Merge cells">' + (t.noteTableMergeCells || 'Merge Cells') + '</button>',
      '<button type="button" class="note-table-ctl" data-table-action="split-cell" data-i18n="noteTableSplitCell" title="Split cell" hidden>' + (t.noteTableSplitCell || 'Split Cell') + '</button>',
      // Reuse the existing border / horizontal-alignment / vertical-alignment
      // <select> builders (identical markup to the inline table toolbar) so the
      // mobile toolbar keeps every existing table action reachable.
      noteTableBorderSelectHTML(),
      noteTableHAlignSelectHTML(),
      noteTableVAlignSelectHTML()
    ].join('');

        // Dock the toolbar as a sibling AFTER the editable note body. It stays OUTSIDE
    // the contenteditable content and, as the last flex item of the note body, sits
    // just above the keyboard once the modal shrinks with the virtual keyboard.
    noteBodyInput.parentNode.appendChild(toolbar);

    // Keep editor focus + selection while tapping a toolbar button (the same
    // technique the inline table controls use) so the keyboard and caret stay put.
    toolbar.addEventListener('mousedown', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.note-table-ctl') : null;
      if (btn) e.preventDefault();
    });

    // Delegate <select> changes (borders / horizontal / vertical alignment) to
    // the SAME existing handlers as the inline toolbar — no duplicate table logic.
    toolbar.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const wrap = mobileTableWrap || (state.noteTableFocus && state.noteTableFocus.cell && state.noteTableFocus.cell.closest ? state.noteTableFocus.cell.closest('.note-table-wrap') : null);
      if (!wrap) return;
      if (t.closest('[data-table-border-select]')) { applyNoteTableBorderStyle(wrap, t.value); return; }
      if (t.closest('[data-table-h-align-select]')) { applyCellAlign('h', t.value); return; }
      if (t.closest('[data-table-v-align-select]')) { applyCellAlign('v', t.value); return; }
    });

    // Delegate clicks on toolbar buttons to the existing table action handler.
    // Uses the stored table wrap (mobileTableWrap) to find the table, so the SAME
    // handleTableAction() function is used — no duplicate logic.
    toolbar.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('[data-table-action]') : null;
      if (!btn) return;
      e.preventDefault();
      const wrap = mobileTableWrap || (state.noteTableFocus && state.noteTableFocus.cell && state.noteTableFocus.cell.closest ? state.noteTableFocus.cell.closest('.note-table-wrap') : null);
      if (!wrap) return;
      handleTableAction(btn.dataset.tableAction, wrap);
      syncMobileTableSplitButton();
    });

    mobileTableToolbar = toolbar;
    return toolbar;
  }

  function showMobileTableToolbar() {
    // Shown on every device when a table cell is active (focus/selection) — the
    // single contextual table toolbar for the note editor. It is docked as a
    // normal flex row in the existing mobile contextual toolbar area (above the
    // on-screen keyboard on phones; bottom of the editor on desktop), so the
    // page never freezes or jumps when the keyboard opens / closes.
    const toolbar = createMobileTableToolbar();
    if (!toolbar) return;
    toolbar.style.display = 'flex';
    syncMobileTableBorderSelect();
    syncMobileTableSplitButton();
  }

  // Reflect the focused table's border style in the mobile toolbar's border
  // <select> so the control always shows the active table's current state.
  function syncMobileTableBorderSelect() {
    if (!mobileTableToolbar || !mobileTableWrap) return;
    const sel = mobileTableToolbar.querySelector('[data-table-border-select]');
    if (!sel) return;
    const table = mobileTableWrap.querySelector('table.note-table');
    sel.value = table ? (table.getAttribute('data-border-style') || 'all') : 'all';
  }

  // Reflect whether a merged cell is focused/selected so the Split Cell control in
  // the mobile toolbar shows only when a merge actually exists (mirrors the inline
  // updateSplitCellButton behaviour, scoped to the mobile toolbar).
  function syncMobileTableSplitButton() {
    if (!mobileTableToolbar) return;
    const btn = mobileTableToolbar.querySelector('[data-table-action="split-cell"]');
    if (!btn) return;
    const isMerged = (cell) => !!cell && ((cell.colSpan || 1) > 1 || (cell.rowSpan || 1) > 1);
    let active = false;
    const wrap = mobileTableWrap;
    const sel = state.noteTableCellSelection;
    if (sel && wrap && sel.tableWrap === wrap) {
      active = Array.from(sel.cells || []).some(isMerged);
    } else if (state.noteTableFocus && state.noteTableFocus.cell) {
      const table = wrap && wrap.querySelector ? wrap.querySelector('table.note-table') : null;
      active = !!table && table.contains(state.noteTableFocus.cell) && isMerged(state.noteTableFocus.cell);
    }
    btn.hidden = !active;
  }

    function hideMobileTableToolbar() {
    if (!mobileTableToolbar) return;
    mobileTableToolbar.style.display = 'none';
    mobileTableWrap = null;
  }

  function updateMobileTableToolbarPosition() {
    // The toolbar is a flex row docked above the on-screen keyboard: the note
    // modal already shrinks with the virtual keyboard (dynamic viewport units),
    // so no manual repositioning is required. Kept as an idempotent hook that
    // resize / orientationchange / keyboard events can call without side effects.
    if (!mobileTableToolbar || mobileTableToolbar.style.display === 'none') return;
    syncMobileTableBorderSelect();
  }

  // Table button: reveal the compact mobile table toolbar above the keyboard on
  // coarse-pointer / mobile devices when a table already exists in the note. It
  // reuses the existing toolbar (no duplicate system); every control keeps its
  // original handler. If no table exists yet (or on fine-pointer / desktop), fall
  // back to the small insert-table panel so tables can still be created.
  if (noteTableBtn) {
    noteTableBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isMobileDevice()) { toggleNoteTablePanel(true); return; }
      const wrap = noteBodyInput.querySelector('.note-table-wrap');
      if (!wrap) { toggleNoteTablePanel(true); return; }
      mobileTableWrap = wrap;
      showMobileTableToolbar();
    });
  }

      // Show toolbar when a table cell receives focus
  noteBodyInput.addEventListener('focusin', (e) => {
    const cell = e.target && e.target.closest ? e.target.closest('.note-cell') : null;
    if (cell) {
      state.noteTableFocus = { cell };
      mobileTableWrap = cell.closest ? cell.closest('.note-table-wrap') : null;
      updateSplitCellButton();
      updateNoteCellBackgroundButton();
      updateCellAlignControls();
      showMobileTableToolbar();
    }
  });

  // Hide toolbar when focus leaves the table cell(s)
  noteBodyInput.addEventListener('focusout', (e) => {
    const relatedTarget = e.relatedTarget;
    const stillOverToolbar = mobileTableToolbar && mobileTableToolbar.contains(relatedTarget);
    const focusedCell = (state.noteTableFocus && state.noteTableFocus.cell) || null;
    const stillOverCell = focusedCell && focusedCell.contains ? focusedCell.contains(relatedTarget || null) : false;

    if (!stillOverToolbar && !stillOverCell) {
      hideMobileTableToolbar();
    }
  });

  // Hide toolbar when clicking outside the cell/ toolbar
  noteBodyInput.addEventListener('mousedown', (e) => {
    if (mobileTableToolbar && !mobileTableToolbar.contains(e.target) && !e.target.closest('.note-cell')) {
      hideMobileTableToolbar();
    }
  });

  // Update toolbar position on resize/orientation change
  window.addEventListener('resize', updateMobileTableToolbarPosition);
  window.addEventListener('orientationchange', updateMobileTableToolbarPosition);

  // Table controls: delegated change handler for the per-table border and
    // cell-alignment <select> elements.
    noteBodyInput.addEventListener('change', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const wrap = t.closest('.note-table-wrap');
      if (!wrap) return;
      const borderSel = t.closest('[data-table-border-select]');
      if (borderSel) { applyNoteTableBorderStyle(wrap, t.value); return; }
      const hSel = t.closest('[data-table-h-align-select]');
      if (hSel) { applyCellAlign('h', t.value); return; }
      const vSel = t.closest('[data-table-v-align-select]');
      if (vSel) { applyCellAlign('v', t.value); return; }
    });
    noteBodyInput.addEventListener('mousedown', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const ctl = t.closest('.note-table-ctl');
      if (ctl) {
        // Keep focus + selection inside the editor (existing behaviour), and,
        // for the Merge Cells button, capture a live drag-selection when the
        // user did not make an explicit shift+click selection.
        e.preventDefault();
        const wrap = ctl.closest('.note-table-wrap');
        if (wrap && ctl.dataset && ctl.dataset.tableAction === 'merge-cells') snapshotLiveTableSelection(wrap);
        return;
      }
      const cell = t.closest('.note-cell');
      if (cell) {
        if (e.shiftKey) extendCellSelection(cell);
        else if (e.ctrlKey || e.metaKey) setCellSelection(cell);
        else setCellSelection(cell);
        updateSplitCellButton();
        syncMobileTableSplitButton();
        updateNoteCellBackgroundButton();
        updateCellAlignControls();
        return;
      }
      // Clicking the cell-alignment controls must not cancel the current cell
      // selection (so alignment applies to every focused/selected cell).
      if (t.closest('[data-table-h-align-select], [data-table-v-align-select]')) return;
      // Clicking anywhere else in the editor cancels any pending merge selection.
      clearNoteTableCellSelection();
      updateSplitCellButton();
      updateNoteCellBackgroundButton();
      updateCellAlignControls();
    });
    noteBodyInput.addEventListener('click', (e) => {
      const ctl = e.target && e.target.closest ? e.target.closest('[data-table-action]') : null;
      if (!ctl) return;
      const wrap = ctl.closest('.note-table-wrap');
      if (!wrap) return;
      e.preventDefault();
      handleTableAction(ctl.dataset.tableAction, wrap);
    });
  }
  if (saveFullScreenNote) {
    saveFullScreenNote.addEventListener('click', () => {
      saveCurrentOpenNote();
      closeFullScreenNote();
    });
  }
  if (sendNoteButton) {
    sendNoteButton.addEventListener('click', () => {
      sendCurrentNote();
    });
  }
  // PHASE 06 — wire the Notes PDF Preview workspace (nav / zoom / rotate / share).
  // Live-edit flush is registered BEFORE initNotePdfPreviewControls so it runs
  // before the open-preview listener (same flush pattern as the export handler).
  if (notePreviewPdfBtn) {
    notePreviewPdfBtn.addEventListener('click', () => { saveCurrentOpenNote(); });
  }
  initNotePdfPreviewControls();
  // INSTANT EXPORT — Note → PDF. The header PDF button builds the PDF from the
  // open note's own title/body/Style and shares or downloads it IMMEDIATELY
  // (one click). There is no setup dialog, no Preview/Create PDF pair and no
  // Company Profile option anymore; performNotePdfExport flushes the live edits,
  // reuses the existing buildNotePdfBlob pipeline (no PDF engine changes) and
  // resolves through the cached first-tap path.
  if (exportNotePdfBtn) {
    exportNotePdfBtn.addEventListener('click', () => {
      // Flush live edits FIRST so performNotePdfExport sees the on-screen content.
      saveCurrentOpenNote();
      performNotePdfExport();
    });
  }
  if (deleteCurrentNote) {
    deleteCurrentNote.addEventListener('click', () => {
      if (state.currentOpenNote) {
        showDeleteConfirm(state.currentOpenNote.id);
      }
    });
  }

  // Currency converter
  if (currencyConverterCloseButton) {
    currencyConverterCloseButton.addEventListener('click', closeCurrencyConverter);
  }
  if (currencyConverterModal) {
    currencyConverterModal.addEventListener('click', (e) => {
      if (e.target === currencyConverterModal) closeCurrencyConverter();
    });
  }
  if (swapCurrenciesButton) {
    swapCurrenciesButton.addEventListener('click', swapCurrencies);
  }
  if (currencySpeakButton) {
    currencySpeakButton.addEventListener('click', () => {
      triggerButtonFeedback();
      speakCurrencyResult();
    });
  }
  if (currencyResetButton) {
    currencyResetButton.addEventListener('click', () => {
      triggerButtonFeedback();
      resetCurrencyConverter();
    });
  }
  // Custom-rate converter (تحويل بسعر مخصص)
  if (customRateBackButton) {
    customRateBackButton.addEventListener('click', () => {
      triggerButtonFeedback();
      closeCustomRateConverter();
    });
  }
  if (customRateResetButton) {
    customRateResetButton.addEventListener('click', () => {
      triggerButtonFeedback();
      resetCustomRateConverter();
    });
  }
  if (customRateModal) {
    customRateModal.addEventListener('click', (e) => {
      if (e.target === customRateModal) closeCustomRateConverter();
    });
  }
  if (customRateInput) {
    customRateInput.addEventListener('input', updateCustomRateResult);
  }
  if (customAmountInput) {
    customAmountInput.addEventListener('input', updateCustomRateResult);
  }
  if (customRateSpeakButton) {
    customRateSpeakButton.addEventListener('click', () => {
      triggerButtonFeedback();
      speakCustomRateResult();
    });
  }
  if (showFavoritesButton) {
    showFavoritesButton.addEventListener('click', showFavoritesList);
  }
  if (showRecentButton) {
    showRecentButton.addEventListener('click', showRecentList);
  }
  if (favoriteFromButton) {
    favoriteFromButton.addEventListener('click', () => toggleFavorite('from'));
  }
  if (favoriteToButton) {
    favoriteToButton.addEventListener('click', () => toggleFavorite('to'));
  }
  if (currencyFromSelect) {
    currencyFromSelect.addEventListener('change', () => {
      if (currencyServiceInstance) {
        currencyServiceInstance.addToRecent(currencyFromSelect.value);
      }
      updateFavoriteButtons(currencyFromSelect.value, currencyToSelect ? currencyToSelect.value : '');
      updateConverterOutput();
    });
  }
  if (currencyToSelect) {
    currencyToSelect.addEventListener('change', () => {
      if (currencyServiceInstance) {
        currencyServiceInstance.addToRecent(currencyToSelect.value);
      }
      updateFavoriteButtons(currencyFromSelect ? currencyFromSelect.value : '', currencyToSelect.value);
      updateConverterOutput();
    });
  }
  if (currencyFromAmount) {
    currencyFromAmount.addEventListener('input', updateConverterOutput);
  }
  if (currencyDirectoryButton) {
    currencyDirectoryButton.addEventListener('click', openCurrencyDirectory);
  }
  if (refreshRatesButton) {
    refreshRatesButton.addEventListener('click', async () => {
      // Refresh: clear the entered amount, result and words, stop any ongoing
      // speech, keep the screen open and keep the currently selected currencies.
      stopCurrencySpeech();
      resetCurrencyConverter();
      // PART 21: refreshing LIVE rates needs internet. Offline → clear translated
      // feedback immediately (no freeze), converter keeps working with cached data.
      if (isOffline()) showInternetRequiredToast();
      const spinIcon = refreshRatesButton.querySelector('.fa-rotate');
      if (spinIcon) spinIcon.classList.add('spinning');
      try {
        await fetchCurrencyRates();
        updateConverterOutput();
      } catch (e) {
        // Rates failed to update; the converter keeps working with cached data.
        // PART 21: offline → clear translated feedback, no silent failure, no freeze.
        if (isOffline()) showInternetRequiredToast();
      }
      if (spinIcon) setTimeout(() => spinIcon.classList.remove('spinning'), 700);
    });
  }
  if (marketRateInput) {
    marketRateInput.addEventListener('input', () => {
      const val = parseFloat(marketRateInput.value);
      state.marketRate = isNaN(val) ? null : val;
      updateConverterOutput();
    });
  }
  converterModeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setConverterMode(btn.getAttribute('data-converter-mode'));
    });
  });

  // Currency directory
  if (currencyCloseButton) {
    currencyCloseButton.addEventListener('click', closeCurrencyDirectory);
  }
  if (currencyDirectoryModal) {
    currencyDirectoryModal.addEventListener('click', (e) => {
      if (e.target === currencyDirectoryModal) closeCurrencyDirectory();
    });
  }
  if (currencySearchInput) {
    currencySearchInput.addEventListener('input', handleCurrencySearch);
  }
  if (currencyList) {
    currencyList.addEventListener('click', (e) => {
      const item = e.target.closest('.currency-list-item');
      if (item) {
        const code = item.getAttribute('data-code');
        if (currencyFromSelect) currencyFromSelect.value = code;
        if (currencyServiceInstance) currencyServiceInstance.addToRecent(code);
        updateFavoriteButtons(currencyFromSelect ? currencyFromSelect.value : '', currencyToSelect ? currencyToSelect.value : '');
        updateConverterOutput();
        closeCurrencyDirectory();
        openCurrencyConverter();
      }
    });
  }

  // Currency Rates screen
  if (currencyRatesBackButton) {
    currencyRatesBackButton.addEventListener('click', closeCurrencyRates);
  }
  if (currencyRatesCloseButton) {
    currencyRatesCloseButton.addEventListener('click', closeCurrencyRates);
  }
  if (currencyRatesModal) {
    currencyRatesModal.addEventListener('click', (e) => {
      if (e.target === currencyRatesModal) closeCurrencyRates();
    });
  }
  if (currencyRatesSearchInput) {
    currencyRatesSearchInput.addEventListener('input', renderCurrencyRates);
  }
  if (currencyRatesList) {
    currencyRatesList.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.currency-rates-fav');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        const code = favBtn.getAttribute('data-code');
        if (currencyServiceInstance && code) {
          if (currencyServiceInstance.isFavorite(code)) {
            currencyServiceInstance.removeFromFavorites(code);
          } else {
            currencyServiceInstance.addToFavorites(code);
          }
          renderCurrencyRates();
        }
      }
    });
  }

  // Currency Favorites screen
  if (currencyFavoritesBackButton) {
    currencyFavoritesBackButton.addEventListener('click', closeCurrencyFavorites);
  }
  if (currencyFavoritesModal) {
    currencyFavoritesModal.addEventListener('click', (e) => {
      if (e.target === currencyFavoritesModal) closeCurrencyFavorites();
    });
  }
  if (currencyFavoritesList) {
    currencyFavoritesList.addEventListener('click', (e) => {
      const favBtn = e.target.closest('.currency-favorites-fav');
      if (favBtn) {
        e.preventDefault();
        e.stopPropagation();
        const code = favBtn.getAttribute('data-code');
        if (currencyServiceInstance && code) {
          if (currencyServiceInstance.isFavorite(code)) {
            currencyServiceInstance.removeFromFavorites(code);
          } else {
            currencyServiceInstance.addToFavorites(code);
          }
          renderCurrencyFavorites();
        }
      }
    });
  }


  // Keyboard
  document.addEventListener('keydown', handleKeydown);

  // Window resize for viewport height
  window.addEventListener('resize', syncViewportHeight);
}

// ============================================================
// INITIALIZE
// ============================================================
function initialize() {
  // PART 36B — PDF V1 release-surface gate (scoped, non-destructive).
  // V2 implementations remain in code; V1 only hides them from the user.
  try {
    if (typeof document !== 'undefined' && document.body) {
      document.body.setAttribute('data-pdf-v1', '1');
    }
  } catch (e) {}
  // Load stored language
  const savedLanguage = getLocaleFromStorage();
  state.locale = savedLanguage;

  // Load persisted App Sounds / Sound Profile / Speaker preferences
  loadSoundPreferences();

  // Set initial language
  if (languageSelect) languageSelect.value = state.locale;
  if (topBarLanguageSelect) topBarLanguageSelect.value = state.locale;

  // Initialize theme (OLED Pitch Black default, persisted in localStorage)
  setTheme(getSavedTheme());

  // Update texts
  updateTexts();

  // Set RTL if needed
  const html = document.documentElement;
  html.lang = state.locale;
  html.dir = (state.locale === 'ar' || state.locale === 'ku') ? 'rtl' : 'ltr';
  document.body.setAttribute('data-language', state.locale);
  state.isRTL = (state.locale === 'ar' || state.locale === 'ku');

  // Load history (also removes expired entries on startup)
  loadHistory();
  cleanupExpiredHistory();
  renderHistory();
  // Preload the PDF library now (background) so the first Share tap never has to
  // fetch html2pdf from the CDN — that fetch was the cause of the lost activation.
  preloadPdfLibrary();
  // Warm the Share PDF cache in the background so the native Share Sheet can open
  // on the very first tap (fixes "Share sometimes needs multiple clicks").
  primePdfBlobCache();
  // Refresh countdown timers on startup
  startHistoryCountdown();
  updateHistoryCountdown();

  // Load notes
  loadNoteData();
  loadQuickNotes();

  // Wire events
  wireEvents();

  // Initialize Calculator Manager with the Standard Calculator mode
  const calculatorManager = getCalculatorManager();
  standardCalculator = new StandardCalculator();
  standardCalculator.state = state;
  standardCalculator.translations = translations;
  standardCalculator.locale = state.locale;
  standardCalculator.feedback = triggerButtonFeedback;
  // Preserve the app's history, speech and error/toast integrations exactly by
  // delegating their side-effects back to the existing app functions.
  standardCalculator.onAddHistory = addHistory;
  standardCalculator.onSpeak = () => speakCurrentResult(true);
  standardCalculator.onError = () => showToast('Error');
  calculatorManager.registerMode('general', standardCalculator);
  calculatorManager.bindModeSwitchButtons((modeName) => {
    calculatorManager.switchMode(modeName);
  });
  calculatorManager.switchMode('general');

  // Wire the shared history engine to the app's renderHistory for backward compatibility
  const sharedHistory = getHistoryEngine();
  sharedHistory.setOnChange(() => {
    renderHistory();
  });

  // Init currency in background (non-blocking)
  initializeCurrencyServiceInBackground();

  // Register service worker
  registerServiceWorker();

  // Sync viewport height
  syncViewportHeight();

  // Set display initial values
  updatePrimaryDisplay();
  updateSecondaryDisplay();
  updateExpressionDisplay();
}

// Guard for browser environment - only run initialize in browser
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialize);
}
