# SmartGrow OS — Ready-to-copy GitHub Issues

## Remote status

These are proposed issue descriptions for manual entry through the GitHub website. The public repository Issues listing was inspected on 25 November 2026 while signed out; it showed **0 open and 0 closed issues** and a sign-in prompt. No individual issue was opened, and no issue was created or updated. Issue numbers, URLs, assignees, labels, and remote lifecycle status are therefore **not assigned / not verified**. A genuine screenshot is in [`qa/section-3.9/evidence/screenshots/github-issues-anonymous.png`](qa/section-3.9/evidence/screenshots/github-issues-anonymous.png). Local fixes and test results are recorded in [`qa/section-3.8/defect-tracking.md`](qa/section-3.8/defect-tracking.md).

Copy each title and body below into a separate issue. The labels listed are suggestions only.

---

## SG-001 — Public registration accepts the administrator role

**Suggested labels:** `bug`, `security`, `access-control`, `priority: critical`

### Issue body

**Description**  
The public registration endpoint accepted an anonymous request with `role: "admin"`, created an administrator account, and returned HTTP 201. This is a privilege-escalation vulnerability.

**Affected component:** Backend authentication — `POST /api/auth/register`  
**Severity:** Critical  
**Priority:** P1  
**Preconditions:** SmartGrow backend and isolated test database are running; caller is not authenticated.

**Steps to reproduce**
1. Send `POST /api/auth/register` with valid registration fields and `"role": "admin"`.
2. Observe the response and attempt to use the returned token on an administrator-only route.

**Expected result:** Public registration rejects administrator role assignment and creates no administrator account.  
**Actual baseline result:** HTTP 201; the response contained an administrator user and token.  
**Supporting baseline evidence:** `qa/section-3.8/evidence/baseline/http-results.json` and `stdout.txt` (test SG-001).

**Root cause:** The public registration role allowlist included `admin`, allowing a caller-controlled request field to assign a privileged role.

**Implemented local fix:** Public registration now rejects `admin` and the public role allowlist excludes it.  
**Post-fix verification:** Actual-backend regression returned HTTP 400; the complete post-fix suite passed 10/10. See `qa/section-3.8/evidence/post-fix-regression/http-results.json` and `execution.json`.

**Local defect status:** Fixed and verified in this working tree.  
**GitHub status:** No issue has been created; remote lifecycle is pending.

---

## SG-002 — Login is inconsistent with registration email normalization

**Suggested labels:** `bug`, `authentication`, `priority: high`

### Issue body

**Description**  
Registration stores a trimmed lowercase email, but login previously looked up the trimmed input without converting it to lowercase. Mixed-case input for a valid account therefore failed. Duplicate-registration lookup also used the unnormalized address.

**Affected component:** Backend authentication — `POST /api/auth/register` and `POST /api/auth/login`  
**Severity:** High  
**Priority:** P1  
**Preconditions:** A user account exists with a lowercase email address.

**Steps to reproduce**
1. Register an account using a valid email address.
2. Submit `POST /api/auth/login` using the same address with uppercase letters and surrounding spaces.
3. Optionally submit a second registration using the same normalized email and a different username.

**Expected result:** Login succeeds after trimming and case normalization; duplicate normalized email is rejected with a clear duplicate-email response.  
**Actual baseline result:** Mixed-case login returned HTTP 400 with `Invalid credentials`.  
**Supporting baseline evidence:** `qa/section-3.8/evidence/baseline/http-results.json` and `stdout.txt` (test SG-002).

**Root cause:** Registration and login did not use a shared normalization rule at lookup boundaries.

**Implemented local fix:** Normalize once before registration duplicate lookup and persistence; apply the same trim/lowercase normalization during login.  
**Post-fix verification:** Mixed-case login returned HTTP 200; duplicate normalized registration returned HTTP 400 with `Email is already registered`. See `qa/section-3.8/evidence/post-fix-regression/http-results.json`.

**Local defect status:** Fixed and verified in this working tree.  
**GitHub status:** No issue has been created; remote lifecycle is pending.

---

## SG-003 — Device mutations are accessible without role-based protection

**Suggested labels:** `bug`, `security`, `access-control`, `priority: high`

### Issue body

**Description**  
An unauthenticated caller could create a greenhouse device. The device update and delete routes were also missing authentication and authorization checks.

**Affected component:** Backend device API — `POST`, `PUT`, and `DELETE /api/devices`  
**Severity:** High  
**Priority:** P1  
**Preconditions:** SmartGrow backend and isolated test database are running; caller has no token.

**Steps to reproduce**
1. Send `POST /api/devices` with a valid synthetic device payload and no authorization header.
2. Observe whether a device is created.
3. Repeat with `PUT /api/devices/:id` and `DELETE /api/devices/:id` after obtaining a test record.

**Expected result:** Anonymous mutations are rejected; authenticated users must also have an authorized role.  
**Actual baseline result:** Anonymous device creation returned HTTP 201.  
**Supporting baseline evidence:** `qa/section-3.8/evidence/baseline/http-results.json` and `stdout.txt` (test SG-003).

**Root cause:** Device mutation handlers were mounted without the existing authentication and role-authorization middleware.

