# Baseline Regression Execution

## Environment and method

The baseline suite used the real SmartGrow Express server and a dedicated local MongoDB process. It generated a new database name and data directory for the run, bound both services to loopback, and used synthetic accounts and products. It did not connect to a remote database or control greenhouse actuators. The recorded environment was Windows (`win32`) and Node.js `v26.13.0`.

The suite was run before the fixes with:

```powershell
node --test --test-reporter=tap qa/section-3.8/tests/application.test.cjs
```

## Results

| Test ID | Scenario | Expected result | Baseline result | Actual output | Status | Defect |
|---|---|---|---|---|---|---|
| APP-01 | Actual API landing route | HTTP 200 and application message | HTTP 200 | `Greenhouse Monitoring API is running...` | PASS | — |
| APP-02 | Lowercase login and protected profile | Login and profile return HTTP 200 without exposing a password | HTTP 200 | Login and profile succeeded; profile had no password field | PASS | — |
| SG-001 | Public registration with `role=admin` | Reject public administrator registration | HTTP 201 | An administrator account and token were returned | FAIL | SG-001 |
| SG-002 | Login with mixed-case email and surrounding spaces | Normalize to the registered address and authenticate | HTTP 400 | `Invalid credentials` | FAIL | SG-002 |
| APP-03 | Authenticated crop creation and database-backed crop basket | Create crop and calculate trusted-price total | HTTP 201; basket HTTP 200 | Crop created; subtotal `$18.00`, delivery `$2.50`, total `$20.50` | PASS | — |
| APP-04 | Signed-out profile and administrator statistics | Deny both requests | HTTP 401 for both | Both requests returned HTTP 401 | PASS | — |
| SG-003 | Signed-out device creation | Require authentication | HTTP 401 or 403 | Device was created with HTTP 201 | FAIL | SG-003 |
| SG-004 | Negative quantity in fallback crop basket | Reject invalid quantity and prevent a negative total | HTTP 400 | HTTP 200; subtotal `-$15.00`, total `-$12.50` | FAIL | SG-004 |
| APP-05 | Routes that exist only in test fixtures | Return HTTP 404 in the actual application | HTTP 404 | All checked fixture-only routes returned HTTP 404 | PASS | — |
| SG-005 | Simulator import/file exact-case match | Import path must match a tracked filename exactly | Static assertion should pass | Import `sensorSimulator.js` did not match `sensorsimulator.js` | FAIL | SG-005 |

**Summary:** 10 tests; 5 passed and 5 failed. The execution exit code was 1.

The fifth finding was a static exact-case source assertion on Windows. The baseline did not attempt Linux startup.

The pre-fix frontend production build also passed with exit code 0; its captured execution is in [`../frontend-build/execution.json`](../frontend-build/execution.json). This build result does not change the regression test total.

## Supporting evidence

- [`execution.json`](execution.json) records the command, timestamps, exit code, runtime, and source fingerprints.
- [`stdout.txt`](stdout.txt) contains the TAP output and failure details.
- [`http-results.json`](http-results.json) contains the actual requests and responses; password and token fields are redacted.
- [`environment.json`](environment.json) records the isolated test environment.
- [`backend.log`](backend.log) and [`mongodb.log`](mongodb.log) record the actual server processes.
