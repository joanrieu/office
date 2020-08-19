import { observer } from "mobx-react";
import React from "react";
import { useActiveNode } from "../context/useActiveNode";
import { KeyboardShortcuts } from "../sidebar/KeyboardShortcuts";
import { NodeName } from "../node/NodeName";
import { Toolbar } from "../node/Toolbar";
import { Overview } from "../sidebar/Overview";
import { SyncStatus } from "../sidebar/SyncStatus";
import { View } from "../View";
import "./App.scss";
import { AppLogo } from "./AppLogo";

export const App = observer(() => {
  const [node] = useActiveNode();
  return (
    <div className="App">
      <div>
        <AppLogo />
        <Overview />
        <div>
          <SyncStatus />
          {node?.exists && <KeyboardShortcuts node={node} />}
        </div>
      </div>
      {node?.exists && (
        <div>
          <h1>
            <NodeName node={node} editable />
          </h1>
          <Toolbar node={node} />
          <View node={node} />
        </div>
      )}
    </div>
  );
});
