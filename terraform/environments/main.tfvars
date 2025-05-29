name        = "migration-service"
project     = "fractality"
environment = "main"
vpc_id      = "vpc-08ae44a5cd755d8b0"
subnet_ids  = ["subnet-05fe54f7cba0f2fd5", "subnet-07452d48590bce532"]

db_name        = "fractality"
db_instance_id = "fund-data-pipeline-db"
testnet        = false

public_address                  = "0xccc85d270a63c6cf3673a04163ace4c80cc2eaa5"
token_address                   = "0xfebf76468dd13f240281e4a8ef11932d"
y2k_token_migration_address     = "0xb3625a0013D3CAD0013eaF6F7Cf4cBC5BA8b9df4"
frct_r_migration_address        = "0x556A24BACd8f219c28e1658580BdF552c186C893"
block_start_number              = "340592531"
safety_cushion_number_of_blocks = "30"
slack_channel_id                = "C08UDS1EE5A"
