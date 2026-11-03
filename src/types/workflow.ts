export type StepType = 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'error';

export interface TraceStep {
  id: string;
  type: StepType;
  timestamp: string; // ISO-8601 string
  server?: string;
  tool?: string;
  arguments?: any;
  result?: any;
  durationMs?: number;
  content?: string;
}

export type AssertionCheckType =
  | 'json_path_exists'
  | 'json_path_missing'
  | 'json_path_equals'
  | 'string_matches'
  | 'numeric_range'
  | 'argument_value'
  | 'duration_limit';

export type AssertionTarget = 'step' | 'all_tool_calls';

export interface WorkflowAssertion {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  target: AssertionTarget;
  targetStepId?: string; // Target step id when target === 'step'
  targetToolName?: string; // Optional tool filter when target === 'all_tool_calls'
  checkType: AssertionCheckType;

  // JSON path configuration
  jsonPath?: string; // e.g. "id", "customer.arr", "matched_articles[0].article_id", "total_matches"
  expectedValue?: unknown; // Value to compare against in json_path_equals

  // String & Regex matching configuration
  stringMode?: 'contains' | 'regex' | 'one_of';
  stringPattern?: string; // Substring or regular expression pattern
  allowedValues?: string[]; // Allowed values list e.g. ["P1-Critical", "P2-High", "P3-Low", "P4-Normal"]
  caseSensitive?: boolean;

  // Numeric range configuration
  numericOperator?: 'above' | 'below' | 'within_range' | 'above_or_equal' | 'below_or_equal';
  minValue?: number;
  maxValue?: number;
  threshold?: number;

  // Argument value inspection
  argumentOperator?: 'includes' | 'excludes';
  argumentKey?: string; // Specific argument key or undefined to inspect entire args
  argumentValue?: unknown; // Value to check inclusion or exclusion (e.g. "password")

  // Duration limit configuration
  maxDurationMs?: number;
}

export type AssertionStatus = 'passed' | 'failed' | 'skipped';

export interface StepAssertionDetail {
  stepId: string;
  stepIndex: number;
  stepLabel: string;
  status: AssertionStatus;
  message: string;
  actualValue?: unknown;
}

export interface AssertionResult {
  assertionId: string;
  assertionName: string;
  checkType: AssertionCheckType;
  target: AssertionTarget;
  targetStepId?: string;
  targetToolName?: string;
  enabled: boolean;
  status: AssertionStatus;
  explanation: string;
  stepId?: string;
  stepLabel?: string;
  actualValue?: unknown;
  expectedValue?: unknown;
  stepDetails?: StepAssertionDetail[];
}

export interface AssertionSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface WorkflowTraceExport {
  name: string;
  description: string;
  steps: TraceStep[];
  assertions?: WorkflowAssertion[];
}

export interface WorkflowTrace extends WorkflowTraceExport {
  id: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastReplayStatus?: 'passed' | 'changed' | 'failed' | 'not_run';
  assertions?: WorkflowAssertion[];
}

export type StepReplayStatus = 'passed' | 'changed' | 'failed';

export interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'modified';
  baselineValue?: any;
  replayedValue?: any;
  message?: string;
}

export interface StepReplayResult {
  stepId: string;
  status: StepReplayStatus;
  baselineResult?: any;
  replayedResult?: any;
  baselineDurationMs?: number;
  replayedDurationMs?: number;
  diffs: DiffEntry[];
  error?: string;
  reason?: string;
}

export interface ComparisonConfig {
  ignoredFields: string[]; // e.g. ["timestamp", "requestId", "idempotency_key", "created_at"]
  selectedPathsOnly: string[]; // if non-empty, only compare these JSON paths
  ignoreObjectKeyOrder: boolean;
  ignoreStringCase: boolean;
  numericTolerance: number; // e.g. 0.001
}

export type ReplayMode = 'mock' | 'endpoint_preview';

export type SimulationScenario =
  | 'deterministic_pass'
  | 'simulate_changed'
  | 'simulate_failure'
  | 'simulate_latency';

export interface ReplayRun {
  id: string;
  workflowId: string;
  workflowName: string;
  branchId?: string;
  branchName?: string;
  startedAt: string;
  completedAt: string;
  mode: ReplayMode;
  endpointUrl?: string;
  simulationScenario: SimulationScenario;
  comparisonConfig: ComparisonConfig;
  overallStatus: 'passed' | 'changed' | 'failed';
  totalSteps: number;
  passedSteps: number;
  changedSteps: number;
  failedSteps: number;
  durationMs: number;
  stepResults: Record<string, StepReplayResult>;
  assertionResults?: AssertionResult[];
  assertionSummary?: AssertionSummary;
}

export interface BranchStepModification {
  stepId: string;
  stepIndex: number;
  newArguments?: any;
  newResult?: any;
  newContent?: string;
}

export interface ReplayBranch {
  id: string;
  name: string;
  workflowId: string;
  workflowName: string;
  divergedAtStepId: string;
  divergedAtStepIndex: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  modification: BranchStepModification;
  branchSteps: TraceStep[];
  latestRun?: ReplayRun;
  lastReplayStatus?: 'passed' | 'changed' | 'failed' | 'not_run';
}
