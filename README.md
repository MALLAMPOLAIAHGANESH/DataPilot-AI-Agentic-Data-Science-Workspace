# 🧠 DataPilot-AI: Agentic Data Science Workspace

An enterprise-grade, decoupled web application that provides an AI-driven interface for Exploratory Data Analysis (EDA), automated data cleaning, and PyTorch architecture generation.

## 🏗 Architecture
This project is built using a modern decoupled client-server architecture:
* **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
* **Backend:** FastAPI, Python, Pandas, In-Memory State Management
* **AI Engine:** Google GenAI (Gemini 3.6 Flash & Pro) with Multi-Agent Routing

## ✨ Features
* **Contract-First API:** Strict Pydantic schemas enforce robust data validation between the React client and Python backend.
* **Multi-Agent AI Routing:** Uses lightweight models (Flash) for high-speed conversational EDA and heavy reasoning models (Pro) for Deep Learning code generation.
* **Sandboxed Execution Engine:** Safely parses and executes AI-generated Pandas code in a restricted local environment.
* **Stateful AI Memory:** Maintains rolling conversation context for multi-turn data manipulation requests.
* **Dynamic Charting Engine:** Aggregates data in Python and passes structured JSON to React for interactive Recharts rendering.

## 🚀 How to Run Locally

### 1. Backend Setup