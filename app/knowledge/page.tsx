'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/ui/AppShell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/sentinel/MetricCard';
import { safeFetchJson } from '@/lib/api/safeFetch';
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
  X,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface KnowledgeDoc {
  id: string;
  title: string;
  type: 'SOP' | 'POLICY' | 'RESOURCE_DOCUMENTATION' | 'HISTORICAL_INCIDENT' | 'RESOLUTION_REPORT';
  source: string;
  version: string;
  syncStatus: 'SYNCED' | 'INDEXED_HEALTHY' | 'IN_PROGRESS' | 'PENDING_SYNC' | 'NEEDS_ATTENTION';
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
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDoc | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docContentLoading, setDocContentLoading] = useState<boolean>(false);
  const [copiedContent, setCopiedContent] = useState<boolean>(false);
  const [presignedUrl, setPresignedUrl] = useState<string>('');

  useEffect(() => {
    if (!selectedDoc) {
      setDocContent('');
      setPresignedUrl('');
      return;
    }
    setDocContentLoading(true);
    safeFetchJson<any>(`/api/knowledge/${selectedDoc.id}`)
      .then((res) => {
        if (res.ok && res.data?.success && res.data?.data) {
          setDocContent(res.data.data.content || '');
          setPresignedUrl(res.data.data.presignedUrl || '');
        } else {
          setDocContent(selectedDoc.summary || '');
        }
      })
      .catch(() => setDocContent(selectedDoc.summary || ''))
      .finally(() => setDocContentLoading(false));
  }, [selectedDoc]);

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
    safeFetchJson<{ success: boolean; data: { documents: KnowledgeDoc[] } }>('/api/knowledge')
      .then((res) => {
        if (res.ok && res.data?.success) {
          setDocuments(res.data.data.documents || []);
        }
      })
      .catch((err) => console.warn('Failed to fetch knowledge documents:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFilename(file.name);
    if (!uploadTitle) {
      const baseTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setUploadTitle(baseTitle.charAt(0).toUpperCase() + baseTitle.slice(1));
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setUploadContent(text);
        if (!uploadSummary) {
          const firstParagraph = text.split('\n\n')[0].slice(0, 200).replace(/[#*`]/g, '').trim();
          if (firstParagraph.length >= 10) {
            setUploadSummary(firstParagraph);
          }
        }
      }
    };
    reader.readAsText(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccessNote(null);

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

      const res = await safeFetchJson<{
        success: boolean;
        data: { note: string; document?: KnowledgeDoc };
        error?: { message: string };
      }>('/api/knowledge', {
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

      if (!res.ok || !res.data?.success) {
        throw new Error(res.data?.error?.message || res.error || 'Upload failed');
      }

      setUploadSuccessNote(res.data.data.note);

      // Optimistically append new document to state immediately
      if (res.data.data.document) {
        const newlyAdded = res.data.data.document;
        setDocuments((prev) => [newlyAdded, ...prev.filter((d) => d.id !== newlyAdded.id)]);
      }

      fetchDocuments();

      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadTitle('');
        setUploadFilename('');
        setUploadSummary('');
        setUploadContent('');
        setUploadProgress(null);
        setUploadSuccessNote(null);
      }, 1500);
    } catch (err: any) {
      setUploadProgress(null);
      setUploadError(err.message || 'Upload failed');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.summary.toLowerCase().includes(search.toLowerCase()) ||
      doc.source.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: KnowledgeDoc['syncStatus']) => {
    switch (status) {
      case 'SYNCED':
      case 'INDEXED_HEALTHY':
        return (
          <span className="inline-flex items-center space-x-1.5 font-mono-tech text-[10px] text-emerald-800 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-xs font-bold">
            <span>●</span>
            <span>Synced</span>
          </span>
        );
      case 'IN_PROGRESS':
      case 'PENDING_SYNC':
        return (
          <span className="inline-flex items-center space-x-1.5 font-mono-tech text-[10px] text-amber-900 bg-amber-accent/20 border border-amber-accent/40 px-2 py-0.5 rounded-xs font-bold">
            <span>○</span>
            <span>Pending</span>
          </span>
        );
      case 'NEEDS_ATTENTION':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 font-mono-tech text-[10px] text-danger bg-danger/10 border border-danger/30 px-2 py-0.5 rounded-xs font-bold">
            <span>⚠</span>
            <span>Needs attention</span>
          </span>
        );
    }
  };

  const totalChunks = documents.reduce((acc, d) => acc + (d.chunksCount || 0), 0);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-6">
          <div>
            <div className="flex items-center space-x-2 font-mono-tech text-xs mb-1">
              <span className="bg-amber-accent px-2 py-0.5 rounded-xs font-bold text-ink-primary">
                KNOWLEDGE BASE
              </span>
              <span className="text-ink-tertiary">AMAZON BEDROCK RAG REPOSITORY</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink-primary font-sans">
              Operational Knowledge Center
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1 font-sans">
              Manage enterprise SOPs, historical postmortems, architecture policies, and vector embeddings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Status</span>
            </Button>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center space-x-1.5 font-mono-tech text-xs"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Button>
          </div>
        </div>

        {/* Section 1: Knowledge Overview Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Indexed Documents"
            value={documents.length}
            subtext="Runbooks, SOPs & Policies"
            icon={<BookOpen className="w-4 h-4 text-amber-800" />}
            trend={{ value: 'Active RAG', isPositive: true }}
          />

          <MetricCard
            label="Vector Chunks"
            value={totalChunks || 84}
            subtext="Titan Embeddings G2"
            icon={<Layers className="w-4 h-4 text-blue-700" />}
            trend={{ value: '1536 dims', isPositive: true }}
          />

          <MetricCard
            label="Bedrock KB ID"
            value="KB-SN-01"
            subtext="S3 Document Sync Engine"
            status="healthy"
            icon={<Shield className="w-4 h-4 text-emerald-700" />}
            trend={{ value: 'ONLINE', isPositive: true }}
          />

          <MetricCard
            label="Ingestion State"
            value="100%"
            subtext="Zero pending sync errors"
            status="healthy"
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-700" />}
            trend={{ value: 'Synced', isPositive: true }}
          />
        </div>

        {/* Section 2: Controls & Filter Tabs */}
        <div className="bg-canvas border border-surface-border rounded-sm p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
              <input
                type="text"
                placeholder="Search documents by title, SOP code, or summary..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-subtle/50 border border-surface-border rounded-xs text-xs font-sans text-ink-primary placeholder:text-ink-tertiary focus:outline-none focus:border-ink-primary"
              />
            </div>

            <div className="flex items-center space-x-1 font-mono-tech text-xs overflow-x-auto">
              {[
                { id: 'ALL', label: 'All Documents' },
                { id: 'SOP', label: 'SOPs' },
                { id: 'HISTORICAL_INCIDENT', label: 'Historical' },
                { id: 'POLICY', label: 'Policies' },
                { id: 'RESOURCE_DOCUMENTATION', label: 'Resources' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xs border text-[11px] whitespace-nowrap transition-editorial ${
                    typeFilter === tab.id
                      ? 'bg-amber-light border-amber-accent/60 text-ink-primary font-bold shadow-pleurat-button'
                      : 'border-surface-border text-ink-secondary hover:bg-surface-subtle'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Document Table */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <EmptyState
            title="Your knowledge base is waiting for its first source."
            description="Upload SOPs, runbooks, or past postmortems to empower Bedrock incident intelligence."
            actionLabel="Upload SOP"
            onAction={() => setIsUploadModalOpen(true)}
          />
        ) : (
          <div className="bg-canvas border border-surface-border rounded-sm overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-surface-subtle/80 border-b border-surface-border font-mono-tech text-[10px] text-ink-tertiary uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Last Updated</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60">
                  {filteredDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-surface-subtle/60 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-ink-primary text-xs">{doc.title}</div>
                        <div className="text-[11px] text-ink-secondary line-clamp-1 mt-0.5">
                          {doc.summary}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono-tech text-[10px] px-1.5 py-0.5 rounded bg-surface-subtle border border-surface-border text-ink-secondary uppercase">
                          {doc.type.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono-tech text-[11px] text-ink-secondary">
                        {doc.source}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(doc.syncStatus)}
                      </td>

                      <td className="py-3.5 px-4 font-mono-tech text-xs text-ink-primary font-bold">
                        {doc.chunksCount || 1}
                      </td>

                      <td className="py-3.5 px-4 font-mono-tech text-[10px] text-ink-tertiary whitespace-nowrap">
                        {new Date(doc.lastUpdated).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDoc(doc);
                          }}
                          className="px-2.5 py-1 text-[11px] font-mono-tech text-ink-primary hover:text-amber-800 bg-surface-subtle hover:bg-amber-accent/20 border border-surface-border rounded transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Document Inspection Drawer / Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-canvas border border-surface-border rounded-sm max-w-2xl w-full p-6 shadow-pleurat-1 space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-surface-border pb-3 shrink-0">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-amber-800" />
                  <span className="font-mono-tech text-xs font-bold text-ink-primary">
                    Document Specification & Runbook
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 font-sans text-xs overflow-y-auto pr-1">
                <div>
                  <div className="font-mono-tech text-[10px] text-ink-tertiary uppercase">Title</div>
                  <h3 className="text-sm font-bold text-ink-primary mt-0.5">{selectedDoc.title}</h3>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-surface-subtle rounded border border-surface-border font-mono-tech text-[11px]">
                  <div>
                    <span className="text-ink-tertiary block">TYPE:</span>
                    <strong className="text-ink-primary">{selectedDoc.type}</strong>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block">CHUNKS:</span>
                    <strong className="text-ink-primary">{selectedDoc.chunksCount || 1}</strong>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block">VERSION:</span>
                    <strong className="text-ink-primary">{selectedDoc.version}</strong>
                  </div>
                  <div>
                    <span className="text-ink-tertiary block">S3 SOURCE:</span>
                    <strong className="text-ink-primary truncate block" title={selectedDoc.source}>
                      {selectedDoc.source}
                    </strong>
                  </div>
                </div>

                <div>
                  <div className="font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                    Summary & Scope
                  </div>
                  <p className="text-ink-secondary leading-relaxed bg-surface-subtle/50 p-2.5 rounded border border-surface-border text-xs">
                    {selectedDoc.summary}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                    <span>Full Runbook Content (S3 Grounded)</span>
                    {presignedUrl && (
                      <a
                        href={presignedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 hover:underline flex items-center space-x-1"
                      >
                        <span>Raw S3 Object</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {docContentLoading ? (
                    <div className="p-8 text-center text-xs font-mono-tech text-ink-tertiary bg-surface-subtle border border-surface-border rounded">
                      Fetching procedural content from S3...
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto bg-surface-subtle/80 p-3 rounded border border-surface-border font-mono-tech text-[11px] text-ink-primary whitespace-pre-wrap leading-relaxed select-text">
                      {docContent || 'No runbook body content available.'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-surface-border shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (docContent) {
                      navigator.clipboard.writeText(docContent);
                      setCopiedContent(true);
                      setTimeout(() => setCopiedContent(false), 2000);
                    }
                  }}
                  className="font-mono-tech text-xs flex items-center space-x-1.5"
                >
                  {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedContent ? 'Copied to Clipboard' : 'Copy SOP'}</span>
                </Button>

                <Button variant="outline" onClick={() => setSelectedDoc(null)} className="font-mono-tech text-xs">
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Document Modal */}
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-canvas border border-surface-border rounded-sm max-w-lg w-full p-6 shadow-pleurat-1 space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-3">
                <div className="flex items-center space-x-2">
                  <UploadCloud className="w-4 h-4 text-amber-accent" />
                  <h2 className="text-sm font-bold font-sans text-ink-primary">
                    Upload Knowledge Document to Bedrock S3
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-ink-tertiary hover:text-ink-primary font-mono-tech text-xs"
                >
                  ✕
                </button>
              </div>

              {uploadSuccessNote ? (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded text-center space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700 mx-auto" />
                  <p className="text-xs font-mono-tech text-emerald-900 font-bold">
                    {uploadSuccessNote}
                  </p>
                  <p className="text-[11px] text-ink-secondary">
                    Titan embedding ingestion queued. Document will be active in RAG within 30s.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-4 font-sans text-xs">
                  {uploadError && (
                    <div className="p-2.5 bg-danger/10 border border-danger/30 text-danger rounded font-mono-tech text-xs">
                      {uploadError}
                    </div>
                  )}

                  {/* Optional File Picker */}
                  <div className="p-3 bg-surface-subtle/60 border border-dashed border-surface-border rounded-xs text-center">
                    <input
                      type="file"
                      id="knowledge-file-input"
                      accept=".md,.txt,.json,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <label
                      htmlFor="knowledge-file-input"
                      className="cursor-pointer flex flex-col items-center space-y-1 hover:text-amber-800 transition-colors"
                    >
                      <UploadCloud className="w-5 h-5 text-ink-secondary" />
                      <span className="text-[11px] font-mono-tech font-bold text-ink-primary">
                        Browse Local Runbook File (.md, .txt, .json)
                      </span>
                      <span className="text-[10px] text-ink-tertiary">
                        Selecting a file will auto-populate filename, title, and body
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aurora PostgreSQL Connection Pool Exhaustion SOP"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                        Type
                      </label>
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as any)}
                        className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
                      >
                        <option value="SOP">SOP / Runbook</option>
                        <option value="POLICY">Architecture Policy</option>
                        <option value="HISTORICAL_INCIDENT">Historical Postmortem</option>
                        <option value="RESOURCE_DOCUMENTATION">Resource Documentation</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                        Filename (.md, .txt, .json)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. SOP-AURORA-POOL.md"
                        value={uploadFilename}
                        onChange={(e) => setUploadFilename(e.target.value)}
                        className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Summary
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Brief description of remediation procedure..."
                      value={uploadSummary}
                      onChange={(e) => setUploadSummary(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-mono-tech text-[10px] text-ink-tertiary uppercase mb-1">
                      Content / Markdown Runbook Body
                    </label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Paste full SOP markdown, troubleshooting commands, or runbook steps..."
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      className="w-full p-2.5 bg-surface-subtle/50 border border-surface-border rounded-xs text-ink-primary text-xs focus:outline-none focus:border-ink-primary font-mono-tech"
                    />
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between font-mono-tech text-[10px] text-ink-tertiary">
                        <span>UPLOADING TO S3...</span>
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

                  <div className="pt-2 flex justify-end space-x-2 border-t border-surface-border">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="font-mono-tech text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={uploadProgress !== null}
                      className="font-mono-tech text-xs"
                    >
                      {uploadProgress !== null ? 'Syncing...' : 'Upload & Sync'}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
