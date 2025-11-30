# Cloud Native Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Cloud Provider                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Kubernetes Cluster                       │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │              Load Balancer Service                    │  │ │
│  │  │          (External IP / DNS Endpoint)                 │  │ │
│  │  └────────────────────┬─────────────────────────────────┘  │ │
│  │                       │                                     │ │
│  │  ┌────────────────────▼─────────────────────────────────┐  │ │
│  │  │          Horizontal Pod Autoscaler (HPA)             │  │ │
│  │  │   Min: 2 pods | Max: 1000 pods | Target: 70% CPU    │  │ │
│  │  └────────────────────┬─────────────────────────────────┘  │ │
│  │                       │                                     │ │
│  │  ┌────────────────────▼─────────────────────────────────┐  │ │
│  │  │              Pod Replicas (Auto-scaled)              │  │ │
│  │  │                                                       │  │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │ │
│  │  │  │  Pod 1   │  │  Pod 2   │  │  Pod N   │  ...      │  │ │
│  │  │  │          │  │          │  │          │           │  │ │
│  │  │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │           │  │ │
│  │  │  │ │Node  │ │  │ │Node  │ │  │ │Node  │ │           │  │ │
│  │  │  │ │App   │ │  │ │App   │ │  │ │App   │ │           │  │ │
│  │  │  │ │:3000 │ │  │ │:3000 │ │  │ │:3000 │ │           │  │ │
│  │  │  │ └──┬───┘ │  │ └──┬───┘ │  │ └──┬───┘ │           │  │ │
│  │  │  │    │     │  │    │     │  │    │     │           │  │ │
│  │  │  │    ▼     │  │    ▼     │  │    ▼     │           │  │ │
│  │  │  │ ┌──────┐ │  │ ┌──────┐ │  │ ┌──────┐ │           │  │ │
│  │  │  │ │/data │ │  │ │/data │ │  │ │/data │ │           │  │ │
│  │  │  │ └──┬───┘ │  │ └──┬───┘ │  │ └──┬───┘ │           │  │ │
│  │  │  └────┼─────┘  └────┼─────┘  └────┼─────┘           │  │ │
│  │  │       │             │             │                  │  │ │
│  │  │       └─────────────┴─────────────┘                  │  │ │
│  │  │                     │                                │  │ │
│  │  │       ┌─────────────▼──────────────┐                 │  │ │
│  │  │       │ Persistent Volume (10Gi)   │                 │  │ │
│  │  │       │  ReadWriteMany (Shared)    │                 │  │ │
│  │  │       │  brews.json / recipes.json │                 │  │ │
│  │  │       └────────────────────────────┘                 │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                             │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │           ConfigMap (Environment Variables)          │  │ │
│  │  │           - NODE_ENV=production                      │  │ │
│  │  │           - PORT=3000                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Container Registry (GCR/ECR/ACR)            │   │
│  │          gcr.io/project/pourover-timer:latest            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

                              ▲
                              │
                    ┌─────────┴──────────┐
                    │   CI/CD Pipeline   │
                    │  GitHub Actions    │
                    │                    │
                    │  1. Build & Test   │
                    │  2. Docker Build   │
                    │  3. Push to Reg    │
                    │  4. Deploy to K8s  │
                    └────────────────────┘
```

## Component Details

### Docker Container
- **Base Image**: Node.js 18 Alpine (minimal footprint)
- **Multi-stage Build**: Optimized production image
- **Non-root User**: Security hardened (UID 1001)
- **Health Checks**: Built-in liveness monitoring
- **Size**: ~150MB (optimized)

### Kubernetes Resources

#### Deployment
- **Initial Replicas**: 2 (high availability)
- **Strategy**: RollingUpdate (zero downtime)
- **Resource Requests**: 128Mi RAM, 100m CPU
- **Resource Limits**: 512Mi RAM, 500m CPU
- **Pod Anti-Affinity**: Spread across nodes

#### Service
- **Type**: LoadBalancer
- **Port Mapping**: 80 → 3000
- **Session Affinity**: None (stateless)

#### HPA (Horizontal Pod Autoscaler)
- **Min Replicas**: 2
- **Max Replicas**: 1000
- **Metrics**: CPU (70%), Memory (80%)
- **Scale Up**: 100% or +10 pods/30s
- **Scale Down**: -50%/60s (5min stabilization)

#### Persistent Volume
- **Size**: 10Gi
- **Access Mode**: ReadWriteMany
- **Storage Class**: Cloud provider default
- **Mount Path**: /app/data

### Scaling Capabilities

| Users | Pods | CPU | Memory | Network |
|-------|------|-----|--------|---------|
| 100 | 2 | 200m | 256Mi | 1Mbps |
| 1,000 | 2 | 500m | 512Mi | 10Mbps |
| 10,000 | 20 | 2000m | 5Gi | 100Mbps |
| 100,000 | 200 | 20 cores | 50Gi | 1Gbps |
| 1,000,000 | 1000 | 100 cores | 250Gi | 10Gbps |

### Traffic Flow

```
User Browser
    ↓ HTTPS
