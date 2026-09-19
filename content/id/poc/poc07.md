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
      <strong>Otorisasi &amp; pengungkapan.</strong> Pengujian dilakukan dalam asesmen yang diotorisasi dengan ruang lingkup yang dikonfirmasi oleh pemilik. Tidak ada akun yang dikompromikan, tidak ada data yang dieksfiltrasi, dan batas rate limit dihormati. Perbaikan diterapkan oleh pemilik sebelum write-up yang telah disanitasi ini dipublikasikan dengan persetujuan. Target dan semua data disembunyikan - organisasi tidak diidentifikasi dalam dokumen ini.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Ringkasan</h2></div>
    <p>Aplikasi menerapkan akses berdasarkan izin menu (misalnya, sebuah peran dapat memiliki <code class="inline">master.employee.view</code> tetapi tidak <code class="inline">master.client.view</code>). Namun, endpoint LOV yang mendukung menu tersebut tidak diperiksa secara individual - sesi terautentikasi apapun dapat mengakses semua entri LOV terlepas dari perannya.</p>
    <p>Namun, beberapa sub-endpoint LOV (List-of-Values) - pencarian ringan yang digunakan untuk mengisi dropdown menu - tidak dicakup oleh pemeriksaan izin menu. Endpoint ini mengembalikan data penuh terlepas dari peran pemanggil.</p>
  </section>

  <section id="riskmap">
    <div class="sec-head"><span class="sec-num">02</span><h2>Peta Risiko</h2></div>
    <table><thead>
      <tr><th>ID</th><th>Severity</th><th>Kelas Kerentanan</th><th>Endpoint Terdampak</th><th>CWE</th><th>Status Perbaikan</th></tr>
    </thead><tbody>
      <tr>
        <td>F-01</td>
        <td class="sev-med">Medium</td>
        <td>Broken Function Level Authorization</td>
        <td><code class="inline">/employees/lov</code>, <code class="inline">/clients/lov</code>, <code class="inline">/clients/tiers</code></td>
        <td>CWE-862 / CWE-200</td>
        <td class="ok">Diperbaiki - per pemilik</td>
      </tr>
    </tbody></table>
  </section>

  <section id="preconditions">
    <div class="sec-head"><span class="sec-num">03</span><h2>Prasyarat</h2></div>
    <ul class="tight">
      <li>Satu akun terautentikasi dengan hak akses rendah yang diperoleh secara sah.</li>
      <li>Peran akun tidak memiliki menu untuk resource yang dituju (misal <code class="inline">master.employee</code>).</li>
      <li>Sub-endpoint LOV dapat dijangkau (mendukung dropdown di front-end).</li>
    </ul>
  </section>

  <section id="poc">
    <div class="sec-head"><span class="sec-num">04</span><h2>Langkah-langkah PoC</h2></div>
    <ol class="tight">
      <li>Autentikasi sebagai pengguna hak akses rendah dan dapatkan <code class="inline">accessToken</code> yang valid.</li>
      <li>Konfirmasi resource induk ditolak dengan benar:
        <code class="inline">GET /employees</code> &rarr; <code class="inline">403 Forbidden</code>.</li>
      <li>Panggil sub-endpoint LOV dengan token yang sama: <code class="inline">GET /employees/lov</code>.</li>
      <li>Amati <code class="inline">200 OK</code> yang mengembalikan daftar identitas (nama, email, jabatan).</li>
      <li>Ulangi untuk resource terkait: <code class="inline">GET /clients/lov</code>,
        <code class="inline">GET /clients/tiers</code> &rarr; <code class="inline">200 OK</code>.</li>
      <li>Konfirmasi akses tingkat record masih dibatasi:
        <code class="inline">GET /employees/{id}</code> &rarr; <code class="inline">403</code> (benar).</li>
    </ol>
    <p class="muted">Transkrip yang disanitasi (identitas dan target dihapus):</p>
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
    <p class="muted">Semua nilai pengenal (host target, nama staf, email, nama klien) telah disembunyikan. Hanya metode HTTP, endpoint, dan struktur respons yang dipertahankan.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">05</span><h2>Dampak</h2></div>
    <p>Pengungkapan PII internal (nama staf, email, jabatan) dan daftar entitas bisnis ke peran yang seharusnya tidak memiliki akses tersebut. Dalam lingkungan yang diatur, ini dapat memicu kewajiban pelaporan pelanggaran data.</p>
    <div class="callout impact"><span class="label">Dampak</span>
      Pembacaan tidak sah atas identitas staf dan data klien oleh peran yang seharusnya ditolak; memungkinkan phishing dan OSINT terhadap organisasi. Tidak ada dampak terhadap integritas atau ketersediaan yang teramati.
    </div>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">06</span><h2>Akar Masalah</h2></div>
    <p>Otorisasi diterapkan per-endpoint, secara manual, dan hanya terhubung ke handler resource induk. Sub-path (endpoint LOV) melewati pemeriksaan ini.</p>
  </section>

  <section id="solution">
    <div class="sec-head"><span class="sec-num">07</span><h2>Solusi</h2></div>
    <p>Terapkan otorisasi di level router/resource agar berlaku untuk setiap sub-path, dan kembalikan 403 jika sesi yang membuat permintaan tidak memiliki izin untuk resource yang diminta.</p>
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
    <div class="callout fix"><span class="label">Remediasi</span>
      Framework yang ditampilkan bersifat ilustratif - terapkan guard setara di stack Anda. Tambahkan regression test: peran tanpa menu harus menerima 403 pada resource induk <em>dan</em> setiap sub-endpoint (<code class="inline">/lov</code>, <code class="inline">/tiers</code>).
    </div>
  </section>

  <section id="disclosure">
    <div class="sec-head"><span class="sec-num">08</span><h2>Kronologi Pengungkapan</h2></div>
    <ul class="tight">
      <li><strong>Hari 0</strong> - Temuan diidentifikasi selama asesmen yang diotorisasi; dilaporkan kepada pemilik sistem.</li>
      <li><strong>Terkoordinasi</strong> - Berdasarkan komunikasi dengan pemilik, perbaikan telah diterapkan (guard otorisasi diperluas ke sub-endpoint dan payload LOV diminimalkan); tidak diverifikasi ulang secara independen oleh peneliti.</li>
      <li><strong>Publikasi</strong> - Write-up yang telah disanitasi ini dipublikasikan dengan persetujuan pemilik. Target dan semua data disembunyikan.</li>
    </ul>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">09</span><h2>Referensi</h2></div>
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