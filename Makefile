# Makefile for Pourover Timer Cloud Deployment

.PHONY: help build test docker-build docker-run docker-push deploy-local deploy-gcp deploy-aws k8s-deploy clean

# Variables
IMAGE_NAME ?= pourover-timer
VERSION ?= latest
GCP_PROJECT ?= your-project-id
AWS_REGION ?= us-east-1
REGISTRY ?= gcr.io

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build TypeScript application
	npm run build

test: ## Run tests
	npm test || echo "No tests defined"

docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME):$(VERSION) .

docker-run: ## Run Docker container locally
	docker run -p 3000:3000 -v $$(pwd)/data:/app/data $(IMAGE_NAME):$(VERSION)

docker-compose-up: ## Start application with Docker Compose
	docker-compose up -d

docker-compose-down: ## Stop Docker Compose services
	docker-compose down

docker-push-gcr: ## Push image to Google Container Registry
	docker tag $(IMAGE_NAME):$(VERSION) $(REGISTRY)/$(GCP_PROJECT)/$(IMAGE_NAME):$(VERSION)
	docker push $(REGISTRY)/$(GCP_PROJECT)/$(IMAGE_NAME):$(VERSION)

deploy-gcp: ## Deploy to Google Cloud Platform (GKE)
	./deploy-gcp.sh

deploy-aws: ## Deploy to AWS (EKS)
	./deploy-aws.sh

k8s-apply: ## Apply all Kubernetes manifests
	kubectl apply -f k8s/namespace.yaml
	kubectl apply -f k8s/configmap.yaml
	kubectl apply -f k8s/persistent-volume.yaml
	kubectl apply -f k8s/deployment.yaml
	kubectl apply -f k8s/service.yaml
	kubectl apply -f k8s/hpa.yaml

k8s-delete: ## Delete all Kubernetes resources
	kubectl delete -f k8s/hpa.yaml --ignore-not-found
	kubectl delete -f k8s/service.yaml --ignore-not-found
	kubectl delete -f k8s/deployment.yaml --ignore-not-found
	kubectl delete -f k8s/persistent-volume.yaml --ignore-not-found
	kubectl delete -f k8s/configmap.yaml --ignore-not-found
	kubectl delete -f k8s/namespace.yaml --ignore-not-found

k8s-status: ## Check Kubernetes deployment status
	@echo "=== Namespaces ==="
	kubectl get ns pourover-timer
	@echo "\n=== Deployments ==="
	kubectl get deployments -n pourover-timer
	@echo "\n=== Pods ==="
	kubectl get pods -n pourover-timer
	@echo "\n=== Services ==="
	kubectl get svc -n pourover-timer
	@echo "\n=== HPA ==="
	kubectl get hpa -n pourover-timer

k8s-logs: ## View application logs
	kubectl logs -f -l app=pourover-timer -n pourover-timer

k8s-scale: ## Scale deployment (use REPLICAS=N)
	kubectl scale deployment pourover-timer --replicas=$(REPLICAS) -n pourover-timer

terraform-init-gcp: ## Initialize Terraform for GCP
	cd terraform && terraform init

terraform-plan-gcp: ## Plan Terraform deployment for GCP
	cd terraform && terraform plan -var="project_id=$(GCP_PROJECT)"

terraform-apply-gcp: ## Apply Terraform configuration for GCP
	cd terraform && terraform apply -var="project_id=$(GCP_PROJECT)"

terraform-destroy-gcp: ## Destroy GCP infrastructure
	cd terraform && terraform destroy -var="project_id=$(GCP_PROJECT)"

clean: ## Clean build artifacts
	rm -rf dist node_modules
	docker-compose down -v

install: ## Install dependencies
	npm install

dev: ## Run in development mode
	npm run dev

all: build docker-build ## Build everything

.DEFAULT_GOAL := help
