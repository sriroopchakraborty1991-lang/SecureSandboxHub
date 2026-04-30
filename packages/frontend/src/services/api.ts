export type User = {id: string; email: string; role: 'admin' | 'user'};

export type PolicyRules = {
  allowNetwork: boolean;
  memoryLimitMb: number;
  cpuLimit: number;
  readOnlyRootFs: boolean;
};

export type Policy = {id: string; name: string; rules: PolicyRules; createdBy: string; createdAt: number};

export type Sandbox = {
  id: string;
  status: 'running' | 'stopped' | 'error';
  dockerContainerId: string | null;
  image: string;
  command: string[] | null;
  policyId: string;
  createdBy: string;
  createdAt: number;
  stoppedAt: number | null;
};

export type SandboxEvent = {
  id: string;
  sandboxId: string;
  ts: number;
  type: 'info' | 'stdout' | 'stderr' | 'error' | 'lifecycle' | 'alert';
  message: string;
  meta: Record<string, unknown> | null;
};

export type ThreatAnalysis = {score: number; level: 'low' | 'medium' | 'high'; reasons: string[]};

export type MonitoringSession = {
  sandboxId: string;
  image: string;
  policyId: string;
  policyName: string;
  createdAt: number;
  dockerContainerId: string | null;
  lastEventTs: number | null;
  stats: {cpuPercent: number; memoryBytes: number; memoryLimitBytes: number; ts: number} | null;
  warnings: string[];
};

const tokenKey = 'ssh.token';

export function getToken(): string | null {
  return localStorage.getItem(tokenKey);
}

export function setToken(token: string | null): void {
  if (!token) localStorage.removeItem(tokenKey);
  else localStorage.setItem(tokenKey, token);
}

function apiBase(): string {
  const v = (import.meta as any).env?.VITE_API_URL as string | undefined;
  return v?.replace(/\/$/, '') ?? '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers ?? {})
  };
  if (token) (headers as any).Authorization = `Bearer ${token}`;

  const res = await fetch(`${apiBase()}${path}`, {...init, headers});
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.error ? String(data.error) : `http_${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function register(email: string, password: string): Promise<{token: string; user: User}> {
  const res = await request<{token: string; user: User}>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({email, password})
  });
  setToken(res.token);
  return res;
}

export async function login(email: string, password: string): Promise<{token: string; user: User}> {
  const res = await request<{token: string; user: User}>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({email, password})
  });
  setToken(res.token);
  return res;
}

export async function listPolicyTemplates(): Promise<Array<{name: string; rules: PolicyRules}>> {
  const res = await request<{templates: Array<{name: string; rules: PolicyRules}>}>('/api/policy-templates');
  return res.templates;
}

export async function listPolicies(): Promise<Policy[]> {
  const res = await request<{policies: Policy[]}>('/api/policies');
  return res.policies;
}

export async function createPolicy(input: {name: string; rules: PolicyRules}): Promise<Policy> {
  const res = await request<{policy: Policy}>('/api/policies', {method: 'POST', body: JSON.stringify(input)});
  return res.policy;
}

export async function listSandboxes(): Promise<Sandbox[]> {
  const res = await request<{sandboxes: Sandbox[]}>('/api/sandboxes');
  return res.sandboxes;
}

export async function createSandbox(input: {image: string; policyId: string; command?: string[]}): Promise<Sandbox> {
  const res = await request<{sandbox: Sandbox}>('/api/sandboxes', {method: 'POST', body: JSON.stringify(input)});
  return res.sandbox;
}

export async function getSandbox(id: string): Promise<Sandbox> {
  const res = await request<{sandbox: Sandbox}>(`/api/sandboxes/${encodeURIComponent(id)}`);
  return res.sandbox;
}

export async function stopSandbox(id: string): Promise<Sandbox> {
  const res = await request<{sandbox: Sandbox}>(`/api/sandboxes/${encodeURIComponent(id)}/stop`, {method: 'POST'});
  return res.sandbox;
}

export async function listEvents(id: string): Promise<SandboxEvent[]> {
  const res = await request<{events: SandboxEvent[]}>(`/api/sandboxes/${encodeURIComponent(id)}/events`);
  return res.events;
}

export async function threatAnalysis(sandboxId: string): Promise<ThreatAnalysis> {
  const res = await request<{analysis: ThreatAnalysis}>('/api/threat-analysis', {method: 'POST', body: JSON.stringify({sandboxId})});
  return res.analysis;
}

export function sandboxEventsStreamUrl(sandboxId: string): string {
  const token = getToken();
  const url = new URL(`${apiBase()}/api/sandboxes/${encodeURIComponent(sandboxId)}/events/stream`);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}

export async function monitoringSessions(): Promise<MonitoringSession[]> {
  const res = await request<{sessions: MonitoringSession[]}>('/api/monitoring/sessions');
  return res.sessions;
}

export async function monitoringAlerts(limit = 50): Promise<SandboxEvent[]> {
  const res = await request<{alerts: SandboxEvent[]}>(`/api/monitoring/alerts?limit=${encodeURIComponent(String(limit))}`);
  return res.alerts;
}

export async function monitoringHistory(limit = 50): Promise<Sandbox[]> {
  const res = await request<{sandboxes: Sandbox[]}>(`/api/monitoring/history?limit=${encodeURIComponent(String(limit))}`);
  return res.sandboxes;
}

export function monitoringStreamUrl(): string {
  const token = getToken();
  const url = new URL(`${apiBase()}/api/monitoring/stream`);
  if (token) url.searchParams.set('token', token);
  return url.toString();
}
