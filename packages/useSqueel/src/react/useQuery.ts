import { useCallback, useEffect, useRef, useState } from "react";
import { isSqlStatement } from "../client/sql";
import { SqlValue, UseQueryOptions, UseQueryResult } from "../client/types";
import { extractTables } from "../subscriptions/dependency";
import { useSqueel } from "./SqueelProvider";

export function useQuery<T>(
  sqlOrStmt: string | { sql: string; params: readonly any[] },
  params: readonly any[] = [],
  options: UseQueryOptions<T> = {}
): UseQueryResult<T> {
  const { client, ready } = useSqueel();
  const [result, setResult] = useState<UseQueryResult<T>>({
    status: "loading",
    data: (options.default ?? null) as T,
    error: null,
    refetch: () => {},
  });

  const lastHash = useRef<string>("");
  const tables = useRef<string[]>([]);

  const sql = isSqlStatement(sqlOrStmt) ? sqlOrStmt.sql : sqlOrStmt;
  const finalParams = isSqlStatement(sqlOrStmt) ? sqlOrStmt.params : params;

  if (tables.current.length === 0) {
    if (options.dependsOn) {
      tables.current = options.dependsOn;
    } else {
      const extracted = extractTables(sql as string);
      tables.current = extracted ? Array.from(extracted) : ["*"];
    }
  }

  const runQuery = useCallback(async () => {
    if (!ready) return;

    try {
      let rows = await client.query(sql, finalParams);
      
      if (options.validate) {
        rows = options.validate(rows) as any;
      }

      let data: any = rows;
      if (options.single) {
        data = rows.length > 0 ? rows[0] : null;
      }

      const hash = JSON.stringify(data);
      if (hash !== lastHash.current) {
        lastHash.current = hash;
        setResult((prev) => ({ ...prev, status: "ready", data, error: null }));
      }
    } catch (e: any) {
      setResult((prev) => ({ ...prev, status: "error", error: e }));
    }
  }, [client, ready, sql, JSON.stringify(finalParams), options.single, options.validate]);

  useEffect(() => {
    runQuery();
  }, [runQuery]);

  useEffect(() => {
    if (!ready) return;

    return client.onInvalidate((changedTables) => {
      const isRelevant = changedTables.some((t) =>
        t === "*" || tables.current.includes("*") || tables.current.includes(t)
      );
      if (isRelevant) {
        runQuery();
      }
    });
  }, [client, ready, runQuery]);

  return { ...result, refetch: runQuery };
}
