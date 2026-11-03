'use client';

import React, { useState, useRef } from 'react';
import {
  AssertionResult,
  ComparisonConfig,
  ReplayMode,
  ReplayRun,
  SimulationScenario,
  StepReplayResult,
  TraceStep,
  WorkflowTrace,
} from '@/types/workflow';
import {
  AssertionDemoOverride,
  executeReplayWorkflow,
} from '@/lib/replayEngine';
import { DiffViewer } from './DiffViewer';
import {
  Play,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Radio,
  ArrowLeft,
  Info,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Wrench,
  Check,
  ChevronRight,
  ListOrdered,
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

  // Interactive demo assertion override
  const [demoOverride, setDemoOverride] = useState<AssertionDemoOverride>('none');

  // Inspector tab: Diff vs Assertions
  const [activeInspectorTab, setActiveInspectorTab] = useState<'assertions' | 'diff'>('assertions');

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [liveResults, setLiveResults] = useState<Record<string, StepReplayResult>>({});
  const [completedRun, setCompletedRun] = useState<ReplayRun | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const abortRef = useRef({ aborted: false });

  const assertionsCount = workflow.assertions?.length || 0;

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
        assertionDemoOverride: demoOverride,
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

        // If assertions failed, default tab to assertions
        if (run.assertionSummary && run.assertionSummary.failed > 0) {
          setActiveInspectorTab('assertions');
        } else {
          setActiveInspectorTab('assertions');
        }

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

  const assertionResults: AssertionResult[] = completedRun?.assertionResults || [];
  const assertionSummary = completedRun?.assertionSummary;

  const handleJumpToStep = (stepId?: string) => {
    if (!stepId) return;
    setSelectedStepId(stepId);
    setActiveInspectorTab('diff');
  };

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
                {workflow.steps.length} Steps • {assertionsCount} Assertions
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

        {/* Demo Assertion Controls Strip: Easily test passing and failing assertions */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Assertion Demo Scenario Injector</span>
              <span className="text-[10px] font-normal text-slate-400">
                (Quickly test passing vs failing assertion conditions)
              </span>
            </div>
            {demoOverride !== 'none' && (
              <button
                onClick={() => setDemoOverride('none')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-mono underline"
              >
                Reset to Standard Baseline
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setDemoOverride('none')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'none'
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Clean (All Pass)</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Expected behavior
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoOverride('inject_password')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'inject_password'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Injects password parameter in tool arguments to test security exclusion assertion"
            >
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">Leaked Password</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Tests security check
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoOverride('inject_missing_id')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'inject_missing_id'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Strips 'id' from ticket result to test JSON path exists assertion"
            >
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">Missing ID</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Tests path existence
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoOverride('inject_disallowed_priority')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'inject_disallowed_priority'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Sets priority to 'P9-Disallowed' to test allowed values check"
            >
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">Invalid Priority</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Tests allowed values
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoOverride('inject_zero_kb_matches')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'inject_zero_kb_matches'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Sets total_matches to 0 in search result to test numeric range >= 1 check"
            >
              <div className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">0 KB Matches</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Tests numeric &gt;= 1
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDemoOverride('inject_sla_breach')}
              className={`p-2 rounded-lg border text-left transition-colors ${
                demoOverride === 'inject_sla_breach'
                  ? 'bg-rose-950/40 border-rose-500 text-rose-200 font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Forces duration to 780ms to test SLA latency limit check"
            >
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="truncate">SLA Breach</span>
              </div>
              <div className="text-[10px] text-slate-500 font-normal mt-0.5 truncate">
                Tests latency &lt; 400ms
              </div>
            </button>
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
                    ? 'All steps and workflow assertions passed. Replay met all deterministic validation checks.'
                    : completedRun.overallStatus === 'changed'
                    ? `${completedRun.changedSteps} step(s) returned altered responses compared to baseline.`
                    : `${completedRun.failedSteps} step error(s) or assertion failure(s) detected. Review the report below.`}
                </p>
              </div>
            </div>

            {/* Counts: Step outcomes + Assertion Summary */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800/80 text-emerald-300">
                {completedRun.passedSteps} Steps Passed
              </span>
              {completedRun.changedSteps > 0 && (
                <span className="px-2.5 py-1 rounded bg-amber-950 border border-amber-800/80 text-amber-300">
                  {completedRun.changedSteps} Changed
                </span>
              )}
              {completedRun.failedSteps > 0 && (
                <span className="px-2.5 py-1 rounded bg-rose-950 border border-rose-800/80 text-rose-300">
                  {completedRun.failedSteps} Failed
                </span>
              )}

              {/* Assertion summary pill */}
              {assertionSummary && (
                <span
                  className={`px-2.5 py-1 rounded border flex items-center gap-1 font-semibold ${
                    assertionSummary.failed === 0
                      ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                      : 'bg-rose-900/40 border-rose-700 text-rose-300'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>
                    Assertions: {assertionSummary.passed}/{assertionSummary.total} Passed
                    {assertionSummary.failed > 0 && ` (${assertionSummary.failed} Failed)`}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Two-Column View: Timeline Progress on Left, Tabbed Inspector on Right */}
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
                  onClick={() => {
                    setSelectedStepId(step.id);
                    setActiveInspectorTab('diff');
                  }}
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

        {/* Right Column: Tabbed Inspector (Assertion Results OR Step Diff Inspector) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            {/* Inspector Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveInspectorTab('assertions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeInspectorTab === 'assertions'
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Assertion Results</span>
                  {assertionSummary && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        assertionSummary.failed === 0
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {assertionSummary.passed}/{assertionSummary.total}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveInspectorTab('diff')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeInspectorTab === 'diff'
                      ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Step Diff Inspector</span>
                  {activeStep && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      ({activeStep.tool || activeStep.type})
                    </span>
                  )}
                </button>
              </div>

              {activeInspectorTab === 'diff' && activeStepResult && (
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

            {/* TAB 1: ASSERTIONS REPORT */}
            {activeInspectorTab === 'assertions' && (
              <div className="space-y-4">
                {assertionsCount === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/40 border border-dashed border-slate-800 space-y-2">
                    <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="font-semibold text-slate-300">No assertions defined for this workflow</div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Go back to the Workflow Timeline and add assertions in the Assertions section to verify tool outputs during replay.
                    </p>
                    <button
                      onClick={onBackToWorkflow}
                      className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 border border-slate-700"
                    >
                      Back to Workflow Assertions
                    </button>
                  </div>
                ) : !completedRun ? (
                  <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/40 border border-dashed border-slate-800 space-y-2">
                    <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                    <div className="font-semibold text-slate-300">Replay not yet executed</div>
                    <p className="text-[11px] text-slate-400">
                      Click &quot;Execute Replay&quot; to evaluate all {assertionsCount} configured workflow assertions against replayed tool outputs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Summary Header */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">Replay Assertion Evaluation</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Mode: {completedRun.simulationScenario}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-emerald-400 font-semibold">{assertionSummary?.passed} Passed</span>
                        <span className="text-slate-600">•</span>
                        <span className={assertionSummary?.failed ? 'text-rose-400 font-semibold' : 'text-slate-500'}>
                          {assertionSummary?.failed} Failed
                        </span>
                        {assertionSummary?.skipped ? (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">{assertionSummary.skipped} Skipped</span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Assertion Cards */}
                    <div className="space-y-2.5">
                      {assertionResults.map((asrtResult) => {
                        return (
                          <div
                            key={asrtResult.assertionId}
                            className={`p-3.5 rounded-xl border transition-all ${
                              asrtResult.status === 'passed'
                                ? 'bg-emerald-950/15 border-emerald-800/60'
                                : asrtResult.status === 'failed'
                                ? 'bg-rose-950/20 border-rose-800/80 shadow-md shadow-rose-950/20'
                                : 'bg-slate-950/40 border-slate-800/80'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  {asrtResult.status === 'passed' ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      PASSED
                                    </span>
                                  ) : asrtResult.status === 'failed' ? (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                      <XCircle className="w-3 h-3 text-rose-400" />
                                      FAILED
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                                      SKIPPED
                                    </span>
                                  )}

                                  <span className="text-xs font-bold text-slate-100">
                                    {asrtResult.assertionName}
                                  </span>

                                  <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                    {asrtResult.checkType}
                                  </span>
                                </div>

                                {/* Explanation */}
                                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                                  {asrtResult.explanation}
                                </p>

                                {/* Expected vs Actual comparison block if available */}
                                {(asrtResult.expectedValue !== undefined || asrtResult.actualValue !== undefined) && (
                                  <div className="flex flex-wrap gap-2 text-[11px] font-mono pt-1">
                                    {asrtResult.expectedValue !== undefined && (
                                      <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                                        <span className="text-slate-500">Expected: </span>
                                        <span className="text-indigo-300 font-semibold">
                                          {typeof asrtResult.expectedValue === 'object'
                                            ? JSON.stringify(asrtResult.expectedValue)
                                            : String(asrtResult.expectedValue)}
                                        </span>
                                      </div>
                                    )}

                                    {asrtResult.actualValue !== undefined && (
                                      <div
                                        className={`px-2 py-1 rounded border ${
                                          asrtResult.status === 'passed'
                                            ? 'bg-slate-950 border-slate-800 text-emerald-300'
                                            : 'bg-rose-950/40 border-rose-800 text-rose-300'
                                        }`}
                                      >
                                        <span className="text-slate-500">Actual: </span>
                                        <span className="font-semibold">
                                          {typeof asrtResult.actualValue === 'object'
                                            ? JSON.stringify(asrtResult.actualValue)
                                            : String(asrtResult.actualValue)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Per-step breakdown if targeting all tool calls */}
                                {asrtResult.stepDetails && asrtResult.stepDetails.length > 0 && (
                                  <div className="pt-2 mt-2 border-t border-slate-800/80 space-y-1">
                                    <div className="text-[10px] font-mono text-slate-400">
                                      Per-step tool call breakdown:
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {asrtResult.stepDetails.map((det) => (
                                        <div
                                          key={det.stepId}
                                          className="flex items-center justify-between text-[11px] font-mono p-1.5 rounded bg-slate-950/60 border border-slate-800/60"
                                        >
                                          <div className="flex items-center gap-1.5 text-slate-300">
                                            {det.status === 'passed' ? (
                                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-rose-400" />
                                            )}
                                            <span>{det.stepLabel}</span>
                                          </div>
                                          <button
                                            onClick={() => handleJumpToStep(det.stepId)}
                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline"
                                          >
                                            <span>Inspect Step</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Link to relevant step button */}
                              {asrtResult.stepId && (
                                <button
                                  type="button"
                                  onClick={() => handleJumpToStep(asrtResult.stepId)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-950/60 text-slate-300 hover:text-indigo-300 border border-slate-700 hover:border-indigo-600/60 text-xs font-mono transition-colors shrink-0"
                                  title="Jump to relevant step diff"
                                >
                                  <span>Inspect Step</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: STEP DIFF INSPECTOR */}
            {activeInspectorTab === 'diff' && (
              <div>
                {activeStep ? (
                  activeStepResult ? (
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
                  )
                ) : (
                  <div className="p-12 text-center rounded-xl bg-slate-900/60 border border-slate-800 text-slate-500 text-xs">
                    Select a step from the left to view its baseline versus replayed diff.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
