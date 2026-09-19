---
title: "Web App Pentest Lab - DVWA + Juice Shop + Proxy"
date: "2026-09-02"
lab_num: "02"
category: "Web Application Security"
difficulty: "Beginner"
status: "done"
stack:
  - "DVWA"
  - "OWASP Juice Shop"
  - "Docker Compose"
  - "mitmproxy"
---

<a class="backlink" href="/lab/collect-lab.html">&larr; back to Homelab index</a>
  
  <header class="doc">
    <h1>Homelab-02 - Web App Pentest Lab<br>DVWA + Juice Shop + Proxy</h1>
    <dl class="docmeta">
      <div><dt>CATEGORY</dt><dd>Web Application Security</dd></div>
      <div><dt>DIFFICULTY</dt><dd><span class="badge beginner">BEGINNER</span></dd></div>
      <div><dt>STACK</dt><dd>DVWA &middot; OWASP Juice Shop &middot; mitmproxy &middot; Docker Compose</dd></div>
      <div><dt>DATE</dt><dd>2026-09-02</dd></div>
      <div><dt>TIME EST.</dt><dd>~30 minutes</dd></div>
    </dl>
  </header>

  <section>
    <h2><i>01</i> Overview</h2>
    <p>This lab runs two intentionally-vulnerable web apps - <b>DVWA</b> (classic PHP, covers SQLi/XSS/CSRF/File Upload/Command Injection) and <b>OWASP Juice Shop</b> (modern Node.js, covers the full OWASP Top 10) - on an isolated Docker network, with mitmproxy for traffic interception.</p>
    <p class="note">This setup runs on an isolated Docker bridge network. Do not expose it to your LAN or the internet.</p>
  </section>

  <section>
    <h2><i>02</i> docker-compose.yml</h2>
<pre>version: "3.9"

networks:
  pentest-net:
    driver: bridge
    ipam:
      config:
        - subnet: 10.10.10.0/24

services:

  dvwa:
    image: vulnerables/web-dvwa:latest
    container_name: dvwa
    restart: unless-stopped
    networks:
      pentest-net:
        ipv4_address: 10.10.10.10
    ports:
      - "8080:80"           # http://localhost:8080

  juiceshop:
    image: bkimminich/juice-shop:latest
    container_name: juiceshop
    restart: unless-stopped
    networks:
      pentest-net:
        ipv4_address: 10.10.10.20
    ports:
      - "3000:3000"         # http://localhost:3000

  mitmweb:
    image: mitmproxy/mitmproxy:latest
    container_name: mitmweb
    restart: unless-stopped
    command: mitmweb --web-host 0.0.0.0 --web-port 8081 --listen-port 8888
    networks:
      pentest-net:
        ipv4_address: 10.10.10.30
    ports:
      - "8081:8081"         # mitmproxy web UI
      - "8888:8888"         # proxy port</pre>
  </section>

  <section>
    <h2><i>03</i> Start the Lab</h2>
<pre>docker compose up -d
docker compose ps

# DVWA: http://localhost:8080  (admin / password)
# Juice Shop: http://localhost:3000
# mitmproxy UI: http://localhost:8081</pre>
  </section>

  <section>
    <h2><i>04</i> Configure Burp Suite Upstream Proxy</h2>
<pre># Burp Suite User options -&gt; Connections -&gt; Upstream Proxy Servers
# Add rule:
#   Destination host: *
#   Proxy host:       127.0.0.1
#   Proxy port:       8888

# Test via curl
curl -x http://localhost:8888 http://10.10.10.10/DVWA/login.php -I</pre>
  </section>

  <section>
    <h2><i>05</i> Sample: SQLi Test (DVWA low)</h2>
<pre># Browser: set DVWA security to Low
# URL: http://localhost:8080/DVWA/security.php

# SQLmap via mitmproxy
sqlmap -u "http://localhost:8080/DVWA/vulnerabilities/sqli/?id=1&Submit=Submit"   --cookie "security=low; PHPSESSID=&lt;your-session-id&gt;"   --proxy http://localhost:8888   --dbs --batch</pre>
  </section>

  <section>
    <h2><i>06</i> Tear Down</h2>
<pre>docker compose down</pre>
  </section>

</div>

<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>