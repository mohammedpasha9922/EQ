/**
 * Currency Service Module
 * Professional currency conversion system with dynamic loading, caching, and error handling
 */

const CURRENCY_CACHE_KEY = 'eq-currency-catalog';
const RATES_CACHE_KEY = 'eq-currency-rates';
const FAVORITES_KEY = 'eq-currency-favorites';
const RECENT_KEY = 'eq-currency-recent';
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Only these currencies are supported in the converter
const SUPPORTED_CURRENCIES = [
  'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN',
  'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BSD', 'BOB',
  'BRL', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY',
  'COP', 'CRC', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN',
  'ETB', 'EUR', 'FJD', 'GBP', 'GEL', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD',
  'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'INR', 'IQD', 'IRR', 'ISK',
  'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KRW', 'KWD', 'KYD',
  'KZT', 'LAK', 'LBP', 'LRD', 'LKR', 'LSL', 'LYD', 'MAD', 'MGA', 'MDL',
  'MKD', 'MNT', 'MUR', 'MVR', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NOK',
  'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PHP', 'PKR', 'PLN', 'QAR', 'RON',
  'RSD', 'RUB', 'SAR', 'SEK', 'SGD', 'THB', 'TRY', 'TTD', 'TWD', 'UAH',
  'USD', 'UZS', 'VND', 'XAF', 'XCD', 'XOF', 'XPF', 'ZAR', 'ZMW', 'TND',
  'TMT', 'TJS', 'TZS', 'MOP', 'SYP', 'SDG', 'SLL', 'SBD', 'SRD', 'SCR',
  'ZWL', 'GIP', 'TOP', 'VUV', 'CUP', 'KPW', 'MMK', 'MRU', 'MWK', 'NIO',
  'PGK', 'PYG', 'RWF', 'SHP', 'SOS', 'SSP', 'STN', 'SVC', 'UGX', 'VES', 'WST', 'YER'
];

// Fallback static catalog used when API fails and no cache exists
const FALLBACK_CATALOG = SUPPORTED_CURRENCIES.map(code => ({
  code,
  name: getCurrencyName(code),
  country: getCountryName(code),
  flag: getCountryFlag(code)
})).sort((a, b) => a.code.localeCompare(b.code));

// Fallback static rates (approximate) used when API fails and no cache exists
const FALLBACK_RATES = {
  AED: 3.6725,
  AFN: 86.00,
  ALL: 94.50,
  AMD: 405.00,
  ANG: 1.79,
  AOA: 835.00,
  ARS: 880.00,
  AUD: 1.52,
  AWG: 1.79,
  AZN: 1.70,
  BAM: 1.80,
  BBD: 2.00,
  BDT: 110.00,
  BGN: 1.82,
  BHD: 0.376,
  BIF: 2860.00,
  BMD: 1,
  BND: 1.35,
  BSD: 1,
  BOB: 6.90,
  BRL: 5.10,
  BTN: 95.24,
  BWP: 13.50,
  BYN: 3.27,
  BZD: 2,
  CAD: 1.36,
  CDF: 2271.48,
  CHF: 0.88,
  CLP: 940.00,
  CNY: 7.24,
  COP: 3950.00,
  CRC: 522.00,
  CVE: 95.45,
  CZK: 23.40,
  DJF: 177.72,
  DKK: 6.85,
  DOP: 54.00,
  DZD: 134.50,
  EGP: 30.90,
  ERN: 15,
  ETB: 56.50,
  EUR: 0.92,
  TND: 3.15,
  TMT: 3.51,
  TJS: 11.30,
  TZS: 2320.00,
  MOP: 8.05,
  SYP: 2510.00,
  SDG: 750.00,
  SLL: 17500.00,
  SBD: 8.12,
  SRD: 37.50,
  SCR: 14.80,
  ZWL: 1000.00,
  XOF: 620.00,
  XAF: 620.00,
  XPF: 105.00,
  XCD: 2.70,
  GIP: 0.79,
  TOP: 2.44,
  VUV: 120.00,
  FJD: 2.21,
  GBP: 0.79,
  GEL: 2.54,
  GHS: 12.25,
  GMD: 74.47,
  GNF: 8782.14,
  GTQ: 7.80,
  GYD: 209.28,
  HKD: 7.82,
  HNL: 24.70,
  HRK: 6.52,
  HTG: 132.00,
  HUF: 365.00,
  IDR: 16200,
  ILS: 3.72,
  INR: 83.40,
  IQD: 1310.50,
  IRR: 42000,
  ISK: 138.50,
  JMD: 156.00,
  JOD: 0.709,
  JPY: 149.50,
  KES: 155.00,
  KGS: 89.50,
  KHR: 4115.00,
  KMF: 425.88,
  KRW: 1370,
  KWD: 0.308,
  KYD: 0.833,
  KZT: 470,
  LAK: 21050.00,
  LBP: 89700,
  LRD: 180.55,
  LKR: 299.00,
  LSL: 16.18,
  LYD: 6.37,
  MAD: 10.10,
  MGA: 4500.00,
  MDL: 17.38,
  MKD: 56.70,
  MNT: 3616.13,
  MUR: 44.80,
  MVR: 15.45,
  MXN: 17.20,
  MYR: 4.72,
  MZN: 63.76,
  NAD: 16.18,
  NGN: 1520.00,
  NOK: 10.90,
  NPR: 133.50,
  NZD: 1.66,
  OMR: 0.3845,
  PAB: 1.00,
  PEN: 3.72,
  PHP: 56.80,
  PKR: 278.50,
  PLN: 3.95,
  QAR: 3.64,
  RON: 4.72,
  RSD: 117.50,
  RUB: 92.50,
  SAR: 3.75,
  SEK: 10.60,
  SGD: 1.35,
  THB: 36.50,
  TRY: 32.15,
  TTD: 6.80,
  TWD: 32.30,
  UAH: 36.80,
  USD: 1,
  UZS: 11400,
  VND: 25400,
  CUP: 24.00,
  KPW: 900.00,
  MMK: 2100.00,
  MRU: 36.00,
  MWK: 1025.00,
  NIO: 36.00,
  PGK: 3.50,
  PYG: 7500.00,
  RWF: 1200.00,
  SHP: 1.35,
  SOS: 580.00,
  SSP: 830.00,
  STN: 24.00,
  SVC: 8.75,
  UGX: 3700.00,
  VES: 6000000.00,
  WST: 2.60,
  YER: 250.00,
  ZAR: 18.90,
  ZMW: 18.50
};

