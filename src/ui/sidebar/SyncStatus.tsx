import { observer } from "mobx-react";
import React from "react";
import { useSync } from "../context/useSync";
import "./SyncStatus.scss";

export const SyncStatus = observer(() => {
  const sync = useSync();
  return (
    <div className="SyncStatus">
      {sync.isReady ? (
        sync.isOnline ? (
          <span>Online</span>
        ) : (
          <>
            <span>Offline</span>
            <button onClick={() => sync.initRemoteSync()}>Force sync</button>
          </>
        )
      ) : (
        <span>Loading...</span>
      )}
    </div>
  );
});
