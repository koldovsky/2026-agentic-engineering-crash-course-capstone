import AuthForm from "@/components/AuthForm";
import PageShell from "@/components/PageShell";

export default function LoginPage() {
  return (
    <PageShell titleKey="login.title">
      <AuthForm mode="login" />
    </PageShell>
  );
}
