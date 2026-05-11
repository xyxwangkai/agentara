import { describe, expect, test } from "bun:test";

import { renderMessageCard } from "@/community/feishu/messaging/message-renderer";

describe("renderMessageCard", () => {
  test("keeps final cards within Feishu's element limit", async () => {
    const card = await renderMessageCard(
      [
        ...Array.from({ length: 50 }, (_, i) => ({
          type: "tool_use" as const,
          id: `tool-${i}`,
          name: "Bash",
          input: { command: `echo ${i}` },
        })),
        { type: "text", text: "done" } as const,
      ],
      {
        streaming: false,
        uploadImage: async () => "image-key",
      },
    );

    const stepPanel = card.body.elements.find(
      (element) => element.tag === "collapsible_panel",
    );

    expect(card.body.elements.length).toBeLessThanOrEqual(20);
    expect(stepPanel?.tag).toBe("collapsible_panel");
    expect(stepPanel?.elements.length).toBeLessThanOrEqual(20);
  });
});
