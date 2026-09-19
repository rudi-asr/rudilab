---
title: "Missing Anti-Framing & Login Brute-Force Protection"
date: "2026-09-03"
poc_num: "05"
target: "[REDACTED] - production web dashboard (financial-collections app)"
category: "Web Application"
severity: "Medium"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-05.pcap</span> &rarr; missing anti-framing &amp; login rate-limit</div>
    <div class="kicker">PENETRATION TEST FINDINGS REPORT - Authorized Testing</div>
    <div class="poc-id">PoC-05</div>
    <h1>Missing Anti-Framing Headers &amp; Absent Login Rate-Limiting</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-med">Medium</dd>
      <dt>CWE Primary</dt>   <dd>CWE-1021 - Improper Restriction of Rendered UI Layers</dd>
      <dt>CWE Secondary</dt> <dd>CWE-307 - Improper Restriction of Excessive Authentication Attempts</dd>
      <dt>OWASP</dt>         <dd>A05:2021 - Security Misconfiguration</dd>
      <dt>Affected Host</dt> <dd><span class="redacted-tag">REDACTED</span> - production web dashboard</dd>
      <dt>Test Date</dt>     <dd>2026-09-03</dd>
      <dt>Status</dt>        <dd>CONFIRMED - live execution</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Severity is researcher-assessed based on observed conditions, not a vendor rating.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> All commands and output below were executed against a live target under
      written authorization, within an agreed scope (no denial-of-service, no data modification, no credential compromise).
      Host, product name, and any personal data are redacted for public release. This is a sanitized methodology showcase,
      not the confidential client deliverable.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Summary</h2></div>
    <p>The target's login interface ships <strong>no browser-side framing protection</strong> (no
      <code class="inline">X-Frame-Options</code>, no <code class="inline">CSP: frame-ancestors</code>), allowing the login
      page to be embedded in an attacker-controlled <code class="inline">&lt;iframe&gt;</code> for clickjacking. Independently,
      the login API enforces <strong>no rate-limiting or lockout</strong>, leaving it open to unthrottled credential
      brute-force and password spraying. Both were confirmed by live execution.</p>
    <p class="muted">A secondary review of the public JavaScript bundle surfaced sensitive logic and PII handling that should
      live server-side - recorded as lower-severity latent risks that amplify the two primary findings.</p>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Authorization Status &amp; Scope</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Authorized testing - scope-strict, no-DoS</td></tr>
      <tr><td class="k">Discovery method</td><td>Black-box, external, actual command execution</td></tr>
      <tr><td class="k">Authentication bypassed</td><td class="no">NO - no credentials compromised</td></tr>
      <tr><td class="k">Testing environment</td><td>Production, no data modification</td></tr>
      <tr><td class="k">Evidence</td><td>Actual command transcript - not reconstructed, not simulated</td></tr>
      <tr><td class="k">Data modified or destroyed</td><td class="no">NO</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
  </section>

  <section id="overview">
    <div class="sec-head"><span class="sec-num">03</span><h2>Findings overview</h2></div>
    <table><thead><tr><th>#</th><th>Finding</th><th>Severity</th><th>Status</th></tr></thead><tbody>
      <tr><td>1</td><td>Clickjacking - login page can be framed</td><td class="sev med">Medium</td><td class="st">PROVEN</td></tr>
      <tr><td>2</td><td>No brute-force / rate-limit on login</td><td class="sev med">Medium</td><td class="st">PROVEN</td></tr>
      <tr><td>3</td><td>Self-signed TLS certificate</td><td class="sev low">Low</td><td class="st">CONFIRMED</td></tr>
      <tr><td>4</td><td>Server version disclosure</td><td class="sev info">Info</td><td class="st">CONFIRMED</td></tr>
      <tr><td>+</td><td>Sensitive logic &amp; PII in front-end bundle</td><td class="sev low">Low</td><td class="st">CONFIRMED</td></tr>
    </tbody></table>
  </section>

  <section id="f1">
    <div class="sec-head"><span class="sec-num">04</span><h2>Finding 1 - Clickjacking via missing framing headers <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed. Clickjacking requires the victim to interact with the page; impact is limited and user-gated.</p>
    <h3><span class="step-n">step 1 -</span> verify security headers</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -k -sS -D - -o /dev/null https://TARGET/login | head -20</span>
<span class="out">HTTP/1.1 200 OK
Server: nginx/1.28.x (Ubuntu)
Content-Type: text/html
Connection: keep-alive</span>
<span class="hl-red">(no X-Frame-Options)
(no Content-Security-Policy)
(no Strict-Transport-Security)
(no X-Content-Type-Options)</span></pre></div>
    <p>The server returns 200 OK with default nginx headers and none of the anti-framing controls. The browser receives no
      instruction preventing this page from loading in an iframe on any origin.</p>
    <h3><span class="step-n">step 2 -</span> corroborate with nuclei</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ nuclei -u https://TARGET -silent -t http/ -timeout 10 -c 15</span>
