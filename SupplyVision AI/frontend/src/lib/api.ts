const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000/api/v1";

// Simple state tracking for frontend demo fallback
let mockedState = {
  injectedAlerts: [] as any[],
  acceptedOptions: {} as Record<string, number>,
  suppliers: [
    {
      node_id: "supplier_1",
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      name: "Supplier S1 (Erode Yarn Mill)",
      city: "Erode",
      state: "Tamil Nadu",
      category: "yarn",
      lead_time_days: 4,
      is_single_source: true,
      tier: 1,
      revenue_exposure_inr: 1500000,
      capacity_units: 5000,
      reliability_score: 92,
      current_risk_score: 0
    },
    {
      node_id: "supplier_2",
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      name: "Supplier B (Coimbatore Dyeing)",
      city: "Coimbatore",
      state: "Tamil Nadu",
      category: "dyeing",
      lead_time_days: 3,
      is_single_source: false,
      tier: 2,
      revenue_exposure_inr: 500000,
      capacity_units: 3000,
      reliability_score: 96,
      current_risk_score: 0
    },
    {
      node_id: "supplier_3",
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      name: "Supplier S3 (Chennai Cotton Traders)",
      city: "Chennai",
      state: "Tamil Nadu",
      category: "fabric",
      lead_time_days: 6,
      is_single_source: false,
      tier: 3,
      revenue_exposure_inr: 1600000,
      capacity_units: 6000,
      reliability_score: 89,
      current_risk_score: 0
    }
  ]
};

// Helper to get token
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("access_token");
  }
  return null;
}

// Helper to check if using fallback
let isUsingLocalFallback = false;

