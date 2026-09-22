import pkg from '../src/core/ExpressionEvaluator.js';
const { evaluateExpression } = pkg;
const cases = [['2^3','8'],['5^2','25'],['9^0.5','3'],['2^(-2)','0.25'],['(2+3)^2','25'],['pi','3.141592653589793'],['2*pi','6.283185307179586'],['2pi','6.283185307179586'],['e','2.718281828459045'],['0!','1'],['5!','120'],['10!','3628800'],['50%','0.5'],['25%','0.25'],['200*10%','20'],['sqrt(9)','3'],['sqrt(2.25)','1.5'],['sqrt(9+7)','4'],['2*sqrt(9)','6'],['4^2','16'],['2+3^2','11'],['2*3^2','18'],['(2+3)*(4+1)','25'],['2*(3+4)','14'],['(1/(2))','0.5'],['(1/(0))','Error']];
for (const [e, want] of cases) {
  try {
    const got = evaluateExpression(e);
    console.log((got === want ? 'PASS' : 'FAIL') + ' ' + e + ' => ' + got + ' want ' + want);
  } catch (err) { console.log((want === 'Error' ? 'PASS' : 'ERR') + ' ' + e + ' Error:' + err.message); }
}
for (const e of ['(-5)!', '5.5!', '171!']) {
  try { console.log('CHECK ' + e + ' => ' + evaluateExpression(e)); }
  catch (err) { console.log('CHECK ' + e + ' Error:' + err.message); }
}
