---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
target: "Web application (redacted)"
category: "Security Misconfiguration"
severity: "High"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Full API access bypassing nginx controls, potential database credential brute-force, object storage exposure, and bulk PII retrieval with valid credentials."
status: "Proven"
---

## Summary

    
All backend services of the target - API server, object storage (S3-compatible), and database - are directly
      reachable from the public internet with no network-layer restriction. Services are bound to
      `0.0.0.0` instead of `127.0.0.1`, bypassing the nginx reverse
      proxy entirely.

    
The reverse proxy does **not** act as a security boundary: while nginx returned
      `502 Bad Gateway`, the backend API remained fully accessible and accepted authenticated
      sessions directly on its native port.

    
Stack fingerprint: Vue.js frontend · FastAPI/Uvicorn backend · MinIO object storage · PostgreSQL -
      confirmed from response headers and open ports.

  

  
    02
## Authorization Status & Scope

    
      Authorization statusAuthorized under a bug-bounty program - scope-strict
      Discovery methodExternal port scan + authenticated API requests
      Privilege usedLow-privilege (BRANCH role) account for API-layer checks
      Automated scanningConnectivity checks only (nmap, nc, curl) - no exploitation
      Brute-forceNOT performed
      Data modified or destroyedNO - all write operations returned 403
      Target identified hereNO
    
  

  
    03
## PoC 1 - Port exposure verification

    
*Objective:* show that backend service ports are reachable from the public internet.

    bash

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

    
All four backend ports are reachable externally. The database port is the most critical - direct database access
      bypasses the entire application layer.

  

  
    04
## PoC 2 - API direct access & nginx bypass

    
*Objective:* show the backend API is reachable directly, bypassing nginx and any controls it enforces.

    bash

# nginx frontend is down:
$ curl -sk https://TARGET:<APP>/api/v1/auth/login
502 Bad Gateway

# backend answers directly on its native port:
$ curl -s http://TARGET:<API>/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"[REDACTED]","password":"[REDACTED]"}'
HTTP/1.1 200 OK
{ "access_token": "<redacted>", "token_type": "bearer", "role": "BRANCH" }

    
nginx returned 502, yet the backend accepted login and issued a valid JWT directly. Any IP filtering, WAF rules, or
      rate limiting at the nginx layer can be trivially bypassed by targeting the backend port directly.

  

  
    05
## PoC 3 - Public API documentation & schema

    bash

$ curl -s http://TARGET:<API>/docs           # Swagger UI
$ curl -s http://TARGET:<API>/redoc          # ReDoc
$ curl -s http://TARGET:<API>/openapi.json | wc -c
200  OK   (Swagger UI)
200  OK   (ReDoc)
50626     (full schema bytes)

    
The complete API contract - all endpoints, request/response models, parameters - is available to any unauthenticated
      party, accelerating attacker reconnaissance.

  

  
    06
## PoC 4 - MinIO health endpoints accessible

    bash

$ curl -s http://TARGET:<S3>/minio/health/live
$ curl -s http://TARGET:<S3>/minio/health/cluster
$ curl -s http://TARGET:<S3>/
200 OK   (live)
200 OK   (cluster)
403 AccessDenied  (bucket listing blocked - correct)

    
Anonymous access to health endpoints confirms the object storage service and its status. Bucket listing is correctly
      blocked (403); however, weak ACLs or credentials would expose stored objects directly via the S3 API.

  

  
    07
## PoC 5 - PostgreSQL port reachable from internet

    bash

$ nc -zv TARGET <DB> -w3
Connection to TARGET <DB> port [tcp] succeeded!

    
The PostgreSQL TCP handshake succeeds from the external internet. An attacker can attempt direct database
      authentication, version enumeration, and credential brute-force without ever touching the application layer. This is
      the highest-risk individual finding in this assessment.

  

  
    08
## Additional Findings (same scope)

    IDFindingSeverityStatus
      F-1Public API docs without auth (/docs, /openapi.json)MediumConfirmed
      F-2No login rate limiting - 20 requests, zero 429sMediumConfirmed
      F-3MinIO health endpoints anonymousLowConfirmed
      F-4Self-signed TLS certificateLowConfirmed
      F-5Security headers missing (HSTS, XFO, CSP, ...)LowConfirmed
      F-6Potential BOLA on /download - cross-branch unverifiedMedium*Unverified
      F-7Debtor PII (name, address, GPS) in bulk, unmaskedMediumConfirmed
      E-1Change-password IDOR - blocked (403)-Blocked
      E-2Role-parameter priv-esc - blocked (403)-Blocked
    
    
