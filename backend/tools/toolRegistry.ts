import {
  ToolName,
  ToolNameEnum,
  SearchHistoricalIncidentsInputSchema,
  SearchOperationalKnowledgeInputSchema,
  GetAvailableRespondersInputSchema,
  GetResourcesInputSchema,
  CreateActionPlanInputSchema,
  AssignResponderInputSchema,
  UpdateIncidentInputSchema,
  SendIncidentNotificationInputSchema,
  GenerateResolutionReportInputSchema,
} from './schemas';
import { getIncidentRepository } from '../repositories';
import { KnowledgeBaseService } from '../rag/knowledgeBaseService';
import { UserRole } from '@/lib/types/database';
import { logger } from '@/lib/logging/logger';

export interface ToolCallContext {
  callerEmail: string;
  callerRole: UserRole;
  incidentId?: string;
  isHumanApproved?: boolean;
}

export interface ToolExecutionResponse {
  tool: ToolName;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED' | 'REQUIRES_APPROVAL' | 'UNAUTHORIZED';
  resultSummary: string;
  evidenceCount: number;
  data: Record<string, unknown>;
  awsRequestId: string;
  durationMs: number;
}

export class ToolRegistry {
  private static readonly kbService = new KnowledgeBaseService();

  /**
   * Fixed allowlist of permitted tools
   */
  public static isToolAllowed(toolName: string): toolName is ToolName {
    return ToolNameEnum.safeParse(toolName).success;
  }

  /**
   * Dispatches and executes a tool from the fixed allowlist
   */
  public static async executeTool(
    toolName: string,
    rawParameters: unknown,
    context: ToolCallContext
  ): Promise<ToolExecutionResponse> {
    const startTime = Date.now();
    const now = new Date().toISOString();
    const awsRequestId = `req-tool-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

    // 1. Enforce Fixed Allowlist
    if (!this.isToolAllowed(toolName)) {
      throw new Error(`Execution rejected: Tool '${toolName}' is not in Sentinel's permitted tool allowlist.`);
    }

    const repo = getIncidentRepository();

