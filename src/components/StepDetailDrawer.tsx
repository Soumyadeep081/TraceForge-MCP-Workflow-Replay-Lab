'use client';

import React, { useState, useEffect } from 'react';
import { StepType, TraceStep } from '@/types/workflow';
import { JsonViewer } from './JsonViewer';
import {
  X,
  Clock,
  Server,
  Wrench,
  User,
  Bot,
  AlertCircle,
  Copy,
  Check,
  Edit3,
  Trash2,
  Save,
  CheckCircle2,
} from 'lucide-react';

interface StepDetailDrawerProps {
  step: TraceStep | null;
  stepIndex: number;
  totalSteps: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStep: (updated: TraceStep) => void;
  onDeleteStep: (stepId: string) => void;
}

export function StepDetailDrawer({
  step,
  stepIndex,
  totalSteps,
  isOpen,
  onClose,
  onUpdateStep,
  onDeleteStep,
}: StepDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'edit'>('view');
  const [copied, setCopied] = useState(false);

  // Edit state
  const [editType, setEditType] = useState<StepType>('tool_call');
  const [editServer, setEditServer] = useState('');
  const [editTool, setEditTool] = useState('');
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editContent, setEditContent] = useState('');
  const [editArgsRaw, setEditArgsRaw] = useState('');
  const [editResultRaw, setEditResultRaw] = useState('');
  const [editJsonError, setEditJsonError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (step) {
      setEditType(step.type);
      setEditServer(step.server || '');
      setEditTool(step.tool || '');
      setEditDuration(step.durationMs || 0);
      setEditContent(step.content || '');
      setEditArgsRaw(step.arguments ? JSON.stringify(step.arguments, null, 2) : '');
      setEditResultRaw(step.result ? JSON.stringify(step.result, null, 2) : '');
      setEditJsonError(null);
      setSaveSuccess(false);
    }
  }, [step]);

  if (!isOpen || !step) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(step, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    setEditJsonError(null);
    let parsedArgs = undefined;
    let parsedResult = undefined;

    try {
      if (editArgsRaw.trim()) {
        parsedArgs = JSON.parse(editArgsRaw);
      }
    } catch (err: any) {
      setEditJsonError(`Arguments JSON error: ${err.message}`);
      return;
    }

    try {
      if (editResultRaw.trim()) {
        parsedResult = JSON.parse(editResultRaw);
      }
    } catch (err: any) {
      setEditJsonError(`Result JSON error: ${err.message}`);
      return;
    }

    const updated: TraceStep = {
      ...step,
      type: editType,
      server: editServer.trim() || undefined,
      tool: editTool.trim() || undefined,
      durationMs: editDuration ? Number(editDuration) : undefined,
      content: editContent.trim() || undefined,
      arguments: parsedArgs,
      result: parsedResult,
    };

    onUpdateStep(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setActiveTab('view');
    }, 800);
  };

  const renderTypeIcon = (type: StepType) => {
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

  const getTypeBadgeClass = (type: StepType) => {
    switch (type) {
      case 'user':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'assistant':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'tool_call':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'tool_result':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
      case 'error':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
            {renderTypeIcon(step.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-slate-400">
                Step {stepIndex + 1} of {totalSteps}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${getTypeBadgeClass(
                  step.type
                )}`}
              >
                {step.type}
              </span>
            </div>
            <div className="text-sm font-semibold text-slate-200 truncate max-w-xs">
              {step.tool ? `${step.server || 'mcp'}:${step.tool}` : step.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyJson}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Copy step JSON"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-5 border-b border-slate-800 bg-slate-950/40">
        <button
          onClick={() => setActiveTab('view')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'view'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Inspection View
        </button>
        <button
          onClick={() => setActiveTab('edit')}
          className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'edit'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Edit Step</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {activeTab === 'view' ? (
          <>
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-mono">
                  <Clock className="w-3 h-3" /> Timestamp
                </span>
                <span className="font-mono text-slate-300 break-all">{step.timestamp}</span>
              </div>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-mono">
                  <Clock className="w-3 h-3" /> Duration
                </span>
                <span className="font-mono text-slate-300">
                  {step.durationMs !== undefined ? `${step.durationMs}ms` : 'N/A'}
                </span>
              </div>
              {step.server && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-mono">
                    <Server className="w-3 h-3" /> MCP Server
                  </span>
                  <span className="font-mono text-indigo-300 font-semibold">{step.server}</span>
                </div>
              )}
              {step.tool && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 mb-1 font-mono">
                    <Wrench className="w-3 h-3" /> MCP Tool
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">{step.tool}</span>
                </div>
              )}
            </div>

            {/* Content Text (User prompt or Assistant text) */}
            {step.content && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Message / Content
                </label>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {step.content}
                </div>
              </div>
            )}

            {/* Arguments Payload */}
            {step.arguments !== undefined && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tool Arguments
                </label>
                <JsonViewer data={step.arguments} title="Arguments (JSON)" initialExpanded={true} />
              </div>
            )}

            {/* Result Payload */}
            {step.result !== undefined && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tool Result
                </label>
                <JsonViewer data={step.result} title="Result (JSON)" initialExpanded={true} />
              </div>
            )}

            {/* Complete Raw Step */}
            <div className="pt-2">
              <JsonViewer data={step} title="Raw Step Object" initialExpanded={false} />
            </div>
          </>
        ) : (
          /* Edit Mode */
          <div className="space-y-4 text-xs">
            {editJsonError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200">
                {editJsonError}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Step Type</label>
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as StepType)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
              >
                <option value="user">user (User Message)</option>
                <option value="assistant">assistant (Model Response)</option>
                <option value="tool_call">tool_call (MCP Tool Invocation)</option>
                <option value="tool_result">tool_result (MCP Tool Response)</option>
                <option value="error">error (Execution Error)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">MCP Server</label>
                <input
                  type="text"
                  value={editServer}
                  onChange={(e) => setEditServer(e.target.value)}
                  placeholder="e.g. zendesk-mcp"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">MCP Tool</label>
                <input
                  type="text"
                  value={editTool}
                  onChange={(e) => setEditTool(e.target.value)}
                  placeholder="e.g. fetch_ticket"
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Duration (ms)</label>
              <input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Content / Message</label>
              <textarea
                rows={3}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Text content or message..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-sans focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Arguments (JSON)</label>
              <textarea
                rows={4}
                value={editArgsRaw}
                onChange={(e) => setEditArgsRaw(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500 text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Result (JSON)</label>
              <textarea
                rows={6}
                value={editResultRaw}
                onChange={(e) => setEditResultRaw(e.target.value)}
                placeholder='{"status": "ok"}'
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/90">
        <button
          onClick={() => {
            if (confirm('Delete this step from workflow?')) {
              onDeleteStep(step.id);
              onClose();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Step</span>
        </button>

        {activeTab === 'edit' && (
          <button
            onClick={handleSaveEdit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white rounded bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
