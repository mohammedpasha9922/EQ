const fs = require('fs');
const text = fs.readFileSync('currencyService.js', 'utf8');
const extractArray = (name) => {
  const re = new RegExp(name + '\\s*=\\s*\\[([\\s\\S]*?)\\];');
  const m = text.match(re);
  if (!m) return [];
  return m[1].split(/,\\s*/).map(s => s.replace(/["'\\s]/g, '')).filter(Boolean);
};
const extractObj = (name) => {
  const re = new RegExp(name + '\\s*=\\s*\\{([\\s\\S]*?)\\};');
  const m = text.match(re);
  if (!m) return [];
  return [...m[1].matchAll(/['\"]([A-Z]{3})['\"]\\s*:/g)].map(x => x[1]);
};
const supported = extractArray('const SUPPORTED_CURRENCIES');
const names = extractObj('const names');
const countries = extractObj('const countries');
const flags = extractObj('const flags');
const rates = extractObj('const FALLBACK_RATES');
const report = {
  supportedLen: supported.length,
  supportedSorted: supported.every((v,i) => i===0 || v>supported[i-1]),
  supportedDuplicates: supported.filter((v,i,a) => a.indexOf(v)!==i),
  namesLen: names.length,
  countriesLen: countries.length,
  flagsLen: flags.length,
  ratesLen: rates.length,
  missingNames: supported.filter(c => !names.includes(c)),
  missingCountries: supported.filter(c => !countries.includes(c)),
  missingFlags: supported.filter(c => !flags.includes(c)),
  missingRates: supported.filter(c => !rates.includes(c))
};
fs.writeFileSync('tmp_verify_report.json', JSON.stringify(report, null, 2));
console.log('done');
