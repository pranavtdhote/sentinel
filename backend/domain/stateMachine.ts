import { IncidentStatus } from '@/lib/types/database';

export class InvalidStateTransitionError extends Error {
  constructor(
    public currentStatus: IncidentStatus,
    public attemptedStatus: IncidentStatus,
    public allowedTransitions: IncidentStatus[]
  ) {
    super(
      `Invalid state transition: Cannot transition from '${currentStatus}' to '${attemptedStatus}'. Allowed transitions: [${allowedTransitions.join(
        ', '
      )}]`
    );
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Sentinel State Machine Transition Map
 * Enforces: NEW → ANALYZING → ACTION_REQUIRED → IN_PROGRESS → RESOLVED → CLOSED
 * (Optional terminal/abort branch: CANCELLED)
 */
export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: ['ANALYZING', 'CANCELLED'],
  ANALYZING: ['ACTION_REQUIRED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  ACTION_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'ACTION_REQUIRED', 'CANCELLED'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
  // Legacy aliases supported for backward compatibility
  DETECTED: ['ANALYZING', 'INVESTIGATING', 'CANCELLED'],
  INVESTIGATING: ['ACTION_REQUIRED', 'IN_PROGRESS', 'MITIGATING', 'RESOLVED', 'CANCELLED'],
  MITIGATING: ['RESOLVED', 'ACTION_REQUIRED', 'CANCELLED'],
};

export function validateStateTransition(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus
): void {
  if (currentStatus === targetStatus) return; // No-op transition

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new InvalidStateTransitionError(currentStatus, targetStatus, allowed);
  }
}

export function canTransition(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus
): boolean {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}
