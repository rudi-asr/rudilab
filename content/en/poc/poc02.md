---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-02.pcap"
capture_note: "expired TLS certificate & hostname mismatch"
intro: "The target's TLS certificate had expired before the test date, and its Common Name (CN) did not match the accessed domain. Modern browsers and HTTP clients therefore show security warnings and cannot verify server identity, weakening transport security against an on-path man-in-the-middle attacker."
severity: "Medium"
cwe: "CWE-295 - Improper Certificate Validation"
category: "Cryptography / Transport"
owasp: "A02:2021 - Cryptographic Failures"
target: "[REDACTED] - web application"
test_date: "2026-08-29"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Testing was black-box from an external network, read-only and non-destructive; the finding is publicly verifiable and required no credentials. Host and stack details are redacted for public release. This is a sanitized showcase, not the confidential deliverable."
---

## Summary {#summary}

The target's TLS certificate had expired before the test date, and its Common Name (CN) did not match the accessed domain. Modern browsers and HTTP clients therefore show security warnings and cannot verify server identity, weakening transport security against an on-path **man-in-the-middle** attacker.

Stack fingerprint: nginx + PHP (version redacted), identified from HTTP response headers.

> NOTCLAIMED:: Note on severity
>
> This finding is rated **Medium**, not Critical. Exploitation requires an attacker already in an on-path position (AC:High) and a user who dismisses the browser warning (UI:Required). Rating a warning-gated, position-dependent TLS issue as Critical would overstate real-world risk.

## Risk Map {#riskmap}

| ID | Severity | Class | Evidence | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | Low-Medium | TLS Certificate - Expired & CN Mismatch | Cert expired; CN does not match served hostname | CWE-295 / CWE-297 | Not claimed |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - black-box, external |
| **Discovery method** | Unauthenticated TLS inspection of a public endpoint |
| **Authentication bypassed** | NO - no credentials required |
| **Automated scanning** | Limited - curl, openssl, single nmap ssl-cert script |
| **Testing environment** | Production, read-only, non-destructive |
| **Data accessed / modified** | NO |
| **Target identified here** | NO |

## Preconditions {#pre}

- Black-box testing from an external network, no authentication.
- No account or credentials required - the finding is publicly verifiable.
- Tools: `curl`, `openssl s_client`, Nmap ssl-cert script.
- All testing read-only and non-destructive.

## PoC 1 - TLS verification via curl {#poc1}

*Objective:* demonstrate that the certificate is invalid and causes verification errors.

```bash {label="bash"}
$ curl -vI https://TARGET 2>&1 | grep -E "expire|CN=|subject|SSL|certificate"
* SSL certificate problem: certificate has expired
* SSL certificate problem: hostname mismatch
curl: (60) SSL certificate problem: certificate has expired
```

curl rejected the connection due to an expired certificate. The expiry date was confirmed to have passed before the test date. Modern browsers display a "Your connection is not private" warning to end users.

## PoC 2 - Certificate detail via OpenSSL {#poc2}

*Objective:* extract certificate details to confirm the expiry date and hostname mismatch.

```bash {label="bash"}
$ echo | openssl s_client -connect TARGET:443 -servername TARGET 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates
subject=CN = <redacted>
issuer=C = US, O = Let's Encrypt, CN = R3
notBefore=<redacted>  notAfter=<redacted>  [EXPIRED]
```

The certificate's CN does not cover the target domain; the registered CN/SAN belongs to a different domain, causing hostname verification to fail on all compliant TLS clients.

## PoC 3 - SSL audit via Nmap {#poc3}

*Objective:* confirm the finding with an independent tool.

```bash {label="bash"}
$ nmap -p 443 --script ssl-cert TARGET
443/tcp open  https
| ssl-cert: Issuer: commonName=R3/organizationName=Let's Encrypt
| Public Key type: rsa | bits: 2048
| Not valid before: <redacted>
|_Not valid after:  <redacted>  [EXPIRED]
```

Nmap's ssl-cert script confirms the certificate has passed its `Not valid after` date, consistent with the curl and openssl results.

## Impact & Attack Scenario {#impact}

With an invalid certificate, an attacker in an on-path position (e.g. a shared network, ARP poisoning) can target users habituated to dismissing TLS warnings. Once a user clicks through the warning, transport confidentiality and integrity are no longer guaranteed.

> IMPACT:: Impact
>
> **A. Credential interception** - login credentials can be captured in the absence of valid TLS.
>
> **B. Session hijacking** - session tokens sent without valid TLS can be stolen and replayed.
>
> **C. Integrity violation** - an on-path attacker can modify data in transit.

> NOTCLAIMED:: Findings not claimed
>
> - Active MitM exploitation - not proven (non-destructive testing).
> - User data access - not performed.
> - Historical traffic decryption - not performed.

## Severity Assessment {#cvss}

Severity is researcher-assessed based on the observed conditions: exploitation requires an on-path (MITM) position and the victim dismissing a browser certificate warning, and any exposure is warning-gated. This places the finding in the Medium band - rescored from an earlier Critical rating; the accurate rating is what a triager expects for a warning-gated, position-dependent TLS finding.

## Root Cause {#rootcause}

No auto-renewal mechanism and no proactive expiry monitoring for TLS certificates. Let's Encrypt certificates are valid for 90 days and must be renewed on schedule. The hostname mismatch indicates the installed certificate was issued for a different domain or subdomain - most likely a deployment misconfiguration.

## Solution & Recommendations {#fix}

### renew & auto-renew

```bash {label="bash"}
$ certbot --nginx -d TARGET          # renew with correct CN/SAN
$ systemctl enable --now certbot.timer
$ certbot renew --dry-run            # verify auto-renewal
```

### nginx - TLS + HSTS

```nginx {label="nginx"}
ssl_certificate     /etc/letsencrypt/live/TARGET/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/TARGET/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### remediation priority

| # | Remediation | Priority |
|---|---|---|
| 1 | Renew TLS certificate with correct CN/SAN | HIGH |
| 2 | Enable Certbot auto-renewal | HIGH |
| 3 | Implement HSTS header | MEDIUM |
| 4 | Certificate expiry monitoring (alert at D-14) | MEDIUM |

## Verification After Fix {#verify}

```bash {label="bash"}
$ curl -vI https://TARGET 2>&1 | grep -E "expire|subject|SSL"
# no certificate errors; notAfter is in the future; CN/SAN matches the domain
```

## Conclusion {#conclusion}

An expired certificate combined with a hostname mismatch removes the guarantees of transport encryption and server authentication for users who click through the warning. Remediation is fast and free with Let's Encrypt Certbot and should be paired with auto-renewal and expiry monitoring. The realistic risk is Medium - meaningful, but gated by an on-path position and a user action.

## References {#refs}

- [CWE-295 - Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
- [OWASP A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)