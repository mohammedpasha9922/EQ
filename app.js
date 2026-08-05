import { numberToWords } from './numberToWords.js';
import CurrencyService from './currencyService.js';

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
const languageSelect = typeof document !== 'undefined' ? document.getElementById('languageSelect') : null;
const topBarLanguageSelect = typeof document !== 'undefined' ? document.getElementById('topBarLanguageSelect') : null;
const themeButtons = typeof document !== 'undefined' ? document.querySelectorAll('.theme-option') : [];
const percentAmount = typeof document !== 'undefined' ? document.getElementById('percentAmount') : null;
const percentRate = typeof document !== 'undefined' ? document.getElementById('percentRate') : null;
const percentResult = typeof document !== 'undefined' ? document.getElementById('percentResult') : null;
const percentWords = typeof document !== 'undefined' ? document.getElementById('percentWords') : null;
const percentPanel = typeof document !== 'undefined' ? document.getElementById('percentPanel') : null;
const percentToggle = typeof document !== 'undefined' ? document.getElementById('percentToggle') : null;
const percentBackButton = typeof document !== 'undefined' ? document.getElementById('percentBackButton') : null;
const keypadGrid = typeof document !== 'undefined' ? document.querySelector('.keypad-grid') : null;
const historyList = typeof document !== 'undefined' ? document.getElementById('historyList') : null;
const noteInput = typeof document !== 'undefined' ? document.getElementById('noteInput') : null;
const addNoteButton = typeof document !== 'undefined' ? document.getElementById('addNoteButton') : null;
const quickNoteInput = typeof document !== 'undefined' ? document.getElementById('quickNoteInput') : null;
const saveQuickNoteButton = typeof document !== 'undefined' ? document.getElementById('saveQuickNoteButton') : null;
const quickNotesList = typeof document !== 'undefined' ? document.getElementById('quickNotesList') : null;
const collapseQuickNotesButton = typeof document !== 'undefined' ? document.getElementById('collapseQuickNotes') : null;
const quickNotesPanel = typeof document !== 'undefined' ? document.getElementById('quickNotesPanel') : null;
const exportHistoryButton = typeof document !== 'undefined' ? document.getElementById('exportHistory') : null;
const selectAllHistoryButton = typeof document !== 'undefined' ? document.getElementById('selectAllHistory') : null;
const historyBackButton = typeof document !== 'undefined' ? document.getElementById('historyBackButton') : null;
const scientificToggle = typeof document !== 'undefined' ? document.getElementById('scientificToggle') : null;
const scientificPanel = typeof document !== 'undefined' ? document.getElementById('scientificPanel') : null;
const speechButton = typeof document !== 'undefined' ? document.getElementById('speechButton') : null;
const soundToggle = typeof document !== 'undefined' ? document.getElementById('soundToggle') : null;
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
const drawerCloseButton = typeof document !== 'undefined' ? document.getElementById('drawerCloseButton') : null;
const drawerMenuItems = typeof document !== 'undefined' ? document.querySelectorAll('.drawer-menu-item') : [];
const settingsModal = typeof document !== 'undefined' ? document.getElementById('settingsModal') : null;
const settingsCloseButton = typeof document !== 'undefined' ? document.getElementById('settingsCloseButton') : null;
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

