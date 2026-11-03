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
import { evaluateWorkflowAssertions, StepExecutionSnapshot } from './assertionEngine';

export type AssertionDemoOverride =
  | 'none'
  | 'inject_password'
  | 'inject_missing_id'
  | 'inject_disallowed_priority'
  | 'inject_zero_kb_matches'
  | 'inject_sla_breach';

export interface StepReplayExecution {
  step: TraceStep;
  result: StepReplayResult;
  replayedPayload: unknown;
  durationMs: number;
  error?: string;
}

export type ProgressCallback = (
  stepIndex: number,
  totalSteps: number,
  currentExecution: StepReplayExecution
) => void;

/**
 * Generates simulated replay output based on scenario and optional demo override
 */
export function generateSimulatedStepOutput(
  step: TraceStep,
  scenario: SimulationScenario,
  stepIndex: number,
  demoOverride?: AssertionDemoOverride
): { replayedResult: unknown; durationMs: number; error?: string } {
  let baseDuration = step.durationMs || 150;

  // Handle demo overrides to easily demonstrate passing & failing assertions
  if (demoOverride === 'inject_sla_breach' && (step.tool === 'fetch_ticket' || stepIndex === 1)) {
    baseDuration = 780;
  }

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

  // Deterministic pass scenario: return identical payload (with optional demo mutation)
  let finalPayload: unknown =
    step.type === 'tool_result'
      ? JSON.parse(JSON.stringify(step.result || {}))
      : step.type === 'tool_call'
      ? JSON.parse(JSON.stringify(step.arguments || {}))
      : step.content;

  // Apply demo overrides if requested to make assertion testing crystal clear
  if (demoOverride === 'inject_password' && step.type === 'tool_call') {
    finalPayload = typeof finalPayload === 'object' && finalPayload !== null
      ? { ...(finalPayload as Record<string, unknown>), password: 'temp_admin_secret_9941' }
      : { password: 'temp_admin_secret_9941' };
  } else if (demoOverride === 'inject_missing_id' && step.type === 'tool_result' && typeof finalPayload === 'object' && finalPayload !== null) {
    const copy = { ...(finalPayload as Record<string, unknown>) };
    delete copy.id;
    finalPayload = copy;
  } else if (demoOverride === 'inject_disallowed_priority' && step.type === 'tool_result' && typeof finalPayload === 'object' && finalPayload !== null) {
    const copy = { ...(finalPayload as Record<string, unknown>) };
    copy.priority = 'P9-Disallowed';
    finalPayload = copy;
  } else if (demoOverride === 'inject_zero_kb_matches' && (step.tool === 'search_articles' || stepIndex === 4)) {
    if (step.type === 'tool_result') {
      finalPayload = { query: 'No matching records', total_matches: 0, matched_articles: [] };
    }
  }

  const resolvedDuration =
    demoOverride === 'inject_sla_breach' && (step.tool === 'fetch_ticket' || stepIndex <= 2)
      ? 780
      : Math.max(10, baseDuration + Math.floor((Math.random() - 0.5) * 20));

  return {
    replayedResult: finalPayload,
    durationMs: resolvedDuration,
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
    assertionDemoOverride?: AssertionDemoOverride;
    onProgress?: ProgressCallback;
    abortSignal?: { aborted: boolean };
  }
): Promise<ReplayRun> {
  const startedAt = new Date().toISOString();
  const startTime = Date.now();
  const stepResults: Record<string, StepReplayResult> = {};
  const stepExecutions: Record<string, StepExecutionSnapshot> = {};

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
      i,
      options.assertionDemoOverride
    );

    stepExecutions[step.id] = {
      replayedPayload: replayedResult,
      durationMs,
      error,
    };

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

  // Evaluate assertions across recorded and replayed steps
  const { results: assertionResults, summary: assertionSummary } = evaluateWorkflowAssertions(
    workflow,
    workflow.steps,
    stepExecutions
  );

  // Determine overall status (fails if any step failed OR any enabled assertion failed)
  let overallStatus: 'passed' | 'changed' | 'failed' = 'passed';
  if (failedSteps > 0 || (assertionSummary && assertionSummary.failed > 0)) {
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
    assertionResults,
    assertionSummary,
  };

  return run;
}

/**
 * Builds the sequence of branch steps given a baseline workflow and a divergence modification
 */
