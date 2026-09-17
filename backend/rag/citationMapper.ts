import { Evidence, EvidenceMetadata, KnowledgeCategory } from './types';

export class CitationMapper {
  /**
   * Maps raw Bedrock retrieval result items into sanitized, validated Evidence items.
   * Deduplicates by sourceUri and content hash, and handles malformed metadata gracefully.
   */
  public static mapRetrievalResults(
    rawResults: any[],
    defaultCategory: KnowledgeCategory = 'SOP'
  ): Evidence[] {
    if (!Array.isArray(rawResults)) return [];

    const seenIdentifiers = new Set<string>();
    const mappedEvidence: Evidence[] = [];

    for (let i = 0; i < rawResults.length; i++) {
      const raw = rawResults[i];
      if (!raw || typeof raw !== 'object') continue;

      // Extract text content
      const snippet = typeof raw.content?.text === 'string' ? raw.content.text.trim() : '';
      if (!snippet) continue; // Skip empty chunks

      // Extract S3 URI and sanitize
      const rawUri =
        raw.location?.s3Location?.uri ||
        raw.sourceUri ||
        raw.metadata?.sourceUri ||
        's3://sentinel-knowledge-store/unspecified-source.md';
      const sourceUri = String(rawUri).trim();

      // Extract and sanitize metadata
      const rawMeta = (raw.metadata && typeof raw.metadata === 'object' ? raw.metadata : {}) as Record<string, unknown>;
      const documentTitle =
        typeof rawMeta.title === 'string' && rawMeta.title.trim()
          ? rawMeta.title.trim()
          : typeof raw.documentTitle === 'string' && raw.documentTitle.trim()
          ? raw.documentTitle.trim()
          : this.deriveTitleFromUri(sourceUri);

      const category = this.validateCategory(rawMeta.category, defaultCategory);
      const score = typeof raw.score === 'number' && !isNaN(raw.score) ? Math.min(1.0, Math.max(0.0, raw.score)) : 0.85;

      // Chunk ID
      const chunkId =
        typeof raw.chunkId === 'string' && raw.chunkId.trim()
          ? raw.chunkId.trim()
          : `ev-chunk-${i + 1}-${this.hashSnippet(snippet).slice(0, 8)}`;

      // Deduplication identifier (URI + snippet prefix)
      const dedupKey = `${sourceUri}::${snippet.slice(0, 64)}`;
      if (seenIdentifiers.has(dedupKey)) {
        continue; // Skip duplicate chunk
      }
      seenIdentifiers.add(dedupKey);

      const metadata: EvidenceMetadata = {
        documentTitle,
        sourceKey: this.extractS3Key(sourceUri),
        category,
        service: typeof rawMeta.service === 'string' ? rawMeta.service : undefined,
        lastUpdated: typeof rawMeta.lastUpdated === 'string' ? rawMeta.lastUpdated : new Date().toISOString(),
        version: typeof rawMeta.version === 'string' ? rawMeta.version : '1.0',
        tags: Array.isArray(rawMeta.tags) ? rawMeta.tags.map(String) : [],
      };

      mappedEvidence.push({
        chunkId,
        documentTitle,
        sourceUri,
        sourceType: 'BEDROCK_KNOWLEDGE_BASE',
        category,
        snippet,
        relevanceScore: Number(score.toFixed(3)),
        metadata,
        retrievedAt: new Date().toISOString(),
      });
    }

    // Sort by relevance score descending
    return mappedEvidence.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private static deriveTitleFromUri(uri: string): string {
    try {
      const parts = uri.split('/');
      const filename = parts[parts.length - 1] || 'S3 Runbook';
      return filename.replace(/[-_]/g, ' ').replace(/\.md$|\.txt$|\.json$/i, '');
    } catch {
      return 'Operational Runbook Documentation';
    }
  }

  private static extractS3Key(uri: string): string {
    return uri.replace(/^s3:\/\/[^/]+\//, '');
  }

  private static validateCategory(category: unknown, fallback: KnowledgeCategory): KnowledgeCategory {
    const valid: KnowledgeCategory[] = [
      'HISTORICAL_INCIDENT',
      'SOP',
      'POLICY',
      'RESOURCE_DOCUMENTATION',
      'RESOLUTION_REPORT',
    ];
    if (typeof category === 'string' && valid.includes(category as KnowledgeCategory)) {
      return category as KnowledgeCategory;
    }
    return fallback;
  }

  private static hashSnippet(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
