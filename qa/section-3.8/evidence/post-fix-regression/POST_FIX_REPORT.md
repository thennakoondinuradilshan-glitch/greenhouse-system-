# Post-fix Regression Execution

## Environment and method

The suite started the actual SmartGrow Express server and a dedicated MongoDB process on loopback. A unique database name and data directory were used for this execution. Test data was synthetic; no remote or production database, physical greenhouse, or actuator was used.

The execution ran on Windows (`win32`) with Node.js `v26.13.0`. Coverage was collected with the already-installed `c8` package and written to the Section 3.9 evidence directory.

## Results

| Test ID | Scenario | Expected result | Baseline result | Post-fix result | Actual output | Status | Defect |
|---|---|---|---|---|---|---|---|
| APP-01 | Actual API landing route | HTTP 200 and application message | HTTP 200 | HTTP 200 | `Greenhouse Monitoring API is running...` | PASS | — |
| APP-02 | Lowercase login and protected profile | Login and profile return HTTP 200; do not expose password | HTTP 200 | HTTP 200 | Login and profile succeeded; profile omitted password | PASS | — |
| SG-001 | Public registration with `role=admin` | Reject public administrator registration | HTTP 201; administrator account returned | HTTP 400 | `Administrator accounts cannot be publicly registered` | PASS | SG-001 |
| SG-002 | Mixed-case login and duplicate registration | Normalize email during login and registration; reject duplicate normalized email | Login HTTP 400 | Login HTTP 200; duplicate registration HTTP 400 | Login returned the normalized user; duplicate returned `Email is already registered` | PASS | SG-002 |
| APP-03 | Authenticated crop creation and database-backed crop basket | Create crop and calculate trusted-price total | HTTP 201; basket total `$20.50` | HTTP 201; basket HTTP 200 | Subtotal `$18.00`, delivery `$2.50`, total `$20.50` | PASS | — |
| APP-04 | Signed-out profile and administrator statistics | Deny both requests | HTTP 401 for both | HTTP 401 for both | Both requests denied | PASS | — |
| SG-003 | Device mutation authorization | Require authentication and allow only farmer/admin mutation | Anonymous creation HTTP 201 | Anonymous HTTP 401; farmer HTTP 201; customer HTTP 403 | Anonymous update/delete HTTP 401; authenticated farmer update/delete HTTP 200 | PASS | SG-003 |
| SG-004 | Crop and supply basket validation | Reject negative, zero, non-numeric quantities and non-positive/non-numeric fallback prices; preserve valid calculations | Crop fallback HTTP 200 with total `-$12.50` | Invalid inputs HTTP 400 | Valid two-unit supply fallback returned total `$13.50`; invalid values rejected | PASS | SG-004 |
| APP-05 | Routes that exist only in test fixtures | Return HTTP 404 in the actual application | HTTP 404 | HTTP 404 | Checked fixture-only routes returned HTTP 404 | PASS | — |
| SG-005 | Simulator import/file exact-case match | Import path must match a tracked filename exactly | Static assertion failed | Static assertion passed | `sensorsimulator.js` exactly matches the tracked filename | PASS | SG-005 |

**Summary:** 10 tests; 10 passed, 0 failed, 0 skipped; process exit code 0.

The post-fix Linux startup was not run: Docker is installed but its Linux engine is unavailable. SG-005 is therefore a static exact-case verification, not a Linux execution result.

## Supporting evidence

- [`execution.json`](execution.json) records the command, timestamps, exit code, runtime, and source fingerprints.
- [`stdout.txt`](stdout.txt) contains the TAP result and coverage summary.
- [`http-results.json`](http-results.json) contains the actual requests and responses; password and token fields are redacted.
- [`environment.json`](environment.json) identifies the isolated database and synthetic test data.
- [`backend.log`](backend.log) and [`mongodb.log`](mongodb.log) record the actual server processes.
- [`coverage/lcov.info`](../../../section-3.9/evidence/coverage/lcov.info) is the generated LCOV report.
