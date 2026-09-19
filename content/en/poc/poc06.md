---
title: "WordPress Institutional Site & Academic Portal Assessment"
date: "2026-09-06"
poc_num: "06"
target: "[REDACTED] - Indonesian higher-education institution (WordPress + academic portals)"
category: "Web Application"
severity: "Medium (highest) - 9 findings"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-06.pcap</span> &rarr; WordPress institutional site + academic portals</div>
    <div class="kicker">SECURITY RESEARCH CASE STUDY - Independent research &middot; coordinated disclosure</div>
    <div class="poc-id">PoC-06</div>
    <h1>WordPress Institutional Site &amp; Academic Portal Assessment</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-med">Medium (highest) &middot; 9 findings total</dd>
      <dt>Breakdown</dt>     <dd>4 Medium &middot; 3 Low &middot; 2 Info</dd>
      <dt>CWE</dt>           <dd>CWE-79, CWE-307, CWE-918, CWE-200, CWE-693</dd>
      <dt>OWASP</dt>         <dd>A05:2021 &middot; A07:2021</dd>
      <dt>Affected Host</dt> <dd><span class="redacted-tag">REDACTED</span> - Indonesian higher-education institution (WordPress + academic portals)</dd>
      <dt>Report Date</dt>   <dd>2026-09-06</dd>
      <dt>Status</dt>        <dd>CONFIRMED - UNREMEDIATED</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Severity is researcher-assessed based on observed conditions, not a vendor rating.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Independent security research under coordinated disclosure. Testing was
      scope-limited (no denial-of-service, no destructive testing, brute-force attempts capped at &le;6 with delays) and
      non-destructive - no data was modified, exfiltrated, or deleted. The institution name, domains, IP address, and
      subdomains are redacted for public release; findings are published as weakness classes, not as a map to a system whose
      issues remain open. This is a sanitized case study, not the confidential client deliverable.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Executive Summary</h2></div>
    <p>A higher-education institution's public website - built on WordPress over LiteSpeed, behind an OpenResty anti-bot
      reverse proxy - was assessed together with two academic portals on the same infrastructure: an academic information
      system (SIAKAD) and a computer-based testing platform (CBT).</p>
    <p>The assessment produced <strong>four Medium findings</strong> (including two unthrottled login endpoints on the academic
      applications), <strong>three Low findings</strong>, and <strong>two informational findings</strong>. No Critical or High
      findings were identified, and no remote code execution or full compromise was achieved.</p>
    <p class="muted">Note on methodology: the site is protected by an effective OpenResty anti-bot layer that blocks automated
      scanners and headless browsers. The advanced test phase used a non-headless browser with a genuine fingerprint to pass
      the challenge, so the full attack surface could be verified. That the control was bypassable by a real browser is
      itself recorded as a finding (A7), framed as a positive control with a stated limitation.</p>
  </section>

  <section id="riskmap">
    <div class="sec-head"><span class="sec-num">02</span><h2>Risk Map</h2></div>
    <table><thead><tr><th>ID</th><th>Severity</th><th>Finding</th><th>CWE</th></tr></thead><tbody>
      <tr><td>A1</td><td class="sev med">Medium</td><td>Slider plugin in a version range affected by a published Stored XSS CVE</td><td>CWE-79</td></tr>
      <tr><td>A2</td><td class="sev med">Medium</td><td>XML-RPC enabled - brute-force amplification (multicall) + SSRF (pingback)</td><td>CWE-307/918</td></tr>
      <tr><td>A8</td><td class="sev med">Medium</td><td>SIAKAD login without rate-limit/CAPTCHA + open directory listing</td><td>CWE-307/200</td></tr>
      <tr><td>A9</td><td class="sev med">Medium</td><td>CBT admin/participant login without rate-limit (brute-forceable)</td><td>CWE-307</td></tr>
      <tr><td>A3</td><td class="sev low">Low</td><td>User enumeration via REST API - admin username exposed</td><td>CWE-200</td></tr>
      <tr><td>A4</td><td class="sev low">Low</td><td>Information disclosure - plugin/theme versions publicly readable</td><td>CWE-200</td></tr>
      <tr><td>A5</td><td class="sev low">Low</td><td>Incomplete security headers on public pages</td><td>CWE-693</td></tr>
      <tr><td>A6</td><td class="sev info">Info</td><td>Subdomain discovery (academic portals reachable directly)</td><td>-</td></tr>
      <tr><td>A7</td><td class="sev info">Info</td><td>Anti-bot WAF effective - positive control (bypassable via non-headless browser)</td><td>CWE-693</td></tr>
    </tbody></table>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">03</span><h2>Authorization Status &amp; Scope</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Independent research - coordinated disclosure</td></tr>
      <tr><td class="k">Discovery method</td><td>DNS/certificate transparency, HTTP fingerprinting, REST/XML-RPC inspection</td></tr>
      <tr><td class="k">Authentication bypassed</td><td class="no">NO - no credentials compromised</td></tr>
      <tr><td class="k">Brute-force</td><td class="no">Capped at &le;6 attempts with delays - proof of missing control only</td></tr>
      <tr><td class="k">Testing environment</td><td>Production, read-only, non-destructive, no-DoS</td></tr>
      <tr><td class="k">Data modified or destroyed</td><td class="no">NO</td></tr>
      <tr><td class="k">Cleanup</td><td class="yes">YES - test browser closed, temp files removed</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
  </section>

  <section id="method">
    <div class="sec-head"><span class="sec-num">04</span><h2>Methodology &amp; Tools</h2></div>
    <table><thead><tr><th>Phase</th><th>Tools &amp; technique</th></tr></thead><tbody>
      <tr><td class="k">Recon</td><td>dig, certificate transparency, curl - DNS &amp; HTTP fingerprinting</td></tr>
      <tr><td class="k">Enumeration</td><td>REST API (rest_route), readme/style metadata, robots/sitemap, xmlrpc, tech-detect</td></tr>
      <tr><td class="k">CVE mapping</td><td>NVD, Wordfence, Patchstack, GitHub Advisory - version vs CVE database</td></tr>
      <tr><td class="k">Exploitation</td><td>XML-RPC POST (recon + post-bypass); non-headless Chrome via CDP; manual subdomain inspection</td></tr>
      <tr><td class="k">WAF bypass</td><td>Headless + CDP stealth (failed) &rarr; non-headless browser with genuine fingerprint (passed challenge)</td></tr>
      <tr><td class="k">Scope limit</td><td>No-DoS, non-destructive; brute-force &le;6 attempts; cleanup afterwards</td></tr>
    </tbody></table>
  </section>

  <section id="a1">
    <div class="sec-head"><span class="sec-num">05</span><h2>A1 - Slider plugin: version affected by published Stored XSS CVE <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed.</p>
    <p>A slider plugin is installed in a version that falls within the affected range of a published Stored XSS CVE (fixed in
      the next patch release). The vulnerability allows an authenticated attacker with Contributor-or-higher role to inject
      script via a block attribute. The plugin is active on the front end. Public registration is open, though the default
      role is subscriber.</p>
    <h3><span class="step-n">step 1 -</span> confirm version from public metadata</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s https://TARGET/wp-content/plugins/&lt;slider-plugin&gt;/readme.txt | grep -i "stable tag"</span>
