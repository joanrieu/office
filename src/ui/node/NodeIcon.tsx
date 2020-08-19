import { observer } from "mobx-react";
import React from "react";
import { NodeKind } from "../../core/types";
import "./NodeIcon.scss";

export const NodeIcon = observer(({ kind }: { kind: NodeKind }) => (
  <span className="NodeIcon">
    <span className={kind} />
  </span>
));
