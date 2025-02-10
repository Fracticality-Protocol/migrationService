data "aws_secretsmanager_secret" "db" {
  name = "FRACTALITY_DB"
}

data "aws_secretsmanager_secret_version" "db" {
  secret_id = data.aws_secretsmanager_secret.db.id
}

data "aws_secretsmanager_secret" "mnemonic" {
  name = "FRACTALITY_MIGRATION_${var.environment}"
}

data "aws_secretsmanager_secret_version" "mnemonic" {
  secret_id = data.aws_secretsmanager_secret.mnemonic.id
}
