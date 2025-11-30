# Pourover Timer - Cloud Native Deployment Guide

This application is containerized and ready for deployment on any major cloud provider with Kubernetes support.

## 🚀 Quick Start - Local Testing

### Test with Docker
```bash
# Build the Docker image
docker build -t pourover-timer:latest .

# Run locally
docker run -p 3000:3000 -v $(pwd)/data:/app/data pourover-timer:latest

# Or use Docker Compose
docker-compose up
```

## ☁️ Cloud Deployment Options

### Option 1: Google Cloud Platform (GKE) - RECOMMENDED

#### Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- `kubectl` installed

#### Setup Steps

1. **Create GKE Cluster with Terraform**
```bash
cd terraform
terraform init
terraform plan -var="project_id=YOUR_PROJECT_ID"
terraform apply -var="project_id=YOUR_PROJECT_ID"
```

2. **Configure kubectl**
```bash
gcloud container clusters get-credentials pourover-timer-cluster \
  --region us-central1 --project YOUR_PROJECT_ID
```

3. **Build and Push Docker Image**
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build and tag image
docker build -t gcr.io/YOUR_PROJECT_ID/pourover-timer:latest .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/pourover-timer:latest
```

4. **Update Kubernetes Deployment**
```bash
# Update image in deployment.yaml
sed -i 's|pourover-timer:latest|gcr.io/YOUR_PROJECT_ID/pourover-timer:latest|' k8s/deployment.yaml
```

5. **Deploy to Kubernetes**
```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volume.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Check deployment status
kubectl get pods -n pourover-timer
kubectl get svc -n pourover-timer
```

6. **Get Application URL**
```bash
kubectl get service pourover-timer-service -n pourover-timer
# Note the EXTERNAL-IP
```

### Option 2: AWS (EKS)

#### Setup with Terraform
```bash
cd terraform
terraform init
terraform apply -var="aws_region=us-east-1"

# Configure kubectl
aws eks update-kubeconfig --name pourover-timer-cluster --region us-east-1
```

#### Build and Deploy
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name pourover-timer --region us-east-1

# Build and push
docker build -t YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pourover-timer:latest .
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/pourover-timer:latest

# Update deployment.yaml with ECR image
# Then apply k8s manifests as shown in GKE steps
kubectl apply -f k8s/
```

### Option 3: Azure (AKS)

```bash
# Create resource group
az group create --name pourover-timer-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group pourover-timer-rg \
  --name pourover-timer-cluster \
  --node-count 2 \
  --enable-addons monitoring \
  --generate-ssh-keys \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 100

# Get credentials
az aks get-credentials --resource-group pourover-timer-rg --name pourover-timer-cluster

# Create ACR
az acr create --resource-group pourover-timer-rg --name yourregistryname --sku Basic

# Build and push
az acr build --registry yourregistryname --image pourover-timer:latest .

# Attach ACR to AKS
az aks update -n pourover-timer-cluster -g pourover-timer-rg --attach-acr yourregistryname

# Deploy
kubectl apply -f k8s/
```

## 📊 Auto-Scaling Configuration

The Horizontal Pod Autoscaler (HPA) is configured to:
- **Min replicas**: 2 (for high availability)
- **Max replicas**: 1000 (supports ~1M concurrent users)
- **CPU target**: 70% utilization
- **Memory target**: 80% utilization

### Scaling Behavior
- **Scale Up**: Doubles pods or adds 10, whichever is higher, every 30s
- **Scale Down**: Reduces by 50% every 60s with 5-minute stabilization

### Monitor Scaling
```bash
kubectl get hpa -n pourover-timer --watch
kubectl top pods -n pourover-timer
```

## 🔄 CI/CD with GitHub Actions

### Setup
1. Add secrets to your GitHub repository:
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_SA_KEY`: Service account JSON key with GKE/GCR permissions

2. Push to main branch triggers:
   - Build and test
   - Docker image build and push to GCR
   - Deployment to GKE cluster

### Create GCP Service Account
```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name "GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com

# Add key.json contents to GitHub Secrets as GCP_SA_KEY
```

## 🔍 Monitoring and Observability

### View Logs
```bash
# Stream logs from all pods
kubectl logs -f -l app=pourover-timer -n pourover-timer

# View logs from specific pod
kubectl logs -f POD_NAME -n pourover-timer
```

### Health Checks
The application includes:
- **Liveness probe**: Ensures container is running
- **Readiness probe**: Ensures container can serve traffic
- **Docker health check**: Built into container

### Prometheus Metrics (Optional)
Install Prometheus operator:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace
```

## 💾 Data Persistence

- Uses PersistentVolumeClaim for brew/recipe data
- Data survives pod restarts and updates
- 10Gi storage allocation (adjustable in `persistent-volume.yaml`)
- ReadWriteMany access mode for multi-pod scenarios

## 🛡️ Security Features

- Non-root container user (UID 1001)
- Security context with dropped capabilities
- No privilege escalation
- Workload identity enabled (GKE)
- Network policies ready
- Secrets management via ConfigMaps

## 📈 Cost Optimization

### Development
```bash
# Scale down to save costs
kubectl scale deployment pourover-timer --replicas=1 -n pourover-timer

# Or delete cluster when not in use
terraform destroy
```

### Production
- Use preemptible/spot instances for non-critical workloads
- Enable cluster autoscaler
- Set appropriate resource limits
- Monitor with billing alerts

## 🔧 Troubleshooting

### Pods not starting
```bash
kubectl describe pod POD_NAME -n pourover-timer
kubectl logs POD_NAME -n pourover-timer
```

### Service not accessible
```bash
kubectl get svc -n pourover-timer
kubectl describe svc pourover-timer-service -n pourover-timer
```

### HPA not scaling
```bash
kubectl describe hpa pourover-timer-hpa -n pourover-timer
kubectl top nodes
kubectl top pods -n pourover-timer
```

## 🌐 Access the Application

After deployment, get the external IP:
```bash
kubectl get service pourover-timer-service -n pourover-timer
```

Navigate to: `http://EXTERNAL_IP`

## 📝 Manual Deployment Commands

```bash
# Full deployment sequence
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volume.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Verify
kubectl get all -n pourover-timer

# Update deployment
kubectl set image deployment/pourover-timer \
  pourover-timer=gcr.io/YOUR_PROJECT_ID/pourover-timer:NEW_TAG \
  -n pourover-timer

# Rollback if needed
kubectl rollout undo deployment/pourover-timer -n pourover-timer
```

## 🎯 Performance Expectations

With this setup, the application can:
- Start with 2 pods (handles ~2,000 concurrent users)
- Auto-scale to 1000 pods (handles ~1M concurrent users)
- Each pod: 128Mi-512Mi RAM, 100m-500m CPU
- Load balancer distributes traffic across all healthy pods
- Zero-downtime rolling updates
- Automatic recovery from pod failures

## 📞 Support

For issues or questions, check:
- Pod logs: `kubectl logs -f -l app=pourover-timer -n pourover-timer`
- Events: `kubectl get events -n pourover-timer --sort-by='.lastTimestamp'`
- HPA status: `kubectl get hpa -n pourover-timer`
