import { numberToWords as numberToWordsImpl } from './numberToWords.js';
import CurrencyService from './currencyService.js';

// Shared architecture imports
import {
  Decimal as SharedDecimal,
  numberToWords as sharedNumberToWords,
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
const noteFolderSelect = typeof document !== 'undefined' ? document.getElementById('noteFolderSelect') : null;
const noteBodyInput = typeof document !== 'undefined' ? document.getElementById('noteBodyInput') : null;
const noteBoldBtn = typeof document !== 'undefined' ? document.getElementById('noteBoldBtn') : null;
const noteItalicBtn = typeof document !== 'undefined' ? document.getElementById('noteItalicBtn') : null;
const noteUnderlineBtn = typeof document !== 'undefined' ? document.getElementById('noteUnderlineBtn') : null;
const noteCellBgColorBtn = typeof document !== 'undefined' ? document.getElementById('noteCellBgColorBtn') : null;
const noteTableBtn = typeof document !== 'undefined' ? document.getElementById('noteTableBtn') : null;
const noteTablePanel = typeof document !== 'undefined' ? document.getElementById('noteTablePanel') : null;
const noteTableRows = typeof document !== 'undefined' ? document.getElementById('noteTableRows') : null;
const noteTableCols = typeof document !== 'undefined' ? document.getElementById('noteTableCols') : null;
const noteTableHeader = typeof document !== 'undefined' ? document.getElementById('noteTableHeader') : null;
const noteTableInsertBtn = typeof document !== 'undefined' ? document.getElementById('noteTableInsertBtn') : null;
const noteTableCancelBtn = typeof document !== 'undefined' ? document.getElementById('noteTableCancelBtn') : null;
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
    noteTableRowsLabel: 'Rows',
    noteTableColsLabel: 'Cols',
    noteTableHeaderRowLabel: 'Header row',
    noteTableInsertBtnLabel: 'Insert Table',
    untitled: 'Untitled',
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
    quickNotesTitle: 'Quick Notes',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Save',
    quickNotesPlaceholder: 'Write a note',
    historyNotePlaceholder: 'Tag this calculation',
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
    smartScanCameraUnavailable: 'Camera is not available on this device.',
    smartScanPermissionDenied: 'Camera permission was denied.',
    smartScanNoText: 'No text was detected. Try again or add an image.',
    smartScanOcrFailed: 'Reading text failed. Please try again.',
    smartScanAccepted: 'Result accepted and ready for editing.',
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
    smartTextFont: 'Font', smartTextSize: 'Size',
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
    drawerConverter: 'Direct Currency Converter',
    drawerDirectory: 'Global Currency Directory & Search',
    drawerInstall: 'Install App',
    drawerSettings: 'Settings',
    installModalTitle: 'Install on iPhone',
    installModalStep1: 'Step 1: Tap the Share button (⎘ / ⇡) at the bottom or top of the browser.',
    installModalStep2: 'Step 2: Choose "Add to Home Screen" from the menu.',
    currencyOptionSearch: 'Search Currency',
    currencyOptionPrices: 'Live Currency Prices',
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
    quickNotesTitle: 'Notas rápidas',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Guardar',
    quickNotesPlaceholder: 'Escribe una nota',
    historyNotePlaceholder: 'Etiqueta este cálculo',
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
    smartScanCameraUnavailable: 'La cámara no está disponible en este dispositivo.',
    smartScanPermissionDenied: 'Se denegó el permiso de la cámara.',
    smartScanNoText: 'No se detectó texto. Inténtalo de nuevo o añade una imagen.',
    smartScanOcrFailed: 'Falló la lectura del texto. Inténtalo de nuevo.',
    smartScanAccepted: 'Resultado aceptado y listo para editar.',
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
    smartTextFont: 'Fuente', smartTextSize: 'Tamaño',
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
    noteTableRowsLabel: 'صفوف',
    noteTableColsLabel: 'أعمدة',
    noteTableHeaderRowLabel: 'صف العنوان',
    noteTableInsertBtnLabel: 'إدراج جدول',
    untitled: 'بدون عنوان',
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
    smartScanCameraUnavailable: 'الكاميرا غير متاحة على هذا الجهاز.',
    smartScanPermissionDenied: 'تم رفض إذن الكاميرا.',
    smartScanNoText: 'لم يتم التعرف على أي نص. أعد المحاولة أو أضف صورة.',
    smartScanOcrFailed: 'فشلت قراءة النص. حاول مجددًا.',
    smartScanAccepted: 'تم قبول النتيجة وجاهزة للتحرير.',
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
    smartTextFont: 'الخط', smartTextSize: 'الحجم',
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
    drawerConverter: 'محول العملات المباشر',
    drawerDirectory: 'الدليل العالمي للعملات والبحث',
    drawerInstall: 'تثبيت التطبيق',
    drawerSettings: 'الإعدادات',
    installModalTitle: 'التثبيت على iPhone',
    installModalStep1: 'الخطوة 1: اضغط على زر المشاركة (⎘ / ⇡) في أسفل أو أعلى المتصفح.',
    installModalStep2: 'الخطوة 2: اختر "إضافة إلى الشاشة الرئيسية" من القائمة.',
    currencyOptionSearch: 'البحث عن عملة',
    currencyOptionPrices: 'أسعار العملات المباشرة',
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
    quickNotesTitle: 'Notes rapides',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Enregistrer',
    quickNotesPlaceholder: 'Écrire une note',
    historyNotePlaceholder: 'Étiqueter ce calcul',
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
    smartScanCameraUnavailable: 'La caméra n’est pas disponible sur cet appareil.',
    smartScanPermissionDenied: 'L’autorisation de la caméra a été refusée.',
    smartScanNoText: 'Aucun texte détecté. Réessayez ou ajoutez une image.',
    smartScanOcrFailed: 'La lecture du texte a échoué. Veuillez réessayer.',
    smartScanAccepted: 'Résultat accepté et prêt à être modifié.',
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
    smartTextFont: 'Police', smartTextSize: 'Taille',
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
    quickNotesTitle: 'Быстрые заметки',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Сохранить',
    quickNotesPlaceholder: 'Напишите заметку',
    historyNotePlaceholder: 'Пометьте этот расчет',
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
    smartScanCameraUnavailable: 'Камера недоступна на этом устройстве.',
    smartScanPermissionDenied: 'Разрешение на использование камеры отклонено.',
    smartScanNoText: 'Текст не обнаружен. Повторите попытку или добавьте изображение.',
    smartScanOcrFailed: 'Не удалось прочитать текст. Попробуйте снова.',
    smartScanAccepted: 'Результат принят и готов к редактированию.',
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
    smartTextFont: 'Шрифт', smartTextSize: 'Размер',
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
    quickNotesTitle: 'Schnellnotizen',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Speichern',
    quickNotesPlaceholder: 'Notiz schreiben',
    historyNotePlaceholder: 'Diese Berechnung taggen',
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
    smartScanCameraUnavailable: 'Die Kamera ist auf diesem Gerät nicht verfügbar.',
    smartScanPermissionDenied: 'Kamera-Berechtigung wurde verweigert.',
    smartScanNoText: 'Kein Text erkannt. Bitte erneut versuchen oder ein Bild hinzufügen.',
    smartScanOcrFailed: 'Das Lesen des Textes ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    smartScanAccepted: 'Ergebnis akzeptiert und bereit zum Bearbeiten.',
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
    smartTextFont: 'Schrift', smartTextSize: 'Größe',
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
    quickNotesTitle: 'Hızlı Notlar',
    quickNotesToggle: '▼',
    quickNotesAdd: 'Kaydet',
    quickNotesPlaceholder: 'Not yaz',
    historyNotePlaceholder: 'Bu hesaplamayı etiketle',
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
    smartScanCameraUnavailable: 'Bu cihazda kamera mevcut değil.',
    smartScanPermissionDenied: 'Kamera izni reddedildi.',
    smartScanNoText: 'Metin algılanamadı. Tekrar deneyin veya bir görüntü ekleyin.',
    smartScanOcrFailed: 'Metin okuma başarısız oldu. Lütfen tekrar deneyin.',
    smartScanAccepted: 'Sonuç kabul edildi ve düzenleme için hazır.',
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
    smartTextFont: 'Yazı tipi', smartTextSize: 'Boyut',
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
    primaryDisplay.textContent = formatNumber(state.displayValue);
  }
}

