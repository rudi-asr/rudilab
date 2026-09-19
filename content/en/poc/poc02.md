---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
target: "Web application (redacted)"
category: "Cryptographic Failures"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Potential credential interception, session hijacking, and in-transit data modification by an on-path attacker."
remediation: "Renew TLS certificate with correct CN/SAN, enable Certbot auto-renewal, and implement HSTS."
status: "Proven"
drive_link: ""
---

The target's TLS certificate had expired and contained a hostname mismatch, eliminating transport encryption and enabling potential Man-in-the-Middle attacks against authenticated users.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc02.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
