######################
# Required Variables #
######################
variable "twentycrm_pgdb_admin_password" {
  type        = string
  description = "Database password for the Mhoo distribution's PostgreSQL administrator."
  sensitive   = true
}

variable "twentycrm_app_hostname" {
  type        = string
  description = "The protocol, DNS fully qualified hostname, and port used to access Mhoo in your environment. Ex: https://crm.example.com:443"
}

variable "twentycrm_product_brand_preset" {
  type        = string
  default     = "mhoo"
  description = "Product presentation preset for the Mhoo distribution. Use twenty only for an explicit upstream-compatibility fixture."

  validation {
    condition     = contains(["mhoo", "twenty"], var.twentycrm_product_brand_preset)
    error_message = "twentycrm_product_brand_preset must be mhoo or twenty."
  }
}

variable "twentycrm_product_brand_deployment_origin" {
  type        = string
  default     = ""
  description = "HTTP(S) origin used for relative product links. If empty, the app hostname is used; do not include a path, query, or fragment."
}

######################
# Optional Variables #
######################
variable "twentycrm_app_name" {
  type        = string
  default     = "twentycrm"
  description = "A friendly name prefix to use for every component deployed."
}

variable "twentycrm_server_image" {
  type        = string
  default     = "twentycrm/twenty:latest"
  description = "Server image for the Mhoo distribution. This defaults to latest and is also used for the worker image."
}

variable "twentycrm_db_image" {
  type        = string
  default     = "twentycrm/twenty-postgres-spilo:latest"
  description = "Database image for the Mhoo distribution. This defaults to latest."
}

variable "twentycrm_server_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the Mhoo server deployment. This defaults to 1."
}

variable "twentycrm_worker_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the Mhoo worker deployment. This defaults to 1."
}

variable "twentycrm_db_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the Mhoo database deployment. This defaults to 1."
}

variable "twentycrm_server_data_mount_path" {
  type        = string
  default     = "/app/packages/twenty-server/.local-storage"
  description = "Server application data mount path for Mhoo. Defaults to '/app/packages/twenty-server/.local-storage'."
}

variable "twentycrm_db_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "twentycrm_server_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "twentycrm_db_pv_capacity" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity provisioned for database persistent volume."
}

variable "twentycrm_db_pvc_requests" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity reservation for database persistent volume claim."
}

variable "twentycrm_server_pv_capacity" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity provisioned for server persistent volume."
}

variable "twentycrm_server_pvc_requests" {
  type        = string
  default     = "10Gi"
  description = "Storage capacity reservation for server persistent volume claim."
}

variable "twentycrm_namespace" {
  type        = string
  default     = "twentycrm"
  description = "Namespace for all Mhoo resources; the default technical namespace remains twentycrm."
}

variable "twentycrm_redis_replicas" {
  type        = number
  default     = 1
  description = "Number of replicas for the Mhoo Redis deployment. This defaults to 1."
}

variable "twentycrm_redis_image" {
  type        = string
  default     = "redis/redis-stack-server:latest"
  description = "Redis image for the Mhoo deployment. This defaults to latest."
}

variable "twentycrm_docker_data_mount_path" {
  type        = string
  default     = "/app/docker-data"
  description = "Docker data mount path for Mhoo server application data. Defaults to '/app/docker-data'."
}

variable "twentycrm_docker_data_pv_path" {
  type        = string
  default     = ""
  description = "Local path to use to store the physical volume if using local storage on nodes."
}

variable "twentycrm_docker_data_pv_capacity" {
  type        = string
  default     = "100Mi"
  description = "Storage capacity provisioned for server persistent volume."
}

variable "twentycrm_docker_data_pvc_requests" {
  type        = string
  default     = "100Mi"
  description = "Storage capacity reservation for server persistent volume claim."
}
