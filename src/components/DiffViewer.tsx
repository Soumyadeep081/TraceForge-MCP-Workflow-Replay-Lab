'use client';

import React, { useState } from 'react';
import { DiffEntry } from '@/types/workflow';
import { JsonViewer } from './JsonViewer';
import { Columns2, AlignJustify, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';

interface DiffViewerProps {
  diffs: DiffEntry[];
  baseline: any;
  replayed: any;
  status: 'passed' | 'changed' | 'failed';
  error?: string;
  baselineDurationMs?: number;
  replayedDurationMs?: number;
}

export function DiffViewer({
  diffs,
  baseline,
  replayed,
  status,
  error,
  baselineDurationMs,
  replayedDurationMs,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [copied, setCopied] = useState(false);

  const handleCopyReport = () => {
    const report = {
      status,
      error,
      timing: {
        baselineMs: baselineDurationMs,
        replayedMs: replayedDurationMs,
        deltaMs: (replayedDurationMs || 0) - (baselineDurationMs || 0),
      },
      diffCount: diffs.length,
      diffs,
      baseline,
      replayed,
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addedCount = diffs.filter((d) => d.type === 'added').length;
  const removedCount = diffs.filter((d) => d.type === 'removed').length;
  const modifiedCount = diffs.filter((d) => d.type === 'modified').length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-3">
          {status === 'passed' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Exact Match — No Regressions</span>
            </div>
          ) : status === 'changed' ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Result Differs ({diffs.length} change{diffs.length > 1 ? 's' : ''})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-xs font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>Execution Failed</span>
            </div>
          )}

          {/* Diff stats chips */}
          {diffs.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              {modifiedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                  ~{modifiedCount} mod
                </span>
              )}
              {addedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  +{addedCount} add
                </span>
              )}
              {removedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                  -{removedCount} del
                </span>
              )}
            </div>
          )}

          {/* Latency badge */}
          {baselineDurationMs !== undefined && replayedDurationMs !== undefined && (
            <div className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
              Latency: {baselineDurationMs}ms → {replayedDurationMs}ms{' '}
              <span
                className={
                  replayedDurationMs > baselineDurationMs * 1.5
                    ? 'text-rose-400'
                    : replayedDurationMs < baselineDurationMs
                    ? 'text-emerald-400'
                    : 'text-slate-400'
                }
              >
                ({replayedDurationMs >= baselineDurationMs ? '+' : ''}
                {replayedDurationMs - baselineDurationMs}ms)
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded bg-slate-950 border border-slate-800 p-0.5">
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side comparison"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === 'unified'
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Unified list view"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Diff List</span>
            </button>
          </div>

          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Diff</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Callout if any */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs">
          <div className="font-semibold flex items-center gap-1.5 text-rose-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Replay Simulation Error</span>
          </div>
          <p className="font-mono bg-rose-950/60 p-2 rounded border border-rose-900/50 break-all">
            {error}
          </p>
        </div>
      )}

      {/* Discrepancies Table / List */}
      {diffs.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="px-3 py-2 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300">
            Detected Value Discrepancies ({diffs.length})
          </div>
          <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
            {diffs.map((d, i) => (
              <div key={i} className="p-2.5 text-xs hover:bg-slate-800/30 font-mono">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                      d.type === 'modified'
                        ? 'bg-amber-500/20 text-amber-300'
                        : d.type === 'added'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {d.type}
                  </span>
                  <span className="text-indigo-400 font-semibold">{d.path}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1.5">
                  <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-slate-300">
                    <span className="text-[10px] text-rose-400 font-sans block mb-0.5">Recorded Baseline:</span>
                    <pre className="text-[11px] whitespace-pre-wrap break-all text-rose-200">
                      {d.baselineValue !== undefined ? JSON.stringify(d.baselineValue, null, 2) : '<undefined>'}
                    </pre>
                  </div>
                  <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-slate-300">
                    <span className="text-[10px] text-emerald-400 font-sans block mb-0.5">Replayed Result:</span>
                    <pre className="text-[11px] whitespace-pre-wrap break-all text-emerald-200">
                      {d.replayedValue !== undefined ? JSON.stringify(d.replayedValue, null, 2) : '<undefined>'}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side or Unified Payload View */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Baseline Payload (Recorded)</span>
              {baselineDurationMs !== undefined && (
                <span className="text-[10px] font-mono text-slate-500">{baselineDurationMs}ms</span>
              )}
            </div>
            <JsonViewer data={baseline} title="Baseline JSON" initialExpanded={true} />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Replayed Payload (Live / Mock)</span>
              {replayedDurationMs !== undefined && (
                <span className="text-[10px] font-mono text-slate-500">{replayedDurationMs}ms</span>
              )}
            </div>
            <JsonViewer data={replayed} title="Replayed JSON" initialExpanded={true} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <JsonViewer data={baseline} title="Baseline (Full)" initialExpanded={false} />
          <JsonViewer data={replayed} title="Replayed (Full)" initialExpanded={true} />
        </div>
      )}
    </div>
  );
}
