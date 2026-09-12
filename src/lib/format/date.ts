const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(date: Date | string): string {
  return dateFormatter.format(new Date(date));
}
