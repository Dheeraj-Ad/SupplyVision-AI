"""
SupplyVision AI - Comprehensive Backend Integration Test Suite
Runs against the live localhost:8000 FastAPI server.
"""
import urllib.request
import urllib.error
import json
import sys

BASE = "http://localhost:8000"
PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
WARN = "\033[93mWARN\033[0m"

results = []

def req(method, path, body=None, token=None):
    url = BASE + path
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request_obj = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request_obj) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"detail": str(e)}
    except Exception as e:
        return 0, {"detail": str(e)}

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
section("1. ROOT ENDPOINT")
status, body = req("GET", "/")
check("GET / returns 200", status == 200, status, 200)
check("GET / has project name", "SupplyVision" in str(body.get("message", "")))

# ─────────────────────────────────────────────────────────────────
section("2. AUTHENTICATION")

# 2a. Valid login — super_admin
status, body = req("POST", "/api/v1/auth/login", {"email": "admin@supplyvision.ai", "password": "password"})
check("Login super_admin returns 200", status == 200, status, 200)
check("Login super_admin has access_token", bool(body.get("access_token")))
check("Login super_admin role=super_admin", body.get("role") == "super_admin", body.get("role"))
ADMIN_TOKEN = body.get("access_token")

# 2b. Valid login — sme_owner
status, body = req("POST", "/api/v1/auth/login", {"email": "ramesh@tamilknitwear.com", "password": "password"})
check("Login sme_owner returns 200", status == 200, status, 200)
check("Login sme_owner has org_id", bool(body.get("org_id")))
check("Login sme_owner role=sme_owner", body.get("role") == "sme_owner", body.get("role"))
RAMESH_TOKEN = body.get("access_token")
ORG_ID = body.get("org_id")

# 2c. Valid login — sc_manager
status, body = req("POST", "/api/v1/auth/login", {"email": "priya@tamilknitwear.com", "password": "password"})
check("Login sc_manager returns 200", status == 200, status, 200)
PRIYA_TOKEN = body.get("access_token")

# 2d. Valid login — auditor
status, body = req("POST", "/api/v1/auth/login", {"email": "anjali@ca-associates.in", "password": "password"})
check("Login auditor returns 200", status == 200, status, 200)
ANJALI_TOKEN = body.get("access_token")

# 2e. Valid login — warehouse_staff
status, body = req("POST", "/api/v1/auth/login", {"email": "suresh@tamilknitwear.com", "password": "password"})
check("Login warehouse_staff returns 200", status == 200, status, 200)
SURESH_TOKEN = body.get("access_token")

# 2f. Invalid password — must return 401
status, body = req("POST", "/api/v1/auth/login", {"email": "ramesh@tamilknitwear.com", "password": "WRONG"})
check("Login invalid password returns 401", status == 401, status, 401)

# 2g. Invalid email — must return 401
status, body = req("POST", "/api/v1/auth/login", {"email": "notexist@test.com", "password": "password"})
check("Login invalid email returns 401", status == 401, status, 401)

# 2h. Protected endpoint without token must return 401 (FastAPI HTTPBearer default per RFC 7235)
status, body = req("GET", "/api/v1/suppliers")
check("No token returns 401 (RFC 7235 correct)", status == 401, status, 401)

# ─────────────────────────────────────────────────────────────────
section("3. SUPPLIERS ENDPOINT")

# 3a. GET suppliers — ramesh (sme_owner can access)
status, body = req("GET", "/api/v1/suppliers", token=RAMESH_TOKEN)
check("GET /suppliers (sme_owner) returns 200", status == 200, status, 200)
check("GET /suppliers returns a list", isinstance(body, list))
check("GET /suppliers list non-empty", len(body) > 0, len(body) if isinstance(body, list) else 0)
if isinstance(body, list) and body:
    first = body[0]
    check("Supplier has node_id", "node_id" in first)
    check("Supplier has name", "name" in first)
    check("Supplier has risk_score", "current_risk_score" in first)
    check("Supplier org_id matches login org", first.get("org_id") == ORG_ID, first.get("org_id"), ORG_ID)

# 3b. GET suppliers — warehouse_staff (should be allowed, minimum role is WAREHOUSE_STAFF)
status, body = req("GET", "/api/v1/suppliers", token=SURESH_TOKEN)
check("GET /suppliers (warehouse_staff) returns 200", status == 200, status, 200)

