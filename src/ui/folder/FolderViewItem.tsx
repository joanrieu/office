import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import "./FolderViewItem.scss";
import { NodeIcon } from "../node/NodeIcon";
import { NodeName } from "../node/NodeName";

export const FolderViewItem = observer(({ node }: { node: Node }) => (
  <div className="FolderViewItem">
    <a href={"#/" + node.id}>
      <NodeIcon kind={node.kind} />
      <NodeName node={node} />
    </a>
    <button onClick={() => node.delete()}>🗙</button>
  </div>
));
