import { z } from 'zod';
import { IncidentSeverity, IncidentStatus, UserRole } from './database';

export const IncidentSeverityEnum = z.enum([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'SEV1',
  'SEV2',
  'SEV3',
  'SEV4',
]);

export const IncidentStatusEnum = z.enum([
  'NEW',
  'ANALYZING',
  'ACTION_REQUIRED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
  'DETECTED',
  'INVESTIGATING',
  'MITIGATING',
]);

export const CreateIncidentRequestSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title exceeds maximum 200 characters')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),
  service: z
    .string()
    .min(2, 'Service must be at least 2 characters')
    .max(80, 'Service exceeds maximum 80 characters')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
  severity: IncidentSeverityEnum.default('CRITICAL'),
  summary: z
    .string()
    .min(5, 'Summary must be at least 5 characters')
    .max(2000, 'Summary exceeds maximum 2000 characters')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),
  category: z
    .string()
    .max(100)
    .optional()
    .default('Database / Storage')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),
  location: z
    .string()
    .max(100)
    .optional()
    .default('us-east-1')
    .transform((s) => s?.trim().replace(/<[^>]*>/g, '')),
  affectedUsers: z.number().int().nonnegative().optional().nullable(),
  rawAlertPayload: z.record(z.string(), z.any()).optional(),
  commander: z.string().email().default('prana@sentinel.internal'),
});

export type CreateIncidentRequest = z.infer<typeof CreateIncidentRequestSchema>;

export const PatchIncidentRequestSchema = z.object({
  title: z
    .string()
    .min(3)
    .max(200)
    .transform((s) => s.trim().replace(/<[^>]*>/g, ''))
    .optional(),
  summary: z
    .string()
    .min(5)
    .max(2000)
    .transform((s) => s.trim().replace(/<[^>]*>/g, ''))
    .optional(),
  service: z
    .string()
    .min(2)
    .max(80)
    .transform((s) => s.trim().replace(/<[^>]*>/g, ''))
    .optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  severity: IncidentSeverityEnum.optional(),
  status: IncidentStatusEnum.optional(),
  category: z
    .string()
    .max(100)
    .transform((s) => s.trim().replace(/<[^>]*>/g, ''))
    .optional(),
  location: z
    .string()
    .max(100)
    .transform((s) => s.trim().replace(/<[^>]*>/g, ''))
    .optional(),
  affectedUsers: z.number().int().nonnegative().nullable().optional(),
  commander: z.string().email().optional(),
  expectedVersion: z.number().int().positive('expectedVersion must be a positive integer'),
});

export type PatchIncidentRequest = z.infer<typeof PatchIncidentRequestSchema>;

export const AnalyzeIncidentRequestSchema = z.object({
  telemetrySnippet: z.string().max(3000).optional(),
  categoryHint: z.string().max(100).optional(),
  affectedUsersHint: z.number().int().nonnegative().optional(),
});

export type AnalyzeIncidentRequest = z.infer<typeof AnalyzeIncidentRequestSchema>;

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
  resolutionSummary: z
    .string()
    .min(5, 'Resolution summary must be at least 5 characters')
    .max(2000, 'Resolution summary exceeds maximum 2000 characters')
    .transform((s) => s.trim().replace(/<[^>]*>/g, '')),
  triggerPostmortemGeneration: z.boolean().default(true),
  expectedVersion: z.number().int().positive().optional(),
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
