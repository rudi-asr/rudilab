---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
target: "Web application (redacted)"
category: "Broken Access Control"
severity: "Medium"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Unauthorized visibility of organization members, roles, and existing research batch metadata."
status: "Proven"
---

Akun dengan hak akses rendah dapat membaca data PII karyawan dan klien yang dibatasi melalui endpoint API yang tidak diproteksi dengan benar.

## Gambaran Umum

Kerentanan Broken Access Control memungkinkan akun yang sudah terautentikasi namun bereisiko rendah untuk mengakses data yang seharusnya hanya dapat diakses oleh peran yang lebih tinggi.

<!-- Terjemahkan konten lengkap dari content/en/poc/poc01.md -->

