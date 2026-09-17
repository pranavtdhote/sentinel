import {
  IncidentRecord,
  FullIncidentBundle,
  IncidentSeverity,
  IncidentStatus,
} from '@/lib/types/database';
import {
  CreateIncidentRequest,
  ApproveActionRequest,
  ResolveIncidentRequest,
  ApiResponse,
} from '@/lib/types/api';

class ApiClient {
  private async fetchJson<T>(url: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(
        errorJson.error?.message || `Request failed with status ${res.status}: ${res.statusText}`
      );
    }
    return res.json();
  }

  incidents = {
    list: async (filters?: { status?: IncidentStatus; severity?: IncidentSeverity }): Promise<IncidentRecord[]> => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.severity) params.set('severity', filters.severity);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await this.fetchJson<{ items: IncidentRecord[] }>(`/api/incidents${queryString}`);
      return res.data?.items || [];
    },

    get: async (incidentId: string): Promise<FullIncidentBundle> => {
      const res = await this.fetchJson<FullIncidentBundle>(`/api/incidents/${incidentId}`);
      if (!res.data) throw new Error(`Incident ${incidentId} not found`);
      return res.data;
    },

    create: async (payload: CreateIncidentRequest): Promise<IncidentRecord> => {
      const res = await this.fetchJson<IncidentRecord>('/api/incidents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.data) throw new Error('Failed to create incident');
      return res.data;
    },

    triage: async (incidentId: string, telemetrySnippet?: string): Promise<{ incident: IncidentRecord; triage: unknown; evidence: unknown[] }> => {
      const res = await this.fetchJson<{ incident: IncidentRecord; triage: unknown; evidence: unknown[] }>(
        `/api/incidents/${incidentId}/triage`,
        {
          method: 'POST',
          body: JSON.stringify({ telemetrySnippet }),
        }
      );
      if (!res.data) throw new Error('Triage failed');
      return res.data;
    },

    generatePlan: async (incidentId: string): Promise<unknown> => {
      const res = await this.fetchJson<unknown>(`/api/incidents/${incidentId}/action-plans`, {
        method: 'POST',
      });
      return res.data;
    },

    approveAction: async (
      incidentId: string,
      payload: ApproveActionRequest,
      callerRole: string = 'INCIDENT_COMMANDER'
    ): Promise<unknown> => {
      const res = await this.fetchJson<unknown>(`/api/incidents/${incidentId}/approve-action`, {
        method: 'POST',
        headers: {
          'x-sentinel-actor-role': callerRole,
        },
        body: JSON.stringify(payload),
      });
      return res.data;
    },

    resolve: async (incidentId: string, payload: ResolveIncidentRequest): Promise<unknown> => {
      const res = await this.fetchJson<unknown>(`/api/incidents/${incidentId}/resolve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.data;
    },
  };

  analytics = {
    get: async (): Promise<Record<string, unknown>> => {
      const res = await this.fetchJson<Record<string, unknown>>('/api/analytics');
      return res.data || {};
    },
  };

  health = {
    check: async (): Promise<{ status: string; aws: { isConfigured: boolean; mode: string } }> => {
      const res = await this.fetchJson<{ status: string; aws: { isConfigured: boolean; mode: string } }>('/api/health');
      return res.data || { status: 'UNKNOWN', aws: { isConfigured: false, mode: 'SANDBOX' } };
    },
  };
}

export const apiClient = new ApiClient();
