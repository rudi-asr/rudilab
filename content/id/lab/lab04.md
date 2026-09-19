---
title: "Network IDS/Forensics Lab - Suricata + Zeek"
date: "2026-09-04"
lab_num: "04"
category: "Network Forensics"
difficulty: "Intermediate"
status: "done"
stack:
  - "Suricata"
  - "Zeek"
  - "Docker Compose"
---

Homelab-04 - Suricata + Zeek IDS Lab

- 

- 

- 

  
- 

**

  ← back to Homelab index
  
  

  
    
## 01 Overview

    
Suricata** is a high-performance IDS/IPS engine. **Zeek** is a network analysis framework that generates structured logs (conn.log, dns.log, http.log). Both process the same PCAP so you can correlate Suricata alerts with Zeek connection metadata.

  

  
    
## 02 Directory Layout

ids-lab/
&#x251C;&#x2500;&#x2500; docker-compose.yml
&#x251C;&#x2500;&#x2500; suricata/
&#x2502;   &#x251C;&#x2500;&#x2500; suricata.yaml
&#x2502;   &#x2514;&#x2500;&#x2500; rules/
&#x2502;       &#x2514;&#x2500;&#x2500; local.rules
&#x251C;&#x2500;&#x2500; zeek/
&#x2502;   &#x2514;&#x2500;&#x2500; local.zeek
&#x2514;&#x2500;&#x2500; pcaps/
    &#x2514;&#x2500;&#x2500; sample.pcap

  

  
    
## 03 docker-compose.yml

version: "3.9"

services:

  suricata:
    image: jasonish/suricata:latest
    container_name: suricata
    cap_add:
      - NET_ADMIN
      - SYS_NICE
    volumes:
      - ./suricata/suricata.yaml:/etc/suricata/suricata.yaml:ro
      - ./suricata/rules:/etc/suricata/rules:ro
      - ./pcaps:/pcaps:ro
      - suricata_logs:/var/log/suricata
    # Replay PCAP (remove -r for live capture)
    command: >
      suricata -c /etc/suricata/suricata.yaml
               --runmode single
               -r /pcaps/sample.pcap
               -l /var/log/suricata

  zeek:
    image: zeek/zeek:latest
    container_name: zeek
    volumes:
      - ./zeek/local.zeek:/usr/local/zeek/share/zeek/site/local.zeek:ro
      - ./pcaps:/pcaps:ro
      - zeek_logs:/zeek/logs
    command: >
      zeek -C -r /pcaps/sample.pcap
           /usr/local/zeek/share/zeek/site/local.zeek
           Log::default_logdir=/zeek/logs

volumes:
  suricata_logs:
  zeek_logs:

  

  
    
## 04 suricata.yaml (minimal)

%YAML 1.1
---
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8,172.16.0.0/12]"
    EXTERNAL_NET: "!$HOME_NET"

default-log-dir: /var/log/suricata

outputs:
  - eve-log:
      enabled: yes
      filename: eve.json
      types:
        - alert:
            payload: yes
        - http:
            extended: yes
        - dns:
            version: 2
        - tls:
            extended: yes

rule-files:
  - /etc/suricata/rules/local.rules

  

  
    
## 05 Custom Suricata Rules

# suricata/rules/local.rules

# Detect HTTP GET to /admin
alert http any any -> $HOME_NET any (
  msg:"Lab: HTTP GET to /admin";
  flow:established,to_server;
  http.method; content:"GET";
  http.uri; content:"/admin"; startswith;
  classtype:web-application-attack;
  sid:9000001; rev:1;
)

# Detect suspicious DNS query
alert dns any any -> any 53 (
  msg:"Lab: DNS query for suspicious domain";
  dns.query; content:"malware-test.local"; nocase;
  sid:9000002; rev:1;
)

  

  
    
## 06 Run & Inspect Logs

docker compose up

# Suricata alerts
docker run --rm -v ids-lab_suricata_logs:/logs alpine   cat /logs/eve.json | python3 -c "
import sys,json
for l in sys.stdin:
  try:
    e=json.loads(l)
    if e.get('event_type')=='alert':
      print(e['src_ip'], '-->', e['alert']['signature'])
  except: pass
"

# Zeek conn.log (first 20 connections)
docker run --rm -v ids-lab_zeek_logs:/logs alpine   head -21 /logs/conn.log

  

  
    
## 07 Update Emerging Threats Rules

docker compose exec suricata suricata-update
docker compose exec suricata suricata-update list-sources
docker compose exec suricata suricata-update enable-source et/open

  

  
    
## 08 Tear Down

docker compose down -v

  

&#8593;