    try {
      let resultSummary = '';
      let evidenceCount = 0;
      let data: Record<string, unknown> = {};

      switch (toolName) {
        // 1. searchHistoricalIncidents
        case 'searchHistoricalIncidents': {
          const params = SearchHistoricalIncidentsInputSchema.parse(rawParameters);
          const allIncidents = await repo.listIncidents({ limit: 50 });
          const matches = allIncidents
            .filter((i) => {
              if (params.service && i.service !== params.service) return false;
              if (params.severity && i.severity !== params.severity) return false;
              const text = `${i.title} ${i.summary} ${i.category || ''}`.toLowerCase();
              return text.includes(params.query.toLowerCase());
            })
            .slice(0, params.limit);

          resultSummary = `Found ${matches.length} matching historical incident(s) for query: "${params.query}"`;
          evidenceCount = matches.length;
          data = { incidents: matches, count: matches.length };
          break;
        }

        // 2. searchOperationalKnowledge
        case 'searchOperationalKnowledge': {
          const params = SearchOperationalKnowledgeInputSchema.parse(rawParameters);
          const retrieval = await this.kbService.retrieveChunks(params.query, {
            category: params.category,
            maxResults: params.maxResults,
          });

          resultSummary = `Retrieved ${retrieval.chunks.length} knowledge chunk(s) from Knowledge Base ${retrieval.knowledgeBaseId}`;
          evidenceCount = retrieval.chunks.length;
          data = { chunks: retrieval.chunks, knowledgeBaseId: retrieval.knowledgeBaseId };
          break;
        }

        // 3. getAvailableResponders
        case 'getAvailableResponders': {
          const params = GetAvailableRespondersInputSchema.parse(rawParameters);
          const responders = [
            { email: 'prana@sentinel.internal', name: 'Pranav D.', role: 'INCIDENT_COMMANDER', onCall: true, primaryService: 'payment-checkout-service' },
            { email: 'sarah.m@sentinel.internal', name: 'Sarah M.', role: 'RESPONDER', onCall: true, primaryService: 'auth-service' },
            { email: 'alex.k@sentinel.internal', name: 'Alex K.', role: 'RESPONDER', onCall: false, primaryService: 'notification-service' },
          ].filter((r) => (!params.onCallOnly || r.onCall));

          resultSummary = `Identified ${responders.length} on-call engineer(s) for ${params.service}`;
          data = { responders, count: responders.length };
          break;
        }

        // 4. getResources
        case 'getResources': {
          const params = GetResourcesInputSchema.parse(rawParameters);
          const resources = {
            service: params.service,
            environment: params.environment,
            ecsCluster: `arn:aws:ecs:us-east-1:123456789012:cluster/${params.environment}-services`,
            taskDefinition: `${params.service}:49`,
            databaseEndpoint: 'aurora-pg-prod.c4z.us-east-1.rds.amazonaws.com:5432',
            albTargetGroup: `arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/${params.service}-tg`,
            cloudWatchAlarms: [`${params.service}-LatencyAlarm`, `${params.service}-5xxRate`],
          };

          resultSummary = `Resolved 5 AWS resource endpoints for service ${params.service} (${params.environment})`;
          evidenceCount = 5;
          data = { resources };
          break;
        }

        // 5. createActionPlan
        case 'createActionPlan': {
          const params = CreateActionPlanInputSchema.parse(rawParameters);

          // Verify incident existence (Model cannot invent IDs!)
          const existing = await repo.getIncident(params.incidentId);
          if (!existing) {
            throw new Error(`ResourceNotFound: Incident '${params.incidentId}' does not exist.`);
          }

          const planId = `plan-${Date.now().toString().slice(-6)}`;
          const plan = await repo.saveActionPlan({
            planId,
            incidentId: params.incidentId,
            generatedByModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            status: 'PENDING_APPROVAL',
            summary: params.summary,
            blastRadiusRisk: 'MEDIUM',
            blastRadiusDetail: `Action plan targeting ${existing.service}`,
            estimatedMitigationTime: '15m',
            actions: params.actions.map((act, idx) => ({
              actionId: `act-${planId}-${idx + 1}`,
              order: idx + 1,
              toolName: act.toolName,
              description: act.description,
              parameters: act.parameters,
              requiresApproval: act.requiresApproval,
              status: 'PENDING_APPROVAL',
            })),
          });

          resultSummary = `Created remediation plan ${planId} with ${params.actions.length} action(s). Human approval required.`;
          data = { actionPlan: plan };
          break;
        }

        // 6. assignResponder
        case 'assignResponder': {
          const params = AssignResponderInputSchema.parse(rawParameters);
          const existing = await repo.getIncident(params.incidentId);
          if (!existing) {
            throw new Error(`ResourceNotFound: Incident '${params.incidentId}' does not exist.`);
          }

          const updated = await repo.patchIncident(
            params.incidentId,
            { commander: params.responderEmail },
            existing.version
          );

          resultSummary = `Assigned ${params.responderEmail} as ${params.role} for incident ${params.incidentId}`;
          data = { incident: updated, assignedTo: params.responderEmail };
          break;
        }

        // 7. updateIncident
        case 'updateIncident': {
          const params = UpdateIncidentInputSchema.parse(rawParameters);
          const existing = await repo.getIncident(params.incidentId);
          if (!existing) {
            throw new Error(`ResourceNotFound: Incident '${params.incidentId}' does not exist.`);
          }

          const { incidentId, expectedVersion, ...updates } = params;
          const updated = await repo.patchIncident(incidentId, updates, expectedVersion);

          resultSummary = `Updated incident ${incidentId} to status ${updated.status} (version ${updated.version})`;
          data = { incident: updated };
          break;
        }

        // 8. sendIncidentNotification
        case 'sendIncidentNotification': {
          const params = SendIncidentNotificationInputSchema.parse(rawParameters);
          const messageId = `msg-sns-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

          resultSummary = `Dispatched ${params.priority} notification to ${params.channel} (Message ID: ${messageId})`;
          data = {
            messageId,
            channel: params.channel,
            incidentId: params.incidentId,
            delivered: true,
          };
          break;
        }

        // 9. generateResolutionReport
        case 'generateResolutionReport': {
          const params = GenerateResolutionReportInputSchema.parse(rawParameters);
          const existing = await repo.getIncident(params.incidentId);
          if (!existing) {
            throw new Error(`ResourceNotFound: Incident '${params.incidentId}' does not exist.`);
          }

          const reportS3Key = `postmortems/${params.incidentId}-retrospective.md`;
          const reportsBucket = process.env.S3_REPORTS_BUCKET || 'sentinel-reports-090686622776';
          const reportUrl = `https://${reportsBucket}.s3.amazonaws.com/${reportS3Key}`;
          const updated = await repo.setResolution(
            params.incidentId,
            reportUrl,
            params.mttmSeconds || 280
          );

          resultSummary = `Compiled resolution retrospective and published to S3: ${reportS3Key}`;
          data = { incident: updated, reportUrl, reportS3Key };
          break;
        }
      }

      const durationMs = Date.now() - startTime;

      // 2. Audit every tool execution in repository
      const targetIncidentId = context.incidentId || (data.incidentId as string) || (rawParameters as any)?.incidentId || 'system';
      if (targetIncidentId && targetIncidentId !== 'system') {
        try {
          await repo.addAuditLog({
            auditId: `aud-tool-${Date.now()}`,
            incidentId: targetIncidentId,
            eventType: 'ACTION_APPROVED_AND_EXECUTED',
            actor: { email: context.callerEmail, role: context.callerRole },
            toolName,
            executionOutput: {
              resultSummary,
              awsRequestId,
              durationMs,
            },
            timestamp: now,
          });
        } catch {
          // Ignore audit write errors for mock tools
        }
      }

      logger.info('Tool executed successfully', {
        tool: toolName,
        durationMs,
        awsRequestId,
        caller: context.callerEmail,
      });

      return {
        tool: toolName,
        timestamp: now,
        status: 'SUCCESS',
        resultSummary,
        evidenceCount,
        data,
        awsRequestId,
        durationMs,
      };
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : 'Tool execution failed';

      logger.error('Tool execution error', {
        tool: toolName,
        error: message,
        durationMs,
      });

      return {
        tool: toolName,
        timestamp: now,
        status: 'FAILED',
        resultSummary: message,
        evidenceCount: 0,
        data: { error: message },
        awsRequestId,
        durationMs,
      };
    }
  }
}
