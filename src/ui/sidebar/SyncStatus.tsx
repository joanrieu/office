import { observer } from "mobx-react";
import React from "react";
import { useSync } from "../context/useSync";
import "./SyncStatus.scss";

export const SyncStatus = observer(() => {
  const sync = useSync();
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
