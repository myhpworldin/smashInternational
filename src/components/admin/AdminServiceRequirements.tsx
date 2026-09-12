import { getServiceById, type ServiceFieldDef } from "@/shared/config/services";
import type { ServiceResponseDoc } from "@/server/repositories/onboarding.repo";

function formatValue(field: ServiceFieldDef, value: unknown): string {
  if (value === undefined || value === null || value === "") return "Not provided";
  if (Array.isArray(value)) {
    if (value.length === 0) return "Not provided";
    if (field.type === "multiselect" || field.type === "select") {
      return value
        .map((v) => field.options?.find((o) => o.value === v)?.label ?? String(v))
        .join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.type === "select") {
    return field.options?.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

// Every field for every selected service, including ones the client left
// blank — the client-facing summary compacts this to "filled fields only",
// but an admin reviewing a submission needs to see what's actually missing,
// not just what's present.
export default function AdminServiceRequirements({
  selectedServiceIds,
  serviceResponses,
}: {
  selectedServiceIds: string[];
  serviceResponses: ServiceResponseDoc[];
}) {
  const responsesByService = new Map(serviceResponses.map((r) => [r.serviceId, r.responses]));

  if (selectedServiceIds.length === 0) {
    return <p className="font-body text-sm text-ash">No services selected.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {selectedServiceIds.map((id) => {
        const service = getServiceById(id);
        if (!service) return null;
        const responses = responsesByService.get(id) ?? {};

        return (
          <div key={id} className="flex flex-col gap-2 border border-carbon p-4">
            <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">{service.label}</h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
              {service.fields.map((field) => (
                <div key={field.key} className="flex flex-col">
                  <dt className="font-body text-xs text-ash">{field.label}</dt>
                  <dd className="font-body text-sm text-bone">{formatValue(field, responses[field.key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
