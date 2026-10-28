'use client';

import React, { useState, useEffect } from 'react';
import {
  ComparisonConfig,
  ReplayBranch,
  ReplayRun,
  StepReplayResult,
  TraceStep,
  WorkflowTrace,
} from '@/types/workflow';
import { executeBranchReplay } from '@/lib/replayEngine';
import { DiffViewer } from './DiffViewer';
import { JsonViewer } from './JsonViewer';
import {
  GitFork,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Check,
  Save,
  Server,
  Wrench,
  Clock,
  Radio,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';

interface BranchReplayViewProps {
  workflow: WorkflowTrace;
  branch: ReplayBranch;
  config: ComparisonConfig;
  onUpdateBranch: (updated: ReplayBranch) => void;
  onDeleteBranch: (branchId: string) => void;
  onSaveRun: (run: ReplayRun) => void;
  onBackToWorkflow: () => void;
  onOpenRules: () => void;
}

export function BranchReplayView({
  workflow,
  branch,
  config,
  onUpdateBranch,
  onDeleteBranch,
  onSaveRun,
  onBackToWorkflow,
  onOpenRules,
}: BranchReplayViewProps) {
  // Editing branch name
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(branch.name);

  // Execution state
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<'normal' | 'fast' | 'instant'>('normal');
  const [liveResults, setLiveResults] = useState<Record<string, StepReplayResult>>({});
  const [activeStepIndex, setActiveStepIndex] = useState<number>(branch.divergedAtStepIndex);

  // Divergence step editing modal state
  const [isEditingDivergence, setIsEditingDivergence] = useState(false);
  const [divergenceArgsRaw, setDivergenceArgsRaw] = useState('');
  const [divergenceResultRaw, setDivergenceResultRaw] = useState('');
  const [divergenceError, setDivergenceError] = useState<string | null>(null);

  // Load existing run results if available
  useEffect(() => {
    if (branch.latestRun?.stepResults) {
      setLiveResults(branch.latestRun.stepResults);
    }
  }, [branch]);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      onUpdateBranch({
        ...branch,
        name: nameInput.trim(),
      });
      setIsEditingName(false);
    }
  };

  const handleOpenDivergenceEdit = () => {
    const divStep = branch.branchSteps[branch.divergedAtStepIndex];
    if (divStep) {
      setDivergenceArgsRaw(divStep.arguments ? JSON.stringify(divStep.arguments, null, 2) : '');
      setDivergenceResultRaw(divStep.result ? JSON.stringify(divStep.result, null, 2) : '');
      setDivergenceError(null);
      setIsEditingDivergence(true);
    }
  };

  const handleSaveDivergenceEdit = () => {
    setDivergenceError(null);
    let parsedArgs = undefined;
    let parsedResult = undefined;

    try {
      if (divergenceArgsRaw.trim()) {
        parsedArgs = JSON.parse(divergenceArgsRaw);
      }
    } catch (e: any) {
      setDivergenceError(`Arguments JSON error: ${e.message}`);
      return;
    }

    try {
      if (divergenceResultRaw.trim()) {
        parsedResult = JSON.parse(divergenceResultRaw);
      }
    } catch (e: any) {
      setDivergenceError(`Mock Result JSON error: ${e.message}`);
      return;
    }

    const updatedSteps = [...branch.branchSteps];
    const target = { ...updatedSteps[branch.divergedAtStepIndex] };
    if (parsedArgs !== undefined) target.arguments = parsedArgs;
    if (parsedResult !== undefined) target.result = parsedResult;
    updatedSteps[branch.divergedAtStepIndex] = target;

    const updatedBranch: ReplayBranch = {
      ...branch,
      modification: {
        ...branch.modification,
        newArguments: parsedArgs,
        newResult: parsedResult,
      },
      branchSteps: updatedSteps,
      lastReplayStatus: 'not_run',
    };

    onUpdateBranch(updatedBranch);
    setIsEditingDivergence(false);
  };

  const handleExecuteBranchReplay = async () => {
    setIsReplaying(true);
    setCurrentStepIdx(0);
    setLiveResults({});

    try {
      const run = await executeBranchReplay(workflow, branch, {
        config,
        playbackSpeed,
        onProgress: (idx, total, execution) => {
          setCurrentStepIdx(idx);
          setLiveResults((prev) => ({
            ...prev,
            [execution.step.id]: execution.result,
          }));
        },
      });

      const updatedBranch: ReplayBranch = {
        ...branch,
        latestRun: run,
        lastReplayStatus: run.overallStatus,
      };

      onUpdateBranch(updatedBranch);
      onSaveRun(run);
    } catch (err) {
      console.error('Error executing branch replay:', err);
    } finally {
      setIsReplaying(false);
    }
  };

  const baselineStep = workflow.steps[activeStepIndex];
  const branchStep = branch.branchSteps[activeStepIndex];
  const stepResult = branchStep ? liveResults[branchStep.id] : undefined;

  const totalSteps = branch.branchSteps.length;
  const passedCount = Object.values(liveResults).filter((r) => r.status === 'passed').length;
  const changedCount = Object.values(liveResults).filter((r) => r.status === 'changed').length;
  const failedCount = Object.values(liveResults).filter((r) => r.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToWorkflow}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Back to Workflow"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  <GitFork className="w-3 h-3" /> Branch Replay
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Base: {workflow.name}
                </span>
              </div>

              {/* Branch Name with inline editing */}
              <div className="flex items-center gap-2 mt-1">
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="bg-slate-950 border border-indigo-500 rounded px-2.5 py-1 text-sm font-bold text-slate-100"
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                      title="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-100">{branch.name}</h1>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300"
                      title="Rename branch"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Rules</span>
            </button>

            <button
              onClick={handleOpenDivergenceEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Edit Mock Response</span>
            </button>

            <button
              disabled={isReplaying}
              onClick={handleExecuteBranchReplay}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isReplaying ? 'Replaying Branch...' : 'Rerun Branch Replay'}</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete branch "${branch.name}"?`)) onDeleteBranch(branch.id);
              }}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete branch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Divergence description banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-indigo-950/20 border border-indigo-800/40 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="p-1 rounded bg-indigo-500/20 text-indigo-300">
              <GitFork className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-indigo-300">
                Diverged at Step {branch.divergedAtStepIndex + 1}:
              </span>{' '}
              <span className="text-slate-200">
                {branch.branchSteps[branch.divergedAtStepIndex]?.tool ||
                  branch.branchSteps[branch.divergedAtStepIndex]?.type}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {branch.description ||
                  'Subsequent steps replay with the modified mock response to test cascading impact.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
              Local Mock Sandbox (Simulated)
            </span>
          </div>
        </div>
      </div>

      {/* Replay Results Summary Card */}
      {Object.keys(liveResults).length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {changedCount > 0 ? (
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : failedCount > 0 ? (
              <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <XCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>Branch Replay Comparison Results</span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ({branch.branchSteps.length} Steps)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {changedCount > 0
                  ? `Divergence caused ${changedCount} step(s) to produce altered downstream outputs.`
                  : failedCount > 0
                  ? `${failedCount} step(s) failed in branch execution.`
                  : 'Branch output is completely equivalent to baseline.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
              {passedCount} Passed
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800/60">
              {changedCount} Changed
            </span>
            {failedCount > 0 && (
              <span className="px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
                {failedCount} Failed
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Side-by-Side View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
          <div className="w-1/2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <span>Original Baseline Workflow</span>
          </div>
          <div className="w-1/2 flex items-center gap-2 pl-4">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span>Branched Workflow (Diverged at Step {branch.divergedAtStepIndex + 1})</span>
          </div>
        </div>

        {/* Step-by-Step Rows */}
        <div className="space-y-3">
          {branch.branchSteps.map((bStep, idx) => {
            const baseStep = workflow.steps[idx];
            const isDiverged = idx === branch.divergedAtStepIndex;
            const isDownstream = idx > branch.divergedAtStepIndex;
            const isSelected = activeStepIndex === idx;
            const res = liveResults[bStep.id];
            const isCurrent = isReplaying && currentStepIdx === idx;

            return (
              <div
                key={bStep.id || idx}
                onClick={() => setActiveStepIndex(idx)}
                className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'border-indigo-500 bg-slate-900/90 ring-1 ring-indigo-500 shadow-lg'
                    : isDiverged
                    ? 'border-indigo-600/70 bg-indigo-950/20'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                {/* Divergence Indicator Ribbon */}
                {isDiverged && (
                  <div className="px-3 py-1 bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border-b border-indigo-700/60 flex items-center justify-between text-[11px] font-mono text-indigo-200">
                    <span className="flex items-center gap-1.5 font-bold">
                      <GitFork className="w-3.5 h-3.5 text-indigo-400" />
                      ★ POINT OF DIVERGENCE (Step {idx + 1})
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDivergenceEdit();
                      }}
                      className="px-2 py-0.5 rounded bg-indigo-700 hover:bg-indigo-600 text-white text-[10px] font-sans transition-colors"
                    >
                      Edit Mock
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  {/* Left Column: Baseline Step */}
                  <div className="p-3.5 space-y-1.5 bg-slate-950/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono text-slate-400">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-300">
                          {baseStep?.tool ? `${baseStep.server}:${baseStep.tool}` : baseStep?.type}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">Recorded Base</span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono truncate">
                      {baseStep?.content ||
                        JSON.stringify(baseStep?.result || baseStep?.arguments || '')}
                    </div>
                  </div>

                  {/* Right Column: Branch Step */}
                  <div
                    className={`p-3.5 space-y-1.5 ${
                      isDiverged
                        ? 'bg-indigo-950/20'
                        : isDownstream
                        ? 'bg-slate-900/40'
                        : 'bg-slate-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                            isDiverged
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {bStep.tool ? `${bStep.server}:${bStep.tool}` : bStep.type}
                        </span>
                      </div>

                      {/* Status / Replay Badge */}
                      <div>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 animate-pulse border border-indigo-500/40">
                            Replaying...
                          </span>
                        ) : res ? (
                          res.status === 'passed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed (Identical)
                            </span>
                          ) : res.status === 'changed' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle className="w-3 h-3" />
                              Changed ({res.diffs.length} diff)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500">
                            {isDiverged ? 'Custom Mock' : isDownstream ? 'Cascading' : 'Inherited'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-indigo-200 font-mono truncate">
                      {bStep.content || JSON.stringify(bStep.result || bStep.arguments || '')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Step Diff Inspector */}
      {baselineStep && branchStep && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500">
                Step {activeStepIndex + 1} Comparison &amp; Impact Analysis
              </span>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{branchStep.tool ? `${branchStep.server}:${branchStep.tool}` : branchStep.type}</span>
                {activeStepIndex === branch.divergedAtStepIndex && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Divergence Source
                  </span>
                )}
                {activeStepIndex > branch.divergedAtStepIndex && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Cascaded Downstream
                  </span>
                )}
              </h3>
            </div>

            {stepResult && (
              <span
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold uppercase ${
                  stepResult.status === 'passed'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : stepResult.status === 'changed'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {stepResult.status}
              </span>
            )}
          </div>

          <DiffViewer
            diffs={stepResult?.diffs || []}
            baseline={baselineStep.result || baselineStep.arguments || baselineStep.content}
            replayed={branchStep.result || branchStep.arguments || branchStep.content}
            status={stepResult?.status || 'passed'}
            error={stepResult?.error}
            baselineDurationMs={baselineStep.durationMs}
            replayedDurationMs={branchStep.durationMs}
          />
        </div>
      )}

      {/* Edit Divergence Data Modal */}
      {isEditingDivergence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-indigo-400" />
              <span>Edit Divergence Mock Response (Step {branch.divergedAtStepIndex + 1})</span>
            </h3>

            {divergenceError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
                {divergenceError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {divergenceArgsRaw && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Arguments JSON</label>
                  <textarea
                    rows={5}
                    value={divergenceArgsRaw}
                    onChange={(e) => setDivergenceArgsRaw(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mock Result JSON (Custom Response)
                </label>
                <textarea
                  rows={8}
                  value={divergenceResultRaw}
                  onChange={(e) => setDivergenceResultRaw(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsEditingDivergence(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDivergenceEdit}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white"
              >
                Save &amp; Update Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
