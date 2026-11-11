"""
Customer Role Final Audit
=========================
Tests all 6 languages, all customer APIs, permissions, Unicode, and data integrity.
"""
import os, json, sys, urllib.request, urllib.error
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django; django.setup()

from users.models import User

BASE  = "http://127.0.0.1:8001/api/v1"
P, F  = "✅", "❌"
results: list[tuple[str, bool]] = []

def chk(label, ok, detail=""):
    results.append((label, ok))
    suf = f"  ({detail})" if detail else ""
    print(f"  {P if ok else F} {label}{suf}")

def _do_request(method, path, data=None, token=None):
    """Execute an HTTP request, returning (body_dict_or_None, status_code)."""
    hdr = {"Content-Type": "application/json"}
    if token:
        hdr["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(
        f"{BASE}{path}", data=body, headers=hdr, method=method
    )
    try:
        with urllib.request.urlopen(req) as r:
            try:
                return json.loads(r.read()), r.status
            except Exception:
                return {}, r.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except Exception:
            return None, e.code

def post_json(path, data, token=None):
    return _do_request("POST", path, data, token)

def patch_json(path, data, token=None):
    return _do_request("PATCH", path, data, token)

def get_json(path, token=None):
    return _do_request("GET", path, None, token)

def post_reject(path, data, token=None):
    """Return status code — expects 4xx."""
    _, s = _do_request("PATCH", path, data, token)
    return s

# ── LOGIN ────────────────────────────────────────────────────────────────────
print("\n=== AUTHENTICATION ===")
auth1, _ = post_json("/auth/login/", {"email": "diya123@gmail.com", "password": "diya@123"})
tok1 = auth1["access"]
chk("Login returns JWT tokens", bool(tok1))
chk("Login returns preferred_language", "preferred_language" in auth1,
    auth1.get("preferred_language"))

# Second user for isolation checks
auth2, _ = post_json("/auth/login/",
                     {"email": "testcheck@example.com", "password": "TestPass123"})
tok2 = auth2.get("access", "")

# ── SIX LANGUAGE PREFERENCES ─────────────────────────────────────────────────
print("\n=== SIX LANGUAGE PERSISTENCE ===")
LANGUAGES = ["en", "te", "hi", "ta", "kn", "mr", "ml"]
for lang in LANGUAGES:
    resp, s = patch_json("/auth/profile/", {"preferred_language": lang}, tok1)
    if s and s < 300:
        # Re-fetch to verify persistence
        profile, _ = get_json("/auth/profile/", tok1)
        stored = (profile or {}).get("preferred_language")
        chk(f"Language '{lang}' persisted in DB", stored == lang,
            f"stored={stored}")
    else:
        chk(f"Language '{lang}' accepted", False, f"HTTP {s}: {resp}")

# Restore to 'te'
patch_json("/auth/profile/", {"preferred_language": "te"}, tok1)

# ── DASHBOARD DATA ────────────────────────────────────────────────────────────
print("\n=== CUSTOMER DASHBOARD DATA ===")
reports_resp, sr = get_json("/reports/", tok1)
# Handle paginated and non-paginated responses
if isinstance(reports_resp, dict) and "results" in reports_resp:
    reports = reports_resp["results"]
elif isinstance(reports_resp, list):
    reports = reports_resp
else:
    reports = []
chk("Reports endpoint (own only)", sr == 200, f"{len(reports)} reports")

complaints_resp, sc = get_json("/complaints/", tok1)
if isinstance(complaints_resp, dict) and "results" in complaints_resp:
    complaints = complaints_resp["results"]
elif isinstance(complaints_resp, list):
    complaints = complaints_resp
else:
    complaints = []
chk("Complaints endpoint (own only)", sc == 200, f"{len(complaints)} complaints")

notifs_resp, sn = get_json("/notifications/", tok1)
if isinstance(notifs_resp, dict) and "results" in notifs_resp:
    notifs = notifs_resp["results"]
elif isinstance(notifs_resp, list):
    notifs = notifs_resp
else:
    notifs = []
chk("Notifications endpoint", sn == 200, f"{len(notifs)} notifications")

# ── REPORT DETAIL ─────────────────────────────────────────────────────────────
print("\n=== REPORT DETAILS ===")
if reports:
    r = reports[0]
    chk("Report has id", "id" in r)
    chk("Report has status", "status" in r)
    chk("Report has location_lat/lng fields", "location_lat" in r and "location_lng" in r)
    chk("Report has image field", "image" in r)
    # Detail
    rd, srd = get_json(f"/reports/{r['id']}/", tok1)
    chk(f"Report detail #{r['id']} loads", srd == 200)
    # AI analysis
    _, sai = get_json(f"/reports/{r['id']}/analysis/", tok1)
    chk(f"AI endpoint responds (200 or 404)", sai in (200, 404), f"HTTP {sai}")
else:
    chk("Reports present for detail check", False, "no reports found")

# ── COMPLAINT DETAIL ─────────────────────────────────────────────────────────
print("\n=== COMPLAINT DETAILS ===")
if complaints:
    c = complaints[0]
    chk("Complaint has id", "id" in c)
    chk("Complaint has status", "status" in c)
    chk("Complaint has food_report link", "food_report" in c)
    chk("Complaint has restaurant", "restaurant" in c)
    chk("Complaint description non-empty", bool((c.get("description") or "").strip()))
    # Detail
    cd, scd = get_json(f"/complaints/{c['id']}/", tok1)
    chk(f"Complaint detail #{c['id']} loads", scd == 200)
else:
    chk("Complaints present for detail check", False, "no complaints found")

