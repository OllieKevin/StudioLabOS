# Web Application Migration — Implementation Plan (for Codex)

**Goal:** Convert MixarLab OS from a Tauri desktop app (Notion API backend) to a web application (Vite + Hono + SQLite), keeping all existing React UI, services, and stores.

**Architecture:** Hono HTTP server with better-sqlite3 on the backend. Vite + React SPA on the frontend. Frontend talks to backend via `fetch("/api/db/...")` calls. All 17 SQLite tables from v3 design are preserved.

**Tech Stack:** Hono 4, better-sqlite3 11, React 18, TypeScript 5.6, Zustand 4, Vite 5, Motion 12

**Design doc:** `../../开发文档/MixarLabOS_v4_Web_Architecture.md`

**Previous plan (Tauri version, for reference):** `./2026-02-19-sqlite-migration.md`

---

## Phase 1: Project Setup + Backend

### Task 1: Git Init + Dependencies

**Step 1: Init git (project is not yet a git repo)**

```bash
cd mixarlab-os
git init
```

**Step 2: Create .gitignore**

Create `.gitignore`:
```
node_modules/
dist/
src-tauri/target/
data/
*.db
.DS_Store
```

**Step 3: Initial commit**

```bash
git add -A && git commit -m "chore: initial commit — Notion-based v2 codebase"
git checkout -b feat/web-migration
```

**Step 4: Install new deps, remove Tauri deps**

```bash
pnpm remove @tauri-apps/api @tauri-apps/cli
pnpm add hono @hono/node-server better-sqlite3 motion
pnpm add -D @types/better-sqlite3 tsx
```

**Step 5: Update package.json scripts**

