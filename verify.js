import CurrencyService from './currencyService.js';

const orig = ['AED','AFN','ALL','AMD','AOA','ARS','AUD','AZN','BAM','BBD','BDT','BGN','BHD','BIF','BND','BOB','BRL','BWP','BYN','CAD','CHF','CLP','CNY','COP','CRC','CZK','DKK','DOP','DZD','EGP','ETB','EUR','GBP','GEL','GHS','GTQ','HKD','HNL','HTG','HUF','IDR','ILS','INR','IQD','IRR','ISK','JMD','JOD','JPY','KES','KGS','KHR','KRW','KWD','KZT','LAK','LBP','LKR','MAD','MGA','MKD','MUR','MXN','MYR','NGN','NOK','NPR','NZD','OMR','PAB','PEN','PHP','PKR','PLN','QAR','RON','RSD','RUB','SAR','SEK','SGD','THB','TRY','TTD','TWD','UAH','USD','UZS','VND','ZAR','ZMW'];
const newC = ['ANG','AWG','BMD','BSD','BTN','BZD','CDF','CVE','DJF','ERN','FJD','GMD','GNF','GYD','HRK','KMF','KYD','LRD','LSL','LYD','MDL','MNT','MVR','MZN','NAD'];

const state = await CurrencyService.initializeCurrencyService();
const catalog = CurrencyService.getCatalog();
const rates = CurrencyService.getState().rates;

console.log('Catalog size:', catalog.length);
console.log('Rates from API:', Object.keys(rates).length);

const missing = orig.filter(c => !catalog.some(e => e.code === c));
console.log('Missing original:', missing);

const missingNew = newC.filter(c => !catalog.some(e => e.code === c));
console.log('Missing new:', missingNew);

const missingRates = orig.concat(newC).filter(c => !rates[c]);
console.log('Missing in rates:', missingRates);

console.log('All catalog codes:', catalog.map(c => c.code).join(','));

console.log('JOD rate:', rates.JOD);
