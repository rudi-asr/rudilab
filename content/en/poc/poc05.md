---
title: "Missing Anti-Framing & Login Brute-Force Protection"
date: "2026-09-03"
poc_num: "05"
target: "[REDACTED] - production web dashboard (financial-collections app)"
category: "Web Application"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Clickjacking attack surface and credential brute-force window against production login interface."
remediation: "Add X-Frame-Options / CSP frame-ancestors header; implement server-side login rate-limiting and account lockout."
status: "Proven"
drive_link: ""
---

Clickjacking via missing framing headers and absent login rate-limiting on a production web dashboard (financial-collections app).

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc05.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
