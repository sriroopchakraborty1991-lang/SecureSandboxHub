import type {McpFindingSeverity} from '../db/mcp';

export type ImportedTool = {
  name: string;
  description?: string | null;
  inputSchema?: unknown | null;
};

export type ScanFinding = {
  severity: McpFindingSeverity;
  category: string;
  title: string;
  toolName: string | null;
  evidence: Record<string, unknown> | null;
  recommendation: string;
};

export function parseToolsFromImport(input: unknown): ImportedTool[] {
  if (!input || typeof input !== 'object') throw new Error('invalid_manifest');

  const anyInput = input as any;
  const tools =
    Array.isArray(anyInput.tools)
      ? anyInput.tools
      : Array.isArray(anyInput?.capabilities?.tools)
        ? anyInput.capabilities.tools
        : Array.isArray(anyInput?.server?.tools)
          ? anyInput.server.tools
          : Array.isArray(anyInput?.mcp?.tools)
            ? anyInput.mcp.tools
            : Array.isArray(anyInput?.toolset?.tools)
              ? anyInput.toolset.tools
              : Array.isArray(anyInput?.functions)
                ? anyInput.functions
                : Array.isArray(anyInput)
                  ? anyInput
                  : null;
  if (!tools) throw new Error('invalid_manifest');

  const out: ImportedTool[] = [];
  for (const t of tools) {
    if (!t || typeof t !== 'object') continue;
    const name = typeof (t as any).name === 'string' ? (t as any).name.trim() : '';
    if (!name) continue;
    const description = typeof (t as any).description === 'string' ? (t as any).description : (t as any).description ?? null;
    const inputSchema = typeof (t as any).inputSchema !== 'undefined' ? (t as any).inputSchema : (t as any).input_schema;
    out.push({name, description, inputSchema: typeof inputSchema === 'undefined' ? null : (inputSchema ?? null)});
  }

  if (out.length === 0) throw new Error('no_tools_found');
  return out;
}

function severityMax(a: McpFindingSeverity, b: McpFindingSeverity): McpFindingSeverity {
  const v = (x: McpFindingSeverity) => (x === 'high' ? 3 : x === 'medium' ? 2 : 1);
  return v(a) >= v(b) ? a : b;
}

function isLocalEndpoint(endpoint: string): boolean {
  const e = endpoint.trim().toLowerCase();
  return e.includes('localhost') || e.includes('127.0.0.1') || e.startsWith('unix:') || e.startsWith('/') || e.startsWith('stdio:');
}

export function runServerChecks(input: {environment: 'local' | 'dev' | 'staging' | 'prod'; endpoint: string; authType: 'none' | 'token'}): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const env = input.environment;
  const endpoint = input.endpoint ?? '';
  const ep = endpoint.trim().toLowerCase();

  if (env !== 'local' && input.authType === 'none') {
    findings.push({
      severity: 'high',
      category: 'server_auth',
      title: 'Missing authentication for non-local MCP server',
      toolName: null,
      evidence: {environment: env, authType: input.authType},
      recommendation: 'Require authentication (token/OAuth) before allowing access to non-local MCP servers to reduce anonymous abuse.'
    });
  }

  if (env !== 'local' && !isLocalEndpoint(endpoint) && ep.startsWith('http://')) {
    findings.push({
      severity: 'medium',
      category: 'transport',
      title: 'Insecure MCP server endpoint transport (HTTP)',
      toolName: null,
      evidence: {environment: env, endpoint},
      recommendation: 'Use HTTPS for non-local MCP servers to protect data in transit and prevent MITM risks.'
    });
  }

  return findings;
}

function listSchemaPropertyNames(schema: any): string[] {
  if (!schema || typeof schema !== 'object') return [];
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') return [];
  return Object.keys(properties);
}

function getSchemaProperty(schema: any, name: string): any | null {
  if (!schema || typeof schema !== 'object') return null;
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object') return null;
  return (properties as any)[name] ?? null;
}

function hasValueConstraints(prop: any): boolean {
  if (!prop || typeof prop !== 'object') return false;
  return Boolean(prop.enum || prop.pattern || prop.const || prop.format || prop.minimum || prop.maximum);
}

