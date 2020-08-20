import { autorun, observable, observe, when } from "mobx";
import PouchDB from "pouchdb";
import { Node } from "./Node";
import { Office } from "./Office";
import { Event } from "./types";

export class Sync {
  constructor(readonly office: Office) {
    this.init();
  }

  readonly localDb = new PouchDB<{ event: Event }>("events");
  remoteDb: PouchDB.Database<{ event: Event }> | null = null;
  remoteSync: PouchDB.Replication.Sync<{ event: Event }> | null = null;
  @observable isReady = false;
  @observable isOnline = false;
  readonly batchedDbEvents = observable.array<Event>();
  readonly batchedMemoryEvents = observable.array<Event>();

  async init() {
    await this.initLocalSync();
    await this.initRemoteSync();
  }

  async initLocalSync() {
    // local db -> memory (initial sync)
    await this.localDb
      .changes({ include_docs: true })
      .on("change", (change) => this.batchedDbEvents.push(change.doc!.event));

    // local db -> memory (live sync)
    this.localDb
      .changes({ since: "now", live: true, include_docs: true })
      .on("change", (change) => this.batchedDbEvents.push(change.doc!.event));

    // memory -> local db (live sync)
    observe(this.office.eventsById, async (change) => {
      if (change.type === "add") {
        this.batchedMemoryEvents.push(change.newValue);
      }
    });

    // commit to memory
    autorun(
      () => {
        this.batchedDbEvents.forEach(
          (event) => (this.office.eventsById[event.id] = event)
        );
        this.batchedDbEvents.clear();
      },
      {
        delay: 1,
      }
    );

    // commit to db
    autorun(
      () => {
        this.localDb.bulkDocs(
          this.batchedMemoryEvents.map((event) => ({ _id: event.id, event }))
        );
        this.batchedMemoryEvents.clear();
      },
      {
        delay: 1,
      }
    );
  }

  async initRemoteSync() {
    if (this.remoteSync) this.remoteSync.cancel();

    this.remoteDb = new PouchDB<{ event: Event }>(
      "http://localhost:5984/events",
      {
        fetch: (...args) => {
          const res = fetch(...args);
          res.then(
            (res) => (this.isOnline = res.ok),
            () => (this.isOnline = false)
          );
          return res;
        },
      }
    );

    this.remoteSync = this.localDb.sync(this.remoteDb, {
      live: true,
      retry: true,
      back_off_function: (last) => Math.min(Math.max(5000, last * 2), 60000),
    });

    this.remoteSync.once("paused", () => {
      if (
        this.office.eventsByDate.length === 0 &&
        this.batchedDbEvents.length === 0
      ) {
        Node.createInitialEvents(this.office);
      }

      when(
        () => this.office.eventsByDate.length > 0,
        () => (this.isReady = true)
      );
    });
  }
}
