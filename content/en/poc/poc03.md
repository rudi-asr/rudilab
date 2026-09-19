---
title: "Backend Services Exposed to Public Internet"
date: "2026-08-27"
poc_num: "03"
target: "Web application (redacted)"
category: "Security Misconfiguration"
severity: "High"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-03.pcap</span> &rarr; backend services reachable from the public internet</div>
    <div class="kicker">PENETRATION TEST FINDINGS REPORT - Bug Bounty / Authorized Testing</div>
    <div class="poc-id">PoC-03</div>
    <h1>Backend Services Exposed to Public Internet</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-high">High</dd>
      <dt>CWE</dt>           <dd>CWE-668 - Exposure of Resource to Wrong Sphere</dd>
      <dt>Category</dt>      <dd>Security Misconfiguration - Network Exposure</dd>
      <dt>OWASP</dt>         <dd>A05:2021 - Security Misconfiguration</dd>
      <dt>Affected Host</dt> <dd><span class="redacted-tag">REDACTED</span> - web application stack</dd>
      <dt>Test Date</dt>     <dd><span class="redacted-tag">REDACTED</span></dd>
      <dt>Status</dt>        <dd>CONFIRMED</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Severity is researcher-assessed based on observed conditions, not a vendor rating.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Tested under a bug-bounty program - scope-strict, non-destructive,
      no-DoS. External access only; a low-privilege authenticated account was used for API-layer checks. No brute-force, no
      data modification, no destructive operations. Host, ports, product name, and PII are redacted for public release.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Summary</h2></div>
    <p>All backend services of the target - API server, object storage (S3-compatible), and database - are directly
      reachable from the public internet with no network-layer restriction. Services are bound to
      <code class="inline">0.0.0.0</code> instead of <code class="inline">127.0.0.1</code>, bypassing the nginx reverse
      proxy entirely.</p>
    <p>The reverse proxy does <strong>not</strong> act as a security boundary: while nginx returned
      <code class="inline">502 Bad Gateway</code>, the backend API remained fully accessible and accepted authenticated
      sessions directly on its native port.</p>
    <p class="muted">Stack fingerprint: Vue.js frontend · FastAPI/Uvicorn backend · MinIO object storage · PostgreSQL -
      confirmed from response headers and open ports.</p>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Authorization Status &amp; Scope</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Authorized under a bug-bounty program - scope-strict</td></tr>
      <tr><td class="k">Discovery method</td><td>External port scan + authenticated API requests</td></tr>
      <tr><td class="k">Privilege used</td><td>Low-privilege (BRANCH role) account for API-layer checks</td></tr>
      <tr><td class="k">Automated scanning</td><td>Connectivity checks only (nmap, nc, curl) - no exploitation</td></tr>
      <tr><td class="k">Brute-force</td><td class="no">NOT performed</td></tr>
      <tr><td class="k">Data modified or destroyed</td><td class="no">NO - all write operations returned 403</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
  </section>

  <section id="poc1">
    <div class="sec-head"><span class="sec-num">03</span><h2>PoC 1 - Port exposure verification</h2></div>
    <p><em>Objective:</em> show that backend service ports are reachable from the public internet.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ for port in 80 443 &lt;APP&gt; &lt;API&gt; &lt;CLONE&gt; &lt;S3&gt; &lt;DB&gt;; do
    nc -zv -w3 TARGET $port 2>&1 | grep -q succeeded \
      && echo "[$port] EXPOSED" || echo "[$port] CLOSED"
  done</span>
