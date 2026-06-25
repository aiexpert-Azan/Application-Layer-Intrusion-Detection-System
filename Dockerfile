# ---------------------------------------------------------------------------
# SecureIDS serving image  (Application-Layer IDS gateway)
# Builds ONLY the src/ FastAPI gateway. Training, MLflow, torch and
# transformers are intentionally excluded to keep the image lean.
# ---------------------------------------------------------------------------
FROM python:3.11-slim

# Tesseract OCR — system binary required by src/middleware/file_inspector.py
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Only the SERVING dependencies (lean).
# NOT training/requirements.txt, which carries torch/transformers/mlflow.
COPY src/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code...
COPY src/ ./src/
# ...plus the single training module the gateway imports at runtime.
# (training/inference.py is the Groq-based classifier — no heavy deps.)
COPY training/inference.py ./training/inference.py

# Lets both "src" and "training" resolve as top-level packages.
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
