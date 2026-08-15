import { describe, expect, it } from "vitest";
import { createExactlyOnce } from "./idempotency";

describe("idempotent creation", () => {
  it("returns the same fulfilled order when concurrent checkout attempts share an idempotency key", async () => {
    let saved: { publicId: string } | undefined;
    let inserts = 0;
    const findExisting = async () => saved;
    const create = async () => {
      await new Promise(resolve => setTimeout(resolve, 4));
      if (saved) throw new Error("duplicate idempotency key");
      inserts += 1;
      saved = { publicId: "HH-ONCE" };
      return saved;
    };
    const [first, second] = await Promise.all([
      createExactlyOnce({ findExisting, create }),
      createExactlyOnce({ findExisting, create }),
    ]);
    expect(inserts).toBe(1);
    expect(first.value.publicId).toBe("HH-ONCE");
    expect(second.value.publicId).toBe("HH-ONCE");
    expect([first.created, second.created].filter(Boolean)).toHaveLength(1);
  });
});
