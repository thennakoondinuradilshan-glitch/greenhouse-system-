# SmartGrow OS Performance Security and Usability

## 3.7 Performance Security and Usability

### Performance

The [JMeter plan](../backend/tests/performance/SmartGrow_OS_Load_Test.jmx) exercises the actual Express application at `GET /`. It uses 50 virtual users, a five-second ramp-up, and four requests per user, for 200 expected samples. Each sample must return HTTP 200 and the application’s expected response text. This measures local API availability and response times with the server and load generator on the same machine. Database access, the sensor simulator, authenticated workflows, and browser rendering are outside this measurement.

The [Express preflight](qa-evidence/express-preflight.txt) confirmed that the revised target returned HTTP 200 and that the old health route returned HTTP 404.

Apache JMeter 5.6.3 completed **200 samples with zero errors**. Mean response time was **11.05 ms**, median **2.00 ms**, and p95 **12.95 ms**. The maximum was **276 ms**. The generated dashboard reported **44.52 requests per second**. The run establishes a local baseline for the original landing route. No performance SLA was specified. [JMeter samples](qa-evidence/jmeter-results.csv) · [JMeter dashboard statistics](qa-evidence/jmeter-statistics.json)

To repeat the run, start the configured backend or use the local Express-only setup below. Use a new evidence directory for each run.

```powershell
# Terminal 1, repository root
node -e "require('./backend/server').listen(5000,'127.0.0.1')"
# Terminal 2, repository root with JMeter on PATH
jmeter -n -t backend/tests/performance/SmartGrow_OS_Load_Test.jmx -Jport=5000 -l smartgrow-load.csv -e -o smartgrow-load-dashboard
```

### Manual OWASP checks

- **A01 Broken Access Control.** A signed-out request to the administrator statistics route returned HTTP 401. Source review confirmed that the administrator router checks the account role after authentication. Review also identified that public registration needs a tighter server-managed policy for privileged roles. Treat the latter as an open defensive finding and review any role changes through the team’s private channel. [Express preflight](qa-evidence/express-preflight.txt) · [OWASP Top 10 2025](https://top10.owasp.org/2025/en/)
- **A07 Authentication Failures.** A signed-out request to the profile route returned HTTP 401. Manual inspection confirmed that authentication uses JWT signature verification and that login compares passwords against bcrypt hashes. This review covers the observed controls and signed-out behavior. Login throttling and authenticated account behavior remain outside the verification. [Express preflight](qa-evidence/express-preflight.txt) · [Authentication middleware](../backend/middleware/authMiddleware.js) · [Authentication routes](../backend/routes/authRoutes.js)

### Usability observation

The login handler uses the same `Invalid credentials` response for an unknown account and an incorrect password. This gives a consistent sign-in message. Browser usability, including whether users can locate and recover from that message, requires a separate observed task.
