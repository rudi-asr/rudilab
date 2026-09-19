---
title: "Broken Access Control via LOV Sub-Endpoints"
date: "2026-09-16"
poc_num: "07"
target: "[REDACTED] - internal ERP (authorized assessment)"
category: "Web Application"
severity: "Medium"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-07.pcap</span> &rarr; authz bypass via LOV sub-endpoints</div>
    <div class="kicker">SECURITY RESEARCH CASE STUDY - Authorized assessment &middot; coordinated disclosure</div>
    <div class="poc-id">PoC-07</div>
    <h1>Broken Access Control via LOV Sub-Endpoints</h1>
    <p>Akun terautentikasi dengan hak akses rendah dapat membaca data karyawan dan klien yang dibatasi melalui sub-endpoint List-of-Values (LOV) yang tidak dicakup kontrol akses tingkat menu aplikasi.</p>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-med">Medium</dd>
      <dt>CWE</dt>           <dd>CWE-862 - Missing Authorization</dd>
      <dt>CWE Secondary</dt> <dd>CWE-200 - Exposure of Sensitive Information</dd>
      <dt>OWASP</dt>         <dd>A01:2021 - Broken Access Control / API5:2023 - BFLA</dd>
      <dt>Category</dt>      <dd>Web Application / API Authorization</dd>
      <dt>Test Date</dt>     <dd>2026-09-16</dd>
      <dt>Target</dt>        <dd><span class="redacted-tag">REDACTED</span> - internal ERP</dd>
      <dt>Status</dt>        <dd>CONFIRMED</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Testing was performed under an authorized assessment
      with owner-confirmed scope. No accounts were compromised, no data was exfiltrated, and rate limits were
      respected. The fix was applied by the owner before this sanitized write-up was published with consent.
      Target and all data are redacted - the organization is not identified in this document.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan</h2></div>
    <p>Aplikasi menerapkan akses berdasarkan izin menu (misalnya, sebuah peran dapat memiliki <code class="inline">master.employee.view</code> tetapi tidak <code class="inline">master.client.view</code>). Namun, endpoint LOV yang mendukung menu tersebut tidak diperiksa secara individual - sesi terautentikasi apapun dapat mengakses semua entri LOV terlepas dari perannya.</p>
    <p>However, several LOV (List-of-Values) sub-endpoints - the lightweight lookups used to populate
      dropdowns - do not enforce the same menu check. They returned <code class="inline">200 OK</code> and
      disclosed data the role was never meant to see: staff identities (name, email, position) and the
      client list. Access control is enforced on the parent resource but missed on the sub-resource.</p>
  </section>

  <section id="preconditions">
    <div class="sec-head"><span class="sec-num">02</span><h2>Prasyarat</h2></div>
    <ul class="tight">
      <li>A single valid, low-privilege authenticated account (obtained legitimately).</li>
      <li>The account's role lacks the menu for the target resource (e.g. <code class="inline">master.employee</code>).</li>
      <li>The LOV / derived sub-endpoints are reachable (they back the front-end dropdowns).</li>
    </ul>
  </section>

  <section id="poc">
    <div class="sec-head"><span class="sec-num">03</span><h2>Langkah-langkah PoC</h2></div>
    <ol class="tight">
      <li>Authenticate as the low-privilege user and obtain a valid <code class="inline">accessToken</code>.</li>
      <li>Confirm the parent resource is correctly denied:
        <code class="inline">GET /employees</code> &rarr; <code class="inline">403 Forbidden</code>.</li>
      <li>Call the LOV sub-endpoint with the same token: <code class="inline">GET /employees/lov</code>.</li>
      <li>Observe <code class="inline">200 OK</code> returning a list of identities (name, email, position).</li>
      <li>Repeat for related resources: <code class="inline">GET /clients/lov</code>,
        <code class="inline">GET /clients/tiers</code> &rarr; <code class="inline">200 OK</code>.</li>
      <li>Confirm record-level access is still enforced:
        <code class="inline">GET /employees/{id}</code> &rarr; <code class="inline">403</code> (correct).</li>
    </ol>
    <p>Sanitized transcript (identities and target removed):</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>http</span></div>
<pre><span class="cmt"># parent resources - correctly blocked</span>
GET /employees   &rarr; <span class="hl-red">403 Forbidden</span>  <span class="cmt">(menu master.employee)</span>
GET /clients     &rarr; <span class="hl-red">403 Forbidden</span>  <span class="cmt">(menu master.client)</span>

<span class="cmt"># LOV sub-endpoints - authorization bypass</span>
GET /employees/lov &rarr; <span class="out">200 OK</span>
  [ { "id":"<span class="hl-red">[REDACTED]</span>", "name":"<span class="hl-red">[REDACTED]</span>",
      "email":"<span class="hl-red">[REDACTED]</span>", "position":"<span class="hl-red">[REDACTED]</span>" }, ... ]
