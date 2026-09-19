---
title: "Vulnerability Scanning Lab - GVM/OpenVAS with Docker"
date: "2026-09-01"
lab_num: "01"
category: "Vulnerability Scanning"
difficulty: "Beginner"
status: "done"
stack:
  - "GVM/OpenVAS"
  - "Docker Compose"
  - "PostgreSQL"
---

<a class="backlink" href="/lab/collect-lab.html">&larr; back to Homelab index</a>
  
  <header class="doc">
    <h1>Homelab-01 - Vulnerability Scanning Lab<br>GVM / OpenVAS with Docker Compose</h1>
    <dl class="docmeta">
      <div><dt>CATEGORY</dt><dd>Vulnerability Scanning</dd></div>
      <div><dt>DIFFICULTY</dt><dd><span class="badge beginner">BEGINNER</span></dd></div>
      <div><dt>STACK</dt><dd>GVM &middot; OpenVAS &middot; Docker Compose &middot; PostgreSQL</dd></div>
      <div><dt>DATE</dt><dd>2026-09-01</dd></div>
      <div><dt>TIME EST.</dt><dd>~45 minutes</dd></div>
    </dl>
  </header>

  <section>
    <h2><i>01</i> Overview</h2>
    <p>Greenbone Vulnerability Manager (GVM) adalah pemindai kerentanan open-source yang memeriksa host terhadap ribuan CVE. Lab ini menjalankan stack lengkap menggunakan konfigurasi Docker Compose resmi <code>greenbone-community-edition</code>.</p>
    <p class="note">Semua pemindaian harus dilakukan terhadap host yang Anda miliki atau yang telah memberikan izin tertulis untuk diuji.</p>
  </section>

  <section>
    <h2><i>02</i> Prerequisites</h2>
    <ul>
      <li>Docker Engine &ge; 24 and Docker Compose v2</li>
      <li>At least 4 GB RAM free (GVM is memory-hungry during feed sync)</li>
      <li>A lab target - e.g. a Metasploitable2 container on an isolated network</li>
    </ul>
  </section>

  <section>
    <h2><i>03</i> docker-compose.yml</h2>
<pre>version: "3.9"

# Greenbone Community Containers - single-host GVM stack

services:

  vuln-tests:
    image: greenbone/vulnerability-tests
    environment:
      STORAGE_PATH: /var/lib/openvas/22.04/vt-data/nasl
    volumes:
      - vt_data_vol:/mnt
    command: sync

  notus-data:
    image: greenbone/notus-data
    volumes:
      - notus_data_vol:/mnt
    command: sync

  scap-data:
    image: greenbone/scap-data
    volumes:
      - scap_data_vol:/mnt
    command: sync

  cert-bund-data:
    image: greenbone/cert-bund-data
    volumes:
      - cert_data_vol:/mnt
    command: sync

  dfn-cert-data:
    image: greenbone/dfn-cert-data
    volumes:
      - cert_data_vol:/mnt
    command: sync
    depends_on:
      - cert-bund-data

  data-objects:
    image: greenbone/data-objects
    volumes:
      - data_objects_vol:/mnt
    command: sync

  pg-gvm:
    image: greenbone/pg-gvm:stable
    restart: on-failure
    volumes:
      - psql_data_vol:/var/lib/postgresql
      - psql_socket_vol:/var/run/postgresql

  gvmd:
    image: greenbone/gvmd:stable
    restart: on-failure
    volumes:
      - gvmd_data_vol:/var/lib/gvm
      - scap_data_vol:/var/lib/gvm/scap-data/
      - cert_data_vol:/var/lib/gvm/cert-data/
      - data_objects_vol:/var/lib/gvm/data-objects/gvmd
      - vt_data_vol:/var/lib/openvas/plugins
      - psql_data_vol:/var/lib/postgresql
      - gvmd_socket_vol:/run/gvmd
      - ospd_openvas_socket_vol:/run/ospd
      - notus_data_vol:/var/lib/notus
      - psql_socket_vol:/var/run/postgresql
    depends_on:
      pg-gvm:
        condition: service_started

  gsa:
    image: greenbone/gsa:stable
    restart: on-failure
    ports:
      - "9392:80"
    volumes:
      - gvmd_socket_vol:/run/gvmd
    depends_on:
      - gvmd

  ospd-openvas:
    image: greenbone/ospd-openvas:stable
    restart: on-failure
    init: true
    cap_add:
      - NET_ADMIN
      - NET_RAW
    security_opt:
      - seccomp=unconfined
      - apparmor=unconfined
    command:
      - ospd-openvas
      - -f
      - --config
      - /etc/gvm/ospd-openvas.conf
      - --notus-feed-dir
      - /var/lib/notus/advisories
      - -m
      - "666"
    volumes:
      - gpg_data_vol:/etc/openvas/gnupg
      - vt_data_vol:/var/lib/openvas/plugins
      - notus_data_vol:/var/lib/notus
      - ospd_openvas_socket_vol:/run/ospd
      - redis_socket_vol:/run/redis/

  notus-scanner:
    image: greenbone/notus-scanner:stable
    restart: on-failure
    volumes:
      - notus_data_vol:/var/lib/notus
      - gpg_data_vol:/etc/openvas/gnupg
    environment:
      NOTUS_SCANNER_MQTT_NAME: notus-scanner
      NOTUS_SCANNER_PRODUCTS_DIRECTORY: /var/lib/notus/products

  mqtt-broker:
    restart: on-failure
    image: eclipse-mosquitto:2.0
    volumes:
      - mosquitto_data_vol:/mosquitto/data
      - mosquitto_logs_vol:/mosquitto/log
    command:
      - /usr/sbin/mosquitto
      - -c
      - /mosquitto/config/mosquitto.conf

  redis-server:
    image: greenbone/redis-server
    restart: on-failure
    volumes:
      - redis_socket_vol:/run/redis

volumes:
  gpg_data_vol:
  scap_data_vol:
  cert_data_vol:
  data_objects_vol:
  gvmd_data_vol:
  vt_data_vol:
  notus_data_vol:
  psql_data_vol:
  psql_socket_vol:
  gvmd_socket_vol:
  ospd_openvas_socket_vol:
  redis_socket_vol:
  mosquitto_data_vol:
  mosquitto_logs_vol:</pre>
  </section>

  <section>
    <h2><i>04</i> Start &amp; First Login</h2>
<pre># 1. Pull images and start
docker compose up -d

# 2. Wait for gvmd (~3-5 min first run)
docker compose logs -f gvmd | grep -i "finished"

# 3. Create admin user (one-time)
docker compose exec -u gvmd gvmd gvmd   --create-user=admin   --password=changeme123

# 4. Open dashboard
open http://localhost:9392
# Login: admin / changeme123</pre>
  </section>

  <section>
    <h2><i>05</i> Run First Scan (CLI)</h2>
<pre># Install gvm-tools
pip install gvm-tools

# Check version via API
gvm-cli --gmp-username admin --gmp-password changeme123   socket --socketpath /run/gvmd/gvmd.sock   --xml "&lt;get_version/&gt;"

# Force feed update
docker compose exec -u gvmd gvmd greenbone-feed-sync</pre>
  </section>

  <section>
    <h2><i>06</i> Tear Down</h2>
<pre># Stop (keep data)
docker compose stop

# Full cleanup including volumes
docker compose down -v</pre>
  </section>

</div>

<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>