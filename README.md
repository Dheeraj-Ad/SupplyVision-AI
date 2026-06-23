# SupplyVision AI — Complete Guide

> **Plain-English guide for everyone — from first-timers to developers.**
> If you have never coded before, start at the top. If you are a developer, jump to any section.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Who Is It For?](#2-who-is-it-for)
3. [How Does It Work — In Simple Words](#3-how-does-it-work--in-simple-words)
4. [Tech Stack — What Tools Were Used to Build It](#4-tech-stack--what-tools-were-used-to-build-it)
5. [Project Folder Structure — What's Inside](#5-project-folder-structure--whats-inside)
6. [All Features Explained — Every Page](#6-all-features-explained--every-page)
7. [User Roles — Who Can Do What](#7-user-roles--who-can-do-what)
8. [Demo Login Accounts](#8-demo-login-accounts)
9. [How to Install and Run Locally](#9-how-to-install-and-run-locally)
10. [Environment Variables — What You Need to Configure](#10-environment-variables--what-you-need-to-configure)
11. [Database Setup](#11-database-setup)
12. [API Endpoints — What the Backend Does](#12-api-endpoints--what-the-backend-does)
13. [How to Deploy to the Internet](#13-how-to-deploy-to-the-internet)
14. [Security Features](#14-security-features)
15. [Offline Mode — Works Even Without a Backend](#15-offline-mode--works-even-without-a-backend)
16. [Step-by-Step Walkthrough — Use It for the First Time](#16-step-by-step-walkthrough--use-it-for-the-first-time)
17. [Troubleshooting — Common Problems and Fixes](#17-troubleshooting--common-problems-and-fixes)
18. [Glossary — Confusing Words Explained](#18-glossary--confusing-words-explained)

---

## 1. What Is This Project?

**SupplyVision AI** is a smart software tool that helps small Indian businesses — especially in textiles, auto parts, and medicines — manage their **supply chain**.

### What is a supply chain?

Think of it like this:

```
Raw Material → Factory → Warehouse → Customer
(Cotton)       (Mill)    (Storage)   (You buying a T-shirt)
```

If anything breaks in this chain — a flood near the factory, a port strike, prices going up — the business loses money.

**SupplyVision AI watches all of this automatically** and sends warnings before disaster strikes. It also tells you exactly what to do when something goes wrong.

### In simple words:

- It **watches the weather**, ports, and news 24/7
- It **calculates how much money** you could lose if a supplier fails
- It **suggests fixes** (like switching to a backup supplier)
- It **sends WhatsApp messages** to warn your team in Hindi or English
- It shows everything on a clean **dashboard** on your computer

---

## 2. Who Is It For?

| Person | What They Get |
|--------|--------------|
| **Business Owner (SME Owner)** | Full picture of all risks and money exposure |
| **Supply Chain Manager** | Tools to simulate disruptions and approve fixes |
| **Warehouse Staff** | View stock levels and alerts for their warehouse |
| **Auditor / CA** | Read-only view of all decisions made (for compliance) |
| **Super Admin** | Manage all companies using the platform |

**Target industries:**
- Textile mills in Tirupur, Tamil Nadu
- Auto parts manufacturers in Pune, Maharashtra
- Pharmaceutical distributors in Bhiwandi, Maharashtra

---

## 3. How Does It Work — In Simple Words

```
STEP 1: Data comes in automatically
         Weather API → Is there a cyclone near your supplier?
         Port data   → Is Chennai port congested?
         News API    → Any strikes or shutdowns announced?
         Prices      → Is cotton or steel price spiking?

STEP 2: The system calculates a RISK SCORE (0–100)
         0–30  = Green  (Safe)
         31–60 = Yellow (Watch out)
         61–100 = Red   (Danger — act now!)

STEP 3: If risk is high, an ALERT is created
         "Supplier Erode Yarn Mill has Risk Score 78 — Cyclone approaching"
         "₹15 Lakhs of your revenue is at risk"

STEP 4: The system suggests RECOVERY OPTIONS
         Option 1: Switch to Supplier B in Coimbatore (saves ₹12L, 80% confidence)
         Option 2: Use buffer stock for 3 weeks (saves ₹8L, 65% confidence)

STEP 5: Manager approves one option with a single click
         → Action is logged in the Audit Trail
         → WhatsApp message sent to team
         → Supply chain graph updates automatically
```

---

## 4. Tech Stack — What Tools Were Used to Build It

> Think of these as the ingredients in a recipe. Each one has a specific job.

### Frontend (What you see in the browser)

| Tool | What It Does | Why Used |
|------|-------------|----------|
| **Next.js 15** | The main framework for web pages | Fast, modern React framework |
| **React 18** | Builds interactive UI components | Industry standard |
| **TypeScript** | JavaScript with error-checking | Catches bugs before they happen |
| **Tailwind CSS** | Makes the UI look good | Fast styling with utility classes |
| **Framer Motion** | Smooth animations | Professional feel |
| **Recharts** | Bar charts, line graphs | Shows data visually |
| **Cytoscape.js** | Network graph visualization | Shows supplier relationships as a map |
| **Lucide React** | Icons throughout the UI | Clean icon library |

### Backend (The engine behind the scenes)

| Tool | What It Does | Why Used |
|------|-------------|----------|
| **FastAPI (Python)** | Handles all API requests | Fast, modern Python backend |
| **SQLAlchemy** | Talks to the database | Industry standard ORM |
| **PostgreSQL** | Main database (production) | Reliable, powerful |
| **SQLite** | Local database (development) | No setup required |
| **Neo4j** | Graph database (supplier network) | Perfect for relationship data |
| **NetworkX** | Local graph fallback | Works without Neo4j |
| **Redis** | Cache for fast data access | Speeds up repeated queries |
| **JWT (PyJWT)** | Secure login tokens | Industry standard auth |
| **bcrypt** | Password hashing | Secure password storage |
| **SlowAPI** | Rate limiting | Prevents brute force attacks |
| **ReportLab** | Generate PDF reports | Professional PDF output |
| **openpyxl** | Generate Excel files | Export data to Excel |
| **Twilio** | Send WhatsApp messages | Mobile-first notifications |

### Deployment

| Platform | What Runs There |
|----------|----------------|
| **Vercel** | Frontend (Next.js web app) |
| **Railway.app** | Backend (FastAPI Python server) |
| **Supabase** | PostgreSQL database (cloud) |
| **Neo4j Aura** | Graph database (cloud) |
| **Redis Cloud** | Cache (cloud) |
| **Docker Compose** | Run everything locally with one command |

---

## 5. Project Folder Structure — What's Inside

```
SupplyVision-AI/
│
├── frontend/                        ← Everything the user sees in browser
│   ├── src/
│   │   ├── app/                     ← All pages of the website
│   │   │   ├── login/               ← Login page
│   │   │   │   └── page.tsx
│   │   │   ├── onboarding/          ← Setup wizard for new businesses
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/           ← All dashboard pages (protected)
│   │   │       ├── page.tsx         ← Main CEO dashboard
│   │   │       ├── alerts/          ← Disruption alerts
│   │   │       ├── suppliers/       ← Supplier directory
│   │   │       ├── simulation/      ← What-if scenario testing
│   │   │       ├── twin/            ← Digital twin network map
│   │   │       ├── replay/          ← Replay past disruptions
│   │   │       ├── reports/         ← Download PDF/Excel reports
│   │   │       ├── roi/             ← ROI and savings analytics
│   │   │       ├── audit/           ← Compliance audit trail
│   │   │       ├── inventory/       ← Warehouse stock levels
│   │   │       └── settings/        ← User profile & preferences
│   │   ├── components/
│   │   │   └── sidebar.tsx          ← Left navigation menu
│   │   ├── context/
│   │   │   └── auth-context.tsx     ← Manages login state
│   │   └── lib/
│   │       ├── api.ts               ← Calls the backend API
│   │       └── utils.ts             ← Helper functions (currency format, etc.)
│   ├── package.json                 ← Frontend dependencies list
│   ├── tailwind.config.ts           ← Color theme configuration
│   ├── next.config.js               ← Next.js settings
│   └── .env.example                 ← Template for environment variables
│
├── SupplyVision AI/backend/         ← The Python server (brain of the app)
│   ├── app/
│   │   ├── main.py                  ← Starts the server, registers all routes
│   │   ├── api/v1/                  ← All API endpoints
│   │   │   ├── auth.py              ← Login, logout, token refresh
│   │   │   ├── suppliers.py         ← Add/remove/list suppliers
│   │   │   ├── risks.py             ← Risk score calculations
│   │   │   ├── alerts.py            ← Disruption alert management
│   │   │   ├── recovery.py          ← Recovery plan options
│   │   │   ├── twin.py              ← Digital twin graph API
│   │   │   ├── audit.py             ← Compliance logs
│   │   │   ├── admin.py             ← Super admin controls
│   │   │   ├── reports.py           ← PDF and Excel generation
│   │   │   ├── replay.py            ← Historical scenario replay
│   │   │   └── roi.py               ← ROI and business health metrics
│   │   ├── core/
│   │   │   ├── config.py            ← All settings and environment variables
│   │   │   ├── database.py          ← Database connection and models
│   │   │   ├── security.py          ← Password hashing and JWT tokens
│   │   │   └── limiter.py           ← Rate limiting configuration
│   │   ├── models/
│   │   │   ├── rbac.py              ← Role-based access control rules
│   │   │   └── schemas.py           ← Data shapes (what API accepts/returns)
│   │   └── services/
│   │       ├── graph.py             ← Supplier network graph engine
│   │       ├── signals.py           ← Risk score calculation formulas
│   │       ├── recovery_engine.py   ← Ranks and scores recovery options
│   │       ├── ingestion/           ← Pulls live data from external APIs
│   │       │   ├── weather.py       ← OpenWeather API
│   │       │   ├── news.py          ← NewsAPI
│   │       │   ├── commodities.py   ← Commodity prices
│   │       │   └── ports.py         ← Port congestion data
│   │       ├── notifications/
│   │       │   └── whatsapp.py      ← Twilio WhatsApp sender
│   │       ├── reports/
│   │       │   └── generator.py     ← PDF and Excel report builder
│   │       ├── replay/
│   │       │   └── engine.py        ← Historical scenario engine
│   │       └── onboarding/
│   │           └── templates.py     ← Pre-built templates for new SMEs
│   ├── requirements.txt             ← Python packages needed
│   ├── Dockerfile                   ← Container build instructions
│   ├── seed.py                      ← Creates demo data and users
│   └── alembic/                     ← Database migration scripts
│
├── SupplyVision AI/
│   └── docker-compose.yml           ← Run everything with one command
├── railway.toml                     ← Railway deployment configuration
├── render.yaml                      ← Render.com deployment configuration
└── README.md                        ← This file
```

---

## 6. All Features Explained — Every Page

### Login Page (`/login`)

- Enter your email and password
- System checks credentials and gives you a **JWT token** (like a temporary ID card)
- If you fail 5 times, your account is locked for 15 minutes (security protection)
- Token expires after 15 minutes; it auto-refreshes silently in the background

---

### CEO Dashboard (`/dashboard`)

**Your headquarters. The first thing you see after login.**

Shows 4 key numbers at the top:
- Total active alerts (disruptions right now)
- Number of suppliers connected
- Total rupees at risk across your whole supply chain
- Overall risk trend (going up or down this week)

Below that:
- Recent alerts list with severity colors (red = urgent)
- Quick links to take action

---

### Alert Center (`/dashboard/alerts`)

**Your early warning system.**

Each alert card shows:
- Which supplier or route is affected
- What caused it (cyclone / port strike / price spike / news event)
- **Rupees at risk** — exact amount you could lose
- Risk score (0–100) with color coding
- Status: Active / Acknowledged / Resolved
- WhatsApp message template ready to send your team

You can click any alert to see:
- Full breakdown of which signals triggered it
- Step-by-step explanation of how the risk score was calculated
- Linked recovery options

---

### Suppliers Directory (`/dashboard/suppliers`)

**Your supplier network at a glance.**

Shows all suppliers as cards with:
- Supplier name and location
- Tier (Tier 1 = direct supplier, Tier 2 = your supplier's supplier)
- Current risk score with color
- Annual revenue exposure (how much business flows through them)
- Lead time (how many days to deliver)
- Alternative supplier availability

You can:
- Add a new supplier (fills the graph automatically)
- Remove a supplier
- See which customers would be affected if this supplier fails

---

### Digital Twin (`/dashboard/twin`)

**A live map of your entire supply chain.**

Think of it like Google Maps, but instead of roads it shows:
- **Circles (nodes)**: Each supplier, warehouse, and customer
- **Lines (edges)**: The relationships and routes between them
- **Colors**: Green = safe, Yellow = watch, Red = danger

You can click any node to see its details. Nodes that are affected by active alerts glow red.

This map updates in real-time when disruptions happen.

---

### Simulation Lab (`/dashboard/simulation`)

**Test "What if?" scenarios without any real consequences.**

How to use it:
1. Pick a supplier from your network
2. Choose a disruption type:
   - IMD Cyclone Alert
   - Chennai Port Congestion
   - Commodity Price Spike
   - Supplier Strike / Shutdown
3. Set severity (1 = minor, 5 = catastrophic)
4. Click **Dry Run** — see the impact calculated without saving anything
5. If you want to create a real alert from this, click **Inject Live Disruption**

Results show:
- Rupees at risk
- Which customers are affected downstream
- Ranked list of recovery options with costs and confidence %

---

### Recovery Plans (`/dashboard/recovery`)

**Your action plan when things go wrong.**

For each alert, the system generates recovery options ranked by:
- How much money they save you
- Confidence score (how likely the fix will work)
- Cost to execute

Example options:
| Option | Action | Saves | Confidence |
|--------|--------|-------|------------|
| 1st | Switch to Supplier B (Coimbatore) | ₹12.5L | 80% |
| 2nd | Draw from buffer stock (3 weeks) | ₹8.2L | 65% |
| 3rd | Emergency import from Surat | ₹6.1L | 55% |

Click **Approve** on any option to:
- Execute the recovery plan
- Update the digital twin graph
- Log the decision in the audit trail
- Send WhatsApp notification to your team

---

### Historical Replay (`/dashboard/replay`)

**Learn from past disruptions.**

Pick any past disruption event and replay it:
- See how the risk score evolved over time
- Compare what actually happened vs. what would have happened if you took a different option
- Use this to train new team members or improve your response process

---

### Inventory Management (`/dashboard/inventory`)

**Know what stock you have and when to reorder.**

Shows each warehouse with:
- Current stock levels for each product
- Safety stock threshold (minimum you should always keep)
- Reorder point (when to trigger a purchase order)
- Days of coverage remaining
- Color-coded status: Healthy / Low / Critical

---

### Reports Center (`/dashboard/reports`)

**Download professional reports for meetings, audits, and investors.**

Four report types available:

| Report | What's Inside | Format |
|--------|--------------|--------|
| **Executive Summary** | KPIs, top risks, savings achieved | PDF |
| **Risk Assessment** | Full risk matrix, node-by-node analysis | PDF / Excel |
| **Recovery Report** | History of all recovery actions taken | PDF / Excel |
| **Monthly Operations** | Monthly trends, supplier performance | Excel |

Click the report type, choose the format, and it downloads instantly.

---

### Audit Trail (`/dashboard/audit`)

**Immutable record of every action taken.**

Every time someone:
- Approves a recovery plan
- Adds or removes a supplier
- Changes settings
- Logs in or out

...it is recorded here with:
- Who did it (name + email)
- When they did it (exact timestamp)
- What they did (action description)
- What changed (before and after values)

This record cannot be edited or deleted — it is permanent for compliance.

---

### ROI Analytics (`/dashboard/roi`)

**Proof that the platform is saving you money.**

Shows:
- **Business Health Score** (0–100) — overall supply chain fitness
- **Total Savings** — rupees saved by approved recovery actions
- **Single-Source Risks** — suppliers you rely on 100% with no backup
- **Monthly Savings History** — bar chart of money saved per month
- **Risk Reduction Trend** — how your average risk score has improved

---

### Settings (`/dashboard/settings`)

- Change your display name and password
- Switch language (English / Hindi)
- Configure WhatsApp notification preferences
- Set alert thresholds (e.g., notify me when risk > 60)

---

### Onboarding Wizard (`/onboarding`)

**First-time setup made simple.**

New businesses go through a guided wizard:
1. Enter company name, GSTIN, and industry (textiles / auto / pharma)
2. Add your first 3 suppliers with location and tier
3. Set your warehouse locations and safety stock levels
4. Add your top 3 customer segments
5. Configure WhatsApp numbers for notifications
6. Review and confirm your digital twin map

Takes about 10 minutes. After this your dashboard is live with real data.

---

### Admin: Tenant Management (`/admin`)

**Only for Super Admins — manages all companies on the platform.**

- Register new SME organizations
- View and manage all users across all companies
- Set plan tier (Basic / Professional / Enterprise)
- Suspend or reactivate accounts

---

### Admin: System Health (`/admin/health`)

**Only for Super Admins — checks if all systems are running.**

Shows status of:
- Database connectivity (PostgreSQL / SQLite)
- Graph database (Neo4j / NetworkX)
- Cache (Redis / in-memory)
- Weather ingestion pipeline (last run time)
- News ingestion pipeline (last run time)
- WhatsApp message queue (pending messages)

---

## 7. User Roles — Who Can Do What

There are 5 roles. Each person only sees what they need.

| Feature | Warehouse Staff | Auditor | SC Manager | SME Owner | Super Admin |
|---------|:-:|:-:|:-:|:-:|:-:|
| View alerts | Own only | Read only | ✅ | ✅ | ✅ |
| See rupee exposure | ❌ | ❌ | ✅ | ✅ | ✅ |
| Add/remove suppliers | ❌ | ❌ | ✅ | ✅ | ✅ |
| Run simulations | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve recovery plans | ❌ | ❌ | ✅ | ✅ | ✅ |
| View audit trail | ❌ | ✅ | ❌ | ✅ | ✅ |
| Download reports | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage all companies | ❌ | ❌ | ❌ | ❌ | ✅ |
| View system health | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 8. Demo Login Accounts

All accounts use the password: **`password`**

| Name | Email | Role | Language | What to Test |
|------|-------|------|----------|-------------|
| Ramesh Kumar | ramesh@tamilknitwear.com | SME Owner | Hindi | Full dashboard access |
| Priya Sharma | priya@tamilknitwear.com | SC Manager | English | Simulation + Recovery |
| Suresh Babu | suresh@tamilknitwear.com | Warehouse Staff | Hindi | Restricted view only |
| Anjali Mehta | anjali@ca-associates.in | Auditor | English | Audit trail only |
| Admin | admin@supplyvision.ai | Super Admin | English | All companies, system health |

---

## 9. How to Install and Run Locally

### What you need installed first

- [Node.js 18+](https://nodejs.org/) — for the frontend
- [Python 3.11+](https://python.org/) — for the backend
- [Git](https://git-scm.com/) — to download the code
- [Docker Desktop](https://docker.com/) *(optional but easiest)* — to run everything at once

---

### Option A: Docker (Easiest — One Command)

> Docker runs everything automatically. You don't need to set up databases.

**Step 1: Download the code**
```bash
git clone https://github.com/your-repo/SupplyVision-AI.git
cd SupplyVision-AI
```

**Step 2: Start everything**
```bash
cd "SupplyVision AI"
docker compose up --build
```

Wait about 2–3 minutes for everything to start.

**Step 3: Open in browser**

| Service | URL |
|---------|-----|
| Website | http://localhost:3000 |
| Backend API docs | http://localhost:8000/docs |
| Neo4j database UI | http://localhost:7474 |

> Neo4j login: username `neo4j`, password `password`

**To stop everything:**
```bash
docker compose down
```

---

### Option B: Manual Setup (Step by Step)

#### Part 1 — Set up the Backend

**Step 1: Go to the backend folder**
```bash
cd "SupplyVision AI/backend"
```

**Step 2: Create a Python virtual environment**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac / Linux
python -m venv venv
source venv/bin/activate
```

> You should see `(venv)` appear at the start of your terminal line.

**Step 3: Install Python packages**
```bash
pip install -r requirements.txt
```

**Step 4: Create environment file**
```bash
# Copy the template
cp .env.example .env
```

Open `.env` and at minimum set:
```
SECRET_KEY=any-long-random-string-here
APP_ENV=development
```
*(Leave everything else blank for now — the app uses local SQLite and in-memory fallbacks)*

**Step 5: Seed the database with demo data**
```bash
python seed.py
```

This creates:
- The database file at `data/supplyvision.db`
- Demo company: Tamil Knitwear Pvt Ltd
- All 5 demo users (Ramesh, Priya, Suresh, Anjali, Admin)
- 8 sample suppliers across Tamil Nadu
- Pre-built digital twin graph

**Step 6: Start the backend server**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Open http://localhost:8000/docs to see the API documentation.

---

#### Part 2 — Set up the Frontend

Open a **new terminal window** (keep the backend running).

**Step 1: Go to the frontend folder**
```bash
cd frontend
```

**Step 2: Install JavaScript packages**
```bash
npm install
```

**Step 3: Create environment file**
```bash
cp .env.example .env.local
```

Open `.env.local` and set:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api/v1
```

**Step 4: Start the frontend**
```bash
npm run dev
```

You should see:
```
▲ Next.js 15.3.9
- Local: http://localhost:3000
```

Open http://localhost:3000 in your browser.

**Log in with:** `priya@tamilknitwear.com` / `password`

---

## 10. Environment Variables — What You Need to Configure

### Frontend (`.env.local` inside the `frontend/` folder)

| Variable | What It Does | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_BACKEND_URL` | Where the backend API is running | `http://localhost:8000/api/v1` |

---

### Backend (`.env` inside the `SupplyVision AI/backend/` folder)

#### Core Settings

| Variable | What It Does | Default if blank |
|----------|-------------|-----------------|
| `APP_ENV` | `development` or `production` | `development` |
| `SECRET_KEY` | Secret key for signing JWT tokens — **change this in production** | `changeme` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | How long login tokens last | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | How long refresh tokens last | `7` |
| `MAX_LOGIN_ATTEMPTS` | Failed logins before lockout | `5` |
| `LOCKOUT_MINUTES` | How long the lockout lasts | `15` |
| `SECURE_COOKIES` | Use HTTPS-only cookies | `false` (set `true` in production) |

#### Database (leave blank to use local SQLite)

| Variable | What It Does | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |

> If left blank, the app creates `data/supplyvision.db` automatically. No setup needed for local development.

#### Graph Database (leave blank to use local NetworkX)

| Variable | What It Does | Example |
|----------|-------------|---------|
| `NEO4J_URI` | Neo4j Aura connection URI | `neo4j+s://xxxxx.databases.neo4j.io` |
| `NEO4J_USER` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | `your-password` |

> If left blank, uses NetworkX (Python library) with the graph saved to `data/graph_twin.json`.

#### Cache (leave blank to use in-memory cache)

| Variable | What It Does | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://default:pass@host:6379` |

#### WhatsApp Notifications (optional)

| Variable | What It Does | Where to get it |
|----------|-------------|----------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio account ID | [twilio.com](https://twilio.com) |
| `TWILIO_AUTH_TOKEN` | Twilio auth secret | Twilio Console |
| `TWILIO_NUMBER` | Twilio WhatsApp number | `whatsapp:+14155238886` |

#### External Data Feeds (optional — mock data used if blank)

| Variable | What It Does | Where to get it |
|----------|-------------|----------------|
| `OPENWEATHER_API_KEY` | Live weather data | [openweathermap.org](https://openweathermap.org) |
| `NEWSAPI_KEY` | Live news headlines | [newsapi.org](https://newsapi.org) |
| `OPENAI_API_KEY` | AI-generated insights | [platform.openai.com](https://platform.openai.com) |

#### Error Tracking (optional)

| Variable | What It Does |
|----------|-------------|
| `SENTRY_DSN` | Logs errors to Sentry.io dashboard |

#### CORS (who can call the backend)

| Variable | What It Does | Example |
|----------|-------------|---------|
| `BACKEND_CORS_ORIGINS` | Which domains can call the API | `https://your-app.vercel.app` |

---

## 11. Database Setup

### Local Development (automatic — no action needed)

When you run `python seed.py`, it automatically:
1. Creates a SQLite file at `SupplyVision AI/backend/data/supplyvision.db`
2. Creates all tables
3. Inserts demo company, users, suppliers, and alerts

### Production (PostgreSQL on Supabase)

**Step 1:** Create a free account at [supabase.com](https://supabase.com)

**Step 2:** Create a new project and copy the connection string from:
`Settings → Database → Connection Pooling → Connection string`

It looks like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Step 3:** Set this as `DATABASE_URL` in your backend `.env`

**Step 4:** Run migrations:
```bash
alembic upgrade head
```

**Step 5:** Seed initial data:
```bash
python seed.py
```

---

## 12. API Endpoints — What the Backend Does

The backend lives at `http://localhost:8000`. All endpoints start with `/api/v1/`.

You can see all endpoints interactively at: http://localhost:8000/docs

### Authentication

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email + password, get JWT token |
| POST | `/auth/refresh` | Get a new access token using refresh token |
| POST | `/auth/logout` | Invalidate your session |
| GET | `/auth/me` | Get your own profile information |

### Suppliers

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/suppliers/` | List all suppliers for your company |
| POST | `/suppliers/` | Add a new supplier |
| DELETE | `/suppliers/{id}` | Remove a supplier |

### Risks

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/risks/scores` | Get risk scores for all nodes |
| GET | `/risks/scores/{node_id}` | Get detailed risk breakdown for one node |

### Alerts

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/alerts/` | List all alerts (active and resolved) |
| GET | `/alerts/{id}` | Get full details of one alert |
| POST | `/alerts/{id}/resolve` | Mark an alert as resolved |

### Recovery Plans

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/recovery/plans/{alert_id}` | Get ranked recovery options for an alert |
| POST | `/recovery/plans/{alert_id}/accept` | Accept and execute a recovery option |

### Digital Twin

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/twin/graph` | Get the full supply chain graph |
| POST | `/twin/simulate` | Dry-run a disruption (no data saved) |
| POST | `/twin/simulate?inject=true` | Create a live disruption alert |

### Reports

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/reports/pdf/{type}` | Download a PDF report |
| GET | `/reports/xlsx/{type}` | Download an Excel report |

Report types: `executive`, `risk`, `recovery`, `supplier`, `monthly`

### Audit

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/audit/` | List all audit log entries |

### ROI

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/roi/` | Get business health score and savings history |

### Admin (Super Admin only)

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/admin/orgs` | List all companies |
| POST | `/admin/orgs` | Register a new company |
| GET | `/admin/health` | Check system status |

---

## 13. How to Deploy to the Internet

### Deploy Frontend to Vercel (Free)

**Step 1:** Create account at [vercel.com](https://vercel.com)

**Step 2:** Click "New Project" → Import your GitHub repository

**Step 3:** Set these settings:
- Root directory: `frontend`
- Framework: Next.js
- Build command: `npm run build`

**Step 4:** Add environment variable:
- `NEXT_PUBLIC_BACKEND_URL` = your Railway backend URL (from step below)

**Step 5:** Click Deploy. Your site will be live at `https://your-app.vercel.app`

---

### Deploy Backend to Railway (Free tier available)

**Step 1:** Create account at [railway.app](https://railway.app)

**Step 2:** Click "New Project" → Deploy from GitHub repo

**Step 3:** Set root directory to `SupplyVision AI/backend`

**Step 4:** Add all environment variables from Section 10

**Step 5:** Railway auto-detects the `railway.toml` config and deploys. Your API will be live at `https://your-app.railway.app`

**Step 6:** Copy the Railway URL and update Vercel's `NEXT_PUBLIC_BACKEND_URL` to point to it.

---

### Deploy Backend to Render.com (Alternative)

**Step 1:** Create account at [render.com](https://render.com)

**Step 2:** Click "New Web Service" → Connect GitHub

**Step 3:** Render auto-reads `render.yaml` from the repo root and configures everything

**Step 4:** Add environment variables and click Deploy

---

## 14. Security Features

### Password Security
- Passwords are **never stored as plain text**
- They are hashed with **bcrypt** (a one-way transformation)
- Even the developers cannot see your password

### Login Protection
- 5 failed login attempts = account locked for 15 minutes
- Rate limiting: maximum 10 login attempts per minute per IP address

### Token Security
- Login creates a short-lived **access token** (15 minutes)
- A **refresh token** (7 days) silently renews the access token
- Logging out **invalidates** the refresh token — no one can reuse it

### HTTP Security Headers
Every response includes:
- `X-Frame-Options: DENY` — prevents your site being embedded in iframes (clickjacking protection)
- `X-Content-Type-Options: nosniff` — prevents MIME type attacks
- `Strict-Transport-Security` — forces HTTPS in production
- `Content-Security-Policy` — restricts what resources can load
- `Referrer-Policy: strict-origin-when-cross-origin` — limits what referrer info is shared

### Data Access
- Each user only sees data from their own company (multi-tenant isolation)
- Role-based permissions checked on every API call
- Warehouse staff cannot see financial data — enforced at the API level, not just UI

---

## 15. Offline Mode — Works Even Without a Backend

If the backend server is not running (e.g., you opened the Vercel frontend but haven't deployed the backend), **the app still works with demo data**.

The frontend automatically detects a failed API call and switches to pre-built mock data. Every page remains browseable:
- Dashboard shows demo KPI numbers
- Alerts list shows 3 sample disruption alerts
- Suppliers directory shows 8 demo suppliers
- Digital twin shows a sample network graph

A small banner appears at the top saying "Demo Mode — not connected to live data."

This is useful for:
- Demos and presentations without a running backend
- Testing the UI without any setup
- Showing the product to clients

---

## 16. Step-by-Step Walkthrough — Use It for the First Time

This is a complete test of every feature.

### Step 1: Login
1. Open http://localhost:3000
2. Enter email: `priya@tamilknitwear.com`
3. Enter password: `password`
4. Click Login
5. You should land on the CEO Dashboard

### Step 2: Explore the Dashboard
1. Note the 4 KPI cards at the top (alerts, suppliers, rupees at risk, trend)
2. Look at the recent alerts list — you should see 2–3 sample alerts
3. Note the color coding: red = urgent, yellow = warning, green = safe

### Step 3: View an Alert
1. Click **Alert Center** in the left sidebar
2. Click on the first alert (probably a cyclone near Erode)
3. Read the risk breakdown — which signals contributed to the score
4. Note the rupees at risk calculation
5. See the WhatsApp template at the bottom

### Step 4: Run a Simulation
1. Click **Simulation Lab** in the sidebar
2. Select **Supplier S1 — Erode Yarn Mill** from the dropdown
3. Choose disruption type: **IMD Cyclone Alert**
4. Set severity to **4**
5. Click **Dry Run Simulation**
6. Review the impact: rupees at risk, affected customers, recovery options
7. Click **Inject Live Disruption Alert** — this creates a real alert in the system

### Step 5: Approve a Recovery Plan
1. Go to **Alert Center** — your new cyclone alert is there
2. Click it to open the detail view
3. Scroll to Recovery Options
4. Review the ranked options (Option 1 should be Switch to Supplier B)
5. Click **Approve Option 1**
6. A confirmation dialog appears — click Confirm
7. The alert status changes to "Recovery in Progress"

### Step 6: Check the Audit Trail
1. Click **Audit Trail** in the sidebar
2. You should see a new entry: "Recovery plan approved by Priya Sharma"
3. It shows the timestamp and what changed

### Step 7: View the Digital Twin
1. Click **Digital Twin** in the sidebar
2. You see the network graph — Erode Yarn Mill should now be highlighted differently
3. Try clicking different nodes to see their details
4. The map updated automatically when you approved the recovery plan

### Step 8: Download a Report
1. Click **Reports** in the sidebar
2. Click **Executive Summary → PDF**
3. A PDF downloads — it includes all KPIs and the recovery action you just took

### Step 9: Test Restricted Access
1. Log out (click your name at the bottom left → Logout)
2. Log in as: `suresh@tamilknitwear.com` / `password`
3. Notice the sidebar has fewer items
4. Alerts are visible but rupee amounts are hidden
5. No access to Simulation Lab or Recovery Plans

### Step 10: Test Auditor View
1. Log out and log in as: `anjali@ca-associates.in` / `password`
2. The only relevant sections are Audit Trail and Reports
3. She can see everything that happened but cannot take any actions

---

## 17. Troubleshooting — Common Problems and Fixes

### "Cannot connect to backend"
- Make sure the backend server is running (`uvicorn app.main:app --port 8000`)
- Check that your `.env.local` has `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000/api/v1`
- Try opening http://localhost:8000/docs — if that works, the backend is fine

### "Module not found" error when starting backend
```bash
# Make sure your virtual environment is activated
venv\Scripts\activate      # Windows
source venv/bin/activate   # Mac/Linux

# Reinstall packages
pip install -r requirements.txt
```

### "npm: command not found"
- Install Node.js from https://nodejs.org/ (choose the LTS version)
- Restart your terminal after installing

### "python: command not found"
- Install Python from https://python.org/ (choose Python 3.11+)
- On Windows, make sure to check "Add Python to PATH" during installation
- Restart your terminal

### Login not working
- Run `python seed.py` again to reset demo accounts
- Make sure you're using exact email (lowercase) and password `password`
- If account is locked, wait 15 minutes or restart the backend

### Port already in use
```bash
# Kill the process using port 8000 (Windows)
netstat -ano | findstr :8000
taskkill /PID <number> /F

# Kill the process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <number> /F
```

### Database errors after code update
```bash
cd "SupplyVision AI/backend"
alembic upgrade head   # Run any new migrations
python seed.py         # Re-seed demo data
```

### Docker not starting
- Make sure Docker Desktop is running (look for the whale icon in your taskbar)
- Try: `docker compose down` then `docker compose up --build`
- Check you have at least 4GB RAM free

### Frontend shows blank page
- Check the browser console for errors (press F12 → Console tab)
- Make sure `npm install` completed without errors
- Delete `frontend/.next/` folder and run `npm run dev` again

---

## 18. Glossary — Confusing Words Explained

| Word | What It Means in Plain English |
|------|-------------------------------|
| **API** | A way for the frontend (website) and backend (server) to talk to each other |
| **JWT Token** | A temporary digital ID card that proves you're logged in |
| **Bcrypt** | A special method to scramble passwords so they can't be read |
| **CORS** | A security rule that controls which websites can call the backend |
| **Digital Twin** | A virtual copy of your real supply chain, shown as a map |
| **Node** | A point in the supply chain map — could be a supplier, warehouse, or customer |
| **Edge** | A connection line between two nodes in the map |
| **Risk Score** | A number from 0–100 showing how likely a supplier is to fail (100 = very dangerous) |
| **Rupees at Risk** | The exact amount of money you could lose if a disruption happens |
| **Recovery Plan** | A list of actions to take when something goes wrong |
| **Simulation** | Testing "what would happen if..." without affecting real data |
| **Audit Trail** | A permanent, unchangeable record of all decisions taken |
| **SQLite** | A simple local database stored as a single file — great for development |
| **PostgreSQL** | A powerful database for production — used in the cloud |
| **Neo4j** | A special database designed specifically for networks and relationships |
| **NetworkX** | A Python library that can act as a simpler replacement for Neo4j |
| **Redis** | A very fast memory-based storage used for caching frequent data |
| **Docker** | A tool that packages the entire app so it runs identically on any computer |
| **Vercel** | A cloud hosting service for frontend websites |
| **Railway** | A cloud hosting service for backend servers |
| **Seed data** | Pre-made demo data loaded into the database for testing |
| **Alembic** | A tool that manages database structure changes over time |
| **RBAC** | Role-Based Access Control — different users see different things based on their job |
| **Rate Limiting** | A rule that prevents someone from making too many requests too fast |
| **WhatsApp Webhook** | An automatic message sent via WhatsApp when an alert fires |
| **Ingestion Pipeline** | An automated process that pulls data from weather/news/port APIs every hour |
| **SME** | Small and Medium Enterprise — a small or medium-sized business |

---

## Quick Reference Card

```
LOCAL DEVELOPMENT URLS
─────────────────────────────────────────────
Website          →  http://localhost:3000
API Explorer     →  http://localhost:8000/docs
Neo4j Browser    →  http://localhost:7474

DEMO LOGINS (password: password)
─────────────────────────────────────────────
Full Access      →  priya@tamilknitwear.com
Owner View       →  ramesh@tamilknitwear.com
Warehouse Only   →  suresh@tamilknitwear.com
Auditor Only     →  anjali@ca-associates.in
Super Admin      →  admin@supplyvision.ai

START COMMANDS
─────────────────────────────────────────────
Everything (Docker)  →  docker compose up --build
Backend only         →  uvicorn app.main:app --port 8000 --reload
Frontend only        →  npm run dev
Seed demo data       →  python seed.py
```

---

*Built for Indian SMEs. Designed to be understood by everyone.*
