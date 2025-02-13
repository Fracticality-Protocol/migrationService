import { type Context, type Handler } from "aws-lambda";

import { main } from "./migrationService";
interface ReportEvent {
  DAGSTER_PIPES_CONTEXT: string;
  DAGSTER_PIPES_MESSAGES: string;
}

export const handler: Handler<ReportEvent, void> = async (
  event: ReportEvent,
  context: Context
): Promise<void> => {
  try {
    await main(false);
  } catch (error) {
    console.error("Error With Migration Service:", error);
    throw error;
  }
};
