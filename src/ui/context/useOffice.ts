import { createContext, useContext } from "react";
import { Office } from "../../core/Office";

export const OfficeContext = createContext<Office>(null as any);

export function useOffice() {
  return useContext(OfficeContext);
}
