export type KnowledgeCategory =
  | 'HISTORICAL_INCIDENT'
  | 'SOP'
  | 'POLICY'
  | 'RESOURCE_DOCUMENTATION'
  | 'RESOLUTION_REPORT';

export interface EvidenceMetadata {
  documentTitle: string;
  sourceKey: string;
  category: KnowledgeCategory;
  lastUpdated?: string;
  service?: string;
  author?: string;
  version?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface Evidence {
  chunkId: string;
  documentTitle: string;
  sourceUri: string;
  sourceType: 'BEDROCK_KNOWLEDGE_BASE' | 'CLOUDWATCH_LOGS' | 'S3_RUNBOOK' | 'HISTORICAL_INCIDENT';
  category: KnowledgeCategory;
  snippet: string;
  relevanceScore: number;
  metadata: EvidenceMetadata;
  retrievedAt: string;
}

export interface RetrievalResult {
  query: string;
  knowledgeBaseId: string;
  durationMs: number;
  chunks: Evidence[];
  totalRetrieved: number;
  isFallback: boolean;
  warnings?: string[];
}

export interface GroundedRAGRecommendation {
  incidentId: string;
  summary: string;
  citedEvidenceIds: string[];
  evidenceCards: Evidence[];
  recommendedStrategy: string;
  immediateActions: string[];
  confidenceScore: number;
  groundingStatus: 'FULLY_GROUNDED' | 'PARTIALLY_GROUNDED' | 'NO_GROUNDING_AVAILABLE';
  promptVersion: string;
}