<span class="hl-red">Stable tag: &lt;affected-version&gt;   # within CVE affected range; patch is the next point release</span></pre></div>
    <p>Version confirmed against the plugin's public readme, then matched to the CVE's affected range. Front-end asset loading
      confirms the plugin is active.</p>
    <div class="callout impact"><span class="label">Impact</span>
      An attacker with Contributor+ access could steal an admin session cookie, deface pages, or escalate to admin. Chains with
      A2 (XML-RPC brute-force amplification) and A3 (admin username known).
    </div>
    <div class="callout notclaimed"><span class="label">Findings not claimed</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Full exploitation not performed - it requires a Contributor+ account, which was not available.</li>
        <li>No script was injected and no session was stolen; the finding is version-confirmed, not weaponized.</li>
      </ul>
    </div>
    <div class="callout fix"><span class="label">Remediation</span>
      Update the plugin to the patched release and enable plugin auto-update. Disable public registration or keep the default
      role strictly at subscriber.
    </div>
  </section>

  <section id="a2">
    <div class="sec-head"><span class="sec-num">06</span><h2>A2 - XML-RPC enabled: brute-force amplification + SSRF <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed.</p>
    <p>The XML-RPC endpoint is enabled and exposes <code class="inline">system.multicall</code> and
      <code class="inline">pingback.ping</code>. In the post-bypass phase, <code class="inline">system.multicall</code> was
      shown to execute multiple <code class="inline">wp.getUsersBlogs</code> login attempts in a single HTTP request -
      brute-force amplification confirmed. The response returned multiple authentication faults within one response body.</p>
    <h3><span class="step-n">step 1 -</span> endpoint &amp; method enumeration</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s https://TARGET/xmlrpc.php                 # GET -> 405 (endpoint alive)
