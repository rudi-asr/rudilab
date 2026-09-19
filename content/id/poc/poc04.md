---
title: "Directory Listing / Information Disclosure"
date: "2026-04-28"
poc_num: "04"
target: "Web application - government sector (redacted)"
category: "Security Misconfiguration"
severity: "Low-Medium"
status: "Proven"
---

<header class="doc">
    <div class="capture-line">capture - <span class="blink">poc-04.pcap</span> &rarr; public directory listing / information disclosure</div>
    <div class="kicker">SECURITY RESEARCH CASE STUDY - Independent research · not a commissioned pentest</div>
    <div class="poc-id">PoC-04</div>
    <h1>Directory Listing / Information Disclosure</h1>
    <dl class="meta-grid">
      <dt>Severity</dt>       <dd class="sev-med">Low-Medium</dd>
      <dt>CWE Primary</dt>    <dd>CWE-548 - Exposure of Information Through Directory Listing</dd>
      <dt>CWE Secondary</dt>  <dd>CWE-16 - Configuration</dd>
      <dt>OWASP</dt>          <dd>A05:2021 - Security Misconfiguration</dd>
      <dt>Affected Host</dt>  <dd><span class="redacted-tag">REDACTED</span> - public-sector web application</dd>
      <dt>Report Date</dt>    <dd>2026-04-28</dd>
      <dt>Status</dt>         <dd>CONFIRMED - UNREMEDIATED</dd>
      <dt>Tester</dt>         <dd>Rudi - Offensive Security</dd>
    </dl>
    <p class="muted" style="margin-top:4px">Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Independent research - no commissioned engagement and no authorization
      letter. Discovery was passive observation of a publicly reachable URL; the path required no credentials. Reproduction
      (section 04) was performed on a lab host under my own control - no enumeration or retrieval was carried out against the
      reported system beyond the single request that revealed the listing. The operator was notified before publication and
      is not identified here.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan</h2></div>
    <p>Sebuah direktori pada aplikasi web sektor publik tidak memiliki file index dan tidak ada pembatasan directory-browsing yang dikonfigurasi.</p>
    <p>Sendiri ini adalah miskonfigurasi berkeparahan rendah. Bobot sebenarnya tergantung isi direktori: jika hanya berisi aset statis tanpa data sensitif, dampaknya minimal.</p>
    <p>Kondisi ini dilaporkan ke operator melalui saluran kontak resmi mereka pada 2026-04-28 dan re-verifikasi dijadwalkan 90 hari kemudian. Lihat bagian Kronologi Pengungkapan untuk detailnya.</p>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Status Otorisasi &amp; Ruang Lingkup</h2></div>
    <table><tbody>
      <tr><td class="k">Authorization status</td><td>Independent research - no commissioned engagement, no authorization letter</td></tr>
      <tr><td class="k">Discovery method</td><td>Passive observation of a publicly reachable URL</td></tr>
      <tr><td class="k">Authentication bypassed</td><td class="no">NO - the path required no credentials</td></tr>
      <tr><td class="k">Automated scanning</td><td class="no">NOT performed against the target</td></tr>
      <tr><td class="k">Testing environment</td><td>Production, read-only, single GET request</td></tr>
      <tr><td class="k">Files downloaded</td><td class="no">NO</td></tr>
      <tr><td class="k">Production data accessed</td><td class="no">NO</td></tr>
      <tr><td class="k">Personal data accessed</td><td class="no">NO</td></tr>
      <tr><td class="k">Data modified or destroyed</td><td class="no">NO</td></tr>
      <tr><td class="k">Operator notified</td><td class="yes">YES - 2026-04-28</td></tr>
      <tr><td class="k">Target identified here</td><td class="no">NO</td></tr>
    </tbody></table>
    <p class="muted">Reproduksi pada bagian 04 dilakukan di host lab di bawah kendali saya sendiri. Tidak ada eksploitasi, pencurian data, atau modifikasi yang dilakukan terhadap sistem target.</p>
  </section>

  <section id="affected">
    <div class="sec-head"><span class="sec-num">03</span><h2>Sistem yang Terdampak</h2></div>
    <table><tbody>
      <tr><td class="k">Organization</td><td>redacted</td></tr>
      <tr><td class="k">System</td><td>Public-facing information system, government sector</td></tr>
      <tr><td class="k">Endpoint</td><td>redacted/&lt;path&gt;/</td></tr>
      <tr><td class="k">Privilege required</td><td>None</td></tr>
      <tr><td class="k">Exposure</td><td>Internet-facing, indexable by search engines</td></tr>
    </tbody></table>
    <p class="muted">Organisasi, hostname, dan path lengkap tidak diungkapkan. Studi kasus ini mendokumentasikan kelas kelemahan dan dampaknya, bukan target spesifik.</p>
  </section>

  <section id="repro">
    <div class="sec-head"><span class="sec-num">04</span><h2>Detail Teknis &amp; Reproduksi</h2></div>
    <p>Ketika web server menerima permintaan untuk direktori dan tidak menemukan file index, server akan mengembalikan error atau membuat daftar isi direktori. Perilaku terakhir ini - directory listing - mengekspos nama file kepada siapa saja.</p>
    <h3>lab reproduction (host under my control)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre>Setiap entri dalam listing semacam ini adalah tautan unduhan langsung. Tidak diperlukan enumerasi, brute force, atau tool khusus.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">05</span><h2>Dampak</h2></div>
    <div class="callout impact"><span class="label">Impact</span>
      <strong>A. Structure disclosure.</strong> Directory layout and naming conventions are revealed, shortening
      reconnaissance for follow-on attacks.<br><br>
      <strong>B. Retrievable artifacts.</strong> Backup archives, database dumps, and .bak/.old files become directly
      downloadable when present.<br><br>
      <strong>C. Personal-data exposure.</strong> Documents containing personal data in the listed directory would be
      publicly retrievable, engaging obligations under Indonesia's PDP Law (UU 27/2022).<br><br>
      <strong>D. Persistence after closure.</strong> Listings are indexed and archived by third parties, so exposure can
      outlive the fix unless cache removal is requested.
    </div>
    <div class="callout notclaimed"><span class="label">Findings not claimed</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Retrieval of sensitive files - not attempted, not proven.</li>
        <li>Personal-data exposure - not verified, no files were opened.</li>
        <li>Credential or configuration leakage - not verified.</li>
        <li>Remote code execution or write access - no evidence, not tested.</li>
      </ul>
    </div>
  </section>

    <section id="cvss">
    <div class="sec-head"><span class="sec-num">06</span><h2>Penilaian Keparahan</h2></div>
    <p>Tingkat keparahan dinilai peneliti: satu GET tanpa autentikasi mengungkapkan direktori penuh beserta isinya.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">07</span><h2>Akar Masalah</h2></div>
    <p>Server menghasilkan indeks direktori saat tidak ada file index, dan direktori tersebut berisi file yang dapat diakses publik.</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">08</span><h2>Solusi &amp; Rekomendasi</h2></div>
    <h3>before - vulnerable pattern (Apache)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>apache</span></div>
