---
title: "WordPress Institutional Site & Academic Portal Assessment"
date: "2026-09-06"
poc_num: "06"
kicker: "SECURITY RESEARCH CASE STUDY - Independent research · coordinated disclosure"
capture: "poc-06.pcap"
capture_note: "WordPress institutional site + academic portals"
intro: "A higher-education institution's public website - built on WordPress over LiteSpeed, behind an OpenResty anti-bot reverse proxy - was assessed together with two academic portals on the same infrastructure: an academic information system (SIAKAD) and a computer-based testing platform (CBT)."
severity: "Medium (highest)"
breakdown: "4 Medium · 3 Low · 2 Info"
cwe: "CWE-79, CWE-307, CWE-918, CWE-200, CWE-693"
owasp: "A05:2021 · A07:2021"
category: "Web Application"
target: "[REDACTED] - Indonesian higher-education institution (WordPress + academic portals)"
test_date: "2026-09-06"
status: "CONFIRMED - UNREMEDIATED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Independent security research under coordinated disclosure. Testing was scope-limited (no denial-of-service, no destructive testing, brute-force attempts capped at ≤6 with delays) and non-destructive - no data was modified, exfiltrated, or deleted. The institution name, domains, IP address, and subdomains are redacted for public release; findings are published as weakness classes, not as a map to a system whose issues remain open. This is a sanitized case study, not the confidential client deliverable."
---

## Executive Summary {#summary}

A higher-education institution's public website - built on WordPress over LiteSpeed, behind an OpenResty anti-bot reverse proxy - was assessed together with two academic portals on the same infrastructure: an academic information system (SIAKAD) and a computer-based testing platform (CBT).

The assessment produced **four Medium findings** (including two unthrottled login endpoints on the academic applications), **three Low findings**, and **two informational findings**. No Critical or High findings were identified, and no remote code execution or full compromise was achieved.

Note on methodology: the site is protected by an effective OpenResty anti-bot layer that blocks automated scanners and headless browsers. The advanced test phase used a non-headless browser with a genuine fingerprint to pass the challenge, so the full attack surface could be verified. That the control was bypassable by a real browser is itself recorded as a finding (A7), framed as a positive control with a stated limitation.

## Risk Map {#riskmap}

| ID | Severity | Finding | CWE |
|---|---|---|---|
| A1 | Medium | Slider plugin in a version range affected by a published Stored XSS CVE | CWE-79 |
| A2 | Medium | XML-RPC enabled - brute-force amplification (multicall) + SSRF (pingback) | CWE-307/918 |
| A8 | Medium | SIAKAD login without rate-limit/CAPTCHA + open directory listing | CWE-307/200 |
| A9 | Medium | CBT admin/participant login without rate-limit (brute-forceable) | CWE-307 |
| A3 | Low | User enumeration via REST API - admin username exposed | CWE-200 |
| A4 | Low | Information disclosure - plugin/theme versions publicly readable | CWE-200 |
| A5 | Low | Incomplete security headers on public pages | CWE-693 |
| A6 | Info | Subdomain discovery (academic portals reachable directly) | - |
| A7 | Info | Anti-bot WAF effective - positive control (bypassable via non-headless browser) | CWE-693 |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Independent research - coordinated disclosure |
| **Discovery method** | DNS/certificate transparency, HTTP fingerprinting, REST/XML-RPC inspection |
| **Authentication bypassed** | NO - no credentials compromised |
| **Brute-force** | Capped at ≤6 attempts with delays - proof of missing control only |
| **Testing environment** | Production, read-only, non-destructive, no-DoS |
| **Data modified or destroyed** | NO |
| **Cleanup** | YES - test browser closed, temp files removed |
| **Target identified here** | NO |

## Methodology & Tools {#method}

| Phase | Tools & technique |
|---|---|
| Recon | dig, certificate transparency, curl - DNS & HTTP fingerprinting |
| Enumeration | REST API (rest_route), readme/style metadata, robots/sitemap, xmlrpc, tech-detect |
| CVE mapping | NVD, Wordfence, Patchstack, GitHub Advisory - version vs CVE database |
| Exploitation | XML-RPC POST (recon + post-bypass); non-headless Chrome via CDP; manual subdomain inspection |
| WAF bypass | Headless + CDP stealth (failed) → non-headless browser with genuine fingerprint (passed challenge) |
| Scope limit | No-DoS, non-destructive; brute-force ≤6 attempts; cleanup afterwards |

## A1 - Slider plugin: version affected by published Stored XSS CVE {#a1}

Severity: Medium - researcher-assessed.

A slider plugin is installed in a version that falls within the affected range of a published Stored XSS CVE (fixed in the next patch release). The vulnerability allows an authenticated attacker with Contributor-or-higher role to inject script via a block attribute. The plugin is active on the front end. Public registration is open, though the default role is subscriber.

