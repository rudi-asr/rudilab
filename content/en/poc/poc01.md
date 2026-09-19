---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
target: "Web application (redacted)"
category: "Broken Access Control"
severity: "Medium"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-01.pcap</span> &rarr; low-privilege account reads restricted org resources</div>
    <div class="kicker">PENETRATION TEST FINDINGS REPORT - Authorized Testing</div>
    <div class="poc-id">PoC-01</div>
    <h1>Broken Access Control / Improper Resource Isolation</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-med">Medium</dd>
      <dt>CWE Primary</dt>   <dd>CWE-862 - Missing Authorization</dd>
      <dt>CWE Secondary</dt> <dd>CWE-200 - Exposure of Sensitive Information</dd>
      <dt>OWASP</dt>         <dd>A01:2021 - Broken Access Control</dd>
      <dt>Affected Host</dt> <dd><span class="redacted-tag">REDACTED</span> - SaaS web application</dd>
      <dt>Test Date</dt>     <dd>2026-08-20</dd>
      <dt>Status</dt>        <dd>CONFIRMED</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Severity is researcher-assessed based on observed conditions, not a vendor rating.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Testing was performed under authorization, scope-strict and
      non-destructive. All requests were read-only except the creation of one PoC account. No production data was
      touched - identifiers used were fake/PoC values. Host, product name, and any personal data are redacted for
      public release. This is a sanitized showcase, not the confidential deliverable.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Summary</h2></div>
    <p>A newly registered account with the <strong>SDR</strong> (Sales Development Representative) role can access
      organization information and resources that should not be exposed to a new low-privilege user.</p>
    <p>The endpoint <code class="inline">GET /api/v1/orgs/me/members</code> returns the full list of organization
      members and their roles to the new account. Separately, <code class="inline">GET /api/v1/research/discover/batches</code>
      returns existing research batches to a PoC account that has never performed any discovery activity.</p>
    <p class="muted">Backend fingerprint: FastAPI (Python) + SQLAlchemy + Uvicorn - inferred from the Pydantic error schema.
      The org-switch IDOR (<code class="inline">POST /api/v1/orgs/switch</code>) returned 403 and is <strong>not</strong> vulnerable (see PoC 4).</p>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Authorization Status &amp; Scope</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Authorized testing - scope-strict, non-destructive</td></tr>
      <tr><td class="k">Discovery method</td><td>Public registration + authenticated API requests</td></tr>
      <tr><td class="k">Authentication bypassed</td><td class="no">NO - legitimately registered low-privilege account</td></tr>
      <tr><td class="k">Automated scanning</td><td class="no">NOT performed - manual requests only</td></tr>
      <tr><td class="k">Testing environment</td><td>Production, read-only (except one PoC account creation)</td></tr>
      <tr><td class="k">Production data accessed</td><td class="no">NO - PoC/fake identifiers only</td></tr>
      <tr><td class="k">Data modified or destroyed</td><td class="no">NO</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
  </section>

  <section id="pre">
    <div class="sec-head"><span class="sec-num">03</span><h2>Preconditions</h2></div>
    <ul class="tight">
      <li>New account with the SDR role registered through the public registration endpoint.</li>
      <li>JWT obtained directly from the registration response - no email verification or admin approval required.</li>
      <li>Testing performed without touching real production data; identifiers were fake/PoC values.</li>
      <li>All requests read-only except PoC 1 (new account registration).</li>
    </ul>
  </section>

  <section id="poc1">
    <div class="sec-head"><span class="sec-num">04</span><h2>PoC 1 - Self-registration creates an active account + JWT</h2></div>
    <p><em>Objective:</em> show that public registration creates an active account and returns an auth token with no further verification or approval.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ TARGET="https://TARGET"
$ EMAIL="poc_$(date +%s)@example.test"
$ curl -i -X POST "$TARGET/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"'"$EMAIL"'","name":"PoC Test","password":"[REDACTED]"}'</span>
<span class="out">HTTP/1.1 200 OK

