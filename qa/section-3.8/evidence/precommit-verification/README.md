# Pre-commit verification — Section 3.8

The current backend unit, BDD, fixture API, and actual-application regression suites completed with **33 PASS / 0 FAIL**, exit code 0. This comprises 14 unit tests, two BDD helper checks, seven fixture-server API tests, and ten checks against the actual application with an isolated MongoDB process. The fixture API checks are not presented as actual application route coverage.

```powershell
node qa/scripts/run-check.cjs qa/section-3.8/evidence/precommit-verification node --test --test-reporter=tap backend/tests/unit/smartgrow.test.js backend/tests/bdd/bdd.test.js backend/tests/api/api.test.js qa/section-3.8/tests/application.test.cjs
node qa/scripts/run-check.cjs qa/section-3.8/evidence/precommit-frontend-build node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" --prefix frontend run build
```

The frontend production build also passed. The existing Vite warning about a JavaScript chunk larger than 500 kB remains non-fatal. Actual output and source fingerprints are in `stdout.txt`, `execution.json`, `http-results.json`, and the adjacent `precommit-frontend-build/` directory.

The original SG-005 local evidence used an exact-case source check. Subsequent Linux backend startup was demonstrated by the successful [GitHub Actions run 45659573485](https://github.com/thennakoondinuradilshan-glitch/greenhouse-system-/actions/runs/45659573485), commit `65b9c249667530aa92baf75e654ca9c9be1c497e`. That previously published commit already contains the simulator import fix; this publication does not duplicate it.

Section 3.6 files are excluded from the new commits at the user's request. The original defect baseline and earlier verification evidence are preserved.
