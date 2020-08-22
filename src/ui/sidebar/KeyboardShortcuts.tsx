import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import "./KeyboardShortcuts.scss";

export const KeyboardShortcuts = observer(({ node }: { node: Node }) => {
  const ks = ([
    ["Enter", "New item below", node.isOutline],
    ["Shift-Enter", "New item above", node.isOutline],
    ["Ctrl-Shift-Enter", "Go to note (and back)", node.isOutline],
    ["Tab", "Indent item", node.isOutline],
    ["Shift-Tab", "Unindent item", node.isOutline],
  ] as [string, string, boolean][]).filter(([, , predicate]) => predicate);

  if (ks.length === 0) return null;

  return (
    <div className="KeyboardShortcuts">
      <table>
        <tbody>
          {ks.map(([key, action]) => (
            <tr>
              <td>
                <kbd>{key}</kbd>
              </td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
