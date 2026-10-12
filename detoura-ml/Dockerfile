# ==============================================================================
# DETOURA ML Microservice - Production Container Image for Google Cloud Run
# ==============================================================================
FROM python:3.12-slim

# Set environment variables for Python in containers
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    APP_HOME=/app \
    DETOURA_DB_PATH=/app/detoura_master-v2.db \
    GEMMA_MODEL_PATH=/app/models/gemma-2-2b-it-Q4_K_M.gguf \
    GEMMA_THREADS=4 \
    FIREBASE_PROJECT_ID=detoura-f8a96

# Set working directory
WORKDIR $APP_HOME

# Install OS-level system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies using CPU wheel index for llama-cpp-python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code, datasets, database, and models
COPY . $APP_HOME/

# Ensure SQLite database exists at expected path
RUN if [ ! -f /app/detoura_master-v2.db ] && [ -f /app/detoura_master-v2 ]; then \
        cp /app/detoura_master-v2 /app/detoura_master-v2.db; \
    fi

# Document port exposure (Cloud Run injects PORT environment variable)
EXPOSE 8000

# Healthcheck probe for container runtime
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Launch FastAPI app with Uvicorn, binding to 0.0.0.0 and dynamically reading $PORT
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --log-level info"]
