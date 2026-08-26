export type WorkspaceSection = 'workspace' | 'datasets' | 'analytics' | 'models' | 'copilot' | 'sql' | 'settings';
export type WorkspaceTab = 'preview' | 'statistics' | 'missing' | 'types' | 'charts' | 'eda' | 'models' | 'sql' | 'report';

// ── Dataset Types ──────────────────────────────────────────────────
export interface ColumnSchema {
  name: string;
  dtype: string;
  missing: number;
  missing_percentage: number;
  unique: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  median?: number;
}

export interface QualityScore {
  overall: number; // 0–100
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  timeliness: number;
  grade: 'Good' | 'Fair' | 'Poor';
}

export interface Dataset {
  dataset_id: string;
  file_name: string;
  rows: number;
  columns: number;
  missing_cells: number;
  missing_percentage: number;
  schema: ColumnSchema[];
  quality: QualityScore;
  preview: Record<string, unknown>[];
  column_names: string[];
  eda_profile?: {
    rows: number;
    missing_pct: number;
    numeric_cols: number;
    categorical_cols: number;
  };
}

// ── Chart Types ────────────────────────────────────────────────────
export type ChartType = 'bar' | 'line' | 'scatter' | 'histogram' | 'pie' | 'donut';

export interface ChartData {
  type: ChartType;
  data: Record<string, unknown>[];
  x_key: string;
  y_key: string;
  title?: string;
  subtitle?: string;
}

// ── Copilot & Tool Calling ─────────────────────────────────────────
export type MessageRole = 'user' | 'ai' | 'system' | 'tool';

export interface ToolExecution {
  name: string;
  status: 'running' | 'success' | 'failed';
  executionTimeMs?: number;
  args?: Record<string, unknown>;
  outputSummary?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  chart_data?: ChartData;
  table_data?: {
    columns: string[];
    rows: (string | number | null)[][];
  };
  tool_calls?: string[];
  tool_executions?: ToolExecution[];
  timestamp: number;
  error?: { code: string; message: string };
}

// ── Activity History ───────────────────────────────────────────────
export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'upload' | 'tool' | 'chart' | 'clean' | 'model' | 'chat';
  message: string;
  detail?: string;
}

// ── ML Models ──────────────────────────────────────────────────────
export interface MLMetrics {
  task_type: 'classification' | 'regression';
  target_column: string;
  accuracy?: number;
  f1_score?: number;
  roc_auc?: number;
  rmse?: number;
  r2_score?: number;
  feature_importances?: { feature: string; importance: number }[];
  model_name: string;
}

// ── Filters & Grid ─────────────────────────────────────────────────
export interface FilterCondition {
  column: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'is_null';
  value: string;
}
