import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import type {
  Dataset, ChartData, ChatMessage, WorkspaceSection,
  WorkspaceTab, ColumnSchema, ActivityEvent
} from './types';
import { uploadDataset, sendChat, runEda, downloadJupyterNotebook, API_BASE } from './services/api';
import { BookOpen } from 'lucide-react';

// Shell & Navigation
import { Topbar } from './components/shell/Topbar';
import { NavigationRail } from './components/shell/NavigationRail';
import { WorkspaceTabs } from './components/shell/WorkspaceTabs';

// Common UX, Loaders & Toast
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { DashboardSkeleton } from './components/common/SkeletonLoader';
import { ToastProvider, useToast } from './components/common/Toast';

// Explorer & Modals
import { ExplorerSidebar } from './components/explorer/ExplorerSidebar';
import { ColumnDetailsModal } from './components/explorer/ColumnDetailsModal';
import { DataDictionaryModal } from './components/explorer/DataDictionaryModal';

// Direct lightweight components
import { DatasetOverview } from './components/overview/DatasetOverview';
import { DataPreview } from './components/data-grid/DataPreview';
import { ExecutiveReportModal } from './components/reports/ExecutiveReportModal';
import { CopilotPanel } from './components/copilot/CopilotPanel';
import { ExportModal } from './components/export/ExportModal';
import { HistoryDrawer } from './components/history/HistoryDrawer';

// Heavy modules loaded on-demand via React.lazy
const ChartGrid = lazy(() => import('./components/charts/ChartGrid').then((m) => ({ default: m.ChartGrid })));
const EDAPage = lazy(() => import('./components/eda/EDAPage').then((m) => ({ default: m.EDAPage })));
const ModelPage = lazy(() => import('./components/models/ModelPage').then((m) => ({ default: m.ModelPage })));
const SQLStudio = lazy(() => import('./components/sql/SQLStudio').then((m) => ({ default: m.SQLStudio })));

let msgCounter = 0;
const genId = () => `msg_${Date.now()}_${++msgCounter}`;

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}

