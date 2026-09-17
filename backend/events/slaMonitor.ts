import { IncidentRecord, IncidentSeverity } from '@/lib/types/database';
import { SlaAlertPayload } from './eventTypes';

export interface SlaEvaluation {
  incidentId: string;
  severity: IncidentSeverity;
  slaMinutes: number;
  deadlineIso: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  percentageElapsed: number;
  status: 'HEALTHY' | 'APPROACHING' | 'BREACHED';
  shouldAlertApproaching: boolean;
  shouldAlertBreached: boolean;
}

export class SlaMonitor {
  // Sets to prevent duplicate alerts
  private static emittedApproachingAlerts = new Set<string>();
  private static emittedBreachAlerts = new Set<string>();

  /**
   * Resets alert deduplication state (used for testing)
   */
  public static resetAlertState(): void {
    this.emittedApproachingAlerts.clear();
    this.emittedBreachAlerts.clear();
  }

  /**
   * SLA resolution target minutes by severity
   */
  public static getSlaMinutes(severity: IncidentSeverity): number {
    switch (severity) {
      case 'CRITICAL':
      case 'SEV1':
        return 15;
      case 'HIGH':
      case 'SEV2':
        return 30;
      case 'MEDIUM':
      case 'SEV3':
        return 60;
      case 'LOW':
      case 'SEV4':
      default:
        return 120;
    }
  }

  /**
   * Calculates deadline timestamp for an incident
   */
  public static calculateDeadline(createdAt: string, severity: IncidentSeverity): string {
    const createdTime = new Date(createdAt).getTime();
    const slaMinutes = this.getSlaMinutes(severity);
    const deadlineTime = createdTime + slaMinutes * 60 * 1000;
    return new Date(deadlineTime).toISOString();
  }

  /**
   * Evaluates SLA status and determines if an alert must be dispatched
   */
  public static evaluateSla(
    incident: IncidentRecord,
    nowEpochMs: number = Date.now()
  ): SlaEvaluation {
    const slaMinutes = this.getSlaMinutes(incident.severity);
    const createdTime = new Date(incident.createdAt).getTime();
    const deadlineTime = createdTime + slaMinutes * 60 * 1000;
    const deadlineIso = new Date(deadlineTime).toISOString();

    const elapsedSeconds = Math.max(0, Math.floor((nowEpochMs - createdTime) / 1000));
    const totalSlaSeconds = slaMinutes * 60;
    const remainingSeconds = Math.max(0, Math.floor((deadlineTime - nowEpochMs) / 1000));
    const percentageElapsed = Math.min(100, Math.round((elapsedSeconds / totalSlaSeconds) * 100));

    // If incident is already resolved or closed, SLA is locked
    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(incident.status)) {
      return {
        incidentId: incident.incidentId,
        severity: incident.severity,
        slaMinutes,
        deadlineIso,
        elapsedSeconds,
        remainingSeconds: 0,
        percentageElapsed: Math.min(100, percentageElapsed),
        status: percentageElapsed > 100 ? 'BREACHED' : 'HEALTHY',
        shouldAlertApproaching: false,
        shouldAlertBreached: false,
      };
    }

    let status: 'HEALTHY' | 'APPROACHING' | 'BREACHED' = 'HEALTHY';
    let shouldAlertApproaching = false;
    let shouldAlertBreached = false;

    if (nowEpochMs >= deadlineTime) {
      status = 'BREACHED';
      if (!this.emittedBreachAlerts.has(incident.incidentId)) {
        shouldAlertBreached = true;
        this.emittedBreachAlerts.add(incident.incidentId);
      }
    } else if (percentageElapsed >= 75) {
      status = 'APPROACHING';
      if (!this.emittedApproachingAlerts.has(incident.incidentId)) {
        shouldAlertApproaching = true;
        this.emittedApproachingAlerts.add(incident.incidentId);
      }
    }

    return {
      incidentId: incident.incidentId,
      severity: incident.severity,
      slaMinutes,
      deadlineIso,
      elapsedSeconds,
      remainingSeconds,
      percentageElapsed,
      status,
      shouldAlertApproaching,
      shouldAlertBreached,
    };
  }

  /**
   * Helper to format SLA alert payload
   */
  public static createAlertPayload(evaluation: SlaEvaluation): SlaAlertPayload {
    return {
      severity: evaluation.severity,
      deadlineMinutes: evaluation.slaMinutes,
      elapsedSeconds: evaluation.elapsedSeconds,
      deadlineIso: evaluation.deadlineIso,
      percentageElapsed: evaluation.percentageElapsed,
      status: evaluation.status === 'BREACHED' ? 'BREACHED' : 'APPROACHING',
    };
  }
}
