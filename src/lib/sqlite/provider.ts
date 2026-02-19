import { invoke } from "@tauri-apps/api/core";
import type { QueryFilter, SortOption, SqliteDataProvider } from "./dataProvider";

export const db: SqliteDataProvider = {
  query: <T>(table: string, filter?: QueryFilter, sort?: SortOption) =>
    invoke<T[]>("db_query", { table, filter, sort }),

  getById: <T>(table: string, id: string) =>
    invoke<T | null>("db_get_by_id", { table, id }),

  insert: <T>(table: string, data: Omit<T, "id">) =>
    invoke<string>("db_insert", { table, data }),

  update: (table: string, id: string, data: Partial<Record<string, unknown>>) =>
    invoke<void>("db_update", { table, id, data }),

  remove: (table: string, id: string) =>
    invoke<void>("db_delete", { table, id }),

  link: (junction: string, leftId: string, rightId: string) =>
    invoke<void>("db_link", { junction, leftId, rightId }),

  unlink: (junction: string, leftId: string, rightId: string) =>
    invoke<void>("db_unlink", { junction, leftId, rightId }),

  getLinked: (junction: string, column: string, id: string) =>
    invoke<string[]>("db_get_linked", { junction, column, id }),

  aggregate: (sql: string, params?: unknown[]) =>
    invoke<Record<string, unknown>[]>("db_aggregate", { sql, params }),
};
