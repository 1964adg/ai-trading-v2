# Reference Configurations

This directory contains reference configurations that are not actively used but kept for documentation purposes.

## Files

### frontend-static-export.conf

Nginx configuration for serving a static Next.js export. This is **NOT used** in the current Docker setup.

**Current Setup**: Uses Next.js standalone server (Node.js) on port 3000

**This Configuration**: For serving static HTML export via nginx

**When to use**: If you want to export the frontend as static HTML and serve it with nginx instead of using the Next.js server.

To use this configuration:
1. Update `frontend/next.config.mjs` to use `output: 'export'`
2. Build frontend: `docker build -f frontend/Dockerfile.static ...`
3. Use this nginx config to serve the static files

## Why Keep These?

These configurations demonstrate alternative deployment strategies and serve as reference for different use cases.
