import LoginForm from "@/components/form/LoginForm";
import { site } from "@/shared/config/site";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-4">
      <h1 className="font-display text-2xl text-bone">{site.shortName}</h1>
      <LoginForm />
    </main>
  );
}