<span class="out">[   80] EXPOSED - nginx (default welcome page)
[  443] EXPOSED - nginx (separate application)
[&lt;APP&gt;] EXPOSED - nginx TLS (target dashboard)</span>
<span class="hl-red">[&lt;API&gt;] EXPOSED - FastAPI/Uvicorn (backend API, direct)
[&lt;CLONE&gt;] EXPOSED - nginx clone (dashboard copy)
[&lt;S3&gt;] EXPOSED - MinIO S3 API (object storage)
[&lt;DB&gt;] EXPOSED - PostgreSQL (TCP connect succeeded)</span></pre></div>
    <p>All four backend ports are reachable externally. The database port is the most critical - direct database access
      bypasses the entire application layer.</p>
  </section>

  <section id="poc2">
    <div class="sec-head"><span class="sec-num">04</span><h2>PoC 2 - API direct access &amp; nginx bypass</h2></div>
    <p><em>Objective:</em> show the backend API is reachable directly, bypassing nginx and any controls it enforces.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd"># nginx frontend is down:
$ curl -sk https://TARGET:&lt;APP&gt;/api/v1/auth/login</span>
<span class="out">502 Bad Gateway</span>

<span class="cmd"># backend answers directly on its native port:
$ curl -s http://TARGET:&lt;API&gt;/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"[REDACTED]","password":"[REDACTED]"}'</span>
<span class="hl-red">HTTP/1.1 200 OK
{ "access_token": "&lt;redacted&gt;", "token_type": "bearer", "role": "BRANCH" }</span></pre></div>
    <p>nginx returned 502, yet the backend accepted login and issued a valid JWT directly. Any IP filtering, WAF rules, or
      rate limiting at the nginx layer can be trivially bypassed by targeting the backend port directly.</p>
  </section>

  <section id="poc3">
    <div class="sec-head"><span class="sec-num">05</span><h2>PoC 3 - Public API documentation &amp; schema</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s http://TARGET:&lt;API&gt;/docs           # Swagger UI
$ curl -s http://TARGET:&lt;API&gt;/redoc          # ReDoc
$ curl -s http://TARGET:&lt;API&gt;/openapi.json | wc -c</span>
<span class="out">200  OK   (Swagger UI)
200  OK   (ReDoc)
50626     (full schema bytes)</span></pre></div>
    <p>The complete API contract - all endpoints, request/response models, parameters - is available to any unauthenticated
      party, accelerating attacker reconnaissance.</p>
  </section>

  <section id="poc4">
    <div class="sec-head"><span class="sec-num">06</span><h2>PoC 4 - MinIO health endpoints accessible</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s http://TARGET:&lt;S3&gt;/minio/health/live
$ curl -s http://TARGET:&lt;S3&gt;/minio/health/cluster
$ curl -s http://TARGET:&lt;S3&gt;/</span>
<span class="out">200 OK   (live)
200 OK   (cluster)</span>
<span class="cmd">403 AccessDenied  (bucket listing blocked - correct)</span></pre></div>
    <p>Anonymous access to health endpoints confirms the object storage service and its status. Bucket listing is correctly
      blocked (403); however, weak ACLs or credentials would expose stored objects directly via the S3 API.</p>
  </section>

  <section id="poc5">
    <div class="sec-head"><span class="sec-num">07</span><h2>PoC 5 - PostgreSQL port reachable from internet</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ nc -zv TARGET &lt;DB&gt; -w3</span>
