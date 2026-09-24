---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
kicker: "PENETRATION TEST FINDINGS REPORT - Bug Bounty / Authorized Testing"
capture: "poc-03.pcap"
capture_note: "backend services reachable from the public internet"
intro: "Semua layanan backend target - server API, object storage (kompatibel S3), dan database - dapat dijangkau langsung dari internet tanpa autentikasi."
severity: "High"
cwe: "CWE-668 - Exposure of Resource to Wrong Sphere"
category: "Security Misconfiguration - Network Exposure"
owasp: "A05:2021 - Security Misconfiguration"
target: "[REDACTED] - web application stack"
test_date: "[REDACTED]"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Diuji dalam program bug-bounty - ketat ruang lingkup, non-destruktif, tanpa DoS. Hanya akses eksternal; akun terautentikasi dengan hak akses rendah digunakan untuk pemeriksaan lapisan API. Tidak ada brute-force, tidak ada modifikasi data, tidak ada operasi destruktif. Host, port, nama produk, dan PII disembunyikan untuk rilis publik."
---

## Ringkasan {#summary}

Semua layanan backend target - server API, object storage (kompatibel S3), dan database - dapat dijangkau langsung dari internet tanpa autentikasi.

Reverse proxy tidak berfungsi sebagai batas keamanan: meskipun nginx mengembalikan 502 Bad Gateway, backend masih dapat dijangkau melalui port aslinya.

Fingerprint stack: frontend Vue.js · backend FastAPI/Uvicorn · object storage MinIO · PostgreSQL - disimpulkan dari header respons HTTP dan dokumen OpenAPI publik.

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Bukti | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | High | Backend API Terekspos - Akses Langsung / Bypass nginx | Backend dapat dijangkau via port langsung; nginx 502 tapi API 200 | CWE-668 / CWE-284 | Tidak diklaim |
| F-02 | High | Object Storage Terekspos (MinIO) | Endpoint MinIO dapat dijangkau dari internet | CWE-668 | Tidak diklaim |
| F-03 | High | Database Terekspos (PostgreSQL) | Port `psql` dapat dijangkau dari internet publik | CWE-668 | Tidak diklaim |
| F-04 | Medium | Dokumentasi OpenAPI / Swagger Publik | Skema API lengkap dapat diakses tanpa autentikasi | CWE-200 | Tidak diklaim |

## Status Otorisasi & Ruang Lingkup {#scope}

| | |
|---|---|
| **Authorization status** | Authorized under a bug-bounty program - scope-strict |
| **Discovery method** | External port scan + authenticated API requests |
| **Privilege used** | Low-privilege (BRANCH role) account for API-layer checks |
| **Automated scanning** | Connectivity checks only (nmap, nc, curl) - no exploitation |
| **Brute-force** | NOT performed |
| **Data modified or destroyed** | NO - all write operations returned 403 |
| **Target identified here** | NO |

## PoC 1 - Port exposure verification {#poc1}

*Tujuan:* menunjukkan bahwa port layanan backend dapat dijangkau dari internet publik.

Semua empat port backend dapat dijangkau dari luar. Port database adalah yang paling kritis - akses data langsung tanpa autentikasi.

## PoC 2 - API direct access & nginx bypass {#poc2}

*Tujuan:* menunjukkan bahwa API backend dapat dijangkau langsung, melewati nginx dan kontrol yang diterapkannya.

```bash {label="bash"}
# nginx frontend is down:
$ curl -sk https://TARGET:<APP>/api/v1/auth/login
502 Bad Gateway

# backend answers directly on its native port:
$ curl -s http://TARGET:<API>/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"[REDACTED]","password":"[REDACTED]"}'
HTTP/1.1 200 OK
{ "access_token": "<redacted>", "token_type": "bearer", "role": "BRANCH" }
```

nginx mengembalikan 502, namun backend menerima login dan menerbitkan JWT yang valid secara langsung. Pemfilteran IP apapun yang dikonfigurasi di nginx tidak berlaku untuk koneksi langsung ke port backend.

## PoC 3 - Public API documentation & schema {#poc3}

```bash {label="bash"}
$ curl -s http://TARGET:<API>/docs           # Swagger UI
$ curl -s http://TARGET:<API>/redoc          # ReDoc
$ curl -s http://TARGET:<API>/openapi.json | wc -c
200  OK   (Swagger UI)
200  OK   (ReDoc)
50626     (full schema bytes)
```

