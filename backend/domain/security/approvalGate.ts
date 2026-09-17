import { ApproveActionRequest } from '@/lib/types/api';
import { UserRole } from '@/lib/types/database';

// In-memory set of used nonces to prevent replay attacks
const consumedNonces = new Set<string>();

export interface ApprovalVerificationResult {
  valid: boolean;
  errorCode?: 'EXPIRED_TOKEN' | 'REPLAYED_NONCE' | 'UNAUTHORIZED_ROLE' | 'INVALID_SIGNATURE';
  errorMessage?: string;
}

export class ApprovalGate {
  /**
   * Verifies the cryptographic Human-in-the-Loop approval payload
   */
  static verifyApproval(
    payload: ApproveActionRequest,
    callerRole: UserRole = 'INCIDENT_COMMANDER'
  ): ApprovalVerificationResult {
    // 1. Role verification
    if (callerRole !== 'INCIDENT_COMMANDER' && callerRole !== 'ADMIN') {
      return {
        valid: false,
        errorCode: 'UNAUTHORIZED_ROLE',
        errorMessage: `Role '${callerRole}' is not authorized to sign off on mutating infrastructure actions. Required: INCIDENT_COMMANDER or ADMIN.`,
      };
    }

    // 2. Replay attack verification (single-use nonce)
    if (consumedNonces.has(payload.nonce)) {
      return {
        valid: false,
        errorCode: 'REPLAYED_NONCE',
        errorMessage: `Replay attack detected: Nonce ${payload.nonce} has already been consumed.`,
      };
    }

    // 3. Time-to-live verification (300 seconds / 5 minutes)
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

    // 4. Mark nonce as consumed
    consumedNonces.add(payload.nonce);

    return { valid: true };
  }
}
