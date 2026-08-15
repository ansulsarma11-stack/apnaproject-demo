import { describe, expect, it } from "vitest";

// This test reaches a third-party API and is deliberately opt-in. Production
// builds and normal CI should not depend on an externally configured Resend key.
const runResendIntegrationTests = process.env.RUN_RESEND_INTEGRATION_TESTS === "true";
const resendIntegrationTest = runResendIntegrationTests ? it : it.skip;

describe("Resend transactional email configuration", () => {
  resendIntegrationTest("authenticates with the Resend domains endpoint", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
    expect(response.ok).toBe(true);
  }, 15_000);
});
