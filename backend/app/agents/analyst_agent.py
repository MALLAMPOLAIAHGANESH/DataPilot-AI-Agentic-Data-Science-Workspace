"""
agents/analyst_agent.py

The Analyst Agent uses Gemini function-calling (tool-use) to answer
questions about the dataset without executing any untrusted code.
Supports multiple API keys with automated fallback.
"""
from __future__ import annotations

import json
import logging
import traceback
from google.genai import types

from ..llm.client  import get_all_api_keys, get_client, rotate_key
from ..llm.prompts import ANALYST_SYSTEM
from ..data        import session_store as store
from ..tools       import dataset_tools as dt

logger = logging.getLogger("analyst_agent")

# ── Tool definitions (sent to Gemini) ────────────────────────────

TOOL_DECLARATIONS = types.Tool(function_declarations=[
    types.FunctionDeclaration(
        name="get_dataset_summary",
        description="Return high-level metadata: rows, columns, missing values.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
    ),
    types.FunctionDeclaration(
        name="get_missing_values",
        description="Return missing value counts and percentages for every column.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
    ),
    types.FunctionDeclaration(
        name="get_column_statistics",
        description="Return descriptive statistics for a single column (mean, median, std, unique, etc).",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={"column": types.Schema(type=types.Type.STRING, description="Column name")},
            required=["column"],
        ),
    ),
    types.FunctionDeclaration(
        name="calculate_correlation",
        description="Return the Pearson correlation matrix for all numeric columns.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
    ),
    types.FunctionDeclaration(
        name="get_value_counts",
        description="Return the top-N most frequent values for a categorical column.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "column": types.Schema(type=types.Type.STRING, description="Column name"),
                "top_n":  types.Schema(type=types.Type.INTEGER, description="Number of top values to return (default 10)"),
            },
            required=["column"],
        ),
    ),
    types.FunctionDeclaration(
        name="fill_missing_values",
        description="Fill null values in a column using mean, median, mode, or drop.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "column":   types.Schema(type=types.Type.STRING, description="Column name"),
                "strategy": types.Schema(type=types.Type.STRING, description="One of: mean, median, mode, drop"),
            },
            required=["column", "strategy"],
        ),
    ),
    types.FunctionDeclaration(
        name="remove_duplicates",
        description="Remove exact duplicate rows from the dataset.",
        parameters=types.Schema(type=types.Type.OBJECT, properties={}, required=[]),
    ),
    types.FunctionDeclaration(
        name="remove_outliers",
        description="Remove rows where a numeric column has outlier values.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "column": types.Schema(type=types.Type.STRING, description="Numeric column name"),
                "method": types.Schema(type=types.Type.STRING, description="One of: iqr, zscore"),
            },
            required=["column", "method"],
        ),
    ),
    types.FunctionDeclaration(
        name="generate_bar_chart",
        description="Generate a bar chart by grouping x_col and aggregating y_col.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "x_col": types.Schema(type=types.Type.STRING, description="Categorical column for X axis"),
                "y_col": types.Schema(type=types.Type.STRING, description="Numeric column for Y axis"),
                "agg":   types.Schema(type=types.Type.STRING, description="Aggregation: mean, sum, count, max, min"),
            },
            required=["x_col", "y_col"],
        ),
    ),
    types.FunctionDeclaration(
        name="generate_line_chart",
        description="Generate a line chart from two columns sorted by x.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "x_col": types.Schema(type=types.Type.STRING, description="X axis column"),
                "y_col": types.Schema(type=types.Type.STRING, description="Y axis column"),
            },
            required=["x_col", "y_col"],
        ),
    ),
    types.FunctionDeclaration(
        name="generate_histogram",
        description="Generate a histogram showing the distribution of a numeric column.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "column": types.Schema(type=types.Type.STRING, description="Numeric column name"),
                "bins":   types.Schema(type=types.Type.INTEGER, description="Number of bins (default 20)"),
            },
            required=["column"],
        ),
    ),
    types.FunctionDeclaration(
        name="generate_scatter_chart",
        description="Generate a scatter chart comparing two numeric columns.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "x_col": types.Schema(type=types.Type.STRING, description="X axis column"),
                "y_col": types.Schema(type=types.Type.STRING, description="Y axis column"),
            },
            required=["x_col", "y_col"],
        ),
    ),
    types.FunctionDeclaration(
        name="execute_sql_query",
        description="Execute a SQL query across the active dataset table(s) to aggregate, filter, or join data.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(type=types.Type.STRING, description="SQL query string (e.g. SELECT pclass, AVG(fare) FROM df1 GROUP BY pclass)"),
            },
            required=["query"],
        ),
    ),
])

# ── Tool dispatcher ───────────────────────────────────────────────

