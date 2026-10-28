'use client';

import React from 'react';
import {
  Layers,
  Play,
  History,
  Sliders,
  Plus,
  Share2,
  Workflow,
  Radio,
  Flame,
  GitFork,
} from 'lucide-react';

export type NavTab = 'library' | 'timeline' | 'replay' | 'history' | 'branch';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeWorkflowName?: string;
  hasActiveWorkflow: boolean;
  activeBranchName?: string;
  hasActiveBranch: boolean;
  onOpenRules: () => void;
  onNewWorkflow: () => void;
  onImportTrace: () => void;
  workflowsCount: number;
  runsCount: number;
}

export function Navbar({
  activeTab,
  onTabChange,
  activeWorkflowName,
  hasActiveWorkflow,
  activeBranchName,
  hasActiveBranch,
  onOpenRules,
  onNewWorkflow,
  onImportTrace,
  workflowsCount,
  runsCount,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <div
              onClick={() => onTabChange('library')}
              className="flex items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                    TraceForge
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    MCP LAB
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono -mt-0.5">
                  Workflow Replay &amp; Regressions
                </div>
              </div>
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onTabChange('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'library'
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Library</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 font-mono text-slate-400">
                  {workflowsCount}
                </span>
              </button>

              {hasActiveWorkflow && (
                <>
                  <button
                    onClick={() => onTabChange('timeline')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'timeline'
                        ? 'bg-slate-800 text-slate-100 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="max-w-[130px] truncate">
                      {activeWorkflowName || 'Timeline'}
                    </span>
                  </button>

                  <button
                    onClick={() => onTabChange('replay')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      activeTab === 'replay'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                    <span>Replay Lab</span>
                  </button>

                  {hasActiveBranch && (
                    <button
                      onClick={() => onTabChange('branch')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeTab === 'branch'
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <GitFork className="w-3.5 h-3.5 text-purple-400" />
                      <span className="max-w-[140px] truncate">{activeBranchName || 'Branch'}</span>
                    </button>
                  )}
                </>
              )}

              <button
                onClick={() => onTabChange('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'bg-slate-800 text-slate-100 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
                {runsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 font-mono text-slate-400">
                    {runsCount}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Rules Button */}
            <button
              onClick={onOpenRules}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition-colors"
              title="Configure Diff & Comparison Rules"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden lg:inline">Rules</span>
            </button>

            {/* Import Button */}
            <button
              onClick={onImportTrace}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition-colors"
              title="Import Workflow Trace JSON"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* New Workflow */}
            <button
              onClick={onNewWorkflow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-xs shadow-indigo-600/30 transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Mobile secondary tab strip */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => onTabChange('library')}
            className={`px-2 py-1 rounded ${activeTab === 'library' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            Library
          </button>
          {hasActiveWorkflow && (
            <>
              <button
                onClick={() => onTabChange('timeline')}
                className={`px-2 py-1 rounded ${activeTab === 'timeline' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
              >
                Timeline
              </button>
              <button
                onClick={() => onTabChange('replay')}
                className={`px-2 py-1 rounded ${activeTab === 'replay' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
              >
                Replay Lab
              </button>
            </>
          )}
          {hasActiveBranch && (
            <button
              onClick={() => onTabChange('branch')}
              className={`px-2 py-1 rounded ${activeTab === 'branch' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}
            >
              Branch
            </button>
          )}
          <button
            onClick={() => onTabChange('history')}
            className={`px-2 py-1 rounded ${activeTab === 'history' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}
          >
            History
          </button>
        </div>
      </div>
    </header>
  );
}
