---
title: "TLS Certificate Expired & Hostname Mismatch"
date: "2026-08-29"
poc_num: "02"
target: "Web application (redacted)"
category: "Cryptographic Failures"
severity: "Medium"
severity_note: "Severity is researcher-assessed based on observed conditions, not a vendor rating."
impact: "Potential credential interception, session hijacking, and in-transit data modification by an on-path attacker."
status: "Proven"
---

## Summary

    
The target's TLS certificate had expired before the test date, and its Common Name (CN) did not match the accessed
      domain. Modern browsers and HTTP clients therefore show security warnings and cannot verify server identity, weakening
      transport security against an on-path **man-in-the-middle** attacker.

    
Stack fingerprint: nginx + PHP (version redacted), identified from HTTP response headers.

    Note on severity
      This finding is rated **Medium**, not Critical. Exploitation requires an attacker already in an on-path
      position (AC:High) and a user who dismisses the browser warning (UI:Required). Rating a warning-gated, position-dependent
      TLS issue as Critical would overstate real-world risk.
  

  
    02
## Authorization Status & Scope

    
      Authorization statusAuthorized testing - black-box, external
      Discovery methodUnauthenticated TLS inspection of a public endpoint
      Authentication bypassedNO - no credentials required
      Automated scanningLimited - curl, openssl, single nmap ssl-cert script
      Testing environmentProduction, read-only, non-destructive
      Data accessed / modifiedNO
      Target identified hereNO
    
  

  
    03
## Preconditions

    
      
- Black-box testing from an external network, no authentication.
      
- No account or credentials required - the finding is publicly verifiable.
      
- Tools: `curl`, `openssl s_client`, Nmap ssl-cert script.
      
- All testing read-only and non-destructive.
    
  

  
    04
## PoC 1 - TLS verification via curl

    
*Objective:* demonstrate that the certificate is invalid and causes verification errors.

    bash

$ curl -vI https://TARGET 2>&1 | grep -E "expire|CN=|subject|SSL|certificate"
* SSL certificate problem: certificate has expired
* SSL certificate problem: hostname mismatch
curl: (60) SSL certificate problem: certificate has expired

    
curl rejected the connection due to an expired certificate. The expiry date was confirmed to have passed before the
      test date. Modern browsers display a "Your connection is not private" warning to end users.

  

  
    05
## PoC 2 - Certificate detail via OpenSSL

    
*Objective:* extract certificate details to confirm the expiry date and hostname mismatch.

    bash

$ echo | openssl s_client -connect TARGET:443 -servername TARGET 2>/dev/null \
    | openssl x509 -noout -subject -issuer -dates
subject=CN = <redacted>
issuer=C = US, O = Let's Encrypt, CN = R3
notBefore=<redacted>  notAfter=<redacted> [EXPIRED]

    
The certificate's CN does not cover the target domain; the registered CN/SAN belongs to a different domain, causing
      hostname verification to fail on all compliant TLS clients.

  

  
    06
## PoC 3 - SSL audit via Nmap

    
*Objective:* confirm the finding with an independent tool.

    bash

$ nmap -p 443 --script ssl-cert TARGET
443/tcp open  https
| ssl-cert: Issuer: commonName=R3/organizationName=Let's Encrypt
| Public Key type: rsa | bits: 2048
| Not valid before: <redacted>
|_Not valid after:  <redacted> [EXPIRED]

    
Nmap's ssl-cert script confirms the certificate has passed its `Not valid after` date,
      consistent with the curl and openssl results.

  

  
    07
## Impact & Attack Scenario

    
With an invalid certificate, an attacker in an on-path position (e.g. a shared network, ARP poisoning) can target
      users habituated to dismissing TLS warnings. Once a user clicks through the warning, transport confidentiality and
      integrity are no longer guaranteed.

    Impact
      **A. Credential interception** - login credentials can be captured in the absence of valid TLS.

      **B. Session hijacking** - session tokens sent without valid TLS can be stolen and replayed.

      **C. Integrity violation** - an on-path attacker can modify data in transit.
    
    Findings not claimed
      
        
- Active MitM exploitation - not proven (non-destructive testing).
        
- User data access - not performed.
        
- Historical traffic decryption - not performed.
      
    
  

    
    08
## Severity Assessment

    
Severity is researcher-assessed based on the observed conditions: exploitation requires an on-path (MITM)
      position and the victim dismissing a browser certificate warning, and any exposure is warning-gated. This places
      the finding in the Medium band - rescored from an earlier Critical rating; the accurate rating is what a triager
      expects for a warning-gated, position-dependent TLS finding.

  

  
    09
## Root Cause

    
No auto-renewal mechanism and no proactive expiry monitoring for TLS certificates. Let's Encrypt certificates are
      valid for 90 days and must be renewed on schedule. The hostname mismatch indicates the installed certificate was issued
      for a different domain or subdomain - most likely a deployment misconfiguration.

  

  
    10
## Solution & Recommendations

    
### renew & auto-renew

    bash

$ certbot --nginx -d TARGET          # renew with correct CN/SAN
$ systemctl enable --now certbot.timer
$ certbot renew --dry-run            # verify auto-renewal

    
### nginx - TLS + HSTS

    nginx

ssl_certificate     /etc/letsencrypt/live/TARGET/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/TARGET/privkey.pem;
ssl_protocols TLSv1.2 TLSv1.3;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    
### remediation priority

    #RemediationPriority
      1Renew TLS certificate with correct CN/SANHIGH
      2Enable Certbot auto-renewalHIGH
      3Implement HSTS headerMEDIUM
      4Certificate expiry monitoring (alert at D-14)MEDIUM
    
  

  
    11
## Verification After Fix

    bash

$ curl -vI https://TARGET 2>&1 | grep -E "expire|subject|SSL"
# no certificate errors; notAfter is in the future; CN/SAN matches the domain

  

  
    12
## Conclusion

    
An expired certificate combined with a hostname mismatch removes the guarantees of transport encryption and server
      authentication for users who click through the warning. Remediation is fast and free with Let's Encrypt Certbot and
      should be paired with auto-renewal and expiry monitoring. The realistic risk is Medium - meaningful, but gated by an
      on-path position and a user action.

  

  
    13
## References

    
      
- CWE-295 - Improper Certificate Validation
      
- OWASP A02:2021 - Cryptographic Failures
    
  

&#8593;
