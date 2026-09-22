const numberMaps = {
  en: {
    ones: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
    teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
    tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
    hundred: 'hundred',
    scales: ['', 'thousand', 'million', 'billion', 'trillion'],
    negative: 'negative',
    decimal: 'point'
  },
  es: {
    ones: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'],
    teens: ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'],
    tens: ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'],
    hundred: 'ciento',
    scales: ['', 'mil', 'millón', 'mil millones', 'billón'],
    negative: 'negativo',
    decimal: 'punto'
  },
  ar: {
    ones: ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'],
    teens: ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'],
    tens: ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'],
    hundred: 'مائة',
    scales: ['', 'ألف', 'مليون', 'مليار', 'ترليون'],
    negative: 'سالب',
    decimal: 'و'
  },
  fr: {
    ones: ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'],
    teens: ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'],
    tens: ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'],
    hundred: 'cent',
    scales: ['', 'mille', 'million', 'milliard', 'billion'],
    negative: 'négatif',
    decimal: 'virgule'
  },
  ru: {
    ones: ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
    teens: ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'],
    tens: ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'],
    hundred: 'сто',
    scales: ['', 'тысяча', 'миллион', 'миллиард', 'триллион'],
    negative: 'отрицательное',
    decimal: 'точка'
  },
  de: {
    ones: ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'],
    teens: ['zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'],
    tens: ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'],
    hundred: 'hundert',
    scales: ['', 'tausend', 'million', 'milliarde', 'billion'],
    negative: 'negativ',
    decimal: 'komma'
  },
  tr: {
    ones: ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz'],
    teens: ['on', 'on bir', 'on iki', 'on üç', 'on dört', 'on beş', 'on altı', 'on yedi', 'on sekiz', 'on dokuz'],
    tens: ['', '', 'yirmi', 'otuz', 'kırk', 'elli', 'altmış', 'yetmiş', 'seksen', 'doksan'],
    hundred: 'yüz',
    scales: ['', 'bin', 'milyon', 'milyar', 'trilyon'],
    negative: 'eksi',
    decimal: 'virgül'},
  ku: {
    ones: ['سفر','یەک','دوو','سێ','چوار','پێنج','شەش','حەوت','هەشت','نۆ'],
    teens: ['دە','یازدە','دوازدە','سیانزە','چواردە','پازدە','شازدە','حەفدە','هەژدە','نۆزدە'],
    tens: ['','','بیست','سی','چل','پەنجا','شەست','حەفتا','هەشتا','نەوەد'],
    hundred: 'سەد',
    scales: ['','هەزار','ملیۆن','ملیار','تریلیۆن'],
    negative: 'نێگەتیڤ',
    decimal: 'خاڵ'
  }
};

function convertArabicChunk(value) {
  const ones = ['صفر', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = {
    1: 'مائة',
    2: 'مئتان',
    3: 'ثلاثمائة',
    4: 'أربعمائة',
    5: 'خمسمائة',
    6: 'ستمائة',
    7: 'سبعمائة',
    8: 'ثمانمائة',
    9: 'تسعمائة'
  };

  if (value < 10) return ones[value];
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const ten = Math.floor(value / 10);
    const rem = value % 10;
    return rem === 0 ? tens[ten] : `${ones[rem]} و${tens[ten]}`;
  }
  if (value < 1000) {
    const hundred = Math.floor(value / 100);
    const rem = value % 100;
    const base = hundreds[hundred] || `${ones[hundred]} مائة`;
    return rem === 0 ? base : `${base} و${convertArabicChunk(rem)}`;
  }
  return String(value);
}

function convertTurkishChunk(value, map) {
  if (value < 10) return map.ones[value];
  if (value < 20) return map.teens[value - 10];
  if (value < 100) {
    const tensValue = Math.floor(value / 10);
    const rem = value % 10;
    return rem === 0 ? map.tens[tensValue] : `${map.tens[tensValue]} ${map.ones[rem]}`.trim();
  }
  const hundreds = Math.floor(value / 100);
  const rem = value % 100;
  const base = hundreds === 1 ? map.hundred : `${map.ones[hundreds]} ${map.hundred}`;
  return rem === 0 ? base : `${base} ${convertTurkishChunk(rem, map)}`.trim();
}

function convertKurdishChunk(value) {
  const ones = ['سفر','یەک','دوو','سێ','چوار','پێنج','شەش','حەوت','هەشت','نۆ'];
  const teens = ['دە','یازدە','دوازدە','سیانزە','چواردە','پازدە','شازدە','حەفدە','هەژدە','نۆزدە'];
  const tens = ['','','بیست','سی','چل','پەنجا','شەست','حەفتا','هەشتا','نەوەد'];
  if (value < 10) return ones[value];
  if (value < 20) return teens[value - 10];
  if (value < 100) {
    const t = Math.floor(value / 10);
    const r = value % 10;
    return r === 0 ? tens[t] : `${tens[t]} و ${ones[r]}`;
  }
  const h = Math.floor(value / 100);
  const r = value % 100;
  const base = h === 1 ? 'سەد' : `${ones[h]} سەد`;
  return r === 0 ? base : `${base} و ${convertKurdishChunk(r)}`;
}

