import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { OutlineViewItem } from "./OutlineViewItem";
import "./OutlineViewItems.scss";

export const OutlineViewItems = observer(({ nodes }: { nodes: Node[] }) => (
  <ul className="OutlineViewItems">
    {nodes.map((node) => (
      <OutlineViewItem key={node.id} node={node} />
    ))}
  </ul>
));
