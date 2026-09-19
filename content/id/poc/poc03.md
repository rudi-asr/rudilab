---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
target: "Web application (redacted)"
category: "Security Misconfiguration"
severity: "High"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Full API access bypassing nginx controls, potential database credential brute-force, object storage exposure, and bulk PII retrieval with valid credentials."
status: "Proven"
---

All backend services (API, object storage, and database) were directly reachable from the public internet, allowing nginx proxy controls to be bypassed entirely. PostgreSQL on a non-standard port was reachable via TCP from external networks.

<!-- Konten belum diterjemahkan - fallback ke EN -->
