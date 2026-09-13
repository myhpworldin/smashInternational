import { Suspense } from "react";
import OtpVerificationForm from "@/components/form/OtpVerificationForm";

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-4">
      <Suspense fallback={null}>
        <OtpVerificationForm />
      </Suspense>
    </main>
  );
}