def _dispatch(name: str, args: dict, dataset_id: str) -> dict:
    """Route a Gemini tool call to the correct Python function."""
    fn_map = {
        "get_dataset_summary":   lambda a: dt.get_dataset_summary(dataset_id),
        "get_missing_values":    lambda a: dt.get_missing_values(dataset_id),
        "get_column_statistics": lambda a: dt.get_column_statistics(dataset_id, a.get("column", "")),
        "calculate_correlation": lambda a: dt.calculate_correlation(dataset_id),
        "get_value_counts":      lambda a: dt.get_value_counts(dataset_id, a.get("column", ""), a.get("top_n", 10)),
        "fill_missing_values":   lambda a: dt.fill_missing_values(dataset_id, a.get("column", ""), a.get("strategy", "mean")),
        "remove_duplicates":     lambda a: dt.remove_duplicates(dataset_id),
        "remove_outliers":       lambda a: dt.remove_outliers(dataset_id, a.get("column", ""), a.get("method", "iqr")),
        "generate_bar_chart":    lambda a: dt.generate_bar_chart(dataset_id, a.get("x_col", ""), a.get("y_col", ""), a.get("agg", "mean")),
        "generate_line_chart":   lambda a: dt.generate_line_chart(dataset_id, a.get("x_col", ""), a.get("y_col", "")),
        "generate_histogram":    lambda a: dt.generate_histogram(dataset_id, a.get("column", ""), a.get("bins", 20)),
        "generate_scatter_chart":lambda a: dt.generate_scatter_chart(dataset_id, a.get("x_col", ""), a.get("y_col", "")),
        "execute_sql_query":     lambda a: __import__("app.sql.engine", fromlist=["execute_sql"]).execute_sql(a.get("query", "")),
    }
    fn = fn_map.get(name)
    if fn is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(args)
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}


# ── Session memory store ──────────────────────────────────────────

_MEMORY: dict[str, list] = {}   # dataset_id → conversation history


def _get_memory(dataset_id: str) -> list:
    if dataset_id not in _MEMORY:
        _MEMORY[dataset_id] = []
    return _MEMORY[dataset_id]


def reset_memory(dataset_id: str) -> None:
    _MEMORY[dataset_id] = []


# ── Main entry point ──────────────────────────────────────────────

CANDIDATE_MODELS = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]


def chat(dataset_id: str, user_query: str) -> dict:
    """
    Send user_query to Gemini with tool-calling enabled.
    Attempts across available API keys and model candidates.
    """
    meta = store.get_meta(dataset_id)
    history = _get_memory(dataset_id)
    tool_calls_made: list[str] = []
    chart_data = None

    # Build metadata context safely
    schema_items = meta.get("schema", [])
    schema_lines = []
    for c in schema_items:
        cname = c.get("name") or c.get("column") or "unknown"
        ctype = c.get("dtype") or c.get("type") or "unknown"
        cmiss = c.get("missing_percentage") if "missing_percentage" in c else c.get("missing_pct", 0)
        schema_lines.append(f"  - {cname} ({ctype}, {cmiss}% missing)")

    system_prompt = ANALYST_SYSTEM.format(
        metadata=(
            f"File: {meta.get('file_name', 'dataset')} | "
            f"Rows: {meta.get('rows', 0):,} | Cols: {meta.get('columns', 0)}\n"
            f"Columns:\n" + "\n".join(schema_lines)
        )
    )

    all_keys = get_all_api_keys()
    if not all_keys:
        raise RuntimeError("No Gemini API keys found. Please set GEMINI_API_KEY in .env")

    last_exception = None

    # Try each available API key in the pool
    for key in all_keys:
        client, used_key = get_client(key_override=key)

        for model_name in CANDIDATE_MODELS:
            try:
                # Working copy of history for this attempt
                turn_history = list(history)
                turn_history.append(
                    types.Content(role="user", parts=[types.Part.from_text(text=user_query)])
                )

                # ── Turn 1: Tool selection ─────────────────────────
                response = client.models.generate_content(
                    model=model_name,
                    contents=turn_history,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        tools=[TOOL_DECLARATIONS],
                        temperature=0.2,
                    ),
                )

                # ── Tool execution loop (up to 3 turns) ────────────
                loop_count = 0
                while loop_count < 3 and response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                    parts = response.candidates[0].content.parts
                    function_calls = [p.function_call for p in parts if getattr(p, "function_call", None)]
                    if not function_calls:
                        break

                    tool_results = []
                    for fc in function_calls:
                        fn_name = fc.name
                        fn_args = dict(fc.args) if fc.args else {}
                        tool_calls_made.append(fn_name)

                        result = _dispatch(fn_name, fn_args, dataset_id)

                        if fn_name.startswith("generate_") and "error" not in result:
                            chart_data = result

                        tool_results.append(
                            types.Part.from_function_response(
                                name=fn_name,
                                response={"result": json.dumps(result, default=str)},
                            )
                        )

                    turn_history.append(response.candidates[0].content)
                    turn_history.append(types.Content(role="tool", parts=tool_results))

                    response = client.models.generate_content(
                        model=model_name,
                        contents=turn_history,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            tools=[TOOL_DECLARATIONS],
                            temperature=0.2,
                        ),
                    )
                    loop_count += 1

                if response.candidates and response.candidates[0].content:
                    turn_history.append(response.candidates[0].content)

                final_text = response.text or "I've analyzed the dataset."

                # Update the persistent memory on success
                _MEMORY[dataset_id] = turn_history

                return {
                    "response":   final_text,
                    "chart_data": chart_data,
                    "tool_calls": tool_calls_made,
                }

            except Exception as e:
                err_str = str(e)
                logger.warning(f"Failed with key ...{used_key[-6:]} on {model_name}: {err_str[:120]}")
                last_exception = e
                # If it's a model not found error, try next candidate model
                if "404" in err_str or "not found" in err_str.lower():
                    continue
                # If it's an auth/quota issue, rotate to next key
                break

    # If all keys & models failed, raise the last exception with context
    raise RuntimeError(f"All Gemini API attempts failed: {last_exception}")
