resource "aws_elasticache_subnet_group" "redis_subnet" {
  name        = "${var.name}-redis-subnet-${var.environment}"
  description = "Subnet group for Redis"
  subnet_ids  = var.subnet_ids
}

resource "aws_security_group" "redis_sg" {
  name        = "${var.name}-redis-sg-${var.environment}"
  description = "Security group for Redis"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Allow Lambda to connect on Redis port"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.lambda_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.name}-redis-sg"
  }
}

resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id = "${var.name}-redis-${var.environment}"
  description          = "{var.name} cluster for ${var.environment}"
  engine               = "redis"
  engine_version       = "6.x"
  security_group_ids = [
    aws_security_group.redis_sg.id,
    aws_security_group.lambda_sg.id
  ]
  subnet_group_name          = aws_elasticache_subnet_group.redis_subnet.name
  automatic_failover_enabled = true


  tags = {
    Name = "${var.name}-redis"
  }
}