function updateSecondaryDisplay() {
  if (secondaryDisplay) {
    if (state.displayValue !== '' && !isNaN(Number(state.displayValue))) {
      secondaryDisplay.textContent = numberToWords(state.displayValue, state.locale);
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
    // Arabic speech: speak the number as words so the TTS does not read the
    // decimal separator as "نقطة". The on-screen display stays unchanged.
    const text = state.locale === 'ar' && !Number.isNaN(Number(state.displayValue))
      ? numberToWords(state.displayValue, 'ar')
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
        </div>
        <div class="history-expression">${escapeHtml(entry.expression)}</div>
        <div class="history-result">= ${escapeHtml(entry.result)}</div>
        <div class="history-datetime">
          <span class="history-date">📅 ${escapeHtml(dateStr)}</span>
          <span class="history-time">🕒 ${escapeHtml(timeStr)}</span>
        </div>
        <div class="history-remaining-row">
          <span class="history-remaining" data-ts="${ts}">${remainingLabel}</span>
        </div>
        <div class="history-note-row">
          <input class="history-note-input" type="text" placeholder="${t.historyNotePlaceholder || 'Tag this calculation'}"
            value="${escapeHtml(entry.note || '')}" data-id="${entry.id}" />
          <button class="history-edit-note-btn" data-id="${entry.id}" title="${t.noteEdit || 'Edit Note'}">
            ✏️
          </button>
          <button class="history-share-btn" data-id="${entry.id}" title="${t.noteShare || 'Share'}">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </li>
    `;
  }).join('');
  // Warm the newest entries' PDFs off the click path so the per-entry Share
  // (pencil) button opens the System Share Sheet on the very first tap.
  primePdfBlobCache();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
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

function selectAllHistory() {
  const checkboxes = document.querySelectorAll('.history-select');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
  primeCurrentSelection(); // warm the combined PDF for the new selection
}

// Lazy-load an external script only when it is actually needed (PDF generation).
function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load script: ' + src));
    document.head.appendChild(s);
  });
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
  const abs = Math.abs(num);
  const integer = Math.trunc(abs);
  const fraction = abs - integer;

  let words;
  if (isAr) {
    words = pdfArInteger(integer);
    if (fraction > 0) {
      const cents = Math.round(fraction * 100);
      if (cents > 0) words += ' و' + pdfArInteger(cents) + ' جزءًا من مئة';
    }
    words += ' فقط';
    if (negative) words = 'سالب ' + words;
  } else {
    words = (typeof numberToWords === 'function') ? numberToWords(num, locale) : String(integer);
    if (locale === 'en') words += ' only';
  }
  return words;
}

// Build the "Exported at" date/time line for the PDF only. In Arabic it keeps the
// Arabic weekday/month names and an RTL-readable day-month-year order, but forces
// Latin (English) digits 1234567890 so the timestamp never renders broken or with
// Arabic-Indic numerals. Every other locale keeps the exact original
// toLocaleString output (English unchanged).
function formatPdfExportedAt(date, locale) {
  if ((locale || 'en') !== 'ar') {
    return date.toLocaleString(locale || 'en');
  }
  try {
    const weekday = new Intl.DateTimeFormat('ar', { numberingSystem: 'latn', weekday: 'long' }).format(date);
    const datePart = new Intl.DateTimeFormat('ar', { numberingSystem: 'latn', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const timePart = new Intl.DateTimeFormat('ar', { numberingSystem: 'latn', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
    return `${weekday}، ${datePart} — ${timePart}`;
  } catch (e) {
    return new Date(date).toLocaleString('ar');
  }
}
// Build a clean, structured PDF (A4) from the given History entries and return it as a Blob.
async function buildHistoryPdfBlob(entries) {
  const t = translations[state.locale] || translations.en;
  const PDF_LIB_URL = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';

  // Load the PDF library lazily, only when exporting History (normal app load stays untouched).
  if (typeof window.html2pdf === 'undefined') {
    await loadExternalScript(PDF_LIB_URL);
  }
  if (typeof window.html2pdf === 'undefined') {
    throw new Error('PDF library unavailable');
  }

  // Build a structured table: one row per selected History entry, ordered and
  // numbered sequentially (1, 2, 3, ...) while preserving the on-screen History
  // order. Description = note, Expression = expression, Result = result.
  const rows = entries.map((entry, i) => {
    const desc = String(entry.note || '').trim();
    const descAlign = pdfCellAlign(desc);
    const descDir = pdfCellDir(desc);
    const exprAlign = pdfCellAlign(entry.expression);
    const exprDir = pdfCellDir(entry.expression);
    const resultAlign = pdfCellAlign(entry.result);
    const resultDir = pdfCellDir(entry.result);
    return `
      <tr>
        <td class="col-num">${i + 1}</td>
        <td class="col-desc" dir="${descDir}" style="text-align:${descAlign}">${desc ? escapeHtml(desc) : '&nbsp;'}</td>
        <td class="col-expr" dir="${exprDir}" style="text-align:${exprAlign}">${escapeHtml(entry.expression)}</td>
        <td class="col-result" dir="${resultDir}" style="text-align:${resultAlign}">${escapeHtml(entry.result)}</td>
      </tr>`;
  }).join('');

  const isArabic = (state.locale || 'en') === 'ar';
  // Reformat the exported timestamp for the PDF only (Arabic fixed; English unchanged).
  const exportedAt = formatPdfExportedAt(new Date(), state.locale || 'en');

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
  const totalLabel = isArabic ? 'المجموع' : 'Total';
  const totalText = pdfHasNumeric ? String(pdfTotal) : '—';
  // Written form of the Total for the PDF only (e.g. "المجموع الكلي: 2200"
  // followed on the next line by "ألفان ومئتان فقط"). Built only when there is a
  // real summable numeric total — never guessed from empty/text/NaN results.
  const totalWords = pdfHasNumeric ? pdfNumberToWords(pdfTotal, state.locale || 'en') : '';
  const totalSummaryHtml = pdfHasNumeric ? `
    <div class="total-summary"${isArabic ? ' dir="rtl"' : ''}>
      <div class="total-summary-total">${escapeHtml(isArabic ? 'المجموع الكلي: ' : 'Total: ')}${escapeHtml(totalText)}</div>
      <div class="total-summary-words">${escapeHtml(totalWords)}</div>
    </div>` : '';

  // EQ's own brand shown inside the report so a recipient instantly knows the
  // PDF came from EQ Calculator, regardless of the file name.
  const brandTitle = 'EQ Calculator';
  const brandSub = 'Calculation History';
  const footerNote = 'Created with EQ Calculator';
  const footerTagline = 'Smart calculations. Simple results.';

  // Official product domain. Intentionally empty until the real domain is
  // provided later. When set it renders as a clickable app link + QR code in
  // the footer — never invent or embed a fake URL.
  const APP_DOMAIN = '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #000000; background: #ffffff; }
  .report { width: 794px; padding: 36px 40px; }
  .report-header { border-bottom: 3px solid #0891b2; padding-bottom: 14px; margin-bottom: 20px; }
  .report-header h1 { font-size: 26px; color: #000000; margin-bottom: 2px; letter-spacing: .5px; }
  .report-header .sub { font-size: 14px; color: #000000; font-weight: 700; margin-bottom: 6px; }
  .report-header .meta { font-size: 10px; color: #000000; }
  table.history-table { width: 100%; border-collapse: collapse; }
  table.history-table thead { display: table-header-group; }
  table.history-table th,
  table.history-table td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: middle; }
  table.history-table thead th { background: #0d9488; color: #000000; font-size: 12px; text-transform: uppercase; letter-spacing: .4px; text-align: center; }
  table.history-table tbody tr { page-break-inside: avoid; break-inside: avoid; }
  table.history-table td.col-num { width: 40px; text-align: center; color: #000000; font-weight: 700; }
  table.history-table td.col-desc { width: 200px; color: #000000; }
  table.history-table td.col-expr { color: #000000; font-weight: 600; }
  table.history-table td.col-result { width: 150px; color: #000000; font-weight: 800; text-align: right; }
  table.history-table tbody tr:nth-child(even) { background: #f1f5f9; }
  table.history-table tbody tr.total-row { background: #e0f2f1 !important; }
  table.history-table tr.total-row td { border-top: 2px solid #0891b2; color: #000000; font-weight: 800; }
  table.history-table tr.total-row td.col-desc { text-align: right; }
  .total-summary { margin-top: 16px; padding: 10px 14px; background: #ffffff; border: 1px solid #0d9488; border-radius: 6px; }
  .total-summary .total-summary-total { font-size: 15px; color: #000000; font-weight: 800; }
  .total-summary .total-summary-words { margin-top: 4px; font-size: 13px; color: #000000; }
  .report-footer { margin-top: 24px; padding-top: 12px; border-top: 2px solid #0891b2; text-align: center; }
  .report-footer .footer-brand { font-size: 12px; color: #000000; font-weight: 700; }
  .report-footer .footer-tagline { font-size: 11px; color: #000000; font-style: italic; }
  .report-footer .footer-domain { display: inline-block; margin-top: 8px; font-size: 12px; color: #000000; }
  .report-footer .footer-domain-sub { font-size: 10px; color: #000000; }
</style>
</head>
<body>
  <div class="report" id="report">
    <div class="report-header">
      <h1>${escapeHtml(brandTitle)}</h1>
      <div class="sub">${escapeHtml(brandSub)}</div>
      <div class="meta"${isArabic ? ' dir="rtl"' : ''}>${escapeHtml(exportedAt)}</div>
    </div>
    <table class="history-table">
      <thead>
        <tr>
          <th class="col-num">#</th>
          <th class="col-desc">Description</th>
          <th class="col-expr">Expression</th>
          <th class="col-result">Result</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
                                <tr class="total-row">
          <td class="col-num"></td>
          <td class="col-desc" colspan="2" dir="${pdfCellDir(totalLabel)}">${escapeHtml(totalLabel)}</td>
          <td class="col-result" dir="${pdfCellDir(totalText)}">${escapeHtml(totalText)}</td>
        </tr>
      </tbody>
    </table>
    ${totalSummaryHtml}
    <div class="report-footer">
      <div class="footer-brand">${escapeHtml(footerNote)}</div>
      <div class="footer-tagline">${escapeHtml(footerTagline)}</div>
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

async function exportHistory() {
  triggerButtonFeedback();
  const t = translations[state.locale] || translations.en;
  // Take ONLY the currently selected History entries — never falls back to all.
  const selectedEntries = getSelectedEntries();

  // No selection -> no PDF, no Share. Clear feedback and stop.
  if (!selectedEntries.length) {
    showToast(t.noSelection || 'Select an item to share');
    return;
  }
  // The combined PDF for this exact selection was primed off the click path the
  // moment the checkboxes changed, so awaiting it here is a fast cache hit and
  // navigator.share() runs immediately after the click, inside the activation window.
  let pdfBlob;
  try {
    pdfBlob = await ensureSelectionPdf(selectedEntries);
  } catch (err) {
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

function ensureSelectionPdf(entries) {
  if (!entries || !entries.length) return Promise.resolve(null);
  const sig = selectionSignature(entries);
  let p = selectionPdfCache.get(sig);
  if (!p) {
    p = buildHistoryPdfBlob(entries).catch((err) => {
      selectionPdfCache.delete(sig);
      throw err;
    });
    selectionPdfCache.set(sig, p);
  }
  return p;
}

function primeCurrentSelection() {
  const sel = getSelectedEntries();
  if (sel.length) ensureSelectionPdf(sel);
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
    showToast('PDF generation failed');
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
    activeTracks: smartScanActiveTracks(),
    cameraMode: smartScanCameraMode,
  }),
  open: () => smartScanOpen(),
  setOcrResult: (text) => { smartScanOcrOverride = (text === null || text === undefined) ? null : String(text); },
  clearOcrResult: () => { smartScanOcrOverride = null; },
  debugMode: (mode) => { smartScanCameraMode = (mode === 'blocked' || mode === 'live') ? mode : 'auto'; },
  reset: () => smartScanResetToHome(),
  stopCamera: () => smartScanStopCamera(),
  activeTracks: () => smartScanActiveTracks(),
  isStreamStopped: () => smartScanActiveTracks().length === 0,
};

function openSmartDocs() {
  if (smartDocsModal) {
    smartDocsModal.classList.add('show');
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

function closeSmartDocs() {
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
  const text = (scanEl('scanReviewText') && scanEl('scanReviewText').value) || '';
  if (!state.smartScanResult) state.smartScanResult = {};
  state.smartScanResult = { text: text, status: 'accepted' };
  const info = scanEl('scanAcceptInfo');
  if (info) { info.hidden = false; info.textContent = t.smartScanAccepted || 'Result accepted and ready for editing.'; }
  // PART 4 intentionally stops here: no editor is opened.
  if (window.__smartScanOnAccept) { try { window.__smartScanOnAccept(state.smartScanResult); } catch (e) {} }
}
// --- Pixel helpers for document processing (no external dependency) ---
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

async function smartImportParsePdf(file) {
  const pdfjs = await smartImportLoadPdfJs();
  let buf;
  try { buf = await file.arrayBuffer(); } catch (e) { throw new Error('read'); }
  let pdf;
  try { pdf = await pdfjs.getDocument({ data: buf }).promise; } catch (e) { throw new Error('parse'); }
  if (!pdf || !pdf.numPages) throw new Error('empty');
  const pages = [], images = [];
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    let page = null;
    try { page = await pdf.getPage(i); } catch (e) { page = null; }
    let pageText = '';
    if (page) {
      try {
        const tc = await page.getTextContent();
        pageText = (tc.items || []).map((it) => it.str || '').join(' ');
      } catch (e) {}
    }
    text += (pageText ? pageText + ' ' : '');
    let canvas = null, image = '';
    if (page) {
      try {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: ctx, viewport }).promise;
        image = canvas.toDataURL('image/jpeg', 0.8);
      } catch (e) { canvas = null; }
    }
    pages.push({ text: pageText.trim(), image: image, canvas: canvas });
    if (image) images.push(image);
  }
  return { numPages: pdf.numPages, text: text.trim(), pages: pages, images: images, name: file.name };
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
  reset: () => smartImportResetToHome()
};

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
function smartBlankOpen() {
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
  const home = document.querySelector('.smart-docs-home');
  if (home) home.style.display = '';
  const bv = smartBlankEl('smartBlankView');
  if (bv) { bv.classList.remove('blank-visible'); bv.setAttribute('aria-hidden', 'true'); }
  state.smartBlankDoc = null;
  // PART 15 — hide the logo selector when leaving the editor.
  const logobar = smartLogoBarEl();
  if (logobar) { logobar.classList.remove('open'); logobar.setAttribute('aria-hidden', 'true'); }
  smartLogoPosition = SMART_LOGO_DEFAULT_POS;
}

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
  reset: () => smartSigProtectReset()
};
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
    if (!f.b && !f.i && !f.u && !f.c) return;
    runs.push({ start, end, bold: !!f.b, italic: !!f.i, underline: !!f.u, color: f.c || undefined });
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
      nf = {
        b: f.b || tag === 'B' || tag === 'STRONG' || parseFloat(cs.fontWeight) >= 600,
        i: f.i || tag === 'I' || tag === 'EM' || cs.fontStyle === 'italic',
        u: f.u || tag === 'U' || (cs.textDecorationLine && cs.textDecorationLine.indexOf('underline') >= 0),
        c: f.c || nodeColor
      };
    } catch (e) { nf = f; }
    for (let i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i], nf);
    if (isNoteBlockTag(tag) && text.length && text[text.length - 1] !== '\n') {
      text.push('\n');
      offset++;
    }
  }

  walk(root, { b: false, i: false, u: false, c: null });

  let body = text.join('');
  const keep = body.replace(/\n+$/, '').length;      // drop trailing blank lines
  const keptRuns = [];
  for (const r of runs) {
    if (r.end <= keep) keptRuns.push(r);
    else if (r.start < keep) keptRuns.push({ start: r.start, end: keep, bold: r.bold, italic: r.italic, underline: r.underline, color: r.color });
  }
  body = keep < body.length ? body.slice(0, keep) : body;

  // Merge adjacent runs with identical flags and color (keeps the model minimal).
  const merged = [];
  for (const r of keptRuns) {
    const last = merged[merged.length - 1];
    if (last && last.end === r.start && last.bold === r.bold && last.italic === r.italic && last.underline === r.underline && last.color === r.color) {
      last.end = r.end;
    } else {
      merged.push({ start: r.start, end: r.end, bold: r.bold, italic: r.italic, underline: r.underline, color: r.color });
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
    const m = styleText.match(/color\s*:\s*([^;]+)/i);
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
  let html = '';
  let pos = 0;
  for (const r of runs) {
    let s = Math.max(0, Math.floor(r.start));
    const e = Math.min(text.length, Math.floor(r.end));
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
    html += seg;
    pos = e;
  }
  if (pos < text.length) html += escapeNoteText(text.slice(pos));
  return html.replace(/\n/g, '<br>');
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
    } else {
      out.push('<div class="note-block">' + buildNoteBodyHTML(b.body, b.formatting) + '</div>');
    }
  });
  return out.join('');
}

// Safely render an optional colspan/rowspan attribute from stored cell data.
// Values are coerced to a finite integer > 1 (anything else -> omit) so stored
// data can never inject markup into the attribute. (PHASE 2: Merge Cells)
function noteTableCellSpanAttr(cell, prop) {
  if (!cell || typeof cell[prop] !== 'number') return '';
  const v = Math.floor(cell[prop]);
  return Number.isFinite(v) && v > 1 ? ' ' + prop.toLowerCase() + '="' + v + '"' : '';
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
  html += '<div class="note-table-controls" role="toolbar" aria-label="Table actions">';
  // Group A: Table structure (rows / columns / merge / split).
  html += '<span class="note-table-group note-table-group-structure">';
  const t = translations[state.locale] || translations.en;
  html += '<button type="button" class="note-table-ctl" data-table-action="add-row" data-i18n="noteTableAddRow" title="Add row">' + (t.noteTableAddRow || '+ Row') + '</button>';
  html += '<button type="button" class="note-table-ctl" data-table-action="add-col" data-i18n="noteTableAddCol" title="Add column">' + (t.noteTableAddCol || '+ Col') + '</button>';
  html += '<button type="button" class="note-table-ctl" data-table-action="del-row" data-i18n="noteTableDelRow" title="Delete row">' + (t.noteTableDelRow || '- Row') + '</button>';
  html += '<button type="button" class="note-table-ctl" data-table-action="del-col" data-i18n="noteTableDelCol" title="Delete column">' + (t.noteTableDelCol || '- Col') + '</button>';
  html += '<button type="button" class="note-table-ctl" data-table-action="merge-cells" data-i18n="noteTableMergeCells" title="Merge cells">' + (t.noteTableMergeCells || 'Merge Cells') + '</button>';
  html += '<button type="button" class="note-table-ctl" data-table-action="split-cell" title="Split cell" hidden>Split Cell</button>';
  html += '</span>';
  // Group B: Appearance (borders).
  html += '<span class="note-table-group note-table-group-appearance">';
  html += noteTableBorderSelectHTML(block.borderStyle);
  html += '</span>';
  // Group C: Alignment (horizontal + vertical).
  html += '<span class="note-table-group note-table-group-alignment">';
  html += noteTableHAlignSelectHTML();
  html += noteTableVAlignSelectHTML();
  html += '</span>';
  html += '</div>';
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

// Single inline style attribute for a PDF cell. Combines:
//   - explicit normalized background colour (if any),
//   - horizontal text-align: explicit alignH if present, else auto via pdfCellAlign,
//   - vertical-align: explicit alignV if present, else middle,
//   - wrapping rules so content stays inside the cell.
// Every value comes from an allow-list / normalized colour / fixed string —
// never raw user input, so there is no CSS injection surface.
function notePdfTableCellStyle(cell) {
  const parts = ['white-space:normal;word-break:break-word;overflow-wrap:anywhere;'];
  const text = cell && typeof cell.text === 'string' ? cell.text : '';
  const bg = normalizeNoteTextColor(cell && cell.backgroundColor);
  if (bg) parts.push('background-color:' + bg + ';');
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
    '>' + noteTableColgroupHTML(block, colCount);
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

// Printable body of a note: text blocks + PDF tables, all content escaped.
function buildNotePdfBodyHTML(blocks) {
  const out = [];
  (Array.isArray(blocks) ? blocks : []).forEach((b) => {
    if (!b) return;
    if (b.type === 'table') {
      out.push('<div class="eq-pdf-table-wrap">' + buildNoteTableBlockPdfHTML(b) + '</div>');
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

  const html = `<!DOCTYPE html>
<html lang="${t.locale || 'en'}">
<head>
<meta charset="utf-8">
<title>EQ Note PDF</title>
<style>
  .eq-note-report { color:#000000; background:#ffffff; }
  .eq-note-header { border-bottom:2px solid #0891b2; padding-bottom:8px; margin-bottom:12px; }
  .eq-note-header h1 { margin:0; font-size:18px; color:#000000; }
  .eq-note-header .sub { font-size:12px; color:#000000; }
  .eq-note-header .meta { font-size:11px; color:#000000; margin-top:2px; }
  .eq-note-title { font-size:20px; color:#000000; margin:12px 0 8px; word-break:break-word; overflow-wrap:anywhere; }
  .eq-pdf-text-block { color:#000000; margin:0 0 10px; font-size:13px; line-height:1.55; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap; }
  .eq-pdf-table-wrap { margin:10px 0; }
  .eq-pdf-note-table { width:100%; border-collapse:collapse; table-layout:auto; }
  .eq-pdf-note-table.eq-pdf-fixed { table-layout:fixed; width:auto; }
  .eq-pdf-note-table th, .eq-pdf-note-table td { border:1px solid #cbd5e1; padding:6px 8px; font-size:12px; color:#000000; }
  .eq-pdf-note-table thead { display:table-header-group; }
  .eq-pdf-note-table thead th { background:#0d9488; color:#000000; font-weight:700; text-align:center; vertical-align:middle; }
  .eq-pdf-note-table tbody tr { page-break-inside:avoid; break-inside:avoid; }
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
  .eq-note-footer { margin-top:20px; padding-top:10px; border-top:2px solid #0891b2; text-align:center; }
  .eq-note-footer .fb { font-size:12px; color:#000000; font-weight:700; }
  .eq-note-footer .ft { font-size:11px; color:#000000; font-style:italic; }
</style>
</head>
<body>
  <div class="eq-note-report" id="note-report">
    <div class="eq-note-header">
      <h1>${escapeHtml(brandTitle)}</h1>
      <div class="sub">${escapeHtml(brandSub)}</div>
      <div class="meta"${pdfCellDir(title + ' ' + (note && (note.body || ''))) === 'rtl' ? ' dir="rtl"' : ''}>${escapeHtml(exportedAt)}</div>
    </div>
    <h2 class="eq-note-title" dir="${titleDir}">${escapeHtml(title)}</h2>
    <div class="eq-note-body">${bodyHtml}</div>
    <div class="eq-note-footer">
      <div class="fb">${escapeHtml(footerNote)}</div>
      <div class="ft">${escapeHtml(footerTagline)}</div>
    </div>
  </div>
</body>
</html>`;
  return html;
}

// Render a Note to a PDF Blob using the same html2pdf/html2canvas/jsPDF
// pipeline as the History export (proven approach), with the note body
// rendered from its stored blocks while preserving every table feature and
// applying intelligent automatic layout only as a fallback.
async function buildNotePdfBlob(note) {
  if (typeof window.html2pdf === 'undefined') {
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

// Flatten blocks into a single plain-text preview string (keeps the notes-list
// preview and any legacy consumers reading `note.body` working for table notes).
function flattenBlocksForPreview(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((b) => {
    if (b && b.type === 'table') {
      return (Array.isArray(b.rows) ? b.rows : []).map((row) =>
        (Array.isArray(row) ? row : []).map((c) => (c && typeof c.text === 'string' ? c.text : '')).join(' | ')
      ).join('\n');
    }
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
  if (!hasTable) return extractNoteBodyAndFormatting(root);
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
    } else {
      textBuf.push(child);
    }
  });
  flush();
  if (!blocks.some((b) => b.type === 'table')) return extractNoteBodyAndFormatting(root);
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
}

function buildTableElement(rows, cols, header) {
  const wrap = document.createElement('div');
  wrap.className = 'note-table-wrap';
  wrap.setAttribute('contenteditable', 'false');
  const controls = document.createElement('div');
  controls.className = 'note-table-controls';
  controls.setAttribute('role', 'toolbar');
  // Group A: Table structure (rows / columns / merge / split).
  const groupStructure = document.createElement('span');
  groupStructure.className = 'note-table-group note-table-group-structure';
  const t = translations[state.locale] || translations.en;
  [['add-row', 'noteTableAddRow', 'Add row'], ['add-col', 'noteTableAddCol', 'Add column'], ['del-row', 'noteTableDelRow', 'Delete row'], ['del-col', 'noteTableDelCol', 'Delete column'], ['merge-cells', 'noteTableMergeCells', 'Merge cells'], ['split-cell', '', 'Split cell']].forEach(([action, key, title]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'note-table-ctl';
    b.dataset.tableAction = action;
    if (key) b.setAttribute('data-i18n', key);
    b.title = title;
    b.textContent = key ? (t[key] || title) : 'Split Cell';
    if (action === 'split-cell') b.hidden = true;
    groupStructure.appendChild(b);
  });
  controls.appendChild(groupStructure);
  // Group B: Appearance (borders).
  const groupAppearance = document.createElement('span');
  groupAppearance.className = 'note-table-group note-table-group-appearance';
  controls.appendChild(groupAppearance);
  groupAppearance.insertAdjacentHTML('beforeend', noteTableBorderSelectHTML('all'));
  // Group C: Alignment (horizontal + vertical).
  const groupAlignment = document.createElement('span');
  groupAlignment.className = 'note-table-group note-table-group-alignment';
  controls.appendChild(groupAlignment);
  groupAlignment.insertAdjacentHTML('beforeend', noteTableHAlignSelectHTML());
  groupAlignment.insertAdjacentHTML('beforeend', noteTableVAlignSelectHTML());
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
  wrap.appendChild(controls);
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
  noteBodyInput.focus();
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
  updateNoteCellBackgroundButton();
  updateCellAlignControls();
  if (noteTitleInput) noteTitleInput.value = note.title;
  renderNoteBody(note);
  if (fullScreenNoteModal) {
    fullScreenNoteModal.classList.add('show');
    fullScreenNoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
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
  saveNotesData();
  renderNotes();
  renderFolderTabs();
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

function renderNotes() {
  if (!notesList) return;
  const notes = getNotesForActiveFolder();
  const t = translations[state.locale] || translations.en;
  notesList.innerHTML = notes.map(note => {
    const preview = (note.body || '').slice(0, 80);
    const dateStr = new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(state.locale, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    return `
      <li class="note-item" data-note-id="${note.id}">
        <div class="note-item-main">
          <span class="note-item-title">${escapeHtml(note.title || t.untitled || 'Untitled')}</span>
          ${preview ? `<span class="note-item-preview">${escapeHtml(preview)}</span>` : ''}
          <span class="note-item-meta">${escapeHtml(dateStr)}</span>
        </div>
        <div class="note-item-actions">
          <button class="note-action-btn delete" data-action="delete" data-note-id="${note.id}" aria-label="Delete" title="${t.deleteNoteBtn || 'Delete'}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </li>`;
  }).join('');

  if (notesEmptyState) notesEmptyState.classList.toggle('hidden', notes.length > 0);
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
      if (e.key === 'Escape' && (escScan || escImport || escEditor || escBlank || escTemplates)) {
        e.preventDefault();
        if (escScan) smartScanResetToHome();
        else if (escBlank) { smartBlankResetToHome(); setSmartDocsStep(1); }
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
      } else if (action === 'smart-new-doc') { // PART 6
        e.preventDefault();
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
  const scanRescanBtn = document.getElementById('scanRescanBtn');
  if (scanRescanBtn) scanRescanBtn.addEventListener('click', onSmartScanRescan);
  const scanAcceptBtn = document.getElementById('scanAcceptBtn');
  if (scanAcceptBtn) scanAcceptBtn.addEventListener('click', onSmartScanAccept);
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
  if (smartEditorBack) smartEditorBack.addEventListener('click', smartImportResetToHome);
  // PART 6 — blank document workspace wiring
  const smartBlankBack = document.getElementById('smartBlankBack');
  if (smartBlankBack) smartBlankBack.addEventListener('click', () => { smartBlankResetToHome(); setSmartDocsStep(1); });
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
      const actionBtn = e.target.closest('[data-action="delete"]');
      if (actionBtn) {
        e.stopPropagation();
        const noteId = actionBtn.getAttribute('data-note-id');
        if (noteId) deleteNote(noteId);
        return;
      }
      const item = e.target.closest('.note-item');
      if (!item) return;
      const noteId = item.getAttribute('data-note-id');
      if (noteId) openFullScreenNote(noteId);
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
  const noteFormatButtons = [noteBoldBtn, noteItalicBtn, noteUnderlineBtn];
  noteFormatButtons.forEach((btn) => {
    if (!btn) return;
    const cmd = btn.dataset && btn.dataset.format;
    if (!cmd) return;
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => applyNoteFormat(cmd));
  });
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
    if (!isMobileDevice()) return;
    const toolbar = createMobileTableToolbar();
    if (!toolbar) return;
    // The toolbar is docked as a normal flex row below the editable note body
    // (above the on-screen keyboard). No body scroll locking is used, so the
    // page never freezes or jumps when the keyboard opens / closes.
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

      if (isMobileDevice()) {
        showMobileTableToolbar();
      }
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
  if (exportNotePdfBtn) {
        exportNotePdfBtn.addEventListener('click', async () => {
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
        showToast('PDF generation failed: ' + (err.message || err));
        return;
      }
      // Guard: only ever share/download a correctly-typed PDF Blob as a .pdf.
      if (!blob || blob.type !== 'application/pdf') {
        showToast('PDF generation failed: invalid PDF');
        return;
      }
      const noteTitle = (note.title && String(note.title).trim()) || (t.untitled || 'Untitled');
      const filename = notePdfFilename(noteTitle);
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
            title: noteTitle,
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
      const spinIcon = refreshRatesButton.querySelector('.fa-rotate');
      if (spinIcon) spinIcon.classList.add('spinning');
      try {
        await fetchCurrencyRates();
        updateConverterOutput();
      } catch (e) {
        // Rates failed to update; the converter keeps working with cached data.
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
}

// Guard for browser environment - only run initialize in browser
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initialize);
}
