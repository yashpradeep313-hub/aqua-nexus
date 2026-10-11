# Aqua Nexus — Municipal Water Authority Decision Support System

Aqua Nexus is an intelligent decision-support platform for municipal water authorities. It provides scarcity forecasting, multi-district hydraulic allocation optimization, anomaly leak radar, and cross-city policy learning labs.

---

## 🚀 How to Run Locally from Your GitHub Clone

### 1. Clone & Install Dependencies

```bash
git clone <YOUR_GITHUB_REPO_URL>
cd <REPO_NAME>
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your API keys in `.env`:
```ini
# Gemini API Key for multimodal PDF document vision & AI briefings
GEMINI_API_KEY="your-gemini-api-key"

# Google Maps API Key for interactive live GIS map vector tiles
VITE_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"

# App URL (optional for local development, defaults to http://localhost:3000)
APP_URL="http://localhost:3000"
```

> **Note**: If you don't provide a `GEMINI_API_KEY`, the application automatically runs in **offline benchmark mode** with built-in high-fidelity presets for all 4 municipal evaluation PDFs (Lakeview Hourly, Lakeview Policy, Riverton, and Alpine Valley Edge Case).

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 How to Deploy for Live Production (Vercel, Render, Railway, or Cloud Run)

Because this app uses Express backend routes (`/api/gemini/*`) alongside a Vite React frontend, you can deploy it in two ways:

### Option A: Full-Stack Node.js (Render / Railway / Cloud Run / VPS)

1. Set the build command:
   ```bash
   npm run build
   ```
2. Set the start command:
   ```bash
   npx tsx server.ts
   ```
3. Add environment variables in your hosting provider's dashboard:
   - `GEMINI_API_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
   - `PORT=3000`

### Option B: Deploying to Vercel / Netlify (Static + Serverless)

1. Build command: `npm run build`
2. Output directory: `dist`
3. If running purely client-side on Vercel without an Express container, the built-in pure browser engines (Ridge Regression, Hydraulic Priority Allocator, Anomaly Detection Radar, and Benchmark PDF evaluation datasets) work directly in the browser.

---

## 🌟 Key Functional Modules & Where to Test Them

1. **City Learning Lab (Transfer & PDF Intelligence)**:
   - Click **"Load 4 Evaluation PDFs & Benchmarks"** to load the pre-configured datasets.
   - Or drag and drop any municipal water policy or consumption PDF into the upload zone.
   - Click **"Extract Structured Data"** to extract policy quotas and consumption telemetry.
   - Click **"Fit Model (Ridge Regression)"** to train a local Ridge Regression forecasting model directly in your browser with standardized features and cross-validation metrics.

2. **Scarcity Forecasting**:
   - Compare naive baselines against trained models across 24h/72h horizons.

3. **Hydraulic Allocation Optimizer**:
   - Simulates drought deficits, preserves healthcare/essential lifelines, and computes inter-zone booster transfers.

4. **Anomaly Radar**:
   - Real-time leak and pressure transient detection with one-click jump to the GIS map.

5. **Live Map**:
   - Visualizes pipe pressure, reservoir depth, and zonal allocation status.

6. **Firebase Authentication & RBAC**:
   - Built-in **1-Click Demo Accounts** (`Demo Operator` and `Demo Admin`) for instant testing without needing external logins.
   - Google Sign-In and Email/Password authentication configured with Firestore security rules.