$ curl -s -X POST https://TARGET/xmlrpc.php \
    -d '&lt;methodCall&gt;&lt;methodName&gt;system.listMethods&lt;/methodName&gt;&lt;/methodCall&gt;'</span>
<span class="out">200 OK -> methods include: system.multicall, pingback.ping, wp.getUsersBlogs, ...</span></pre></div>
    <h3><span class="step-n">step 2 -</span> amplification proof (capped, non-destructive)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>xml (structure only)</span></div>
<pre><span class="cmt"># one HTTP request wrapping several wp.getUsersBlogs attempts</span>
&lt;methodCall&gt;&lt;methodName&gt;system.multicall&lt;/methodName&gt;
  &lt;params&gt;&lt;param&gt;&lt;value&gt;&lt;array&gt;&lt;data&gt;
    <span class="cmt">&lt;!-- N x wp.getUsersBlogs(user, wrong-pass-i) --&gt;</span>
  &lt;/data&gt;&lt;/array&gt;&lt;/value&gt;&lt;/param&gt;&lt;/params&gt;
&lt;/methodCall&gt;
<span class="hl-red"># response: multiple auth faults in ONE response = N login attempts per request</span></pre></div>
    <div class="callout impact"><span class="label">Impact</span>
      Brute-force amplification: many login attempts per single request, evading naive per-request rate limits.
      <code class="inline">pingback.ping</code> additionally enables SSRF, forcing the server to make requests to
      attacker-chosen hosts.
    </div>
    <div class="callout fix"><span class="label">Remediation</span>
      Disable XML-RPC entirely (block <code class="inline">xmlrpc.php</code> at the WAF/LiteSpeed layer or via filter). If it
      must stay, IP-allowlist it and disable <code class="inline">system.multicall</code> and
      <code class="inline">pingback.ping</code>.
    </div>
  </section>

  <section id="a8">
    <div class="sec-head"><span class="sec-num">07</span><h2>A8 - Academic system (SIAKAD): login without rate-limit + directory listing <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed.</p>
    <p>The academic information system's login form has no brute-force protection - no CAPTCHA, rate-limit, CSRF token, or
      lockout - and directory listing is enabled on two paths, exposing the application's file structure.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s -X POST https://siakad.TARGET/login.php \
    -d 'username=&lt;user&gt;&amp;pass=&lt;wrong&gt;&amp;login=Login' -o /dev/null -w "%{http_code}\n"</span>