<span class="hl-red">[http-missing-security-headers:x-frame-options]        [info]
[http-missing-security-headers:content-security-policy] [info]
[http-missing-security-headers:strict-transport-security] [info]</span>
<span class="out">[waf-detect:nginxgeneric] [info]
[self-signed-ssl] [ssl] [low]</span></pre></div>
    <h3><span class="step-n">step 3 -</span> proof-of-concept frame</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>attacker page - clickjack.html</span></div>
<pre><span class="cmt"># target embedded in a transparent overlay</span>
&lt;div style="position:relative;width:460px;height:480px"&gt;
  &lt;iframe src="https://TARGET/login"
          style="position:absolute;inset:0;width:460px;height:480px;border:0"&gt;
  &lt;/iframe&gt;
&lt;/div&gt;
<span class="cmt"># rendered in headless Chrome - accessibility snapshot:</span>
<span class="out">iframe
 └─ heading  "Dashboard"
 └─ textbox  "Username"
 └─ textbox  "Password"
 └─ button   "Sign in"</span></pre></div>
    <p>The login form renders fully inside the attacker's iframe. An attacker can overlay decoy UI to trick an authenticated
      user into unintended actions on the real interface (UI redress / clickjacking).</p>
    <figure><img src="poc-05-clickjack.png" alt="Target login page rendered inside an attacker-controlled iframe; product name and logo redacted" /><figcaption>Figure 1 - the target login page rendered inside an attacker-controlled iframe (product name and logo redacted). The red dashed border marks the attacker page's iframe container.</figcaption></figure>
    <div class="callout fix"><span class="label">Remediation</span>
      Return <code class="inline">Content-Security-Policy: frame-ancestors 'none'</code> (or an explicit allow-list) and
      <code class="inline">X-Frame-Options: DENY</code> for legacy browsers on every response. Add
      <code class="inline">Strict-Transport-Security</code> and <code class="inline">X-Content-Type-Options: nosniff</code>.
    </div>
  </section>

  <section id="f2">
    <div class="sec-head"><span class="sec-num">05</span><h2>Finding 2 - No brute-force protection on login <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed. The login endpoint is unauthenticated, without rate-limit or lockout, enabling credential brute-force.</p>
    <h3><span class="step-n">step 1 -</span> repeated failed logins, same source</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ for i in $(seq 1 20); do
    curl -k -sS -o /dev/null -w "%{http_code} " \
      -X POST https://TARGET/api/v1/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"username":"admin","password":"wrong'$i'"}'
  done</span>
<span class="out">401 401 401 401 401 401 401 401 401 401
401 401 401 401 401 401 401 401 401 401</span>
<span class="hl-red"># 20 consecutive failures - no 429, no lockout, no delay</span></pre></div>
    <h3><span class="step-n">step 2 -</span> confirm no rate-limit ceiling</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ seq 1 60 | xargs -P10 -I{} curl -k -sS -o /dev/null -w "%{http_code}\n" \
    -X POST https://TARGET/api/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"kolektor","password":"x{}"}' | sort | uniq -c</span>
<span class="out">     60 401</span>
<span class="hl-red"># 60 parallel attempts, still 100% served - no throttling</span></pre></div>
    <h3><span class="step-n">step 3 -</span> default-credentials probe</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="out">admin / admin      -> 401
admin / password   -> 401
superadmin / admin -> 401</span>
<span class="cmt"># no default credentials in use - good. brute-force surface remains open.</span></pre></div>
    <div class="callout fix"><span class="label">Remediation</span>
      Enforce server-side rate-limiting per IP and per account, return 429 beyond a threshold, add exponential backoff and
      temporary lockout, and log/alert on bursts. Pair with CAPTCHA or MFA on the authentication path.
    </div>
  </section>

  <section id="f34">
    <div class="sec-head"><span class="sec-num">06</span><h2>Findings 3 &amp; 4 - TLS &amp; version disclosure <span style="color:var(--cyan);font-family:var(--mono);font-size:14px;">[Low / Info]</span></h2></div>
    <p><strong>Self-signed TLS certificate.</strong> Clients cannot validate server identity and users are conditioned to
      bypass certificate warnings, weakening resistance to an on-path MitM. <span class="muted">Rated Low: requires a
      privileged network position.</span></p>
    <p><strong>Server version disclosure.</strong> The <code class="inline">Server</code> header, error pages, and SSH banner
      expose exact versions, handing an attacker a precise target to match against known CVEs. <span class="muted">Rated
      Info: reconnaissance value only.</span> Remediation: <code class="inline">server_tokens off</code> and minimize banners.</p>
  </section>

  <section id="fplus">
    <div class="sec-head"><span class="sec-num">07</span><h2>Finding + - Sensitive logic &amp; PII in the front-end bundle <span style="color:var(--cyan);font-family:var(--mono);font-size:14px;">[Low]</span></h2></div>
    <p class="muted">Source: the application's JavaScript bundle is downloadable unauthenticated. Static review revealed design
      choices that belong on the server. Reported as a latent risk that amplifies findings 1 and 2.</p>
    <h3>a - role logic enforced client-side</h3>
    <p>Role names and access hierarchy (including a role that bypasses all client-side guards) are implemented in the bundle.
      Any visitor can read the full role model, and client-side role checks can be bypassed by editing local state.
      Authorization must be enforced server-side on every privileged route.</p>
    <h3>b - PII passed through URL query parameters</h3>
    <p>Record detail views pass debtor PII - name, address, GPS coordinates - as URL query parameters, which land in server
      access logs, browser history, and the Referer header.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>observed pattern (values redacted)</span></div>
