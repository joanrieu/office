import { observable, observe } from "mobx";
import PouchDB from "pouchdb";
import { Node } from "./Node";
import { Office } from "./Office";
import { Event } from "./types";

export class Sync {
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
        back_off_function: (last) => Math.min(Math.max(5000, last * 2), 60000),
      }
    );
  }

  onChange(change: PouchDB.Core.ChangesResponseChange<{ event: Event }>) {
    const event = change.doc?.event;
    if (!event) return;
    this.events[event.id] = event;
  }
}
