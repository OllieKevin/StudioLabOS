import { Hono } from "hono";
import type Database from "better-sqlite3";
import { ALL_TABLES, validateColumn } from "../schema";

type JsonObject = Record<string, unknown>;

type ImportPayload = Partial<Record<(typeof ALL_TABLES)[number], unknown>>;

const DELETE_ORDER: readonly (typeof ALL_TABLES)[number][] = [
  "asset_ledger_links",
  "supplier_projects",
  "ledger_suppliers",
  "ledger_projects",
  "project_contracts",
  "client_contracts",
  "client_projects",
  "tasks",
  "meetings",
  "quote_line_items",
  "business_targets",
  "digital_assets",
  "subscriptions",
  "ledger_expenses",
  "contracts",
  "suppliers",
  "clients",
  "projects",
];

const INSERT_ORDER: readonly (typeof ALL_TABLES)[number][] = [
  "projects",
  "clients",
  "suppliers",
  "contracts",
  "ledger_expenses",
  "digital_assets",
  "subscriptions",
  "business_targets",
  "quote_line_items",
  "tasks",
  "meetings",
  "client_projects",
  "client_contracts",
  "project_contracts",
  "ledger_projects",
  "ledger_suppliers",
  "supplier_projects",
  "asset_ledger_links",
];

function ensureObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是对象`);
  }
  return value as JsonObject;
}

function parseImportPayload(body: JsonObject): ImportPayload {
  const raw = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : body;
  return raw as ImportPayload;
}

export function ioRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.post("/export", async (c) => {
    const exported: Record<string, unknown[]> = {};

    for (const table of INSERT_ORDER) {
      const rows = db.prepare(`SELECT * FROM ${table}`).all();
      exported[table] = rows;
    }

    c.header("Content-Type", "application/json; charset=utf-8");
    c.header("Content-Disposition", `attachment; filename=\"mixarlabos_export_${Date.now()}.json\"`);
    return c.json(exported);
  });

  app.post("/import", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const payload = parseImportPayload(body);

    const counts: Record<string, number> = {};

    const runImport = db.transaction(() => {
      for (const table of DELETE_ORDER) {
        db.prepare(`DELETE FROM ${table}`).run();
      }

      for (const table of INSERT_ORDER) {
        const rows = payload[table] ?? [];
        if (!Array.isArray(rows)) {
          throw new Error(`${table} 必须是数组`);
        }

        counts[table] = rows.length;

        for (const row of rows) {
          const record = ensureObject(row, `${table} row`);
          const entries = Object.entries(record);

          if (entries.length === 0) {
            continue;
          }

          const columns = entries.map(([key]) => {
            validateColumn(key);
            return key;
          });
          const placeholders = columns.map(() => "?");
          const values = entries.map(([, value]) => value);

          db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`).run(...values);
        }
      }
    });

    runImport();

    return c.json({ ok: true, mode: "full-replace", counts });
  });

  return app;
}
