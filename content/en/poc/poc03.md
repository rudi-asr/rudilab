---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
kicker: "PENETRATION TEST FINDINGS REPORT - Bug Bounty / Authorized Testing"
capture: "poc-03.pcap"
capture_note: "backend services reachable from the public internet"
intro: "All backend services of the target - API server, object storage (S3-compatible), and database - are directly reachable from the public internet with no network-layer restriction. Services are bound to 0.0.0.0 instead of 127.0.0.1, bypassing the nginx reverse proxy entirely."
severity: "High"
cwe: "CWE-668 - Exposure of Resource to Wrong Sphere"
category: "Security Misconfiguration - Network Exposure"
owasp: "A05:2021 - Security Misconfiguration"
target: "[REDACTED] - web application stack"
test_date: "[REDACTED]"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Tested under a bug-bounty program - scope-strict, non-destructive, no-DoS. External access only; a low-privilege authenticated account was used for API-layer checks. No brute-force, no data modification, no destructive operations. Host, ports, product name, and PII are redacted for public release."
---

## Summary {#summary}

All backend services of the target - API server, object storage (S3-compatible), and database - are directly reachable from the public internet with no network-layer restriction. Services are bound to `0.0.0.0` instead of `127.0.0.1`, bypassing the nginx reverse proxy entirely.

The reverse proxy does **not** act as a security boundary: while nginx returned `502 Bad Gateway`, the backend API remained fully accessible and accepted authenticated sessions directly on its native port.

Stack fingerprint: Vue.js frontend · FastAPI/Uvicorn backend · MinIO object storage · PostgreSQL - confirmed from response headers and open ports.

## Risk Map {#riskmap}

| ID | Severity | Class | Evidence | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | High | Exposed Backend API - Direct Access / nginx Bypass | Backend reachable on raw port; nginx 502 but API returns 200 | CWE-668 / CWE-284 | Not claimed |
| F-02 | High | Exposed Object Storage (MinIO) | MinIO health & API endpoints reachable from internet | CWE-668 | Not claimed |
| F-03 | High | Exposed Database (PostgreSQL) | `psql` port reachable from public internet | CWE-668 | Not claimed |
| F-04 | Medium | Public OpenAPI / Swagger Docs | Full API schema accessible without authentication | CWE-200 | Not claimed |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Authorized under a bug-bounty program - scope-strict |
| **Discovery method** | External port scan + authenticated API requests |
| **Privilege used** | Low-privilege (BRANCH role) account for API-layer checks |
| **Automated scanning** | Connectivity checks only (nmap, nc, curl) - no exploitation |
| **Brute-force** | NOT performed |
| **Data modified or destroyed** | NO - all write operations returned 403 |
| **Target identified here** | NO |

## PoC 1 - Port exposure verification {#poc1}

*Objective:* show that backend service ports are reachable from the public internet.

```bash {label="bash"}
$ for port in 80 443 <APP> <API> <CLONE> <S3> <DB>; do
    nc -zv -w3 TARGET $port 2>&1 | grep -q succeeded \
      && echo "[$port] EXPOSED" || echo "[$port] CLOSED"
  done
[   80] EXPOSED - nginx (default welcome page)
[  443] EXPOSED - nginx (separate application)
[<APP>] EXPOSED - nginx TLS (target dashboard)
[<API>] EXPOSED - FastAPI/Uvicorn (backend API, direct)
[<CLONE>] EXPOSED - nginx clone (dashboard copy)
[<S3>] EXPOSED - MinIO S3 API (object storage)
[<DB>] EXPOSED - PostgreSQL (TCP connect succeeded)
```

All four backend ports are reachable externally. The database port is the most critical - direct database access bypasses the entire application layer.

## PoC 2 - API direct access & nginx bypass {#poc2}

*Objective:* show the backend API is reachable directly, bypassing nginx and any controls it enforces.

```bash {label="bash"}
# nginx frontend is down:
$ curl -sk https://TARGET:<APP>/api/v1/auth/login
502 Bad Gateway

# backend answers directly on its native port:
$ curl -s http://TARGET:<API>/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"[REDACTED]","password":"[REDACTED]"}'
HTTP/1.1 200 OK
{ "access_token": "<redacted>", "token_type": "bearer", "role": "BRANCH" }
```

nginx returned 502, yet the backend accepted login and issued a valid JWT directly. Any IP filtering, WAF rules, or rate limiting at the nginx layer can be trivially bypassed by targeting the backend port directly.

## PoC 3 - Public API documentation & schema {#poc3}

```bash {label="bash"}
$ curl -s http://TARGET:<API>/docs           # Swagger UI
$ curl -s http://TARGET:<API>/redoc          # ReDoc
$ curl -s http://TARGET:<API>/openapi.json | wc -c
200  OK   (Swagger UI)
200  OK   (ReDoc)
50626     (full schema bytes)
```

The complete API contract - all endpoints, request/response models, parameters - is available to any unauthenticated party, accelerating attacker reconnaissance.

## PoC 4 - MinIO health endpoints accessible {#poc4}

```bash {label="bash"}
$ curl -s http://TARGET:<S3>/minio/health/live
$ curl -s http://TARGET:<S3>/minio/health/cluster
$ curl -s http://TARGET:<S3>/
200 OK   (live)
200 OK   (cluster)
403 AccessDenied  (bucket listing blocked - correct)
```

Anonymous access to health endpoints confirms the object storage service and its status. Bucket listing is correctly blocked (403); however, weak ACLs or credentials would expose stored objects directly via the S3 API.

## PoC 5 - PostgreSQL port reachable from internet {#poc5}

```bash {label="bash"}
$ nc -zv TARGET <DB> -w3
Connection to TARGET <DB> port [tcp] succeeded!
```

