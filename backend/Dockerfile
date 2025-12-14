# Development Dockerfile for Backend
FROM python:3.11-slim AS dev

WORKDIR /app

# Install system dependencies for LightGBM and other ML libraries
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gcc \
        g++ \
        libgomp1 \
        && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source files
COPY . .

# Expose port
EXPOSE 8000

# Start development server with auto-reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
