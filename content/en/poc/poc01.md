---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
target: "Web application (redacted)"
category: "Broken Access Control"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Unauthorized visibility of organization members, roles, and existing research batch metadata."
remediation: "Apply authorization checks and scope database queries to the authenticated user's organization and permissions."
status: "Proven"
drive_link: ""
---

A newly registered low-privilege SDR account could view organization member records and existing research batches due to insufficient authorization checks.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc01.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
