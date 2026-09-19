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

Homelab-02 - Web App Pentest Lab

- 

- 

- 

  
- 

**

  ← back to Homelab index
  
  

  
    
## 01 Overview

    
This lab runs two intentionally-vulnerable web apps - DVWA** (classic PHP, covers SQLi/XSS/CSRF/File Upload/Command Injection) and **OWASP Juice Shop** (modern Node.js, covers the full OWASP Top 10) - on an isolated Docker network, with mitmproxy for traffic interception.

    
This setup runs on an isolated Docker bridge network. Do not expose it to your LAN or the internet.

  

  
    
## 02 docker-compose.yml

version: "3.9"

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
      - "8888:8888"         # proxy port

  

  
    
## 03 Start the Lab

docker compose up -d
docker compose ps

# DVWA: http://localhost:8080  (admin / password)
# Juice Shop: http://localhost:3000
# mitmproxy UI: http://localhost:8081

  

  
    
## 04 Configure Burp Suite Upstream Proxy

# Burp Suite User options -> Connections -> Upstream Proxy Servers
# Add rule:
#   Destination host: *
#   Proxy host:       127.0.0.1
#   Proxy port:       8888

# Test via curl
curl -x http://localhost:8888 http://10.10.10.10/DVWA/login.php -I

  

  
    
## 05 Sample: SQLi Test (DVWA low)

# Browser: set DVWA security to Low
# URL: http://localhost:8080/DVWA/security.php

# SQLmap via mitmproxy
sqlmap -u "http://localhost:8080/DVWA/vulnerabilities/sqli/?id=1&Submit=Submit"   --cookie "security=low; PHPSESSID=<your-session-id>"   --proxy http://localhost:8888   --dbs --batch

  

  
    
## 06 Tear Down

docker compose down

  

&#8593;