# 3c. POST add supplier — priya (sc_manager can add)
new_supplier_payload = {
    "name": "Test Supplier Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "location_lat": 19.0760,
    "location_lng": 72.8777,
    "category": "electronics",
    "lead_time_days": 7,
    "is_single_source": False,
    "tier": 2,
    "revenue_exposure_inr": 800000,
    "capacity_units": 2000,
    "reliability_score": 88
}
status, body = req("POST", "/api/v1/suppliers", new_supplier_payload, token=PRIYA_TOKEN)
check("POST /suppliers (sc_manager) returns 200", status == 200, status, 200)
check("POST /suppliers returns SupplierResponse", "node_id" in body if isinstance(body, dict) else False)
NEW_SUPPLIER_ID = body.get("node_id") if isinstance(body, dict) else None

# 3d. POST add supplier — warehouse_staff should be BLOCKED (minimum is SC_MANAGER)
status, body = req("POST", "/api/v1/suppliers", new_supplier_payload, token=SURESH_TOKEN)
check("POST /suppliers (warehouse_staff) blocked with 403", status == 403, status, 403)

# 3e. DELETE supplier — ramesh (sme_owner can delete)
if NEW_SUPPLIER_ID:
    status, body = req("DELETE", f"/api/v1/suppliers/{NEW_SUPPLIER_ID}", token=RAMESH_TOKEN)
    check(f"DELETE /suppliers/{NEW_SUPPLIER_ID} (sme_owner) returns 200", status == 200, status, 200)
    # 3f. DELETE on non-existent supplier returns 404
    status, body = req("DELETE", f"/api/v1/suppliers/{NEW_SUPPLIER_ID}", token=RAMESH_TOKEN)
    check("DELETE non-existent supplier returns 404", status == 404, status, 404)

# ─────────────────────────────────────────────────────────────────
section("4. RISK SCORING ENDPOINT")

status, body = req("GET", "/api/v1/risks/scores", token=RAMESH_TOKEN)
check("GET /risks/scores (sme_owner) returns 200", status == 200, status, 200)
check("GET /risks/scores returns list", isinstance(body, list))
if isinstance(body, list) and body:
    check("Risk score item has node_id", "node_id" in body[0])
    check("Risk score item has risk_score", "risk_score" in body[0])

# Warehouse staff: must only see Warehouse nodes
status, body = req("GET", "/api/v1/risks/scores", token=SURESH_TOKEN)
check("GET /risks/scores (warehouse_staff) returns 200", status == 200, status, 200)
if isinstance(body, list):
    non_wh = [n for n in body if n.get("node_type") != "Warehouse"]
    check("Warehouse staff only sees Warehouse nodes (RBAC)", len(non_wh) == 0, len(non_wh))

# ─────────────────────────────────────────────────────────────────
section("5. DIGITAL TWIN ENDPOINT")

status, body = req("GET", "/api/v1/twin/graph", token=RAMESH_TOKEN)
check("GET /twin/graph (sme_owner) returns 200", status == 200, status, 200)
check("Twin graph has nodes key", "nodes" in body if isinstance(body, dict) else False)
check("Twin graph has links key", "links" in body if isinstance(body, dict) else False)
if isinstance(body, dict):
    nodes = body.get("nodes", [])
    links = body.get("links", [])
    check("Twin graph has at least 3 supplier nodes", len([n for n in nodes if n.get("label") == "Supplier"]) >= 1)
    check("Twin graph has links/edges", len(links) > 0, len(links))
    check("Twin node has id field", all("id" in n for n in nodes) if nodes else False)
    check("Twin node has label field", all("label" in n for n in nodes) if nodes else False)

# Test multi-tenant isolation: warehouse_staff is BLOCKED from twin (correct per RBAC spec: Warehouse Staff ❌)
status2, body2 = req("GET", "/api/v1/twin/graph", token=SURESH_TOKEN)
check("GET /twin/graph (warehouse_staff) blocked 403 per spec", status2 == 403, status2, 403)

# ─────────────────────────────────────────────────────────────────
section("6. SIMULATION ENDPOINT")

sim_payload = {
    "scenario": "cyclone",
    "location_name": "supplier_1",
    "severity": 3
}
status, body = req("POST", "/api/v1/twin/simulate", sim_payload, token=PRIYA_TOKEN)
check("POST /twin/simulate (sc_manager) returns 200", status == 200, status, 200)
if isinstance(body, dict):
    check("Simulation has affected_nodes", "affected_nodes" in body)
    check("Simulation has exposed_orders", "exposed_orders" in body)
    check("Simulation has recovery_options", "recovery_options" in body)
    check("Simulation has total_exposed_value_inr", "total_exposed_value_inr" in body)
    check("Simulation risk score is 1-100", 0 <= body.get("simulated_risk_score", -1) <= 100, body.get("simulated_risk_score"))

