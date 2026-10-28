'use client';

import React, { useState, useEffect } from 'react';
import { TraceStep, WorkflowTrace, ReplayBranch } from '@/types/workflow';
import { buildBranchStepsFromModification } from '@/lib/replayEngine';
import { GitFork, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface BranchReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowTrace;
  step: TraceStep | null;
  stepIndex: number;
  onCreateBranch: (branch: ReplayBranch) => void;
}

export function BranchReplayModal({
  isOpen,
  onClose,
  workflow,
  step,
  stepIndex,
  onCreateBranch,
}: BranchReplayModalProps) {
  const [branchName, setBranchName] = useState('');
  const [description, setDescription] = useState('');
  const [argsRaw, setArgsRaw] = useState('');
  const [resultRaw, setResultRaw] = useState('');
  const [contentRaw, setContentRaw] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (step) {
      const toolLabel = step.tool ? `${step.tool}` : step.type;
      setBranchName(`Branch at Step ${stepIndex + 1} (${toolLabel})`);
      setDescription(
        `Diverges at step ${stepIndex + 1} to test alternative MCP response cascading downstream.`
      );
      setArgsRaw(step.arguments ? JSON.stringify(step.arguments, null, 2) : '');
      setResultRaw(step.result ? JSON.stringify(step.result, null, 2) : '');
      setContentRaw(step.content || '');
      setJsonError(null);
    }
  }, [step, stepIndex]);

  if (!isOpen || !step) return null;

  // Preset for ticket triage demo
  const handleApplyP3Preset = () => {
    if (step.tool === 'fetch_ticket' || (step.result && step.result.id === 'TCK-8921')) {
      const p3Mock = {
        id: 'TCK-8921',
        status: 'reopened_inquiry',
        priority: 'P3-Low',
        customer: {
          name: 'Acme Corp (Standard Invoicing)',
          contact: 'alice@acme.corp',
          arr: '$12,000',
          region: 'us-east-1',
        },
        created_at: '2026-10-28T09:10:00Z',
        subject: 'Invoice receipt styling and currency formatting inquiry',
        details: 'Customer inquired about custom PDF logo layout and VAT formatting on monthly receipt exports. No checkout or API outages.',
        assigned_team: 'Tier-1 Customer Billing',
        sla_breach_in_minutes: 1440,
      };
      setResultRaw(JSON.stringify(p3Mock, null, 2));
      setBranchName('Branch: Downgraded to P3-Low SLA');
      setDescription(
        'Modifies mock ticket priority from P1-Critical to P3-Low. Shows how downstream KB query and assistant response adjust to standard resolution.'
      );
      setJsonError(null);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    let parsedArgs = undefined;
    let parsedResult = undefined;

    try {
      if (argsRaw.trim() && (step.type === 'tool_call' || step.arguments !== undefined)) {
        parsedArgs = JSON.parse(argsRaw);
      }
    } catch (err: any) {
      setJsonError(`Arguments JSON syntax error: ${err.message}`);
      return;
    }

    try {
      if (resultRaw.trim() && (step.type === 'tool_result' || step.result !== undefined)) {
        parsedResult = JSON.parse(resultRaw);
      }
    } catch (err: any) {
      setJsonError(`Mock Result JSON syntax error: ${err.message}`);
      return;
    }

    const modification = {
      stepId: step.id,
      stepIndex,
      newArguments: parsedArgs,
      newResult: parsedResult,
      newContent: contentRaw.trim() || undefined,
    };

    const branchSteps = buildBranchStepsFromModification(workflow, modification);

    const newBranch: ReplayBranch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: branchName.trim() || `Branch from Step ${stepIndex + 1}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      divergedAtStepId: step.id,
      divergedAtStepIndex: stepIndex,
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      modification,
      branchSteps,
      lastReplayStatus: 'not_run',
    };

    onCreateBranch(newBranch);
    onClose();
  };

  const isTicketStep =
    step.tool === 'fetch_ticket' || (step.result && step.result.id === 'TCK-8921');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Branch Replay from Step {stepIndex + 1}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300">
                  {step.tool ? `${step.server}:${step.tool}` : step.type}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Fork execution from this point, edit mock response, and replay subsequent steps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {/* Divergence Point Banner */}
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/60 text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <GitFork className="w-3.5 h-3.5" />
              <span>Divergence Point: Step {stepIndex + 1} of {workflow.steps.length}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Steps 1 to {stepIndex} will be inherited from the recorded baseline. Replay will branch at this step with your custom arguments or mock result, then evaluate downstream cascading changes.
            </p>
          </div>

          {/* Quick preset if ticket triage */}
          {isTicketStep && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
              <div className="flex items-center gap-2 text-emerald-300 font-medium">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Demo Preset: Downgrade Priority to P3-Low</span>
              </div>
              <button
                type="button"
                onClick={handleApplyP3Preset}
                className="px-2.5 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-semibold text-[11px] transition-colors"
              >
                Apply P3 Preset
              </button>
            </div>
          )}

          {jsonError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{jsonError}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Branch Name *</label>
            <input
              type="text"
              required
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="e.g. Low Priority Ticket Scenario"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Hypothesis or details about what this branch tests..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-sans"
            />
          </div>

          {/* If step has arguments (tool_call) */}
          {(step.type === 'tool_call' || step.arguments !== undefined) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Branch MCP Tool Arguments (JSON)
                </label>
                <span className="text-[10px] text-indigo-400 font-mono">Validated JSON</span>
              </div>
              <textarea
                rows={5}
                value={argsRaw}
                onChange={(e) => setArgsRaw(e.target.value)}
                placeholder='{"ticket_id": "TCK-8921"}'
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          {/* If step has result (tool_result) */}
          {(step.type === 'tool_result' || step.result !== undefined) && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300 font-semibold">
                  Custom Mock Response (JSON Result)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Simulated Mock Output</span>
              </div>
              <textarea
                rows={8}
                value={resultRaw}
                onChange={(e) => setResultRaw(e.target.value)}
                placeholder='{"status": "resolved"}'
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          {/* If step has content (user / assistant / error) */}
          {(step.type === 'user' || step.type === 'assistant' || step.type === 'error') && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Modified Message Content
              </label>
              <textarea
                rows={4}
                value={contentRaw}
                onChange={(e) => setContentRaw(e.target.value)}
                placeholder="Alternative prompt or assistant response..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-slate-200 font-sans text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Create Replay Branch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
