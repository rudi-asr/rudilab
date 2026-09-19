---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
target: "Web application (redacted)"
category: "Cryptographic Failures"
severity: "Medium"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Potential credential interception, session hijacking, and in-transit data modification by an on-path attacker."
status: "Proven"
---

Pendaftaran publik membuat akun aktif dan mengembalikan token autentikasi tanpa verifikasi atau persetujuan lebih lanjut.

## Gambaran Umum

Tidak ada mekanisme verifikasi setelah pendaftaran, memungkinkan siapa saja mendaftarkan akun dan langsung mendapat akses.

<!-- Terjemahkan konten lengkap dari content/en/poc/poc02.md -->

