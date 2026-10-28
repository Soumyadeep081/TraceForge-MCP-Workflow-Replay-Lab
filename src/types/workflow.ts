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

export interface WorkflowTraceExport {
  name: string;
  description: string;
  steps: TraceStep[];
}

export interface WorkflowTrace extends WorkflowTraceExport {
  id: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  lastReplayStatus?: 'passed' | 'changed' | 'failed' | 'not_run';
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
}
