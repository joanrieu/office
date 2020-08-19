import React from "react";
import { Node } from "../core/Node";
import { View } from "./View";

export const FileView = ({ node }: { node: Node }) => (
  <>
    {node.children.map((child) => (
      <View key={node.id} node={child} />
    ))}
  </>
);
