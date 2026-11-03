'use client';

import React, { useState } from 'react';
import { WorkflowTrace } from '@/types/workflow';
import {
  Search,
  Filter,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  Copy,
  Trash2,
  Share2,
  ShieldCheck,
} from 'lucide-react';

interface WorkflowLibraryProps {
  workflows: WorkflowTrace[];
  onOpenWorkflow: (workflowId: string) => void;
  onQuickReplay: (workflowId: string) => void;
  onNewWorkflow: () => void;
  onImportWorkflow: () => void;
  onDuplicateWorkflow: (workflow: WorkflowTrace) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onResetSeeds: () => void;
}

export function WorkflowLibrary({
  workflows,
  onOpenWorkflow,
  onQuickReplay,
  onNewWorkflow,
  onImportWorkflow,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onResetSeeds,
}: WorkflowLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'changed' | 'failed' | 'not_run'>('all');

  // Filtered workflows
  const filtered = workflows.filter((wf) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      wf.name.toLowerCase().includes(query) ||
      wf.description.toLowerCase().includes(query) ||
      (wf.tags && wf.tags.some((t) => t.toLowerCase().includes(query))) ||
      wf.steps.some(
        (s) =>
          (s.tool && s.tool.toLowerCase().includes(query)) ||
          (s.server && s.server.toLowerCase().includes(query))
      );

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'not_run'
        ? !wf.lastReplayStatus || wf.lastReplayStatus === 'not_run'
        : wf.lastReplayStatus === statusFilter);

    return matchesQuery && matchesStatus;
  });

  const getStatusBadge = (status?: 'passed' | 'changed' | 'failed' | 'not_run') => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Passed
          </span>
        );
      case 'changed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Changed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <HelpCircle className="w-3 h-3" />
            Not Run
          </span>
        );
    }
  };

  const formatRelativeTime = (iso?: string) => {
    if (!iso) return 'Never run';
    try {
      const date = new Date(iso);
      const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Workflow Library</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {workflows.length}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Saved agent execution traces using MCP tools. Inspect tool arguments, replay workflows deterministically, and catch breaking schema regressions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onResetSeeds}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Restore sample demo workflows"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={onImportWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Import Trace</span>
          </button>

          <button
            onClick={onNewWorkflow}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Workflow</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by workflow name, tool, or server..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          <span className="px-2 text-slate-500 text-[11px] hidden lg:inline flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {(['all', 'passed', 'changed', 'failed', 'not_run'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-slate-800 text-slate-100 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s === 'not_run' ? 'Not Run' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Workflows Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800/80">
          <Layers className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No matching workflows found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or restore the default seeded demo workflows.
          </p>
          <button
            onClick={onResetSeeds}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 border border-indigo-800 rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Workflows</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((wf) => {
            const toolCalls = wf.steps.filter((s) => s.type === 'tool_call' || s.type === 'tool_result');
            const servers = Array.from(new Set(wf.steps.map((s) => s.server).filter(Boolean)));

            return (
              <div
                key={wf.id}
                className="group flex flex-col justify-between rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700/90 shadow-xs hover:shadow-lg transition-all"
              >
                <div className="p-5">
                  {/* Status & Last Run */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {getStatusBadge(wf.lastReplayStatus)}
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatRelativeTime(wf.lastRunAt)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    onClick={() => onOpenWorkflow(wf.id)}
                    className="text-base font-semibold text-slate-100 hover:text-indigo-300 transition-colors cursor-pointer line-clamp-1"
                    title={wf.name}
                  >
                    {wf.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {wf.description}
                  </p>

                  {/* Server Badges */}
                  {servers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {servers.map((srv) => (
                        <span
                          key={srv}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-indigo-300 border border-slate-800"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats snippet */}
                  <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
                    <span>{wf.steps.length} steps</span>
                    <span>•</span>
                    <span>{toolCalls.length} tool calls</span>
                    {wf.assertions && wf.assertions.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400 flex items-center gap-1 font-semibold">
                          <ShieldCheck className="w-3 h-3" />
                          <span>{wf.assertions.length} check{wf.assertions.length !== 1 ? 's' : ''}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-t border-slate-800/80 rounded-b-xl">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onDuplicateWorkflow(wf)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                      title="Duplicate workflow"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${wf.name}"?`)) onDeleteWorkflow(wf.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete workflow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onQuickReplay(wf.id)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                      title="Run replay"
                    >
                      <Play className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                      <span>Replay</span>
                    </button>
                    <button
                      onClick={() => onOpenWorkflow(wf.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
