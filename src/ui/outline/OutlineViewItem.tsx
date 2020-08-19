import { observer } from "mobx-react";
import React, { useLayoutEffect, useRef } from "react";
import { Node } from "../../core/Node";
import { useOffice } from "../context/useOffice";
import { useFocus } from "../context/useFocus";
import "./OutlineViewItem.scss";
import { OutlineViewItems } from "./OutlineViewItems";

export const OutlineViewItem = observer(({ node }: { node: Node }) => {
  const office = useOffice();
  const [focus, setFocus] = useFocus();

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = textAreaRef.current;
    if (el) {
      el.style.height = "0";
      el.style.height = el.scrollHeight + "px";
    }
  }, [textAreaRef, node.note, focus]);

  return (
    <li key={node.id} className="OutlineViewItem">
      <div className="bullet" />
      <input
        type="text"
        className="name"
        value={node.name}
        onChange={(event) => (node.name = event.target.value)}
        onKeyDown={(event) => {
          if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
            setFocus(node.id + ":note");
          } else if (event.key === "Enter") {
            const empty = Node.create(office, "outline");
            if (event.shiftKey) {
              empty.moveBefore(node);
            } else {
              const child = node.firstChild;
              if (child) {
                empty.moveBefore(child);
              } else {
                empty.moveAfter(node);
              }
            }
            setFocus(empty.id + ":name");
          } else if (
            (event.key === "Backspace" || event.key === "Delete") &&
            !node.name
          ) {
            const nearest =
              event.key === "Backspace" ? node.nodeAbove : node.nodeBelow;
            if (nearest?.isOutline) {
              setFocus(nearest.id + ":name");
            }
            node.delete();
          } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            const nearest =
              event.key === "ArrowUp" ? node.nodeAbove : node.nodeBelow;
            if (nearest?.isOutline) {
              setFocus(nearest.id + ":name");
            }
          } else if (event.key === "Tab") {
            if (event.shiftKey) {
              const parent = node.parent;
              const grandParent = parent?.parent;
              if (parent?.isOutline && grandParent?.isOutline) {
                node.moveAfter(parent);
              }
            } else {
              const previous = node.previousSibling;
              if (previous) {
                node.moveInside(previous);
              }
            }
          } else {
            return;
          }
          event.preventDefault();
        }}
        data-focus={node.id + ":name"}
        onFocus={() => setFocus(node.id + ":name")}
        autoFocus={focus === node.id + ":name"}
      />
      {(node.note || focus === node.id + ":note") && (
        <textarea
          ref={textAreaRef}
          className="note"
          value={node.note}
          onChange={(event) => (node.note = event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
              setFocus(node.id + ":name");
            } else {
              return;
            }
            event.preventDefault();
          }}
          data-focus={node.id + ":note"}
          onFocus={() => setFocus(node.id + ":note")}
          autoFocus={focus === node.id + ":note"}
        />
      )}
      <OutlineViewItems nodes={node.children} />
    </li>
  );
});
