export async function createExactlyOnce<T>(input: {
  findExisting: () => Promise<T | undefined>;
  create: () => Promise<T>;
}): Promise<{ value: T; created: boolean }> {
  const existing = await input.findExisting();
  if (existing) return { value: existing, created: false };
  try {
    return { value: await input.create(), created: true };
  } catch (error) {
    const raced = await input.findExisting();
    if (raced) return { value: raced, created: false };
    throw error;
  }
}
