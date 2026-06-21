# SupplyVision AI — Enterprise Supply Chain Decision Intelligence MVP

SupplyVision AI is an AI-powered co-pilot that helps Indian Small and Medium Enterprises (SMEs) monitor disruptions, assess risk, simulate downstream impacts, and execute recovery options.

---

## 🌟 Product Vision

For Indian MSMEs (textiles in Tirupur, auto-parts in Pune, pharma in Bhiwandi), supply chain shocks are frequent and devastating. Large enterprises use sap Ariba (₹50L+/year), whereas SMEs today depend on static spreadsheets and manual phone calls.

**SupplyVision AI fills this gap:**
- **Rupee-at-risk mapping**: Connects storm/monsoon weather vectors, port congestions, and commodity variations to calculate actual revenue exposure (in rupees).
- **Explainable risk indexes**: Breaks down node risks (0–100) using transparent dimensions: Weather, Port, Dependency, and Inventory.
- **WhatsApp early warnings**: Outbox templates translated into English/Hindi targeting mill operators who live on mobile apps instead of desktops.
- **Actionable recovery playbooks**: Auto-ranks mitigation proposals (e.g. shifts to alternate Coimbatore dyeing mills) based on confidence-weighted savings.

---

## 🏗️ Technical Architecture & Dual-Mode Services

This platform is structured for realistic corporate use:
- **FastAPI backend**: Powered by SQLAlchemy (PostgreSQL/SQLite dual-engine), Neo4j cloud queries (with NetworkX in-memory fallback), and JWT authorization.
- **Next.js 15 frontend**: Written in TypeScript using Tailwind CSS, Framer Motion transitions, and Recharts line graphics.
- **Role-Based Access Control**: Enforces 5 distinct roles: `super_admin`, `sme_owner`, `sc_manager`, `warehouse_staff`, and `auditor`.

### Dual-Database Fallback (Instant Evaluation)
To make setup zero-friction:
- **Production Mode**: Connects to external Supabase PostgreSQL, Neo4j Aura (Graph), and Redis Cloud.
- **Local Fallback Mode**: If cloud environment variables are missing, the system automatically provisions a local SQLite DB (`data/supplyvision.db`) and constructs a local JSON graph dataset (`data/graph_twin.json`) driven by `networkx`.
- **Offline Client Simulator**: If the backend server is offline, the Next.js frontend detects the state and hooks local mockup data, keeping all pages fully browseable, interactive, and functional.

---

## 🚀 Setup & Launch Guide

### Option 1: Standard Docker Compose (Recommended)
Launch the entire platform (including local Redis and Neo4j servers) with one command:
```bash
docker compose up --build
```
- Frontend: `http://localhost:3000`
- Backend Swagger Docs: `http://localhost:8000/docs`
- Neo4j HTTP Console: `http://localhost:7474` (Login: `neo4j` / `password`)

---

### Option 2: Local Manual Startup

#### 1. Backend API Server Setup
1. Move to the backend folder:
   ```bash
   cd backend
   ```
2. Create a virtual environment and install packages:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate

   pip install -r requirements.txt
   ```
3. Populate database seeds (creates Ramesh, Priya, Suresh, CA Anjali accounts and seeds the digital twin):
   ```bash
   python seed.py
   ```
4. Start FastAPI uvicorn server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

#### 2. Frontend Next.js Setup
1. Move to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Boot development workspace:
   ```bash
   npm run dev
   ```
4. Browse to `http://localhost:3000`

---

## 🎯 Verification Playbook & Credentials

### 1. Developer Authentication Credentials (Password for all is `password`)
- **SME Owner (Ramesh MillOwner)**: `ramesh@tamilknitwear.com` (Hindi layout)
- **Procurement Manager (Priya Procurement)**: `priya@tamilknitwear.com` (English layout)
- **Warehouse Storekeeper (Suresh Storekeeper)**: `suresh@tamilknitwear.com` (Hindi / restricted view)
- **CA Auditor (Anjali Auditor)**: `anjali@ca-associates.in` (Read-only / Compliance exports)
- **Super Admin (Root)**: `admin@supplyvision.ai` (Platform monitoring / tenant registration)

*Note: You can click the shortcut login tags on the sign-in page to bypass manual typing!*

### 2. Disruption & Mitigation Simulation Walkthrough
1. Log in as **Priya Procurement** (`priya@tamilknitwear.com`).
2. Open the **Simulation Lab** from the sidebar.
3. Select the **IMD Cyclone Alert** scenario affecting **Supplier S1 (Erode Yarn Mill)**, set severity to **4/5**, and click **Dry Run Simulation**.
4. Review downstream exposure values (₹15 Lakhs value at risk) and ranked recovery proposals (alternate Coimbatore mill routing vs Warehouse safety draw).
5. Click **Inject Live Disruption Alert**. This propagates a new live Warning alert to the database and graph network.
6. Open the **Alert Center**. The injected cyclone alert will be listed. Click it to trace weather metrics, explainability contributors, and inspect the mock WhatsApp templates Ramesh/Suresh received.
7. Click **Approve Option 1** to switch to Supplier B. The system updates the status index, active route coordinates, and commits a security entry to the **Audit Trail**.
8. Log in as **Suresh Storekeeper** (`suresh@tamilknitwear.com`) or **CA Anjali** (`anjali@ca-associates.in`) to verify role-based limits (hiding revenue details from storekeepers and blocking write buttons from auditors).
