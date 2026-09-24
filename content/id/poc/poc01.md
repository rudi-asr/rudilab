---
title: "Broken Access Control / Improper Resource Isolation"
date: "2026-08-20"
poc_num: "01"
kicker: "PENETRATION TEST FINDINGS REPORT - Authorized Testing"
capture: "poc-01.pcap"
capture_note: "low-privilege account reads restricted org resources"
intro: "Akun yang baru didaftarkan dengan peran SDR (Sales Development Representative) dapat mengakses informasi organisasi dan sumber daya yang seharusnya tidak dapat diakses oleh pengguna baru dengan hak akses rendah."
severity: "Medium"
cwe: "CWE-862 - Missing Authorization"
cwe_secondary: "CWE-200 - Exposure of Sensitive Information"
owasp: "A01:2021 - Broken Access Control"
target: "[REDACTED] - SaaS web application"
test_date: "2026-08-20"
status: "CONFIRMED"
tester: "Rudi - Offensive Security"
sev_note: "Tingkat keparahan dinilai oleh peneliti berdasarkan kondisi yang diamati, bukan penilaian vendor."
authz_label: "Otorisasi & pengungkapan."
authz: "Pengujian dilakukan dalam otorisasi, dibatasi ruang lingkup dan bersifat non-destruktif. Semua permintaan hanya baca kecuali pembuatan satu akun PoC. Tidak ada data produksi yang tersentuh - identifier yang digunakan adalah nilai palsu/PoC. Host, nama produk, dan data pribadi disembunyikan untuk rilis publik. Ini adalah showcase yang telah disanitasi, bukan laporan rahasia."
---

## Ringkasan {#summary}

Akun yang baru didaftarkan dengan peran SDR (Sales Development Representative) dapat mengakses informasi organisasi dan sumber daya yang seharusnya tidak dapat diakses oleh pengguna baru dengan hak akses rendah.

Endpoint `GET /api/v1/orgs/me/members` mengembalikan daftar lengkap anggota organisasi beserta perannya ke akun baru tersebut. Secara terpisah, `GET /api/v1/research/discover/batches` mengembalikan batch riset yang sudah ada ke akun PoC yang belum pernah melakukan aktivitas discovery apapun.

Fingerprint backend: FastAPI (Python) + SQLAlchemy + Uvicorn - disimpulkan dari skema error Pydantic. IDOR org-switch (POST /api/v1/orgs/switch) mengembalikan 403 dan tidak rentan (lihat PoC 4).

## Peta Risiko {#riskmap}

| ID | Severity | Kelas Kerentanan | Bukti | CWE | Status Perbaikan |
|---|---|---|---|---|---|
| F-01 | Medium | Broken Access Control - Daftar Anggota | `GET /orgs/me/members` → 200 (akun SDR baru) | CWE-862 / CWE-200 | Tidak diklaim |
| F-02 | Medium | Broken Access Control - Research Batches | `GET /research/discover/batches` → 200 (akun belum aktif) | CWE-862 / CWE-200 | Tidak diklaim |

## Status Otorisasi & Ruang Lingkup {#scope}

| | |
|---|---|
| **Authorization status** | Authorized testing - scope-strict, non-destructive |
| **Discovery method** | Public registration + authenticated API requests |
| **Authentication bypassed** | NO - legitimately registered low-privilege account |
| **Automated scanning** | NOT performed - manual requests only |
| **Testing environment** | Production, read-only (except one PoC account creation) |
| **Production data accessed** | NO - PoC/fake identifiers only |
| **Data modified or destroyed** | NO |
| **Target identified here** | NO |

## Prasyarat {#pre}

- New account with the SDR role registered through the public registration endpoint.
- JWT obtained directly from the registration response - no email verification or admin approval required.
- Testing performed without touching real production data; identifiers were fake/PoC values.
- All requests read-only except PoC 1 (new account registration).

## PoC 1 - Self-registration creates an active account + JWT {#poc1}

*Tujuan:* menunjukkan bahwa pendaftaran publik membuat akun aktif dan mengembalikan token autentikasi tanpa verifikasi atau persetujuan lebih lanjut.

```bash {label="bash"}
$ TARGET="https://TARGET"
$ EMAIL="poc_$(date +%s)@example.test"
$ curl -i -X POST "$TARGET/api/v1/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"'"$EMAIL"'","name":"PoC Test","password":"[REDACTED]"}'
HTTP/1.1 200 OK

{ "access_token": "eyJ...", ... }
```

Pendaftaran publik langsung menghasilkan sesi terautentikasi. JWT diterbitkan tanpa verifikasi email atau persetujuan admin.

Catatan: ini bukan kerentanan tersendiri jika tidak ada persyaratan yang melarang pendaftaran mandiri - tetapi ini adalah prasyarat yang memungkinkan seorang penguji luar mendapatkan akun aktif.

![PoC login page, account redacted](/images/img-poc/poc01/poc01.jpg "Figure 1 - login page with the PoC account redacted.")

## PoC 2 - New user can view the member list {#poc2}

*Tujuan:* menunjukkan bahwa akun SDR yang baru didaftarkan dapat membaca daftar anggota organisasi dan peran mereka.

```bash {label="bash"}
$ curl -i "$TARGET/api/v1/orgs/me/members" \
    -H "Authorization: Bearer <JW...>"
HTTP/1.1 200 OK

[ { "email": "...", "role": "..." },
  { "email": "...", "role": "owner" } ]
```

