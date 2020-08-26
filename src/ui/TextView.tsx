import { observer } from "mobx-react";
import React from "react";
import { Node } from "../core/Node";
import { useFocus } from "./context/useFocus";
import { EmptyFolderPlaceholder } from "./placeholders/EmptyFolderPlaceholder";
import "./TextView.scss";

export function markup(text: string) {
  const span = document.createElement("span");
  span.innerText = text;
  let html = span.innerHTML;
  html = html.replace(/(^|\s)\*\*([^\s])/g, "$1<strong>$2");
  html = html.replace(/([^\s])\*\*(\s|$)/g, "$1</strong>$2");
  html = html.replace(/(^|\s)\*([^\s])/g, "$1<em>$2");
  html = html.replace(/([^\s])\*(\s|$)/g, "$1</em>$2");
  return html;
}

export const TextView = observer(({ node }: { node: Node }) => {
  const [focus, setFocus] = useFocus();
  return node.id === focus ? (
    <textarea
      className="TextView"
      data-focus={node.id + ":text"}
      defaultValue={node.text}
      onChange={(event) => (node.text = event.target.value)}
      autoFocus
      onBlur={() => focus === node.id && setFocus("")}
    />
  ) : node.text ? (
    <p
      data-focus={node.id + ":text"}
      onClick={() => setFocus(node.id + ":text")}
      onFocus={() => setFocus(node.id + ":text")}
      dangerouslySetInnerHTML={{ __html: markup(node.text) }}
    />
  ) : (
    <p
      data-focus={node.id + ":text"}
      onClick={() => setFocus(node.id + ":text")}
      onFocus={() => setFocus(node.id + ":text")}
    >
      <EmptyFolderPlaceholder />
    </p>
  );
});