Cloud Load Balancer (External IP)
    ↓
Kubernetes Service (ClusterIP)
    ↓ Round-robin
Pod 1 | Pod 2 | Pod 3 | ... | Pod N
    ↓
Express Server :3000
    ↓
Static Files (HTML/CSS/JS) or API Routes
    ↓
Persistent Volume (JSON storage)
```

### Deployment Workflow

```
Developer Push → main branch
         ↓
GitHub Actions Triggered
         ↓
    ┌────────────┐
    │   Build    │ → npm ci, npm run build
    └────┬───────┘
         ↓
    ┌────────────┐
    │   Test     │ → npm test
    └────┬───────┘
         ↓
    ┌────────────┐
    │Docker Build│ → Multi-stage build
    └────┬───────┘
         ↓
    ┌────────────┐
    │Push to Reg │ → GCR/ECR/ACR
    └────┬───────┘
         ↓
    ┌────────────┐
    │   Deploy   │ → kubectl set image
    └────┬───────┘
         ↓
    ┌────────────┐
    │   Verify   │ → kubectl rollout status
    └────────────┘
         ↓
    Production Live ✅
```

## Cloud Provider Options

### Google Cloud Platform (GKE)
- **Cluster**: GKE Autopilot or Standard
- **Registry**: Google Container Registry (GCR)
- **Storage**: GCE Persistent Disk
- **Load Balancer**: Cloud Load Balancing
- **Autoscaling**: Built-in node autoscaler
- **Cost**: ~$150-$300/month (base)

### Amazon Web Services (EKS)
- **Cluster**: Amazon EKS
- **Registry**: Elastic Container Registry (ECR)
- **Storage**: EBS Volumes
- **Load Balancer**: Network Load Balancer
- **Autoscaling**: Cluster Autoscaler
- **Cost**: ~$150-$300/month (base)

### Microsoft Azure (AKS)
- **Cluster**: Azure Kubernetes Service
- **Registry**: Azure Container Registry (ACR)
- **Storage**: Azure Disk
- **Load Balancer**: Azure Load Balancer
- **Autoscaling**: Cluster autoscaler
- **Cost**: ~$150-$300/month (base)

## Monitoring & Observability

### Built-in Health Checks
- **Liveness Probe**: GET /api/brews every 30s
- **Readiness Probe**: GET /api/brews every 10s
- **Startup Period**: 5s grace period

### Metrics (with Prometheus)
- Request rate
- Response times
- Error rates
- Pod CPU/Memory usage
- Active connections

### Logs
- Container stdout/stderr
- Kubernetes events
- Audit logs
- Application logs

## Security Features

1. **Non-root Container**: Runs as UID 1001
2. **Dropped Capabilities**: All Linux capabilities dropped
3. **No Privilege Escalation**: Prevented in pod spec
4. **Network Policies**: Optional isolation
5. **Secrets Management**: ConfigMaps for non-sensitive data
6. **Image Scanning**: Automated vulnerability scanning
7. **RBAC**: Role-based access control

## Disaster Recovery

- **Pod Failures**: Auto-restart by Kubernetes
- **Node Failures**: Pods rescheduled to healthy nodes
- **Zone Failures**: Multi-zone deployment recommended
- **Data Backup**: Persistent volume snapshots
- **Rollback**: `kubectl rollout undo`

## Performance Optimization

1. **HTTP Keep-Alive**: Enabled
2. **Static Asset Caching**: Browser caching headers
3. **Compression**: gzip/brotli for responses
4. **Connection Pooling**: Efficient resource usage
5. **Horizontal Scaling**: Automatic based on load
6. **CDN Ready**: Static assets can be served via CDN
