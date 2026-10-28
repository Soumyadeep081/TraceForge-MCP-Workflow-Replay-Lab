import {
  ComparisonConfig,
  ReplayMode,
  ReplayRun,
  SimulationScenario,
  StepReplayResult,
  TraceStep,
  WorkflowTrace,
} from '@/types/workflow';
import { compareStep } from './comparator';

export interface StepReplayExecution {
  step: TraceStep;
  result: StepReplayResult;
  replayedPayload: any;
  durationMs: number;
  error?: string;
}

export type ProgressCallback = (
  stepIndex: number,
  totalSteps: number,
  currentExecution: StepReplayExecution
) => void;

/**
 * Generates simulated replay output based on scenario
 */
export function generateSimulatedStepOutput(
  step: TraceStep,
  scenario: SimulationScenario,
  stepIndex: number
): { replayedResult: any; durationMs: number; error?: string } {
  const baseDuration = step.durationMs || 150;

  // Latency scenario
  if (scenario === 'simulate_latency') {
    if (step.type === 'tool_call' || step.type === 'tool_result') {
      return {
        replayedResult: step.result ? JSON.parse(JSON.stringify(step.result)) : step.arguments,
        durationMs: baseDuration * 15 + Math.floor(Math.random() * 500),
      };
    }
  }

  // Failure scenario
  if (scenario === 'simulate_failure') {
    // Fail on knowledge base search or the second tool call in the workflow
    const isTargetTool =
      step.tool === 'search_articles' ||
      step.tool === 'scan_vulnerabilities' ||
      step.tool === 'analyze_ddl_lock' ||
      stepIndex === 3 ||
      stepIndex === 4;

    if (isTargetTool && (step.type === 'tool_call' || step.type === 'tool_result')) {
      return {
        replayedResult: null,
        durationMs: baseDuration + 450,
        error: `MCP Protocol Error [-32603]: Upstream server '${step.server || 'mock-server'}' failed to respond. HTTP 503 Service Unavailable: connection reset by peer.`,
      };
    }
  }

  // Changed result scenario
  if (scenario === 'simulate_changed') {
    if (step.type === 'tool_result' && step.result && typeof step.result === 'object') {
      const cloned = JSON.parse(JSON.stringify(step.result));

      // Realistic changes for Zendesk ticket
      if (step.tool === 'fetch_ticket' || cloned.id === 'TCK-8921') {
        cloned.status = 'in_progress_review';
        if (cloned.customer) {
          cloned.customer.arr = '$135,000';
          cloned.customer.tier = 'Enterprise-Platinum';
        }
        cloned.sla_breach_in_minutes = 15;
        cloned.assigned_team = 'Tier-3 Support & FinOps Escalations';
        return {
          replayedResult: cloned,
          durationMs: baseDuration + 25,
        };
      }

      // Realistic changes for Knowledge Base
      if (step.tool === 'search_articles' || cloned.matched_articles) {
        if (Array.isArray(cloned.matched_articles) && cloned.matched_articles.length > 0) {
          cloned.matched_articles[0].relevance_score = 0.985;
          cloned.matched_articles[0].estimated_recovery_seconds = 30;
          cloned.matched_articles[0].resolution_steps.push(
            'Re-verify TLS 1.3 cipher suite compatibility in gateway policy'
          );
        }
        return {
          replayedResult: cloned,
          durationMs: baseDuration - 15,
        };
      }

      // Realistic changes for GitHub PR
      if (cloned.files_changed) {
        cloned.additions = 64;
        cloned.deletions = 41;
        cloned.risk_score = 'moderate';
        return {
          replayedResult: cloned,
          durationMs: baseDuration + 30,
        };
      }

      // Generic object mutation for other custom workflows
      const keys = Object.keys(cloned);
      if (keys.length > 0) {
        const firstKey = keys[0];
        if (typeof cloned[firstKey] === 'number') {
          cloned[firstKey] = cloned[firstKey] + 1;
        } else if (typeof cloned[firstKey] === 'string') {
          cloned[firstKey] = `${cloned[firstKey]} (updated)`;
        } else {
          cloned.last_modified_audit = new Date().toISOString();
        }
      }
      return {
        replayedResult: cloned,
        durationMs: baseDuration + 20,
      };
    }

    if (step.type === 'assistant' && step.content) {
      return {
        replayedResult: `${step.content}\n\n*[Update: Live ticket status changed to in_progress_review with revised ARR of $135,000]*`,
        durationMs: baseDuration + 50,
      };
    }
  }

  // Deterministic pass scenario: return identical payload
  return {
    replayedResult:
      step.type === 'tool_result'
        ? JSON.parse(JSON.stringify(step.result || {}))
        : step.type === 'tool_call'
        ? JSON.parse(JSON.stringify(step.arguments || {}))
        : step.content,
    durationMs: Math.max(10, baseDuration + Math.floor((Math.random() - 0.5) * 20)),
  };
}

/**
 * Executes a full replay run over a workflow
 */
export async function executeReplayWorkflow(
  workflow: WorkflowTrace,
  options: {
    mode: ReplayMode;
    endpointUrl?: string;
    scenario: SimulationScenario;
    config: ComparisonConfig;
    playbackSpeed: 'normal' | 'fast' | 'instant';
    onProgress?: ProgressCallback;
    abortSignal?: { aborted: boolean };
  }
): Promise<ReplayRun> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const stepResults: Record<string, StepReplayResult> = {};

  let passedSteps = 0;
  let changedSteps = 0;
  let failedSteps = 0;

  const delayMultiplier =
    options.playbackSpeed === 'instant' ? 0 : options.playbackSpeed === 'fast' ? 0.3 : 1;

  for (let i = 0; i < workflow.steps.length; i++) {
    if (options.abortSignal?.aborted) {
      break;
    }

    const step = workflow.steps[i];

    // Artificial delay to simulate real tool execution and give visual progress feedback
    if (delayMultiplier > 0) {
      const stepWait = Math.min(600, Math.max(150, (step.durationMs || 200) * delayMultiplier));
      await new Promise((resolve) => setTimeout(resolve, stepWait));
    }

    // Generate output
    const { replayedResult, durationMs, error } = generateSimulatedStepOutput(
      step,
      options.scenario,
      i
    );

    // Run comparator
    const stepComparison = compareStep(step, replayedResult, durationMs, error, options.config);

    stepResults[step.id] = stepComparison;

    if (stepComparison.status === 'passed') passedSteps++;
    else if (stepComparison.status === 'changed') changedSteps++;
    else if (stepComparison.status === 'failed') failedSteps++;

    if (options.onProgress) {
      options.onProgress(i, workflow.steps.length, {
        step,
        result: stepComparison,
        replayedPayload: replayedResult,
        durationMs,
        error,
      });
    }
  }

  const completedAt = new Date().toISOString();
  const totalDuration = Date.now() - startTime;

  // Determine overall status
  let overallStatus: 'passed' | 'changed' | 'failed' = 'passed';
  if (failedSteps > 0) {
    overallStatus = 'failed';
  } else if (changedSteps > 0) {
    overallStatus = 'changed';
  }

  const run: ReplayRun = {
    id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    startedAt,
    completedAt,
    mode: options.mode,
    endpointUrl: options.endpointUrl,
    simulationScenario: options.scenario,
    comparisonConfig: options.config,
    overallStatus,
    totalSteps: workflow.steps.length,
    passedSteps,
    changedSteps,
    failedSteps,
    durationMs: totalDuration,
    stepResults,
  };

  return run;
}
