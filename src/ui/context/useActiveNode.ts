import { createContext, useContext } from "react";
import { Node } from "../../core/Node";

export const ActiveNodeContext = createContext<
  [Node | null, (node: Node | null) => void]
>(null as any);

export function useActiveNode() {
  return useContext(ActiveNodeContext);
}
