import {
  AssertionCheckType,
  AssertionResult,
  AssertionStatus,
  AssertionSummary,
  StepAssertionDetail,
  TraceStep,
  WorkflowAssertion,
  WorkflowTrace,
} from '@/types/workflow';

/**
 * Extracts a value at a dot/bracket JSON path (e.g. "customer.name", "matched_articles[0].id", "total_matches")
 */
export function resolveJsonPath(
  data: unknown,
  path?: string
): { exists: boolean; value: unknown } {
  if (!path || path.trim() === '' || path === '$' || path === '.') {
    return { exists: data !== undefined, value: data };
  }

  const cleanPath = path.trim().replace(/^\$\.?/, '');
  if (!cleanPath) {
    return { exists: data !== undefined, value: data };
  }

  // Normalize array notation: a[0].b -> a.0.b
  const normalizedParts = cleanPath
    .replace(/\[['"]?([^'"]+)['"]?\]/g, '.$1')
    .split('.')
    .filter((p) => p.length > 0);

  let current: unknown = data;

  for (const part of normalizedParts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return { exists: false, value: undefined };
    }

    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx) || idx < 0 || idx >= current.length) {
        return { exists: false, value: undefined };
      }
      current = current[idx];
    } else {
      const record = current as Record<string, unknown>;
      if (!(part in record)) {
        return { exists: false, value: undefined };
      }
      current = record[part];
    }
  }

  return { exists: true, value: current };
}

/**
 * Deep equality comparison between two unknown values
 */
