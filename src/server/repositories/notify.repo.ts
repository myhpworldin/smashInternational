import "server-only";

export async function save(email: string): Promise<void> {
  // TODO: persist to a real datastore
  console.log(`[notify] captured email: ${email}`);
}