/**
 * Currency Service State
 */
const state = {
  catalog: [],
  rates: {},
  base: 'USD',
  lastUpdated: null,
  favorites: [],
  recent: [],
  isLoading: false,
  error: null,
  isUsingCachedData: false
};

let refreshTimer = null;

/**
 * Fetch currency catalog from API
 * Uses exchangerate-api.com which provides comprehensive currency data
 */
async function fetchCurrencyCatalog(maxRetries = 2) {
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.rates) {
        throw new Error('Invalid response: missing rates data');
      }

      // Extract only supported currencies from rates
      const currencies = Object.keys(data.rates)
        .filter(code => SUPPORTED_CURRENCIES.includes(code))
        .map(code => ({
          code,
          name: getCurrencyName(code),
          country: getCountryName(code),
          flag: getCountryFlag(code)
        }));

      // Sort alphabetically by code
      currencies.sort((a, b) => a.code.localeCompare(b.code));

      return {
        success: true,
        currencies,
        base: data.base || 'USD',
        timestamp: Date.now()
      };
    } catch (error) {
      lastError = error;
      console.error(`Failed to fetch currency catalog (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  // All retries failed
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    fallback: loadCachedCatalog()
  };
}

/**
 * Get currency name from code
 */
function getCurrencyName(code) {
  const names = {
    'AED': 'UAE Dirham',
    'AFN': 'Afghan Afghani',
    'ALL': 'Albanian Lek',
    'AMD': 'Armenian Dram',
    'ANG': 'Netherlands Antillean Guilder',
    'AOA': 'Angolan Kwanza',
    'ARS': 'Argentine Peso',
    'AUD': 'Australian Dollar',
    'AWG': 'Aruban Florin',
    'AZN': 'Azerbaijani Manat',
    'BAM': 'Bosnian Convertible Mark',
    'BBD': 'Barbadian Dollar',
    'BDT': 'Bangladeshi Taka',
    'BGN': 'Bulgarian Lev',
    'BHD': 'Bahraini Dinar',
    'BIF': 'Burundian Franc',
    'BMD': 'Bermudan Dollar',
    'BND': 'Brunei Dollar',
    'BOB': 'Bolivian Boliviano',
    'BRL': 'Brazilian Real',
    'BSD': 'Bahamian Dollar',
    'BTN': 'Bhutanese Ngultrum',
    'BWP': 'Botswana Pula',
    'BYN': 'Belarusian Ruble',
    'BZD': 'Belize Dollar',
    'CAD': 'Canadian Dollar',
    'CDF': 'Congolese Franc',
    'CHF': 'Swiss Franc',
    'CLP': 'Chilean Peso',
    'CNY': 'Chinese Yuan',
    'COP': 'Colombian Peso',
    'CRC': 'Costa Rican Colón',
    'CVE': 'Cape Verdean Escudo',
    'CZK': 'Czech Koruna',
    'DJF': 'Djiboutian Franc',
    'DKK': 'Danish Krone',
    'DOP': 'Dominican Peso',
    'DZD': 'Algerian Dinar',
    'EGP': 'Egyptian Pound',
    'ERN': 'Eritrean Nakfa',
    'ETB': 'Ethiopian Birr',
    'EUR': 'Euro',
    'FJD': 'Fijian Dollar',
    'GBP': 'British Pound Sterling',
    'GEL': 'Georgian Lari',
    'GHS': 'Ghanaian Cedi',
    'GMD': 'Gambian Dalasi',
    'GNF': 'Guinean Franc',
    'GTQ': 'Guatemalan Quetzal',
    'GYD': 'Guyanese Dollar',
    'HKD': 'Hong Kong Dollar',
    'HNL': 'Honduran Lempira',
    'HRK': 'Croatian Kuna',
    'HTG': 'Haitian Gourde',
    'HUF': 'Hungarian Forint',
    'IDR': 'Indonesian Rupiah',
    'ILS': 'Israeli Shekel',
    'INR': 'Indian Rupee',
    'IQD': 'Iraqi Dinar',
    'IRR': 'Iranian Rial',
    'ISK': 'Icelandic Króna',
    'JMD': 'Jamaican Dollar',
    'JOD': 'Jordanian Dinar',
    'JPY': 'Japanese Yen',
    'KES': 'Kenyan Shilling',
    'KGS': 'Kyrgyzstani Som',
    'KHR': 'Cambodian Riel',
    'KMF': 'Comorian Franc',
    'KRW': 'South Korean Won',
    'KWD': 'Kuwaiti Dinar',
    'KYD': 'Cayman Islands Dollar',
    'KZT': 'Kazakhstani Tenge',
    'LAK': 'Lao Kip',
    'LBP': 'Lebanese Pound',
    'LKR': 'Sri Lankan Rupee',
    'LRD': 'Liberian Dollar',
    'LSL': 'Lesotho Loti',
    'LYD': 'Libyan Dinar',
    'MAD': 'Moroccan Dirham',
    'MGA': 'Malagasy Ariary',
    'MDL': 'Moldovan Leu',
    'MKD': 'Macedonian Denar',
    'MNT': 'Mongolian Tugrik',
    'MUR': 'Mauritian Rupee',
    'MVR': 'Maldivian Rufiyaa',
    'MXN': 'Mexican Peso',
    'MYR': 'Malaysian Ringgit',
    'MZN': 'Mozambican Metical',
    'NAD': 'Namibian Dollar',
    'NGN': 'Nigerian Naira',
    'NOK': 'Norwegian Krone',
    'NPR': 'Nepalese Rupee',
    'NZD': 'New Zealand Dollar',
    'OMR': 'Omani Rial',
    'PAB': 'Panamanian Balboa',
    'PEN': 'Peruvian Sol',
    'PHP': 'Philippine Peso',
    'PKR': 'Pakistani Rupee',
    'PLN': 'Polish Zloty',
    'QAR': 'Qatari Riyal',
    'RON': 'Romanian Leu',
    'RSD': 'Serbian Dinar',
    'RUB': 'Russian Ruble',
    'SAR': 'Saudi Riyal',
    'SEK': 'Swedish Krona',
    'SGD': 'Singapore Dollar',
    'THB': 'Thai Baht',
    'TRY': 'Turkish Lira',
    'TTD': 'Trinidad & Tobago Dollar',
    'TWD': 'Taiwan Dollar',
    'UAH': 'Ukrainian Hryvnia',
    'USD': 'United States Dollar',
    'UZS': 'Uzbekistani Som',
    'VND': 'Vietnamese Dong',
    'ZAR': 'South African Rand',
    'ZMW': 'Zambian Kwacha',
    'TND': 'Tunisian Dinar',
    'TMT': 'Turkmenistani Manat',
    'TJS': 'Tajikistani Somoni',
    'TZS': 'Tanzanian Shilling',
    'MOP': 'Macanese Pataca',
    'SYP': 'Syrian Pound',
    'SDG': 'Sudanese Pound',
    'SLL': 'Sierra Leonean Leone',
    'SBD': 'Solomon Islands Dollar',
    'SRD': 'Surinamese Dollar',
    'SCR': 'Seychellois Rupee',
    'ZWL': 'Zimbabwean Dollar',
    'XOF': 'West African CFA Franc',
    'XAF': 'Central African CFA Franc',
    'XPF': 'CFP Franc (Pacific)',
    'XCD': 'East Caribbean Dollar',
    'GIP': 'Gibraltar Pound',
    'TOP': "Tongan Pa'anga",
    'VUV': 'Vanuatu Vatu',
    'CUP': 'Cuban Peso',
    'KPW': 'North Korean Won',
    'MMK': 'Myanmar Kyat',
    'MRU': 'Mauritanian Ouguiya',
    'MWK': 'Malawian Kwacha',
    'NIO': 'Nicaraguan Córdoba',
    'PGK': 'Papua New Guinean Kina',
    'PYG': 'Paraguayan Guaraní',
    'RWF': 'Rwandan Franc',
    'SHP': 'Saint Helena Pound',
    'SOS': 'Somali Shilling',
    'SSP': 'South Sudanese Pound',
    'STN': 'São Tomé and Príncipe Dobra',
    'SVC': 'Salvadoran Colón',
    'UGX': 'Ugandan Shilling',
    'VES': 'Venezuelan Bolívar Soberano',
    'WST': 'Samoan Tala',
    'YER': 'Yemeni Rial'
  };

  return names[code] || `${code} Currency`;
}

/**
 * Get country name from currency code
 */
function getCountryName(code) {
  const countries = {
    'AED': 'United Arab Emirates',
    'AFN': 'Afghanistan',
    'ALL': 'Albania',
    'AMD': 'Armenia',
    'ANG': 'Curaçao',
    'AOA': 'Angola',
    'ARS': 'Argentina',
    'AUD': 'Australia',
    'AWG': 'Aruba',
    'AZN': 'Azerbaijan',
    'BAM': 'Bosnia and Herzegovina',
    'BBD': 'Barbados',
    'BDT': 'Bangladesh',
    'BGN': 'Bulgaria',
    'BHD': 'Bahrain',
    'BIF': 'Burundi',
    'BMD': 'Bermuda',
    'BND': 'Brunei',
    'BOB': 'Bolivia',
    'BRL': 'Brazil',
    'BSD': 'Bahamas',
    'BTN': 'Bhutan',
    'BWP': 'Botswana',
    'BYN': 'Belarus',
    'BZD': 'Belize',
    'CAD': 'Canada',
    'CDF': 'DR Congo',
    'CHF': 'Switzerland',
    'CLP': 'Chile',
    'CNY': 'China',
    'COP': 'Colombia',
    'CRC': 'Costa Rica',
    'CVE': 'Cabo Verde',
    'CZK': 'Czech Republic',
    'DJF': 'Djibouti',
    'DKK': 'Denmark',
    'DOP': 'Dominican Republic',
    'DZD': 'Algeria',
    'EGP': 'Egypt',
    'ERN': 'Eritrea',
    'ETB': 'Ethiopia',
    'EUR': 'Eurozone',
    'FJD': 'Fiji',
    'GBP': 'United Kingdom',
    'GEL': 'Georgia',
    'GHS': 'Ghana',
    'GMD': 'Gambia',
    'GNF': 'Guinea',
    'GTQ': 'Guatemala',
    'GYD': 'Guyana',
    'HKD': 'Hong Kong',
    'HNL': 'Honduras',
    'HRK': 'Croatia',
    'HTG': 'Haiti',
    'HUF': 'Hungary',
    'IDR': 'Indonesia',
    'ILS': 'Israel',
    'INR': 'India',
    'IQD': 'Iraq',
    'IRR': 'Iran',
    'ISK': 'Iceland',
    'JMD': 'Jamaica',
    'JOD': 'Jordan',
    'JPY': 'Japan',
    'KES': 'Kenya',
    'KGS': 'Kyrgyzstan',
    'KHR': 'Cambodia',
    'KMF': 'Comoros',
    'KRW': 'South Korea',
    'KWD': 'Kuwait',
    'KYD': 'Cayman Islands',
    'KZT': 'Kazakhstan',
    'LAK': 'Laos',
    'LBP': 'Lebanon',
    'LKR': 'Sri Lanka',
    'LRD': 'Liberia',
    'LSL': 'Lesotho',
    'LYD': 'Libya',
    'MAD': 'Morocco',
    'MGA': 'Madagascar',
    'MDL': 'Moldova',
    'MKD': 'North Macedonia',
    'MNT': 'Mongolia',
    'MUR': 'Mauritius',
    'MVR': 'Maldives',
    'MXN': 'Mexico',
    'MYR': 'Malaysia',
    'MZN': 'Mozambique',
    'NAD': 'Namibia',
    'NGN': 'Nigeria',
    'NOK': 'Norway',
    'NPR': 'Nepal',
    'NZD': 'New Zealand',
    'OMR': 'Oman',
    'PAB': 'Panama',
    'PEN': 'Peru',
    'PHP': 'Philippines',
    'PKR': 'Pakistan',
    'PLN': 'Poland',
    'QAR': 'Qatar',
    'RON': 'Romania',
    'RSD': 'Serbia',
    'RUB': 'Russia',
    'SAR': 'Saudi Arabia',
    'SEK': 'Sweden',
    'SGD': 'Singapore',
    'THB': 'Thailand',
    'TRY': 'Turkey',
    'TTD': 'Trinidad and Tobago',
    'TWD': 'Taiwan',
    'UAH': 'Ukraine',
    'USD': 'United States',
    'UZS': 'Uzbekistan',
    'VND': 'Vietnam',
    'ZAR': 'South Africa',
    'ZMW': 'Zambia',
    'TND': 'Tunisia',
    'TMT': 'Turkmenistan',
    'TJS': 'Tajikistan',
    'TZS': 'Tanzania',
    'MOP': 'Macao',
    'SYP': 'Syria',
    'SDG': 'Sudan',
    'SLL': 'Sierra Leone',
    'SBD': 'Solomon Islands',
    'SRD': 'Suriname',
    'SCR': 'Seychelles',
    'ZWL': 'Zimbabwe',
    'XOF': 'West Africa',
    'XAF': 'Central Africa',
    'XPF': 'French Pacific Territories',
    'XCD': 'East Caribbean',
    'GIP': 'Gibraltar',
    'TOP': 'Tonga',
    'VUV': 'Vanuatu',
    'CUP': 'Cuba',
    'KPW': 'North Korea',
    'MMK': 'Myanmar',
    'MRU': 'Mauritania',
    'MWK': 'Malawi',
    'NIO': 'Nicaragua',
    'PGK': 'Papua New Guinea',
    'PYG': 'Paraguay',
    'RWF': 'Rwanda',
    'SHP': 'Saint Helena, Ascension and Tristan da Cunha',
    'SOS': 'Somalia',
    'SSP': 'South Sudan',
    'STN': 'São Tomé and Príncipe',
    'SVC': 'El Salvador',
    'UGX': 'Uganda',
    'VES': 'Venezuela',
    'WST': 'Samoa',
    'YER': 'Yemen'
  };

  return countries[code] || 'Unknown';
}

/**
 * Get country flag emoji from currency code
 */
function getCountryFlag(code) {
  const flags = {
    'AED': '🇦🇪',
    'AFN': '🇦🇫',
    'ALL': '🇦🇱',
    'AMD': '🇦🇲',
    'ANG': '🇨🇼',
    'AOA': '🇦🇴',
    'ARS': '🇦🇷',
    'AUD': '🇦🇺',
    'AWG': '🇦🇼',
    'AZN': '🇦🇿',
    'BAM': '🇧🇦',
    'BBD': '🇧🇧',
    'BDT': '🇧🇩',
    'BGN': '🇧🇬',
    'BHD': '🇧🇭',
    'BIF': '🇧🇮',
    'BMD': '🇧🇲',
    'BND': '🇧🇳',
    'BOB': '🇧🇴',
    'BRL': '🇧🇷',
    'BSD': '🇧🇸',
    'BTN': '🇧🇹',
    'BWP': '🇧🇼',
    'BYN': '🇧🇾',
    'BZD': '🇧🇿',
    'CAD': '🇨🇦',
    'CDF': '🇨🇩',
    'CHF': '🇨🇭',
    'CLP': '🇨🇱',
    'CNY': '🇨🇳',
    'COP': '🇨🇴',
    'CRC': '🇨🇷',
    'CVE': '🇨🇻',
    'CZK': '🇨🇿',
    'DJF': '🇩🇯',
    'DKK': '🇩🇰',
    'DOP': '🇩🇴',
    'DZD': '🇩🇿',
    'EGP': '🇪🇬',
    'ERN': '🇪🇷',
    'ETB': '🇪🇹',
    'EUR': '🇪🇺',
    'FJD': '🇫🇯',
    'GBP': '🇬🇧',
    'GEL': '🇬🇪',
    'GHS': '🇬🇭',
    'GMD': '🇬🇲',
    'GNF': '🇬🇳',
    'GTQ': '🇬🇹',
    'GYD': '🇬🇾',
    'HKD': '🇭🇰',
    'HNL': '🇭🇳',
    'HRK': '🇭🇷',
    'HTG': '🇭🇹',
    'HUF': '🇭🇺',
    'IDR': '🇮🇩',
    'ILS': '🇮🇱',
    'INR': '🇮🇳',
    'IQD': '🇮🇶',
    'IRR': '🇮🇷',
    'ISK': '🇮🇸',
    'JMD': '🇯🇲',
    'JOD': '🇯🇴',
    'JPY': '🇯🇵',
    'KES': '🇰🇪',
    'KGS': '🇰🇬',
    'KHR': '🇰🇭',
    'KMF': '🇰🇲',
    'KRW': '🇰🇷',
    'KWD': '🇰🇼',
    'KYD': '🇰🇾',
    'KZT': '🇰🇿',
    'LAK': '🇱🇦',
    'LBP': '🇱🇧',
    'LKR': '🇱🇰',
    'LRD': '🇱🇷',
    'LSL': '🇱🇸',
    'LYD': '🇱🇾',
    'MAD': '🇲🇦',
    'MDL': '🇲🇩',
    'MGA': '🇲🇬',
    'MKD': '🇲🇰',
    'MNT': '🇲🇳',
    'MUR': '🇲🇺',
    'MVR': '🇲🇻',
    'MXN': '🇲🇽',
    'MYR': '🇲🇾',
    'MZN': '🇲🇿',
    'NAD': '🇳🇦',
    'NGN': '🇳🇬',
    'NOK': '🇳🇴',
    'NPR': '🇳🇵',
    'NZD': '🇳🇿',
    'OMR': '🇴🇲',
    'PAB': '🇵🇦',
    'PEN': '🇵🇪',
    'PHP': '🇵🇭',
    'PKR': '🇵🇰',
    'PLN': '🇵🇱',
    'QAR': '🇶🇦',
    'RON': '🇷🇴',
    'RSD': '🇷🇸',
    'RUB': '🇷🇺',
    'SAR': '🇸🇦',
    'SEK': '🇸🇪',
    'SGD': '🇸🇬',
    'THB': '🇹🇭',
    'TRY': '🇹🇷',
    'TTD': '🇹🇹',
    'TWD': '🇹🇼',
    'UAH': '🇺🇦',
    'USD': '🇺🇸',
    'UZS': '🇺🇿',
    'VND': '🇻🇳',
    'ZAR': '🇿🇦',
    'ZMW': '🇿🇲',
    'TND': '🇹🇳',
    'TMT': '🇹🇲',
    'TJS': '🇹🇯',
    'TZS': '🇹🇿',
    'MOP': '🇲🇴',
    'SYP': '🇸🇾',
    'SDG': '🇸🇩',
    'SLL': '🇸🇱',
    'SBD': '🇸🇧',
    'SRD': '🇸🇷',
    'SCR': '🇸🇨',
    'ZWL': '🇿🇼',
    'XOF': '💱',
    'XAF': '💱',
    'XPF': '🇵🇫',
    'XCD': '💱',
    'GIP': '🇬🇮',
    'TOP': '🇹🇴',
    'VUV': '🇻🇺',
    'CUP': '🇨🇺',
    'KPW': '🇰🇵',
    'MMK': '🇲🇲',
    'MRU': '🇲🇷',
    'MWK': '🇲🇼',
    'NIO': '🇳🇮',
    'PGK': '🇵🇬',
    'PYG': '🇵🇾',
    'RWF': '🇷🇼',
    'SHP': '🇸🇭',
    'SOS': '🇸🇴',
    'SSP': '🇸🇸',
    'STN': '🇸🇹',
    'SVC': '🇸🇻',
    'UGX': '🇺🇬',
    'VES': '🇻🇪',
    'WST': '🇼🇸',
    'YER': '🇾🇪',
  };

  return flags[code] || '💱';
}

/**
 * Load cached currency catalog
 */
function loadCachedCatalog() {
  try {
    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    if (!data || !data.catalog || !Array.isArray(data.catalog)) {
      return null;
    }

    const age = Date.now() - (data.timestamp || 0);
    if (age > CACHE_TTL) {
      console.log('Currency catalog cache expired');
      return null;
    }

    return data.catalog;
  } catch (error) {
    console.error('Failed to load cached catalog:', error);
    return null;
  }
}

/**
 * Save currency catalog to cache
 */
function saveCatalogToCache(catalog) {
  try {
    const payload = {
      catalog,
      timestamp: Date.now()
    };
    localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to cache catalog:', error);
  }
}

/**
 * Load cached exchange rates
 */
export function loadCachedRates() {
  try {
    const cached = localStorage.getItem(RATES_CACHE_KEY);
    if (!cached) return false;

    const data = JSON.parse(cached);
    if (!data || !data.rates || !data.base) {
      return false;
    }

    const age = Date.now() - (data.timestamp || 0);
    state.rates = data.rates;
    state.base = data.base;
    state.lastUpdated = data.timestamp;
    state.isUsingCachedData = age > CACHE_TTL;

    return true;
  } catch (error) {
    console.error('Failed to load cached rates:', error);
    return false;
  }
}

/**
 * Save exchange rates to cache
 */
function saveRatesToCache() {
  try {
    const payload = {
      base: state.base,
      rates: state.rates,
      timestamp: state.lastUpdated || Date.now()
    };
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to cache rates:', error);
  }
}

/**
 * Fetch latest exchange rates
 */
async function fetchExchangeRates(maxRetries = 2) {
  state.isLoading = true;
  state.error = null;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.rates) {
        throw new Error('Invalid response: missing or invalid rates data');
      }

      state.base = data.base || 'USD';
      state.rates = data.rates;
      state.lastUpdated = Date.now();
      state.isUsingCachedData = false;

      saveRatesToCache();

      return {
        success: true,
        base: state.base,
        rates: state.rates,
        timestamp: state.lastUpdated
      };
    } catch (error) {
      lastError = error;
      console.error(`Failed to fetch exchange rates (attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  // All retries failed
  state.error = lastError?.message || 'Unknown error';

  // Try to load cached rates
  const hasCachedRates = loadCachedRates();

  return {
    success: false,
    error: state.error,
    usingCachedData: hasCachedRates,
    base: state.base,
    rates: state.rates,
    timestamp: state.lastUpdated
  };
}

/**
 * Initialize currency service
 */
export async function initializeCurrencyService() {
  // Load cached catalog first
  const cachedCatalog = loadCachedCatalog();
  if (cachedCatalog) {
    state.catalog = cachedCatalog;
  }

  // Load cached rates
  loadCachedRates();

  // Load favorites and recent
  loadFavorites();
  loadRecent();

  // Fetch fresh data in background
  await refreshCurrencyData();

  // Start automatic refresh
  startAutoRefresh();

  return state;
}

/**
 * Start automatic rate refresh timer
 */
export function startAutoRefresh() {
  stopAutoRefresh();
  refreshTimer = setInterval(() => {
    refreshCurrencyData().catch(error => {
      console.error('Auto-refresh failed:', error);
    });
  }, REFRESH_INTERVAL);
}

/**
 * Stop automatic rate refresh timer
 */
export function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Refresh all currency data
 */
export async function refreshCurrencyData() {
  // Fetch catalog
  const catalogResult = await fetchCurrencyCatalog();
  if (catalogResult.success) {
    state.catalog = catalogResult.currencies;
    saveCatalogToCache(state.catalog);
  } else if (catalogResult.fallback) {
    state.catalog = catalogResult.fallback;
  } else if (!state.catalog.length) {
    // No API, no cache — use static fallback so UI always has currencies
    state.catalog = FALLBACK_CATALOG;
    console.warn('Currency API failed and no cache available — using fallback catalog');
  }

  // Fetch rates
  const ratesResult = await fetchExchangeRates();

  // If rates fetch failed and we have no rates at all, use fallback rates
  if (!ratesResult.success && (!state.rates || Object.keys(state.rates).length === 0)) {
    state.rates = { ...FALLBACK_RATES };
    state.base = 'USD';
    state.isUsingCachedData = true;
    console.warn('Currency API failed and no cached rates — using fallback rates');
  }

  return state;
}

/**
 * Search currencies by query
 * Supports: country name, currency name, ISO code
 */
export function searchCurrencies(query) {
  if (!query || !query.trim()) {
    return state.catalog;
  }

  const normalizedQuery = query.trim().toLowerCase();

  return state.catalog.filter(currency => {
    return (
      currency.code.toLowerCase().includes(normalizedQuery) ||
      currency.name.toLowerCase().includes(normalizedQuery) ||
      currency.country.toLowerCase().includes(normalizedQuery)
    );
  });
}

/**
 * Get currency by code
 */
export function getCurrencyByCode(code) {
  return state.catalog.find(c => c.code === code) || null;
}

/**
 * Convert currency amount
 */
export function convertCurrency(amount, fromCode, toCode) {
  if (!amount || isNaN(amount)) return 0;

  const fromRate = getExchangeRate(fromCode);
  const toRate = getExchangeRate(toCode);

  if (!fromRate || !toRate) return 0;

  // Convert: amount * (toRate / fromRate)
  const result = (parseFloat(amount) * toRate) / fromRate;

  return result;
}

/**
 * Get exchange rate for a currency code
 */
export function getExchangeRate(code) {
  if (code === state.base) return 1;
  return state.rates[code] || 0;
}

/**
 * Get formatted exchange rate text
 */
export function getRateText(code) {
  const rate = getExchangeRate(code);

  if (!rate) {
    return 'Rate unavailable';
  }

  if (code === state.base) {
    return 'Base currency';
  }

  return `1 ${state.base} = ${formatNumber(rate)} ${code}`;
}

/**
 * Format number with commas
 */
function formatNumber(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  }).format(value);
}