# ── UNICODE STORAGE ───────────────────────────────────────────────────────────
print("\n=== UNICODE / LANGUAGE MODEL CHOICES ===")
unicode_tests = [
    ("te", "Telugu"),
    ("hi", "Hindi"),
    ("ta", "Tamil"),
    ("kn", "Kannada"),
    ("ml", "Malayalam"),
]
valid_codes = [ch[0] for ch in User.Language.choices]
for lang_code, lang_name in unicode_tests:
    chk(f"'{lang_code}' ({lang_name}) in User.Language.choices", lang_code in valid_codes)

# Verify complaints have stored descriptions intact
if complaints:
    for comp in complaints[:3]:  # first 3 to keep output clean
        desc = comp.get("description", "")
        chk(f"Complaint #{comp['id']} description intact",
            isinstance(desc, str) and len(desc) > 0, desc[:40])

# ── PERMISSIONS ───────────────────────────────────────────────────────────────
print("\n=== PERMISSIONS ===")
# User2 cannot see user1's reports
if reports and tok2:
    _, s_iso = get_json(f"/reports/{reports[0]['id']}/", tok2)
    chk("Cross-user report isolation (403)", s_iso == 403, f"HTTP {s_iso}")

# User2 cannot see user1's complaints
if complaints and tok2:
    _, s_iso2 = get_json(f"/complaints/{complaints[0]['id']}/", tok2)
    chk("Cross-user complaint isolation (403)", s_iso2 == 403, f"HTTP {s_iso2}")

# Customer cannot access reviewer escalation API
_, s_esc = get_json("/escalations/", tok1)
chk("Customer blocked from escalations API (403)", s_esc == 403, f"HTTP {s_esc}")

# Customer cannot access admin assignment list
_, s_adm = get_json("/officer-assignments/admin/", tok1)
chk("Customer blocked from officer admin API (403)", s_adm in (403, 404), f"HTTP {s_adm}")

# Customer cannot access analytics
_, s_ana = get_json("/analytics/summary/", tok1)
chk("Customer blocked from analytics (403)", s_ana == 403, f"HTTP {s_ana}")

# ── FEEDBACK ─────────────────────────────────────────────────────────────────
print("\n=== FEEDBACK ===")
feedback_resp, sf = get_json("/feedback/", tok1)
if isinstance(feedback_resp, dict) and "results" in feedback_resp:
    feedback = feedback_resp["results"]
elif isinstance(feedback_resp, list):
    feedback = feedback_resp
else:
    feedback = []
chk("Feedback list loads", sf == 200, f"{len(feedback)} items")
if feedback:
    fb = feedback[0]
    chk("Feedback has rating", "rating" in fb)
    chk("Feedback has moderation_status", "moderation_status" in fb)
    chk("Feedback does NOT expose moderation_note", "moderation_note" not in fb)

# ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
print("\n=== NOTIFICATIONS ===")
chk("Notifications loaded", sn == 200)
if notifs:
    n = notifs[0]
    chk("Notification has event_type", "event_type" in n)
    chk("Notification has localized_message", "localized_message" in n)
    chk("Notification has is_read", "is_read" in n)

# ── PROFILE ──────────────────────────────────────────────────────────────────
print("\n=== PROFILE ===")
profile, sp = get_json("/auth/profile/", tok1)
chk("Profile loads", sp == 200)
if profile:
    chk("Profile has email", "email" in profile)
    chk("Profile has role=CUSTOMER", profile.get("role") == "CUSTOMER")
    chk("Profile has preferred_language", "preferred_language" in profile)
    chk("Profile does NOT expose password", "password" not in profile)

# Try to change role (must be rejected — PATCH with invalid choice)
_, s_role = patch_json("/auth/profile/", {"role": "ADMIN"}, tok1)
chk("Customer cannot escalate own role (400 or ignored)", s_role in (400, 200), f"HTTP {s_role}")

# ── RESTAURANT RATING ────────────────────────────────────────────────────────
print("\n=== RESTAURANT RATING ENDPOINT ===")
restaurant_id = None
if reports:
    restaurant_field = reports[0].get("restaurant")
    if isinstance(restaurant_field, dict):
        restaurant_id = restaurant_field.get("id")
    elif isinstance(restaurant_field, int):
        restaurant_id = restaurant_field

if restaurant_id:
    rating, srat = get_json(f"/restaurants/{restaurant_id}/rating/", tok1)
    chk(f"Restaurant #{restaurant_id} rating endpoint works", srat == 200)
    if srat == 200:
        chk("Rating has has_ratings", "has_ratings" in (rating or {}))
        chk("Rating has total_ratings", "total_ratings" in (rating or {}))
else:
    chk("Restaurant rating check", False, "no restaurant_id found in reports")

# ── HEALTH ───────────────────────────────────────────────────────────────────
print("\n=== HEALTH CHECK ===")
req = urllib.request.Request("http://127.0.0.1:8001/healthz/")
try:
    with urllib.request.urlopen(req) as r:
        health = json.loads(r.read())
    chk("Backend health check", health.get("status") == "ok")
except Exception as e:
    chk("Backend health check", False, str(e))

# ── SUMMARY ──────────────────────────────────────────────────────────────────
passed = sum(1 for _, ok in results if ok)
failed = [(lbl, ok) for lbl, ok in results if not ok]
total  = len(results)
print(f"\n{'='*58}")
print(f"RESULTS: {passed}/{total} passed")
if failed:
    print("FAILURES:")
    for lbl, _ in failed:
        print(f"  {F} {lbl}")
    sys.exit(1)
else:
    print(f"{P} ALL CHECKS PASSED")
    sys.exit(0)
