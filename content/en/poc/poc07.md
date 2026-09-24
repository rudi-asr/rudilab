---
title: "Broken Access Control via LOV Sub-Endpoints"
date: "2026-09-16"
poc_num: "07"
kicker: "SECURITY RESEARCH CASE STUDY - Authorized assessment · coordinated disclosure"
capture: "poc-07.pcap"
capture_note: "authz bypass via LOV sub-endpoints"
intro: "A low-privilege authenticated account reads restricted employee and client data through List-of-Values (LOV) sub-endpoints that skip the authorization check enforced on their parent resources - a Broken Function Level Authorization flaw."
severity: "Medium"
cwe: "CWE-862 - Missing Authorization"
cwe_secondary: "CWE-200 - Exposure of Sensitive Information"
owasp: "A01:2021 - Broken Access Control / API5:2023 - BFLA"
category: "Web Application / API Authorization"
test_date: "2026-09-16"
target: "[REDACTED] - internal ERP"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Testing was performed under an authorized assessment with owner-confirmed scope. No accounts were compromised, no data was exfiltrated, and rate limits were respected. The fix was applied by the owner before this sanitized write-up was published with consent. Target and all data are redacted - the organization is not identified in this document."
---

## Summary {#summary}

The application enforces access per menu permission (for example, a role may hold `master.employee` or `master.client`). A test account with a low-privilege role was *not* granted the employee or client menus, and the parent resources correctly rejected it with `403 Forbidden`.

However, several LOV (List-of-Values) sub-endpoints - the lightweight lookups used to populate dropdowns - do not enforce the same menu check. They returned `200 OK` and disclosed data the role was never meant to see: staff identities (name, email, position) and the client list. Access control is enforced on the parent resource but missed on the sub-resource.

## Risk Map {#riskmap}

| ID | Severity | Class | Affected Endpoints | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | Medium | Broken Function Level Authorization | `/employees/lov`, `/clients/lov`, `/clients/tiers` | CWE-862 / CWE-200 | Fixed - per owner |

## Preconditions {#preconditions}

- A single valid, low-privilege authenticated account (obtained legitimately).
- The account's role lacks the menu for the target resource (e.g. `master.employee`).
- The LOV / derived sub-endpoints are reachable (they back the front-end dropdowns).

## PoC Steps {#poc}

1. Authenticate as the low-privilege user and obtain a valid `accessToken`.
2. Confirm the parent resource is correctly denied: `GET /employees` → `403 Forbidden`.
3. Call the LOV sub-endpoint with the same token: `GET /employees/lov`.
4. Observe `200 OK` returning a list of identities (name, email, position).
5. Repeat for related resources: `GET /clients/lov`, `GET /clients/tiers` → `200 OK`.
6. Confirm record-level access is still enforced: `GET /employees/{id}` → `403` (correct).

Sanitized transcript (identities and target removed):

```http {label="http"}
# parent resources - correctly blocked
GET /employees   → 403 Forbidden  # (menu master.employee)
GET /clients     → 403 Forbidden  # (menu master.client)

# LOV sub-endpoints - authorization bypass
GET /employees/lov → 200 OK
  [ { "id":"[REDACTED]", "name":"[REDACTED]",
      "email":"[REDACTED]", "position":"[REDACTED]" }, ... ]
GET /clients/lov   → 200 OK
  [ { "code":"[REDACTED]", "name":"[REDACTED]" }, ... ]
GET /clients/tiers → 200 OK

# record-level - correctly blocked (positive control)
GET /employees/{id} → 403 Forbidden
GET /clients/{id}   → 403 Forbidden
```

All identifying values (target host, staff names, emails, client names) are redacted. Only HTTP status codes and generic REST paths are shown - enough to reproduce the logic without exposing data.

## Impact {#impact}

Disclosure of internal PII (staff names, emails, positions) and the business entity list to a role that is explicitly denied that data. In practice this fuels targeted phishing and internal OSINT, and supplies input for account-enumeration attempts. It did not lead to account takeover during testing (credential controls held), so impact is confined to confidentiality - consistent with the Medium rating.

> IMPACT:: Impact
>
> Unauthorized read of staff identities and client records by a denied role; enables phishing and OSINT against the organization. No integrity or availability impact observed.

## Root Cause {#rootcause}

Authorization is applied per-endpoint, by hand, and only wired onto the parent resource handler. Derived sub-endpoints (`/lov`, `/tiers`) were registered without the same menu guard. Because the check is not enforced centrally at the router/resource level, any sub-path added later inherits no protection by default - the classic shape of Broken Function Level Authorization.

## Solution {#solution}

Enforce authorization at the router/resource level so it applies to every sub-path, and return only the minimum fields a lookup needs.

```js {label="before - vulnerable"}
// guard only on the parent; sub-routes slip through
router.get('/employees',       requireMenu('master.employee'), listEmployees)
router.get('/employees/lov',   listEmployeesLov)   // no guard → 200 leak
router.get('/clients/lov',     listClientsLov)     // no guard → 200 leak

// LOV returns full records, including PII
return rows.map(e => ({ id:e.id, name:e.name, email:e.email, position:e.position }))
```

```js {label="after - fixed"}
// guard at router level → covers parent + /lov + /tiers
const employees = Router()
employees.use(requireMenu('master.employee'))
employees.get('/',    listEmployees)
employees.get('/lov', listEmployeesLov)
// idem: clients → requireMenu('master.client')

// least-privilege lookup: id + label only, no PII
return rows.map(e => ({ id:e.id, label:e.name }))
```

> FIX:: Remediation
>
> Framework shown is illustrative - apply the equivalent guard in your stack. Add a regression test: a role without the menu must receive 403 on the parent *and* every sub-endpoint (`/lov`, `/tiers`).

## Disclosure Timeline {#disclosure}

- **Day 0** - Finding identified during an authorized assessment; reported to the system owner.
- **Coordinated** - Per owner communication, the fix was applied (authorization guard extended to sub-endpoints and LOV payloads minimized); not independently re-verified by the researcher.
- **Publication** - This sanitized write-up published with owner consent. Target and all data redacted.

## References {#refs}

- [OWASP Top 10 - A01 Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
- [OWASP API Security - API5:2023 Broken Function Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [CWE-285 - Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
- [CWE-200 - Exposure of Sensitive Information](https://cwe.mitre.org/data/definitions/200.html)