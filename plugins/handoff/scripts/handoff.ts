/**
 * Hook script for the handoff plugin.
 *
 * Reads hook JSON from stdin. If the user typed /handoff, extracts
 * session_id and cwd, posts them to Agentara, and signals Claude
 * Code to stop. Otherwise passes through.
 */

interface HookInput {
  session_id: string;
  cwd: string;
  prompt: string;
}

async function main(): Promise<void> {
  let input: HookInput;
  try {
    const raw = await Bun.stdin.text();
    input = JSON.parse(raw);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }

  if (!input.prompt.startsWith("/handoff")) {
    process.stdout.write(JSON.stringify({ continue: true }) + "\n");
    process.exit(0);
  }

  const endpoint =
    Bun.env.CLAUDE_PLUGIN_OPTION_AGENTARA_ENDPOINT || "http://localhost:1984";

  const base = endpoint.replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}/api/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "handoff",
        session_id: input.session_id,
        cwd: input.cwd,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      process.stdout.write(
        JSON.stringify({
          continue: true,
          systemMessage:
            "Handoff failed: " + (err.error || res.statusText),
        }) + "\n",
      );
      process.exit(0);
    }

    process.stdout.write(
      JSON.stringify({
        continue: false,
        stopReason: "Session handed off to Agentara",
      }) + "\n",
    );
  } catch {
    process.stdout.write(
      JSON.stringify({
        continue: true,
        systemMessage:
          "Handoff failed: Agentara unreachable. Is the server running?",
      }) + "\n",
    );
  }
  process.exit(0);
}

main();