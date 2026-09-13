import SignupForm from "@/components/form/SignupForm";
import { site } from "@/shared/config/site";

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-4">
      <div className="flex flex-col items-center gap-1">
        <h1 className="font-display text-2xl text-bone">{site.shortName}</h1>
        <p className="font-body text-sm text-ash">Create your client account</p>
      </div>
      <SignupForm />
    </main>
  );
}
