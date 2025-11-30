#!/bin/bash

# Quick deployment script for AWS EKS

set -e

echo "🚀 Pourover Timer - EKS Deployment Script"
echo "=========================================="

# Check required tools
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required but not installed. Aborting." >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ docker is required but not installed. Aborting." >&2; exit 1; }

# Get configuration
read -p "Enter AWS region (default: us-east-1): " REGION
REGION=${REGION:-us-east-1}
read -p "Enter ECR repository name (default: pourover-timer): " REPO_NAME
REPO_NAME=${REPO_NAME:-pourover-timer}

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo ""
echo "📝 Configuration:"
echo "  Account: $ACCOUNT_ID"
echo "  Region: $REGION"
echo "  Repository: $REPO_NAME"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi

# Create ECR repository
echo "📦 Creating ECR repository..."
aws ecr create-repository --repository-name $REPO_NAME --region $REGION 2>/dev/null || echo "Repository already exists"

# Login to ECR
echo "🔑 Logging into ECR..."
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

# Build Docker image
echo "🔨 Building Docker image..."
docker build -t $REPO_NAME:latest .

# Tag for ECR
echo "🏷️  Tagging image..."
docker tag $REPO_NAME:latest $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

# Push to ECR
echo "📤 Pushing image to ECR..."
docker push $ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest

# Check if EKS cluster exists
echo "🔍 Checking for EKS cluster..."
if aws eks describe-cluster --name pourover-timer-cluster --region $REGION >/dev/null 2>&1; then
    echo "✅ Cluster exists"
else
    echo "❌ EKS cluster 'pourover-timer-cluster' not found!"
    echo "   Please create cluster first using Terraform or eksctl"
    exit 1
fi

# Update kubeconfig
echo "🔧 Updating kubeconfig..."
aws eks update-kubeconfig --name pourover-timer-cluster --region $REGION

# Update deployment manifest
echo "📝 Updating Kubernetes manifests..."
sed -i.bak "s|pourover-timer:latest|$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPO_NAME:latest|" k8s/deployment.yaml

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

# Get external URL
echo "🌐 Getting LoadBalancer URL..."
sleep 10

EXTERNAL_URL=$(kubectl get svc pourover-timer-service -n pourover-timer -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

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
echo "🎉 Application is available at: http://$EXTERNAL_URL"
echo ""
echo "📝 Useful commands:"
echo "  View pods:        kubectl get pods -n pourover-timer"
echo "  View logs:        kubectl logs -f -l app=pourover-timer -n pourover-timer"
echo "  View HPA:         kubectl get hpa -n pourover-timer"
echo ""
