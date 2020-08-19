import { createContext, useContext } from "react";
import { Sync } from "../../core/Sync";

export const SyncContext = createContext<Sync>(null as any);

export function useSync() {
  return useContext(SyncContext);
}
