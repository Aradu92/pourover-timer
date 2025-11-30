# 🚀 Quick Start Guide - Cloud Deployment

This guide will get your pourover timer running in the cloud in under 10 minutes.

## Prerequisites Checklist

- [ ] Google Cloud account (or AWS/Azure)
- [ ] `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))
- [ ] `kubectl` installed ([Install Guide](https://kubernetes.io/docs/tasks/tools/))
- [ ] `docker` installed ([Install Guide](https://docs.docker.com/get-docker/))
- [ ] Git repository (optional, for CI/CD)

## Option 1: Automated GCP Deployment (Easiest)

```bash
# 1. Clone/navigate to the project
cd coffee

# 2. Run the deployment script
./deploy-gcp.sh

# Follow the prompts:
# - Enter your GCP Project ID
# - Enter region (default: us-central1)
# - Confirm deployment

# That's it! The script will:
# ✅ Create GKE cluster
# ✅ Build and push Docker image
# ✅ Deploy to Kubernetes
# ✅ Configure auto-scaling
# ✅ Provide you with the application URL
```

**Deployment time**: ~8-10 minutes

## Option 2: Using Makefile

```bash
# Build the Docker image
make docker-build

# Deploy to GCP
make deploy-gcp

# Check status
make k8s-status

# View logs
make k8s-logs
```

## Option 3: Manual Step-by-Step (GCP)

### Step 1: Set up GCP
```bash
# Set your project
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
```

### Step 2: Create GKE Cluster
```bash
# Using Terraform (recommended)
cd terraform
terraform init
terraform apply -var="project_id=$PROJECT_ID"

# OR using gcloud CLI
gcloud container clusters create pourover-timer-cluster \
  --region us-central1 \
  --num-nodes 1 \
  --machine-type e2-medium \
  --enable-autoscaling \
  --min-nodes 1 \
  --max-nodes 100
```

### Step 3: Build and Push Docker Image
```bash
# Configure Docker for GCR
gcloud auth configure-docker

# Build image
docker build -t gcr.io/$PROJECT_ID/pourover-timer:latest .

# Push to registry
docker push gcr.io/$PROJECT_ID/pourover-timer:latest
```

### Step 4: Update Kubernetes Manifests
```bash
# Update the image reference in deployment.yaml
sed -i "s|pourover-timer:latest|gcr.io/$PROJECT_ID/pourover-timer:latest|" k8s/deployment.yaml
```

### Step 5: Deploy to Kubernetes
```bash
# Get cluster credentials
gcloud container clusters get-credentials pourover-timer-cluster --region us-central1

# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volume.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Wait for deployment
kubectl wait --for=condition=available --timeout=300s deployment/pourover-timer -n pourover-timer
```

### Step 6: Get Application URL
```bash
# Get external IP (may take 1-2 minutes)
kubectl get service pourover-timer-service -n pourover-timer

# Or watch until EXTERNAL-IP appears
kubectl get svc pourover-timer-service -n pourover-timer --watch
```

## Option 4: AWS EKS Deployment

```bash
# 1. Run the AWS deployment script
./deploy-aws.sh

# Follow the prompts for region and configuration

# OR manually with Terraform:
cd terraform
terraform init
terraform apply -var="aws_region=us-east-1"

# Configure kubectl
aws eks update-kubeconfig --name pourover-timer-cluster --region us-east-1

# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/pourover-timer:latest .
docker push $ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/pourover-timer:latest

# Deploy
kubectl apply -f k8s/
```

## Verify Deployment

```bash
# Check all resources
kubectl get all -n pourover-timer

# View pods (should see 2 running)
kubectl get pods -n pourover-timer

# Check HPA (auto-scaler)
kubectl get hpa -n pourover-timer

# View logs
kubectl logs -f -l app=pourover-timer -n pourover-timer
```

Expected output:
```
NAME                              READY   STATUS    RESTARTS   AGE
pod/pourover-timer-xxxxx-xxxxx    1/1     Running   0          2m
pod/pourover-timer-xxxxx-xxxxx    1/1     Running   0          2m

NAME                             TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)        AGE
service/pourover-timer-service   LoadBalancer   10.XX.XXX.XXX   XX.XX.XXX.XXX    80:XXXXX/TCP   2m
```

## Test the Application

```bash
# Get the external IP
export APP_URL=$(kubectl get svc pourover-timer-service -n pourover-timer -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test the API
curl http://$APP_URL/api/brews

# Open in browser
echo "Application available at: http://$APP_URL"
```

## Set Up CI/CD (Optional)

1. **Fork the repository** to your GitHub account

2. **Add GitHub Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add `GCP_PROJECT_ID` with your project ID
   - Add `GCP_SA_KEY` with service account JSON key

3. **Create Service Account** (for GitHub Actions):
```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name "GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# Copy contents of key.json to GitHub Secret GCP_SA_KEY
cat key.json
```

4. **Push to main branch** - automatic deployment will trigger!

## Monitor Auto-Scaling

```bash
# Generate some load
for i in {1..1000}; do
  curl http://$APP_URL/api/brews &
done

# Watch pods scale up
kubectl get hpa -n pourover-timer --watch

# View pod count
kubectl get pods -n pourover-timer --watch
```

You should see pods automatically scale up based on CPU/memory usage!

## Common Issues

### Pods not starting
```bash
kubectl describe pod <pod-name> -n pourover-timer
kubectl logs <pod-name> -n pourover-timer
```

### Can't access external IP
- Wait 2-3 minutes for LoadBalancer to provision
- Check firewall rules allow port 80
- Verify service: `kubectl get svc -n pourover-timer`

### Image pull errors
```bash
# Verify image exists
gcloud container images list --repository=gcr.io/$PROJECT_ID

# Check permissions
gcloud projects get-iam-policy $PROJECT_ID
```

## Clean Up (To Save Costs)

```bash
# Delete Kubernetes resources
kubectl delete namespace pourover-timer

# Delete GKE cluster
gcloud container clusters delete pourover-timer-cluster --region us-central1

# OR using Terraform
cd terraform
terraform destroy -var="project_id=$PROJECT_ID"

# Delete container images
gcloud container images delete gcr.io/$PROJECT_ID/pourover-timer:latest
```

## Cost Estimates

### Development (minimal usage)
- **GKE**: $75/month (1 node, e2-medium)
- **Load Balancer**: $18/month
- **Storage**: $0.40/month (10Gi)
- **Total**: ~$95/month

### Production (auto-scaling enabled)
- **Base (2 pods)**: ~$150/month
- **Heavy load (100 pods)**: ~$500-800/month
- **Scale varies with actual usage**

**Tip**: Use preemptible/spot instances to save 60-80%!

## Next Steps

1. ✅ Application is deployed!
2. 📊 Monitor in [GCP Console](https://console.cloud.google.com/kubernetes)
3. 🔔 Set up monitoring alerts
4. 🌐 Configure custom domain (optional)
5. 🔒 Add HTTPS with cert-manager (optional)
6. 📈 Set up Prometheus/Grafana dashboards (optional)

## Support

- **Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed info
- **Architecture**: See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- **Issues**: Check pod logs and events

Congratulations! Your pourover timer is now running in the cloud! ☕️☁️