const translations = {
  en: {
    eyebrow: 'Precision Calculator',
    title: 'EQ Calculator',
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
    soundHapticsLabel: 'Button sound & haptics',
    soundHapticsCaption: 'Enable click sounds and vibration',
    modeGeneral: 'General Calculator',
    scientificToggle: 'Scientific',
    percentResultLabel: 'Result',
    currencyConverterTitle: 'Direct Currency Converter',
    currencyConverterSubtitle: 'Convert amounts instantly with live rates.',
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
    drawerEyebrow: 'EQ TOOLS',
    drawerTitle: 'EQ Tools',
    drawerHistory: 'History',
    drawerNotes: 'Notes',
    drawerConverter: 'Direct Currency Converter',
    drawerDirectory: 'Global Currency Directory & Search',
    drawerInstall: 'Install App',
    drawerSettings: 'Settings',
    installModalTitle: 'Install on iPhone',
    installModalStep1: 'Step 1: Tap the Share button (⎘ / ⇡) at the bottom or top of the browser.',
    installModalStep2: 'Step 2: Choose "Add to Home Screen" from the menu.'
  },
  es: {
    eyebrow: 'Calculadora de precisión',
    title: 'Calculadora EQ',
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
    soundHapticsLabel: 'Sonido y hápticos',
    soundHapticsCaption: 'Activar sonidos de clic y vibración',
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
    drawerEyebrow: 'HERRAMIENTAS EQ',
    drawerTitle: 'Herramientas EQ',
    drawerHistory: 'Historial',
    drawerNotes: 'Notas',
    drawerConverter: 'Conversor directo de divisas',
    drawerDirectory: 'Directorio global de divisas',
    drawerInstall: 'Instalar app',
    drawerSettings: 'Ajustes',
    installModalTitle: 'Instalar en iPhone',
    installModalStep1: 'Paso 1: Toca el botón Compartir (⎘ / ⇡) en la parte inferior o superior del navegador.',
    installModalStep2: 'Paso 2: Elige "Añadir a pantalla de inicio" en el menú.'
  },
  ar: {
    eyebrow: 'آلة حاسبة دقيقة',
    title: 'حاسبة EQ',
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
    soundHapticsLabel: 'صوت الأزرار والاهتزاز',
    soundHapticsCaption: 'تفعيل أصوات النقر والاهتزاز',
    modeGeneral: 'آلة حاسبة عامة',
    scientificToggle: 'علمية',
    percentResultLabel: 'النتيجة',
    currencyConverterTitle: 'محول العملات المباشر',
    currencyConverterSubtitle: 'حول المبالغ فوراً بأسعار حية.',
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
    drawerEyebrow: 'أدوات EQ',
    drawerTitle: 'أدوات EQ',
    drawerHistory: 'السجل',
    drawerNotes: 'الملاحظات',
    drawerConverter: 'محول العملات المباشر',
    drawerDirectory: 'الدليل العالمي للعملات والبحث',
    drawerInstall: 'تثبيت التطبيق',
    drawerSettings: 'الإعدادات',
    installModalTitle: 'التثبيت على iPhone',
    installModalStep1: 'الخطوة 1: اضغط على زر المشاركة (⎘ / ⇡) في أسفل أو أعلى المتصفح.',
    installModalStep2: 'الخطوة 2: اختر "إضافة إلى الشاشة الرئيسية" من القائمة.'
  },
  fr: {
    eyebrow: 'Calculatrice de précision',
    title: 'Calculatrice EQ',
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
    soundHapticsLabel: 'Son et haptique',
    soundHapticsCaption: 'Activer les sons de clic et les vibrations',
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
    drawerEyebrow: 'OUTILS EQ',
    drawerTitle: 'Outils EQ',
    drawerHistory: 'Historique',
    drawerNotes: 'Notes',
    drawerConverter: 'Convertisseur de devises direct',
    drawerDirectory: 'Répertoire mondial des devises & recherche',
    drawerInstall: 'Installer l\'application',
    drawerSettings: 'Paramètres',
    installModalTitle: 'Installer sur iPhone',
    installModalStep1: 'Étape 1 : Appuyez sur le bouton Partager (⎘ / ⇡) en bas ou en haut du navigateur.',
    installModalStep2: 'Étape 2 : Choisissez "Ajouter à l\'écran d\'accueil" dans le menu.'
  },
  ru: {
    eyebrow: 'Точный калькулятор',
    title: 'Калькулятор EQ',
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
    soundHapticsLabel: 'Звук кнопок и тактильная связь',
    soundHapticsCaption: 'Включить звуки кликов и вибрацию',
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
    drawerEyebrow: 'ИНСТРУМЕНТЫ EQ',
    drawerTitle: 'Инструменты EQ',
    drawerHistory: 'История',
    drawerNotes: 'Заметки',
    drawerConverter: 'Прямой конвертер валют',
    drawerDirectory: 'Глобальный справочник валют и поиск',
    drawerInstall: 'Установить приложение',
    drawerSettings: 'Настройки',
    installModalTitle: 'Установка на iPhone',
    installModalStep1: 'Шаг 1: Нажмите кнопку «Поделиться» (⎘ / ⇡) внизу или вверху браузера.',
    installModalStep2: 'Шаг 2: Выберите «На главный экран» в меню.'
  },
  de: {
    eyebrow: 'Präzisionsrechner',
    title: 'EQ-Rechner',
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
    soundHapticsLabel: 'Tastenton & Haptik',
    soundHapticsCaption: 'Klickgeräusche und Vibration aktivieren',
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
    drawerEyebrow: 'EQ-TOOLS',
    drawerTitle: 'EQ-Tools',
    drawerHistory: 'Verlauf',
    drawerNotes: 'Notizen',
    drawerConverter: 'Direkter Währungsrechner',
    drawerDirectory: 'Globales Währungsverzeichnis & Suche',
    drawerInstall: 'App installieren',
    drawerSettings: 'Einstellungen',
    installModalTitle: 'Auf iPhone installieren',
    installModalStep1: 'Schritt 1: Tippen Sie auf die Schaltfläche Teilen (⎘ / ⇡) unten oder oben im Browser.',
    installModalStep2: 'Schritt 2: Wählen Sie „Zum Home-Bildschirm hinzufügen" aus dem Menü.'
  },
  tr: {
    eyebrow: 'Hassas Hesap Makinesi',
    title: 'EQ Hesap Makinesi',
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
    soundHapticsLabel: 'Ses ve dokunsal geri bildirim',
    soundHapticsCaption: 'Tıklama seslerini ve titreşimi etkinleştir',
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
    drawerEyebrow: 'EQ ARAÇLARI',
    drawerTitle: 'EQ Araçları',
    drawerHistory: 'Geçmiş',
    drawerNotes: 'Notlar',
    drawerConverter: 'Doğrudan Döviz Çevirici',
    drawerDirectory: 'Küresel Döviz Rehberi ve Arama',
    drawerInstall: 'Uygulamayı Yükle',
    drawerSettings: 'Ayarlar',
    installModalTitle: 'iPhone\'a Yükle',
    installModalStep1: 'Adım 1: Tarayıcının altındaki veya üstündeki Paylaş düğmesine dokunun (⎘ / ⇡).',
    installModalStep2: 'Adım 2: Menüden "Ana Ekrana Ekle"yi seçin.'
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
  hasPressedEquals: false,
  displayValue: '0',
  expression: '',
  pendingOperator: null,
  storedValue: null,
  startNewNumber: true,
  historyCountdownTimer: null,
  noteSaveTimer: null,
  currentOpenNote: null,
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
const HISTORY_KEY = 'eq-history';

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function showToast(message) {
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
  }, 1600);
}

