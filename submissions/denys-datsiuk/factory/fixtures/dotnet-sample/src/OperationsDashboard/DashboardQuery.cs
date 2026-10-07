namespace OperationsDashboard;

public sealed record DashboardQuery(DateOnly? From, DateOnly? To, int Page, string? QuickFilter);

public sealed record DashboardTransition(bool ShouldReload, int Page, string? QuickFilter);

public static class DashboardPolicy
{
    public static DashboardTransition ApplyManualRange(DashboardQuery query)
    {
        var completeRange = query.From is not null && query.To is not null;
        return completeRange
            ? new DashboardTransition(true, 1, null)
            : new DashboardTransition(false, query.Page, query.QuickFilter);
    }

    public static bool IsOperationallyVisible(DateTimeOffset startedAt, bool active, DateTimeOffset rangeStart) =>
        active || startedAt >= rangeStart;
}
