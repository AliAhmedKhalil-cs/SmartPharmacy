variable "do_token" {
  type = string
  description = "DigitalOcean API token"
  sensitive = true
}

variable "region" {
  type    = string
  default = "fra1"
}

variable "node_size" {
  type    = string
  default = "s-4vcpu-8gb"
}

variable "node_count" {
  type    = number
  default = 3
}