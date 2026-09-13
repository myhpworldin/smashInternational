// "jamie@example.com" -> "j***@example.com" — matches the convention most
// verification emails use, so the address isn't shown in full on a page
// that could be visible over someone's shoulder.
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;
  return `${email[0]}***${email.slice(atIndex)}`;
}
