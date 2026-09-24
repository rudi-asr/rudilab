---
title: "Broken Access Control via LOV Sub-Endpoints"
date: "2026-09-16"
poc_num: "07"
kicker: "SECURITY RESEARCH CASE STUDY - Authorized assessment · coordinated disclosure"
capture: "poc-07.pcap"
capture_note: "authz bypass via LOV sub-endpoints"
intro: "Akun terautentikasi dengan hak akses rendah dapat membaca data karyawan dan klien yang dibatasi melalui sub-endpoint List-of-Values (LOV) yang tidak dicakup kontrol akses tingkat menu aplikasi."
severity: "Medium"
cwe: "CWE-862 - Missing Authorization"
cwe_secondary: "CWE-200 - Exposure of Sensitive Information"
owasp: "A01:2021 - Broken Access Control / API5:2023 - BFLA"
category: "Web Application / API Authorization"
test_date: "2026-09-16"
target: "[REDACTED] - internal ERP"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Pengujian dilakukan dalam asesmen yang diotorisasi dengan ruang lingkup yang dikonfirmasi oleh pemilik. Tidak ada akun yang dikompromikan, tidak ada data yang dieksfiltrasi, dan batas rate limit dihormati. Perbaikan diterapkan oleh pemilik sebelum write-up yang telah disanitasi ini dipublikasikan dengan persetujuan. Target dan semua data disembunyikan - organisasi tidak diidentifikasi dalam dokumen ini."
---

## Ringkasan {#summary}

Aplikasi menerapkan akses berdasarkan izin menu (misalnya, sebuah peran dapat memiliki `master.employee.view` tetapi tidak `master.client.view`). Namun, endpoint LOV yang mendukung menu tersebut tidak diperiksa secara individual - sesi terautentikasi apapun dapat mengakses semua entri LOV terlepas dari perannya.

Namun, beberapa sub-endpoint LOV (List-of-Values) - pencarian ringan yang digunakan untuk mengisi dropdown menu - tidak dicakup oleh pemeriksaan izin menu. Endpoint ini mengembalikan data penuh terlepas dari peran pemanggil.

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Endpoint Terdampak | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | Medium | Broken Function Level Authorization | `/employees/lov`, `/clients/lov`, `/clients/tiers` | CWE-862 / CWE-200 | Diperbaiki - per pemilik |

## Prasyarat {#preconditions}

- Satu akun terautentikasi dengan hak akses rendah yang diperoleh secara sah.
- Peran akun tidak memiliki menu untuk resource yang dituju (misal `master.employee`).
- Sub-endpoint LOV dapat dijangkau (mendukung dropdown di front-end).

## Langkah-langkah PoC {#poc}

1. Autentikasi sebagai pengguna hak akses rendah dan dapatkan `accessToken` yang valid.
2. Konfirmasi resource induk ditolak dengan benar: `GET /employees` → `403 Forbidden`.
3. Panggil sub-endpoint LOV dengan token yang sama: `GET /employees/lov`.
4. Amati `200 OK` yang mengembalikan daftar identitas (nama, email, jabatan).
5. Ulangi untuk resource terkait: `GET /clients/lov`, `GET /clients/tiers` → `200 OK`.
6. Konfirmasi akses tingkat record masih dibatasi: `GET /employees/{id}` → `403` (benar).

Transkrip yang disanitasi (identitas dan target dihapus):

```http {label="http"}
# parent resources - correctly blocked
GET /employees   → 403 Forbidden  # (menu master.employee)
GET /clients     → 403 Forbidden  # (menu master.client)

# LOV sub-endpoints - authorization bypass
GET /employees/lov → 200 OK
  [ { "id":"[REDACTED]", "name":"[REDACTED]",
      "email":"[REDACTED]", "position":"[REDACTED]" }, ... ]
GET /clients/lov   → 200 OK
  [ { "code":"[REDACTED]", "name":"[REDACTED]" }, ... ]
GET /clients/tiers → 200 OK

# record-level - correctly blocked (positive control)
GET /employees/{id} → 403 Forbidden
GET /clients/{id}   → 403 Forbidden
```

Semua nilai pengenal (host target, nama staf, email, nama klien) telah disembunyikan. Hanya metode HTTP, endpoint, dan struktur respons yang dipertahankan.

## Dampak {#impact}

Pengungkapan PII internal (nama staf, email, jabatan) dan daftar entitas bisnis ke peran yang seharusnya tidak memiliki akses tersebut. Dalam lingkungan yang diatur, ini dapat memicu kewajiban pelaporan pelanggaran data.

> IMPACT:: Dampak
>
> Pembacaan tidak sah atas identitas staf dan data klien oleh peran yang seharusnya ditolak; memungkinkan phishing dan OSINT terhadap organisasi. Tidak ada dampak terhadap integritas atau ketersediaan yang teramati.

## Akar Masalah {#rootcause}

Otorisasi diterapkan per-endpoint, secara manual, dan hanya terhubung ke handler resource induk. Sub-path (endpoint LOV) melewati pemeriksaan ini.

## Solusi {#solution}

Terapkan otorisasi di level router/resource agar berlaku untuk setiap sub-path, dan kembalikan 403 jika sesi yang membuat permintaan tidak memiliki izin untuk resource yang diminta.

```js {label="before - vulnerable"}
// guard only on the parent; sub-routes slip through
router.get('/employees',       requireMenu('master.employee'), listEmployees)
router.get('/employees/lov',   listEmployeesLov)   // no guard → 200 leak
router.get('/clients/lov',     listClientsLov)     // no guard → 200 leak

// LOV returns full records, including PII
return rows.map(e => ({ id:e.id, name:e.name, email:e.email, position:e.position }))
```

```js {label="after - fixed"}
// guard at router level → covers parent + /lov + /tiers
const employees = Router()
employees.use(requireMenu('master.employee'))
employees.get('/',    listEmployees)
employees.get('/lov', listEmployeesLov)
// idem: clients → requireMenu('master.client')

// least-privilege lookup: id + label only, no PII
return rows.map(e => ({ id:e.id, label:e.name }))
```

> FIX:: Remediasi
>
> Framework yang ditampilkan bersifat ilustratif - terapkan guard setara di stack Anda. Tambahkan regression test: peran tanpa menu harus menerima 403 pada resource induk *dan* setiap sub-endpoint (`/lov`, `/tiers`).

## Kronologi Pengungkapan {#disclosure}

- **Hari 0** - Temuan diidentifikasi selama asesmen yang diotorisasi; dilaporkan kepada pemilik sistem.
- **Terkoordinasi** - Berdasarkan komunikasi dengan pemilik, perbaikan telah diterapkan (guard otorisasi diperluas ke sub-endpoint dan payload LOV diminimalkan); tidak diverifikasi ulang secara independen oleh peneliti.
- **Publikasi** - Write-up yang telah disanitasi ini dipublikasikan dengan persetujuan pemilik. Target dan semua data disembunyikan.

## Referensi {#refs}

- [OWASP Top 10 - A01 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [OWASP API Security - API5:2023 Broken Function Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [CWE-285 - Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
- [CWE-200 - Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)