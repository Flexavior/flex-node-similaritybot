# similaritybot
A multilingual NLP microservice that uses Xenova / sentence-transformers models for transformer-based semantic feature extraction, language detection, conversation logging, and basic API hardening. This repository is configured for local development with nodemon and for production process management with pm2.

---

## Table of contents

- Project overview
- Repository files included
- Prerequisites
- Development (nodemon)
- Production (pm2)
- Runtime behavior and API expectations
- Models and language support
- Conversation logging
- Security and operational notes
- Author and license

---

## Project overview

This project provides an Express-based microservice that computes semantic feature vectors using a multilingual transformer model instead of string-similarity heuristics. It detects the input language, returns or persists model-derived embeddings (or other model outputs), and records conversation entries to a daily JSONL log. The transformers pipeline task used is `feature-extraction`; the pipeline factory is asynchronous and returns an async callable that must be invoked to perform inference.

---

## Repository files included

The repository already contains these configuration files and manifests:
- nodemon.json (project nodemon configuration)
- package.json (project manifest and scripts)
- package-lock.json (installed dependency lock file)
- index.js or src/ (server entry/source; present in the repo)
- customer_support.json (optional data file, present if used)
- conversation_logs/ (directory for generated logs; created at runtime if absent)

The package.json in this repo declares the dependencies required to run the service and includes a start script that runs nodemon in development.

---

## Prerequisites

- Node.js (recommended LTS version; Node 18+)
- npm
- Internet access to download model artifacts (unless model files are cached locally)
- (Optional) sudo or administrative privileges to install pm2 globally for process management

---

## Development (nodemon)

- The repository is configured to run with nodemon for automatic restarts during development. The nodemon configuration file present in the repo controls which files and directories are watched.
- Start the service in development using the project start script defined in package.json. The start script runs nodemon against the project entry point so code changes will trigger automatic restarts according to nodemon.json.
- Files listed in nodemon.json (for example: customer_support.json or index.js) will also trigger restarts if they are included in the watch list.

---

## Production (pm2)

- For production deployment, use a process manager such as pm2 to run and persist the Node.js process across reboots.
- When configured with pm2, ensure the process is named, the process list is saved, and the startup script is generated for the target platform so the service restarts on system boot.

---

## Models and language support

- Primary model referenced: Xenova/paraphrase-multilingual-MiniLM-L12-v2.
- Language coverage includes, but is not limited to: Thai (th), Japanese (ja), Burmese (my), and many other languages supported by the multilingual model.
- Quantized model variants are available to reduce memory and CPU footprint; choose the appropriate variant for the deployment environment.

---

## Conversation logging

- Conversations are recorded to the conversation_logs/ directory as newline-delimited JSON (JSONL).
- Log files are rotated by day (one file per day, format YYYY-MM-DD.jsonl).
- Each log entry contains a timestamp, a session identifier, the detected language, the input text (or a redacted form depending on privacy policy), and minimal output metadata (for example: lengths or identifiers, not necessarily full model outputs).
- Be mindful of privacy and sensitive data when persisting full user inputs.

---

## Security and operational notes

- The service includes middleware to set secure HTTP headers, to enforce rate limits, to restrict CORS to trusted origins, and to cap request body sizes.
- Validate and sanitize all incoming data before passing it to model inference or persistence layers.
- Monitor memory and CPU usage of the chosen transformer model, and choose a quantized model if operating under resource constraints.
- Keep dependencies up to date and use the existing package-lock.json to reproduce the tested dependency graph.

---

### 1. Install dependencies
Run the following to install required modules:
```
npm install express-rate-limit helmet
```

### 2. Install and configure pm2 for managing the app
Install pm2 globally:
```
sudo npm install -g pm2
```
Start the app with pm2:
```
pm2 start index.js --name flex-faq-bot
```
Save the pm2 process list:
```
pm2 save
```
Enable pm2 to auto start at OS boot:
```
pm2 startup
```
Check pm2 status and list processes:
```
pm2 status
pm2 list
```

## License

This project is licensed under the MIT License.

"# Flexavior-similaritybot"

Support Flexavior

Open Collective is an online funding platform for open and transparent communities. It provides tools to raise money and share your finances in full transparency.

It is the platform of choice for individuals and companies that want to make one-time or monthly donations directly to the project.
