# SENTINEL — Amazon Cognito Setup & Architecture Reference

This document outlines the Amazon Cognito User Pool configuration, groups, client settings, and identity provisioning for the SENTINEL incident intelligence platform.

---

## 1. Cognito User Pool Configuration

| Parameter | Configuration Value |
| :--- | :--- |
| **AWS Region** | `us-east-1` (Selected Project Region) |
| **User Pool Name** | `sentinel-user-pool` |
| **User Pool ID** | `us-east-1_Lz4flXPaw` |
| **Issuer URI** | `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Lz4flXPaw` |
| **Sign-in Attributes** | `email` |
| **Username Case Sensitivity**| False (Case-insensitive matching) |
| **Password Policy** | Minimum 8 characters, requiring numbers, uppercase, lowercase, and symbols |
| **Self-Registration** | Disabled / Administrator-controlled for hackathon security |

---

## 2. Cognito App Client Configuration

| Parameter | Configuration Value |
| :--- | :--- |
| **App Client Name** | `sentinel-web-client` |
| **App Client ID** | `15qk2aht7ivv8d4s676s18ieu0` |
| **Client Secret** | None (Public Client for browser/SPA integration) |
| **Allowed Auth Flows** | `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`, `ALLOW_USER_SRP_AUTH` |
| **Token Validity** | ID Token: 60 minutes, Access Token: 60 minutes, Refresh Token: 30 days |
| **Prevent User Existence Errors** | `ENABLED` |

---

## 3. Cognito User Groups (RBAC)

The User Pool defines four role-based groups. Membership in these groups determines the `cognito:groups` claim in emitted tokens:

| Group Name | Precedence | Mapped Sentinel Role | Conceptual Role Scope |
| :--- | :---: | :--- | :--- |
| `Admins` | `0` | `ADMIN` | Full configuration, knowledge admin, all incident powers |
| `Commanders` | `1` | `INCIDENT_COMMANDER` | AI analysis review, HITL mutating approvals, incident resolution |
| `Responders` | `2` | `RESPONDER` | Incident triage, telemetry investigation, read-only tools |
| `Viewers` | `3` | `VIEWER` | Read-only observation across dashboard, incidents, and analytics |

---

## 4. Provisioned Demo Users

For hackathon judging and evaluation, the following pre-configured demo users are actively provisioned:

| Email | Sentinel Role | Assigned Cognito Group | Purpose |
| :--- | :--- | :--- | :--- |
| `demo@sentinel.ai` | `INCIDENT_COMMANDER` | `Commanders` | Primary judge evaluation account (Approvals, Resolution) |
| `commander@sentinel.internal`| `INCIDENT_COMMANDER` | `Commanders` | Operational commander account |
| `responder@sentinel.ai` | `RESPONDER` | `Responders` | Responder evaluation account (Triage, No HITL approval) |
| `responder@sentinel.internal`| `RESPONDER` | `Responders` | Internal responder account |
| `admin@sentinel.ai` | `ADMIN` | `Admins` | Administrative oversight account |
| `admin@sentinel.internal` | `ADMIN` | `Admins` | Internal platform administrator |
| `viewer@sentinel.ai` | `VIEWER` | `Viewers` | Read-only auditor account (All mutations forbidden) |
| `viewer@sentinel.internal` | `VIEWER` | `Viewers` | Internal observer account |

> [!NOTE]
> All demo accounts have been provisioned with permanent status (`CONFIRMED`) and verified email attributes.

---

## 5. Token Structure & Verification

Sentinel uses standard OpenID Connect (OIDC) RS256 JSON Web Tokens (JWT) issued by Cognito:

1. **Token Use**: Sentinel primarily authenticates against the **ID Token**, which contains user profile attributes and group memberships.
2. **Key Claims**:
   - `sub`: Unique UUID representing the subject identity.
   - `email`: User email address.
   - `cognito:groups`: Array of Cognito groups (e.g. `["Commanders"]`).
   - `iss`: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Lz4flXPaw`.
   - `aud`: `15qk2aht7ivv8d4s676s18ieu0`.
   - `exp`: Expiration epoch timestamp.
3. **Verification**: Performed cryptographically via `aws-jwt-verify`:
   ```ts
   import { CognitoJwtVerifier } from 'aws-jwt-verify';

   const verifier = CognitoJwtVerifier.create({
     userPoolId: process.env.COGNITO_USER_POOL_ID!,
     tokenUse: 'id',
     clientId: process.env.COGNITO_CLIENT_ID!,
   });

   const payload = await verifier.verify(token);
   ```

---

## 6. AWS CLI Management Commands

To inspect or manage Cognito resources:

```bash
# List users in the User Pool
aws cognito-idp list-users \
  --user-pool-id us-east-1_Lz4flXPaw \
  --profile sentinel \
  --region us-east-1

# List groups in the User Pool
aws cognito-idp list-groups \
  --user-pool-id us-east-1_Lz4flXPaw \
  --profile sentinel \
  --region us-east-1

# Authenticate a user via AWS CLI (Test Login)
aws cognito-idp initiate-auth \
  --client-id 15qk2aht7ivv8d4s676s18ieu0 \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters USERNAME=demo@sentinel.ai,PASSWORD="<password>" \
  --profile sentinel \
  --region us-east-1
```
