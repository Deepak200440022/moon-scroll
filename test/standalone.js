/* Headless test for the standalone animation runs: each folder's
   run.js boots in its own Node process (its own stage, its own
   scroll scrubber, exactly like its run.html page in the browser),
   gets scrubbed across its story range, and is checked for the key
   beats of that animation. Run: node test/standalone.js [name] */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const NAMES = process.argv[2]
  ? [process.argv[2]]
  : ['zoom', 'blast', 'shards', 'blackhole'];

if (!NAMES.every((n) => ['zoom', 'blast', 'shards', 'blackhole'].includes(n))) {
  console.error('unknown animation: ' + process.argv[2] +
    ' (expected zoom|blast|shards|blackhole)');
  process.exit(2);
}

let failed = 0;
for (const name of NAMES) {
  const t0 = Date.now();
  const res = spawnSync(process.execPath,
    [path.join(__dirname, 'standalone-runner.js'), name],
    { encoding: 'utf8' });
  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);
  const ok = res.status === 0;
  if (!ok) failed++;
  console.log((ok ? 'ok  ' : 'FAIL ') + name + ' standalone run (' +
    ((Date.now() - t0) / 1000).toFixed(1) + 's)\n');
}

console.log(failed === 0
  ? 'All standalone runs passed.'
  : failed + ' standalone run(s) FAILED.');
process.exit(failed === 0 ? 0 : 1);
