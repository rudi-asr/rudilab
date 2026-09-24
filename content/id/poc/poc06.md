---
title: "WordPress Institutional Site & Academic Portal Assessment"
date: "2026-09-06"
poc_num: "06"
kicker: "SECURITY RESEARCH CASE STUDY - Independent research · coordinated disclosure"
capture: "poc-06.pcap"
capture_note: "WordPress institutional site + academic portals"
intro: "Situs web publik sebuah institusi pendidikan tinggi - dibangun di atas WordPress dengan LiteSpeed, di balik reverse proxy OpenResty/nginx - dinilai untuk kerentanan keamanan aplikasi web."
severity: "Medium (highest)"
breakdown: "4 Medium · 3 Low · 2 Info"
cwe: "CWE-79, CWE-307, CWE-918, CWE-200, CWE-693"
owasp: "A05:2021 · A07:2021"
category: "Web Application"
target: "[REDACTED] - Indonesian higher-education institution (WordPress + academic portals)"
test_date: "2026-09-06"
status: "CONFIRMED - UNREMEDIATED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Riset keamanan mandiri dengan pengungkapan terkoordinasi. Pengujian dibatasi ruang lingkupnya (tanpa denial-of-service, tanpa pengujian destruktif, percobaan brute-force dibatasi maksimal ≤6 dengan jeda) dan non-destruktif - tidak ada data yang dimodifikasi, dieksfiltrasi, atau dihapus. Nama institusi, domain, alamat IP, dan subdomain disembunyikan untuk rilis publik; temuan dipublikasikan sebagai kelas kelemahan, bukan sebagai peta sistem yang masalahnya masih terbuka. Ini adalah studi kasus yang telah disanitasi, bukan deliverable rahasia klien."
---

## Ringkasan Eksekutif {#summary}

Situs web publik sebuah institusi pendidikan tinggi - dibangun di atas WordPress dengan LiteSpeed, di balik reverse proxy OpenResty/nginx - dinilai untuk kerentanan keamanan aplikasi web.

Penilaian menghasilkan empat temuan Medium (termasuk dua endpoint login tanpa pembatasan percobaan pada portal akademik) dan lima observasi Low/Info.

Catatan metodologi: situs dilindungi oleh layer anti-bot OpenResty yang efektif yang memblokir pemindaian otomatis. Seluruh pengujian dilakukan secara manual dengan lalu lintas yang dikendalikan kecepatan.

## Peta Risiko {#riskmap}

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

## Status Otorisasi & Ruang Lingkup {#scope}

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

## Metodologi & Alat {#method}

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

Plugin slider terpasang dalam versi yang masuk dalam rentang yang terpengaruh oleh CVE Stored XSS yang dipublikasikan. Versi yang terinstal dikonfirmasi dari readme publik plugin.

### step 1 - confirm version from public metadata

```bash {label="bash"}
$ curl -s https://TARGET/wp-content/plugins/<slider-plugin>/readme.txt | grep -i "stable tag"
Stable tag: <affected-version>   # within CVE affected range; patch is the next point release
```

Versi dikonfirmasi dari readme publik plugin, kemudian dicocokkan dengan rentang yang terpengaruh CVE. Kode frontend yang memuat konten slider tidak menerapkan sanitasi output.

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

Endpoint XML-RPC aktif dan mengekspos `system.multicall` dan `pingback.ping`. Dalam konteks pasca-bypass anti-bot, ini memungkinkan enumerasi pengguna dan serangan brute-force teramplifikasi.

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

Form login sistem informasi akademik tidak memiliki perlindungan brute-force - tidak ada CAPTCHA, pembatasan laju, atau penguncian akun.

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

Platform ujian berbasis komputer mengekspos endpoint login admin dan endpoint login peserta, keduanya tanpa pembatasan percobaan.

Endpoint REST users WordPress mengembalikan pengguna terdaftar tanpa autentikasi, mengekspos username admin.

### A4 - Plugin/theme version disclosure [Low]

File metadata plugin dan tema (readme/style) dapat dibaca publik, mengungkapkan versi yang tepat dari komponen terpasang.

### A5 - Incomplete security headers [Low]

Halaman publik tidak memiliki HSTS, X-Content-Type-Options, dan Referrer-Policy. (Header ini bukan temuan berdiri sendiri tetapi dicatat sebagai peningkatan postur keamanan.)

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

## Kesimpulan {#conclusion}

Endpoint login portal akademik tidak memiliki pembatasan percobaan atau mekanisme CAPTCHA. Pengujian manual dengan kredensial yang salah secara berulang tidak memicu pemblokiran atau tantangan.

## Referensi {#refs}

- [CWE-79 - Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)
- [CWE-307 - Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [CWE-918 - Server-Side Request Forgery (SSRF)](https://cwe.mitre.org/data/definitions/918.html)
- [CWE-200 - Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)
- [CWE-693 - Protection Mechanism Failure](https://cwe.mitre.org/data/definitions/693.html)
- [OWASP A07:2021 - Identification & Authentication Failures](https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/)
- [OWASP WSTG-ATH-04 - Testing for Account Enumeration](https://owasp.org/www-project-web-security-testing-guide/)
- ISO/IEC 29147:2018 & 30111:2019 - Vulnerability disclosure & handling
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi