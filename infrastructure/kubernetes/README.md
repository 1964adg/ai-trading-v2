# Kubernetes Deployment (Future Phase)

This directory contains Kubernetes manifests for deploying AI Trading V2 to a Kubernetes cluster.

## Status

⚠️ **Coming Soon** - These manifests are prepared for future microservices migration (Phase 3-5).

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Helm (optional, for easier management)
- Ingress controller (nginx-ingress recommended)
- cert-manager (for SSL certificates)

## Deployment Order

When ready to deploy to Kubernetes:

1. **Create namespace**
   ```bash
   kubectl apply -f namespace.yml
   ```

2. **Create secrets**
   ```bash
   kubectl create secret generic trading-secrets \
     --from-literal=database-url='postgresql://...' \
     --from-literal=redis-url='redis://...' \
     -n ai-trading
   ```

3. **Deploy backend**
   ```bash
   kubectl apply -f backend-deployment.yml
   ```

4. **Deploy frontend**
   ```bash
   kubectl apply -f frontend-deployment.yml
   ```

5. **Configure ingress**
   ```bash
   kubectl apply -f ingress.yml
   ```

## Monitoring

The manifests include:
- Health checks (liveness and readiness probes)
- Resource limits
- Auto-scaling capabilities (to be added)

## Future Enhancements

- [ ] Horizontal Pod Autoscaling (HPA)
- [ ] StatefulSets for databases
- [ ] ConfigMaps for configuration
- [ ] Service mesh (Istio/Linkerd)
- [ ] Monitoring with Prometheus/Grafana
- [ ] Logging with ELK/Loki
- [ ] CI/CD integration

## Notes

Current Docker Compose setup is recommended for development and small-scale production deployments. Kubernetes is for larger scale deployments with high availability requirements.