<pre>Konfirmasi juga bahwa file yang sebelumnya terdaftar tidak lagi dapat diambil secara langsung setelah directory listing dinonaktifkan.</p>
  </section>

  <section id="timeline">
    <div class="sec-head"><span class="sec-num">10</span><h2>Kronologi Pengungkapan</h2></div>
    <table><thead><tr><th>Date</th><th>Event</th></tr></thead><tbody>
      <tr><td class="k">2026-04-28</td><td>Condition identified; report sent to the operator via its official channel, incl. affected path, technical description, and remediation steps</td></tr>
      <tr><td class="k">2026-07-27</td><td>90-day coordinated disclosure window elapsed with no acknowledgement received</td></tr>
      <tr><td class="k">2026-09-03</td><td>Re-verified as unremediated</td></tr>
      <tr><td class="k">2026-09-03</td><td>Sanitized case study published; affected party not identified</td></tr>
    </tbody></table>
    <p class="muted">Jendela 90 hari mengikuti praktik industri umum (ISO/IEC 29147, CERT/CC CVD).</p>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">11</span><h2>Kesimpulan</h2></div>
    <p>A publicly reachable directory on a government information system returns a full file index to unauthenticated
      visitors. The finding is low to medium in isolation, and its real severity depends on the contents of that directory,
      which were deliberately not examined. The remediation is a single configuration directive, supported by relocating
      non-public files out of the web root. The report was delivered through the operator's official channel more than four
      months before publication, and the condition persists. All observation was read-only - no files were downloaded, no
      data was modified, no authentication was bypassed, and no automated scanning was directed at the target.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">12</span><h2>Referensi</h2></div>
    <ul class="tight">
      <li><a href="https://cwe.mitre.org/data/definitions/548.html">CWE-548 - Exposure of Information Through Directory Listing</a></li>
      <li><a href="https://owasp.org/Top10/A05_2021-Security_Misconfiguration/">OWASP A05:2021 - Security Misconfiguration</a></li>
      <li>ISO/IEC 29147:2018 - Vulnerability disclosure</li>
      <li>ISO/IEC 30111:2019 - Vulnerability handling processes</li>
      <li>CERT/CC Guide to Coordinated Vulnerability Disclosure</li>
      <li>UU No. 27 Tahun 2022 - Pelindungan Data Pribadi</li>
    </ul>
    <h3>remediation guides for other web servers</h3>
    <p class="muted">The fix section above covers Apache, Nginx, and IIS. The guides below extend the same fix to stacks not
      addressed here, and are useful for administrators verifying their own environment.</p>
    <table><thead><tr><th>Source</th><th>Language</th><th>Servers covered</th></tr></thead><tbody>
      <tr><td><a href="https://www.acunetix.com/blog/articles/disabling-directory-listing-web-server/">Acunetix - Disabling Directory Listing</a></td><td>English</td><td>Apache, Nginx, IIS, Tomcat, LiteSpeed, Lighttpd</td></tr>
      <tr><td><a href="https://tonjoo.com/id/cara-disable-directory-listing/">Tonjoo - Cara Disable Directory Listing</a></td><td>Bahasa Indonesia</td><td>Apache/XAMPP, Nginx, LiteSpeed, Lighttpd</td></tr>
    </tbody></table>
    <p class="muted">Third-party material, linked for convenience and not endorsed. Verify any configuration change against
      your own vendor documentation before applying it to a production system.</p>
  </section>

</div>
<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>