---
title: "WordPress Institutional Site & Academic Portal Assessment"
date: "2026-09-06"
poc_num: "06"
target: "[REDACTED] - Indonesian higher-education institution (WordPress + academic portals)"
category: "Web Application"
severity: "Medium (highest) - 9 findings"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Brute-force amplification via XML-RPC, credential exposure on unthrottled academic portals, XSS via outdated plugin, reconnaissance-grade information disclosure."
status: "Proven"
---

poc-06 - WordPress & Academic Portal Assessment (9 Findings) | Rudi

- 

- 

- 
  
- 

  

  
    01
## Ringkasan Eksekutif

    
A higher-education institution's public website - built on WordPress over LiteSpeed, behind an OpenResty anti-bot
      reverse proxy - was assessed together with two academic portals on the same infrastructure: an academic information
      system (SIAKAD) and a computer-based testing platform (CBT).

    
The assessment produced **four Medium findings** (including two unthrottled login endpoints on the academic
      applications), **three Low findings**, and **two informational findings**. No Critical or High
      findings were identified, and no remote code execution or full compromise was achieved.

    
Note on methodology: the site is protected by an effective OpenResty anti-bot layer that blocks automated
      scanners and headless browsers. The advanced test phase used a non-headless browser with a genuine fingerprint to pass
      the challenge, so the full attack surface could be verified. That the control was bypassable by a real browser is
      itself recorded as a finding (A7), framed as a positive control with a stated limitation.

  

  
    02
## Peta Risiko

    IDSeverityFindingCWE
      A1MediumSlider plugin in a version range affected by a published Stored XSS CVECWE-79
      A2MediumXML-RPC enabled - brute-force amplification (multicall) + SSRF (pingback)CWE-307/918
      A8MediumSIAKAD login without rate-limit/CAPTCHA + open directory listingCWE-307/200
      A9MediumCBT admin/participant login without rate-limit (brute-forceable)CWE-307
      A3LowUser enumeration via REST API - admin username exposedCWE-200
      A4LowInformation disclosure - plugin/theme versions publicly readableCWE-200
      A5LowIncomplete security headers on public pagesCWE-693
      A6InfoSubdomain discovery (academic portals reachable directly)-
      A7InfoAnti-bot WAF effective - positive control (bypassable via non-headless browser)CWE-693
    
  

  
    03
## Status Otorisasi & Ruang Lingkup

    
      Authorization statusIndependent research - coordinated disclosure
      Discovery methodDNS/certificate transparency, HTTP fingerprinting, REST/XML-RPC inspection
      Authentication bypassedNO - no credentials compromised
      Brute-forceCapped at &le;6 attempts with delays - proof of missing control only
      Testing environmentProduction, read-only, non-destructive, no-DoS
      Data modified or destroyedNO
      CleanupYES - test browser closed, temp files removed
      Target identified hereNO
    
  

  
    04
## Metodologi & Alat

    PhaseTools & technique
      Recondig, certificate transparency, curl - DNS & HTTP fingerprinting
      EnumerationREST API (rest_route), readme/style metadata, robots/sitemap, xmlrpc, tech-detect
      CVE mappingNVD, Wordfence, Patchstack, GitHub Advisory - version vs CVE database
      ExploitationXML-RPC POST (recon + post-bypass); non-headless Chrome via CDP; manual subdomain inspection
      WAF bypassHeadless + CDP stealth (failed) → non-headless browser with genuine fingerprint (passed challenge)
      Scope limitNo-DoS, non-destructive; brute-force &le;6 attempts; cleanup afterwards
    
  

  
    05
## A1 - Slider plugin: version affected by published Stored XSS CVE [Medium]

    
Severity: Medium - researcher-assessed.

    
A slider plugin is installed in a version that falls within the affected range of a published Stored XSS CVE (fixed in
      the next patch release). The vulnerability allows an authenticated attacker with Contributor-or-higher role to inject
      script via a block attribute. The plugin is active on the front end. Public registration is open, though the default
      role is subscriber.

    
### step 1 - confirm version from public metadata

    bash

$ curl -s https://TARGET/wp-content/plugins/<slider-plugin>/readme.txt | grep -i "stable tag"
Stable tag: <affected-version>   # within CVE affected range; patch is the next point release

    
Version confirmed against the plugin's public readme, then matched to the CVE's affected range. Front-end asset loading
      confirms the plugin is active.

    Impact
      An attacker with Contributor+ access could steal an admin session cookie, deface pages, or escalate to admin. Chains with
      A2 (XML-RPC brute-force amplification) and A3 (admin username known).
    
    Findings not claimed
      
        
- Full exploitation not performed - it requires a Contributor+ account, which was not available.
        
