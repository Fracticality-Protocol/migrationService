name        = "migration-service-test"
project     = "fractality"
environment = "test"
vpc_id      = "vpc-08ae44a5cd755d8b0"
subnet_ids  = ["subnet-05fe54f7cba0f2fd5", "subnet-07452d48590bce532"]

db_name        = "fractality"
db_instance_id = "fund-data-pipeline-db"
testnet        = false

public_address                  = "0x5B5fe168C17A74Cd32B2A2b5dfB30aDA3edF94d6"
token_address                   = "0xbdeaa95bd62d96a76f2511fcd8ac810f"
y2k_token_migration_address     = "0xEf2b53D2BF605a46bF7F4695Ac7Ba7bC47055271"
frct_r_migration_address        = "0xE90D7ddb803Fc02F9122D67cDe3069745bf64f65"
block_start_number              = "340965674"
safety_cushion_number_of_blocks = "5"
slack_channel_id                = "C08TGV7UG8Z"

