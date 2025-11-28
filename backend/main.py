"""AI Trading Backend - FastAPI Application."""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.market import router as market_router
from config import settings

app = FastAPI(
    title="AI Trading Backend",
    description="Backend MVP for AI Trading Dashboard",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(market_router)


@app.get("/")
async def root():
    """Root endpoint - health check."""
    return {"status": "online", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True
    )