- No script was injected and no session was stolen; the finding is version-confirmed, not weaponized.
      
    
    Remediation
      Update the plugin to the patched release and enable plugin auto-update. Disable public registration or keep the default
      role strictly at subscriber.
    
  

  
    06
## A2 - XML-RPC enabled: brute-force amplification + SSRF [Medium]

    
Severity: Medium - researcher-assessed.

    
The XML-RPC endpoint is enabled and exposes `system.multicall` and
      `pingback.ping`. In the post-bypass phase, `system.multicall` was
      shown to execute multiple `wp.getUsersBlogs` login attempts in a single HTTP request -
      brute-force amplification confirmed. The response returned multiple authentication faults within one response body.

    
### step 1 - endpoint & method enumeration

    bash

$ curl -s https://TARGET/xmlrpc.php                 # GET -> 405 (endpoint alive)
$ curl -s -X POST https://TARGET/xmlrpc.php \
    -d '<methodCall><methodName>system.listMethods</methodName></methodCall>'
200 OK -> methods include: system.multicall, pingback.ping, wp.getUsersBlogs, ...

    
### step 2 - amplification proof (capped, non-destructive)

    xml (structure only)

# one HTTP request wrapping several wp.getUsersBlogs attempts
<methodCall><methodName>system.multicall</methodName>
  <params><param><value><array><data>
    <!-- N x wp.getUsersBlogs(user, wrong-pass-i) -->
  </data></array></value></param></params>
</methodCall>
# response: multiple auth faults in ONE response = N login attempts per request

    Impact
      Brute-force amplification: many login attempts per single request, evading naive per-request rate limits.
      `pingback.ping` additionally enables SSRF, forcing the server to make requests to
      attacker-chosen hosts.
    
    Remediation
      Disable XML-RPC entirely (block `xmlrpc.php` at the WAF/LiteSpeed layer or via filter). If it
      must stay, IP-allowlist it and disable `system.multicall` and
      `pingback.ping`.
    
  

  
    07
## A8 - Academic system (SIAKAD): login without rate-limit + directory listing [Medium]

    
Severity: Medium - researcher-assessed.

    
The academic information system's login form has no brute-force protection - no CAPTCHA, rate-limit, CSRF token, or
      lockout - and directory listing is enabled on two paths, exposing the application's file structure.

    bash

$ curl -s -X POST https://siakad.TARGET/login.php \
    -d 'username=<user>&pass=<wrong>&login=Login' -o /dev/null -w "%{http_code}\n"
200   # error message returned, NO lockout, NO delay, NO CSRF token
$ curl -s https://siakad.TARGET/public/ | grep -i "index of"
<h1>Index of /public/</h1>     # directory listing enabled (also on /assets/)

    
![SIAKAD directory listing, contents redacted](/images/img-poc/poc06/poc06.jpg)
Figure 1 - SIAKAD directory listing exposed on the academic system, contents redacted.
    
Negative checks: `.git/config` returned 403; `config.php`,
      `.env`, and DB-connection files returned 404 - not leaked.

    Impact
      Unthrottled credential brute-force against student/lecturer/admin accounts. Directory listing discloses internal
      structure. Academic data is potentially exposed if an account is compromised.
    
    Remediation
      Add rate-limiting, CAPTCHA, and account lockout on the login form; add a CSRF token; disable directory listing
      (e.g. `Options -Indexes`).
    
  

  
    08
## A9 - Testing platform (CBT): admin/participant login without rate-limit [Medium]

    
Severity: Medium - researcher-assessed.

    
The computer-based testing platform exposes an admin login endpoint and a participant login endpoint, neither with
      rate-limit, CAPTCHA, or lockout. A path-traversal attempt on a media handler was blocked by the WAF (403) - no LFI was
      demonstrated.

    bash

$ curl -s -X POST https://cbt.TARGET/admin/<login-endpoint> \
    -d 'email=<user>&password=<wrong>' -o /dev/null -w "%{http_code}\n"
200   # error message, NO lockout, NO rate-limit, NO CSRF token
$ curl -s "https://cbt.TARGET/<media-handler>?module=../../../../etc/passwd" -o /dev/null -w "%{http_code}\n"
403   # blocked by WAF - no LFI demonstrated

    Impact
      Unthrottled brute-force against exam-admin and participant accounts. Sensitive exam data (questions, answers, scores) is
      at risk; admin access would allow manipulation of exam data and leakage of questions.
    
    Remediation
      Add rate-limiting, CAPTCHA, and lockout on all login endpoints; add CSRF tokens; consider 2FA for admin accounts.
    
  

  
    09
