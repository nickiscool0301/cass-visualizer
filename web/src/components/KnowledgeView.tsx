import { useState } from "react";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-8 border-b pb-1.5 text-base font-semibold tracking-tight" style={{ color: "var(--text-primary)", borderColor: "var(--border)" }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
      {children}
    </p>
  );
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
      {children}
    </ul>
  );
}

function Ol({ children }: { children: React.ReactNode }) {
  return (
    <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
      {children}
    </ol>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-6">{children}</li>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded px-1.5 py-0.5 font-mono text-[11px] font-medium" style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-primary)" }}>
      {children}
    </code>
  );
}

function Callout({
  children,
  type = "info",
}: {
  children: React.ReactNode;
  type?: "info" | "warning" | "tip";
}) {
  const borderColors = {
    info: "var(--accent)",
    warning: "var(--warning)",
    tip: "#10b981", // Emerald green
  };
  return (
    <div
      className="mt-3 border-l-2 pl-3 py-2 text-sm rounded-r-md"
      style={{
        borderLeftColor: borderColors[type],
        backgroundColor: "var(--bg-secondary)",
        color: "var(--text-secondary)",
      }}
    >
      {children}
    </div>
  );
}

function Figure({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <figure className="mt-4 rounded-lg border p-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}>
      {children}
      <figcaption className="mt-3 text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        {caption}
      </figcaption>
    </figure>
  );
}

function TokenRingDiagram() {
  return (
    <Figure caption="Consistent Hashing Ring: token partition ranges map to physical nodes.">
      <svg viewBox="0 0 300 200" className="mx-auto h-40 w-auto">
        <circle cx={150} cy={100} r={70} fill="none" stroke="var(--border)" strokeWidth={2} />
        <path
          d="M150,30 A70,70 0 0,1 210,65 L150,100 Z"
          fill="#3b82f6"
          fillOpacity={0.15}
          stroke="#3b82f6"
          strokeWidth={1.5}
        />
        <path
          d="M210,65 A70,70 0 0,1 180,165 L150,100 Z"
          fill="#10b981"
          fillOpacity={0.15}
          stroke="#10b981"
          strokeWidth={1.5}
        />
        <path
          d="M180,165 A70,70 0 0,1 150,30 L150,100 Z"
          fill="#f59e0b"
          fillOpacity={0.15}
          stroke="#f59e0b"
          strokeWidth={1.5}
        />
        <circle cx={150} cy={100} r={4} fill="var(--text-primary)" />
        <text x={215} y={45} fill="var(--text-primary)" fontSize={10} fontWeight="600" textAnchor="start">Node A</text>
        <text x={240} y={120} fill="var(--text-primary)" fontSize={10} fontWeight="600" textAnchor="start">Node B</text>
        <text x={75} y={140} fill="var(--text-primary)" fontSize={10} fontWeight="600" textAnchor="end">Node C</text>
        <text x={150} y={185} fill="var(--text-secondary)" fontSize={10} textAnchor="middle">
          Partition Key → Murmur3 Hash → Token → Owner Node
        </text>
      </svg>
    </Figure>
  );
}

function ReplicationDiagram() {
  return (
    <Figure caption="Replication Factor (RF) = 3: each partition is replicated to three nodes in clockwise succession.">
      <svg viewBox="0 0 420 130" className="mx-auto h-28 w-auto">
        {[0, 1, 2].map((i) => (
          <g key={i} transform={`translate(${40 + i * 130}, 20)`}>
            <rect x={0} y={0} width={100} height={75} rx={8} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
            <text x={50} y={28} textAnchor="middle" fill="var(--text-primary)" fontSize={11} fontWeight="600">
              Node {String.fromCharCode(65 + i)}
            </text>
            <rect x={15} y={42} width={70} height={20} rx={4} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />
            <text x={50} y={55} textAnchor="middle" fill="var(--accent)" fontSize={9} fontWeight="600">
              Partition X
            </text>
          </g>
        ))}
        <text x={210} y={115} textAnchor="middle" fill="var(--text-secondary)" fontSize={10}>
          RF=3 ensures data is written to three distinct physical nodes.
        </text>
      </svg>
    </Figure>
  );
}

