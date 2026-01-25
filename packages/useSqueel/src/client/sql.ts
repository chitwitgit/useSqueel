import { SqlValue } from "./types.ts";

export interface SqlStatement {
  sql: string;
  params: readonly SqlValue[];
}

export function sql(
  strings: TemplateStringsArray,
  ...values: SqlValue[]
): SqlStatement {
  let sql = "";
  const params: any[] = [];

  for (let i = 0; i < strings.length; i++) {
    sql += strings[i];
    if (i < values.length) {
      sql += "?";
      params.push(values[i]);
    }
  }

  return { sql, params };
}

export function isSqlStatement(obj: any): obj is SqlStatement {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.sql === "string" &&
    (Array.isArray(obj.params) || (obj.params && typeof obj.params === "object" && "length" in obj.params))
  );
}