{ "access_token": "eyJ...", ... }</span></pre></div>
    <p>Public registration produces an authenticated session directly. The JWT is issued without email verification or admin approval.</p>
    <p class="muted"><em>Note:</em> this is not itself a vulnerability absent a requirement prohibiting self-registration - but it is the precondition for PoC 2 and PoC 3.</p>
    <figure><img src="/images/img-poc/poc01/poc01.jpg" alt="PoC login page, account redacted" /><figcaption>Figure 1 - login page with the PoC account redacted.</figcaption></figure>
  </section>

  <section id="poc2">
    <div class="sec-head"><span class="sec-num">05</span><h2>PoC 2 - New user can view the member list</h2></div>
    <p><em>Objective:</em> show that a newly registered SDR account can read the organization member list and roles.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -i "$TARGET/api/v1/orgs/me/members" \
    -H "Authorization: Bearer &lt;JWT_NEW_ACCOUNT&gt;"</span>
<span class="out">HTTP/1.1 200 OK

[ { "email": "...", "role": "..." },
  { "email": "...", "role": </span><span class="hl-red">"owner"</span><span class="out"> } ]</span></pre></div>
    <p>A new SDR account with no activity history can view the complete member list and their roles, including accounts
      with the <strong>owner</strong> role. This is unauthorized visibility into organization information.</p>
    <figure><img src="/images/img-poc/poc01/poc02.jpg" alt="PoC account dashboard after login" /><figcaption>Figure 2 - PoC account dashboard after successful login.</figcaption></figure>
  </section>

  <section id="poc3">
    <div class="sec-head"><span class="sec-num">06</span><h2>PoC 3 - New user can view existing research batches</h2></div>
    <p><em>Objective:</em> show that a new SDR account with no discovery activity can read research batches already in the system.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -i "$TARGET/api/v1/research/discover/batches?limit=10" \
    -H "Authorization: Bearer &lt;JWT_NEW_ACCOUNT&gt;"</span>
<span class="out">{ "batches": [ { "id": ..., "status": "completed",
   "total": 30, "prospects_count": 30,
   "created_at": "2026-08-.." } ] }</span></pre></div>
    <p>The new account with no prior discovery activity receives a response containing an existing, completed batch
      (prospects_count: 30) - unauthorized visibility into existing resources.</p>
    <p class="muted"><em>Note:</em> not claimed as a cross-tenant IDOR - ownership/tenant boundaries were not definitively established in this test.</p>
  </section>

  <section id="poc4">
    <div class="sec-head"><span class="sec-num">07</span><h2>PoC 4 - Org switching (negative test / not vulnerable)</h2></div>
    <p><em>Objective:</em> prevent overclaiming by including a negative test for the org-switch IDOR.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -i -X POST "$TARGET/api/v1/orgs/switch" \
    -H "Authorization: Bearer &lt;JWT_NEW_ACCOUNT&gt;" \
    -H "Content-Type: application/json" \
    -d '{"organization_id":1}'</span>
<span class="out">HTTP/1.1 403 Forbidden

{"detail": "Not a member of the target organization"}</span></pre></div>
    <p><strong>Conclusion:</strong> org-switch IDOR is NOT vulnerable. The server correctly returns 403 with an appropriate message.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">08</span><h2>Impact</h2></div>
    <div class="callout impact"><span class="label">Impact</span>
      <strong>A. Member-list disclosure.</strong> A new SDR account can read the full member list and roles, including owner
      accounts - usable for account enumeration, social engineering, or targeted attacks on higher-privilege accounts.<br><br>
      <strong>B. Unauthorized resource visibility.</strong> A new account with no activity can view existing research batches,
      including status and prospect count - potentially exposing commercial data that should be isolated.
    </div>
    <div class="callout notclaimed"><span class="label">Findings not claimed</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Credentials exposure - not proven.</li>
        <li>Invitation takeover - not proven.</li>
        <li>Cross-tenant IDOR - not proven (ownership boundaries not confirmed).</li>
        <li>Prospect PII exposure - not proven.</li>
      </ul>
    </div>
  </section>

    <section id="cvss">
    <div class="sec-head"><span class="sec-num">09</span><h2>Severity Assessment</h2></div>
    <p>Severity is researcher-assessed based on the observed conditions: the flaw is network-accessible with no complex
      preconditions, but requires a registered low-privilege account. Impact is limited to disclosure of the member list
      and resource metadata, with no evidence of data modification or availability impact.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">10</span><h2>Root Cause</h2></div>
    <p>No adequate authorization check on <code class="inline">/api/v1/orgs/me/members</code> and
      <code class="inline">/api/v1/research/discover/batches</code>. Both endpoints validate only that the request carries a
      valid token (<strong>authentication</strong>) but never validate whether the caller is authorized to access the
      returned resource (<strong>authorization</strong>).</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">11</span><h2>Solution &amp; Recommendations</h2></div>
    <h3>before - vulnerable pattern</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>python</span></div>
