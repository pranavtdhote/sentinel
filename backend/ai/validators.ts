import { z } from 'zod';

export const AllowedToolNames = z.enum([
  'rollback_ecs_task_definition',
  'restart_ecs_service',
  'scale_auto_scaling_group',
  'toggle_feature_flag',
  'query_cloudwatch_insights',
  'verify_cloudwatch_alarm_state'
]);

export const IncidentTriageOutputSchema = z.object({
  rootCauseHypothesis: z.string().min(15).max(600),
  confidenceScore: z.number().min(0.0).max(1.0),
  primaryImpact: z.string().max(300),
  citedEvidenceIds: z.array(z.string()).min(1),
  recommendedStrategy: z.enum([
    'ROLLBACK_DEPLOYMENT',
    'SCALE_HORIZONTAL',
    'RESTART_SERVICE',
    'TOGGLE_FEATURE_FLAG',
    'ESCALATE_TO_DATABASE_TEAM'
  ]),
  technicalSummary: z.string().min(20).max(1200)
});

export type IncidentTriageOutput = z.infer<typeof IncidentTriageOutputSchema>;

export const ActionItemSchema = z.object({
  actionId: z.string(),
  order: z.number().int().positive(),
  toolName: AllowedToolNames,
  description: z.string().min(5).max(300),
  requiresApproval: z.boolean(),
  parameters: z.record(z.string(), z.any()),
  blastRadiusRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  rollbackStrategy: z.string().min(5)
});

export const ActionPlanOutputSchema = z.object({
  planSummary: z.string().min(15).max(500),
  overallRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  estimatedRecoveryMinutes: z.number().int().positive(),
  actions: z.array(ActionItemSchema).min(1).max(5)
});

export type ActionPlanOutput = z.infer<typeof ActionPlanOutputSchema>;

export const PostmortemOutputSchema = z.object({
  title: z.string(),
  executiveSummary: z.string().min(30),
  mttdMinutes: z.number(),
  mttmMinutes: z.number(),
  rootCauseAnalysis: z.string().min(50),
  timelineEntries: z.array(z.object({
    time: z.string(),
    description: z.string(),
    actor: z.string()
  })),
  preventativeItems: z.array(z.object({
    ticketId: z.string(),
    action: z.string(),
    owner: z.string(),
    priority: z.enum(['P0', 'P1', 'P2'])
  })),
  markdownReport: z.string().min(100)
});

export type PostmortemOutput = z.infer<typeof PostmortemOutputSchema>;

/**
 * Validates that all citations and proposed parameters are grounded in real evidence
 */
export function validateGrounding(
  output: IncidentTriageOutput,
  availableEvidenceIds: string[]
): { isValid: boolean; ungroundedIds: string[] } {
  const ungroundedIds = output.citedEvidenceIds.filter(
    (id) => !availableEvidenceIds.includes(id)
  );
  return {
    isValid: ungroundedIds.length === 0,
    ungroundedIds
  };
}
