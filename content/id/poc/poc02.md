---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-02.pcap"
capture_note: "expired TLS certificate & hostname mismatch"
severity: "Medium"
cwe: "CWE-295 - Improper Certificate Validation"
category: "Cryptography / Transport"
owasp: "A02:2021 - Cryptographic Failures"
target: "[REDACTED] - web application"
test_date: "2026-08-29"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Pengujian dilakukan secara black-box dari jaringan eksternal, bersifat read-only dan non-destruktif; temuan ini dapat diverifikasi secara publik dan tidak memerlukan kredensial. Detail host dan stack disembunyikan untuk rilis publik. Ini adalah showcase yang telah disanitasi, bukan laporan rahasia."
---

## Ringkasan {#summary}

Sertifikat TLS target telah kedaluwarsa sebelum tanggal pengujian, dan Common Name (CN)-nya tidak cocok dengan hostname yang dilayani. Browser modern dan klien HTTP menampilkan peringatan keamanan.

Fingerprint stack: nginx + PHP (versi disembunyikan), diidentifikasi dari header respons HTTP.

> NOTCLAIMED:: Note on severity
>
> This finding is rated **Medium**, not Critical. Exploitation requires an attacker already in an on-path position (AC:High) and a user who dismisses the browser warning (UI:Required). Rating a warning-gated, position-dependent TLS issue as Critical would overstate real-world risk.

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Bukti | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | Low-Medium | Sertifikat TLS - Kedaluwarsa & CN Tidak Cocok | Sertifikat kedaluwarsa; CN tidak sesuai hostname | CWE-295 / CWE-297 | Tidak diklaim |

## Status Otorisasi & Ruang Lingkup {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - black-box, external |
| **Discovery method** | Unauthenticated TLS inspection of a public endpoint |
| **Authentication bypassed** | NO - no credentials required |
| **Automated scanning** | Limited - curl, openssl, single nmap ssl-cert script |
| **Testing environment** | Production, read-only, non-destructive |
| **Data accessed / modified** | NO |
| **Target identified here** | NO |

## Prasyarat {#pre}

- Black-box testing from an external network, no authentication.
- No account or credentials required - the finding is publicly verifiable.
- Tools: `curl`, `openssl s_client`, Nmap ssl-cert script.
- All testing read-only and non-destructive.

## PoC 1 - TLS verification via curl {#poc1}

*Tujuan:* menunjukkan bahwa sertifikat tidak valid dan menyebabkan kesalahan verifikasi.

```bash {label="bash"}
$ curl -vI https://TARGET 2>&1 | grep -E "expire|CN=|subject|SSL|certificate"
* SSL certificate problem: certificate has expired
* SSL certificate problem: hostname mismatch
curl: (60) SSL certificate problem: certificate has expired
```

curl menolak koneksi karena sertifikat kedaluwarsa. Tanggal kedaluwarsa dikonfirmasi telah lewat sebelum tanggal pengujian. Browser modern menampilkan peringatan "Koneksi Anda tidak pribadi".

## PoC 2 - Certificate detail via OpenSSL {#poc2}

*Tujuan:* mengekstrak detail sertifikat untuk mengkonfirmasi tanggal kedaluwarsa dan ketidakcocokan hostname.

```bash {label="bash"}
$ echo | openssl s_client -connect TARGET:443 -servername TARGET 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates
subject=CN = <redacted>
issuer=C = US, O = Let's Encrypt, CN = R3
notBefore=<redacted>  notAfter=<redacted>  [EXPIRED]
```

CN sertifikat tidak mencakup domain target; CN/SAN yang terdaftar milik domain lain. Ini menyebabkan peringatan "nama host tidak cocok" di semua klien TLS yang ketat.

## PoC 3 - SSL audit via Nmap {#poc3}

Tujuan: mengkonfirmasi temuan dengan alat independen.

Script ssl-cert Nmap mengkonfirmasi sertifikat telah melewati tanggal 'Not valid after', konsisten dengan output curl.

## Impact & Attack Scenario {#impact}

Dengan sertifikat yang tidak valid, penyerang yang berada di jalur (misalnya jaringan bersama, poisoning ARP) dapat menyajikan sertifikat penipu tanpa risiko pengguna mendeteksi anomali.

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

## Penilaian Keparahan {#cvss}

Severity is researcher-assessed based on the observed conditions: exploitation requires an on-path (MITM) position and the victim dismissing a browser certificate warning, and any exposure is warning-gated. This places the finding in the Medium band - rescored from an earlier Critical rating; the accurate rating is what a triager expects for a warning-gated, position-dependent TLS finding.

## Akar Masalah {#rootcause}

No auto-renewal mechanism and no proactive expiry monitoring for TLS certificates. Let's Encrypt certificates are valid for 90 days and must be renewed on schedule. The hostname mismatch indicates the installed certificate was issued for a different domain or subdomain - most likely a deployment misconfiguration.

## Solusi & Rekomendasi {#fix}

### renew & auto-renew

Sertifikat kedaluwarsa dikombinasikan dengan ketidakcocokan hostname menghilangkan jaminan yang diberikan TLS: kerahasiaan (melalui MITM), integritas, dan keaslian server.

## Referensi {#refs}

- [CWE-295 - Improper Certificate Validation](https://cwe.mitre.org/data/definitions/295.html)
- [OWASP A02:2021 - Cryptographic Failures](https://owasp.org/Top10/A02_2021-Cryptographic_Failures/)