---
title: "Broken Access Control via LOV Sub-Endpoints"
date: "2026-09-16"
poc_num: "07"
target: "[REDACTED] - internal ERP (authorized assessment)"
category: "Web Application"
severity: "Medium"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Unauthorized read of staff identities and client list by a denied role - enables targeted phishing and internal OSINT."
status: "Proven"
---

Low-privilege account reads restricted employee and client PII through unguarded LOV sub-endpoints (BFLA). Parent endpoints return 403 but /lov and /tiers return 200 - Broken Function Level Authorization (CWE-285, OWASP A01:2021, API5:2023). Coordinated disclosure - target redacted.

<!-- Konten belum diterjemahkan - fallback ke EN -->
