import "minireset.css";
import { observable, autorun } from "mobx";
import { observer } from "mobx-react";
import "mobx-react-lite/batchingForReactDom";
import React from "react";
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

    create_folder(parent: Node<FolderData>) {
      const node = Node.create("folder");
      parent.children.push(node);
      return node;
    }

    create_outline(parent: Node<FolderData>) {
      const node = Node.create("outline");
      parent.children.push(node);
      return node;
    }
  }

  const office = new Office();

  // UI

  class UI {
    @observable node: Node = office.root;
  }

  const ui = new UI();

  const App = observer(() => <View node={ui.node} />);

  const Layout = ({
    node,
    children,
  }: {
    node: Node;
    children: React.ReactNode;
  }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "15em auto",
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
        <Overview />
      </div>
      <div
        style={{
          padding: "5vmin",
        }}
      >
        <h1 style={{ fontSize: "2em" }}>
          <NodeName node={node} />
        </h1>
        {children}
      </div>
    </div>
  );

  const Overview = ({ node }: { node?: Node }) =>
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
            <OverviewItem node={child} />
            <Overview node={child} />
          </li>
        ))}
      </ul>
    ) : (
      <>
        <OverviewItem node={office.root} />
        <Overview node={office.root} />
      </>
    );

  const OverviewItem = ({ node }: { node: Node }) => (
    <a href={"#/" + node.id} className="clean-link">
      <NodeName node={node} />
    </a>
  );

  const NodeName = ({ node }: { node: Node }) => (
    <>{node.data.name || <em>Untitled</em>}</>
  );

  const View = ({ node }: { node: Node }) => {
    if (node.is_folder()) return <FolderView node={node} />;
    if (node.is_outline()) return <OutlineView node={node} />;
    return null;
  };

  const Toolbar = ({ children }: { children: React.ReactNode }) => (
    <div className="Toolbar">{children}</div>
  );

  const FolderView = observer(({ node }: { node: Node<FolderData> }) => {
    return (
      <Layout node={node}>
        <Toolbar>
          <button onClick={() => office.create_folder(node)}>New Folder</button>
          <button onClick={() => office.create_outline(node)}>
            New Outline
          </button>
        </Toolbar>
        {node.children.map((child) => (
          <FolderViewItem key={child.id} node={child} />
        ))}
      </Layout>
    );
  });

  const FolderViewItem = observer(({ node }: { node: Node }) => (
    <a href={"#/" + node.id} className="FolderViewItem">
      <NodeName node={node} />
    </a>
  ));

  const OutlineView = () => <div>{/* TODO */}</div>;

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
}