<pre><span class="hl-red">/records/&lt;id&gt;/play?name=&lt;REDACTED&gt;&amp;customerid=&lt;REDACTED&gt;
   &amp;lat=&lt;REDACTED&gt;&amp;long=&lt;REDACTED&gt;&amp;address=&lt;REDACTED&gt;</span>
<span class="cmt"># PII should never travel in the URL - fetch by ID, return in the HTTPS body</span></pre></div>
    <h3>c - user profile (incl. role) in localStorage</h3>
    <p>The authenticated profile, including role, is persisted in <code class="inline">localStorage</code> where it is
      trivially readable and editable - the mechanism by which the client-side role checks in (a) are defeated.</p>
    <div class="callout fix"><span class="label">Remediation</span>
      Move all authorization to the backend; treat the front-end as untrusted. Fetch records by ID and return data only in
      the response body. Keep no authoritative role/permission data in localStorage; rely on short-lived, server-validated tokens.
    </div>
  </section>

  <section id="safe">
    <div class="sec-head"><span class="sec-num">08</span><h2>Tested and found safe</h2></div>
    <table><thead><tr><th>Vector</th><th>Result</th></tr></thead><tbody>
      <tr><td>SQL injection on login</td><td class="yes">SAFE - generic 401, no error reflection, no bypass</td></tr>
      <tr><td>Path traversal on record endpoints</td><td class="yes">SAFE - 404 from API; 200s were SPA fallback</td></tr>
      <tr><td>CORS origin reflection</td><td class="yes">SAFE - no Access-Control-Allow-Origin reflected</td></tr>
      <tr><td>Username enumeration via timing</td><td class="no">INCONCLUSIVE - network jitter dominates</td></tr>
      <tr><td>Sensitive file exposure (.env, .git, backups)</td><td class="yes">SAFE - all 200s were SPA fallback</td></tr>
      <tr><td>Hardcoded secrets in JS bundle</td><td class="yes">SAFE - no keys, JWTs, or private keys found</td></tr>
    </tbody></table>
  </section>

  <section id="notclaimed">
    <div class="sec-head"><span class="sec-num">09</span><h2>Findings not claimed</h2></div>
    <div class="callout notclaimed"><span class="label">Scope of claims</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>No credentials were compromised; no authentication bypass is claimed.</li>
        <li>The timing side-channel for username enumeration was not confirmed - inconclusive, reported as such.</li>
        <li>Client-side role-check bypass is demonstrable in principle, but no privileged server-side action was performed, so no privilege-escalation impact is asserted beyond the latent risk described.</li>
        <li>No data was read, modified, or exfiltrated. PII patterns are inferred from front-end code, not from retrieved records.</li>
      </ul>
    </div>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">10</span><h2>Conclusion</h2></div>
    <p>Two Medium findings - clickjacking via missing framing headers and an unthrottled login endpoint - were proven by live
      execution. The front-end architecture issues (client-side role logic, PII in URLs, localStorage) are latent risks that
      amplify the impact if either Medium finding is exploited. No production data was modified, no credentials were
      compromised, and testing stayed within the agreed no-DoS, scope-strict boundary.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">11</span><h2>References</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/1021.html">CWE-1021 - Improper Restriction of Rendered UI Layers (Clickjacking)</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/307.html">CWE-307 - Improper Restriction of Excessive Authentication Attempts</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/598.html">CWE-598 - Use of GET Request With Sensitive Query Strings</a></li>
      <li><a href="https://owasp.org/Top10/A05_2021-Security_Misconfiguration/">OWASP A05:2021 - Security Misconfiguration</a></li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>


</body>
</html>