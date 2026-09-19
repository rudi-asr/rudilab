---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
target: "Web application (redacted)"
category: "Cryptographic Failures"
severity: "Medium"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-02.pcap</span> &rarr; expired TLS certificate &amp; hostname mismatch</div>
    <div class="kicker">PENETRATION TEST FINDINGS REPORT - Authorized Testing</div>
    <div class="poc-id">PoC-02</div>
    <h1>TLS Certificate Expired &amp; Hostname Mismatch</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>      <dd class="sev-med">Medium</dd>
      <dt>CWE</dt>           <dd>CWE-295 - Improper Certificate Validation</dd>
      <dt>Category</dt>      <dd>Cryptography / Transport</dd>
      <dt>OWASP</dt>         <dd>A02:2021 - Cryptographic Failures</dd>
      <dt>Affected Host</dt> <dd><span class="redacted-tag">REDACTED</span> - web application</dd>
      <dt>Test Date</dt>     <dd>2026-08-29</dd>
      <dt>Status</dt>        <dd>CONFIRMED</dd>
      <dt>Tester</dt>        <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Testing was black-box from an external network, read-only and
      non-destructive; the finding is publicly verifiable and required no credentials. Host and stack details are redacted
      for public release. Ini adalah showcase yang telah disanitasi, bukan laporan rahasia.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan</h2></div>
    <p>Sertifikat TLS target telah kedaluwarsa sebelum tanggal pengujian, dan Common Name (CN)-nya tidak cocok dengan hostname yang dilayani. Browser modern dan klien HTTP menampilkan peringatan keamanan.</p>
    <p class="muted">Fingerprint stack: nginx + PHP (versi disembunyikan), diidentifikasi dari header respons HTTP.</p>
    <div class="callout notclaimed" style="margin-top:16px;"><span class="label">Note on severity</span>
      This finding is rated <strong>Medium</strong>, not Critical. Exploitation requires an attacker already in an on-path
      position (AC:High) and a user who dismisses the browser warning (UI:Required). Rating a warning-gated, position-dependent
      TLS issue as Critical would overstate real-world risk.</div>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Status Otorisasi &amp; Ruang Lingkup</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Authorized testing - black-box, external</td></tr>
      <tr><td class="k">Discovery method</td><td>Unauthenticated TLS inspection of a public endpoint</td></tr>
      <tr><td class="k">Authentication bypassed</td><td class="no">NO - no credentials required</td></tr>
      <tr><td class="k">Automated scanning</td><td>Limited - curl, openssl, single nmap ssl-cert script</td></tr>
      <tr><td class="k">Testing environment</td><td>Production, read-only, non-destructive</td></tr>
      <tr><td class="k">Data accessed / modified</td><td class="no">NO</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
  </section>

  <section id="pre">
    <div class="sec-head"><span class="sec-num">03</span><h2>Prasyarat</h2></div>
    <ul class="tight">
      <li>Black-box testing from an external network, no authentication.</li>
      <li>No account or credentials required - the finding is publicly verifiable.</li>
      <li>Tools: <code class="inline">curl</code>, <code class="inline">openssl s_client</code>, Nmap ssl-cert script.</li>
      <li>All testing read-only and non-destructive.</li>
    </ul>
  </section>

  <section id="poc1">
    <div class="sec-head"><span class="sec-num">04</span><h2>PoC 1 - TLS verification via curl</h2></div>
    <p><em>Tujuan:</em> menunjukkan bahwa sertifikat tidak valid dan menyebabkan kesalahan verifikasi.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -vI https://TARGET 2>&1 | grep -E "expire|CN=|subject|SSL|certificate"</span>