export function runStaticChecks(tools: Array<{name: string; description: string | null; inputSchema: unknown | null}>): ScanFinding[] {
  const findings: ScanFinding[] = [];

  const riskyWords = [
    {w: 'admin', sev: 'high' as const},
    {w: 'root', sev: 'high' as const},
    {w: 'shell', sev: 'high' as const},
    {w: 'execute', sev: 'high' as const},
    {w: 'filesystem', sev: 'medium' as const},
    {w: 'file system', sev: 'medium' as const},
    {w: 'delete', sev: 'medium' as const},
    {w: 'curl', sev: 'medium' as const},
    {w: 'wget', sev: 'medium' as const}
  ];

  const secretParamWords = ['secret', 'token', 'apikey', 'api_key', 'password', 'credential', 'privatekey', 'private_key'];
  const networkWords = ['fetch', 'request', 'download', 'http', 'https', 'url', 'webhook'];

  for (const t of tools) {
    const desc = (t.description ?? '').toLowerCase();
    if (!desc.trim()) {
      findings.push({
        severity: 'low',
        category: 'metadata',
        title: 'Missing tool description',
        toolName: t.name,
        evidence: {tool: t.name},
        recommendation: 'Add a clear tool description including intended use, constraints, and safety considerations.'
      });
    }

    let risky: McpFindingSeverity | null = null;
    const hits: string[] = [];
    for (const rw of riskyWords) {
      if (desc.includes(rw.w)) {
        risky = risky ? severityMax(risky, rw.sev) : rw.sev;
        hits.push(rw.w);
      }
    }
    if (risky) {
      findings.push({
        severity: risky,
        category: 'tool_risk',
        title: 'Potentially high-risk tool description',
        toolName: t.name,
        evidence: {tool: t.name, hits},
        recommendation: 'Confirm least-privilege behavior, add explicit parameter constraints, and require approvals for sensitive operations.'
      });
    }

    const schema = t.inputSchema;
    if (schema && typeof schema === 'object') {
      const text = JSON.stringify(schema).toLowerCase();
      const suspiciousParams = ['path', 'filepath', 'file_path', 'command', 'cmd', 'url', 'uri', 'host'];
      const matched = suspiciousParams.filter((p) => text.includes(`"${p}"`));
      if (matched.length) {
        findings.push({
          severity: 'medium',
          category: 'schema',
          title: 'Schema includes potentially dangerous parameters',
          toolName: t.name,
          evidence: {tool: t.name, params: matched},
          recommendation: 'Constrain these parameters (allowed prefixes/domains/commands) and add server-side validation.'
        });
      }

      const s = schema as any;
      const propNames = listSchemaPropertyNames(s).map((p) => p.toLowerCase());

      const secretHits = propNames.filter((p) => secretParamWords.some((w) => p.includes(w)));
      if (secretHits.length) {
        findings.push({
          severity: 'high',
          category: 'secrets',
          title: 'Schema requests sensitive secret-like parameters',
          toolName: t.name,
          evidence: {tool: t.name, params: secretHits},
          recommendation: 'Avoid passing secrets through tool parameters when possible; ensure redaction/masking in logs and use secure storage mechanisms.'
        });
      }

      const isObjectSchema = String(s.type ?? '').toLowerCase() === 'object' || Boolean(s.properties);
      if (isObjectSchema) {
        const hasProps = Boolean(s.properties) && typeof s.properties === 'object' && Object.keys(s.properties).length > 0;
        const addl = typeof s.additionalProperties === 'undefined' ? true : Boolean(s.additionalProperties);
        if (!hasProps && addl) {
          findings.push({
            severity: 'medium',
            category: 'input_validation',
            title: 'Schema allows unbounded object inputs',
            toolName: t.name,
            evidence: {tool: t.name, additionalProperties: s.additionalProperties ?? 'default:true'},
            recommendation: 'Define explicit properties and set additionalProperties=false to reduce injection and malformed input risks.'
          });
        }
      }

      const urlLike = propNames.filter((p) => p === 'url' || p.endsWith('_url') || p.includes('uri') || p.includes('host'));
      const looksNetworkTool = networkWords.some((w) => desc.includes(w)) || networkWords.some((w) => t.name.toLowerCase().includes(w));
      if (looksNetworkTool && urlLike.length) {
        const constrained = urlLike.some((p) => hasValueConstraints(getSchemaProperty(s, p)));
        if (!constrained) {
          findings.push({
            severity: 'high',
            category: 'ssrf',
            title: 'Potential SSRF risk: URL/host parameter lacks constraints',
            toolName: t.name,
            evidence: {tool: t.name, params: urlLike},
            recommendation: 'Add allowlists (domains/schemes), deny private IP ranges, and enforce strict URL parsing and validation.'
          });
        }
      }

      const cmdLike = propNames.filter((p) => p === 'command' || p === 'cmd' || p.includes('shell'));
      if (cmdLike.length) {
        const constrained = cmdLike.some((p) => hasValueConstraints(getSchemaProperty(s, p)));
        if (!constrained) {
          findings.push({
            severity: 'high',
            category: 'command_execution',
            title: 'Potential command injection risk: command parameter lacks constraints',
            toolName: t.name,
            evidence: {tool: t.name, params: cmdLike},
            recommendation: 'Avoid raw shell execution. If unavoidable, constrain commands via allowlists/enum and implement robust server-side validation.'
          });
        }
      }
    }
  }

  return findings;
}

export function runDriftChecks(input: {
  prevSnapshot: Array<{name: string; toolHash: string}> | null;
  currentSnapshot: Array<{name: string; toolHash: string}>;
}): ScanFinding[] {
  if (!input.prevSnapshot) return [];

  const prev = new Map(input.prevSnapshot.map((t) => [t.name, t.toolHash]));
  const cur = new Map(input.currentSnapshot.map((t) => [t.name, t.toolHash]));

  const findings: ScanFinding[] = [];

  for (const [name, toolHash] of cur) {
    const old = prev.get(name);
    if (!old) {
      findings.push({
        severity: 'medium',
        category: 'drift',
        title: 'Tool added since previous scan',
        toolName: name,
        evidence: {tool: name, toolHash},
        recommendation: 'Review the new tool definition and pin a baseline if it is expected.'
      });
      continue;
    }
    if (old !== toolHash) {
      findings.push({
        severity: 'high',
        category: 'drift',
        title: 'Tool definition changed since previous scan',
        toolName: name,
        evidence: {tool: name, previousHash: old, currentHash: toolHash},
        recommendation: 'Treat unannounced tool changes as a security event; re-review and update the pinned baseline if approved.'
      });
    }
  }

  for (const [name, toolHash] of prev) {
    if (!cur.has(name)) {
      findings.push({
        severity: 'medium',
        category: 'drift',
        title: 'Tool removed since previous scan',
        toolName: name,
        evidence: {tool: name, previousHash: toolHash},
        recommendation: 'Confirm the tool removal is expected and update baselines accordingly.'
      });
    }
  }

  return findings;
}
