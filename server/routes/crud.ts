import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type Database from "better-sqlite3";
import { MAIN_TABLES, validateColumn, validateOperator, validateTable } from "../schema";

type JsonObject = Record<string, unknown>;

type WhereClause = {
  column: string;
  op: string;
  value: unknown;
};

const ENTITY_TABLES = new Set(MAIN_TABLES);

function ensureObject(value: unknown, fieldName: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} 必须是对象`);
  }
  return value as JsonObject;
}

function parseLimitOffset(value: unknown, field: "limit" | "offset"): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${field} 必须是非负整数`);
  }
  return parsed;
}

export function crudRoutes(db: Database.Database): Hono {
  const app = new Hono();

  app.post("/query", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const table = String(body.table ?? "");
    validateTable(table);

    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];

    const filter = body.filter ? ensureObject(body.filter, "filter") : undefined;
    const whereRaw = filter?.where;

    if (Array.isArray(whereRaw) && whereRaw.length > 0) {
      const conditions = whereRaw.map((entry) => {
        const clause = ensureObject(entry, "where clause") as unknown as WhereClause;
        validateColumn(clause.column);
        validateOperator(clause.op);

        if (clause.op === "IN") {
          if (!Array.isArray(clause.value) || clause.value.length === 0) {
            throw new Error("IN 操作符要求非空数组值");
          }
          const placeholders = clause.value.map(() => "?").join(", ");
          params.push(...clause.value);
          return `${clause.column} IN (${placeholders})`;
        }

        params.push(clause.value);
        return `${clause.column} ${clause.op} ?`;
      });
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    const sort = body.sort ? ensureObject(body.sort, "sort") : undefined;
    if (sort) {
      const column = String(sort.column ?? "");
      validateColumn(column);
      const direction = String(sort.direction ?? "ASC").toUpperCase() === "DESC" ? "DESC" : "ASC";
      sql += ` ORDER BY ${column} ${direction}`;
    }

    const limit = parseLimitOffset(filter?.limit, "limit");
    if (limit !== undefined) {
      sql += ` LIMIT ${limit}`;
    }

    const offset = parseLimitOffset(filter?.offset, "offset");
    if (offset !== undefined) {
      if (limit === undefined) {
        sql += " LIMIT -1";
      }
      sql += ` OFFSET ${offset}`;
    }

    const rows = db.prepare(sql).all(...params);
    return c.json(rows);
  });

  app.post("/get-by-id", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const table = String(body.table ?? "");
    validateTable(table);

    if (!ENTITY_TABLES.has(table as (typeof MAIN_TABLES)[number])) {
      throw new Error(`${table} 不支持 get-by-id`);
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      throw new Error("id 不能为空");
    }

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    return c.json(row ?? null);
  });

  app.post("/insert", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const table = String(body.table ?? "");
    validateTable(table);

    if (!ENTITY_TABLES.has(table as (typeof MAIN_TABLES)[number])) {
      throw new Error(`${table} 不支持 insert`);
    }

    const data = ensureObject(body.data, "data");
    const id = randomUUID();

    const entries = Object.entries(data).filter(([key]) => key !== "id");
    entries.forEach(([key]) => validateColumn(key));

    const columns = ["id", ...entries.map(([key]) => key)];
    const placeholders = columns.map(() => "?");
    const values = [id, ...entries.map(([, value]) => value)];

    db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`).run(...values);

    return c.json(id);
  });

  app.post("/update", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const table = String(body.table ?? "");
    validateTable(table);

    if (!ENTITY_TABLES.has(table as (typeof MAIN_TABLES)[number])) {
      throw new Error(`${table} 不支持 update`);
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      throw new Error("id 不能为空");
    }

    const data = ensureObject(body.data, "data");
    const entries = Object.entries(data).filter(([key]) => key !== "id");

    if (entries.length === 0) {
      throw new Error("update data 不能为空");
    }

    entries.forEach(([key]) => validateColumn(key));

    const sets = [...entries.map(([key]) => `${key} = ?`), "updated_at = datetime('now')"];
    const values = [...entries.map(([, value]) => value), id];

    db.prepare(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    return c.json({ ok: true });
  });

  app.post("/delete", async (c) => {
    const body = ensureObject(await c.req.json(), "request body");
    const table = String(body.table ?? "");
    validateTable(table);

    if (!ENTITY_TABLES.has(table as (typeof MAIN_TABLES)[number])) {
      throw new Error(`${table} 不支持 delete`);
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      throw new Error("id 不能为空");
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    return c.json({ ok: true });
  });

  return app;
}
