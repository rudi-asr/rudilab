---
title: "Directory Listing / Information Disclosure"
date: "2026-04-28"
poc_num: "04"
target: "Web application - government sector (redacted)"
category: "Security Misconfiguration"
severity: "Low-Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Exposure of file names, directory structure, and potentially sensitive documents to anyone with the URL."
remediation: "Disable directory listing (Options -Indexes in Apache / autoindex off in Nginx) and remove or relocate sensitive files from the web root."
status: "Proven"
drive_link: ""
---

A directory on a public-sector web application had no index file and no directory-browsing restriction, returning a full file listing to unauthenticated users. Reported via official contact channel on 2026-04-28; unremediated at time of publication.

<!-- 
  TODO: Paste your full PoC write-up in Markdown below.
  You can copy from poc/poc04.html and convert to Markdown,
  or write fresh content here.
  
  Suggested sections:
  ## Overview
  ## Technical Details
  ## Proof of Concept
  ## Impact
  ## Remediation
  ## Disclosure Timeline
-->
