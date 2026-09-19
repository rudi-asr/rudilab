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
    <p class="muted" style="margin-top:4px">Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor.</p>
    <div class="authz">
      <strong>Otorisasi &amp; pengungkapan.</strong> Riset keamanan mandiri dengan pengungkapan terkoordinasi. Pengujian dibatasi ruang lingkupnya (tanpa denial-of-service, tanpa pengujian destruktif, percobaan brute-force dibatasi maksimal &le;6 dengan jeda) dan non-destruktif - tidak ada data yang dimodifikasi, dieksfiltrasi, atau dihapus. Nama institusi, domain, alamat IP, dan subdomain disembunyikan untuk rilis publik; temuan dipublikasikan sebagai kelas kelemahan, bukan sebagai peta sistem yang masalahnya masih terbuka. Ini adalah studi kasus yang telah disanitasi, bukan deliverable rahasia klien.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan Eksekutif</h2></div>
    <p>Situs web publik sebuah institusi pendidikan tinggi - dibangun di atas WordPress dengan LiteSpeed, di balik reverse proxy OpenResty/nginx - dinilai untuk kerentanan keamanan aplikasi web.</p>
    <p>Penilaian menghasilkan empat temuan Medium (termasuk dua endpoint login tanpa pembatasan percobaan pada portal akademik) dan lima observasi Low/Info.</p>
    <p class="muted">Catatan metodologi: situs dilindungi oleh layer anti-bot OpenResty yang efektif yang memblokir pemindaian otomatis. Seluruh pengujian dilakukan secara manual dengan lalu lintas yang dikendalikan kecepatan.</p>
  </section>

  <section id="riskmap">
    <div class="sec-head"><span class="sec-num">02</span><h2>Peta Risiko</h2></div>
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
    <div class="sec-head"><span class="sec-num">03</span><h2>Status Otorisasi &amp; Ruang Lingkup</h2></div>
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
    <div class="sec-head"><span class="sec-num">04</span><h2>Metodologi &amp; Alat</h2></div>
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
    <p>Plugin slider terpasang dalam versi yang masuk dalam rentang yang terpengaruh oleh CVE Stored XSS yang dipublikasikan. Versi yang terinstal dikonfirmasi dari readme publik plugin.</p>
    <h3><span class="step-n">step 1 -</span> confirm version from public metadata</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s https://TARGET/wp-content/plugins/&lt;slider-plugin&gt;/readme.txt | grep -i "stable tag"</span>
<span class="hl-red">Stable tag: &lt;affected-version&gt;   # within CVE affected range; patch is the next point release</span></pre></div>
    <p>Versi dikonfirmasi dari readme publik plugin, kemudian dicocokkan dengan rentang yang terpengaruh CVE. Kode frontend yang memuat konten slider tidak menerapkan sanitasi output.</p>
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
    <p>Endpoint XML-RPC aktif dan mengekspos <code class="inline">system.multicall</code> dan <code class="inline">pingback.ping</code>. Dalam konteks pasca-bypass anti-bot, ini memungkinkan enumerasi pengguna dan serangan brute-force teramplifikasi.</p>
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
    <p>Form login sistem informasi akademik tidak memiliki perlindungan brute-force - tidak ada CAPTCHA, pembatasan laju, atau penguncian akun.</p>
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
    <p>Platform ujian berbasis komputer mengekspos endpoint login admin dan endpoint login peserta, keduanya tanpa pembatasan percobaan.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>Endpoint REST users WordPress mengembalikan pengguna terdaftar tanpa autentikasi, mengekspos username admin.</p>
    <h3>A4 - Plugin/theme version disclosure [Low]</h3>
    <p>File metadata plugin dan tema (readme/style) dapat dibaca publik, mengungkapkan versi yang tepat dari komponen terpasang.</p>
    <h3>A5 - Incomplete security headers [Low]</h3>
    <p>Halaman publik tidak memiliki HSTS, X-Content-Type-Options, dan Referrer-Policy. (Header ini bukan temuan berdiri sendiri tetapi dicatat sebagai peningkatan postur keamanan.)</p>
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
    <div class="sec-head"><span class="sec-num">13</span><h2>Kesimpulan</h2></div>
    <p>Endpoint login portal akademik tidak memiliki pembatasan percobaan atau mekanisme CAPTCHA. Pengujian manual dengan kredensial yang salah secara berulang tidak memicu pemblokiran atau tantangan.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">14</span><h2>Referensi</h2></div>
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