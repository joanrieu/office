import classNames from "classnames";
import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { useActiveNode } from "../context/useActiveNode";
import { useFocus } from "../context/useFocus";
import { NodeIcon } from "../node/NodeIcon";
import { NodeName } from "../node/NodeName";
import "./OverviewItem.scss";

export const OverviewItem = observer(({ node }: { node: Node }) => {
  const [activeNode] = useActiveNode();
  const ui = useFocus();
  return (
    <a
      href={"#/" + node.id}
      className={classNames("OverviewItem", { active: node === activeNode })}
    >
      <NodeIcon kind={node.kind} />
      <NodeName node={node} />
    </a>
  );
});