function triggerButtonFeedback() {
  if (!state.soundEnabled) return;
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  } catch (e) { /* ignore */ }
}

function formatNumber(value) {
  if (value === null || value === undefined || value === '') return '0';
  let num;
  if (typeof value === 'object' && value !== null && typeof value.toString === 'function') {
    num = new Decimal(value.toString());
  } else {
    num = new Decimal(String(value));
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
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
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
// EXPRESSION EVALUATOR (Recursive-descent parser)
// ============================================================
function tokenizeExpression(expr) {
  const tokens = [];
  let i = 0;
  const str = String(expr).trim();
  while (i < str.length) {
    const ch = str[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch >= '0' && ch <= '9' || ch === '.') {
      let numStr = '';
      while (i < str.length && (/[\d.]/.test(str[i]))) {
        numStr += str[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: numStr });
      continue;
    }
    if (ch === '+' || ch === '-') {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }
    if (ch === '*' || ch === '/') {
      tokens.push({ type: 'OPERATOR', value: ch });
      i++;
      continue;
    }
    if (ch === '^') {
      tokens.push({ type: 'POWER', value: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ch });
      i++;
      continue;
    }
    if (ch === '%') {
      tokens.push({ type: 'PERCENT', value: ch });
      i++;
      continue;
    }
    // Check for sqrt( function name
    if (/[a-zA-Z]/.test(ch)) {
      let name = '';
      while (i < str.length && /[a-zA-Z]/.test(str[i])) {
        name += str[i];
        i++;
      }
      if (name === 'sqrt') {
        tokens.push({ type: 'FUNC_SQRT', value: name });
      } else {
        throw new Error(`Unknown function: ${name}`);
      }
      continue;
    }
    throw new Error(`Unexpected character: ${ch}`);
  }
  return tokens;
}

function parseExpression(tokens) {
  let pos = 0;
  function peek() {
    return tokens[pos];
  }
  function next() {
    return tokens[pos++];
  }
  function parsePrimary() {
    const token = next();
    if (!token) throw new Error('Unexpected end of expression');
    if (token.type === 'NUMBER') {
      return new Decimal(token.value);
    }
    if (token.type === 'LPAREN') {
      const value = parseExpressionTokens();
      const closing = next();
      if (!closing || closing.type !== 'RPAREN') throw new Error('Missing closing parenthesis');
      return value;
    }
    if (token.type === 'FUNC_SQRT') {
      const lp = next();
      if (!lp || lp.type !== 'LPAREN') throw new Error('Expected ( after sqrt');
      const value = parseTerm();
      const rp = next();
      if (!rp || rp.type !== 'RPAREN') throw new Error('Missing ) after sqrt');
      return value.sqrt ? value.sqrt() : new Decimal(Math.sqrt(Number(value.toString())));
    }
    if (token.type === 'PERCENT') {
      // Leading percent not valid
      throw new Error('Unexpected %');
    }
    throw new Error(`Unexpected token: ${token.type}`);
  }
  function parseUnary() {
    const token = peek();
    if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      next();
      const operand = parseUnary();
      if (token.value === '-') return operand.neg ? operand.neg() : new Decimal(-Number(operand.toString()));
      return operand;
    }
    return parsePrimary();
  }
  function parsePower() {
    let left = parseUnary();
    let token = peek();
    while (token && token.type === 'POWER') {
      next();
      const right = parseUnary();
      left = left.pow ? left.pow(right) : new Decimal(Math.pow(Number(left.toString()), Number(right.toString())));
      token = peek();
    }
    return left;
  }
  function parseTerm() {
    let left = parsePower();
    let token = peek();
    while (token && token.type === 'OPERATOR' && (token.value === '*' || token.value === '/')) {
      next();
      const right = parsePower();
      if (token.value === '*') {
        left = left.mul(right);
      } else {
        left = left.div(right);
      }
      token = peek();
    }
    return left;
  }
  function parseExpressionTokens() {
    let left = parseTerm();
    let token = peek();
    while (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
      next();
      const right = parseTerm();
      if (token.value === '+') {
        left = left.add(right);
      } else {
        left = left.sub(right);
      }
      token = peek();
    }
    return left;
  }
  const result = parseExpressionTokens();
  if (pos < tokens.length) {
    throw new Error('Unexpected tokens at end of expression');
  }
  return result;
}

export function evaluateExpression(expr) {
  const tokens = tokenizeExpression(expr);
  const result = parseExpression(tokens);
  const num = result.toString();
  // Normalize decimal output
  let normalized = num;
  if (num.includes('e') || num.includes('E')) {
    try {
      normalized = new Decimal(num).toFixed();
    } catch (e) {
      normalized = num;
    }
  }
  // Remove trailing zeros in decimal
  if (normalized.includes('.')) {
    normalized = normalized.replace(/\.?0+$/, '');
    if (normalized.endsWith('.')) normalized = normalized.slice(0, -1);
  }
  if (normalized === '-0') return '0';
  return normalized;
}

// ============================================================
// CALCULATOR LOGIC
// ============================================================
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
  let parts = [];
  if (state.storedValue !== null) parts.push(formatNumber(state.storedValue));
  if (state.pendingOperator) parts.push(state.pendingOperator);
  if (state.displayValue !== '0' && !state.startNewNumber && !state.hasPressedEquals) {
    parts.push(formatNumber(state.displayValue));
  }
  return parts.join(' ');
}

