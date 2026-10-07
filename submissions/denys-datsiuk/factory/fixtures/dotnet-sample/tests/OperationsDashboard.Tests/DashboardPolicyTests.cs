using OperationsDashboard;
using Xunit;

namespace OperationsDashboard.Tests;

public sealed class DashboardPolicyTests
{
    [Fact]
    [Trait("Category", "Focused")]
    public void Complete_manual_range_reloads_and_resets_dependent_state()
    {
        var query = new DashboardQuery(new(2026, 9, 1), new(2026, 9, 30), 4, "Last24Hours");
        var result = DashboardPolicy.ApplyManualRange(query);
        Assert.True(result.ShouldReload);
        Assert.Equal(1, result.Page);
        Assert.Null(result.QuickFilter);
    }

    [Fact]
    [Trait("Category", "Focused")]
    public void Incomplete_range_does_not_query_or_reset_state()
    {
        var query = new DashboardQuery(new(2026, 9, 1), null, 4, "Last24Hours");
        var result = DashboardPolicy.ApplyManualRange(query);
        Assert.False(result.ShouldReload);
        Assert.Equal(4, result.Page);
        Assert.Equal("Last24Hours", result.QuickFilter);
    }

    [Fact]
    public void Active_alert_remains_visible_outside_requested_range()
    {
        var visible = DashboardPolicy.IsOperationallyVisible(
            DateTimeOffset.Parse("2026-08-01T00:00:00Z"), true,
            DateTimeOffset.Parse("2026-09-01T00:00:00Z"));
        Assert.True(visible);
    }

    [Fact]
    public void Old_completed_run_is_filtered_out()
    {
        var visible = DashboardPolicy.IsOperationallyVisible(
            DateTimeOffset.Parse("2026-08-01T00:00:00Z"), false,
            DateTimeOffset.Parse("2026-09-01T00:00:00Z"));
        Assert.False(visible);
    }
}