function convertKurdishIntegerToWords(integerValue) {
  const scales = ['', 'هەزار', 'ملیۆن', 'ملیار', 'تریلیۆن'];
  if (integerValue === 0n) return 'سفر';
  const groups = [];
  let remaining = integerValue;
  while (remaining > 0n) { groups.unshift(Number(remaining % 1000n)); remaining = remaining / 1000n; }
  const parts = [];
  groups.forEach((group, index) => {
    const scaleIndex = groups.length - index - 1;
    const scaleName = scales[scaleIndex] || '';
    if (group === 0) return;
    const groupWords = group < 1000 ? convertKurdishChunk(group) : convertKurdishIntegerToWords(BigInt(group));
    if (!scaleName) parts.push(groupWords);
    else if (group === 1 && scaleName === 'هەزار') parts.push('هەزار');
    else parts.push(`${groupWords} ${scaleName}`.trim());
  });
  return parts.join(' و ');
}

function convertChunk(value, locale) {
  const map = numberMaps[locale] || numberMaps.en;
  if (locale === 'ar') return convertArabicChunk(value);
  if (locale === 'tr') return convertTurkishChunk(value, map);
  if (locale === 'ku') return convertKurdishChunk(value);
  if (value < 10) return map.ones[value];
  if (value < 20) return map.teens[value - 10];
  if (value < 100) {
    const tensValue = Math.floor(value / 10);
    const rem = value % 10;
    return rem === 0 ? map.tens[tensValue] : `${map.tens[tensValue]} ${map.ones[rem]}`.trim();
  }
  const hundreds = Math.floor(value / 100);
  const rem = value % 100;
  const base = `${map.ones[hundreds]} ${map.hundred}`;
  return rem === 0 ? base : `${base} ${convertChunk(rem, locale)}`.trim();
}

function convertArabicIntegerToWords(integerValue) {
  if (integerValue === 0n) return 'صفر';
  const groups = [];
  let remaining = integerValue;
  while (remaining > 0n) {
    groups.unshift(Number(remaining % 1000n));
    remaining = remaining / 1000n;
  }

  const scales = ['', 'ألف', 'مليون', 'مليار', 'ترليون'];
  const parts = [];
  groups.forEach((group, index) => {
    const scaleIndex = groups.length - index - 1;
    const scaleName = scales[scaleIndex] || '';
    if (group === 0) return;
    const groupWords = group < 1000 ? convertArabicChunk(group) : convertArabicIntegerToWords(BigInt(group));
    if (!scaleName) {
      parts.push(groupWords);
    } else if (group === 1 && scaleName === 'ألف') {
      parts.push('ألف');
    } else if (group === 1) {
      parts.push(scaleName);
    } else if (scaleName === 'ألف') {
      parts.push(`${groupWords} ألف`);
    } else {
      parts.push(`${groupWords} ${scaleName}`);
    }
  });
  return parts.join(' و');
}

function convertIntegerToWords(integerValue, locale) {
  const map = numberMaps[locale] || numberMaps.en;
  if (integerValue === 0n) return map.ones[0];

  if (locale === 'ar') return convertArabicIntegerToWords(integerValue);
  if (locale === 'ku') return convertKurdishIntegerToWords(integerValue);

  const groups = [];
  let remaining = integerValue;
  while (remaining > 0n) {
    groups.unshift(Number(remaining % 1000n));
    remaining = remaining / 1000n;
  }

  if (locale === 'tr') {
    return groups.map((group, index) => {
      if (group === 0) return '';
      const chunkWords = group < 1000 ? convertChunk(group, locale) : convertIntegerToWords(BigInt(group), locale);
      const scale = map.scales[groups.length - index - 1] || '';
      if (!scale) return chunkWords;
      const hasLowerGroup = groups.slice(index + 1).some((value) => value > 0);
      if (group === 1 && scale === 'bin') return scale;
      if (group === 1) return hasLowerGroup ? `bir ${scale}` : scale;
      return `${chunkWords} ${scale}`.trim();
    }).filter(Boolean).join(' ');
  }

  return groups.map((group, index) => {
    if (group === 0) return '';
    const chunkWords = group < 1000 ? convertChunk(group, locale) : convertIntegerToWords(BigInt(group), locale);
    const scale = map.scales[groups.length - index - 1] || '';
    return scale ? `${chunkWords} ${scale}`.trim() : chunkWords;
  }).filter(Boolean).join(' ');
}

export function numberToWords(value, locale = 'en') {
  if (value === null || value === undefined || value === '') return (numberMaps[locale] || numberMaps.en).ones[0];

  const normalized = String(value).trim();
  const negative = normalized.startsWith('-');
  const cleaned = normalized.replace(/^-/, '');
  const [whole, fraction = ''] = cleaned.split('.');
  const integerPart = whole || '0';
  const decimalPart = fraction.replace(/0+$/, '');
  const map = numberMaps[locale] || numberMaps.en;

  if (!/^\d+$/.test(integerPart)) {
    return locale === 'es' ? 'número inválido' : locale === 'ar' ? 'رقم غير صالح' : locale === 'fr' ? 'nombre invalide' : locale === 'ru' ? 'недопустимое число' : locale === 'tr' ? 'geçersiz sayı' : locale === 'ku' ? 'ژمارەی نادروست' : 'ungültige Zahl';
  }

  const wholeNumber = BigInt(integerPart);
  const wholeWords = wholeNumber === 0n ? map.ones[0] : convertIntegerToWords(wholeNumber, locale);
  const decimalWords = decimalPart
    ? locale === 'ar'
      ? `${map.decimal} ${convertIntegerToWords(BigInt(decimalPart), locale)}`.replace(/ و /g, ' و')
      : `${map.decimal} ${Array.from(decimalPart).map((digit) => map.ones[Number(digit)]).join(' ')}`
    : '';
  const prefix = negative ? `${map.negative} ` : '';
  const result = `${prefix}${wholeWords}${decimalWords ? ` ${decimalWords}` : ''}`.trim();
  return locale === 'tr' ? result.charAt(0).toUpperCase() + result.slice(1) : result;
}