function MainApp() {
  // Application State
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('workspace');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('preview');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('unsaved');

  // Dataset State
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [edaProfile, setEdaProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingEda, setLoadingEda] = useState<boolean>(false);
  const [charts, setCharts] = useState<ChartData[]>([]);

  // Copilot Messages & History
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyEvents, setHistoryEvents] = useState<ActivityEvent[]>([]);

  // Modals
  const [selectedColumn, setSelectedColumn] = useState<ColumnSchema | null>(null);
  const [showDictionary, setShowDictionary] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const addHistoryEvent = useCallback((type: ActivityEvent['type'], message: string, detail?: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistoryEvents((prev) => [
      { id: `hist_${Date.now()}`, timestamp: time, type, message, detail },
      ...prev,
    ]);
  }, []);

  const addMessage = useCallback((role: ChatMessage['role'], text: string, extras: Partial<ChatMessage> = {}) => {
    const newMsg: ChatMessage = {
      id: genId(),
      role,
      text,
      timestamp: Date.now(),
      ...extras,
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

  // Handle Dataset Upload
  const handleUpload = useCallback(async (file: File) => {
    setLoading(true);
    setSaveStatus('saving');
    addMessage('system', `⚙ Ingesting ${file.name}...`);
    addHistoryEvent('upload', `Uploaded ${file.name}`);

    try {
      const data = await uploadDataset(file);
      setDataset(data);
      setEdaProfile(data.eda_profile);
      setSaveStatus('saved');
      setMessages([]);
      setCharts([]);

      addMessage(
        'system',
        `✓ Dataset loaded successfully\n  ${data.rows.toLocaleString()} rows · ${data.columns} columns · ${data.missing_cells.toLocaleString()} missing values`
      );

      // Auto-trigger EDA charts
      setLoadingEda(true);
      try {
        const edaRes = await runEda(data.dataset_id);
        if (edaRes.charts?.length) {
          setCharts(edaRes.charts);
          addHistoryEvent('chart', `Auto-generated ${edaRes.charts.length} exploratory charts`);
        }
      } catch {
        // Non-critical
      }
      setLoadingEda(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to upload dataset';
      addMessage('system', `❌ ${errMsg} — Check connection to backend (${API_BASE})`);
      setSaveStatus('unsaved');
    }
    setLoading(false);
  }, [addMessage, addHistoryEvent]);

  // Handle Copilot Chat Queries
  const handleSendMessage = useCallback(async (query: string) => {
    if (!dataset) return;
    addMessage('user', query);
    addHistoryEvent('chat', query);
    setLoading(true);

    try {
      const res = await sendChat(dataset.dataset_id, query);

      if (res.tool_calls?.length) {
        res.tool_calls.forEach((tool) => {
          addHistoryEvent('tool', `Executed ${tool}()`);
        });
      }

      // Support both old `response` field and new `reply` field
      const replyText = (res as any).reply || res.response || 'Done.';

      addMessage('ai', replyText, {
        chart_data: res.chart_data,
        table_data: res.table_data,
        tool_calls: res.tool_calls,
        error: res.error,
      });

      // If the tool mutated the data, refresh the dataset state so the grid updates
      const freshRes = res as any;
      if (freshRes.preview && freshRes.rows !== undefined) {
        setDataset((prev) =>
          prev
            ? {
                ...prev,
                preview: freshRes.preview,
                rows: freshRes.rows,
                schema: freshRes.schema_info ?? prev.schema,
              }
            : prev
        );
      }

      if (res.chart_data) {
        setCharts((prev) => [...prev, res.chart_data!]);
        addHistoryEvent('chart', `Generated ${res.chart_data.title || 'visualization'}`);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown AI engine error';
      addMessage('system', `❌ ${errMsg}`, { error: { code: 'AI_ERROR', message: errMsg } });
    }
    setLoading(false);
  }, [dataset, addMessage, addHistoryEvent]);


  // Run EDA manually
  const handleRunEda = useCallback(async () => {
    if (!dataset) return;
    setLoadingEda(true);
    try {
      const res = await runEda(dataset.dataset_id);
      if (res.charts?.length) {
        setCharts(res.charts);
        setActiveTab('charts');
        addHistoryEvent('chart', `Refreshed ${res.charts.length} exploratory charts`);
      }
    } catch {
      // Non-critical
    }
    setLoadingEda(false);
  }, [dataset, addHistoryEvent]);

  // Export Jupyter Notebook (.ipynb)
  const handleExportNotebook = useCallback(async () => {
    try {
      await downloadJupyterNotebook();
      addMessage('system', '📥 Jupyter Notebook (.ipynb) downloaded successfully.');
      addHistoryEvent('upload', 'Exported session as Jupyter Notebook (.ipynb)');
    } catch (err) {
      addMessage('system', '⚠️ Failed to export Jupyter notebook.');
    }
  }, [addMessage, addHistoryEvent]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-[#07091a] text-[#e8edf8] font-sans antialiased select-none">
      {/* 1. Global Header */}
      <Topbar
        dataset={dataset}
        saveStatus={saveStatus}
        activeSection={activeSection}
        onOpenExport={() => setShowExport(true)}
        onOpenHistory={() => setShowHistory(true)}
        onSelectSection={(sec) => {
          setActiveSection(sec);
          if (sec === 'models') setActiveTab('models');
          if (sec === 'analytics') setActiveTab('eda');
          if (sec === 'sql') setActiveTab('sql');
        }}
      />

      {/* 2. Workspace Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Rail */}
        <NavigationRail
          activeSection={activeSection}
          onSelectSection={(sec) => {
            setActiveSection(sec);
            if (sec === 'models') setActiveTab('models');
            if (sec === 'analytics') setActiveTab('eda');
            if (sec === 'sql') setActiveTab('sql');
            if (sec === 'datasets' || sec === 'workspace') setActiveTab('preview');
          }}
        />

        {/* Data Explorer Sidebar */}
        <ExplorerSidebar
          dataset={dataset}
          loading={loading}
          onUpload={handleUpload}
          onSelectColumn={(col) => setSelectedColumn(col)}
          onOpenDataDictionary={() => setShowDictionary(true)}
          onExportNotebook={handleExportNotebook}
        />

        {/* Main Center Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#07091a] overflow-hidden">
          {/* Workspace Tabs Navigation */}
          <WorkspaceTabs
            activeTab={activeTab}
            onTabChange={(tab) => {
              if (tab === 'report') {
                setShowReportModal(true);
              } else {
                setActiveTab(tab);
              }
            }}
            hasCharts={charts.length > 0}
          />

          {/* Tab Viewport Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Top Metric Cards & Quality Score */}
            {dataset && <DatasetOverview dataset={dataset} />}

            {/* TAB: Data Preview */}
            {activeTab === 'preview' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <DataPreview dataset={dataset} />
                <ChartGrid
                  charts={charts}
                  loadingEda={loadingEda}
                  onRunEda={handleRunEda}
                  hasDataset={!!dataset}
                  onAskAI={handleSendMessage}
                />
              </div>
            )}

            {/* TAB: Summary Statistics */}
            {activeTab === 'statistics' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {edaProfile && (
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Rows</div>
                      <div className="text-2xl font-bold text-blue-400">{edaProfile.rows.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Missing Data</div>
                      <div className="text-2xl font-bold text-rose-400">{edaProfile.missing_pct}%</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Numeric Cols</div>
                      <div className="text-2xl font-bold text-emerald-400">{edaProfile.numeric_cols}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Text Cols</div>
                      <div className="text-2xl font-bold text-purple-400">{edaProfile.categorical_cols}</div>
                    </div>
                  </div>
                )}

                <div className="bg-[#0f1628] border border-white/[0.07] rounded-2xl p-4 overflow-x-auto">
                  <h4 className="text-[12px] font-bold text-white font-mono uppercase mb-3">
                    Summary Statistics by Feature
                  </h4>
                  <table className="w-full text-left text-[11px] font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[#4a5a80] uppercase text-[10px]">
                        <th className="py-2">Column</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Unique</th>
                        <th className="py-2">Missing</th>
                        <th className="py-2">Missing %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {dataset?.schema.map((col) => (
                        <tr key={col.name} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 font-bold text-white">{col.name}</td>
                          <td className="py-2.5 text-[#8b9cc8]">{col.dtype}</td>
                          <td className="py-2.5 text-[#e8edf8]">{col.unique.toLocaleString()}</td>
                          <td className="py-2.5 text-[#f5a623]">{col.missing.toLocaleString()}</td>
                          <td className="py-2.5 text-[#8b9cc8]">{col.missing_percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: Charts Grid */}
            {activeTab === 'charts' && (
              <ErrorBoundary fallbackTitle="Charts Loading Error">
                <Suspense fallback={<DashboardSkeleton />}>
                  <div className="animate-in fade-in duration-150">
                    <ChartGrid
                      charts={charts}
                      loadingEda={loadingEda}
                      onRunEda={handleRunEda}
                      hasDataset={!!dataset}
                      onAskAI={handleSendMessage}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}

            {/* TAB: Deep EDA */}
            {(activeTab === 'eda' || activeTab === 'missing' || activeTab === 'types') && (
              <ErrorBoundary fallbackTitle="EDA Dashboard Error">
                <Suspense fallback={<DashboardSkeleton />}>
                  <div className="animate-in fade-in duration-150">
                    <EDAPage dataset={dataset} onAskAI={handleSendMessage} />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}

            {/* TAB: Model Studio */}
            {activeTab === 'models' && (
              <ErrorBoundary fallbackTitle="Model Studio Error">
                <Suspense fallback={<DashboardSkeleton />}>
                  <div className="animate-in fade-in duration-150">
                    <ModelPage dataset={dataset} onAskAI={handleSendMessage} />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}

            {/* TAB: SQL Studio & BigQuery */}
            {activeTab === 'sql' && (
              <ErrorBoundary fallbackTitle="SQL Studio Error">
                <Suspense fallback={<DashboardSkeleton />}>
                  <div className="animate-in fade-in duration-150">
                    <SQLStudio
                      currentDataset={dataset}
                      onDatasetImported={(newDs) => {
                        setDataset(newDs);
                        setActiveTab('preview');
                        addHistoryEvent('upload', `Created joined dataset: ${newDs.file_name}`);
                      }}
                      onAskAI={handleSendMessage}
                    />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>

      {/* 3. Global AI Copilot Panel (Docked at bottom) */}
      <CopilotPanel
        messages={messages}
        loading={loading}
        dataset={dataset}
        onSendMessage={handleSendMessage}
      />

      {/* 4. Modals & Drawers */}
      {selectedColumn && (
        <ColumnDetailsModal
          column={selectedColumn}
          totalRows={dataset?.rows || 0}
          onClose={() => setSelectedColumn(null)}
          onAskAI={handleSendMessage}
        />
      )}

      {showDictionary && (
        <DataDictionaryModal
          dataset={dataset}
          onClose={() => setShowDictionary(false)}
        />
      )}

      {showExport && (
        <ExportModal
          dataset={dataset}
          onClose={() => setShowExport(false)}
          onOpenReport={() => {
            setShowExport(false);
            setShowReportModal(true);
          }}
        />
      )}

      {showReportModal && (
        <ExecutiveReportModal
          dataset={dataset}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showHistory && (
        <HistoryDrawer
          events={historyEvents}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}