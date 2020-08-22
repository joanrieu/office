import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { useOffice } from "../context/useOffice";
import "./Overview.scss";
import { OverviewItem } from "./OverviewItem";
import { OverviewItems } from "./OverviewItems";

export const Overview = observer(() => {
  const office = useOffice();
  const root = Node.root(office);
  if (!root) return null;
  return (
    <div className="Overview">
      <OverviewItem node={root} />
      <OverviewItems node={root} />
    </div>
  );
});
