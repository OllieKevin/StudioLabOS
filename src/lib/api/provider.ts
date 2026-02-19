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