Kontrak API lengkap - semua endpoint, model request/response, parameter - tersedia bagi siapa saja tanpa autentikasi melalui dokumen OpenAPI/Swagger publik.

## PoC 4 - MinIO health endpoints accessible {#poc4}

Akses anonim ke endpoint health mengkonfirmasi layanan object storage dan statusnya. Daftar bucket mengembalikan nama container penyimpanan internal.

## PoC 5 - PostgreSQL port reachable from internet {#poc5}

TCP handshake PostgreSQL berhasil dari internet eksternal. Penyerang dapat mencoba akses database langsung jika memiliki atau menebak kredensial.

## Additional Findings (same scope) {#addl}

| ID | Finding | Severity | Status |
|---|---|---|---|
| F-1 | Public API docs without auth (/docs, /openapi.json) | Medium | Confirmed |
| F-2 | No login rate limiting - 20 requests, zero 429s | Medium | Confirmed |
| F-3 | MinIO health endpoints anonymous | Low | Confirmed |
| F-4 | Self-signed TLS certificate | Low | Confirmed |
| F-5 | Security headers missing (HSTS, XFO, CSP, ...) | Low | Confirmed |
| F-6 | Potential BOLA on /download - cross-branch unverified | Medium* | Unverified |
| F-7 | Debtor PII (name, address, GPS) in bulk, unmasked | Medium | Confirmed |
| E-1 | Change-password IDOR - blocked (403) | - | Blocked |
| E-2 | Role-parameter priv-esc - blocked (403) | - | Blocked |

F-7 raised from Low-Medium to Medium: financial-collections PII (name, address, GPS) carries elevated weight under Indonesia's PDP Law (UU 27/2022).

## Tested and found safe {#safe}

| Vector | Result |
|---|---|
| SQL injection (all tested endpoints) | SAFE - 401, parameterized queries confirmed |
| CORS arbitrary origin | SAFE - no ACAO:* triggered |
| Anonymous MinIO bucket listing | SAFE - 403 AccessDenied |
| Path traversal | SAFE - no vulnerable endpoint |
| Error / stack-trace leakage | SAFE - 422 structured error, no traceback |
| TLS 1.0 / 1.1 | SAFE - legacy protocols rejected |
| Open self-registration | SAFE - no public registration endpoint |
| IDOR change-password (E-1) | SAFE - 403 |
| Priv-esc via role parameter (E-2) | SAFE - 403 on all variants |
| DELETE by low-privilege role | SAFE - all 403 |

## Dampak {#impact}

> IMPACT:: Impact
>
> **A. Database direct access (highest risk).** Direct PostgreSQL auth attempts from the internet; weak or default credentials would allow a full dump without touching the API, WAF, or nginx.
>
> **B. API nginx bypass.** Any IP allowlist, WAF rule, or rate limit at the nginx layer is ineffective - all endpoints are reachable directly.
>
> **C. Object storage exposure.** Misconfigured ACLs or compromised credentials would expose stored audio recordings via the S3 API.
>
> **D. Credential-leak scenario.** A leaked low-privilege credential (e.g. a former employee) allows normal login on the backend port, bulk PII retrieval, and download of accessible recordings - no exploit required.

> NOTCLAIMED:: Findings not claimed
>
> - Successful database credential brute-force - not attempted.
> - MinIO bucket data access - bucket listing returned 403, not proven exploitable.
> - Cross-branch BOLA (F-6) - not confirmed (single branch active at test time).
> - Any data modification or deletion - all write operations returned 403.

## Penilaian Keparahan {#cvss}

Tingkat keparahan dinilai peneliti berdasarkan kondisi yang diamati: layanan yang terekspos dapat dijangkau dari internet tanpa autentikasi.

## Akar Masalah {#rootcause}

All backend services bind to `0.0.0.0` (all interfaces) instead of `127.0.0.1` (loopback), so every service is reachable on the public-facing interface with no firewall or security-group restriction. The nginx reverse proxy was deployed as a routing layer, not a security boundary, and no host-level or cloud firewall rules restrict the backend ports.

## Solusi & Rekomendasi {#fix}

### bind services to loopback

Batas autentikasi dan otorisasi-tulis aplikasi sudah kokoh - tidak ada bypass autentikasi atau penulisan yang tidak terotorisasi yang ditemukan. Keterpaparan hanya mempengaruhi endpoint baca yang tidak terlindungi.

## Referensi {#refs}

- [CWE-668 - Exposure of Resource to Wrong Sphere](https://cwe.mitre.org/data/definitions/668.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi