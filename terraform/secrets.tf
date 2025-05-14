data "aws_secretsmanager_secret" "db" {
  name = "FRACTALITY_DB"
}

data "aws_secretsmanager_secret_version" "db" {
  secret_id = data.aws_secretsmanager_secret.db.id
}

data "aws_secretsmanager_secret" "mnemonic" {
  name = "FRACTALITY_MIGRATION_MN_${upper(var.environment)}"
}

data "aws_secretsmanager_secret_version" "mnemonic" {
  secret_id = data.aws_secretsmanager_secret.mnemonic.id
}

data "aws_secretsmanager_secret" "private_key" {
  name = "FRACTALITY_MIGRATION_PRIVATE_KEY_${upper(var.environment)}"
}

data "aws_secretsmanager_secret_version" "private_key" {
  secret_id = data.aws_secretsmanager_secret.private_key.id
}