function displayOperator(op) {
  const symbolMap = { '*': '×', '/': '÷', '+': '+', '-': '−' };
  return symbolMap[op] || op;
}

function appendDigit(digit) {
  triggerButtonFeedback();
  state.hasPressedEquals = false;
  if (state.startNewNumber || state.displayValue === '0') {
    if (digit === '.') {
      state.displayValue = '0.';
    } else {
      state.displayValue = digit;
    }
    state.startNewNumber = false;
  } else {
    if (digit === '.' && state.displayValue.includes('.')) {
      return;
    }
    state.displayValue += digit;
  }
  updatePrimaryDisplay();
  updateSecondaryDisplay();
  syncExpressionDisplay();
  evaluateLiveResult();
}

function applyOperator(op) {
  triggerButtonFeedback();
  const currentValue = new Decimal(state.displayValue);
  state.hasPressedEquals = false;

  if (state.pendingOperator && !state.startNewNumber) {
    // Chain operation: compute previous with current
    const prev = new Decimal(state.storedValue);
    let result;
    switch (state.pendingOperator) {
      case '+': result = prev.add(currentValue); break;
      case '-': result = prev.sub(currentValue); break;
      case '*': result = prev.mul(currentValue); break;
      case '/': result = currentValue.isZero && currentValue.isZero() ? new Decimal(0) : prev.div(currentValue); break;
      default: result = currentValue;
    }
    state.storedValue = result.toString();
  } else {
    state.storedValue = state.displayValue;
  }
  state.pendingOperator = op;
  state.startNewNumber = true;
  state.displayValue = state.storedValue;
  updatePrimaryDisplay();
  updateSecondaryDisplay();
  syncExpressionDisplay();
}