### step 1 - confirm version from public metadata

```bash {label="bash"}
$ curl -s https://TARGET/wp-content/plugins/<slider-plugin>/readme.txt | grep -i "stable tag"
Stable tag: <affected-version>   # within CVE affected range; patch is the next point release
```

Version confirmed against the plugin's public readme, then matched to the CVE's affected range. Front-end asset loading confirms the plugin is active.

> IMPACT:: Impact
>
> An attacker with Contributor+ access could steal an admin session cookie, deface pages, or escalate to admin. Chains with A2 (XML-RPC brute-force amplification) and A3 (admin username known).

> NOTCLAIMED:: Findings not claimed
>
> - Full exploitation not performed - it requires a Contributor+ account, which was not available.
> - No script was injected and no session was stolen; the finding is version-confirmed, not weaponized.

> FIX:: Remediation
>
> Update the plugin to the patched release and enable plugin auto-update. Disable public registration or keep the default role strictly at subscriber.

## A2 - XML-RPC enabled: brute-force amplification + SSRF {#a2}

Severity: Medium - researcher-assessed.

The XML-RPC endpoint is enabled and exposes `system.multicall` and `pingback.ping`. In the post-bypass phase, `system.multicall` was shown to execute multiple `wp.getUsersBlogs` login attempts in a single HTTP request - brute-force amplification confirmed. The response returned multiple authentication faults within one response body.

### step 1 - endpoint & method enumeration

```bash {label="bash"}
$ curl -s https://TARGET/xmlrpc.php                 # GET -> 405 (endpoint alive)
$ curl -s -X POST https://TARGET/xmlrpc.php \
    -d '<methodCall><methodName>system.listMethods</methodName></methodCall>'
200 OK -> methods include: system.multicall, pingback.ping, wp.getUsersBlogs, ...
```

### step 2 - amplification proof (capped, non-destructive)

```xml {label="xml (structure only)"}
# one HTTP request wrapping several wp.getUsersBlogs attempts
<methodCall><methodName>system.multicall</methodName>
  <params><param><value><array><data>
    <!-- N x wp.getUsersBlogs(user, wrong-pass-i) -->
  </data></array></value></param></params>
</methodCall>
# response: multiple auth faults in ONE response = N login attempts per request
```

> IMPACT:: Impact
>
> Brute-force amplification: many login attempts per single request, evading naive per-request rate limits. `pingback.ping` additionally enables SSRF, forcing the server to make requests to attacker-chosen hosts.

> FIX:: Remediation
>
> Disable XML-RPC entirely (block `xmlrpc.php` at the WAF/LiteSpeed layer or via filter). If it must stay, IP-allowlist it and disable `system.multicall` and `pingback.ping`.

## A8 - Academic system (SIAKAD): login without rate-limit + directory listing {#a8}

Severity: Medium - researcher-assessed.

The academic information system's login form has no brute-force protection - no CAPTCHA, rate-limit, CSRF token, or lockout - and directory listing is enabled on two paths, exposing the application's file structure.

```bash {label="bash"}
$ curl -s -X POST https://siakad.TARGET/login.php \
    -d 'username=<user>&pass=<wrong>&login=Login' -o /dev/null -w "%{http_code}\n"
200   # error message returned, NO lockout, NO delay, NO CSRF token
$ curl -s https://siakad.TARGET/public/ | grep -i "index of"
<h1>Index of /public/</h1>     # directory listing enabled (also on /assets/)
```

![SIAKAD directory listing, contents redacted](/images/img-poc/poc06/poc06.jpg "Figure 1 - SIAKAD directory listing exposed on the academic system, contents redacted.")

Negative checks: `.git/config` returned 403; `config.php`, `.env`, and DB-connection files returned 404 - not leaked.

> IMPACT:: Impact
>
> Unthrottled credential brute-force against student/lecturer/admin accounts. Directory listing discloses internal structure. Academic data is potentially exposed if an account is compromised.

> FIX:: Remediation
>
> Add rate-limiting, CAPTCHA, and account lockout on the login form; add a CSRF token; disable directory listing (e.g. `Options -Indexes`).

## A9 - Testing platform (CBT): admin/participant login without rate-limit {#a9}

Severity: Medium - researcher-assessed.

The computer-based testing platform exposes an admin login endpoint and a participant login endpoint, neither with rate-limit, CAPTCHA, or lockout. A path-traversal attempt on a media handler was blocked by the WAF (403) - no LFI was demonstrated.

```bash {label="bash"}
$ curl -s -X POST https://cbt.TARGET/admin/<login-endpoint> \
    -d 'email=<user>&password=<wrong>' -o /dev/null -w "%{http_code}\n"
200   # error message, NO lockout, NO rate-limit, NO CSRF token
$ curl -s "https://cbt.TARGET/<media-handler>?module=../../../../etc/passwd" -o /dev/null -w "%{http_code}\n"
403   # blocked by WAF - no LFI demonstrated
```

