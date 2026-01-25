import { useCallback } from "react";
import { Tx } from "../client/types";
import { useSqueel } from "./SqueelProvider";

export function useTransaction(): <T>(
  fn: (db: Tx) => Promise<T>
) => Promise<T> {
  const { client } = useSqueel();

  return useCallback(async <T>(fn: (db: Tx) => Promise<T>) => {
    return client.transaction(fn);
  }, [client]);
}