function handlePercent() {
  triggerButtonFeedback();
  if (state.displayValue !== '' && state.displayValue !== '0') {
    const value = new Decimal(state.displayValue);
    state.displayValue = value.div(100).toString();
    updatePrimaryDisplay();
    updateSecondaryDisplay();
    syncExpressionDisplay();
    evaluateLiveResult();
  }
}

function handleEquals() {
  triggerButtonFeedback();
  const expr = buildExpressionString();
  if (!expr.trim()) return;
  try {
    const result = evaluateExpression(expr);
    state.storedValue = null;
    state.pendingOperator = null;
    state.displayValue = result;
    state.startNewNumber = true;
    state.hasPressedEquals = true;
    // Keep the full expression string for history display
    const displayExpr = state.expression || expr;
    state.expression = `${displayExpr} =`;
    updatePrimaryDisplay();
    updateSecondaryDisplay();
    updateExpressionDisplay();
    addHistory(displayExpr.replace(/ =$/, '').trim(), result);
    speakCurrentResult();
  } catch (e) {
    showToast('Error');
    state.displayValue = 'Error';
    updatePrimaryDisplay();
  }
}

function evaluateLiveResult() {
  const expr = buildExpressionString();
  if (!expr.trim() || state.hasPressedEquals) return;
  try {
    const result = evaluateExpression(expr);
    if (expressionDisplay && !state.pendingOperator && expr !== '' && state.displayValue !== '0') {
      // Show live result in expression display
    }
  } catch (e) {
    // Ignore - just showing live evaluation where possible
  }
}

function clearAll() {
  triggerButtonFeedback();
  state.displayValue = '0';
  state.expression = '';
  state.pendingOperator = null;
  state.storedValue = null;
  state.startNewNumber = true;
  state.hasPressedEquals = false;
  updatePrimaryDisplay();
  updateSecondaryDisplay();
  updateExpressionDisplay();
}

function backspace() {
  triggerButtonFeedback();
  if (state.startNewNumber) return;
  if (state.displayValue.length > 1) {
    state.displayValue = state.displayValue.slice(0, -1);
  } else {
    state.displayValue = '0';
    state.startNewNumber = true;
  }
  updatePrimaryDisplay();
  updateSecondaryDisplay();
  syncExpressionDisplay();
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
    await navigator.clipboard.writeText(text);
    showToast(translations[state.locale].copied || 'Result copied');
  } catch (e) {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast(translations[state.locale].copied || 'Result copied');
    } catch (e2) {
      showToast('Copy failed');
    }
    document.body.removeChild(textarea);
  }
}

async function pasteNumber() {
  triggerButtonFeedback();
  try {
    const text = await navigator.clipboard.readText();
    const cleaned = text.replace(/[^\d.\-+*/()]/g, '');
    if (cleaned) {
      state.displayValue = cleaned;
      state.startNewNumber = false;
      state.hasPressedEquals = false;
      updatePrimaryDisplay();
      updateSecondaryDisplay();
      syncExpressionDisplay();
      showToast(translations[state.locale].pasted || 'Number pasted');
    }
  } catch (e) {
    showToast('Paste failed');
  }
}

