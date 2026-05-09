import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

import { kernel } from "@/kernel";
import { HandoffPayload, createLogger } from "@/shared";

const logger = createLogger("handoff-routes");

/**
 * Handoff-related route group.
 * Receives session relay requests from the Claude Code handoff plugin.
 */
export const handoffRoutes = new Hono().post(
  "/",
  zValidator("json", HandoffPayload),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const session = await kernel.sessionManager.createHandoffSession(
        body.session_id,
        { cwd: body.cwd },
      );

      try {
        await kernel.messageGateway.postMessage({
          role: "assistant",
          session_id: session.id,
          content: [
            {
              type: "text",
              text: `Session \`${body.session_id}\` has been handed off from Claude Code. Reply to this message to continue.`,
            },
          ],
        });
      } catch (notifyErr) {
        logger.error({ err: notifyErr }, "Failed to send handoff notification");
        kernel.sessionManager.removeSession(session.id);
        return c.json({ error: "Failed to send notification" }, 500);
      }

      return c.json({ status: "notified", session_id: session.id });
    } catch (err) {
      if (
        err instanceof Error &&
        err.name === "SessionAlreadyExistsError"
      ) {
        return c.json(
          { error: "Session already exists", session_id: body.session_id },
          409,
        );
      }
      logger.error({ err }, "Failed to create handoff session");
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);