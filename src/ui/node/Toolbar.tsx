import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import { useFocus } from "../context/useFocus";
import { useOffice } from "../context/useOffice";
import "./Toolbar.scss";

export const Toolbar = observer(({ node }: { node: Node }) => {
  const office = useOffice();
  const [, setFocus] = useFocus();
  return (
    <div className="Toolbar">
      {node.isFolder && (
        <>
          <button onClick={() => Node.create(office, "folder", node)}>
            New Folder
          </button>
          <button onClick={() => Node.create(office, "file", node)}>
            New File
          </button>
          <button onClick={() => Node.create(office, "outline", node)}>
            New Outline
          </button>
        </>
      )}
      {node.isOutline && (
        <button
          onClick={() =>
            setFocus(Node.create(office, "outline", node).id + ":name")
          }
        >
          New Item
        </button>
      )}
    </div>
  );
});
