import { ComparisonConfig, DiffEntry, StepReplayResult, StepReplayStatus, TraceStep } from '@/types/workflow';

/**
 * Normalizes an object or value based on comparison configuration:
 * - strips ignored fields
 * - canonicalizes object key ordering if ignoreObjectKeyOrder is true
 * - applies numeric tolerance or string casing
 */
export function normalizeValue(
  val: any,
  config: ComparisonConfig,
  currentPath = ''
): any {
  if (val === null || val === undefined) {
    return val;
  }

  // Handle primitives
  if (typeof val === 'number') {
    if (config.numericTolerance > 0) {
      // round to tolerance precision
      const precision = Math.max(0, -Math.floor(Math.log10(config.numericTolerance)));
      return Number(val.toFixed(precision));
    }
    return val;
  }

  if (typeof val === 'string') {
    return config.ignoreStringCase ? val.toLowerCase() : val;
  }

  if (typeof val !== 'object') {
    return val;
  }

  // Handle arrays
  if (Array.isArray(val)) {
    return val.map((item, idx) =>
      normalizeValue(item, config, currentPath ? `${currentPath}[${idx}]` : `[${idx}]`)
    );
  }

  // Handle plain objects
  const keys = Object.keys(val);
  const normalizedObj: Record<string, any> = {};

  // Sort keys if key order should be ignored
  const sortedKeys = config.ignoreObjectKeyOrder ? [...keys].sort() : keys;

  for (const key of sortedKeys) {
    // Check if field should be ignored
    const isIgnored = config.ignoredFields.some(
      (ignored) => ignored.trim().toLowerCase() === key.toLowerCase()
    );
    if (isIgnored) {
      continue;
    }

    const fieldPath = currentPath ? `${currentPath}.${key}` : key;
    normalizedObj[key] = normalizeValue(val[key], config, fieldPath);
  }

  return normalizedObj;
}

/**
 * Extracts a nested value at a dot/bracket path e.g. "customer.arr" or "items[0].id"
 */
function getValueAtPath(obj: any, path: string): any {
  if (!obj || !path) return obj;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Deep compares two normalized objects or primitives and returns diff entries
 */
export function deepDiff(
  baseline: any,
  replayed: any,
  currentPath = ''
): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (baseline === replayed) {
    return diffs;
  }

  // Handle null/undefined or type mismatch
  if (
    baseline === null ||
    replayed === null ||
    baseline === undefined ||
    replayed === undefined ||
    typeof baseline !== typeof replayed ||
    Array.isArray(baseline) !== Array.isArray(replayed)
  ) {
    diffs.push({
      path: currentPath || 'root',
      type: 'modified',
      baselineValue: baseline,
      replayedValue: replayed,
      message: `Value changed from ${JSON.stringify(baseline)} to ${JSON.stringify(replayed)}`,
    });
    return diffs;
  }

  // Handle arrays
  if (Array.isArray(baseline) && Array.isArray(replayed)) {
    const maxLen = Math.max(baseline.length, replayed.length);
    for (let i = 0; i < maxLen; i++) {
      const p = currentPath ? `${currentPath}[${i}]` : `[${i}]`;
      if (i >= baseline.length) {
        diffs.push({
          path: p,
          type: 'added',
          replayedValue: replayed[i],
          message: `Item added at index ${i}`,
        });
      } else if (i >= replayed.length) {
        diffs.push({
          path: p,
          type: 'removed',
          baselineValue: baseline[i],
          message: `Item removed at index ${i}`,
        });
      } else {
        diffs.push(...deepDiff(baseline[i], replayed[i], p));
      }
    }
    return diffs;
  }

  // Handle objects
  if (typeof baseline === 'object') {
    const baselineKeys = new Set(Object.keys(baseline));
    const replayedKeys = new Set(Object.keys(replayed));

    for (const key of baselineKeys) {
      const p = currentPath ? `${currentPath}.${key}` : key;
      if (!replayedKeys.has(key)) {
        diffs.push({
          path: p,
          type: 'removed',
          baselineValue: baseline[key],
          message: `Field removed: ${key}`,
        });
      } else {
        diffs.push(...deepDiff(baseline[key], replayed[key], p));
      }
    }

    for (const key of replayedKeys) {
      if (!baselineKeys.has(key)) {
        const p = currentPath ? `${currentPath}.${key}` : key;
        diffs.push({
          path: p,
          type: 'added',
          replayedValue: replayed[key],
          message: `Field added: ${key}`,
        });
      }
    }

    return diffs;
  }

  // Handle primitives (number, string, boolean) that differed
  diffs.push({
    path: currentPath || 'root',
    type: 'modified',
    baselineValue: baseline,
    replayedValue: replayed,
    message: `Changed from ${JSON.stringify(baseline)} to ${JSON.stringify(replayed)}`,
  });

  return diffs;
}

