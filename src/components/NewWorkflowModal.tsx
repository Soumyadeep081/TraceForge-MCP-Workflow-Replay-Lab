'use client';

import React, { useState } from 'react';
import { WorkflowTrace } from '@/types/workflow';
import { X, Plus, Sparkles } from 'lucide-react';

interface NewWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (workflow: WorkflowTrace) => void;
}

export function NewWorkflowModal({ isOpen, onClose, onCreate }: NewWorkflowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('Agent, MCP');
  const [template, setTemplate] = useState<'blank' | 'support' | 'api'>('blank');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a workflow name.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    let initialSteps = [];

    if (template === 'support') {
      initialSteps = [
        {
          id: `step-1`,
          type: 'user' as const,
          timestamp: new Date().toISOString(),
          content: 'Investigate customer ticket and query knowledge base.',
        },
        {
          id: `step-2`,
          type: 'tool_call' as const,
          timestamp: new Date().toISOString(),
          server: 'zendesk-mcp',
          tool: 'fetch_ticket',
          durationMs: 140,
          arguments: { ticket_id: 'TCK-1001' },
        },
        {
          id: `step-3`,
          type: 'tool_result' as const,
          timestamp: new Date().toISOString(),
          server: 'zendesk-mcp',
          tool: 'fetch_ticket',
          durationMs: 140,
          result: { id: 'TCK-1001', status: 'open', priority: 'high' },
        },
      ];
    } else if (template === 'api') {
      initialSteps = [
        {
          id: `step-1`,
          type: 'user' as const,
          timestamp: new Date().toISOString(),
          content: 'Ping remote API health endpoint via HTTP MCP.',
        },
        {
          id: `step-2`,
          type: 'tool_call' as const,
          timestamp: new Date().toISOString(),
          server: 'http-mcp',
          tool: 'fetch_url',
          durationMs: 120,
          arguments: { url: 'https://api.example.com/health' },
        },
        {
          id: `step-3`,
          type: 'tool_result' as const,
          timestamp: new Date().toISOString(),
          server: 'http-mcp',
          tool: 'fetch_url',
          durationMs: 120,
          result: { status: 200, latency_ms: 45, ok: true },
        },
      ];
    } else {
      initialSteps = [
        {
          id: `step-1`,
          type: 'user' as const,
          timestamp: new Date().toISOString(),
          content: 'Initial user prompt...',
        },
      ];
    }

    let initialAssertions: import('@/types/workflow').WorkflowAssertion[] = [];

    if (template === 'support') {
      initialAssertions = [
        {
          id: `asrt-supp-ticket-${Date.now()}`,
          name: 'Ticket has ID',
          enabled: true,
          target: 'step',
          targetStepId: 'step-3',
          checkType: 'json_path_exists',
          jsonPath: 'id',
        },
      ];
    } else if (template === 'api') {
      initialAssertions = [
        {
          id: `asrt-api-status-${Date.now()}`,
          name: 'Status is 200 OK',
          enabled: true,
          target: 'step',
          targetStepId: 'step-3',
          checkType: 'json_path_equals',
          jsonPath: 'status',
          expectedValue: 200,
        },
      ];
    }

    const newWorkflow: WorkflowTrace = {
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      description: description.trim() || 'Custom MCP workflow trace.',
      tags,
      steps: initialSteps,
      assertions: initialAssertions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastReplayStatus: 'not_run',
    };

    onCreate(newWorkflow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Create New Workflow</h2>
              <p className="text-xs text-slate-400">Define a new MCP workflow replay pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Workflow Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. SRE Incident Diagnostic Run"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Short Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what tools this agent workflow exercises..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500 font-sans"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Incident, Stripe, Production"
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Starter Template</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('blank')}
                className={`p-2 rounded border text-left transition-colors ${
                  template === 'blank'
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 font-medium'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Blank</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Start empty</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('support')}
                className={`p-2 rounded border text-left transition-colors ${
                  template === 'support'
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 font-medium'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">Support Triage</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Zendesk + KB</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('api')}
                className={`p-2 rounded border text-left transition-colors ${
                  template === 'api'
                    ? 'border-indigo-500 bg-indigo-950/30 text-indigo-200 font-medium'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">API Health</div>
                <div className="text-[10px] text-slate-500 mt-0.5">HTTP fetch tool</div>
              </button>
            </div>
          </div>

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
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
