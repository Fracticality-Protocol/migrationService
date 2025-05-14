locals {
  secret_data = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
  db_username = local.secret_data["USERNAME"]
  db_password = local.secret_data["PASSWORD"]
  db_schema   = var.environment == "main" ? "main" : "test"
  db_name     = var.db_name
}

resource "aws_security_group" "lambda_sg" {
  name        = "${var.name}-lambda-sg-${var.environment}"
  description = "Security group for Lambda functions"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Lambda to access RDS on port 5432"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = ["sg-03117204f06e38ba8"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-lambda-sg"
  }
}

resource "aws_lambda_function" "default" {
  function_name    = var.name
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.default.arn
  filename         = "${path.module}/../dist/bundle.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist/bundle.zip")
  timeout          = 300

  environment {
    variables = merge(
      {
        PROVIDER_URL                    = var.environment == "main" ? var.mainnet_provider_url : var.testnet_provider_url
        BLOCKCHAIN_ENVIRONMENT          = var.environment
        PUBLIC_ADDRESS                  = var.public_address
        TOKEN_ADDRESS                   = var.token_address
        TESTNET                         = var.testnet
        DB_USER                         = local.db_username
        DB_PASSWORD                     = local.db_password
        DB_HOST                         = data.aws_db_instance.db.address
        DB_NAME                         = local.db_name
        DB_SCHEMA                       = local.db_schema
        Y2K_TOKEN_MIGRATION_ADDRESS     = var.y2k_token_migration_address
        FRCT_R_MIGRATION_ADDRESS        = var.frct_r_migration_address
        BLOCK_START_NUMBER              = var.block_start_number
        SAFETY_CUSHION_NUMBER_OF_BLOCKS = var.safety_cushion_number_of_blocks
        REDIS_CONNECTION_STRING         = "${aws_elasticache_replication_group.redis_cluster.primary_endpoint_address}:6379"
        REDIS_USE_TLS                   = "false"
      },
      var.environment == "main" ? { MNEMONIC_SECRET_ARN = data.aws_secretsmanager_secret.mnemonic.arn } : {},
      var.environment == "test" ? { PRIVATE_KEY = data.aws_secretsmanager_secret.private_key.arn } : {}
    )
  }

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}


resource "aws_iam_role" "default" {
  name               = "${var.name}-service-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.default.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.default.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