F-7 raised from Low-Medium to Medium: financial-collections PII (name, address, GPS) carries elevated
      weight under Indonesia's PDP Law (UU 27/2022).

  

  
    09
## Tested and found safe

    VectorResult
      SQL injection (all tested endpoints)SAFE - 401, parameterized queries confirmed
      CORS arbitrary originSAFE - no ACAO:* triggered
      Anonymous MinIO bucket listingSAFE - 403 AccessDenied
      Path traversalSAFE - no vulnerable endpoint
      Error / stack-trace leakageSAFE - 422 structured error, no traceback
      TLS 1.0 / 1.1SAFE - legacy protocols rejected
      Open self-registrationSAFE - no public registration endpoint
      IDOR change-password (E-1)SAFE - 403
      Priv-esc via role parameter (E-2)SAFE - 403 on all variants
      DELETE by low-privilege roleSAFE - all 403
    
  

  
    10
## Impact

    Impact
      **A. Database direct access (highest risk).** Direct PostgreSQL auth attempts from the internet; weak or
      default credentials would allow a full dump without touching the API, WAF, or nginx.

      **B. API nginx bypass.** Any IP allowlist, WAF rule, or rate limit at the nginx layer is ineffective -
      all endpoints are reachable directly.

      **C. Object storage exposure.** Misconfigured ACLs or compromised credentials would expose stored audio
      recordings via the S3 API.

      **D. Credential-leak scenario.** A leaked low-privilege credential (e.g. a former employee) allows normal
      login on the backend port, bulk PII retrieval, and download of accessible recordings - no exploit required.
    
    Findings not claimed
      
        
- Successful database credential brute-force - not attempted.
        
- MinIO bucket data access - bucket listing returned 403, not proven exploitable.
        
- Cross-branch BOLA (F-6) - not confirmed (single branch active at test time).
        
- Any data modification or deletion - all write operations returned 403.
      
    
  

    
    11
## Severity Assessment

    
Severity is researcher-assessed based on the observed conditions: the exposed service is reachable from any
      external network without authentication or user interaction, and a potential full database dump has a
      confidentiality impact that extends beyond the application's own scope. No data modification or availability
      impact was confirmed.

  

  
    12
## Root Cause

    
All backend services bind to `0.0.0.0` (all interfaces) instead of
      `127.0.0.1` (loopback), so every service is reachable on the public-facing interface with no
      firewall or security-group restriction. The nginx reverse proxy was deployed as a routing layer, not a security
      boundary, and no host-level or cloud firewall rules restrict the backend ports.

  

  
    13
## Solution & Recommendations

    
### bind services to loopback

    config

uvicorn main:app --host 127.0.0.1 --port <API>   # FastAPI
MINIO_ADDRESS=127.0.0.1:<S3>                     # MinIO
listen_addresses = 'localhost'                   # postgresql.conf

    
### firewall / security group

    bash

# allow from internet: only 80, 443, <APP>
# block from internet: <API> <CLONE> <S3> <DB>
iptables -A INPUT -p tcp --dport <DB> ! -s 127.0.0.1 -j DROP
# preferred: enforce at the cloud provider security-group level

    
### remediation priority

    #RemediationPriority
      1Bind PostgreSQL to loopback; block DB port from internetHIGH
      2Bind FastAPI and the nginx clone to loopbackHIGH
      3Bind MinIO to loopback / internal networkHIGH
      4Add branch filter to /recordings/{id}/downloadMEDIUM
      5Field-mask debtor PII on the recording listMEDIUM
      6Disable /docs, /redoc, /openapi.json in productionMEDIUM
      7Rate limit login (e.g. 5/min per IP)MEDIUM
      8Add the missing security headers in nginxLOW
      9Replace self-signed TLS with a trusted CA certLOW
    
  

  
    14
## Conclusion

    
The application's authentication and write-authorization boundaries are solid - sensitive endpoints require valid
      sessions, SQL injection is mitigated, and low-privilege writes are correctly blocked. No exploitable IDOR or privilege
      escalation was confirmed. However, the network exposure of the backend stack is a systemic risk that undermines all
      application-layer controls: the database port reachable from the public internet is the highest-priority item and
      needs immediate remediation. All testing was read-only, non-destructive, and authorized.

  

  
    15
## References

    
      
- CWE-668 - Exposure of Resource to Wrong Sphere
      
- OWASP A05:2021 - Security Misconfiguration
      
- UU No. 27 Tahun 2022 - Pelindungan Data Pribadi
    
  

&#8593;
