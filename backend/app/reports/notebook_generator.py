import json
from typing import List, Dict, Any

def generate_notebook_dict(session_memory: List[Any], schema_info: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Constructs a valid Jupyter Notebook (v4 format) dictionary from the session history.
    """
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🧠 DataPilot-AI: Automated Analysis Session\n",
                "This notebook was generated automatically by **DataPilot-AI Copilot**.\n",
                "\n",
                "Contains the loaded schema, executed cleaning steps, and generated code."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import pandas as pd\n",
                "import numpy as np\n",
                "import matplotlib.pyplot as plt\n",
                "\n",
                "# TODO: Provide the path to your dataset\n",
                "# df = pd.read_csv('your_dataset.csv')\n",
                "print('Environment initialized.')"
            ]
        }
    ]

    # Add Schema Markdown Cell if available
    if schema_info:
        schema_md = ["### 📊 Dataset Schema Overview\n", "| Column | Data Type |\n", "| :--- | :--- |\n"]
        for col in schema_info:
            cname = col.get('column') or col.get('name') or ''
            ctype = col.get('type') or col.get('dtype') or ''
            schema_md.append(f"| `{cname}` | `{ctype}` |\n")
        
        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": schema_md
        })

    # Convert session interactions into code & markdown cells
    for message in session_memory:
        role = getattr(message, "role", None) or ("user" if "user" in str(message) else "assistant")
        
        # Extract text parts
        text_content = ""
        if hasattr(message, "parts"):
            for part in message.parts:
                if hasattr(part, "text") and part.text:
                    text_content += part.text + "\n"
        elif isinstance(message, dict):
            text_content = message.get("text", "")

        if not text_content.strip():
            continue

        if role == "user":
            cells.append({
                "cell_type": "markdown",
                "metadata": {},
                "source": [f"#### 👤 Prompt:\n> {text_content.strip()}"]
            })
        else:
            # Check if Gemini output contained python code
            if "```python" in text_content:
                parts = text_content.split("```python")
                intro_text = parts[0].strip()
                if intro_text:
                    cells.append({
                        "cell_type": "markdown",
                        "metadata": {},
                        "source": [intro_text]
                    })
                
                code_block = parts[1].split("```")[0].strip()
                cells.append({
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [code_block]
                })
            else:
                cells.append({
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [text_content.strip()]
                })

    notebook = {
        "cells": cells,
        "metadata": {
            "language_info": {
                "name": "python",
                "version": "3.10"
            },
            "orig_nbformat": 4
        },
        "nbformat": 4,
        "nbformat_minor": 2
    }
    return notebook
