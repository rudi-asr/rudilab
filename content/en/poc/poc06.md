---
title: "WordPress Institutional Site & Academic Portal Assessment"
date: "2026-09-06"
poc_num: "06"
target: "[REDACTED] - Indonesian higher-education institution (WordPress + academic portals)"
category: "Web Application"
severity: "Medium (highest) - 9 findings"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Brute-force amplification via XML-RPC, credential exposure on unthrottled academic portals, XSS via outdated plugin, reconnaissance-grade information disclosure."
remediation: "Disable XML-RPC; update vulnerable plugin; add CAPTCHA and rate-limiting on all login forms; restrict user enumeration endpoints; add missing security headers."
status: "Proven"
drive_link: ""
---

WordPress-based higher-education institution site and two academic portals (SIAKAD/CBT) assessed for security weaknesses. Nine findings: 4 Medium (XSS-vulnerable plugin, open XML-RPC, unthrottled SIAKAD & CBT logins), 3 Low, 2 Info. Coordinated disclosure - target redacted.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc06.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
