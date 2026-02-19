import fs from "node:fs";
import path from "node:path";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { initDb } from "./db";
import { crudRoutes } from "./routes/crud";
import { junctionRoutes } from "./routes/junction";
import { aggregateRoutes } from "./routes/aggregate";
import { ioRoutes } from "./routes/io";

const app = new Hono();
const db = initDb();

app.get("/health", (c) => c.json({ ok: true }));

app.route("/api/db", crudRoutes(db));
app.route("/api/db", junctionRoutes(db));
app.route("/api/db", aggregateRoutes(db));
app.route("/api/db", ioRoutes(db));

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  app.use("/*", serveStatic({ root: "./dist" }));

  app.get("/*", (c) => {
    const indexPath = path.resolve(process.cwd(), "dist", "index.html");
    if (!fs.existsSync(indexPath)) {
      return c.text("dist/index.html not found", 404);
    }
    return c.html(fs.readFileSync(indexPath, "utf8"));
  });
}

app.onError((err, c) => {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  return c.json({ error: message }, 400);
});

const port = Number(process.env.PORT || 3100);
serve({ fetch: app.fetch, port });
console.log(`MixarLab OS API running at http://localhost:${port}`);