<span class="hl-red">200   # error message returned, NO lockout, NO delay, NO CSRF token</span>
<span class="cmd">$ curl -s https://siakad.TARGET/public/ | grep -i "index of"</span>
<span class="hl-red">&lt;h1&gt;Index of /public/&lt;/h1&gt;     # directory listing enabled (also on /assets/)</span></pre></div>
    <figure><img src="/images/img-poc/poc06/poc06.jpg" alt="SIAKAD directory listing, contents redacted" /><figcaption>Figure 1 - SIAKAD directory listing exposed on the academic system, contents redacted.</figcaption></figure>
    <p class="muted">Negative checks: <code class="inline">.git/config</code> returned 403; <code class="inline">config.php</code>,
      <code class="inline">.env</code>, and DB-connection files returned 404 - not leaked.</p>
    <div class="callout impact"><span class="label">Impact</span>
      Unthrottled credential brute-force against student/lecturer/admin accounts. Directory listing discloses internal
      structure. Academic data is potentially exposed if an account is compromised.
    </div>
    <div class="callout fix"><span class="label">Remediation</span>
      Add rate-limiting, CAPTCHA, and account lockout on the login form; add a CSRF token; disable directory listing
      (e.g. <code class="inline">Options -Indexes</code>).
    </div>
  </section>

  <section id="a9">
    <div class="sec-head"><span class="sec-num">08</span><h2>A9 - Testing platform (CBT): admin/participant login without rate-limit <span style="color:var(--amber);font-family:var(--mono);font-size:14px;">[Medium]</span></h2></div>
    <p class="muted">Severity: Medium - researcher-assessed.</p>
    <p>The computer-based testing platform exposes an admin login endpoint and a participant login endpoint, neither with
      rate-limit, CAPTCHA, or lockout. A path-traversal attempt on a media handler was blocked by the WAF (403) - no LFI was
      demonstrated.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s -X POST https://cbt.TARGET/admin/&lt;login-endpoint&gt; \
    -d 'email=&lt;user&gt;&amp;password=&lt;wrong&gt;' -o /dev/null -w "%{http_code}\n"</span>
