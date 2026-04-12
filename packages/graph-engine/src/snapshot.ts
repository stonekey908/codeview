import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { GraphData } from '@codeview/shared';

const SNAPSHOTS_DIR = '.codeview/snapshots';

export interface Snapshot {
  commitHash: string;
  commitMessage: string;
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
  clusterCount: number;
}

export function saveSnapshot(rootDir: string, graph: GraphData): Snapshot | null {
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: rootDir }).toString().trim();
    const message = execSync('git log -1 --format=%s', { cwd: rootDir }).toString().trim();
    const timestamp = new Date().toISOString();

    const snapshotDir = path.join(rootDir, SNAPSHOTS_DIR);
    fs.mkdirSync(snapshotDir, { recursive: true });

    const data = {
      commitHash: hash,
      commitMessage: message,
      timestamp,
      graph,
    };

    fs.writeFileSync(
      path.join(snapshotDir, `${hash}.json`),
      JSON.stringify(data)
    );

    return {
      commitHash: hash,
      commitMessage: message,
      timestamp,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
      clusterCount: graph.clusters.length,
    };
  } catch {
    return null; // Not a git repo or git not available
  }
}

export function listSnapshots(rootDir: string): Snapshot[] {
  const snapshotDir = path.join(rootDir, SNAPSHOTS_DIR);
  if (!fs.existsSync(snapshotDir)) return [];

  return fs.readdirSync(snapshotDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(snapshotDir, f), 'utf-8'));
        return {
          commitHash: raw.commitHash,
          commitMessage: raw.commitMessage,
          timestamp: raw.timestamp,
          nodeCount: raw.graph.nodes.length,
          edgeCount: raw.graph.edges.length,
          clusterCount: raw.graph.clusters.length,
        };
      } catch {
        return null;
      }
    })
    .filter((s): s is Snapshot => s !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function loadSnapshotGraph(rootDir: string, commitHash: string): GraphData | null {
  const filePath = path.join(rootDir, SNAPSHOTS_DIR, `${commitHash}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return raw.graph;
  } catch {
    return null;
  }
}

// diffGraphs is in diff.ts (client-safe, no fs dependency)
export { diffGraphs } from './diff';