**Implemented local fix:** Device create, update, and delete use `protect` and authorize only `farmer` or `admin`. The frontend mutation helpers send the stored authentication headers.  
**Post-fix verification:** Anonymous create/update/delete requests were denied; farmer mutations succeeded; customer creation returned HTTP 403. See `qa/section-3.8/evidence/post-fix-regression/http-results.json`.

**Local defect status:** Fixed and verified in this working tree.  
**GitHub status:** No issue has been created; remote lifecycle is pending.

---

## SG-004 — Negative basket quantity produces a negative total

**Suggested labels:** `bug`, `validation`, `data-integrity`, `priority: high`

### Issue body

**Description**  
The crop basket accepted a negative quantity for a fallback catalogue item and returned a negative subtotal and total. The companion agricultural-supplies basket lacked equivalent quantity and fallback-price validation.

**Affected component:** Backend basket calculations — `POST /api/cart/calculate` and `POST /api/cart/calculate-supplies`  
**Severity:** High  
**Priority:** P1  
**Preconditions:** SmartGrow backend is running; fallback item can be submitted without a database product record.

**Steps to reproduce**
1. Send `POST /api/cart/calculate` with an item such as `{"productId":"qa-item","name":"Synthetic Crop","price":5,"quantity":-3}`.
2. Observe the response status and total.

**Expected result:** Invalid quantities and non-positive/non-finite fallback prices are rejected before calculations; no negative basket total is returned.  
**Actual baseline result:** HTTP 200; subtotal `-15.00`, delivery fee `2.50`, total `-12.50`.  
**Supporting baseline evidence:** `qa/section-3.8/evidence/baseline/http-results.json` and `stdout.txt` (test SG-004).

**Root cause:** Fallback calculations multiplied the supplied quantity without enforcing a finite positive lower bound. The supplies basket had the same validation gap.

**Implemented local fix:** Crop and supply calculations reject invalid quantities and invalid fallback prices before calculating totals.  
**Post-fix verification:** Invalid negative, zero, and non-numeric quantities and non-positive/non-numeric fallback prices returned HTTP 400. A valid two-unit supply fallback returned `$13.50`. See `qa/section-3.8/evidence/post-fix-regression/http-results.json`.

**Local defect status:** Fixed and verified in this working tree.  
**GitHub status:** No issue has been created; remote lifecycle is pending.

---

## SG-005 — Simulator import uses filename casing that is not portable

**Suggested labels:** `bug`, `portability`, `build`, `priority: medium`

### Issue body

**Description**  
The server required `sensorSimulator.js` while the tracked file was named `sensorsimulator.js`. The case mismatch can prevent application startup on case-sensitive filesystems.

**Affected component:** Backend startup — simulator import in `backend/server.js`  
**Severity:** Medium  
**Priority:** P2  
**Preconditions:** Source is checked out on a case-sensitive filesystem or checked with an exact-case path assertion.

**Steps to reproduce**
1. Compare the simulator import in `backend/server.js` with the exact tracked filename in `backend/utils`.
2. On Linux, attempt to start the backend.

**Expected result:** Import path matches the tracked filename exactly and backend starts on supported platforms.  
**Actual baseline result:** The exact-case source check failed: `sensorSimulator.js` did not match `sensorsimulator.js`. Linux startup was not executed in the baseline.  
**Supporting baseline evidence:** `qa/section-3.8/evidence/baseline/stdout.txt` (test SG-005).

**Root cause:** The import was committed with different capitalization from the actual utility filename.

**Implemented local fix:** The server import now uses the exact lowercase filename.  
**Post-fix verification:** Exact-case static check passed. Docker's Linux engine was unavailable, so no Linux startup claim is made. See `qa/section-3.8/evidence/post-fix-regression/stdout.txt` and `execution.json`.

**Local defect status:** Fixed; static check verified; Linux execution remains unverified.  
**GitHub status:** No issue has been created; remote lifecycle is pending.

---

## Manual GitHub website checklist

Repeat these actions separately for SG-001 through SG-005:

1. **Create:** Open the repository on GitHub in a browser, choose **Issues → New issue**, copy the corresponding title and body above, select only labels that exist and are appropriate (the listed labels are suggestions), and submit. Record the actual issue number and URL in the local report after creation; do not infer them.
2. **Update:** When implementation is reviewed or merged, add the actual pull request or commit reference and summarize the change in the issue. Assign an owner only after the team agrees who owns it.
3. **Verify:** Run the documented post-fix test for that defect against the intended build. Add the real run result and evidence path to the issue. For SG-005, keep the platform limitation explicit unless Linux startup is actually run.
4. **Close:** Close the issue only after the repository maintainers accept the fix and the verification evidence. Do not close SG-005 as platform-verified based solely on a static check.

| Defect | Create | Update | Verify | Close |
|---|---|---|---|---|
| SG-001 | [ ] | [ ] | [ ] | [ ] |
| SG-002 | [ ] | [ ] | [ ] | [ ] |
| SG-003 | [ ] | [ ] | [ ] | [ ] |
| SG-004 | [ ] | [ ] | [ ] | [ ] |
| SG-005 | [ ] | [ ] | [ ] | [ ] |
