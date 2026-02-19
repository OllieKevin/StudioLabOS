import { Hono } from "hono";
import type Database from "better-sqlite3";

type JsonObject = Record<string, unknown>;

function ensureObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是对象`);
  }
  return value as JsonObject;
}

function assertReadOnly(sql: string): void {
  const normalized = sql.trim().toUpperCase();
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    throw new Error("只允许 SELECT 查询");
  }
}

export function aggregateRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.post("/aggregate", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const sql = String(body.sql ?? "").trim();
    if (!sql) {
      throw new Error("sql 不能为空");
    }

    assertReadOnly(sql);

    const params = Array.isArray(body.params) ? body.params : [];
    const rows = db.prepare(sql).all(...params);
    return c.json(rows);
  });

  return app;
}
