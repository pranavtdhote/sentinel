'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Search,
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  Shield,
  Layers,
  AlertCircle,
  ExternalLink,
  History,
  FileCheck2,
  Info,
  X,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  type: 'SOP' | 'POLICY' | 'RESOURCE_DOCUMENTATION' | 'HISTORICAL_INCIDENT' | 'RESOLUTION_REPORT';
  source: string;
  version: string;
  syncStatus: 'SYNCED' | 'INDEXED_HEALTHY' | 'IN_PROGRESS' | 'PENDING_SYNC';
  lastUpdated: string;
  relatedIncidentCount: number;
  chunksCount: number;
  summary: string;
  s3Prefix: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<KnowledgeDoc['type']>('SOP');
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadSummary, setUploadSummary] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessNote, setUploadSuccessNote] = useState<string | null>(null);

  const fetchDocuments = () => {
    setLoading(true);
    fetch('/api/knowledge')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDocuments(json.data.documents || []);
        }
      })
      .catch((err) => console.error('Failed to fetch knowledge documents:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccessNote(null);

    // Validation
    if (!uploadTitle.trim() || !uploadFilename.trim() || !uploadSummary.trim() || !uploadContent.trim()) {
      setUploadError('All fields are required.');
      return;
    }

    if (!/\.(md|txt|json|pdf)$/i.test(uploadFilename)) {
      setUploadError('Invalid file extension. Permitted formats: .md, .txt, .json, .pdf');
      return;
    }

    const fileSizeBytes = new Blob([uploadContent]).size;
    if (fileSizeBytes > 5 * 1024 * 1024) {
      setUploadError('File size exceeds maximum 5MB limit.');
      return;
    }

    setUploadProgress(25);

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev && prev < 80 ? prev + 20 : prev));
      }, 150);

      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sentinel-actor-role': 'INCIDENT_COMMANDER',
        },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          filename: uploadFilename.trim(),
          type: uploadType,
          summary: uploadSummary.trim(),
          content: uploadContent.trim(),
          fileSizeBytes,
          version: 'v1.0',
        }),
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Upload failed');
      }

      setUploadSuccessNote(json.data.note);
      fetchDocuments();

      // Reset form fields after delay
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadFilename('');
        setUploadSummary('');
        setUploadContent('');
        setUploadProgress(null);
        setUploadSuccessNote(null);
      }, 2500);
    } catch (err: unknown) {
      setUploadProgress(null);
      setUploadError(err instanceof Error ? err.message : 'Upload submission failed');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (typeFilter !== 'ALL' && doc.type !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getTypeBadgeVariant = (type: KnowledgeDoc['type']): 'default' | 'amber' | 'destructive' | 'success' | 'outline' => {
    switch (type) {
      case 'SOP':
        return 'amber';
      case 'POLICY':
        return 'destructive';
      case 'RESOURCE_DOCUMENTATION':
        return 'default';
      case 'RESOLUTION_REPORT':
        return 'success';
      case 'HISTORICAL_INCIDENT':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                KNOWLEDGE BASE
              </span>
              <span className="text-ink-tertiary">AMAZON BEDROCK · S3 SOURCE OF TRUTH</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Engineering Knowledge & Runbooks
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Centralized S3 documentation repository providing zero-hallucination vector grounding for Bedrock RAG.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              variant="default"
              className="bg-ink-primary text-canvas hover:bg-ink-secondary font-mono-tech text-xs flex items-center space-x-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
            <input
              type="text"
              placeholder="Search by title, S3 key, or contents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-canvas border border-surface-border rounded-xs text-xs font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-ink-primary"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto font-mono-tech text-xs">
            {['ALL', 'SOP', 'POLICY', 'RESOURCE_DOCUMENTATION', 'RESOLUTION_REPORT', 'HISTORICAL_INCIDENT'].map(
              (filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setTypeFilter(filterKey)}
                  className={`px-2.5 py-1 rounded-xs border text-[11px] transition-editorial ${
                    typeFilter === filterKey
                      ? 'bg-amber-accent text-ink-primary border-amber-accent font-bold'
                      : 'bg-surface-subtle border-surface-border text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  {filterKey.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Document Cards */}
        {loading ? (
          <div className="p-12 text-center text-xs font-mono-tech text-ink-tertiary">
            Loading Knowledge Base documents from Amazon Bedrock...
          </div>
        ) : filteredDocs.length === 0 ? (
          <Card className="p-8 text-center font-mono-tech text-xs text-ink-tertiary">
            No matching knowledge base documents found.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredDocs.map((doc) => (
              <Card key={doc.id} className="hover:border-ink-secondary transition-editorial">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <h3 className="font-bold text-base font-sans text-ink-primary truncate max-w-xl">
                        {doc.title}
                      </h3>
                      <Badge variant="outline" className="font-mono-tech text-[10px]">
                        {doc.version}
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant={getTypeBadgeVariant(doc.type)} className="font-mono-tech text-[10px]">
                        {doc.type.replace('_', ' ')}
                      </Badge>

                      {doc.syncStatus === 'INDEXED_HEALTHY' || doc.syncStatus === 'SYNCED' ? (
                        <Badge variant="success" className="font-mono-tech text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          {doc.syncStatus}
                        </Badge>
                      ) : (
                        <Badge variant="amber" className="font-mono-tech text-[10px]">
                          <Clock className="w-3 h-3 mr-1" />
                          {doc.syncStatus}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-ink-secondary leading-relaxed font-sans mb-3">
                    {doc.summary}
                  </p>

                  {/* Required Properties Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-2.5 bg-surface-subtle/50 rounded-xs border border-surface-border font-mono-tech text-[11px] text-ink-secondary">
                    <div>
                      <span className="text-[10px] text-ink-tertiary block">S3 SOURCE URI</span>
                      <span className="text-ink-primary font-medium truncate block">{doc.source}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-tertiary block">RELATED INCIDENTS</span>
                      <span className="text-ink-primary font-bold">{doc.relatedIncidentCount} cited</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-tertiary block">VECTOR CHUNKS</span>
                      <span className="text-ink-primary">{doc.chunksCount} chunks indexed</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-ink-tertiary block">LAST UPDATED</span>
                      <span className="text-ink-primary truncate block">
                        {new Date(doc.lastUpdated).toLocaleDateString()} {new Date(doc.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Upload Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-ink-primary/40 backdrop-blur-xs flex items-center justify-center p-4">
            <Card className="w-full max-w-lg bg-canvas shadow-xl border border-surface-border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-lg">Upload Knowledge Document</CardTitle>
                  <CardDescription className="text-xs">
                    Files will be written to approved S3 prefix and queued for Bedrock vector indexing.
                  </CardDescription>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-ink-tertiary hover:text-ink-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-sans">
                  {uploadError && (
                    <div className="p-2.5 bg-danger/10 border border-danger/30 rounded-xs text-danger font-mono-tech text-[11px]">
                      {uploadError}
                    </div>
                  )}

                  {uploadSuccessNote && (
                    <div className="p-2.5 bg-success/10 border border-success/30 rounded-xs text-success font-mono-tech text-[11px]">
                      ✓ {uploadSuccessNote}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-ink-primary mb-1">Document Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Runbook: Aurora Failover Recovery"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full px-3 py-1.5 bg-canvas border border-surface-border rounded-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-ink-primary mb-1">Document Type</label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-canvas border border-surface-border rounded-xs focus:outline-none focus:border-ink-primary"
                      >
                        <option value="SOP">SOP</option>
                        <option value="POLICY">POLICY</option>
                        <option value="RESOURCE_DOCUMENTATION">RESOURCE DOCUMENTATION</option>
                        <option value="HISTORICAL_INCIDENT">HISTORICAL INCIDENT</option>
                        <option value="RESOLUTION_REPORT">RESOLUTION REPORT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-ink-primary mb-1">Filename (.md, .txt, .pdf)</label>
                      <input
                        type="text"
                        placeholder="aurora-recovery.md"
                        value={uploadFilename}
                        onChange={(e) => setUploadFilename(e.target.value)}
                        className="w-full px-3 py-1.5 bg-canvas border border-surface-border rounded-xs focus:outline-none focus:border-ink-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-ink-primary mb-1">Summary</label>
                    <textarea
                      rows={2}
                      placeholder="Brief operational purpose and target services..."
                      value={uploadSummary}
                      onChange={(e) => setUploadSummary(e.target.value)}
                      className="w-full px-3 py-1.5 bg-canvas border border-surface-border rounded-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-ink-primary mb-1">Markdown / Plaintext Content</label>
                    <textarea
                      rows={5}
                      placeholder="Paste markdown instructions, step-by-step procedures, or operational policy..."
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      className="w-full px-3 py-1.5 bg-canvas border border-surface-border rounded-xs font-mono-tech text-[11px] focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  {/* Sync Notice Alert */}
                  <div className="flex items-start space-x-2 p-2.5 bg-amber-accent/15 border border-amber-accent/40 rounded-xs text-[11px] font-mono-tech text-amber-900">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>
                      Notice: Upload writes to S3 prefix <code>uploads/{uploadType.toLowerCase().replace(/_/g, '-')}/</code>. Document will display as <strong>PENDING_SYNC</strong>. Searchability is not claimed until vector ingestion completes.
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono-tech">
                        <span>Uploading to S3...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-surface-border h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-accent h-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUploadModalOpen(false)}
                      disabled={uploadProgress !== null}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      disabled={uploadProgress !== null}
                      className="bg-ink-primary text-canvas"
                    >
                      Upload & Ingest
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
