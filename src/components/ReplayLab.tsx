'use client';

import React, { useState, useRef } from 'react';
import {
  ComparisonConfig,
  ReplayMode,
  ReplayRun,
  SimulationScenario,
  StepReplayResult,
  TraceStep,
  WorkflowTrace,
} from '@/types/workflow';
import { executeReplayWorkflow } from '@/lib/replayEngine';
import { DiffViewer } from './DiffViewer';
import {
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  Zap,
  Radio,
  Layers,
  ArrowLeft,
  Info,
  ExternalLink,
} from 'lucide-react';

interface ReplayLabProps {
  workflow: WorkflowTrace;
  config: ComparisonConfig;
  onOpenRules: () => void;
  onSaveRun: (run: ReplayRun) => void;
  onBackToWorkflow: () => void;
}

export function ReplayLab({
  workflow,
  config,
  onOpenRules,
  onSaveRun,
  onBackToWorkflow,
}: ReplayLabProps) {
  // Replay options
  const [mode, setMode] = useState<ReplayMode>('mock');
  const [scenario, setScenario] = useState<SimulationScenario>('deterministic_pass');
  const [playbackSpeed, setPlaybackSpeed] = useState<'normal' | 'fast' | 'instant'>('normal');
  const [endpointUrl, setEndpointUrl] = useState('http://localhost:3000/api/mcp-sandbox');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [liveResults, setLiveResults] = useState<Record<string, StepReplayResult>>({});
  const [completedRun, setCompletedRun] = useState<ReplayRun | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const abortRef = useRef({ aborted: false });

  const handleStartReplay = async () => {
    setIsRunning(true);
    abortRef.current = { aborted: false };
    setCompletedRun(null);
    setLiveResults({});
    setCurrentStepIndex(0);

    try {
      const run = await executeReplayWorkflow(workflow, {
        mode,
        endpointUrl: mode === 'endpoint_preview' ? endpointUrl : undefined,
        scenario,
        config,
        playbackSpeed,
        abortSignal: abortRef.current,
        onProgress: (index, total, execution) => {
          setCurrentStepIndex(index);
          setLiveResults((prev) => ({
            ...prev,
            [execution.step.id]: execution.result,
          }));
        },
      });

      if (!abortRef.current.aborted) {
        setCompletedRun(run);
        onSaveRun(run);
        // Default to first changed or failed step, or first step
        const firstAttentionStep = workflow.steps.find(
          (s) => run.stepResults[s.id]?.status !== 'passed'
        );
        setSelectedStepId(firstAttentionStep ? firstAttentionStep.id : workflow.steps[0]?.id || null);
      }
    } catch (err) {
      console.error('Replay execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleStopReplay = () => {
    abortRef.current.aborted = true;
    setIsRunning(false);
  };

  const handleResetReplay = () => {
    abortRef.current.aborted = true;
    setIsRunning(false);
    setCurrentStepIndex(-1);
    setLiveResults({});
    setCompletedRun(null);
    setSelectedStepId(null);
  };

  // Find step data for inspection
  const activeStep = selectedStepId
    ? workflow.steps.find((s) => s.id === selectedStepId) || null
    : null;
  const activeStepResult: StepReplayResult | undefined = selectedStepId
    ? (completedRun?.stepResults[selectedStepId] || liveResults[selectedStepId])
    : undefined;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToWorkflow}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Back to Workflow Timeline"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                Replay Lab
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {workflow.steps.length} Steps in Pipeline
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-100">{workflow.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenRules}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Comparison Rules ({config.ignoredFields.length} ignored)</span>
          </button>

          {!isRunning ? (
            <button
              onClick={handleStartReplay}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Execute Replay</span>
            </button>
          ) : (
            <button
              onClick={handleStopReplay}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Run</span>
            </button>
          )}

          <button
            onClick={handleResetReplay}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Replay Controls & Configuration Panel */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Replay Execution Mode
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMode('mock')}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors ${
                  mode === 'mock'
                    ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mock Replay (Local)
              </button>
              <button
                type="button"
                onClick={() => setMode('endpoint_preview')}
                className={`py-1.5 px-2 rounded-md font-medium transition-colors ${
                  mode === 'endpoint_preview'
                    ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Endpoint Preview
              </button>
            </div>
          </div>

          {/* Simulation Scenario */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Simulation Scenario</span>
              <span className="text-[10px] text-indigo-400 font-mono">
                {scenario === 'deterministic_pass'
                  ? 'Baseline Equivalent'
                  : scenario === 'simulate_changed'
                  ? 'Regression Tester'
                  : scenario === 'simulate_failure'
                  ? 'Error Diagnostic'
                  : 'Latency Alert'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setScenario('deterministic_pass')}
                className={`py-1.5 px-2 rounded-md font-medium text-left truncate transition-colors ${
                  scenario === 'deterministic_pass'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Deterministic Baseline (Pass)"
              >
                ✓ Baseline (Pass)
              </button>
              <button
                type="button"
                onClick={() => setScenario('simulate_changed')}
                className={`py-1.5 px-2 rounded-md font-medium text-left truncate transition-colors ${
                  scenario === 'simulate_changed'
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate Changed Result (Detect Regression)"
              >
                ⚠ Changed (Diff)
              </button>
              <button
                type="button"
                onClick={() => setScenario('simulate_failure')}
                className={`py-1.5 px-2 rounded-md font-medium text-left truncate transition-colors ${
                  scenario === 'simulate_failure'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate Tool Failure (503 / Timeout)"
              >
                ✕ Tool Failure
              </button>
              <button
                type="button"
                onClick={() => setScenario('simulate_latency')}
                className={`py-1.5 px-2 rounded-md font-medium text-left truncate transition-colors ${
                  scenario === 'simulate_latency'
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Simulate Latency Spike"
              >
                ⏱ Latency Spike
              </button>
            </div>
          </div>

          {/* Playback Speed */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Playback Speed
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-center">
              {(['normal', 'fast', 'instant'] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`py-1.5 px-2 rounded-md capitalize transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-slate-800 text-slate-100 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {spd === 'normal' ? 'Normal (1x)' : spd === 'fast' ? 'Fast (2x)' : 'Instant'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MCP Endpoint Preview Banner */}
        {mode === 'endpoint_preview' && (
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/60 text-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Endpoint Preview (Simulated Configuration Sandbox)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              This mode validates endpoint configuration and schemas locally. No unsolicited network requests are dispatched until you explicitly trigger replay. You can target the built-in sandbox endpoint below or specify your local MCP server.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] font-mono text-slate-400">Endpoint URL:</span>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="http://localhost:3000/api/mcp-sandbox"
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
              />
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
                JSON-RPC 2.0 Ready
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Completion Summary Card if Run Finished */}
      {completedRun && (
        <div
          className={`p-4 rounded-xl border ${
            completedRun.overallStatus === 'passed'
              ? 'bg-emerald-950/20 border-emerald-800/80'
              : completedRun.overallStatus === 'changed'
              ? 'bg-amber-950/20 border-amber-800/80'
              : 'bg-rose-950/20 border-rose-800/80'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {completedRun.overallStatus === 'passed' ? (
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : completedRun.overallStatus === 'changed' ? (
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <XCircle className="w-6 h-6" />
                </div>
              )}

              <div>
                <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    Replay Completed: {completedRun.overallStatus.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono font-normal text-slate-400">
                    in {completedRun.durationMs}ms
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {completedRun.overallStatus === 'passed'
                    ? 'All steps produced results equivalent to baseline. No breaking regressions.'
                    : completedRun.overallStatus === 'changed'
                    ? `${completedRun.changedSteps} step(s) returned altered responses compared to baseline. Check diff inspector below.`
                    : `${completedRun.failedSteps} step(s) failed with runtime or connection errors.`}
                </p>
              </div>
            </div>

            {/* Counts */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800/80 text-emerald-300">
                {completedRun.passedSteps} Passed
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-950 border border-amber-800/80 text-amber-300">
                {completedRun.changedSteps} Changed
              </span>
              <span className="px-2.5 py-1 rounded bg-rose-950 border border-rose-800/80 text-rose-300">
                {completedRun.failedSteps} Failed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column View: Timeline Progress on Left, Diff Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Replay Steps List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1">
            <span>Replay Steps ({workflow.steps.length})</span>
            {isRunning && (
              <span className="flex items-center gap-1.5 text-indigo-400 font-mono animate-pulse">
                <Radio className="w-3.5 h-3.5" /> Replaying step {currentStepIndex + 1}...
              </span>
            )}
          </div>

          <div className="space-y-2">
            {workflow.steps.map((step, idx) => {
              const res = liveResults[step.id] || completedRun?.stepResults[step.id];
              const isCurrent = isRunning && currentStepIndex === idx;
              const isSelected = selectedStepId === step.id;

              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-md ring-1 ring-indigo-500'
                      : isCurrent
                      ? 'border-indigo-500/80 bg-slate-900 animate-replay-pulse'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-slate-400">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                          <span>{step.tool ? `${step.server}:${step.tool}` : step.type}</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {step.content || JSON.stringify(step.arguments || step.result || '').slice(0, 40)}
                        </div>
                      </div>
                    </div>

                    {/* Step Status Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 animate-pulse border border-indigo-500/40">
                          Replaying...
                        </span>
                      ) : res ? (
                        res.status === 'passed' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Passed
                          </span>
                        ) : res.status === 'changed' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Diff ({res.diffs.length})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Diff Inspector */}
        <div className="lg:col-span-7">
          {activeStep ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500">
                      Step Diff Inspector
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <span>{activeStep.tool ? `${activeStep.server}:${activeStep.tool}` : activeStep.type}</span>
                    </h3>
                  </div>

                  {activeStepResult && (
                    <div className="text-xs font-mono text-slate-400">
                      {activeStepResult.status === 'passed' ? (
                        <span className="text-emerald-400">100% Match</span>
                      ) : activeStepResult.status === 'changed' ? (
                        <span className="text-amber-400">{activeStepResult.diffs.length} Differences</span>
                      ) : (
                        <span className="text-rose-400">Error Occurred</span>
                      )}
                    </div>
                  )}
                </div>

                {activeStepResult ? (
                  <DiffViewer
                    diffs={activeStepResult.diffs}
                    baseline={activeStepResult.baselineResult}
                    replayed={activeStepResult.replayedResult}
                    status={activeStepResult.status}
                    error={activeStepResult.error}
                    baselineDurationMs={activeStepResult.baselineDurationMs}
                    replayedDurationMs={activeStepResult.replayedDurationMs}
                  />
                ) : (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    Replay hasn&apos;t executed for this step yet. Click &quot;Execute Replay&quot; to inspect comparison results.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
              Select a step from the left to view its baseline versus replayed diff.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
