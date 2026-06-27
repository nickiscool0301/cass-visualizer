import { useReducer } from "react";
import { clusterReducer, createInitialCluster } from "../state/clusterReducer";

export function useCluster() {
  const [cluster, dispatch] = useReducer(clusterReducer, null, createInitialCluster);
  return { cluster, dispatch };
}
