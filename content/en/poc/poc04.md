---
title: "Directory Listing / Information Disclosure"
date: "2026-04-28"
poc_num: "04"
kicker: "SECURITY RESEARCH CASE STUDY - Independent research · not a commissioned pentest"
capture: "poc-04.pcap"
capture_note: "public directory listing / information disclosure"
intro: "A directory served by a public-sector web application had no index file and no directory-browsing restriction. Requesting the path returned a generated listing of every file inside it, readable by anyone with the URL and without credentials."
severity: "Low-Medium"
cwe: "CWE-548 - Exposure of Information Through Directory Listing"
cwe_secondary: "CWE-16 - Configuration"
owasp: "A05:2021 - Security Misconfiguration"
category: "Security Misconfiguration"
target: "[REDACTED] - public-sector web application"
test_date: "2026-04-28"
status: "CONFIRMED - UNREMEDIATED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Independent research - no commissioned engagement and no authorization letter. Discovery was passive observation of a publicly reachable URL; the path required no credentials. Reproduction (section 04) was performed on a lab host under my own control - no enumeration or retrieval was carried out against the reported system beyond the single request that revealed the listing. The operator was notified before publication and is not identified here."
---

## Summary {#summary}

A directory served by a public-sector web application had no index file and no directory-browsing restriction. Requesting the path returned a generated listing of every file inside it, readable by anyone with the URL and without credentials.

Alone this is a low-severity misconfiguration. Its real weight depends on what the directory holds: in practice these listings surface database dumps, backup archives, scanned documents, and configuration files placed under the web root for convenience and never intended for public access.

The condition was reported to the operator through its official contact channel on 2026-04-28 and remained unremediated at the time of publication.

## Risk Map {#riskmap}

| ID | Severity | Class | Evidence | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | Medium | Directory Listing - Public Sector Web App | Directory index accessible at publicly reachable URL without credentials | CWE-548 / CWE-200 | Not claimed - operator notified |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Independent research - no commissioned engagement, no authorization letter |
| **Discovery method** | Passive observation of a publicly reachable URL |
| **Authentication bypassed** | NO - the path required no credentials |
| **Automated scanning** | NOT performed against the target |
| **Testing environment** | Production, read-only, single GET request |
| **Files downloaded** | NO |
| **Production data accessed** | NO |
| **Personal data accessed** | NO |
| **Data modified or destroyed** | NO |
| **Operator notified** | YES - 2026-04-28 |
| **Target identified here** | NO |

Reproduction in section 04 was performed on a lab host under my own control. No exploitation, enumeration, or retrieval was carried out against the reported system beyond the single request that revealed the listing.

## Affected System {#affected}

| | |
|---|---|
| **Organization** | redacted |
| **System** | Public-facing information system, government sector |
| **Endpoint** | `redacted/<path>/` |
| **Privilege required** | None |
| **Exposure** | Internet-facing, indexable by search engines |

Organization, hostname, and full path are withheld. This case study documents the weakness class and its remediation; it is not intended to direct traffic toward a system that is still open.

## Technical Detail & Reproduction {#repro}

When a web server receives a request for a directory and finds no index file, it either returns an error or generates a listing of the directory contents. The second behaviour is useful during development and is enabled by default in several stacks. Left on in production, every unprotected folder becomes a browsable file manager.

### lab reproduction (host under my control)

```bash {label="bash"}
$ curl -s -o /dev/null -w "%{http_code}\n" https://lab.local/uploads/
200
$ curl -s https://lab.local/uploads/ | grep -i "index of"
<h1>Index of /uploads/</h1>
```

### representative response (synthetic - no real filenames)

```html {label="html"}
<h1>Index of /uploads/</h1><hr><pre><a href="../">../</a>
<a href="arsip-2024.zip">arsip-2024.zip</a>      12-Jan-2024 09:14  48M
<a href="config.bak">config.bak</a>              03-Mar-2024 22:01  14K
<a href="daftar-peserta.xlsx">daftar-peserta.xlsx</a> 17-Jun-2024 11:48 212K
<a href="dump.sql">dump.sql</a>                  17-Jun-2024 11:52  96M
</pre><hr>
```

Every entry in a listing of this kind is a direct download link. No enumeration, brute force, or tooling is required to obtain the files, and search engines crawl and cache these pages - so exposure is not limited to whoever knows the URL.

## Impact {#impact}

> IMPACT:: Impact
>
> **A. Structure disclosure.** Directory layout and naming conventions are revealed, shortening reconnaissance for follow-on attacks.
>
> **B. Retrievable artifacts.** Backup archives, database dumps, and .bak/.old files become directly downloadable when present.
>
> **C. Personal-data exposure.** Documents containing personal data in the listed directory would be publicly retrievable, engaging obligations under Indonesia's PDP Law (UU 27/2022).
>
> **D. Persistence after closure.** Listings are indexed and archived by third parties, so exposure can outlive the fix unless cache removal is requested.

