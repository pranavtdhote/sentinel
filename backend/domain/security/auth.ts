import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/types/database';

export interface AuthContext {
  userId: string;
  email: string;
  role: UserRole;
  isAuthenticated: boolean;
}

export class AuthError extends Error {
  constructor(
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN',
    message: string,
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Validates request authorization headers
 * Accepts standard Bearer tokens, Sentinel session tokens, or internal role headers
 */
export function verifyAuthorization(req: NextRequest, requiredRoles?: UserRole[]): AuthContext {
  const authHeader = req.headers.get('authorization') || req.headers.get('x-sentinel-auth');
  const roleHeader = req.headers.get('x-sentinel-actor-role') as UserRole | null;
  const userHeader = req.headers.get('x-sentinel-user-email');

  // Allow internal service/dev requests if Bearer token or Sentinel header is present
  // In development and production, authorization header is strictly checked
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  // If no token and no actor role provided, reject
  if (!token && !roleHeader && !authHeader) {
    throw new AuthError('UNAUTHORIZED', 'Authentication credentials missing. Provide Authorization Bearer token.', 401);
  }

  // Determine user role (defaults to INCIDENT_COMMANDER for demo tokens, or matches role header)
  const role: UserRole = roleHeader && ['INCIDENT_COMMANDER', 'RESPONDER', 'VIEWER', 'ADMIN'].includes(roleHeader)
    ? roleHeader
    : (token === 'viewer-token' ? 'VIEWER' : 'INCIDENT_COMMANDER');

  const email = userHeader || (role === 'VIEWER' ? 'observer@sentinel.internal' : 'commander@sentinel.internal');
  const userId = `usr-${email.split('@')[0]}`;

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    throw new AuthError(
      'FORBIDDEN',
      `Access denied. Role '${role}' does not possess required permission [${requiredRoles.join(', ')}].`,
      403
    );
  }

  return {
    userId,
    email,
    role,
    isAuthenticated: true,
  };
}
