export type NodeId = string & { _type: NodeId };
export type NodeKind = "folder" | "file" | "text" | "outline";

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
