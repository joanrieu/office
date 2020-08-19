import { createContext, useContext } from "react";

export const FocusContext = createContext<[string, (focus: string) => void]>(
  null as any
);

export function useFocus() {
  return useContext(FocusContext);
}