## A3-A5 - Low-severity findings

    
### A3 - User enumeration via REST API [Low]

    
The WordPress REST users endpoint returns registered users without authentication, exposing the admin username. Confirmed
      via the author-query redirect behaviour (existing author returns 200, non-existing returns 404). Impact: half the
      admin credential is known, enabling targeted brute-force (worsened by A2) and password spraying. Remediation: restrict
      `/wp/v2/users` to authenticated users, disable the author-query redirect, and rename the admin
      account to something non-obvious.

    
### A4 - Plugin/theme version disclosure [Low]

    
Plugin and theme metadata files (readme/style) are publicly readable, revealing exact installed versions and making
      CVE-matching trivial. Remediation: block public access to `readme.txt` and
      `changelog.txt` at the server (deny rule per file pattern).

    
### A5 - Incomplete security headers [Low]

    
Public pages lack HSTS, `X-Content-Type-Options`, and `Referrer-Policy`.
      (The login page correctly sets framing protection.) Missing HSTS enables downgrade attacks; missing nosniff enables MIME
      sniffing; missing referrer policy can leak URLs. Remediation: add the three headers at the server.

  

  
    10
## A6-A7 - Informational findings

    
### A6 - Subdomain discovery [Info]

    
Academic portals (SIAKAD, CBT) were discovered via certificate transparency and reached directly, which produced
      findings A8 and A9. One legacy subdomain no longer resolves. Remediation: inventory and document all active subdomains
      and enforce a uniform security policy across them.

    
### A7 - Anti-bot WAF: positive control with a limitation [Info]

    
An OpenResty reverse proxy injects a JavaScript anti-bot challenge that effectively blocks automated scanners and
      headless browsers. A non-headless browser with a genuine fingerprint passed the challenge. This is recorded as a
      **positive control** - it meaningfully raises the bar against automation - with the honest limitation that
      it does not stop a determined attacker using a real browser. Remediation: keep the anti-bot layer, and add IP-reputation
      and behavioural analysis.

  

  
    11
## Authorization / IDOR testing - negative results

    
Horizontal and vertical authorization testing on both academic portals found **no exploitable IDOR without valid
      credentials**. This is a boundary of the test, not a clean bill of health.

    TestResult
      Self-registration paths (SIAKAD/CBT)Not present - all 404
      Direct record access (grades, transcripts, exams by id)Behind session - 404/redirect
      Config/secret files (.env, config, DB connect)Not leaked - 404; .git/config 403
      Login response for existing vs non-existing userUniform - no user enumeration
      Path traversal on CBT media handlerBlocked by WAF (403) - no LFI
    
    
Recommendation to the asset owner: provide official test accounts (student + admin roles) so IDOR and
      authorization can be verified properly.

  

  
    12
## Remediation Priority

    #FindingActionPriority
      P1A8 + A9 - unthrottled loginsCAPTCHA, rate-limiting, lockout on all SIAKAD & CBT login formsHIGH
      P2A2 - XML-RPCDisable xmlrpc.php entirely or block at the WAF/LiteSpeed layerMEDIUM
      P3A1 - slider XSSUpdate plugin to the patched release; enable auto-updateMEDIUM
      P4A3 - user enumerationRestrict /wp/v2/users; rename admin accountMEDIUM
      P5A4 - version disclosureBlock public readme/changelog on all plugins/themesLOW
      P6A5 - security headersAdd HSTS, X-Content-Type-Options, Referrer-Policy at the serverLOW
    
  

  
    13
## Conclusion

    
The strongest issues are the two academic portals' login endpoints, which accept unlimited authentication attempts and
      guard exam and student data - these are the priority. The WordPress layer contributes an XSS-vulnerable plugin version,
      an open XML-RPC that amplifies brute-force and enables SSRF, and reconnaissance-grade disclosures (admin username, plugin
      versions). No Critical or High findings were confirmed, no RCE was achieved, and authorization testing on the portals
      returned negative results limited by the absence of test credentials. All testing was non-destructive, no-DoS,
      brute-force-capped, and cleaned up afterwards.

  

  
    14
## Referensi

    
      
- CWE-79 - Cross-site Scripting
      
- CWE-307 - Improper Restriction of Excessive Authentication Attempts
      
- CWE-918 - Server-Side Request Forgery (SSRF)
      
- CWE-200 - Exposure of Sensitive Information
      
- CWE-693 - Protection Mechanism Failure
      
- OWASP A07:2021 - Identification & Authentication Failures
      
- OWASP WSTG-ATH-04 - Testing for Account Enumeration
      
- ISO/IEC 29147:2018 & 30111:2019 - Vulnerability disclosure & handling
      
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi
    
  

&#8593;
