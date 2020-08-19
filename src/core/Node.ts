import { v1 } from "uuid";
import { Office } from "./Office";
import { NodeId, NodeKind, Query } from "./types";

export class Node {
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
    this.office.command({
      type: "MoveNode",
      node: this.id,
      parent: node.parent!.id,
      next: node.id,
    });
  }

  moveAfter(node: Node) {
    this.office.command({
      type: "MoveNode",
      node: this.id,
      parent: node.parent!.id,
      next: node.nextSibling?.id,
    });
  }

  moveInside(node: Node) {
    this.office.command({
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
