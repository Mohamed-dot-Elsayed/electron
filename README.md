# SysteGo Desktop (POS Sync App)

A production-ready, offline-first Point of Sale (POS) desktop application built with **Electron**, **Express**, and **React**. SysteGo uses an in-memory/local **SQLite database (sql.js)** inside Electron to provide robust offline-first functionality, allowing cashiers to run shifts, process sales, log expenses, manage inventory, and process returns without an active internet connection. Once online, local data is bidirectionally synchronized with a remote POS cloud backend.

---

## 🛠️ Architecture & Project Structure

The project is structured as a monorepo consisting of three main modules:

```
electron-sync-demo/
├── electron/         # Electron main process, preload scripts, and auto-updater
├── local-server/     # Local server running INSIDE Electron (Express + sql.js SQLite)
└── client/           # React frontend (Vite, TailwindCSS / custom styling)
```

### Dependency Resolution Rule
To optimize compilation and packaging, `local-server` has no nested `package.json` or `node_modules` of its own. Root-level dependencies (`express`, `sql.js`, and `electron-updater`) are declared in the root `package.json`. At build/package time, `electron-builder` resolves these dependencies from the parent-directory `node_modules`. This setup avoids native module rebuilding issues and prevents `electron-builder` from excluding them during packaging.

---

## ✨ Core Features & Recent Updates

### 📦 Offline-First & Bidirectional Sync
- **WASM SQLite (`sql.js`)**: We use `sql.js` (SQLite compiled to WebAssembly) instead of `better-sqlite3`. Since it is pure JS with no native C++ bindings, it works out-of-the-box across development and packaged builds without requiring native compilation hooks (`electron-rebuild`).
- **Conflict-Resilient Synchronization**:
  - Incremental sync tracks records using UUIDs (independent ID generation), `updated_at` timestamps, and a `deleted` soft-delete flag.
  - **Push**: Transmits all locally modified records since the last successful sync.
  - **Pull**: Fetches remote updates since the last sync. Upserts locally using a *last-write-wins* resolution strategy (`WHERE excluded.updated_at > existing.updated_at`).

### 🛒 Online Orders Management
- **Order Lifecycle Handling**: Visualizes and updates order statuses through their lifecycle (`confirmed`, `processing`, `out_for_delivery`, `delivered`, `returned`, `failed_to_deliver`, `canceled`, `scheduled`, `refund`).
- **HTTP PUT Status Transitions**: Uses the `PUT /:id/status` endpoint to transition statuses with validation logic.
- **Robust Local Server Validations**: Prevents illegal actions, such as rejecting an order without the correct supervisor/admin permissions.
- **Polished UI Panel**: Enhanced UI panels for viewing order tracking, shipping, and payment methods.

### 🏪 Warehouse & Stock Tracking
- **Multi-Warehouse Stock**: Tracks product inventory items mapped directly to specific warehouses.
- **Stock Query Optimization**: Local server endpoints optimize product stock queries to ensure rapid rendering of available items.
- **Product Details Page**: Displays exhaustive metadata, categorization, images, and live warehouse-specific inventory levels.

### 🔑 Shift Management & Cashier Auditing
- **Opening Shift Verification**: On login, cashiers are checked for existing open shifts. If no active shift exists, they are routed to open one, preventing unauthorized sales.
- **`useOpenShift` Custom Hook**: Reusable hook manages shift statuses, verifying server start times to initialize shift periods accurately.
- **Shift Reports & Drawer Balances**:
  - Closing a shift requires passcode/password confirmation.
  - Calculates net drawer balances using the formula:  
    $$\text{Net Cash in Drawer} = \text{Sales} - \text{Expenses} - \text{Returns}$$
  - Groups financial transactions dynamically by bank/cash account.
  - Generates detailed, printable shift breakdown reports containing sales receipts, logged expenses, and returns.

### 🔄 Sales Returns & Refunds
- **Refund Validation**: Refund and return modules allow cashiers to process returned sales (`ReturnSalePage.jsx`).
- **Accounting Adjustments**: Processing returns automatically deducts the refund amount from the specific cash/bank account used for the refund and records the transaction to adjust inventory stock.

---

## 🚀 Running the App Locally

### 1. Install Dependencies
Installs both the root packaging dependencies and client dependencies:
```bash
npm run install:all
```

### 2. Run the Desktop App in Development Mode
Compiles the TypeScript backend and Vite frontend, then launches the Electron desktop shell:
```bash
npm start
```

### 3. Frontend-Only Dev Mode
To prototype UI layouts in the browser without launching Electron or the local SQLite database:
```bash
npm run dev:client
```

---

## 🌐 Linking to Your POS Cloud Backend

Specify your cloud endpoint in `local-server/.env` (which is automatically loaded by the Electron main process):
```env
REMOTE_API_URL=https://your-deployed-pos-api.com
```
The cloud backend must expose matching sync endpoints:
- `GET /sync/pull?since=<timestamp>` — returns records updated after the timestamp.
- `POST /sync/push` — accepts local batch changes and updates the remote DB.

---

## 📦 Packaging & Installer Generation

To package the application into a distribution-ready platform-native installer (output is saved to `release/`):
```bash
npm run dist
```
*Note: Because `sql.js` runs in WebAssembly, there are no C++ compilation steps. Packaged applications compile flawlessly on Windows, Mac, and Linux.*

---

## 🔄 Automatic Updates Setup

SysteGo implements automatic updates using `electron-updater`. When launched, it queries GitHub Releases, downloads updates in the background, and prompts the user to restart and install.

### Setup Instructions
1. In `package.json`, specify your repository details:
   ```json
   "publish": {
     "provider": "github",
     "owner": "your-username",
     "repo": "your-repo-name"
   }
   ```
2. Create an `electron-builder.env` file in the root directory (already added to `.gitignore`):
   ```env
   GH_TOKEN=ghp_yourpersonalaccesstokenhere
   ```
3. **Publishing a release**: Increment the version in `package.json`, then run:
   ```bash
   npm run dist:publish
   ```
   This compiles the app, builds the installer, generates update metadata, and uploads the artifacts directly to a draft/pre-release on GitHub.

### Private GitHub Repository Updates
If your update repository is private:
- Set `"private": true` inside the `publish` block of `package.json`.
- The update check pipeline reads the compiled release token embedded in `electron/embedded-token.json` (auto-generated during `npm run build` from `electron-builder.env`) to authenticate update requests against the GitHub API.
- **Security Precaution**: Because the GitHub token is stored in the app's static assets, use a fine-grained token with read-only permission for Releases/Contents only.

### Debugging Updates
Check log events (such as update discovery, download states, and errors) in the localized platform log file:
```
%APPDATA%\SyncDemo\update-log.txt
```
