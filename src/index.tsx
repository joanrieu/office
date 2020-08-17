import classNames from "classnames";
import "minireset.css";
import { autorun, observable, observe, when } from "mobx";
import { observer } from "mobx-react";
import "mobx-react-lite/batchingForReactDom";
import PouchDB from "pouchdb";
import React, { useEffect, useLayoutEffect, useRef } from "react";
import { render } from "react-dom";
import "uuid";
import { v1 } from "uuid";
import "./style.scss";

namespace Office {
  type NodeId = string & { _type: NodeId };
  type NodeKind = "folder" | "file" | "text" | "outline";

  export type Command =
    | {
        type: "CreateNode";
        node: NodeId;
        kind: NodeKind;
      }
    | {
        type: "MoveNode";
        node: NodeId;
        parent: NodeId;
        next?: NodeId;
      }
    | {
        type: "EditText";
        node: NodeId;
        field: string;
        text: string;
      }
    | {
        type: "DeleteNode";
        node: NodeId;
      };

  export interface EventMeta {
    id: string;
    pid?: string;
  }

  export type Event = EventMeta &
    (
      | {
          type: "NodeCreated";
          node: NodeId;
          kind: NodeKind;
        }
      | {
          type: "NodeMoved";
          node: NodeId;
          parent: NodeId;
          next?: NodeId;
        }
      | {
          type: "TextEdited";
          node: NodeId;
          field: string;
          text: string;
        }
      | {
          type: "NodeDeleted";
          node: NodeId;
        }
    );

  export type Query =
    | {
        type: "GetRootNode";
        response?: {
          node: NodeId;
        };
      }
    | {
        type: "Exists";
        node: NodeId;
        response?: {
          exists: boolean;
        };
      }
    | {
        type: "GetChildNodes";
        node: NodeId;
        response?: {
          nodes: NodeId[];
        };
      }
    | {
        type: "GetParentNode";
        node: NodeId;
        response?: {
          parent: NodeId;
        };
      }
    | {
        type: "GetKind";
        node: NodeId;
        response?: {
          kind: NodeKind;
        };
      }
    | {
        type: "GetText";
        node: NodeId;
        field: string;
        response?: {
          text: string;
        };
      };

  class Office {
    command(command: Command) {
      switch (command.type) {
        case "CreateNode":
          this.dispatch({
            ...this.newMetadata(),
            type: "NodeCreated",
            node: command.node,
            kind: command.kind,
          });
          break;
        case "MoveNode":
          this.dispatch({
            ...this.newMetadata(),
            type: "NodeMoved",
            node: command.node,
            parent: command.parent,
            next: command.next,
          });
          break;
        case "EditText":
          this.dispatch({
            ...this.newMetadata(),
            type: "TextEdited",
            node: command.node,
            field: command.field,
            text: command.text,
          });
          break;
        case "DeleteNode":
          this.dispatch({
            ...this.newMetadata(),
            type: "NodeDeleted",
            node: command.node,
          });
          break;
      }
    }

    newMetadata(): EventMeta {
      return {
        id: this.newEventId(),
        pid: this.eventsByDate.pop()?.id,
      };
    }

    dispatch(event: Event) {
      this.eventsById[event.id] = event;
    }

    newEventId() {
      return new Date().toISOString() + "+" + v1();
    }

    @observable readonly eventsById: Record<string, Event> = {};

    get eventsByDate(): Event[] {
      return Object.keys(this.eventsById)
        .sort()
        .map((id) => this.eventsById[id]);
    }