function WritePathDiagram() {
  const steps = ["Client", "Coordinator", "Commit Log", "Memtable", "SSTable"];
  return (
    <Figure caption="Write Path: Fast append to Commit Log & Memtable, asynchronous flush to SSTables.">
      <svg viewBox="0 0 580 120" className="mx-auto h-24 w-full max-w-2xl">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--text-secondary)" />
          </marker>
        </defs>
        {steps.map((label, i) => {
          const x = 15 + i * 115;
          return (
            <g key={label}>
              <rect x={x} y={35} width={95} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
              <text x={x + 47.5} y={58} textAnchor="middle" fill="var(--text-primary)" fontSize={10} fontWeight="500">
                {label}
              </text>
              {i < steps.length - 1 && (
                <line
                  x1={x + 97}
                  y1={55}
                  x2={x + 112}
                  y2={55}
                  stroke="var(--text-tertiary)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow)"
                />
              )}
            </g>
          );
        })}
        <path
          d="M 445 75 Q 445 98 395 98 Q 235 98 235 75"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          markerEnd="url(#arrow)"
        />
        <text x={290} y={18} textAnchor="middle" fill="var(--text-secondary)" fontSize={10}>
          Memtable flush is asynchronous to create immutable SSTables on disk
        </text>
      </svg>
    </Figure>
  );
}

function ReadPathDiagram() {
  const steps = ["Client", "Coordinator", "Memtable", "Bloom Filter", "SSTables", "Row Merge"];
  return (
    <Figure caption="Read Path: Checks active memory, then checks Bloom filters to read and reconcile SSTables.">
      <svg viewBox="0 0 620 120" className="mx-auto h-24 w-full max-w-3xl">
        <defs>
          <marker id="arrow2" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="var(--text-secondary)" />
          </marker>
        </defs>
        {steps.map((label, i) => {
          const x = 10 + i * 102;
          return (
            <g key={label}>
              <rect x={x} y={35} width={90} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
              <text x={x + 45} y={58} textAnchor="middle" fill="var(--text-primary)" fontSize={9} fontWeight="500">
                {label}
              </text>
              {i < steps.length - 1 && (
                <line
                  x1={x + 92}
                  y1={55}
                  x2={x + 99}
                  y2={55}
                  stroke="var(--text-tertiary)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrow2)"
                />
              )}
            </g>
          );
        })}
        <text x={310} y={18} textAnchor="middle" fill="var(--text-secondary)" fontSize={10}>
          Coordinator contacts required replicas and performs dynamic read-repairs if discrepancies exist.
        </text>
      </svg>
    </Figure>
  );
}

function ConsistencyTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border text-xs" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-600 border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <tr>
            <th className="px-3 py-2.5 font-semibold">Level</th>
            <th className="px-3 py-2.5 font-semibold">Replicas Required</th>
            <th className="px-3 py-2.5 font-semibold">Typical Use Case & Description</th>
          </tr>
        </thead>
        <tbody className="divide-y text-slate-700" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          {[
            ["ANY", "At least one replica, or a Hinted Handoff", "Highest write availability. If all replicas are down, coordinator accepts write and stores hint. Fails reads."],
            ["ONE", "At least one replica node", "Lowest latency. Fast reads and writes. Risk of reading stale data if replicas differ."],
            ["QUORUM", "Majority of all replicas: floor(RF / 2) + 1", "Balanced strong consistency. For RF=3, quorum requires 2 nodes. Ensures read-after-write when W + R > RF."],
            ["LOCAL_QUORUM", "Majority of replicas in the local datacenter", "Multi-DC standard. Avoids cross-datacenter WAN link latency while offering strong local consistency."],
            ["EACH_QUORUM", "Majority of replicas in every datacenter", "Strict multi-DC consistency. High write overhead as write blocks until quorum is achieved in all DCs."],
            ["ALL", "All replica nodes in the cluster", "Highest read consistency, lowest availability. Any single node failure will cause writes or reads to fail."],
          ].map(([level, replicas, use]) => (
            <tr key={level} className="hover:bg-slate-50/50">
              <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: "var(--accent)" }}>{level}</td>
              <td className="px-3 py-2.5 font-medium" style={{ color: "var(--text-primary)" }}>{replicas}</td>
              <td className="px-3 py-2.5">{use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AntiPatternTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border text-xs" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-600 border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <tr>
            <th className="px-3 py-2.5 font-semibold">Anti-pattern</th>
            <th className="px-3 py-2.5 font-semibold">Underlying Cost</th>
            <th className="px-3 py-2.5 font-semibold">Architectural Remedy</th>
          </tr>
        </thead>
        <tbody className="divide-y text-slate-700" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          {[
            ["ALLOW FILTERING", "Triggers a full-cluster coordinate scan, checking every token segment.", "Model tables specifically per query. Duplicate data if necessary."],
            ["Unbounded Partitions", "Large partitions (>100MB) overload JVM heap, degrade read caching, and trigger major GC pauses.", "Add bucket keys (e.g., date, bucket ID) to split partition sizes."],
            ["Heavy Secondary Indexes", "Queries fan out to all nodes since indexes are locally stored per node.", "Use materialized views, denormalized tables, or external engines (Elasticsearch)."],
            ["Frequent Deletes / Nulls", "Generates excessive tombstones which block reads and consume vast disk/memory pools.", "Re-evaluate TTL limits, avoid inserting null values, and tune GC grace windows."],
            ["Unsynchronized Repairs", "Leads to data drift, resurrecting deletes, and high data discrepancy during queries.", "Orchestrate automated, incremental repairs via Reaper during off-peak hours."],
          ].map(([pattern, why, fix]) => (
            <tr key={pattern} className="hover:bg-slate-50/50">
              <td className="px-3 py-2.5 font-semibold" style={{ color: "var(--text-primary)" }}>{pattern}</td>
              <td className="px-3 py-2.5">{why}</td>
              <td className="px-3 py-2.5 font-medium" style={{ color: "var(--accent)" }}>{fix}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompactionStrategyTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border text-xs" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-slate-600 border-b" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
          <tr>
            <th className="px-3 py-2.5 font-semibold">Strategy</th>
            <th className="px-3 py-2.5 font-semibold">Write Amplification</th>
            <th className="px-3 py-2.5 font-semibold">Read Amplification</th>
            <th className="px-3 py-2.5 font-semibold">Space Amplification</th>
            <th className="px-3 py-2.5 font-semibold">Best Workload Fit</th>
          </tr>
        </thead>
        <tbody className="divide-y text-slate-700" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          {[
            ["STCS (Size-Tiered)", "Low", "High (scans many files)", "High (needs up to 50% free disk)", "Write-heavy workloads where reads are infrequent or key-only."],
            ["LCS (Leveled)", "High (frequent rewrites)", "Low (targets single file per level)", "Low (needs only ~10% free space)", "Read-heavy or mixed workloads with high overwrite frequencies."],
            ["TWCS (Time-Window)", "Very Low", "Low (bounded by time windows)", "Medium", "Time-series data with static TTLs. Keeps older data logically separated."],
            ["UCS (Unified - C* 5.0)", "Adaptive (Low-High)", "Adaptive (Low)", "Low (highly segmented)", "General purpose. Combines benefits of STCS/LCS by scaling size tiers dynamically."],
          ].map(([strategy, writeAmp, readAmp, spaceAmp, fit]) => (
            <tr key={strategy} className="hover:bg-slate-50/50">
              <td className="px-3 py-2.5 font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{strategy}</td>
              <td className="px-3 py-2.5 font-medium text-amber-600">{writeAmp}</td>
              <td className="px-3 py-2.5 font-medium text-emerald-600">{readAmp}</td>
              <td className="px-3 py-2.5 font-medium text-blue-600">{spaceAmp}</td>
              <td className="px-3 py-2.5">{fit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ArchitectureTopic() {
  return (
    <>
      <H2>1. Core Architecture & Topology</H2>
      <P>
        Apache Cassandra is a decentralized, wide-column store designed with a masterless, peer-to-peer ring topology. 
        Unlike master-replica databases, every node in Cassandra is equal, eliminating single points of failure.
      </P>

      <H3>Ring Topology & Consistent Hashing</H3>
      <P>
        Data partition is governed by consistent hashing. Cassandra maps the hash value of the row partition key to a 64-bit integer space 
        ranging from <Code>-2^63</Code> to <Code>2^63 - 1</Code> (using the <Code>Murmur3Partitioner</Code>).
      </P>
      <TokenRingDiagram />
      <P>
        The resulting hash token dictates ownership. Replicas are placed around the ring in clockwise succession starting from the primary token owner.
      </P>

      <H3>Replication Factor & Strategies</H3>
      <P>
        The Replication Factor (RF) determines how many redundant copies of a partition are distributed across the ring. 
        Replicas are assigned by walking the ring clockwise from the primary partition owner.
      </P>
      <ReplicationDiagram />
      <Ul>
        <Li><strong>SimpleStrategy:</strong> Places replicas sequentially on the next clockwise nodes. Best for single-datacenter local testing only.</Li>
        <Li><strong>NetworkTopologyStrategy:</strong> Production choice. Allows setting replication factor per datacenter (e.g., 3 in US-East, 3 in EU-West) and spreads replicas across distinct racks to enforce failure isolation.</Li>
      </Ul>

      <H3>Virtual Nodes (vnodes) Internals</H3>
      <P>
        Rather than assigning a single massive, contiguous token range to each physical hardware node, Cassandra allocates multiple smaller token ranges—known as <strong>vnodes</strong> (default 128 or 256 per node)—to each physical machine.
      </P>
      <Ul>
        <Li>
          <strong>Pros:</strong> Rebalancing is uniform. When a new node bootstraps, it takes random ranges from all existing nodes, spreading the bandwidth and data streaming load across the whole cluster instead of overloading one adjacent node.
        </Li>
        <Li>
          <strong>Cons:</strong> Vnodes increase cluster metadata overhead. Gossip communication increases, and multi-datacenter network routing calculations become more complex.
        </Li>
      </Ul>

      <H3>Token Allocation Algorithm</H3>
      <P>
        In early Cassandra versions, tokens were generated randomly, which could lead to severe storage imbalances across nodes. 
        Modern Cassandra uses a deterministic <strong>Token Allocation Algorithm</strong> (<Code>ConsistentHash3a</Code>). 
        By specifying a keyspace in the config (<Code>token_allocation_keyspace</Code>), bootstrapping nodes inspect the current token loads of all active nodes and select new vnode tokens that minimize overall load variance, resulting in highly uniform storage distribution.
      </P>

      <H3>The Gossip Protocol (Scuttlebutt)</H3>
      <P>
        Cassandra nodes run a background Gossip thread (over UDP port 7000) to communicate state, endpoints, schema updates, and node status. 
        It is a decentralized anti-entropy communication protocol running once every second.
      </P>
      <Ul>
        <Li>
          <strong>State generation:</strong> State values have generation numbers (incremented on node restart) and version numbers, allowing nodes to quickly determine if received gossip is newer than their current local memory state.
        </Li>
        <Li>
          <strong>Seeds:</strong> Seed nodes act as critical contact points. A new node joining the cluster uses seed nodes to discover the rest of the topology, preventing partition isolation (split-brain scenarios).
        </Li>
      </Ul>

      <H3>Phi Accrual Failure Detector</H3>
      <P>
        Rather than using fixed, arbitrary timeouts, Cassandra uses the <strong>Phi Accrual Failure Detector</strong> to track node health. It calculates a threshold value, <Code>Phi (Φ)</Code>, representing the probability that a node is down based on the historical sliding window of heartbeat inter-arrival times.
      </P>
      <P>
        Mathematically, let <Code>t</Code> be the time since the last heartbeat. The detector estimates the probability <Code>P_later(t)</Code> that a heartbeat will arrive later than <Code>t</Code>. The Phi value is:
      </P>
      <div className="mt-3 rounded border p-3 font-mono text-xs text-center text-slate-800" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        Φ = -log10( P_later(t) )
      </div>
      <Ul>
        <Li><strong>Φ = 8:</strong> Highly aggressive. Typically chosen for local datacenter environments with high-quality networks.</Li>
        <Li><strong>Φ = 10 to 12:</strong> Default range. Provides protection against transient network jitter, garbage collection pauses, and multi-region WAN latency.</Li>
      </Ul>

      <H3>Request Routing & The Dynamic Snitch</H3>
      <P>
        Clients connect to any node, which serves as the <strong>Coordinator</strong>. The coordinator uses the <strong>Snitch</strong> (e.g., <Code>GossipingPropertyFileSnitch</Code>) to discover racks and datacenters.
      </P>
      <P>
        The <strong>Dynamic Snitch</strong> monitors response latencies, disk I/O, and ping times of replicas. It automatically routes reads away from degraded, slow, or congested replica nodes to ensure low-latency performance.
      </P>
    </>
  );
}

function StorageTopic() {
  return (
    <>
      <H2>2. LSM-Tree Storage Engine</H2>
      <P>
        Cassandra uses a Log-Structured Merge-tree (LSM) storage engine. It avoids random disk writes by turning all inserts, updates, and deletes into sequential appends.
      </P>

      <H3>The Detailed Write Path</H3>
      <WritePathDiagram />
      <Ol>
        <Li>
          <strong>Commit Log Append:</strong> The mutation is appended sequentially to the <Code>CommitLog</Code> on disk. This is a crash-recovery journal.
          <Callout type="warning">
            Sync modes decide durability: <Code>periodic</Code> (flushes every few seconds; fast but risks losing brief data during sudden total power failure) vs. <Code>batch</Code> (flushes every write, highly durable but introduces substantial disk bottleneck).
          </Callout>
        </Li>
        <Li>
          <strong>Memtable Insertion:</strong> The mutation is written to the <Code>Memtable</Code>, an in-memory sorted buffer. Once inserted into both, the write is acknowledged.
          <Callout type="tip">
            Modern Cassandra versions allow off-heap allocation (<Code>memtable_allocation_type: offheap_objects</Code>) to keep raw rows out of JVM Heap space, drastically reducing GC pauses under high write pressure.
          </Callout>
        </Li>
        <Li>
          <strong>SSTable Flushing:</strong> When the Memtable reaches threshold capacity or the commit log segments fill up, the Memtable is flushed to disk as an immutable <strong>SSTable</strong> (Sorted String Table).
        </Li>
      </Ol>

      <H3>SSTable File Anatomy</H3>
      <P>
        SSTables are collections of physical files stored in keyspace directories:
      </P>
      <Ul>
        <Li><strong>Data.db:</strong> Contains the physical row columns sorted by token and clustering key. It embeds <strong>column index blocks</strong> (default every 64KB) within wide partitions, letting Cassandra skip non-matching clustering columns during reads without doing a sequential scan from the start of the partition.</Li>
        <Li><strong>Index.db:</strong> The primary index. Maps partition keys to bytes offsets in <Code>Data.db</Code>.</Li>
        <Li><strong>Summary.db:</strong> An in-memory, down-sampled index of <Code>Index.db</Code> to speed up binary searches in RAM.</Li>
        <Li><strong>Filter.db:</strong> The Bloom Filter. A highly optimized, probabilistic memory structure checking if a partition key exists in this SSTable, eliminating 99% of unnecessary disk seeks.
          <Callout type="tip">
            Tuning the Bloom Filter's False Positive Chance (<Code>bloom_filter_fp_chance</Code> from <Code>0.01</Code> to <Code>0.1</Code>) adjusts the filter size in memory. Lower values reduce disk seeks but consume more JVM/system memory.
          </Callout>
        </Li>
        <Li><strong>Statistics.db:</strong> Tracks tombstone metadata, partition sizes, cell timestamps, and min/max clustering bounds.</Li>
      </Ul>

      <H3>The Detailed Read Path</H3>
      <ReadPathDiagram />
      <Ol>
        <Li><strong>Check Active RAM:</strong> Search the current active Memtables.</Li>
        <Li><strong>Row Cache check:</strong> If configured and cached, return immediately.</Li>
        <Li><strong>Bloom Filter probe:</strong> Query Bloom Filters of candidate SSTables on disk. Discard files that do not contain the partition key.</Li>
        <Li><strong>Key Cache check:</strong> Search Key Cache for the partition key's byte offset in the Primary Index.</Li>
        <Li><strong>Index seek:</strong> If not cached in Key Cache, scan the Partition Summary in RAM, seek the offset in <Code>Index.db</Code>, and find the data offset.</Li>
        <Li><strong>Data merge:</strong> Seek the offset in <Code>Data.db</Code>, read columns, and merge them with Memtable columns. Discard older updates by resolving cells using their client-provided timestamps. Return the consolidated record.</Li>
      </Ol>

      <H3>Ensuring Read Correctness</H3>
      <Ul>
        <Li>
          <strong>Read Repair (Cassandra 4.0+ Refactor):</strong> In older versions, transient background read repairs were heavily used, which often led to unpredictable read latencies and resource exhaustion. 
          Modern Cassandra has simplified this by deprecating background repairs in favor of scheduled repairs. Reads now use either <Code>blocking</Code> read repair (stale replicas are repaired before returning data to the client) or <Code>none</Code>.
        </Li>
        <Li>
          <strong>Speculative Retry:</strong> If a replica node fails to respond within a high percentile (e.g. 99th percentile) latency window, the coordinator immediately redirects the query to an additional replica to prevent outlier latency.
        </Li>
      </Ul>
    </>
  );
}

function ConsistencyTopic() {
  return (
    <>
      <H2>3. Consensus & Consistency</H2>
      <P>
        Cassandra is designed to conform to the PACELC theorem. If a network partition occurs, it favors availability over consistency. 
        However, consistency can be tuned per-read and per-write operation to achieve strong consistency.
      </P>

      <H3>Consistency Levels Reference</H3>
      <ConsistencyTable />

      <H3>The Math of Strong Consistency</H3>
      <P>
        To ensure strong consistency (so a client always reads the most recent write), the read consistency level and write consistency level must overlap. This is governed by the inequality:
      </P>
      <div className="my-4 rounded bg-slate-50 border p-4 font-mono text-sm text-center font-semibold text-slate-800" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        R + W &gt; RF
      </div>
      <P>
        Where <Code>R</Code> is the Read consistency level count, <Code>W</Code> is the Write consistency level count, and <Code>RF</Code> is the Replication Factor.
      </P>
      <Ul>
        <Li>
          <strong>Example:</strong> With <Code>RF = 3</Code>, executing writes at <Code>QUORUM (2 nodes)</Code> and reads at <Code>QUORUM (2 nodes)</Code> satisfies <Code>2 + 2 &gt; 3</Code>. 
          At least one replica is guaranteed to participate in both the write and read operations, ensuring correct, fresh state.
        </Li>
      </Ul>

      <H3>Paxos & Lightweight Transactions (LWT)</H3>
      <P>
        Standard Cassandra writes use client timestamps to resolve updates (Last-Write-Wins), which is eventually consistent and vulnerable to race conditions. 
        For linearizable consistency (e.g., "create user if username does not exist"), Cassandra implements a decentralized Paxos consensus model.
      </P>
      <P>
        LWT replaces the simple write path with a 4-phase Paxos negotiation:
      </P>
      <Ol>
        <Li>
          <strong>Prepare & Promise:</strong> The coordinator generates a unique proposal ballot and sends it to replicas. 
          Replicas promise not to accept proposals with older ballots, returning their most recently accepted proposal.
        </Li>
        <Li>
          <strong>Read & Propose:</strong> The coordinator reads the current row state from the replicas. If the conditional statement (e.g., <Code>IF NOT EXISTS</Code>) is satisfied, the coordinator proposes the new state.
        </Li>
        <Li>
          <strong>Accept:</strong> The coordinator requests replicas to accept the proposed state. Replicas commit this state to their Paxos state-table.
        </Li>
        <Li>
          <strong>Commit & Apply:</strong> The coordinator issues a commit, prompting replicas to apply the mutation to their regular storage path (Memtable/SSTable) and clear Paxos metadata.
        </Li>
      </Ol>
      <Callout type="warning">
        <strong>LWT Performance Penalty:</strong> Paxos transactions require 4 network round trips instead of 1, creating high read/write amplification. 
        Concurrent Paxos transactions on the same partition cause ballot contention, resulting in high latency.
      </Callout>

      <H3>Cassandra 5.0 ACID Transactions (Accord)</H3>
      <P>
        To resolve LWT's single-partition boundaries and severe round-trip latency overhead, Cassandra 5.0 integrates the **Accord** consensus protocol. 
        Accord enables distributed, multi-partition ACID transactions (strict serializable queries and updates) in a single WAN round-trip.
      </P>
      <Ul>
        <Li><strong>Multi-key Consensus:</strong> Replicas use Accord's dependency-graph consensus rather than lock-based two-phase commits, running multi-partition transactions without bottlenecking global database throughput.</Li>
        <Li><strong>Strict Serializability:</strong> Provides standard relational-like ACID transaction capability across any set of rows or tables in the cluster.</Li>
      </Ul>
    </>
  );
}

function ModelingTopic() {
  return (
    <>
      <H2>4. Data Modeling & Compaction</H2>
      <P>
        Data modeling in Cassandra is query-driven. Because joins are absent, tables must be structured directly around the queries they satisfy, leading to intentional denormalization.
      </P>

      <H3>Primary Key Mechanics</H3>
      <P>
        The structure of a primary key governs both data distribution and sorting on disk:
      </P>
      <div className="mt-3 rounded-lg border p-4 font-mono text-[11px]" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>
        CREATE TABLE commerce.user_orders (<br />
        &nbsp;&nbsp;user_id uuid,<br />
        &nbsp;&nbsp;order_date date,<br />
        &nbsp;&nbsp;order_id uuid,<br />
        &nbsp;&nbsp;amount decimal,<br />
        &nbsp;&nbsp;PRIMARY KEY (<strong>(user_id, order_date)</strong>, order_id)<br />
        ) WITH CLUSTERING ORDER BY (order_id DESC);
      </div>
      <Ul>
        <Li>
          <strong>Partition Key:</strong> Decides where the data lives. By wrapping <Code>user_id</Code> and <Code>order_date</Code> in double parentheses, they form a composite partition key. 
          This distributes orders across nodes by user and date, preventing partitions from growing infinitely over time.
        </Li>
        <Li>
          <strong>Clustering Key:</strong> Decides the physical order of rows inside the partition file on disk. 
          Here, <Code>order_id</Code> clusters the rows, sorted in descending order for rapid retrieval of recent orders.
        </Li>
      </Ul>

      <H3>Tombstones: The Cost of Deleting Data</H3>
      <P>
        Because SSTables are immutable on disk, deletes cannot modify files. Instead, a delete writes a marker called a <strong>Tombstone</strong>.
      </P>
      <Ul>
        <Li>
          <strong>GC Grace Seconds:</strong> Tombstones persist for a duration set by <Code>gc_grace_seconds</Code> (default: 10 days). 
          This gives offline nodes time to recover and run repairs. If a node is down longer than this grace period, it can miss the tombstone entirely, 
          leading to <strong>resurrecting deletes</strong> when the node rejoins.
        </Li>
        <Li>
          <strong>Read Degradation:</strong> If a read query scans a partition containing thousands of tombstones, the coordinator must read all of them to determine which data is deleted. 
          By default, Cassandra logs a warning at 1,000 tombstones and aborts queries at 100,000 tombstones to protect nodes from JVM out-of-memory crashes.
        </Li>
      </Ul>

      <H2>Compaction Strategies Deep Dive</H2>
      <P>
        As SSTables accumulate on disk, Cassandra runs background <strong>Compactions</strong>. 
        This process reads multiple SSTables, discards expired tombstones, resolves updates, and writes a unified, sorted SSTable.
      </P>
      <CompactionStrategyTable />

      <H3>Schema & Query Anti-patterns</H3>
      <AntiPatternTable />
    </>
  );
}

function K8ssandraTopic() {
  return (
    <>
      <H2>5. Kubernetes & K8ssandra</H2>
      <P>
        Running Cassandra in containerized environments requires understanding the mismatch between stateless Kubernetes pods and stateful, topology-aware distributed systems.
      </P>

      <H3>Why Bare StatefulSets Fail</H3>
      <P>
        Kubernetes StatefulSets provide stable network ordinals and persistent volume attachments. However, they lack awareness of database topology:
      </P>
      <Ul>
        <Li>
          <strong>Token Alignment:</strong> If Kubernetes kills a Cassandra pod and schedules it on a different host, Cassandra needs the IP changes and storage attachments mapped correctly to prevent the node from bootstrapping as a completely new peer, which causes token-ring mismatch.
        </Li>
        <Li>
          <strong>Orchestration Safety:</strong> Scaling down a StatefulSet directly can leave data un-decommissioned. 
          Scaling up multiple pods concurrently violates Cassandra's rule that only one node may bootstrap at a time to prevent streaming collisions.
        </Li>
      </Ul>

      <H3>K8ssandra Operator Architecture</H3>
      <P>
        <strong>K8ssandra</strong> is a complete cloud-native distribution for Cassandra on Kubernetes. It replaces bare configuration with an advanced <strong>Operator Pattern</strong>, packaging several key tools:
      </P>
      <Ul>
        <Li>
          <strong>Cass Operator:</strong> The Custom Resource Controller. It coordinates Cassandra nodes, maps pods to correct physical nodes, enforces anti-affinity, injects configurations, and performs safe, sequential rolling restarts.
        </Li>
        <Li>
          <strong>Stargate Data API Gateway:</strong> A stateless proxy layer sitting in front of Cassandra pods. It exposes REST, GraphQL, Document APIs (JSON), and gRPC to microservices, shielding client applications from Cassandra coordinator overhead and node connections.
        </Li>
        <Li>
          <strong>Reaper for Repairs:</strong> Repairs must be run regularly. Reaper coordinates this on Kubernetes by breaking repair tasks into small token ranges and scheduling them during low-load intervals.
        </Li>
        <Li>
          <strong>Medusa for Backups:</strong> Provides direct integration with Kubernetes CSI volume snapshots or backup targets like Amazon S3, Google Cloud Storage, or Azure Blob.
        </Li>
      </Ul>

      <H3>Advanced Multi-Cluster Topologies</H3>
      <P>
        For geographical failover, K8ssandra can orchestrate a single logical Cassandra cluster spanning multiple Kubernetes clusters located in different regions or cloud providers.
      </P>
      <Figure caption="K8ssandra Multi-Cluster federation: service mesh facilitates cross-region pod-to-pod CQL routing.">
        <svg viewBox="0 0 500 200" className="mx-auto h-40 w-auto">
          {/* Cluster 1 */}
          <rect x={10} y={10} width={220} height={140} rx={8} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 2" />
          <text x={20} y={28} fill="var(--text-secondary)" fontSize={10} fontWeight="600">Kubernetes Cluster (US-East)</text>
          
          <rect x={30} y={45} width={75} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={67.5} y={68} textAnchor="middle" fill="var(--text-primary)" fontSize={9} fontWeight="600">Cass Pod 1</text>
          
          <rect x={135} y={45} width={75} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={172.5} y={68} textAnchor="middle" fill="var(--text-primary)" fontSize={9} fontWeight="600">Cass Pod 2</text>

          <rect x={55} y={100} width={120} height={35} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.2} />
          <text x={115} y={121} textAnchor="middle" fill="var(--accent)" fontSize={9} fontWeight="600">Stargate API Layer</text>

          {/* Connectors */}
          <path d="M 230 70 L 270 70" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 3" />
          <path d="M 270 90 L 230 90" stroke="#10b981" strokeWidth={1.5} strokeDasharray="5 3" />

          {/* Cluster 2 */}
          <rect x={270} y={10} width={220} height={140} rx={8} fill="none" stroke="var(--border)" strokeWidth={1.5} strokeDasharray="4 2" />
          <text x={280} y={28} fill="var(--text-secondary)" fontSize={10} fontWeight="600">Kubernetes Cluster (EU-West)</text>

          <rect x={290} y={45} width={75} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={327.5} y={68} textAnchor="middle" fill="var(--text-primary)" fontSize={9} fontWeight="600">Cass Pod 3</text>

          <rect x={395} y={45} width={75} height={40} rx={6} fill="var(--bg-secondary)" stroke="var(--border)" strokeWidth={1.5} />
          <text x={432.5} y={68} textAnchor="middle" fill="var(--text-primary)" fontSize={9} fontWeight="600">Cass Pod 4</text>

          <rect x={320} y={100} width={120} height={35} rx={6} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.2} />
          <text x={380} y={121} textAnchor="middle" fill="var(--accent)" fontSize={9} fontWeight="600">Stargate API Layer</text>

          <text x={250} y={180} textAnchor="middle" fill="var(--text-secondary)" fontSize={9}>
            Service Mesh (Istio / Linkerd) or flat VPC facilitates direct cross-region gossip & replication.
          </text>
        </svg>
      </Figure>
      <Ul>
        <Li>
          <strong>Cross-Cluster Networking:</strong> Cassandra nodes require direct TCP socket connections to other replicas. 
          This requires flat network virtualization (such as a shared VPC with VPC Peering) or a Service Mesh (like Istio or Linkerd) with egress/ingress gateways configured for multi-cluster SNI routing.
        </Li>
        <Li>
          <strong>Local Persistent Volumes (PV):</strong> For Cassandra's strict write and read path latency requirements, network CSI volumes (EBS, Persistent Disks) introduce latency jitter. 
          Production K8ssandra deployments utilize Local NVMe disks exposed to pods as Local Persistent Volumes, combined with pod anti-affinity rules to ensure one Cassandra pod per physical hardware hypervisor.
        </Li>
      </Ul>
    </>
  );
}

export function KnowledgeView() {
  const [selectedTopic, setSelectedTopic] = useState<"architecture" | "storage" | "consistency" | "modeling" | "k8ssandra">("architecture");

  const topics: { id: typeof selectedTopic; label: string; icon: React.ReactNode }[] = [
    {
      id: "architecture",
      label: "Architecture & Topology",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
    },
    {
      id: "storage",
      label: "LSM-Tree Storage Engine",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <rect x="2" y="3" width="20" height="8" rx="2" ry="2" />
          <rect x="2" y="13" width="20" height="8" rx="2" ry="2" />
          <line x1="6" y1="7" x2="6.01" y2="7" />
          <line x1="6" y1="17" x2="6.01" y2="17" />
        </svg>
      ),
    },
    {
      id: "consistency",
      label: "Consensus & Consistency",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 11 2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "modeling",
      label: "Data Modeling & Compaction",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      ),
    },
    {
      id: "k8ssandra",
      label: "Kubernetes & K8ssandra",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v20" />
          <path d="M2 12h20" />
          <path d="m5.6 5.6 12.8 12.8" />
          <path d="m18.4 5.6-12.8 12.8" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left local sidebar */}
      <nav 
        className="flex shrink-0 gap-1 overflow-x-auto pb-2 border-b lg:w-56 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4" 
        style={{ borderColor: "var(--border)" }}
        aria-label="Knowledge base topics"
      >
        {topics.map((t) => {
          const isActive = selectedTopic === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTopic(t.id)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap lg:whitespace-normal"
              style={{
                backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              <span className="inline-flex h-4.5 w-4.5 items-center justify-center shrink-0">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Right Content area */}
      <article className="min-w-0 flex-1 max-w-3xl pb-12">
        <header className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Cassandra Knowledge Base
          </h1>
          <p className="mt-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Distributed Systems & Cassandra/K8ssandra Guide for engineers and architects.
          </p>
        </header>

        <section className="mt-4 animate-slide-in">
          {selectedTopic === "architecture" && <ArchitectureTopic />}
          {selectedTopic === "storage" && <StorageTopic />}
          {selectedTopic === "consistency" && <ConsistencyTopic />}
          {selectedTopic === "modeling" && <ModelingTopic />}
          {selectedTopic === "k8ssandra" && <K8ssandraTopic />}
        </section>

        <footer className="mt-12 border-t pt-4 text-[10px]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}>
          This knowledge base details Cassandra 4.x/5.x internals and K8ssandra Operator patterns. Cross-reference with Apache Cassandra source specifications when configuring.
        </footer>
      </article>
    </div>
  );
}
