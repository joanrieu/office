import { observer } from "mobx-react";
import React from "react";
import { useSync } from "../context/useSync";
import "./SyncStatus.scss";

export const SyncStatus = observer(() => {
  const sync = useSync();

  return (
    <button
      onClick={() => sync.initRemoteSync()}
      title="Force sync"
      className={
        "SyncStatus " +
        (sync.isReady ? (sync.isOnline ? "online" : "offline") : "loading")
      }
      disabled={!sync.isReady}
    >
      {sync.isReady ? (
        sync.isOnline ? (
          <span>Online</span>
        ) : (
          <span>Offline</span>
        )
      ) : (
        <span>Loading...</span>
      )}
    </button>
  );
});