/**
 * Add currency to favorites
 */
export function addToFavorites(code) {
  if (!state.favorites.includes(code)) {
    state.favorites.unshift(code);
    state.favorites = state.favorites.slice(0, 10); // Keep max 10
    saveFavorites();
  }
}

/**
 * Remove currency from favorites
 */
export function removeFromFavorites(code) {
  state.favorites = state.favorites.filter(c => c !== code);
  saveFavorites();
}

/**
 * Check if currency is in favorites
 */
export function isFavorite(code) {
  return state.favorites.includes(code);
}

/**
 * Load favorites from storage
 */
function loadFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY);
    state.favorites = saved ? JSON.parse(saved) : [];
  } catch {
    state.favorites = [];
  }
}

/**
 * Save favorites to storage
 */
function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

/**
 * Add currency to recent
 */
export function addToRecent(code) {
  state.recent = state.recent.filter(c => c !== code);
  state.recent.unshift(code);
  state.recent = state.recent.slice(0, 10); // Keep max 10
  saveRecent();
}

/**
 * Load recent from storage
 */
function loadRecent() {
  try {
    const saved = localStorage.getItem(RECENT_KEY);
    state.recent = saved ? JSON.parse(saved) : [];
  } catch {
    state.recent = [];
  }
}

/**
 * Save recent to storage
 */
