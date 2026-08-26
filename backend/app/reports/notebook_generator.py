import json
from typing import List, Dict, Any, Optional
from app.data.session_store import get_dataset

try:
    import nbformat as nbf
    HAS_NBFORMAT = True
except ImportError:
    HAS_NBFORMAT = False


def generate_jupyter_notebook(session_id: str = "default_session") -> str:
    """Generates a reproducible Jupyter Notebook for the current session."""
    df = get_dataset(session_id)
    cols_summary = list(df.columns) if df is not None else []
    total_rows = len(df) if df is not None else 0

    if HAS_NBFORMAT:
        nb = nbf.v4.new_notebook()
        
        # 1. Title and Imports
        text_intro = (
            "# DataPilot Automated Analysis\n"
            f"This notebook was auto-generated to reproduce your DataPilot workspace session.\n"
            f"- **Active Session:** `{session_id}`\n"
            f"- **Dataset Shape:** `{total_rows} rows × {len(cols_summary)} columns`"
        )
        code_imports = (
            "import pandas as pd\n"
            "import numpy as np\n"
            "import matplotlib.pyplot as plt\n"
            "import seaborn as sns\n"
            "\nsns.set_theme(style='darkgrid')"
        )
        
        # 2. Data Loading
        code_load = (
            "# Load current dataset\n"
            "df = pd.read_csv('your_dataset.csv')\n"
            "display(df.head())\n"
            "print(f'Loaded shape: {df.shape}')"
        )
        
        # 3. EDA Template
        text_eda = (
            "## Exploratory Data Analysis\n"
            "Inspect column data types, missing values, and numeric correlations."
        )
        code_eda = (
            "print(df.info())\n"
            "print(df.describe())\n\n"
            "# Missing value summary\n"
            "missing = df.isnull().sum()\n"
            "print('Missing values per column:\\n', missing[missing > 0])\n\n"
            "# Numeric Correlation Heatmap\n"
            "numeric_df = df.select_dtypes(include=[np.number])\n"
            "if not numeric_df.empty and numeric_df.shape[1] >= 2:\n"
            "    plt.figure(figsize=(10, 6))\n"
            "    sns.heatmap(numeric_df.corr(), annot=True, cmap='coolwarm', fmt='.2f')\n"
            "    plt.title('Pearson Correlation Heatmap')\n"
            "    plt.show()"
        )

        # 4. ML Modeling Template
        text_ml = (
            "## Baseline Machine Learning Model\n"
            "Train an initial Scikit-Learn RandomForest baseline."
        )
        code_ml = (
            "from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor\n"
            "from sklearn.model_selection import train_test_split\n\n"
            "# Select target column\n"
            "# target_col = 'Survived'\n"
            "# X = df.drop(columns=[target_col]).select_dtypes(include=[np.number]).dropna()\n"
            "# y = df.loc[X.index, target_col]\n"
            "# X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\n"
            "# model = RandomForestClassifier(random_state=42)\n"
            "# model.fit(X_train, y_train)\n"
            "# print('Score:', model.score(X_test, y_test))"
        )

        nb['cells'] = [
            nbf.v4.new_markdown_cell(text_intro),
            nbf.v4.new_code_cell(code_imports),
            nbf.v4.new_code_cell(code_load),
            nbf.v4.new_markdown_cell(text_eda),
            nbf.v4.new_code_cell(code_eda),
            nbf.v4.new_markdown_cell(text_ml),
            nbf.v4.new_code_cell(code_ml),
        ]
        
        return nbf.writes(nb)
    else:
        # Fallback JSON v4 representation if nbformat package is missing
        nb_dict = {
            "cells": [
                {
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [
                        "# DataPilot Automated Analysis\n",
                        f"Auto-generated notebook for session `{session_id}` ({total_rows} rows)."
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
                        "import seaborn as sns\n\n",
                        "df = pd.read_csv('your_dataset.csv')\n",
                        "df.head()"
                    ]
                },
                {
                    "cell_type": "code",
                    "execution_count": None,
                    "metadata": {},
                    "outputs": [],
                    "source": [
                        "print(df.info())\n",
                        "print(df.describe())\n",
                        "sns.heatmap(df.corr(numeric_only=True), annot=True, cmap='coolwarm')\n",
                        "plt.show()"
                    ]
                }
            ],
            "metadata": {
                "language_info": {"name": "python", "version": "3.10"},
                "orig_nbformat": 4
            },
            "nbformat": 4,
            "nbformat_minor": 2
        }
        return json.dumps(nb_dict, indent=2)


def generate_notebook_dict(session_memory: List[Any], schema_info: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Compatibility shim for older callers."""
    content_str = generate_jupyter_notebook()
    return json.loads(content_str)
