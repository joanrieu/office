import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { OutlineViewItems } from "./OutlineViewItems";

export const OutlineView = observer(({ node }: { node: Node }) => (
  <OutlineViewItems nodes={node.children} />
));
