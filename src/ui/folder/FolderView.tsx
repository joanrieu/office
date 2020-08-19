import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { EmptyPlaceholder } from "../EmptyPlaceholder";
import { FolderViewItem } from "./FolderViewItem";

export const FolderView = observer(({ node }: { node: Node }) =>
  node.children.length ? (
    <>
      {node.children.map((child) => (
        <FolderViewItem key={child.id} node={child} />
      ))}
    </>
  ) : (
    <EmptyPlaceholder />
  )
);
