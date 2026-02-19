"""
ML Training API Endpoints
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from pathlib import Path
import asyncio

from backend.app.ml.training.pipeline import TrainingPipeline
from backend.app.ml.config import ml_config

router = APIRouter(prefix="/api/ml/training", tags=["ML Training"])

training_jobs = {}


class TrainingRequest(BaseModel):
    model_type: str = "price"
    symbol: str = "BTCUSDT"
    interval: str = "1h"
    days: int = 30


async def run_training_job(job_id: str, request: TrainingRequest):
    """Background training job"""
    try:
        training_jobs[job_id]["status"] = "running"
        training_jobs[job_id]["progress"] = 0.1

        pipeline = TrainingPipeline()

        df = await pipeline.prepare_data(request.symbol, request.interval, request.days)
        training_jobs[job_id]["progress"] = 0.4

        if len(df) == 0:
            raise ValueError("No data available")

        if request.model_type == "price":
            results = pipeline.train_price_predictor(
                df, request.symbol, request.interval
            )
        else:
            raise ValueError(f"Unknown model type: {request.model_type}")

        training_jobs[job_id]["progress"] = 1.0
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["completed_at"] = datetime.now(timezone.utc)
        training_jobs[job_id]["result"] = results

    except Exception as e:
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)
        training_jobs[job_id]["completed_at"] = datetime.now(timezone.utc)


@router.post("/start")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start a training job"""
    job_id = f"train_{request.symbol}_{request.interval}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"

    training_jobs[job_id] = {
        "status": "queued",
        "progress": 0.0,
        "started_at": datetime.now(timezone.utc),
        "request": request.dict(),
    }

    background_tasks.add_task(run_training_job, job_id, request)

    return {"job_id": job_id, "status": "queued"}


@router.get("/status/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status"""
    if job_id not in training_jobs:
        raise HTTPException(404, "Job not found")

    job = training_jobs[job_id]

    # Serialize datetime objects
    result = {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "started_at": (
            job["started_at"].isoformat()
            if isinstance(job["started_at"], datetime)
            else job["started_at"]
        ),
    }

    if "completed_at" in job and job["completed_at"]:
        result["completed_at"] = (
            job["completed_at"].isoformat()
            if isinstance(job["completed_at"], datetime)
            else job["completed_at"]
        )

    if "result" in job:
        result["result"] = job["result"]

    if "error" in job:
        result["error"] = job["error"]

    return result


@router.get("/models")
async def list_models():
    """List all trained models"""
    model_dir = Path(ml_config.MODEL_STORAGE_PATH)

    if not model_dir.exists():
        return {"models": []}

    models = []

    for model_file in model_dir.glob("*.pkl"):
        stats = model_file.stat()
        models.append(
            {
                "name": model_file.name,
                "path": str(model_file),
                "size_mb": round(stats.st_size / 1024 / 1024, 2),
                "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
            }
        )

    return {"models": sorted(models, key=lambda x: x["created_at"], reverse=True)}


@router.get("/jobs")
async def list_jobs():
    """List all training jobs"""
    jobs_list = []

    for job_id, job in training_jobs.items():
        job_info = {
            "job_id": job_id,
            "status": job["status"],
            "progress": job["progress"],
            "started_at": (
                job["started_at"].isoformat()
                if isinstance(job["started_at"], datetime)
                else job["started_at"]
            ),
        }

        if "completed_at" in job and job["completed_at"]:
            job_info["completed_at"] = (
                job["completed_at"].isoformat()
                if isinstance(job["completed_at"], datetime)
                else job["completed_at"]
            )

        jobs_list.append(job_info)

    return {"jobs": sorted(jobs_list, key=lambda x: x["started_at"], reverse=True)}