> IMPACT:: Impact
>
> Unthrottled brute-force against exam-admin and participant accounts. Sensitive exam data (questions, answers, scores) is at risk; admin access would allow manipulation of exam data and leakage of questions.

> FIX:: Remediation
>
> Add rate-limiting, CAPTCHA, and lockout on all login endpoints; add CSRF tokens; consider 2FA for admin accounts.

## A3-A5 - Low-severity findings {#lowinfo}

### A3 - User enumeration via REST API [Low]

The WordPress REST users endpoint returns registered users without authentication, exposing the admin username. Confirmed via the author-query redirect behaviour (existing author returns 200, non-existing returns 404). Impact: half the admin credential is known, enabling targeted brute-force (worsened by A2) and password spraying. Remediation: restrict `/wp/v2/users` to authenticated users, disable the author-query redirect, and rename the admin account to something non-obvious.

### A4 - Plugin/theme version disclosure [Low]

Plugin and theme metadata files (readme/style) are publicly readable, revealing exact installed versions and making CVE-matching trivial. Remediation: block public access to `readme.txt` and `changelog.txt` at the server (deny rule per file pattern).

### A5 - Incomplete security headers [Low]

Public pages lack HSTS, `X-Content-Type-Options`, and `Referrer-Policy`. (The login page correctly sets framing protection.) Missing HSTS enables downgrade attacks; missing nosniff enables MIME sniffing; missing referrer policy can leak URLs. Remediation: add the three headers at the server.

## A6-A7 - Informational findings {#info}

### A6 - Subdomain discovery [Info]

Academic portals (SIAKAD, CBT) were discovered via certificate transparency and reached directly, which produced findings A8 and A9. One legacy subdomain no longer resolves. Remediation: inventory and document all active subdomains and enforce a uniform security policy across them.

### A7 - Anti-bot WAF: positive control with a limitation [Info]

An OpenResty reverse proxy injects a JavaScript anti-bot challenge that effectively blocks automated scanners and headless browsers. A non-headless browser with a genuine fingerprint passed the challenge. This is recorded as a **positive control** - it meaningfully raises the bar against automation - with the honest limitation that it does not stop a determined attacker using a real browser. Remediation: keep the anti-bot layer, and add IP-reputation and behavioural analysis.

## Authorization / IDOR testing - negative results {#idor}

Horizontal and vertical authorization testing on both academic portals found **no exploitable IDOR without valid credentials**. This is a boundary of the test, not a clean bill of health.

| Test | Result |
|---|---|
| Self-registration paths (SIAKAD/CBT) | Not present - all 404 |
| Direct record access (grades, transcripts, exams by id) | Behind session - 404/redirect |
| Config/secret files (.env, config, DB connect) | Not leaked - 404; .git/config 403 |
| Login response for existing vs non-existing user | Uniform - no user enumeration |
| Path traversal on CBT media handler | Blocked by WAF (403) - no LFI |

Recommendation to the asset owner: provide official test accounts (student + admin roles) so IDOR and authorization can be verified properly.

## Remediation Priority {#priority}

| # | Finding | Action | Priority |
|---|---|---|---|
| P1 | A8 + A9 - unthrottled logins | CAPTCHA, rate-limiting, lockout on all SIAKAD & CBT login forms | HIGH |
| P2 | A2 - XML-RPC | Disable xmlrpc.php entirely or block at the WAF/LiteSpeed layer | MEDIUM |
| P3 | A1 - slider XSS | Update plugin to the patched release; enable auto-update | MEDIUM |
| P4 | A3 - user enumeration | Restrict /wp/v2/users; rename admin account | MEDIUM |
| P5 | A4 - version disclosure | Block public readme/changelog on all plugins/themes | LOW |
| P6 | A5 - security headers | Add HSTS, X-Content-Type-Options, Referrer-Policy at the server | LOW |

## Conclusion {#conclusion}

The strongest issues are the two academic portals' login endpoints, which accept unlimited authentication attempts and guard exam and student data - these are the priority. The WordPress layer contributes an XSS-vulnerable plugin version, an open XML-RPC that amplifies brute-force and enables SSRF, and reconnaissance-grade disclosures (admin username, plugin versions). No Critical or High findings were confirmed, no RCE was achieved, and authorization testing on the portals returned negative results limited by the absence of test credentials. All testing was non-destructive, no-DoS, brute-force-capped, and cleaned up afterwards.

## References {#refs}

- [CWE-79 - Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-307 - Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [CWE-918 - Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- [CWE-200 - Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)
- [CWE-693 - Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
- [OWASP A07:2021 - Identification & Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP WSTG-ATH-04 - Testing for Account Enumeration](https://owasp.org/www-project-web-security-testing-guide/)
- ISO/IEC 29147:2018 & 30111:2019 - Vulnerability disclosure & handling
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi