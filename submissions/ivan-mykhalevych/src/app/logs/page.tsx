import LogsView from "@/components/LogsView";
import PageShell from "@/components/PageShell";

export default function LogsPage() {
  return (
    <PageShell titleKey="logs.title">
      <LogsView />
    </PageShell>
  );
}
