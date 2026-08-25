# 🚀 DataPilot AI — Agentic Data Science Workspace

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.110-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%208-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%203.4-38B2AC.svg?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash%20Function%20Calling-4285F4.svg?logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**DataPilot AI** is an enterprise-grade, agentic data science studio designed to transform raw tabular datasets into interactive dashboards, statistical profiles, exploratory visualizations, machine learning benchmarks, and Google Colab PyTorch notebooks through autonomous AI tool calling.

---

## 📑 Table of Contents

1. [Architectural Overview](#-architectural-overview)
2. [Key Capabilities & Innovations](#-key-capabilities--innovations)
3. [UI Spatial Hierarchy & Component Map](#-ui-spatial-hierarchy--component-map)
4. [Backend Engine & Agentic Tool Execution](#-backend-engine--agentic-tool-execution)
5. [API Contract (v1 REST Endpoints)](#-api-contract-v1-rest-endpoints)
6. [Directory Structure](#-directory-structure)
7. [Installation & Getting Started](#-installation--getting-started)
8. [Configuration & Multi-API Key Pool](#-configuration--multi-api-key-pool)
9. [Feature Walkthrough](#-feature-walkthrough)
10. [Roadmap](#-roadmap)

---

## 🏛 Architectural Overview

DataPilot AI enforces a **strict architectural separation of concerns**:
* **Gemini LLM**: Acts strictly as a reasoning engine and tool orchestrator (decides *which* analytical tool to invoke).
* **Python Backend (FastAPI + Pandas + Scikit-Learn)**: Executes deterministic data operations with **zero `exec()` or untrusted code execution**.
* **React + Vite Frontend (Recharts + Tailwind)**: Renders live data tables, radial health gauges, and interactive charts based on structured JSON payloads.

```text
                         ┌──────────────────────────────────────────────┐
                         │                 DataPilot AI                 │
                         │        Agentic Data Science Workspace        │
                         └──────────────────────┬───────────────────────┘
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                │                               │                               │
     ┌──────────▼──────────┐         ┌──────────▼──────────┐         ┌──────────▼──────────┐
     │    Data Explorer    │         │    Main Workspace   │         │      AI Copilot     │
     ├─────────────────────┤         ├─────────────────────┤         ├─────────────────────┤
     │ • Drag-Drop Upload  │         │ • Overview Metrics  │         │ • Conversational EDA│
     │ • Schema Explorer   │         │ • Data Quality (93%)│         │ • Tool Call Badges  │
     │ • Typed dtypes/nulls│         │ • Paginated Grid    │         │ • Multi-modal Output│
     │ • Data Dictionary   │         │ • Dynamic EDA Charts│         │ • Prompt Suggestions│
     │ • Column Inspector  │         │ • Model Studio (ML) │         │ • Error Transparency│
     └──────────┬──────────┘         └──────────┬──────────┘         └──────────┬──────────┘
                │                               │                               │
                └───────────────────────────────┼───────────────────────────────┘
                                                │
                                   ┌────────────▼────────────┐
                                   │    FastAPI v1 Engine    │
                                   │   (Port 8000 REST API)  │
                                   └────────────┬────────────┘
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                │                               │                               │
     ┌──────────▼──────────┐         ┌──────────▼──────────┐         ┌──────────▼──────────┐
     │   Session Data Store│         │  Deterministic Tools│         │ Gemini Analyst Agent│
     ├─────────────────────┤         ├─────────────────────┤         ├─────────────────────┤
     │ • In-Memory Datasets│         │ • Summary Stats     │         │ • Tool Selection    │
     │ • Quality Engine    │         │ • Correlation Matrix│         │ • Multi-key Pool    │
     │ • Schema Extraction │         │ • Outlier Removal   │         │ • Model Fallback    │
     │ • JSON Serialization│         │ • Chart Aggregation │         │ • Context Memory    │
     └─────────────────────┘         └─────────────────────┘         └─────────────────────┘
```

---

## ⚡ Key Capabilities & Innovations

* 🛡️ **Zero `exec()` Security**: Data transformations, statistical aggregations, and cleaning routines execute purely via verified, pre-defined tool functions.
* 📊 **Automated 5-Dimension Quality Engine**: Calculates overall dataset health ($0-100\%$) across **Completeness**, **Consistency**, **Validity**, **Uniqueness**, and **Timeliness**.
* ⚡ **Visible Tool Execution**: Every AI action is surfaced in the Copilot with clear tags (e.g. `⚙ get_missing_values() ✓ completed in 120ms`).
* 📈 **Dynamic Chart Generation**: Automatically detects categorical and numerical column pairs to render distributions, histograms, bar charts, scatter plots, and donut charts.
* 🤖 **Machine Learning Studio**: Select target variables, automatically classify task type (Classification/Regression), evaluate baseline models (Random Forest, Logistic Regression), inspect feature importances, and export PyTorch Google Colab notebooks.
* 🔑 **Multi-API Key Failover Pool**: Built-in auto-rotation across multiple Gemini API keys and candidate models (`gemini-2.5-flash` $\rightarrow$ `gemini-2.0-flash` $\rightarrow$ `gemini-1.5-flash`).

---

## 🖼 UI Spatial Hierarchy & Component Map

The user interface matches modern dark navy analytics studios with 4 primary zones:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR: Brand | Workspace | Export | History | Save Status | Theme | Notifications | User│
├───────┬────────────────────────────────────────────────────────────────────────────────┤
│ N     │ DATA EXPLORER  │ WORKSPACE TABS: Preview | Summary | Missing | Types | EDA | ML│
│ A     ├────────────────┼───────────────────────────────────────────────────────────────┤
│ V     │ [Upload CSV]   │ DATASET OVERVIEW                                              │
│       │                │ [ 10,418 Rows ] [ 12 Columns ] [ 12.3% Missing ] [ Quality 87 ]│
│ R     │ Active Card    │                                                               │
│ A     │                │ DATA PREVIEW GRID                                             │
│ I     │ Search Columns │ [Show 10 rows ▼] [Filters] [Column Settings]                  │
│ L     │ # PassengerId  │ [ 1 | 0 | 3 | Braund, Mr. Owen Harris | male | 22.0 ... ]     │
│       │ # Survived     │ Showing 1 to 10 of 10,418 rows               < 1 2 3 ... 1042 >│
│       │ # Age (19.9%)  │                                                               │
│       │                │ EDA VISUALIZATION GRID (4)                                    │
│       │ [Data Dict]    │ [ Distribution ] [ Grouped Bar ] [ Relationship ] [ Scatter ] │
├───────┴────────────────┴───────────────────────────────────────────────────────────────┤
│ AI COPILOT: ⚙ get_missing_values() ✓ | Context Stream | [Ask anything...]       [Send]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Backend Engine & Agentic Tool Execution

When a user prompts the AI Copilot (e.g., *"What is the average fare paid by passenger class?"*), the backend executes an autonomous tool loop:

1. **Prompt Ingestion**: Query is attached to conversational memory and formatted with live dataset metadata.
2. **Gemini Function Calling**: The LLM analyzes available schemas and selects `generate_bar_chart(x_col="Pclass", y_col="Fare", agg="mean")`.
3. **Local Tool Dispatch**: [`backend/app/tools/dataset_tools.py`](file:///c:/Users/polai/OneDrive/Desktop/DataScience/backend/app/tools/dataset_tools.py) computes the grouped aggregation in Pandas without evaluating arbitrary code.
4. **Model Interpretation**: The structured result is passed back to Gemini to explain analytical takeaways.
5. **Multi-Modal Rendering**: The frontend renders the explanation alongside an interactive Recharts bar visualization.

### Available Tool Declarations

| Tool Name | Parameters | Purpose |
|---|---|---|
| `get_dataset_summary` | `dataset_id` | Returns total rows, columns, memory, and missing cells |
| `get_missing_values` | `dataset_id` | Column-by-column missing counts and percentages |
| `get_column_statistics` | `dataset_id`, `column` | Mean, std, median, IQR, min/max, or top categories |
| `calculate_correlation` | `dataset_id` | Pearson correlation matrix for all numeric columns |
| `get_value_counts` | `dataset_id`, `column`, `top_n` | Frequency distribution for categorical features |
| `fill_missing_values` | `dataset_id`, `column`, `strategy` | Imputes missing values (`mean`, `median`, `mode`, `drop`) |
| `remove_duplicates` | `dataset_id` | Eliminates exact duplicate records |
| `remove_outliers` | `dataset_id`, `column`, `method` | Filters outliers via `iqr` or `zscore` |
| `generate_bar_chart` | `dataset_id`, `x_col`, `y_col`, `agg` | Aggregated categorical comparison chart |
| `generate_line_chart` | `dataset_id`, `x_col`, `y_col` | Continuous trend or time-series line chart |
| `generate_histogram` | `dataset_id`, `column`, `bins` | Numeric distribution histogram with safe finite checks |
| `generate_scatter_chart` | `dataset_id`, `x_col`, `y_col` | Correlation scatter plot with sample downsampling |

---

## 📡 API Contract (v1 REST Endpoints)

All endpoints are hosted under `/api/v1/datasets`:

### 1. Ingestion & Profile
* `POST /api/v1/datasets/upload` — Upload `.csv`, `.xlsx`, or `.json`. Returns `dataset_id`, metadata, schema, quality score, and initial preview rows.
* `GET /api/v1/datasets/{dataset_id}` — Retrieve full dataset state and profile.
* `GET /api/v1/datasets/{dataset_id}/preview?rows=50` — Paginated data preview with safe null serialization.
* `GET /api/v1/datasets/{dataset_id}/schema` — Column names, data types, and null metrics.
* `GET /api/v1/datasets/{dataset_id}/profile` — Full statistical describe payload for numeric features.

### 2. Analytics & Agentic Copilot
* `POST /api/v1/datasets/{dataset_id}/chat` — Chat with the Gemini Analyst Agent with function calling and multi-modal responses.
* `POST /api/v1/datasets/{dataset_id}/eda` — Automatically generates a 4-chart exploratory visualization package.

### 3. Machine Learning & Export
* `POST /api/v1/datasets/{dataset_id}/train` — Trains baseline models and returns accuracy, F1, ROC-AUC, and feature importances.
* `POST /api/v1/datasets/{dataset_id}/generate-notebook` — Generates a downloadable PyTorch Google Colab training notebook.

---

## 📂 Directory Structure

```text
DataScience/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── __init__.py
│   │   │   └── analyst_agent.py      # Gemini tool calling & multi-key rotation agent
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       └── datasets.py       # v1 REST router endpoints
│   │   ├── data/
│   │   │   ├── __init__.py
│   │   │   └── session_store.py      # In-memory DataFrame store & Quality Engine
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   ├── client.py             # Multi-key Gemini client pool & auto-reloading
│   │   │   └── prompts.py            # Agent system instructions
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── dataset.py            # Pydantic request/response models
│   │   └── tools/
│   │       ├── __init__.py
│   │       └── dataset_tools.py      # 12 Deterministic Data Science functions
│   ├── .env                          # API keys and environment variables
│   ├── main.py                       # FastAPI application entry point & CORS
│   └── requirements.txt              # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/
│   │   │   │   ├── ChartCard.tsx     # Card wrapper with export/expand actions
│   │   │   │   ├── ChartGrid.tsx     # 4-card exploratory chart layout
│   │   │   │   └── ChartRenderer.tsx # Recharts Bar/Line/Scatter/Histogram engine
│   │   │   ├── copilot/
│   │   │   │   └── CopilotPanel.tsx  # Agentic chat console with tool execution badges
│   │   │   ├── data-grid/
│   │   │   │   └── DataPreview.tsx   # Paginated table, live filter bar & row selector
│   │   │   ├── eda/
│   │   │   │   └── EDAPage.tsx       # Deep exploratory analysis & missing value charts
│   │   │   ├── explorer/
│   │   │   │   ├── ColumnDetailsModal.tsx # Column inspector modal
│   │   │   │   ├── DataDictionaryModal.tsx# Attribute catalogue modal
│   │   │   │   └── ExplorerSidebar.tsx    # Drag-drop uploader & typed column list
│   │   │   ├── export/
│   │   │   │   └── ExportModal.tsx   # Export center for CSVs, Colab, & Reports
│   │   │   ├── history/
│   │   │   │   └── HistoryDrawer.tsx # Activity history event timeline
│   │   │   ├── models/
│   │   │   │   └── ModelPage.tsx     # ML baseline training & feature importance
│   │   │   ├── overview/
│   │   │   │   └── DatasetOverview.tsx # 4 Metric cards & radial quality gauge
│   │   │   └── shell/
│   │   │       ├── NavigationRail.tsx# Left icon navigation rail
│   │   │       ├── Topbar.tsx        # Global header & workspace controls
│   │   │       └── WorkspaceTabs.tsx # Sub-workspace navigation tabs
│   │   ├── services/
│   │   │   └── api.ts                # Axios HTTP client connecting to FastAPI
│   │   ├── types/
│   │   │   └── index.ts              # Centralized TypeScript interfaces
│   │   ├── App.tsx                   # Master orchestrator assembling all modules
│   │   ├── index.css                 # Design system tokens & Tailwind CSS
│   │   └── main.tsx                  # React DOM entry point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
└── README.md                         # Master documentation
```

---

## 💻 Installation & Getting Started

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** & **npm**

---

### 1. Backend Setup

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python -m uvicorn main:app --reload --port 8000
```
Backend API docs will be available at: **[`http://localhost:8000/docs`](http://localhost:8000/docs)**.

---

### 2. Frontend Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install Node dependencies
npm install

# Start the Vite development server
npm run dev
```
Frontend Studio will be live at: **[`http://localhost:5173`](http://localhost:5173)**.

---

## 🔑 Configuration & Multi-API Key Pool

DataPilot AI includes automatic failover across multiple Gemini API keys. Edit [`backend/.env`](file:///c:/Users/polai/OneDrive/Desktop/DataScience/backend/.env):

```env
# Primary Key
GEMINI_API_KEY="AIzaSyYourPrimaryGoogleAIStudioKey"

# Multi-Key Rotation Pool (comma-separated)
GEMINI_API_KEYS="AIzaSyKey1...,AIzaSyKey2...,AIzaSyKey3..."

# Or Numbered Keys
GEMINI_API_KEY_1="AIzaSyKey1..."
GEMINI_API_KEY_2="AIzaSyKey2..."
```

> [!TIP]
> Get your free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). Standard keys begin with `AIzaSy...`.

---

## 🎯 Feature Walkthrough

### 1. Ingestion & Quality Health
Upload any CSV, XLSX, or JSON file. The dashboard automatically calculates:
* Total rows, columns, and missing cells.
* A weighted **Data Quality Score** out of 100 with sub-scores for Completeness, Consistency, Validity, Uniqueness, and Timeliness.

### 2. Interactive Data Grid
* Page through records with dynamic pagination (`< 1 2 3 ... 1042 >`).
* Filter records in real-time across any column without reloading.
* Inspect individual feature statistics (mean, median, nulls) by clicking any column in the sidebar.

### 3. Agentic Copilot Chat
Ask natural language questions such as:
* *"Show average fare paid by each passenger class."*
* *"Plot age distribution."*
* *"Find correlations among numerical features."*
* *"Clean the dataset by removing duplicate rows."*

The Copilot transparently reveals the tool it selected, executes it safely via Python, renders the data table/chart, and explains the analytical findings.

### 4. Machine Learning & PyTorch Export
* Select any column as the target variable.
* Train baseline models (Random Forest, Gradient Boosting) to evaluate Accuracy, F1, and ROC-AUC.
* Generate a runnable GPU-accelerated PyTorch Google Colab notebook for downstream deep learning experimentation.

---

## 🗺 Roadmap

- [x] Phase 1: High-polish Studio UI Design System (React + Tailwind)
- [x] Phase 2: FastAPI v1 REST API & Deterministic Tool Registry (Zero `exec()`)
- [x] Phase 3: Gemini 2.5 Function Calling Agent with Multi-Key Rotation
- [x] Phase 4: Dynamic EDA Grid & Data Quality Scoring Engine
- [x] Phase 5: Baseline ML Evaluation & Feature Importance Studio
- [ ] Phase 6: Multi-table SQL joins & BigQuery Connector Integration
- [ ] Phase 7: Automated PDF/HTML Executive Report Generation

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.