# PrintChakra

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/chaman2003/printchakra)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-powered print and scan automation with modular architecture, hands-free voice control, and a production-ready OCR pipeline.

---

## Highlights

- Continuous voice listening with 10-15x faster Whisper transcription
- AI intent detection configures print and scan flows from natural language
- 12-stage OCR pipeline with image enhancement and quality scoring
- Modular Flask backend, React + TypeScript frontend, Socket.IO real-time sync
- One-command PowerShell scripts for setup, startup, and deployment

---

## Quick Start

### Prerequisites

# PrintChakra

PrintChakra is an integrated, developer-friendly system for automating print and scan workflows with strong AI and OCR capabilities. It combines a modular Flask backend with a React + TypeScript frontend, real-time synchronization, and voice orchestration so users can operate printing and scanning flows with natural language and minimal manual input.

Overview of what’s included and recent improvements:

- Modern frontend using React + TypeScript and Chakra UI for accessible components and responsive layouts.
- Robust Flask backend with a service-oriented design: clear separation between routes, services, and utility modules.
- Real-time coordination via Socket.IO to keep the dashboard, mobile capture, and orchestration flows in sync.
- Improved Dashboard stability: a single shared Socket.IO connection in development to prevent duplicate listeners and repeated GET calls; rate-limited file polling and named listener cleanup to avoid excessive rerenders.
- Fixed backend conversion reliability: conversion endpoints now call the correct converter utilities, improved logging on conversion payloads, and added test scripts to validate single-file and merged conversions.
- Large model support added via Git LFS for bundled GGML model files; repository now tracks large binary model files safely.

This README focuses on the project purpose, structure, recent fixes, and usage guidance without embedding code snippets.

**Why PrintChakra**

- Hands-free voice orchestration: speak commands to configure print/scan jobs (copies, layout, DPI, duplex, color). 
- High-quality OCR: a multi-stage image enhancement and OCR pipeline produces searchable PDFs and reliable metadata extraction.
- Extensible modular services: easy to add integrations (cloud storage, classifiers, form recognition).

**Recent Notable Changes (summary)**

- Frontend
  - `SocketContext` now uses a global singleton in development to eliminate duplicate socket connections and repeated listeners.
  - `Dashboard` was refactored to use stable callbacks, rate-limiting for file fetches, and named socket listeners to ensure clean unmounts and avoid multiple GET requests.
  - New layout components were added to improve visual consistency.

- Backend
  - Conversion endpoints were corrected to use the dedicated file conversion utilities (avoiding incorrect class calls), fixing an AttributeError that occurred during convert/merge operations.
  - Added small test scripts in `backend/scripts/` to validate conversion and merging flows during development.
  - Added Git LFS tracking for large model binaries used by local AI workflows.

**Project Structure (high level)**

- `backend/` — Flask app, modular services, routes, and conversion utilities; data folders for uploads, processed outputs, converted files, and generated PDFs.
- `frontend/` — React + TypeScript app with pages (Dashboard, Phone/mobile capture), features for voice AI chat, and shared UI components.
- `scripts/` — PowerShell helpers for environment setup and combined startup; developer-focused tools to accelerate local testing.

## Backend Configuration Surface

Two simple touch points now control all backend AI connections and prompts:

- **Environment overrides (`backend/.env`)** – drop a `.env` file next to `backend/app.py` and set any of these keys without touching Python:
  - `FRONTEND_URL` (CORS allow-list helper)
  - `BACKEND_PUBLIC_URL` (shareable base URL for clients/tunnels)
  - `API_CORS_ORIGINS` (comma-delimited override if you need multiple origins)
  - `OLLAMA_BASE_URL`, `OLLAMA_CHAT_ENDPOINT`, `OLLAMA_TAGS_ENDPOINT`, `OLLAMA_TIMEOUT`, `OLLAMA_VERIFY_SSL`
  - `VOICE_AI_MODEL` (defaults to `smollm2:135m`)
  - `PROMPTS_DIR`, `VOICE_SYSTEM_PROMPT_FILE`, `VOICE_COMMAND_MAPPINGS_FILE` (point to alternate prompt assets)
- **Prompt assets (`backend/config/prompts/`)** – edit plain-text/JSON files to change LLM behavior:
  - `system_prompt.txt` holds the entire Voice AI system prompt (English sentences only)
  - `command_mappings.json` lists wake words, friendly responses, confirmation words, and Ollama sampling knobs

Whenever these files change there is no code reload required—restart the backend and the new connections/prompts are used automatically.

**Running and Developing (guidance)**

Run backend and frontend locally for development, use the provided PowerShell scripts to create the recommended development environment and to start all components together. The project includes scripts that orchestrate backend services, frontend dev server, and optional tunneling for external testing.

**Testing and Validation**

- Conversion and merge flows include small test scripts to exercise backend conversion endpoints and confirm outputs. These tests were used while resolving conversion-related issues and are helpful for regression checks.

**Contributing**

Contributions are welcome. Please open feature branches, include testing notes, and provide context for changes. Maintainers prefer small, focused pull requests for easier review.

**License & Author**

This repository is published under the MIT License. The project is maintained by Chaman S (GitHub: @chaman2003).

If you need a README variant with quick start commands or developer-run commands included, I can add that as a separate file so this main README remains code-free.
  -> Socket.IO / REST
