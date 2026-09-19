---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
target: "Web application (redacted)"
category: "Security Misconfiguration"
severity: "High"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Full API access bypassing nginx controls, potential database credential brute-force, object storage exposure, and bulk PII retrieval with valid credentials."
remediation: "Bind all backend services to 127.0.0.1 and enforce firewall/security group rules to block backend ports from the public internet."
status: "Proven"
drive_link: ""
---

All backend services (API, object storage, and database) were directly reachable from the public internet, allowing nginx proxy controls to be bypassed entirely. PostgreSQL on a non-standard port was reachable via TCP from external networks.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc03.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
