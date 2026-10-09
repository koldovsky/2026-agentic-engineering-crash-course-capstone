import AccountView from "@/components/AccountView";
import PageShell from "@/components/PageShell";

export default function AccountPage() {
  return (
    <PageShell titleKey="account.title">
      <AccountView />
    </PageShell>
  );
}
