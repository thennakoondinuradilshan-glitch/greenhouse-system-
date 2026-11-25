# Section 3.8 — Defect Tracking

## Method

The defects below were reproduced against the actual SmartGrow backend and its real MongoDB persistence using an isolated local database. The source of each baseline result is the preserved baseline execution in [`evidence/baseline/`](evidence/baseline/). Each fix was checked by a fresh execution documented in [`evidence/post-fix-regression/POST_FIX_REPORT.md`](evidence/post-fix-regression/POST_FIX_REPORT.md).

The public GitHub Issues listing was inspected while signed out and displayed zero open and zero closed issues; creating issues required sign-in. No individual issue was opened, created, or updated. No issue numbers, URLs, assignments, labels, or remote lifecycle states are claimed. [`GITHUB_ISSUES.md`](../../GITHUB_ISSUES.md) contains ready-to-copy descriptions and the manual browser workflow. The remote lifecycle remains pending and is distinct from the completed local SG-001 lifecycle below.

## Defect register

| ID | Defect | Severity / priority | Local status | Baseline | Post-fix |
|---|---|---|---|---|---|
| SG-001 | Public registration accepted the administrator role | Critical / P1 | Fixed and verified locally | HTTP 201 and admin account returned | HTTP 400; registration rejected |
| SG-002 | Login did not normalize email case consistently; duplicate lookup also used raw email | High / P1 | Fixed and verified locally | Mixed-case login HTTP 400 | Login HTTP 200; duplicate normalized registration returns HTTP 400 |
| SG-003 | Device creation and other mutations were not protected by authentication/authorization | High / P1 | Fixed and verified locally | Anonymous creation HTTP 201 | Anonymous HTTP 401; farmer succeeds; customer HTTP 403 |
| SG-004 | Negative fallback basket quantity produced a negative total | High / P1 | Fixed and verified locally | HTTP 200; total `-$12.50` | Invalid crop and supply values rejected; valid supply basket total `$13.50` |
| SG-005 | Server simulator import casing differed from the actual filename | Medium / P2 | Fixed; static check verified | Exact-case assertion failed | Exact-case assertion passed; Linux startup not executed |

“Fixed and verified locally” describes the state of this working tree and test evidence only. It does not imply that a GitHub Issue exists or has been closed.

## Root-cause analyses

### SG-001 — Privileged role assignment

**Observed effect:** A caller could submit `role: "admin"` to the public registration endpoint and receive HTTP 201 with an administrator account. The baseline response is recorded in [`http-results.json`](evidence/baseline/http-results.json).

**Root cause:** Public registration treated `admin` as an allowed client-selectable role. The API trusted a privileged identity attribute supplied by an anonymous caller rather than reserving administrator provisioning for a trusted administrative process.

**Correction:** Removed `admin` from the public role allowlist and explicitly reject public administrator registration. The regression test now expects HTTP 400 and the post-fix HTTP record confirms the rejection. Existing administrator login and authorization behavior was not changed.

### SG-004 — Negative basket total

**Observed effect:** A fallback crop item with unit price `$5.00` and quantity `-3` returned HTTP 200, subtotal `-$15.00`, and total `-$12.50`. The baseline request and response are recorded in [`http-results.json`](evidence/baseline/http-results.json).

**Root cause:** Fallback calculation converted the supplied quantity to a number but did not reject negative values before multiplication. The delivery fee was then added to an already-negative subtotal. The companion supply basket had the same missing boundary validation.

**Correction:** Both crop and supply calculations validate quantities as finite numbers of at least one before computing line totals. Fallback prices must be finite and positive, including explicit zero values. Regression assertions verify rejected invalid inputs and a valid supply calculation; the regular database-backed crop calculation remains unchanged.

## Local lifecycle evidence: SG-001

This lifecycle records the defect’s local engineering state. Since no GitHub Issue was created, the remote GitHub lifecycle remains **not started**.

| Local stage | Evidence |
|---|---|
| New | Reproduced in the baseline run: anonymous registration with `role=admin` returned HTTP 201. See baseline [`stdout.txt`](evidence/baseline/stdout.txt) and [`http-results.json`](evidence/baseline/http-results.json). |
| Assigned | Taken into the local Section 3.8 QA implementation. No remote assignee was set. |
| Fixed | Public registration rejects `admin` and no longer includes it in the public role allowlist. |
| Verified | Post-fix actual-backend test returned HTTP 400; the complete suite passed 10/10. See post-fix [`http-results.json`](evidence/post-fix-regression/http-results.json) and [`execution.json`](evidence/post-fix-regression/execution.json). |
| Closed locally | The local acceptance test passes. GitHub closure is pending manual issue creation and confirmation by the repository maintainers. |

## Requirements-to-evidence mapping

| Section 3.8 requirement | Evidence |
|---|---|
| Log reproduced defects into a supported tracking system | Five locally reproduced defects and copy-ready GitHub Issue bodies in [`GITHUB_ISSUES.md`](../../GITHUB_ISSUES.md); remote creation is deliberately left to the user. |
| Perform root-cause analysis on 1–2 significant bugs | Detailed analyses for SG-001 and SG-004 above. |
| Document full bug lifecycle for at least one bug | SG-001 local New → Assigned → Fixed → Verified → Closed lifecycle above; remote lifecycle explicitly pending. |
