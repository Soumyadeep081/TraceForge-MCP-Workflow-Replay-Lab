'use client';

import React, { useState, useEffect } from 'react';
import {
  ComparisonConfig,
  ReplayBranch,
  ReplayRun,
  TraceStep,
  WorkflowTrace,
} from '@/types/workflow';
import {
  clearReplayRuns,
  deleteBranch,
  deleteReplayRun,
  deleteWorkflow,
  getBranchById,
  getComparisonConfig,
  getStoredBranches,
  getStoredReplayRuns,
  getStoredWorkflows,
  resetToSeedBranches,
  resetToSeedWorkflows,
  saveBranch,
  saveComparisonConfig,
  saveReplayRun,
  saveWorkflow,
} from '@/lib/storage';
import { Navbar, NavTab } from '@/components/Navbar';
import { WorkflowLibrary } from '@/components/WorkflowLibrary';
import { WorkflowTimeline } from '@/components/WorkflowTimeline';
import { ReplayLab } from '@/components/ReplayLab';
import { RegressionHistoryView } from '@/components/RegressionHistoryView';
import { StepDetailDrawer } from '@/components/StepDetailDrawer';
import { ComparisonConfigModal } from '@/components/ComparisonConfigModal';
import { NewWorkflowModal } from '@/components/NewWorkflowModal';
import { ImportExportModal } from '@/components/ImportExportModal';
import { BranchReplayModal } from '@/components/BranchReplayModal';
import { BranchReplayView } from '@/components/BranchReplayView';
import { SEEDED_BRANCHES, SEEDED_WORKFLOWS } from '@/lib/seedData';

