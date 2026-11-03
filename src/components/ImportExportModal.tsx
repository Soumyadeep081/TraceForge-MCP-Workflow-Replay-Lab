'use client';

import React, { useState } from 'react';
import { StepType, TraceStep, WorkflowTrace } from '@/types/workflow';
import { X, Upload, Download, Copy, Check, AlertCircle, FileCode } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (workflow: WorkflowTrace) => void;
  exportWorkflow?: WorkflowTrace | null;
}

const SAMPLE_TEMPLATE = {
  name: 'Custom Agent Tool Trace',
  description: 'Recorded workflow demonstrating MCP tool usage for regression testing.',
  steps: [
    {
      id: 'step-1',
      type: 'user',
      timestamp: new Date().toISOString(),
      content: 'Fetch user profile and verify subscription tier',
    },
    {
      id: 'step-2',
      type: 'tool_call',
      timestamp: new Date().toISOString(),
      server: 'user-service-mcp',
      tool: 'get_user_profile',
      durationMs: 95,
      arguments: {
        userId: 'usr_84920',
      },
    },
    {
      id: 'step-3',
      type: 'tool_result',
      timestamp: new Date().toISOString(),
      server: 'user-service-mcp',
      tool: 'get_user_profile',
      durationMs: 95,
      result: {
        id: 'usr_84920',
        tier: 'pro_monthly',
        status: 'active',
        limits: {
          max_workspaces: 10,
        },
      },
    },
    {
      id: 'step-4',
      type: 'assistant',
      timestamp: new Date().toISOString(),
      content: 'User usr_84920 is on the active Pro Monthly tier with 10 workspace allocations.',
    },
  ],
  assertions: [
    {
      id: 'asrt-sample-status-active',
      name: 'User tier is active',
      enabled: true,
      target: 'step',
      targetStepId: 'step-3',
      checkType: 'json_path_equals',
      jsonPath: 'status',
      expectedValue: 'active',
    },
    {
      id: 'asrt-sample-workspace-limit',
      name: 'Max workspaces at least 10',
      enabled: true,
      target: 'step',
      targetStepId: 'step-3',
      checkType: 'numeric_range',
      jsonPath: 'limits.max_workspaces',
      numericOperator: 'above_or_equal',
      threshold: 10,
    },
    {
      id: 'asrt-sample-no-secrets',
      name: 'No password or secret in tool arguments',
      enabled: true,
      target: 'all_tool_calls',
      checkType: 'argument_value',
      argumentOperator: 'excludes',
      argumentValue: 'password',
    },
  ],
};

