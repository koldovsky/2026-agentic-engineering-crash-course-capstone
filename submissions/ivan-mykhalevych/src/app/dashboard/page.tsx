import DashboardView from "@/components/DashboardView";
import PageShell from "@/components/PageShell";

export default function DashboardPage() {
  return (
    <PageShell titleKey="dashboard.title">
      <DashboardView />
    </PageShell>
  );
}
