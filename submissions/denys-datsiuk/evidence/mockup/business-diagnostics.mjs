// Executable synthetic reference, not private product code or autonomous remediation.
export function validateResult(result, schema) {
  function check(value, rule, path) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type];
    const matches = type => type === undefined || (type === 'null' ? value === null
      : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isInteger(value) : typeof value === type);
    if (!types.some(matches)) throw new Error(`Schema type: ${path}`);
    if (rule.enum && !rule.enum.includes(value)) throw new Error(`Schema enum: ${path}`);
    if ('const' in rule && value !== rule.const) throw new Error(`Schema const: ${path}`);
    if (typeof value === 'string' && ((rule.minLength && value.length < rule.minLength) || (rule.pattern && !new RegExp(rule.pattern).test(value)))) throw new Error(`Schema string: ${path}`);
    if (typeof value === 'number' && (!Number.isFinite(value) || ('minimum' in rule && value < rule.minimum) || ('maximum' in rule && value > rule.maximum))) throw new Error(`Schema number: ${path}`);
    if (Array.isArray(value)) {
      if (value.length < (rule.minItems ?? 0)) throw new Error(`Schema array: ${path}`);
      value.forEach((item, i) => check(item, rule.items ?? {}, `${path}[${i}]`));
    } else if (value && typeof value === 'object') {
      for (const key of rule.required ?? []) if (!Object.hasOwn(value, key)) throw new Error(`Schema required: ${key}`);
      for (const [key, item] of Object.entries(value)) {
        if (!Object.hasOwn(rule.properties ?? {}, key)) {
          if (rule.additionalProperties === false) throw new Error(`Schema extra field: ${key}`);
        } else check(item, rule.properties[key], `${path}.${key}`);
      }
    }
  }
  check(result, schema, 'result');
  return result;
}

export function diagnose(input, policy, schema) {
  if (policy.version !== 1 || (input.policy_version ?? 1) !== policy.version) throw new Error('STOP: unknown policy version');
  if (!/^SYN-[A-Z0-9-]+$/.test(input.correlation_id ?? '')) throw new Error('STOP: unsafe correlation identifier');
  if (!Array.isArray(input.invariants) || !input.invariants.every(id => typeof id === 'string' && /^[A-Z]+-[A-Z0-9-]+$/.test(id))) throw new Error('STOP: invalid invariant signals');
  if (Object.keys(input).some(key => !['correlation_id', 'policy_version', 'invariants', 'affected_count'].includes(key))) throw new Error('STOP: unexpected input fields');
  if (input.affected_count !== undefined && (!Number.isInteger(input.affected_count) || input.affected_count < 0)) throw new Error('STOP: invalid affected count');
  const signals = [...new Set(input.invariants)];
  const recognized = signals.filter(id => Object.values(policy.categories).some(c => c.invariant_prefixes.some(prefix => id.startsWith(`${prefix}-`))));
  const categories = Object.entries(policy.categories).filter(([, c]) => recognized.some(id => c.invariant_prefixes.some(prefix => id.startsWith(`${prefix}-`))));
  if (categories.length > 1) throw new Error('STOP: conflicting invariant categories require operator review');
  const coverage = (input.affected_count === undefined ? 2 / 3 : 1) * (signals.length ? recognized.length / signals.length : 0);
  const complete = recognized.length > 0 && input.affected_count !== undefined;
  const category = complete ? categories[0][0] : 'insufficient_evidence';
  const config = complete ? categories[0][1] : null;
  const limitations = [];
  if (!complete) limitations.push('Required deterministic evidence is missing; no root cause inferred.');
  if (recognized.length !== signals.length) limitations.push('Unrecognized invariant signals reduce evidence coverage.');
  const low = coverage < policy.confidence.minimum_for_recommendation;
  const recommended = low ? policy.confidence.below_minimum_action : config.recommended_action;
  if (!policy.allowed_actions.includes(recommended) || policy.forbidden_actions.includes(recommended)) throw new Error('STOP: action is not allowlisted');
  const result = {
    correlation_id: input.correlation_id, policy_version: policy.version, category,
    severity: config?.default_severity ?? 'medium',
    business_impact: config?.business_impact ?? 'Insufficient evidence to determine business impact.',
    evidence: recognized.length ? recognized : ['EVIDENCE-MISSING'],
    affected_count: input.affected_count ?? null,
    confidence: Number(coverage.toFixed(3)), recommended_action: recommended,
    retry: low ? 'blocked' : config.retry,
    human_review_required: low || config.human_review_required || ['identity_ambiguity', 'authoritative_conflict'].includes(category) || ['high', 'critical'].includes(config.default_severity),
    limitations
  };
  return validateResult(result, schema);
}