export function ImportExportModal({
  isOpen,
  onClose,
  onImport,
  exportWorkflow,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(
    exportWorkflow ? 'export' : 'import'
  );
  const [importJsonText, setImportJsonText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const validateWorkflowTrace = (rawObj: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!rawObj || typeof rawObj !== 'object') {
      return { valid: false, errors: ['Trace payload must be a JSON object.'] };
    }

    if (typeof rawObj.name !== 'string' || !rawObj.name.trim()) {
      errors.push('Missing required property: "name" (must be a non-empty string).');
    }

    if (typeof rawObj.description !== 'string') {
      errors.push('Missing or invalid property: "description" (must be a string).');
    }

    if (!Array.isArray(rawObj.steps)) {
      errors.push('Missing required property: "steps" (must be an array).');
      return { valid: false, errors };
    }

    if (rawObj.steps.length === 0) {
      errors.push('"steps" array cannot be empty.');
    }

    const validTypes: StepType[] = ['user', 'assistant', 'tool_call', 'tool_result', 'error'];

    rawObj.steps.forEach((step: any, idx: number) => {
      if (!step || typeof step !== 'object') {
        errors.push(`Step at index ${idx} is not an object.`);
        return;
      }
      if (typeof step.id !== 'string' || !step.id.trim()) {
        errors.push(`Step ${idx + 1}: Missing or invalid "id" property.`);
      }
      if (!validTypes.includes(step.type)) {
        errors.push(
          `Step ${idx + 1} (${step.id || 'unnamed'}): Invalid type "${step.type}". Must be one of: ${validTypes.join(', ')}`
        );
      }
      if (step.timestamp && isNaN(Date.parse(step.timestamp))) {
        errors.push(`Step ${idx + 1}: "timestamp" is not a valid ISO-8601 date string.`);
      }
    });

    if (rawObj.assertions !== undefined) {
      if (!Array.isArray(rawObj.assertions)) {
        errors.push('"assertions" property must be an array.');
      } else {
        rawObj.assertions.forEach((asrt: any, i: number) => {
          if (!asrt || typeof asrt !== 'object') {
            errors.push(`Assertion ${i + 1} is not an object.`);
          } else if (!asrt.name || typeof asrt.name !== 'string') {
            errors.push(`Assertion ${i + 1}: Missing or invalid "name" string.`);
          } else if (!asrt.checkType || typeof asrt.checkType !== 'string') {
            errors.push(`Assertion ${i + 1} ("${asrt.name || 'unnamed'}"): Missing "checkType".`);
          }
        });
      }
    }

    return { valid: errors.length === 0, errors };
  };

  const handleExecuteImport = () => {
    setValidationErrors([]);
    let parsed: any;
    try {
      parsed = JSON.parse(importJsonText);
    } catch (err: any) {
      setValidationErrors([`Invalid JSON syntax: ${err.message}`]);
      return;
    }

    const { valid, errors } = validateWorkflowTrace(parsed);
    if (!valid) {
      setValidationErrors(errors);
      return;
    }

    // Normalized workflow object
    const workflow: WorkflowTrace = {
      id: parsed.id || `wf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: parsed.name,
      description: parsed.description || '',
      tags: parsed.tags || ['Imported'],
      steps: parsed.steps.map((s: any, idx: number) => ({
        id: s.id || `step-${idx + 1}`,
        type: s.type,
        timestamp: s.timestamp || new Date().toISOString(),
        server: s.server,
        tool: s.tool,
        arguments: s.arguments,
        result: s.result,
        durationMs: s.durationMs,
        content: s.content,
      })),
      assertions: Array.isArray(parsed.assertions)
        ? parsed.assertions.map((a: any, idx: number) => ({
            id: a.id || `asrt-import-${idx + 1}-${Date.now().toString().slice(-4)}`,
            name: a.name,
            description: a.description,
            enabled: a.enabled !== false,
            target: a.target || 'step',
            targetStepId: a.targetStepId,
            targetToolName: a.targetToolName,
            checkType: a.checkType,
            jsonPath: a.jsonPath,
            expectedValue: a.expectedValue,
            stringMode: a.stringMode,
            stringPattern: a.stringPattern,
            allowedValues: a.allowedValues,
            caseSensitive: a.caseSensitive,
            numericOperator: a.numericOperator,
            threshold: a.threshold,
            minValue: a.minValue,
            maxValue: a.maxValue,
            argumentOperator: a.argumentOperator,
            argumentKey: a.argumentKey,
            argumentValue: a.argumentValue,
            maxDurationMs: a.maxDurationMs,
          }))
        : undefined,
      createdAt: parsed.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReplayStatus: 'not_run',
    };

    onImport(workflow);
    onClose();
  };

  const handleLoadSample = () => {
    setImportJsonText(JSON.stringify(SAMPLE_TEMPLATE, null, 2));
    setValidationErrors([]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      setValidationErrors([]);
    };
    reader.readAsText(file);
  };

  const exportPayload = exportWorkflow
    ? {
        name: exportWorkflow.name,
        description: exportWorkflow.description,
        tags: exportWorkflow.tags,
        steps: exportWorkflow.steps,
        assertions: exportWorkflow.assertions || [],
      }
    : SAMPLE_TEMPLATE;

  const handleCopyExport = () => {
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(exportWorkflow?.name || 'workflow-trace')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Workflow Trace Import & Export
              </h2>
              <p className="text-xs text-slate-400">
                Standard TraceForge trace format (name, description, steps)
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

        {/* Tab switcher */}
        <div className="flex items-center px-5 border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Trace JSON</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Trace JSON</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'import' ? (
            <>
              {/* File upload or load sample */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload .json File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="px-3 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                  >
                    Load Sample Template
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-mono">Format: Standard TraceForge v1</span>
              </div>

              {/* Error Callout */}
              {validationErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-200 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>Validation Failed ({validationErrors.length} issues)</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] font-mono">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste JSON Trace Payload:
                </label>
                <textarea
                  rows={12}
                  value={importJsonText}
                  onChange={(e) => {
                    setImportJsonText(e.target.value);
                    setValidationErrors([]);
                  }}
                  placeholder={`{\n  "name": "My MCP Workflow",\n  "description": "...",\n  "steps": [\n    {\n      "id": "step-1",\n      "type": "user",\n      "content": "..."\n    }\n  ]\n}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </>
          ) : (
            /* Export tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Ready to export workflow trace as JSON
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy JSON</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={14}
                value={JSON.stringify(exportPayload, null, 2)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-hidden select-all"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'import' && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-800 bg-slate-900/90">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!importJsonText.trim()}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Validate & Import
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
