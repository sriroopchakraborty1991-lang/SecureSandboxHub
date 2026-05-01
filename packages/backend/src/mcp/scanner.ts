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
  const tools = Array.isArray(anyInput.tools) ? anyInput.tools : Array.isArray(anyInput) ? anyInput : null;
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

