type ZodIssueLike = { path: PropertyKey[]; message: string };

// Maps zod's issues array to a flat { fieldName: message } object for
// single-level form sections (good enough here — none of the onboarding
// section schemas nest deep enough to need a path-aware error tree).
export function issuesToFieldErrors(issues: ZodIssueLike[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_root");
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
