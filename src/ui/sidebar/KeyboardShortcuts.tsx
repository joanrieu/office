import { observer } from "mobx-react";
import React from "react";
import { Node } from "../../core/Node";
import "./KeyboardShortcuts.scss";

export const KeyboardShortcuts = observer(({ node }: { node: Node }) => (
  <table className="KeyboardShortcuts">
    <tbody>
      {node.isOutline && (
        <>
          <tr>
            <td>
              <kbd>Enter</kbd>
            </td>
            <td>New item below</td>
          </tr>
          <tr>
            <td>
              <kbd>Shift-Enter</kbd>
            </td>
            <td>New item above</td>
          </tr>
          <tr>
            <td>
              <kbd>Ctrl-Shift-Enter</kbd>
            </td>
            <td>Go to note (and back)</td>
          </tr>
          <tr>
            <td>
              <kbd>Tab</kbd>
            </td>
            <td>Indent item</td>
          </tr>
          <tr>
            <td>
              <kbd>Shift-Tab</kbd>
            </td>
            <td>Unindent item</td>
          </tr>
        </>
      )}
    </tbody>
  </table>
));