Akun SDR baru tanpa riwayat aktivitas dapat melihat daftar anggota lengkap beserta peran mereka, termasuk akun admin.

![PoC account dashboard after login](/images/img-poc/poc01/poc02.jpg "Figure 2 - PoC account dashboard after successful login.")

## PoC 3 - New user can view existing research batches {#poc3}

*Tujuan:* menunjukkan bahwa akun SDR baru tanpa aktivitas discovery dapat membaca batch riset yang sudah ada milik pengguna lain.

Akun baru tanpa aktivitas discovery sebelumnya menerima respons berisi batch riset lengkap yang sudah ada milik pengguna lain.

Catatan: tidak diklaim sebagai cross-tenant IDOR - batas kepemilikan/tenant belum ditetapkan secara definitif. Temuan ini adalah akses sumber daya yang berlebihan dalam tenant yang sama.

## PoC 4 - Org switching (negative test / not vulnerable) {#poc4}

Tujuan: mencegah klaim berlebihan dengan menyertakan uji negatif untuk IDOR org-switch.

Kesimpulan: IDOR org-switch TIDAK rentan. Server dengan benar mengembalikan 403 pada permintaan switching lintas-tenant.

## Dampak {#impact}

> IMPACT:: Impact
>
> **A. Member-list disclosure.** A new SDR account can read the full member list and roles, including owner accounts - usable for account enumeration, social engineering, or targeted attacks on higher-privilege accounts.
>
> **B. Unauthorized resource visibility.** A new account with no activity can view existing research batches, including status and prospect count - potentially exposing commercial data that should be isolated.

> NOTCLAIMED:: Findings not claimed
>
> - Credentials exposure - not proven.
> - Invitation takeover - not proven.
> - Cross-tenant IDOR - not proven (ownership boundaries not confirmed).
> - Prospect PII exposure - not proven.

## Penilaian Keparahan {#cvss}

Tingkat keparahan dinilai peneliti berdasarkan kondisi yang diamati: kelemahan ada di lapisan otorisasi resource, bukan lapisan autentikasi.

## Akar Masalah {#rootcause}

No adequate authorization check on `/api/v1/orgs/me/members` and `/api/v1/research/discover/batches`. Both endpoints validate only that the request carries a valid token (**authentication**) but never validate whether the caller is authorized to access the returned resource (**authorization**).

## Solusi & Rekomendasi {#fix}

### before - vulnerable pattern

```python {label="python"}
# VULNERABLE: returns all members without an org filter
def get_org_members(db, current_user):
    return db.query(Member).all()
```

### after - secure pattern

```python {label="python"}
def get_org_members(db, current_user):
    caller_org_id = current_user.organization_id
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.org_id  == caller_org_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")
    return db.query(Member).filter(
        Member.org_id == caller_org_id
    ).all()
```

### authorization for /orgs/me/members (FastAPI)

```python {label="python"}
@router.get('/orgs/me/members')
def list_org_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.active_org_id:
        raise HTTPException(status_code=403, detail='No active organization')
    membership = db.query(Membership).filter(
        Membership.user_id == current_user.id,
        Membership.org_id  == current_user.active_org_id,
        Membership.is_active == True,
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail='Not a member of this organization')
    return db.query(Member).filter(
        Member.org_id == current_user.active_org_id
    ).all()
```

### authorization for /research/discover/batches

```python {label="python"}
@router.get('/research/discover/batches')
def get_batches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=10, le=100),
):
    # Option A: strict - only batches owned by the caller
    batches = db.query(Batch).filter(
        Batch.created_by == current_user.id
    ).order_by(Batch.created_at.desc()).limit(limit).all()
    # Option B: org-scoped - if batches are shared within the org
    # batches = db.query(Batch).filter(
    #     Batch.org_id == current_user.active_org_id
    # ).order_by(Batch.created_at.desc()).limit(limit).all()
    return {'batches': batches}
```

> FIX:: Least-privilege matrix
>
> | Endpoint | Owner | Manager | SDR |
> |---|---|---|---|
> | GET /orgs/me/members | Yes (all) | Yes (all) | Yes (self) |
> | GET /research/.../batches | Yes (all) | Yes (team) | Yes (self-owned) |
> | POST /orgs/switch | Yes | No | No |
> | GET /orgs/me/prospects | Yes | Yes (team) | Yes (assigned only) |

### remediation priority

| # | Remediation | Priority |
|---|---|---|
| 1 | Authorization filter for /orgs/me/members | HIGH |
| 2 | Authorization filter for /research/.../batches | HIGH |
| 3 | Implement RBAC permission matrix for SDR | HIGH |
| 4 | Audit logging for sensitive endpoints | MEDIUM |
| 5 | Regression / automated security test | MEDIUM |
| 6 | Review other endpoints with similar patterns | MEDIUM |

## Kesimpulan {#conclusion}

A new SDR account can read information that should not be exposed: the organization member list (PoC 2) and existing research batches (PoC 3). Both endpoints perform an authentication check but lack an adequate authorization check. The org-switch IDOR was not proven - the endpoint correctly returns 403 - and is excluded as a finding. All testing was read-only, with no brute force, no data changes, and no access to production accounts or data.

## Referensi {#refs}

- [CWE-284 - Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- [CWE-285 - Improper Authorization](https://cwe.mitre.org/data/definitions/285.html)
- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)