The PostgreSQL TCP handshake succeeds from the external internet. An attacker can attempt direct database authentication, version enumeration, and credential brute-force without ever touching the application layer. This is the highest-risk individual finding in this assessment.

## Additional Findings (same scope) {#addl}

| ID | Finding | Severity | Status |
|---|---|---|---|
| F-1 | Public API docs without auth (/docs, /openapi.json) | Medium | Confirmed |
| F-2 | No login rate limiting - 20 requests, zero 429s | Medium | Confirmed |
| F-3 | MinIO health endpoints anonymous | Low | Confirmed |
| F-4 | Self-signed TLS certificate | Low | Confirmed |
| F-5 | Security headers missing (HSTS, XFO, CSP, ...) | Low | Confirmed |
| F-6 | Potential BOLA on /download - cross-branch unverified | Medium* | Unverified |
| F-7 | Debtor PII (name, address, GPS) in bulk, unmasked | Medium | Confirmed |
| E-1 | Change-password IDOR - blocked (403) | - | Blocked |
| E-2 | Role-parameter priv-esc - blocked (403) | - | Blocked |

F-7 raised from Low-Medium to Medium: financial-collections PII (name, address, GPS) carries elevated weight under Indonesia's PDP Law (UU 27/2022).

## Tested and found safe {#safe}

| Vector | Result |
|---|---|
| SQL injection (all tested endpoints) | SAFE - 401, parameterized queries confirmed |
| CORS arbitrary origin | SAFE - no ACAO:* triggered |
| Anonymous MinIO bucket listing | SAFE - 403 AccessDenied |
| Path traversal | SAFE - no vulnerable endpoint |
| Error / stack-trace leakage | SAFE - 422 structured error, no traceback |
| TLS 1.0 / 1.1 | SAFE - legacy protocols rejected |
| Open self-registration | SAFE - no public registration endpoint |
| IDOR change-password (E-1) | SAFE - 403 |
| Priv-esc via role parameter (E-2) | SAFE - 403 on all variants |
| DELETE by low-privilege role | SAFE - all 403 |

## Impact {#impact}

> IMPACT:: Impact
>
> **A. Database direct access (highest risk).** Direct PostgreSQL auth attempts from the internet; weak or default credentials would allow a full dump without touching the API, WAF, or nginx.
>
> **B. API nginx bypass.** Any IP allowlist, WAF rule, or rate limit at the nginx layer is ineffective - all endpoints are reachable directly.
>
> **C. Object storage exposure.** Misconfigured ACLs or compromised credentials would expose stored audio recordings via the S3 API.
>
> **D. Credential-leak scenario.** A leaked low-privilege credential (e.g. a former employee) allows normal login on the backend port, bulk PII retrieval, and download of accessible recordings - no exploit required.

> NOTCLAIMED:: Findings not claimed
>
> - Successful database credential brute-force - not attempted.
> - MinIO bucket data access - bucket listing returned 403, not proven exploitable.
> - Cross-branch BOLA (F-6) - not confirmed (single branch active at test time).
> - Any data modification or deletion - all write operations returned 403.

## Severity Assessment {#cvss}

Severity is researcher-assessed based on the observed conditions: the exposed service is reachable from any external network without authentication or user interaction, and a potential full database dump has a confidentiality impact that extends beyond the application's own scope. No data modification or availability impact was confirmed.

## Root Cause {#rootcause}

All backend services bind to `0.0.0.0` (all interfaces) instead of `127.0.0.1` (loopback), so every service is reachable on the public-facing interface with no firewall or security-group restriction. The nginx reverse proxy was deployed as a routing layer, not a security boundary, and no host-level or cloud firewall rules restrict the backend ports.

## Solution & Recommendations {#fix}

### bind services to loopback

```bash {label="config"}
uvicorn main:app --host 127.0.0.1 --port <API>   # FastAPI
MINIO_ADDRESS=127.0.0.1:<S3>                     # MinIO
listen_addresses = 'localhost'                   # postgresql.conf
```

### firewall / security group

```bash {label="bash"}
# allow from internet: only 80, 443, <APP>
# block from internet: <API> <CLONE> <S3> <DB>
iptables -A INPUT -p tcp --dport <DB> ! -s 127.0.0.1 -j DROP
# preferred: enforce at the cloud provider security-group level
```

### remediation priority

| # | Remediation | Priority |
|---|---|---|
| 1 | Bind PostgreSQL to loopback; block DB port from internet | HIGH |
| 2 | Bind FastAPI and the nginx clone to loopback | HIGH |
| 3 | Bind MinIO to loopback / internal network | HIGH |
| 4 | Add branch filter to /recordings/{id}/download | MEDIUM |
| 5 | Field-mask debtor PII on the recording list | MEDIUM |
| 6 | Disable /docs, /redoc, /openapi.json in production | MEDIUM |
| 7 | Rate limit login (e.g. 5/min per IP) | MEDIUM |
| 8 | Add the missing security headers in nginx | LOW |
| 9 | Replace self-signed TLS with a trusted CA cert | LOW |

## Conclusion {#conclusion}

The application's authentication and write-authorization boundaries are solid - sensitive endpoints require valid sessions, SQL injection is mitigated, and low-privilege writes are correctly blocked. No exploitable IDOR or privilege escalation was confirmed. However, the network exposure of the backend stack is a systemic risk that undermines all application-layer controls: the database port reachable from the public internet is the highest-priority item and needs immediate remediation. All testing was read-only, non-destructive, and authorized.

## References {#refs}

- [CWE-668 - Exposure of Resource to Wrong Sphere](https://cwe.mitre.org/data/definitions/668.html)
- [OWASP A05:2021 - Security Misconfiguration](https://owasp.org/Top10/A05_2021-Security_Misconfiguration/)
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi