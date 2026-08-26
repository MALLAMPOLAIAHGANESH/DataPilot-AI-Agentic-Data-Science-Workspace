"""
llm/orchestrator.py — Session-aware Gemini orchestrator with Tool Calling
========================================================================
Implements the 2026 google-genai SDK standard for Function Calling:
- types.FunctionDeclaration wrapped in types.Tool
- types.GenerateContentConfig(tools=[...])
- Multi-turn tool execution loop with types.Part.from_function_response
"""
from __future__ import annotations

import json
import logging
from google import genai
from google.genai import types

from app.llm.client import get_client, get_all_api_keys
from app.tools import dataset_tools as dt
from app.data.session_store import get_current_session

logger = logging.getLogger("orchestrator")

# ── 1. Function Declarations (2026 google-genai SDK standard) ─────

describe_dataset_fn = types.FunctionDeclaration(
    name="describe_dataset",
    description="Get the schema, column names, missing values, and row count of the active dataset.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={},
    ),
)

run_sql_query_fn = types.FunctionDeclaration(
    name="run_sql_query",
    description="Execute a SQL query against the active dataset table(s) to aggregate, filter, or join data.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "query": types.Schema(
                type=types.Type.STRING,
                description="The exact SQL query string (e.g., 'SELECT Sex, AVG(Fare) FROM df1 GROUP BY Sex').",
            ),
        },
        required=["query"],
    ),
)

filter_rows_fn = types.FunctionDeclaration(
    name="filter_rows",
    description="Filter rows using a pandas query expression (e.g. 'Age > 30 and Survived == 1').",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "query_expression": types.Schema(
                type=types.Type.STRING,
                description="Boolean filter condition.",
            ),
        },
        required=["query_expression"],
    ),
)

generate_chart_fn = types.FunctionDeclaration(
    name="generate_chart",
    description="Generate an interactive chart (bar, line, histogram, or scatter) for visualization.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "chart_type": types.Schema(
                type=types.Type.STRING,
                description="One of: 'bar', 'line', 'histogram', 'scatter'.",
            ),
            "x_col": types.Schema(type=types.Type.STRING, description="X axis column."),
            "y_col": types.Schema(type=types.Type.STRING, description="Y axis column (for bar/line/scatter)."),
            "agg": types.Schema(type=types.Type.STRING, description="Aggregation for bar chart: mean, sum, count, max, min."),
        },
        required=["chart_type", "x_col"],
    ),
)

copilot_tools = types.Tool(
    function_declarations=[
        describe_dataset_fn,
        run_sql_query_fn,
        filter_rows_fn,
        generate_chart_fn,
    ]
)

# Legacy reference
SESSION_MEMORY: list = []


def _execute_local_tool(name: str, args: dict, session_id: str | None = None) -> tuple[dict | str, dict | None]:
    """Executes local tool logic and returns (result_payload, optional_chart_data)."""
    chart_data = None
    try:
        if name == "describe_dataset":
            res = dt.get_dataset_summary(session_id)
        elif name == "run_sql_query":
            from app.sql.engine import execute_sql
            res = execute_sql(args.get("query", ""))
        elif name == "filter_rows":
            res = dt.filter_rows(args.get("query_expression", ""))
        elif name == "generate_chart":
            ctype = args.get("chart_type", "bar").lower()
            xcol = args.get("x_col", "")
            ycol = args.get("y_col", "")
            agg = args.get("agg", "mean")
            if ctype == "bar":
                chart_data = dt.generate_bar_chart(session_id or "", xcol, ycol, agg)
            elif ctype == "line":
                chart_data = dt.generate_line_chart(session_id or "", xcol, ycol)
            elif ctype == "histogram":
                chart_data = dt.generate_histogram(session_id or "", xcol)
            elif ctype == "scatter":
                chart_data = dt.generate_scatter_chart(session_id or "", xcol, ycol)
            res = chart_data or {"message": "Chart generated successfully"}
        else:
            res = {"error": f"Unknown tool: {name}"}
        return res, chart_data
    except Exception as e:
        return {"error": f"Tool execution failed: {str(e)}"}, None


def chat_with_data(
    user_message: str,
    schema_context: str,
    session_memory: list | None = None,
    session_id: str | None = None,
) -> dict:
    """
    Orchestrates conversation with Gemini with multi-turn tool calling.
    """
    session = get_current_session()
    memory = session["memory"]
    tool_calls_made: list[str] = []
    captured_chart = None

    system_instruction = f"""
You are DataPilot AI Copilot — an expert data science assistant.

Dataset Schema Context:
{schema_context}

Guidelines:
- If the user asks for dataset details or structure, call `describe_dataset`.
- If the user asks for SQL queries, counts, aggregations, or filters, call `run_sql_query` or `filter_rows`.
- If the user asks to plot, visualize, or chart data, call `generate_chart`.
- When tools finish, summarize the findings clearly and accurately.
"""

    memory.append(types.Content(role="user", parts=[types.Part.from_text(text=user_message)]))

    client, _ = get_client()
    candidate_models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    for model_name in candidate_models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=memory,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.2,
                    tools=[copilot_tools],
                ),
            )

            # Loop over function calls (up to 3 turns)
            loop_turns = 0
            while loop_turns < 3 and response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
                parts = response.candidates[0].content.parts
                function_calls = [p.function_call for p in parts if getattr(p, "function_call", None)]
                if not function_calls:
                    break

                tool_results = []
                for fc in function_calls:
                    fn_name = fc.name
                    fn_args = dict(fc.args) if fc.args else {}
                    tool_calls_made.append(fn_name)

                    result, chart_out = _execute_local_tool(fn_name, fn_args, session_id)
                    if chart_out and "error" not in chart_out:
                        captured_chart = chart_out

                    tool_results.append(
                        types.Part.from_function_response(
                            name=fn_name,
                            response={"result": json.dumps(result, default=str)},
                        )
                    )

                memory.append(response.candidates[0].content)
                memory.append(types.Content(role="tool", parts=tool_results))

                response = client.models.generate_content(
                    model=model_name,
                    contents=memory,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.2,
                        tools=[copilot_tools],
                    ),
                )
                loop_turns += 1

            if response.candidates and response.candidates[0].content:
                memory.append(response.candidates[0].content)

            final_text = response.text or "I have processed your request."
            return {
                "response": final_text,
                "chart_data": captured_chart,
                "tool_calls": tool_calls_made,
            }
        except Exception as e:
            logger.warning(f"Orchestrator error with {model_name}: {e}")
            continue

    return {
        "response": "Could not complete the request. Please verify your Gemini API key in backend/.env.",
        "chart_data": None,
        "tool_calls": [],
    }

# ── Step 2: Gemini Tool Declarations & Analyst Copilot Loop ───────

describe_dataset_tool = types.FunctionDeclaration(
    name="describe_dataset",
    description="Retrieve schema, column data types, missing value counts, and samples from the active dataset.",
    parameters=types.Schema(type=types.Type.OBJECT, properties={}),
)

run_sql_query_tool = types.FunctionDeclaration(
    name="run_sql_query",
    description="Execute a SQL query against the table named 'df' to filter, aggregate, or calculate statistics.",
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "query": types.Schema(
                type=types.Type.STRING,
                description="Valid SQL query referencing table 'df' (e.g., SELECT genre, AVG(rating) FROM df GROUP BY genre)",
            )
        },
        required=["query"],
    ),
)

analyst_tools = types.Tool(function_declarations=[describe_dataset_tool, run_sql_query_tool])


def run_analyst_copilot(user_message: str, session_id: str = "default_session") -> dict:
    """Handles user query, runs tool calls via Gemini, and returns the final explanation."""
    from app.tools.dataset_tools import execute_describe, execute_sql

    system_instruction = (
        "You are an expert Data Science AI Copilot. Use the available tools to inspect "
        "the dataset and run SQL queries against the table named 'df' whenever the user asks for data facts. "
        "Always base your answers strictly on the tool execution output."
    )

    try:
        client, _ = get_client()
    except Exception:
        client = genai.Client()

    # Initial request to Gemini
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_message,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[analyst_tools],
            temperature=0.2,
        ),
    )

    steps_taken = []

    # Check if Gemini wants to call a tool
    if response.function_calls:
        for call in response.function_calls:
            tool_name = call.name
            args = dict(call.args) if call.args else {}
            steps_taken.append({"tool": tool_name, "args": args})

            # Execute tool locally
            if tool_name == "describe_dataset":
                tool_output = execute_describe(session_id)
            elif tool_name == "run_sql_query":
                tool_output = execute_sql(args.get("query", ""), session_id)
            else:
                tool_output = {"error": "Unknown tool"}

            # Send tool output back to Gemini for the final answer
            final_response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(role="user", parts=[types.Part.from_text(text=user_message)]),
                    types.Content(role="model", parts=[types.Part.from_function_call(name=tool_name, args=args)]),
                    types.Content(
                        role="tool",
                        parts=[types.Part.from_function_response(name=tool_name, response={"result": json.dumps(tool_output, default=str)})],
                    ),
                ],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    tools=[analyst_tools],
                ),
            )

            return {
                "answer": final_response.text,
                "tool_used": tool_name,
                "tool_output": tool_output,
                "steps": steps_taken,
            }

    return {
        "answer": response.text,
        "tool_used": None,
        "tool_output": None,
        "steps": [],
    }


def reset_memory() -> None:
    """Clear current user's conversation history."""
    get_current_session()["memory"] = []