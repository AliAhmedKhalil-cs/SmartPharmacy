terraform {
  required_version = ">= 1.6.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.39.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_kubernetes_cluster" "sp" {
  name    = "smartpharmacy-cluster"
  region  = var.region
  version = "1.30.0-do.0"

  node_pool {
    name       = "pool-1"
    size       = var.node_size
    node_count = var.node_count
    auto_scale = true
    min_nodes  = 3
    max_nodes  = 10
    labels = {
      env = "prod"
    }
  }
}

output "kubeconfig" {
  value     = digitalocean_kubernetes_cluster.sp.kube_config.0.raw_config
  sensitive = true
}