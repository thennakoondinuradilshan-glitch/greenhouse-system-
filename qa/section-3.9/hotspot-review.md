# Manual Review of SonarQube Security Hotspots

## Review method and status

The successful SonarQube analysis reported 17 hotspots, all with SonarQube status `TO_REVIEW`. The records were retrieved from the local project with read-only hotspot-search/detail requests, then checked against the referenced source lines and relevant route usage. The sanitized list of keys, rules, file paths, lines, Sonar probabilities, and original statuses is in [`evidence/sonarqube-analysis/security-hotspots.json`](evidence/sonarqube-analysis/security-hotspots.json). The source is not a reproduction of an attack: no order, supply, or meeting endpoint was probed as an attacker.

The local SonarQube service was bound to `127.0.0.1`. Anonymous access was enabled temporarily only to retrieve the existing analysis; the saved server configuration was restored after collection. No hotspot status or review decision was changed in SonarQube. Therefore its measured `security_hotspots_reviewed` remains **0.0%**, and its security-review rating remains **E**. The assessments below are the local source-review results, not SonarQube workflow updates.

## Individual hotspot assessments

| # | Sonar finding | Source context observed | Local assessment and disposition |
|---:|---|---|---|
| 1 | `javascript:S2245`, medium; [consultationRoutes.js:237](../../backend/routes/consultationRoutes.js#L237) | `Math.random()` creates a four-digit consultation reference; that reference is also embedded in the Jitsi room URL at line 562. Consultation detail routes require authentication. | **Conditional security concern.** The reference is not used as an API credential, but the predictable room name may expose an active meeting if the external room permits unauthenticated joining. No live meeting was tested. Use a high-entropy room identifier and appropriate room admission controls; validate the provider's privacy behavior. |
| 2 | `javascript:S2245`, medium; [orderRoutes.js:198](../../backend/routes/orderRoutes.js#L198) | `Math.random()` creates a four-digit order suffix. `GET /api/orders/:id` accepts an `ORD-...` reference without authentication and returns the order document. | **Confirmed source-level access-control concern.** The order reference has a small guessable suffix and is accepted by a public detail route; the response includes order data. Do not rely on this identifier as authorization. Require an owner check or a separate high-entropy, scoped, rate-limited guest-access token, and minimize returned personal data. Runtime enumeration was not performed. |
| 3 | `javascript:S2245`, medium; [problemRoutes.js:181](../../backend/routes/problemRoutes.js#L181) | `Math.random()` creates a four-digit problem-report reference. The report detail route uses `protect`. | **Not security-sensitive in the inspected use.** Access to report details is authenticated, so the reference is not an access token. The 9,000-value daily suffix space and unique index can still cause collisions; consider a collision-resistant identifier and duplicate-key retry. |
| 4 | `javascript:S2245`, medium; [supplyOrderRoutes.js:207](../../backend/routes/supplyOrderRoutes.js#L207) | `Math.random()` creates a four-digit supply-order suffix. `GET /api/supply-orders/:id` accepts a `SUP-...` reference without authentication and returns the supply-order document. | **Confirmed source-level access-control concern.** As with crop orders, the short reference is guessable and the public route returns order data. Require ownership verification or a separate high-entropy, scoped, rate-limited guest-access token; minimize response data. Runtime enumeration was not performed. |
| 5 | `javascript:S2245`, medium; [sensorsimulator.js:7](../../backend/utils/sensorsimulator.js#L7) | `Math.random()` generates synthetic sensor readings for the simulator. | **Safe for the observed purpose.** Values are synthetic and are not used for authentication, authorization, tokens, or secrets. Keep this generator out of security-sensitive paths. |
| 6 | `javascript:S2245`, medium; [SupportView.jsx:149](../../frontend/src/components/support/SupportView.jsx#L149) | `Math.random()` generates a support-ticket display ID stored in browser `localStorage`. | **Not security-sensitive in the inspected use.** The ID is client-side presentation data, not a server authorization token. A UUID would reduce accidental collisions but is not required for cryptographic security here. |
| 7 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:42](../../frontend/src/components/AtmosphereCanvas.tsx#L42) | Random initial particle x-coordinate. | **Safe for the observed purpose.** Decorative canvas placement; no security decision or secret depends on it. |
| 8 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:43](../../frontend/src/components/AtmosphereCanvas.tsx#L43) | Random initial particle y-coordinate. | **Safe for the observed purpose.** Decorative canvas placement only. |
| 9 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:44](../../frontend/src/components/AtmosphereCanvas.tsx#L44) | Random particle size. | **Safe for the observed purpose.** Visual effect only. |
| 10 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:45](../../frontend/src/components/AtmosphereCanvas.tsx#L45) | Random horizontal particle speed. | **Safe for the observed purpose.** Visual animation only. |
| 11 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:46](../../frontend/src/components/AtmosphereCanvas.tsx#L46) | Random vertical particle speed. | **Safe for the observed purpose.** Visual animation only. |
| 12 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:47](../../frontend/src/components/AtmosphereCanvas.tsx#L47) | Random particle opacity. | **Safe for the observed purpose.** Visual styling only. |
| 13 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:48](../../frontend/src/components/AtmosphereCanvas.tsx#L48) | Random initial particle rotation. | **Safe for the observed purpose.** Visual animation only. |
| 14 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:49](../../frontend/src/components/AtmosphereCanvas.tsx#L49) | Random particle rotation speed. | **Safe for the observed purpose.** Visual animation only. |
| 15 | `typescript:S2245`, medium; [AtmosphereCanvas.tsx:84](../../frontend/src/components/AtmosphereCanvas.tsx#L84) | Random x-coordinate when a decorative particle wraps around the canvas. | **Safe for the observed purpose.** Visual animation only. |
| 16 | `javascript:S5122`, low; [server.js:11](../../backend/server.js#L11) | `app.use(cors())` uses the default permissive origin policy. | **Configuration concern.** This allows cross-origin browser requests from any origin. It does not itself bypass bearer-token authorization, but it unnecessarily exposes any unauthenticated API responses to arbitrary web origins. Configure an explicit deployment-origin allowlist and test preflight behavior. |
| 17 | `javascript:S5689`, low; [server.js:8](../../backend/server.js#L8) | Express is initialized without disabling its default technology-identification header. | **Low-impact hardening item.** The default `X-Powered-By` header identifies Express; this is not by itself an exploit, but it aids fingerprinting. Disable the header in production. |

## Review summary and limitations

- **17/17 records inspected.** Fifteen findings are `Math.random()` usages; two are server configuration/header findings.
- **12 random uses are not security-sensitive in their observed contexts** (one problem-report reference, simulator values, local support ID, and nine decorative animation values). The problem-report reference still has a collision/reliability consideration.
- **Two order-reference uses warrant access-control remediation** because public detail routes accept the low-entropy identifiers and return order data.
- **One consultation-room reference needs provider/privacy validation** because it is incorporated into a Jitsi room name.
- **Two server configuration findings warrant hardening:** restrict CORS and suppress the Express fingerprint header.
- The order/supply and meeting-room assessments are source-based; no production service, external meeting, or live deployment was contacted. No exploitability claim is made beyond the visible route behavior.
- SonarQube's own hotspot workflow was not updated. Maintain the server count of 0% reviewed and follow the recommendations above in the project workflow.

## Screenshot evidence

- [`sonarqube-dashboard.png`](evidence/screenshots/sonarqube-dashboard.png) — genuine local project-page capture; authoritative metric values are in the scanner JSON and report.
- [`sonarqube-hotspots.png`](evidence/screenshots/sonarqube-hotspots.png) — actual local hotspot page.
