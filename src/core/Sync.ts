import { autorun, observable, observe } from "mobx";
import PouchDB from "pouchdb";
import { Node } from "./Node";
import { Office } from "./Office";
import { Event } from "./types";

export class Sync {
  constructor(readonly office: Office) {
    this.init();
  }

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
    const batchedDbEvents = observable.array<Event>();
    const batchedMemoryEvents = observable.array<Event>();

    // local db -> memory (initial sync)
    await this.localDb
      .changes({ include_docs: true })
      .on("change", (change) => batchedDbEvents.push(change.doc!.event));
    if (batchedDbEvents.length === 0) {
      Node.createInitialEvents(this.office);
    }

    // local db -> memory (live sync)
    this.localDb
      .changes({ since: "now", live: true, include_docs: true })
      .on("change", (change) => batchedDbEvents.push(change.doc!.event));

    // memory -> local db (live sync)
    observe(this.office.eventsById, async (change) => {
      if (change.type === "add") {
        batchedMemoryEvents.push(change.newValue);
      }
    });

    // commit to memory
    autorun(
      () => {
        batchedDbEvents.forEach(
          (event) => (this.office.eventsById[event.id] = event)
        );
        batchedDbEvents.clear();
      },
      {
        delay: 1,
      }
    );

    // commit to db
    autorun(
      () => {
        this.localDb.bulkDocs(
          batchedMemoryEvents.map((event) => ({ _id: event.id, event }))
        );
        batchedMemoryEvents.clear();
      },
      {
        delay: 1,
      }
    );
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
}
