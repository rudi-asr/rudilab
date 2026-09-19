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
    <p class="muted" style="margin-top:4px">Severity is researcher-assessed based on observed conditions, not a vendor rating.</p>
    <div class="authz">
      <strong>Authorization &amp; disclosure.</strong> Independent research - no commissioned engagement and no authorization
      letter. Discovery was passive observation of a publicly reachable URL; the path required no credentials. Reproduction
      (section 04) was performed on a lab host under my own control - no enumeration or retrieval was carried out against the
      reported system beyond the single request that revealed the listing. The operator was notified before publication and
      is not identified here.
    </div>
  </header>

  <section id="summary">
    <div class="sec-head"><span class="sec-num">01</span><h2>Summary</h2></div>
    <p>A directory served by a public-sector web application had no index file and no directory-browsing restriction.
      Requesting the path returned a generated listing of every file inside it, readable by anyone with the URL and without
      credentials.</p>
    <p>Alone this is a low-severity misconfiguration. Its real weight depends on what the directory holds: in practice these
      listings surface database dumps, backup archives, scanned documents, and configuration files placed under the web root
      for convenience and never intended for public access.</p>
    <p class="muted">The condition was reported to the operator through its official contact channel on 2026-04-28 and
      remained unremediated at the time of publication.</p>
  </section>

  <section id="scope">
    <div class="sec-head"><span class="sec-num">02</span><h2>Authorization Status &amp; Scope</h2></div>
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
    <p class="muted">Reproduction in section 04 was performed on a lab host under my own control. No exploitation,
      enumeration, or retrieval was carried out against the reported system beyond the single request that revealed the listing.</p>
  </section>

  <section id="affected">
    <div class="sec-head"><span class="sec-num">03</span><h2>Affected System</h2></div>
    <table><tbody>
      <tr><td class="k">Organization</td><td>redacted</td></tr>
      <tr><td class="k">System</td><td>Public-facing information system, government sector</td></tr>
      <tr><td class="k">Endpoint</td><td>redacted/&lt;path&gt;/</td></tr>
      <tr><td class="k">Privilege required</td><td>None</td></tr>
      <tr><td class="k">Exposure</td><td>Internet-facing, indexable by search engines</td></tr>
    </tbody></table>
    <p class="muted">Organization, hostname, and full path are withheld. This case study documents the weakness class and its
      remediation; it is not intended to direct traffic toward a system that is still open.</p>
  </section>

  <section id="repro">
    <div class="sec-head"><span class="sec-num">04</span><h2>Technical Detail &amp; Reproduction</h2></div>
    <p>When a web server receives a request for a directory and finds no index file, it either returns an error or generates
      a listing of the directory contents. The second behaviour is useful during development and is enabled by default in
      several stacks. Left on in production, every unprotected folder becomes a browsable file manager.</p>
    <h3>lab reproduction (host under my control)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s -o /dev/null -w "%{http_code}\n" https://lab.local/uploads/</span>
<span class="out">200</span>
<span class="cmd">$ curl -s https://lab.local/uploads/ | grep -i "index of"</span>
<span class="out">&lt;h1&gt;Index of /uploads/&lt;/h1&gt;</span></pre></div>
    <h3>representative response (synthetic - no real filenames)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>html</span></div>
<pre><span class="out">&lt;h1&gt;Index of /uploads/&lt;/h1&gt;&lt;hr&gt;&lt;pre&gt;&lt;a href="https://../"&gt;../&lt;/a&gt;</span>
<span class="hl-red">&lt;a href="https://arsip-2024.zip"&gt;arsip-2024.zip&lt;/a&gt;      12-Jan-2024 09:14  48M
&lt;a href="https://config.bak"&gt;config.bak&lt;/a&gt;              03-Mar-2024 22:01  14K
&lt;a href="https://daftar-peserta.xlsx"&gt;daftar-peserta.xlsx&lt;/a&gt; 17-Jun-2024 11:48 212K
&lt;a href="https://dump.sql"&gt;dump.sql&lt;/a&gt;                  17-Jun-2024 11:52  96M</span>
<span class="out">&lt;/pre&gt;&lt;hr&gt;</span></pre></div>
    <p>Every entry in a listing of this kind is a direct download link. No enumeration, brute force, or tooling is required
      to obtain the files, and search engines crawl and cache these pages - so exposure is not limited to whoever knows the URL.</p>
  </section>

  <section id="impact">
    <div class="sec-head"><span class="sec-num">05</span><h2>Impact</h2></div>
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
    <div class="sec-head"><span class="sec-num">06</span><h2>Severity Assessment</h2></div>
    <p>Severity is researcher-assessed based on the observed conditions: a single unauthenticated GET discloses the
      file inventory, with no write or modification path observed. The rating is deliberately conservative at
      low-to-medium because no listed file was opened - if the directory contains backups, dumps, or personal data,
      the confidentiality impact would be significantly higher.</p>
  </section>

  <section id="rootcause">
    <div class="sec-head"><span class="sec-num">07</span><h2>Root Cause</h2></div>
    <p>The server generates a directory index when no index file is present, and the directory in question is served from
      within the public web root. Two independent mistakes overlap: directory browsing was never disabled, and files not
      meant to be public were stored somewhere publicly served. Disabling the listing addresses the symptom; relocating
      non-public files out of the web root addresses the cause. Both are needed.</p>
  </section>

  <section id="fix">
    <div class="sec-head"><span class="sec-num">08</span><h2>Solution &amp; Recommendations</h2></div>
    <h3>before - vulnerable pattern (Apache)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>apache</span></div>
