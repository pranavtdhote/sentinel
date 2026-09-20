/**
 * Safe JSON fetch utility to prevent "Unexpected token '<', <!DOCTYPE... is not valid JSON"
 * when the dev server recompiles, restarts, or returns HTML error pages.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error: string | null }> {
  try {
    let authHeaderValue = '';
    let userEmail = '';
    if (typeof window !== 'undefined') {
      const storedToken =
        localStorage.getItem('sentinel_id_token') ||
        localStorage.getItem('sentinel_token') ||
        sessionStorage.getItem('sentinel_id_token') ||
        sessionStorage.getItem('sentinel_token');

      if (storedToken) {
        authHeaderValue = `Bearer ${storedToken}`;
      }

      const storedUser = localStorage.getItem('sentinel_user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.email) userEmail = parsed.email;
        } catch {
          // ignore
        }
      }
    }

    const defaultHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...(authHeaderValue ? { Authorization: authHeaderValue } : {}),
      ...(userEmail ? { 'x-sentinel-user-email': userEmail } : {}),
    };

    const executeFetch = async () => {
      return fetch(input, {
        ...init,
        headers: {
          ...defaultHeaders,
          ...init?.headers,
        },
      });
    };

    let res = await executeFetch();
    let contentType = res.headers.get('content-type') || '';

    // If Next.js dev server is actively compiling a route, it may return a transient 404 HTML page.
    // Retry once after a brief 350ms pause to allow compilation to finish.
    if ((!contentType.includes('application/json') || res.status === 404) && res.status !== 401 && res.status !== 403) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const retryRes = await executeFetch();
      const retryContentType = retryRes.headers.get('content-type') || '';
      if (retryContentType.includes('application/json') || retryRes.ok) {
        res = retryRes;
        contentType = retryContentType;
      }
    }

    if (!contentType.includes('application/json')) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Expected application/json but received ${contentType || 'non-JSON'} (status ${res.status})`,
      };
    }

    const data = (await res.json()) as T;
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? null : (data as any)?.error?.message || `Request failed with status ${res.status}`,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err?.message || 'Network connection failed',
    };
  }
}