    query(query: Query) {
      switch (query.type) {
        case "GetRootNode":
          for (const event of this.eventsByDate) {
            if (event.type === "NodeCreated") {
              query.response = {
                node: event.node,
              };
              break;
            }
          }
          break;
        case "Exists":
          query.response = {
            exists: false,
          };
          for (const event of this.eventsByDate.slice().reverse()) {
            if (event.type === "NodeCreated" && event.node === query.node) {
              query.response = {
                exists: true,
              };
              break;
            } else if (
              event.type === "NodeDeleted" &&
              event.node === query.node
            ) {
              break;
            }
          }
          break;
        case "GetChildNodes":
          query.response = {
            nodes: this.eventsByDate.reduce((children, event) => {
              switch (event.type) {
                case "NodeMoved":
                  if (event.parent === query.node) {
                    const index = children.indexOf(event.next!);
                    if (index < 0) {
                      children.push(event.node);
                    } else {
                      children.splice(index, 0, event.node);
                    }
                  } else if (children.includes(event.node)) {
                    children.splice(children.indexOf(event.node), 1);
                  }
                  break;
                case "NodeDeleted":
                  if (children.includes(event.node)) {
                    children.splice(children.indexOf(event.node), 1);
                  }
                  break;
              }
              return children;
            }, [] as NodeId[]),
          };
          break;
        case "GetParentNode":
          for (const event of this.eventsByDate.slice().reverse()) {
            if (event.node === query.node && event.type === "NodeMoved") {
              query.response = {
                parent: event.parent,
              };
              break;
            }
          }
          break;
        case "GetKind":
          for (const event of this.eventsByDate.slice().reverse()) {
            if (event.node !== query.node) continue;
            if (event.type !== "NodeCreated") continue;
            query.response = {
              kind: event.kind,
            };
            break;
          }
          break;
        case "GetText":
          for (const event of this.eventsByDate.slice().reverse()) {
            if (
              event.type === "TextEdited" &&
              event.node === query.node &&
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
    constructor(readonly office: Office, readonly id: NodeId) {}

    static root(office: Office) {
      const query: Query = {
        type: "GetRootNode",
      };
      office.query(query);
      const node = query.response?.node;
      if (!node) return null;
      return new Node(office, node);
    }

    static newId() {
      return v1() as NodeId;
    }

    static createInitialEvents(office: Office) {
      const node = Node.create(office, "folder");
      node.name = "Drive";
    }

    static create(office: Office, kind: NodeKind, parent?: Node) {
      const id = this.newId();
      office.command({
        type: "CreateNode",
        node: id,
        kind,
      });
      if (parent) {
        office.command({
          type: "MoveNode",
          node: id,
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
        node: this.id,
        parent: node.parent!.id,
        next: node.id,
      });
    }

    moveAfter(node: Node) {
      office.command({
        type: "MoveNode",
        node: this.id,
        parent: node.parent!.id,
        next: node.nextSibling?.id,
      });
    }

    moveInside(node: Node) {
      office.command({
        type: "MoveNode",
        node: this.id,
        parent: node.id,
      });
    }

    delete() {
      this.office.command({
        type: "DeleteNode",
        node: this.id,
      });
    }

    get parent() {
      const query: Query = {
        type: "GetParentNode",
        node: this.id,
      };
      this.office.query(query);
      if (!query.response) return null;
      return new Node(this.office, query.response.parent);
    }

    get children() {
      const query: Query = {
        type: "GetChildNodes",
        node: this.id,
      };
      this.office.query(query);
      return query.response!.nodes.map((id) => new Node(this.office, id));
    }

    get firstChild(): Node | null {
      return this.children[0] ?? null;
    }

    get lastChild(): Node | null {
      const children = this.children;
      return children[children.length - 1] ?? null;
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
      const query: Query = {
        type: "Exists",
        node: this.id,
      };
      this.office.query(query);
      return query.response!.exists;
    }

    get kind() {
      const query: Query = {
        type: "GetKind",
        node: this.id,
      };
      this.office.query(query);
      return query.response!.kind;
    }

    get isFolder() {
      return this.kind === "folder";
    }

    get isFile() {
      return this.kind === "file";
    }

    get isOutline() {
      return this.kind === "outline";
    }

    get isText() {
      return this.kind === "text";
    }

    get nodeAbove() {
      return this.previousSibling?.nodeAtBottomOfSubtree ?? this.parent;
    }

    get nodeAtBottomOfSubtree(): Node {
      return this.lastChild?.nodeAtBottomOfSubtree ?? this;
    }

    get nodeBelow() {
      return this.firstChild ?? this.nodeBelowSubtree;
    }

    get nodeBelowSubtree(): Node | null {
      return this.nextSibling ?? this.parent?.nodeBelowSubtree ?? null;
    }

    get name() {
      const query: Query = {
        type: "GetText",
        node: this.id,
        field: "name",
      };
      this.office.query(query);
      return query.response?.text ?? "";
    }

    set name(name: string) {
      this.office.command({
        type: "EditText",
        node: this.id,
        field: "name",
        text: name,
      });
    }

    get note() {
      const query: Query = {
        type: "GetText",
        node: this.id,
        field: "note",
      };
      this.office.query(query);
      return query.response?.text ?? "";
    }

    set note(note: string) {
      this.office.command({
        type: "EditText",
        node: this.id,
        field: "note",
        text: note,
      });
    }

    get text() {
      const query: Query = {
        type: "GetText",
        node: this.id,
        field: "text",
      };
      this.office.query(query);
      return query.response?.text ?? "";
    }

    set text(text: string) {
      this.office.command({
        type: "EditText",
        node: this.id,
        field: "text",
        text,
      });
    }
  }

  class Sync {
    constructor(readonly office: Office) {
      this.init();
    }

    readonly events = this.office.eventsById;
    readonly localDb = new PouchDB<{ event: Event }>("events");
    remoteSync: PouchDB.Replication.Sync<{ event: Event }> | null = null;
    @observable isReady = false;
    @observable isRemoteConnected = false;

    async init() {
      await this.initLocalSync();
      this.isReady = true;
      await this.initRemoteSync();
    }

    async initLocalSync() {
      // local db -> memory (initial sync)
      await this.localDb
        .changes({ include_docs: true })
        .on("change", this.onChange.bind(this));

      // local db -> memory (live sync)
      this.localDb
        .changes({ since: "now", live: true, include_docs: true })
        .on("change", this.onChange.bind(this));

      // memory -> local db (live sync)
      observe(this.events, async (change) => {
        if (change.type === "add") {
          const event: Event = change.newValue;
          try {
            await this.localDb.put({ _id: event.id, event });
          } catch (error) {
            if (error.name !== "conflict") {
              throw error;
            }
          }
        }
      });

      // populate if empty
      if (this.office.eventsByDate.length === 0) {
        Node.createInitialEvents(this.office);
      }
    }

    async initRemoteSync() {
      if (this.remoteSync) this.remoteSync.cancel();
      this.remoteSync = this.localDb.sync(
        new PouchDB<{ event: Event }>("http://localhost:5984/events", {
          fetch: (...args) => {
            const res = fetch(...args);
            res.then(
              (res) => (this.isRemoteConnected = res.ok),
              () => (this.isRemoteConnected = false)
            );
            return res;
          },
        }),
        {
          live: true,
          retry: true,
          back_off_function: (last) =>
            Math.min(Math.max(5000, last * 2), 60000),
        }
      );
    }

    onChange(change: PouchDB.Core.ChangesResponseChange<{ event: Event }>) {
      const event = change.doc?.event;
      if (!event) return;
      this.events[event.id] = event;
    }
  }

  class UI {
    constructor(readonly office: Office) {}
    @observable node: Node | null = null;
    @observable focus: string | null = null;
  }

  const office = new Office();
  const sync = new Sync(office);
  const ui = new UI(office);

  const UNTITLED = "Untitled";
  const TITLE = document.title;

  function setWindowTitle() {
    const pieces = [TITLE];

    if (ui.node) {
      pieces.unshift(ui.node.name || UNTITLED);
    }

    document.title = pieces.join(" - ");
  }

  const App = observer(() => {
    return (
      <div className="App">
        <div>
          <Logo />
          <Overview />
          <div>
            <SyncStatus />
            {ui.node?.exists && <KeyboardShortcuts node={ui.node} />}
          </div>
        </div>
        {ui.node?.exists && (
          <div>
            <h1>
              <NodeName node={ui.node} editable />
            </h1>
            <Toolbar node={ui.node} />
            <View node={ui.node} />
          </div>
        )}
      </div>
    );
  });

  const Logo = () => <div className="Logo">Office</div>;

  const KeyboardShortcuts = observer(({ node }: { node: Node }) => (
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

  const SyncStatus = observer(() => {
    return (
      <div className="SyncStatus">
        {sync.isRemoteConnected ? (
          <span>Connected</span>
        ) : (
          <>
            <span>Not connected</span>
            <button onClick={() => sync.initRemoteSync()}>Reset sync</button>
          </>
        )}
      </div>
    );
  });

  const Overview = observer(() => {
    const root = Node.root(office);
    if (!root) return null;
    return (
      <div>
        <OverviewItem node={root} />
        <OverviewItems node={root} />
      </div>
    );
  });

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
      <NodeIcon kind={node.kind} />
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

  const NodeIcon = observer(({ kind }: { kind: NodeKind }) => (
    <span className="NodeIcon">
      <span className={kind} />
    </span>
  ));

  const View = observer(({ node }: { node: Node }) => {
    if (node.isFolder) return <FolderView node={node} />;
    if (node.isFile) return <FileView node={node} />;
    if (node.isOutline) return <OutlineView node={node} />;
    if (node.isText) return <TextView node={node} />;
    return null;
  });

  const Toolbar = observer(({ node }: { node: Node }) => (
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
            (ui.focus = Node.create(office, "outline", node).id + ":name")
          }
        >
          New Item
        </button>
      )}
    </div>
  ));

  const FolderView = observer(({ node }: { node: Node }) =>
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

  const EmptyPlaceholder = () => <span className="ui-muted">(empty)</span>;

  const FolderViewItem = observer(({ node }: { node: Node }) => (
    <div className="FolderViewItem">
      <a href={"#/" + node.id}>
        <NodeIcon kind={node.kind} />
        <NodeName node={node} />
      </a>
      <button onClick={() => node.delete()}>🗙</button>
    </div>
  ));

  const FileView = ({ node }: { node: Node }) => (
    <>
      {node.children.map((child) => (
        <View key={node.id} node={child} />
      ))}
    </>
  );

  const OutlineView = observer(({ node }: { node: Node }) => (
    <OutlineViewItems nodes={node.children} />
  ));

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
                const child = node.firstChild;
                if (child) {
                  empty.moveBefore(child);
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
        <OutlineViewItems nodes={node.children} />
      </li>
    );
  });

  const TextView = observer(({ node }: { node: Node }) =>
    node.id === ui.focus ? (
      <textarea
        className="TextView"
        data-focus={node.id + ":text"}
        defaultValue={node.text}
        onChange={(event) => (node.text = event.target.value)}
        autoFocus
        onBlur={() => ui.focus === node.id && (ui.focus = null)}
      />
    ) : node.text ? (
      <p
        data-focus={node.id + ":text"}
        onClick={() => (ui.focus = node.id)}
        onFocus={() => (ui.focus = node.id)}
        dangerouslySetInnerHTML={{ __html: markup(node.text) }}
      />
    ) : (
      <p
        data-focus={node.id + ":text"}
        onClick={() => (ui.focus = node.id)}
        onFocus={() => (ui.focus = node.id)}
      >
        <EmptyPlaceholder />
      </p>
    )
  );

  function markup(text: string) {
    const span = document.createElement("span");
    span.innerText = text;
    let html = span.innerHTML;
    html = html.replace(/(^|\s)\*\*([^\s])/g, "$1<strong>$2");
    html = html.replace(/([^\s])\*\*(\s|$)/g, "$1</strong>$2");
    html = html.replace(/(^|\s)\*([^\s])/g, "$1<em>$2");
    html = html.replace(/([^\s])\*(\s|$)/g, "$1</em>$2");
    return html;
  }

  function readUrlHash() {
    const id = document.location.hash.split("/")[1] as NodeId;
    if (id) {
      ui.node = new Node(office, id);
    } else {
      ui.node = Node.root(office);
    }
  }

  function writeUrlHash() {
    document.location.hash = "#/" + (ui.node?.id ?? "");
  }

  function focusFocus() {
    const el = document.querySelector<HTMLElement>(
      `[data-focus="${ui.focus}"]`
    );
    if (el) el.focus();
  }

  function initUi() {
    when(
      () => sync.isReady,
      () => {
        readUrlHash();
        window.addEventListener("hashchange", readUrlHash);
        autorun(writeUrlHash);
        autorun(setWindowTitle);
        autorun(focusFocus);
      }
    );

    render(<App />, document.getElementById("root"));
  }

  initUi();
}
