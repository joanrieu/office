import { observer } from "mobx-react";
import React from "react";
import { Node } from "../core/Node";
import { FileView } from "./FileView";
import { FolderView } from "./folder/FolderView";
import { OutlineView } from "./outline/OutlineView";
import { TextView } from "./TextView";

export const View = observer(({ node }: { node: Node }) => {
  if (node.isFolder) return <FolderView node={node} />;
  if (node.isFile) return <FileView node={node} />;
  if (node.isOutline) return <OutlineView node={node} />;
  if (node.isText) return <TextView node={node} />;
  return null;
});