<span class="hl-red">200   # error message, NO lockout, NO rate-limit, NO CSRF token</span>
<span class="cmd">$ curl -s "https://cbt.TARGET/&lt;media-handler&gt;?module=../../../../etc/passwd" -o /dev/null -w "%{http_code}\n"</span>
<span class="out">403   # blocked by WAF - no LFI demonstrated</span></pre></div>
    <div class="callout impact"><span class="label">Impact</span>
      Unthrottled brute-force against exam-admin and participant accounts. Sensitive exam data (questions, answers, scores) is
      at risk; admin access would allow manipulation of exam data and leakage of questions.
    </div>
    <div class="callout fix"><span class="label">Remediation</span>
      Add rate-limiting, CAPTCHA, and lockout on all login endpoints; add CSRF tokens; consider 2FA for admin accounts.
    </div>
  </section>

  <section id="lowinfo">
    <div class="sec-head"><span class="sec-num">09</span><h2>A3-A5 - Low-severity findings</h2></div>
    <h3>A3 - User enumeration via REST API [Low]</h3>
    <p>The WordPress REST users endpoint returns registered users without authentication, exposing the admin username. Confirmed
      via the author-query redirect behaviour (existing author returns 200, non-existing returns 404). Impact: half the
      admin credential is known, enabling targeted brute-force (worsened by A2) and password spraying. Remediation: restrict
      <code class="inline">/wp/v2/users</code> to authenticated users, disable the author-query redirect, and rename the admin
      account to something non-obvious.</p>
    <h3>A4 - Plugin/theme version disclosure [Low]</h3>
    <p>Plugin and theme metadata files (readme/style) are publicly readable, revealing exact installed versions and making
      CVE-matching trivial. Remediation: block public access to <code class="inline">readme.txt</code> and
      <code class="inline">changelog.txt</code> at the server (deny rule per file pattern).</p>
    <h3>A5 - Incomplete security headers [Low]</h3>
    <p>Public pages lack HSTS, <code class="inline">X-Content-Type-Options</code>, and <code class="inline">Referrer-Policy</code>.
      (The login page correctly sets framing protection.) Missing HSTS enables downgrade attacks; missing nosniff enables MIME
      sniffing; missing referrer policy can leak URLs. Remediation: add the three headers at the server.</p>
  </section>

  <section id="info">
    <div class="sec-head"><span class="sec-num">10</span><h2>A6-A7 - Informational findings</h2></div>
    <h3>A6 - Subdomain discovery [Info]</h3>
    <p>Academic portals (SIAKAD, CBT) were discovered via certificate transparency and reached directly, which produced
      findings A8 and A9. One legacy subdomain no longer resolves. Remediation: inventory and document all active subdomains
      and enforce a uniform security policy across them.</p>
    <h3>A7 - Anti-bot WAF: positive control with a limitation [Info]</h3>
    <p>An OpenResty reverse proxy injects a JavaScript anti-bot challenge that effectively blocks automated scanners and
      headless browsers. A non-headless browser with a genuine fingerprint passed the challenge. This is recorded as a
      <strong>positive control</strong> - it meaningfully raises the bar against automation - with the honest limitation that
      it does not stop a determined attacker using a real browser. Remediation: keep the anti-bot layer, and add IP-reputation
      and behavioural analysis.</p>
  </section>

  <section id="idor">
    <div class="sec-head"><span class="sec-num">11</span><h2>Authorization / IDOR testing - negative results</h2></div>
    <p>Horizontal and vertical authorization testing on both academic portals found <strong>no exploitable IDOR without valid
      credentials</strong>. This is a boundary of the test, not a clean bill of health.</p>
    <table><thead><tr><th>Test</th><th>Result</th></tr></thead><tbody>
      <tr><td>Self-registration paths (SIAKAD/CBT)</td><td class="yes">Not present - all 404</td></tr>
      <tr><td>Direct record access (grades, transcripts, exams by id)</td><td class="yes">Behind session - 404/redirect</td></tr>
      <tr><td>Config/secret files (.env, config, DB connect)</td><td class="yes">Not leaked - 404; .git/config 403</td></tr>
      <tr><td>Login response for existing vs non-existing user</td><td class="yes">Uniform - no user enumeration</td></tr>
      <tr><td>Path traversal on CBT media handler</td><td class="yes">Blocked by WAF (403) - no LFI</td></tr>
    </tbody></table>
    <p class="muted">Recommendation to the asset owner: provide official test accounts (student + admin roles) so IDOR and
      authorization can be verified properly.</p>
  </section>

  <section id="priority">
    <div class="sec-head"><span class="sec-num">12</span><h2>Remediation Priority</h2></div>
    <table><thead><tr><th>#</th><th>Finding</th><th>Action</th><th>Priority</th></tr></thead><tbody>
      <tr><td>P1</td><td>A8 + A9 - unthrottled logins</td><td>CAPTCHA, rate-limiting, lockout on all SIAKAD &amp; CBT login forms</td><td class="sev high">HIGH</td></tr>
      <tr><td>P2</td><td>A2 - XML-RPC</td><td>Disable xmlrpc.php entirely or block at the WAF/LiteSpeed layer</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>P3</td><td>A1 - slider XSS</td><td>Update plugin to the patched release; enable auto-update</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>P4</td><td>A3 - user enumeration</td><td>Restrict /wp/v2/users; rename admin account</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>P5</td><td>A4 - version disclosure</td><td>Block public readme/changelog on all plugins/themes</td><td class="sev low">LOW</td></tr>
      <tr><td>P6</td><td>A5 - security headers</td><td>Add HSTS, X-Content-Type-Options, Referrer-Policy at the server</td><td class="sev low">LOW</td></tr>
    </tbody></table>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">13</span><h2>Conclusion</h2></div>
    <p>The strongest issues are the two academic portals' login endpoints, which accept unlimited authentication attempts and
      guard exam and student data - these are the priority. The WordPress layer contributes an XSS-vulnerable plugin version,
      an open XML-RPC that amplifies brute-force and enables SSRF, and reconnaissance-grade disclosures (admin username, plugin
      versions). No Critical or High findings were confirmed, no RCE was achieved, and authorization testing on the portals
      returned negative results limited by the absence of test credentials. All testing was non-destructive, no-DoS,
      brute-force-capped, and cleaned up afterwards.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">14</span><h2>References</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/79.html">CWE-79 - Cross-site Scripting</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/307.html">CWE-307 - Improper Restriction of Excessive Authentication Attempts</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/918.html">CWE-918 - Server-Side Request Forgery (SSRF)</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/200.html">CWE-200 - Exposure of Sensitive Information</a></li>
      <li><a href="https://cwe.mitre.org/data/definitions/693.html">CWE-693 - Protection Mechanism Failure</a></li>
      <li><a href="https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/">OWASP A07:2021 - Identification &amp; Authentication Failures</a></li>
      <li><a href="https://owasp.org/www-project-web-security-testing-guide/">OWASP WSTG-ATH-04 - Testing for Account Enumeration</a></li>
      <li>ISO/IEC 29147:2018 &amp; 30111:2019 - Vulnerability disclosure &amp; handling</li>
      <li>UU No. 27 Tahun 2022 - Pelindungan Data Pribadi</li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>