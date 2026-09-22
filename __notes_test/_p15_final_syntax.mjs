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
// PART 09 — Notes Editor Image toolbar button (opens Upload/Camera menu).
const noteImageBtn = typeof document !== 'undefined' ? document.getElementById('noteImageBtn') : null;
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
    title: 'EQ',
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
    noteImageLabel: 'Image', noteImageUpload: 'Upload', noteImageCamera: 'Camera',
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
    shareTitle: 'EQ Calculator History',
    shareMessage: 'Exported from EQ Calculator',
    themeDark: 'Dark',
    themeLight: 'Light',
    themeViolet: 'Violet',
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
    drawerTitle: 'EQ',
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
    helpSubtitle: 'Learn how to use EQ and discover its features.',
    helpAboutTitle: 'About the App',
    helpAboutDesc: 'EQ is a smart, all-in-one calculator that combines everyday math, scientific and percentage tools, currency conversion and much more in one simple, easy-to-use app.',
    helpWhyTitle: 'Why was EQ created?',
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
    helpSecHistoryDesc: 'EQ remembers what you calculated in the last 24 hours so you can review or share it.',
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
    helpSetTheme: 'Theme: choose Dark, Light or Violet appearance.',
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
    helpInstallDesc1: 'You can install EQ as an app on supported devices.',
    helpInstallDesc2: 'Some features work offline using stored resources, but live currency rates and app updates need an internet connection.',
    helpBenefitsTitle: 'Why Use EQ?',
    helpBenefit1: 'All-in-one calculator',
    helpBenefit2: 'Fast everyday calculations',
    helpBenefit3: 'Scientific and percentage tools',
    helpBenefit4: 'Currency conversion',
    helpBenefit5: 'History and notes',
    helpBenefit6: 'Multi-language interface',
    helpBenefit7: 'Responsive design and PWA support',
    helpLangTitle: 'Languages',
    helpLangDesc: 'EQ is fully translated. Choose your language in the top bar or in Settings, and the whole app — including this help page — updates instantly.'
  },
  es: {
    eyebrow: '',
    title: 'EQ',
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
    shareTitle: 'Historial de Calculadora EQ',
    shareMessage: 'Exportado desde Calculadora EQ',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    themeViolet: 'Violeta',
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
    drawerTitle: 'EQ',
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
    noteImageLabel: 'Imagen', noteImageUpload: 'Subir', noteImageCamera: 'Cámara',
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
    helpSubtitle: 'Aprende a usar EQ y descubre sus funciones.',
    helpAboutTitle: 'Acerca de la aplicación',
    helpAboutDesc: 'EQ es una calculadora inteligente y completa que reúne en una sola aplicación sencilla las operaciones diarias, las herramientas científicas y de porcentaje, la conversión de moneda y mucho más.',
    helpWhyTitle: '¿Por qué se creó EQ?',
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
    helpSecHistoryDesc: 'EQ recuerda lo que calculaste en las últimas 24 horas para que puedas revisarlo o compartirlo.',
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
    helpSetTheme: 'Tema: elige la apariencia Oscura, Clara o Violeta.',
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
    helpInstallDesc1: 'Puedes instalar EQ como aplicación en dispositivos compatibles.',
    helpInstallDesc2: 'Algunas funciones funcionan sin conexión con recursos guardados, pero las tasas en vivo y las actualizaciones necesitan internet.',
    helpBenefitsTitle: '¿Por qué usar EQ?',
    helpBenefit1: 'Calculadora todo en uno',
    helpBenefit2: 'Cálculos diarios rápidos',
    helpBenefit3: 'Herramientas científicas y de porcentaje',
    helpBenefit4: 'Conversión de moneda',
    helpBenefit5: 'Historial y notas',
    helpBenefit6: 'Interfaz multilingüe',
    helpBenefit7: 'Diseño adaptable y soporte PWA',
    helpLangTitle: 'Idiomas',
    helpLangDesc: 'EQ está totalmente traducido. Elige tu idioma en la barra superior o en Configuración y toda la aplicación, incluida esta página de ayuda, se actualiza al instante.'
  },
  ar: {
    eyebrow: '',
    title: 'EQ',
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
    noteImageLabel: 'صورة', noteImageUpload: 'رفع', noteImageCamera: 'الكاميرا',
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
    shareTitle: 'سجل حاسبة EQ',
    shareMessage: 'تم التصدير من حاسبة EQ',
    themeDark: 'داكن',
    themeLight: 'فاتح',
    themeViolet: 'بنفسجي',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',
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
    drawerTitle: 'EQ',
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
    helpSubtitle: 'تعلّم كيفية استخدام EQ واكتشف مزاياه.',
    helpAboutTitle: 'عن التطبيق',
    helpAboutDesc: 'EQ حاسبة ذكية وشاملة تجمع بين الحسابات اليومية والأدوات العلمية وحساب النسبة المئوية وتحويل العملات وكل ذلك في تطبيق واحد سهل الاستخدام.',
    helpWhyTitle: 'لماذا أُنشئ EQ؟',
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
    helpSecHistoryDesc: 'يحفظ EQ ما حاسبته في آخر 24 ساعة لتعيد الاطلاع عليه أو تشاركه.',
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
    helpSetTheme: 'السمة: اختر المظهر الداكن أو الفاتح أو البنفسجي.',
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
    helpInstallDesc1: 'يمكنك تثبيت EQ كتطبيق على الأجهزة المدعومة.',
    helpInstallDesc2: 'بعض الميزات تعمل دون اتصال باستخدام موارد مخزنة، لكن الأسعار المباشرة وتحديثات التطبيق تحتاج إلى اتصال بالإنترنت.',
    helpBenefitsTitle: 'لماذا تستخدم EQ؟',
    helpBenefit1: 'حاسبة شاملة للكل',
    helpBenefit2: 'حسابات يومية سريعة',
    helpBenefit3: 'أدوات علمية وحساب نسبة مئوية',
    helpBenefit4: 'تحويل العملات',
    helpBenefit5: 'السجل والملاحظات',
    helpBenefit6: 'واجهة متعددة اللغات',
    helpBenefit7: 'تصميم متجاوب ودعم PWA',
    helpLangTitle: 'اللغات',
    helpLangDesc: 'EQ مترجم بالكامل. اختر لغتك من الشريط العلوي أو من الإعدادات، وسيتم تحديث التطبيق بالكامل — بما في ذلك صفحة المساعدة هذه — فورًا.'
  },
  fr: {
    eyebrow: '',
    title: 'EQ',
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
    shareTitle: 'Historique de Calculatrice EQ',
    shareMessage: 'Exporté depuis Calculatrice EQ',
    themeDark: 'Sombre',
    themeLight: 'Clair',
    themeViolet: 'Violet',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',
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
    drawerTitle: 'EQ',
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
    noteImageLabel: 'Image', noteImageUpload: 'Importer', noteImageCamera: 'Appareil photo',
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
    helpSubtitle: 'Apprenez à utiliser EQ et découvrez ses fonctionnalités.',
    helpAboutTitle: 'À propos de l’application',
    helpAboutDesc: 'EQ est une calculatrice intelligente et complète qui réunit calculs du quotidien, outils scientifiques et de pourcentage, conversion de devises et bien plus dans une seule application simple à utiliser.',
    helpWhyTitle: 'Pourquoi EQ a-t-il été créé ?',
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
    helpSecHistoryDesc: 'EQ mémorise ce que vous avez calculé au cours des 24 dernières heures pour le revoir ou le partager.',
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
    helpSetTheme: 'Thème : choisissez l’apparence Sombre, Claire ou Violette.',
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
    helpInstallDesc1: 'Vous pouvez installer EQ comme application sur les appareils pris en charge.',
    helpInstallDesc2: 'Certaines fonctionnalités fonctionnent hors ligne avec des ressources stockées, mais les taux en direct et les mises à jour nécessitent une connexion Internet.',
    helpBenefitsTitle: 'Pourquoi utiliser EQ ?',
    helpBenefit1: 'Calculatrice tout-en-un',
    helpBenefit2: 'Calculs quotidiens rapides',
    helpBenefit3: 'Outils scientifiques et de pourcentage',
    helpBenefit4: 'Conversion de devises',
    helpBenefit5: 'Historique et notes',
    helpBenefit6: 'Interface multilingue',
    helpBenefit7: 'Design responsive et support PWA',
    helpLangTitle: 'Langues',
    helpLangDesc: 'EQ est entièrement traduit. Choisissez votre langue dans la barre supérieure ou dans les Paramètres, et toute l’application — y compris cette page d’aide — se met à jour instantanément.'
  },
  ru: {
    eyebrow: '',
    title: 'EQ',
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
    shareTitle: 'История калькулятора EQ',
    shareMessage: 'Экспортировано из калькулятора EQ',
    themeDark: 'Тёмная',
    themeLight: 'Светлая',
    themeViolet: 'Фиолетовая',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',
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
    drawerTitle: 'EQ',
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
    noteImageLabel: 'Изображение', noteImageUpload: 'Загрузить', noteImageCamera: 'Камера',
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
    helpSubtitle: 'Узнайте, как пользоваться EQ и познакомьтесь с его функциями.',
    helpAboutTitle: 'О приложении',
    helpAboutDesc: 'EQ — это умный многофункциональный калькулятор, который объединяет повседневные расчёты, научные и процентные инструменты, конвертацию валют и многое другое в одном простом приложении.',
    helpWhyTitle: 'Зачем был создан EQ?',
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
    helpSecHistoryDesc: 'EQ запоминает ваши вычисления за последние 24 часа, чтобы вы могли их просмотреть или поделиться ими.',
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
    helpSetTheme: 'Тема: выберите Тёмный, Светлый или Фиолетовый вид.',
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
    helpInstallDesc1: 'Вы можете установить EQ как приложение на поддерживаемых устройствах.',
    helpInstallDesc2: 'Некоторые функции работают офлайн на сохранённых данных, но актуальные курсы и обновления приложения требуют подключения к интернету.',
    helpBenefitsTitle: 'Зачем использовать EQ?',
    helpBenefit1: 'Всё в одном калькуляторе',
    helpBenefit2: 'Быстрые повседневные расчёты',
    helpBenefit3: 'Научные и процентные инструменты',
    helpBenefit4: 'Конвертация валют',
    helpBenefit5: 'История и заметки',
    helpBenefit6: 'Многоязычный интерфейс',
    helpBenefit7: 'Адаптивный дизайн и поддержка PWA',
    helpLangTitle: 'Языки',
    helpLangDesc: 'EQ полностью переведён. Выберите язык в верхней панели или в Настройках, и всё приложение — включая эту страницу справки — обновится мгновенно.'
  },
  de: {
    eyebrow: '',
    title: 'EQ',
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
    shareTitle: 'EQ-Rechner-Verlauf',
    shareMessage: 'Exportiert aus EQ-Rechner',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    themeViolet: 'Violett',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',
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
    drawerTitle: 'EQ',
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
    noteImageLabel: 'Bild', noteImageUpload: 'Hochladen', noteImageCamera: 'Kamera',
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
    helpSubtitle: 'Erfahren Sie, wie Sie EQ nutzen und entdecken Sie seine Funktionen.',
    helpAboutTitle: 'Über die App',
    helpAboutDesc: 'EQ ist ein intelligenter All-in-One-Rechner, der Alltagsmathematik, wissenschaftliche und Prozentwerkzeuge, Währungsrechnung und vieles mehr in einer einfachen, benutzerfreundlichen App vereint.',
    helpWhyTitle: 'Warum wurde EQ entwickelt?',
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
    helpSecHistoryDesc: 'EQ merkt sich, was Sie in den letzten 24 Stunden berechnet haben, damit Sie es überprüfen oder teilen können.',
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
    helpSetTheme: 'Design: wählen Sie Dunkel, Hell oder Violett.',
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
    helpInstallDesc1: 'Sie können EQ auf unterstützten Geräten als App installieren.',
    helpInstallDesc2: 'Einige Funktionen funktionieren offline mit gespeicherten Ressourcen, aber Live-Kurse und App-Updates benötigen eine Internetverbindung.',
    helpBenefitsTitle: 'Warum EQ verwenden?',
    helpBenefit1: 'All-in-One-Rechner',
    helpBenefit2: 'Schnelle tägliche Berechnungen',
    helpBenefit3: 'Wissenschaftliche und Prozentwerkzeuge',
    helpBenefit4: 'Währungsrechnung',
    helpBenefit5: 'Verlauf und Notizen',
    helpBenefit6: 'Mehrsprachige Oberfläche',
    helpBenefit7: 'Responsives Design und PWA-Support',
    helpLangTitle: 'Sprachen',
    helpLangDesc: 'EQ ist vollständig übersetzt. Wählen Sie Ihre Sprache in der oberen Leiste oder in den Einstellungen, und die gesamte App – einschließlich dieser Hilfeseite – wird sofort aktualisiert.'
  },
  tr: {
    eyebrow: '',
    title: 'EQ',
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
    shareTitle: 'EQ Hesap Makinesi Geçmişi',
    shareMessage: 'EQ Hesap Makinesi\'nden dışa aktarıldı',
    themeDark: 'Koyu',
    themeLight: 'Açık',
    themeViolet: 'Mor',
    languageEnglish: 'English',
    languageSpanish: 'Español',
    languageArabic: 'العربية',
    languageFrench: 'Français',
    languageRussian: 'Русский',
    languageGerman: 'Deutsch',
    languageTurkish: 'Türkçe',
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
    drawerTitle: 'EQ',
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
    noteImageLabel: 'Görsel', noteImageUpload: 'Yükle', noteImageCamera: 'Kamera',
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
    helpSubtitle: 'EQ’yu nasıl kullanacağınızı öğrenin ve özelliklerini keşfedin.',
    helpAboutTitle: 'Uygulama Hakkında',
    helpAboutDesc: 'EQ, günlük matematiği, bilimsel ve yüzde araçlarını, döviz çevirmeyi ve çok daha fazlasını tek bir basit, kullanımı kolay uygulamada birleştiren akıllı, çok yönlü bir hesap makinesidir.',
    helpWhyTitle: 'EQ neden oluşturuldu?',
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
    helpSecHistoryDesc: 'EQ, son 24 saatte hesapladıklarınızı hatırlar, böylece inceleyebilir veya paylaşabilirsiniz.',
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
    helpSetTheme: 'Tema: Koyu, Açık veya Mor görünümü seçin.',
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
    helpInstallDesc1: 'EQ’yu desteklenen cihazlara bir uygulama olarak kurabilirsiniz.',
    helpInstallDesc2: 'Bazı özellikler depolanan kaynaklarla çevrimdışı çalışır, ancak canlı kurlar ve uygulama güncellemeleri internet bağlantısı gerektirir.',
    helpBenefitsTitle: 'Neden EQ?',
    helpBenefit1: 'Hepsi bir arada hesap makinesi',
    helpBenefit2: 'Hızlı günlük hesaplamalar',
    helpBenefit3: 'Bilimsel ve yüzde araçları',
    helpBenefit4: 'Döviz çevirme',
    helpBenefit5: 'Geçmiş ve notlar',
    helpBenefit6: 'Çok dilli arayüz',
    helpBenefit7: 'Duyarlı tasarım ve PWA desteği',
    helpLangTitle: 'Diller',
    helpLangDesc: 'EQ tamamen çevrilmiştir. Dilinizi üst çubukta veya Ayarlar’da seçin; bu yardım sayfası dahil tüm uygulama anında güncellenir.'
  }
};

// ============================================================
// STATE
// ============================================================
const state = {
  locale: 'en',
  theme: 'dark',
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
  // PART 3 — Smart Documents workflow stage (1=Start,2=Edit,3=Review,4=Export)
  smartDocsStep: 1,
  // PART 5 — result of a Smart Documents PDF import (type, text, images, name)
  smartImportResult: null,
  // PART 6 — blank document workspace state (type, name, content, pageSize, pageCount)
  smartBlankDoc: null,
  // PART 7 — Smart Documents selected template (id, group). Selection hook only.
  smartSelectedTemplate: null,
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
  if (value === 'sqrt(') {
    if (state.displayValue !== '0' && !state.startNewNumber) {
      state.displayValue = state.displayValue + '*';
      state.startNewNumber = true;
    }
    state.displayValue = 'sqrt(' + state.displayValue + ')';
    state.startNewNumber = true;
  } else if (value === '^2') {
    state.displayValue = state.displayValue + '^2';
  } else if (value === '(') {
    state.displayValue = state.displayValue + '(';
    state.startNewNumber = true;
  } else if (value === ')') {
    state.displayValue = state.displayValue + ')';
  }
  updatePrimaryDisplay();
  syncExpressionDisplay();
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
    // Arabic/English speech: speak the number as words (integer + parts-of-100)
    // so TTS never says the decimal separator, and so a long decimal tail is
    // never spoken as a giant number. On-screen display stays unchanged.
    const text = (state.locale === 'ar' || state.locale === 'en') && !Number.isNaN(Number(state.displayValue))
      ? resultNumberToWords(roundDisplayValue(state.displayValue, 2), state.locale)
      : `${state.displayValue}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';
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
  try {
    localStorage.setItem(LANGUAGE_KEY, locale);
  } catch (e) { /* ignore */ }
  const html = document.documentElement;
  html.lang = locale;
  html.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.body.setAttribute('data-language', locale);
  state.isRTL = locale === 'ar';
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
  // PART 11 — keep the Smart Documents editor direction in sync with the locale
  // (scoped to #smartBlankView only — the main app direction is never touched).
  if (typeof smartBlankApplyDirection === 'function') smartBlankApplyDirection();
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
function setTheme(theme) {
  state.theme = theme;
  document.body.setAttribute('data-theme', theme);
  // Keep the document root (<html>) painted with the current theme's base color.
  // The themed `--bg` variables are scoped to <body> only, so <html> keeps the
  // browser's default WHITE canvas. Pressing `=` auto-reads the result via
  // speech synthesis, forcing a full-viewport repaint that momentarily drops the
  // <body> background and briefly exposes that white root (the background flash).
  // Painting the root with the theme color removes the flash without changing any
  // logic, color, or behavior. Values mirror the existing --bg vars (no color change).
  const themeBackgrounds = { dark: '#07111f', light: '#f2f7ff', violet: '#140d26' };
  document.documentElement.style.backgroundColor = themeBackgrounds[theme] || themeBackgrounds.dark;
  const colorScheme = theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : 'dark';
  document.body.style.colorScheme = colorScheme;
  themeButtons.forEach((btn) => {
    const btnTheme = btn.getAttribute('data-theme');
    btn.classList.toggle('active', btnTheme === theme);
  });
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
    // Arabic/English speech reads the number as words (same rule as the
    // calculator display speaker) so TTS never says decimal separators.
    const text = isNumeric && (state.locale === 'ar' || state.locale === 'en')
      ? resultNumberToWords(roundDisplayValue(cleaned, 2), state.locale)
      : raw;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';
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
  tr: ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi']
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
        titlePh: 'Rapor başlığı (isteğe bağlı)', companyNameBtn: 'Şirket Adı' }
};
// Same direction rule the app already uses in applyLanguage: Arabic -> rtl, all
// other supported app languages -> ltr. Reused, not a new RTL/LTR system.
function pdfReportLocaleDir(locale) { return locale === 'ar' ? 'rtl' : 'ltr'; }

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
  const brandTitle = 'EQ Calculator';
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
  /* Professional 3-part header: EQ7 logo (LEFT) | report title (CENTER) |
     date/time (RIGHT). direction is forced to ltr so the PHYSICAL positions
     never swap in RTL — the logo stays on the left edge side and the date on
     the right edge side regardless of the app language. Text inside each part
     still follows the app language direction. */
  .report-header { display: flex; align-items: center; gap: 16px;
                   border-bottom: 3px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px;
                   text-align: center; direction: ltr; }
  .hdr-logo { flex: 0 0 64px; }
  .hdr-brand { display: block; font-size: 30px; font-weight: 800; color: #0891b2; letter-spacing: 1px; line-height: 1; }
  .hdr-title { flex: 1 1 auto; min-width: 0; }
/* Safe right-side margin for the Time/Date/Weekday block ONLY: widen the
   flex basis to fit longer weekday strings (Turkish/Spanish/French/etc.) and
   add padding-inline-end so right-aligned text can never touch the paper edge.
   inline-end is the physical right edge in both LTR and RTL, so Arabic RTL
   behavior is preserved. No font sizes, header height, or PDF dimensions change. */
.hdr-date { flex: 0 0 190px; text-align: right; color: #000000; line-height: 1.35; padding-inline-end: 8px; }
  .hdr-date .hdr-time { font-size: 13px; font-weight: 700; }
  .hdr-date .hdr-date2 { font-size: 12px; font-weight: 600; }
  .hdr-date .hdr-weekday { font-size: 12px; font-weight: 500; margin-top: 2px; }
  .report-header h1 { font-size: 24px; color: #000000; margin-bottom: 4px; letter-spacing: .5px; }
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
      ${APP_DOMAIN ? `<a class="footer-domain" href="${escapeHtml(APP_DOMAIN)}" target="_blank">Open EQ Calculator</a>` : ''}
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
  bar.setAttribute('dir', state.locale === 'ar' ? 'rtl' : 'ltr');
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
        title: t.shareTitle || 'EQ Calculator History',
        text: t.shareMessage || 'Exported from EQ Calculator'
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

  const pdfFile = new File([pdfBlob], 'EQ-Calculator-History.pdf', { type: 'application/pdf' });

  // Native System Share Sheet, exactly like the original behavior — open the device's own
  // Share Sheet (WhatsApp / Telegram / Email / etc.), but sharing the real PDF instead of text.
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: 'EQ Calculator',
        text: 'Created with EQ Calculator'
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

function smartDocStepsReached(step) {
  // Steps <= current stage are active (current + all previous).
    // Update every stepper widget so the shared stage state also drives the scan
  // workflow stepper, without creating a second stage system.
  const tracks = document.querySelectorAll('.smart-steps-track');
  if (!tracks.length) return;
  tracks.forEach((track) => {
    track.setAttribute('data-step', String(step));
    track.querySelectorAll('.smart-step').forEach((node) => {
      const n = parseInt(node.getAttribute('data-step'), 10);
      if (n === step) node.classList.add('is-current');
      else node.classList.remove('is-current');
      if (n <= step) node.classList.add('is-active');
      else node.classList.remove('is-active');
    });
  });
}

// PART 3 — central workflow navigation hook. Clamps 1..4, persists in state,
// and re-renders the indicator. Future phases call this to advance the flow.
function setSmartDocsStep(rawStep) {
  const step = Math.min(4, Math.max(1, parseInt(rawStep, 10) || 1));
  state.smartDocsStep = step;
  smartDocStepsReached(step);
  return step;
}

function renderSmartDocsSteps() {
  smartDocStepsReached(state.smartDocsStep || 1);
}

// PART 3 — expose the workflow hook for future phases & behavioral tests.
// scoped to the Smart Documents feature; no global refactor.
window.__smartDocsWorkflow = {
  setStep: (n) => setSmartDocsStep(n),
  getStep: () => (state && state.smartDocsStep) || 1,
  render: () => renderSmartDocsSteps()
};

// PART 4 — test / configuration seam for the Smart Scan workflow.
window.__smartScan = {
  getState: () => ({
    stage: smartScanStageName(),
    step: (state && state.smartDocsStep) || 1,
    result: (state && state.smartScanResult) || null,
    recognized: smartScanRecognized,
    inkRatio: smartWorkInk,
    structure: smartScanStructure,
    activeTracks: smartScanActiveTracks(),
    cameraMode: smartScanCameraMode,
  }),
  open: () => smartScanOpen(),
  setOcrResult: (text) => { smartScanOcrOverride = (text === null || text === undefined) ? null : String(text); },
  clearOcrResult: () => { smartScanOcrOverride = null; },
  // PART 16 — direct structure-analysis seam (behavioral tests / future phases).
  analyzeStructure: (text) => smartScanAnalyzeStructure(text),
  debugMode: (mode) => { smartScanCameraMode = (mode === 'blocked' || mode === 'live') ? mode : 'auto'; },
  reset: () => smartScanResetToHome(),
  stopCamera: () => smartScanStopCamera(),
  activeTracks: () => smartScanActiveTracks(),
  isStreamStopped: () => smartScanActiveTracks().length === 0,
};

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
  const anyOpen = document.querySelector('.modal.show, .workspace-overlay.show');
  if (!anyOpen) document.body.classList.remove('modal-open');
}

function openSmartDocs() {
  if (smartDocsModal) {
    smartDocsModal.classList.add('show');
    // PART 20 — refresh the saved-draft banner every time home opens.
    if (typeof smartDraftRefreshBanner === 'function') smartDraftRefreshBanner();
    smartDocsModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  // Always land on the home page. No persisted workflow progress in this phase.
  smartScanResetToHome();
  smartImportResetToHome(); // PART 5 — reset any import/editor view
  smartBlankResetToHome(); // PART 6 — reset any blank document workspace
  smartTemplatesResetToHome(); // PART 7 — reset any templates view
  setSmartDocsStep(1);
}

function closeSmartDocs(force) {
  // PART 20 — unsaved-changes protection when the editor has modifications.
  if (force !== true && typeof smartLeaveBlocked === 'function' && smartLeaveBlocked('close')) return;
  smartScanResetToHome(); // stops any live camera + resets the scan workflow
  smartImportResetToHome(); // PART 5 — reset any import/editor view
  smartBlankResetToHome(); // PART 6 — reset any blank document workspace
  smartTemplatesResetToHome(); // PART 7 — reset any templates view
  if (smartDocsModal) {
    smartDocsModal.classList.remove('show');
    smartDocsModal.setAttribute('aria-hidden', 'true');
    if (document.body.classList.contains('modal-open') &&
        !(notesManagerModal && notesManagerModal.classList.contains('show'))) {
      document.body.classList.remove('modal-open');
    }
  }
}

// ============================================================
// PART 4 — SMART SCAN / OCR  (scoped to Smart Documents only)
// Workflow:  Scan → Capture → Process → Review → Accept
// ============================================================
let smartScanStream = null;          // live camera MediaStream
let smartScanBusy = false;
let smartScanOcrOverride = null;     // optional recognised-text override (provider / test seam)
let smartScanCameraMode = 'auto';    // 'auto' | 'blocked' | 'live'
let smartWorkCanvas = null;          // working canvas during processing
let smartWorkInk = 0;                // detected ink ratio
let smartScanRecognized = null;      // text produced by the OCR step (string | null)
let smartScanStructure = null;       // PART 16 — document-understanding structure for the current scan

function scanEl(id) { return document.getElementById(id); }
function smartScanT() { return translations[state.locale] || translations.en; }

function smartScanStage(name) {
  ['camera', 'processing', 'review'].forEach((s) => {
    const el = scanEl('scanStage' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.classList.toggle('stage-active', s === name);
  });
}

function smartScanStopCamera() {
  if (smartScanStream) {
    try { smartScanStream.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} }); } catch (e) {}
    smartScanStream = null;
  }
  const v = scanEl('scanVideo');
  if (v) { try { v.srcObject = null; } catch (e) {} }
}

function smartScanActiveTracks() {
  if (!smartScanStream) return [];
  try { return smartScanStream.getTracks().map((t) => t.readyState); }
  catch (e) { return []; }
}

function smartScanStageName() {
  for (let i = 0; i < 3; i++) {
    const names = ['camera', 'processing', 'review'];
    const el = scanEl('scanStage' + names[i].charAt(0).toUpperCase() + names[i].slice(1));
    if (el && el.classList.contains('stage-active')) return names[i];
  }
  return 'none';
}

function smartScanResetUi() {
  smartScanOcrOverride = null;
  smartWorkCanvas = null;
  smartWorkInk = 0;
  smartScanRecognized = null;
  smartScanStructure = null;   // PART 16 — clear the structure layer with the scan
  smartScanEditDoc = null;     // PART 17 — a fresh scan rebuilds the editable document
  smartScanRenderStructure();  // hides/empties the structure panel
  const cap = scanEl('scanCaptureBtn');
  if (cap) { cap.disabled = true; cap.classList.remove('is-loading'); }
  const err = scanEl('scanCameraError');
  if (err) { err.hidden = true; err.classList.remove('show'); }
  const fi = scanEl('scanFileInput');
  if (fi) { try { fi.value = ''; } catch (e) {} }
  const rt = scanEl('scanReviewText');
  if (rt) rt.value = '';
  const img = scanEl('scanReviewImage');
  if (img) img.removeAttribute('src');
  const info = scanEl('scanAcceptInfo');
  if (info) info.hidden = true;
  smartScanStage('camera');
}

function smartScanOpen() {
  const home = smartDocsModal ? smartDocsModal.querySelector('.smart-docs-home') : null;
  const view = scanEl('smartScanView');
  if (home) home.style.display = 'none';
  if (view) { view.classList.add('scan-visible'); view.setAttribute('aria-hidden', 'false'); }
  setSmartDocsStep(1);
  smartScanResetUi();
  smartScanStartCamera();
}

function smartScanResetToHome() {
  smartScanStopCamera();
  smartScanResetUi();
  const home = smartDocsModal ? smartDocsModal.querySelector('.smart-docs-home') : null;
  const view = scanEl('smartScanView');
  if (home) home.style.display = '';
  if (view) { view.classList.remove('scan-visible'); view.setAttribute('aria-hidden', 'true'); }
  if (typeof setSmartDocsStep === 'function') setSmartDocsStep(1);
}

function smartScanShowCameraError(msg) {
  const err = scanEl('scanCameraError');
  const errText = scanEl('scanCameraErrorText');
  if (errText) errText.textContent = msg || '';
  if (err) { err.hidden = false; err.classList.add('show'); }
}

async function smartScanStartCamera() {
  const cap = scanEl('scanCaptureBtn');
  const pick = scanEl('scanFilePick');

  // Deterministic 'blocked' seam (used by tests) simulates permission denied.
  if (smartScanCameraMode === 'blocked') {
    smartScanStopCamera();
    smartScanShowCameraError(smartScanT().smartScanPermissionDenied || 'Camera permission denied');
    if (cap) cap.disabled = true;
    if (pick) pick.hidden = false;
    return;
  }

  // Deterministic 'live' seam (used by tests) streams a synthetic camera frame.
  if (smartScanCameraMode === 'live') {
    smartScanStopCamera();
    const ok = await smartScanStartLiveMock();
    if (cap) cap.disabled = !ok;
    if (pick) pick.hidden = false;
    if (!ok) smartScanShowCameraError(smartScanT().smartScanOcrFailed || 'OCR failed');
    return;
  }

  // Real device path.
  smartScanStopCamera();
  if (cap) { cap.disabled = true; cap.classList.remove('is-loading'); }
  try {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      throw new DOMException('no camera', 'NotFoundError');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    smartScanStream = stream;
    const v = scanEl('scanVideo');
    if (v && v.srcObject !== stream) { v.srcObject = stream; try { await v.play(); } catch (e) {} }
    if (cap) cap.disabled = false;
    if (pick) pick.hidden = false;
  } catch (e) {
    smartScanStopCamera();
    const code = String((e && e.name) || '');
    const denied = (code === 'NotAllowedError' || code === 'PermissionDeniedError' || code === 'SecurityError');
    smartScanShowCameraError(denied
      ? (smartScanT().smartScanPermissionDenied || 'Camera permission denied')
      : (smartScanT().smartScanCameraUnavailable || 'Camera unavailable'));
    if (cap) cap.disabled = true;
    if (pick) pick.hidden = false;
  } finally {
    if (cap) cap.classList.remove('is-loading');
  }
}

async function smartScanStartLiveMock() {
  try {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 480;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 52px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('PART 4 TEST 42', 40, 30);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText('Scan OCR', 40, 120);
    if (typeof c.captureStream !== 'function') return false;
    const stream = c.captureStream(15);
    smartScanStream = stream;
    const v = scanEl('scanVideo');
    if (v && v.srcObject !== stream) { v.srcObject = stream; try { await v.play(); } catch (e) {} }
    return true;
  } catch (e) {
    smartScanStopCamera();
    return false;
  }
}

function smartScanCaptureFrame() {
  const v = scanEl('scanVideo');
  const canvas = scanEl('scanProcessingCanvas');
  const w = (v && v.videoWidth) || 1280;
  const h = (v && v.videoHeight) || 960;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
  if (v && v.readyState >= 2 && v.videoWidth > 0) {
    ctx.drawImage(v, 0, 0, w, h);
  } else {
    // No decodable frame yet — draw a benign page so we never crash.
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(0, 0, w, h);
  }
  smartScanStopCamera();
  return canvas;
}

function onSmartScanCapture() {
  if (smartScanBusy) return;
  smartScanBeginProcessing(smartScanCaptureFrame());
}

function onSmartScanFileChange() {
  const input = scanEl('scanFileInput');
  const file = input && input.files && input.files[0];
  if (!file) return;
  if (!/^image\//i.test(file.type || '')) {
    smartScanShowCameraError(smartScanT().smartScanOcrFailed || 'OCR failed');
    return;
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const c = scanEl('scanProcessingCanvas');
    c.width = img.naturalWidth || 600;
    c.height = img.naturalHeight || 800;
    c.getContext('2d').drawImage(img, 0, 0);
    try { URL.revokeObjectURL(url); } catch (e) {}
    smartScanStopCamera();
    smartScanBeginProcessing(c);
  };
  img.onerror = () => {
    try { URL.revokeObjectURL(url); } catch (e) {}
    smartScanShowCameraError(smartScanT().smartScanOcrFailed || 'OCR failed');
  };
  img.src = url;
}

function onSmartScanBack() { smartScanResetToHome(); }

function onSmartScanRescan() {
  smartScanResetUi();
  setSmartDocsStep(1);
  smartScanStartCamera();
}
function smartScanBeginProcessing(canvas) {
  if (!canvas) { smartScanShowCameraError(smartScanT().smartScanOcrFailed || 'OCR failed'); return; }
  smartWorkCanvas = canvas;
  smartScanStage('processing');
  setSmartDocsStep(1);
  smartScanRunPipeline();
}

async function smartScanRunPipeline() {
  smartScanBusy = true;
  const steps = ['detect', 'correct', 'improve', 'read'];
  let failed = false;
  for (let i = 0; i < steps.length; i++) {
    smartScanSetProc(steps[i], 'active');
    await new Promise((r) => setTimeout(r, 90));
    try {
      if (steps[i] === 'detect') smartScanDetectStep();
      else if (steps[i] === 'correct') smartScanCorrectStep();
      else if (steps[i] === 'improve') smartScanImproveStep();
      else { await smartScanReadStep(); }
      smartScanSetProc(steps[i], 'done');
    } catch (e) {
      console.warn('scan step failed:', steps[i], e);
      smartScanSetProc(steps[i], 'error');
      failed = true;
      break;
    }
  }
  smartScanBusy = false;
  if (failed) {
    smartScanStage('camera');
    smartScanShowCameraError(smartScanT().smartScanOcrFailed || 'OCR failed');
    return;
  }
  smartScanFinish();
}

function smartScanSetProc(id, stateStr) {
  document.querySelectorAll('#scanProcessingProgress [data-proc]').forEach((it) => {
    ['active', 'done', 'error'].forEach((c) => it.classList.remove('proc-' + c));
  });
  const it = document.querySelector('#scanProcessingProgress [data-proc="' + id + '"]');
  if (it) it.classList.add('proc-' + stateStr);
}

function smartScanDetectStep() {
  const data = smartBinarize(smartWorkCanvas);
  smartWorkInk = data.inkRatio;
}

function smartScanCorrectStep() {
  const src = smartWorkCanvas;
  if (!src) return;
  const { bin, w, h, inkRatio } = smartBinarize(src);
  smartWorkInk = inkRatio;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (bin[y * w + x]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) { smartWorkInk = 0; return; } // blank page
  const pad = 6;
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  let cropW = Math.min(w, maxX + pad) - cropX;
  let cropH = Math.min(h, maxY + pad) - cropY;
  if (cropW < 2) cropW = 2; if (cropH < 2) cropH = 2;
  let angle = 0;
  try { angle = smartBestDeskew(src, bin, w, h); } catch (e) { angle = 0; }
  const out = smartCropCropped(src, cropX, cropY, cropW, cropH, angle);
  smartWorkCanvas = out || src;
}

function smartBestDeskew(src, bin, w, h) {
  let bestA = 0, bestVar = -1;
  const cands = [0, -0.75, 0.75, -1.5, 1.5];
  for (const deg of cands) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.translate(w / 2, h / 2);
    ctx.rotate(deg * Math.PI / 180);
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    const data = smartBinarize(c);
    const cols = new Float64Array(c.width).fill(0);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (data.bin[y * c.width + x]) cols[x]++;
    }
    let m = 0; for (let x = 0; x < c.width; x++) m += cols[x];
    m /= c.width;
    let v = 0; for (let x = 0; x < c.width; x++) v += (cols[x] - m) * (cols[x] - m);
    if (v > bestVar) { bestVar = v; bestA = deg; }
  }
  return bestA;
}

function smartCropCropped(src, cx, cy, cw, ch, angle) {
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((angle || 0) * Math.PI / 180);
  ctx.drawImage(src, cx, cy, cw, ch, -cw / 2, -ch / 2, cw, ch);
  return c;
}
function smartScanImproveStep() {
  const src = smartWorkCanvas;
  if (!src) return;
  const ctx = src.getContext('2d');
  const w = src.width, h = src.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // Grayscale + contrast stretch.
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    let g = (d[o] * 0.299 + d[o + 1] * 0.587 + d[o + 2] * 0.114) | 0;
    g = Math.max(0, Math.min(255, ((g - 128) * 1.15 + 128) | 0));
    d[o] = d[o + 1] = d[o + 2] = g;
    d[o + 3] = 255;
  }
  // Unsharp sharpening (approx).
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) g[i] = d[i * 4];
  const out = new Uint8ClampedArray(w * h);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const v = 5 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
    out[i] = Math.max(0, Math.min(255, v));
  }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    d[(y * w + x) * 4] = out[y * w + x];
  }
  ctx.putImageData(img, 0, 0);
}

async function smartScanReadStep() {
  if (smartScanOcrOverride !== null) {
    smartScanRecognized = (typeof smartScanOcrOverride === 'string' && smartScanOcrOverride.trim() !== '')
      ? smartScanOcrOverride : null;
    return;
  }
  try {
    smartScanRecognized = smartOcrRun(smartWorkCanvas);
  } catch (e) {
    console.warn('ocr failed', e);
    smartScanRecognized = null;
  }
}

function smartScanFinish() {
  const t = smartScanT();
  const recognized = smartScanRecognized;
  if (recognized === null || (typeof recognized === 'string' && recognized.trim() === '')) {
    // OCR found nothing on the page: clear message + offer rescan.
    smartScanStage('camera');
    smartScanShowCameraError(t.smartScanNoText || 'No text detected');
    const fi = scanEl('scanFileInput'); if (fi) { try { fi.value = ''; } catch (e) {} }
    const pick = scanEl('scanFilePick'); if (pick) pick.hidden = false;
    const cap = scanEl('scanCaptureBtn'); if (cap) cap.disabled = true;
    setSmartDocsStep(1);
    return;
  }
  const rt = scanEl('scanReviewText');
  if (rt) rt.value = recognized;
  // PART 16 — Document Understanding: analyze the OCR text ONCE (Image → Text →
  // Structure). Pure text analysis on the existing OCR output: no re-OCR, no
  // heavy libraries, and it never runs during the camera preview.
  smartScanStructure = smartScanAnalyzeStructure(recognized);
  smartScanRenderStructure();
  // PART 17 — build the editable recognized document from the structure and
  // render it in the review stage. The user's edits become authoritative.
  smartScanBuildEditDoc();
  smartScanRenderEditDoc();
  const img = scanEl('scanReviewImage');
  if (img && smartWorkCanvas) {
    try { img.src = smartWorkCanvas.toDataURL('image/png'); } catch (e) {}
  }
  const info = scanEl('scanAcceptInfo');
  if (info) info.hidden = true;
  smartScanStage('review');
  setSmartDocsStep(3);
}

function smartScanShowError(msg) {
  smartScanStage('camera');
  smartScanShowCameraError(msg || 'OCR failed');
  const fi = scanEl('scanFileInput'); if (fi) { try { fi.value = ''; } catch (e) {} }
}

function onSmartScanAccept() {
  const t = smartScanT();
  // PART 17 — the EDITED recognized document is the authoritative source. The
  // editable structure (headings/paragraphs/fields/tables) is read back from the
  // DOM so the accepted result always matches exactly what the user reviewed.
  smartScanReadEditDocFromDom();
  if (!smartScanEditDoc && smartScanRecognized !== null && smartScanRecognized !== undefined) {
    smartScanBuildEditDoc();
  }
  const text = smartScanEditDoc ? smartScanEditDocToText(smartScanEditDoc)
    : ((scanEl('scanReviewText') && scanEl('scanReviewText').value) || '');
  if (!state.smartScanResult) state.smartScanResult = {};
  // PART 16 — re-analyze the FINAL (possibly user-corrected) text so the
  // structure always matches what the user accepted. Cheap text analysis only;
  // the OCR text itself is never re-recognized here.
  smartScanStructure = smartScanAnalyzeStructure(text);
  smartScanRenderStructure();
  state.smartScanResult = { text: text, status: 'accepted', structure: smartScanStructure, editedDoc: smartScanEditDoc };
  const rt = scanEl('scanReviewText');
  if (rt && text) rt.value = text;
  // PART 17 — re-render the editable document so the panel always reflects the
  // accepted model (edits are preserved — they live in smartScanEditDoc).
  smartScanRenderEditDoc();
  const info = scanEl('scanAcceptInfo');
  if (info) { info.hidden = false; info.textContent = (t.smartScanAccepted || 'Result accepted and ready for editing.') + ' — ' + (t.smartScanCreatePdf || 'Create PDF'); }
  // PART 4 intentionally stops here: no editor is opened.
  if (window.__smartScanOnAccept) { try { window.__smartScanOnAccept(state.smartScanResult); } catch (e) {} }
}

// ============================================================
// PART 17 — RECOGNIZED DOCUMENT → EDITABLE PREVIEW → CREATE PDF
// Turns the PART 15/16 scan result into an editable, structured
// document model (headings / paragraphs / fields / real HTML tables),
// keeps the user's manual edits as the authoritative source, and emits
// a genuine PDF through the EXISTING buildNotePdfBlob (html2pdf) engine
// (no new PDF engine, no Notes/editor changes).
// ============================================================
let smartScanEditDoc = null;   // { title, blocks:[ {kind,...} ] }
let smartScanEditBound = false;

// Build the editable model from the current structure in source-line order.
function smartScanBuildEditDoc() {
  const st = smartScanStructure;
  const src = String(smartScanRecognized == null ? '' : smartScanRecognized);
  const items = [];
  const lineOf = (v) => (typeof v === 'number' && isFinite(v)) ? v : 0;
  (st && st.blocks || []).forEach((b) => {
    if (b && (b.type === 'heading' || b.type === 'paragraph')) {
      items.push({ idx: lineOf(b.startLine != null ? b.startLine : b.line), kind: b.type, block: b });
    }
  });
  (st && st.tables || []).forEach((tb) => { items.push({ idx: lineOf(tb && tb.startLine), kind: 'table', tb: tb }); });
  (st && st.fields || []).forEach((f) => { items.push({ idx: lineOf(f && f.line), kind: 'field', f: f }); });
  items.sort((a, b) => a.idx - b.idx);
  const blocks = [];
  items.forEach((it) => {
    if (it.kind === 'heading') blocks.push({ kind: 'heading', level: 1, text: it.block.text });
    else if (it.kind === 'paragraph') blocks.push({ kind: 'paragraph', text: it.block.text });
    else if (it.kind === 'table') {
      // PART 16 table rows are { cells: [...] } objects (or plain arrays) —
      // normalize BOTH shapes so the real cell text is preserved exactly.
      const rows = (it.tb.rows || []).map((r) => {
        const cells = Array.isArray(r) ? r : (r && Array.isArray(r.cells) ? r.cells : []);
        return cells.map((cell) => ({ text: String((cell && typeof cell === 'object') ? ((cell && cell.text) || '') : (cell || '')) }));
      }).filter((r) => r.length);
      blocks.push({ kind: 'table', header: !!it.tb.header, rows: rows.length ? rows : [[{ text: '' }, { text: '' }]] });
    } else if (it.kind === 'field') {
      blocks.push({ kind: 'field', label: (it.f && it.f.label) || '', value: (it.f && it.f.value) || '' });
    }
  });
  if (!blocks.length) {
    (src.split('\n').map((l) => l.trim()).filter(Boolean)).forEach((line) => blocks.push({ kind: 'paragraph', text: line }));
  }
  const firstHead = blocks.find((b) => b.kind === 'heading');
  smartScanEditDoc = { title: firstHead && firstHead.text ? firstHead.text : 'Scanned Document', blocks: blocks };
}

// Flatten the editable model back to plain text (kept in sync with the raw
// textarea and used for text-based re-analysis on accept).
function smartScanEditDocToText(doc) {
  if (!doc) return '';
  const parts = [];
  (doc.blocks || []).forEach((b) => {
    if (!b) return;
    if (b.kind === 'heading' || b.kind === 'paragraph') parts.push(String(b.text || ''));
    else if (b.kind === 'field') parts.push(((String(b.label || '').trim()) ? String(b.label).trim() + ': ' : '') + String(b.value || ''));
    else if (b.kind === 'table') {
      (Array.isArray(b.rows) ? b.rows : []).forEach((r) => { parts.push((Array.isArray(r) ? r : []).map((c) => String((c && c.text) || '')).join('\t')); });
    }
  });
  return parts.join('\n');
}

// Convert the edited model into the Notes bodyBlocks shape consumed by
// buildNotePdfBlob (headings via formatting runs → <hN>, tables real HTML).
function smartScanEditDocToNote(doc) {
  if (!doc) return null;
  const blocks = [];
  (doc.blocks || []).forEach((b) => {
    if (!b) return;
    if (b.kind === 'heading') {
      const text = String(b.text || '');
      blocks.push({ type: 'text', body: text, formatting: [{ heading: Math.max(1, Math.min(3, Math.floor(b.level || 1))), start: 0, end: text.length }] });
    } else if (b.kind === 'paragraph') {
      blocks.push({ type: 'text', body: String(b.text || '') });
    } else if (b.kind === 'field') {
      const label = String(b.label || '').trim();
      blocks.push({ type: 'text', body: (label ? label + ': ' : '') + String(b.value || '') });
    } else if (b.kind === 'table') {
      const rows = (Array.isArray(b.rows) ? b.rows : []).map((r) => (Array.isArray(r) ? r : []).map((c) => ({ text: String((c && c.text) || '') })));
      blocks.push({ type: 'table', header: !!b.header, rows: rows });
    }
  });
  const title = String(doc.title || '').trim() || 'Scanned Document';
  return { title: title, bodyBlocks: blocks };
}

function smartScanEditDelBtn(bi) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'scan-edit-del'; b.dataset.action = 'delBlock'; b.dataset.bi = bi;
  b.textContent = '\u2715'; b.setAttribute('aria-label', 'Delete block');
  return b;
}

function smartScanEditTableHTML(bi, b) {
  const rows = (Array.isArray(b.rows) && b.rows.length) ? b.rows : [[{ text: '' }, { text: '' }]];
  const wrap = document.createElement('div'); wrap.className = 'scan-edit-table-wrap';
  const table = document.createElement('table'); table.className = 'scan-edit-table';
  const cols = Math.max(1, Math.max.apply(null, rows.map((r) => (Array.isArray(r) ? r.length : 0))));
  const colgroup = document.createElement('colgroup');
  for (let c = 0; c < cols; c++) { colgroup.appendChild(document.createElement('col')); }
  table.appendChild(colgroup);
  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  for (let c = 0; c < cols; c++) { const th = document.createElement('th'); th.textContent = 'C' + (c + 1); trh.appendChild(th); }
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach((row, ri) => {
    const tr = document.createElement('tr');
    const cells = Array.isArray(row) ? row : [];
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      const inp = document.createElement('input');
      inp.type = 'text'; inp.className = 'scan-edit-cell';
      inp.dataset.bi = bi; inp.dataset.row = ri; inp.dataset.col = c;
      inp.value = String((cells[c] && cells[c].text) || ''); inp.setAttribute('dir', 'auto');
      td.appendChild(inp); tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody); wrap.appendChild(table); return wrap;
}

function smartScanRenderEditDoc() {
  const panel = scanEl('scanEditPanel');
  const blocksEl = scanEl('scanEditBlocks');
  const titleEl = scanEl('scanEditDocTitle');
  const doc = smartScanEditDoc;
  if (!panel || !blocksEl) return;
  if (!doc) { panel.hidden = true; return; }
  panel.hidden = false;
  if (titleEl && document.activeElement !== titleEl) titleEl.value = doc.title || '';
  blocksEl.textContent = '';
  (doc.blocks || []).forEach((b, bi) => {
    const card = document.createElement('div');
    card.className = 'scan-edit-block scan-edit-' + ((b.kind === 'table') ? 'table' : (b.kind || 'text'));
    card.dataset.blockIndex = bi;
    const kindLab = document.createElement('span'); kindLab.className = 'scan-edit-kind';
    if (b.kind === 'heading') {
      kindLab.textContent = 'H';
      const sel = document.createElement('select'); sel.className = 'scan-edit-level'; sel.dataset.field = 'level'; sel.dataset.bi = bi;
      [1, 2, 3].forEach((l) => { const o = document.createElement('option'); o.value = l; o.textContent = 'H' + l; if (b.level === l) o.selected = true; sel.appendChild(o); });
      const inp = document.createElement('input'); inp.className = 'scan-edit-input'; inp.type = 'text'; inp.dataset.field = 'text'; inp.dataset.bi = bi; inp.value = b.text || ''; inp.setAttribute('dir', 'auto');
      card.appendChild(kindLab); card.appendChild(sel); card.appendChild(inp); card.appendChild(smartScanEditDelBtn(bi));
    } else if (b.kind === 'paragraph') {
      kindLab.textContent = '\u00B6';
      const ta = document.createElement('textarea'); ta.className = 'scan-edit-input scan-edit-ta'; ta.dataset.field = 'text'; ta.dataset.bi = bi; ta.value = b.text || ''; ta.rows = 2; ta.setAttribute('dir', 'auto');
      card.appendChild(kindLab); card.appendChild(ta); card.appendChild(smartScanEditDelBtn(bi));
    } else if (b.kind === 'field') {
      kindLab.textContent = '\u24BB';
      const li = document.createElement('input'); li.className = 'scan-edit-input scan-edit-f-label'; li.type = 'text'; li.dataset.field = 'label'; li.dataset.bi = bi; li.value = b.label || ''; li.placeholder = 'Label'; li.setAttribute('dir', 'auto');
      const vi = document.createElement('input'); vi.className = 'scan-edit-input'; vi.type = 'text'; vi.dataset.field = 'value'; vi.dataset.bi = bi; vi.value = b.value || ''; vi.placeholder = 'Value'; vi.setAttribute('dir', 'auto');
      card.appendChild(kindLab); card.appendChild(li); card.appendChild(vi); card.appendChild(smartScanEditDelBtn(bi));
    } else if (b.kind === 'table') {
      card.appendChild(smartScanEditTableHTML(bi, b));
      const ctl = document.createElement('div'); ctl.className = 'scan-edit-tbl-ctl';
      const mkBtn = (action, txt, aria) => { const bb = document.createElement('button'); bb.type = 'button'; bb.dataset.action = action; bb.dataset.bi = bi; bb.textContent = txt; bb.setAttribute('aria-label', aria); return bb; };
      ctl.appendChild(mkBtn('addRow', '+ Row', 'Add row'));
      ctl.appendChild(mkBtn('delRow', '\u2212 Row', 'Delete row'));
      ctl.appendChild(mkBtn('addCol', '+ Col', 'Add column'));
      ctl.appendChild(mkBtn('delCol', '\u2212 Col', 'Delete column'));
      ctl.appendChild(smartScanEditDelBtn(bi));
      card.appendChild(ctl);
    }
    blocksEl.appendChild(card);
  });
}

// Read the current editable DOM back into smartScanEditDoc and the accepted
// result so user edits persist across rerenders and feed Create PDF.
function smartScanReadEditDocFromDom() {
  const doc = smartScanEditDoc;
  if (!doc) return;
  const titleEl = scanEl('scanEditDocTitle');
  if (titleEl) doc.title = titleEl.value;
  const blocksEl = scanEl('scanEditBlocks');
  if (blocksEl) {
    (doc.blocks || []).forEach((b, bi) => {
      if (!b) return;
      const card = blocksEl.querySelector('[data-block-index="' + bi + '"]');
      if (!card) return;
      if (b.kind === 'heading' || b.kind === 'paragraph') {
        const inp = card.querySelector('[data-field="text"]');
        if (inp) b.text = inp.value;
        const sel = card.querySelector('[data-field="level"]');
        if (sel && b.kind === 'heading') b.level = Math.max(1, Math.min(3, Math.floor(Number(sel.value) || 1)));
      } else if (b.kind === 'field') {
        const li = card.querySelector('[data-field="label"]'); const vi = card.querySelector('[data-field="value"]');
        if (li) b.label = li.value; if (vi) b.value = vi.value;
      } else if (b.kind === 'table') {
        const rows = Array.isArray(b.rows) ? b.rows : [];
        (card.querySelectorAll('.scan-edit-cell') || []).forEach((inp) => {
          const ri = parseInt(inp.dataset.row, 10); const ci = parseInt(inp.dataset.col, 10);
          if (isFinite(ri) && isFinite(ci) && rows[ri] && rows[ri][ci] && typeof rows[ri][ci].text === 'string') rows[ri][ci].text = inp.value;
        });
      }
    });
  }
  // PART 17 — persist the edits inside state.smartScanResult immediately (not
  // only on Accept), so the recognized-document model is the single source of
  // truth while the user reviews/edits.
  state.smartScanResult = state.smartScanResult || {};
  state.smartScanResult.editedDoc = smartScanEditDoc;
  state.smartScanResult.text = smartScanEditDocToText(smartScanEditDoc);
}

function smartScanEditStructural(action, bi) {
  smartScanReadEditDocFromDom();
  const doc = smartScanEditDoc;
  if (!doc) return;
  const b = doc.blocks[bi];
  if (!b) return;
  if (action === 'delBlock') { doc.blocks.splice(bi, 1); }
  else if (action === 'addRow' && b.kind === 'table') {
    const cols = Math.max(1, (Array.isArray(b.rows[0]) ? b.rows[0].length : 2));
    b.rows.push(Array.from({ length: cols }, () => ({ text: '' })));
  } else if (action === 'delRow' && b.kind === 'table') {
    if (b.rows.length > 1) b.rows.pop();
  } else if (action === 'addCol' && b.kind === 'table') {
    if (!b.rows.length) b.rows.push([{ text: '' }]);
    b.rows.forEach((r) => { if (Array.isArray(r)) r.push({ text: '' }); });
  } else if (action === 'delCol' && b.kind === 'table') {
    b.rows.forEach((r) => { if (Array.isArray(r) && r.length > 1) r.pop(); });
  }
  smartScanRenderEditDoc();
}

function smartScanEditAdd(kind) {
  smartScanReadEditDocFromDom();
  const doc = smartScanEditDoc;
  if (!doc) return;
  if (kind === 'heading') doc.blocks.push({ kind: 'heading', level: 1, text: '' });
  else if (kind === 'paragraph') doc.blocks.push({ kind: 'paragraph', text: '' });
  else if (kind === 'field') doc.blocks.push({ kind: 'field', label: '', value: '' });
  else if (kind === 'table') doc.blocks.push({ kind: 'table', header: true, rows: [[{ text: '' }, { text: '' }]] });
  smartScanRenderEditDoc();
}

function smartScanDownloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
}

// Create a genuine PDF from the FINAL edited recognized document (not the raw
// image) via the existing buildNotePdfBlob (html2pdf) engine.
async function smartScanCreatePdf() {
  const t = smartScanT();
  smartScanReadEditDocFromDom();
  const doc = smartScanEditDoc;
  if (!doc) return;
  const note = smartScanEditDocToNote(doc);
  if (!note) return;
  const info = scanEl('scanAcceptInfo');
  if (info) { info.hidden = false; info.textContent = t.smartScanPdfCreating || 'Creating PDF\u2026'; }
  try {
    const blob = await buildNotePdfBlob(note);
    const filename = notePdfFilename(note.title || 'Scanned Document');
    smartScanDownloadBlob(blob, filename);
    if (info) info.textContent = t.smartScanPdfCreated || 'PDF created from the edited document.';
  } catch (e) {
    const msg = (e && e.message === 'no-internet')
      ? (t.smartScanOfflinePdf || 'Offline \u2014 the PDF library could not be loaded.')
      : ((t.smartScanPdfFailed || 'Could not create PDF.') + ' ' + (e && e.message ? e.message : ''));
    if (info) { info.hidden = false; info.textContent = msg; }
  }
}

function bindSmartScanEdit() {
  if (smartScanEditBound) return;
  smartScanEditBound = true;
  const blocksEl = scanEl('scanEditBlocks');
  if (blocksEl) {
    blocksEl.addEventListener('input', () => smartScanReadEditDocFromDom());
    blocksEl.addEventListener('click', (e) => {
      const btn = (e.target && e.target.closest) ? e.target.closest('[data-action]') : null;
      if (btn) smartScanEditStructural(btn.dataset.action, parseInt(btn.dataset.bi, 10));
    });
  }
  const titleEl = scanEl('scanEditDocTitle');
  if (titleEl) titleEl.addEventListener('input', () => { if (smartScanEditDoc) smartScanEditDoc.title = titleEl.value; if (state.smartScanResult) state.smartScanResult.editedDoc = smartScanEditDoc; });
  document.querySelectorAll('[data-add-block]').forEach((btn) => {
    btn.addEventListener('click', () => smartScanEditAdd(btn.getAttribute('data-add-block')));
  });
  const createBtn = scanEl('scanCreatePdfBtn');
  if (createBtn) createBtn.addEventListener('click', smartScanCreatePdf);
}
// ============================================================
// PART 16 — DOCUMENT UNDERSTANDING (structure layer)
// Image → Text (existing OCR) → Structure. Direction-agnostic:
// Arabic / English / mixed text keep their natural order and every
// digit is preserved exactly (no Latin↔Arabic-Indic conversion).
// Conservative by design: when a signal is weak the text stays a
// plain paragraph and NO table/heading/date/field is invented.
// Runs only after capture/OCR; never during the camera preview.
// ============================================================

// Recognised field labels (English + Arabic). Conservative on purpose — an
// unknown label stays plain text instead of becoming a fabricated field.
const SMART_STRUCT_FIELD_LABELS = [
  'name', 'date', 'phone', 'tel', 'mobile', 'fax', 'email', 'address', 'company',
  'total', 'amount', 'price', 'qty', 'quantity', 'invoice', 'subject', 'city',
  'country', 'notes', 'time', 'age', 'website', 'url', 'ref', 'id', 'po',
  'rate', 'discount', 'vat', 'tax', 'subtotal', 'bill',
  'الاسم', 'اسم', 'التاريخ', 'الهاتف', 'البريد', 'العنوان', 'الشركة', 'الاجمالي',
  'المجموع', 'السعر', 'الكمية', 'الفاتورة', 'المدينة', 'الدولة', 'الملاحظات',
  'الوقت', 'العمر', 'الرقم', 'المعدل', 'الخصم', 'الضريبة', 'المجموع الفرعي'
];

// Shared "Label: value" / "Label ___" matcher used both to keep field lines out
// of paragraphs and to build the fields list. Recognised labels only (conservative).
function smartScanMatchFieldLine(text) {
  const lineRe = /^([^\s:][^:\n]{0,31})\s*:\s*(.*)$/;
  const underRe = /^([^\s_][^_\n]{0,31})[ \t]+_{2,}\s*(.*)$/;
  const mm = lineRe.exec(text) || underRe.exec(text);
  if (!mm) return null;
  const label = mm[1].trim();
  if (!label) return null;
  const lower = label.toLowerCase();
  const known = SMART_STRUCT_FIELD_LABELS.some((f) => lower === f || lower.indexOf(f) === 0 || label.indexOf(f) === 0);
  if (!known) return null;
  const value = (mm[2] || '').trim().replace(/^[_ ]+/, '').replace(/[_ ]+$/, '');
  return { label: label, value: value, hasValue: value !== '' };
}

const SMART_STRUCT_CURRENCY = '($|€|£|USD|EUR|GBP|JPY|SAR|AED|EGP|JOD|KWD|QAR|OMR|BHD|LYD|TND|DZD|MAD|IQD)';

// Numbers: integers, decimals, percentages, currency-like, phone-like.
// The leading context group keeps the match anchored to a token boundary so
// trailing punctuation is never swallowed.
const SMART_STRUCT_NUMBER_SRC =
  '(^|[\\s(:=,;\\u060C])' +
  '(\\+?\\d{1,3}([\\s.,-]?\\d{3})+|\\d+(?:[.,]\\d+)?)' +
  '(\\s?%|\\$|€|£|USD|EUR|GBP|JPY|SAR|AED|EGP|JOD|KWD|QAR|OMR|BHD|LYD|TND|DZD|MAD|IQD)?' +
  '(?=$|[\\s),;.\\u060C])';

function smartScanStructLines(text) {
  return String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
}

// Column count of a candidate table row: tab / pipe / 2+ space separated.
function smartScanStructColCount(line) {
  if (/\t/.test(line)) {
    const c = line.split(/\t+/).filter((x) => x.trim() !== '');
    if (c.length >= 2) return c.length;
  }
  if (line.indexOf('|') !== -1) {
    const c = line.split(/\s*\|\s*/).filter((x) => x.trim() !== '');
    if (c.length >= 2) return c.length;
  }
  return line.split(/\s{2,}/).filter((x) => x.trim() !== '').length;
}

function smartScanStructCellSplit(line) {
  let cells;
  if (/\t/.test(line)) cells = line.split(/\t+/);
  else if (line.indexOf('|') !== -1) cells = line.split(/\s*\|\s*/);
  else cells = line.split(/\s{2,}/);
  return cells.map((c) => c.trim()).filter((c) => c !== '');
}

// Main structure analysis. Conservative: weak signals NEVER become structure.
function smartScanAnalyzeStructure(text) {
  const src = String(text == null ? '' : text);
  const lines = smartScanStructLines(src);
  const nonEmpty = [];
  lines.forEach((raw, idx) => { const t = raw.trim(); if (t) nonEmpty.push({ idx: idx, text: t }); });

  // --- TABLE: >= 2 consecutive lines sharing the same column count (>= 2).
  const tableRuns = [];
  for (let i = 0; i < nonEmpty.length; i++) {
    const cols = smartScanStructColCount(nonEmpty[i].text);
    if (cols < 2) continue;
    const run = [{ idx: nonEmpty[i].idx }];
    let j = i + 1;
    while (j < nonEmpty.length) {
      if (smartScanStructColCount(nonEmpty[j].text) !== cols) break;
      run.push({ idx: nonEmpty[j].idx });
      j++;
    }
    if (run.length >= 2) { tableRuns.push(run); i = j - 1; }
  }
  const tableLineIdx = new Set();
  tableRuns.forEach((run) => run.forEach((r) => tableLineIdx.add(r.idx)));
  const inTable = (idx) => tableLineIdx.has(idx);

  // --- blocks: headings + paragraphs (document flow order)
  const blocks = [];
  let para = null;
  const flushPara = () => {
    if (para && para.lines.length) {
      blocks.push({ type: 'paragraph', text: para.lines.join(' '), lineCount: para.lines.length, startLine: para.start, endLine: para.end });
    }
    para = null;
  };
  nonEmpty.forEach((ln) => {
    if (inTable(ln.idx)) { flushPara(); return; }
    // A blank line between two non-empty lines starts a NEW visual paragraph
    // (blank lines are removed from `nonEmpty`, so a gap in the original line
    // indices indicates an empty separator line).
    if (para && ln.idx > para.end + 1) flushPara();
    // Recognised field lines are captured separately as fields — never folded
    // into a paragraph.
    if (smartScanMatchFieldLine(ln.text)) { flushPara(); return; }
    const words = ln.text.split(/\s+/).filter(Boolean);
    const letters = (ln.text.match(/[\p{L}\p{N}]/gu) || []).length;
    const caps = (ln.text.match(/[A-Z]/g) || []).length;
    const isAllCaps = caps >= 2 && letters > 0 && ln.text === ln.text.toUpperCase();
    const endsPunct = /[.,;:!?…]$/.test(ln.text);
    const bulletLike = /^([-*•·‣◦]|\d{1,2}[.)])\s+/.test(ln.text);
    const colonIdx = ln.text.indexOf(':');
    const fieldLike = colonIdx > -1 && colonIdx <= 32 && !/^\d/.test(ln.text);
    const arabicStart = /^[\u0621-\u064A]/.test(ln.text);
    const latinStart = /^\p{Lu}/u.test(ln.text);
    // Heading signals: short, isolated, no ending punctuation, not a field/bullet.
    const headingSignals =
      !endsPunct && !bulletLike && !fieldLike &&
      ln.text.length <= 64 && words.length <= 9 && letters >= 2 &&
      ((isAllCaps && words.length <= 8) ||
       ((latinStart || arabicStart) && words.length <= 6));
    if (headingSignals) {
      flushPara();
      blocks.push({
        type: 'heading', text: ln.text, words: words.length, chars: ln.text.length, line: ln.idx,
        conf: (isAllCaps || words.length <= 4) ? 'detected' : 'likely'
      });
      return;
    }
    if (!para) para = { lines: [], start: ln.idx, end: ln.idx };
    para.lines.push(ln.text);
    para.end = ln.idx;
  });
  flushPara();

  // --- tables as REAL structure (rows of cells), never a flattened image
  const tables = tableRuns.map((run) => ({
    type: 'table',
    rows: run.map((r) => {
      const ln = nonEmpty.find((n) => n.idx === r.idx);
      return { cells: ln ? smartScanStructCellSplit(ln.text) : [] };
    }),
    startLine: run[0].idx,
    endLine: run[run.length - 1].idx
  }));

  // --- numbers (the original text is never modified)
  const numbers = [];
  try {
    const numRe = new RegExp(SMART_STRUCT_NUMBER_SRC, 'g');
    let m;
    while ((m = numRe.exec(src)) !== null) {
      const val = (m[2] || '').trim();
      const tail = (m[4] || '').trim();
      if (val) {
        let kind = 'integer';
        if (/%/.test(tail)) kind = 'percent';
        else if (/\$|€|£|USD|EUR|GBP|JPY|SAR|AED|EGP|JOD|KWD|QAR|OMR|BHD|LYD|TND|DZD|MAD|IQD/.test(tail)) kind = 'currency';
        else if ((/^\+/.test(val) || /\s/.test(val)) && /^\+?\d[\d\s().-]{5,}$/.test(val)) kind = 'phone';
        else if (/[.,]/.test(val)) kind = 'decimal';
        numbers.push({ value: val, kind: kind, suffix: tail, index: m.index + (m[1] ? m[1].length : 0) });
        if (numbers.length >= 200) break;
      }
      if (m.index === numRe.lastIndex) numRe.lastIndex++;
    }
  } catch (e) { /* structure is best-effort; never break the scan */ }

  // --- dates: clear patterns only (ISO / slash / day-month-year / month-day-year / Arabic month)
  const dates = [];
  const dateSources = [
    '\\b(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})\\b',
    '\\b(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{4})\\b',
    '\\b(\\d{1,2})[-/.](\\d{1,2})[-/.](\\d{2})\\b',
    '\\b([A-Za-z]{3,9})\\.?\\s+(\\d{1,2}),?\\s+(\\d{4})\\b',
    '\\b(\\d{1,2})\\s+([A-Za-z]{3,9})\\.?\\s+(\\d{4})\\b',
    '\\b(\\d{1,2})\\s+([\\u0621-\\u064A]{3,15})\\.?\\s+(\\d{4})\\b'
  ];
  try {
    for (const s2 of dateSources) {
      const r = new RegExp(s2, 'g');
      let m;
      while ((m = r.exec(src)) !== null) {
        dates.push({ text: m[0].trim(), index: m.index });
        if (dates.length >= 100) break;
        if (m.index === r.lastIndex) r.lastIndex++;
      }
      if (dates.length >= 100) break;
    }
  } catch (e) { /* best-effort */ }
  const seenDate = new Set();
  const datesUniq = dates
    .filter((d) => { const k = d.text + '@' + d.index; if (seenDate.has(k)) return false; seenDate.add(k); return true; })
    .sort((a, b) => a.index - b.index);

  // --- fields: "Label: value" / "Label ____" (recognised labels only)
  const fields = [];
  nonEmpty.forEach((ln) => {
    if (inTable(ln.idx)) return;
    const mf = smartScanMatchFieldLine(ln.text);
    if (!mf) return;
    fields.push({ type: 'field', label: mf.label, value: mf.value, hasValue: mf.hasValue, line: ln.idx });
  });

  return {
    text: src,
    blocks: blocks,
    tables: tables,
    numbers: numbers,
    dates: datesUniq,
    fields: fields,
    counts: {
      headings: blocks.filter((b) => b.type === 'heading').length,
      paragraphs: blocks.filter((b) => b.type === 'paragraph').length,
      tables: tables.length,
      numbers: numbers.length,
      dates: datesUniq.length,
      fields: fields.length
    },
    lines: lines.length
  };
}

function smartScanStructLabel(kind) {
  const t = smartScanT();
  const map = {
    heading: t.smartScanStructHeading || 'Heading',
    paragraph: t.smartScanStructParagraph || 'Paragraph',
    table: t.smartScanStructTable || 'Table',
    number: t.smartScanStructNumber || 'Number',
    date: t.smartScanStructDate || 'Date',
    field: t.smartScanStructField || 'Field'
  };
  return map[kind] || kind;
}

// Renders the structure indicators inside the Smart Scan review stage (NOT a
// Notes editor — read-only indicators; the OCR textarea stays the editable part).
function smartScanRenderStructure() {
  const panel = scanEl('scanStructurePanel');
  const list = scanEl('scanStructureList');
  if (!panel || !list) return;
  const st = smartScanStructure;
  if (!st) { panel.hidden = true; list.textContent = ''; return; }
  const items = [];
  (st.blocks || []).forEach((b) => {
    if (b.type === 'heading') items.push({ kind: 'heading', text: b.text, note: b.conf === 'likely' ? 'likely' : '' });
  });
  (st.blocks || []).forEach((b) => {
    if (b.type === 'paragraph') items.push({ kind: 'paragraph', text: b.text });
  });
  (st.tables || []).forEach((tb) => {
    items.push({
      kind: 'table',
      text: tb.rows.map((r) => r.cells.join(' | ')).join('\n'),
      note: tb.rows.length + '×' + (tb.rows[0] ? tb.rows[0].cells.length : 0)
    });
  });
  const nums = st.numbers || [];
  nums.slice(0, 12).forEach((n) => items.push({ kind: 'number', text: n.value + (n.suffix ? ' ' + n.suffix : ''), note: n.kind === 'integer' ? '' : n.kind }));
  if (nums.length > 12) items.push({ kind: 'number', text: '+' + (nums.length - 12), note: 'more' });
  (st.dates || []).forEach((d) => items.push({ kind: 'date', text: d.text }));
  (st.fields || []).forEach((f) => items.push({ kind: 'field', text: f.label + ': ' + (f.hasValue ? f.value : '—') }));

  list.textContent = '';
  if (!items.length) { panel.hidden = true; return; }
  panel.hidden = false;
  const frag = document.createDocumentFragment();
  items.forEach((it) => {
    const chip = document.createElement('div');
    chip.className = 'scan-struct-chip scan-struct-' + it.kind;
    chip.setAttribute('role', 'listitem');
    const kind = document.createElement('span');
    kind.className = 'scan-struct-kind';
    kind.textContent = smartScanStructLabel(it.kind);
    const body = document.createElement('span');
    body.className = 'scan-struct-text';
    body.textContent = it.text;
    chip.appendChild(kind);
    chip.appendChild(body);
    if (it.note) {
      const note = document.createElement('span');
      note.className = 'scan-struct-note';
      note.textContent = it.note;
      chip.appendChild(note);
    }
    frag.appendChild(chip);
  });
  list.appendChild(frag);
}

function smartGrayscale(canvas) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const data = ctx.getImageData(0, 0, w, h).data;
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    g[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) | 0;
  }
  return g;
}

function smartOtsuThreshold(g, w, h) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.length; i++) hist[g[i]]++;
  const total = w * h;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, maxVar = 0, thr = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue;
    const wF = total - wB; if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sum - sumB) / wF;
    const varB = wB * wF * (mB - mF) * (mB - mF);
    if (varB > maxVar) { maxVar = varB; thr = t; }
  }
  return thr;
}

function smartBinarize(canvas) {
  const w = canvas.width, h = canvas.height;
  const g = smartGrayscale(canvas);
  const thr = smartOtsuThreshold(g, w, h);
  const bin = new Uint8Array(w * h);
  let ink = 0;
  for (let i = 0; i < w * h; i++) { bin[i] = (g[i] < thr) ? 1 : 0; if (bin[i]) ink++; }
  return { bin: bin, w: w, h: h, ink: ink, inkRatio: ink / (w * h) };
}

let smartRefsCache = null;
function smartEnsureRefs() {
  if (smartRefsCache) return smartRefsCache;
  try {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
    const cx = cv.getContext('2d');
    const glyphs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const map = new Map();
    const tw = 30, th = 36;
    for (const ch of glyphs) {
      cx.clearRect(0, 0, 96, 96);
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, 96, 96);
      cx.fillStyle = '#000'; cx.font = 'bold 60px sans-serif';
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(ch, 48, 50);
      const data = cx.getImageData(0, 0, 96, 96).data;
      const b = new Uint8Array(96 * 96);
      for (let i = 0; i < 96 * 96; i++) b[i] = (data[i * 4] < 128) ? 1 : 0;
      map.set(ch, smartRefCells(b, 96, 96, tw, th));
    }
    smartRefsCache = map;
    return map;
  } catch (e) { return null; }
}

function smartRefCells(b, w, h, tw, th) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (b[y * w + x]) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return new Uint8Array(tw * th);
  const gw = maxX - minX + 1, gh = maxY - minY + 1;
  const out = new Uint8Array(tw * th);
  for (let cy = 0; cy < th; cy++) for (let cx = 0; cx < tw; cx++) {
    const x = minX + Math.min(gw - 1, (cx * gw / tw) | 0);
    const y = minY + Math.min(gh - 1, (cy * gh / th) | 0);
    out[cy * tw + cx] = b[y * w + x];
  }
  return out;
}
function smartGlyphCells(b, w, g, tw, th) {
  const gw = g.right - g.left + 1, gh = g.bottom - g.top + 1;
  const out = new Uint8Array(tw * th);
  for (let cy = 0; cy < th; cy++) for (let cx = 0; cx < tw; cx++) {
    const x = g.left + Math.min(gw - 1, (cx * gw / tw) | 0);
    const y = g.top + Math.min(gh - 1, (cy * gh / th) | 0);
    out[cy * tw + cx] = b[y * w + x];
  }
  return out;
}

function smartMatchGlyph(cells, tw, th, refs) {
  let best = null, bestConf = 0;
  const n = tw * th;
  for (const [ch, ref] of refs) {
    let m = 0;
    for (let i = 0; i < n; i++) { if (cells[i] === ref[i]) m++; }
    const conf = m / n;
    if (conf > bestConf) { bestConf = conf; best = ch; }
  }
  return bestConf >= 0.78 ? best : null;
}

function smartSegmentLines(b, w, h) {
  const lines = [];
  let start = -1;
  for (let y = 0; y < h; y++) {
    let inky = 0;
    for (let x = 0; x < w; x++) { if (b[y * w + x]) { inky = 1; break; } }
    if (inky && start < 0) start = y;
    if (!inky && start >= 0) { lines.push({ top: start, bottom: y - 1 }); start = -1; }
  }
  if (start >= 0) lines.push({ top: start, bottom: h - 1 });
  return lines;
}

function smartGlyphs(b, w, line) {
  const gs = [];
  let cstart = -1;
  for (let x = 0; x < w; x++) {
    let ink = false;
    for (let y = line.top; y <= line.bottom; y++) { if (b[y * w + x]) { ink = true; break; } }
    if (ink && cstart < 0) cstart = x;
    if (!ink && cstart >= 0) { gs.push({ left: cstart, right: x - 1, top: line.top, bottom: line.bottom }); cstart = -1; }
  }
  if (cstart >= 0) gs.push({ left: cstart, right: w - 1, top: line.top, bottom: line.bottom });
  return gs;
}

function smartOcrRun(canvas) {
  if (!canvas || !canvas.width || !canvas.height) return null;
  const { bin, w, h, inkRatio } = smartBinarize(canvas);
  if (inkRatio < 0.0004) return null; // effectively empty page -> no text
  const refs = smartEnsureRefs();
  if (!refs) return null;
  const tw = 30, th = 36;
  const lines = smartSegmentLines(bin, w, h);
  if (!lines.length) return null;
  const paragraphs = [];
  let cur = [];
  let prevBottom = null;
  const lh = (lines[0].bottom - lines[0].top) || 1;
  for (const ln of lines) {
    if (prevBottom !== null && (ln.top - prevBottom) > Math.max(4, lh * 0.85)) {
      if (cur.length) paragraphs.push(cur);
      cur = [];
    }
    const glyphs = smartGlyphs(bin, w, ln);
    const chars = [];
    for (const g of glyphs) {
      const cells = smartGlyphCells(bin, w, g, tw, th);
      const ch = smartMatchGlyph(cells, tw, th, refs);
      if (ch) chars.push(ch);
    }
    if (chars.length) cur.push(chars.join(' '));
    prevBottom = ln.bottom;
  }
  if (cur.length) paragraphs.push(cur);
  const text = paragraphs.map(function (p) { return p.join('\n'); }).join('\n\n');
  return text.trim() !== '' ? text : null;
}
// ============================================================
// PART 5 — IMPORT PDF / SMART DOCS (scoped to Smart Documents only)
// Workflow: File Picker → Preparing → PDF Analysis →
//           Text PDF (direct)  |  Scanned PDF (OCR decision) → Editor
// Related scanner (PART 4) stays separate; no global refactor.
// ============================================================
let smartImportParsed = null;          // { pages:[{text,image,canvas}], text, numPages, type, name }
let smartImportOcrOverride = null;     // optional recognised-text override (test seam)
// PART 5e — session-scoped in-place text edits of the ORIGINAL PDF
// { pageIndex: { textItemIndex: newText } }. Kept only while the user works
// on the imported PDF; never sent anywhere. No new persistence system.
let smartImportEdits = null;
// PART 5e Text Color — session-local per-item color ranges over the CURRENT
// (edited) text: { pageIndex: { textItemIndex: [{ start, end, color }] } }.
// color is a #rrggbb string; at Save time it is emitted as REAL `rg` content
// stream operators (no overlay/canvas/image). Cleared with the edits store.
let smartImportColors = null;
const SMART_IMPORT_MIN_TEXT = 12;      // min extractable text chars to be considered a Text PDF

function smartImportEl(id) { return document.getElementById(id); }
function smartImportT() { return translations[state.locale] || translations.en; }

function smartImportViewVisible() {
  const v = smartImportEl('smartImportView');
  return !!(v && v.classList.contains('import-visible'));
}
function smartEditorVisible() {
  const v = smartImportEl('smartEditorView');
  return !!(v && v.classList.contains('editor-visible'));
}
function smartImportActiveStage() {
  const el = document.querySelector('#smartImportView .smart-import-stage.stage-active');
  if (!el) return 'none';
  const map = { importStagePick: 'pick', importStagePreparing: 'preparing', importStageScanned: 'scanned', importStageOcr: 'ocr', importStageError: 'error' };
  return map[el.id] || el.id;
}

function smartImportSetStage(name) {
  ['pick', 'preparing', 'scanned', 'ocr', 'error'].forEach((s) => {
    const el = smartImportEl('importStage' + s.charAt(0).toUpperCase() + s.slice(1));
    if (el) el.classList.toggle('stage-active', s === name);
  });
}

function smartImportResetUi() {
  smartImportParsed = null;
  smartImportOcrOverride = null;
  smartImportEdits = null;
  smartImportColors = null;
  const fi = smartImportEl('smartImportFileInput');
  if (fi) { try { fi.value = ''; } catch (e) {} }
  const err = smartImportEl('importErrorText');
  if (err) err.textContent = '';
  smartImportSetStage('pick');
}

function smartImportShowView() {
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = 'none';
  const v = smartImportEl('smartImportView');
  if (v) { v.classList.add('import-visible'); v.setAttribute('aria-hidden', 'false'); }
  const ed = smartImportEl('smartEditorView');
  if (ed) { ed.classList.remove('editor-visible'); ed.setAttribute('aria-hidden', 'true'); }
}

function smartImportShowEditor() {
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = 'none';
  const im = smartImportEl('smartImportView');
  if (im) { im.classList.remove('import-visible'); im.setAttribute('aria-hidden', 'true'); }
  const ed = smartImportEl('smartEditorView');
  if (ed) { ed.classList.add('editor-visible'); ed.setAttribute('aria-hidden', 'false'); }
}

function smartImportResetToHome() {
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = '';
  const v = smartImportEl('smartImportView');
  if (v) { v.classList.remove('import-visible'); v.setAttribute('aria-hidden', 'true'); }
  const ed = smartImportEl('smartEditorView');
  if (ed) { ed.classList.remove('editor-visible'); ed.setAttribute('aria-hidden', 'true'); }
  smartImportResetUi();
}

function smartImportOpen() {
  smartImportShowView();
  smartImportResetUi();
  setSmartDocsStep(1);
  const fi = smartImportEl('smartImportFileInput');
  if (fi) { try { fi.click(); } catch (e) {} }
}

function onSmartImportChoose() {
  const fi = smartImportEl('smartImportFileInput');
  if (fi) { try { fi.click(); } catch (e) {} }
}

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

// PART TRUE-PDF — a REAL PDF editing engine (pdf-lib) + a tiny flate helper (pako).
// These are loaded lazily ONLY when the user presses Save/Send on the imported
// PDF. pdf-lib can load an EXISTING PDF, preserve all original vector content
// (images/tables/fonts/pages/size unchanged), and rewrite its per-page CONTENT
// STREAMS so edited text becomes real, selectable/searchable PDF text — not a
// flattened image and not an HTML overlay. pdf.js stays for rendering/selection.
let smartPdfLibPromise = null;
async function smartImportLoadPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  if (!smartPdfLibPromise) {
    smartPdfLibPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/__pdfdiag/vendor/pdf-lib.min.js';
      // The vendor UMD build exposes itself as window.PDFLib (capital L), not
      // window.pdfLib. Load lazily on the Save/Send path only.
      s.onload = () => res(window.PDFLib);
      s.onerror = () => rej(new Error('pdf-lib load failed'));
      document.head.appendChild(s);
    });
  }
  return smartPdfLibPromise;
}
let smartPakoPromise = null;
async function smartImportLoadPako() {
  if (window.pako) return window.pako;
  if (!smartPakoPromise) {
    smartPakoPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = '/__pdfdiag/vendor/pako.min.js';
      s.onload = () => res(window.pako);
      s.onerror = () => rej(new Error('pako load failed'));
      document.head.appendChild(s);
    });
  }
  return smartPakoPromise;
}

async function smartImportParsePdf(file) {
  const pdfjs = await smartImportLoadPdfJs();
  let buf;
  try { buf = await file.arrayBuffer(); } catch (e) { throw new Error('read'); }
  // Keep an INDEPENDENT copy of the ORIGINAL raw bytes BEFORE handing the buffer
  // to pdf.js. pdf.js TRANSFERS `data` buffers to its worker thread, which
  // DETACHES the ArrayBuffer passed here. If we kept `buf` itself as the stored
  // `bytes`, the later TRUE-PDF Save/Send path would blow up with a "Can not
  // perform ArrayBuffer.prototype.slice on a detached ArrayBuffer" error. The
  // copy below stays intact for real content-stream editing, while the live
  // pdfDoc keeps its own transferred buffer for rendering/selection.
  const safeBytes = buf.slice(0);   // independent ArrayBuffer copy — never detached
  let pdf;
  try { pdf = await pdfjs.getDocument({ data: buf }).promise; } catch (e) { throw new Error('parse'); }
  if (!pdf || !pdf.numPages) throw new Error('empty');
  const pages = [], images = [];
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    let page = null;
    try { page = await pdf.getPage(i); } catch (e) { page = null; }
    let pageText = '';
    let pageItems = [];
    if (page) {
      try {
        const tc = await page.getTextContent();
        pageItems = (tc && tc.items) || [];
        pageText = pageItems.map((it) => it.str || '').join(' ');
      } catch (e) {}
    }
    text += (pageText ? pageText + ' ' : '');
    let canvas = null, image = '';
    let dims = { width: 794, height: 1123 };   // A4 fallback if the page can't be measured
    if (page) {
      try {
        const vp1 = page.getViewport({ scale: 1 });
        dims = { width: vp1.width, height: vp1.height };
        const viewport = page.getViewport({ scale: 1.5 });
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;
        image = canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) { canvas = null; }
    }
    // Keep the per-item text (positions via getTextContent) + page dims so the
    // in-place editor can build a positioned text layer (PART 5e).
    pages.push({ text: pageText.trim(), image: image, canvas: canvas, items: pageItems, dims: dims });
    if (image) images.push(image);
  }
  // PART 5e — keep the parsed PDF document alive for the session so the ORIGINAL
  // PDF can be re-rendered (and its pages edited) instead of being discarded.
  // `bytes` keeps the ORIGINAL raw PDF so TRUE content editing (PART TRUE-PDF)
  // can modify the real content streams instead of flattening to an image.
  return { numPages: pdf.numPages, text: text.trim(), pages: pages, images: images, name: file.name, pdfDoc: pdf, bytes: safeBytes };
}

// --- Image-based PDF detection (text presence, NOT OCR) ---
function smartImportDetectType(parsed) {
  const n = ((parsed && parsed.text) || '').replace(/\s+/g, '').length;
  return n < SMART_IMPORT_MIN_TEXT ? 'scanned' : 'text';
}

// --- File validation ---
function smartImportValidateFile(file) {
  if (!file) return false;
  if (file.type && file.type !== '' && file.type.toLowerCase() !== 'application/pdf') return false;
  if (!/\.pdf$/i.test(file.name || '')) return false;
  return true;
}

// --- Error state (in-UI, no alert()) ---
function smartImportShowError(msg) {
  const et = smartImportEl('importErrorText');
  if (et) et.textContent = msg || (smartImportT().smartImportFailed || 'Failed to Import');
  smartImportSetStage('error');
}

// --- OCR processing (only used after the user explicitly agrees) ---
async function smartImportRunOcr() {
  if (smartImportOcrOverride !== null && typeof smartImportOcrOverride === 'string') {
    if (smartImportOcrOverride.trim() === '') throw new Error('empty-ocr');
    return smartImportOcrOverride;
  }
  const parts = [];
  const pages = (smartImportParsed && smartImportParsed.pages) || [];
  for (const p of pages) {
    let res = null;
    if (p.canvas) { try { res = smartOcrRun(p.canvas); } catch (e) { res = null; } }
    if (res && res.trim() !== '') parts.push(res);
  }
  const text = parts.join('\n\n').trim();
  if (text === '') throw new Error('empty-ocr');
  return text;
}

// --- Editor insertion (scoped to Smart Documents) ---
function smartImportOpenEditorWith(result, name) {
  state.smartImportResult = {
    type: result.type,
    text: result.text || '',
    images: result.images || [],
    name: name || ''
  };
  smartImportShowEditor();
  const ta = smartImportEl('smartEditorText');
  if (ta) ta.value = state.smartImportResult.text;
  const box = smartImportEl('smartEditorImages');
  if (box) {
    box.innerHTML = '';
    (state.smartImportResult.images || []).forEach((src) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      box.appendChild(img);
    });
  }
  setSmartDocsStep(2);
  smartPdfEditorBuild();
}

// --- Main flow handlers ---
async function onSmartImportFileChange() {
  const fi = smartImportEl('smartImportFileInput');
  const file = fi && fi.files && fi.files[0];
  if (!file) return; // cancel / nothing selected -> stay on pick stage, no editor, no error
  smartImportSetStage('preparing');
  const ok = smartImportValidateFile(file);
  if (!ok) {
    smartImportShowError(smartImportT().smartImportInvalidFile || 'This file is not a valid PDF.');
    return;
  }
  try {
    const parsed = await smartImportParsePdf(file);
    if (!parsed || !parsed.numPages) {
      smartImportShowError(smartImportT().smartImportEmpty || 'This document has no usable content.');
      return;
    }
    smartImportParsed = parsed;
    parsed.type = smartImportDetectType(parsed);
    if (parsed.type === 'scanned') {
      // Do NOT enter the editor before the user decides OCR vs keep-as-images.
      smartImportSetStage('scanned');
    } else {
      smartImportOpenEditorWith({ type: 'text', text: parsed.text, images: parsed.images }, parsed.name);
    }
  } catch (e) {
    console.warn('import failed', e);
    smartImportShowError(smartImportT().smartImportCorrupt || 'The PDF could not be read.');
  }
}

async function onSmartImportUseOcr() {
  smartImportSetStage('ocr');
  setSmartDocsStep(1);
  // Let the OCR-processing state paint before doing the heavy recognition work,
  // so the in-UI "OCR Processing…" message is a real, observable state.
  await new Promise((r) => setTimeout(r, 150));
  try {
    const text = await smartImportRunOcr();
    smartImportOpenEditorWith({ type: 'ocr', text: text, images: smartImportParsed ? smartImportParsed.images : [] }, smartImportParsed ? smartImportParsed.name : '');
  } catch (e) {
    console.warn('ocr failed', e);
    smartImportShowError(smartImportT().smartImportOcrFailed || 'Text recognition failed. Please try again.');
  }
}

function onSmartImportKeepImages() {
  // No OCR: insert the rendered page images directly.
  const images = (smartImportParsed && smartImportParsed.images) || [];
  smartImportOpenEditorWith({ type: 'images', text: '', images: images }, smartImportParsed ? smartImportParsed.name : '');
}

function onSmartImportRetry() {
  smartImportResetUi();
  const fi = smartImportEl('smartImportFileInput');
  if (fi) { try { fi.click(); } catch (e) {} }
}

// ============================================================
// PART 5e — ORIGINAL PDF IN-PLACE EDITING (Smart Documents only)
// Renders the ORIGINAL imported PDF (kept alive in memory) as a
// canvas per page (images/graphics preserved) with an editable
// text layer above, positioned with pdf.js's own geometry so the
// text stays in its original place. Click a word/sentence → edit
// in place → the change appears on the SAME PDF page. No separate
// editor route/page, no new note/smart document, no persistence.
// ============================================================
function smartPdfEditorBack() {
  // Return to the PREVIOUS Smart Documents import pick screen — WITHOUT
  // deleting the parsed PDF (Section 9: Back never wipes PDF data/save).
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = 'none';
  const ed = smartImportEl('smartEditorView');
  if (ed) { ed.classList.remove('editor-visible'); ed.setAttribute('aria-hidden', 'true'); }
  const im = smartImportEl('smartImportView');
  if (im) { im.classList.add('import-visible'); im.setAttribute('aria-hidden', 'false'); }
  smartImportSetStage('pick');
  // Allow the user to pick the same PDF again (import still works).
  const pf = smartImportEl('smartImportFileInput');
  if (pf) { try { pf.value = ''; } catch (e) {} }
}

function smartPdfFonts(name) {
  if (!name) return 'Arial, sans-serif';
  const n = String(name).toLowerCase();
  if (/courier|mono/.test(n)) return "'Courier New', monospace";
  if (/times|serif|georgia/.test(n)) return "'Times New Roman', serif";
  if (/sans|arial|helvetica|verdana|tahoma|dejavu/.test(n)) return 'Arial, sans-serif';
  return 'Arial, sans-serif';
}

// Render one ORIGINAL PDF page to a canvas at the fitted CSS scale, but with a
// HIGH-DPI backing store so text/vector graphics stay SHARP on any display.
// The canvas INTERNAL resolution is viewport × devicePixelRatio; the CSS
// display size stays exactly the fitted (visual) size — never the ×dpr size.
// A CSS-space viewport is returned so the text layer geometry keeps aligning
// over the visible page (same left/top/scale/page coordinates, no displacement).
async function smartPdfRenderPage(pdfPage, canvas, scale) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  // Cap so very-high-DPI devices don't allocate absurdly large canvases while
  // still giving crisp text on normal 1x–3x displays (performance budget).
  const outputScale = Math.min(dpr, 3) || 1;
  const cssViewport = pdfPage.getViewport({ scale: scale });                 // visual size
  const renderViewport = pdfPage.getViewport({ scale: scale * outputScale }); // backing store
  canvas.width = Math.max(1, Math.round(renderViewport.width));
  canvas.height = Math.max(1, Math.round(renderViewport.height));
  canvas.style.width = Math.max(1, Math.round(cssViewport.width)) + 'px';
  canvas.style.height = Math.max(1, Math.round(cssViewport.height)) + 'px';
  await pdfPage.render({
    canvasContext: canvas.getContext('2d', { willReadFrequently: true }),
    viewport: renderViewport
  }).promise;
  return cssViewport; // text layer geometry must stay aligned with the visible page
}

// Build the editable text layer for one page using pdfjs's own geometry:
//   h = Util.transform(viewport.transform, item.transform)
//   fontHeight = Math.hypot(h[2], h[3]);  top = h[5] - 0.8*fontHeight; left = h[4]
// so each span covers the glyph it belongs to; editing only touches that span.
function smartPdfTextLayer(layer, pdfjs, viewport, items, pageIndex) {
  if (!pdfjs || !pdfjs.Util) return;
  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    if (!it || typeof it.str !== 'string' || it.str === '') continue;
    if (!Array.isArray(it.transform) || it.transform.length < 6) continue;
    let h = null;
    try { h = pdfjs.Util.transform(viewport.transform, it.transform); } catch (e) { continue; }
    if (!h || !isFinite(h[4]) || !isFinite(h[5])) continue;
    const fontHeight = Math.hypot(h[2], h[3]);
    if (!fontHeight || fontHeight < 0.1) continue;
    const ascent = fontHeight * 0.8;
    const angle = Math.atan2(h[1], h[0]);
    let left, top;
    if (angle === 0) { left = h[4]; top = h[5] - ascent; }
    else { left = h[4] + ascent * Math.sin(angle); top = h[5] - ascent * Math.cos(angle); }
    const span = document.createElement('span');
    span.className = 'smart-pdf-text';
    span.textContent = it.str;
    // Original text is kept so the layer can tell "edited" spans apart from the
    // pristine canvas text: only edited/active spans are painted, so the PDF's
    // original glyphs (drawn once by the canvas) never appear doubled/overlapping.
    span.dataset.text0 = it.str;
    span.dir = (it.dir === 'rtl' || it.dir === 'ltr') ? it.dir : ((state && state.locale === 'ar') ? 'rtl' : 'ltr');
    span.style.left = (isFinite(left) ? left : 0) + 'px';
    span.style.top = (isFinite(top) ? top : 0) + 'px';
    span.style.fontSize = fontHeight + 'px';
    span.style.fontFamily = smartPdfFonts(it.fontName);
    span.dataset.page = String(pageIndex);
    span.dataset.item = String(idx);
    span.contentEditable = 'false';
    layer.appendChild(span);

    // Selection vs editing seam: a press that MOVES is a drag-selection
    // gesture and must leave the browser's native selection alone; only a
    // true single click (no movement) enters in-place editing.
    let pdX = null, pdY = null;
    span.addEventListener('pointerdown', (ev) => {
      pdX = ev.clientX; pdY = ev.clientY;
    });
    span.addEventListener('click', (ev) => {
      if (ev.button && ev.button === 2) return;
      ev.stopPropagation();
      // Press+drag → the user drag-selected text; keep that selection exactly
      // as the browser drew it (do NOT select the whole span / edit mode).
      if (pdX !== null && typeof ev.clientX === 'number' &&
          Math.hypot(ev.clientX - pdX, ev.clientY - pdY) > 5) return;
      if (span.classList.contains('is-editing')) return;
      // Remember the span's PRE-EDIT pixel width so the white mask painted in
      // the exported/saved PDF can cover a replacement shorter than the
      // original word (old glyphs must not peek out).
      try { span.dataset.lastW = String(Math.ceil(span.getBoundingClientRect().width)); } catch (e) {}
      span.contentEditable = 'true';
      span.classList.add('is-editing');
      span.focus();
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    });
    span.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === 'Escape') { ev.preventDefault(); span.blur(); }
    });
    span.addEventListener('blur', () => { smartPdfCommitText(span); });
  }
}

// Commit one edited text span: only that span (that word) changes; the rest
// of the page and the other pages are untouched. Purely session-local.
function smartPdfCommitText(span) {
  const wasEditing = span.classList.contains('is-editing');
  span.classList.remove('is-editing');
  span.contentEditable = 'false';
  if (!wasEditing || !span) return;
  const page = parseInt(span.dataset.page, 10);
  const item = parseInt(span.dataset.item, 10);
  if (!isFinite(page) || !isFinite(item)) return;
  // Stay visible after committing: the replacement is drawn where the original
  // word was (same left/top/font metrics — never a different position).
  span.classList.add('is-edited');
  // PART 5e — a TEXT change invalidates previously stored color ranges for this
  // item (stale offsets could otherwise split the wrong glyphs). Recolor after
  // editing if wanted; the PDF keeps the previous saved color until then.
  const prevText = ((smartImportEdits && smartImportEdits[page] && smartImportEdits[page][item]) != null)
    ? smartImportEdits[page][item] : (span.dataset.text0 || '');
  if ((span.textContent || '') !== prevText) smartPdfClearItemColors(page, item);
  smartPdfRecordEdit(page, item, span.textContent || '');
}

// Session-local edit bookkeeping shared by click-editing AND drag-selection
// replacement — the exact same store + signature-invalidation path used before.
function smartPdfRecordEdit(page, item, text) {
  smartImportEdits = smartImportEdits || {};
  smartImportEdits[page] = smartImportEdits[page] || {};
  smartImportEdits[page][item] = text;
  // SECURITY (PART 18 reuse): ANY committed content edit on the imported PDF
  // invalidates a previous signature/stamp immediately — the old approval no
  // longer represents this content. Reuses the EXISTING PART 18 state machine
  // ('signed' → 'modified'); no new signature/stamp/certificate system.
  try {
    if (typeof smartSigProtectMarkInvalid === 'function' &&
        typeof smartSigProtectStatus !== 'undefined' &&
        smartSigProtectStatus === 'signed') {
      smartSigProtectMarkInvalid();
    }
  } catch (e) { /* never block editing itself */ }
}

// --- PART 5e Text Color (Smart PDF Direct Editor only) -----------------------
// Colors the REAL PDF text: the selection's char ranges are recorded per text
// item and, on Save, the content stream run is split into segments with real
// `r g b rg` fill-color operators (no HTML overlay / canvas / image / flattening).
function smartPdfHexToRgbOp(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!m) return '0 0 0 rg';
  const v = parseInt(m[1], 16);
  const f = (s) => { const n = Math.round(s * 10000) / 10000; return String(n); };
  return f(((v >> 16) & 255) / 255) + ' ' + f(((v >> 8) & 255) / 255) + ' ' + f((v & 255) / 255) + ' rg';
}

// Record a color range over one text item (session-local). Color IS a content
// modification, so the SAME store + signature 'signed'→'modified' path as text
// edits is reused via smartPdfRecordEdit (item text is recorded unchanged).
function smartPdfRecordColor(page, item, start, end, colorHex, spanText) {
  if (!isFinite(page) || !isFinite(item) || !(end > start)) return;
  smartImportColors = smartImportColors || {};
  smartImportColors[page] = smartImportColors[page] || {};
  const list = smartImportColors[page][item] || [];
  // New color wins over any overlapping previous range.
  const kept = list.filter((r) => r.end <= start || r.start >= end);
  kept.push({ start: Math.max(0, start), end: end, color: String(colorHex || '#000000') });
  kept.sort((a, b) => a.start - b.start);
  smartImportColors[page][item] = kept;
  smartPdfRecordEdit(page, item, (spanText != null) ? spanText : undefined);
}

// Drop stored color ranges for one item (used when the item's text is edited,
// so stale offsets can never split the wrong glyphs or double text).
function smartPdfClearItemColors(page, item) {
  if (!isFinite(page) || !isFinite(item) || !smartImportColors) return;
  if (smartImportColors[page]) delete smartImportColors[page][item];
}

// Paint the LIVE preview of a color range on one text-layer span. This mirrors
// exactly the committed-edit painting (.is-edited white mask + painted text on
// top) — the true color is still written into the PDF at Save time.
function smartPdfPaintSpanColor(sp, start, end, colorHex) {
  if (!sp) return;
  try { sp.dataset.lastW = String(Math.ceil(sp.getBoundingClientRect().width)); } catch (e) {}
  const text = sp.textContent || '';
  sp.classList.add('is-edited');
  const frag = document.createDocumentFragment();
  if (start > 0) frag.appendChild(document.createTextNode(text.slice(0, start)));
  const cs = document.createElement('span');
  cs.className = 'smart-pdf-colored';
  cs.style.color = colorHex;
  cs.textContent = text.slice(start, end);
  frag.appendChild(cs);
  if (end < text.length) frag.appendChild(document.createTextNode(text.slice(end)));
  sp.textContent = '';
  sp.appendChild(frag);
}

// Apply a text color to the CURRENT selection inside the PDF text layer.
// Works for one word, several words, part of a line and drag selection.
// With no selection: a small toast asks the user to select text first —
// nothing is applied to the page at random.
function smartPdfApplyTextColor(colorHex) {
  if (typeof document === 'undefined') return false;
  const host = smartImportEl('smartPdfEditor');
  const edView = document.getElementById('smartEditorView');
  if (!host || !edView || !edView.classList.contains('editor-visible')) return false;
  const ar = !!(state && state.locale === 'ar');
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) {
    showToast(ar ? 'حدّد النص الذي تريد تلوينه أولاً' : 'Select the text you want to color first', 2400);
    return false;
  }
  let rng = null;
  try { rng = sel.getRangeAt(0); } catch (e) { return false; }
  if (!rng) return false;
  let applied = 0;
  const spans = Array.from(host.querySelectorAll('.smart-pdf-text'));
  for (const sp of spans) {
    let touched = false;
    try {
      touched = rng.intersectsNode(sp);
      if (touched) {
        const tr = document.createRange(); tr.selectNodeContents(sp);
        if (rng.compareBoundaryPoints(Range.END_TO_START, tr) >= 0) touched = false;
        if (rng.compareBoundaryPoints(Range.START_TO_END, tr) <= 0) touched = false;
      }
    } catch (e) { touched = false; }
    if (!touched) continue;
    const page = parseInt(sp.dataset.page, 10);
    const item = parseInt(sp.dataset.item, 10);
    if (!isFinite(page) || !isFinite(item)) continue;
    const text = sp.textContent || '';
    // Map the selection boundaries onto this span's plain-text offsets.
    let start = 0, end = text.length;
    try {
      if (sp.contains(rng.startContainer)) {
        const r0 = document.createRange(); r0.selectNodeContents(sp);
        r0.setEnd(rng.startContainer, rng.startOffset);
        start = Math.max(0, Math.min(text.length, r0.toString().length));
      }
      if (sp.contains(rng.endContainer)) {
        const r1 = document.createRange(); r1.selectNodeContents(sp);
        r1.setStart(rng.endContainer, rng.endOffset);
        end = text.length - Math.max(0, Math.min(text.length, r1.toString().length));
      }
    } catch (e) { continue; }
    if (end <= start) continue;
    smartPdfRecordColor(page, item, start, end, colorHex, text);
    smartPdfPaintSpanColor(sp, start, end, colorHex);
    applied++;
  }
  if (!applied) {
    showToast(ar ? 'حدّد النص الذي تريد تلوينه أولاً' : 'Select the text you want to color first', 2400);
    return false;
  }
  try { sel.removeAllRanges(); } catch (e) {}
  return true;
}


// --- Natural drag-selection typing (Part 5e only) ---
// Replace the CURRENT non-collapsed selection inside the PDF text layer with
// the typed text ('' for Backspace/Delete). Only the selected characters
// change; they are replaced IN THE SAME PDF POSITION via the existing spans.
function smartPdfReplaceSelection(txt) {
  const sel = window.getSelection();
  const host = smartImportEl('smartPdfEditor');
  if (!host || !sel || !sel.rangeCount || sel.isCollapsed) return false;
  let rng = null;
  try { rng = sel.getRangeAt(0); } catch (e) { return false; }
  if (!rng) return false;
  // All touched spans, in DOM order; a currently editable span means native
  // in-place editing owns this gesture instead.
  const ordered = [];
  const spans = Array.from(host.querySelectorAll('.smart-pdf-text'));
  for (const sp of spans) {
    if (sp.isContentEditable) return false;
    let touched = false;
    try {
      touched = rng.intersectsNode(sp);
      if (touched) {
        const tr = document.createRange();
        tr.selectNodeContents(sp);
        if (rng.compareBoundaryPoints(Range.END_TO_START, tr) >= 0) touched = false;
        else if (rng.compareBoundaryPoints(Range.START_TO_END, tr) <= 0) touched = false;
      }
    } catch (e) { touched = false; }
    if (touched) ordered.push(sp);
  }
  if (!ordered.length) return false;
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  // Text kept around the selection, measured with Range.toString so any DOM
  // shape works. Collapse everything into the FIRST span so the replacement
  // appears at the same PDF position where selection started.
  let pre = '', post = '';
  try {
    const pr = document.createRange();
    pr.selectNodeContents(first);
    pr.setEnd(rng.startContainer, rng.startOffset);
    pre = pr.toString();
    const qr = document.createRange();
    qr.selectNodeContents(last);
    qr.setStart(rng.endContainer, rng.endOffset);
    post = qr.toString();
  } catch (e) { /* keep empty fallbacks */ }
  ordered.forEach((sp) => {
    // Capture pre-mutation widths (mask coverage) BEFORE changing content.
    try { sp.dataset.lastW = String(Math.ceil(sp.getBoundingClientRect().width)); } catch (e) {}
    sp.classList.remove('is-editing'); sp.contentEditable = 'false';
    sp.classList.add('is-edited');
  });
  first.textContent = pre + txt + post;
  ordered.slice(1).forEach((sp) => { sp.textContent = ''; });
  // Same bookkeeping as the committed click-edit path (save/PDF export and
  // signature protection behave identically).
  ordered.forEach((sp) => {
    const p = parseInt(sp.dataset.page, 10);
    const it = parseInt(sp.dataset.item, 10);
    if (!isFinite(p) || !isFinite(it)) return;
    // PART 5e — text changed -> stored color ranges for this item are stale.
    const prev = ((smartImportEdits && smartImportEdits[p] && smartImportEdits[p][it]) != null)
      ? smartImportEdits[p][it] : (sp.dataset.text0 || '');
    if ((sp.textContent || '') !== prev) smartPdfClearItemColors(p, it);
    smartPdfRecordEdit(p, it, sp.textContent || '');
  });
  // Hand the caret to the first span so continued typing keeps working in place.
  first.contentEditable = 'true';
  first.classList.add('is-editing');
  first.focus();
  try {
    const s2 = window.getSelection();
    const tn = first.firstChild;
    const off = Math.max(0, Math.min(pre.length + txt.length, tn ? tn.textContent.length : 0));
    const nr = document.createRange();
    nr.setStart(tn || first, off);
    nr.collapse(true);
    s2.removeAllRanges();
    s2.addRange(nr);
  } catch (e) { /* caret placement is best-effort */ }
  return true;
}

// ONE document-level keydown seam, strictly gated to the Smart Documents PDF
// editor view: when a drag-selection lives inside .smart-pdf-textlayer and the
// user starts typing/deleting, replace that selection in place. Everything
// else (other tools, other views, collapsed carets, copy shortcuts) returns
// before touching anything.
document.addEventListener('keydown', (ev) => {
  if (typeof smartImportEl !== 'function') return;
  const host = smartImportEl('smartPdfEditor');
  const edView = document.getElementById('smartEditorView');
  if (!host || !edView || !edView.classList.contains('editor-visible')) return;
  const ae = document.activeElement;
  if (ae && ae !== document.body &&
      (ae.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName))) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;
  let rng = null;
  try { rng = sel.getRangeAt(0); } catch (e) { return; }
  const anc = rng.commonAncestorContainer;
  const ancEl = anc && anc.nodeType === 1 ? anc : (anc ? anc.parentNode : null);
  if (!ancEl || !host.contains(ancEl)) return;
  const k = ev.key || '';
  const plain = !ev.ctrlKey && !ev.metaKey && !ev.altKey;
  const printable = plain && k.length === 1;
  const del = plain && (k === 'Backspace' || k === 'Delete');
  if (!printable && !del) return;
  ev.preventDefault(); // we perform the replacement ourselves, below
  smartPdfReplaceSelection(printable ? k : '');
});

// Render the whole ORIGINAL PDF (all pages) into #smartPdfEditor, each page as
// canvas + editable text layer, all fitted to the container (responsive, no H-flow).
async function smartPdfEditorBuild() {
  smartImportEdits = null;
  smartImportColors = null;
  const holder = smartImportEl('smartPdfEditor');
  if (!holder) return;
  holder.innerHTML = '';
  if (!smartImportParsed || !smartImportParsed.pdfDoc) return;
  const pdfjs = await smartImportLoadPdfJs();
  if (!pdfjs) return;
  const pages = smartImportParsed.pages || [];
  if (!pages.length) { holder.innerHTML = ''; return; }
  const availW = Math.max(120, Math.min(holder.clientWidth || 720, window.innerWidth - 8, 720));
  for (let i = 0; i < pages.length; i++) {
    const meta = pages[i] || {};
    const dims = meta.dims || { width: 794, height: 1123 };
    const scale = Math.max(0.12, Math.min(1.6, availW / dims.width));
    const wrap = document.createElement('div');
    wrap.className = 'smart-pdf-page';
    const canvas = document.createElement('canvas');
    canvas.className = 'smart-pdf-canvas';
    wrap.appendChild(canvas);
    const layer = document.createElement('div');
    layer.className = 'smart-pdf-textlayer';
    wrap.appendChild(layer);
    holder.appendChild(wrap);
    let pdfPage = null;
    try { pdfPage = await smartImportParsed.pdfDoc.getPage(i + 1); } catch (e) { pdfPage = null; }
    let viewport = null;
    let rendered = false;
    if (pdfPage) {
      try { viewport = await smartPdfRenderPage(pdfPage, canvas, scale); rendered = true; } catch (e) { rendered = false; }
    }
    if (rendered) {
      // Size the page wrapper to the CSS (visual) footprint returned by
      // smartPdfRenderPage (the cssViewport) so the absolute text layer stays
      // aligned. Do NOT use the (higher-DPR) canvas backing width here — that
      // is the internal pixel size and would visually overflow the fit layout.
      wrap.style.width = ((viewport && viewport.width) ? Math.round(viewport.width) : (dims.width)) + 'px';
      wrap.style.height = (((viewport && viewport.height) ? Math.round(viewport.height) : (dims.height)) + 2) + 'px';
      if (viewport && meta.items && meta.items.length) smartPdfTextLayer(layer, pdfjs, viewport, meta.items, i);
    } else if (meta.image) {
      // No live render available: honour the ORIGINAL page image (nothing changed).
      const img = document.createElement('img');
      img.className = 'smart-pdf-face';
      img.alt = '';
      img.src = meta.image;
      img.style.width = '100%';
      canvas.replaceWith(img);
      wrap.style.width = '100%';
      wrap.style.height = 'auto';
    } else {
      wrap.style.display = 'none';
    }
  }
  // Direction inherits the existing RTL/LTR architecture (per-span dir from pdfjs).
  // When this text-layer PDF editor is shown, keep the legacy page-image preview
  // block (#smartEditorImages) out of the pointer path: it is displayed AFTER the
  // .smart-pdf-editor in the column and its CSS `display:flex` defeats the `hidden`
  // attribute, so it would sit ON TOP of the text layer and swallow every mouse/touch
  // drag. Hiding it here restores natural text selection without touching images,
  // textarea, other types, or anything else.
  const legacyImages = smartImportEl('smartEditorImages');
  if (legacyImages) legacyImages.style.display = 'none';
  // Direction inherits the existing RTL/LTR architecture (per-span dir from pdfjs).
}

// PART 5 — test / configuration seam for the Smart Import workflow.
window.__smartImport = {
  getState: () => ({
    stage: smartImportActiveStage(),
    viewVisible: smartImportViewVisible(),
    editorVisible: smartEditorVisible(),
    step: (state && state.smartDocsStep) || 1,
    parsedType: smartImportParsed ? smartImportParsed.type : null,
    type: (state && state.smartImportResult && state.smartImportResult.type) || null,
    result: (state && state.smartImportResult) || null,
    textLen: (state && state.smartImportResult && state.smartImportResult.text) ? state.smartImportResult.text.length : 0,
    imageCount: (state && state.smartImportResult && state.smartImportResult.images) ? state.smartImportResult.images.length : 0,
    fileName: (state && state.smartImportResult) ? state.smartImportResult.name : null
  }),
  open: () => smartImportOpen(),
  setOcrText: (text) => { smartImportOcrOverride = (text === null || text === undefined) ? null : String(text); },
  clearOcrText: () => { smartImportOcrOverride = null; },
  reset: () => smartImportResetToHome(),
  // PART 5e — Text Color seam (Smart PDF Direct Editor only).
  textColor: (colorHex) => smartPdfApplyTextColor(colorHex),
  colors: () => smartImportColors
};

// ============================================================
// PART TRUE-PDF — REAL PDF content editing at Save/Send time on the
// Imported-PDF direct-edit screen (Smart Documents only).
// NO flattening / NO white-rectangle / NO text-overlay burning:
// a real PDF editing engine (pdf-lib) loads the ORIGINAL PDF and rewrites the
// page CONTENT STREAMS, so the new text is real, selectable/searchable PDF
// text inside the original layout (images/tables/fonts/pages/size unchanged).
// Helper implementations live just below these save entry-points.
// ============================================================

// Save (حفظ): produces the TRUE edited PDF — the ORIGINAL vector document with
// the edited words rewritten inside its content streams. No canvas/rasterize.
async function smartImportEditedBlob() {
  const parsed = smartImportParsed;
  if (!parsed || !parsed.bytes) throw new Error('no source bytes');
  const edits = smartImportEdits || {};
  const colors = smartImportColors || {};
  const hasEdits = Object.keys(edits).some((p) => { const m = edits[p]; return m && Object.keys(m).length > 0; }) ||
    Object.keys(colors).some((p) => { const m = colors[p]; return m && Object.keys(m).length > 0; });
  if (!hasEdits) return new Blob([parsed.bytes], { type: 'application/pdf' });
  const pdfLib = await smartImportLoadPdfLib();
  const pako = await smartImportLoadPako();
  const outBytes = await smartImportTrueEditBytes(pdfLib, pako, new Uint8Array(parsed.bytes.slice(0)), edits, parsed.pages, colors);
  return new Blob([outBytes], { type: 'application/pdf' });
}

// ---- byte/hex helpers ------------------------------------------------------
function smartPdfBytesToLatin1(u8) {
  let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return s;
}
function smartPdfLatin1ToBytes(str) {
  const u8 = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) u8[i] = str.charCodeAt(i) & 0xff;
  return u8;
}
function smartPdfBytesToHex(u8) {
  let h = ''; for (let i = 0; i < u8.length; i++) { const b = u8[i].toString(16); h += (b.length < 2 ? '0' + b : b); }
  return h;
}
function smartPdfBytesToLit(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i++) {
    const c = u8[i];
    if (c === 40) s += '\\(';
    else if (c === 41) s += '\\)';
    else if (c === 92) s += '\\\\';
    else if (c === 13) s += '\\r';
    else if (c === 10) s += '\\n';
    else if (c === 9) s += '\\t';
    else s += String.fromCharCode(c);
  }
  return s;
}

// ---- content-stream tokenizer ----------------------------------------------
// Extract, in order, every TEXT-SHOWING run (Tj / ' / " or [ ... ] TJ) with its
// decoded bytes, so an edited span can be matched and its operand rewritten in
// place — same font, same position, no overlay, no leftover glyphs.
function smartPdfTokenizeTextRuns(content) {
  const runs = [];
  const n = content.length;
  const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f';
  const skipWs = (j) => { while (j < n && isWs(content[j])) j++; return j; };
  const decodeLit = (body) => {
    const bytes = [];
    for (let k = 0; k < body.length; k++) {
      const c = body[k];
      if (c === '\\') {
        const nx = body[k + 1];
        if      (nx === 'n') { bytes.push(10); k++; }
        else if (nx === 'r') { bytes.push(13); k++; }
        else if (nx === 't') { bytes.push(9); k++; }
        else if (nx === 'b') { bytes.push(8); k++; }
        else if (nx === 'f') { bytes.push(12); k++; }
        else if (nx !== undefined && /[0-7]/.test(nx)) {
          let oct = '', o = k + 1; while (o < body.length && o < k + 4 && /[0-7]/.test(body[o])) oct += body[o++];
          bytes.push(parseInt(oct, 8) & 0xff); k = o - 1;
        } else { bytes.push((nx || ' ').charCodeAt(0) & 0xff); k++; }
      } else { bytes.push(c.charCodeAt(0) & 0xff); }
    }
    return new Uint8Array(bytes);
  };
  const decodeHex = (body) => {
    const clean = body.replace(/\s+/g, '');
    const h = clean + (clean.length % 2 ? '0' : '');
    const bytes = [];
    for (let k = 0; k < h.length; k += 2) bytes.push(parseInt(h.substr(k, 2), 16));
    return new Uint8Array(bytes);
  };
  const parseString = (i) => {
    const c = content[i];
    if (c === '(') {
      let j = i + 1, depth = 1;
      while (j < n) {
        if (content[j] === '\\') { j += 2; continue; }
        if (content[j] === '(') depth++;
        else if (content[j] === ')') { depth--; if (depth === 0) break; }
        j++;
      }
      return { start: i, end: j + 1, decoded: decodeLit(content.slice(i + 1, j)), type: 'lit' };
    }
    if (c === '<' && content[i + 1] !== '<') {
      let j = i + 1; while (j < n && content[j] !== '>') j++;
      return { start: i, end: j + 1, decoded: decodeHex(content.slice(i + 1, j)), type: 'hex' };
    }
    return null;
  };
  const parseArray = (i) => {
    const strings = [];
    let j = i + 1;
    while (j < n) {
      j = skipWs(j);
      if (j >= n || content[j] === ']') { j++; break; }
      if (content[j] === '[') { let d = 1; j++; while (j < n && d) { if (content[j] === '[') d++; else if (content[j] === ']') d--; j++; } continue; }
      const st = parseString(j);
      if (st) { strings.push(st); j = st.end; } else j++;
    }
    return { strings, end: j };
  };

  let i = 0;
  while (i < n) {
    i = skipWs(i);
    if (i >= n) break;
    const c = content[i];
    if (c === '[') {
      const arr = parseArray(i);
      const after = skipWs(arr.end);
      if (content.substr(after, 2) === 'TJ' && arr.strings.length) {
        let total = 0; arr.strings.forEach((s) => { total += s.decoded.length; });
        const merged = new Uint8Array(total);
        let p = 0; arr.strings.forEach((s) => { merged.set(s.decoded, p); p += s.decoded.length; });
        runs.push({ type: 'array', start: i, end: arr.end, decoded: merged, strings: arr.strings });
        i = after + 2;
      } else { i = arr.end; }
      continue;
    }
    if (c === '(' || (c === '<' && content[i + 1] !== '<')) {
      const st = parseString(i);
      if (st) {
        const after = skipWs(st.end);
        if (content.substr(after, 2) === 'Tj' || content[after] === "'" || content[after] === '"') {
          runs.push({ type: st.type, start: st.start, end: st.end, decoded: st.decoded, strings: [st] });
          i = after + (content.substr(after, 2) === 'Tj' ? 2 : 1);
          continue;
        }
        i = st.end; continue;
      }
    }
    i++;
  }
  return runs;
}

// Track the active FILL COLOR for each text run by scanning the content stream
// (real color operators only: rg / g / k / sc / scn / cs). Default fill is black.
function smartPdfRunFillColors(content, runs) {
  const n = content.length;
  const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f';
  const numRe = /^[-+]?[0-9]*\.?[0-9]+/;
  const fills = new Array(runs.length).fill('0 g');
  let cur = '0 g';
  let ri = 0;
  let i = 0;
  let lastOpEnd = 0; // position right after the previous OPERATOR (operands accumulate between ops)
  while (i < n) {
    while (ri < runs.length && runs[ri].start <= i) { fills[ri] = cur; ri++; }
    const c = content[i];
    if (isWs(c)) { i++; continue; }
    if (/[0-9.+\-]/.test(c)) { const m = numRe.exec(content.slice(i, i + 24)); i += (m ? m[0].length : 1); continue; }
    if (c === '/') { let j = i + 1; while (j < n && !isWs(content[j]) && '/[<()'.indexOf(content[j]) === -1) j++; i = j; continue; }
    if (c === '(') { let j = i + 1; while (j < n) { if (content[j] === '\\') { j += 2; continue; } if (content[j] === ')') { j++; break; } j++; } i = j; continue; }
    if (c === '<') {
      if (content[i + 1] === '<') { i += 2; } else { let j = i + 1; while (j < n && content[j] !== '>') j++; i = j + 1; }
      continue;
    }
    if (c === '[') { let d = 1, j = i + 1; while (j < n && d) { if (content[j] === '[') d++; else if (content[j] === ']') d--; j++; } i = j; continue; }
    let j = i; while (j < n && !isWs(content[j])) j++;
    const op = content.slice(i, j);
    if (op === 'rg' || op === 'g' || op === 'k' || op === 'sc' || op === 'scn' || op === 'cs') {
      const operands = content.slice(lastOpEnd, i).trim();
      cur = (operands ? operands + ' ' : '') + op;
    }
    i = j; lastOpEnd = i;
  }
  while (ri < runs.length) { fills[ri] = cur; ri++; }
  return fills;
}

// Rewrite ONE text run as REAL colored segments: the operand is split and each
// colored segment gets a genuine `r g b rg` fill operator, then the ORIGINAL
// fill is restored so nothing else on the page changes color. Pure content-
// stream substitution — same font, same position, no overlay, no doubling.
function smartPdfRewriteRunWithColors(content, run, newText, ranges, runIdx, runs, runEndIdx) {
  const n = content.length;
  const isWs = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f';
  const lastRun = runs[runEndIdx || runIdx];
  let k = lastRun.end;
  while (k < n && isWs(content[k])) k++;
  const two = content.substr(k, 2);
  const opLen = (two === 'Tj' || two === 'TJ') ? 2 : ((content[k] === "'" || content[k] === '"') ? 1 : 0);
  if (!opLen) return null;
  const opEnd = k + opLen;
  const start = run.start;
  const fill = smartPdfRunFillColors(content, runs)[runIdx] || '0 g';
  // Text segments from the merged color ranges over the NEW text.
  const segs = [];
  let pos = 0;
  const sorted = ranges.slice().sort((a, b) => a.start - b.start);
  for (const r of sorted) {
    const s = Math.max(0, Math.min(newText.length, r.start));
    const e = Math.max(s, Math.min(newText.length, r.end));
    if (e <= s) continue;
    if (s > pos) segs.push({ text: newText.slice(pos, s), color: null });
    segs.push({ text: newText.slice(s, e), color: smartPdfHexToRgbOp(r.color) });
    pos = e;
  }
  if (pos < newText.length) segs.push({ text: newText.slice(pos), color: null });
  if (!segs.length) return null;
  const lit = run.type !== 'hex' && (!run.strings || run.strings[0].type !== 'hex');
  const enc = (s) => lit ? smartPdfBytesToLit(smartPdfLatin1ToBytes(s)) : smartPdfBytesToHex(smartPdfLatin1ToBytes(s));
  const wrap = (s) => lit ? '(' + enc(s) + ')' : '<' + enc(s) + '>';
  let out = '';
  let lastColor = fill;
  segs.forEach((seg) => {
    if (seg.color && seg.color !== lastColor) { out += ' ' + seg.color; lastColor = seg.color; }
    else if (!seg.color && lastColor !== fill) { out += ' ' + fill; lastColor = fill; }
    out += ' ' + wrap(seg.text) + ' Tj';
  });
  out += ' ' + content.substr(k, opLen);      // keep the original showing operator
  if (lastColor !== fill) out += ' ' + fill;  // restore the original fill after us
  const newContent = content.slice(0, start) + out + content.slice(opEnd);
  const diff = out.length - (opEnd - start);
  for (let m = (runEndIdx || runIdx) + 1; m < runs.length; m++) { runs[m].start += diff; runs[m].end += diff; }
  return { content: newContent };
}

// Apply per-page edits to an inflated content string: replace the matched text
// run's operand bytes with the new text bytes (genuine in-content substitution).
// PART 5e: itemColors adds REAL `rg` color operators around colored segments.
function smartPdfApplyPageEdits(content, itemEdits, items, itemColors) {
  if (!itemEdits) return content;
  const runs = smartPdfTokenizeTextRuns(content);
  if (!runs.length) return content;
  const used = new Array(runs.length).fill(false);
  const itemKeys = Object.keys(itemEdits).map(Number).sort((a, b) => a - b);
  for (const itIdx of itemKeys) {
    const newText = String(itemEdits[itIdx] == null ? '' : itemEdits[itIdx]);
    const oldItem = (items && items[itIdx]) || null;
    const oldText = (oldItem && oldItem.str) || '';
    let runIdx = -1;
    let runEndIdx = -1;
    for (let k = 0; k < runs.length; k++) {
      if (used[k]) continue;
      const dec = smartPdfBytesToLatin1(runs[k].decoded);
      if (oldText && (dec === oldText || dec === oldText.trim() || dec.indexOf(oldText) !== -1)) { runIdx = k; break; }
    }
    if (runIdx === -1 && oldText) {
      // PART 5e Text Color — a previous colored save may have split one text
      // item into several consecutive content-stream runs. Match a WINDOW of
      // consecutive runs whose concatenated text equals the item's text and
      // rewrite the whole window (real text, same position, no leftovers).
      for (let s = 0; s < runs.length && runIdx === -1; s++) {
        if (used[s]) continue;
        let acc = smartPdfBytesToLatin1(runs[s].decoded);
        for (let e = s; e < runs.length; e++) {
          if (e > s) acc += smartPdfBytesToLatin1(runs[e].decoded);
          if (acc.trim() === oldText.trim()) { runIdx = s; runEndIdx = e; break; }
          if (acc.length > oldText.length + 4) break;
        }
      }
    }
    if (runIdx === -1) continue; // could not locate this run -> documented limitation
    const run = runs[runIdx];
    for (let k = runIdx; k <= (runEndIdx === -1 ? runIdx : runEndIdx); k++) used[k] = true;
    // PART 5e — colored items are rewritten as real colored content-stream segments.
    const colorRanges = (itemColors && itemColors[itIdx]) || null;
    if (runEndIdx !== -1 || (colorRanges && colorRanges.length)) {
      const rewritten = smartPdfRewriteRunWithColors(content, run, newText, colorRanges || [], runIdx, runs, runEndIdx === -1 ? runIdx : runEndIdx);
      if (rewritten) { content = rewritten.content; continue; }
    }
    const newBytes = smartPdfLatin1ToBytes(newText);
    if (run.type === 'lit') {
      const body = smartPdfBytesToLit(newBytes);
      const ins = run.start + 1, end = run.end - 1;
      content = content.slice(0, ins) + body + content.slice(end);
      const diff = body.length - (end - ins);
      for (let m = runIdx + 1; m < runs.length; m++) { runs[m].start += diff; runs[m].end += diff; }
    } else if (run.type === 'hex') {
      const body = smartPdfBytesToHex(newBytes);
      const ins = run.start + 1, end = run.end - 1;
      content = content.slice(0, ins) + body + content.slice(end);
      const diff = body.length - (end - ins);
      for (let m = runIdx + 1; m < runs.length; m++) { runs[m].start += diff; runs[m].end += diff; }
    } else {
      const sub = run.strings[0];
      const isLit = sub.type === 'lit';
      const body = isLit ? smartPdfBytesToLit(newBytes) : smartPdfBytesToHex(newBytes);
      const ins = sub.start + 1, end = sub.end - 1;
      content = content.slice(0, ins) + body + content.slice(end);
      let diff = body.length - (end - ins);
      for (let m = runIdx + 1; m < runs.length; m++) { runs[m].start += diff; runs[m].end += diff; }
      for (let s2 = 1; s2 < run.strings.length; s2++) {
        const se = run.strings[s2].end;
        content = content.slice(0, run.strings[s2].start) + content.slice(se);
        const dd = run.strings[s2].start - se;
        for (let m = runIdx + 1; m < runs.length; m++) { runs[m].start += dd; runs[m].end += dd; }
      }
    }
  }
  return content;
}

// Read a page's content streams (all parts), inflate them, return latin1 text.
function smartPdfReadPageContent(pdfLib, doc, pageObj, pakoObj) {
  const PDFArray = pdfLib.PDFArray;
  let c = pageObj.node.Contents();
  const parts = [];
  if (c instanceof PDFArray) { for (let i = 0; i < c.size(); i++) parts.push(c.get(i)); } else parts.push(c);
  let raw = new Uint8Array(0);
  for (let it of parts) {
    let b = null;
    try { it = doc.context.lookup(it); b = it.getContents ? it.getContents() : it.contents; } catch (e) { b = null; }
    if (!b) continue;
    const nb = new Uint8Array(raw.length + b.length); nb.set(raw, 0); nb.set(b, raw.length); raw = nb;
  }
  if (pakoObj && typeof pakoObj.inflate === 'function') {
    try { return smartPdfBytesToLatin1(pakoObj.inflate(raw)); } catch (e) { /* maybe uncompressed */ }
  }
  return smartPdfBytesToLatin1(raw);
}

// TRUE PDF edit across all edited pages. Returns the full modified PDF bytes.
async function smartImportTrueEditBytes(pdfLib, pakoObj, originalBytes, editsByPage, pages, colorsByPage) {
  const doc = await pdfLib.PDFDocument.load(originalBytes, { ignoreEncryption: true, updateMetadata: false });
  for (const pageKey in editsByPage) {
    const pageIdx = parseInt(pageKey, 10);
    const itemEdits = editsByPage[pageKey];
    if (!isFinite(pageIdx) || !itemEdits) continue;
    if (pageIdx < 0 || pageIdx >= doc.getPageCount()) continue;
    const meta = (pages && pages[pageIdx]) || null;
    if (!meta || !meta.items) continue;
    const pageObj = doc.getPage(pageIdx);
    let content = smartPdfReadPageContent(pdfLib, doc, pageObj, pakoObj);
    if (!content) continue;
    // PART 5e — color-only items (no text change) still need their content-stream
    // run rewritten so the real `rg` operators can be emitted.
    const itemColors = (colorsByPage && colorsByPage[pageKey]) || null;
    let effEdits = itemEdits;
    if (itemColors) {
      effEdits = {};
      for (const k in itemEdits) effEdits[k] = itemEdits[k];
      for (const k in itemColors) {
        if (!(k in effEdits) && meta.items[k] && typeof meta.items[k].str === 'string') {
          effEdits[k] = meta.items[k].str;
        }
      }
    }
    content = smartPdfApplyPageEdits(content, effEdits, meta.items, itemColors);
    const newStream = doc.context.flateStream(smartPdfLatin1ToBytes(content));
    pageObj.node.set(pdfLib.PDFName.of('Contents'), newStream);
  }
  const out = await doc.save({ useObjectStreams: false, updateMetadata: false });
  return new Uint8Array(out);
}

function smartImportEditedFilename() {
  let base = ((state && state.smartImportResult && state.smartImportResult.name) || '') || 'document';
  base = String(base).replace(/\.pdf$/i, '');
  try { base = smartPdfSanitizeName(base) || 'document'; } catch (e) {}
  return base + '.pdf';
}

let smartEditorActionBusy = false;

// Save (حفظ): downloads the edited PDF via the EXISTING download seam.
async function smartEditorSaveNow() {
  if (smartEditorActionBusy) return;
  smartEditorActionBusy = true;
  const ar = !!(state && state.locale === 'ar');
  try {
    const blob = await smartImportEditedBlob();
    smartPdfDownload(blob, smartImportEditedFilename());
    showToast(ar ? 'تم حفظ التعديلات ✓' : 'Saved ✓', 2200);
  } catch (e) {
    showToast(ar ? 'تعذر الحفظ' : 'Could not save this document', 2600);
  }
  smartEditorActionBusy = false;
}

// Send (إرسال): native Web Share ONLY when file-sharing is truly supported
// (same strict check as the rest of the app); otherwise reuses the existing
// "download instead" fallback with the existing translated toast. Never a
// popup workaround, never a fake share.
async function smartEditorSendNow() {
  if (smartEditorActionBusy) return;
  smartEditorActionBusy = true;
  const t = smartImportT();
  try {
    const blob = await smartImportEditedBlob();
    const name = smartImportEditedFilename();
    let shared = false;
    try {
      const file = new File([blob], name, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
        shared = true;
      }
    } catch (err) {
      const n = (err && err.name) || '';
      if (n === 'AbortError' || n === 'NotFoundError' || n === 'NotAllowedError' || n === 'CancelError') {
        smartEditorActionBusy = false;   // user dismissed the share sheet — not an error
        return;
      }
      shared = false;                    // real failure -> fall through to download
    }
    if (!shared) {
      smartPdfDownload(blob, name);
      showToast(t.smartPdfShareUnsupported || 'Direct sharing is not supported on this device. The PDF was downloaded.', 3200);
    }
  } catch (e) {
    showToast((t && t.smartPdfShareFailed) || 'Sending failed. Please try again.', 2800);
  }
  smartEditorActionBusy = false;
}

// Behavior seam for tests (extends the existing __smartImport seam object).
if (typeof window !== 'undefined' && window.__smartImport) {
  window.__smartImport.editedBlob = () => smartImportEditedBlob();
  window.__smartImport.editedFilename = () => smartImportEditedFilename();
  window.__smartImport.save = () => smartEditorSaveNow();
  window.__smartImport.send = () => smartEditorSendNow();
}

// ============================================================
// PART 6 — BLANK DOCUMENT (A4 page as canvas)
// Scoped to Smart Documents. No rich-text editing yet (PART 7+).
// ============================================================
const SMART_A4_W = 794;   // A4 base width @96dpi (210mm)
const SMART_A4_H = 1123;  // A4 base height @96dpi (297mm)

function smartBlankEl(id) { return document.getElementById(id); }
function smartBlankT() { return translations[state.locale] || translations.en; }

// PART 8 — localized back label shown beside the editor back arrow.
function smartBlankBackLabel() {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector('.smart-blank-back-label');
  return el ? el.textContent.trim() : null;
}

function smartBlankVisible() {
  const v = smartBlankEl('smartBlankView');
  return !!(v && v.classList.contains('blank-visible'));
}

// Fit EVERY A4 page of the document to the available workspace
// without horizontal overflow (PART 19: multi-page documents).
function smartBlankFit() {
  const holder = smartBlankEl('smartBlankCanvasHolder');
  if (!holder) return;
  const availW = holder.clientWidth || Math.max(120, window.innerWidth - 60);
  const view = smartBlankEl('smartBlankView');
  const availH = view ? view.clientHeight - 150 : window.innerHeight - 160;
  const safeH = Math.max(100, availH);
  const scale = Math.max(0.08, Math.min(1, availW / SMART_A4_W, safeH / SMART_A4_H));
  const w = Math.round(SMART_A4_W * scale);
  const h = Math.round(SMART_A4_H * scale);
  holder.querySelectorAll('.smart-blank-canvas').forEach((page) => {
    page.style.width = w + 'px';
    page.style.height = h + 'px';
    page.style.maxWidth = '100%';
  });
}

// Create the default blank document state and open the blank workspace.
// PART 32 — opening a FRESH document ends the previous editing session, so
// the next save starts a NEW draft entry instead of overwriting the old one.
function smartBlankOpen() {
  try { smartSessionKey = null; } catch (e) { /* declared later; safe at runtime */ }
  // PART 20 — a baseline is captured at the end so a fresh document is clean.
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = 'none';
  ['smartScanView', 'smartImportView', 'smartEditorView'].forEach((id) => {
    const elv = smartBlankEl(id);
    if (elv) {
      elv.classList.remove('scan-visible', 'import-visible', 'editor-visible');
      elv.setAttribute('aria-hidden', 'true');
    }
  });
  const bv = smartBlankEl('smartBlankView');
  if (bv) { bv.classList.add('blank-visible'); bv.setAttribute('aria-hidden', 'false'); }

  // Defaults: blank doc, localized New Document name, empty content, A4, one page.
  // PART 19 — currentPage + pages[] live INSIDE the document state (Smart Documents only).
  state.smartBlankDoc = {
    type: 'blank',
    name: smartBlankT().smartToolbarDefault || 'New Document',
    content: '',
    pageSize: 'A4',
    pageCount: 1,
    currentPage: 1,
    pages: []
  };

  const nameEl = smartBlankEl('smartBlankDocTitle');
  if (nameEl) nameEl.textContent = state.smartBlankDoc.name;
  smartDocTitleRender(); // PART 24 — empty name displays localized "Untitled"
  // PART 19 — a fresh document always starts from exactly ONE page: drop any
  // leftover canvases from a previous session (DOM was never persisted).
  const holderEl = smartBlankEl('smartBlankCanvasHolder');
  if (holderEl) {
    Array.from(holderEl.querySelectorAll('.smart-blank-canvas')).forEach((cv, i) => {
      if (i > 0) cv.remove();
    });
  }
  const firstCanvasEl = smartBlankEl('smartBlankCanvas');
  if (firstCanvasEl) {
    firstCanvasEl.removeAttribute('data-page-id');
    firstCanvasEl.classList.remove('smart-page-hidden');
  }
  // PART 8 — keep the structural .smart-document-content container (the editable
  // surface) inside the canvas and only reset its content, so reopens never drop it.
  const contentSurface = smartBlankEl('smartDocumentContent');
  if (contentSurface) contentSurface.textContent = '';

  setSmartDocsStep(2);
  smartBlankFit();
  // PART 19 — sync pages[]/currentPage and render the counter + nav states.
  smartPageSyncState();
  smartPageUpdateUI();
  // PART 15 — reset the logo position hook on a fresh document and hide the selector.
  smartLogoPosition = SMART_LOGO_DEFAULT_POS;
  smartLogoSync();
  smartReviewReset(); // PART 25 — a fresh document never starts in review mode
  smartDirtyBaseline(); // PART 20 — fresh documents are clean by definition
}

// Restore the Smart Documents home and clear the blank document state.
function smartBlankResetToHome() {
  smartAddClose(); // PART 10 — never leave the Add menu open behind the home
  if (typeof smartTableLauncherClose === 'function') smartTableLauncherClose(); // PART 12
  if (typeof smartTableShowTools === 'function') smartTableShowTools(false);   // PART 12
  if (typeof smartLastActiveTable !== 'undefined') smartLastActiveTable = null; // PART 12
  if (typeof smartImageDeselect === 'function') smartImageDeselect(); // PART 14
  smartSignatureReset(); // PART 17 — never leave stale signature UI/state behind
  if (typeof smartSigProtectReset === 'function') smartSigProtectReset(); // PART 18 — clear session protection state on Back
  smartReviewReset(); // PART 25 — leave review mode together with the editor
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = '';
  const bv = smartBlankEl('smartBlankView');
  if (bv) { bv.classList.remove('blank-visible'); bv.setAttribute('aria-hidden', 'true'); }
  state.smartBlankDoc = null;
  // PART 15 — hide the logo selector when leaving the editor.
  const logobar = smartLogoBarEl();
  if (logobar) { logobar.classList.remove('open'); logobar.setAttribute('aria-hidden', 'true'); }
  smartLogoPosition = SMART_LOGO_DEFAULT_POS;
  // PART 20 — leaving the editor clears dirty tracking.
  smartUnsavedHide();
  smartClearBaseline();
  // PART 32 — refresh the drafts banner + "Your drafts" list on return home.
  if (typeof smartDraftRefreshBanner === 'function') { try { smartDraftRefreshBanner(); } catch (e) {} }
}

// ============================================================
// PART 20 — SAVING WORK (حفظ العمل)
// The user is free to: SAVE (حفظ) or SAVE DRAFT (حفظ المسودة),
// stored locally on the device (V1 scope: localStorage key below),
// or exit without saving. When there ARE unsaved changes, leaving
// shows "هل تريد حفظ التغييرات قبل الخروج؟" with three options:
// حفظ / خروج بدون حفظ / إلغاء. Never alert()/confirm()/prompt().
// ============================================================
const SMART_DRAFT_KEY = 'eq-smart-doc-draft-v1';
let smartUnsavedNext = null; // pending leave target: 'home' | 'close'

function smartDraftT() { return translations[state.locale] || translations.en; }

// Dirty tracking: the document is dirty whenever its CURRENT content
// differs from the last saved/opened baseline. Computed on demand from
// the live DOM (no MutationObserver), so navigation/fitting writes (page
// visibility toggles, A4 sizing) never mark it dirty, while any content
// change does — deterministically and without async observer races.
function smartDocCanonical() {
  const holder = smartBlankEl('smartBlankCanvasHolder');
  const cv = holder ? Array.from(holder.querySelectorAll('.smart-blank-canvas')) : [];
  const name = (state.smartBlankDoc && state.smartBlankDoc.name) || '';
  return JSON.stringify({
    name,
    designPreset: smartPageDesignPreset || 'none',
    pages: cv.map((c) => {
      const s = c.querySelector('.smart-document-content');
      return { id: c.getAttribute('data-page-id'), html: s ? s.innerHTML : '' };
    })
  });
}
function smartDirtyBaseline() { state.smartSaveBaseline = smartDocCanonical(); }
function smartClearBaseline() { state.smartSaveBaseline = null; }
function smartIsDirty() { return state.smartSaveBaseline ? smartDocCanonical() !== state.smartSaveBaseline : false; }
function smartMarkDirty() { state.smartSaveBaseline = '__dirty__'; }

// ============================================================
// PART 24 — DOCUMENT NAME (اسم المستند)
// The name already lives INSIDE the existing document model
// (state.smartBlankDoc.name, PART 20/23). Nothing new is stored:
// Save persists it with the rest of the draft in the existing
// IndexedDB store, and dirty tracking (smartDocCanonical above)
// already treats a name change as a real modification.
// ============================================================

// Localized fallback shown when the document has no name.
function smartDocUntitledT() {
  return (smartDraftT().smartUntitledDoc) || 'Untitled Document';
}

// Render the editor title from the current document model.
// Empty/missing name -> localized "Untitled Document".
function smartDocTitleRender() {
  const nameEl = smartBlankEl('smartBlankDocTitle');
  if (!nameEl || !state.smartBlankDoc) return;
  const n = (state.smartBlankDoc.name || '').trim();
  nameEl.textContent = n || smartDocUntitledT();
}

// Inline rename: clicking the title swaps it for an input. Commit on
// Enter/blur, cancel on Escape. Only a REAL change marks the doc dirty
// (automatic: the canonical string includes the name).
function smartTitleEditStart() {
  if (!state.smartBlankDoc || !smartBlankVisible()) return;
  const nameEl = smartBlankEl('smartBlankDocTitle');
  const input = smartBlankEl('smartBlankTitleInput');
  if (!nameEl || !input || !input.hidden) return;
  const n = (state.smartBlankDoc.name || '').trim();
  // While editing, show the raw value (empty stays empty), never the
  // "Untitled" placeholder — the user sees exactly what is stored.
  input.value = n;
  nameEl.hidden = true;
  input.hidden = false;
  try { input.focus(); input.select(); } catch (e) {}
}

function smartTitleEditCommit(cancel) {
  const nameEl = smartBlankEl('smartBlankDocTitle');
  const input = smartBlankEl('smartBlankTitleInput');
  if (!nameEl || !input || input.hidden) return;
  const next = cancel ? null : input.value.trim();
  input.hidden = true;
  nameEl.hidden = false;
  if (next === null) { smartDocTitleRender(); return; } // Escape: no change
  const prev = (state.smartBlankDoc && state.smartBlankDoc.name || '').trim();
  if (next !== prev) {
    state.smartBlankDoc.name = next; // '' allowed -> displays Untitled
    // Dirty is derived from the canonical snapshot, which includes the
    // name, so nothing else is needed here.
  }
  smartDocTitleRender();
}

// PDF FILENAME (PART 24) — sanitize ONLY the filename copy used for
// export; the displayed/internal name is never modified. Arabic and any
// other Unicode letters are preserved; only Windows-invalid characters
// are replaced.
function smartPdfSanitizeName(raw) {
  let s = String(raw == null ? '' : raw);
  s = s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-'); // Windows-invalid chars
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/[ .]+$/, '').trim(); // Windows: no trailing dots/spaces
  return s;
}

// Filename base for exporting the CURRENT Smart Document. Falls back to
// the localized "Untitled Document" when the name is empty after cleaning.
function smartPdfFilenameBase() {
  const n = ((state.smartBlankDoc && state.smartBlankDoc.name) || '').trim();
  return smartPdfSanitizeName(n);
}
function smartDocPdfFilename() {
  const base = smartPdfFilenameBase();
  return (base || smartDocUntitledT()) + '.pdf';
}

// Serialize the WHOLE document: every A4 page's content surface.
function smartDocSerialize() {
  const holder = smartBlankEl('smartBlankCanvasHolder');
  const canvases = holder ? Array.from(holder.querySelectorAll('.smart-blank-canvas')) : [];
  return {
    v: 1,
    app: 'EQ',
    part: 20,
    name: (state.smartBlankDoc && state.smartBlankDoc.name) ||
      ((smartBlankEl('smartBlankDocTitle') || {}).textContent || '').trim(),
    savedAt: Date.now(),
    locale: state.locale,
    designPreset: smartPageDesignPreset || 'none',
    pageCount: canvases.length,
    pages: canvases.map((cv) => {
      const surface = cv.querySelector('.smart-document-content');
      return surface ? surface.innerHTML : '';
    })
  };
}

function smartDraftExists() { return smartDraftRead() !== null; }

function smartDraftRead() {
  // PART 23 — primary local storage is IndexedDB; `smartDraftCache` holds the
  // in-memory copy so every existing caller stays synchronous. Until the
  // IndexedDB warm-up finishes (or when IndexedDB is absent) we fall back to
  // the legacy PART 20 localStorage draft so no existing save is ever hidden.
  if (smartDraftCache) return smartDraftCache;
  try {
    const raw = localStorage.getItem(SMART_DRAFT_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && Array.isArray(data.pages)) return data;
    }
  } catch (e) { /* ignore */ }
  return null;
}

// SAVE / SAVE DRAFT — persist locally on this device (V1).
function smartDraftSave(withToast) {
  if (!smartBlankVisible()) return false;
  let data;
  try { data = smartDocSerialize(); } catch (e) { return false; }
  try {
    // PART 23 — remember in memory immediately, then persist the large payload
    // to IndexedDB (pages/text/tables/images/logos/signatures/design) and keep
    // only tiny banner metadata in localStorage.
    smartDraftCache = data;
    smartDraftWriteMeta(data);
    smartDraftPersist(data);
    smartDraftSyncList(data); // PART 32 — keep the drafts list (مسوداتك) in sync
    smartDirtyBaseline();
    if (withToast !== false) showToast(smartDraftT().smartSavedToast || 'Document saved', 1600);
    smartDraftRefreshBanner();
    return true;
    } catch (e) {
      // PART 34 — developer log in console only; the user gets a short,
      // translated, retryable message. The document itself stays untouched.
      try { console.error('[SmartDocuments] save failed:', e && e.message || e); } catch (e2) {}
      try { showToast(smartDraftT().smartSaveFailed || "Couldn't save. Please try again.", 2400); } catch (e3) {}
      return false;
    }
}

// PART 33 — awaitable persist: resolves true only once the document is durably
// stored (IndexedDB mirror, or the legacy localStorage copy). Reuse of the
// existing PART 23 storage seam — no new storage system.
async function smartDraftPersistAwait(data) {
  if (!smartIdbGlobal()) {
    try { localStorage.setItem(SMART_DRAFT_KEY, JSON.stringify(data)); return true; } catch (e) { return false; }
  }
  try {
    await smartDbPutRecord(SMART_DOC_DRAFT_ID, data); // durable mirror
    try { localStorage.removeItem(SMART_DRAFT_KEY); } catch (e) {}
    return true;
  } catch (e) {
    try { localStorage.setItem(SMART_DRAFT_KEY, JSON.stringify(data)); return true; } catch (e2) { return false; }
  }
}

// Atomic Save used by PART 33 "Save and continue": the durable IndexedDB write
// AND the PART 32 drafts-list sync must both finish before the promise resolves,
// so the old document can never be lost or overwritten by the new one.
async function smartDraftSaveAtomic(withToast) {
  if (!smartBlankVisible()) return false;
  let data;
  try { data = smartDocSerialize(); } catch (e) { return false; }
  try {
    smartDraftCache = data;
    // Preserve the CURRENT session/mirror key in the tiny metadata: wiping it
    // here would make a concurrent list refresh fall back to the legacy `draft`
    // mirror id and register the same document twice (duplicate entry).
    try {
      let m = {};
      try { m = JSON.parse(localStorage.getItem(SMART_DOC_META_KEY) || '{}') || {}; } catch (e) { m = {}; }
      m.name = data.name || '';
      m.savedAt = data.savedAt || 0;
      localStorage.setItem(SMART_DOC_META_KEY, JSON.stringify(m));
      localStorage.setItem(SMART_DOC_BACKEND_KEY, 'indexeddb');
    } catch (e) { /* tolerate */ }
    const stored = await smartDraftPersistAwait(data); // durable mirror (IndexedDB)
    if (!stored) return false;                        // nothing else mutated
    await smartDraftSyncList(data);                   // PART 32 list + per-draft record
    smartDirtyBaseline();
    if (withToast !== false) showToast(smartDraftT().smartSavedToast || 'Document saved', 1600);
    smartDraftRefreshBanner();
    return true;
  } catch (e) { return false; }
}

// Rebuild a saved draft inside the blank editor (resume later).
function smartDraftApply(data) {
  try {
    smartBlankOpen();
    if (data.name !== undefined) {
      state.smartBlankDoc.name = data.name;
      smartDocTitleRender(); // PART 24 — empty name displays localized "Untitled"
    }
    const pages = data.pages.filter((h) => typeof h === 'string');
    const firstSurface = document.querySelector('#smartBlankCanvasHolder .smart-blank-canvas .smart-document-content');
    if (firstSurface && pages[0]) firstSurface.innerHTML = pages[0];
    // Additional pages go through the REAL page-creation path (PART 19).
    for (let i = 1; i < pages.length; i++) {
      const page = smartPageAdd();
      if (!page) break;
      const surface = page.querySelector('.smart-document-content');
      if (surface) surface.innerHTML = pages[i];
    }
    if (data.designPreset && typeof smartPageDesignApply === 'function') smartPageDesignApply(data.designPreset);
    smartPageGo(1);
    smartPageUpdateUI();
    smartBlankFit();
  } finally {
    smartDirtyBaseline(); // PART 20 — resumed content is the clean baseline
  }
}

// Unsaved-changes dialog ---------------------------------------
// PART 33 — the SAME dialog is reused for two contexts:
//   'leave'  (Back/close)  → حفظ / خروج بدون حفظ / إلغاء
//   'newdoc' (New Document) → حفظ والمتابعة / بدء مستند جديد / إلغاء
let smartUnsavedMode = 'leave'; // 'leave' | 'newdoc'

function smartUnsavedApplyMode() {
  const t = smartDraftT();
  const titleEl = smartBlankEl('smartUnsavedTitle');
  const saveEl = smartBlankEl('smartUnsavedSaveBtn');
  const exitEl = smartBlankEl('smartUnsavedExitBtn');
  const cancelEl = smartBlankEl('smartUnsavedCancelBtn');
  const setLab = (el, key, fb) => {
    if (!el) return;
    el.setAttribute('data-i18n', key); // keep translation system in sync
    el.textContent = t[key] || fb;
  };
  if (smartUnsavedMode === 'newdoc') {
    setLab(titleEl, 'smartUnsavedNewTitle', 'You have unsaved changes.');
    setLab(saveEl, 'smartUnsavedSaveContinue', 'Save and continue');
    setLab(exitEl, 'smartUnsavedStartNew', 'Start new document');
    setLab(cancelEl, 'smartUnsavedCancel', 'Cancel');
  } else {
    setLab(titleEl, 'smartUnsavedTitle', 'Do you want to save your changes before exiting?');
    setLab(saveEl, 'smartUnsavedSave', 'Save');
    setLab(exitEl, 'smartUnsavedExit', 'Exit without saving');
    setLab(cancelEl, 'smartUnsavedCancel', 'Cancel');
  }
}

function smartUnsavedShow(next, mode) {
  smartUnsavedNext = next;
  smartUnsavedMode = (mode === 'newdoc') ? 'newdoc' : 'leave';
  smartUnsavedApplyMode();
  const modal = smartBlankEl('smartUnsavedModal');
  if (modal) { modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); }
}

function smartUnsavedHide() {
  smartUnsavedNext = null;
  smartUnsavedMode = 'leave';
  const modal = smartBlankEl('smartUnsavedModal');
  if (modal) { modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }
}

function smartUnsavedVisible() {
  const modal = smartBlankEl('smartUnsavedModal');
  return !!(modal && modal.classList.contains('show'));
}

// PART 33 — NEW DOCUMENT (مستند جديد) with unsaved-changes protection.
// Returns TRUE when the dialog was shown (dirty); FALSE when the new document
// can start right away (clean document).
function smartNewDocBlocked() {
  if (typeof document === 'undefined' || !smartBlankVisible()) return false;
  if (!smartIsDirty()) return false;
  smartUnsavedShow('newdoc', 'newdoc');
  return true;
}

// Guarded entry point used by BOTH the home card and the editor header button.
function smartNewDocRequest() {
  if (smartNewDocBlocked()) return false; // dialog shown — wait for the choice
  smartBlankOpen();
  return true;
}

// "بدء مستند جديد" — do NOT save the current edits, but never delete the drafts
// already saved. Reuses the existing fresh-document path.
function smartNewDocStart() {
  smartUnsavedHide();
  smartBlankOpen();
}

// "حفظ والمتابعة" — ATOMIC: the current document must be durably saved (IndexedDB
// mirror + drafts list) BEFORE a new document starts. On failure stay put; nothing
// is lost and no new document is created.
async function smartNewDocSaveAndContinue() {
  smartUnsavedHide();
  const ok = await smartDraftSaveAtomic(false);
  if (!ok) {
    try { showToast(smartDraftT().smartSaveAndContinueFailed || 'Save failed. Your changes were not lost.', 2800); } catch (e) {}
    return; // stay in the current document
  }
  smartBlankOpen(); // only after the save completed
}

// Returns TRUE when leaving is blocked and the dialog was shown instead.
function smartLeaveBlocked(next) {
  if (typeof document === 'undefined' || !smartBlankVisible()) return false;
  if (!smartIsDirty()) return false;
  smartUnsavedShow(next);
  return true;
}

// Perform the previously requested leave after the user decides.
function smartLeavePerform() {
  const next = smartUnsavedNext;
  smartUnsavedHide();
  if (next === 'close') closeSmartDocs(true);
  else { smartBlankResetToHome(); setSmartDocsStep(1); }
}

// Draft banner on the Smart Documents home ---------------------
function smartDraftRefreshBanner() {
  if (typeof document === 'undefined') return;
  const banner = smartBlankEl('smartDraftBanner');
  // PART 32 — the "Your drafts" section shares every refresh path of the
  // existing PART 20 banner (home open / save / clear). Fire-and-forget.
  if (typeof smartDraftListRefresh === 'function') { try { smartDraftListRefresh(); } catch (e) {} }
  if (!banner) return;
  const data = smartDraftRead();
  if (!data) { banner.hidden = true; return; }
  banner.hidden = false;
  const info = smartBlankEl('smartDraftInfo');
  if (info) {
    let when = '';
    try { when = new Date(data.savedAt).toLocaleString(state.locale || 'en'); } catch (e) {}
    info.textContent = (data.name || '') + (when ? ' · ' + when : '');
  }
}

// Behavior seam for tests / future phases ----------------------
window.__smartSave = {
  getState: () => ({
    dirty: smartIsDirty(),
    hasDraft: smartDraftExists(),
    dialogVisible: smartUnsavedVisible(),
    editorVisible: smartBlankVisible()
  }),
  save: () => smartDraftSave(),
  readDraft: () => smartDraftRead(),
  clearDraft: () => smartDraftClear(),
  markDirty: () => smartMarkDirty(),
  restore: () => { const d = smartDraftRead(); if (d) { smartDraftApply(d); return true; } return false; },
  backend: () => 'indexeddb'
};

// PART 33 — behavior seam for the New Document unsaved-changes protection.
window.__smartNewDoc = {
  request: () => smartNewDocRequest(),          // clean → new doc; dirty → dialog
  blocked: () => smartNewDocBlocked(),          // true = dialog was shown
  dialogVisible: () => smartUnsavedVisible(),
  dialogMode: () => smartUnsavedMode,
  saveAndContinue: () => smartNewDocSaveAndContinue(),
  startNew: () => smartNewDocStart(),
  cancel: () => smartUnsavedHide(),
  saveAtomic: (t) => smartDraftSaveAtomic(t)
};

// PART 24 — behavior seam for the document NAME (tests / future export).
window.__smartDocName = {
  get: () => ((state.smartBlankDoc && state.smartBlankDoc.name) || '').trim(),
  set: (v) => {
    if (!state.smartBlankDoc) return false;
    state.smartBlankDoc.name = String(v == null ? '' : v).trim();
    smartDocTitleRender();
    return true;
  },
  displayName: () => {
    const n = ((state.smartBlankDoc && state.smartBlankDoc.name) || '').trim();
    return n || smartDocUntitledT();
  },
  sanitize: (raw) => smartPdfSanitizeName(raw),
  pdfFilename: () => smartDocPdfFilename()
};

// ============================================================
// PART 23 — LOCAL STORAGE ARCHITECTURE (IndexedDB)
// Smart Documents V1 stores the whole document in browser-local
// storage. The primary payload (multiple A4 pages, text, tables,
// images, logos, signatures, page design) is persisted in IndexedDB
// so large documents are NOT kept as one giant localStorage string.
// localStorage keeps only tiny metadata + a compatibility flag.
// Fully local — no cloud, no sync, no server, no accounts.
// Scoped entirely to Smart Documents.
// ============================================================
const SMART_DOC_DB_NAME = 'eq_smart_docs_db';
const SMART_DOC_STORE = 'documents';
const SMART_DOC_DRAFT_ID = 'draft';
const SMART_DOC_META_KEY = 'eq-smart-doc-meta-v1';
const SMART_DOC_BACKEND_KEY = 'eq-smart-doc-backend-v1';
let smartDraftCache = null;   // in-memory copy of the current draft
let smartDbHandle = null;     // cached IndexedDB database handle
const smartIdbGlobal = () => (typeof globalThis !== 'undefined' && globalThis.indexedDB) || null;

function smartDbOpen() {
  return new Promise((resolve, reject) => {
    if (smartDbHandle) return resolve(smartDbHandle);
    const idb = smartIdbGlobal();
    if (!idb) return reject(new Error('IndexedDB unavailable'));
    const open = idb.open(SMART_DOC_DB_NAME, 1);
    open.onupgradeneeded = (e) => {
      const db = (e && e.database) || open.result;
      if (db && !db.objectStoreNames.contains(SMART_DOC_STORE)) {
        try { db.createObjectStore(SMART_DOC_STORE, { keyPath: 'id' }); } catch (err) { /* ignore */ }
      }
    };
    open.onsuccess = () => { smartDbHandle = open.result; resolve(smartDbHandle); };
    open.onerror = () => { reject(open.error || new Error('open failed')); };
  });
}
function smartDbGetRecord(id) {
  return smartDbOpen().then((db) => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(SMART_DOC_STORE, 'readonly');
      const req = tx.objectStore(SMART_DOC_STORE).get(id);
      let got = null;
      req.onsuccess = () => { got = req.result || null; };
      req.onerror = () => { /* handled at complete */ };
      tx.oncomplete = () => resolve(got ? got.value : null);
      tx.onerror = () => reject(tx.error || new Error('get failed'));
    } catch (e) { reject(e); }
  }));
}

function smartDbPutRecord(id, value) {
  return smartDbOpen().then((db) => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(SMART_DOC_STORE, 'readwrite');
      tx.objectStore(SMART_DOC_STORE).put({ id, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('put failed'));
    } catch (e) { reject(e); }
  }));
}

function smartDbDelRecord(id) {
  return smartDbOpen().then((db) => new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(SMART_DOC_STORE, 'readwrite');
      tx.objectStore(SMART_DOC_STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('delete failed'));
    } catch (e) { reject(e); }
  }));
}

// Tiny banner metadata (name + saved time) stays in localStorage so the home
// banner never needs to read the whole document (which may be large).
function smartDraftWriteMeta(data) {
  try {
    localStorage.setItem(SMART_DOC_BACKEND_KEY, 'indexeddb');
    localStorage.setItem(SMART_DOC_META_KEY, JSON.stringify({
      name: (data && data.name) || '',
      savedAt: (data && data.savedAt) || 0,
      key: (data && data.key) || '' // PART 32 — which list record mirrors `draft`
    }));
  } catch (e) { /* tolerate */ }
}

// Persist the draft. Primary target is IndexedDB (handles large documents).
// If IndexedDB is unavailable we degrade to the legacy localStorage draft so
// saving keeps working in browsers without the IndexedDB global.
function smartDraftPersist(data) {
  if (!smartIdbGlobal()) {
    try { localStorage.setItem(SMART_DRAFT_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    return;
  }
  try {
    smartDbPutRecord(SMART_DOC_DRAFT_ID, data)
      .then(() => { try { localStorage.removeItem(SMART_DRAFT_KEY); } catch (e) {} })
      .catch(() => { try { localStorage.setItem(SMART_DRAFT_KEY, JSON.stringify(data)); } catch (e) {} });
  } catch (e) {
    try { localStorage.setItem(SMART_DRAFT_KEY, JSON.stringify(data)); } catch (e2) { /* ignore */ }
  }
}

// Clear the draft from IndexedDB + localStorage metadata + any legacy copy.
// PART 32 — also removes the current session record and its list entry so the
// deleted document never reappears in "Your drafts" (other drafts untouched).
function smartDraftClear() {
  smartDraftCache = null;
  const curKey = (typeof smartSessionKey !== 'undefined' && smartSessionKey) || smartMirrorKeyRead();
  smartSessionKey = null;
  let done = Promise.resolve();
  try {
    if (smartIdbGlobal()) {
      done = Promise.resolve().then(() => smartDbDelRecord(SMART_DOC_DRAFT_ID)).catch(() => {});
      done = done.then(() => Promise.all([
        smartDbDelRecord(curKey).catch(() => {}),
        smartDraftIdxRead().then((idx) =>
          smartDraftIdxWrite(idx.list.filter((en) => en.key !== curKey))).catch(() => {})
      ]));
    }
  } catch (e) { /* ignore */ }
  try { localStorage.removeItem(SMART_DRAFT_KEY); } catch (e) {}
  try { localStorage.removeItem(SMART_DOC_META_KEY); } catch (e) {}
  try { localStorage.removeItem(SMART_DOC_BACKEND_KEY); } catch (e) {}
  smartDraftRefreshBanner();
  // Resolves once the IndexedDB delete has settled (awaitable from tests).
  return done.then(() => { smartDraftRefreshBanner(); });
}

// Warm-up + backward-compatible migration on app start:
//  - Prefers an existing IndexedDB draft.
//  - Otherwise migrates a legacy PART 20 `eq-smart-doc-draft-v1` localStorage
//    draft into IndexedDB (preserving name/savedAt/locale/design/pages and any
//    embedded images, logos, signatures), and only deletes the old localStorage
//    copy AFTER the IndexedDB copy has been written and verified.
async function smartDraftWarmup() {
  try {
    let doc = smartDraftCache;
    if (!doc) {
      try { doc = await smartDbGetRecord(SMART_DOC_DRAFT_ID); } catch (e) { doc = null; }
    }
    if (doc && Array.isArray(doc.pages)) {
      smartDraftCache = doc;
      smartDraftWriteMeta(doc);
      return;
    }
    let legacy = null;
    try {
      const raw = localStorage.getItem(SMART_DRAFT_KEY);
      if (raw) legacy = JSON.parse(raw);
    } catch (e) { legacy = null; }
    if (legacy && Array.isArray(legacy.pages)) {
      try { await smartDbPutRecord(SMART_DOC_DRAFT_ID, legacy); } catch (e) { /* fall through */ }
      let verified = false;
      try {
        const back = await smartDbGetRecord(SMART_DOC_DRAFT_ID);
        verified = !!back && Array.isArray(back.pages) && back.pages.length === legacy.pages.length;
      } catch (e) { verified = false; }
      // Only drop the legacy localStorage draft after the new copy is verified.
      if (verified) { try { localStorage.removeItem(SMART_DRAFT_KEY); } catch (e) {} }
      smartDraftCache = legacy;
      smartDraftWriteMeta(legacy);
    }
  } catch (e) { /* never throw during boot */ }
}

window.__smartStorage = {
  backend: () => { try { return localStorage.getItem(SMART_DOC_BACKEND_KEY) || 'indexeddb'; } catch (e) { return 'indexeddb'; } },
  localRead: () => smartDraftRead(),
  localStorageHasDoc: () => { try { return !!localStorage.getItem(SMART_DRAFT_KEY); } catch (e) { return false; } },
  localStorageDocLen: () => { try { return (localStorage.getItem(SMART_DRAFT_KEY) || '').length; } catch (e) { return 0; } },
  idbRead: () => smartDbGetRecord(SMART_DOC_DRAFT_ID).catch(() => null),
  idbWrite: (data) => smartDbPutRecord(SMART_DOC_DRAFT_ID, data).catch(() => false),
  clearLocal: () => smartDraftClear(),
  migrate: () => smartDraftWarmup().catch(() => undefined)
};

// ============================================================
// PART 32 — SMART DOCUMENTS: DRAFTS LIST (مسوداتك)
// Minimal extension of the EXISTING PART 23 IndexedDB store
// (eq_smart_docs_db / documents). NO new storage system:
//  - The legacy single draft record `draft` is untouched and keeps
//    mirroring the most recently saved document (PART 20 compat).
//  - Each saved document also keeps its OWN record in the SAME
//    object store (keyPath `id`), so multiple drafts coexist.
//  - A tiny index record lists {key, name, savedAt} entries.
// Fully local — no cloud, no server, no API. Resume reuses the
// EXISTING editor via smartDraftApply; Delete reuses the existing
// modal-dialog pattern (never alert/confirm/prompt).
// ============================================================
const SMART_DRAFT_IDX_ID = 'eq-smart-drafts-index';
let smartSessionKey = null; // per-draft record id of the document being edited
// All list mutations run through ONE serial queue — concurrent refreshes
// (save / home-open / back) must never race into duplicate registrations.
let smartDraftQueue = Promise.resolve();
let smartDraftInQueue = 0; // 0 = outside serial context
function smartDraftEnqueue(fn) {
  const run = () => { smartDraftInQueue++; try { return fn(); } finally { smartDraftInQueue--; } };
  const p = smartDraftQueue.then(run, run);
  smartDraftQueue = p.catch(() => {});
  return p;
}

function smartMirrorKeyRead() {
  try {
    const m = JSON.parse(localStorage.getItem(SMART_DOC_META_KEY) || 'null');
    return (m && m.key) || SMART_DOC_DRAFT_ID;
  } catch (e) { return SMART_DOC_DRAFT_ID; }
}
function smartDraftIdxRead() {
  return smartDbGetRecord(SMART_DRAFT_IDX_ID)
    .then((r) => (r && Array.isArray(r.list)) ? r : { v: 1, list: [] })
    .catch(() => ({ v: 1, list: [] }));
}
function smartDraftIdxWrite(list) {
  return smartDbPutRecord(SMART_DRAFT_IDX_ID, { v: 1, list }).catch(() => false);
}
function smartDraftKeyAlloc() {
  return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Keep per-draft records + the list in sync after a save. Fire-and-forget
// from smartDraftSave; never throws into the save path.
function smartDraftSyncList(data) {
  return smartDraftEnqueue(() => smartDraftSyncListInner(data));
}
async function smartDraftSyncListInner(data) {
  try {
    if (!smartIdbGlobal()) return;
    let idx = await smartDraftIdxRead();
    let sessionKey = smartSessionKey || smartMirrorKeyRead();
    if (!smartSessionKey && !idx.list.some((en) => en.key === sessionKey)) {
      // Brand-new editing session: archive whatever the legacy `draft`
      // mirror currently holds into ITS own record before overwriting it,
      // so the previously saved document is not lost.
      const prev = await smartDbGetRecord(SMART_DOC_DRAFT_ID).catch(() => null);
      // Archive ONLY a genuinely OLDER mirror. The PART 23 mirror write may
      // land just before this sync for the SAME save (equal savedAt) — that
      // must never be archived into a duplicate entry.
      if (prev && Array.isArray(prev.pages) && prev.savedAt !== data.savedAt) {
        const owner = (sessionKey === SMART_DOC_DRAFT_ID) ? smartDraftKeyAlloc() : sessionKey;
        await smartDbPutRecord(owner, prev);
        idx.list = idx.list.filter((en) => en.key !== owner);
        idx.list.push({ key: owner, name: prev.name || '', savedAt: prev.savedAt || 0 });
      }
      sessionKey = smartSessionKey = smartDraftKeyAlloc();
    }
    await smartDbPutRecord(sessionKey, data);
    idx.list = idx.list.filter((en) => en.key !== sessionKey);
    idx.list.push({ key: sessionKey, name: data.name || '', savedAt: data.savedAt || 0 });
    await smartDraftIdxWrite(idx.list);
    try {
      const m = JSON.parse(localStorage.getItem(SMART_DOC_META_KEY) || '{}');
      m.key = sessionKey;
      localStorage.setItem(SMART_DOC_META_KEY, JSON.stringify(m));
    } catch (e) { /* tolerate */ }
  } catch (e) { /* never break saving */ }
}

// Friendly relative time using the EXISTING translation system.
function smartRelTime(ts) {
  const t = smartDraftT();
  const rep = (str, n) => String(str).replace('{n}', n);
  const s = Math.floor((Date.now() - (ts || Date.now())) / 1000);
  if (s < 60) return t.smartRelNow || 'just now';
  if (s < 3600) {
    const m = Math.floor(s / 60);
    return m === 1 ? (t.smartRelMin || 'a minute ago') : rep(t.smartRelMins || '{n} minutes ago', m);
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600);
    return h === 1 ? (t.smartRelHour || 'an hour ago') : rep(t.smartRelHours || '{n} hours ago', h);
  }
  const days = Math.floor(s / 86400);
  if (days === 1) return t.smartRelYesterday || 'yesterday';
  return rep(t.smartRelDays || '{n} days ago', days);
}

// Render the "Your drafts" section from the existing IndexedDB store.
function smartDraftListRefresh() {
  // Reentrancy-safe: when called from WITHIN a queued mutation (delete/save),
  // run the render inline instead of re-queuing — re-queuing would await our
  // own completion and deadlock.
  if (smartDraftInQueue > 0) return smartDraftListRefreshInner();
  return smartDraftEnqueue(() => smartDraftListRefreshInner());
}
async function smartDraftListRefreshInner() {
  if (typeof document === 'undefined') return;
  const section = smartBlankEl('smartDraftsSection');
  if (!section || !smartIdbGlobal()) return;
  let idx = await smartDraftIdxRead();
  // Make sure the in-memory current draft is represented — never duplicated.
  const cache = smartDraftCache;
  if (cache && Array.isArray(cache.pages)) {
    const mk = smartSessionKey || smartMirrorKeyRead();
    const entry = idx.list.find((en) => en.key === mk);
    if (!entry) {
      try {
        // Register ONLY from a DURABLE IndexedDB record — never from the
        // in-memory cache alone, so wiped/cleared storage cannot be
        // "resurrected" into the list by a stale cache.
        const rec = await smartDbGetRecord(mk).catch(() => null);
        if (rec && Array.isArray(rec.pages)) {
          idx.list.push({ key: mk, name: rec.name || '', savedAt: rec.savedAt || 0 });
          await smartDraftIdxWrite(idx.list);
        }
      } catch (e) { /* tolerate */ }
    } else if (entry.savedAt !== cache.savedAt || entry.name !== (cache.name || '')) {
      entry.name = cache.name || '';
      entry.savedAt = cache.savedAt || 0;
      await smartDraftIdxWrite(idx.list);
    }
  }
  const listEl = smartBlankEl('smartDraftsList');
  const emptyEl = smartBlankEl('smartDraftsEmpty');
  if (!listEl) return;
  const items = idx.list.slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  section.hidden = false;
  listEl.textContent = '';
  if (!items.length) {
    listEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.hidden = false;
  const untitled = smartDocUntitledT(); // PART 24 fallback for unnamed docs
  items.forEach((it) => {
    const row = document.createElement('div');
    row.className = 'smart-draft-item';
    row.setAttribute('data-key', it.key);
    const txt = document.createElement('span');
    txt.className = 'smart-draft-item-text';
    const nm = document.createElement('span');
    nm.className = 'smart-draft-item-name';
    nm.textContent = String(it.name || '').trim() || untitled;
    const tm = document.createElement('span');
    tm.className = 'smart-draft-item-time';
    tm.textContent = smartRelTime(it.savedAt);
    txt.appendChild(nm); txt.appendChild(tm);
    const acts = document.createElement('span');
    acts.className = 'smart-draft-item-actions';
    const rb = document.createElement('button');
    rb.type = 'button'; rb.className = 'smart-draft-item-resume';
    rb.setAttribute('data-key', it.key);
    rb.textContent = smartDraftT().smartDraftResumeBtn || 'Resume editing';
    const db = document.createElement('button');
    db.type = 'button'; db.className = 'smart-draft-item-delete';
    db.setAttribute('data-key', it.key);
    db.textContent = smartDraftT().smartDraftDeleteBtn || 'Delete';
    acts.appendChild(rb); acts.appendChild(db);
    row.appendChild(txt); row.appendChild(acts);
    listEl.appendChild(row);
  });
}

// Resume: open the SAME saved document in the EXISTING editor.
async function smartDraftOpenByKey(key) {
  if (!key) return false;
  const rec = await smartDbGetRecord(key).catch(() => null);
  if (!rec || !Array.isArray(rec.pages)) return false;
  smartSessionKey = key;
  smartDraftCache = rec;
  smartDraftWriteMeta(Object.assign({}, rec, { key }));
  smartDraftApply(rec); // existing PART 20 restore path (pages/text/name/design)
  return true;
}

// Delete confirmation dialog — reuses the existing PART 20 modal pattern.
let smartDeleteKey = null;
function smartDraftDeleteShow(key, name) {
  smartDeleteKey = key;
  const nmEl = smartBlankEl('smartDraftDelName');
  if (nmEl) nmEl.textContent = String(name || '').trim() || smartDocUntitledT();
  const m = smartBlankEl('smartDraftDeleteModal');
  if (m) { m.classList.add('show'); m.setAttribute('aria-hidden', 'false'); }
}
function smartDraftDeleteHide() {
  smartDeleteKey = null;
  const m = smartBlankEl('smartDraftDeleteModal');
  if (m) { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); }
}
function smartDraftDeleteVisible() {
  const m = smartBlankEl('smartDraftDeleteModal');
  return !!(m && m.classList.contains('show'));
}
async function smartDraftDeleteCommit() {
  return smartDraftEnqueue(() => smartDraftDeleteCommitInner());
}
async function smartDraftDeleteCommitInner() {
  const key = smartDeleteKey;
  smartDraftDeleteHide();
  if (!key) return false;
  try {
    await smartDbDelRecord(key);
    const idx = await smartDraftIdxRead();
    await smartDraftIdxWrite(idx.list.filter((en) => en.key !== key));
    const cur = smartSessionKey || smartMirrorKeyRead();
    if (key === cur) {
      // Deleted draft was the current/latest one: clear the legacy mirror +
      // metadata so it never comes back. Other drafts stay untouched.
      smartDraftCache = null;
      smartSessionKey = null;
      await smartDbDelRecord(SMART_DOC_DRAFT_ID).catch(() => {});
      try { localStorage.removeItem(SMART_DOC_META_KEY); } catch (e) {}
      smartDraftRefreshBanner();
    }
    // Run the render INLINE (not via the queue): we are already inside a
    // queued task, and re-queuing would await our own completion (deadlock).
    await smartDraftListRefreshInner();
    return true;
  } catch (e) { return false; }
}

// Behavior seam for tests / future phases.
window.__smartDrafts = {
  list: () => smartDraftIdxRead(),
  open: (k) => smartDraftOpenByKey(k),
  remove: (k) => smartDbDelRecord(k)
    .then(() => smartDraftIdxRead())
    .then((idx) => smartDraftIdxWrite(idx.list.filter((en) => en.key !== k))),
  refresh: () => smartDraftListRefresh(),
  deleteVisible: () => smartDraftDeleteVisible()
};

// ============================================================
// PART 10 — SMART ADD MENU (زر الإضافة +)
// One menu, opened only by the toolbar "+" button, with exactly
// six options: Text / Heading / Table / Image / Divider / New Page.
// Scoped entirely to Smart Documents — no global architecture.
// ============================================================
function smartAddMenuEl() { return smartBlankEl('smartAddMenu'); }
function smartAddIsOpen() {
  const m = smartAddMenuEl();
  return !!(m && m.classList.contains('open'));
}

function smartAddPosition() {
  const menu = smartAddMenuEl();
  const view = smartBlankEl('smartBlankView');
  const addBtn = document.querySelector('[data-toolbar="blank-doc"] button[data-tool="add"]');
  if (!menu || !view || !addBtn) return;
  const vr = view.getBoundingClientRect();
  const br = addBtn.getBoundingClientRect();
  // Show the menu just below the "+" button, aligned to its start edge,
  // then clamp it inside the editor view so it never overflows.
  menu.style.left = '0px';
  menu.style.top = '0px';
  const mw = menu.offsetWidth || 180;
  const mh = menu.offsetHeight || 220;
  let left = br.left - vr.left;
  let top = br.bottom - vr.top + 6;
  left = Math.max(6, Math.min(left, vr.width - mw - 6));
  if (top + mh > vr.height - 6) top = Math.max(6, br.top - vr.top - mh - 6);
  menu.style.left = Math.round(left) + 'px';
  menu.style.top = Math.round(top) + 'px';
}

function smartAddOpen() {
  const menu = smartAddMenuEl();
  if (!menu || smartAddIsOpen()) return;
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
  smartAddPosition();
}

function smartAddClose() {
  const menu = smartAddMenuEl();
  if (!menu) return;
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
}

function smartAddToggle() {
  if (smartAddIsOpen()) smartAddClose();
  else smartAddOpen();
}

// ============================================================
// PART 16 — Smart Documents: Page Design (تصميم الصفحة / الإطار)
// Exactly 5 fixed frame presets applied to every A4 page of the
// current document via a single class per page (no style buildup).
// Scoped entirely to Smart Documents.
// ============================================================
const SMART_PAGE_DESIGN_PRESETS = ['none', 'simple', 'classic', 'formal', 'modern'];
let smartPageDesignPreset = 'none';

function smartPageDesignMenuEl() { return smartBlankEl('smartPageDesignMenu'); }
function smartPageDesignIsOpen() {
  const m = smartPageDesignMenuEl();
  return !!(m && m.classList.contains('open'));
}

// Position the menu near the ⚙ page-settings button, clamped to the editor
// view so it never leaves the viewport on any screen size (RTL or LTR).
function smartPageDesignPosition() {
  const menu = smartPageDesignMenuEl();
  const view = smartBlankEl('smartBlankView');
  const btn = document.querySelector('[data-toolbar="blank-doc"] button[data-tool="page-settings"]');
  if (!menu || !view || !btn) return;
  const vr = view.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  menu.style.left = '0px';
  menu.style.top = '0px';
  const mw = menu.offsetWidth || 180;
  const mh = menu.offsetHeight || 220;
  let left = br.left - vr.left;
  let top = br.bottom - vr.top + 6;
  left = Math.max(6, Math.min(left, vr.width - mw - 6));
  if (top + mh > vr.height - 6) top = Math.max(6, br.top - vr.top - mh - 6);
  menu.style.left = Math.round(left) + 'px';
  menu.style.top = Math.round(top) + 'px';
}

function smartPageDesignOpen() {
  const menu = smartPageDesignMenuEl();
  if (!menu || smartPageDesignIsOpen()) return;
  smartAddClose();          // never leave two menus open at once
  smartTableLauncherClose();
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
  smartPageDesignSyncActiveItem();
  smartPageDesignPosition();
}

function smartPageDesignClose() {
  const menu = smartPageDesignMenuEl();
  if (!menu) return;
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
}

function smartPageDesignToggle() {
  if (smartPageDesignIsOpen()) smartPageDesignClose();
  else smartPageDesignOpen();
}

// Reflect the active preset as a checkmark state inside the menu.
function smartPageDesignSyncActiveItem() {
  const menu = smartPageDesignMenuEl();
  if (!menu) return;
  Array.from(menu.querySelectorAll('.smart-design-item')).forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-design') === smartPageDesignPreset);
  });
}

// Apply one preset to EVERY A4 page currently in the holder. The previous
// preset classes are removed first, so exactly one preset is ever active.
// Content (text / tables / images / logos) is never touched and A4 size,
// canvas layout and horizontal overflow stay untouched.
function smartPageDesignApply(preset) {
  if (SMART_PAGE_DESIGN_PRESETS.indexOf(preset) === -1) return;
  const holder = smartBlankEl('smartBlankCanvasHolder');
  if (!holder) return;
  smartPageDesignPreset = preset;
  Array.from(holder.querySelectorAll('.smart-blank-canvas')).forEach((page) => {
    SMART_PAGE_DESIGN_PRESETS.forEach((p) => page.classList.remove('smart-page-design-' + p));
    if (preset !== 'none') page.classList.add('smart-page-design-' + preset);
  });
  smartPageDesignSyncActiveItem();
}

function smartPageDesignGetState() {
  const holder = smartBlankEl('smartBlankCanvasHolder');
  const pages = holder ? Array.from(holder.querySelectorAll('.smart-blank-canvas')) : [];
  return {
    preset: smartPageDesignPreset,
    pageCount: pages.length,
    // Classes actually present on each A4 page (should be [] for "none").
    pageClasses: pages.map((p) => SMART_PAGE_DESIGN_PRESETS
      .filter((c) => p.classList.contains('smart-page-design-' + c)))
  };
}

// The content surface of the page currently being edited (PART 19: currentPage).
function smartActivePageContent() {
  const canvas = typeof smartPageCurrentCanvas === 'function' ? smartPageCurrentCanvas() : null;
  if (canvas) return canvas.querySelector('.smart-document-content');
  const surfaces = document.querySelectorAll('#smartBlankCanvasHolder .smart-document-content');
  return surfaces.length ? surfaces[surfaces.length - 1] : null;
}

function smartAddUpdatePageCount() {
  // PART 19 — the counter is now rendered by the page-management UI.
  if (typeof smartPageUpdateUI === 'function') { smartPageUpdateUI(); return; }
  const countEl = smartBlankEl('smartPageCount');
  if (countEl && state.smartBlankDoc) {
    countEl.textContent = state.smartBlankDoc.pageCount + ' / ' + state.smartBlankDoc.pageCount;
  }
}

// PART 10 — insert a real element into the document content surface.
function smartAddInsert(kind) {
  const surface = smartActivePageContent();
  if (!surface) return null;
  if (kind === 'text') {
    const p = document.createElement('p');
    p.className = 'smart-doc-text-block';
    p.setAttribute('contenteditable', 'true');
    p.dataset.smartElement = 'text';
    p.textContent = smartBlankT().smartToolbarText || 'Text';
    // PART 11 — real per-block text direction + default alignment from locale.
    const dir = (state.locale === 'ar') ? 'rtl' : 'ltr';
    p.setAttribute('dir', dir);
    p.style.direction = dir;
    p.style.textAlign = (dir === 'rtl') ? 'right' : 'left';
    p.style.lineHeight = '1.5';
    surface.appendChild(p);
    return p;
  }
  if (kind === 'heading') {
    const h = document.createElement('h2');
    h.className = 'smart-doc-heading';
    h.setAttribute('contenteditable', 'true');
    h.dataset.smartElement = 'heading';
    h.textContent = smartBlankT().smartAddHeading || 'Heading';
    surface.appendChild(h);
    return h;
  }
  if (kind === 'table') {
    const table = document.createElement('table');
    table.className = 'smart-doc-table';
    table.dataset.smartElement = 'table';
    const tbody = document.createElement('tbody');
    for (let r = 0; r < 3; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 3; c++) {
        const td = document.createElement('td');
        td.setAttribute('contenteditable', 'true');
        td.innerHTML = '&nbsp;';
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    surface.appendChild(table);
    return table;
  }
  if (kind === 'divider') {
    const hr = document.createElement('hr');
    hr.className = 'smart-doc-divider';
    hr.dataset.smartElement = 'divider';
    surface.appendChild(hr);
    return hr;
  }
  if (kind === 'image') {
    const input = smartBlankEl('smartAddImageInput');
    if (input) input.click(); // open the File Picker; change handler inserts it
    return input || null;
  }
  if (kind === 'new-page') {
    // PART 19 — "New Page" from PART 10 uses the SAME page model / manager.
    // No parallel page system: one code path for add/copy/delete/reorder/navigate.
    return smartPageAdd();
  }
  return null;
}

// ============================================================
// PART 19 — SMART DOCUMENTS: PAGE MANAGEMENT (إدارة الصفحات)
// Real page management for the SAME page model used by
// PART 6/10/16: A4 canvases (.smart-blank-canvas) inside
// #smartBlankCanvasHolder, each with one .smart-document-content.
// One page is visible at a time (the CURRENT page); the others
// stay in the DOM completely untouched, so content can never leak
// between pages. No global state: everything lives in state.smartBlankDoc.
// ============================================================
function smartPagesHolder() { return smartBlankEl('smartBlankCanvasHolder'); }
function smartPagesCanvases() {
  const holder = smartPagesHolder();
  return holder ? Array.from(holder.querySelectorAll('.smart-blank-canvas')) : [];
}
function smartPageCurrentCanvas() {
  const list = smartPagesCanvases();
  const doc = state.smartBlankDoc;
  if (!list.length) return null;
  const idx = doc ? Math.min(Math.max(doc.currentPage - 1, 0), list.length - 1) : list.length - 1;
  return list[idx];
}

// Rebuild pages[] from the real DOM order (DOM is the source of truth for
// content; pages[] mirrors ids/order so state stays consistent).
let smartPageIdSeq = 0;
function smartPageSyncState() {
  const doc = state.smartBlankDoc;
  if (!doc) return;
  const list = smartPagesCanvases();
  list.forEach((cv) => { if (!cv.getAttribute('data-page-id')) cv.setAttribute('data-page-id', 'p' + (++smartPageIdSeq)); });
  doc.pages = list.map((cv) => cv.getAttribute('data-page-id'));
  doc.pageCount = list.length;
  if (!doc.currentPage || doc.currentPage < 1) doc.currentPage = 1;
  if (doc.currentPage > list.length) doc.currentPage = list.length;
}

// Localized counter text ("صفحة 2 من 3" / "Page 2 of 3").
function smartPageCounterText(cur, total) {
  const T = smartBlankT();
  return (T.smartBlankNavPage || 'Page') + ' ' + cur + ' ' + (T.smartBlankNavOf || 'of') + ' ' + total;
}

function smartPageUpdateUI() {
  const doc = state.smartBlankDoc;
  if (!doc || typeof document === 'undefined') return;
  smartPageSyncState();
  const list = smartPagesCanvases();
  const curIdx = doc.currentPage - 1;
  // Visibility: exactly ONE page visible at a time. Content of hidden
  // pages is NEVER touched (no innerHTML writes anywhere here).
  list.forEach((cv, i) => cv.classList.toggle('smart-page-hidden', i !== curIdx));
  const countEl = smartBlankEl('smartPageCount');
  if (countEl) countEl.textContent = doc.currentPage + ' ' +
    (smartBlankT().smartBlankNavOf || 'of') + ' ' + doc.pageCount;
  const prevBtn = smartBlankEl('smartBlankPrevPage');
  const nextBtn = smartBlankEl('smartBlankNextPage');
  const upBtn = smartBlankEl('smartPageMoveUpBtn');
  const downBtn = smartBlankEl('smartPageMoveDownBtn');
  const delBtn = smartBlankEl('smartPageDeleteBtn');
  if (prevBtn) prevBtn.disabled = doc.currentPage <= 1;
  if (nextBtn) nextBtn.disabled = doc.currentPage >= doc.pageCount;
  if (upBtn) upBtn.disabled = doc.currentPage <= 1;
  if (downBtn) downBtn.disabled = doc.currentPage >= doc.pageCount;
  // SAFETY: the last remaining page can NEVER be deleted.
  if (delBtn) delBtn.disabled = doc.pageCount <= 1;
}

// Navigate to page n (1-based). Never loses content — it only toggles
// the visibility class of each already-existing canvas.
function smartPageGo(n) {
  const doc = state.smartBlankDoc;
  if (!doc) return null;
  doc.currentPage = Math.min(Math.max(n, 1), doc.pageCount);
  smartPageUpdateUI();
  return smartPageCurrentCanvas();
}


// Create ONE new A4 page using the exact same structure as the first page.
// The new page is inserted right AFTER the current page and becomes current.
function smartPageCreateCanvas(afterCanvas) {
  const holder = smartPagesHolder();
  const firstCanvas = smartBlankEl('smartBlankCanvas');
  if (!holder || !firstCanvas || !state.smartBlankDoc) return null;
  const page = document.createElement('div');
  page.className = 'smart-blank-canvas smart-document-canvas';
  page.setAttribute('data-canvas', 'document');
  page.setAttribute('data-page-id', 'p' + (++smartPageIdSeq));
  // Keep the same fitted A4 size as the existing pages.
  page.style.width = firstCanvas.style.width;
  page.style.height = firstCanvas.style.height;
  page.style.maxWidth = '100%';
  const content = document.createElement('div');
  content.className = 'smart-document-content';
  content.setAttribute('data-canvas-content', 'document');
  page.appendChild(content);
  if (afterCanvas && afterCanvas.parentElement === holder) {
    holder.insertBefore(page, afterCanvas.nextSibling);
  } else {
    holder.appendChild(page);
  }
  return page;
}

function smartPageAdd() {
  const doc = state.smartBlankDoc;
  if (!doc) return null;
  const cur = smartPageCurrentCanvas();
  const page = smartPageCreateCanvas(cur);
  if (!page) return null;
  smartPageSyncState();
  doc.currentPage = doc.pages.indexOf(page.getAttribute('data-page-id')) + 1;
  if (!doc.currentPage) doc.currentPage = doc.pageCount;
  smartPageUpdateUI();
  return page;
}

// Delete the CURRENT page. Blocked when only one page remains — the
// document always keeps at least one page. After deletion the current
// page moves to a nearby logical page and indices are rebuilt.
function smartPageDelete() {
  const doc = state.smartBlankDoc;
  if (!doc) return false;
  smartPageSyncState();
  if (doc.pageCount <= 1) return false; // HARD RULE: never delete the last page
  const cur = smartPageCurrentCanvas();
  if (!cur) return false;
  const idx = doc.currentPage - 1;
  cur.remove();
  smartPageSyncState();
  doc.currentPage = Math.min(idx + 1, doc.pageCount);
  smartPageUpdateUI();
  return true;
}

// Copy the CURRENT page into a NEW page right after it.
// Content (text/headings/tables/images/logos/signature visuals/design) is
// cloned 1:1 via cloneNode(true). Signature VALIDITY is NOT copied: the
// clone never carries a valid signed state — the document fingerprint
// changes and PART 18 marks every previous signature as invalidated.
function smartPageCopy() {
  const doc = state.smartBlankDoc;
  const cur = smartPageCurrentCanvas();
  if (!doc || !cur) return null;
  const clone = cur.cloneNode(true);
  // Safety: a copied signature is just an image — strip stale EQ flags and
  // tag copies so they are visibly uncertified until re-signed (PART 18).
  clone.querySelectorAll('.smart-doc-signature').forEach((sig) => {
    sig.classList.remove('is-invalidated');
    sig.classList.add('smart-doc-signature-uncertified');
    sig.setAttribute('data-sig-copy', '1');
  });
  clone.setAttribute('data-page-id', 'p' + (++smartPageIdSeq));
  if (cur.parentElement) cur.parentElement.insertBefore(clone, cur.nextSibling);
  smartPageSyncState();
  doc.currentPage = doc.pages.indexOf(clone.getAttribute('data-page-id')) + 1;
  if (!doc.currentPage) doc.currentPage = doc.pageCount;
  smartPageUpdateUI();
  // NOTE: no smartSigProtectOnInserted() here — copying must never rebuild a
  // baseline or restore "signed" status (PART 18 signature protection).
  return clone;
}

// Reorder: swap the current canvas with its neighbor in the DOM. Only the
// ORDER changes — each canvas keeps its own children (content follows its page).
function smartPageMove(offset) {
  const doc = state.smartBlankDoc;
  if (!doc) return false;
  smartPageSyncState();
  const idx = doc.currentPage - 1;
  const target = idx + offset;
  const list = smartPagesCanvases();
  if (target < 0 || target >= list.length) return false;
  const cur = list[idx];
  const other = list[target];
  if (!cur || !other || !cur.parentElement) return false;
  if (offset < 0) cur.parentElement.insertBefore(cur, other);
  else cur.parentElement.insertBefore(other, cur);
  doc.currentPage = target + 1; // currentPage follows the moved page
  smartPageUpdateUI();
  return true;
}

// PART 6 — test / configuration seam.
window.__smartBlank = {
  getState: () => ({
    step: (state && state.smartDocsStep) || 1,
    visible: smartBlankVisible(),
    type: (state && state.smartBlankDoc && state.smartBlankDoc.type) || null,
    name: (state && state.smartBlankDoc && state.smartBlankDoc.name) || null,
    contentLength: (state && state.smartBlankDoc && state.smartBlankDoc.content) ? state.smartBlankDoc.content.length : 0,
    content: (state && state.smartBlankDoc) ? state.smartBlankDoc.content : null,
    pageSize: (state && state.smartBlankDoc && state.smartBlankDoc.pageSize) || null,
    pageCount: (state && state.smartBlankDoc) ? state.smartBlankDoc.pageCount : null,
    // PART 8 — editor workspace metadata (all scoped to Smart Documents only).
    editorVisible: smartBlankVisible(),
    title: (typeof document !== 'undefined' && smartBlankEl('smartBlankDocTitle')) ? smartBlankEl('smartBlankDocTitle').textContent.trim() : null,
    backLabel: smartBlankBackLabel(),
    contentSurface: !!(typeof document !== 'undefined' && smartBlankEl('smartDocumentContent')),
    canvasWhite: (typeof document !== 'undefined' && smartBlankEl('smartBlankCanvas')) ? getComputedStyle(smartBlankEl('smartBlankCanvas')).backgroundColor : null,
    tools: (typeof document !== 'undefined') ? Array.from(document.querySelectorAll('[data-toolbar="blank-doc"] .smart-tool-btn')).map((b) => b.getAttribute('data-tool')) : [],
    // PART 10 — Add menu state (scoped to Smart Documents).
    addMenuOpen: smartAddIsOpen(),
    addMenuItems: (typeof document !== 'undefined' && smartAddMenuEl()) ? Array.from(smartAddMenuEl().querySelectorAll('.smart-add-item')).map((b) => b.getAttribute('data-add')) : [],
    pageSurfaces: (typeof document !== 'undefined') ? document.querySelectorAll('#smartBlankCanvasHolder .smart-document-content').length : 0,
    // PART 19 — page management state (scoped to this document only).
    currentPage: (state && state.smartBlankDoc) ? state.smartBlankDoc.currentPage : null,
    counterText: (typeof document !== 'undefined' && smartBlankEl('smartPageCount')) ? smartBlankEl('smartPageCount').textContent.trim() : null,
    counterFull: (typeof document !== 'undefined') ? smartPageCounterText(
      (state && state.smartBlankDoc) ? state.smartBlankDoc.currentPage : 0,
      (state && state.smartBlankDoc) ? state.smartBlankDoc.pageCount : 0) : null,
    pages: (state && state.smartBlankDoc) ? state.smartBlankDoc.pages : []
  }),
  open: () => smartBlankOpen(),
  reset: () => smartBlankResetToHome(),
  // PART 10 — behavior seam for tests / future phases.
  toggleAddMenu: () => smartAddToggle(),
  closeAddMenu: () => smartAddClose(),
  insertElement: (kind) => smartAddInsert(kind)
};

// PART 19 — behavior seam for tests / future phases.
window.__smartPages = {
  add: () => { const p = smartPageAdd(); return p ? p.getAttribute('data-page-id') : null; },
  remove: () => smartPageDelete(),
  copy: () => { const p = smartPageCopy(); return p ? p.getAttribute('data-page-id') : null; },
  move: (offset) => smartPageMove(offset),
  go: (n) => { const c = smartPageGo(n); return c ? c.getAttribute('data-page-id') : null; },
  updateUI: () => smartPageUpdateUI(),
  // Per-page content summary, in document order. Used to prove that each
  // piece of content stays bound to its own page after every operation.
  describe: () => smartPagesCanvases().map((cv) => ({
    id: cv.getAttribute('data-page-id'),
    hidden: cv.classList.contains('smart-page-hidden'),
    design: SMART_PAGE_DESIGN_PRESETS.filter((c) => cv.classList.contains('smart-page-design-' + c)),
    text: Array.from(cv.querySelectorAll('.smart-doc-text-block')).map((t) => t.textContent.trim()),
    headings: Array.from(cv.querySelectorAll('.smart-doc-heading')).map((t) => t.textContent.trim()),
    tables: cv.querySelectorAll('table.smart-doc-table').length,
    images: cv.querySelectorAll('img.smart-doc-image').length,
    logos: cv.querySelectorAll('img.smart-doc-logo').length,
    signatures: cv.querySelectorAll('img.smart-doc-signature, .smart-doc-signature').length,
    signaturesUncertified: cv.querySelectorAll('.smart-doc-signature-uncertified').length
  }))
};

// PART 16 — test / configuration seam for the Page Design presets.
window.__smartPageDesign = {
  getState: () => smartPageDesignGetState(),
  apply: (preset) => smartPageDesignApply(preset),
  toggle: () => smartPageDesignToggle(),
  open: () => smartPageDesignOpen(),
  close: () => smartPageDesignClose()
};

// ============================================================
// PART 17 — SMART SIGNATURE TOOL (التوقيع ✍)
// The existing ✍ toolbar button opens a small method menu with
// exactly 3 ways to create a signature: Draw (native Canvas +
// Pointer Events), Type (3 fixed styles) and Image (the
// existing file-picker pattern). The created signature is
// inserted into #smartDocumentContent as an independent,
// selectable element. No History, no Notes, no persistence,
// no external libraries, no alert(). Scoped entirely to
// Smart Documents (#smartBlankView) and isolated from the
// PART 14 image system.
// ============================================================
let smartSigMethod = null;          // 'draw' | 'type' | 'image'
let smartSigHasInk = false;         // did the user actually draw?
let smartSigImageDataUrl = null;    // prepared signature PNG (image method)
let smartSigStyleIndex = 0;         // typed-signature style (0..2)
const SMART_SIG_STYLES = [
  '"Segoe Script", "Brush Script MT", cursive',
  '"Comic Sans MS", "Chalkboard SE", cursive',
  'Georgia, "Times New Roman", serif'
];

function smartSignatureT(key, fallback) {
  const T = (state && state.locale && translations && translations[state.locale]) || translations.en;
  return (T && T[key]) || fallback;
}
function smartSignatureMenuEl() { return smartBlankEl('smartSignatureMenu'); }
function smartSignaturePanelEl() { return smartBlankEl('smartSignaturePanel'); }
function smartSignatureIsOpen() {
  const m = smartSignatureMenuEl();
  return !!(m && m.classList.contains('open'));
}
function smartSignaturePanelOpen() {
  const p = smartSignaturePanelEl();
  return !!(p && p.classList.contains('open'));
}

// Position a signature popup near the ✍ button, clamped inside the
// editor view so it never overflows on any screen size (RTL or LTR).
function smartSignaturePosition(el) {
  if (!el) return;
  const view = smartBlankEl('smartBlankView');
  const btn = document.querySelector('[data-toolbar="blank-doc"] button[data-tool="signature"]');
  if (!view || !btn) return;
  const vr = view.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  el.style.left = '0px';
  el.style.top = '0px';
  const w = el.offsetWidth || 200, h = el.offsetHeight || 160;
  let left = br.left - vr.left;
  let top = br.bottom - vr.top + 6;
  left = Math.max(6, Math.min(left, vr.width - w - 6));
  if (top + h > vr.height - 6) top = Math.max(6, br.top - vr.top - h - 6);
  el.style.left = Math.round(left) + 'px';
  el.style.top = Math.round(top) + 'px';
}

function smartSignatureOpenMenu() {
  const menu = smartSignatureMenuEl();
  if (!menu || smartSignatureIsOpen()) return;
  smartAddClose();            // never leave two menus open at once
  smartPageDesignClose();
  smartTableLauncherClose();
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');
  smartSignaturePosition(menu);
}

// Full close + state reset (Back / Escape / outside click / after insert).
function smartSignatureReset() {
  const menu = smartSignatureMenuEl();
  if (menu) { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
  smartSignatureHidePanel();
  smartSigImageDataUrl = null;
  const input = smartBlankEl('smartSignatureImageInput');
  if (input) { try { input.value = ''; } catch (e) {} }
  const preview = smartBlankEl('signatureImagePreview');
  if (preview) { preview.hidden = true; preview.removeAttribute('src'); }
  const hint = smartBlankEl('signatureImageHint');
  if (hint) hint.hidden = false;
  const nameInput = smartBlankEl('signatureNameInput');
  if (nameInput) nameInput.value = '';
  const typePreview = smartBlankEl('signatureTypePreview');
  if (typePreview) typePreview.textContent = '';
  smartSigHasInk = false;
}

function smartSignatureToggle() {
  if (smartSignatureIsOpen()) smartSignatureReset();
  else smartSignatureOpenMenu();
}

function smartSignatureShowStage(name) {
  const panel = smartSignaturePanelEl();
  if (!panel) return;
  ['Draw', 'Type', 'Image'].forEach((s) => {
    const st = smartBlankEl('sigStage' + s);
    if (st) st.hidden = (s.toLowerCase() !== name);
  });
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  smartSignaturePosition(panel);
}

function smartSignatureHidePanel() {
  const panel = smartSignaturePanelEl();
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  ['Draw', 'Type', 'Image'].forEach((s) => {
    const st = smartBlankEl('sigStage' + s);
    if (st) st.hidden = true;
  });
  smartSigMethod = null;
}

// Reset the draw canvas (also used on stage open). DPR-aware for crisp ink.
function smartSignatureResetCanvas() {
  const canvas = smartBlankEl('signatureCanvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 300;
  const cssH = canvas.clientHeight || 140;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111827';
  smartSigHasInk = false;
}

// Render a typed name into an offscreen canvas -> PNG data URL.
function smartSignatureRenderTyped(name) {
  const font = SMART_SIG_STYLES[smartSigStyleIndex] || SMART_SIG_STYLES[0];
  const size = 44;
  const off = document.createElement('canvas');
  let octx = off.getContext('2d');
  octx.font = 'italic ' + size + 'px ' + font;
  const m = octx.measureText(name);
  const pad = 12;
  off.width = Math.max(60, Math.ceil(m.width + pad * 2));
  off.height = Math.ceil(size * 1.5 + pad * 2);
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#111827';
  ctx.textBaseline = 'middle';
  ctx.font = 'italic ' + size + 'px ' + font;
  ctx.fillText(name, pad, off.height / 2);
  return off.toDataURL('image/png');
}

// Insert the signature into the active page content surface.
function smartSignatureInsert(dataUrl) {
  const surface = smartActivePageContent();
  if (!surface || !dataUrl) return null;
  Array.from(surface.querySelectorAll('.smart-doc-signature.is-selected'))
    .forEach((el) => el.classList.remove('is-selected'));
  const img = document.createElement('img');
  img.className = 'smart-doc-signature';
  img.dataset.smartElement = 'signature';
  img.src = dataUrl;
  img.alt = '';
  img.draggable = false; // never let native drag steal the pointer
  surface.appendChild(img);
  // PART 18 — a successful signature insert captures a fresh EQ baseline
  // and switches the session status back to "signed" (or signs it first time).
  if (typeof smartSigProtectOnInserted === 'function') smartSigProtectOnInserted();
  return img;
}

// One-time wiring for the whole tool.
function smartSignatureWire() {
  if (typeof document === 'undefined') return;
  const view = smartBlankEl('smartBlankView');
  if (!view || view.dataset.signatureWired === '1') return;
  view.dataset.signatureWired = '1';

  // Method menu items.
  const menu = smartSignatureMenuEl();
  if (menu) {
    menu.addEventListener('click', (e) => {
      const item = e.target && e.target.closest ? e.target.closest('.smart-sig-item') : null;
      if (!item) return;
      e.preventDefault();
      smartSigMethod = item.getAttribute('data-sig-method');
      menu.classList.remove('open');
      menu.setAttribute('aria-hidden', 'true');
      if (smartSigMethod === 'draw') {
        smartSignatureShowStage('draw');
        requestAnimationFrame(smartSignatureResetCanvas);
      } else if (smartSigMethod === 'type') {
        smartSignatureShowStage('type');
        const inp = smartBlankEl('signatureNameInput');
        if (inp) {
          inp.placeholder = smartSignatureT('smartSigNamePh', 'Your name');
          setTimeout(() => { try { inp.focus(); } catch (err) {} }, 50);
        }
        smartSigStyleIndex = 0;
        Array.from(view.querySelectorAll('.smart-sig-style-btn')).forEach((b) =>
          b.classList.toggle('active', b.getAttribute('data-sig-style') === '0'));
        smartSignatureUpdateTypePreview();
      } else if (smartSigMethod === 'image') {
        smartSignatureShowStage('image');
        const stage = smartBlankEl('sigStageImage');
        const insertBtn = stage && stage.querySelector('.smart-sig-insert');
        if (insertBtn) insertBtn.disabled = true;
        const input = smartBlankEl('smartSignatureImageInput');
        if (input) { try { input.click(); } catch (err) {} } // existing File Picker pattern
      }
    });
  }

  // Close when clicking outside the menu / panel / ✍ trigger.
  document.addEventListener('pointerdown', (e) => {
    if (!smartSignatureIsOpen() && !smartSignaturePanelOpen()) return;
    const t = e.target;
    if (t && t.closest && (t.closest('#smartSignatureMenu') || t.closest('#smartSignaturePanel') ||
      t.closest('[data-toolbar="blank-doc"] button[data-tool="signature"]'))) return;
    smartSignatureReset();
  });

  // Escape closes the signature UI and deselects any inserted signature.
  view.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (smartSignatureIsOpen() || smartSignaturePanelOpen()) {
      e.preventDefault(); smartSignatureReset(); return;
    }
  });
  // Document-level Escape (keyboard focus may live outside the view).
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || smartSignatureIsOpen() || smartSignaturePanelOpen()) return;
    const sel = view.querySelector('.smart-doc-signature.is-selected');
    if (sel) sel.classList.remove('is-selected');
  });

  // Panel buttons (per-stage Insert / Clear / Cancel / style).
  const panel = smartSignaturePanelEl();
  if (panel) {
    panel.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      if (btn.classList.contains('smart-sig-cancel')) {
        e.preventDefault(); smartSignatureReset(); return;
      }
      if (btn.classList.contains('smart-sig-clear')) {
        e.preventDefault(); smartSignatureResetCanvas(); return;
      }
      if (btn.classList.contains('smart-sig-style-btn')) {
        e.preventDefault();
        smartSigStyleIndex = parseInt(btn.getAttribute('data-sig-style'), 10) || 0;
        Array.from(panel.querySelectorAll('.smart-sig-style-btn')).forEach((b) =>
          b.classList.toggle('active', b === btn));
        smartSignatureUpdateTypePreview();
        return;
      }
      if (btn.classList.contains('smart-sig-insert')) {
        e.preventDefault();
        let url = null;
        if (smartSigMethod === 'draw') {
          if (!smartSigHasInk) return; // never insert an empty signature
          url = smartBlankEl('signatureCanvas').toDataURL('image/png');
        } else if (smartSigMethod === 'type') {
          const name = (smartBlankEl('signatureNameInput').value || '').trim();
          if (!name) return;
          url = smartSignatureRenderTyped(name);
        } else if (smartSigMethod === 'image') {
          url = smartSigImageDataUrl;
        }
        if (!url) return;
        smartSignatureInsert(url);
        smartSignatureReset();
      }
    });
  }

  // Typed-name live preview.
  const nameInput = smartBlankEl('signatureNameInput');
  if (nameInput) nameInput.addEventListener('input', smartSignatureUpdateTypePreview);

  // Image File Picker change handler.
  const imgInput = smartBlankEl('smartSignatureImageInput');
  if (imgInput) {
    imgInput.addEventListener('change', () => {
      const file = imgInput.files && imgInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        smartSigImageDataUrl = String(reader.result || '');
        const preview = smartBlankEl('signatureImagePreview');
        const hint = smartBlankEl('signatureImageHint');
        const stage = smartBlankEl('sigStageImage');
        if (preview && smartSigImageDataUrl) { preview.src = smartSigImageDataUrl; preview.hidden = false; }
        if (hint) hint.hidden = true;
        const insertBtn = stage && stage.querySelector('.smart-sig-insert');
        if (insertBtn) insertBtn.disabled = !smartSigImageDataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  // Draw: Pointer Events on the canvas (mouse + touch + pen).
  const canvas = smartBlankEl('signatureCanvas');
  if (canvas) {
    let drawing = false, lastX = 0, lastY = 0;
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    canvas.style.touchAction = 'none'; // keep the page still while drawing
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      drawing = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      const p = pos(e);
      lastX = p.x; lastY = p.y;
      smartSigHasInk = true; // a real pointer contact counts as ink intent
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(lastX + 0.01, lastY + 0.01); // dot on simple tap
      ctx.stroke();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      lastX = p.x; lastY = p.y;
    });
    const stop = () => { drawing = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
  }

  // Selection for inserted signatures (click select / outside deselect),
  // fully isolated from the PART 14 image selection system.
  view.addEventListener('click', (e) => {
    const sig = e.target && e.target.closest ? e.target.closest('.smart-doc-signature') : null;
    if (sig) {
      e.preventDefault();
      view.querySelectorAll('.smart-doc-signature.is-selected')
        .forEach((s) => { if (s !== sig) s.classList.remove('is-selected'); });
      sig.classList.add('is-selected');
      return;
    }
    const t = e.target;
    const insideSigUi = !!(t && t.closest && (t.closest('#smartSignatureMenu') || t.closest('#smartSignaturePanel')));
    if (!insideSigUi) {
      view.querySelectorAll('.smart-doc-signature.is-selected')
        .forEach((s) => s.classList.remove('is-selected'));
    }
  });
}

// PART 17 — behavior seam for tests.
window.__smartSignature = {
  isOpen: () => smartSignatureIsOpen(),
  isPanelOpen: () => smartSignaturePanelOpen(),
  method: () => smartSigMethod,
  hasInk: () => smartSigHasInk,
  count: () => document.querySelectorAll('#smartDocumentContent .smart-doc-signature').length,
  selected: () => !!document.querySelector('.smart-doc-signature.is-selected'),
  openMenu: () => smartSignatureOpenMenu(),
  reset: () => smartSignatureReset(),
  resetCanvas: () => smartSignatureResetCanvas()
};

function smartSignatureUpdateTypePreview() {
  const inp = smartBlankEl('signatureNameInput');
  const prev = smartBlankEl('signatureTypePreview');
  if (!inp || !prev) return;
  prev.textContent = inp.value.trim();
  prev.style.fontFamily = SMART_SIG_STYLES[smartSigStyleIndex] || SMART_SIG_STYLES[0];
  prev.style.fontStyle = 'italic';
}
// ============================================================
// PART 18 — SMART SIGNATURE PROTECTION (حماية التوقيع)
// "EQ Signature Status": EQ only checks that the document's
// substantial content has not changed since its last in-system
// signature. This is NOT a legal / certified / guaranteed
// electronic signature — no encryption, no certificates, no
// public/private keys, and NO persistence (session-only state
// tied to the current Smart Documents session). When a signature
// is inserted, a deterministic baseline of the substantial content
// is captured. A MutationObserver watches the A4 canvas holder and
// (debounced) re-computes that baseline; only a REAL change in the
// substantial fingerprint invalidates the previous signature, so
// UI-only DOM activity (selecting, opening menus, focus/active
// classes) never invalidates it. An invalidated signature stays
// visible but is flagged .is-invalidated inside EQ. "Re-sign"
// reuses the PART 17 tool and rebuilds a fresh baseline.
// ============================================================
let smartSigProtectBaseline = null;  // fingerprint string captured at last signature
let smartSigProtectStatus = 'none';  // 'none' | 'signed' | 'modified'
let smartSigProtectTimer = null;

function smartSigProtectT(key, fallback) {
  const T = (state && state.locale && translations && translations[state.locale]) || translations.en;
  return (T && T[key]) || fallback;
}

// FNV-1a (32-bit) — a small, deterministic, session-only hash of a string.
function smartSigProtectHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Canonical per-block signature for ONE substantive content child.
function smartSigProtectRec(el) {
  if (!el || el.nodeType !== 1) return null;
  const tag = (el.tagName || '').toLowerCase();
  const de = el.getAttribute && el.getAttribute('data-smart-element');
  const cls = el.classList || { contains: () => false };
  // Text / heading — text content (add/remove/edit text or heading).
  if (de === 'text' || de === 'heading' || tag === 'p' || tag === 'h1' || tag === 'h2' || tag === 'h3') {
    return (de === 'heading' ? 'HEAD:' : 'TEXT:') + (el.textContent || '').replace(/\u00a0/g, ' ');
  }
  // Table — every cell's text, plus the row/col structure (covers cell edit,
  // add/delete row/column and cell-content changes).
  if (de === 'table' || tag === 'table') {
    const rows = [];
    Array.from(el.rows || []).forEach((tr) => {
      const cells = Array.from(tr.cells || []).map((td) => (td.textContent || '').replace(/\u00a0/g, ' '));
      rows.push(cells.join('\u0001'));
    });
    return 'TABLE:' + rows.join('\u0002');
  }
  if (de === 'divider' || tag === 'hr' || cls.contains('smart-doc-divider')) return 'HR';
  // Signature — presence/order + a cheap hash of its pixels (replace detected).
  if (de === 'signature' || cls.contains('smart-doc-signature')) {
    return 'SIG:' + smartSigProtectHash(el.getAttribute('src') || '');
  }
  // PART 14 image (img) — src (replace), inline size (resize), parent position.
  if (de === 'image' || cls.contains('smart-doc-image')) {
    const wrap = el.parentElement;
    return 'IMG:' + smartSigProtectHash(el.getAttribute('src') || '') +
      '|' + (el.style.width || '') + '|' + (el.style.height || '') +
      '|' + (wrap ? ((wrap.dataset.tx || '') + ',' + (wrap.dataset.ty || '')) : '');
  }
  // PART 14 image WRAP (src, size, computed move).
  if (de === 'image-wrap' || cls.contains('smart-doc-image-wrap')) {
    const img = el.querySelector('img.smart-doc-image') || el.querySelector('img');
    return 'IMGW:' + smartSigProtectHash((img && img.getAttribute('src')) || '') +
      '|' + (img && img.style ? (img.style.width || '') : '') +
      '|' + (img && img.style ? (img.style.height || '') : '') +
      '|' + ((el.dataset.tx || '') + ',' + (el.dataset.ty || ''));
  }
  // PART 15 logo (img src + position).
  if (de === 'logo' || cls.contains('smart-doc-logo')) {
    const wrap = el.closest('[data-logo-position]');
    return 'LOGO:' + smartSigProtectHash(el.getAttribute('src') || '') + '|' + (wrap ? wrap.getAttribute('data-logo-position') : '');
  }
  if (de === 'logo-wrap' || cls.contains('smart-doc-logo-wrap')) {
    const img = el.querySelector('img.smart-doc-logo');
    return 'LOGOW:' + smartSigProtectHash((img && img.getAttribute('src')) || '') + '|' + (el.getAttribute('data-logo-position') || '');
  }
  return null;
}
// ============================================================
// Build the substantial-content fingerprint of the whole Smart Document.
function smartSigProtectFingerprint() {
  const holder = document.getElementById('smartBlankCanvasHolder');
  if (!holder) return '';
  const parts = [];
  // Page-design frame of each A4 page (a documented part of the content).
  const presets = (typeof SMART_PAGE_DESIGN_PRESETS !== 'undefined' && SMART_PAGE_DESIGN_PRESETS) || [];
  holder.querySelectorAll('.smart-blank-canvas').forEach((canvas) => {
    let design = 'none';
    presets.forEach((p) => { if (canvas.classList.contains('smart-page-design-' + p)) design = p; });
    parts.push('PG:' + design);
  });
  // Every content surface, in document order.
  holder.querySelectorAll('.smart-document-content').forEach((surface) => {
    Array.from(surface.children).forEach((el) => {
      const r = smartSigProtectRec(el);
      if (r) parts.push(r);
    });
  });
  return smartSigProtectHash(parts.join('\n'));
}

function smartSigProtectUIEls() {
  return {
    wrap: document.getElementById('smartSigStatus'),
    text: document.getElementById('smartSigStatusText'),
    btn: document.getElementById('smartSigResignBtn')
  };
}

function smartSigProtectUpdateUI() {
  const els = smartSigProtectUIEls();
  const wrap = els.wrap, text = els.text, btn = els.btn;
  if (!wrap) return;
  if (smartSigProtectStatus === 'signed') {
    wrap.hidden = false; wrap.setAttribute('aria-hidden', 'false');
    wrap.classList.add('is-signed'); wrap.classList.remove('is-modified');
    if (text) {
      text.dataset.i18n = 'smartSigStatusSigned';
      text.textContent = smartSigProtectT('smartSigStatusSigned', '\u2713 Signed');
    }
    if (btn) { btn.hidden = true; btn.setAttribute('aria-hidden', 'true'); }
  } else if (smartSigProtectStatus === 'modified') {
    wrap.hidden = false; wrap.setAttribute('aria-hidden', 'false');
    wrap.classList.add('is-modified'); wrap.classList.remove('is-signed');
    if (text) {
      text.dataset.i18n = 'smartSigStatusModified';
      text.textContent = smartSigProtectT('smartSigStatusModified', '\u26A0 The document was changed after signing');
    }
    if (btn) { btn.hidden = false; btn.setAttribute('aria-hidden', 'false'); }
  } else {
    wrap.hidden = true; wrap.setAttribute('aria-hidden', 'true');
    if (text) text.dataset.i18n = 'smartSigStatusSigned';
    if (btn) { btn.hidden = true; btn.setAttribute('aria-hidden', 'true'); }
  }
}

// Called right after a signature is inserted (hooked in PART 17).
// Captures a fresh baseline and marks the document as signed.
function smartSigProtectOnInserted() {
  let fp = null;
  try { fp = smartSigProtectFingerprint(); } catch (e) { fp = null; }
  smartSigProtectBaseline = fp;
  smartSigProtectStatus = 'signed';
  // A fresh signature re-validates the document: clear EQ-invalid flags.
  const holder = document.getElementById('smartBlankCanvasHolder');
  if (holder) holder.querySelectorAll('.smart-doc-signature.is-invalidated').forEach((s) => s.classList.remove('is-invalidated'));
  smartSigProtectUpdateUI();
}

function smartSigProtectMarkInvalid() {
  smartSigProtectStatus = 'modified';
  const holder = document.getElementById('smartBlankCanvasHolder');
  if (holder) {
    // Keep the previous signature VISIBLE, but flag it invalid inside EQ.
    holder.querySelectorAll('.smart-doc-signature').forEach((s) => s.classList.add('is-invalidated'));
  }
  smartSigProtectUpdateUI();
}

// Debounced check: only compares the REAL substantial fingerprint. UI-only
// class/attribute churn (selection, menus, active states) leaves it equal.
function smartSigProtectScheduleCheck() {
  if (smartSigProtectStatus !== 'signed') return;
  if (smartSigProtectTimer) clearTimeout(smartSigProtectTimer);
  smartSigProtectTimer = setTimeout(() => {
    smartSigProtectTimer = null;
    if (smartSigProtectStatus !== 'signed') return;
    let fp = null;
    try { fp = smartSigProtectFingerprint(); } catch (e) { fp = null; }
    if (smartSigProtectBaseline !== null && fp !== smartSigProtectBaseline) smartSigProtectMarkInvalid();
  }, 450);
}
// Idempotent wiring: the "Re-sign" button + the MutationObserver.
function smartSigProtectWire() {
  if (typeof document === 'undefined') return;
  const holder = document.getElementById('smartBlankCanvasHolder');
  const btn = document.getElementById('smartSigResignBtn');
  if (btn && btn.dataset.sigProtectWired !== '1') {
    btn.dataset.sigProtectWired = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      // Reopens the EXISTING PART 17 signature tool so the user can
      // draw / type / upload a new signature; on insert, PART 18 rebuilds
      // a fresh baseline and the status returns to "signed".
      if (typeof smartSignatureOpenMenu === 'function') smartSignatureOpenMenu();
    });
  }
  if (!holder || holder.dataset.sigProtectWired === '1') return;
  holder.dataset.sigProtectWired = '1';
  try {
    const obs = new MutationObserver(() => smartSigProtectScheduleCheck());
    obs.observe(holder, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'src', 'data-logo-position', 'data-tx', 'data-ty', 'width', 'height']
    });
  } catch (e) { /* observer is best-effort */ }
}

// Clear all session state when leaving / reopening the editor.
function smartSigProtectReset() {
  if (smartSigProtectTimer) { clearTimeout(smartSigProtectTimer); smartSigProtectTimer = null; }
  smartSigProtectBaseline = null;
  smartSigProtectStatus = 'none';
  smartSigProtectUpdateUI();
}

// PART 18 — behavior seam for tests.
window.__smartSignatureProtection = {
  status: () => smartSigProtectStatus,
  baseline: () => smartSigProtectBaseline,
  fingerprint: () => { try { return smartSigProtectFingerprint(); } catch (e) { return null; } },
  invalidated: () => typeof document !== 'undefined'
    ? document.querySelectorAll('#smartBlankCanvasHolder .smart-doc-signature.is-invalidated').length : 0,
  signedCount: () => typeof document !== 'undefined'
    ? document.querySelectorAll('#smartBlankCanvasHolder .smart-doc-signature').length : 0,
  resignShown: () => { const b = document.getElementById('smartSigResignBtn'); return !!(b && !b.hidden); },
  statusText: () => { const t = document.getElementById('smartSigStatusText'); return t ? t.textContent.trim() : ''; },
  // Test-only seam: lets an imported-PDF test establish that the document is
  // already signed (reusing the exact PART 18 state machine) so we can prove
  // a committed text edit invalidates it. Not a feature — just a behavior seam.
  setSignedForTest: () => {
    smartSigProtectStatus = 'signed';
    try { smartSigProtectBaseline = smartSigProtectFingerprint(); }
    catch (e) { smartSigProtectBaseline = 'part37-baseline-' + Date.now(); }
    smartSigProtectUpdateUI();
    return smartSigProtectStatus;
  },
  reset: () => smartSigProtectReset()
};

// ============================================================
// PART 25 — SMART DOCUMENTS REVIEW / PREVIEW (مراجعة)
// Entering review shows a REAL preview built from the SAME live
// A4 pages of the current document state (PART 19 canvases, PART 16
// design presets, same content surfaces) — no clone, no screenshot,
// no second rendering pipeline. Review mode only:
//   - toggles an `is-review` class on #smartBlankView (CSS hides
//     every heavy editing tool and blocks content interaction),
//   - advances the EXISTING workflow stepper to step 3 (● ● ● ○),
//   - renders the document name from PART 24.
// Review itself is NOT a modification: nothing inside any content
// surface is touched, so dirty tracking (PART 20 canonical string)
// and signature protection (PART 18 fingerprint) are unaffected.
// Fully local/offline — same IndexedDB document, zero network.
// ============================================================
function smartReviewActive() {
  const v = smartBlankEl('smartBlankView');
  return !!(v && v.classList.contains('is-review'));
}

function smartReviewDotsText(step, total) {
  let out = [];
  for (let i = 1; i <= total; i++) out.push(i <= step ? '\u25CF' : '\u25CB');
  return out.join(' ');
}

function smartReviewSyncUI() {
  const view = smartBlankEl('smartBlankView');
  const bar = document.getElementById('smartReviewBar');
  if (!view || !bar) return;
  const active = smartReviewActive();
  bar.hidden = !active;
  bar.setAttribute('aria-hidden', active ? 'false' : 'true');
  if (!active) return;
  // Stage indicator: ● ● ● ○ (step 3 of 4 — Review).
  const dotsEl = document.getElementById('smartReviewDots');
  if (dotsEl) dotsEl.textContent = smartReviewDotsText(3, 4);
  // Document name from the existing model (PART 24 fallback included).
  const nameEl = document.getElementById('smartReviewDocName');
  if (nameEl && state.smartBlankDoc) {
    const n = (state.smartBlankDoc.name || '').trim();
    nameEl.textContent = n || smartDocUntitledT();
  }
}

function smartReviewOpen() {
  const view = smartBlankEl('smartBlankView');
  if (!view || !state.smartBlankDoc || !smartBlankVisible()) return false;
  if (smartReviewActive()) return true; // idempotent — never duplicate
  // Close every floating editing surface first so nothing leaks behind
  // the preview (Add menu, page design menu, signature panel/tools).
  if (typeof smartAddClose === 'function') smartAddClose();
  if (typeof smartPageDesignClose === 'function') smartPageDesignClose();
  // PART 17 — full signature menu/panel close (never leaves popups behind).
  if (typeof smartSignatureReset === 'function') smartSignatureReset();
  view.classList.add('is-review');
  smartReviewSyncUI();
  // Advance the EXISTING workflow indicator to stage 3 (Review).
  setSmartDocsStep(3);
  return true;
}

function smartReviewExit() {
  const view = smartBlankEl('smartBlankView');
  if (!view || !smartReviewActive()) return false;
  view.classList.remove('is-review');
  smartReviewSyncUI();
  // Back to the editing stage (2). Content, pages, images, logo,
  // signature, name and design are untouched by definition.
  setSmartDocsStep(2);
  return true;
}

// Reset review mode whenever the editor is (re)opened or left, so a
// stale review session can never survive across documents.
function smartReviewReset() {
  const view = smartBlankEl('smartBlankView');
  if (view) view.classList.remove('is-review');
  const bar = document.getElementById('smartReviewBar');
  if (bar) { bar.hidden = true; bar.setAttribute('aria-hidden', 'true'); }
}

// PART 25 — behavior seam for tests / future phases.
window.__smartReview = {
  open: () => smartReviewOpen(),
  exit: () => smartReviewExit(),
  active: () => smartReviewActive(),
  dots: () => { const d = document.getElementById('smartReviewDots'); return d ? d.textContent.trim() : ''; },
  shownName: () => { const n = document.getElementById('smartReviewDocName'); return n ? n.textContent.trim() : ''; }
};

// ============================================================
// PART 26 — SMART DOCUMENTS: PDF EXPORT (تصدير PDF)
// Fully LOCAL/OFFLINE PDF generation from the SAME live A4
// pages the user sees in the editor/Review (PART 19 page model).
// No external library, no CDN, no server: every requested page is
// rasterized in-memory from its own DOM element and embedded as a
// JPEG inside a minimal hand-written PDF. Quality (Normal/High)
// only changes raster scale/JPEG quality — never content, layout,
// fonts, tables, images, signature, margins or page design.
// Export NEVER mutates document state: currentPage, content, name,
// design, signature state, dirty flag and the PART 18 signature
// baseline are all left exactly as they were.
// ============================================================

// Rasterize one .smart-blank-canvas element to a JPEG data URL.
// The element is cloned and inline computed styles are copied onto
// the clone so the SVG foreignObject render matches the on-screen
// preview. Hidden pages render without touching visibility classes.
function smartPdfRasterizePage(pageEl, scale, jpegQuality) {
  // Hidden pages (.smart-page-hidden -> display:none) have no layout box;
  // measure a visible sibling (same A4 geometry) or fall back to the A4
  // CSS pixel size at 96dpi. The clone itself is forced visible below.
  let rect = pageEl.getBoundingClientRect();
  if (!rect || rect.width < 10) {
    const vis = Array.prototype.slice.call(
      (pageEl.parentNode || document).querySelectorAll('.smart-blank-canvas:not(.smart-page-hidden)'))[0];
    rect = vis ? vis.getBoundingClientRect() : null;
    if (!rect || rect.width < 10) rect = { width: 794, height: 1123 };
  }
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const clone = pageEl.cloneNode(true);
  // Copy resolved computed styles so the serialized clone keeps the
  // exact preview look (external stylesheets do not apply to SVG).
  const srcEls = [pageEl].concat(Array.prototype.slice.call(pageEl.querySelectorAll('*')));
  const dstEls = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll('*')));
  for (let i = 0; i < srcEls.length; i++) {
    try {
      const cs = getComputedStyle(srcEls[i]);
      if (cs && cs.cssText) dstEls[i].style.cssText = cs.cssText;
      else {
        let out = '';
        for (let k = 0; k < cs.length; k++) out += cs[k] + ':' + cs.getPropertyValue(cs[k]) + ';';
        dstEls[i].style.cssText = out;
      }
    } catch (e) { /* best effort styling */ }
  }
  // Force the cloned ROOT page visible at its natural A4 box (the live
  // element keeps its untouched visibility class).
  clone.classList.remove('smart-page-hidden');
  clone.style.cssText += ';display:block;visibility:visible;width:' + w + 'px;height:' + h + 'px;';
  // Serialize via a namespaced wrapper so the foreignObject subtree is
  // well-formed XHTML (no manual first-tag stripping).
  const wrap = document.createElement('div');
  wrap.appendChild(clone);
  const xhtml = new XMLSerializer().serializeToString(wrap);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '">' +
    '<foreignObject width="100%" height="100%">' +
    xhtml + '</foreignObject></svg>';
  return new Promise((resolve, reject) => {
    // NOTE: a data: URL must be used here — blob: SVG images taint the
    // destination canvas in Chromium and toDataURL would throw.
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', jpegQuality));
      } catch (e) { reject(e); }
    };
    img.onerror = () => { reject(new Error('page raster failed')); };
    img.src = url;
  });
}

// Minimal PDF writer: N pages of A4 (595.28 x 841.89 pt), each page
// shows one full-page JPEG (DCTDecode) from smartPdfRasterizePage.
function smartPdfAssemble(jpegs) {
  const PAGE_W = 595.28, PAGE_H = 841.89;
  const parts = [];
  let len = 0;
  const push = (chunk) => { parts.push(chunk); len += chunk.length; };
  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
  const objStarts = {};
  const pageCount = jpegs.length;
  function beginObj(num) { objStarts[num] = len; push(num + ' 0 obj\n'); }
  beginObj(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  beginObj(2);
  let kids = '';
  for (let i = 0; i < pageCount; i++) kids += (3 + 2 * i) + ' 0 R ';
  push('<< /Type /Pages /Count ' + pageCount + ' /Kids [' + kids + '] >>\nendobj\n');
  for (let i = 0; i < pageCount; i++) {
    const contentNum = 4 + 2 * i, imgNum = 5 + 2 * i;
    const jpg = jpegs[i]; // { bytes: Uint8Array, w, h }
    beginObj(3 + 2 * i);
    push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PAGE_W + ' ' + PAGE_H +
      '] /Contents ' + contentNum + ' 0 R /Resources << /XObject << /Im' + i + ' ' + imgNum +
      ' 0 R >> /ProcSet [/PDF /ImageC] >> >>\nendobj\n');
    const stream = 'q ' + PAGE_W + ' 0 0 ' + PAGE_H + ' 0 0 cm /Im' + i + ' Do Q';
    beginObj(contentNum);
    push('<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream\nendobj\n');
    beginObj(imgNum);
    push('<< /Type /XObject /Subtype /Image /Width ' + jpg.w + ' /Height ' + jpg.h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.bytes.length +
      ' >>\nstream\n');
    push(jpg.bytes);
    push('\nendstream\nendobj\n');
  }
  const xrefPos = len;
  const maxObj = 2 + 2 * pageCount + 1;
  let xref = 'xref\n0 ' + maxObj + '\n0000000000 65535 f \n';
  for (let n = 1; n < maxObj; n++) {
    xref += String(objStarts[n]).padStart(10, '0') + ' 00000 n \n';
  }
  push(xref);
  push('trailer\n<< /Size ' + maxObj + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF');
  const total = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(typeof p === 'string' ? new TextEncoder().encode(p) : p, at);
    at += p.length;
  }
  return new Blob([out], { type: 'application/pdf' });
}

async function smartPdfDataUrlToBytes(dataUrl) {
  const res = await fetch(dataUrl);
  return new Uint8Array(await res.arrayBuffer());
}

// Build the PDF Blob for the given options WITHOUT downloading.
// opts: { pages: 'all'|'current', quality: 'normal'|'high' }
async function smartPdfBuildBlob(opts) {
  const o = opts || {};
  const doc = state.smartBlankDoc;
  if (!doc) throw new Error('no document');
  smartPageSyncState();
  const list = smartPagesCanvases();
  if (!list.length) throw new Error('no pages');
  const curIdx = Math.min(Math.max(doc.currentPage - 1, 0), list.length - 1);
  const targets = o.pages === 'current' ? [list[curIdx]] : list.slice(); // DOM order == preview order
  const high = o.quality === 'high';
  const scale = high ? 2 : 1;             // output resolution ONLY
  const jpegQuality = high ? 0.92 : 0.75; // JPEG quality ONLY
  const jpegs = [];
  for (const el of targets) {
    const dataUrl = await smartPdfRasterizePage(el, scale, jpegQuality);
    const dims = await new Promise((res) => {
      const im = new Image();
      im.onload = () => res({ w: im.naturalWidth || 595, h: im.naturalHeight || 842 });
      im.src = dataUrl;
    });
    jpegs.push({ bytes: await smartPdfDataUrlToBytes(dataUrl), w: dims.w, h: dims.h });
  }
  return smartPdfAssemble(jpegs);
}

function smartPdfChosenFilename() {
  const input = document.getElementById('smartPdfFilenameInput');
  const raw = input ? input.value : '';
  // PART 24 sanitizer — applied ONLY to the final filename, never to
  // the internal document name.
  const clean = smartPdfSanitizeName(raw) || smartDocUntitledT();
  return (clean.toLowerCase().endsWith('.pdf') ? clean : clean + '.pdf');
}

function smartPdfDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function smartPdfModalOpen() {
  const modal = document.getElementById('smartPdfModal');
  if (!modal || !state.smartBlankDoc) return false;
  const input = document.getElementById('smartPdfFilenameInput');
  if (input) {
    // Default filename from PART 24 (name + sanitizer + localized fallback).
    input.value = smartDocPdfFilename().replace(/\.pdf$/i, '');
  }
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  return true;
}

function smartPdfModalClose() {
  const modal = document.getElementById('smartPdfModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

// PART 34 — operation state for the PDF export run. While a run is in
// flight the confirm button shows the translated "preparing" state and is
// disabled, so a second click can never produce a duplicate PDF / race.
// On failure: technical details go to console ONLY (developer), the user
// sees a short human message with retry, the dialog stays open and usable,
// and NO document state (content/pages/name/design/currentPage/dirty) changes.
let smartPdfRunBusy = false;

function smartPdfSetBusy(busy) {
  const btn = document.getElementById('smartPdfConfirmBtn');
  if (!btn) return;
  // The label lives in a <span data-i18n> — change the SPAN text so the
  // translation system stays intact after the busy state clears.
  const label = btn.querySelector('span[data-i18n]') || btn;
  if (busy) {
    const t = smartBlankT();
    btn.dataset.pdfBusy = '1';
    btn.disabled = true;
    if (!btn.dataset.pdfOrigText) btn.dataset.pdfOrigText = label.textContent;
    label.textContent = t.smartPdfPreparing || 'Preparing document…';
  } else {
    delete btn.dataset.pdfBusy;
    btn.disabled = false;
    if (btn.dataset.pdfOrigText) { label.textContent = btn.dataset.pdfOrigText; delete btn.dataset.pdfOrigText; }
  }
}

// Full export run from the dialog. Never changes any document state:
// no currentPage change, no dirty flag, no signature/baseline touch.
async function smartPdfRunExport() {
  if (smartPdfRunBusy) return false; // duplicate-operation guard (PART 34)
  const t = smartBlankT();
  const pagesOpt = (document.querySelector('input[name="smartPdfPages"]:checked') || {}).value || 'all';
  const qualityOpt = (document.querySelector('input[name="smartPdfQuality"]:checked') || {}).value || 'normal';
  const filename = smartPdfChosenFilename();
  smartPdfRunBusy = true;
  smartPdfSetBusy(true); // "جارٍ تجهيز المستند…" while working
  try {
    const blob = await smartPdfBuildBlob({ pages: pagesOpt, quality: qualityOpt });
    if (!blob || !blob.size) throw new Error('empty pdf');
    smartPdfResultOffer(blob, filename);
    smartPdfModalClose();
    showToast(t.smartPdfExportSuccess || 'PDF exported successfully.', 1800);
    return true;
  } catch (err) {
    // Developer-only log — NEVER shown in the UI (PART 34 rule).
    try { console.error('[SmartDocuments] PDF export failed:', err && err.message || err); } catch (e2) {}
    // Keep the dialog OPEN and usable so the user can simply retry; no
    // document data was touched by the failed run.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) showInternetRequiredToast();
    else showToast(t.smartPdfPrepareFailed || t.smartPdfExportFailed || 'PDF generation failed.', 2400);
    return false;
  } finally {
    smartPdfRunBusy = false;
    smartPdfSetBusy(false); // button re-enabled → retry possible without refresh
  }
}

function smartPdfWire() {
  const openBtn = document.getElementById('smartPdfExportBtn');
  if (openBtn && openBtn.dataset.pdfWired !== '1') {
    openBtn.dataset.pdfWired = '1';
    openBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfModalOpen(); });
  }
  const cancelBtn = document.getElementById('smartPdfCancelBtn');
  if (cancelBtn && cancelBtn.dataset.pdfWired !== '1') {
    cancelBtn.dataset.pdfWired = '1';
    cancelBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfModalClose(); });
  }
  const confirmBtn = document.getElementById('smartPdfConfirmBtn');
  if (confirmBtn && confirmBtn.dataset.pdfWired !== '1') {
    confirmBtn.dataset.pdfWired = '1';
    confirmBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfRunExport(); });
  }
}

// Behavior seam for tests / future parts.
window.__smartPdfExport = {
  open: () => smartPdfModalOpen(),
  close: () => smartPdfModalClose(),
  isOpen: () => { const m = document.getElementById('smartPdfModal'); return !!m && !m.hidden; },
  buildBlob: (opts) => smartPdfBuildBlob(opts),
  run: () => smartPdfRunExport(),
  chosenFilename: () => smartPdfChosenFilename(),
  isBusy: () => smartPdfRunBusy // PART 34 — operation-state seam for tests
};
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', smartPdfWire);
  else smartPdfWire();
}

// ============================================================
// PART 27 — SMART DOCUMENTS: PDF SHARING (مشاركة المستند)
// After a successful PART 26 export, offers the produced PDF
// (the SAME Blob) through a lightweight result dialog with three
// actions: Open PDF / Share / Close.
// - Open PDF: opens the SAME produced blob (no rebuild, no new
//   preview engine). Unavailable browsers show a translated toast
//   and still offer the file via an offline download (no crash).
// - Share: uses the native Web Share API ONLY when the browser /
//   device actually supports FILE sharing (navigator.share AND
//   navigator.canShare). We never assume Web Share works. When it
//   is unsupported the app does NOT present a fake failure — it
//   downloads the SAME file directly and shows a translated note.
// - User-cancelled share (AbortError) is not a crash; it shows a
//   translated toast. Never alert()/confirm()/prompt().
// Sharing/opening operate on the produced Blob ONLY. They never
// mutate document content, pages, currentPage, name, design,
// dirty flag, IndexedDB draft, signature or its protection.
// Fully OFFLINE: no network request, no backend, no CDN.
// ============================================================

let smartPdfResult = { blob: null, filename: '', present: false, gen: 0 };
let smartPdfOpenCount = 0, smartPdfShareCount = 0, smartPdfDownloadCount = 0;
let smartPdfOpenGen = 0, smartPdfLastAction = '', smartPdfLastUsedSame = true, smartPdfLastFilename = '';

function smartPdfResultOffer(blob, filename) {
  if (!blob) return;
  smartPdfResult = { blob, filename, present: true, gen: smartPdfResult.gen + 1 };
  const modal = document.getElementById('smartPdfResultModal');
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  const t = smartBlankT();
  const fnEl = document.getElementById('smartPdfResultFilename');
  if (fnEl) {
    fnEl.setAttribute('dir', (state && state.locale === 'ar') ? 'rtl' : 'ltr');
    fnEl.textContent = (t.smartPdfResultFileLabel || 'File') + ': ' + filename;
  }
}

function smartPdfResultClose() {
  const modal = document.getElementById('smartPdfResultModal');
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
}

// Strict FILE-sharing capability check. "Supported" only when BOTH
// navigator.share exists AND the device/browser truly confirms file
// sharing via canShare(...). No guesswork — unsupported yields false.
function smartPdfWebShareSupported() {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
    if (typeof navigator.canShare === 'function') {
      try {
        const probe = new File(['%PDF-'], 'probe.pdf', { type: 'application/pdf' });
        return !!navigator.canShare({ files: [probe] });
      } catch (e) { return false; }
    }
    // canShare is absent: we cannot prove file sharing, so report unsupported.
    return false;
  } catch (e) { return false; }
}

// A shareable File/Blob wrapping the SAME produced PDF (never rebuilt).
function smartPdfShareFile() {
  const r = smartPdfResult;
  if (!r || !r.blob) return null;
  try { return new File([r.blob], r.filename, { type: 'application/pdf' }); }
  catch (e) { return r.blob; }
}

// Observable download of the SAME produced blob (reuses PART 26 helper).
function smartPdfTriggerDownload(blob, filename) {
  smartPdfDownloadCount++;
  smartPdfLastFilename = filename;
  smartPdfDownload(blob, filename);
}

// __P27_CHUNK2__

// Open the produced PDF. Uses the SAME blob — no rebuild, no new
// renderer. If this browser cannot open it, we still offer the file
// via an offline download and show a translated message (no crash).
function smartPdfOpenAction() {
  const t = smartBlankT();
  const r = smartPdfResult;
  if (!r || !r.blob) return false;
  const used = r.blob;
  smartPdfOpenCount++;
  smartPdfOpenGen = r.gen;
  smartPdfLastAction = 'open';
  smartPdfLastUsedSame = (used === r.blob);
  smartPdfLastFilename = r.filename;
  try {
    // Open = offer the produced file for opening locally (offline-safe).
    // Downloading the SAME produced blob opens the PDF in the device's
    // default viewer — no rebuild, no preview engine, no extra tab.
    smartPdfTriggerDownload(used, r.filename);
    smartPdfResultClose();
    return true;
  } catch (err) {
    smartPdfTriggerDownload(used, r.filename);
    showToast(t.smartPdfOpenFailed || 'Could not open the PDF in this browser.', 2600);
    smartPdfResultClose();
    return false;
  }
}

// Share the SAME produced PDF. Uses Web Share only when supported;
// otherwise downloads it directly with a translated note.
async function smartPdfShareAction() {
  const t = smartBlankT();
  const r = smartPdfResult;
  if (!r || !r.blob) return;
  smartPdfShareCount++;
  smartPdfLastAction = 'share';
  smartPdfLastUsedSame = true;
  if (smartPdfWebShareSupported()) {
    try {
      const file = smartPdfShareFile();
      if (!file) return;
      await navigator.share({ title: r.filename, files: [file] });
      smartPdfResultClose();
      return;
    } catch (err) {
      const n = (err && err.name) || '';
      if (n === 'AbortError' || n === 'NotFoundError' || n === 'NotAllowedError' || n === 'CancelError') {
        // User dismissed the share sheet — not a crash.
        showToast(t.smartPdfShareCancelled || 'Sharing cancelled.', 2200);
      } else {
        smartPdfTriggerDownload(r.blob, r.filename);
        showToast(t.smartPdfShareFailed || 'Sharing failed. The PDF was downloaded.', 3000);
      }
      smartPdfResultClose();
      return;
    }
  }
  // Web Share not usable here: reliable local fallback (download the file).
  smartPdfTriggerDownload(r.blob, r.filename);
  smartPdfLastAction = 'download';
  showToast(t.smartPdfShareUnsupported || 'Direct sharing is not supported on this device. The PDF was downloaded.', 3400);
  smartPdfResultClose();
}

// __P27_CHUNK3__

function smartPdfResultWire() {
  const openBtn = document.getElementById('smartPdfOpenBtn');
  if (openBtn && openBtn.dataset.p27 !== '1') {
    openBtn.dataset.p27 = '1';
    openBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfOpenAction(); });
  }
  const shareBtn = document.getElementById('smartPdfShareBtn');
  if (shareBtn && shareBtn.dataset.p27 !== '1') {
    shareBtn.dataset.p27 = '1';
    shareBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfShareAction(); });
  }
  const closeBtn = document.getElementById('smartPdfResultCloseBtn');
  if (closeBtn && closeBtn.dataset.p27 !== '1') {
    closeBtn.dataset.p27 = '1';
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); smartPdfResultClose(); });
  }
}

// Behavior seam for tests / future parts.
window.__smartPdfShare = {
  offer: (blob, filename) => smartPdfResultOffer(blob, filename),
  open: () => smartPdfOpenAction(),
  share: () => smartPdfShareAction(),
  close: () => smartPdfResultClose(),
  isOpen: () => { const m = document.getElementById('smartPdfResultModal'); return !!m && !m.hidden; },
  present: () => !!smartPdfResult.present,
  webShareSupported: () => smartPdfWebShareSupported(),
  filename: () => smartPdfResult.filename || '',
  blobSize: () => (smartPdfResult.blob ? smartPdfResult.blob.size : 0),
  gen: () => smartPdfResult.gen,
  openGen: () => smartPdfOpenGen,
  openCount: () => smartPdfOpenCount,
  shareCount: () => smartPdfShareCount,
  downloadCount: () => smartPdfDownloadCount,
  lastFilename: () => smartPdfLastFilename,
  lastUsedSame: () => smartPdfLastUsedSame,
  lastAction: () => smartPdfLastAction
};
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', smartPdfResultWire);
  else smartPdfResultWire();
}




// PART 11 — SMART TEXT TOOL (أداة النص)
// T button inserts an independent editable text block; selecting
// or focusing a block reveals Text Formatting Controls scoped to
// Smart Documents only. No global state changes.
// ============================================================
const SMART_TEXT_FONTS = {
  '': '', // default = inherit
  'Arial, sans-serif': 'Arial',
  'Georgia, serif': 'Georgia',
  "'Times New Roman', serif": 'Times New Roman',
  "'Courier New', monospace": 'Courier New',
  'Tahoma, sans-serif': 'Tahoma',
  'Verdana, sans-serif': 'Verdana'
};

function smartTextLocaleDir() { return (state && state.locale === 'ar') ? 'rtl' : 'ltr'; }

// Apply dir to the Smart Documents editor view + format bar (never the app root).
function smartBlankApplyDirection() {
  if (typeof document === 'undefined') return;
  const view = document.getElementById('smartBlankView');
  if (!view) return;
  const dir = smartTextLocaleDir();
  view.setAttribute('dir', dir);
  // PART 19 — the page counter is composed text: re-render it on locale change.
  if (typeof smartPageUpdateUI === 'function' && state && state.smartBlankDoc) smartPageUpdateUI();
  const bar = document.getElementById('smartTextFormatBar');
  if (bar) bar.setAttribute('dir', dir);
  // PART 12 — keep the table launcher + contextual table tools in sync with locale.
  const tL = document.getElementById('smartTableCreate');
  if (tL) tL.setAttribute('dir', dir);
  const tT = document.getElementById('smartTableToolbar');
  if (tT) tT.setAttribute('dir', dir);
}

function smartTextFormatBar() { return typeof document !== 'undefined' ? document.getElementById('smartTextFormatBar') : null; }

function smartTextActiveBlock() {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (active && active.closest && active.closest('#smartDocumentContent, #smartBlankCanvasHolder')) {
    const blk = active.closest('.smart-doc-text-block[data-smart-element="text"]');
    if (blk) return blk;
  }
  return document.querySelector('.smart-doc-text-block.is-active-text[data-smart-element="text"]');
}

function smartTextShowTools(show) {
  const bar = smartTextFormatBar();
  if (!bar) return;
  bar.classList.toggle('open', !!show);
  bar.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function smartTextActivateBlock(block) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.smart-doc-text-block.is-active-text').forEach((el) => {
    if (el !== block) el.classList.remove('is-active-text');
  });
  if (block) {
    block.classList.add('is-active-text');
    smartTextSyncControls(block);
  }
  smartTextShowTools(!!block);
}

// Reflect current block styles into the controls.
function smartTextSyncControls(block) {
  const bar = smartTextFormatBar();
  if (!bar || !block) return;
  const famSel = bar.querySelector('#smartTextFontFamily');
  const sizeSel = bar.querySelector('#smartTextFontSize');
  const dirSel = bar.querySelector('#smartTextDirection');
  const lsSel = bar.querySelector('#smartTextLineSpacing');
  const cs = getComputedStyle(block);
  if (famSel) {
    famSel.value = Object.keys(SMART_TEXT_FONTS).find((f) => f && cs.fontFamily.indexOf(SMART_TEXT_FONTS[f]) === 0) || '';
  }
  if (sizeSel) sizeSel.value = block.style.fontSize || '16px';
  if (dirSel) dirSel.value = block.getAttribute('dir') === 'rtl' ? 'rtl' : (block.getAttribute('dir') === 'ltr' ? 'ltr' : 'auto');
  const ratio = parseFloat(cs.lineHeight) / parseFloat(cs.fontSize);
  if (lsSel) lsSel.value = String(ratio >= 1.9 ? 2 : ratio >= 1.4 ? 1.5 : ratio >= 1.1 ? 1.15 : 1);
}

// Inline formatting via execCommand (works on the live selection inside contenteditable).
function smartTextInlineCmd(cmd) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  // execCommand only works inside the FOCUSED editing host, so focus the block
  // that actually contains the selection (may differ from activeElement).
  let node = range.commonAncestorContainer;
  if (node.nodeType === 3) node = node.parentElement;
  const block = (node && node.closest && node.closest('.smart-doc-text-block[data-smart-element="text"]')) || smartTextActiveBlock();
  if (!block) return false;
  if (document.activeElement !== block) block.focus();
  sel.removeAllRanges();
  sel.addRange(range);
  try { document.execCommand(cmd, false, null); } catch (e) { return false; }
  return true;
}

// Wrap a non-collapsed selection inside the active block with a styled span.
function smartTextWrapSelection(styles) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const block = smartTextActiveBlock();
  if (!block || !block.contains(range.commonAncestorContainer)) return false;
  let host = range.startContainer;
  if (host.nodeType === 3) host = host.parentElement;
  if (host && host.closest && block.contains(host.closest('span[style]'))) {
    host = host.closest('span[style]');
    Object.assign(host.style, styles);
    return true;
  }
  host = document.createElement('span');
  Object.keys(styles).forEach((k) => { host.style[k] = styles[k]; });
  try {
    range.surroundContents(host);
  } catch (e) {
    try { host.appendChild(range.extractContents()); range.insertNode(host); }
    catch (e2) { return false; }
  }
  sel.removeAllRanges();
  const r2 = document.createRange();
  r2.selectNodeContents(host);
  sel.addRange(r2);
  return true;
}

// Style application: selection-aware; falls back to whole active block.
function smartTextStyle(styles, opts) {
  const block = smartTextActiveBlock();
  if (!block) return false;
  if (!(opts && opts.blockLevel) && smartTextWrapSelection(styles)) return true;
  Object.keys(styles).forEach((k) => { block.style[k] = styles[k]; });
  return true;
}

function smartTextApplyFontFamily(family) { return smartTextStyle({ fontFamily: family || '' }); }
function smartTextApplyFontSize(size) { return smartTextStyle({ fontSize: size }); }
function smartTextApplyAlign(align) {
  const block = smartTextActiveBlock();
  if (!block) return false;
  block.style.textAlign = align; // alignment is inherently block-level
  return true;
}
function smartTextApplyDirection(mode) {
  const block = smartTextActiveBlock();
  if (!block) return false;
  const dir = mode === 'auto' ? smartTextLocaleDir() : mode;
  block.setAttribute('dir', dir);
  block.style.direction = dir;
  if (block.dataset.userAligned !== '1') {
    block.style.textAlign = (dir === 'rtl') ? 'right' : 'left';
  }
  return true;
}
function smartTextApplyLineSpacing(v) { return smartTextStyle({ lineHeight: v }, { blockLevel: true }); }

// Insert a new independent text block (the "T" tool).
function smartTextInsert() {
  const el = smartAddInsert('text');
  if (el && smartBlankVisible()) {
    el.focus();
    // Select the placeholder so typing replaces it.
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    smartTextActivateBlock(el);
  }
  return el;
}

function smartTextWire() {
  if (typeof document === 'undefined') return;
  const bar = smartTextFormatBar();
  if (!bar || bar.dataset.wired === '1') return;
  bar.dataset.wired = '1';
  bar.addEventListener('mousedown', (e) => e.preventDefault()); // keep text selection alive
  bar.addEventListener('click', (e) => {
    const fmtBtn = e.target && e.target.closest ? e.target.closest('[data-textfmt]') : null;
    if (fmtBtn) { smartTextInlineCmd(fmtBtn.getAttribute('data-textfmt')); return; }
    const alignBtn = e.target && e.target.closest ? e.target.closest('[data-textalign]') : null;
    if (alignBtn) {
      const block = smartTextActiveBlock();
      if (block) block.dataset.userAligned = '1';
      smartTextApplyAlign(alignBtn.getAttribute('data-textalign'));
    }
  });
  bar.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'smartTextFontFamily') smartTextApplyFontFamily(t.value);
    else if (t.id === 'smartTextFontSize') smartTextApplyFontSize(t.value);
    else if (t.id === 'smartTextDirection') smartTextApplyDirection(t.value);
    else if (t.id === 'smartTextLineSpacing') smartTextApplyLineSpacing(t.value);
  });

  // Show tools when a text block gains focus; hide when focus leaves them all.
  document.addEventListener('focusin', (e) => {
    const blk = e.target && e.target.closest ? e.target.closest('.smart-doc-text-block[data-smart-element="text"]') : null;
    if (blk && smartBlankVisible()) smartTextActivateBlock(blk);
  });
  document.addEventListener('focusout', (e) => {
    const blk = e.target && e.target.closest ? e.target.closest('.smart-doc-text-block[data-smart-element="text"]') : null;
    if (!blk) return;
    setTimeout(() => {
      const ae = document.activeElement;
      const stillIn = ae && ae.closest && ae.closest('.smart-doc-text-block[data-smart-element="text"]');
      if (!stillIn && !(bar && bar.contains(ae))) smartTextShowTools(false);
    }, 120);
  });

  smartBlankApplyDirection();
}

// PART 11 — behavior seam for tests / future phases (no future features implemented).
window.__smartText = {
  getState: () => ({
    editorVisible: smartBlankVisible(),
    toolsVisible: (() => { const b = smartTextFormatBar(); return !!(b && b.classList.contains('open')); })(),
    blockCount: (typeof document !== 'undefined') ? document.querySelectorAll('.smart-doc-text-block[data-smart-element="text"]').length : 0,
    activeIndex: (typeof document !== 'undefined') ? Array.from(document.querySelectorAll('.smart-doc-text-block')).indexOf(document.querySelector('.smart-doc-text-block.is-active-text')) : -1,
    viewDir: (typeof document !== 'undefined' && document.getElementById('smartBlankView')) ? document.getElementById('smartBlankView').getAttribute('dir') : null,
    locale: state.locale,
    overflowX: (typeof document !== 'undefined') ? document.documentElement.scrollWidth - window.innerWidth : 0
  }),
  insert: () => smartTextInsert(),
  inline: (cmd) => smartTextInlineCmd(cmd),
  fontFamily: (v) => smartTextApplyFontFamily(v),
  fontSize: (v) => smartTextApplyFontSize(v),
  align: (v) => smartTextApplyAlign(v),
  direction: (v) => smartTextApplyDirection(v),
  lineSpacing: (v) => smartTextApplyLineSpacing(v),
  activeBlockInfo: () => {
    const b = smartTextActiveBlock();
    if (!b) return null;
    const cs = getComputedStyle(b);
    return {
      dirAttr: b.getAttribute('dir'),
      direction: cs.direction,
      textAlign: cs.textAlign,
      fontFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      lineHeightRatio: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize)
    };
  }
};

// ============================================================
// PART 12 — SMART TABLE TOOL (أداة الجدول ▦)
// The ▦ toolbar button opens a small Rows × Columns picker; the
// created table lives inside #smartDocumentContent. Cells are
// individually editable (contenteditable). A contextual Table
// Toolbar (Add/Delete Row, Add/Delete Column, Per-cell alignment)
// appears only while a cell is active. Everything is scoped to
// Smart Documents — no global state, no other feature affected.
// ============================================================
function smartTableLauncherEl() { return typeof document !== 'undefined' ? smartBlankEl('smartTableCreate') : null; }
function smartTableToolsEl() { return typeof document !== 'undefined' ? smartBlankEl('smartTableToolbar') : null; }

function smartTableCellDir() { return (state && state.locale === 'ar') ? 'rtl' : 'ltr'; }
function smartTableCellAlignForDir(dir) { return dir === 'rtl' ? 'right' : 'left'; }

function smartTableMakeCell() {
  const td = document.createElement('td');
  td.setAttribute('contenteditable', 'true');
  td.dataset.smartElement = 'cell';
  const dir = smartTableCellDir();
  td.setAttribute('dir', dir);
  td.style.direction = dir;
  td.style.textAlign = smartTableCellAlignForDir(dir);
  td.innerHTML = '&nbsp;';
  return td;
}

// Create an Rows × Columns table (1..20) inside the active page content.
function smartTableCreate(rows, cols) {
  const surface = smartActivePageContent();
  if (!surface || typeof smartBlankVisible === 'function' && !smartBlankVisible()) return null;
  rows = Math.max(1, Math.min(20, parseInt(rows, 10) || 3));
  cols = Math.max(1, Math.min(20, parseInt(cols, 10) || 3));
  // Wrap in an internal scroll container so wide tables never push the page.
  const wrap = document.createElement('div');
  wrap.className = 'smart-table-scroll';
  wrap.dataset.smartElement = 'table-wrap';
  const table = document.createElement('table');
  table.className = 'smart-doc-table';
  table.dataset.smartElement = 'table';
  const dir = smartTableCellDir();
  table.setAttribute('dir', dir);
  table.style.direction = dir;
  const tbody = document.createElement('tbody');
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) tr.appendChild(smartTableMakeCell());
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  surface.appendChild(wrap);
  return table;
}
// ---- Table size launcher (opened only by the ▦ toolbar button) ----
function smartTableLauncherPosition() {
  const panel = smartTableLauncherEl();
  const view = smartBlankEl('smartBlankView');
  const btn = document.querySelector('[data-toolbar="blank-doc"] button[data-tool="table"]');
  if (!panel || !view || !btn) return;
  const vr = view.getBoundingClientRect();
  const br = btn.getBoundingClientRect();
  let left = br.left - vr.left;
  let top = br.bottom - vr.top + 6;
  const mw = panel.offsetWidth || 230;
  const mh = panel.offsetHeight || 150;
  left = Math.max(6, Math.min(left, vr.width - mw - 6));
  if (top + mh > vr.height - 6) top = Math.max(6, br.top - vr.top - mh - 6);
  panel.style.left = Math.round(left) + 'px';
  panel.style.top = Math.round(top) + 'px';
}
function smartTableLauncherOpen() {
  const panel = smartTableLauncherEl();
  if (!panel || !smartBlankVisible()) return;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  smartTableLauncherPosition();
}
function smartTableLauncherClose() {
  const panel = smartTableLauncherEl();
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
}
function smartTableLauncherToggle() {
  const panel = smartTableLauncherEl();
  if (!panel) return;
  if (panel.classList.contains('open')) smartTableLauncherClose();
  else smartTableLauncherOpen();
}
function smartTableRefreshSizePreview() {
  const rows = parseInt((smartBlankEl('smartTableRows') || {}).value, 10);
  const cols = parseInt((smartBlankEl('smartTableCols') || {}).value, 10);
  const el = smartBlankEl('smartTableCreateSize');
  if (el) el.textContent = (rows > 0 ? rows : 3) + ' × ' + (cols > 0 ? cols : 3);
}

// ---- Active cell / table awareness ----
// Keep a reference to the last active table so that add/delete/align
// still work right after the focused row/column cell is removed.
let smartLastActiveTable = null;

function smartTableActiveCell() {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement;
  if (active && active.tagName === 'TD' && active.closest &&
      active.closest('.smart-doc-table[data-smart-element="table"]')) {
    return active;
  }
  return document.querySelector('.smart-doc-table[data-smart-element="table"] td.is-active-cell') || null;
}
function smartTableActiveTable() {
  const cell = smartTableActiveCell();
  if (cell) {
    smartLastActiveTable = cell.closest('table');
    return cell.closest('table');
  }
  if (smartLastActiveTable && document.contains(smartLastActiveTable)) return smartLastActiveTable;
  return null;
}
function smartTableActivateCell(td) {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.smart-doc-table[data-smart-element="table"] td.is-active-cell').forEach((el) => {
    if (el !== td) el.classList.remove('is-active-cell');
  });
  if (td) td.classList.add('is-active-cell');
}
// After removing the active row/column, keep the table usable by focusing a
// remaining cell within it (so add/delete can continue without a relookup).
function smartTableKeepAlive(table) {
  if (!table) return;
  if (smartTableActiveCell() && smartTableActiveCell().closest('table') === table) return;
  smartLastActiveTable = table;
  const first = table.rows[0] && table.rows[0].cells[0];
  if (first) {
    first.focus();
    smartTableActivateCell(first);
  }
}
function smartTableShowTools(show) {
  const t = smartTableToolsEl();
  if (!t) return;
  t.classList.toggle('open', !!show);
  t.setAttribute('aria-hidden', show ? 'false' : 'true');
}
// ---- Row / column operations (keep existing data; never remove last row/col) ----
function smartTableAddRow() {
  const table = smartTableActiveTable();
  if (!table || !table.tBodies[0]) return false;
  const cols = table.rows[0] ? table.rows[0].cells.length : 1;
  const tr = document.createElement('tr');
  for (let c = 0; c < cols; c++) tr.appendChild(smartTableMakeCell());
  table.tBodies[0].appendChild(tr);
  return true;
}
function smartTableDelRow() {
  const table = smartTableActiveTable();
  if (!table || !table.rows.length || table.rows.length <= 1) return false;
  const cell = smartTableActiveCell();
  const row = cell && cell.closest('tr') ? cell.closest('tr') : table.rows[table.rows.length - 1];
  if (row && row.parentNode) row.parentNode.removeChild(row);
  smartTableKeepAlive(table);
  return true;
}
function smartTableAddCol() {
  const table = smartTableActiveTable();
  if (!table || !table.rows.length) return false;
  for (let i = 0; i < table.rows.length; i++) table.rows[i].appendChild(smartTableMakeCell());
  return true;
}
function smartTableDelCol() {
  const table = smartTableActiveTable();
  if (!table || !table.rows.length || table.rows[0].cells.length <= 1) return false;
  const cell = smartTableActiveCell();
  let idx = cell ? cell.cellIndex : table.rows[0].cells.length - 1;
  idx = Math.max(0, Math.min(idx, table.rows[0].cells.length - 1));
  for (let i = 0; i < table.rows.length; i++) {
    if (table.rows[i].cells[idx]) table.rows[i].deleteCell(idx);
  }
  smartTableKeepAlive(table);
  return true;
}

// ---- Per-cell alignment ----
function smartTableAlign(align) {
  const cell = smartTableActiveCell();
  if (!cell) return false;
  cell.style.textAlign = align;
  cell.dataset.userAligned = '1';
  return true;
}
// Wire the launcher + contextual table toolbar.
function smartTableWire() {
  if (typeof document === 'undefined') return;
  const tools = smartTableToolsEl();
  if (tools && tools.dataset.wired !== '1') {
    tools.dataset.wired = '1';
    tools.addEventListener('mousedown', (e) => e.preventDefault()); // keep cell selection alive
    tools.addEventListener('click', (e) => {
      const cmdBtn = e.target && e.target.closest ? e.target.closest('[data-tablecmd]') : null;
      if (cmdBtn) {
        const cmd = cmdBtn.getAttribute('data-tablecmd');
        if (cmd === 'add-row') smartTableAddRow();
        else if (cmd === 'del-row') smartTableDelRow();
        else if (cmd === 'add-col') smartTableAddCol();
        else if (cmd === 'del-col') smartTableDelCol();
        return;
      }
      const alignBtn = e.target && e.target.closest ? e.target.closest('[data-tablealign]') : null;
      if (alignBtn) smartTableAlign(alignBtn.getAttribute('data-tablealign'));
    });
  }
  const rowsIn = smartBlankEl('smartTableRows');
  const colsIn = smartBlankEl('smartTableCols');
  if (rowsIn && rowsIn.dataset.wired !== '1') { rowsIn.dataset.wired = '1'; rowsIn.addEventListener('input', smartTableRefreshSizePreview); }
  if (colsIn && colsIn.dataset.wired !== '1') { colsIn.dataset.wired = '1'; colsIn.addEventListener('input', smartTableRefreshSizePreview); }
  const confirmBtn = document.querySelector('[data-table-create="confirm"]');
  if (confirmBtn && confirmBtn.dataset.wired !== '1') {
    confirmBtn.dataset.wired = '1';
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const rows = parseInt((smartBlankEl('smartTableRows') || {}).value, 10);
      const cols = parseInt((smartBlankEl('smartTableCols') || {}).value, 10);
      const table = smartTableCreate(rows >= 1 ? rows : 3, cols >= 1 ? cols : 3);
      smartTableLauncherClose();
      if (table && table.rows[0] && table.rows[0].cells[0]) {
        const first = table.rows[0].cells[0];
        first.focus();
        smartTableActivateCell(first);
        smartTableShowTools(true);
      }
    });
  }
  // Show tools when a cell gains focus; hide when focus leaves all tables.
  document.addEventListener('focusin', (e) => {
    const td = e.target && e.target.closest ? e.target.closest('.smart-doc-table[data-smart-element="table"] td') : null;
    if (td && smartBlankVisible()) { smartTableActivateCell(td); smartTableShowTools(true); }
  });
  document.addEventListener('focusout', (e) => {
    const td = e.target && e.target.closest ? e.target.closest('.smart-doc-table[data-smart-element="table"] td') : null;
    if (!td) return;
    setTimeout(() => {
      const ae = document.activeElement;
      const stillIn = ae && ae.closest && ae.closest('.smart-doc-table[data-smart-element="table"]');
      if (!stillIn && !(tools && tools.contains(ae)) && !(smartTableLauncherEl() && smartTableLauncherEl().contains(ae))) {
        smartTableShowTools(false);
        smartTableActivateCell(null);
      }
    }, 120);
  });
}
// PART 12 — behavior seam for tests.
window.__smartTable = {
  create: (r, c) => smartTableCreate(r, c),
  addRow: () => smartTableAddRow(),
  delRow: () => smartTableDelRow(),
  addCol: () => smartTableAddCol(),
  delCol: () => smartTableDelCol(),
  align: (a) => smartTableAlign(a),
  launcherOpen: () => smartTableLauncherOpen(),
  launcherClose: () => smartTableLauncherClose(),
  getState: () => {
    const table = (typeof document !== 'undefined')
      ? document.querySelector('.smart-doc-table[data-smart-element="table"]') : null;
    const contentEl = (typeof document !== 'undefined') ? document.getElementById('smartDocumentContent') : null;
    return {
      editorVisible: smartBlankVisible(),
      launcherOpen: !!(smartTableLauncherEl() && smartTableLauncherEl().classList.contains('open')),
      toolsVisible: !!(smartTableToolsEl() && smartTableToolsEl().classList.contains('open')),
      rows: table ? table.rows.length : 0,
      cols: table && table.rows[0] ? table.rows[0].cells.length : 0,
      inContent: !!(table && contentEl && contentEl.contains(table)),
      activeRow: (() => {
        const cell = smartTableActiveCell();
        const tr = cell && cell.closest('tr');
        return tr ? Array.prototype.indexOf.call(tr.parentNode.children, tr) : -1;
      })(),
      activeCol: (() => { const cell = smartTableActiveCell(); return cell ? cell.cellIndex : -1; })(),
      overflowX: (typeof document !== 'undefined') ? document.documentElement.scrollWidth - window.innerWidth : 0
    };
  },
  cellText: (r, c) => {
    const table = (typeof document !== 'undefined')
      ? document.querySelector('.smart-doc-table[data-smart-element="table"]') : null;
    if (!table || !table.rows[r] || !table.rows[r].cells[c]) return null;
    return table.rows[r].cells[c].textContent.trim();
  },
  cellStyle: (r, c) => {
    const table = (typeof document !== 'undefined')
      ? document.querySelector('.smart-doc-table[data-smart-element="table"]') : null;
    if (!table || !table.rows[r] || !table.rows[r].cells[c]) return null;
    const td = table.rows[r].cells[c];
    return { textAlign: getComputedStyle(td).textAlign, dirAttr: td.getAttribute('dir'), direction: getComputedStyle(td).direction };
  },
  focusCell: (r, c) => {
    const table = (typeof document !== 'undefined')
      ? document.querySelector('.smart-doc-table[data-smart-element="table"]') : null;
    if (!table || !table.rows[r] || !table.rows[r].cells[c]) return false;
    table.rows[r].cells[c].focus();
    return true;
  }
};
// ============================================================
// PART 14 — SMART IMAGE TOOL (أداة الصورة 🖼)
// The existing 🖼 toolbar button (and the Add-menu Image item)
// opens the Smart Documents File Picker. The inserted image is
// wrapped in a .smart-doc-image-wrap that supports:
//   - select on click (visible border + handles)
//   - drag to move (Pointer Events — touch + mouse + pen)
//   - resize from corner handles (aspect ratio LOCKED by default)
//   - a delete control shown only while selected
//   - deselect on outside click / Escape / editor reset
// Entirely scoped to Smart Documents (#smartBlankView). No global
// state, no modals, no alert(), no external libraries.
// ============================================================
const SMART_IMAGE_MIN_W = 48;
const SMART_IMAGE_MIN_H = 32;
let smartImageSelected = null;        // currently selected <img>
let smartImageDrag = null;            // { kind:'move'|'resize', ... }
let smartImagePointerId = null;

function smartImageT() {
  const T = (state && state.locale && translations && translations[state.locale]) || translations.en;
  return (T && T.smartImageDelete) || 'Delete image';
}

function smartImageWrapOf(img) {
  return img && img.parentElement && img.parentElement.classList.contains('smart-doc-image-wrap')
    ? img.parentElement : null;
}

function smartImageContainer() {
  return document.getElementById('smartBlankCanvasHolder')
    || document.getElementById('smartBlankCanvas')
    || (smartImageSelected ? smartImageWrapOf(smartImageSelected) : null);
}

function smartImageResetState() {
  smartImageDrag = null;
  smartImagePointerId = null;
}

// Build the corner handles + delete button (idempotent).
function smartImageEnsureControls(wrap) {
  if (!wrap) return;
  if (wrap.querySelector('.smart-image-handle')) return;
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'smart-image-delete';
  del.setAttribute('aria-label', smartImageT());
  del.innerHTML = '&times;';
  wrap.appendChild(del);
  del.addEventListener('pointerdown', (e) => { e.stopPropagation(); smartImageDelete(wrap); });
  del.addEventListener('click', (e) => { e.stopPropagation(); smartImageDelete(wrap); });
  ['nw', 'ne', 'sw', 'se'].forEach((h) => {
    const handle = document.createElement('div');
    handle.className = 'smart-image-handle';
    handle.dataset.handle = h;
    wrap.appendChild(handle);
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button !== 0 && e.button !== 2) return;
      smartImageStartResize(wrap, h, e);
    });
  });
}

function smartImageDelete(wrap) {
  if (!wrap) return;
  const img = wrap.querySelector('img.smart-doc-image');
  if (img && img === smartImageSelected) smartImageSelected = null;
  if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
  smartImageResetState();
}

function smartImageActivate(img) {
  if (!img) return;
  img.setAttribute('draggable', 'false'); // PART 14 — block native drag hijacking
  smartImageDeselect();
  smartImageSelected = img;
  const wrap = smartImageWrapOf(img);
  if (wrap) {
    smartImageEnsureControls(wrap);
    wrap.classList.add('is-selected');
    img.setAttribute('aria-selected', 'true');
    wrap.setAttribute('tabindex', '-1');
  }
}

function smartImageDeselect() {
  if (!smartImageSelected) return;
  const wrap = smartImageWrapOf(smartImageSelected);
  if (wrap) {
    wrap.classList.remove('is-selected');
    smartImageSelected.setAttribute('aria-selected', 'false');
  }
  smartImageSelected = null;
  smartImageResetState();
}

function smartImageIsSelected() { return !!smartImageSelected; }

// ---- Move (drag) ----
function smartImageStartMove(wrap, e) {
  const img = wrap.querySelector('img.smart-doc-image');
  if (!img) return;
  smartImageActivate(img);
  const startRect = wrap.getBoundingClientRect();
  const startTx = parseFloat(wrap.dataset.tx || '0') || 0;
  const startTy = parseFloat(wrap.dataset.ty || '0') || 0;
  const container = smartImageContainer();
  const cRect = container ? container.getBoundingClientRect() : null;
  smartImageDrag = { kind: 'move', wrap, startTx, startTy, startRect, cRect, startX: e.clientX, startY: e.clientY };
  smartImagePointerId = e.pointerId;
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.style.touchAction = 'none';
  try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
  const onMove = (ev) => {
    if (!smartImageDrag || smartImageDrag.kind !== 'move') return;
    const d = smartImageDrag;
    const dx = ev.clientX - d.startX;
    const dy = ev.clientY - d.startY;
    let tx = d.startTx + dx;
    let ty = d.startTy + dy;
    if (d.cRect) {
      const maxTx = d.cRect.width  - d.startRect.width - 24;
      const maxTy = d.cRect.height - d.startRect.height - 24;
      tx = Math.max(-24, Math.min(tx, maxTx));
      ty = Math.max(0, Math.min(ty, maxTy));
    }
    wrap.dataset.tx = String(tx);
    wrap.dataset.ty = String(ty);
    wrap.style.transform = `translate(${tx}px, ${ty}px)`;
  };
  const onUp = () => {
    if (smartImageDrag && smartImageDrag.kind === 'move') {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      smartImageResetState();
      wrap.classList.remove('is-interacting');
      wrap.style.touchAction = '';
    }
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

// ---- Resize (aspect-locked) ----
function smartImageStartResize(wrap, handle, e) {
  const img = wrap.querySelector('img.smart-doc-image');
  if (!img) return;
  smartImageActivate(img);
  const naturalW = img.naturalWidth || 400;
  const naturalH = img.naturalHeight || 300;
  const aspect = naturalW / naturalH;
  const startRect = wrap.getBoundingClientRect();
  const container = smartImageContainer();
  const cRect = container ? container.getBoundingClientRect() : null;
  smartImageDrag = { kind: 'resize', wrap, handle, startRect, cRect, aspect, startX: e.clientX, startY: e.clientY };
  smartImagePointerId = e.pointerId;
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.classList.add('is-interacting');
  wrap.style.touchAction = 'none';
  try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
  const onMove = (ev) => {
    if (!smartImageDrag || smartImageDrag.kind !== 'resize') return;
    const d = smartImageDrag;
    const dx = ev.clientX - d.startX;
    let left = 0, top = 0;
    let w = d.startRect.width;
    if (handle === 'se' || handle === 'ne') w = d.startRect.width + dx;
    else if (handle === 'sw' || handle === 'nw') { w = d.startRect.width - dx; left = dx; }
    w = Math.max(SMART_IMAGE_MIN_W, w);
    let h = w / d.aspect;
    h = Math.max(SMART_IMAGE_MIN_H, h);
    w = Math.max(SMART_IMAGE_MIN_W, h * d.aspect);
    if (handle === 'ne' || handle === 'nw') top = d.startRect.height - h;
    if (d.cRect) {
      // Clamp to the page bounds while KEEPING the locked aspect ratio.
      const maxW = Math.max(SMART_IMAGE_MIN_W, d.cRect.width - 24);
      const maxH = Math.max(SMART_IMAGE_MIN_H, d.cRect.height - 24);
      const scale = Math.min(1, maxW / w, maxH / h);
      w *= scale; h *= scale;
      left *= scale;
      top = Math.max(-24, top * scale);
    }
    wrap.style.left = left + 'px';
    wrap.style.top = top + 'px';
    wrap.style.width = Math.round(w) + 'px';
    wrap.style.height = Math.round(h) + 'px';
    wrap.style.transform = 'translate(0, 0)';
    wrap.dataset.tx = '0'; wrap.dataset.ty = '0';
    img.style.width = '100%'; img.style.height = '100%';
  };
  const onUp = () => {
    if (smartImageDrag && smartImageDrag.kind === 'resize') {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      smartImageResetState();
      wrap.classList.remove('is-interacting');
      wrap.style.touchAction = '';
    }
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

// Single document-level wiring: select image on click, deselect on outside click.
function smartImageWire() {
  if (typeof document === 'undefined') return;
  const view = document.getElementById('smartBlankView');
  if (!view || view.dataset.imageWired === '1') return;
  view.dataset.imageWired = '1';
  view.addEventListener('click', (e) => {
    const img = e.target && e.target.closest ? e.target.closest('img.smart-doc-image') : null;
    if (img) { e.preventDefault(); smartImageActivate(img); return; }
    const t = e.target;
    if (t && t.classList && (t.classList.contains('smart-image-handle') || t.classList.contains('smart-image-delete'))) return;
    if (!t.closest('.smart-doc-image-wrap')) smartImageDeselect();
  });
  view.addEventListener('pointerdown', (e) => {
    const wrap = e.target && e.target.closest ? e.target.closest('.smart-doc-image-wrap') : null;
    if (!wrap) return;
    const onCtrl = !!(e.target && e.target.classList &&
      (e.target.classList.contains('smart-image-handle') || e.target.classList.contains('smart-image-delete')));
    if (onCtrl) return;
    if (e.button !== 0 && e.button !== 2) return;
    const img = wrap.querySelector('img.smart-doc-image');
    smartImageActivate(img);
    smartImageStartMove(wrap, e);
  });
  view.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && smartImageIsSelected()) {
      e.preventDefault(); smartImageDeselect();
    }
  });
}

// PART 14 — behavior seam for tests.
window.__smartImage = {
  selected: () => !!smartImageSelected,
  getState: () => {
    const img = smartImageSelected;
    if (!img) return { editorVisible: smartBlankVisible(), selected: false };
    const wrap = smartImageWrapOf(img);
    const r = wrap ? wrap.getBoundingClientRect() : img.getBoundingClientRect();
    return {
      editorVisible: smartBlankVisible(),
      selected: true,
      inContent: !!(document.getElementById('smartDocumentContent') && document.getElementById('smartDocumentContent').contains(wrap)),
      width: Math.round(r.width),
      height: Math.round(r.height),
      translate: { tx: parseFloat(wrap && wrap.dataset.tx || '0') || 0, ty: parseFloat(wrap && wrap.dataset.ty || '0') || 0 }
    };
  },
  deselect: () => smartImageDeselect(),
  abort: () => smartImageResetState()
};

// ============================================================
// PART 15 — SMART LOGO TOOL (شعار الشركة ◉)
// The existing ◉ "Logo" toolbar button opens a dedicated image
// File Picker. The chosen image is inserted as an independent,
// fixed-position logo inside each A4 page. The logo keeps its
// aspect ratio, stays inside the page, never causes horizontal
// overflow, and its position (top-right / top-left / center) is
// chosen via a small in-editor control. Entirely scoped to Smart
// Documents (#smartBlankView).
// NOTE: No persistent storage here. A reusable logo library is a
// future PART. This phase only exposes a small local hook (state
// + behavior seam) — no cloud, no IndexedDB, no sync.
// ============================================================
const SMART_LOGO_DEFAULT_POS = 'top-right';
let smartLogoPosition = SMART_LOGO_DEFAULT_POS;

function smartLogoBarEl() { return document.getElementById('smartLogoBar'); }

function smartLogoWraps() {
  return Array.from(document.querySelectorAll(
    '#smartBlankCanvasHolder .smart-doc-logo-wrap[data-smart-element="logo-wrap"]'
  ));
}

// Apply the chosen position to every logo element in the document and
// reflect it on the position selector buttons.
function smartLogoApplyPosition(pos) {
  if (['top-right', 'top-left', 'center'].indexOf(pos) === -1) pos = SMART_LOGO_DEFAULT_POS;
  smartLogoPosition = pos;
  smartLogoWraps().forEach((w) => w.setAttribute('data-logo-position', pos));
  const bar = smartLogoBarEl();
  if (bar) {
    Array.from(bar.querySelectorAll('.smart-logo-pos')).forEach((b) => {
      b.setAttribute('aria-pressed', b.getAttribute('data-logo-pos') === pos ? 'true' : 'false');
    });
  }
}

// Show / hide the position selector based on whether any logo exists.
function smartLogoSync() {
  const bar = smartLogoBarEl();
  if (!bar) return;
  const hasLogo = smartLogoWraps().length > 0;
  bar.classList.toggle('open', hasLogo);
  bar.setAttribute('aria-hidden', hasLogo ? 'false' : 'true');
}

// Insert a chosen image (data URL) as a logo inside the active page.
function smartLogoInsertDataUrl(dataUrl, alt) {
  const surface = smartActivePageContent();
  if (!surface) return null;
  const wrap = document.createElement('div');
  wrap.className = 'smart-doc-logo-wrap';
  wrap.dataset.smartElement = 'logo-wrap';
  wrap.setAttribute('data-logo-position', smartLogoPosition);
  const img = document.createElement('img');
  img.className = 'smart-doc-logo';
  img.dataset.smartElement = 'logo';
  img.src = String(dataUrl);
  img.alt = alt || '';
  img.draggable = false;
  wrap.appendChild(img);
  surface.appendChild(wrap);
  smartLogoApplyPosition(smartLogoPosition);
  smartLogoSync();
  return wrap;
}

// The ◉ toolbar button just opens the Logo File Picker; the change
// handler in smartLogoWire() performs the actual read + insert.
function smartLogoInsert() {
  const input = document.getElementById('smartAddLogoInput');
  if (input) input.click();
  return input || null;
}

// Wire the Logo File Picker + the position selector (idempotent).
function smartLogoWire() {
  if (typeof document === 'undefined') return;
  if (smartLogoBarEl() && smartLogoBarEl().dataset.logoWired === '1') return;
  const bar = smartLogoBarEl();
  if (bar) {
    bar.dataset.logoWired = '1';
    bar.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('.smart-logo-pos') : null;
      if (!btn) return;
      e.preventDefault();
      smartLogoApplyPosition(btn.getAttribute('data-logo-pos'));
    });
  }
  const input = document.getElementById('smartAddLogoInput');
  if (input) {
    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const inputEl = e.target;
      const reader = new FileReader();
      reader.onload = () => {
        smartLogoInsertDataUrl(String(reader.result), file.name || '');
        inputEl.value = '';
      };
      reader.readAsDataURL(file);
    });
  }
}

// PART 15 — behavior / configuration seam for tests + a small local
// architecture hook that a future persistence PART can build on.
window.__smartLogo = {
  getState: () => {
    const wraps = smartLogoWraps();
    const view = document.getElementById('smartBlankView');
    return {
      editorVisible: smartBlankVisible(),
      position: smartLogoPosition,
      activePosition: wraps.length
        ? (wraps[0].getAttribute('data-logo-position') || smartLogoPosition) : smartLogoPosition,
      count: wraps.length,
      viewDir: view ? (view.getAttribute('dir') || '') : '',
      logos: wraps.map((w) => {
        const img = w.querySelector('img.smart-doc-logo');
        const rect = (img || w).getBoundingClientRect();
        const page = w.closest('.smart-blank-canvas');
        const pageRect = page ? page.getBoundingClientRect() : null;
        return {
          position: w.getAttribute('data-logo-position'),
          srcType: img && img.src ? img.src.split(':')[0] : '',
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          withinPage: !!(pageRect && rect.left >= pageRect.left - 1 && rect.right <= pageRect.right + 1),
          aspect: img && rect.height ? +(rect.width / rect.height).toFixed(3) : 0
        };
      })
    };
  },
  setPosition: (pos) => smartLogoApplyPosition(pos),
  insert: (dataUrl, alt) => smartLogoInsertDataUrl(dataUrl, alt || '')
};

// ============================================================
// PART 7 — SMART DOCUMENTS TEMPLATES (scoped to Smart Documents only)
// Categories: Business / Personal / Custom. Selecting a template only
// records a selection hook (state.smartSelectedTemplate) for the next
// phase — it does NOT open any editor or any feature outside Smart Docs.
// ============================================================
const smartTemplatesViewEl = typeof document !== 'undefined' ? document.getElementById('smartTemplatesView') : null;

function smartTemplatesEl(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function smartTemplatesVisible() {
  return !!(smartTemplatesViewEl && smartTemplatesViewEl.classList.contains('templates-visible'));
}

function smartTemplatesRenderSelection() {
  const selected = (state && state.smartSelectedTemplate) || null;
  const items = typeof document !== 'undefined' ? document.querySelectorAll('.smart-template-item') : [];
  items.forEach((el) => {
    const id = el.getAttribute('data-template-id');
    el.classList.toggle('is-selected', !!(selected && selected.id === id));
  });
}

function smartTemplatesSelect(id, group) {
  if (!id) return null;
  state.smartSelectedTemplate = { id: String(id), group: group || null };
  smartTemplatesRenderSelection();
  return state.smartSelectedTemplate;
}

function smartTemplatesResetSelection() {
  state.smartSelectedTemplate = null;
  smartTemplatesRenderSelection();
}

// Open the templates section (hide the Smart Documents home page).
function smartTemplatesOpen() {
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = 'none';
  const v = smartTemplatesEl('smartTemplatesView');
  if (v) { v.classList.add('templates-visible'); v.setAttribute('aria-hidden', 'false'); }
  smartTemplatesResetSelection();
  setSmartDocsStep(1);
}

// Restore the Smart Documents home and clear any selection state.
function smartTemplatesResetToHome() {
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = '';
  const v = smartTemplatesEl('smartTemplatesView');
  if (v) { v.classList.remove('templates-visible'); v.setAttribute('aria-hidden', 'true'); }
  smartTemplatesResetSelection();
  if (typeof setSmartDocsStep === 'function') setSmartDocsStep(1);
}

// PART 7 — test / configuration seam.
window.__smartTemplates = {
  getState: () => ({
    visible: smartTemplatesVisible(),
    selected: (state && state.smartSelectedTemplate) || null,
    groups: {
      business: typeof document !== 'undefined' ? document.querySelectorAll('.smart-template-group[data-template-group="business"] .smart-template-item').length : 0,
      personal: typeof document !== 'undefined' ? document.querySelectorAll('.smart-template-group[data-template-group="personal"] .smart-template-item').length : 0,
      custom: typeof document !== 'undefined' ? document.querySelectorAll('.smart-template-group[data-template-group="custom"] .smart-template-item').length : 0
    },
    total: typeof document !== 'undefined' ? document.querySelectorAll('.smart-template-item').length : 0
  }),
  open: () => smartTemplatesOpen(),
  reset: () => smartTemplatesResetToHome(),
  select: (id, group) => smartTemplatesSelect(id, group),
  clearSelection: () => smartTemplatesResetSelection()
};

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

function createFolder(name) {
  const trimmed = (name || '').trim();
  if (!trimmed || folderNameExists(trimmed)) return null;
  const folder = {
    id: makeFolderId(),
    name: trimmed,
    createdAt: Date.now()
  };
  state.folders.push(folder);
  saveFolders();
  return folder;
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

// Read the current DOM of the rich editor and produce a plain-text body plus
// a minimal, safe set of formatting runs {start, end, bold, italic, underline}.
// Only BOLD / ITALIC / UNDERLINE are ever recorded. The body stays plain text so
// existing plain-text notes and all old checks keep working.
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

// Render a plain-text body plus formatting runs back into safe HTML that can be
// set on the contenteditable editor. Produces ONLY <b>/<i>/<u>/<br> around
// escaped text — never parses or injects untrusted content.
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
      if (openList !== listType) { closeList(); out.push('<' + listType + '>'); openList = listType; }
      out.push('<li' + alignStyle + '>' + (inner || '<br>') + '</li>');
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
let noteImageSelected = null;    // active .note-image-block element
let noteImageDrag = null;        // { kind:'resize'|'move', ... }
let noteImagePointerId = null;

function clampNoteImageWidth(w) {
  w = Math.round(typeof w === 'number' ? w : (parseFloat(w) || 0));
  if (!Number.isFinite(w) || w <= 0) w = 320;
  return Math.max(NOTE_IMAGE_MIN_W, Math.min(w, NOTE_IMAGE_MAX_W));
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
  return '<div class="note-image-block" contenteditable="false" data-image-align="' + align + '" data-image-width="' + w + '">' +
    '<div class="note-image-frame">' +
      '<img class="note-image-elem" src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '" draggable="false" style="width:' + w + 'px">' +
      '<div class="note-image-grip nw" data-grip="nw"></div>' +
      '<div class="note-image-grip ne" data-grip="ne"></div>' +
      '<div class="note-image-grip sw" data-grip="sw"></div>' +
      '<div class="note-image-grip se" data-grip="se"></div>' +
      '<div class="note-image-ctl">' +
        '<button type="button" class="note-image-align" data-align="left" aria-label="Align left" title="Align left">&#8592;</button>' +
        '<button type="button" class="note-image-align" data-align="center" aria-label="Align center" title="Align center">&#8596;</button>' +
        '<button type="button" class="note-image-align" data-align="right" aria-label="Align right" title="Align right">&#8594;</button>' +
        '<button type="button" class="note-image-del" aria-label="Delete image" title="Delete image">&times;</button>' +
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
  return block;
}

// --- Insert at caret (same hoisting pattern as insertNoteDivider) ---
function insertNoteImageAtCaret(blockEl) {
  const trailing = document.createElement('div');
  trailing.className = 'note-block';
  trailing.innerHTML = '<br>';
  const sel = window.getSelection();
  let range = (sel && sel.rangeCount && noteBodyInput.contains(sel.getRangeAt(0).commonAncestorContainer))
    ? sel.getRangeAt(0).cloneRange() : null;
  let hoisted = false;
  if (range) {
    let sc = range.startContainer;
    if (sc.nodeType === 3) sc = sc.parentElement;
    if (sc && sc !== noteBodyInput) {
      let anchor = sc;
      while (anchor && anchor.parentElement !== noteBodyInput) anchor = anchor.parentElement;
      if (anchor) {
        anchor.parentElement.insertBefore(blockEl, anchor.nextSibling);
        blockEl.parentNode.insertBefore(trailing, blockEl.nextSibling);
        hoisted = true;
      } else {
        range = null;
      }
    }
  }
  if (!hoisted && range) {
    range.deleteContents();
    range.insertNode(blockEl);
    blockEl.parentNode.insertBefore(trailing, blockEl.nextSibling);
  } else if (!hoisted) {
    noteBodyInput.appendChild(blockEl);
    noteBodyInput.appendChild(trailing);
  }
  return blockEl;
}

function insertNoteImageBlock(data) {
  if (!noteBodyInput) return null;
  const tmp = document.createElement('div');
  tmp.innerHTML = buildNoteImageBlockHTML(data);
  let blockEl = tmp.firstElementChild;
  if (!blockEl) return null;
  blockEl = insertNoteImageAtCaret(blockEl);
  noteImageDeselect();
  noteImageSelect(blockEl);
  bindNoteImageBlock(blockEl);
  scheduleNoteSave();
  return blockEl;
}

// Insert a chosen image (data URL). Intrinsic size is preferred so
// high-res images keep full quality unless they exceed sane display bounds.
function insertNoteImageDataUrl(dataUrl, alt) {
  let width = 320;
  const probe = new Image();
  probe.onload = () => {
    const natural = probe.naturalWidth || 640;
    width = clampNoteImageWidth(natural > 960 ? 640 : natural);
    insertNoteImageBlock({ type: 'image', src: dataUrl, alt: alt || '', width, align: 'left' });
  };
  probe.onerror = () => { insertNoteImageBlock({ type: 'image', src: dataUrl, alt: alt || '', width, align: 'left' }); };
  probe.src = dataUrl;
}

// Read a file → data URL → insert. PNG/JPG/WebP accepted.
function noteImageReadAndInsert(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (!/image\/(png|jpe?g|webp|gif|bmp|svg\+xml)/.test(type)) return false;
  const reader = new FileReader();
  reader.onload = (e) => { insertNoteImageDataUrl(String(e.target && e.target.result || ''), file.name || ''); };
  reader.onerror = () => {};
  reader.readAsDataURL(file);
  return true;
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
    const nw = clampNoteImageWidth(d.startW + (ev.clientX - d.startX) * (grip === 'nw' || grip === 'sw' ? -1 : 1));
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
  noteImageDrag = { kind: 'move', blockEl, startY };
  noteImagePointerId = e.pointerId;
  blockEl.style.touchAction = 'none';
  try { blockEl.setPointerCapture(e.pointerId); } catch (err) {}
  const onMove = (ev) => {
    const d = noteImageDrag;
    if (!d || d.kind !== 'move') return;
    if (!moved && Math.abs(ev.clientY - startY) > 6) {
      moved = true;
      blockEl.classList.add('is-moving-active');
    }
    if (moved) noteImageMoveBlockEl(d.blockEl, ev.clientY);
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    if (noteImageDrag && noteImageDrag.kind === 'move') {
      blockEl.classList.remove('is-moving');
      blockEl.classList.remove('is-moving-active');
      blockEl.style.touchAction = '';
      if (moved) noteImageDeselect();
    }
    noteImageResetState();
    if (moved && typeof scheduleNoteSave === 'function') scheduleNoteSave();
  };
  e.preventDefault();
  e.stopPropagation();
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}

// --- Align -----------------------------------------------------
function noteImageSetAlign(blockEl, align) {
  if (!blockEl || NOTE_IMAGE_ALIGNS.indexOf(align) === -1) return;
  blockEl.setAttribute('data-image-align', align);
  if (typeof scheduleNoteSave === 'function') scheduleNoteSave();
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
  const del = blockEl.querySelector('.note-image-del');
  if (del) {
    del.addEventListener('pointerdown', (e) => e.stopPropagation());
    del.addEventListener('click', (e) => { e.stopPropagation(); noteImageDelete(blockEl); });
  }
}

// Re-bind image controls after renderNoteBody swaps innerHTML.
function initNoteImageBlocks(root) {
  if (!root) return;
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
function buildNotePdfImageBlockHTML(block) {
  const src = (block && typeof block.src === 'string') ? block.src : '';
  const alt = (block && typeof block.alt === 'string') ? block.alt : '';
  const w = clampNoteImageWidth(block && block.width);
  const align = normalizeNoteImageAlign(block && block.align);
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
  const brandTitle = 'EQ Calculator';
  const brandSub = 'Note';
  const footerNote = 'Created with EQ Calculator';
  const footerTagline = 'Smart calculations. Simple results.';
  const title = (note && typeof note.title === 'string' && note.title) || (t.untitled || 'Untitled');
  const hasBlocks = Array.isArray(note && note.bodyBlocks) && note.bodyBlocks.length;
  const bodyHtml = hasBlocks
    ? buildNotePdfBodyHTML(note.bodyBlocks)
    : '<div class="eq-pdf-text-block">' + buildNoteBodyHTML(note && note.body, note && note.bodyFormatting) + '</div>';
  const ts = (note && note.updatedAt) || Date.now();
  const exportedAt = String(new Date(ts).toLocaleString(t.locale || undefined));
  const titleDir = pdfCellDir(title);

  // PHASE 09: session presentation options (template / header / footer / watermark).
  const docOptions = notePdfDocOptions || {};
  const tplName = NOTE_PDF_TPL_NAMES.indexOf(docOptions.template) !== -1 ? docOptions.template : 'report';
  const tplClass = tplName === 'report' ? '' : ' eq-pdf-tpl-' + tplName;
  // PART 08 — carry the note's Style/Frame onto the PDF report container so the
  // exported PDF keeps the chosen starting design (fonts/headings/spacing/colors/
  // table styling + frame). Zero-specificity rules are injected in the PDF <style>.
  const pdfStyleId = (note && typeof note.styleId === 'string' && NOTE_STYLE_IDS.indexOf(note.styleId) !== -1) ? note.styleId : '';
  const pdfFrameId = (note && typeof note.frame === 'string' && NOTE_FRAME_IDS.indexOf(note.frame) !== -1) ? note.frame : '';
  // PART 11 — Export dialog overrides (session-only). Style: the dialog choice
  // wins for THIS export only; the note's saved Style is untouched. Title: the
  // dialog value wins; empty falls back to the note title, then to "Untitled"
  // so an export is never blocked. Date: optional checkbox. Company Profile:
  // reuses the existing savedCompanyName() store; missing/incomplete profile
  // never blocks the export (the line is simply omitted).
  const expOpts = (typeof notePdfExportOptions === 'object' && notePdfExportOptions) || {};
  const expStyleId = (typeof expOpts.styleId === 'string' && NOTE_STYLE_IDS.indexOf(expOpts.styleId) !== -1) ? expOpts.styleId : '';
  const pdfStyleClass = (expStyleId || pdfStyleId) ? ' note-style-' + (expStyleId || pdfStyleId) : '';
  const expTitle = (typeof expOpts.title === 'string' && expOpts.title.trim()) ? expOpts.title.trim() : '';
  const exportTitle = expTitle || ((note && typeof note.title === 'string' && note.title.trim()) ? note.title.trim() : (t.untitled || 'Untitled'));
  const showExportDate = expOpts.date !== false;
  const companyName = (expOpts.company && typeof savedCompanyName === 'function') ? savedCompanyName() : '';
  const companyHtml = companyName
    ? '<div class="eq-pdf-company" dir="' + pdfCellDir(companyName) + '">' + escapeHtml(companyName) + '</div>'
    : '';
  // PART 13 — Company Profile injection. When "Use Company Profile" is checked and
  // a profile exists, the logo / signature / stamp / footer are added to the PDF
  // (read-only; never mutates the note or the profile). The company name above
  // already reflects the profile's name (seeded into the legacy store on save).
  // Data is inline (data URLs) so the existing html2pdf pipeline renders them with
  // zero engine changes. Missing/incomplete profile never blocks the export.
  const expCompany = !!(expOpts.company);
  let companyBlock = '';
  if (expCompany) {
    const prof = (typeof loadCompanyProfile === 'function') ? loadCompanyProfile() : null;
    if (prof && typeof prof === 'object') {
      const parts = [];
      const addImg = (src, cls, maxw) => {
        if (!(typeof src === 'string' && src.indexOf('data:image/') === 0)) return;
        parts.push('<img class="' + cls + '" src="' + escapeHtml(src) + '" style="max-width:' + maxw + 'px;height:auto;" alt="">');
      };
      addImg(prof.logo, 'eq-pdf-company-logo', 120);
      if (prof.address && prof.address.trim()) parts.push('<div class="eq-pdf-company-line" dir="' + pdfCellDir(prof.address) + '">' + escapeHtml(prof.address) + '</div>');
      const contact = [];
      if (prof.phone && prof.phone.trim()) contact.push('<span class="eq-pdf-company-item">' + escapeHtml(prof.phone) + '</span>');
      if (prof.email && prof.email.trim()) contact.push('<span class="eq-pdf-company-item">' + escapeHtml(prof.email) + '</span>');
      if (prof.website && prof.website.trim()) contact.push('<span class="eq-pdf-company-item">' + escapeHtml(prof.website) + '</span>');
      if (contact.length) parts.push('<div class="eq-pdf-company-contact" dir="' + (companyName && pdfCellDir(companyName) || 'ltr') + '">' + contact.join('<span class="eq-pdf-company-sep"> · </span>') + '</div>');
      addImg(prof.signature, 'eq-pdf-company-signature', 160);
      addImg(prof.stamp, 'eq-pdf-company-stamp', 90);
      if (prof.footer && prof.footer.trim()) parts.push('<div class="eq-pdf-company-footer" dir="' + pdfCellDir(prof.footer) + '">' + escapeHtml(prof.footer) + '</div>');
      if (parts.length) companyBlock = '<div class="eq-pdf-company-block">' + companyHtml + parts.join('') + '</div>';
    }
  }
  if (!companyBlock) companyBlock = companyHtml;
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
<title>EQ Note PDF</title>
<style>
  .eq-note-report { color:#000000; background:#ffffff; font-family:"Segoe UI", Tahoma, "Noto Sans", "Noto Naskh Arabic", Arial, sans-serif; font-size:13px; line-height:1.6; }
  .eq-note-header { border-bottom:2px solid #0891b2; padding-bottom:8px; margin-bottom:14px; page-break-after:avoid; break-after:avoid; }
  .eq-note-header h1 { margin:0; font-size:18px; color:#000000; letter-spacing:0.3px; }
  .eq-note-header .sub { font-size:12px; color:#000000; margin-top:2px; }
  .eq-note-header .meta { font-size:11px; color:#000000; margin-top:3px; }
  .eq-note-title { font-size:20px; color:#000000; margin:14px 0 10px; line-height:1.4; white-space:normal; word-break:break-word; overflow-wrap:anywhere; page-break-after:avoid; break-after:avoid; }
  .eq-pdf-text-block { color:#000000; margin:0 0 12px; font-size:13px; line-height:1.6; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap; }
  .eq-pdf-text-block:last-child { margin-bottom:0; }
  /* PHASE 03 — headings/lists flow from buildNoteBodyHTML into the PDF via the
     existing pipeline; only presentation CSS for the block tags is added. */
  .eq-note-body h1, .eq-note-body h2, .eq-note-body h3 { color:#000000; margin:14px 0 6px; line-height:1.35; word-break:break-word; overflow-wrap:anywhere; page-break-after:avoid; break-after:avoid; }
  .eq-note-body h1:first-child, .eq-note-body h2:first-child, .eq-note-body h3:first-child { margin-top:0; }
  .eq-note-body h1 { font-size:19px; font-weight:700; }
  .eq-note-body h2 { font-size:16.5px; font-weight:700; }
  .eq-note-body h3 { font-size:14.5px; font-weight:700; }
  .eq-note-body ul, .eq-note-body ol { margin:6px 0 12px; padding-inline-start:24px; }
  .eq-note-body li { margin:2px 0; line-height:1.6; word-break:break-word; overflow-wrap:anywhere; }
  .eq-pdf-table-wrap { margin:12px 0; max-width:100%; }
  .eq-pdf-image-block { margin:8px 0; max-width:100%; }
  .eq-pdf-image-block .eq-pdf-image { display:block; height:auto; max-width:100%; }
  .eq-pdf-image-block[data-image-align="left"] .eq-pdf-image { margin-right:auto; }
  .eq-pdf-image-block[data-image-align="center"] .eq-pdf-image { margin-left:auto; margin-right:auto; }
  .eq-pdf-image-block[data-image-align="right"] .eq-pdf-image { margin-left:auto; }
  .eq-pdf-note-table { width:100%; border-collapse:collapse; table-layout:auto; }
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
</style>
</head>
<body>
  <div class="eq-note-report${tplClass}${pdfStyleClass}${pdfFrameClass}" id="note-report">
    ${wm ? '<div class="eq-pdf-watermark" style="opacity:' + wm.opacity + '">' + escapeHtml(wm.text) + '</div>' : ''}
    <div class="eq-note-header">
      <h1>${escapeHtml(brandTitle)}</h1>
      <div class="sub">${escapeHtml(brandSub)}</div>
      ${showHeader ? '<div class="eq-pdf-header-note" dir="' + titleDir + '">' + escapeHtml(exportTitle) + '</div>' : ''}
      ${companyBlock}
      ${showExportDate ? '<div class="meta"' + (pdfCellDir(title + ' ' + (note && (note.body || ''))) === 'rtl' ? ' dir="rtl"' : '') + '>' + escapeHtml(exportedAt) + '</div>' : ''}
    </div>
    <h2 class="eq-note-title" dir="${pdfCellDir(exportTitle)}">${escapeHtml(exportTitle)}</h2>
    <div class="eq-note-body">${bodyHtml}</div>
    <div class="eq-note-footer">
      <div class="fb">${escapeHtml(footerNote)}</div>
      ${showFooter && showExportDate ? '<div class="fmt">' + escapeHtml(footerMeta) + '</div>' : ''}
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
  // PART 11 — the export options (Style/Title/Date/Company) are session-only but
  // MUST be part of the cache signature, or a pre-warmed blob built with the
  // default options would be returned after the user changes them in the Export
  // dialog (stale PDF). Changing any dialog choice therefore yields a fresh blob.
  const eo = (typeof notePdfExportOptions === 'object' && notePdfExportOptions) || {};
  let blocks = '';
  let fmt = '';
  try { blocks = (note && Array.isArray(note.bodyBlocks)) ? JSON.stringify(note.bodyBlocks) : ''; } catch (e) { blocks = ''; }
  try { fmt = (note && Array.isArray(note.bodyFormatting)) ? JSON.stringify(note.bodyFormatting) : ''; } catch (e) { fmt = ''; }
  return [
    note && note.id, note && note.title, note && note.body,
    state.locale, o.template, o.header, o.footer,
    o.watermark && o.watermark.on, o.watermark && o.watermark.text,
    blocks, fmt,
    eo.styleId || '', eo.title || '', eo.date === false ? '0' : '1', eo.company === true ? '1' : '0'
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
    const cleanup = () => {
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
      window.html2pdf()
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
        .from(el)
        .toPdf()
        .output('blob')
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

// PART 11 — Note → PDF Export dialog options. Session-only (editor session),
// NEVER persisted to the note: Style override, Title override, Date on/off,
// Company Profile on/off. All optional — empty/unset values fall back to the
// note's own data so the user is never forced to fill anything in.
const notePdfExportOptions = { styleId: '', title: '', date: true, company: false };
// PART 11 — Note → PDF Export dialog DOM (session-only wiring). All controls are
// optional; empty/unset values fall back to the note's own data. Read by
// openNoteExportPdfDialog/collectNoteExportPdfOptions and consumed by
// buildNotePdfHtml.
const noteExportPdfModal = typeof document !== 'undefined' ? document.getElementById('noteExportPdfModal') : null;
const noteExportPdfClose = typeof document !== 'undefined' ? document.getElementById('noteExportPdfClose') : null;
const noteExportStyle = typeof document !== 'undefined' ? document.getElementById('noteExportStyle') : null;
const noteExportTitle = typeof document !== 'undefined' ? document.getElementById('noteExportTitle') : null;
const noteExportDate = typeof document !== 'undefined' ? document.getElementById('noteExportDate') : null;
const noteExportCompany = typeof document !== 'undefined' ? document.getElementById('noteExportCompany') : null;
const noteExportPreviewBtn = typeof document !== 'undefined' ? document.getElementById('noteExportPreviewBtn') : null;
const noteExportCreateBtn = typeof document !== 'undefined' ? document.getElementById('noteExportCreateBtn') : null;

// ============================================================================
// PART 13 — Company Profile (Notes/PDF only). A single persisted profile
// (companyName, logo, address, phone, email, website, signature, stamp, footer)
// stored in localStorage under COMPANY_PROFILE_KEY. All fields optional. The
// Company Name is kept compatible with the existing HISTORY_COMPANY_KEY store
// (used by the History export and by PART 11's "Use Company Profile"): loading
// a profile that has a company name also seeds that store, and saving seeds it
// too — so Part 11's PDF company line keeps working with zero engine changes.
// No backend / no Supabase / no new database.
// ============================================================================
const COMPANY_PROFILE_KEY = 'eq-note-company-profile';
const COMPANY_PREVIEW_MAXW = 340;   // logo/signature/stamp downscale preview width
let companyProfileModal = typeof document !== 'undefined' ? document.getElementById('companyProfileModal') : null;
let companyProfileClose = typeof document !== 'undefined' ? document.getElementById('companyProfileClose') : null;
let companyProfileCancel = typeof document !== 'undefined' ? document.getElementById('companyProfileCancel') : null;
let companyProfileSave = typeof document !== 'undefined' ? document.getElementById('companyProfileSave') : null;
let cpCompanyName = typeof document !== 'undefined' ? document.getElementById('cpCompanyName') : null;
let cpAddress = typeof document !== 'undefined' ? document.getElementById('cpAddress') : null;
let cpPhone = typeof document !== 'undefined' ? document.getElementById('cpPhone') : null;
let cpEmail = typeof document !== 'undefined' ? document.getElementById('cpEmail') : null;
let cpWebsite = typeof document !== 'undefined' ? document.getElementById('cpWebsite') : null;
let cpLogoInput = typeof document !== 'undefined' ? document.getElementById('cpLogoInput') : null;
let cpLogoBtn = typeof document !== 'undefined' ? document.getElementById('cpLogoBtn') : null;
let cpLogoPreview = typeof document !== 'undefined' ? document.getElementById('cpLogoPreview') : null;
let cpSigInput = typeof document !== 'undefined' ? document.getElementById('cpSigInput') : null;
let cpSigUploadBtn = typeof document !== 'undefined' ? document.getElementById('cpSigUploadBtn') : null;
let cpSigDrawBtn = typeof document !== 'undefined' ? document.getElementById('cpSigDrawBtn') : null;
let cpSigPreview = typeof document !== 'undefined' ? document.getElementById('cpSigPreview') : null;
let cpSigCanvasWrap = typeof document !== 'undefined' ? document.getElementById('cpSigCanvasWrap') : null;
let cpSigCanvas = typeof document !== 'undefined' ? document.getElementById('cpSigCanvas') : null;
let cpSigClearBtn = typeof document !== 'undefined' ? document.getElementById('cpSigClearBtn') : null;
let cpSigSaveBtn = typeof document !== 'undefined' ? document.getElementById('cpSigSaveBtn') : null;
let cpStampInput = typeof document !== 'undefined' ? document.getElementById('cpStampInput') : null;
let cpStampBtn = typeof document !== 'undefined' ? document.getElementById('cpStampBtn') : null;
let cpStampPreview = typeof document !== 'undefined' ? document.getElementById('cpStampPreview') : null;
let cpFooter = typeof document !== 'undefined' ? document.getElementById('cpFooter') : null;
let cpTextColorInput = typeof document !== 'undefined' ? document.getElementById('noteTextColorInput') : null;
let openCompanyProfileBtn = typeof document !== 'undefined' ? document.getElementById('openCompanyProfileBtn') : null;

// Session scratch (not persisted directly; the modal is read on Save).
let cpDraft = { logo: '', signature: '', stamp: '' };

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
    // returns the profile name for the Part 11 "Use Company Profile" PDF line.
    if (clean.companyName) {
      try { saveCompanyName(clean.companyName); } catch (e) {}
      try { localStorage.setItem(HISTORY_COMPANY_KEY, clean.companyName); } catch (e) {}
    }
    return clean;
  } catch (e) { return null; }
}

// Read an uploaded image into a data URL, reusing the same proven pattern as the
// Notes image upload (FileReader().readAsDataURL, see app.js insert-note-image).
// Aspect ratio is preserved natively (the stored data URL is the source image and
// renders with height:auto). A reasonable size guard rejects files that are too
// large so the profile never bloats localStorage.
function companyScaleImage(file, maxW) {
  void maxW; // aspect ratio is preserved natively by the <img>/PDF (height:auto)
  return new Promise((resolve) => {
    if (!file) { resolve(''); return; }
    const type = String(file.type || '').toLowerCase();
    if (!/image\/(png|jpe?g|webp|gif|bmp|svg\+xml)/.test(type)) { resolve(''); return; }
    if (typeof file.size === 'number' && file.size > (4 * 1024 * 1024)) { resolve(''); return; } // ~4MB limit
    let reader = null;
    try { reader = new FileReader(); } catch (e) { resolve(''); return; }
    reader.onload = (e) => {
      const dataUrl = String(((e && e.target && e.target.result) || reader.result) || '');
      resolve(/^data:image\//.test(dataUrl) ? dataUrl : '');
    };
    reader.onerror = () => resolve('');
    try { reader.readAsDataURL(file); } catch (e) { resolve(''); }
  });
}

function companySetPreview(el, dataUrl, label) {
  if (!el) return;
  if (!dataUrl) { el.removeAttribute('src'); el.classList.add('hidden'); return; }
  el.src = dataUrl;
  el.alt = label || 'preview';
  el.classList.remove('hidden');
}

function openCompanyProfile() {
  const p = loadCompanyProfile() || {};
  if (cpCompanyName) cpCompanyName.value = p.companyName || '';
  if (cpAddress) cpAddress.value = p.address || '';
  if (cpPhone) cpPhone.value = p.phone || '';
  if (cpEmail) cpEmail.value = p.email || '';
  if (cpWebsite) cpWebsite.value = p.website || '';
  if (cpFooter) cpFooter.value = p.footer || '';
  cpDraft.logo = p.logo || '';
  cpDraft.signature = p.signature || '';
  cpDraft.stamp = p.stamp || '';
  companySetPreview(cpLogoPreview, cpDraft.logo, 'logo');
  companySetPreview(cpSigPreview, cpDraft.signature, 'signature');
  companySetPreview(cpStampPreview, cpDraft.stamp, 'stamp');
  if (cpSigCanvasWrap) cpSigCanvasWrap.classList.add('hidden');
  if (cpSigCanvas) { const c = cpSigCanvas.getContext('2d'); c.clearRect(0, 0, cpSigCanvas.width, cpSigCanvas.height); }
  if (companyProfileModal) {
    companyProfileModal.classList.add('show');
    companyProfileModal.setAttribute('aria-hidden', 'false');
    companyProfileModal.setAttribute('dir', state.isRTL ? 'rtl' : 'ltr');
    document.body.classList.add('modal-open');
  }
}
function closeCompanyProfile() {
  if (companyProfileModal) {
    companyProfileModal.classList.remove('show');
    companyProfileModal.setAttribute('aria-hidden', 'true');
  }
  const stillOpen = (companyProfileModal && companyProfileModal.classList.contains('show')) ||
    (notesManagerModal && notesManagerModal.classList.contains('show')) ||
    (fullScreenNoteModal && fullScreenNoteModal.classList.contains('show')) ||
    document.querySelector('.modal.show, .workspace-overlay.show');
  if (!stillOpen) document.body.classList.remove('modal-open');
}
function collectCompanyProfile() {
  return {
    companyName: cpCompanyName ? cpCompanyName.value : '',
    address: cpAddress ? cpAddress.value : '',
    phone: cpPhone ? cpPhone.value : '',
    email: cpEmail ? cpEmail.value : '',
    website: cpWebsite ? cpWebsite.value : '',
    logo: cpDraft.logo,
    signature: cpDraft.signature,
    stamp: cpDraft.stamp,
    footer: cpFooter ? cpFooter.value : ''
  };
}
function saveCompanyProfileFromModal() {
  const o = collectCompanyProfile();
  if (o.email) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(o.email)) { showToast('Invalid email address'); return false; }
  }
  if (o.website) {
    const urlRe = /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+([/?#].*)?$/i;
    if (!urlRe.test(o.website)) { showToast('Invalid website URL'); return false; }
  }
  saveCompanyProfile(o);
  return true;
}

// ---- Signature draw (simple canvas; mouse + touch / coarse pointer) ----
function cpSigResetCanvas() {
  if (!cpSigCanvas) return;
  const c = cpSigCanvas.getContext('2d');
  c.clearRect(0, 0, cpSigCanvas.width, cpSigCanvas.height);
  cpSigCanvas.setAttribute('data-drawn', '0');
}
function openSigCanvas() {
  if (!cpSigCanvasWrap) return;
  cpSigCanvasWrap.classList.remove('hidden');
  cpSigResetCanvas();
  try { cpSigCanvas.focus(); } catch (e) {}
}
let cpSigDrawing = false, cpSigLast = null;
function cpSigPoint(e) {
  const r = cpSigCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left), y: (e.clientY - r.top) };
}
function cpSigDown(e) {
  if (!cpSigCanvas) return;
  e.preventDefault();
  cpSigDrawing = true;
  const p = cpSigPoint(e);
  cpSigLast = p;
  const c = cpSigCanvas.getContext('2d');
  c.lineWidth = 2.5; c.lineCap = 'round'; c.strokeStyle = '#000000';
  c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + 0.1, p.y + 0.1); c.stroke();
  cpSigCanvas.setAttribute('data-drawn', '1');
}
function cpSigMove(e) {
  if (!cpSigDrawing || !cpSigCanvas) return;
  e.preventDefault();
  const p = cpSigPoint(e);
  if (cpSigLast) {
    const c = cpSigCanvas.getContext('2d');
    c.lineWidth = 2.5; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#000000';
    c.beginPath(); c.moveTo(cpSigLast.x, cpSigLast.y); c.lineTo(p.x, p.y); c.stroke();
  }
  cpSigLast = p;
}
function cpSigUp(e) {
  if (!cpSigDrawing) return;
  e.preventDefault();
  cpSigDrawing = false;
  cpSigLast = null;
}
function cpSigSaveDraw() {
  if (!cpSigCanvas) return;
  if (cpSigCanvas.getAttribute('data-drawn') !== '1') { return; }
  try { cpDraft.signature = cpSigCanvas.toDataURL('image/png'); } catch (e) { cpDraft.signature = ''; }
  companySetPreview(cpSigPreview, cpDraft.signature, 'signature');
  if (cpSigCanvasWrap) cpSigCanvasWrap.classList.add('hidden');
}

function companyFileReadScaled(input, target) {
  if (!input || !input.files || !input.files.length) { companySetPreview(target, ''); return; }
  companyScaleImage(input.files[0], COMPANY_PREVIEW_MAXW).then((dataUrl) => {
    if (!/^data:image\//.test((dataUrl || ''))) { companySetPreview(target, ''); return; }
    if (target === cpLogoPreview) cpDraft.logo = dataUrl;
    else if (target === cpSigPreview) cpDraft.signature = dataUrl;
    else if (target === cpStampPreview) cpDraft.stamp = dataUrl;
    companySetPreview(target, dataUrl, (target && target.alt) || 'preview');
    if (target === cpSigPreview && cpSigCanvasWrap) cpSigCanvasWrap.classList.add('hidden');
  });
}

// Tracks whether the Export dialog has been seeded this editor session (so the

// Tracks whether the Export dialog has been seeded this editor session (so the
// Tracks whether the Export dialog has been seeded this editor session (so the
// first open defaults Style/Title/Date to the note, later opens keep the user's
// chosen temporary export options). Never persisted.
let notePdfExportOptionsSeeded = false;
// The note id the dialog's temporary options currently belong to. When the user
// switches notes, the temporary export options reset to the new note's defaults
// so "Title default = note title" holds for every note (session-only).
let notePdfExportLastNoteId = null;

// ============================================================================
// PART 11 — Note → PDF Export dialog wiring.
// Shows a session-only setup dialog (Style / Title / Date / Company Profile),
// then hands off to the EXISTING preview + export pipeline. Options are read
// into notePdfExportOptions (consumed by buildNotePdfHtml) and are NEVER written
// to the note — the note's own title/body/style stay untouched. All fields are
// optional: an empty title falls back to the note title then "Untitled", Date
// defaults on, Company Profile reuses the existing savedCompanyName() store and
// never blocks the export. (No PDF engine changes.)
// ============================================================================
function resetNotePdfExportOptions() {
  notePdfExportOptions.styleId = '';
  notePdfExportOptions.title = '';
  notePdfExportOptions.date = true;
  notePdfExportOptions.company = false;
}

// Pre-fill the dialog controls to reflect the note's own saved values (PART 08
// Style comes through as the default, matching note.style; title default = note
// title; Date on; Company off). Never mutates the note.
function syncNoteExportPdfControls() {
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  if (noteExportStyle) {
    const savedStyle = (note && typeof note.style === 'string' && NOTE_STYLE_IDS.indexOf(note.style) !== -1) ? note.style : '';
    const cur = notePdfExportOptions.styleId || savedStyle;
    if (NOTE_STYLE_IDS.indexOf(cur) !== -1) noteExportStyle.value = cur;
    else noteExportStyle.value = '';
  }
  if (noteExportTitle) {
    // Title default = the note's own title (spec §5). An explicit export-title
    // override (collected earlier this session) still wins; otherwise prefill
    // from the live note title so the user always sees the effective title.
    const noteTitle = (note && typeof note.title === 'string') ? note.title : '';
    noteExportTitle.value = (typeof notePdfExportOptions.title === 'string' && notePdfExportOptions.title) ? notePdfExportOptions.title : noteTitle;
  }
  if (noteExportDate) noteExportDate.checked = notePdfExportOptions.date !== false;
  if (noteExportCompany) noteExportCompany.checked = !!(notePdfExportOptions.company);
  if (noteExportTitle) noteExportTitle.setAttribute('placeholder', t.pdfExportTitlePh || 'Note title (optional)');
  if (noteExportPdfClose) {
    noteExportPdfClose.setAttribute('aria-label', t.pdfExportClose || 'Close export dialog');
    noteExportPdfClose.setAttribute('title', t.pdfExportClose || 'Close export dialog');
  }
  if (noteExportPdfModal) noteExportPdfModal.setAttribute('dir', state.isRTL ? 'rtl' : 'ltr');
}

// Read the (optionally modified) dialog controls into notePdfExportOptions.
function collectNotePdfExportOptions() {
  if (noteExportStyle && notePdfExportOptions) {
    const v = noteExportStyle.value;
    notePdfExportOptions.styleId = (NOTE_STYLE_IDS.indexOf(v) !== -1) ? v : '';
  }
  if (noteExportTitle && notePdfExportOptions) {
    const v = noteExportTitle.value.trim();
    // A title identical to the note's own title is stored as "" (no override)
    // so the PDF keeps tracking the live note title; only a genuinely custom
    // title is stored as an override.
    const noteTitle = ((state.currentOpenNote && state.currentOpenNote.title) || '').trim();
    notePdfExportOptions.title = (v && v !== noteTitle) ? v : '';
  }
  if (noteExportDate && notePdfExportOptions) notePdfExportOptions.date = noteExportDate.checked;
  if (noteExportCompany && notePdfExportOptions) notePdfExportOptions.company = noteExportCompany.checked;
}

function openNoteExportPdfDialog() {
  const note = state.currentOpenNote;
  if (!note) { showToast((translations[state.locale] || translations.en).noNoteOpen || 'No note open'); return; }
  // Live edits are flushed so the exported/previewed PDF matches the screen.
  if (typeof saveCurrentOpenNote === 'function') saveCurrentOpenNote();
  // Sync the dialog controls to the note's defaults (Style/Title/Date/Company)
  // on the first open of the session, and whenever the user switches to a
  // different note (so Title default = the current note's title, never a stale
  // value from a previous note). Later opens of the SAME note keep the user's
  // last temporary choices for the session.
  if (notePdfExportOptionsSeeded !== true || notePdfExportLastNoteId !== note.id) {
    resetNotePdfExportOptions();
    notePdfExportOptionsSeeded = true;
    notePdfExportLastNoteId = note.id;
  }
  syncNoteExportPdfControls();
  if (noteExportPdfModal) {
    noteExportPdfModal.classList.add('show');
    noteExportPdfModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
}
function closeNoteExportPdfDialog() {
  if (noteExportPdfModal) {
    noteExportPdfModal.classList.remove('show');
    noteExportPdfModal.setAttribute('aria-hidden', 'true');
  }
  // Release the body lock only when no other Notes modal/workspace is still open
  // (mirror the guarded release used by the preview/editor close paths).
  const stillOpen = (noteExportPdfModal && noteExportPdfModal.classList.contains('show')) ||
    (fullScreenNoteModal && fullScreenNoteModal.classList.contains('show')) ||
    (notesManagerModal && notesManagerModal.classList.contains('show')) ||
    (notePdfPreviewModal && notePdfPreviewModal.classList.contains('show')) ||
    document.querySelector('.modal.show, .workspace-overlay.show');
  if (!stillOpen) document.body.classList.remove('modal-open');
}

// Read current dialog values into notePdfExportOptions (called by Preview and
// Create PDF before handing off to the existing pipeline).
function commitNoteExportPdfOptions() {
  collectNotePdfExportOptions();
}

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
        await navigator.share({ files: [pdfFile], title: noteTitle, text: t.shareMessage || 'Exported from EQ Calculator' });
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

// PART 11 — Perform the actual Note → PDF export (share or download), reusing
// the EXISTING buildNotePdfBlob pipeline. The dialog's Create PDF calls this
// after committing the session export options.
async function performNotePdfExport() {
  const t = translations[state.locale] || translations.en;
  const note = state.currentOpenNote;
  if (!note) {
    showToast('No note open');
    return;
  }
  // Flush any live edits so the exported PDF reflects the note on screen.
  saveCurrentOpenNote();
  // Generate a REAL PDF. buildNotePdfBlob reuses the proven html2pdf pipeline
  // (the same one used by the History export) and resolves with a genuine
  // %PDF- Blob — never an HTML/text rendering path.
  let blob;
  try {
    blob = await buildNotePdfBlob(note);
  } catch (err) {
    // PART 21: offline → clear translated feedback instead of a generic failure.
    if (err && err.message === 'no-internet') showInternetRequiredToast();
    else showToast('PDF generation failed: ' + (err.message || err));
    return;
  }
  // Guard: only ever share/download a correctly-typed PDF Blob as a .pdf.
  if (!blob || blob.type !== 'application/pdf') {
    showToast('PDF generation failed: invalid PDF');
    return;
  }
  // Filename reflects the effective export title when the user set one,
  // else the note title (matching the SFW-safe sanitizer).
  const exportTitle = (notePdfExportOptions && typeof notePdfExportOptions.title === 'string' && notePdfExportOptions.title.trim())
    ? notePdfExportOptions.title.trim()
    : ((note.title && String(note.title).trim()) || (t.untitled || 'Untitled'));
  const filename = notePdfFilename(exportTitle);
  // Wrap the real PDF bytes in a correctly-typed .pdf File so every share /
  // download path receives valid PDF content (MIME application/pdf, .pdf name).
  const pdfFile = new File([blob], filename, { type: 'application/pdf' });
  // Mobile-first: open the device's native Share Sheet with the ACTUAL PDF
  // File (WhatsApp / Email / Files / Drive / etc.). iOS Safari does not
  // reliably persist a Blob download, so sharing the File is what lets the
  // user send the real .pdf through the OS Share Sheet.
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: exportTitle,
        text: t.shareMessage || 'Exported from EQ Calculator'
      });
      return;
    } catch (e) {
      // User dismissed the Share Sheet -> not an error.
      if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) return;
      // Any other real failure -> fall through to the download fallback below.
    }
  }
  // Fallback: reliable download mechanism (desktop + environments without
  // File sharing support). position:fixed off-screen so mobile browsers do
  // not block the synthetic click.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.position = 'fixed';
  a.style.left = '-9999px';
  a.style.top = '-9999px';
  document.body.appendChild(a);
  a.click();
  // Allow the browser to start the download, then clean up.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
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
  text += `— Exported from EQ Calculator`;

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
    utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';
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
    utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';
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
  document.body.classList.toggle('modal-open', !isOpen);
}

function closeDrawer() {
  if (!drawer || !drawerOverlay) return;
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
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
  drawerMenuItems.forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.getAttribute('data-action');
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

  // Close currency menu on outside click
  document.addEventListener('click', (e) => {
    if (currencyMenuWrap && !currencyMenuWrap.contains(e.target)) {
      closeCurrencyMenu();
    }
  });

  // Close currency menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCurrencyMenu();
    }
  });

  // Theme buttons
  themeButtons.forEach((btn) => {
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
  // PART 15 — Smart Document Scan entry from the PDF Workspace.
  // The "Scan / Create PDF" card opens the existing stable Smart Scan engine
  // (camera → capture → detect → auto-crop/deskew → enhance → OCR → editable
  // review → accept). No new engine: this reuses the Smart Documents scan flow
  // exactly. The PDF Workspace stays an entry point; Open PDF remains a later
  // phase. No Notes tools are involved.
  const pdfScanCreateCard = document.getElementById('pdfScanCreateCard');
  if (pdfScanCreateCard) {
    pdfScanCreateCard.addEventListener('click', () => {
      closePdfReportsWorkspace();
      openSmartDocs();
      smartScanOpen();
    });
  }
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

    // Smart Documents home
  if (closeSmartDocsButton) {
    closeSmartDocsButton.addEventListener('click', closeSmartDocs);
  }
    if (smartDocsModal) {
    smartDocsModal.addEventListener('click', (e) => {
      if (e.target === smartDocsModal) closeSmartDocs();
    });
    smartDocsModal.addEventListener('keydown', (e) => {
      const escScan = scanEl('smartScanView') && scanEl('smartScanView').classList.contains('scan-visible');
      const escImport = smartImportViewVisible();
      const escEditor = smartEditorVisible();
      const escBlank = smartBlankVisible();
      const escTemplates = smartTemplatesVisible();
      // PART 32 — the draft-delete confirm dialog swallows Escape first (= cancel).
      if (e.key === 'Escape' && typeof smartDraftDeleteVisible === 'function' && smartDraftDeleteVisible()) {
        e.preventDefault();
        smartDraftDeleteHide();
        return;
      }
      if (e.key === 'Escape' && (escScan || escImport || escEditor || escBlank || escTemplates)) {
        e.preventDefault();
        if (escScan) smartScanResetToHome();
        else if (escBlank) {
          // PART 20 — unsaved changes dialog first; Escape on the dialog = cancel.
          if (typeof smartUnsavedVisible === 'function' && smartUnsavedVisible()) { smartUnsavedHide(); }
          else if (typeof smartLeaveBlocked === 'function' && smartLeaveBlocked('home')) { /* dialog shown */ }
          else { smartBlankResetToHome(); setSmartDocsStep(1); }
        }
        else if (escTemplates) { smartTemplatesResetToHome(); setSmartDocsStep(1); }
        else smartImportResetToHome();
      }
    });
  }
    // PART 4 — Smart Documents scan card + workflow wiring
  const smartDocsGrid = document.querySelector('.smart-docs-grid');
  if (smartDocsGrid) {
    smartDocsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.smart-doc-card[data-action]');
      if (!card) return;
      const action = card.getAttribute('data-action');
      if (action === 'smart-scan-doc') {
        e.preventDefault();
        smartScanOpen();
      } else if (action === 'smart-import-file') { // PART 5
        e.preventDefault();
        smartImportOpen();
      } else if (action === 'smart-new-doc') { // PART 6 — now PART 33 guarded
        e.preventDefault();
        // PART 33: clean document starts immediately; dirty document shows the
        // unsaved-changes dialog (حفظ والمتابعة / بدء مستند جديد / إلغاء).
        if (typeof smartNewDocBlocked === 'function' && smartNewDocBlocked()) return;
        smartBlankOpen();
      } else if (action === 'smart-templates') { // PART 7
        e.preventDefault();
        smartTemplatesOpen();
      }
    });
  }
  const scanBackBtn = document.getElementById('smartScanBack');
  if (scanBackBtn) scanBackBtn.addEventListener('click', onSmartScanBack);
  const scanCaptureBtn = document.getElementById('scanCaptureBtn');
  if (scanCaptureBtn) scanCaptureBtn.addEventListener('click', onSmartScanCapture);
  const scanFileInput = document.getElementById('scanFileInput');
  if (scanFileInput) scanFileInput.addEventListener('change', onSmartScanFileChange);
  // PART 16 — live structure refresh when the user corrects the OCR text.
  // Cheap text-only analysis (no re-OCR, no libraries); debounced lightly so
  // typing stays smooth in the review editor.
  const scanReviewTextEl = document.getElementById('scanReviewText');
  if (scanReviewTextEl) {
    let structTimer = null;
    scanReviewTextEl.addEventListener('input', () => {
      if (structTimer) clearTimeout(structTimer);
      structTimer = setTimeout(() => {
        const val = (scanEl('scanReviewText') && scanEl('scanReviewText').value) || '';
        smartScanStructure = smartScanAnalyzeStructure(val);
        smartScanRenderStructure();
      }, 220);
    });
  }
  const scanRescanBtn = document.getElementById('scanRescanBtn');
  if (scanRescanBtn) scanRescanBtn.addEventListener('click', onSmartScanRescan);
  const scanAcceptBtn = document.getElementById('scanAcceptBtn');
  if (scanAcceptBtn) scanAcceptBtn.addEventListener('click', onSmartScanAccept);
  // PART 17 — editable recognized document + Create PDF wiring
  bindSmartScanEdit();
  // PART 5 — Smart Import PDF wiring
  const smartImportFileInput = document.getElementById('smartImportFileInput');
  if (smartImportFileInput) smartImportFileInput.addEventListener('change', onSmartImportFileChange);
  const smartImportBack = document.getElementById('smartImportBack');
  if (smartImportBack) smartImportBack.addEventListener('click', smartImportResetToHome);
  const smartImportChooseBtn = document.getElementById('smartImportChooseBtn');
  if (smartImportChooseBtn) smartImportChooseBtn.addEventListener('click', onSmartImportChoose);
  const importUseOcrBtn = document.getElementById('importUseOcrBtn');
  if (importUseOcrBtn) importUseOcrBtn.addEventListener('click', onSmartImportUseOcr);
  const importKeepImagesBtn = document.getElementById('importKeepImagesBtn');
  if (importKeepImagesBtn) importKeepImagesBtn.addEventListener('click', onSmartImportKeepImages);
  const importRetryBtn = document.getElementById('importRetryBtn');
  if (importRetryBtn) importRetryBtn.addEventListener('click', onSmartImportRetry);
  const smartEditorBack = document.getElementById('smartEditorBack');
  // PART 5e — the PDF in-place editor's single Back button returns to the
  // PREVIOUS import screen (does not delete the parsed PDF / save data).
  if (smartEditorBack) smartEditorBack.addEventListener('click', smartPdfEditorBack);
  // PART 5e — imported-PDF toolbar: Save + Send (one button each, wired once).
  // Both reuse the EXISTING offline PDF writer / download / Web Share seams.
  const smartEditorSaveBtn = document.getElementById('smartEditorSaveBtn');
  if (smartEditorSaveBtn) smartEditorSaveBtn.addEventListener('click', () => { try { smartEditorSaveNow(); } catch (e) {} });
  // PART 5e — Text Color button + swatch menu (Smart PDF Direct Editor only).
  // Reuses the EXISTING toolbar; the menu closes on selection/outside click/Escape.
  const smartPdfColorBtn = document.getElementById('smartPdfTextColorBtn');
  const smartPdfColorWrap = document.getElementById('smartPdfColorWrap');
  const smartPdfColorMenu = document.getElementById('smartPdfColorMenu');
  const smartPdfColorClose = () => {
    if (smartPdfColorMenu) smartPdfColorMenu.setAttribute('hidden', '');
    if (smartPdfColorBtn) smartPdfColorBtn.setAttribute('aria-expanded', 'false');
  };
  if (smartPdfColorBtn && smartPdfColorWrap && smartPdfColorMenu) {
    smartPdfColorBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const willOpen = smartPdfColorMenu.hasAttribute('hidden');
      if (willOpen) smartPdfColorMenu.removeAttribute('hidden'); else smartPdfColorMenu.setAttribute('hidden', '');
      smartPdfColorBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    smartPdfColorMenu.addEventListener('click', (ev) => {
      const sw = ev.target && ev.target.closest ? ev.target.closest('.smart-pdf-color-swatch') : null;
      if (!sw) return;
      ev.stopPropagation();
      const hex = sw.getAttribute('data-color') || '#000000';
      try { smartPdfApplyTextColor(hex); } catch (e) {}
      smartPdfColorClose();
    });
    smartPdfColorMenu.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { smartPdfColorClose(); smartPdfColorBtn.focus(); }
    });
    document.addEventListener('click', (ev) => {
      if (!smartPdfColorWrap.contains(ev.target)) smartPdfColorClose();
    });
  }
  const smartEditorSendBtn = document.getElementById('smartEditorSendBtn');
  if (smartEditorSendBtn) smartEditorSendBtn.addEventListener('click', () => { try { smartEditorSendNow(); } catch (e) {} });
  // PART 6 — blank document workspace wiring
  const smartBlankBack = document.getElementById('smartBlankBack');
  if (smartBlankBack) smartBlankBack.addEventListener('click', () => {
    // PART 20 — unsaved changes? Ask before leaving (حفظ / خروج بدون حفظ / إلغاء).
    if (typeof smartLeaveBlocked === 'function' && smartLeaveBlocked('home')) return;
    smartBlankResetToHome(); setSmartDocsStep(1);
  });
      // PART 20 — Save / Save-draft button in the editor header.
  const smartSaveDraftBtn = document.getElementById('smartSaveDraftBtn');
  if (smartSaveDraftBtn) smartSaveDraftBtn.addEventListener('click', () => smartDraftSave());
  // PART 33 — New Document button in the editor header (shares the home-card flow).
  const smartNewDocBtn = document.getElementById('smartNewDocBtn');
  if (smartNewDocBtn) smartNewDocBtn.addEventListener('click', () => {
    if (typeof smartNewDocBlocked === 'function' && smartNewDocBlocked()) return;
    smartBlankOpen();
  });
  // PART 32 — "Your drafts" list wiring (resume / delete-confirm).
  const smartDraftsNewBtn = document.getElementById('smartDraftsNewBtn');
  // Empty-state path reuses the EXISTING new-document entry point.
  if (smartDraftsNewBtn) smartDraftsNewBtn.addEventListener('click', () => smartBlankOpen());
  const smartDraftsListEl = document.getElementById('smartDraftsList');
  if (smartDraftsListEl) smartDraftsListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-key]');
    if (!btn) return;
    const key = btn.getAttribute('data-key');
    if (btn.classList.contains('smart-draft-item-resume')) smartDraftOpenByKey(key);
    else if (btn.classList.contains('smart-draft-item-delete')) {
      const row = btn.closest('.smart-draft-item');
      const nm = row ? row.querySelector('.smart-draft-item-name') : null;
      smartDraftDeleteShow(key, nm ? nm.textContent : '');
    }
  });
  const sdDelCancel = document.getElementById('smartDraftDelCancelBtn');
  if (sdDelCancel) sdDelCancel.addEventListener('click', () => smartDraftDeleteHide());
  const sdDelConfirm = document.getElementById('smartDraftDelConfirmBtn');
  if (sdDelConfirm) sdDelConfirm.addEventListener('click', () => { smartDraftDeleteCommit(); });
  const sdDelModal = document.getElementById('smartDraftDeleteModal');
  if (sdDelModal) sdDelModal.addEventListener('click', (e) => {
    if (e.target === sdDelModal) smartDraftDeleteHide();
  });
  // PART 24 — click the document name to rename it inline.
  const smartBlankTitle = document.getElementById('smartBlankDocTitle');
  if (smartBlankTitle) smartBlankTitle.addEventListener('click', smartTitleEditStart);
  const smartTitleInput = document.getElementById('smartBlankTitleInput');
  if (smartTitleInput) {
    smartTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); smartTitleEditCommit(false); }
      else if (e.key === 'Escape') { e.preventDefault(); smartTitleEditCommit(true); }
    });
    smartTitleInput.addEventListener('blur', () => smartTitleEditCommit(false));
  }
    // PART 20 / PART 33 — unsaved-changes dialog buttons.
  // 'leave' mode: Save = save then leave; Exit = leave without saving.
  // 'newdoc' mode: Save & Continue (atomic) / Start New / Cancel.
  const unsavedSaveBtn = document.getElementById('smartUnsavedSaveBtn');
  if (unsavedSaveBtn) unsavedSaveBtn.addEventListener('click', () => {
    if (smartUnsavedMode === 'newdoc') { smartNewDocSaveAndContinue(); return; }
    smartDraftSave(false); smartLeavePerform();
  });
  const unsavedExitBtn = document.getElementById('smartUnsavedExitBtn');
  if (unsavedExitBtn) unsavedExitBtn.addEventListener('click', () => {
    if (smartUnsavedMode === 'newdoc') { smartNewDocStart(); return; }
    smartLeavePerform();
  });
  const unsavedCancelBtn = document.getElementById('smartUnsavedCancelBtn');
  if (unsavedCancelBtn) unsavedCancelBtn.addEventListener('click', () => smartUnsavedHide());
  // PART 20 — draft banner resume button.
  const smartDraftResumeBtn = document.getElementById('smartDraftResumeBtn');
  if (smartDraftResumeBtn) smartDraftResumeBtn.addEventListener('click', () => {
    const d = smartDraftRead();
    if (d) smartDraftApply(d);
  });
  // PART 19 — page navigation + management wiring (Smart Documents only).
  const pPrev = document.getElementById('smartBlankPrevPage');
  if (pPrev) pPrev.addEventListener('click', () => { smartPageGo((state.smartBlankDoc ? state.smartBlankDoc.currentPage : 1) - 1); });
  const pNext = document.getElementById('smartBlankNextPage');
  if (pNext) pNext.addEventListener('click', () => { smartPageGo((state.smartBlankDoc ? state.smartBlankDoc.currentPage : 1) + 1); });
  const pAdd = document.getElementById('smartPageAddBtn');
  if (pAdd) pAdd.addEventListener('click', () => { smartPageAdd(); });
  const pCopy = document.getElementById('smartPageCopyBtn');
  if (pCopy) pCopy.addEventListener('click', () => { smartPageCopy(); });
  const pDel = document.getElementById('smartPageDeleteBtn');
  if (pDel) pDel.addEventListener('click', () => { smartPageDelete(); });
  const pUp = document.getElementById('smartPageMoveUpBtn');
  if (pUp) pUp.addEventListener('click', () => { smartPageMove(-1); });
  const pDown = document.getElementById('smartPageMoveDownBtn');
  if (pDown) pDown.addEventListener('click', () => { smartPageMove(1); });
  // PART 10 — Smart Add menu wiring (the "+" button is the ONLY trigger)
  const smartBlankToolbar = document.querySelector('[data-toolbar="blank-doc"]');
  if (smartBlankToolbar) {
    smartBlankToolbar.addEventListener('mousedown', (e) => {
      // Keep editor focus behavior untouched for the other tools.
      if (e.target && e.target.closest && e.target.closest('button[data-tool="add"]')) e.preventDefault();
    });
    smartBlankToolbar.addEventListener('click', (e) => {
      const addBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="add"]') : null;
      if (addBtn) { e.preventDefault(); smartAddToggle(); return; }
      // PART 11 — the T / Text tool inserts a real editable text block.
      const textBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="text"]') : null;
      if (textBtn) { e.preventDefault(); smartTextInsert(); return; }
      // PART 12 — the ▦ Table tool opens the Rows × Columns launcher.
      const tableBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="table"]') : null;
      if (tableBtn) { e.preventDefault(); smartTableLauncherToggle(); }
      // PART 14 — the 🖼 Image tool opens the existing Smart Documents File Picker.
      const imageBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="image"]') : null;
      if (imageBtn) { e.preventDefault(); smartAddInsert('image'); }
      // PART 15 — the ◉ Logo tool opens the Logo File Picker (position chosen in-editor).
      const logoBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="logo"]') : null;
      if (logoBtn) { e.preventDefault(); smartLogoInsert(); }
      // PART 16 — the ⚙ Page settings tool opens the Page Design preset menu.
      const pageSettingsBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="page-settings"]') : null;
      if (pageSettingsBtn) { e.preventDefault(); smartPageDesignToggle(); return; }
      // PART 17 — the ✍ Signature tool opens the signature method menu.
      const signatureBtn = e.target && e.target.closest ? e.target.closest('button[data-tool="signature"]') : null;
      if (signatureBtn) { e.preventDefault(); smartSignatureToggle(); }
    });
  }
  // PART 11 — wire the Text Formatting Controls.
  smartTextWire();
  // PART 12 — wire the Table launcher + contextual table toolbar.
  smartTableWire();
  // PART 14 — wire the Image tool (move/resize/select/delete).
  smartImageWire();
  // PART 15 — wire the Logo File Picker + position selector.
  smartLogoWire();
  // PART 17 — wire the Signature tool (draw/type/image + insert).
  smartSignatureWire();
  // PART 18 — wire signature protection (Re-sign button + baseline observer).
  if (typeof smartSigProtectWire === 'function') smartSigProtectWire();
  // PART 25 — wire Review (مراجعة) entry/exit. Entering review NEVER marks
  // the document dirty and NEVER touches the signature protection state.
  const smartReviewBtn = document.getElementById('smartReviewBtn');
  if (smartReviewBtn && smartReviewBtn.dataset.reviewWired !== '1') {
    smartReviewBtn.dataset.reviewWired = '1';
    smartReviewBtn.addEventListener('click', (e) => { e.preventDefault(); smartReviewOpen(); });
  }
  const smartReviewExitBtn = document.getElementById('smartReviewExitBtn');
  if (smartReviewExitBtn && smartReviewExitBtn.dataset.reviewWired !== '1') {
    smartReviewExitBtn.dataset.reviewWired = '1';
    smartReviewExitBtn.addEventListener('click', (e) => { e.preventDefault(); smartReviewExit(); });
  }
  const smartAddMenu = document.getElementById('smartAddMenu');
  if (smartAddMenu) {
    smartAddMenu.addEventListener('click', (e) => {
      const item = e.target && e.target.closest ? e.target.closest('.smart-add-item') : null;
      if (!item) return;
      e.preventDefault();
      smartAddInsert(item.getAttribute('data-add'));
      smartAddClose();
      smartTableLauncherClose(); // PART 12 — never leave the launcher open behind the Add menu
    });
  }
  // Close when clicking outside the menu (and outside the "+" toggle).
  document.addEventListener('pointerdown', (e) => {
    if (!smartAddIsOpen()) return;
    const t = e.target;
    if (t && t.closest && (t.closest('#smartAddMenu') || t.closest('[data-toolbar="blank-doc"] button[data-tool="add"]'))) return;
    smartAddClose();
  });
  // PART 16 — wire the Page Design preset menu (⚙ button + 5 fixed presets).
  const smartPageDesignMenu = document.getElementById('smartPageDesignMenu');
  if (smartPageDesignMenu) {
    smartPageDesignMenu.addEventListener('click', (e) => {
      const item = e.target && e.target.closest ? e.target.closest('.smart-design-item') : null;
      if (!item) return;
      e.preventDefault();
      smartPageDesignApply(item.getAttribute('data-design'));
      smartPageDesignClose();
    });
  }
  // PART 16 — close the Page Design menu when clicking outside it / its ⚙ trigger.
  document.addEventListener('pointerdown', (e) => {
    if (!smartPageDesignIsOpen()) return;
    const t = e.target;
    if (t && t.closest && (t.closest('#smartPageDesignMenu') || t.closest('[data-toolbar="blank-doc"] button[data-tool="page-settings"]'))) return;
    smartPageDesignClose();
  });
  // PART 12 — close the table launcher when clicking outside it / its ▦ trigger.
  document.addEventListener('pointerdown', (e) => {
    const panel = smartTableLauncherEl();
    if (!panel || !panel.classList.contains('open')) return;
    const t = e.target;
    if (t && t.closest && (t.closest('#smartTableCreate') || t.closest('[data-toolbar="blank-doc"] button[data-tool="table"]'))) return;
    smartTableLauncherClose();
  });
  // Escape closes ONLY the menu (captured before the modal-level handler).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && smartAddIsOpen()) {
      e.preventDefault();
      e.stopPropagation();
      smartAddClose();
    }
    // PART 12 — Escape also closes ONLY the table launcher.
    const panel = smartTableLauncherEl();
    if (e.key === 'Escape' && panel && panel.classList.contains('open')) {
      e.preventDefault();
      e.stopPropagation();
      smartTableLauncherClose();
    }
  }, true);
  const smartAddImageInput = document.getElementById('smartAddImageInput');
  if (smartAddImageInput) {
    smartAddImageInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const surface = smartActivePageContent();
        if (!surface) return;
        const wrap = document.createElement('div');
        wrap.className = 'smart-doc-image-wrap';
        wrap.dataset.smartElement = 'image-wrap';
        const img = document.createElement('img');
        img.className = 'smart-doc-image';
        img.src = String(reader.result);
        img.alt = file.name || '';
        img.dataset.smartElement = 'image';
        img.draggable = false; // PART 14 — never let native image-drag steal the pointer
        wrap.appendChild(img);
        surface.appendChild(wrap);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });
  }
  window.addEventListener('resize', () => { if (smartBlankVisible()) smartBlankFit(); });
  window.addEventListener('orientationchange', () => { if (smartBlankVisible()) smartBlankFit(); });
  // PART 7 — Smart Documents templates wiring
  const smartTemplatesBack = document.getElementById('smartTemplatesBack');
  if (smartTemplatesBack) smartTemplatesBack.addEventListener('click', smartTemplatesResetToHome);
  const templatesViewEl = document.getElementById('smartTemplatesView');
  if (templatesViewEl) {
    templatesViewEl.addEventListener('click', (e) => {
      const item = e.target.closest('.smart-template-item');
      if (!item) return;
      smartTemplatesSelect(
        item.getAttribute('data-template-id'),
        item.getAttribute('data-template-group')
      );
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
  // PART 09 — Image button + Upload/Camera menu + hidden file input.
  const noteImageMenu = document.getElementById('noteImageMenu');
  const noteImageFileInput = document.getElementById('noteImageFileInput');
  function noteImageToggleMenu(show) {
    if (!noteImageMenu) return;
    const wasOpen = !noteImageMenu.classList.contains('hidden');
    const open = show === undefined ? !wasOpen : !!show;
    if (!open) {
      noteImageMenu.classList.add('hidden');
      if (noteImageBtn) noteImageBtn.setAttribute('aria-expanded', 'false');
      return;
    }
    noteImageMenu.classList.remove('hidden');
    if (noteImageBtn) {
      noteImageBtn.setAttribute('aria-expanded', 'true');
      const r = noteImageBtn.getBoundingClientRect();
      const mw = noteImageMenu.offsetWidth || 120;
      const mh = noteImageMenu.offsetHeight || 80;
      let left = r.left;
      if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
      let top = r.bottom + 4;
      if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
      noteImageMenu.style.left = left + 'px';
      noteImageMenu.style.top = top + 'px';
    }
  }
  if (noteImageBtn) {
    noteImageBtn.addEventListener('mousedown', (e) => e.preventDefault());
    noteImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      noteImageToggleMenu();
    });
  }
  document.addEventListener('click', (e) => {
    if (noteImageMenu && !noteImageMenu.classList.contains('hidden')) {
      if (noteImageBtn && noteImageBtn.contains(e.target)) return;
      if (noteImageMenu.contains(e.target)) return;
      noteImageToggleMenu(false);
    }
  });
  if (noteImageMenu) {
    noteImageMenu.addEventListener('click', (e) => {
      const item = e.target && e.target.closest ? e.target.closest('.note-image-menu-item') : null;
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      const src = item.getAttribute('data-source');
      if (src === 'camera' && noteImageFileInput) noteImageFileInput.setAttribute('capture', 'environment');
      if (src === 'upload' && noteImageFileInput) noteImageFileInput.removeAttribute('capture');
      noteImageToggleMenu(false);
      if (noteImageFileInput) noteImageFileInput.value = '';
      if (noteImageFileInput) noteImageFileInput.click();
    });
  }
  if (noteImageFileInput) {
    noteImageFileInput.addEventListener('change', () => {
      const file = noteImageFileInput.files && noteImageFileInput.files[0];
      if (file) noteImageReadAndInsert(file);
      noteImageFileInput.value = '';
    });
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
  // PART 11 — Note → PDF Export. The header Export button OPENS the setup
  // dialog (Style / Title / Date / Company Profile, session-only). Preview and
  // Create PDF commit the dialog options into notePdfExportOptions and reuse the
  // existing buildNotePdfBlob pipeline — no PDF engine changes.
  if (exportNotePdfBtn) {
    exportNotePdfBtn.addEventListener('click', () => { openNoteExportPdfDialog(); });
  }
  if (noteExportPreviewBtn) {
    noteExportPreviewBtn.addEventListener('click', () => {
      commitNoteExportPdfOptions();
      closeNoteExportPdfDialog();
      openNotePdfPreview();
    });
  }
  if (noteExportCreateBtn) {
    noteExportCreateBtn.addEventListener('click', async () => {
      commitNoteExportPdfOptions();
      closeNoteExportPdfDialog();
      await performNotePdfExport();
    });
  }
  if (noteExportPdfClose) {
    noteExportPdfClose.addEventListener('click', closeNoteExportPdfDialog);
  }
  if (noteExportPdfModal) {
    noteExportPdfModal.addEventListener('click', (e) => { if (e.target === noteExportPdfModal) closeNoteExportPdfDialog(); });
  }
  // PART 13 — Company Profile manager wiring (Notes/PDF only). Open button in the
  // editor header; Save persists the single profile and seeds the legacy company
  // name for History/Part 11; Upload buttons feed a downscaled data URL preview;
  // Draw signature uses a simple canvas (mouse + touch).
  if (openCompanyProfileBtn) openCompanyProfileBtn.addEventListener('click', openCompanyProfile);
  if (companyProfileSave) {
    companyProfileSave.addEventListener('click', () => {
      if (saveCompanyProfileFromModal()) { showToast('Company profile saved ✓'); closeCompanyProfile(); }
    });
  }
  if (companyProfileCancel) companyProfileCancel.addEventListener('click', closeCompanyProfile);
  if (companyProfileClose) companyProfileClose.addEventListener('click', closeCompanyProfile);
  if (companyProfileModal) {
    companyProfileModal.addEventListener('click', (e) => { if (e.target === companyProfileModal) closeCompanyProfile(); });
  }
  if (cpLogoBtn) cpLogoBtn.addEventListener('click', () => { if (cpLogoInput) cpLogoInput.click(); });
  if (cpLogoInput) cpLogoInput.addEventListener('change', () => companyFileReadScaled(cpLogoInput, cpLogoPreview));
  if (cpSigUploadBtn) cpSigUploadBtn.addEventListener('click', () => { if (cpSigInput) cpSigInput.click(); });
  if (cpSigInput) cpSigInput.addEventListener('change', () => companyFileReadScaled(cpSigInput, cpSigPreview));
  if (cpStampBtn) cpStampBtn.addEventListener('click', () => { if (cpStampInput) cpStampInput.click(); });
  if (cpStampInput) cpStampInput.addEventListener('change', () => companyFileReadScaled(cpStampInput, cpStampPreview));
  if (cpSigDrawBtn) cpSigDrawBtn.addEventListener('click', openSigCanvas);
  if (cpSigClearBtn) cpSigClearBtn.addEventListener('click', cpSigResetCanvas);
  if (cpSigSaveBtn) cpSigSaveBtn.addEventListener('click', cpSigSaveDraw);
  if (cpSigCanvas) {
    cpSigCanvas.addEventListener('pointerdown', cpSigDown);
    cpSigCanvas.addEventListener('pointermove', cpSigMove);
    cpSigCanvas.addEventListener('pointerup', cpSigUp);
    cpSigCanvas.addEventListener('pointercancel', cpSigUp);
    cpSigCanvas.addEventListener('mousedown', cpSigDown);
    cpSigCanvas.addEventListener('mousemove', cpSigMove);
    cpSigCanvas.addEventListener('mouseup', cpSigUp);
    cpSigCanvas.addEventListener('touchstart', cpSigDown, { passive: false });
    cpSigCanvas.addEventListener('touchmove', cpSigMove, { passive: false });
    cpSigCanvas.addEventListener('touchend', cpSigUp, { passive: false });
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
  // Load stored language
  const savedLanguage = getLocaleFromStorage();
  state.locale = savedLanguage;

  // Load persisted App Sounds / Sound Profile / Speaker preferences
  loadSoundPreferences();

  // Set initial language
  if (languageSelect) languageSelect.value = state.locale;
  if (topBarLanguageSelect) topBarLanguageSelect.value = state.locale;

  // Initialize theme
  setTheme('dark');

  // Update texts
  updateTexts();

  // Set RTL if needed
  const html = document.documentElement;
  html.lang = state.locale;
  html.dir = state.locale === 'ar' ? 'rtl' : 'ltr';
  document.body.setAttribute('data-language', state.locale);
  state.isRTL = state.locale === 'ar';

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

  // PART 23 — load/migrate the local Smart Documents draft from IndexedDB
  // (background, fully local). Wrapped so it never blocks init on errors.
  if (typeof smartDraftWarmup === 'function') {
    try { smartDraftWarmup(); } catch (e) { /* ignore */ }
  }
}

// Guard for browser environment - only run initialize in browser
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialize);
}
