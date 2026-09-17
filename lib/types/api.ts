import { z } from 'zod';
import { IncidentSeverity, IncidentStatus, UserRole } from './database';

export const CreateIncidentRequestSchema = z.object({
  title: z.string().min(5).max(150),
  service: z.string().min(2).max(80),
  environment: z.enum(['production', 'staging']).default('production'),
  severity: z.enum(['SEV1', 'SEV2', 'SEV3', 'SEV4']).default('SEV1'),
  summary: z.string().min(10).max(1000),
  category: z.string().optional().default('Database / Storage'),
  rawAlertPayload: z.record(z.string(), z.any()).optional(),
  commander: z.string().email().default('prana@sentinel.internal'),
});

export type CreateIncidentRequest = z.infer<typeof CreateIncidentRequestSchema>;

export const TriageIncidentRequestSchema = z.object({
  telemetrySnippet: z.string().optional(),
  knowledgeBaseId: z.string().optional(),
});

export type TriageIncidentRequest = z.infer<typeof TriageIncidentRequestSchema>;

export const ApproveActionRequestSchema = z.object({
  planId: z.string().min(1),
  actionId: z.string().min(1),
  decision: z.enum(['APPROVED', 'REJECTED']),
  approverEmail: z.string().email(),
  nonce: z.string().uuid(),
  timestamp: z.string().datetime(),
  signature: z.string().min(10),
});

export type ApproveActionRequest = z.infer<typeof ApproveActionRequestSchema>;

export const ResolveIncidentRequestSchema = z.object({
  resolutionSummary: z.string().min(10).max(1000),
  triggerPostmortemGeneration: z.boolean().default(true),
});

export type ResolveIncidentRequest = z.infer<typeof ResolveIncidentRequestSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  isFallbackSandbox?: boolean;
}
