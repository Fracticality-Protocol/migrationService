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
y2k_token_migration_address     = "0xb8b47E61188Cc197F36C48B2298cb05afE4332E1"
frct_r_migration_address        = "0x06a4F1CAa90d22a4b461fB970D4C22Ef63987a5c"
block_start_number              = "335048846"
safety_cushion_number_of_blocks = "5"
slack_channel_id                = "C08TGV7UG8Z"

