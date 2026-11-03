'use client';

import React, { useState, useEffect } from 'react';
import {
  AssertionCheckType,
  AssertionTarget,
  TraceStep,
  WorkflowAssertion,
  WorkflowTrace,
} from '@/types/workflow';
import { evaluateAssertionForStep } from '@/lib/assertionEngine';
import {
  X,
  Check,
  AlertTriangle,
  Code2,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Key,
  Hash,
  FileSearch,
  Search,
  Wrench,
} from 'lucide-react';

interface AssertionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflow: WorkflowTrace;
  initialAssertion?: WorkflowAssertion | null;
  onSave: (assertion: WorkflowAssertion) => void;
  defaultTargetStepId?: string;
}

export function AssertionEditorModal({
  isOpen,
  onClose,
  workflow,
  initialAssertion,
  onSave,
  defaultTargetStepId,
}: AssertionEditorModalProps) {
  const [mode, setMode] = useState<'guided' | 'json'>('guided');

  // Core assertion fields
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [target, setTarget] = useState<AssertionTarget>('step');
  const [targetStepId, setTargetStepId] = useState('');
  const [targetToolName, setTargetToolName] = useState('');
  const [checkType, setCheckType] = useState<AssertionCheckType>('json_path_exists');

  // JSON path fields
  const [jsonPath, setJsonPath] = useState('');
  const [expectedValueRaw, setExpectedValueRaw] = useState('');

  // String / Regex fields
  const [stringMode, setStringMode] = useState<'contains' | 'regex' | 'one_of'>('contains');
  const [stringPattern, setStringPattern] = useState('');
  const [allowedValuesRaw, setAllowedValuesRaw] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);

  // Numeric fields
  const [numericOperator, setNumericOperator] = useState<
    'above' | 'below' | 'within_range' | 'above_or_equal' | 'below_or_equal'
  >('above_or_equal');
  const [threshold, setThreshold] = useState<number>(1);
  const [minValue, setMinValue] = useState<number>(0);
  const [maxValue, setMaxValue] = useState<number>(100);

  // Argument check fields
  const [argumentOperator, setArgumentOperator] = useState<'includes' | 'excludes'>('excludes');
  const [argumentKey, setArgumentKey] = useState('');
  const [argumentValue, setArgumentValue] = useState('');

  // Duration fields
  const [maxDurationMs, setMaxDurationMs] = useState<number>(400);

  // Advanced JSON editor raw text & error
  const [rawJsonText, setRawJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Inline validation errors for guided mode
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Initialize or reset form state
  useEffect(() => {
    if (!isOpen) return;

    if (initialAssertion) {
      setId(initialAssertion.id);
      setName(initialAssertion.name);
      setDescription(initialAssertion.description || '');
      setEnabled(initialAssertion.enabled);
      setTarget(initialAssertion.target);
      setTargetStepId(initialAssertion.targetStepId || workflow.steps[0]?.id || '');
      setTargetToolName(initialAssertion.targetToolName || '');
      setCheckType(initialAssertion.checkType);

      setJsonPath(initialAssertion.jsonPath || '');
      setExpectedValueRaw(
        initialAssertion.expectedValue !== undefined
          ? typeof initialAssertion.expectedValue === 'string'
            ? initialAssertion.expectedValue
            : JSON.stringify(initialAssertion.expectedValue, null, 2)
          : ''
      );

      setStringMode(initialAssertion.stringMode || 'contains');
      setStringPattern(initialAssertion.stringPattern || '');
      setAllowedValuesRaw(
        initialAssertion.allowedValues ? initialAssertion.allowedValues.join(', ') : ''
      );
      setCaseSensitive(!!initialAssertion.caseSensitive);

      setNumericOperator(initialAssertion.numericOperator || 'above_or_equal');
      setThreshold(initialAssertion.threshold ?? initialAssertion.minValue ?? 1);
      setMinValue(initialAssertion.minValue ?? 0);
      setMaxValue(initialAssertion.maxValue ?? 100);

      setArgumentOperator(initialAssertion.argumentOperator || 'excludes');
      setArgumentKey(initialAssertion.argumentKey || '');
      setArgumentValue(
        initialAssertion.argumentValue !== undefined ? String(initialAssertion.argumentValue) : ''
      );

      setMaxDurationMs(initialAssertion.maxDurationMs ?? 400);

      setRawJsonText(JSON.stringify(initialAssertion, null, 2));
    } else {
      // New assertion default values
      const initialStepId =
        defaultTargetStepId ||
        workflow.steps.find((s) => s.type === 'tool_result' || s.type === 'tool_call')?.id ||
        workflow.steps[0]?.id ||
        '';

      const newId = `asrt-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6)}`;
      setId(newId);
      setName('Verify response status');
      setDescription('Checks that response field conforms to expected schema');
      setEnabled(true);
      setTarget('step');
      setTargetStepId(initialStepId);
      setTargetToolName('');
      setCheckType('json_path_exists');

      setJsonPath('id');
      setExpectedValueRaw('TCK-8921');

      setStringMode('contains');
      setStringPattern('');
      setAllowedValuesRaw('P1-Critical, P2-High, P3-Low, P4-Normal');
      setCaseSensitive(false);

      setNumericOperator('above_or_equal');
      setThreshold(1);
      setMinValue(0);
      setMaxValue(100);

      setArgumentOperator('excludes');
      setArgumentKey('');
      setArgumentValue('password');

      setMaxDurationMs(400);

      const templateObj: WorkflowAssertion = {
        id: newId,
        name: 'Verify response status',
        description: 'Checks that response field conforms to expected schema',
        enabled: true,
        target: 'step',
        targetStepId: initialStepId,
        checkType: 'json_path_exists',
        jsonPath: 'id',
      };
      setRawJsonText(JSON.stringify(templateObj, null, 2));
    }

    setMode('guided');
    setJsonError(null);
    setValidationErrors([]);
  }, [isOpen, initialAssertion, workflow, defaultTargetStepId]);

  if (!isOpen) return null;

  // Build the current assertion object from state
  const buildCurrentAssertion = (): { assertion: WorkflowAssertion; errors: string[] } => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('Assertion name is required.');
    }

    if (target === 'step' && !targetStepId) {
      errors.push('Please select a target step.');
    }

    let parsedExpectedValue: unknown = undefined;
    if (checkType === 'json_path_equals') {
      if (!expectedValueRaw.trim()) {
        errors.push('Expected value is required for equality check.');
      } else {
        try {
          parsedExpectedValue = JSON.parse(expectedValueRaw);
        } catch {
          // If not valid JSON, treat as raw string
          parsedExpectedValue = expectedValueRaw;
        }
      }
    }

    if (checkType === 'json_path_exists' || checkType === 'json_path_missing') {
      if (!jsonPath.trim()) {
        errors.push('JSON path is required (e.g. "id" or "customer.arr").');
      }
    }

    let parsedAllowed: string[] = [];
    if (checkType === 'string_matches') {
      if (stringMode === 'one_of') {
        parsedAllowed = allowedValuesRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (parsedAllowed.length === 0) {
          errors.push('Please provide at least one allowed value.');
        }
      } else if (stringMode === 'regex') {
        if (!stringPattern.trim()) {
          errors.push('Regular expression pattern is required.');
        } else {
          try {
            new RegExp(stringPattern);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            errors.push(`Invalid regular expression: ${msg}`);
          }
        }
      } else {
        if (!stringPattern.trim()) {
          errors.push('Substring to match is required.');
        }
      }
    }

    if (checkType === 'numeric_range') {
      if (numericOperator === 'within_range' && minValue > maxValue) {
        errors.push('Minimum value cannot be greater than maximum value.');
      }
    }

    if (checkType === 'argument_value') {
      if (!argumentValue.trim()) {
        errors.push('Argument value to check is required (e.g. "password").');
      }
    }

    if (checkType === 'duration_limit') {
      if (isNaN(maxDurationMs) || maxDurationMs <= 0) {
        errors.push('Duration limit must be a positive number in milliseconds.');
      }
    }

    const built: WorkflowAssertion = {
      id: id || `asrt-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled,
      target,
      targetStepId: target === 'step' ? targetStepId : undefined,
      targetToolName: target === 'all_tool_calls' && targetToolName.trim() ? targetToolName.trim() : undefined,
      checkType,
      jsonPath: jsonPath.trim() || undefined,
      expectedValue: parsedExpectedValue,
      stringMode: checkType === 'string_matches' ? stringMode : undefined,
      stringPattern: checkType === 'string_matches' ? stringPattern.trim() : undefined,
      allowedValues: checkType === 'string_matches' && stringMode === 'one_of' ? parsedAllowed : undefined,
      caseSensitive: checkType === 'string_matches' ? caseSensitive : undefined,
      numericOperator: checkType === 'numeric_range' ? numericOperator : undefined,
      threshold: checkType === 'numeric_range' && numericOperator !== 'within_range' ? threshold : undefined,
      minValue: checkType === 'numeric_range' && numericOperator === 'within_range' ? minValue : undefined,
      maxValue: checkType === 'numeric_range' && numericOperator === 'within_range' ? maxValue : undefined,
      argumentOperator: checkType === 'argument_value' ? argumentOperator : undefined,
      argumentKey: checkType === 'argument_value' && argumentKey.trim() ? argumentKey.trim() : undefined,
      argumentValue: checkType === 'argument_value' ? argumentValue.trim() : undefined,
      maxDurationMs: checkType === 'duration_limit' ? maxDurationMs : undefined,
    };

    return { assertion: built, errors };
  };

  // Sync state to raw JSON when switching to JSON mode
  const handleSwitchToJson = () => {
    const { assertion } = buildCurrentAssertion();
    setRawJsonText(JSON.stringify(assertion, null, 2));
    setJsonError(null);
    setMode('json');
  };

  // Sync raw JSON to guided fields when switching to Guided mode
  const handleSwitchToGuided = () => {
    try {
      const parsed: WorkflowAssertion = JSON.parse(rawJsonText);
      if (parsed.id) setId(parsed.id);
      if (parsed.name) setName(parsed.name);
      if (parsed.description !== undefined) setDescription(parsed.description);
      if (typeof parsed.enabled === 'boolean') setEnabled(parsed.enabled);
      if (parsed.target) setTarget(parsed.target);
      if (parsed.targetStepId) setTargetStepId(parsed.targetStepId);
      if (parsed.targetToolName !== undefined) setTargetToolName(parsed.targetToolName);
      if (parsed.checkType) setCheckType(parsed.checkType);
      if (parsed.jsonPath !== undefined) setJsonPath(parsed.jsonPath);
      if (parsed.expectedValue !== undefined) {
        setExpectedValueRaw(
          typeof parsed.expectedValue === 'string'
            ? parsed.expectedValue
            : JSON.stringify(parsed.expectedValue, null, 2)
        );
      }
      if (parsed.stringMode) setStringMode(parsed.stringMode);
      if (parsed.stringPattern !== undefined) setStringPattern(parsed.stringPattern);
      if (parsed.allowedValues) setAllowedValuesRaw(parsed.allowedValues.join(', '));
      if (typeof parsed.caseSensitive === 'boolean') setCaseSensitive(parsed.caseSensitive);
      if (parsed.numericOperator) setNumericOperator(parsed.numericOperator);
      if (parsed.threshold !== undefined) setThreshold(parsed.threshold);
      if (parsed.minValue !== undefined) setMinValue(parsed.minValue);
      if (parsed.maxValue !== undefined) setMaxValue(parsed.maxValue);
      if (parsed.argumentOperator) setArgumentOperator(parsed.argumentOperator);
      if (parsed.argumentKey !== undefined) setArgumentKey(parsed.argumentKey);
      if (parsed.argumentValue !== undefined) setArgumentValue(String(parsed.argumentValue));
      if (parsed.maxDurationMs !== undefined) setMaxDurationMs(parsed.maxDurationMs);

      setJsonError(null);
      setMode('guided');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setJsonError(`Cannot switch to Guided mode: ${msg}`);
    }
  };

  const handleSave = () => {
    if (mode === 'json') {
      try {
        const parsed: WorkflowAssertion = JSON.parse(rawJsonText);
        if (!parsed.name || typeof parsed.name !== 'string') {
          setJsonError('Assertion must contain a valid "name" string.');
          return;
        }
        if (!parsed.checkType) {
          setJsonError('Assertion must contain a valid "checkType".');
          return;
        }
        onSave(parsed);
        onClose();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setJsonError(`Invalid JSON: ${msg}`);
      }
    } else {
      const { assertion, errors } = buildCurrentAssertion();
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      onSave(assertion);
      onClose();
    }
  };

  // Immediate preview against recorded step
  const getPreviewResult = () => {
    const { assertion } = buildCurrentAssertion();
    if (assertion.target === 'step') {
      const stepIndex = workflow.steps.findIndex((s) => s.id === assertion.targetStepId);
      const step = stepIndex >= 0 ? workflow.steps[stepIndex] : null;
      if (!step) return null;
      return evaluateAssertionForStep(assertion, step, stepIndex);
    }
    return null;
  };

  const preview = getPreviewResult();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                {initialAssertion ? 'Edit Assertion' : 'Add Workflow Assertion'}
              </h2>
              <p className="text-xs text-slate-400">
                Define deterministic validation checks evaluated during MCP replay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Guided / JSON Toggle */}
            <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={mode === 'json' ? handleSwitchToGuided : undefined}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  mode === 'guided'
                    ? 'bg-slate-800 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Guided</span>
              </button>
              <button
                type="button"
                onClick={mode === 'guided' ? handleSwitchToJson : undefined}
                className={`flex items-center gap-1 px-2.5 py-1 rounded font-medium transition-colors ${
                  mode === 'json'
                    ? 'bg-slate-800 text-indigo-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Errors Notice */}
        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Please resolve the following issues:</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-300/90">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* JSON Syntax Error Notice */}
        {jsonError && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{jsonError}</span>
          </div>
        )}

        {/* Mode: GUIDED FORM */}
        {mode === 'guided' ? (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Name & Enabled */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assertion Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setValidationErrors([]);
                  }}
                  placeholder="e.g. Fetched ticket has an ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    enabled
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-slate-500'}`}
                  />
                  <span>{enabled ? 'Enabled' : 'Disabled'}</span>
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Description <span className="text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the intent or SLA requirement of this check..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Target Selection */}
            <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Evaluation Target
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setTarget('step')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    target === 'step'
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200">Specific Step</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Target one exact step in the workflow trace
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('all_tool_calls')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    target === 'all_tool_calls'
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200">All Matching Tool Calls</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Applies universally across all MCP tool calls
                  </div>
                </button>
              </div>

              {target === 'step' ? (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Select Target Step
                  </label>
                  <select
                    value={targetStepId}
                    onChange={(e) => setTargetStepId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  >
                    {workflow.steps.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        Step {idx + 1}: [{s.type}] {s.tool ? `${s.server}:${s.tool}` : s.content?.slice(0, 45) || s.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                    <span>Filter by Tool Name (optional)</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Leave empty to inspect ALL tools
                    </span>
                  </label>
                  <input
                    type="text"
                    value={targetToolName}
                    onChange={(e) => setTargetToolName(e.target.value)}
                    placeholder="e.g. fetch_ticket or leave empty for all"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Assertion Check Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Check Type
              </label>
              <select
                value={checkType}
                onChange={(e) => {
                  setCheckType(e.target.value as AssertionCheckType);
                  setValidationErrors([]);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-semibold focus:outline-hidden focus:border-indigo-500"
              >
                <option value="json_path_exists">JSON Path Exists (e.g. &quot;id&quot; exists)</option>
                <option value="json_path_missing">JSON Path is Missing (e.g. &quot;error&quot; is absent)</option>
                <option value="json_path_equals">JSON Path Equals Specified Value</option>
                <option value="string_matches">String Contains / Regex / Allowed List</option>
                <option value="numeric_range">Numeric Value Above / Below / Within Range</option>
                <option value="argument_value">MCP Tool Arguments Include / Exclude Value</option>
                <option value="duration_limit">Tool Duration Below Limit (SLA)</option>
              </select>
            </div>

            {/* Dynamic Fields Based on Check Type */}

            {/* 1 & 2: JSON Path (Exists / Missing / Equals) */}
            {(checkType === 'json_path_exists' ||
              checkType === 'json_path_missing' ||
              checkType === 'json_path_equals') && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>JSON Path <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      e.g. id, customer.arr, matched_articles[0].article_id
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs font-mono">$ .</span>
                    <input
                      type="text"
                      value={jsonPath}
                      onChange={(e) => setJsonPath(e.target.value)}
                      placeholder="id"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {checkType === 'json_path_equals' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Expected Value <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      rows={2}
                      value={expectedValueRaw}
                      onChange={(e) => setExpectedValueRaw(e.target.value)}
                      placeholder='e.g. "TCK-8921", 42, true, or {"key": "val"}'
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">
                      JSON primitives (strings, numbers, booleans) or complex JSON objects are automatically parsed.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3: String Matches / Contains / One of Allowed Values */}
            {checkType === 'string_matches' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    JSON Path <span className="text-slate-500 font-normal">(optional dot path or root)</span>
                  </label>
                  <input
                    type="text"
                    value={jsonPath}
                    onChange={(e) => setJsonPath(e.target.value)}
                    placeholder="e.g. priority, status, or leave empty for step content"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Matching Strategy
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {(['contains', 'regex', 'one_of'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setStringMode(m)}
                        className={`py-1.5 px-2 rounded-md font-medium capitalize text-center transition-colors ${
                          stringMode === m
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-semibold'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m === 'contains' ? 'Contains Substring' : m === 'regex' ? 'Regex Pattern' : 'Allowed Values'}
                      </button>
                    ))}
                  </div>
                </div>

                {stringMode === 'one_of' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Allowed Values (Comma-separated) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={allowedValuesRaw}
                      onChange={(e) => setAllowedValuesRaw(e.target.value)}
                      placeholder="P1-Critical, P2-High, P3-Low, P4-Normal"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="text-[10px] text-slate-500 mt-1">
                      Checks that the target value matches at least one item in the list.
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                      <span>{stringMode === 'regex' ? 'Regular Expression' : 'Substring'} <span className="text-rose-400">*</span></span>
                      {stringMode === 'regex' && (
                        <span className="text-[10px] text-slate-500 font-mono">e.g. ^(escalated|in_progress)$</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={stringPattern}
                      onChange={(e) => setStringPattern(e.target.value)}
                      placeholder={stringMode === 'regex' ? '^(P1-Critical|P2-High)$' : 'Billing sync failure'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />

                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="caseSensitiveToggle"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0"
                      />
                      <label htmlFor="caseSensitiveToggle" className="text-xs text-slate-400 cursor-pointer">
                        Case-sensitive match
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4: Numeric Range */}
            {checkType === 'numeric_range' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Numeric JSON Path <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 font-mono">e.g. total_matches, arr</span>
                  </label>
                  <input
                    type="text"
                    value={jsonPath}
                    onChange={(e) => setJsonPath(e.target.value)}
                    placeholder="total_matches"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Comparison Operator
                  </label>
                  <select
                    value={numericOperator}
                    onChange={(e) => setNumericOperator(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                  >
                    <option value="above_or_equal">Above or equal to (&gt;=)</option>
                    <option value="above">Strictly above (&gt;)</option>
                    <option value="below_or_equal">Below or equal to (&lt;=)</option>
                    <option value="below">Strictly below (&lt;)</option>
                    <option value="within_range">Within specified range [min, max]</option>
                  </select>
                </div>

                {numericOperator === 'within_range' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Minimum (inclusive)
                      </label>
                      <input
                        type="number"
                        value={minValue}
                        onChange={(e) => setMinValue(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-400 mb-1">
                        Maximum (inclusive)
                      </label>
                      <input
                        type="number"
                        value={maxValue}
                        onChange={(e) => setMaxValue(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Threshold Value
                    </label>
                    <input
                      type="number"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5: MCP Tool Argument Check */}
            {checkType === 'argument_value' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Argument Rule
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setArgumentOperator('excludes')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        argumentOperator === 'excludes'
                          ? 'bg-rose-950/30 border-rose-600 text-rose-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Excludes (Forbidden)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        e.g. Guarantee no tool receives a password
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setArgumentOperator('includes')}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        argumentOperator === 'includes'
                          ? 'bg-emerald-950/30 border-emerald-600 text-emerald-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Includes (Required)</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                        e.g. Tool must include specific parameter
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Argument Key <span className="text-slate-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={argumentKey}
                      onChange={(e) => setArgumentKey(e.target.value)}
                      placeholder="e.g. password or leave blank for any key"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Argument Value <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={argumentValue}
                      onChange={(e) => setArgumentValue(e.target.value)}
                      placeholder="password"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 6: Duration Limit */}
            {checkType === 'duration_limit' && (
              <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Maximum Allowed Duration (ms) <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-500 font-mono">1000ms = 1s</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={maxDurationMs}
                      onChange={(e) => setMaxDurationMs(parseInt(e.target.value) || 0)}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500"
                    />
                    <div className="flex gap-1.5">
                      {[250, 400, 500, 1000].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setMaxDurationMs(preset)}
                          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-800"
                        >
                          {preset}ms
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Assertion fails if replayed tool execution latency exceeds this threshold.
                  </div>
                </div>
              </div>
            )}

            {/* Live Trace Preview Ribbon */}
            {preview && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  preview.status === 'passed'
                    ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-800/80 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {preview.status === 'passed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold">
                      Preview against Recorded Trace: {preview.status.toUpperCase()}
                    </span>
                    <p className="text-[11px] text-slate-300/90 mt-0.5">{preview.message}</p>
                  </div>
                </div>
                {preview.actualValue !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 shrink-0 text-slate-300">
                    Value: {typeof preview.actualValue === 'object' ? JSON.stringify(preview.actualValue).slice(0, 30) : String(preview.actualValue)}
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Mode: ADVANCED JSON EDITOR */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Directly edit the raw JSON definition for this assertion</span>
              <span className="text-[10px] font-mono text-indigo-400">JSON Schema v1</span>
            </div>
            <textarea
              rows={16}
              value={rawJsonText}
              onChange={(e) => {
                setRawJsonText(e.target.value);
                setJsonError(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-hidden focus:border-indigo-500 leading-relaxed"
            />
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="text-[11px] font-mono text-slate-500">
            ID: <span className="text-slate-400">{id}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4" />
              <span>{initialAssertion ? 'Save Changes' : 'Create Assertion'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

