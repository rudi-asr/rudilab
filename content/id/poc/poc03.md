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
    <p class="muted" style="margin-top:4px">Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor.</p>
    <div class="authz">
      <strong>Otorisasi &amp; pengungkapan.</strong> Diuji dalam program bug-bounty - ketat ruang lingkup, non-destruktif, tanpa DoS. Hanya akses eksternal; akun terautentikasi dengan hak akses rendah digunakan untuk pemeriksaan lapisan API. Tidak ada brute-force, tidak ada modifikasi data, tidak ada operasi destruktif. Host, port, nama produk, dan PII disembunyikan untuk rilis publik.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan</h2></div>
    <p>Semua layanan backend target - server API, object storage (kompatibel S3), dan database - dapat dijangkau langsung dari internet tanpa autentikasi.</p>
    <p>Reverse proxy tidak berfungsi sebagai batas keamanan: meskipun nginx mengembalikan 502 Bad Gateway, backend masih dapat dijangkau melalui port aslinya.</p>
    <p class="muted">Fingerprint stack: frontend Vue.js · backend FastAPI/Uvicorn · object storage MinIO · PostgreSQL - disimpulkan dari header respons HTTP dan dokumen OpenAPI publik.</p>
  </section>


  <section id="riskmap">
    <div class="sec-head"><span class="sec-num">02</span><h2>Peta Risiko</h2></div>
    <table><thead>
      <tr><th>ID</th><th>Severity</th><th>Kelas Kerentanan</th><th>Bukti</th><th>CWE</th><th>Status Perbaikan</th></tr>
    </thead><tbody>
      <tr><td>F-01</td><td class="sev-high">High</td><td>Backend API Terekspos - Akses Langsung / Bypass nginx</td><td>Backend dapat dijangkau via port langsung; nginx 502 tapi API 200</td><td>CWE-668 / CWE-284</td><td class="muted">Tidak diklaim</td></tr>
      <tr><td>F-02</td><td class="sev-high">High</td><td>Object Storage Terekspos (MinIO)</td><td>Endpoint MinIO dapat dijangkau dari internet</td><td>CWE-668</td><td class="muted">Tidak diklaim</td></tr>
      <tr><td>F-03</td><td class="sev-high">High</td><td>Database Terekspos (PostgreSQL)</td><td>Port <code class="inline">psql</code> dapat dijangkau dari internet publik</td><td>CWE-668</td><td class="muted">Tidak diklaim</td></tr>
      <tr><td>F-04</td><td class="sev-med">Medium</td><td>Dokumentasi OpenAPI / Swagger Publik</td><td>Skema API lengkap dapat diakses tanpa autentikasi</td><td>CWE-200</td><td class="muted">Tidak diklaim</td></tr>
    </tbody></table>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">03</span><h2>Status Otorisasi &amp; Ruang Lingkup</h2></div>
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
    <div class="sec-head"><span class="sec-num">04</span><h2>PoC 1 - Port exposure verification</h2></div>
    <p><em>Tujuan:</em> menunjukkan bahwa port layanan backend dapat dijangkau dari internet publik.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<p>Semua empat port backend dapat dijangkau dari luar. Port database adalah yang paling kritis - akses data langsung tanpa autentikasi.</p>
  </section>

  <section id="poc2">
    <div class="sec-head"><span class="sec-num">05</span><h2>PoC 2 - API direct access &amp; nginx bypass</h2></div>
    <p><em>Tujuan:</em> menunjukkan bahwa API backend dapat dijangkau langsung, melewati nginx dan kontrol yang diterapkannya.</p>
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
    <p>nginx mengembalikan 502, namun backend menerima login dan menerbitkan JWT yang valid secara langsung. Pemfilteran IP apapun yang dikonfigurasi di nginx tidak berlaku untuk koneksi langsung ke port backend.</p>
  </section>

  <section id="poc3">
    <div class="sec-head"><span class="sec-num">06</span><h2>PoC 3 - Public API documentation &amp; schema</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s http://TARGET:&lt;API&gt;/docs           # Swagger UI
$ curl -s http://TARGET:&lt;API&gt;/redoc          # ReDoc
$ curl -s http://TARGET:&lt;API&gt;/openapi.json | wc -c</span>
<span class="out">200  OK   (Swagger UI)
200  OK   (ReDoc)
50626     (full schema bytes)</span></pre></div>
    <p>Kontrak API lengkap - semua endpoint, model request/response, parameter - tersedia bagi siapa saja tanpa autentikasi melalui dokumen OpenAPI/Swagger publik.</p>
  </section>

  <section id="poc4">
    <div class="sec-head"><span class="sec-num">07</span><h2>PoC 4 - MinIO health endpoints accessible</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>Akses anonim ke endpoint health mengkonfirmasi layanan object storage dan statusnya. Daftar bucket mengembalikan nama container penyimpanan internal.</p>
  </section>

  <section id="poc5">
    <div class="sec-head"><span class="sec-num">08</span><h2>PoC 5 - PostgreSQL port reachable from internet</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>TCP handshake PostgreSQL berhasil dari internet eksternal. Penyerang dapat mencoba akses database langsung jika memiliki atau menebak kredensial.</p>
  </section>

  <section id="addl">
    <div class="sec-head"><span class="sec-num">09</span><h2>Additional Findings (same scope)</h2></div>
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
    <div class="sec-head"><span class="sec-num">10</span><h2>Tested and found safe</h2></div>
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
    <div class="sec-head"><span class="sec-num">11</span><h2>Dampak</h2></div>
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
    <div class="sec-head"><span class="sec-num">12</span><h2>Penilaian Keparahan</h2></div>
    <p>Tingkat keparahan dinilai peneliti berdasarkan kondisi yang diamati: layanan yang terekspos dapat dijangkau dari internet tanpa autentikasi.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">13</span><h2>Akar Masalah</h2></div>
    <p>All backend services bind to <code class="inline">0.0.0.0</code> (all interfaces) instead of
      <code class="inline">127.0.0.1</code> (loopback), so every service is reachable on the public-facing interface with no
      firewall or security-group restriction. The nginx reverse proxy was deployed as a routing layer, not a security
      boundary, and no host-level or cloud firewall rules restrict the backend ports.</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">14</span><h2>Solusi &amp; Rekomendasi</h2></div>
    <h3>bind services to loopback</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>config</span></div>
<pre>Batas autentikasi dan otorisasi-tulis aplikasi sudah kokoh - tidak ada bypass autentikasi atau penulisan yang tidak terotorisasi yang ditemukan. Keterpaparan hanya mempengaruhi endpoint baca yang tidak terlindungi.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">15</span><h2>Referensi</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/668.html">CWE-668 - Exposure of Resource to Wrong Sphere</a></li>
      <li><a href="https://owasp.org/Top10/A05_2021-Security_Misconfiguration/">OWASP A05:2021 - Security Misconfiguration</a></li>
      <li>UU No. 27 Tahun 2022 - Pelindungan Data Pribadi</li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>