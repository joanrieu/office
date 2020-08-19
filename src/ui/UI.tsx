import { autorun, observable, when } from "mobx";
import React from "react";
import { render } from "react-dom";
import { Node } from "../core/Node";
import { Office } from "../core/Office";
import { Sync } from "../core/Sync";
import { NodeId } from "../core/types";
import { App } from "./app/App";
import { ActiveNodeContext } from "./context/useActiveNode";
import { FocusContext } from "./context/useFocus";
import { OfficeContext } from "./context/useOffice";
import { SyncContext } from "./context/useSync";

export const APP_TITLE = document.title;
export const UNTITLED = "Untitled";

export class UI {
  @observable node: Node | null = null;
  @observable focus: string = "";

  constructor(readonly office: Office, readonly sync: Sync) {
    when(
      () => sync.isReady,
      () => {
        this.readUrlHash();
        window.addEventListener("hashchange", this.readUrlHash.bind(this));
        autorun(this.writeUrlHash.bind(this));
        autorun(this.setWindowTitle.bind(this));
        autorun(this.focusFocus.bind(this));
      }
    );
    autorun(this.render.bind(this));
  }

  setWindowTitle() {
    const pieces = [APP_TITLE];

    if (this.node) {
      pieces.unshift(this.node.name || UNTITLED);
    }

    document.title = pieces.join(" - ");
  }

  readUrlHash() {
    const id = document.location.hash.split("/")[1] as NodeId;
    if (id) {
      this.node = new Node(this.office, id);
    } else {
      this.node = Node.root(this.office);
    }
  }

  writeUrlHash() {
    document.location.hash = "#/" + (this.node?.id ?? "");
  }

  focusFocus() {
    const el = document.querySelector<HTMLElement>(
      `[data-focus="${this.focus}"]`
    );
    if (el) el.focus();
  }

  render() {
    render(
      <OfficeContext.Provider value={this.office}>
        <SyncContext.Provider value={this.sync}>
          <ActiveNodeContext.Provider
            value={[this.node, (node) => (this.node = node)]}
          >
            <FocusContext.Provider
              value={[this.focus, (focus) => (this.focus = focus)]}
            >
              <App />
            </FocusContext.Provider>
          </ActiveNodeContext.Provider>
        </SyncContext.Provider>
      </OfficeContext.Provider>,
      document.getElementById("root")
    );
  }
}
