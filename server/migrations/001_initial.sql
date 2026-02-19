-- MixarLabOS v3 — Initial schema
-- 9 main tables + 2 auxiliary + 7 junction tables

-- === Main Tables ===

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT '',
  period_start  TEXT,
  period_end    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT '',
  start_date    TEXT,
  end_date      TEXT,
  progress      REAL DEFAULT 0,
  milestone     TEXT,
  owner         TEXT,
  project_id    TEXT REFERENCES projects(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meetings (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  meeting_date  TEXT,
  project_id    TEXT REFERENCES projects(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  contact       TEXT,
  phone         TEXT,
  email         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  contact       TEXT,
  phone         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  amount        REAL NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT '',
  sign_date     TEXT,
  due_date      TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_expenses (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  expense_date      TEXT,
  period_start      TEXT,
  period_end        TEXT,
  amount_original   REAL NOT NULL DEFAULT 0,
  amount_local      REAL NOT NULL DEFAULT 0,
  cost_category     TEXT,
  cost_detail       TEXT,
  cost_nature       TEXT,
  cost_ownership    TEXT,
  cost_bearer       TEXT,
  approval_status   TEXT,
  input_mode        TEXT,
  payment_method    TEXT,
  invoice_type      TEXT,
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  service_version     TEXT NOT NULL DEFAULT '',
  service_area        TEXT NOT NULL DEFAULT '',
  status              TEXT NOT NULL DEFAULT '服役中',
  start_date          TEXT,
  description         TEXT,
  software_version    TEXT,
  download_url        TEXT,
  note                TEXT,
  price               REAL NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'CNY',
  billing_cycle       TEXT NOT NULL DEFAULT '月度付费',
  cost_sub_category   TEXT,
  last_payment_date   TEXT,
  next_billing_date   TEXT,
  monthly_equivalent  REAL NOT NULL DEFAULT 0,
  yearly_equivalent   REAL NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS digital_assets (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT '',
  service_version   TEXT,
  service_area      TEXT,
  software_version  TEXT,
  start_date        TEXT,
  download_url      TEXT,
  description       TEXT,
  note              TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Auxiliary Tables ===

CREATE TABLE IF NOT EXISTS quote_line_items (
  id          TEXT PRIMARY KEY,
  quote_id    TEXT NOT NULL,
  item_name   TEXT NOT NULL,
  description TEXT,
  quantity    REAL NOT NULL DEFAULT 1,
  rate        REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_targets (
  id          TEXT PRIMARY KEY,
  year        INTEGER NOT NULL,
  target      REAL NOT NULL DEFAULT 0,
  actual      REAL NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- === Junction Tables (many-to-many) ===

CREATE TABLE IF NOT EXISTS client_projects (
  client_id   TEXT NOT NULL REFERENCES clients(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (client_id, project_id)
);

CREATE TABLE IF NOT EXISTS client_contracts (
  client_id   TEXT NOT NULL REFERENCES clients(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (client_id, contract_id)
);

CREATE TABLE IF NOT EXISTS project_contracts (
  project_id  TEXT NOT NULL REFERENCES projects(id),
  contract_id TEXT NOT NULL REFERENCES contracts(id),
  PRIMARY KEY (project_id, contract_id)
);

CREATE TABLE IF NOT EXISTS ledger_projects (
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (ledger_id, project_id)
);

CREATE TABLE IF NOT EXISTS ledger_suppliers (
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  PRIMARY KEY (ledger_id, supplier_id)
);

CREATE TABLE IF NOT EXISTS supplier_projects (
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  PRIMARY KEY (supplier_id, project_id)
);

CREATE TABLE IF NOT EXISTS asset_ledger_links (
  asset_id    TEXT NOT NULL REFERENCES digital_assets(id),
  ledger_id   TEXT NOT NULL REFERENCES ledger_expenses(id),
  PRIMARY KEY (asset_id, ledger_id)
);

-- === Indexes ===

CREATE INDEX IF NOT EXISTS idx_tasks_project       ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project    ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date         ON ledger_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_ledger_category     ON ledger_expenses(cost_category);
CREATE INDEX IF NOT EXISTS idx_contracts_sign_date ON contracts(sign_date);
CREATE INDEX IF NOT EXISTS idx_subs_next_billing   ON subscriptions(next_billing_date);
CREATE INDEX IF NOT EXISTS idx_subs_status         ON subscriptions(status);