Replace the scripts section with:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:server": "tsx watch server/index.ts",
    "build": "tsc -b && vite build",
    "start": "tsx server/index.ts",
    "preview": "vite preview"
  }
}
```

Remove `tauri:dev`, `tauri:build` scripts.

**Step 6: Commit**

```bash
git add -A && git commit -m "chore: swap Tauri deps for Hono + better-sqlite3 + motion"
```

---

### Task 2: SQL Migration File

Create `server/migrations/001_initial.sql`:

```sql
-- MixarLabOS v4 — Initial schema (identical to v3)

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT '',
  period_start TEXT, period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT '',
  start_date TEXT, end_date TEXT, progress REAL DEFAULT 0,
  milestone TEXT, owner TEXT, project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, meeting_date TEXT,
  project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  contact TEXT, phone TEXT, email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  category TEXT, contact TEXT, phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT '',
  sign_date TEXT, due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_expenses (
  id TEXT PRIMARY KEY, title TEXT NOT NULL,
  expense_date TEXT, period_start TEXT, period_end TEXT,
  amount_original REAL NOT NULL DEFAULT 0, amount_local REAL NOT NULL DEFAULT 0,
  cost_category TEXT, cost_detail TEXT, cost_nature TEXT,
  cost_ownership TEXT, cost_bearer TEXT, approval_status TEXT,
  input_mode TEXT, payment_method TEXT, invoice_type TEXT, note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  service_version TEXT NOT NULL DEFAULT '', service_area TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '服役中', start_date TEXT,
  description TEXT, software_version TEXT, download_url TEXT, note TEXT,
  price REAL NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'CNY',
  billing_cycle TEXT NOT NULL DEFAULT '月度付费', cost_sub_category TEXT,
  last_payment_date TEXT, next_billing_date TEXT,
  monthly_equivalent REAL NOT NULL DEFAULT 0, yearly_equivalent REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS digital_assets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT '',
  service_version TEXT, service_area TEXT, software_version TEXT,
  start_date TEXT, download_url TEXT, description TEXT, note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quote_line_items (
  id TEXT PRIMARY KEY, quote_id TEXT NOT NULL,
  item_name TEXT NOT NULL, description TEXT,
  quantity REAL NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_targets (
  id TEXT PRIMARY KEY, year INTEGER NOT NULL,
  target REAL NOT NULL DEFAULT 0, actual REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Junction tables
CREATE TABLE IF NOT EXISTS client_projects (
  client_id TEXT NOT NULL REFERENCES clients(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (client_id, project_id)
);
CREATE TABLE IF NOT EXISTS client_contracts (
  client_id TEXT NOT NULL REFERENCES clients(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (client_id, contract_id)
);
CREATE TABLE IF NOT EXISTS project_contracts (
  project_id TEXT NOT NULL REFERENCES projects(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (project_id, contract_id)
);
CREATE TABLE IF NOT EXISTS ledger_projects (
  ledger_id TEXT NOT NULL REFERENCES ledger_expenses(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (ledger_id, project_id)
);
CREATE TABLE IF NOT EXISTS ledger_suppliers (
  ledger_id TEXT NOT NULL REFERENCES ledger_expenses(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  PRIMARY KEY (ledger_id, supplier_id)
);
CREATE TABLE IF NOT EXISTS supplier_projects (
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  project_id TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (supplier_id, project_id)
);
CREATE TABLE IF NOT EXISTS asset_ledger_links (
  asset_id TEXT NOT NULL REFERENCES digital_assets(id),
  ledger_id TEXT NOT NULL REFERENCES ledger_expenses(id),
  PRIMARY KEY (asset_id, ledger_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_expenses(cost_category);
CREATE INDEX IF NOT EXISTS idx_contracts_sign_date ON contracts(sign_date);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
```

Commit: `git add server/ && git commit -m "feat: add SQL migration file"`

---

### Task 3: Server — db.ts + routes + index.ts

Create the following files. Full code is in the design doc `MixarLabOS_v4_Web_Architecture.md` sections 3.1-3.3. Here's a summary:

**server/db.ts** — `initDb()` function:
- Opens `./data/data.db` (or `DATA_DIR` env var)
- Sets `PRAGMA journal_mode=WAL; foreign_keys=ON`
- Runs migrations via `user_version` pragma
- Returns `Database` instance

**server/routes/crud.ts** — `crudRoutes(db)`:
- POST `/query` — SELECT with optional WHERE/ORDER/LIMIT
- POST `/get-by-id` — SELECT WHERE id=?
- POST `/insert` — INSERT with auto UUID
- POST `/update` — UPDATE with auto updated_at
- POST `/delete` — DELETE WHERE id=?
- All endpoints validate table name against ALLOWED_TABLES whitelist

**server/routes/junction.ts** — `junctionRoutes(db)`:
- POST `/link` — INSERT OR IGNORE into junction table
- POST `/unlink` — DELETE from junction table
- POST `/get-linked` — SELECT other column from junction table

**server/routes/aggregate.ts** — `aggregateRoutes(db)`:
- POST `/aggregate` — Execute raw SELECT query (rejects non-SELECT)

**server/routes/io.ts** — `ioRoutes(db)`:
- POST `/export` — Export all tables as JSON
- POST `/import` — Import JSON into tables (INSERT OR REPLACE)

**server/index.ts** — Entry point:
- Creates Hono app
- Mounts all route groups under `/api/db`
- Serves static files from `./dist` in production
- Listens on port 3100

**tsconfig.server.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist-server",
    "rootDir": "./server"
  },
  "include": ["server/**/*"]
}
```

Verify: `tsx server/index.ts` starts without error, Ctrl+C to stop.

Commit: `git add server/ tsconfig.server.json && git commit -m "feat: Hono backend with SQLite — all API routes"`

---

### Task 4: Vite Proxy Config

Update `vite.config.ts` to proxy `/api` to the Hono backend during development:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3100",
    },
  },
});
```

Commit: `git add vite.config.ts && git commit -m "feat: add Vite dev proxy to Hono backend"`

---

## Phase 2: Frontend Data Layer

### Task 5: API Provider (replaces Tauri invoke)

Create 3 files in `src/lib/api/`:

**src/lib/api/dataProvider.ts** — Interface definition (identical to v3):
```typescript
export interface SqliteDataProvider {
  query<T>(table: string, filter?: QueryFilter, sort?: SortOption): Promise<T[]>;
  getById<T>(table: string, id: string): Promise<T | null>;
  insert<T>(table: string, data: Omit<T, "id">): Promise<string>;
  update(table: string, id: string, data: Partial<Record<string, unknown>>): Promise<void>;
  remove(table: string, id: string): Promise<void>;
  link(junction: string, leftId: string, rightId: string): Promise<void>;
  unlink(junction: string, leftId: string, rightId: string): Promise<void>;
  getLinked(junction: string, column: string, id: string): Promise<string[]>;
  aggregate(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
}
export interface QueryFilter { where?: WhereClause[]; limit?: number; offset?: number; }
export interface WhereClause { column: string; op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN"; value: unknown; }
export interface SortOption { column: string; direction: "ASC" | "DESC"; }
```

**src/lib/api/client.ts** — HTTP fetch wrapper:
```typescript
const API_BASE = "/api/db";
export async function apiCall<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text() || `API error: ${res.status}`);
  return res.json();
}
```

**src/lib/api/provider.ts** — DataProvider implementation using fetch:
```typescript
import { apiCall } from "./client";
import type { QueryFilter, SortOption, SqliteDataProvider } from "./dataProvider";

export const db: SqliteDataProvider = {
  query: <T>(table: string, filter?: QueryFilter, sort?: SortOption) =>
    apiCall<T[]>("query", { table, filter, sort }),
  getById: <T>(table: string, id: string) =>
    apiCall<T | null>("get-by-id", { table, id }),
  insert: <T>(table: string, data: Omit<T, "id">) =>
    apiCall<string>("insert", { table, data }),
  update: (table: string, id: string, data: Partial<Record<string, unknown>>) =>
    apiCall<void>("update", { table, id, data }),
  remove: (table: string, id: string) =>
    apiCall<void>("delete", { table, id }),
  link: (junction: string, leftId: string, rightId: string) =>
    apiCall<void>("link", { junction, leftId, rightId }),
  unlink: (junction: string, leftId: string, rightId: string) =>
    apiCall<void>("unlink", { junction, leftId, rightId }),
  getLinked: (junction: string, column: string, id: string) =>
    apiCall<string[]>("get-linked", { junction, column, id }),
  aggregate: (sql: string, params?: unknown[]) =>
    apiCall<Record<string, unknown>[]>("aggregate", { sql, params }),
};
```

Commit: `git add src/lib/api/ && git commit -m "feat: add HTTP API provider (replaces Tauri invoke)"`

---

### Task 6: Rewrite All 7 Services

**The service rewrite code is IDENTICAL to the v3 plan** (file `2026-02-19-sqlite-migration.md`, Tasks 9-15). The only difference is the import path:

**Use this import** in every service:
```typescript
import { db } from "../lib/api/provider";
```

**NOT** ~~`import { db } from "../lib/sqlite/provider"`~~

Rewrite these files (see v3 plan Tasks 9-15 for complete replacement code):

1. `src/services/timelineService.ts` — v3 Task 9
2. `src/services/assetService.ts` — v3 Task 10
3. `src/services/businessService.ts` — v3 Task 11
4. `src/services/projectService.ts` — v3 Task 12
5. `src/services/ledgerService.ts` — v3 Task 13
6. `src/services/quoteService.ts` — v3 Task 14
7. `src/services/dashboardService.ts` — v3 Task 15

Commit after each, or batch: `git add src/services/ && git commit -m "feat: rewrite all services to use HTTP API"`

---

### Task 7: Subscription Service + Store + Types

**Step 1:** Remove `notionAssetPageId` (line 13) and `notionLedgerPageId` (line 14) from `src/lib/types/subscription.ts`

**Step 2:** Rename `totalAmount` to `amount` in `ContractRow` interface in `src/lib/types/project.ts`

**Step 3:** Create `src/services/subscriptionService.ts` (see v3 plan Task 16 Step 2 for complete code — change import to `from "../lib/api/provider"`)

**Step 4:** Rewrite `src/stores/useSubscriptionStore.ts` (see v3 plan Task 16 Step 3 for complete code)

**Step 5:** In `src/stores/useQuoteStore.ts`:
- Rename `saveToNotion` to `save` (line 20 type definition + lines 89-103 implementation)
- Change success message from `"报价已回写 Notion"` to `"报价已保存"`

Commit: `git add src/lib/types/ src/services/subscriptionService.ts src/stores/ && git commit -m "feat: subscription service + store rewrites"`

---

### Task 8: Update Page Components

1. **`src/pages/QuoteCenterPage.tsx`:**
   - Line 52: `Notion 回写` → `保存`
   - Line 57: `store.saveToNotion()` → `store.save()`
   - Line 58: `"回写 Notion"` → `"保存报价"`

2. **`src/pages/LedgerPage.tsx`:**
   - Line 257: `"保存到 Notion"` → `"保存"`

3. **`src/pages/SubscriptionPage.tsx`:**
   - Lines 434-436: `selected.notionAssetPageId` → `selected.id` (3 occurrences)
   - Line 537: `"创建并写回 Notion"` → `"创建订阅"`

4. **`src/pages/SettingsPage.tsx`:** Replace entire file with:
```typescript
import { useState } from "react";

export default function SettingsPage() {
  const [message, setMessage] = useState("");

  async function handleExport() {
    try {
      const res = await fetch("/api/db/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mixarlabos_export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("导出成功");
    } catch (error) {
      setMessage(`导出失败: ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  return (
    <div className="page">
      <h2>设置</h2>
      <section>
        <h3>数据管理</h3>
        <p className="muted">数据存储在服务端 SQLite 数据库中。</p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => void handleExport()}>导出 JSON</button>
        </div>
        {message && <p style={{ marginTop: 8 }}>{message}</p>}
      </section>
    </div>
  );
}
```

Commit: `git add src/pages/ && git commit -m "feat: update pages — remove Notion references"`

---

## Phase 3: Cleanup

### Task 9: Delete Old Code

```bash
rm -rf src-tauri/
rm -rf src/lib/notion/
rm src/lib/types/notion.ts
rm src/services/subscriptionSyncService.ts
rm src/services/subscriptionMapper.ts
```

Verify no leftover Notion references: `grep -ri "notion" src/ --include="*.ts" --include="*.tsx" -l`
(Only `SubscriptionPage.tsx` icon matching lines 648/685 should remain — that's the Notion product brand, not API)

Verify build: `pnpm build`

Commit: `git add -A && git commit -m "chore: delete Tauri backend + Notion API code"`

---

### Task 10: Final Build Verification

```bash
pnpm build                    # Frontend builds
tsx server/index.ts &          # Backend starts
sleep 2
curl http://localhost:3100/api/db/query -X POST -H "Content-Type: application/json" -d '{"table":"projects"}'
# Should return: []
kill %1
```

Commit: `git add -A && git commit -m "checkpoint: v4 web migration complete"`

---

## Phase 4: Motion Animations (optional, low priority)

### Task 11: Add Motion Provider

In `src/App.tsx`, add:
```typescript
import { LazyMotion, domAnimation } from "motion/react";
```

Wrap the app content with `<LazyMotion features={domAnimation}>...</LazyMotion>`.

Then gradually add animations page by page. See design doc section 九 for the full list of recommended animations per page.
