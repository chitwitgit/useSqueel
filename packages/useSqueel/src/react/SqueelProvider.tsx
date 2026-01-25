import React, { createContext, useContext, useEffect, useState } from "react";
import { SqueelClient } from "../client/types";

export interface SqueelContextValue {
  client: SqueelClient;
  ready: boolean;
  error: Error | null;
}

export const SqueelContext = createContext<SqueelContextValue | null>(null);

export function SqueelProvider({ client, children }: { client: SqueelClient; children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    client.init()
      .then(() => setReady(true))
      .catch((e) => setError(e));
  }, [client]);

  return (
    <SqueelContext.Provider value={{ client, ready, error }}>
      {children}
    </SqueelContext.Provider>
  );
}

export function useSqueel() {
  const context = useContext(SqueelContext);
  if (!context) {
    throw new Error("useSqueel must be used within a SqueelProvider");
  }
  return context;
}
