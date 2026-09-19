---
title: "Broken Access Control via LOV Sub-Endpoints"
date: "2026-09-16"
poc_num: "07"
target: "[REDACTED] - internal ERP (authorized assessment)"
category: "Web Application"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Unauthorized read of staff identities and client list by a denied role - enables targeted phishing and internal OSINT."
remediation: "Enforce authorization at router/resource level so every sub-path inherits the guard; return only minimum lookup fields (id + label, no PII); add regression tests for all sub-endpoints."
status: "Proven"
drive_link: ""
---

Low-privilege account reads restricted employee and client PII through unguarded LOV sub-endpoints (BFLA). Parent endpoints return 403 but /lov and /tiers return 200 - Broken Function Level Authorization (CWE-285, OWASP A01:2021, API5:2023). Coordinated disclosure - target redacted.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc07.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
