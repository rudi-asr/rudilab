---
title: "Directory Listing / Information Disclosure"
date: "2026-04-28"
poc_num: "04"
kicker: "SECURITY RESEARCH CASE STUDY - Independent research · not a commissioned pentest"
capture: "poc-04.pcap"
capture_note: "public directory listing / information disclosure"
intro: "Sebuah direktori pada aplikasi web sektor publik tidak memiliki file index dan tidak ada pembatasan directory-browsing yang dikonfigurasi."
severity: "Low-Medium"
cwe: "CWE-548 - Exposure of Information Through Directory Listing"
cwe_secondary: "CWE-16 - Configuration"
owasp: "A05:2021 - Security Misconfiguration"
category: "Security Misconfiguration"
target: "[REDACTED] - public-sector web application"
test_date: "2026-04-28"
status: "CONFIRMED - UNREMEDIATED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Riset mandiri - tanpa keterlibatan berbayar dan tanpa surat otorisasi. Penemuan ini merupakan observasi pasif terhadap URL yang dapat diakses publik; path tidak memerlukan kredensial. Reproduksi (bagian 04) dilakukan di host lab di bawah kendali pribadi - tidak ada enumerasi atau pengambilan data yang dilakukan terhadap sistem yang dilaporkan di luar satu permintaan yang mengungkap listing tersebut. Operator telah diberitahu sebelum publikasi dan tidak diidentifikasi di sini."
---

## Ringkasan {#summary}

Sebuah direktori pada aplikasi web sektor publik tidak memiliki file index dan tidak ada pembatasan directory-browsing yang dikonfigurasi.

Sendiri ini adalah miskonfigurasi berkeparahan rendah. Bobot sebenarnya tergantung isi direktori: jika hanya berisi aset statis tanpa data sensitif, dampaknya minimal.

Kondisi ini dilaporkan ke operator melalui saluran kontak resmi mereka pada 2026-04-28 dan re-verifikasi dijadwalkan 90 hari kemudian. Lihat bagian Kronologi Pengungkapan untuk detailnya.

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Bukti | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | Medium | Directory Listing - Aplikasi Web Sektor Publik | Directory index dapat diakses di URL publik tanpa kredensial | CWE-548 / CWE-200 | Tidak diklaim - operator diberitahu |

## Status Otorisasi & Ruang Lingkup {#scope}

| | |
|---|---|
| **Authorization status** | Independent research - no commissioned engagement, no authorization letter |
| **Discovery method** | Passive observation of a publicly reachable URL |
| **Authentication bypassed** | NO - the path required no credentials |
| **Automated scanning** | NOT performed against the target |
| **Testing environment** | Production, read-only, single GET request |
| **Files downloaded** | NO |
| **Production data accessed** | NO |
| **Personal data accessed** | NO |
| **Data modified or destroyed** | NO |
| **Operator notified** | YES - 2026-04-28 |
| **Target identified here** | NO |

Reproduksi pada bagian 04 dilakukan di host lab di bawah kendali saya sendiri. Tidak ada eksploitasi, pencurian data, atau modifikasi yang dilakukan terhadap sistem target.

## Sistem yang Terdampak {#affected}

| | |
|---|---|
| **Organization** | redacted |
| **System** | Public-facing information system, government sector |
| **Endpoint** | `redacted/<path>/` |
| **Privilege required** | None |
| **Exposure** | Internet-facing, indexable by search engines |

Organisasi, hostname, dan path lengkap tidak diungkapkan. Studi kasus ini mendokumentasikan kelas kelemahan dan dampaknya, bukan target spesifik.

## Detail Teknis & Reproduksi {#repro}

Ketika web server menerima permintaan untuk direktori dan tidak menemukan file index, server akan mengembalikan error atau membuat daftar isi direktori. Perilaku terakhir ini - directory listing - mengekspos nama file kepada siapa saja.

### lab reproduction (host under my control)

Setiap entri dalam listing semacam ini adalah tautan unduhan langsung. Tidak diperlukan enumerasi, brute force, atau tool khusus.

## Dampak {#impact}

> IMPACT:: Impact
>
> **A. Structure disclosure.** Directory layout and naming conventions are revealed, shortening reconnaissance for follow-on attacks.
>
> **B. Retrievable artifacts.** Backup archives, database dumps, and .bak/.old files become directly downloadable when present.
>
> **C. Personal-data exposure.** Documents containing personal data in the listed directory would be publicly retrievable, engaging obligations under Indonesia's PDP Law (UU 27/2022).
>
> **D. Persistence after closure.** Listings are indexed and archived by third parties, so exposure can outlive the fix unless cache removal is requested.

> NOTCLAIMED:: Findings not claimed
>
> - Retrieval of sensitive files - not attempted, not proven.
> - Personal-data exposure - not verified, no files were opened.
> - Credential or configuration leakage - not verified.
> - Remote code execution or write access - no evidence, not tested.

## Penilaian Keparahan {#cvss}

Tingkat keparahan dinilai peneliti: satu GET tanpa autentikasi mengungkapkan direktori penuh beserta isinya.

## Akar Masalah {#rootcause}

Server menghasilkan indeks direktori saat tidak ada file index, dan direktori tersebut berisi file yang dapat diakses publik.

## Solusi & Rekomendasi {#fix}

### before - vulnerable pattern (Apache)

Konfirmasi juga bahwa file yang sebelumnya terdaftar tidak lagi dapat diambil secara langsung setelah directory listing dinonaktifkan.

## Kronologi Pengungkapan {#timeline}

| Date | Event |
|---|---|
| 2026-04-28 | Condition identified; report sent to the operator via its official channel, incl. affected path, technical description, and remediation steps |
| 2026-07-27 | 90-day coordinated disclosure window elapsed with no acknowledgement received |
| 2026-09-03 | Re-verified as unremediated |
| 2026-09-03 | Sanitized case study published; affected party not identified |

Jendela 90 hari mengikuti praktik industri umum (ISO/IEC 29147, CERT/CC CVD).

## Kesimpulan {#conclusion}

A publicly reachable directory on a government information system returns a full file index to unauthenticated visitors. The finding is low to medium in isolation, and its real severity depends on the contents of that directory, which were deliberately not examined. The remediation is a single configuration directive, supported by relocating non-public files out of the web root. The report was delivered through the operator's official channel more than four months before publication, and the condition persists. All observation was read-only - no files were downloaded, no data was modified, no authentication was bypassed, and no automated scanning was directed at the target.

## Referensi {#refs}

- [CWE-548 - Exposure of Information Through Directory Listing](https://cwe.mitre.org/data/definitions/548.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- ISO/IEC 29147:2018 - Vulnerability disclosure
- ISO/IEC 30111:2019 - Vulnerability handling processes
- CERT/CC Guide to Coordinated Vulnerability Disclosure
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi

### remediation guides for other web servers

The fix section above covers Apache, Nginx, and IIS. The guides below extend the same fix to stacks not addressed here, and are useful for administrators verifying their own environment.

| Source | Language | Servers covered |
|---|---|---|
| [Acunetix - Disabling Directory Listing](https://www.acunetix.com/blog/articles/disabling-directory-listing-web-server/) | English | Apache, Nginx, IIS, Tomcat, LiteSpeed, Lighttpd |
| [Tonjoo - Cara Disable Directory Listing](https://tonjoo.com/id/cara-disable-directory-listing/) | Bahasa Indonesia | Apache/XAMPP, Nginx, LiteSpeed, Lighttpd |

Third-party material, linked for convenience and not endorsed. Verify any configuration change against your own vendor documentation before applying it to a production system.