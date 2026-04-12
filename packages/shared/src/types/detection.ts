export type ArchitecturalLayer = 'ui' | 'api' | 'data' | 'utils' | 'external';

export type ComponentRole =
  | 'page'
  | 'component'
  | 'layout'
  | 'api-route'
  | 'middleware'
  | 'model'
  | 'schema'
  | 'utility'
  | 'hook'
  | 'context'
  | 'service'
  | 'config'
  | 'unknown';

export interface FrameworkDetection {
  role: ComponentRole;
  layer: ArchitecturalLayer;
  confidence: number;
  framework: string;
  humanLabel?: string;
}
