# Terraform configuration for deploying to Google Cloud Platform (GKE)

terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "container" {
  service = "container.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "compute" {
  service = "compute.googleapis.com"
  disable_on_destroy = false
}

# GKE Cluster with autoscaling
resource "google_container_cluster" "primary" {
  name     = "pourover-timer-cluster"
  location = var.region

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Enable workload identity for better security
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable autoscaling
  cluster_autoscaling {
    enabled = true
    resource_limits {
      resource_type = "cpu"
      minimum       = 4
      maximum       = 100
    }
    resource_limits {
      resource_type = "memory"
      minimum       = 16
      maximum       = 400
    }
  }

  # Network policy for security
  network_policy {
    enabled = true
  }

  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
  }

  depends_on = [
    google_project_service.container,
    google_project_service.compute
  ]
}

# Separately Managed Node Pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "pourover-node-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  
  # Autoscaling configuration
  autoscaling {
    min_node_count = 1
    max_node_count = 100
  }

  node_config {
    preemptible  = false  # Use standard VMs for production
    machine_type = "e2-medium"  # 2 vCPU, 4GB RAM

    # Google recommends custom service accounts that have cloud-platform scope and permissions granted via IAM Roles.
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      app = "pourover-timer"
    }

    tags = ["pourover-timer"]

    metadata = {
      disable-legacy-endpoints = "true"
    }
  }
}

# Output cluster endpoint
output "kubernetes_cluster_name" {
  value       = google_container_cluster.primary.name
  description = "GKE Cluster Name"
}

output "kubernetes_cluster_host" {
  value       = google_container_cluster.primary.endpoint
  description = "GKE Cluster Host"
  sensitive   = true
}

output "region" {
  value       = var.region
  description = "GCloud Region"
}