function saveRecent() {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(state.recent));
  } catch (error) {
    console.error('Failed to save recent:', error);
  }
}

/**
 * Get favorites list
 */
export function getFavorites() {
  return state.favorites.map(code => getCurrencyByCode(code)).filter(Boolean);
}

/**
 * Get recent list
 */
export function getRecent() {
  return state.recent.map(code => getCurrencyByCode(code)).filter(Boolean);
}

/**
 * Get currency catalog
 */
export function getCatalog() {
  return state.catalog;
}

/**
 * Get currency state
 */
export function getState() {
  return {
    ...state,
    favorites: getFavorites(),
    recent: getRecent()
  };
}

/**
 * Check if service is using cached data
 */
export function isUsingCachedData() {
  return state.isUsingCachedData;
}

/**
 * Get last updated timestamp
 */
export function getLastUpdated() {
  return state.lastUpdated;
}

/**
 * Get error message if any
 */
export function getError() {
  return state.error;
}

/**
 * Check if service is loading
 */
export function isLoading() {
  return state.isLoading;
}

export default {
  initializeCurrencyService,
  refreshCurrencyData,
  startAutoRefresh,
  stopAutoRefresh,
  searchCurrencies,
  getCurrencyByCode,
  convertCurrency,
  getExchangeRate,
  getRateText,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  getFavorites,
  getRecent,
  addToRecent,
  getCatalog,
  getState,
  isUsingCachedData,
  getLastUpdated,
  getError,
  isLoading
};
