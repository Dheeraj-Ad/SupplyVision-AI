"""
SupplyVision AI - Hardened Security, Rate Limits, and ROI Integration Test Suite
Runs against the live localhost:8000 FastAPI server.
"""
import urllib.request
import urllib.error
import json
import time

BASE = "http://localhost:8000"
PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"

results = []

def req(method, path, body=None, token=None, cookies=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if cookies:
        headers["Cookie"] = cookies
        
    request_obj = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request_obj) as r:
            # Check for set-cookie header
            res_cookies = r.info().get_all("Set-Cookie")
            return r.status, json.loads(r.read()), res_cookies
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read()), e.info().get_all("Set-Cookie")
        except Exception:
            return e.code, {"detail": str(e)}, e.info().get_all("Set-Cookie")
    except Exception as e:
        return 0, {"detail": str(e)}, None

def check(name, condition, actual=None, expected=None):
    icon = PASS if condition else FAIL
    suffix = ""
    if not condition and actual is not None:
        suffix = f" [got: {actual!r}]"
    if not condition and expected is not None:
        suffix += f" [expected: {expected!r}]"
    results.append((name, condition))
    print(f"  {icon} {name}{suffix}")

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ─────────────────────────────────────────────────────────────────
section("1. READINESS & OBSERVABILITY HEALTH CHECK")

status, body, _ = req("GET", "/health/readiness")
check("GET /health/readiness returns 200", status == 200, status, 200)
check("Readiness check has status", "status" in body)
check("Readiness check has database status", "database" in body)
check("Readiness check has graph twin status", "graph_twin" in body)
check("Readiness check has cache status", "cache" in body)

# ─────────────────────────────────────────────────────────────────
section("2. COOKIE AUTHENTICATION & LOGIN")

status, body, cookies = req("POST", "/api/v1/auth/login", {"email": "ramesh@tamilknitwear.com", "password": "password"})
check("Login returns 200", status == 200, status, 200)
check("Login response sets cookies", cookies is not None and len(cookies) > 0)

access_cookie = None
refresh_cookie = None
if cookies:
    for c in cookies:
        if "access_token" in c:
            access_cookie = c.split(";")[0]
        if "refresh_token" in c:
            refresh_cookie = c.split(";")[0]

check("Login sets access_token cookie", access_cookie is not None)
check("Login sets refresh_token cookie", refresh_cookie is not None)

# Fetch user details using cookies
cookie_payload = f"{access_cookie}; {refresh_cookie}" if access_cookie and refresh_cookie else ""
status, body, _ = req("GET", "/api/v1/auth/me", cookies=cookie_payload)
check("GET /auth/me with cookies returns 200", status == 200, status, 200)
check("GET /auth/me returns correct email", body.get("email") == "ramesh@tamilknitwear.com")
TOKEN = body.get("id")

# ─────────────────────────────────────────────────────────────────
section("3. ROI ANALYTICS DASHBOARD")

status, body, _ = req("GET", "/api/v1/roi", cookies=cookie_payload)
check("GET /roi returns 200", status == 200, status, 200)
check("ROI response has total_at_risk", "total_at_risk" in body)
check("ROI response has business_health_score", "business_health_score" in body)
check("ROI response has expected_savings", "expected_savings" in body)
check("ROI response has single_source_risk_count", "single_source_risk_count" in body)
check("ROI response has savings_history", "savings_history" in body)

# ─────────────────────────────────────────────────────────────────
section("4. ACCOUNT LOCKOUT SIMULATION")

# Make multiple failed login attempts on a fresh email to test lockout
test_email = f"lockout_test_{int(time.time())}@supplyvision.ai"

# Sign up a temp user first
status, body, _ = req("POST", "/api/v1/auth/signup", {
    "email": test_email,
    "password": "correct_password",
    "role": "sme_owner",
    "full_name": "Lockout Test User",
    "preferred_lang": "en",
    "phone_in": "+919999999999"
})
check("Signup of lockout test user returns 200", status == 200, status, 200)

lockout_triggered = False
# Try wrong password 5 times
for i in range(5):
    status, body, _ = req("POST", "/api/v1/auth/login", {"email": test_email, "password": "WRONG_PASSWORD"})
    if status == 401 and "locked" in body.get("detail", "").lower():
        lockout_triggered = True
        break

# The 6th attempt MUST return 401 and say "locked"
if not lockout_triggered:
    status, body, _ = req("POST", "/api/v1/auth/login", {"email": test_email, "password": "WRONG_PASSWORD"})
    check("6th failed login returns account locked", status == 401 and "locked" in body.get("detail", "").lower(), body.get("detail"))
else:
    check("Lockout triggered within 5 attempts", True)

# Try correct password while locked - must still fail
status, body, _ = req("POST", "/api/v1/auth/login", {"email": test_email, "password": "correct_password"})
check("Correct password fails during active lockout", status == 401 and "locked" in body.get("detail", "").lower(), body.get("detail"))

# ─────────────────────────────────────────────────────────────────
section("5. RATE LIMITING (SLOWAPI) CHECK")

# Bombard the forgot-password endpoint to trigger the 10/min rate limit
triggered_429 = False
for _ in range(12):
    status, body, _ = req("POST", "/api/v1/auth/forgot-password", {"email": "ramesh@tamilknitwear.com"})
    if status == 429:
        triggered_429 = True
        break

check("Rate limiting triggers 429 Too Many Requests on auth routes", triggered_429)

# ─────────────────────────────────────────────────────────────────
section("SUMMARY")
total = len(results)
passed = sum(1 for _, ok in results if ok)
failed = total - passed

print(f"\n  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")
if failed == 0:
    print(f"\n  {PASS} All security and ROI checks passed successfully.")
else:
    print(f"\n  {FAIL} Some checks failed.")
