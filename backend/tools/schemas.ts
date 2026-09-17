import { z } from 'zod';

export const ToolNameEnum = z.enum([
  'searchHistoricalIncidents',
  'searchOperationalKnowledge',
  'getAvailableResponders',
  'getResources',
  'createActionPlan',
  'assignResponder',
  'updateIncident',
  'sendIncidentNotification',
  'generateResolutionReport',
]);
export type ToolName = z.infer<typeof ToolNameEnum>;

// 1. searchHistoricalIncidents
export const SearchHistoricalIncidentsInputSchema = z.object({
  query: z.string().min(2).max(200),
  limit: z.number().int().min(1).max(10).default(5),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SEV1', 'SEV2', 'SEV3', 'SEV4']).optional(),
  service: z.string().max(100).optional(),
});
export type SearchHistoricalIncidentsInput = z.infer<typeof SearchHistoricalIncidentsInputSchema>;

// 2. searchOperationalKnowledge
export const SearchOperationalKnowledgeInputSchema = z.object({
  query: z.string().min(2).max(300),
  category: z.enum(['HISTORICAL_INCIDENT', 'SOP', 'POLICY', 'RESOURCE_DOCUMENTATION', 'RESOLUTION_REPORT']).default('SOP'),
  maxResults: z.number().int().min(1).max(10).default(4),
});
export type SearchOperationalKnowledgeInput = z.infer<typeof SearchOperationalKnowledgeInputSchema>;

// 3. getAvailableResponders
export const GetAvailableRespondersInputSchema = z.object({
  service: z.string().min(2).max(100),
  onCallOnly: z.boolean().default(true),
});
export type GetAvailableRespondersInput = z.infer<typeof GetAvailableRespondersInputSchema>;

// 4. getResources
export const GetResourcesInputSchema = z.object({
  service: z.string().min(2).max(100),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
});
export type GetResourcesInput = z.infer<typeof GetResourcesInputSchema>;

// 5. createActionPlan
export const CreateActionPlanInputSchema = z.object({
  incidentId: z.string().min(3),
  title: z.string().min(5).max(200),
  summary: z.string().min(10).max(1000),
  actions: z.array(
    z.object({
      description: z.string().min(5).max(300),
      toolName: z.string().min(2).max(100),
      parameters: z.record(z.string(), z.unknown()),
      requiresApproval: z.boolean(),
    })
  ).min(1),
});
export type CreateActionPlanInput = z.infer<typeof CreateActionPlanInputSchema>;

// 6. assignResponder
export const AssignResponderInputSchema = z.object({
  incidentId: z.string().min(3),
  responderEmail: z.string().email(),
  role: z.enum(['INCIDENT_COMMANDER', 'RESPONDER', 'VIEWER', 'ADMIN']).default('INCIDENT_COMMANDER'),
});
export type AssignResponderInput = z.infer<typeof AssignResponderInputSchema>;

// 7. updateIncident
export const UpdateIncidentInputSchema = z.object({
  incidentId: z.string().min(3),
  status: z.enum(['NEW', 'ANALYZING', 'ACTION_REQUIRED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']).optional(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  summary: z.string().max(2000).optional(),
  expectedVersion: z.number().int().positive(),
});
export type UpdateIncidentInput = z.infer<typeof UpdateIncidentInputSchema>;

// 8. sendIncidentNotification
export const SendIncidentNotificationInputSchema = z.object({
  incidentId: z.string().min(3),
  channel: z.enum(['SNS', 'SLACK', 'PAGERDUTY']),
  priority: z.enum(['URGENT', 'HIGH', 'NORMAL']),
  message: z.string().min(5).max(1000),
});
export type SendIncidentNotificationInput = z.infer<typeof SendIncidentNotificationInputSchema>;

// 9. generateResolutionReport
export const GenerateResolutionReportInputSchema = z.object({
  incidentId: z.string().min(3),
  resolutionSummary: z.string().min(10).max(2000),
  mttmSeconds: z.number().int().positive().optional(),
});
export type GenerateResolutionReportInput = z.infer<typeof GenerateResolutionReportInputSchema>;