// ============================================================
// SPEECH
// ============================================================
function speakCurrentResult() {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const text = `${state.displayValue}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.locale === 'ar' ? 'ar-SA' : state.locale === 'es' ? 'es-ES' : state.locale === 'fr' ? 'fr-FR' : state.locale === 'ru' ? 'ru-RU' : state.locale === 'de' ? 'de-DE' : state.locale === 'tr' ? 'tr-TR' : 'en-US';
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
    if (percentResult) percentResult.textContent = '0';
    if (percentWords) percentWords.textContent = '';
    return;
  }
  const result = (amount * rate) / 100;
  if (percentResult) percentResult.textContent = formatNumber(result);
  if (percentWords) {
    percentWords.textContent = numberToWords(result.toString(), state.locale);
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
  if (open) {
    updatePercentPanel();
    if (keypadGrid) keypadGrid.classList.add('percent-open');
  } else {
    if (keypadGrid) keypadGrid.classList.remove('percent-open');
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

function loadHistory() {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      state.history = parsed.filter(entry => (now - (entry.timestamp || now)) < HISTORY_TTL).slice(0, HISTORY_LIMIT);
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
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    expression,
    result,
    timestamp: Date.now(),
    note: ''
  };
  state.history.unshift(entry);
  if (state.history.length > HISTORY_LIMIT) {
    state.history = state.history.slice(0, HISTORY_LIMIT);
  }
  history.entries = state.history;
  saveHistory();
  renderHistory();
}

function renderHistory() {
  if (!historyList) return;
  const t = translations[state.locale] || translations.en;
  if (!state.history.length) {
    historyList.innerHTML = `<li class="empty-history">${t.emptyHistory || 'No history yet'}</li>`;
    return;
  }
  const now = Date.now();
  historyList.innerHTML = state.history.map((entry) => {
    const remaining = HISTORY_TTL - (now - entry.timestamp);
    const remainingText = formatRemainingTime(remaining);
    const timeStr = new Date(entry.timestamp).toLocaleTimeString(state.locale, { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date(entry.timestamp).toLocaleDateString(state.locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/');
    return `
      <li class="history-entry" data-id="${entry.id}">
        <div class="history-entry-header">
          <label class="history-check">
            <input type="checkbox" class="history-select" />
            <span class="history-time">${timeStr}</span>
            <span class="history-date">${dateStr}</span>
          </label>
          <span class="history-remaining">${remainingText} ${t.historyRemaining || 'remaining'}</span>
        </div>
        <div class="history-expression">${escapeHtml(entry.expression)}</div>
        <div class="history-result">= ${escapeHtml(entry.result)}</div>
        <div class="history-note-row">
          <input class="history-note-input" type="text" placeholder="${t.historyNotePlaceholder || 'Tag this calculation'}"
            value="${escapeHtml(entry.note || '')}" data-id="${entry.id}" />
          <button class="history-edit-note-btn" data-id="${entry.id}" title="${t.noteEdit || 'Edit Note'}">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="history-share-btn" data-id="${entry.id}" title="${t.noteShare || 'Share'}">
            <i class="fa-solid fa-share-nodes"></i>
          </button>
        </div>
      </li>
    `;
  }).join('');
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
  if (historyPanel) {
    historyPanel.classList.add('active');
    historyPanel.setAttribute('aria-hidden', 'false');
  }
  renderHistory();
  startHistoryCountdown();
}

function closeHistory() {
  if (historyPanel) {
    historyPanel.classList.remove('active');
    historyPanel.setAttribute('aria-hidden', 'true');
  }
  stopHistoryCountdown();
}

function selectAllHistory() {
  const checkboxes = document.querySelectorAll('.history-select');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
}

async function exportHistory() {
  triggerButtonFeedback();
  const t = translations[state.locale] || translations.en;
  const checkedEntries = Array.from(document.querySelectorAll('.history-select:checked')).map(cb =>
    state.history.find(h => h.id === cb.closest('.history-entry')?.getAttribute('data-id'))
  ).filter(Boolean);

  const entriesToExport = checkedEntries.length ? checkedEntries : state.history;
  if (!entriesToExport.length) {
    showToast(t.noSelection || 'Select an item to share');
    return;
  }
  const data = JSON.stringify({ exportedAt: new Date().toISOString(), entries: entriesToExport }, null, 2);
  const filename = `eq-history-${Date.now()}.json`;

  if (navigator.share && navigator.canShare) {
    try {
      const file = new File([data], filename, { type: 'application/json' });
      await navigator.share({
        files: [file],
        title: t.shareTitle || 'EQ Calculator History',
        text: t.shareMessage || 'Exported from EQ Calculator'
      });
      return;
    } catch (e) {
      // Fall through to download
    }
  }

  // Download fallback
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateEntryNote(id, note) {
  const entry = state.history.find(h => h.id === id);
  if (entry) {
    entry.note = note;
    saveHistory();
  }
}

async function shareEntry(id) {
  const t = translations[state.locale] || translations.en;
  const entry = state.history.find(h => h.id === id);
  if (!entry) return;
  const text = `${entry.expression} = ${entry.result}${entry.note ? ` (${entry.note})` : ''}`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) { /* cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied');
  } catch (e) {
    showToast('Copy failed');
  }
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
  state.history = state.history.filter(entry => (now - entry.timestamp) < HISTORY_TTL);
  document.querySelectorAll('.history-entry').forEach((el) => {
    const id = el.getAttribute('data-id');
    const entry = state.history.find(h => h.id === id);
    if (!entry) {
      el.remove();
      return;
    }
    const remaining = HISTORY_TTL - (now - entry.timestamp);
    const remainingText = formatRemainingTime(remaining);
    const remainingEl = el.querySelector('.history-remaining');
    if (remainingEl) remainingEl.textContent = `${remainingText} ${remainingLabel}`;
  });
  if (!state.history.length && historyList) {
    renderHistory();
    stopHistoryCountdown();
  }
}

// ============================================================
// NOTES SYSTEM
// ============================================================
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
  return state.activeFolder || (state.folders.length ? state.folders[0].id : 'personal');
}

function setActiveFolder(folderId) {
  state.activeFolder = folderId;
  state.noteData.activeFolder = folderId;
  renderNotes();
}

function getNotesForActiveFolder() {
  const folderId = getActiveFolder();
  return state.noteData.notes.filter(n => n.folderId === folderId);
}

function getFolderOptions() {
  return state.folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
}

function renderFolders() {
  if (!foldersList) return;
  if (!state.folders.length) {
    foldersList.innerHTML = '';
    return;
  }
  const activeFolder = getActiveFolder();
  foldersList.innerHTML = state.folders.map(folder => `
    <li class="folder-item ${folder.id === activeFolder ? 'active' : ''}" data-folder-id="${folder.id}">
      <span class="folder-name">${escapeHtml(folder.name)}</span>
      <button class="folder-delete-btn" data-folder-id="${folder.id}" title="Delete">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    </li>
  `).join('');
}

function renderNotes() {
  if (!notesList) return;
  const notes = getNotesForActiveFolder();
  const t = translations[state.locale] || translations.en;
  if (!notes.length) {
    notesList.innerHTML = `<li class="empty-list">${t.noSelection && translations.en.noSelection ? '' : ''}No notes yet</li>`;
    return;
  }
  notesList.innerHTML = notes.map(note => `
    <li class="note-item" data-note-id="${note.id}">
      <span class="note-item-title">${escapeHtml(note.title || 'Untitled')}</span>
      <span class="note-item-date">${new Date(note.updatedAt || note.createdAt || Date.now()).toLocaleDateString(state.locale)}</span>
    </li>
  `).join('');
}

function openNotesManager() {
  if (notesManagerModal) {
    notesManagerModal.classList.add('show');
    notesManagerModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  loadNoteData();
  renderFolders();
  renderNotes();
}

function closeNotesManager() {
  if (notesManagerModal) {
    notesManagerModal.classList.remove('show');
    notesManagerModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

function addFolder() {
  const name = prompt('Folder name:');
  if (!name || !name.trim()) return;
  const folder = {
    id: 'folder-' + Date.now().toString(36),
    name: name.trim(),
    createdAt: Date.now()
  };
  state.folders.push(folder);
  saveFolders();
  renderFolders();
}

function createFolder(name) {
  const folder = {
    id: 'folder-' + Date.now().toString(36),
    name,
    createdAt: Date.now()
  };
  state.folders.push(folder);
  saveFolders();
  return folder;
}

function deleteFolder(folderId) {
  state.folders = state.folders.filter(f => f.id !== folderId);
  state.noteData.notes = state.noteData.notes.filter(n => n.folderId !== folderId);
  if (getActiveFolder() === folderId) {
    state.activeFolder = state.folders.length ? state.folders[0].id : null;
  }
  persistNoteData();
  renderFolders();
  renderNotes();
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
  if (noteTitleInput) noteTitleInput.value = note.title;
  if (noteBodyInput) noteBodyInput.value = note.body;
  if (noteFolderSelect) {
    noteFolderSelect.innerHTML = getFolderOptions();
    noteFolderSelect.value = note.folderId;
  }
  if (fullScreenNoteModal) {
    fullScreenNoteModal.classList.add('show');
    fullScreenNoteModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
}

function closeFullScreenNote() {
  saveCurrentOpenNote();
  state.currentOpenNote = null;
  if (fullScreenNoteModal) {
    fullScreenNoteModal.classList.remove('show');
    fullScreenNoteModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
}

function saveCurrentOpenNote() {
  if (!state.currentOpenNote) return;
  const note = state.currentOpenNote;
  note.title = noteTitleInput ? noteTitleInput.value.trim() : note.title;
  note.body = noteBodyInput ? noteBodyInput.value : note.body;
  note.folderId = noteFolderSelect ? noteFolderSelect.value : note.folderId;
  note.updatedAt = Date.now();
  saveNotesData();
  renderNotes();
  renderFolders();
}

function scheduleNoteSave() {
  if (state.noteSaveTimer) clearTimeout(state.noteSaveTimer);
  state.noteSaveTimer = setTimeout(() => {
    saveCurrentOpenNote();
  }, 350);
}

function deleteNote(noteId) {
  state.noteData.notes = state.noteData.notes.filter(n => n.id !== noteId);
  saveNotesData();
  renderNotes();
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

function updateConverterOutput() {
  if (!currencyServiceInstance || !currencyFromSelect || !currencyToSelect || !currencyFromAmount) return;
  const fromCode = currencyFromSelect.value;
  const toCode = currencyToSelect.value;
  const amount = parseFloat(currencyFromAmount.value);

  let result = 0;
  if (!isNaN(amount)) {
    if (state.converterMode === 'market' && state.marketRate !== null) {
      result = amount * state.marketRate;
    } else {
      result = currencyServiceInstance.convertCurrency(amount, fromCode, toCode);
    }
  }

  if (currencyToAmount) {
    currencyToAmount.textContent = formatNumber(result.toString());
  }

  // Update rate display
  if (conversionRateDisplay) {
    const rate = state.converterMode === 'market' && state.marketRate !== null
      ? state.marketRate
      : currencyServiceInstance.convertCurrency(1, fromCode, toCode);
    const rateText = `1 ${fromCode} = ${formatNumber(rate.toString())} ${toCode}`;
    conversionRateDisplay.textContent = rateText;
  }

  // Update market rate field
  if (marketRatePrefix) marketRatePrefix.textContent = `1 ${fromCode} =`;
  if (marketRateSuffix) marketRateSuffix.textContent = toCode;
  if (marketRateField) {
    marketRateField.hidden = state.converterMode !== 'market';
  }

  // Update words display
  if (currencyWords && result !== 0) {
    currencyWords.textContent = numberToWords(result.toString(), state.locale);
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

function handleDrawerMenuItem(action) {
  closeDrawer();
  switch (action) {
    case 'open-history':
      openHistory();
      break;
    case 'open-notes':
      openNotesManager();
      break;
    case 'open-converter':
      openCurrencyConverter();
      break;
    case 'open-directory':
      openCurrencyDirectory();
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
  if (soundToggle) soundToggle.checked = state.soundEnabled;
}

function closeSettingsModal() {
  if (settingsModal) {
    settingsModal.classList.remove('show');
    settingsModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
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
  const key = event.key;
  const activeTag = document.activeElement ? document.activeElement.tagName : '';
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
    return;
  }
  if (/^\d$/.test(key)) {
    appendDigit(key);
  } else if (key === '.') {
    appendDigit('.');
  } else if (key === '+' || key === '-' || key === '*' || key === '/') {
    applyOperator(key);
  } else if (key === '%') {
    handlePercent();
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
          pasteNumber();
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

  // Theme buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      triggerButtonFeedback();
      setTheme(btn.getAttribute('data-theme'));
    });
  });

  // Sound toggle
  if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
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
  if (addFolderButton) {
    addFolderButton.addEventListener('click', addFolder);
  }
  if (openNewNoteButton) {
    openNewNoteButton.addEventListener('click', () => {
      closeNotesManager();
      openFullScreenNote(null);
    });
  }
  if (refeshNotesButton) {
    refeshNotesButton.addEventListener('click', () => {
      loadNoteData();
      renderFolders();
      renderNotes();
    });
  }
  if (foldersList) {
    foldersList.addEventListener('click', handleFolderClick);
  }
  if (notesList) {
    notesList.addEventListener('click', handleNotesListClick);
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
  if (noteFolderSelect) {
    noteFolderSelect.addEventListener('change', scheduleNoteSave);
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
      setCurrencyStatus('Updating rates...');
      try {
        await fetchCurrencyRates();
        setCurrencyStatus('Rates updated');
        if (cacheIndicator) cacheIndicator.style.display = 'none';
        updateConverterOutput();
      } catch (e) {
        setCurrencyStatus('Failed to update rates', true);
      }
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

  // Load history
  loadHistory();
  renderHistory();

  // Load notes
  loadNoteData();
  loadQuickNotes();

  // Wire events
  wireEvents();

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