/**
 * Compares a baseline step with a replayed step outcome
 */
export function compareStep(
  baselineStep: TraceStep,
  replayedResult: any,
  replayedDurationMs: number,
  replayedError: string | undefined,
  config: ComparisonConfig
): StepReplayResult {
  // If simulation / call threw an error
  if (replayedError) {
    // If the baseline was also an error step, check if errors match
    if (baselineStep.type === 'error' && (baselineStep.content === replayedError || baselineStep.result?.error === replayedError)) {
      return {
        stepId: baselineStep.id,
        status: 'passed',
        baselineResult: baselineStep.result || baselineStep.content,
        replayedResult: replayedError,
        baselineDurationMs: baselineStep.durationMs,
        replayedDurationMs,
        diffs: [],
        reason: 'Error matched baseline expected error',
      };
    }

    return {
      stepId: baselineStep.id,
      status: 'failed',
      baselineResult: baselineStep.result || baselineStep.content,
      replayedResult: null,
      baselineDurationMs: baselineStep.durationMs,
      replayedDurationMs,
      diffs: [
        {
          path: 'error',
          type: 'added',
          replayedValue: replayedError,
          message: `Replay execution failed: ${replayedError}`,
        },
      ],
      error: replayedError,
      reason: `Tool execution failed: ${replayedError}`,
    };
  }

  // If baseline itself was an error step but replay succeeded without error
  if (baselineStep.type === 'error') {
    return {
      stepId: baselineStep.id,
      status: 'changed',
      baselineResult: baselineStep.content || baselineStep.result,
      replayedResult,
      baselineDurationMs: baselineStep.durationMs,
      replayedDurationMs,
      diffs: [
        {
          path: 'status',
          type: 'modified',
          baselineValue: 'error',
          replayedValue: 'success',
          message: 'Baseline recorded an error, but replay succeeded',
        },
      ],
      reason: 'Baseline was an error, replay produced a valid response',
    };
  }

  // Extract relevant payloads to compare
  const baselinePayload =
    baselineStep.type === 'tool_result'
      ? baselineStep.result
      : baselineStep.type === 'tool_call'
      ? baselineStep.arguments
      : baselineStep.content;

  const compareTarget = replayedResult !== undefined ? replayedResult : {};

  // Check if user selected specific paths to compare only
  if (config.selectedPathsOnly && config.selectedPathsOnly.length > 0) {
    const pathDiffs: DiffEntry[] = [];
    for (const selectedPath of config.selectedPathsOnly) {
      const cleanPath = selectedPath.trim().replace(/^\$\.?/, '');
      if (!cleanPath) continue;
      const baseSubVal = normalizeValue(getValueAtPath(baselinePayload, cleanPath), config);
      const repSubVal = normalizeValue(getValueAtPath(compareTarget, cleanPath), config);
      pathDiffs.push(...deepDiff(baseSubVal, repSubVal, cleanPath));
    }

    const status: StepReplayStatus = pathDiffs.length === 0 ? 'passed' : 'changed';
    return {
      stepId: baselineStep.id,
      status,
      baselineResult: baselinePayload,
      replayedResult: compareTarget,
      baselineDurationMs: baselineStep.durationMs,
      replayedDurationMs,
      diffs: pathDiffs,
      reason:
        status === 'passed'
          ? 'Selected paths matched baseline'
          : `${pathDiffs.length} discrepancy found in selected paths`,
    };
  }

  // Full comparison with normalized values
  const normalizedBaseline = normalizeValue(baselinePayload, config);
  const normalizedReplayed = normalizeValue(compareTarget, config);

  const diffs = deepDiff(normalizedBaseline, normalizedReplayed);
  const status: StepReplayStatus = diffs.length === 0 ? 'passed' : 'changed';

  return {
    stepId: baselineStep.id,
    status,
    baselineResult: baselinePayload,
    replayedResult: compareTarget,
    baselineDurationMs: baselineStep.durationMs,
    replayedDurationMs,
    diffs,
    reason:
      status === 'passed'
        ? 'Result is identical to baseline'
        : `${diffs.length} difference${diffs.length > 1 ? 's' : ''} detected`,
  };
}
