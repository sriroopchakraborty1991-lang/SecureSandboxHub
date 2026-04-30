import type {PolicyRules} from '../db/policies';
import type {Sandbox} from '../db/sandboxes';
import type {SandboxEvent} from '../db/events';

export type ThreatAnalysis = {
  score: number;
  level: 'low' | 'medium' | 'high';
  reasons: string[];
};

export function analyzeThreat(input: {sandbox: Sandbox; policy: PolicyRules; events: SandboxEvent[]}): ThreatAnalysis {
  const reasons: string[] = [];
  let score = 0;

  const errorCount = input.events.filter((e) => e.type === 'error').length;
  if (errorCount > 0) {
    const add = Math.min(60, 30 + (errorCount - 1) * 10);
    score += add;
    reasons.push(`Runtime errors detected: ${errorCount}`);
  }

  const stderrCount = input.events.filter((e) => e.type === 'stderr').length;
  if (stderrCount >= 10) {
    score += 10;
    reasons.push(`High stderr volume: ${stderrCount}`);
  }

  if (input.policy.allowNetwork) {
    score += 10;
    reasons.push('Network is enabled by policy');
  }

  const runtimeMs = (input.sandbox.stoppedAt ?? Date.now()) - input.sandbox.createdAt;
  if (runtimeMs >= 10 * 60 * 1000) {
    score += 10;
    reasons.push('Long-running sandbox session');
  }

  if (input.events.length >= 100) {
    score += 10;
    reasons.push('High activity volume');
  }

  score = Math.max(0, Math.min(100, score));

  const level: ThreatAnalysis['level'] = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  if (reasons.length === 0) reasons.push('No elevated risk signals detected');

  return {score, level, reasons};
}

