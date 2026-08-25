import React, { useState } from 'react';
import { uploadData, chatWithData, generateDlModel } from './api';
import { Upload, Database, Terminal, Send, Cpu, Download, BarChart2, Table } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [schema, setSchema] = useState<any[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [chatLog, setChatLog] = useState<{ role: string, text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [targetCol, setTargetCol] = useState('');
  const [taskType, setTaskType] = useState('Classification');

  // NEW: Chart State
  const [activeTab, setActiveTab] = useState<'grid' | 'chart'>('grid');
  const [chartConfig, setChartConfig] = useState<any | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const data = await uploadData(file);
      setSchema(data.schema_info);
      setPreview(data.preview);
      setTargetCol(data.schema_info[0]?.column || '');
      setChatLog(prev => [...prev, { role: 'system', text: `✅ Dataset loaded: ${data.rows} rows detected.` }]);
    } catch (error) {
      setChatLog(prev => [...prev, { role: 'system', text: `❌ Upload failed. Ensure FastAPI is running.` }]);
    }
    setLoading(false);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    const userQuery = input;
    setChatLog(prev => [...prev, { role: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    try {
      const data = await chatWithData(userQuery);
      setChatLog(prev => [...prev, { role: 'ai', text: data.response }]);

      // NEW: If AI sends chart data, save it and switch to the Chart tab!
      if (data.chart_data) {
        setChartConfig(data.chart_data);
        setActiveTab('chart');
      }
    } catch (error) {
      setChatLog(prev => [...prev, { role: 'system', text: `❌ Error communicating with AI Engine.` }]);
    }
    setLoading(false);
  };

  const handleGenerateDL = async () => {
    setLoading(true);
    setChatLog(prev => [...prev, { role: 'system', text: `⚙️ Architecting ${taskType} Neural Network for '${targetCol}'...` }]);
    try {
      const data = await generateDlModel(targetCol, taskType);
      setChatLog(prev => [...prev, { role: 'ai', text: `✅ Model Architecture Generated:\n\n${data.notebook_code}` }]);
    } catch (error) {
      setChatLog(prev => [...prev, { role: 'system', text: `❌ Failed to generate Deep Learning model.` }]);
    }
    setLoading(false);
  };

  // NEW: Helper to render the correct Recharts component
  const renderChart = () => {
    if (!chartConfig) return <div className="text-slate-500 flex items-center justify-center h-full">No chart data generated yet.</div>;

    const { type, data, x_key, y_key } = chartConfig;

    return (
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={x_key} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
            <Bar dataKey={y_key} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={x_key} stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }} />
            <Line type="monotone" dataKey={y_key} stroke="#8b5cf6" strokeWidth={3} />
          </LineChart>
        ) : (
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={x_key} name={x_key} stroke="#94a3b8" />
            <YAxis dataKey={y_key} name={y_key} stroke="#94a3b8" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none' }} />
            <Scatter name="Data" data={data} fill="#10b981" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 font-sans">

      <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2 font-bold text-lg text-blue-400">
          <Cpu size={24} /> DataPilot AI
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">1. Data Ingestion</h2>
          <input
            type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm mb-2 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-500 file:text-white cursor-pointer"
          />
          <button onClick={handleUpload} disabled={!file || loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-2 rounded flex items-center justify-center gap-2 transition disabled:opacity-50">
            <Upload size={16} /> Process Dataset
          </button>

          {schema.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Database size={14} /> Schema Explorer</h2>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {schema.map((col, idx) => (
                  <div key={idx} className="flex justify-between text-xs bg-slate-700/50 p-2 rounded">
                    <span className="font-mono text-emerald-300">{col.column}</span>
                    <span className="text-slate-400">{col.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {schema.length > 0 && (
            <div className="mt-6 border-t border-slate-700 pt-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">🧠 AI Architect</h2>
              <label className="text-xs text-slate-400">Target Variable</label>
              <select value={targetCol} onChange={e => setTargetCol(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded mb-2 outline-none">
                {schema.map((col, idx) => <option key={idx} value={col.column}>{col.column}</option>)}
              </select>

              <label className="text-xs text-slate-400">Task Type</label>
              <select value={taskType} onChange={e => setTaskType(e.target.value)} className="w-full bg-slate-700 text-sm p-2 rounded mb-4 outline-none">
                <option value="Classification">Classification</option>
                <option value="Regression">Regression</option>
              </select>

              <button onClick={handleGenerateDL} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white p-2 rounded flex items-center justify-center gap-2 transition disabled:opacity-50">
                <Download size={16} /> Generate PyTorch Model
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* TOP PANE: Dynamic Visualizer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">

          {/* NEW: TABS */}
          <div className="flex bg-slate-800 border-b border-slate-700">
            <button onClick={() => setActiveTab('grid')} className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'grid' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>
              <Table size={16} /> Live Data Grid
            </button>
            <button onClick={() => setActiveTab('chart')} className={`px-4 py-3 text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'chart' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>
              <BarChart2 size={16} /> AI Chart Visualizer
            </button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {activeTab === 'grid' ? (
              preview.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  Upload a CSV to preview data
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-700 shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800">
                        {schema.map((col, idx) => (
                          <th key={idx} className="p-3 border-b border-slate-700 text-sm font-semibold text-slate-300">{col.column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-800/50">
                          {schema.map((col, colIdx) => (
                            <td key={colIdx} className="p-3 border-b border-slate-700 text-sm text-slate-400">{row[col.column]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              // Render the Chart View
              <div className="h-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 shadow-xl">
                {renderChart()}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM PANE: AI Console */}
        <div className="h-2/5 bg-[#0a0a0a] border-t border-slate-700 flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-10">
          <div className="bg-slate-800 px-4 py-2 text-xs font-mono text-slate-400 flex items-center gap-2 border-b border-slate-700">
            <Terminal size={14} /> Copilot Terminal
          </div>

          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm space-y-4">
            {chatLog.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'text-blue-400' : msg.role === 'system' ? 'text-slate-500' : 'text-emerald-400'}`}>
                <span>{msg.role === 'user' ? '❯' : msg.role === 'system' ? '⚙' : '🤖'}</span>
                <span className="whitespace-pre-wrap leading-relaxed">{msg.text}</span>
              </div>
            ))}
            {loading && <div className="text-slate-500 animate-pulse flex gap-2"><span>⚙</span> Processing request...</div>}
          </div>

          <form onSubmit={handleChat} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <span className="text-blue-500 font-bold p-2">~</span>
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Ask Gemini for a chart (e.g., 'Generate a bar chart of average salary by department')"
              className="flex-1 bg-transparent outline-none font-mono text-slate-200"
            />
            <button type="submit" disabled={loading || !input} className="text-slate-500 hover:text-blue-400 transition">
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}