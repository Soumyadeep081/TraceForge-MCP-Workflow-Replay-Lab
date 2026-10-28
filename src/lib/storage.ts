import { ComparisonConfig, ReplayBranch, ReplayRun, WorkflowTrace } from '@/types/workflow';
import { DEFAULT_COMPARISON_CONFIG, SEEDED_BRANCHES, SEEDED_WORKFLOWS } from './seedData';

const WORKFLOWS_STORAGE_KEY = 'traceforge_workflows_v1';
const REPLAY_RUNS_STORAGE_KEY = 'traceforge_replay_runs_v1';
const COMPARISON_CONFIG_KEY = 'traceforge_comparison_config_v1';
const BRANCHES_STORAGE_KEY = 'traceforge_branches_v1';

export function getStoredWorkflows(): WorkflowTrace[] {
  if (typeof window === 'undefined') return SEEDED_WORKFLOWS;
  try {
    const raw = localStorage.getItem(WORKFLOWS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(SEEDED_WORKFLOWS));
      return SEEDED_WORKFLOWS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEEDED_WORKFLOWS;
  } catch (err) {
    console.error('Error reading workflows from localStorage:', err);
    return SEEDED_WORKFLOWS;
  }
}

export function saveStoredWorkflows(workflows: WorkflowTrace[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(workflows));
  } catch (err) {
    console.error('Error saving workflows to localStorage:', err);
  }
}

export function getWorkflowById(id: string): WorkflowTrace | undefined {
  const workflows = getStoredWorkflows();
  return workflows.find((w) => w.id === id);
}

export function saveWorkflow(workflow: WorkflowTrace): void {
  const workflows = getStoredWorkflows();
  const index = workflows.findIndex((w) => w.id === workflow.id);
  const updatedWorkflow: WorkflowTrace = {
    ...workflow,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    workflows[index] = updatedWorkflow;
  } else {
    workflows.unshift(updatedWorkflow);
  }
  saveStoredWorkflows(workflows);
}

export function deleteWorkflow(id: string): void {
  const workflows = getStoredWorkflows();
  const filtered = workflows.filter((w) => w.id !== id);
  saveStoredWorkflows(filtered);

  // Also remove associated branches
  const branches = getStoredBranches().filter((b) => b.workflowId !== id);
  saveStoredBranches(branches);
}

export function resetToSeedWorkflows(): WorkflowTrace[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(WORKFLOWS_STORAGE_KEY, JSON.stringify(SEEDED_WORKFLOWS));
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(SEEDED_BRANCHES));
  }
  return SEEDED_WORKFLOWS;
}

// Branches storage
export function getStoredBranches(workflowId?: string): ReplayBranch[] {
  if (typeof window === 'undefined') return SEEDED_BRANCHES;
  try {
    const raw = localStorage.getItem(BRANCHES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(SEEDED_BRANCHES));
      return workflowId
        ? SEEDED_BRANCHES.filter((b) => b.workflowId === workflowId)
        : SEEDED_BRANCHES;
    }
    const parsed: ReplayBranch[] = JSON.parse(raw);
    const branches = Array.isArray(parsed) && parsed.length > 0 ? parsed : SEEDED_BRANCHES;
    return workflowId ? branches.filter((b) => b.workflowId === workflowId) : branches;
  } catch (err) {
    console.error('Error reading branches from localStorage:', err);
    return workflowId
      ? SEEDED_BRANCHES.filter((b) => b.workflowId === workflowId)
      : SEEDED_BRANCHES;
  }
}

export function saveStoredBranches(branches: ReplayBranch[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
  } catch (err) {
    console.error('Error saving branches to localStorage:', err);
  }
}

export function getBranchById(id: string): ReplayBranch | undefined {
  const branches = getStoredBranches();
  return branches.find((b) => b.id === id);
}

export function saveBranch(branch: ReplayBranch): void {
  const branches = getStoredBranches();
  const index = branches.findIndex((b) => b.id === branch.id);
  const updated: ReplayBranch = {
    ...branch,
    updatedAt: new Date().toISOString(),
  };

  if (index >= 0) {
    branches[index] = updated;
  } else {
    branches.unshift(updated);
  }
  saveStoredBranches(branches);
}

export function deleteBranch(id: string): void {
  const branches = getStoredBranches().filter((b) => b.id !== id);
  saveStoredBranches(branches);
}

export function resetToSeedBranches(): ReplayBranch[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(SEEDED_BRANCHES));
  }
  return SEEDED_BRANCHES;
}

// Replay history
export function getStoredReplayRuns(workflowId?: string): ReplayRun[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPLAY_RUNS_STORAGE_KEY);
    if (!raw) return [];
    const runs: ReplayRun[] = JSON.parse(raw);
    if (workflowId) {
      return runs.filter((r) => r.workflowId === workflowId);
    }
    return runs;
  } catch (err) {
    console.error('Error reading replay runs from localStorage:', err);
    return [];
  }
}

export function saveReplayRun(run: ReplayRun): void {
  if (typeof window === 'undefined') return;
  try {
    const runs = getStoredReplayRuns();
    // Keep up to 100 recent runs
    const updated = [run, ...runs.filter((r) => r.id !== run.id)].slice(0, 100);
    localStorage.setItem(REPLAY_RUNS_STORAGE_KEY, JSON.stringify(updated));

    // Also update workflow lastRunAt and lastReplayStatus
    const workflows = getStoredWorkflows();
    const wf = workflows.find((w) => w.id === run.workflowId);
    if (wf) {
      wf.lastRunAt = run.completedAt;
      wf.lastReplayStatus = run.overallStatus;
      saveStoredWorkflows(workflows);
    }
  } catch (err) {
    console.error('Error saving replay run to localStorage:', err);
  }
}

export function deleteReplayRun(runId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const runs = getStoredReplayRuns().filter((r) => r.id !== runId);
    localStorage.setItem(REPLAY_RUNS_STORAGE_KEY, JSON.stringify(runs));
  } catch (err) {
    console.error('Error deleting replay run:', err);
  }
}

export function clearReplayRuns(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REPLAY_RUNS_STORAGE_KEY);
}

// Comparison config
export function getComparisonConfig(): ComparisonConfig {
  if (typeof window === 'undefined') return DEFAULT_COMPARISON_CONFIG;
  try {
    const raw = localStorage.getItem(COMPARISON_CONFIG_KEY);
    if (!raw) return DEFAULT_COMPARISON_CONFIG;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_COMPARISON_CONFIG;
  }
}

export function saveComparisonConfig(config: ComparisonConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COMPARISON_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving comparison config:', err);
  }
}