> NOTCLAIMED:: Findings not claimed
>
> - Retrieval of sensitive files - not attempted, not proven.
> - Personal-data exposure - not verified, no files were opened.
> - Credential or configuration leakage - not verified.
> - Remote code execution or write access - no evidence, not tested.

## Severity Assessment {#cvss}

Severity is researcher-assessed based on the observed conditions: a single unauthenticated GET discloses the file inventory, with no write or modification path observed. The rating is deliberately conservative at low-to-medium because no listed file was opened - if the directory contains backups, dumps, or personal data, the confidentiality impact would be significantly higher.

## Root Cause {#rootcause}

The server generates a directory index when no index file is present, and the directory in question is served from within the public web root. Two independent mistakes overlap: directory browsing was never disabled, and files not meant to be public were stored somewhere publicly served. Disabling the listing addresses the symptom; relocating non-public files out of the web root addresses the cause. Both are needed.

## Solution & Recommendations {#fix}

### before - vulnerable pattern (Apache)

```apache {label="apache"}
<Directory /var/www/html>
    Options Indexes FollowSymLinks
</Directory>
```

### after - secure pattern (Apache)

```apache {label="apache"}
<Directory /var/www/html>
    Options -Indexes +FollowSymLinks
</Directory>
```

### nginx

```nginx {label="nginx"}
location / { autoindex off; }
location ~* \.(bak|old|sql|zip|tar\.gz)$ { deny all; }
```

> FIX:: Supporting controls
>
> - Place an index.html in every served directory as a second line of defence.
> - Move backups, dumps, and archives entirely outside the web root.
> - Re-verify after every deployment - container rebuilds routinely reintroduce this setting.
> - Request cache removal from search engines for any listing already indexed.
> - Review sibling directories on the same host; this misconfiguration is rarely isolated.

### Microsoft IIS

```cmd {label="cmd"}
> appcmd set config /section:directoryBrowse /enabled:false
```

### remediation priority

| # | Remediation | Priority |
|---|---|---|
| 1 | Disable directory browsing on the affected vhost | HIGH |
| 2 | Audit the exposed directory and relocate non-public files | HIGH |
| 3 | Deny direct access to backup/dump extensions | MEDIUM |
| 4 | Request search-engine cache removal | MEDIUM |
| 5 | Add a post-deployment configuration check | MEDIUM |
| 6 | Sweep other hosts in the same estate for the same pattern | LOW |

## Verification After Fix {#verify}

```bash {label="bash"}
$ curl -s -o /dev/null -w "%{http_code}\n" https://target/<path>/
403
$ curl -s https://target/<path>/ | grep -ci "index of"
0
```

Confirm as well that files previously listed are no longer retrievable by direct URL. Turning off the listing does not revoke access to a filename that is already known.

## Disclosure Timeline {#timeline}

| Date | Event |
|---|---|
| 2026-04-28 | Condition identified; report sent to the operator via its official channel, incl. affected path, technical description, and remediation steps |
| 2026-07-27 | 90-day coordinated disclosure window elapsed with no acknowledgement received |
| 2026-09-03 | Re-verified as unremediated |
| 2026-09-03 | Sanitized case study published; affected party not identified |

The 90-day window follows common industry practice (ISO/IEC 29147, CERT/CC CVD). Because the finding remains open, this document withholds the organization, hostname, and path, and publishes only the weakness class and its remediation.

## Conclusion {#conclusion}

A publicly reachable directory on a government information system returns a full file index to unauthenticated visitors. The finding is low to medium in isolation, and its real severity depends on the contents of that directory, which were deliberately not examined. The remediation is a single configuration directive, supported by relocating non-public files out of the web root. The report was delivered through the operator's official channel more than four months before publication, and the condition persists. All observation was read-only - no files were downloaded, no data was modified, no authentication was bypassed, and no automated scanning was directed at the target.

## References {#refs}

- [CWE-548 - Exposure of Information Through Directory Listing](https://cwe.mitre.org/data/definitions/548.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- ISO/IEC 29147:2018 - Vulnerability disclosure
- ISO/IEC 30111:2019 - Vulnerability handling processes
- CERT/CC Guide to Coordinated Vulnerability Disclosure
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi

### remediation guides for other web servers

The fix section above covers Apache, Nginx, and IIS. The guides below extend the same fix to stacks not addressed here, and are useful for administrators verifying their own environment.

| Source | Language | Servers covered |
|---|---|---|
| [Acunetix - Disabling Directory Listing](https://www.acunetix.com/blog/articles/disabling-directory-listing-web-server/) | English | Apache, Nginx, IIS, Tomcat, LiteSpeed, Lighttpd |
| [Tonjoo - Cara Disable Directory Listing](https://tonjoo.com/id/cara-disable-directory-listing/) | Bahasa Indonesia | Apache/XAMPP, Nginx, LiteSpeed, Lighttpd |

Third-party material, linked for convenience and not endorsed. Verify any configuration change against your own vendor documentation before applying it to a production system.