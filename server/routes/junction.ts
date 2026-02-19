import { Hono } from "hono";
import type Database from "better-sqlite3";
import { JUNCTION_TABLES, validateColumn, validateTable } from "../schema";

type JsonObject = Record<string, unknown>;

function ensureObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是对象`);
  }
  return value as JsonObject;
}

function getJunctionColumns(db: Database.Database, table: string): [string, string] {
  const cols = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;

  if (cols.length !== 2) {
    throw new Error(`${table} 不是有效的关联表`);
  }

  return [cols[0].name, cols[1].name];
}

const JUNCTION_TABLE_SET = new Set(JUNCTION_TABLES);

export function junctionRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.post("/link", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const junction = String(body.junction ?? "");
    validateTable(junction);

    if (!JUNCTION_TABLE_SET.has(junction as (typeof JUNCTION_TABLES)[number])) {
      throw new Error(`${junction} 不是关联表`);
    }

    const leftId = String(body.leftId ?? "").trim();
    const rightId = String(body.rightId ?? "").trim();
    if (!leftId || !rightId) {
      throw new Error("leftId/rightId 不能为空");
    }

    const [leftCol, rightCol] = getJunctionColumns(db, junction);

    db.prepare(`INSERT OR IGNORE INTO ${junction} (${leftCol}, ${rightCol}) VALUES (?, ?)`).run(leftId, rightId);
    return c.json({ ok: true });
  });

  app.post("/unlink", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const junction = String(body.junction ?? "");
    validateTable(junction);

    if (!JUNCTION_TABLE_SET.has(junction as (typeof JUNCTION_TABLES)[number])) {
      throw new Error(`${junction} 不是关联表`);
    }

    const leftId = String(body.leftId ?? "").trim();
    const rightId = String(body.rightId ?? "").trim();
    if (!leftId || !rightId) {
      throw new Error("leftId/rightId 不能为空");
    }

    const [leftCol, rightCol] = getJunctionColumns(db, junction);

    db.prepare(`DELETE FROM ${junction} WHERE ${leftCol} = ? AND ${rightCol} = ?`).run(leftId, rightId);
    return c.json({ ok: true });
  });

  app.post("/get-linked", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const junction = String(body.junction ?? "");
    validateTable(junction);

    if (!JUNCTION_TABLE_SET.has(junction as (typeof JUNCTION_TABLES)[number])) {
      throw new Error(`${junction} 不是关联表`);
    }

    const column = String(body.column ?? "").trim();
    validateColumn(column);

    const id = String(body.id ?? "").trim();
    if (!id) {
      throw new Error("id 不能为空");
    }

    const [leftCol, rightCol] = getJunctionColumns(db, junction);
    if (column !== leftCol && column !== rightCol) {
      throw new Error(`${column} 不是 ${junction} 的列`);
    }

    const lookupCol = column;
    const outputCol = lookupCol === leftCol ? rightCol : leftCol;

    const rows = db.prepare(`SELECT ${outputCol} AS id FROM ${junction} WHERE ${lookupCol} = ?`).all(id) as Array<{ id: string }>;
    return c.json(rows.map((row) => row.id));
  });

  return app;
}