export function buildBranchStepsFromModification(
  baselineWorkflow: WorkflowTrace,
  modification: import('@/types/workflow').BranchStepModification
): TraceStep[] {
  const steps: TraceStep[] = [];
  const { stepIndex, newArguments, newResult, newContent } = modification;

  for (let i = 0; i < baselineWorkflow.steps.length; i++) {
    const base = baselineWorkflow.steps[i];

    if (i < stepIndex) {
      // Step before divergence point: identical
      steps.push(JSON.parse(JSON.stringify(base)));
    } else if (i === stepIndex) {
      // Divergence step: apply user modifications
      const divergedStep: TraceStep = JSON.parse(JSON.stringify(base));
      if (newArguments !== undefined) divergedStep.arguments = newArguments;
      if (newResult !== undefined) divergedStep.result = newResult;
      if (newContent !== undefined) divergedStep.content = newContent;
      steps.push(divergedStep);
    } else {
      // Subsequent downstream step: cascade from modification
      const downstreamStep: TraceStep = JSON.parse(JSON.stringify(base));

      // Intelligent cascade for Support ticket triage when priority or status is modified
      const modifiedResult = newResult;
      const isDowngradedPriority =
        modifiedResult &&
        typeof modifiedResult === 'object' &&
        (modifiedResult.priority === 'P3-Low' ||
          modifiedResult.priority === 'P4-Normal' ||
          modifiedResult.status === 'reopened_inquiry' ||
          modifiedResult.status === 'resolved');

      if (isDowngradedPriority && baselineWorkflow.id === 'wf-support-ticket-triage') {
        if (downstreamStep.tool === 'search_articles' && downstreamStep.type === 'tool_call') {
          downstreamStep.arguments = {
            query: 'Invoice receipt styling and currency formatting inquiry',
            category: 'billing-templates',
            limit: 3,
            min_relevance: 0.85,
          };
        } else if (downstreamStep.tool === 'search_articles' && downstreamStep.type === 'tool_result') {
          downstreamStep.result = {
            query: 'Invoice receipt styling and currency formatting inquiry',
            total_matches: 1,
            matched_articles: [
              {
                article_id: 'KB-112',
                title: 'Customizing Invoice Receipts and VAT Tax ID Layouts',
                category: 'Billing Templates',
                relevance_score: 0.94,
                verified_by: 'Billing Documentation Lead',
                summary: 'Instructions for configuring receipt logo branding and localized VAT IDs in account billing settings.',
                resolution_steps: [
                  'Go to Admin Console > Billing & Invoicing > Branding',
                  'Upload organization high-resolution PNG receipt logo',
                  'Toggle "Display Tax ID / VAT Number" on monthly invoice template',
                ],
                estimated_recovery_seconds: 60,
              },
            ],
          };
        } else if (downstreamStep.type === 'assistant') {
          downstreamStep.content = `### Support Ticket Triage: TCK-8921 (Acme Corp)\n\n- **Customer**: Acme Corp (ARR $12,000)\n- **Severity**: ${
            modifiedResult.priority || 'P3-Low'
          } (Standard queue, 24-hour SLA window)\n- **Inquiry**: Customizing PDF receipt formatting and VAT ID placement. No checkout or billing outages.\n\n#### Recommended Action Plan (Per Verified Article KB-112):\n1. **Configure Receipt Branding**: Direct customer to **Billing & Invoicing > Branding** to update the receipt logo.\n2. **Enable VAT Display**: Ensure the "Display Tax ID / VAT Number" toggle is active on invoice preferences.\n3. **Close Ticket with Guide**: Respond with the standard self-serve documentation link. No emergency engineering escalation needed.`;
        }
      }

      steps.push(downstreamStep);
    }
  }

  return steps;
}

/**
 * Executes replay over a branched workflow against the original baseline
 */
export async function executeBranchReplay(
  baselineWorkflow: WorkflowTrace,
  branch: import('@/types/workflow').ReplayBranch,
  options: {
    config: ComparisonConfig;
    playbackSpeed: 'normal' | 'fast' | 'instant';
    onProgress?: (
      stepIndex: number,
      totalSteps: number,
      currentExecution: StepReplayExecution
    ) => void;
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

  for (let i = 0; i < branch.branchSteps.length; i++) {
    if (options.abortSignal?.aborted) {
      break;
    }

    const branchStep = branch.branchSteps[i];
    const baselineStep = baselineWorkflow.steps[i];

    if (delayMultiplier > 0) {
      const stepWait = Math.min(600, Math.max(150, (branchStep.durationMs || 180) * delayMultiplier));
      await new Promise((resolve) => setTimeout(resolve, stepWait));
    }

    const replayedPayload =
      branchStep.type === 'tool_result'
        ? branchStep.result
        : branchStep.type === 'tool_call'
        ? branchStep.arguments
        : branchStep.content;

    const stepComparison = compareStep(
      baselineStep || branchStep,
      replayedPayload,
      branchStep.durationMs || 150,
      undefined,
      options.config
    );

    stepResults[branchStep.id] = stepComparison;

    if (stepComparison.status === 'passed') passedSteps++;
    else if (stepComparison.status === 'changed') changedSteps++;
    else if (stepComparison.status === 'failed') failedSteps++;

    if (options.onProgress) {
      options.onProgress(i, branch.branchSteps.length, {
        step: branchStep,
        result: stepComparison,
        replayedPayload,
        durationMs: branchStep.durationMs || 150,
      });
    }
  }

  const completedAt = new Date().toISOString();
  const totalDuration = Date.now() - startTime;

  // Evaluate assertions on branch execution
  const branchExecutions: Record<string, StepExecutionSnapshot> = {};
  for (const bStep of branch.branchSteps) {
    branchExecutions[bStep.id] = {
      replayedPayload:
        bStep.type === 'tool_result'
          ? bStep.result
          : bStep.type === 'tool_call'
          ? bStep.arguments
          : bStep.content,
      durationMs: bStep.durationMs || 150,
    };
  }

  const { results: assertionResults, summary: assertionSummary } = evaluateWorkflowAssertions(
    baselineWorkflow,
    branch.branchSteps,
    branchExecutions
  );

  let overallStatus: 'passed' | 'changed' | 'failed' = 'passed';
  if (failedSteps > 0 || (assertionSummary && assertionSummary.failed > 0)) {
    overallStatus = 'failed';
  } else if (changedSteps > 0) {
    overallStatus = 'changed';
  }

  const run: ReplayRun = {
    id: `run-branch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workflowId: baselineWorkflow.id,
    workflowName: baselineWorkflow.name,
    branchId: branch.id,
    branchName: branch.name,
    startedAt,
    completedAt,
    mode: 'mock',
    simulationScenario: 'simulate_changed',
    comparisonConfig: options.config,
    overallStatus,
    totalSteps: branch.branchSteps.length,
    passedSteps,
    changedSteps,
    failedSteps,
    durationMs: totalDuration,
    stepResults,
    assertionResults,
    assertionSummary,
  };

  return run;
}

