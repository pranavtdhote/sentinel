import { ApproveActionRequest } from '@/lib/types/api';
import { UserRole } from '@/lib/types/database';

// In-memory set of used nonces to prevent replay attacks
const consumedNonces = new Set<string>();

export interface ApprovalVerificationResult {
  valid: boolean;
  errorCode?:
    | 'EXPIRED_TOKEN'
    | 'REPLAYED_NONCE'
    | 'UNAUTHORIZED_ROLE'
    | 'STALE_APPROVAL'
    | 'INVALID_SIGNATURE'
    | 'REJECTED_ACTION';
  errorMessage?: string;
  approverEmail?: string;
  verifiedAt?: string;
}

export interface VersionedApprovalContext {
  incidentVersion?: number;
  expectedIncidentVersion?: number;
  actionVersion?: number;
  expectedActionVersion?: number;
}

export class ApprovalGate {
  /**
   * Clears consumed nonces (primarily used for unit/integration testing)
   */
  public static clearConsumedNonces(): void {
    consumedNonces.clear();
  }

  /**
   * Verifies the cryptographic Human-in-the-Loop approval payload
   * Tied to incident version and action version to prevent stale approvals
   */
  public static verifyApproval(
    payload: ApproveActionRequest,
    callerRole: UserRole = 'INCIDENT_COMMANDER',
    versionContext?: VersionedApprovalContext
  ): ApprovalVerificationResult {
    // 1. Role verification (only INCIDENT_COMMANDER and ADMIN can approve mutating actions)
    if (callerRole !== 'INCIDENT_COMMANDER' && callerRole !== 'ADMIN') {
      return {
        valid: false,
        errorCode: 'UNAUTHORIZED_ROLE',
        errorMessage: `Role '${callerRole}' is not authorized to sign off on mutating infrastructure actions. Required: INCIDENT_COMMANDER or ADMIN.`,
      };
    }

    // 2. Decision check (if explicit REJECTED decision, fail approval verification gracefully)
    if (payload.decision === 'REJECTED') {
      return {
        valid: false,
        errorCode: 'REJECTED_ACTION',
        errorMessage: 'Action was explicitly rejected by Incident Commander.',
        approverEmail: payload.approverEmail,
      };
    }

    // 3. Replay attack verification (single-use nonce)
    if (consumedNonces.has(payload.nonce)) {
      return {
        valid: false,
        errorCode: 'REPLAYED_NONCE',
        errorMessage: `Replay attack detected: Nonce ${payload.nonce} has already been consumed.`,
      };
    }

    // 4. Time-to-live verification (300 seconds / 5 minutes)
    const payloadTime = new Date(payload.timestamp).getTime();
    const now = Date.now();
    const ageSeconds = Math.abs(now - payloadTime) / 1000;

    if (ageSeconds > 300) {
      return {
        valid: false,
        errorCode: 'EXPIRED_TOKEN',
        errorMessage: `Approval token has expired (${Math.round(ageSeconds)}s old). Maximum allowed window is 300s.`,
      };
    }

    // 5. Version tie-in check (Reject stale approvals if underlying incident or action state advanced)
    if (
      versionContext?.expectedIncidentVersion !== undefined &&
      versionContext?.incidentVersion !== undefined &&
      versionContext.incidentVersion !== versionContext.expectedIncidentVersion
    ) {
      return {
        valid: false,
        errorCode: 'STALE_APPROVAL',
        errorMessage: `Stale approval rejected: Incident version changed from ${versionContext.expectedIncidentVersion} to ${versionContext.incidentVersion}.`,
      };
    }

    if (
      versionContext?.expectedActionVersion !== undefined &&
      versionContext?.actionVersion !== undefined &&
      versionContext.actionVersion !== versionContext.expectedActionVersion
    ) {
      return {
        valid: false,
        errorCode: 'STALE_APPROVAL',
        errorMessage: `Stale approval rejected: Action plan version changed from ${versionContext.expectedActionVersion} to ${versionContext.actionVersion}.`,
      };
    }

    // 6. Mark nonce as consumed
    consumedNonces.add(payload.nonce);

    return {
      valid: true,
      approverEmail: payload.approverEmail,
      verifiedAt: new Date().toISOString(),
    };
  }
}