<span class="hl-red">* SSL certificate problem: certificate has expired
* SSL certificate problem: hostname mismatch
curl: (60) SSL certificate problem: certificate has expired</span></pre></div>
    <p>curl menolak koneksi karena sertifikat kedaluwarsa. Tanggal kedaluwarsa dikonfirmasi telah lewat sebelum tanggal pengujian. Browser modern menampilkan peringatan "Koneksi Anda tidak pribadi".</p>
  </section>

  <section id="poc2">
    <div class="sec-head"><span class="sec-num">05</span><h2>PoC 2 - Certificate detail via OpenSSL</h2></div>
    <p><em>Tujuan:</em> mengekstrak detail sertifikat untuk mengkonfirmasi tanggal kedaluwarsa dan ketidakcocokan hostname.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ echo | openssl s_client -connect TARGET:443 -servername TARGET 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates</span>
<span class="out">subject=CN = &lt;redacted&gt;
issuer=C = US, O = Let's Encrypt, CN = R3
notBefore=&lt;redacted&gt;  notAfter=&lt;redacted&gt; </span><span class="hl-red">[EXPIRED]</span></pre></div>
    <p>CN sertifikat tidak mencakup domain target; CN/SAN yang terdaftar milik domain lain. Ini menyebabkan peringatan "nama host tidak cocok" di semua klien TLS yang ketat.</p>
  </section>

  <section id="poc3">
    <div class="sec-head"><span class="sec-num">06</span><h2>PoC 3 - SSL audit via Nmap</h2></div>
    <p>Tujuan: mengkonfirmasi temuan dengan alat independen.</p>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>Script ssl-cert Nmap mengkonfirmasi sertifikat telah melewati tanggal 'Not valid after', konsisten dengan output curl.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">07</span><h2>Impact &amp; Attack Scenario</h2></div>
    <p>Dengan sertifikat yang tidak valid, penyerang yang berada di jalur (misalnya jaringan bersama, poisoning ARP) dapat menyajikan sertifikat penipu tanpa risiko pengguna mendeteksi anomali.</p>
    <div class="callout impact"><span class="label">Impact</span>
      <strong>A. Credential interception</strong> - login credentials can be captured in the absence of valid TLS.<br><br>
      <strong>B. Session hijacking</strong> - session tokens sent without valid TLS can be stolen and replayed.<br><br>
      <strong>C. Integrity violation</strong> - an on-path attacker can modify data in transit.
    </div>
    <div class="callout notclaimed"><span class="label">Findings not claimed</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Active MitM exploitation - not proven (non-destructive testing).</li>
        <li>User data access - not performed.</li>
        <li>Historical traffic decryption - not performed.</li>
      </ul>
    </div>
  </section>

    <section id="cvss">
    <div class="sec-head"><span class="sec-num">08</span><h2>Penilaian Keparahan</h2></div>
    <p>Severity is researcher-assessed based on the observed conditions: exploitation requires an on-path (MITM)
      position and the victim dismissing a browser certificate warning, and any exposure is warning-gated. This places
      the finding in the Medium band - rescored from an earlier Critical rating; the accurate rating is what a triager
      expects for a warning-gated, position-dependent TLS finding.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">09</span><h2>Akar Masalah</h2></div>
    <p>No auto-renewal mechanism and no proactive expiry monitoring for TLS certificates. Let's Encrypt certificates are
      valid for 90 days and must be renewed on schedule. The hostname mismatch indicates the installed certificate was issued
      for a different domain or subdomain - most likely a deployment misconfiguration.</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">10</span><h2>Solusi &amp; Rekomendasi</h2></div>
    <h3>renew &amp; auto-renew</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>Sertifikat kedaluwarsa dikombinasikan dengan ketidakcocokan hostname menghilangkan jaminan yang diberikan TLS: kerahasiaan (melalui MITM), integritas, dan keaslian server.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">13</span><h2>Referensi</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/295.html">CWE-295 - Improper Certificate Validation</a></li>
      <li><a href="https://owasp.org/Top10/A02_2021-Cryptographic_Failures/">OWASP A02:2021 - Cryptographic Failures</a></li>
    </ul>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>