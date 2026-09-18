import { resolveOnboardingIdentity } from "@/server/services/onboarding.service";
import { BUSINESS_OBJECTIVES } from "@/shared/types/onboarding";
import ClientPageHeader from "@/components/client/ClientPageHeader";
import ClientSection from "@/components/client/ClientSection";
import { FieldGrid, Field } from "@/components/client/FieldGrid";
import type {
  CompanyInput,
  ObjectivesInput,
  TargetAudienceInput,
  BrandProfileInput,
} from "@/shared/validation/onboarding";

// Stage 1 Phase 5 §9 (grouping refined in Phase 8 §6/§7) — read-only
// presentation of the same company/objectives/audience/brand-profile data
// the admin detail page already shows, sourced from the client's own
// onboarding record via resolveOnboardingIdentity (session-derived, same
// ownership guarantee as every other client-portal page). This is a
// second *view* of that data, not a second place it's edited — the
// existing onboarding wizard remains the only way to change it.
export default async function ProfilePage() {
  const { doc } = await resolveOnboardingIdentity();
  const company = doc.company as Partial<CompanyInput> | null;
  const objectives = doc.objectives as Partial<ObjectivesInput> | null;
  const targetAudience = doc.targetAudience as Partial<TargetAudienceInput> | null;
  const brandProfile = doc.brandProfile as Partial<BrandProfileInput> | null;

  return (
    <div className="flex flex-col gap-8">
      <ClientPageHeader eyebrow="My Business" title="My Profile" />

      <ClientSection title="Company">
        <FieldGrid>
          <Field label="Company name" value={company?.name} />
          <Field label="Industry" value={company?.industry} />
          <Field label="Business description" value={company?.description} />
          <Field label="Website" value={company?.website} />
          <Field label="Business locations" value={company?.locations?.join(", ")} />
        </FieldGrid>
      </ClientSection>

      <ClientSection title="Primary contact">
        <FieldGrid>
          <Field label="Contact person" value={company?.contactPerson} />
          <Field label="Designation" value={company?.designation} />
          <Field label="Email" value={company?.email} />
          <Field label="Phone" value={company?.phone} />
          <Field label="WhatsApp" value={company?.whatsapp} />
        </FieldGrid>
      </ClientSection>

      <ClientSection title="Business objectives">
        <FieldGrid>
          <Field
            label="Objectives"
            value={objectives?.selected
              ?.map((o) => BUSINESS_OBJECTIVES.find((b) => b.id === o)?.label ?? o)
              .join(", ")}
          />
          {objectives?.otherDetail && <Field label="Other detail" value={objectives.otherDetail} />}
        </FieldGrid>
      </ClientSection>

      <ClientSection title="Target audience">
        <FieldGrid>
          <Field label="Age group" value={targetAudience?.ageGroups?.join(", ")} />
          <Field label="Gender" value={targetAudience?.gender?.join(", ")} />
          <Field label="Location" value={targetAudience?.locations?.join(", ")} />
          <Field label="Customer type" value={targetAudience?.customerType} />
          <Field label="Interests" value={targetAudience?.interests?.join(", ")} />
          <Field label="Existing customer profile" value={targetAudience?.existingCustomerProfile} />
        </FieldGrid>
      </ClientSection>

      {brandProfile && (
        <ClientSection title="Brand information">
          <FieldGrid>
            <Field label="Brand story" value={brandProfile.brandStory} />
            <Field label="Brand positioning" value={brandProfile.brandPositioning} />
            <Field label="Tone of voice" value={brandProfile.toneOfVoice} />
            <Field label="Key products / services" value={brandProfile.keyProductsServices} />
            <Field label="USPs" value={brandProfile.usps} />
            <Field label="Competitors" value={brandProfile.competitors} />
          </FieldGrid>
        </ClientSection>
      )}
    </div>
  );
}
