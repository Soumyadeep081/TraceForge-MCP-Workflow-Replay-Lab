'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  title?: string;
  initialExpanded?: boolean;
  maxInitialDepth?: number;
}

export function JsonViewer({
  data,
  title,
  initialExpanded = true,
  maxInitialDepth = 2,
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(!initialExpanded);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (data === undefined) {
    return <span className="text-slate-500 italic text-xs">undefined</span>;
  }

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 text-xs font-mono overflow-hidden">
      {title && (
        <div
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800/80 cursor-pointer hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-1.5 font-sans font-medium text-slate-300">
            {collapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{title}</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {Array.isArray(data)
                ? `[${data.length}]`
                : typeof data === 'object' && data !== null
                ? `{${Object.keys(data).length}}`
                : ''}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-sans text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Copy JSON"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      {!collapsed && (
        <div className="p-3 overflow-x-auto max-h-96 select-text">
          <JsonNode value={data} depth={0} maxInitialDepth={maxInitialDepth} />
        </div>
      )}
    </div>
  );
}

function JsonNode({
  value,
  depth,
  maxInitialDepth,
  keyName,
}: {
  value: any;
  depth: number;
  maxInitialDepth: number;
  keyName?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < maxInitialDepth);

  const indent = depth * 14;

  if (value === null) {
    return (
      <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
        {keyName && <span className="text-indigo-300">{keyName}: </span>}
        <span className="text-rose-400 font-semibold">null</span>
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
        {keyName && <span className="text-indigo-300">{keyName}: </span>}
        <span className="text-amber-400">{value ? 'true' : 'false'}</span>
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
        {keyName && <span className="text-indigo-300">{keyName}: </span>}
        <span className="text-emerald-400">{value}</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    return (
      <div style={{ paddingLeft: `${indent}px` }} className="py-0.5 break-all">
        {keyName && <span className="text-indigo-300">{keyName}: </span>}
        <span className="text-amber-200">&quot;{value}&quot;</span>
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
          {keyName && <span className="text-indigo-300">{keyName}: </span>}
          <span className="text-slate-400">[]</span>
        </div>
      );
    }

    return (
      <div className="py-0.5">
        <div
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer hover:text-slate-200 inline-flex items-center gap-1 text-slate-400 select-none"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
          {keyName && <span className="text-indigo-300">{keyName}: </span>}
          <span>Array({value.length})</span>
          {!isExpanded && <span className="text-slate-600 text-[10px]"> [...]</span>}
        </div>
        {isExpanded && (
          <div>
            {value.map((item, idx) => (
              <JsonNode
                key={idx}
                value={item}
                depth={depth + 1}
                maxInitialDepth={maxInitialDepth}
                keyName={`[${idx}]`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
          {keyName && <span className="text-indigo-300">{keyName}: </span>}
          <span className="text-slate-400">{'{}'}</span>
        </div>
      );
    }

    return (
      <div className="py-0.5">
        <div
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="cursor-pointer hover:text-slate-200 inline-flex items-center gap-1 text-slate-400 select-none"
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-slate-500" />
          ) : (
            <ChevronRight className="w-3 h-3 text-slate-500" />
          )}
          {keyName && <span className="text-indigo-300">{keyName}: </span>}
          <span className="text-slate-400">Object({keys.length})</span>
          {!isExpanded && <span className="text-slate-600 text-[10px]"> {'{...}'}</span>}
        </div>
        {isExpanded && (
          <div>
            {keys.map((k) => (
              <JsonNode
                key={k}
                value={value[k]}
                depth={depth + 1}
                maxInitialDepth={maxInitialDepth}
                keyName={k}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: `${indent}px` }} className="py-0.5">
      {keyName && <span className="text-indigo-300">{keyName}: </span>}
      <span>{String(value)}</span>
    </div>
  );
}