GET /clients/lov   &rarr; <span class="out">200 OK</span>
  [ { "code":"<span class="hl-red">[REDACTED]</span>", "name":"<span class="hl-red">[REDACTED]</span>" }, ... ]
GET /clients/tiers &rarr; <span class="out">200 OK</span>

<span class="cmt"># record-level - correctly blocked (positive control)</span>
GET /employees/{id} &rarr; <span class="hl-red">403 Forbidden</span>
GET /clients/{id}   &rarr; <span class="hl-red">403 Forbidden</span></pre></div>
    <p class="muted">All identifying values (target host, staff names, emails, client names) are redacted.
      Only HTTP status codes and generic REST paths are shown - enough to reproduce the logic without
      exposing data.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">04</span><h2>Dampak</h2></div>
    <p>Disclosure of internal PII (staff names, emails, positions) and the business entity list to a role
      that is explicitly denied that data. In practice this fuels targeted phishing and internal OSINT, and
      supplies input for account-enumeration attempts. It did not lead to account takeover during testing
      (credential controls held), so impact is confined to confidentiality - consistent with the
      Medium rating.</p>
    <div class="callout impact"><span class="label">Impact</span>
      Unauthorized read of staff identities and client records by a denied role; enables phishing and
      OSINT against the organization. No integrity or availability impact observed.
    </div>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">05</span><h2>Akar Masalah</h2></div>
    <p>Authorization is applied per-endpoint, by hand, and only wired onto the parent resource handler.
      Derived sub-endpoints (<code class="inline">/lov</code>, <code class="inline">/tiers</code>) were registered
      without the same menu guard. Because the check is not enforced centrally at the router/resource
      level, any sub-path added later inherits no protection by default - the classic shape of Broken
      Function Level Authorization.</p>
  </section>

  <section id="solution">
    <div class="sec-head"><span class="sec-num">06</span><h2>Solution</h2></div>
    <p>Enforce authorization at the router/resource level so it applies to every sub-path, and return
      only the minimum fields a lookup needs.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>before - vulnerable</span></div>
<pre><span class="cmt">// guard only on the parent; sub-routes slip through</span>
router.get('/employees',       requireMenu('master.employee'), listEmployees)
router.get('/employees/lov',   listEmployeesLov)   <span class="hl-red">// no guard &rarr; 200 leak</span>
router.get('/clients/lov',     listClientsLov)     <span class="hl-red">// no guard &rarr; 200 leak</span>

<span class="cmt">// LOV returns full records, including PII</span>
return rows.map(e =&gt; ({ id:e.id, name:e.name, email:e.email, position:e.position }))</pre></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>after - fixed</span></div>
<pre><span class="cmt">// guard at router level &rarr; covers parent + /lov + /tiers</span>
const employees = Router()
employees.use(requireMenu('master.employee'))
employees.get('/',    listEmployees)
employees.get('/lov', listEmployeesLov)
<span class="cmt">// idem: clients &rarr; requireMenu('master.client')</span>

<span class="cmt">// least-privilege lookup: id + label only, no PII</span>
return rows.map(e =&gt; ({ id:e.id, label:e.name }))</pre></div>
    <div class="callout fix"><span class="label">Remediation</span>
      Framework shown is illustrative - apply the equivalent guard in your stack. Add a regression test:
      a role without the menu must receive 403 on the parent <em>and</em> every sub-endpoint
      (<code class="inline">/lov</code>, <code class="inline">/tiers</code>).
    </div>
  </section>

  <section id="disclosure">
    <div class="sec-head"><span class="sec-num">07</span><h2>Kronologi Pengungkapan</h2></div>
    <ul class="tight">
      <li><strong>Day 0</strong> - Finding identified during an authorized assessment; reported to the system owner.</li>
      <li><strong>Coordinated</strong> - Per owner communication, the fix was applied (authorization guard extended to sub-endpoints and LOV payloads minimized); not independently re-verified by the researcher.</li>
      <li><strong>Publication</strong> - This sanitized write-up published with owner consent. Target and all data redacted.</li>
    </ul>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">08</span><h2>Referensi</h2></div>
    <ul class="tight">
      <li><a href="https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/" rel="noopener">OWASP Top 10 - A01 Broken Access Control</a></li>
      <li><a href="https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/" rel="noopener">OWASP API Security - API5:2023 Broken Function Level Authorization</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/285.html" rel="noopener">CWE-285 - Improper Authorization</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/200.html" rel="noopener">CWE-200 - Exposure of Sensitive Information</a></li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>