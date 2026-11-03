'use client';

import React, { useState } from 'react';
import {
  AssertionCheckType,
  TraceStep,
  WorkflowAssertion,
  WorkflowTrace,
} from '@/types/workflow';
import { AssertionEditorModal } from './AssertionEditorModal';
import { evaluateAssertionForStep } from '@/lib/assertionEngine';
import {
  ShieldCheck,
  Plus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  Copy,
  Sliders,
  Clock,
  Sparkles,
  ExternalLink,
  HelpCircle,
  Layers,
  Wrench,
  Check,
} from 'lucide-react';

interface WorkflowAssertionsSectionProps {
  workflow: WorkflowTrace;
  onUpdateWorkflow: (updated: WorkflowTrace) => void;
  onSelectStep?: (stepId: string) => void;
}

export function WorkflowAssertionsSection({
  workflow,
  onUpdateWorkflow,
  onSelectStep,
}: WorkflowAssertionsSectionProps) {
  const assertions = workflow.assertions || [];

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAssertion, setEditingAssertion] = useState<WorkflowAssertion | null>(null);

  // Baseline evaluation test state
  const [testResults, setTestResults] = useState<
    Record<string, { status: 'passed' | 'failed'; message: string }>
  >({});
  const [hasRunTest, setHasRunTest] = useState(false);

  // Handlers
  const handleToggleEnable = (assertionId: string) => {
    const updated = assertions.map((a) =>
      a.id === assertionId ? { ...a, enabled: !a.enabled } : a
    );
    onUpdateWorkflow({
      ...workflow,
      assertions: updated,
    });
  };

  const handleDelete = (assertionId: string) => {
    const updated = assertions.filter((a) => a.id !== assertionId);
    onUpdateWorkflow({
      ...workflow,
      assertions: updated,
    });
  };

  const handleDuplicate = (source: WorkflowAssertion) => {
    const clone: WorkflowAssertion = {
      ...source,
      id: `asrt-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
    };
    onUpdateWorkflow({
      ...workflow,
      assertions: [...assertions, clone],
    });
  };

  const handleSaveAssertion = (saved: WorkflowAssertion) => {
    const index = assertions.findIndex((a) => a.id === saved.id);
    let updated: WorkflowAssertion[];
    if (index >= 0) {
      updated = [...assertions];
      updated[index] = saved;
    } else {
      updated = [...assertions, saved];
    }
    onUpdateWorkflow({
      ...workflow,
      assertions: updated,
    });
  };

  const handleTestOnBaseline = () => {
    const results: Record<string, { status: 'passed' | 'failed'; message: string }> = {};

    for (const assertion of assertions) {
      if (!assertion.enabled) continue;

      if (assertion.target === 'step') {
        const stepIndex = workflow.steps.findIndex((s) => s.id === assertion.targetStepId);
        const step = stepIndex >= 0 ? workflow.steps[stepIndex] : null;

        if (step) {
          const evalRes = evaluateAssertionForStep(assertion, step, stepIndex);
          results[assertion.id] = {
            status: evalRes.status === 'passed' ? 'passed' : 'failed',
            message: evalRes.message,
          };
        } else {
          results[assertion.id] = {
            status: 'failed',
            message: `Target step "${assertion.targetStepId}" not found in workflow.`,
          };
        }
      } else {
        // All matching tool calls
        const matchingSteps: { step: TraceStep; idx: number }[] = [];
        workflow.steps.forEach((s, i) => {
          if (
            assertion.checkType === 'argument_value'
              ? s.type === 'tool_call'
              : s.type === 'tool_call' || s.type === 'tool_result' || !!s.tool
          ) {
            if (!assertion.targetToolName || s.tool === assertion.targetToolName) {
              matchingSteps.push({ step: s, idx: i });
            }
          }
        });

        if (matchingSteps.length === 0) {
          results[assertion.id] = {
            status: 'passed',
            message: 'No matching tool calls in baseline.',
          };
        } else {
          let allPassed = true;
          let failMsg = '';
          for (const { step, idx } of matchingSteps) {
            const r = evaluateAssertionForStep(assertion, step, idx);
            if (r.status === 'failed') {
              allPassed = false;
              failMsg = r.message;
              break;
            }
          }
          results[assertion.id] = {
            status: allPassed ? 'passed' : 'failed',
            message: allPassed
              ? `Passed across all ${matchingSteps.length} matching tool call(s).`
              : failMsg,
          };
        }
      }
    }

    setTestResults(results);
    setHasRunTest(true);
  };

  // Demo Presets: Load Passing Checks
  const handleLoadDemoPassingChecks = () => {
    const demoPassing: WorkflowAssertion[] = [
      {
        id: `asrt-triage-ticket-id-${Date.now()}`,
        name: 'Fetched ticket has an ID',
        description: 'Verify that zendesk-mcp:fetch_ticket returns a valid ticket ID.',
        enabled: true,
        target: 'step',
        targetStepId: 'step-3-result-fetch-ticket',
        checkType: 'json_path_exists',
        jsonPath: 'id',
      },
      {
        id: `asrt-triage-priority-valid-${Date.now()}`,
        name: 'Ticket priority is an allowed value',
        description: 'Ensure ticket priority belongs to authorized tiers (P1-Critical, P2-High, P3-Low, P4-Normal).',
        enabled: true,
        target: 'step',
        targetStepId: 'step-3-result-fetch-ticket',
        checkType: 'string_matches',
        jsonPath: 'priority',
        stringMode: 'one_of',
        allowedValues: ['P1-Critical', 'P2-High', 'P3-Low', 'P4-Normal'],
      },
      {
        id: `asrt-triage-kb-matches-${Date.now()}`,
        name: 'KB search returns at least one result',
        description: 'Ensure kb-mcp:search_articles yields at least 1 matching resolution article.',
        enabled: true,
        target: 'step',
        targetStepId: 'step-5-result-search-kb',
        checkType: 'numeric_range',
        jsonPath: 'total_matches',
        numericOperator: 'above_or_equal',
        threshold: 1,
      },
      {
        id: `asrt-triage-no-passwords-${Date.now()}`,
        name: 'No tool receives a password',
        description: 'Audit all tool call arguments to guarantee passwords or secrets are never leaked.',
        enabled: true,
        target: 'all_tool_calls',
        checkType: 'argument_value',
        argumentOperator: 'excludes',
        argumentValue: 'password',
      },
      {
        id: `asrt-triage-duration-sla-${Date.now()}`,
        name: 'Zendesk tool duration below SLA limit',
        description: 'Verify fetch_ticket responds within 400ms.',
        enabled: true,
        target: 'step',
        targetStepId: 'step-2-call-fetch-ticket',
        checkType: 'duration_limit',
        maxDurationMs: 400,
      },
    ];

    onUpdateWorkflow({
      ...workflow,
      assertions: demoPassing,
    });
  };

  // Demo Presets: Add Failing Check Example
  const handleAddFailingExample = (type: 'duration' | 'password' | 'priority' | 'missing') => {
    let failingAssertion: WorkflowAssertion;

    if (type === 'duration') {
      failingAssertion = {
        id: `asrt-fail-duration-${Date.now()}`,
        name: '[FAIL DEMO] Strict SLA: Tool latency under 50ms',
        description: 'Intentionally strict SLA limit that will fail (fetch_ticket took 140ms).',
        enabled: true,
        target: 'step',
        targetStepId: 'step-2-call-fetch-ticket',
        checkType: 'duration_limit',
        maxDurationMs: 50,
      };
    } else if (type === 'password') {
      failingAssertion = {
        id: `asrt-fail-password-${Date.now()}`,
        name: '[FAIL DEMO] Tool arguments must include password',
        description: 'Checks that tool call explicitly requires a password argument (fails on clean workflow).',
        enabled: true,
        target: 'all_tool_calls',
        checkType: 'argument_value',
        argumentOperator: 'includes',
        argumentValue: 'password',
      };
    } else if (type === 'priority') {
      failingAssertion = {
        id: `asrt-fail-priority-${Date.now()}`,
        name: '[FAIL DEMO] Ticket priority must be P3-Low',
        description: 'Checks that recorded ticket is P3-Low (fails because baseline is P1-Critical).',
        enabled: true,
        target: 'step',
        targetStepId: 'step-3-result-fetch-ticket',
        checkType: 'json_path_equals',
        jsonPath: 'priority',
        expectedValue: 'P3-Low',
      };
    } else {
      failingAssertion = {
        id: `asrt-fail-missing-${Date.now()}`,
        name: '[FAIL DEMO] Missing field: non_existent_token',
        description: 'Expects non_existent_token to exist in ticket response.',
        enabled: true,
        target: 'step',
        targetStepId: 'step-3-result-fetch-ticket',
        checkType: 'json_path_exists',
        jsonPath: 'non_existent_token',
      };
    }

    onUpdateWorkflow({
      ...workflow,
      assertions: [...assertions, failingAssertion],
    });
  };

  const getCheckTypeBadge = (type: AssertionCheckType) => {
    switch (type) {
      case 'json_path_exists':
        return { label: 'Path Exists', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'json_path_missing':
        return { label: 'Path Missing', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'json_path_equals':
        return { label: 'Path Equals', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
      case 'string_matches':
        return { label: 'String Match', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' };
      case 'numeric_range':
        return { label: 'Numeric Range', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'argument_value':
        return { label: 'Tool Arguments', color: 'bg-teal-500/10 text-teal-400 border-teal-500/30' };
      case 'duration_limit':
        return { label: 'Duration SLA', color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    }
  };

  const enabledCount = assertions.filter((a) => a.enabled).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-md overflow-hidden">
      {/* Section Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100">Workflow Assertions</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {enabledCount} of {assertions.length} active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic checks verified against MCP tool calls, arguments, payloads, and response latencies
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {assertions.length > 0 && (
            <button
              onClick={handleTestOnBaseline}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
              title="Test all enabled assertions against the recorded baseline trace"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test on Baseline</span>
            </button>
          )}

          {/* Demo Controls Dropdown or Quick Buttons */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 border border-indigo-500/30 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Demo Presets</span>
            </button>

            <div className="absolute right-0 top-full mt-1 w-64 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5 hidden group-hover:block z-20 space-y-1 text-xs">
              <button
                onClick={handleLoadDemoPassingChecks}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-[11px]">Reset Standard Demo Checks</div>
                  <div className="text-[10px] text-slate-400">All 5 passing assertions for Support Triage</div>
                </div>
              </button>

              <div className="h-px bg-slate-800 my-1" />

              <div className="px-2 py-0.5 text-[10px] font-mono text-slate-500 uppercase">
                Add Failing Examples
              </div>

              <button
                onClick={() => handleAddFailingExample('duration')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 text-rose-300 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Strict SLA Failure (&lt; 50ms)</span>
              </button>

              <button
                onClick={() => handleAddFailingExample('priority')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 text-rose-300 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Ticket Priority Must Equal P3</span>
              </button>

              <button
                onClick={() => handleAddFailingExample('missing')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 text-rose-300 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Missing Path Check Failure</span>
              </button>

              <button
                onClick={() => handleAddFailingExample('password')}
                className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 text-rose-300 transition-colors flex items-center gap-2"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Forbidden Password Requirement</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingAssertion(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assertion</span>
          </button>
        </div>
      </div>

      {/* Assertions List or Empty State */}
      <div className="p-4 sm:p-5">
        {assertions.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-dashed border-slate-800 space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">No assertions configured yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Define assertions to ensure JSON paths exist, tool arguments don&apos;t leak secrets,
                numeric values fall within SLA thresholds, and latency stays acceptable.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleLoadDemoPassingChecks}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Load Recommended Demo Checks</span>
              </button>
              <button
                onClick={() => {
                  setEditingAssertion(null);
                  setIsEditorOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Custom Assertion</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {assertions.map((assertion, idx) => {
              const badge = getCheckTypeBadge(assertion.checkType);
              const test = testResults[assertion.id];

              // Target step reference
              const targetStepIndex =
                assertion.target === 'step'
                  ? workflow.steps.findIndex((s) => s.id === assertion.targetStepId)
                  : -1;
              const targetStep = targetStepIndex >= 0 ? workflow.steps[targetStepIndex] : null;

              return (
                <div
                  key={assertion.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !assertion.enabled
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Enabled / Disabled Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleEnable(assertion.id)}
                          className={`w-7 h-4 rounded-full transition-colors relative focus:outline-hidden ${
                            assertion.enabled ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                          title={assertion.enabled ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`block w-3 h-3 rounded-full bg-white transition-transform ${
                              assertion.enabled ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>

                        {/* Target badge */}
                        {assertion.target === 'step' ? (
                          targetStep ? (
                            <button
                              onClick={() => onSelectStep && onSelectStep(targetStep.id)}
                              className="flex items-center gap-1 text-[11px] font-mono text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 hover:border-indigo-500/50 transition-colors"
                              title="Click to jump to this step in timeline"
                            >
                              <span>Step {targetStepIndex + 1}:</span>
                              <span className="font-semibold text-slate-200">
                                {targetStep.tool ? `${targetStep.server}:${targetStep.tool}` : targetStep.type}
                              </span>
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 text-slate-500" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-rose-400 bg-rose-950/30 px-2 py-0.5 rounded border border-rose-800/60">
                              Missing Step ({assertion.targetStepId})
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-mono text-teal-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            <Wrench className="w-3 h-3 text-teal-400" />
                            <span>
                              {assertion.targetToolName
                                ? `All calls to "${assertion.targetToolName}"`
                                : 'All MCP Tool Calls'}
                            </span>
                          </span>
                        )}

                        <span className="text-xs font-bold text-slate-100 truncate">
                          {assertion.name}
                        </span>
                      </div>

                      {assertion.description && (
                        <p className="text-xs text-slate-400 pl-9 leading-relaxed">
                          {assertion.description}
                        </p>
                      )}

                      {/* Rule details summary */}
                      <div className="flex flex-wrap items-center gap-2 pl-9 text-[11px] font-mono text-slate-400">
                        {assertion.jsonPath && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Path: <span className="text-slate-300">$.{assertion.jsonPath}</span>
                          </span>
                        )}

                        {assertion.checkType === 'json_path_equals' && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Equals: <span className="text-indigo-300">{JSON.stringify(assertion.expectedValue)}</span>
                          </span>
                        )}

                        {assertion.checkType === 'string_matches' && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {assertion.stringMode === 'one_of'
                              ? `Allowed: [${(assertion.allowedValues || []).join(', ')}]`
                              : assertion.stringMode === 'regex'
                              ? `Regex: /${assertion.stringPattern}/`
                              : `Contains: "${assertion.stringPattern}"`}
                          </span>
                        )}

                        {assertion.checkType === 'numeric_range' && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Condition: {assertion.numericOperator === 'within_range'
                              ? `[${assertion.minValue}..${assertion.maxValue}]`
                              : `${assertion.numericOperator} ${assertion.threshold}`}
                          </span>
                        )}

                        {assertion.checkType === 'argument_value' && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {assertion.argumentOperator === 'excludes' ? 'Must Exclude:' : 'Must Include:'}{' '}
                            <span className="text-amber-300 font-semibold">&quot;{String(assertion.argumentValue)}&quot;</span>
                            {assertion.argumentKey && ` (in arg "${assertion.argumentKey}")`}
                          </span>
                        )}

                        {assertion.checkType === 'duration_limit' && (
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>Max Duration: {assertion.maxDurationMs}ms</span>
                          </span>
                        )}
                      </div>

                      {/* Test feedback banner if tested */}
                      {hasRunTest && test && (
                        <div
                          className={`mt-1.5 ml-9 p-2 rounded-lg text-xs flex items-center gap-2 ${
                            test.status === 'passed'
                              ? 'bg-emerald-950/30 border border-emerald-800/80 text-emerald-300'
                              : 'bg-rose-950/30 border border-rose-800/80 text-rose-300'
                          }`}
                        >
                          {test.status === 'passed' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                          <span className="font-semibold">{test.status.toUpperCase()}:</span>
                          <span className="text-[11px] text-slate-300">{test.message}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setEditingAssertion(assertion);
                          setIsEditorOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                        title="Edit assertion"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(assertion)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Duplicate assertion"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete assertion "${assertion.name}"?`)) {
                            handleDelete(assertion.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Delete assertion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assertion Editor Modal */}
      {isEditorOpen && (
        <AssertionEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          workflow={workflow}
          initialAssertion={editingAssertion}
          onSave={handleSaveAssertion}
        />
      )}
    </div>
  );
}