<span class="hl-red">Connection to TARGET &lt;DB&gt; port [tcp] succeeded!</span></pre></div>
    <p>The PostgreSQL TCP handshake succeeds from the external internet. An attacker can attempt direct database
      authentication, version enumeration, and credential brute-force without ever touching the application layer. This is
      the highest-risk individual finding in this assessment.</p>
  </section>

  <section id="addl">
    <div class="sec-head"><span class="sec-num">08</span><h2>Additional Findings (same scope)</h2></div>
    <table><thead><tr><th>ID</th><th>Finding</th><th>Severity</th><th>Status</th></tr></thead><tbody>
      <tr><td>F-1</td><td>Public API docs without auth (/docs, /openapi.json)</td><td class="sev med">Medium</td><td class="st">Confirmed</td></tr>
      <tr><td>F-2</td><td>No login rate limiting - 20 requests, zero 429s</td><td class="sev med">Medium</td><td class="st">Confirmed</td></tr>
      <tr><td>F-3</td><td>MinIO health endpoints anonymous</td><td class="sev low">Low</td><td class="st">Confirmed</td></tr>
      <tr><td>F-4</td><td>Self-signed TLS certificate</td><td class="sev low">Low</td><td class="st">Confirmed</td></tr>
      <tr><td>F-5</td><td>Security headers missing (HSTS, XFO, CSP, ...)</td><td class="sev low">Low</td><td class="st">Confirmed</td></tr>
      <tr><td>F-6</td><td>Potential BOLA on /download - cross-branch unverified</td><td class="sev med">Medium*</td><td class="st">Unverified</td></tr>
      <tr><td>F-7</td><td>Debtor PII (name, address, GPS) in bulk, unmasked</td><td class="sev med">Medium</td><td class="st">Confirmed</td></tr>
      <tr><td>E-1</td><td>Change-password IDOR - blocked (403)</td><td class="sev info">-</td><td class="st">Blocked</td></tr>
      <tr><td>E-2</td><td>Role-parameter priv-esc - blocked (403)</td><td class="sev info">-</td><td class="st">Blocked</td></tr>
    </tbody></table>
    <p class="muted">F-7 raised from Low-Medium to Medium: financial-collections PII (name, address, GPS) carries elevated
      weight under Indonesia's PDP Law (UU 27/2022).</p>
  </section>

  <section id="safe">
    <div class="sec-head"><span class="sec-num">09</span><h2>Tested and found safe</h2></div>
    <table><thead><tr><th>Vector</th><th>Result</th></tr></thead><tbody>
      <tr><td>SQL injection (all tested endpoints)</td><td class="yes">SAFE - 401, parameterized queries confirmed</td></tr>
      <tr><td>CORS arbitrary origin</td><td class="yes">SAFE - no ACAO:* triggered</td></tr>
      <tr><td>Anonymous MinIO bucket listing</td><td class="yes">SAFE - 403 AccessDenied</td></tr>
      <tr><td>Path traversal</td><td class="yes">SAFE - no vulnerable endpoint</td></tr>
      <tr><td>Error / stack-trace leakage</td><td class="yes">SAFE - 422 structured error, no traceback</td></tr>
      <tr><td>TLS 1.0 / 1.1</td><td class="yes">SAFE - legacy protocols rejected</td></tr>
      <tr><td>Open self-registration</td><td class="yes">SAFE - no public registration endpoint</td></tr>
      <tr><td>IDOR change-password (E-1)</td><td class="yes">SAFE - 403</td></tr>
      <tr><td>Priv-esc via role parameter (E-2)</td><td class="yes">SAFE - 403 on all variants</td></tr>
      <tr><td>DELETE by low-privilege role</td><td class="yes">SAFE - all 403</td></tr>
    </tbody></table>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">10</span><h2>Impact</h2></div>
    <div class="callout impact"><span class="label">Impact</span>
      <strong>A. Database direct access (highest risk).</strong> Direct PostgreSQL auth attempts from the internet; weak or
      default credentials would allow a full dump without touching the API, WAF, or nginx.<br><br>
      <strong>B. API nginx bypass.</strong> Any IP allowlist, WAF rule, or rate limit at the nginx layer is ineffective -
      all endpoints are reachable directly.<br><br>
      <strong>C. Object storage exposure.</strong> Misconfigured ACLs or compromised credentials would expose stored audio
      recordings via the S3 API.<br><br>
      <strong>D. Credential-leak scenario.</strong> A leaked low-privilege credential (e.g. a former employee) allows normal
      login on the backend port, bulk PII retrieval, and download of accessible recordings - no exploit required.
    </div>
    <div class="callout notclaimed"><span class="label">Findings not claimed</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Successful database credential brute-force - not attempted.</li>
        <li>MinIO bucket data access - bucket listing returned 403, not proven exploitable.</li>
        <li>Cross-branch BOLA (F-6) - not confirmed (single branch active at test time).</li>
        <li>Any data modification or deletion - all write operations returned 403.</li>
      </ul>
    </div>
  </section>

    <section id="cvss">
    <div class="sec-head"><span class="sec-num">11</span><h2>Severity Assessment</h2></div>
    <p>Severity is researcher-assessed based on the observed conditions: the exposed service is reachable from any
      external network without authentication or user interaction, and a potential full database dump has a
      confidentiality impact that extends beyond the application's own scope. No data modification or availability
      impact was confirmed.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">12</span><h2>Root Cause</h2></div>
    <p>All backend services bind to <code class="inline">0.0.0.0</code> (all interfaces) instead of
      <code class="inline">127.0.0.1</code> (loopback), so every service is reachable on the public-facing interface with no
      firewall or security-group restriction. The nginx reverse proxy was deployed as a routing layer, not a security
      boundary, and no host-level or cloud firewall rules restrict the backend ports.</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">13</span><h2>Solution &amp; Recommendations</h2></div>
    <h3>bind services to loopback</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>config</span></div>
