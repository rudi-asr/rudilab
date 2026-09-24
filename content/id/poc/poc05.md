---
title: "Missing Anti-Framing & Login Brute-Force Protection"
h1: "Missing Anti-Framing Headers & Absent Login Rate-Limiting"
date: "2026-09-03"
poc_num: "05"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-05.pcap"
capture_note: "missing anti-framing & login rate-limit"
intro: "Antarmuka login target tidak dilengkapi perlindungan framing sisi browser (tidak ada X-Frame-Options, tidak ada direktif Content-Security-Policy frame-ancestors)."
severity: "Medium"
cwe: "CWE-1021 - Improper Restriction of Rendered UI Layers"
cwe_secondary: "CWE-307 - Improper Restriction of Excessive Authentication Attempts"
owasp: "A05:2021 - Security Misconfiguration"
category: "Web Application"
target: "[REDACTED] - production web dashboard"
test_date: "2026-09-03"
status: "CONFIRMED - live execution"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Semua perintah dan output di bawah ini dieksekusi terhadap target live dengan otorisasi tertulis, dalam lingkup yang telah disepakati (tanpa denial-of-service, tanpa modifikasi data, tanpa kompromi kredensial). Host, nama produk, dan data pribadi apa pun disembunyikan untuk rilis publik. Ini adalah showcase metodologi yang telah disanitasi, bukan deliverable rahasia klien."
---

## Ringkasan {#summary}

Antarmuka login target tidak dilengkapi perlindungan framing sisi browser (tidak ada `X-Frame-Options`, tidak ada direktif `Content-Security-Policy frame-ancestors`).

Peninjauan sekunder terhadap bundle JavaScript publik menemukan logika sensitif dan penanganan PII yang seharusnya tidak terekspos di sisi klien.

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Bukti | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | Medium | Clickjacking - Header Framing Tidak Ada | Tidak ada `X-Frame-Options` / `CSP frame-ancestors` di halaman login | CWE-1021 | Tidak diklaim |
| F-02 | Medium | Tidak Ada Perlindungan Brute-force Login | Percobaan login tidak dibatasi; tidak ada rate-limit atau lockout | CWE-307 | Tidak diklaim |
| F-03 | Low | Sertifikat TLS Kedaluwarsa | Sertifikat kedaluwarsa; koneksi masih diterima | CWE-295 | Tidak diklaim |
| F-04 | Info | Versi Server Terekspos | Header Server + halaman error mengungkap versi software | CWE-200 | Tidak diklaim |
| F-05 | Low | Logika Sensitif & PII di Bundle Front-end | Logika bisnis & penanganan PII terlihat di bundle JS publik | CWE-922 | Tidak diklaim |

## Status Otorisasi & Ruang Lingkup {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - scope-strict, no-DoS |
| **Discovery method** | Black-box, external, actual command execution |
| **Authentication bypassed** | NO - no credentials compromised |
| **Testing environment** | Production, no data modification |
| **Evidence** | Actual command transcript - not reconstructed, not simulated |
| **Data modified or destroyed** | NO |
| **Target identified here** | NO |

## Ringkasan Temuan {#overview}

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Clickjacking - login page can be framed | Medium | PROVEN |
| 2 | No brute-force / rate-limit on login | Medium | PROVEN |
| 3 | Self-signed TLS certificate | Low | CONFIRMED |
| 4 | Server version disclosure | Info | CONFIRMED |
| + | Sensitive logic & PII in front-end bundle | Low | CONFIRMED |

## Finding 1 - Clickjacking via missing framing headers {#f1}

Keparahan: Medium - dinilai peneliti. Clickjacking mengharuskan korban berinteraksi dengan halaman; eksploitasi tidak trivial namun didokumentasikan dan layak diperbaiki pada halaman login.

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

Server mengembalikan 200 OK dengan header nginx default tanpa kontrol anti-framing. Browser memuat halaman login di dalam iframe penyerang tanpa peringatan.

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

Form login dirender sepenuhnya di dalam iframe penyerang. Penyerang dapat menempatkan UI palsu di atasnya untuk mengelabui pengguna agar memasukkan kredensial ke overlay yang terlihat sah.

> FIX:: Remediation
>
> Return `Content-Security-Policy: frame-ancestors 'none'` (or an explicit allow-list) and `X-Frame-Options: DENY` for legacy browsers on every response. Add `Strict-Transport-Security` and `X-Content-Type-Options: nosniff`.

## Finding 2 - No brute-force protection on login {#f2}

Keparahan: Medium - dinilai peneliti. Endpoint login tidak terautentikasi, tanpa pembatasan percobaan atau pembatasan laju, memungkinkan serangan brute-force tanpa hambatan teknis.

### step 1 - repeated failed logins, same source

Sertifikat TLS self-signed. Klien tidak dapat memvalidasi identitas server dan pengguna dikondisikan untuk mengabaikan peringatan sertifikat.

Pengungkapan versi server. Header Server, halaman error, dan banner SSH mengekspos versi komponen yang tepat.

## Finding + - Sensitive logic & PII in the front-end bundle {#fplus}

Sumber: bundle JavaScript aplikasi dapat diunduh tanpa autentikasi. Tinjauan statis mengungkapkan nama fungsi sensitif, endpoint API internal, dan logika penanganan data.

### a - role logic enforced client-side

Role names and access hierarchy (including a role that bypasses all client-side guards) are implemented in the bundle. Any visitor can read the full role model, and client-side role checks can be bypassed by editing local state. Authorization must be enforced server-side on every privileged route.

### b - PII passed through URL query parameters

Record detail views pass debtor PII - name, address, GPS coordinates - as URL query parameters, which land in server access logs, browser history, and the Referer header.

Profil terautentikasi, termasuk peran, disimpan di localStorage tempat ia dapat dibaca oleh kode JavaScript pada origin yang sama.

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

## Kesimpulan {#conclusion}

Dua temuan Medium - clickjacking via header framing yang hilang dan endpoint login yang tidak dibatasi - keduanya dapat diperbaiki melalui konfigurasi header keamanan nginx tanpa perubahan kode aplikasi.

## Referensi {#refs}

- [CWE-1021 - Improper Restriction of Rendered UI Layers (Clickjacking)](https://cwe.mitre.org/data/definitions/1021.html)
- [CWE-307 - Improper Restriction of Excessive Authentication Attempts](https://cwe.mitre.org/data/definitions/307.html)
- [CWE-598 - Use of GET Request With Sensitive Query Strings](https://cwe.mitre.org/data/definitions/598.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)