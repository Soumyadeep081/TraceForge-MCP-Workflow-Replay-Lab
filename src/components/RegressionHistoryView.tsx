'use client';

import React, { useState } from 'react';
import { ReplayRun, WorkflowTrace } from '@/types/workflow';
import { DiffViewer } from './DiffViewer';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  ListOrdered,
} from 'lucide-react';

interface RegressionHistoryViewProps {
  runs: ReplayRun[];
  workflows: WorkflowTrace[];
  onDeleteRun: (runId: string) => void;
  onClearRuns: () => void;
  onOpenWorkflow: (workflowId: string) => void;
}

export function RegressionHistoryView({
  runs,
  workflows,
  onDeleteRun,
  onClearRuns,
  onOpenWorkflow,
}: RegressionHistoryViewProps) {
  const [selectedRunId, setSelectedRunId] = useState<string | null>(
    runs.length > 0 ? runs[0].id : null
  );
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'changed' | 'failed'>('all');
  const [activeTab, setActiveTab] = useState<'steps' | 'assertions'>('assertions');

  // Selected Run
  const activeRun = runs.find((r) => r.id === selectedRunId) || (runs.length > 0 ? runs[0] : null);
  const activeWorkflow = activeRun
    ? workflows.find((w) => w.id === activeRun.workflowId) || null
    : null;

  // Aggregate Metrics
  const totalRuns = runs.length;
  const passedRuns = runs.filter((r) => r.overallStatus === 'passed').length;
  const changedRuns = runs.filter((r) => r.overallStatus === 'changed').length;
  const failedRuns = runs.filter((r) => r.overallStatus === 'failed').length;
  const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;
  const avgDuration =
    totalRuns > 0
      ? Math.round(runs.reduce((acc, r) => acc + (r.durationMs || 0), 0) / totalRuns)
      : 0;

  // Total assertions passed across all historical runs
  const runsWithAssertions = runs.filter((r) => r.assertionSummary && r.assertionSummary.total > 0);
  const totalAssertionsEvaluated = runsWithAssertions.reduce(
    (acc, r) => acc + (r.assertionSummary?.total || 0),
    0
  );
  const totalAssertionsPassed = runsWithAssertions.reduce(
    (acc, r) => acc + (r.assertionSummary?.passed || 0),
    0
  );
  const assertionPassRate =
    totalAssertionsEvaluated > 0
      ? Math.round((totalAssertionsPassed / totalAssertionsEvaluated) * 100)
      : 100;

  // Filtered steps in selected run
  const activeStepResultsList = activeRun
    ? Object.entries(activeRun.stepResults).map(([stepId, res]) => {
        const stepDef = activeWorkflow?.steps.find((s) => s.id === stepId);
        return {
          stepId,
          result: res,
          stepDef,
        };
      })
    : [];

  const filteredStepResults = activeStepResultsList.filter((item) => {
    if (statusFilter === 'all') return true;
    return item.result.status === statusFilter;
  });

  const inspectedStepItem = selectedStepId
    ? activeStepResultsList.find((i) => i.stepId === selectedStepId) || activeStepResultsList[0]
    : activeStepResultsList[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Replay History & Regression Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Audit historical replay runs, observe pass rate trends over time, and inspect regressions where live tool responses or assertions deviated from baselines.
          </p>
        </div>

        {runs.length > 0 && (
          <button
            onClick={() => {
              if (confirm('Clear all replay history runs?')) onClearRuns();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-xs text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-500 uppercase">Total Replay Runs</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 font-mono">{totalRuns}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all workflows</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-500 uppercase">Overall Pass Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono flex items-center gap-1.5">
            <span>{passRate}%</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{passedRuns} of {totalRuns} runs passed</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-500 uppercase">Assertion Compliance</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1 font-mono flex items-center gap-1.5">
            <span>{assertionPassRate}%</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            {totalAssertionsPassed} of {totalAssertionsEvaluated || 0} assertions met
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-500 uppercase">Avg Run Duration</div>
          <div className="text-2xl font-bold text-slate-100 mt-1 font-mono flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>{avgDuration}ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">{changedRuns + failedRuns} deviations detected</div>
        </div>
      </div>

      {/* Main History Layout */}
      {runs.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs space-y-2">
          <History className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="font-semibold text-slate-300">No replay runs recorded yet</div>
          <p className="text-slate-500 max-w-sm mx-auto">
            Execute replays from the Replay Lab to populate historical regression metrics and assertion audits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Recorded Runs List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="text-xs font-semibold text-slate-400 px-1 mb-2">
              Recorded Runs ({runs.length})
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {runs.map((r) => {
                const isSelected = activeRun?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRunId(r.id);
                      setSelectedStepId(null);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/25 shadow-md ring-1 ring-indigo-500'
                        : 'border-slate-800 bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                          r.overallStatus === 'passed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.overallStatus === 'changed'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.overallStatus === 'passed' && <CheckCircle2 className="w-3 h-3" />}
                        {r.overallStatus === 'changed' && <AlertTriangle className="w-3 h-3" />}
                        {r.overallStatus === 'failed' && <XCircle className="w-3 h-3" />}
                        {r.overallStatus}
                      </span>

                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(r.completedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {r.workflowName}
                    </div>

                    {/* Assertion summary badge if run has assertions */}
                    {r.assertionSummary && r.assertionSummary.total > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                            r.assertionSummary.failed === 0
                              ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80'
                              : 'bg-rose-950/50 text-rose-300 border-rose-800/80'
                          }`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>
                            Assertions: {r.assertionSummary.passed}/{r.assertionSummary.total}
                          </span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <span>{r.mode === 'mock' ? 'Mock Mode' : 'Endpoint Preview'}</span>
                      <span>{r.durationMs}ms</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this run?')) onDeleteRun(r.id);
                        }}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="Delete run"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Run Detail (Tabbed: Assertions & Steps) */}
          <div className="lg:col-span-8 space-y-4">
            {activeRun && (
              <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                {/* Active Run Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">Run ID: {activeRun.id}</span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs font-mono text-indigo-400">
                        Scenario: {activeRun.simulationScenario}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-100 mt-1">
                      {activeRun.workflowName}
                    </h2>
                  </div>

                  {activeWorkflow && (
                    <button
                      onClick={() => onOpenWorkflow(activeWorkflow.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium"
                    >
                      <span>Open Workflow Timeline</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sub-Tab Switcher: Assertions vs Steps */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('assertions')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        activeTab === 'assertions'
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Assertion Results</span>
                      {activeRun.assertionSummary && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            activeRun.assertionSummary.failed === 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {activeRun.assertionSummary.passed}/{activeRun.assertionSummary.total}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('steps')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        activeTab === 'steps'
                          ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Step Diffs ({activeStepResultsList.length})</span>
                    </button>
                  </div>

                  {activeTab === 'steps' && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                      {(['all', 'passed', 'changed', 'failed'] as const).map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-2.5 py-0.5 rounded capitalize text-[11px] transition-colors ${
                            statusFilter === st
                              ? 'bg-slate-800 text-slate-100 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* TAB 1: ASSERTIONS RESULTS FOR RUN */}
                {activeTab === 'assertions' && (
                  <div className="space-y-3">
                    {activeRun.assertionResults && activeRun.assertionResults.length > 0 ? (
                      <div className="space-y-2">
                        {activeRun.assertionResults.map((asrt) => (
                          <div
                            key={asrt.assertionId}
                            className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                              asrt.status === 'passed'
                                ? 'bg-emerald-950/15 border-emerald-800/60'
                                : asrt.status === 'failed'
                                ? 'bg-rose-950/20 border-rose-800/80 shadow-xs'
                                : 'bg-slate-950/40 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    asrt.status === 'passed'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : asrt.status === 'failed'
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                                  }`}
                                >
                                  {asrt.status}
                                </span>
                                <span className="font-bold text-slate-100">{asrt.assertionName}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                                {asrt.checkType}
                              </span>
                            </div>

                            <p className="text-slate-300 text-[11px] leading-relaxed">
                              {asrt.explanation}
                            </p>

                            {(asrt.expectedValue !== undefined || asrt.actualValue !== undefined) && (
                              <div className="flex flex-wrap gap-2 text-[10px] font-mono pt-0.5">
                                {asrt.expectedValue !== undefined && (
                                  <span className="text-slate-400">
                                    Expected: <span className="text-indigo-300">{JSON.stringify(asrt.expectedValue)}</span>
                                  </span>
                                )}
                                {asrt.actualValue !== undefined && (
                                  <span className="text-slate-400">
                                    Actual:{' '}
                                    <span className={asrt.status === 'passed' ? 'text-emerald-300' : 'text-rose-300'}>
                                      {JSON.stringify(asrt.actualValue)}
                                    </span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-950/40 border border-slate-800">
                        No assertions were evaluated during this historical run.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: STEP RESULTS & DIFF VIEWER */}
                {activeTab === 'steps' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {filteredStepResults.map((item) => {
                        const isSelected =
                          (selectedStepId || activeStepResultsList[0]?.stepId) === item.stepId;
                        return (
                          <div
                            key={item.stepId}
                            onClick={() => setSelectedStepId(item.stepId)}
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500'
                                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-mono text-slate-400 truncate">
                                {item.stepDef?.tool
                                  ? `${item.stepDef.server}:${item.stepDef.tool}`
                                  : item.stepDef?.type || item.stepId}
                              </span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-mono uppercase font-bold ${
                                  item.result.status === 'passed'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : item.result.status === 'changed'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-rose-500/10 text-rose-400'
                                }`}
                              >
                                {item.result.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 truncate">
                              {item.result.reason ||
                                (item.result.diffs.length > 0
                                  ? `${item.result.diffs.length} discrepancy`
                                  : 'Identical')}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Diff Viewer for Selected Step */}
                    {inspectedStepItem && (
                      <div className="pt-4 border-t border-slate-800">
                        <div className="text-xs font-semibold text-slate-300 mb-2">
                          Comparison Detail for:{' '}
                          <span className="font-mono text-indigo-400">
                            {inspectedStepItem.stepDef?.tool || inspectedStepItem.stepId}
                          </span>
                        </div>

                        <DiffViewer
                          diffs={inspectedStepItem.result.diffs}
                          baseline={inspectedStepItem.result.baselineResult}
                          replayed={inspectedStepItem.result.replayedResult}
                          status={inspectedStepItem.result.status}
                          error={inspectedStepItem.result.error}
                          baselineDurationMs={inspectedStepItem.result.baselineDurationMs}
                          replayedDurationMs={inspectedStepItem.result.replayedDurationMs}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
