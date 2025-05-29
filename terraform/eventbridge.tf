variable "schedule_expression" {
  type        = string
  description = "Schedule expression for EventBridge trigger"
  default     = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_rule" "lambda_schedule_rule" {
  name                = "${var.name}-lambda-schedule-${var.environment}"
  schedule_expression = var.schedule_expression
}

resource "aws_cloudwatch_event_target" "lambda_schedule_target" {
  rule      = aws_cloudwatch_event_rule.lambda_schedule_rule.name
  arn       = aws_lambda_function.default.arn
  target_id = "invoke-lambda"
}

resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.default.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_schedule_rule.arn
}
