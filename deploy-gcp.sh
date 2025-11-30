#!/bin/bash

# Quick deployment script for GCP GKE

set -e

echo "🚀 Pourover Timer - GKE Deployment Script"
echo "=========================================="

# Check required tools
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI is required but not installed. Aborting." >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed. Aborting." >&2; exit 1; }

# Get project ID
read -p "Enter your GCP Project ID: " PROJECT_ID
read -p "Enter GCP region (default: us-central1): " REGION
REGION=${REGION:-us-central1}

echo ""
echo "📝 Configuration:"
echo "  Project: $PROJECT_ID"
echo "  Region: $REGION"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Set project
echo "🔧 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable APIs
echo "🔧 Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com

# Create cluster (if it doesn't exist)
echo "🏗️  Checking for existing cluster..."
if gcloud container clusters describe pourover-timer-cluster --region=$REGION >/dev/null 2>&1; then
    echo "✅ Cluster already exists"
else
    echo "🏗️  Creating GKE cluster..."
    gcloud container clusters create pourover-timer-cluster \
        --region=$REGION \
        --num-nodes=1 \
        --machine-type=e2-medium \
        --enable-autoscaling \
        --min-nodes=1 \
        --max-nodes=100 \
        --enable-autorepair \
        --enable-autoupgrade \
        --workload-pool=$PROJECT_ID.svc.id.goog
fi

# Get credentials
echo "🔑 Getting cluster credentials..."
gcloud container clusters get-credentials pourover-timer-cluster --region=$REGION

# Configure Docker for GCR
echo "🐳 Configuring Docker for GCR..."
gcloud auth configure-docker

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/pourover-timer:latest .

# Push to GCR
echo "📤 Pushing image to Google Container Registry..."
docker push gcr.io/$PROJECT_ID/pourover-timer:latest

# Update deployment manifest with correct image
echo "📝 Updating Kubernetes manifests..."
sed -i.bak "s|pourover-timer:latest|gcr.io/$PROJECT_ID/pourover-timer:latest|" k8s/deployment.yaml

# Deploy to Kubernetes
echo "☸️  Deploying to Kubernetes..."
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/persistent-volume.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/hpa.yaml

# Wait for deployment
echo "⏳ Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/pourover-timer -n pourover-timer

# Get external IP
echo "🌐 Getting external IP (this may take a few minutes)..."
echo "   Waiting for LoadBalancer..."
sleep 10

EXTERNAL_IP=""
while [ -z $EXTERNAL_IP ]; do
    EXTERNAL_IP=$(kubectl get svc pourover-timer-service -n pourover-timer -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    [ -z "$EXTERNAL_IP" ] && sleep 10
done

# Restore original deployment file
mv k8s/deployment.yaml.bak k8s/deployment.yaml

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Deployment Status:"
kubectl get pods -n pourover-timer
echo ""
kubectl get svc -n pourover-timer
echo ""
echo "🎉 Application is available at: http://$EXTERNAL_IP"
echo ""
echo "📝 Useful commands:"
echo "  View pods:        kubectl get pods -n pourover-timer"
echo "  View logs:        kubectl logs -f -l app=pourover-timer -n pourover-timer"
echo "  View HPA:         kubectl get hpa -n pourover-timer"
echo "  Scale manually:   kubectl scale deployment pourover-timer --replicas=N -n pourover-timer"
echo ""
