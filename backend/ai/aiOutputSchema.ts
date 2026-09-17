import { z } from 'zod';

export const SeverityEnum = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export type SeverityType = z.infer<typeof SeverityEnum>;

export const ActionPriorityEnum = z.enum(['IMMEDIATE', 'NEXT', 'FOLLOW_UP']);
export type ActionPriorityType = z.infer<typeof ActionPriorityEnum>;

export const RootCauseHypothesisSchema = z.object({
  hypothesis: z.string().min(5).max(400),
  confidence: z.number().min(0).max(1),
  evidenceNeeded: z.array(z.string().min(2)).min(1),
});
export type RootCauseHypothesis = z.infer<typeof RootCauseHypothesisSchema>;

export const RecommendedActionSchema = z.object({
  action: z.string().min(5).max(300),
  priority: ActionPriorityEnum,
  requiresApproval: z.boolean(),
});
export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const AIOutputSchema = z.object({
  severity: SeverityEnum,
  category: z.string().min(2).max(100),
  confidence: z.number().min(0).max(1),
  affectedUsers: z.number().int().nonnegative().nullable(),
  slaMinutes: z.number().positive(),
  rootCauseHypotheses: z.array(RootCauseHypothesisSchema).min(1),
  recommendedActions: z.array(RecommendedActionSchema).min(1),
  reasoningSummary: z.string().min(10).max(600),
});

export type AIOutput = z.infer<typeof AIOutputSchema>;

export interface AnalysisInput {
  title: string;
  description: string;
  location: string;
  categoryHint?: string;
  affectedUsersHint?: number;
}