export function valuesDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!valuesDeepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
      if (!valuesDeepEqual(objA[key], objB[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Parses numeric value from a primitive or string (stripping currency/commas e.g. "$120,000" -> 120000)
 */
export function parseNumericValue(val: unknown): number | null {
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    if (!cleaned) return null;
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Recursively scans an object or arguments structure to check if a value is contained.
 */
function searchArgumentTree(
  tree: unknown,
  needle: unknown,
  targetKey?: string,
  exactMatch = false
): boolean {
  if (tree === null || tree === undefined) return false;

  const needleStr = typeof needle === 'string' ? needle.toLowerCase() : JSON.stringify(needle);

  if (typeof tree !== 'object') {
    if (targetKey) return false;
    const treeStr = typeof tree === 'string' ? tree.toLowerCase() : JSON.stringify(tree);
    return exactMatch ? treeStr === needleStr : treeStr.includes(needleStr);
  }

  if (Array.isArray(tree)) {
    return tree.some((item) => searchArgumentTree(item, needle, targetKey, exactMatch));
  }

  const record = tree as Record<string, unknown>;

  for (const [key, val] of Object.entries(record)) {
    // Check if key matches forbidden target (e.g. key is "password")
    if (key.toLowerCase().includes(needleStr)) {
      return true;
    }

    if (targetKey) {
      if (key.toLowerCase() === targetKey.toLowerCase()) {
        const valStr = typeof val === 'string' ? val.toLowerCase() : JSON.stringify(val);
        if (exactMatch ? valStr === needleStr : valStr.includes(needleStr)) {
          return true;
        }
      }
    } else {
      if (searchArgumentTree(val, needle, undefined, exactMatch)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Extracts payload data from a step to evaluate an assertion against.
 */
function getStepPayload(step: TraceStep, replayedPayload?: unknown): unknown {
  if (replayedPayload !== undefined) {
    return replayedPayload;
  }
  if (step.type === 'tool_result') {
    return step.result;
  }
  if (step.type === 'tool_call') {
    return step.arguments;
  }
  return step.content !== undefined ? step.content : step.result || step.arguments;
}

/**
 * Evaluates a single assertion against a specific step.
 */
export function evaluateAssertionForStep(
  assertion: WorkflowAssertion,
  step: TraceStep,
  stepIndex: number,
  replayedPayload?: unknown,
  replayedDurationMs?: number,
  replayedError?: string
): {
  status: AssertionStatus;
  message: string;
  actualValue?: unknown;
  expectedValue?: unknown;
} {
  const stepLabel = `Step ${stepIndex + 1} (${step.tool ? `${step.server || 'mcp'}:${step.tool}` : step.type})`;

  // Duration limit check
  if (assertion.checkType === 'duration_limit') {
    const duration =
      replayedDurationMs !== undefined ? replayedDurationMs : step.durationMs || 0;
    const limit = assertion.maxDurationMs ?? 500;

    if (duration <= limit) {
      return {
        status: 'passed',
        message: `${stepLabel} executed in ${duration}ms, meeting limit of ${limit}ms.`,
        actualValue: `${duration}ms`,
        expectedValue: `< ${limit}ms`,
      };
    } else {
      return {
        status: 'failed',
        message: `${stepLabel} duration ${duration}ms exceeded SLA limit of ${limit}ms.`,
        actualValue: `${duration}ms`,
        expectedValue: `< ${limit}ms`,
      };
    }
  }

  // MCP tool call argument check
  if (assertion.checkType === 'argument_value') {
    const args =
      step.type === 'tool_call'
        ? (replayedPayload !== undefined ? replayedPayload : step.arguments)
        : step.arguments;

    if (!args || typeof args !== 'object') {
      if (assertion.argumentOperator === 'excludes') {
        return {
          status: 'passed',
          message: `${stepLabel} arguments are empty; forbidden value "${assertion.argumentValue}" is excluded.`,
          actualValue: args,
          expectedValue: `Exclude "${assertion.argumentValue}"`,
        };
      }
      return {
        status: 'failed',
        message: `${stepLabel} does not have tool arguments to check.`,
        actualValue: args,
        expectedValue: `Include "${assertion.argumentValue}"`,
      };
    }

    const needle = assertion.argumentValue ?? '';
    const operator = assertion.argumentOperator || 'excludes';
    const found = searchArgumentTree(args, needle, assertion.argumentKey, false);

    if (operator === 'excludes') {
      if (!found) {
        return {
          status: 'passed',
          message: `${stepLabel} arguments do not contain forbidden value "${needle}".`,
          actualValue: 'clean',
          expectedValue: `Exclude "${needle}"`,
        };
      } else {
        return {
          status: 'failed',
          message: `${stepLabel} contains forbidden argument/value "${needle}".`,
          actualValue: JSON.stringify(args),
          expectedValue: `Exclude "${needle}"`,
        };
      }
    } else {
      // includes
      if (found) {
        return {
          status: 'passed',
          message: `${stepLabel} tool arguments include expected value "${needle}".`,
          actualValue: JSON.stringify(args),
          expectedValue: `Include "${needle}"`,
        };
      } else {
        return {
          status: 'failed',
          message: `${stepLabel} tool arguments missing expected value "${needle}".`,
          actualValue: JSON.stringify(args),
          expectedValue: `Include "${needle}"`,
        };
      }
    }
  }

  // For data assertions (json_path, string, numeric), obtain data payload
  const payload = getStepPayload(step, replayedPayload);

  if (replayedError) {
    return {
      status: 'failed',
      message: `${stepLabel} encountered execution error: ${replayedError}`,
      actualValue: replayedError,
    };
  }

  const { exists, value: targetValue } = resolveJsonPath(payload, assertion.jsonPath);

  switch (assertion.checkType) {
    case 'json_path_exists': {
      if (exists && targetValue !== null && targetValue !== undefined) {
        return {
          status: 'passed',
          message: `Path "${assertion.jsonPath || '$'}" exists in ${stepLabel}.`,
          actualValue: targetValue,
          expectedValue: 'Path exists and is defined',
        };
      }
      return {
        status: 'failed',
        message: `Path "${assertion.jsonPath || '$'}" is missing or undefined in ${stepLabel}.`,
        actualValue: targetValue === undefined ? 'undefined' : null,
        expectedValue: 'Path must exist',
      };
    }

    case 'json_path_missing': {
      if (!exists || targetValue === undefined || targetValue === null) {
        return {
          status: 'passed',
          message: `Path "${assertion.jsonPath || '$'}" is missing as expected in ${stepLabel}.`,
          actualValue: 'missing/undefined',
          expectedValue: 'Path missing',
        };
      }
      return {
        status: 'failed',
        message: `Expected path "${assertion.jsonPath}" to be missing, but found value: ${JSON.stringify(targetValue)} in ${stepLabel}.`,
        actualValue: targetValue,
        expectedValue: 'Path must be missing',
      };
    }

    case 'json_path_equals': {
      if (!exists) {
        return {
          status: 'failed',
          message: `Path "${assertion.jsonPath || '$'}" not found in ${stepLabel}.`,
          actualValue: 'undefined',
          expectedValue: assertion.expectedValue,
        };
      }

      const match = valuesDeepEqual(targetValue, assertion.expectedValue);
      if (match) {
        return {
          status: 'passed',
          message: `Path "${assertion.jsonPath || '$'}" equals ${JSON.stringify(assertion.expectedValue)} in ${stepLabel}.`,
          actualValue: targetValue,
          expectedValue: assertion.expectedValue,
        };
      }
      return {
        status: 'failed',
        message: `Path "${assertion.jsonPath || '$'}" expected ${JSON.stringify(assertion.expectedValue)}, got ${JSON.stringify(targetValue)} in ${stepLabel}.`,
        actualValue: targetValue,
        expectedValue: assertion.expectedValue,
      };
    }

    case 'string_matches': {
      if (!exists || targetValue === undefined || targetValue === null) {
        return {
          status: 'failed',
          message: `Target path "${assertion.jsonPath || '$'}" not found in ${stepLabel}.`,
          actualValue: 'undefined',
        };
      }

      const strVal = typeof targetValue === 'string' ? targetValue : String(targetValue);
      const mode = assertion.stringMode || 'contains';

      if (mode === 'one_of') {
        const allowed = assertion.allowedValues || [];
        const isAllowed = allowed.includes(strVal);
        if (isAllowed) {
          return {
            status: 'passed',
            message: `Value "${strVal}" in ${stepLabel} is one of allowed values [${allowed.join(', ')}].`,
            actualValue: strVal,
            expectedValue: `One of [${allowed.join(', ')}]`,
          };
        }
        return {
          status: 'failed',
          message: `Value "${strVal}" in ${stepLabel} is not in allowed list [${allowed.join(', ')}].`,
          actualValue: strVal,
          expectedValue: `One of [${allowed.join(', ')}]`,
        };
      }

      if (mode === 'regex') {
        try {
          const flags = assertion.caseSensitive ? '' : 'i';
          const regex = new RegExp(assertion.stringPattern || '', flags);
          if (regex.test(strVal)) {
            return {
              status: 'passed',
              message: `Value "${strVal}" in ${stepLabel} matches regex /${assertion.stringPattern}/${flags}.`,
              actualValue: strVal,
              expectedValue: `Pattern /${assertion.stringPattern}/`,
            };
          }
          return {
            status: 'failed',
            message: `Value "${strVal}" in ${stepLabel} does not match regex /${assertion.stringPattern}/${flags}.`,
            actualValue: strVal,
            expectedValue: `Pattern /${assertion.stringPattern}/`,
          };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          return {
            status: 'failed',
            message: `Invalid regex pattern: ${errMsg}`,
            actualValue: strVal,
          };
        }
      }

      // Default: contains
      const searchNeedle = assertion.stringPattern || '';
      const haystack = assertion.caseSensitive ? strVal : strVal.toLowerCase();
      const needle = assertion.caseSensitive ? searchNeedle : searchNeedle.toLowerCase();

      if (haystack.includes(needle)) {
        return {
          status: 'passed',
          message: `Value in ${stepLabel} contains substring "${searchNeedle}".`,
          actualValue: strVal,
          expectedValue: `Contains "${searchNeedle}"`,
        };
      }
      return {
        status: 'failed',
        message: `Value "${strVal}" in ${stepLabel} does not contain "${searchNeedle}".`,
        actualValue: strVal,
        expectedValue: `Contains "${searchNeedle}"`,
      };
    }

    case 'numeric_range': {
      if (!exists || targetValue === undefined || targetValue === null) {
        return {
          status: 'failed',
          message: `Numeric target path "${assertion.jsonPath || '$'}" not found in ${stepLabel}.`,
          actualValue: 'undefined',
        };
      }

      // If array, allow checking length if checking items count
      const numVal = Array.isArray(targetValue)
        ? targetValue.length
        : parseNumericValue(targetValue);

      if (numVal === null) {
        return {
          status: 'failed',
          message: `Value at path "${assertion.jsonPath}" in ${stepLabel} is not a valid number: ${JSON.stringify(targetValue)}`,
          actualValue: targetValue,
        };
      }

      const op = assertion.numericOperator || 'above_or_equal';
      const threshold = assertion.threshold ?? assertion.minValue ?? 0;

      let passed = false;
      let expText = '';

      switch (op) {
        case 'above':
          passed = numVal > threshold;
          expText = `> ${threshold}`;
          break;
        case 'above_or_equal':
          passed = numVal >= threshold;
          expText = `>= ${threshold}`;
          break;
        case 'below':
          passed = numVal < threshold;
          expText = `< ${threshold}`;
          break;
        case 'below_or_equal':
          passed = numVal <= threshold;
          expText = `<= ${threshold}`;
          break;
        case 'within_range': {
          const min = assertion.minValue ?? 0;
          const max = assertion.maxValue ?? 100;
          passed = numVal >= min && numVal <= max;
          expText = `${min} to ${max}`;
          break;
        }
      }

      if (passed) {
        return {
          status: 'passed',
          message: `Numeric value ${numVal} in ${stepLabel} meets condition (${expText}).`,
          actualValue: numVal,
          expectedValue: expText,
        };
      }
      return {
        status: 'failed',
        message: `Numeric value ${numVal} in ${stepLabel} failed check (${expText}).`,
        actualValue: numVal,
        expectedValue: expText,
      };
    }

    default:
      return {
        status: 'skipped',
        message: `Unknown check type: ${assertion.checkType}`,
      };
  }
}

export interface StepExecutionSnapshot {
  replayedPayload: unknown;
  durationMs: number;
  error?: string;
}

/**
 * Evaluates all workflow assertions against a set of trace steps and their replay executions.
 */
export function evaluateWorkflowAssertions(
  workflow: WorkflowTrace,
  steps: TraceStep[],
  executions: Record<string, StepExecutionSnapshot> = {}
): {
  results: AssertionResult[];
  summary: AssertionSummary;
} {
  const assertions = workflow.assertions || [];
  const results: AssertionResult[] = [];

  for (const assertion of assertions) {
    if (!assertion.enabled) {
      results.push({
        assertionId: assertion.id,
        assertionName: assertion.name,
        checkType: assertion.checkType,
        target: assertion.target,
        targetStepId: assertion.targetStepId,
        targetToolName: assertion.targetToolName,
        enabled: false,
        status: 'skipped',
        explanation: 'Assertion is disabled in workflow configuration.',
      });
      continue;
    }

    // Determine target steps
    if (assertion.target === 'step') {
      const stepIndex = steps.findIndex((s) => s.id === assertion.targetStepId);
      const targetStep = stepIndex >= 0 ? steps[stepIndex] : null;

      if (!targetStep) {
        results.push({
          assertionId: assertion.id,
          assertionName: assertion.name,
          checkType: assertion.checkType,
          target: assertion.target,
          targetStepId: assertion.targetStepId,
          enabled: true,
          status: 'skipped',
          explanation: `Target step ID "${assertion.targetStepId}" not found in workflow.`,
        });
        continue;
      }

      const exec = executions[targetStep.id];
      const stepLabel = `Step ${stepIndex + 1}: ${targetStep.tool ? `${targetStep.server || 'mcp'}:${targetStep.tool}` : targetStep.type}`;

      const res = evaluateAssertionForStep(
        assertion,
        targetStep,
        stepIndex,
        exec?.replayedPayload,
        exec?.durationMs,
        exec?.error
      );

      results.push({
        assertionId: assertion.id,
        assertionName: assertion.name,
        checkType: assertion.checkType,
        target: assertion.target,
        targetStepId: assertion.targetStepId,
        enabled: true,
        status: res.status,
        explanation: res.message,
        stepId: targetStep.id,
        stepLabel,
        actualValue: res.actualValue,
        expectedValue: res.expectedValue,
      });
    } else {
      // target: all_tool_calls
      const matchingSteps: { step: TraceStep; index: number }[] = [];

      steps.forEach((s, idx) => {
        // Tool calls and results with tools
        const isToolStep =
          assertion.checkType === 'argument_value'
            ? s.type === 'tool_call'
            : s.type === 'tool_call' || s.type === 'tool_result' || !!s.tool;

        if (isToolStep) {
          if (!assertion.targetToolName || s.tool === assertion.targetToolName) {
            matchingSteps.push({ step: s, index: idx });
          }
        }
      });

      if (matchingSteps.length === 0) {
        results.push({
          assertionId: assertion.id,
          assertionName: assertion.name,
          checkType: assertion.checkType,
          target: assertion.target,
          targetToolName: assertion.targetToolName,
          enabled: true,
          status: 'passed',
          explanation: `No matching tool calls found${assertion.targetToolName ? ` for tool "${assertion.targetToolName}"` : ''} in workflow.`,
        });
        continue;
      }

      const stepDetails: StepAssertionDetail[] = [];
      let allPassed = true;
      let firstFailureMessage = '';
      let primaryStepId: string | undefined = undefined;

      for (const { step, index } of matchingSteps) {
        const exec = executions[step.id];
        const stepLabel = `Step ${index + 1}: ${step.server || 'mcp'}:${step.tool || step.type}`;
        const stepEval = evaluateAssertionForStep(
          assertion,
          step,
          index,
          exec?.replayedPayload,
          exec?.durationMs,
          exec?.error
        );

        stepDetails.push({
          stepId: step.id,
          stepIndex: index,
          stepLabel,
          status: stepEval.status,
          message: stepEval.message,
          actualValue: stepEval.actualValue,
        });

        if (stepEval.status === 'failed') {
          allPassed = false;
          if (!firstFailureMessage) {
            firstFailureMessage = stepEval.message;
            primaryStepId = step.id;
          }
        }
      }

      const status: AssertionStatus = allPassed ? 'passed' : 'failed';
      const explanation = allPassed
        ? `Passed across all ${matchingSteps.length} matching tool call(s).`
        : `Failed on ${stepDetails.filter((d) => d.status === 'failed').length} of ${matchingSteps.length} tool call(s). ${firstFailureMessage}`;

      results.push({
        assertionId: assertion.id,
        assertionName: assertion.name,
        checkType: assertion.checkType,
        target: assertion.target,
        targetToolName: assertion.targetToolName,
        enabled: true,
        status,
        explanation,
        stepId: primaryStepId || matchingSteps[0]?.step.id,
        stepLabel: `All matching tool calls (${matchingSteps.length})`,
        stepDetails,
      });
    }
  }

  const summary: AssertionSummary = {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };

  return { results, summary };
}