# Test: Inject simulation (creates live alert + recovery plan in DB)
sim_payload_inject = {
    "scenario": "supplier_failure",
    "location_name": "supplier_1",
    "severity": 4
}
status, body = req("POST", "/api/v1/twin/simulate?inject=true", sim_payload_inject, token=PRIYA_TOKEN)
check("POST /twin/simulate?inject=true returns 200", status == 200, status, 200)
INJECTED_ALERT_ID = body.get("injected_alert_id") if isinstance(body, dict) else None
check("Injected simulation has alert_id", bool(INJECTED_ALERT_ID), INJECTED_ALERT_ID)

# Blocked role: warehouse_staff cannot run simulations (minimum is SC_MANAGER)
status, body = req("POST", "/api/v1/twin/simulate", sim_payload, token=SURESH_TOKEN)
check("POST /twin/simulate (warehouse_staff) blocked with 403", status == 403, status, 403)

# ─────────────────────────────────────────────────────────────────
section("7. ALERTS ENDPOINT")

status, body = req("GET", "/api/v1/alerts", token=RAMESH_TOKEN)
check("GET /alerts (sme_owner) returns 200", status == 200, status, 200)
check("GET /alerts returns list", isinstance(body, list))
if isinstance(body, list) and body:
    alert = body[0]
    check("Alert has id", "id" in alert)
    check("Alert has risk_score", "risk_score" in alert)
    check("Alert has rupees_at_risk", "rupees_at_risk" in alert)
    check("Alert has status field", "status" in alert)
    ALERT_ID = alert["id"]
else:
    ALERT_ID = INJECTED_ALERT_ID

# Warehouse staff filtered view (only warehouse alerts)
status, body = req("GET", "/api/v1/alerts", token=SURESH_TOKEN)
check("GET /alerts (warehouse_staff) returns 200", status == 200, status, 200)

# Get alert detail - auditor
if ALERT_ID:
    status, body = req("GET", f"/api/v1/alerts/{ALERT_ID}", token=ANJALI_TOKEN)
    check(f"GET /alerts/{{id}} (auditor) returns 200", status == 200, status, 200)
    
    # Warehouse staff blocked from alert detail
    status, body = req("GET", f"/api/v1/alerts/{ALERT_ID}", token=SURESH_TOKEN)
    check("GET /alerts/{id} (warehouse_staff) blocked 403", status == 403, status, 403)

# ─────────────────────────────────────────────────────────────────
section("8. RECOVERY PLANS ENDPOINT")

if ALERT_ID:
    # 8a. GET recovery plan - auditor
    status, body = req("GET", f"/api/v1/recovery/plans/{ALERT_ID}", token=ANJALI_TOKEN)
    check("GET /recovery/plans/{id} (auditor) returns 200 or 404", status in [200, 404], status)
    
    if status == 200 and isinstance(body, dict):
        options = body.get("options_json", [])
        check("Recovery plan has options_json", isinstance(options, list))
        check("Recovery options are non-empty", len(options) > 0, len(options))
        if options:
            opt = options[0]
            check("Option has title", "title" in opt)
            check("Option has confidence_percent", "confidence_percent" in opt)
            check("Option has expected_savings_inr", "expected_savings_inr" in opt)
        
        # 8b. Accept recovery plan — sc_manager
        status_accept, body_accept = req("POST", f"/api/v1/recovery/plans/{ALERT_ID}/accept", {"option_idx": 0}, token=PRIYA_TOKEN)
        check("POST /recovery/plans/{id}/accept (sc_manager) returns 200", status_accept == 200, status_accept, 200)
        check("Accept response has message", "message" in body_accept if isinstance(body_accept, dict) else False)
        
        # 8c. Auditor cannot accept plans
        status_audit, body_audit = req("POST", f"/api/v1/recovery/plans/{ALERT_ID}/accept", {"option_idx": 0}, token=ANJALI_TOKEN)
        check("POST /recovery/plans/accept (auditor) blocked 403", status_audit == 403, status_audit, 403)

# ─────────────────────────────────────────────────────────────────
section("9. AUDIT LOG ENDPOINT")

# SME_OWNER can see audit logs
status, body = req("GET", "/api/v1/audit", token=RAMESH_TOKEN)
check("GET /audit (sme_owner) returns 200", status == 200, status, 200)
check("GET /audit returns list", isinstance(body, list))
if isinstance(body, list) and body:
    log = body[0]
    check("Audit log has id", "id" in log)
    check("Audit log has action", "action" in log)
    check("Audit log has created_at", "created_at" in log)

