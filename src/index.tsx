import "minireset.css";
import { autorun, observable } from "mobx";
import { observer } from "mobx-react";
import "mobx-react-lite/batchingForReactDom";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
      const index = parent.children.indexOf(node) + directionOffset;
      if (index in parent.children) {
        return parent.children[index];
      } else {
        return this.find_nearest_node(parent, directionOffset);
      }
    }

    create_folder(parent: Node<FolderData>) {
      const node = Node.create("folder");
      parent.children.push(node);
      return node;
    }

    create_outline(parent: Node<FolderData | OutlineData>, index = 0) {
      const node = Node.create("outline");
      parent.children.splice(index, 0, node);
      return node;
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "15em auto",
            overflow: "auto",
          }}
        >
          <div
            className="ui-panel"
            style={{
              borderRightWidth: "1px",
            }}
          >
            <div
              style={{
                padding: "0.5em",
                opacity: 0.2,
                fontSize: "2em",
                fontWeight: "bold",
                letterSpacing: "0.3em",
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              Office
            </div>
            <Overview activeNode={node} />
          </div>
          <div
            style={{
              padding: "5vmin",
              overflow: "auto",
            }}
          >
            <h1 style={{ fontSize: "2em" }}>
              <NodeName node={node} editable />
            </h1>
            {children}
          </div>
        </div>
      );
    }
  );

  const Overview = observer(
    ({ node, activeNode }: { node?: Node; activeNode: Node }) =>
      node ? (
        <ul
          style={{
            borderLeft: "1px solid #bbb",
            marginLeft: ".5em",
            paddingLeft: ".5em",
          }}
        >
          {node.children.map((child) => (
            <li key={child.id}>
              <OverviewItem node={child} activeNode={activeNode} />
              {child.is_folder() && (
                <Overview node={child} activeNode={activeNode} />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <>
          <OverviewItem node={office.root} activeNode={activeNode} />
          <Overview node={office.root} activeNode={activeNode} />
        </>
      )
  );

  const OverviewItem = observer(
    ({ node, activeNode }: { node: Node; activeNode: Node }) => (
      <a
        href={"#/" + node.id}
        className={node === activeNode ? "OverviewItem active" : "OverviewItem"}
      >
        <NodeIcon node={node} />
        <NodeName node={node} />
      </a>
    )
  );

  const NodeName = observer(
    ({ node, editable = false }: { node: Node; editable?: boolean }) =>
      editable ? (
        <input
          type="text"
          className="clean-input"
          value={node.data.name}
          placeholder={untitled}
          onChange={(event) => {
            node.data.name = event.target.value;
          }}
          style={{
            margin: "0.2em 0",
            fontStyle: node.data.name ? undefined : "italic",
          }}
        />
      ) : (
        <span
          style={{
            fontStyle: node.data.name ? undefined : "italic",
          }}
        >
          {node.data.name || untitled}
        </span>
      )
  );

  const NodeIcon = observer(
    ({ node, large = false }: { node: Node; large?: boolean }) => (
      <span
        style={{
          placeSelf: "center",
          lineHeight: 0,
          marginTop: "-0.1em",
          fontSize: large ? "150%" : undefined,
        }}
      >
        <span
          style={{
            fontSize: node.is_folder() ? "100%" : "125%",
          }}
        >
          {node.is_folder() ? "🖿" : "🗎"}
        </span>
      </span>
    )
  );

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
      {node.children.length === 0 && (
        <span
          className="ui-font"
          style={{
            color: "#bbb",
          }}
        >
          (empty)
        </span>
      )}
    </>
  ));

  const FolderViewItem = observer(({ node }: { node: Node }) => (
    <a href={"#/" + node.id} className="FolderViewItem">
      <NodeIcon node={node} large />
      <NodeName node={node} />
    </a>
  ));

  const OutlineView = observer(({ node }: { node: Node<OutlineData> }) => {
    if (!node.children.length) office.create_outline(node);
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

  const OutlineViewItem = observer(
    ({
      node,
      moveFocus,
    }: {
      node: Node<OutlineData>;
      moveFocus: (offset: -1 | 1) => void;
    }) => {
      const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
      useLayoutEffect(() => {
        const el = textAreaRef.current;
        if (el) {
          el.style.height = "0";
          el.style.height = el.scrollHeight + "px";
        }
      }, [textAreaRef, node.data.paragraph]);

      return (
        <li key={node.id} className="item">
          <div className="bullet" />
          <input
            type="text"
            className="name clean-input"
            value={node.data.name}
            onChange={(event) => (node.data.name = event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (event.ctrlKey && event.shiftKey) {
                  ui.focus = node.id + ":paragraph";
                } else {
                  const parent = office.find_parent(node) as Node<OutlineData>;
                  const offset = event.shiftKey ? 0 : 1;
                  const sibling = office.create_outline(
                    parent,
                    parent.children.indexOf(node) + offset
                  );
                  ui.focus = sibling.id + ":name";
                }
              } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                const directionOffset = event.key === "ArrowUp" ? -1 : 1;
                const nearest = office.find_nearest_node(node, directionOffset);
                if (nearest?.is_outline()) {
                  ui.focus = nearest.id + ":name";
                }
              }
            }}
            data-focus={node.id + ":name"}
            onFocus={() => (ui.focus = node.id + ":name")}
            autoFocus={ui.focus === node.id + ":name"}
          />
          <textarea
            ref={textAreaRef}
            className="paragraph clean-input"
            value={node.data.paragraph}
            onChange={(event) => (node.data.paragraph = event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
                ui.focus = node.id + ":name";
              }
            }}
            data-focus={node.id + ":paragraph"}
            onFocus={() => (ui.focus = node.id + ":paragraph")}
            autoFocus={ui.focus === node.id + ":paragraph"}
          />
          <OutlineViewItems nodes={node.children as Node<OutlineData>[]} />
        </li>
      );
    }
  );

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

  ui.node = office.create_outline(office.root);
}