export default function TraceForgeApp() {
  const [mounted, setMounted] = useState(false);
  const [workflows, setWorkflows] = useState<WorkflowTrace[]>(SEEDED_WORKFLOWS);
  const [branches, setBranches] = useState<ReplayBranch[]>(SEEDED_BRANCHES);
  const [replayRuns, setReplayRuns] = useState<ReplayRun[]>([]);
  const [comparisonConfig, setComparisonConfig] = useState<ComparisonConfig>(getComparisonConfig());

  // Navigation & Selection State
  const [activeTab, setActiveTab] = useState<NavTab>('library');
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('wf-support-ticket-triage');
  const [activeBranchId, setActiveBranchId] = useState<string>('branch-support-ticket-p3');
  const [selectedStep, setSelectedStep] = useState<TraceStep | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isNewWorkflowModalOpen, setIsNewWorkflowModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [exportWorkflowTarget, setExportWorkflowTarget] = useState<WorkflowTrace | null>(null);

  // Branch creation modal state
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchTargetStep, setBranchTargetStep] = useState<TraceStep | null>(null);
  const [branchTargetStepIndex, setBranchTargetStepIndex] = useState<number>(0);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const loadedWorkflows = getStoredWorkflows();
    const loadedBranches = getStoredBranches();
    const loadedRuns = getStoredReplayRuns();
    const loadedConfig = getComparisonConfig();

    setWorkflows(loadedWorkflows);
    setBranches(loadedBranches);
    setReplayRuns(loadedRuns);
    setComparisonConfig(loadedConfig);

    if (loadedWorkflows.length > 0) {
      setActiveWorkflowId(loadedWorkflows[0].id);
    }
    if (loadedBranches.length > 0) {
      setActiveBranchId(loadedBranches[0].id);
    }
    setMounted(true);
  }, []);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) || workflows[0] || null;
  const workflowBranches = branches.filter((b) => b.workflowId === activeWorkflow?.id);
  const activeBranch = branches.find((b) => b.id === activeBranchId) || workflowBranches[0] || null;

  // Handlers
  const handleOpenWorkflow = (id: string) => {
    setActiveWorkflowId(id);
    setActiveTab('timeline');
    setIsDrawerOpen(false);
  };

  const handleQuickReplay = (id: string) => {
    setActiveWorkflowId(id);
    setActiveTab('replay');
    setIsDrawerOpen(false);
  };

  const handleSelectStep = (step: TraceStep, index: number) => {
    setSelectedStep(step);
    setSelectedStepIndex(index);
    setIsDrawerOpen(true);
  };

  const handleUpdateStep = (updatedStep: TraceStep) => {
    if (!activeWorkflow) return;
    const updatedSteps = activeWorkflow.steps.map((s) =>
      s.id === updatedStep.id ? updatedStep : s
    );
    const updatedWf: WorkflowTrace = {
      ...activeWorkflow,
      steps: updatedSteps,
    };
    saveWorkflow(updatedWf);
    setWorkflows(getStoredWorkflows());
    setSelectedStep(updatedStep);
    showToast('Step updated successfully');
  };

  const handleDeleteStep = (stepId: string) => {
    if (!activeWorkflow) return;
    const updatedSteps = activeWorkflow.steps.filter((s) => s.id !== stepId);
    const updatedWf: WorkflowTrace = {
      ...activeWorkflow,
      steps: updatedSteps,
    };
    saveWorkflow(updatedWf);
    setWorkflows(getStoredWorkflows());
    setIsDrawerOpen(false);
    showToast('Step removed from workflow');
  };

  const handleAddStep = (newStep: TraceStep) => {
    if (!activeWorkflow) return;
    const updatedWf: WorkflowTrace = {
      ...activeWorkflow,
      steps: [...activeWorkflow.steps, newStep],
    };
    saveWorkflow(updatedWf);
    setWorkflows(getStoredWorkflows());
    showToast('New step appended to timeline');
  };

  const handleReorderSteps = (startIndex: number, endIndex: number) => {
    if (!activeWorkflow) return;
    if (startIndex < 0 || endIndex < 0 || endIndex >= activeWorkflow.steps.length) return;

    const steps = [...activeWorkflow.steps];
    const [moved] = steps.splice(startIndex, 1);
    steps.splice(endIndex, 0, moved);

    const updatedWf: WorkflowTrace = {
      ...activeWorkflow,
      steps,
    };
    saveWorkflow(updatedWf);
    setWorkflows(getStoredWorkflows());
  };

  const handleSaveReplayRun = (run: ReplayRun) => {
    saveReplayRun(run);
    setReplayRuns(getStoredReplayRuns());
    setWorkflows(getStoredWorkflows());
    setBranches(getStoredBranches());
    showToast(`Replay completed: ${run.overallStatus.toUpperCase()}`);
  };

  const handleDeleteRun = (runId: string) => {
    deleteReplayRun(runId);
    setReplayRuns(getStoredReplayRuns());
    showToast('Replay run deleted');
  };

  const handleClearRuns = () => {
    clearReplayRuns();
    setReplayRuns([]);
    showToast('Replay history cleared');
  };

  const handleResetSeeds = () => {
    const defaultSeeds = resetToSeedWorkflows();
    const defaultBranches = resetToSeedBranches();
    setWorkflows(defaultSeeds);
    setBranches(defaultBranches);
    if (defaultSeeds.length > 0) {
      setActiveWorkflowId(defaultSeeds[0].id);
    }
    if (defaultBranches.length > 0) {
      setActiveBranchId(defaultBranches[0].id);
    }
    showToast('Demo workflows and branches restored to default seed state');
  };

  const handleNewWorkflow = (newWf: WorkflowTrace) => {
    saveWorkflow(newWf);
    const updated = getStoredWorkflows();
    setWorkflows(updated);
    setActiveWorkflowId(newWf.id);
    setActiveTab('timeline');
    showToast(`Workflow "${newWf.name}" created`);
  };

  const handleImportWorkflow = (importedWf: WorkflowTrace) => {
    saveWorkflow(importedWf);
    const updated = getStoredWorkflows();
    setWorkflows(updated);
    setActiveWorkflowId(importedWf.id);
    setActiveTab('timeline');
    showToast(`Imported "${importedWf.name}" with ${importedWf.steps.length} steps`);
  };

  const handleDuplicateWorkflow = (source: WorkflowTrace) => {
    const clone: WorkflowTrace = {
      ...source,
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: undefined,
      lastReplayStatus: 'not_run',
      steps: source.steps.map((s, idx) => ({
        ...s,
        id: `step-${idx + 1}-${Date.now().toString().slice(-4)}`,
      })),
    };
    saveWorkflow(clone);
    setWorkflows(getStoredWorkflows());
    setActiveWorkflowId(clone.id);
    setActiveTab('timeline');
    showToast(`Duplicated "${source.name}"`);
  };

  const handleDeleteWorkflow = (id: string) => {
    deleteWorkflow(id);
    const remaining = getStoredWorkflows();
    setWorkflows(remaining);
    setBranches(getStoredBranches());
    if (activeWorkflowId === id && remaining.length > 0) {
      setActiveWorkflowId(remaining[0].id);
    }
    showToast('Workflow deleted');
  };

  const handleSaveConfig = (newConfig: ComparisonConfig) => {
    saveComparisonConfig(newConfig);
    setComparisonConfig(newConfig);
    showToast('Comparison rules updated');
  };

  // Branch Replay Handlers
  const handleOpenBranchModal = (step: TraceStep, index: number) => {
    setBranchTargetStep(step);
    setBranchTargetStepIndex(index);
    setIsBranchModalOpen(true);
  };

  const handleCreateBranch = (newBranch: ReplayBranch) => {
    saveBranch(newBranch);
    const updated = getStoredBranches();
    setBranches(updated);
    setActiveBranchId(newBranch.id);
    setActiveTab('branch');
    showToast(`Branch "${newBranch.name}" created`);
  };

  const handleSelectBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    setActiveTab('branch');
  };

  const handleUpdateBranch = (updated: ReplayBranch) => {
    saveBranch(updated);
    setBranches(getStoredBranches());
    showToast(`Branch "${updated.name}" updated`);
  };

  const handleDeleteBranch = (branchId: string) => {
    deleteBranch(branchId);
    const remaining = getStoredBranches(activeWorkflow?.id);
    setBranches(getStoredBranches());
    if (remaining.length > 0) {
      setActiveBranchId(remaining[0].id);
    }
    setActiveTab('timeline');
    showToast('Branch deleted');
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-slate-400 text-xs font-mono">
        Loading TraceForge MCP Lab...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs font-medium shadow-xl animate-bounce">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeWorkflowName={activeWorkflow?.name}
        hasActiveWorkflow={!!activeWorkflow}
        activeBranchName={activeBranch?.name}
        hasActiveBranch={!!activeBranch}
        onOpenRules={() => setIsConfigModalOpen(true)}
        onNewWorkflow={() => setIsNewWorkflowModalOpen(true)}
        onImportTrace={() => {
          setExportWorkflowTarget(null);
          setIsImportModalOpen(true);
        }}
        workflowsCount={workflows.length}
        runsCount={replayRuns.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'library' && (
          <WorkflowLibrary
            workflows={workflows}
            onOpenWorkflow={handleOpenWorkflow}
            onQuickReplay={handleQuickReplay}
            onNewWorkflow={() => setIsNewWorkflowModalOpen(true)}
            onImportWorkflow={() => {
              setExportWorkflowTarget(null);
              setIsImportModalOpen(true);
            }}
            onDuplicateWorkflow={handleDuplicateWorkflow}
            onDeleteWorkflow={handleDeleteWorkflow}
            onResetSeeds={handleResetSeeds}
          />
        )}

        {activeTab === 'timeline' && activeWorkflow && (
          <WorkflowTimeline
            workflow={activeWorkflow}
            branches={workflowBranches}
            onSelectStep={handleSelectStep}
            selectedStepId={selectedStep?.id}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
            onReorderSteps={handleReorderSteps}
            onStartReplay={() => setActiveTab('replay')}
            onOpenRules={() => setIsConfigModalOpen(true)}
            onBranchStep={handleOpenBranchModal}
            onSelectBranch={handleSelectBranch}
          />
        )}

        {activeTab === 'branch' && activeWorkflow && activeBranch && (
          <BranchReplayView
            workflow={activeWorkflow}
            branch={activeBranch}
            config={comparisonConfig}
            onUpdateBranch={handleUpdateBranch}
            onDeleteBranch={handleDeleteBranch}
            onSaveRun={handleSaveReplayRun}
            onBackToWorkflow={() => setActiveTab('timeline')}
            onOpenRules={() => setIsConfigModalOpen(true)}
          />
        )}

        {activeTab === 'replay' && activeWorkflow && (
          <ReplayLab
            workflow={activeWorkflow}
            config={comparisonConfig}
            onOpenRules={() => setIsConfigModalOpen(true)}
            onSaveRun={handleSaveReplayRun}
            onBackToWorkflow={() => setActiveTab('timeline')}
          />
        )}

        {activeTab === 'history' && (
          <RegressionHistoryView
            runs={replayRuns}
            workflows={workflows}
            onDeleteRun={handleDeleteRun}
            onClearRuns={handleClearRuns}
            onOpenWorkflow={handleOpenWorkflow}
          />
        )}
      </main>

      {/* Step Detail Side Drawer */}
      <StepDetailDrawer
        step={selectedStep}
        stepIndex={selectedStepIndex}
        totalSteps={activeWorkflow?.steps.length || 0}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdateStep={handleUpdateStep}
        onDeleteStep={handleDeleteStep}
        onBranchStep={handleOpenBranchModal}
      />

      {/* Branch Replay Creation Modal */}
      {isBranchModalOpen && activeWorkflow && (
        <BranchReplayModal
          isOpen={isBranchModalOpen}
          onClose={() => setIsBranchModalOpen(false)}
          workflow={activeWorkflow}
          step={branchTargetStep}
          stepIndex={branchTargetStepIndex}
          onCreateBranch={handleCreateBranch}
        />
      )}

      {/* Comparison Rules Configuration Modal */}
      <ComparisonConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={comparisonConfig}
        onSave={handleSaveConfig}
      />

      {/* New Workflow Modal */}
      <NewWorkflowModal
        isOpen={isNewWorkflowModalOpen}
        onClose={() => setIsNewWorkflowModalOpen(false)}
        onCreate={handleNewWorkflow}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportWorkflow}
        exportWorkflow={exportWorkflowTarget || activeWorkflow}
      />

      {/* Footer info banner */}
      <footer className="border-t border-slate-900 bg-[#06090f] py-4 text-center text-[11px] text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>TraceForge Engine: Deterministic Mock Replay Active</span>
          </div>
          <div className="font-mono text-slate-400">
            Model Context Protocol (MCP) Replay Lab • Local Sandbox Simulation
          </div>
        </div>
      </footer>
    </div>
  );
}
