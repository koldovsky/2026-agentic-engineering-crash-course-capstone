using System.Net;
using BOMKeeper.Api.IntegrationTests.Infrastructure;
using BOMKeeper.DAL;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace BOMKeeper.Api.IntegrationTests.Skeleton;

[Collection(ApiTests.Name)]
public sealed class HealthTests(ApiFactory factory)
{
    [Fact(DisplayName = "skeleton: GET /api/health returns 200")]
    public async Task HealthEndpointIsUp()
    {
        using var client = factory.CreateClient();

        using var response = await client.GetAsync(new Uri("/api/health", UriKind.Relative));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact(DisplayName = "skeleton: migrations are applied on startup")]
    public async Task MigrationsAreApplied()
    {
        using var client = factory.CreateClient(); // starting the host applies the migrations

        await using var scope = factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<BomKeeperDbContext>().Database;

        Assert.NotEmpty(await database.GetAppliedMigrationsAsync());
        Assert.Empty(await database.GetPendingMigrationsAsync());
    }
}
