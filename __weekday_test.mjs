// Standalone test replicating app.js's pdfWeekdayName + PDF_WEEKDAYS logic.
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
  return list[date.getDay()] || list[0];
}

// [dateISO, en, ar, es, fr, ru, de, tr]
const tests = [
  ['2023-01-01','Sunday','الأحد','domingo','dimanche','воскресенье','Sonntag','Pazar'],
  ['2023-01-02','Monday','الإثنين','lunes','lundi','понедельник','Montag','Pazartesi'],
  ['2023-01-07','Saturday','السبت','sábado','samedi','суббота','Samstag','Cumartesi'],
  ['2026-08-29','Saturday','السبت','sábado','samedi','суббота','Samstag','Cumartesi'],
  ['2026-09-04','Friday','الجمعة','viernes','vendredi','пятница','Freitag','Cuma'],
  ['2026-09-07','Monday','الإثنين','lunes','lundi','понедельник','Montag','Pazartesi']
];
let pass = 0, fail = 0;
for (const t of tests) {
  const d = new Date(t[0]);
  const exp = { en: t[1], ar: t[2], es: t[3], fr: t[4], ru: t[5], de: t[6], tr: t[7] };
  if (d.getDay() !== Object.keys(exp).findIndex(k => true)) {} // noop safety
  for (const l of Object.keys(exp)) {
    const g = pdfWeekdayName(d, l);
    if (g === exp[l]) { pass++; } else { fail++; console.log('FAIL', t[0], l, 'got', JSON.stringify(g), 'want', JSON.stringify(exp[l])); }
  }
}
console.log('weekday-logic PASS=' + pass + ' FAIL=' + fail + ' (4 langs x 6 dates = 24)');
// also confirm 2026-08-29 == Saturday as the task expects
console.log('task-date 2026-08-29 getDay =', new Date('2026-08-29').getDay(), '(6=Sat) weekday en =', pdfWeekdayName(new Date('2026-08-29'),'en'), 'ar =', pdfWeekdayName(new Date('2026-08-29'),'ar'));
