// Regression-check runner: runs given tests with a HARD timeout each,
// prints a concise PASS/FAIL line. No development, read-only on sources.
const { spawn } = require('node:child_process');
const tests = process.argv.slice(2);
const TIMEOUT = 190000;
(async () => {
  for (const t of tests) {
    const res = await new Promise((resolve) => {
      const c = spawn('node', [`tests/${t}.test.mjs`], { stdio: ['ignore', 'pipe', 'pipe'] });
      let o = '';
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; try { c.kill('SIGKILL'); } catch (e) {} }, TIMEOUT);
      c.stdout.on('data', (d) => { o += d; });
      c.stderr.on('data', (d) => { o += d; });
      c.on('exit', (code) => {
        clearTimeout(timer);
        // Use 'exit' (not 'close'): orphaned Chrome can hold stdio pipes open.
        try { c.stdout.destroy(); c.stderr.destroy(); } catch (e) {}
        resolve({ o, code, timedOut });
      });
    });
    const pass = (res.o.match(/\bPASS\b/g) || []).length;
    const fail = (res.o.match(/\bFAIL\b/g) || []).length;
    const allPass = /ALL PASS/.test(res.o);
    const status = allPass ? 'PASS' : (fail > 0 ? 'FAIL' : 'INCOMPLETE');
    console.log(`${t}: ${status} pass=${pass} fail=${fail} timedOut=${res.timedOut} exit=${res.code}`);
    const errs = res.o.split('\n').filter(l => l.includes('FAIL')).slice(0, 6);
    errs.forEach(l => console.log('   ' + l.trim().slice(0, 170)));
    if (/pageerror|ProtocolError/i.test(res.o)) console.log('   (protocol/page errors present)');
  }
  console.log('RC-DONE');
})();