<pre><span class="hl-red">&lt;Directory /var/www/html&gt;
    Options Indexes FollowSymLinks
&lt;/Directory&gt;</span></pre></div>
    <h3>after - secure pattern (Apache)</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>apache</span></div>
<pre><span class="cmd">&lt;Directory /var/www/html&gt;
    Options -Indexes +FollowSymLinks
&lt;/Directory&gt;</span></pre></div>
    <h3>nginx</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>nginx</span></div>
<pre><span class="cmd">location / { autoindex off; }
location ~* \.(bak|old|sql|zip|tar\.gz)$ { deny all; }</span></pre></div>
    <div class="callout fix"><span class="label">Supporting controls</span>
      <ul class="tight" style="margin-bottom:0;">
        <li>Place an index.html in every served directory as a second line of defence.</li>
        <li>Move backups, dumps, and archives entirely outside the web root.</li>
        <li>Re-verify after every deployment - container rebuilds routinely reintroduce this setting.</li>
        <li>Request cache removal from search engines for any listing already indexed.</li>
        <li>Review sibling directories on the same host; this misconfiguration is rarely isolated.</li>
      </ul>
    </div>
    <h3>Microsoft IIS</h3>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>cmd</span></div>
<pre><span class="cmd">&gt; appcmd set config /section:directoryBrowse /enabled:false</span></pre></div>
    <h3>remediation priority</h3>
    <table><thead><tr><th>#</th><th>Remediation</th><th>Priority</th></tr></thead><tbody>
      <tr><td>1</td><td>Disable directory browsing on the affected vhost</td><td class="sev high">HIGH</td></tr>
      <tr><td>2</td><td>Audit the exposed directory and relocate non-public files</td><td class="sev high">HIGH</td></tr>
      <tr><td>3</td><td>Deny direct access to backup/dump extensions</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>4</td><td>Request search-engine cache removal</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>5</td><td>Add a post-deployment configuration check</td><td class="sev med">MEDIUM</td></tr>
      <tr><td>6</td><td>Sweep other hosts in the same estate for the same pattern</td><td class="sev low">LOW</td></tr>
    </tbody></table>
  </section>

  <section id="verify">
    <div class="sec-head"><span class="sec-num">09</span><h2>Verification After Fix</h2></div>
    <div class="code"><div class="code-head"><span class="dots"><i></i><i></i><i></i></span><span>bash</span></div>
<pre><span class="cmd">$ curl -s -o /dev/null -w "%{http_code}\n" https://target/&lt;path&gt;/</span>
<span class="out">403</span>
<span class="cmd">$ curl -s https://target/&lt;path&gt;/ | grep -ci "index of"</span>
<span class="out">0</span></pre></div>
    <p>Confirm as well that files previously listed are no longer retrievable by direct URL. Turning off the listing does not
      revoke access to a filename that is already known.</p>
  </section>

  <section id="timeline">
    <div class="sec-head"><span class="sec-num">10</span><h2>Disclosure Timeline</h2></div>
    <table><thead><tr><th>Date</th><th>Event</th></tr></thead><tbody>
      <tr><td class="k">2026-04-28</td><td>Condition identified; report sent to the operator via its official channel, incl. affected path, technical description, and remediation steps</td></tr>
      <tr><td class="k">2026-07-27</td><td>90-day coordinated disclosure window elapsed with no acknowledgement received</td></tr>
      <tr><td class="k">2026-09-03</td><td>Re-verified as unremediated</td></tr>
      <tr><td class="k">2026-09-03</td><td>Sanitized case study published; affected party not identified</td></tr>
    </tbody></table>
    <p class="muted">The 90-day window follows common industry practice (ISO/IEC 29147, CERT/CC CVD). Because the finding
      remains open, this document withholds the organization, hostname, and path, and publishes only the weakness class and
      its remediation.</p>
  </section>

  <section id="conclusion">
    <div class="sec-head"><span class="sec-num">11</span><h2>Conclusion</h2></div>
    <p>A publicly reachable directory on a government information system returns a full file index to unauthenticated
      visitors. The finding is low to medium in isolation, and its real severity depends on the contents of that directory,
      which were deliberately not examined. The remediation is a single configuration directive, supported by relocating
      non-public files out of the web root. The report was delivered through the operator's official channel more than four
      months before publication, and the condition persists. All observation was read-only - no files were downloaded, no
      data was modified, no authentication was bypassed, and no automated scanning was directed at the target.</p>
  </section>

  <section id="refs">
    <div class="sec-head"><span class="sec-num">12</span><h2>References</h2></div>
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


</body>
</html>