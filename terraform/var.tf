variable "account_id" {
  type        = string
  description = "AWS account ID"
}

variable "region" {
  type        = string
  description = "AWS region"
}

variable "environment" {
  type = string
}

variable "name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type    = list(string)
  default = []
}

variable "project" {
  type = string
}

variable "project_version" {
  type = string
}

variable "db_name" {
  type = string
}

variable "db_instance_id" {
  type = string
}

variable "provider_url" {
  type = string
}

variable "public_address" {
  type = string
}

variable "token_address" {
  type = string
}

variable "y2k_token_migration_address" {
  type = string
}

variable "frct_r_migration_address" {
  type = string
}

variable "block_start_number" {
  type = string
}

variable "safety_cushion_number_of_blocks" {
  type = string
}
