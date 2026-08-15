import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-07-29.dahlia" })
  : null;

export function requireStripe() {
  if (!stripe) throw new Error("Payments are not configured. Configure Stripe in Settings → Payment.");
  return stripe;
}
