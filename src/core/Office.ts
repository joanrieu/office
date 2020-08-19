import { observable } from "mobx";
import { v1 } from "uuid";
import { Command, Event, EventMeta, NodeId, Query } from "./types";

export class Office {
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
