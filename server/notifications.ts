import { eq } from "drizzle-orm";
import { notifications } from "../drizzle/schema";
import { getDb } from "./db";

const displayStatus: Record<string, string> = {
  confirmed: "confirmed",
  delayed: "delayed",
  preparing: "being prepared",
  ready: "ready for pickup",
  "out for delivery": "out for delivery",
  completed: "completed",
  cancelled: "cancelled",
};

export async function sendOrderStatusEmail(input: { orderId: number; recipient: string; publicId: string; status: string; estimateMinutes?: number }) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(notifications).values({
    orderId: input.orderId,
    channel: "email",
    recipient: input.recipient,
    template: input.status,
    status: "queued",
  });
  const notificationId = Number(result[0].insertId);
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await db.update(notifications).set({ status: "failed", failureReason: "Email provider is not configured." }).where(eq(notifications.id, notificationId));
    return;
  }
  const statusText = displayStatus[input.status] ?? input.status;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Hearth & Halo <onboarding@resend.dev>",
        to: [input.recipient],
        subject: `Order ${input.publicId} is ${statusText}`,
        html: `<main style="font-family:Arial,sans-serif;color:#10282b"><p style="letter-spacing:2px;font-size:11px;color:#317b78">HEARTH &amp; HALO</p><h1>Your order is ${statusText}.</h1><p>Order reference: <strong>${input.publicId}</strong>.</p>${input.estimateMinutes ? `<p>Current estimate: about ${input.estimateMinutes} minutes.</p>` : ""}<p>You can revisit your tracking page any time for the latest status.</p></main>`,
      }),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
    if (!response.ok) throw new Error(body.message ?? `Provider returned ${response.status}.`);
    await db.update(notifications).set({ status: "sent", providerReference: body.id ?? null }).where(eq(notifications.id, notificationId));
  } catch (error) {
    await db.update(notifications).set({ status: "failed", failureReason: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider failure." }).where(eq(notifications.id, notificationId));
  }
}