export async function request(method: string, path: string, body?: any): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${path}`;

  try {
    let response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (response.status === 401 && !path.includes("/auth/login") && !path.includes("/auth/refresh") && !path.includes("/auth/logout")) {
      try {
        await refreshAccessToken();
        const freshToken = getToken();
        const retryHeaders = {
          "Content-Type": "application/json",
          ...(freshToken ? { "Authorization": `Bearer ${freshToken}` } : {})
        };
        response = await fetch(url, {
          method,
          headers: retryHeaders,
          body: body ? JSON.stringify(body) : undefined,
          credentials: "include",
        });
      } catch (refreshErr) {
        console.error("Refresh token rotation failed:", refreshErr);
        if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_role");
          window.location.href = "/login?expired=true";
        }
      }
    }

    if (!response.ok) {
      const errDetail = await response.json().catch(() => ({}));
      throw new Error(errDetail.detail || `API Request failed with status ${response.status}`);
    }

    isUsingLocalFallback = false;
    return await response.json();
  } catch (error: any) {
    if (error.message && error.message.includes("Failed to fetch") || error.name === "TypeError") {
      isUsingLocalFallback = true;
      console.warn("FastAPI backend is offline. Serving high-fidelity mock data.");
      return handleMockFallback(method, path, body);
    }
    throw error;
  }
}

async function refreshAccessToken() {
  const url = `${BACKEND_URL}/auth/refresh`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("Failed to refresh session");
  }
  const data = await response.json();
  if (data.access_token) {
    localStorage.setItem("access_token", data.access_token);
  }
}


export function isOfflineFallbackActive(): boolean {
  return isUsingLocalFallback;
}

// Mock handlers to make the Next.js app browseable standalone
function handleMockFallback(method: string, path: string, body?: any) {
  const cleanPath = path.split("?")[0];
  
  // Auth login
  if (cleanPath === "/auth/login") {
    const email = body.email;
    let role = "sc_manager";
    let name = "Priya Procurement";
    let lang = "en";
    
    if (email.includes("ramesh")) {
      role = "sme_owner";
      name = "Ramesh MillOwner";
      lang = "hi";
    } else if (email.includes("suresh")) {
      role = "warehouse_staff";
      name = "Suresh Storekeeper";
      lang = "hi";
    } else if (email.includes("anjali")) {
      role = "auditor";
      name = "CA Anjali Auditor";
      lang = "en";
    } else if (email.includes("admin")) {
      role = "super_admin";
      name = "Super Admin Root";
      lang = "en";
    }
    
    return {
      access_token: "mock-jwt-token-expired-never",
      token_type: "bearer",
      role,
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      full_name: name,
      preferred_lang: lang
    };
  }

  // Suppliers List
  if (cleanPath === "/suppliers" && method === "GET") {
    return mockedState.suppliers;
  }

  // Add Supplier
  if (cleanPath === "/suppliers" && method === "POST") {
    const newSupplier = {
      node_id: `supplier_${Math.random().toString(36).substring(7)}`,
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      name: body.name,
      city: body.city,
      state: body.state,
      category: body.category || "yarn",
      lead_time_days: body.lead_time_days || 5,
      is_single_source: body.is_single_source || false,
      tier: body.tier || 2,
      revenue_exposure_inr: body.revenue_exposure_inr || 0,
      capacity_units: body.capacity_units || 1000,
      reliability_score: body.reliability_score || 95,
      current_risk_score: 0
    };
    mockedState.suppliers.push(newSupplier);
    return newSupplier;
  }

  // Risk Scores
  if (cleanPath === "/risks/scores" && method === "GET") {
    return mockedState.suppliers.map(s => ({
      node_id: s.node_id,
      node_type: "Supplier",
      name: s.name,
      risk_score: s.current_risk_score,
      city: s.city,
      state: s.state
    })).concat([
      { node_id: "warehouse_1", node_type: "Warehouse", name: "Warehouse A (Tirupur)", risk_score: 0, city: "Tirupur", state: "Tamil Nadu" }
    ]);
  }

  // Risk Node Details
  if (cleanPath.startsWith("/risks/scores/") && method === "GET") {
    const parts = cleanPath.split("/");
    const nid = parts[parts.length - 1];
    const s = mockedState.suppliers.find(sup => sup.node_id === nid) || { name: "Warehouse A (Tirupur)", current_risk_score: 0 };
    return {
      node_id: nid,
      node_type: nid.includes("warehouse") ? "Warehouse" : "Supplier",
      name: s.name,
      risk_score: s.current_risk_score,
      breakdown: {
        weather_risk: s.current_risk_score > 0 ? 80 : 0,
        port_risk: 0,
        dependency_risk: s.current_risk_score > 0 ? 35 : 0,
        inventory_risk: 0,
        weights: [0.4, 0.2, 0.25, 0.15]
      },
      signals: s.current_risk_score > 0 ? [
        { type: "weather", source: "IMD", event: "Cyclone Alert Level 4", intensity: 4, distance_km: 150, eta_hours: 24 }
      ] : []
    };
  }

  // Active Alerts
  if (cleanPath === "/alerts" && method === "GET") {
    const baselineAlerts = [
      {
        id: "alert_baseline_1",
        org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        node_id: "supplier_1",
        node_type: "Supplier",
        risk_score: 78,
        rupees_at_risk: 1500000,
        signals_json: [
          { type: "weather", source: "IMD", event: "Cyclone warning (Level 4)", intensity: 4, distance_km: 150, eta_hours: 24 }
        ],
        status: "open",
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        resolved_at: null
      }
    ];
    return baselineAlerts.concat(mockedState.injectedAlerts);
  }

  // Alert Detail
  if (cleanPath.startsWith("/alerts/") && cleanPath.endsWith("/resolve")) {
    return { message: "Alert state resolved successfully" };
  }

  if (cleanPath.startsWith("/alerts/") && method === "GET") {
    const parts = cleanPath.split("/");
    const aid = parts[parts.length - 1];
    const liveAlerts = [
      {
        id: "alert_baseline_1",
        org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        node_id: "supplier_1",
        node_type: "Supplier",
        risk_score: 78,
        rupees_at_risk: 1500000,
        signals_json: [
          { type: "weather", source: "IMD", event: "Cyclone warning (Level 4)", intensity: 4, distance_km: 150, eta_hours: 24 }
        ],
        status: "open",
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        resolved_at: null
      }
    ].concat(mockedState.injectedAlerts);

    const match = liveAlerts.find(a => a.id === aid);
    if (!match) throw new Error("Alert not found");
    return match;
  }

  // Recovery Plans
  if (cleanPath.startsWith("/recovery/plans/") && cleanPath.endsWith("/accept")) {
    const parts = cleanPath.split("/");
    const aid = parts[parts.length - 2];
    mockedState.acceptedOptions[aid] = body.option_idx;
    return {
      message: "Option accepted",
      accepted_option_idx: body.option_idx,
      accepted_at: new Date().toISOString()
    };
  }

  if (cleanPath.startsWith("/recovery/plans/") && method === "GET") {
    const parts = cleanPath.split("/");
    const aid = parts[parts.length - 1];
    
    // Check if there is already an accepted option stored
    const acceptedIdx = mockedState.acceptedOptions[aid] !== undefined ? mockedState.acceptedOptions[aid] : null;

    return {
      id: `plan_${aid}`,
      alert_id: aid,
      org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
      options_json: [
        {
          rank: 1,
          title: "Switch to Alternate Supplier B (Coimbatore)",
          description: "Shift 40% of weekly order volume to Coimbatore node to bypass cyclone disruption.",
          action_type: "supplier_switch",
          recovery_cost_inr: 180000,
          expected_savings_inr: 10300000,
          confidence_percent: 85,
          confidence_reason: "Supplier B confirmed availability + historical track record.",
          risk_mitigations: ["Supplier B is located in Coimbatore, outside weather zone."],
          implementation_checklist: [
            "1. Contact Supplier B procurement to confirm capacity.",
            "2. Dispatch PO details.",
            "3. Request road transportation shift."
          ]
        },
        {
          rank: 2,
          title: "Draw safety buffer stock from Warehouse A",
          description: "Pre-position 12 days of buffer safety units.",
          action_type: "buffer_stock",
          recovery_cost_inr: 210000,
          expected_savings_inr: 2100000,
          confidence_percent: 95,
          confidence_reason: "Warehouse has safety stock on-hand."
        }
      ],
      accepted_option_idx: acceptedIdx,
      accepted_by: acceptedIdx !== null ? "2b4c6d8e-0f1a-4b3c-9d8e-0f1a2b3c4d5e" : null,
      accepted_at: acceptedIdx !== null ? new Date().toISOString() : null,
      created_at: new Date().toISOString()
    };
  }

  // Graph Data
  if (cleanPath === "/twin/graph" && method === "GET") {
    return {
      nodes: mockedState.suppliers.map(s => ({
        id: s.node_id,
        label: "Supplier",
        name: s.name,
        city: s.city,
        current_risk_score: s.current_risk_score
      })).concat([
        { id: "warehouse_1", label: "Warehouse", name: "Warehouse A (Tirupur)", city: "Tirupur", current_risk_score: 0 },
        { id: "customer_1", label: "Customer", name: "Global Apparel Brands", city: "Mumbai", current_risk_score: 0 }
      ]),
      links: mockedState.suppliers.map(s => ({
        source: s.node_id,
        target: "warehouse_1",
        type: "SHIPS_VIA"
      })).concat([
        { source: "warehouse_1", target: "customer_1", type: "FULFILS" }
      ])
    };
  }

  // Simulation run & inject
  if (cleanPath === "/twin/simulate" && method === "POST") {
    const sc = body.scenario;
    const loc = body.location_name;
    const sev = body.severity || 3;
    
    // Find supplier
    const targetSup = mockedState.suppliers.find(s => s.name.toLowerCase().includes(loc.toLowerCase()) || s.node_id.toLowerCase().includes(loc.toLowerCase())) || mockedState.suppliers[0];
    
    // Simulate updating risk score in memory
    if (body.inject) {
      targetSup.current_risk_score = minMax(sev * 20 + 15);
      
      const newAlert = {
        id: `alert_simulated_${Math.random().toString(36).substring(7)}`,
        org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        node_id: targetSup.node_id,
        node_type: "Supplier",
        risk_score: targetSup.current_risk_score,
        rupees_at_risk: 1500000,
        signals_json: [
          { type: "weather", source: "Simulation Engine", event: `Simulated ${sc}`, intensity: sev, distance_km: 120, eta_hours: 36 }
        ],
        status: "open",
        created_at: new Date().toISOString(),
        resolved_at: null
      };
      
      mockedState.injectedAlerts.push(newAlert);
    }
    
    return {
      scenario: sc,
      location_name: loc,
      severity: sev,
      affected_nodes: [
        { id: targetSup.node_id, label: "Supplier", name: targetSup.name, current_risk_score: minMax(sev * 20 + 15) }
      ],
      exposed_orders: [
        { order_id: "order_101", supplier_id: targetSup.node_id, value_inr: 1500000, units: 4000, required_by_date: "2026-06-25", status: "active" }
      ],
      total_exposed_value_inr: 1500000,
      simulated_risk_score: minMax(sev * 20 + 15),
      recovery_options: [
        {
          rank: 1,
          title: "Switch to Alternate Supplier B (Coimbatore)",
          description: "Shift 40% of order volume to Coimbatore.",
          expected_savings_inr: 10300000,
          confidence_percent: 85,
          recovery_cost_inr: 180000
        }
      ],
      injected: body.inject || false,
      injected_alert_id: body.inject ? mockedState.injectedAlerts[mockedState.injectedAlerts.length - 1].id : null
    };
  }

  // Audit logs
  if (cleanPath === "/audit" && method === "GET") {
    return [
      {
        id: "audit_1",
        org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        user_id: "2b4c6d8e-0f1a-4b3c-9d8e-0f1a2b3c4d5e",
        user_name: "Priya Procurement",
        action: "added_supplier",
        resource_type: "Supplier",
        resource_id: "supplier_3",
        meta_json: { name: "Supplier S3", city: "Chennai" },
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString()
      },
      {
        id: "audit_2",
        org_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        user_id: "1a3b5c7d-9e0f-4a3b-8c7d-9e0f4a3b8c7d",
        user_name: "Ramesh MillOwner",
        action: "accepted_recovery_plan",
        resource_type: "recovery_plan",
        resource_id: "plan_alert_baseline_1",
        meta_json: { alert_id: "alert_baseline_1", option_idx: 0, option_title: "Switch to Alternate Supplier B" },
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      }
    ];
  }

  // Admin Portal Orgs
  if (cleanPath === "/admin/orgs" && method === "GET") {
    return [
      {
        id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        name: "Tamil Knitwear Exports",
        gstin: "33ABCDE1234F2Z0",
        plan: "starter",
        max_suppliers: 25,
        whatsapp_numbers: ["+919876543210"],
        created_at: new Date().toISOString(),
        is_active: true
      }
    ];
  }

  if (cleanPath === "/admin/health") {
    return {
      status: "healthy",
      ingestion_pipelines: {
        imd_weather: { status: "active", last_run: "1 min ago", failures_last_24h: 0 },
        news_api_llm: { status: "active", last_run: "3 min ago", failures_last_24h: 0 }
      },
      databases: {
        postgres: "connected",
        neo4j: "connected_fallback_active"
      },
      whatsapp_worker: { status: "active", queue_backlog: 0 }
    };
  }

  return {};
}

function minMax(val: number) {
  return Math.min(100, Math.max(0, val));
}
