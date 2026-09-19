---
title: "SIEM Lab - Wazuh Stack (Manager + Indexer + Dashboard)"
date: "2026-09-03"
lab_num: "03"
category: "SIEM / Blue Team"
difficulty: "Intermediate"
status: "done"
stack:
  - "Wazuh"
  - "OpenSearch"
  - "Docker Compose"
---

<a class="backlink" href="/lab/collect-lab.html">&larr; back to Homelab index</a>
  
  <header class="doc">
    <h1>Homelab-03 - SIEM Lab<br>Wazuh Manager + Indexer + Dashboard</h1>
    <dl class="docmeta">
      <div><dt>CATEGORY</dt><dd>SIEM / Blue Team</dd></div>
      <div><dt>DIFFICULTY</dt><dd><span class="badge intermediate">INTERMEDIATE</span></dd></div>
      <div><dt>STACK</dt><dd>Wazuh 4.x &middot; OpenSearch &middot; Docker Compose</dd></div>
      <div><dt>DATE</dt><dd>2026-09-03</dd></div>
      <div><dt>TIME EST.</dt><dd>~60 minutes</dd></div>
    </dl>
  </header>

  <section>
    <h2><i>01</i> Overview</h2>
    <p>Wazuh is an open-source SIEM and XDR platform. This lab deploys the full stack - <b>Wazuh Manager</b> (rule engine), <b>Wazuh Indexer</b> (OpenSearch backend), and <b>Wazuh Dashboard</b> (Kibana-compatible UI) - using the official Docker Compose setup.</p>
    <p class="note">Minimum: 4 vCPU, 8 GB RAM, 50 GB disk. On smaller machines lower the Indexer heap size.</p>
  </section>

  <section>
    <h2><i>02</i> Clone &amp; Generate Certs</h2>
<pre>git clone https://github.com/wazuh/wazuh-docker.git -b v4.9.2 --depth 1
cd wazuh-docker/single-node

# Generate self-signed TLS certificates
docker compose -f generate-indexer-certs.yml run --rm generator</pre>
  </section>

  <section>
    <h2><i>03</i> docker-compose.yml (key services)</h2>
<pre>version: "3.9"

services:

  wazuh.indexer:
    image: wazuh/wazuh-indexer:4.9.2
    hostname: wazuh.indexer
    restart: always
    ports:
      - "9200:9200"
    environment:
      OPENSEARCH_JAVA_OPTS: "-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - wazuh-indexer-data:/var/lib/wazuh-indexer
      - ./config/wazuh_indexer_ssl_certs/:/usr/share/wazuh-indexer/certs/:ro

  wazuh.manager:
    image: wazuh/wazuh-manager:4.9.2
    hostname: wazuh.manager
    restart: always
    ports:
      - "1514:1514/udp"
      - "1515:1515"
      - "514:514/udp"
      - "55000:55000"
    environment:
      INDEXER_URL: https://wazuh.indexer:9200
      INDEXER_USERNAME: admin
      INDEXER_PASSWORD: SecretPassword
      API_USERNAME: wazuh-wui
      API_PASSWORD: MyS3cr37P450r.*-
    volumes:
      - wazuh_etc:/var/ossec/etc
      - wazuh_logs:/var/ossec/logs
      - ./config/wazuh_indexer_ssl_certs/root-ca-manager.pem:/etc/ssl/root-ca.pem:ro

  wazuh.dashboard:
    image: wazuh/wazuh-dashboard:4.9.2
    hostname: wazuh.dashboard
    restart: always
    ports:
      - "443:5601"
    environment:
      INDEXER_USERNAME: admin
      INDEXER_PASSWORD: SecretPassword
      WAZUH_API_URL: https://wazuh.manager
      API_USERNAME: wazuh-wui
      API_PASSWORD: MyS3cr37P450r.*-
    depends_on:
      - wazuh.indexer
    links:
      - wazuh.indexer:wazuh.indexer
      - wazuh.manager:wazuh.manager

volumes:
  wazuh-indexer-data:
  wazuh_etc:
  wazuh_logs:</pre>
  </section>

  <section>
    <h2><i>04</i> Start &amp; Access Dashboard</h2>
<pre>docker compose up -d

# Wait for indexer (~2 min)
docker compose logs -f wazuh.indexer | grep "started"

# Dashboard: https://localhost
# Login: admin / SecretPassword</pre>
  </section>

  <section>
    <h2><i>05</i> Enroll a Linux Agent</h2>
<pre># On Ubuntu/Debian agent:
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main"   | tee /etc/apt/sources.list.d/wazuh.list
apt update && apt install -y wazuh-agent

WAZUH_MANAGER="&lt;your-host-ip&gt;" WAZUH_AGENT_NAME="lab-ubuntu-01"   dpkg-reconfigure wazuh-agent

systemctl enable --now wazuh-agent</pre>
  </section>

  <section>
    <h2><i>06</i> Custom Detection Rule</h2>
<pre># Inside wazuh.manager container:
docker compose exec wazuh.manager bash

cat &gt;&gt; /var/ossec/etc/rules/local_rules.xml &lt;&lt;'EOF'
&lt;group name="local,lab,"&gt;
  &lt;rule id="100001" level="10"&gt;
    &lt;if_group&gt;syslog&lt;/if_group&gt;
    &lt;match&gt;Failed password&lt;/match&gt;
    &lt;description&gt;Lab: SSH brute force attempt detected&lt;/description&gt;
    &lt;mitre&gt;
      &lt;id&gt;T1110&lt;/id&gt;
    &lt;/mitre&gt;
  &lt;/rule&gt;
&lt;/group&gt;
EOF

/var/ossec/bin/ossec-control restart</pre>
  </section>

  <section>
    <h2><i>07</i> Tear Down</h2>
<pre>docker compose down -v</pre>
  </section>

</div>

<div id="ftr"></div>
<button class="fab-top" id="fabTop" title="Back to top">&#8593;</button>