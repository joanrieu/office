import classNames from "classnames";
import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { UNTITLED } from "../UI";
import "./NodeName.scss";

export const NodeName = observer(
  ({ node, editable = false }: { node: Node; editable?: boolean }) =>
    editable ? (
      <input
        type="text"
        className={classNames("NodeName", { untitled: !node.name })}
        value={node.name}
        placeholder={UNTITLED}
        onChange={(event) => (node.name = event.target.value)}
      />
    ) : (
      <span className={classNames("NodeName", { untitled: !node.name })}>
        {node.name || UNTITLED}
      </span>
    )
);
