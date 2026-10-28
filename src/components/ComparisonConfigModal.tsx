'use client';

import React, { useState } from 'react';
import { ComparisonConfig } from '@/types/workflow';
import { DEFAULT_COMPARISON_CONFIG } from '@/lib/seedData';
import { X, Sliders, Plus, Trash2, RotateCcw, Check } from 'lucide-react';

interface ComparisonConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ComparisonConfig;
  onSave: (config: ComparisonConfig) => void;
}

const COMMON_PRESET_FIELDS = [
  'timestamp',
  'created_at',
  'updated_at',
  'request_id',
  'idempotency_key',
  'trace_id',
  'session_id',
  'durationMs',
  'execution_time',
];

export function ComparisonConfigModal({
  isOpen,
  onClose,
  config: initialConfig,
  onSave,
}: ComparisonConfigModalProps) {
  const [config, setConfig] = useState<ComparisonConfig>(initialConfig);
  const [newFieldInput, setNewFieldInput] = useState('');
  const [newPathInput, setNewPathInput] = useState('');

  if (!isOpen) return null;

  const handleAddField = () => {
    const trimmed = newFieldInput.trim();
    if (trimmed && !config.ignoredFields.includes(trimmed)) {
      setConfig({
        ...config,
        ignoredFields: [...config.ignoredFields, trimmed],
      });
      setNewFieldInput('');
    }
  };

  const handleRemoveField = (field: string) => {
    setConfig({
      ...config,
      ignoredFields: config.ignoredFields.filter((f) => f !== field),
    });
  };

  const handleTogglePresetField = (preset: string) => {
    if (config.ignoredFields.includes(preset)) {
      handleRemoveField(preset);
    } else {
      setConfig({
        ...config,
        ignoredFields: [...config.ignoredFields, preset],
      });
    }
  };

  const handleAddPath = () => {
    const trimmed = newPathInput.trim();
    if (trimmed && !config.selectedPathsOnly.includes(trimmed)) {
      setConfig({
        ...config,
        selectedPathsOnly: [...config.selectedPathsOnly, trimmed],
      });
      setNewPathInput('');
    }
  };

  const handleRemovePath = (path: string) => {
    setConfig({
      ...config,
      selectedPathsOnly: config.selectedPathsOnly.filter((p) => p !== path),
    });
  };

  const handleResetDefaults = () => {
    setConfig({ ...DEFAULT_COMPARISON_CONFIG });
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Replay Comparison Rules</h2>
              <p className="text-xs text-slate-400">Configure how replayed MCP results are compared against baseline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6 overflow-y-auto">
          {/* Section 1: Ignored Fields */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Ignored JSON Fields
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              Exclude transient fields like timestamps and request IDs from causing false positive regressions.
            </p>

            {/* Quick preset chips */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_PRESET_FIELDS.map((preset) => {
                const isActive = config.ignoredFields.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleTogglePresetField(preset)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center gap-1 ${
                      isActive
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/50 hover:text-slate-200'
                    }`}
                  >
                    <span>{preset}</span>
                    {isActive ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
            </div>

            {/* Active ignored field tags */}
            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 min-h-[42px] mb-2">
              {config.ignoredFields.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No fields ignored (strict comparison)</span>
              ) : (
                config.ignoredFields.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700"
                  >
                    <span>{f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(f)}
                      className="text-slate-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input to add custom field */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom field (e.g. session_token)..."
                value={newFieldInput}
                onChange={(e) => setNewFieldInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddField())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddField}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Section 2: Compare Selected Paths Only */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Compare Selected Paths Only (Optional Whitelist)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              If specified, only these dot paths will be validated (e.g. <code>customer.arr</code> or <code>status</code>). Leave blank to compare entire payload.
            </p>

            <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-slate-950 border border-slate-800 min-h-[38px] mb-2">
              {config.selectedPathsOnly.length === 0 ? (
                <span className="text-xs text-slate-500 italic">Comparing all paths (default)</span>
              ) : (
                config.selectedPathsOnly.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 text-xs font-mono border border-emerald-800/60"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePath(p)}
                      className="text-emerald-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. customer.status or matched_articles[0].relevance_score..."
                value={newPathInput}
                onChange={(e) => setNewPathInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPath())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddPath}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium transition-colors"
              >
                Add Path
              </button>
            </div>
          </div>

          {/* Section 3: Object Key Ordering & String Case */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Ignore Object Key Order</span>
                <p className="text-[11px] text-slate-400">Canonicalizes JSON key sorting before diffing</p>
              </div>
              <input
                type="checkbox"
                checked={config.ignoreObjectKeyOrder}
                onChange={(e) => setConfig({ ...config, ignoreObjectKeyOrder: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Ignore String Case</span>
                <p className="text-[11px] text-slate-400">Treat &apos;Escalated&apos; and &apos;escalated&apos; as equivalent</p>
              </div>
              <input
                type="checkbox"
                checked={config.ignoreStringCase}
                onChange={(e) => setConfig({ ...config, ignoreStringCase: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-200">Numeric Tolerance (Epsilon)</span>
                <p className="text-[11px] text-slate-400">Permissible delta for floating point scores (e.g. 0.001)</p>
              </div>
              <input
                type="number"
                step="0.001"
                min="0"
                value={config.numericTolerance}
                onChange={(e) =>
                  setConfig({ ...config, numericTolerance: parseFloat(e.target.value) || 0 })
                }
                className="w-24 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 font-mono text-right"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-medium text-white rounded bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-colors"
            >
              Apply Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
