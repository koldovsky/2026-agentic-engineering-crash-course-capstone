import AuthForm from "@/components/AuthForm";
import PageShell from "@/components/PageShell";

export default function RegisterPage() {
  return (
    <PageShell titleKey="register.title">
      <AuthForm mode="register" />
    </PageShell>
  );
}
