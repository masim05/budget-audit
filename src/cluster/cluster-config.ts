export interface ClusterConfig {
  mappings: Record<string, string>;
  patterns: Array<{ pattern: string; cluster: string }>;
  clusters: string[];
}

export async function loadClusterConfig(_path: string): Promise<ClusterConfig> {
  // Minimal implementation for tests – real loader not needed here
  return { mappings: {}, patterns: [], clusters: ['Other'] };
}
