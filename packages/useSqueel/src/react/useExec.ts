import { ExecResult } from "../client/types";
import { useSqueel } from "./SqueelProvider";

export function useExec(): (
  sqlOrStmt: string | { sql: string; params: readonly any[] },
  params?: readonly any[]
) => Promise<ExecResult> {
  const { client } = useSqueel();
  return (sqlOrStmt, params) => client.exec(sqlOrStmt, params);
}
