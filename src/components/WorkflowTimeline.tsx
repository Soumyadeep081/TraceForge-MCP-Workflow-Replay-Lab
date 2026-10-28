'use client';

import React, { useState } from 'react';
import { StepType, TraceStep, WorkflowTrace } from '@/types/workflow';
import { JsonViewer } from './JsonViewer';
import {
  User,
  Bot,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Clock,
  Server,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Plus,
  Play,
  Share2,
  Check,
  ChevronRight,
  Sliders,
} from 'lucide-react';

interface WorkflowTimelineProps {
  workflow: WorkflowTrace;
  onSelectStep: (step: TraceStep, index: number) => void;
  selectedStepId?: string;
  onAddStep: (step: TraceStep) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (startIndex: number, endIndex: number) => void;
  onStartReplay: () => void;
  onOpenRules: () => void;
}

export function WorkflowTimeline({
  workflow,
  onSelectStep,
  selectedStepId,
  onAddStep,
  onDeleteStep,
  onReorderSteps,
  onStartReplay,
  onOpenRules,
}: WorkflowTimelineProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);

  // New step form state
  const [newType, setNewType] = useState<StepType>('tool_call');
  const [newServer, setNewServer] = useState('zendesk-mcp');
  const [newTool, setNewTool] = useState('fetch_ticket');
  const [newContent, setNewContent] = useState('');
  const [newArgs, setNewArgs] = useState('{}');
  const [newResult, setNewResult] = useState('{}');
  const [newDuration, setNewDuration] = useState(150);
  const [addError, setAddError] = useState<string | null>(null);

  const handleShareTrace = () => {
    navigator.clipboard.writeText(JSON.stringify(workflow, null, 2));
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  };

  const handleCreateStep = () => {
    setAddError(null);
    let parsedArgs = undefined;
    let parsedResult = undefined;

    try {
      if (newArgs.trim() && (newType === 'tool_call' || newType === 'tool_result')) {
        parsedArgs = JSON.parse(newArgs);
      }
    } catch (e: any) {
      setAddError(`Invalid Arguments JSON: ${e.message}`);
      return;
    }

    try {
      if (newResult.trim() && (newType === 'tool_result' || newType === 'error')) {
        parsedResult = JSON.parse(newResult);
      }
    } catch (e: any) {
      setAddError(`Invalid Result JSON: ${e.message}`);
      return;
    }

    const step: TraceStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: newType,
      timestamp: new Date().toISOString(),
      server: newType.startsWith('tool_') ? newServer.trim() || undefined : undefined,
      tool: newType.startsWith('tool_') ? newTool.trim() || undefined : undefined,
      durationMs: newType.startsWith('tool_') ? newDuration : undefined,
      content: newContent.trim() || undefined,
      arguments: parsedArgs,
      result: parsedResult,
    };

    onAddStep(step);
    setShowAddModal(false);
    // reset form
    setNewContent('');
    setNewArgs('{}');
    setNewResult('{}');
  };

  const renderIcon = (type: StepType) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4 text-sky-400" />;
      case 'assistant':
        return <Bot className="w-4 h-4 text-indigo-400" />;
      case 'tool_call':
        return <Wrench className="w-4 h-4 text-emerald-400" />;
      case 'tool_result':
        return <CheckCircle2 className="w-4 h-4 text-teal-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
    }
  };

  const getTypeColor = (type: StepType) => {
    switch (type) {
      case 'user':
        return {
          border: 'border-sky-500/30',
          bg: 'bg-sky-500/5',
          badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
        };
      case 'assistant':
        return {
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/5',
          badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        };
      case 'tool_call':
        return {
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/5',
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        };
      case 'tool_result':
        return {
          border: 'border-teal-500/30',
          bg: 'bg-teal-500/5',
          badge: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
        };
      case 'error':
        return {
          border: 'border-rose-500/30',
          bg: 'bg-rose-500/5',
          badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Header Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                Recorded Trace
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {workflow.steps.length} sequential steps
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-100">{workflow.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {workflow.description}
            </p>

            {/* Tags */}
            {workflow.tags && workflow.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {workflow.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenRules}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
              title="Configure Comparison Rules"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Comparison Rules</span>
            </button>

            <button
              onClick={handleShareTrace}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
              title="Copy Workflow Trace JSON"
            >
              {copiedTrace ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Add Step</span>
            </button>

            <button
              onClick={onStartReplay}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Replay Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ordered Timeline */}
      <div className="relative pl-6 space-y-4 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
        {workflow.steps.map((step, idx) => {
          const colors = getTypeColor(step.type);
          const isSelected = selectedStepId === step.id;

          return (
            <div
              key={step.id}
              onClick={() => onSelectStep(step, idx)}
              className={`relative rounded-xl border transition-all cursor-pointer group ${
                colors.border
              } ${colors.bg} ${
                isSelected
                  ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10'
                  : 'hover:border-slate-700'
              }`}
            >
              {/* Timeline marker bubble */}
              <div
                className={`absolute -left-[30px] top-4 w-6 h-6 rounded-full border flex items-center justify-center bg-slate-900 ${colors.border}`}
              >
                <span className="text-[10px] font-mono font-bold text-slate-400">{idx + 1}</span>
              </div>

              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-slate-900 border border-slate-800">
                    {renderIcon(step.type)}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${colors.badge}`}
                  >
                    {step.type}
                  </span>

                  {step.server && (
                    <span className="flex items-center gap-1 text-xs font-mono text-indigo-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                      <Server className="w-3 h-3 text-indigo-400" />
                      <span>{step.server}</span>
                    </span>
                  )}

                  {step.tool && (
                    <span className="flex items-center gap-1 text-xs font-mono text-emerald-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800 font-semibold">
                      <Wrench className="w-3 h-3 text-emerald-400" />
                      <span>{step.tool}</span>
                    </span>
                  )}

                  {step.durationMs !== undefined && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{step.durationMs}ms</span>
                    </span>
                  )}
                </div>

                {/* Step controls: reorder, edit, delete */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    disabled={idx === 0}
                    onClick={() => onReorderSteps(idx, idx - 1)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move Step Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === workflow.steps.length - 1}
                    onClick={() => onReorderSteps(idx, idx + 1)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Move Step Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onSelectStep(step, idx)}
                    className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                    title="Edit Step"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this step?')) onDeleteStep(step.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Delete Step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 ml-1" />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3.5 space-y-2.5">
                {/* Content string (User, Assistant, Error) */}
                {step.content && (
                  <div className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
                    <p className="whitespace-pre-wrap">{step.content}</p>
                  </div>
                )}

                {/* Tool Arguments preview */}
                {step.arguments !== undefined && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <JsonViewer
                      data={step.arguments}
                      title="Arguments"
                      initialExpanded={false}
                    />
                  </div>
                )}

                {/* Tool Result preview */}
                {step.result !== undefined && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <JsonViewer data={step.result} title="Result" initialExpanded={false} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Add Step to Workflow</span>
            </h3>

            {addError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
                {addError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Step Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as StepType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                >
                  <option value="user">user (User Prompt)</option>
                  <option value="assistant">assistant (Agent Response)</option>
                  <option value="tool_call">tool_call (MCP Tool Call)</option>
                  <option value="tool_result">tool_result (Tool Result)</option>
                  <option value="error">error (Simulation or Tool Error)</option>
                </select>
              </div>

              {newType.startsWith('tool_') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Server Name</label>
                    <input
                      type="text"
                      value={newServer}
                      onChange={(e) => setNewServer(e.target.value)}
                      placeholder="e.g. zendesk-mcp"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Tool Name</label>
                    <input
                      type="text"
                      value={newTool}
                      onChange={(e) => setNewTool(e.target.value)}
                      placeholder="e.g. fetch_ticket"
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                    />
                  </div>
                </div>
              )}

              {newType.startsWith('tool_') && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duration (ms)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono"
                  />
                </div>
              )}

              {(newType === 'user' || newType === 'assistant' || newType === 'error') && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Content Text</label>
                  <textarea
                    rows={3}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Enter message content..."
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-sans"
                  />
                </div>
              )}

              {newType === 'tool_call' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Arguments (JSON)</label>
                  <textarea
                    rows={4}
                    value={newArgs}
                    onChange={(e) => setNewArgs(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}

              {newType === 'tool_result' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Result (JSON)</label>
                  <textarea
                    rows={4}
                    value={newResult}
                    onChange={(e) => setNewResult(e.target.value)}
                    placeholder='{"status": "ok"}'
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono text-xs"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateStep}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white"
              >
                Append Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