<pre><span class="hl-red"># VULNERABLE: returns all members without an org filter
def get_org_members(db, current_user):
    return db.query(Member).all()</span></pre></div>
    <h3>after - secure pattern</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>python</span></div>
<pre><span class="cmd">def get_org_members(db, current_user):
    caller_org_id = current_user.organization_id
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.org_id  == caller_org_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")
    return db.query(Member).filter(
        Member.org_id == caller_org_id
    ).all()</span></pre></div>
    <h3>authorization for /orgs/me/members (FastAPI)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>python</span></div>
<pre><span class="cmd">@router.get('/orgs/me/members')
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
    ).all()</span></pre></div>
    <h3>authorization for /research/discover/batches</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>python</span></div>
<pre><span class="cmd">@router.get('/research/discover/batches')
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
    return {'batches': batches}</span></pre></div>
    <div class="callout fix"><span class="label">Least-privilege matrix</span>
    <table style="margin:6px 0 0;"><thead><tr><th>Endpoint</th><th>Owner</th><th>Manager</th><th>SDR</th></tr></thead><tbody>
      <tr><td>GET /orgs/me/members</td><td>Yes (all)</td><td>Yes (all)</td><td>Yes (self)</td></tr>
      <tr><td>GET /research/.../batches</td><td>Yes (all)</td><td>Yes (team)</td><td>Yes (self-owned)</td></tr>
      <tr><td>POST /orgs/switch</td><td>Yes</td><td>No</td><td>No</td></tr>
      <tr><td>GET /orgs/me/prospects</td><td>Yes</td><td>Yes (team)</td><td>Yes (assigned only)</td></tr>
    </tbody></table></div>
    <h3>remediation priority</h3>
    <table><thead><tr><th>#</th><th>Remediation</th><th>Priority</th></tr></thead><tbody>
      <tr><td>1</td><td>Authorization filter for /orgs/me/members</td><td class="sev high">HIGH</td></tr>
      <tr><td>2</td><td>Authorization filter for /research/.../batches</td><td class="sev high">HIGH</td></tr>
      <tr><td>3</td><td>Implement RBAC permission matrix for SDR</td><td class="sev high">HIGH</td></tr>
      <tr><td>4</td><td>Audit logging for sensitive endpoints</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>5</td><td>Regression / automated security test</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>6</td><td>Review other endpoints with similar patterns</td><td class="sev med">MEDIUM</td></tr>
    </tbody></table>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">12</span><h2>Conclusion</h2></div>
    <p>A new SDR account can read information that should not be exposed: the organization member list (PoC 2) and existing
      research batches (PoC 3). Both endpoints perform an authentication check but lack an adequate authorization check. The
      org-switch IDOR was not proven - the endpoint correctly returns 403 - and is excluded as a finding. All testing was
      read-only, with no brute force, no data changes, and no access to production accounts or data.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">13</span><h2>References</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/284.html">CWE-284 - Improper Access Control</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/285.html">CWE-285 - Improper Authorization</a></li>
      <li><a href="https://owasp.org/Top10/A01_2021-Broken_Access_Control/">OWASP A01:2021 - Broken Access Control</a></li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>