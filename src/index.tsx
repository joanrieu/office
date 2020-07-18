import classNames from "classnames";
import "minireset.css";
import { autorun, observable } from "mobx";
import { observer } from "mobx-react";
import "mobx-react-lite/batchingForReactDom";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { render } from "react-dom";
import "uuid";
import { v1 } from "uuid";
import "./style.scss";

namespace Office {
  interface FolderData {
    type: "folder";
    name: string;
  }

  interface OutlineData {
    type: "outline";
    name: string;
    paragraph: string;
  }

  type Data = FolderData | OutlineData;

  class Node<T extends Data = Data> {
    static create<T extends Data>(type: Data["type"]) {
      return new Node(v1(), Node.createDefaultData(type));
    }

    static createRoot() {
      return new Node(v1(), { type: "folder", name: "Drive" });
    }

    static createDefaultData(type: Data["type"]): Data {
      switch (type) {
        case "folder":
          return { type, name: "" };
        case "outline":
          return { type, name: "", paragraph: "" };
      }
    }

    protected constructor(readonly id: string, data: T) {
      this.data = data;
    }

    @observable data: T;

    @observable children: Node[] = [];

    is_folder(): this is Node<FolderData> {
      return this.data.type === "folder";
    }

    is_outline(): this is Node<OutlineData> {
      return this.data.type === "outline";
    }
  }

  // state

  class Office {
    root = Node.createRoot();

    find_by_id(id: string, root: Node = this.root): Node | null {
      if (root.id === id) return root;
      for (const child of root.children) {
        const parent = this.find_by_id(id, child);
        if (parent) return parent;
      }
      return null;
    }

    find_parent(node: Node, root: Node = this.root): Node | null {
      if (root.children.includes(node)) return root;
      for (const child of root.children) {
        const parent = this.find_parent(node, child);
        if (parent) return parent;
      }
      return null;
    }

    find_nearest_node(node: Node, directionOffset: -1 | 1): Node | null {
      const parent = this.find_parent(node);
      if (!parent) return null;
      const index = parent.children.indexOf(node);
      if (directionOffset < 0) {
        // going up
        if (index === 0) return parent;
        // find bottom child of previous sibling
        let nearest = parent.children[index - 1];
        while (nearest.children.length) {
          nearest = nearest.children[nearest.children.length - 1];
        }
        return nearest;
      } else {
        // going down
        if (node.children.length > 0) return node.children[0];
        // escape the current subtree
        let deadEnd = node;
        let deadEndParent = parent;
        let deadEndIndex = index;
        while (deadEndIndex === deadEndParent.children.length - 1) {
          deadEnd = deadEndParent;
          const parent = office.find_parent(deadEnd);
          if (!parent) return null;
          deadEndParent = parent;
          deadEndIndex = deadEndParent.children.indexOf(deadEnd);
        }
        return deadEndParent.children[deadEndIndex + 1];
      }
    }

    create_folder(parent: Node<FolderData>) {
      const node = Node.create("folder");
      parent.children.push(node);
      return node;
    }

    create_outline(
      parent: Node<FolderData | OutlineData>,
      index = parent.children.length
    ) {
      const node = Node.create("outline");
      parent.children.splice(index, 0, node);
      return node;
    }

    delete_node(node: Node) {
      const parent = this.find_parent(node);
      parent?.children.splice(parent.children.indexOf(node), 1);
    }
  }

  const office = new Office();

  // UI

  class UI {
    @observable node: Node = office.root;
    @observable focus: string | null = null;
  }

  const ui = new UI();

  const App = observer(() => (
    <Layout node={ui.node}>
      <View node={ui.node} />
    </Layout>
  ));

  const untitled = "Untitled";

  const Layout = observer(
    ({ node, children }: { node: Node; children: React.ReactNode }) => {
      const name = node.data.name || untitled;
      const titleSeparator = " - ";
      useEffect(() => {
        document.title =
          name + titleSeparator + document.title.split(titleSeparator).pop()!;
      }, [name]);
      return (
        <div className="Layout">
          <div>
            <Logo />
            <Overview />
            <KeyboardShortcuts />
          </div>
          <div>
            <h1>
              <NodeName node={node} editable />
            </h1>
            {children}
          </div>
        </div>
      );
    }
  );

  const Logo = () => <div className="Logo">Office</div>;

