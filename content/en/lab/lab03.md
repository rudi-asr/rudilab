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

Homelab-03 - Wazuh SIEM Lab

- 

- 

- 

  
- 

**

  ← back to Homelab index
  
  

  
    
## 01 Overview

    
Wazuh is an open-source SIEM and XDR platform. This lab deploys the full stack - Wazuh Manager** (rule engine), **Wazuh Indexer** (OpenSearch backend), and **Wazuh Dashboard** (Kibana-compatible UI) - using the official Docker Compose setup.

    
Minimum: 4 vCPU, 8 GB RAM, 50 GB disk. On smaller machines lower the Indexer heap size.

  

  
    
## 02 Clone & Generate Certs

git clone https://github.com/wazuh/wazuh-docker.git -b v4.9.2 --depth 1
cd wazuh-docker/single-node

# Generate self-signed TLS certificates
docker compose -f generate-indexer-certs.yml run --rm generator

  

  
    
## 03 docker-compose.yml (key services)

version: "3.9"

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
  wazuh_logs:

  

  
    
## 04 Start & Access Dashboard

docker compose up -d

# Wait for indexer (~2 min)
docker compose logs -f wazuh.indexer | grep "started"

# Dashboard: https://localhost
# Login: admin / SecretPassword

  

  
    
## 05 Enroll a Linux Agent

# On Ubuntu/Debian agent:
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | apt-key add -
echo "deb https://packages.wazuh.com/4.x/apt/ stable main"   | tee /etc/apt/sources.list.d/wazuh.list
apt update && apt install -y wazuh-agent

WAZUH_MANAGER="<your-host-ip>" WAZUH_AGENT_NAME="lab-ubuntu-01"   dpkg-reconfigure wazuh-agent

systemctl enable --now wazuh-agent

  

  
    
## 06 Custom Detection Rule

# Inside wazuh.manager container:
docker compose exec wazuh.manager bash

cat >> /var/ossec/etc/rules/local_rules.xml <<'EOF'
<group name="local,lab,">
  <rule id="100001" level="10">
    <if_group>syslog</if_group>
    <match>Failed password</match>
    <description>Lab: SSH brute force attempt detected</description>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>
</group>
EOF

/var/ossec/bin/ossec-control restart

  

  
    
## 07 Tear Down

docker compose down -v

  

&#8593;