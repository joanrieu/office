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
  type NodeId = string & { _type: NodeId };

  export type Command =
    | {
        type: "CreateFolder";
        id: NodeId;
      }
    | {
        type: "CreateOutline";
        id: NodeId;
      }
    | {
        type: "MoveNode";
        id: NodeId;
        parent: NodeId;
        next?: NodeId;
      }
    | {
        type: "EditText";
        id: NodeId;
        field: string;
        text: string;
      };

  export type Event =
    | {
        type: "FolderCreated";
        id: NodeId;
      }
    | {
        type: "OutlineCreated";
        id: NodeId;
      }
    | {
        type: "NodeMoved";
        id: NodeId;
        parent: NodeId;
        next?: NodeId;
      }
    | {
        type: "TextEdited";
        id: NodeId;
        field: string;
        text: string;
      };

  export type Query =
    | {
        type: "GetRootNode";
        response?: {
          node: NodeId;
        };
      }
    | {
        type: "GetChildNodes";
        id: NodeId;
        response?: {
          nodes: NodeId[];
        };
      }
    | {
        type: "GetParentNode";
        id: NodeId;
        response?: {
          parent: NodeId;
        };
      }
    | {
        type: "GetType";
        id: NodeId;
        response?: {
          type: "outline" | "folder";
        };
      }
    | {
        type: "GetText";
        id: NodeId;
        field: string;
        response?: {
          text: string;
        };
      };

  class Office {
    command(command: Command) {
      switch (command.type) {
        case "CreateFolder":
          this.events.push({
            type: "FolderCreated",
            id: command.id,
          });
          break;
        case "CreateOutline":
          this.events.push({
            type: "OutlineCreated",
            id: command.id,
          });
          break;
        case "MoveNode":
          this.events.push({
            type: "NodeMoved",
            id: command.id,
            parent: command.parent,
            next: command.next,
          });
          break;
        case "EditText":
          this.events.push({
            type: "TextEdited",
            id: command.id,
            field: command.field,
            text: command.text,
          });
          break;
      }
    }

    @observable private events: Event[] = [
      {
        type: "FolderCreated",
        id: Node.newId(),
      },
    ];

    query(query: Query) {
      switch (query.type) {
        case "GetRootNode":
          for (const event of this.events) {
            if (event.type === "FolderCreated") {
              query.response = {
                node: event.id,
              };
              break;
            }
          }
          break;
        case "GetChildNodes":
          query.response = {
            nodes: this.events.reduce((children, event) => {
              switch (event.type) {
                case "NodeMoved":
                  if (event.parent === query.id) {
                    const index = children.indexOf(event.next!);
                    if (index < 0) {
                      children.push(event.id);
                    } else {
                      children.splice(index, 0, event.id);
                    }
                  } else if (children.includes(event.id)) {
                    children.splice(children.indexOf(event.id), 1);
                  }
                  break;
              }
              return children;
            }, [] as NodeId[]),
          };
          break;
        case "GetParentNode":
          for (const event of this.events.slice().reverse()) {
            if (event.id === query.id && event.type === "NodeMoved") {
              query.response = {
                parent: event.parent,
              };
              break;
            }
          }
          break;
        case "GetType":
          for (const event of this.events) {
            if (event.id !== query.id) continue;
            if (event.type === "FolderCreated") {
              query.response = {
                type: "folder",
              };
              break;
            } else if (event.type === "OutlineCreated") {
              query.response = {
                type: "outline",
              };
              break;
            }
          }
          break;
        case "GetText":
          for (const event of this.events.slice().reverse()) {
            if (
              event.type === "TextEdited" &&
              event.id === query.id &&
              event.field === query.field
            ) {
              query.response = {
                text: event.text,
              };
              break;
            }
          }
      }
    }
  }

  class Node {
    private constructor(readonly office: Office, readonly id: NodeId) {}

    static root(office: Office) {
      const query: Query = {
        type: "GetRootNode",
      };
      office.query(query);
      return new Node(office, query.response!.node);
    }

    static newId() {
      return v1() as NodeId;
    }

    static create(office: Office, type: Node["type"], parent?: Node) {
      const id = this.newId();
      switch (type) {
        case "folder":
          office.command({
            type: "CreateFolder",
            id,
          });
          break;
        case "outline":
          office.command({
            type: "CreateOutline",
            id,
          });
          break;
        default:
          throw new Error("Cannot create node of type: " + type);
      }
      if (parent) {
        office.command({
          type: "MoveNode",
          id,
          parent: parent.id,
        });
      }
      return new Node(office, id);
    }

    static get(office: Office, id: NodeId) {
      const node = new Node(office, id);
      if (!node.exists) return null;
      return node;
    }

    moveBefore(node: Node) {
      office.command({
        type: "MoveNode",
        id: this.id,
        parent: node.parent!.id,
        next: node.id,
      });
    }

    moveAfter(node: Node) {
      office.command({
        type: "MoveNode",
        id: this.id,
        parent: node.parent!.id,
        next: node.nextSibling?.id,
      });
    }

    moveInside(node: Node) {
      office.command({
        type: "MoveNode",
        id: this.id,
        parent: node.id,
      });
    }

    delete() {
      throw new Error("Node.delete() not implemented");
    }

    get parent() {
      const query: Query = {
        type: "GetParentNode",
        id: this.id,
      };
      this.office.query(query);
      if (!query.response) return null;
      return new Node(this.office, query.response.parent);
    }

    get children() {
      const query: Query = {
        type: "GetChildNodes",
        id: this.id,
      };
      this.office.query(query);
      return query.response!.nodes.map((id) => new Node(this.office, id));
    }

    get siblings() {
      const parent = this.parent;
      if (parent) {
        return parent.children;
      } else {
        return [this];
      }
    }

    get siblingIndex() {
      return this.siblings.findIndex((node) => node.id === this.id);
    }

    get previousSibling(): Node | null {
      return this.siblings[this.siblingIndex - 1] ?? null;
    }

    get nextSibling(): Node | null {
      return this.siblings[this.siblingIndex + 1] ?? null;
    }

    get exists() {
      try {
        this.type;
        return true;
      } catch (err) {
        return false;
      }
    }

    get type() {
      const query: Query = {
        type: "GetType",
        id: this.id,
      };
      this.office.query(query);
      return query.response!.type;
    }

    get isFolder() {
      return this.type === "folder";
    }

    get isOutline() {
      return this.type === "outline";
    }

    get nodeAbove() {
      const parent = this.parent;
      if (!parent) return null;
      const siblings = parent.children;
      const index = siblings.findIndex((node) => node.id === this.id);
      if (index === 0) return parent;
      return siblings[index - 1].nodeAtBottomOfSubtree;
    }

    get nodeAtBottomOfSubtree(): Node {
      const children = this.children;
      if (children.length === 0) return this;
      return children[children.length - 1].nodeAtBottomOfSubtree;
    }

    get nodeBelow() {
      const children = this.children;
      if (this.children.length > 0) return children[0];
      return this.nodeBelowSubtree;
    }

    get nodeBelowSubtree(): Node | null {
      const parent = this.parent;
      if (!parent) return null;
      const siblings = parent.children;
      const index = siblings.findIndex((node) => node.id === this.id);
      if (index < siblings.length - 1) return siblings[index + 1];
      return parent.nodeBelowSubtree;
    }

    get name() {
      const query: Query = {
        type: "GetText",
        id: this.id,
        field: "name",
      };
      this.office.query(query);
      return query.response?.text ?? "";
    }

    set name(name: string) {
      this.office.command({
        type: "EditText",
        id: this.id,
        field: "name",
        text: name,
      });
    }

    get note() {
      const query: Query = {
        type: "GetText",
        id: this.id,
        field: "note",
      };
      this.office.query(query);
      return query.response?.text ?? "";
    }

    set note(note: string) {
      this.office.command({
        type: "EditText",
        id: this.id,
        field: "note",
        text: note,
      });
    }
  }

  const office = new Office();
  class UI {
    @observable node: Node = Node.root(office);
    @observable focus: string | null = null;
  }

  const ui = new UI();

  const App = observer(() => (
    <Layout node={ui.node}>
      <View node={ui.node} />
    </Layout>
  ));

  const UNTITLED = "Untitled";

  const Layout = observer(
    ({ node, children }: { node: Node; children: React.ReactNode }) => {
      const name = node.name || UNTITLED;
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
            <div>
              {/* <SyncStatus /> */}
              <KeyboardShortcuts />
            </div>
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
        {ui.node.isOutline && (
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

  // const SyncStatus = observer(() =>
  //   sync.syncing ? (
  //     <div className="ui-muted">Syncing…</div>
  //   ) : (
  //     <div className="ui-muted">
  //       Last sync:{" "}
  //       {new Intl.DateTimeFormat(undefined, {
  //         hour: "numeric",
  //         minute: "numeric",
  //       }).format(sync.lastSyncDate)}
  //     </div>
  //   )
  // );

  const Overview = observer(() => (
    <div>
      <OverviewItem node={Node.root(office)} />
      <OverviewItems node={Node.root(office)} />
    </div>
  ));

  const OverviewItems = observer(({ node }: { node: Node }) => (
    <ul className="OverviewItems">
      {node.children.map((child) => (
        <li key={child.id}>
          <OverviewItem node={child} />
          {child.isFolder && <OverviewItems node={child} />}
        </li>
      ))}
    </ul>
  ));

  const OverviewItem = observer(({ node }: { node: Node }) => (
    <a
      href={"#/" + node.id}
      className={classNames("OverviewItem", { active: node === ui.node })}
    >
      <NodeIcon type={node.type} />
      <NodeName node={node} />
    </a>
  ));

  const NodeName = observer(
    ({ node, editable = false }: { node: Node; editable?: boolean }) =>
      editable ? (
        <input
          type="text"
          className={classNames("NodeName", { untitled: !node.name })}
          value={node.name}
          placeholder={UNTITLED}
          onChange={(event) => (node.name = event.target.value)}
        />
      ) : (
        <span className={classNames("NodeName", { untitled: !node.name })}>
          {node.name || UNTITLED}
        </span>
      )
  );

  const NodeIcon = observer(({ type }: { type: Node["type"] }) => (
    <span className="NodeIcon">
      <span className={type} />
    </span>
  ));

  const View = observer(({ node }: { node: Node }) => {
    if (node.isFolder) return <FolderView node={node} />;
    if (node.isOutline) return <OutlineView node={node} />;
    return null;
  });

  const Toolbar = observer(({ children }: { children: React.ReactNode }) => (
    <div className="Toolbar">{children}</div>
  ));

  const FolderView = observer(({ node }: { node: Node }) => (
    <>
      <Toolbar>
        <button onClick={() => Node.create(office, "folder", node)}>
          New Folder
        </button>
        <button onClick={() => Node.create(office, "outline", node)}>
          New Outline
        </button>
      </Toolbar>
      {node.children.map((child) => (
        <FolderViewItem key={child.id} node={child} />
      ))}
      {node.children.length === 0 && <EmptyPlaceholder />}
    </>
  ));

  const EmptyPlaceholder = () => <span className="ui-muted">(empty)</span>;

  const FolderViewItem = observer(({ node }: { node: Node }) => (
    <a href={"#/" + node.id} className="FolderViewItem">
      <NodeIcon type={node.type} />
      <NodeName node={node} />
    </a>
  ));

  const OutlineView = observer(({ node }: { node: Node }) => {
    if (!node.children.length) {
      const child = Node.create(office, "outline", node);
      setTimeout(() => (ui.focus = child.id + ":name"));
    }
    return <OutlineViewItems nodes={node.children} />;
  });

  const OutlineViewItems = observer(({ nodes }: { nodes: Node[] }) => (
    <ul className="OutlineViewItems">
      {nodes.map((node) => (
        <OutlineViewItem key={node.id} node={node} />
      ))}
    </ul>
  ));

  const OutlineViewItem = observer(({ node }: { node: Node }) => {
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    useLayoutEffect(() => {
      const el = textAreaRef.current;
      if (el) {
        el.style.height = "0";
        el.style.height = el.scrollHeight + "px";
      }
    }, [textAreaRef, node.note, ui.focus]);

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
              ui.focus = node.id + ":note";
            } else if (event.key === "Enter") {
              const empty = Node.create(office, "outline");
              if (event.shiftKey) {
                empty.moveBefore(node);
              } else {
                const below = node.nodeBelow;
                if (below) {
                  empty.moveBefore(below);
                } else {
                  empty.moveAfter(node);
                }
              }
              ui.focus = empty.id + ":name";
            } else if (
              (event.key === "Backspace" || event.key === "Delete") &&
              !node.name
            ) {
              const nearest =
                event.key === "Backspace" ? node.nodeAbove : node.nodeBelow;
              if (nearest?.isOutline) {
                ui.focus = nearest.id + ":name";
              }
              node.delete();
            } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              const nearest =
                event.key === "ArrowUp" ? node.nodeAbove : node.nodeBelow;
              if (nearest?.isOutline) {
                ui.focus = nearest.id + ":name";
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
          onFocus={() => (ui.focus = node.id + ":name")}
          autoFocus={ui.focus === node.id + ":name"}
        />
        {(node.note || ui.focus === node.id + ":note") && (
          <textarea
            ref={textAreaRef}
            className="note"
            value={node.note}
            onChange={(event) => (node.note = event.target.value)}
            onKeyDown={(event) => {
              if (event.ctrlKey && event.shiftKey && event.key === "Enter") {
                ui.focus = node.id + ":name";
              } else {
                return;
              }
              event.preventDefault();
            }}
            data-focus={node.id + ":note"}
            onFocus={() => (ui.focus = node.id + ":note")}
            autoFocus={ui.focus === node.id + ":note"}
          />
        )}
        <OutlineViewItems nodes={node.children as Node[]} />
      </li>
    );
  });

  function readUrlHash() {
    const id = document.location.hash.split("/")[1] as NodeId;
    const node = Node.get(office, id);
    ui.node = node ?? Node.root(office);
  }

  function writeUrlHash() {
    document.location.hash = "#/" + ui.node.id;
  }

  function focusFocus() {
    const el = document.querySelector<HTMLElement>(
      `[data-focus="${ui.focus}"]`
    );
    if (el) el.focus();
  }

  function initUi() {
    readUrlHash();
    window.addEventListener("hashchange", readUrlHash);
    autorun(writeUrlHash);

    autorun(focusFocus);

    render(<App />, document.getElementById("app"));
  }

  initUi();
}