  const KeyboardShortcuts = observer(() => (
    <table className="KeyboardShortcuts">
      <tbody>
        {ui.node.is_outline() && (
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

  const Overview = observer(() => (
    <div>
      <OverviewItem node={office.root} />
      <OverviewItems node={office.root} />
    </div>
  ));

  const OverviewItems = observer(({ node }: { node: Node }) => (
    <ul className="OverviewItems">
      {node.children.map((child) => (
        <li key={child.id}>
          <OverviewItem node={child} />
          {child.is_folder() && <OverviewItems node={child} />}
        </li>
      ))}
    </ul>
  ));

  const OverviewItem = observer(({ node }: { node: Node }) => (
    <a
      href={"#/" + node.id}
      className={classNames("OverviewItem", { active: node === ui.node })}
    >
      <NodeIcon type={node.data.type} />
      <NodeName node={node} />
    </a>
  ));

  const NodeName = observer(
    ({ node, editable = false }: { node: Node; editable?: boolean }) =>
      editable ? (
        <input
          type="text"
          className={classNames("NodeName", { untitled: !node.data.name })}
          value={node.data.name}
          placeholder={untitled}
          onChange={(event) => (node.data.name = event.target.value)}
        />
      ) : (
        <span className={classNames("NodeName", { untitled: !node.data.name })}>
          {node.data.name || untitled}
        </span>
      )
  );

  const NodeIcon = observer(({ type }: { type: Data["type"] }) => (
    <span className="NodeIcon">
      <span className={type} />
    </span>
  ));

  const View = observer(({ node }: { node: Node }) => {
    if (node.is_folder()) return <FolderView node={node} />;
    if (node.is_outline()) return <OutlineView node={node} />;
    return null;
  });

  const Toolbar = observer(({ children }: { children: React.ReactNode }) => (
    <div className="Toolbar">{children}</div>
  ));

  const FolderView = observer(({ node }: { node: Node<FolderData> }) => (
    <>
      <Toolbar>
        <button onClick={() => office.create_folder(node)}>New Folder</button>
        <button onClick={() => office.create_outline(node)}>New Outline</button>
      </Toolbar>
      {node.children.map((child) => (
        <FolderViewItem key={child.id} node={child} />
      ))}
      {node.children.length === 0 && <EmptyPlaceholder />}
    </>
  ));

  const EmptyPlaceholder = () => (
    <span className="EmptyPlaceholder">(empty)</span>
  );

  const FolderViewItem = observer(({ node }: { node: Node }) => (
    <a href={"#/" + node.id} className="FolderViewItem">
      <NodeIcon type={node.data.type} />
      <NodeName node={node} />
    </a>
  ));

  const OutlineView = observer(({ node }: { node: Node<OutlineData> }) => {
    if (!node.children.length) {
      const child = office.create_outline(node);
      setTimeout(() => (ui.focus = child.id + ":name"));
    }
    return <OutlineViewItems nodes={node.children as Node<OutlineData>[]} />;
  });

  const OutlineViewItems = observer(
    ({ nodes }: { nodes: Node<OutlineData>[] }) => (
      <ul className="OutlineViewItems">
        {nodes.map((node) => (
          <OutlineViewItem key={node.id} node={node} />
        ))}
      </ul>
    )
  );

  const OutlineViewItem = observer(({ node }: { node: Node<OutlineData> }) => {
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    useLayoutEffect(() => {
      const el = textAreaRef.current;
      if (el) {
        el.style.height = "0";
        el.style.height = el.scrollHeight + "px";
      }
    }, [textAreaRef, node.data.paragraph, ui.focus]);

    return (
      <li key={node.id} className="OutlineViewItem">
        <div className="bullet" />
        <input
          type="text"
          className="name"
          value={node.data.name}
          onChange={(event) => (node.data.name = event.target.value)}
          onKeyDown={(event) => {
            if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
              ui.focus = node.id + ":paragraph";
            } else if (event.key === "Enter") {
              const parent = office.find_parent(node) as Node<OutlineData>;
              const offset = event.shiftKey ? 0 : 1;
              const sibling = office.create_outline(
                parent,
                parent.children.indexOf(node) + offset
              );
              ui.focus = sibling.id + ":name";
            } else if (
              (event.key === "Backspace" || event.key === "Delete") &&
              !node.data.name
            ) {
              const directionOffset = event.key === "Backspace" ? -1 : 1;
              const nearest = office.find_nearest_node(node, directionOffset);
              if (nearest?.is_outline()) {
                ui.focus = nearest.id + ":name";
              }
              office.delete_node(node);
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              const directionOffset = event.key === "ArrowUp" ? -1 : 1;
              const nearest = office.find_nearest_node(node, directionOffset);
              if (nearest?.is_outline()) {
                ui.focus = nearest.id + ":name";
              }
            } else if (event.shiftKey && event.key === "Tab") {
              const parent = office.find_parent(node);
              if (parent && parent.is_outline()) {
                const grandParent = office.find_parent(parent);
                if (grandParent && grandParent.is_outline()) {
                  parent.children.splice(parent.children.indexOf(node), 1);
                  grandParent.children.splice(
                    grandParent.children.indexOf(parent) + 1,
                    0,
                    node
                  );
                }
              }
            } else if (event.key === "Tab") {
              const parent = office.find_parent(node);
              if (parent && parent.is_outline()) {
                const currentOffset = parent.children.indexOf(node);
                if (currentOffset > 0) {
                  const previousSibling = parent.children[currentOffset - 1];
                  parent.children.splice(currentOffset, 1);
                  previousSibling.children.push(node);
                }
              }
            } else {
              return;
            }
            event.preventDefault();
          }}
          data-focus={node.id + ":name"}
          onFocus={() => (ui.focus = node.id + ":name")}
          autoFocus={ui.focus === node.id + ":name"}
        />
        {(node.data.paragraph || ui.focus === node.id + ":paragraph") && (
          <textarea
            ref={textAreaRef}
            className="paragraph"
            value={node.data.paragraph}
            onChange={(event) => (node.data.paragraph = event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
                ui.focus = node.id + ":name";
              } else {
                return;
              }
              event.preventDefault();
            }}
            data-focus={node.id + ":paragraph"}
            onFocus={() => (ui.focus = node.id + ":paragraph")}
            autoFocus={ui.focus === node.id + ":paragraph"}
          />
        )}
        <OutlineViewItems nodes={node.children as Node<OutlineData>[]} />
      </li>
    );
  });

  render(<App />, document.getElementById("app"));

  function readUrlHash() {
    const node = office.find_by_id(document.location.hash.split("/")[1]);
    ui.node = node ?? office.root;
  }

  function writeUrlHash() {
    document.location.hash = "#/" + ui.node.id;
  }

  readUrlHash();
  window.addEventListener("hashchange", readUrlHash);
  autorun(writeUrlHash);

  function focusFocus() {
    const el = document.querySelector<HTMLElement>(
      `[data-focus="${ui.focus}"]`
    );
    if (el) el.focus();
  }

  autorun(focusFocus);
}