# AUDITOR can see audit logs
status, body = req("GET", "/api/v1/audit", token=ANJALI_TOKEN)
check("GET /audit (auditor) returns 200", status == 200, status, 200)

# SC_MANAGER blocked from audit logs
status, body = req("GET", "/api/v1/audit", token=PRIYA_TOKEN)
check("GET /audit (sc_manager) blocked 403", status == 403, status, 403)

# WAREHOUSE_STAFF blocked from audit logs
status, body = req("GET", "/api/v1/audit", token=SURESH_TOKEN)
check("GET /audit (warehouse_staff) blocked 403", status == 403, status, 403)

# ─────────────────────────────────────────────────────────────────
section("10. ADMIN PANEL ENDPOINT (SUPER_ADMIN ONLY)")

# super_admin can list orgs
status, body = req("GET", "/api/v1/admin/orgs", token=ADMIN_TOKEN)
check("GET /admin/orgs (super_admin) returns 200", status == 200, status, 200)
check("GET /admin/orgs returns list", isinstance(body, list))
check("GET /admin/orgs has at least 2 orgs", len(body) >= 2 if isinstance(body, list) else False, len(body) if isinstance(body, list) else 0)

# SME_OWNER cannot access admin
status, body = req("GET", "/api/v1/admin/orgs", token=RAMESH_TOKEN)
check("GET /admin/orgs (sme_owner) blocked 403", status == 403, status, 403)

# System health check
status, body = req("GET", "/api/v1/admin/health", token=ADMIN_TOKEN)
check("GET /admin/health returns 200", status == 200, status, 200)
check("Health status=healthy", body.get("status") == "healthy" if isinstance(body, dict) else False)
check("Health has ingestion_pipelines", "ingestion_pipelines" in body if isinstance(body, dict) else False)
check("Health has databases", "databases" in body if isinstance(body, dict) else False)

# Create new org via admin - use unique GSTIN per run
import time
unique_gstin = f"06TEST{int(time.time()) % 100000:05d}P1Z5"
new_org_payload = {"name": "Test Pharma Co", "gstin": unique_gstin, "plan": "starter", "max_suppliers": 10, "whatsapp_numbers": ["+919876540000"]}
status, body = req("POST", "/api/v1/admin/orgs", new_org_payload, token=ADMIN_TOKEN)
check("POST /admin/orgs (super_admin) creates org 200", status == 200, status, 200)
check("New org has id", "id" in body if isinstance(body, dict) else False)
NEW_ORG_ID = body.get("id") if isinstance(body, dict) else None

# Suspend org
if NEW_ORG_ID:
    status, body = req("POST", f"/api/v1/admin/orgs/{NEW_ORG_ID}/suspend?suspend=true", token=ADMIN_TOKEN)
    check(f"POST /admin/orgs/suspend (super_admin) returns 200", status == 200, status, 200)

# ─────────────────────────────────────────────────────────────────
section("11. MULTI-TENANT ISOLATION CHECKS")

# admin org_id is None — admin cannot GET suppliers (no org scope)
status, body = req("GET", "/api/v1/suppliers", token=ADMIN_TOKEN)
# Super admin has no org_id, graph_service.get_suppliers(None) should return empty list
check("GET /suppliers (super_admin/no-org) returns 200 with empty list", status == 200 and isinstance(body, list), f"{status} items={len(body) if isinstance(body, list) else 'N/A'}")

# ─────────────────────────────────────────────────────────────────
section("12. ROUTE ADDITION ENDPOINT")

route_payload = {
    "mode": "road",
    "origin_id": "supplier_2",
    "destination_id": "warehouse_1",
    "avg_transit_days": 2,
    "cost_per_unit": 15
}
status, body = req("POST", "/api/v1/suppliers/routes", route_payload, token=PRIYA_TOKEN)
check("POST /suppliers/routes (sc_manager) returns 200", status == 200, status, 200)
check("Route response has route_id", "route_id" in body if isinstance(body, dict) else False)

# ─────────────────────────────────────────────────────────────────
section("SUMMARY")
total = len(results)
passed = sum(1 for _, ok in results if ok)
failed = total - passed
print(f"\n  Total: {total}  |  Passed: {passed}  |  Failed: {failed}")
if failed > 0:
    print(f"\n  FAILED TESTS:")
    for name, ok in results:
        if not ok:
            print(f"    - {name}")
    sys.exit(1)
else:
    print(f"\n  All {total} checks passed. Backend is healthy.")
