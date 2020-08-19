import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { OverviewItem } from "./OverviewItem";
import "./OverviewItems.scss";

export const OverviewItems = observer(({ node }: { node: Node }) => (
  <ul className="OverviewItems">
    {node.children.map((child) => (
      <li key={child.id}>
        <OverviewItem node={child} />
        {child.isFolder && <OverviewItems node={child} />}
      </li>
    ))}
  </ul>
));
