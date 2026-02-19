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

export interface QueryFilter {
  where?: WhereClause[];
  limit?: number;
  offset?: number;
}

export interface WhereClause {
  column: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN";
  value: unknown;
}

export interface SortOption {
  column: string;
  direction: "ASC" | "DESC";
}