<pre><span class="cmd">uvicorn main:app --host 127.0.0.1 --port &lt;API&gt;   # FastAPI
MINIO_ADDRESS=127.0.0.1:&lt;S3&gt;                     # MinIO
listen_addresses = 'localhost'                   # postgresql.conf</span></pre></div>
    <h3>firewall / security group</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd"># allow from internet: only 80, 443, &lt;APP&gt;
# block from internet: &lt;API&gt; &lt;CLONE&gt; &lt;S3&gt; &lt;DB&gt;
iptables -A INPUT -p tcp --dport &lt;DB&gt; ! -s 127.0.0.1 -j DROP
# preferred: enforce at the cloud provider security-group level</span></pre></div>
    <h3>remediation priority</h3>
    <table><thead><tr><th>#</th><th>Remediation</th><th>Priority</th></tr></thead><tbody>
      <tr><td>1</td><td>Bind PostgreSQL to loopback; block DB port from internet</td><td class="sev high">HIGH</td></tr>
      <tr><td>2</td><td>Bind FastAPI and the nginx clone to loopback</td><td class="sev high">HIGH</td></tr>
      <tr><td>3</td><td>Bind MinIO to loopback / internal network</td><td class="sev high">HIGH</td></tr>
      <tr><td>4</td><td>Add branch filter to /recordings/{id}/download</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>5</td><td>Field-mask debtor PII on the recording list</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>6</td><td>Disable /docs, /redoc, /openapi.json in production</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>7</td><td>Rate limit login (e.g. 5/min per IP)</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>8</td><td>Add the missing security headers in nginx</td><td class="sev low">LOW</td></tr>
      <tr><td>9</td><td>Replace self-signed TLS with a trusted CA cert</td><td class="sev low">LOW</td></tr>
    </tbody></table>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">14</span><h2>Conclusion</h2></div>
    <p>The application's authentication and write-authorization boundaries are solid - sensitive endpoints require valid
      sessions, SQL injection is mitigated, and low-privilege writes are correctly blocked. No exploitable IDOR or privilege
      escalation was confirmed. However, the network exposure of the backend stack is a systemic risk that undermines all
      application-layer controls: the database port reachable from the public internet is the highest-priority item and
      needs immediate remediation. All testing was read-only, non-destructive, and authorized.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">15</span><h2>References</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/668.html">CWE-668 - Exposure of Resource to Wrong Sphere</a></li>
      <li><a href="https://owasp.org/Top10/A05_2021-Security_Misconfiguration/">OWASP A05:2021 - Security Misconfiguration</a></li>
      <li>UU No. 27 Tahun 2022 - Pelindungan Data Pribadi</li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>