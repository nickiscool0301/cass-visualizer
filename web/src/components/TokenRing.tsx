import { useEffect, useMemo, useRef, useState } from "react";
import { arc } from "d3-shape";
import type { Cluster } from "../types/cluster";
import { getRingArcs, getRingDimensions, tokenToAngle } from "../lib/ringGeometry";
import { getReplicaNodeIds } from "../lib/replicaPlacement";

interface TokenRingProps {
  cluster: Cluster;
  onSelectNode: (nodeId: string | null) => void;
  highlightedNodeId: string | null;
}

export function TokenRing({ cluster, onSelectNode, highlightedNodeId }: TokenRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(320);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize(Math.max(Math.min(rect.width, rect.height, 420), 200));
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const dims = useMemo(() => getRingDimensions(size), [size]);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);
  const rf = activeKeyspace?.replicationFactor ?? 1;

  const arcs = useMemo(
    () => getRingArcs(cluster.nodes, cluster.tokenRange, size),
    [cluster.nodes, cluster.tokenRange, size]
  );

  const arcGenerator = arc<{
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
  }>()
    .innerRadius(dims.radius - dims.strokeWidth / 2)
    .outerRadius(dims.radius + dims.strokeWidth / 2)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);

  return (
    <div ref={containerRef} className="flex h-full w-full items-center justify-center">
      <svg
        width={dims.width}
        height={dims.height}
        viewBox={`0 0 ${dims.width} ${dims.height}`}
        role="img"
        aria-label="Cassandra token ring"
        className="mx-auto"
      >
      <g transform={`translate(${dims.centerX}, ${dims.centerY})`}>
        {arcs.map((arc, i) => {
          const isHighlighted = highlightedNodeId === arc.nodeId || hoveredNodeId === arc.nodeId;
          const isJoining = cluster.animation.joiningNodeId === arc.nodeId;
          const opacity = (highlightedNodeId || hoveredNodeId) && !isHighlighted ? 0.3 : 1;
          const ownerName = cluster.nodes.find((n) => n.id === arc.nodeId)?.name ?? arc.nodeId;
          const midpoint = arc.startToken;
          const replicas = getReplicaNodeIds(midpoint, rf, cluster.nodes);
          const replicaNames = replicas.map((id) => cluster.nodes.find((n) => n.id === id)?.name ?? id);
          return (
            <path
              key={`${arc.nodeId}-${i}`}
              d={
                arcGenerator({
                  startAngle: arc.startAngle - Math.PI / 2,
                  endAngle: arc.endAngle - Math.PI / 2,
                  innerRadius: dims.radius - dims.strokeWidth / 2,
                  outerRadius: dims.radius + dims.strokeWidth / 2,
                }) ?? undefined
              }
              fill={arc.color}
              opacity={opacity}
              stroke="#e3e3e3"
              strokeWidth={2}
              className={`cursor-pointer transition-all duration-500 ease-in-out hover:opacity-80 ${
                isHighlighted ? "animate-pulse-ring" : ""
              } ${isJoining ? "animate-glow" : ""}`}
              onClick={() => onSelectNode(arc.nodeId)}
              onMouseEnter={() => setHoveredNodeId(arc.nodeId)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <title>
                {`Owner: ${ownerName}\nRange: ${arc.startToken} → ${arc.endToken}\nReplicas (RF=${rf}): ${replicaNames.join(", ") || "none"}`}
              </title>
            </path>
          );
        })}
        {cluster.nodes.map((node) => {
          const tokenAngles = node.tokens.map((t) => tokenToAngle(t, cluster.tokenRange) - Math.PI / 2);
          const nodeHighlighted = highlightedNodeId === node.id || hoveredNodeId === node.id;
          return tokenAngles.map((angle, i) => {
            const x = Math.cos(angle) * dims.radius;
            const y = Math.sin(angle) * dims.radius;
            return (
              <circle
                key={`${node.id}-tick-${i}`}
                cx={x}
                cy={y}
                r={nodeHighlighted ? 5 : 3}
                fill="#fff"
                className="transition-all duration-300"
              />
            );
          });
        })}
      </g>
    </svg>
    </div>
  );
}
