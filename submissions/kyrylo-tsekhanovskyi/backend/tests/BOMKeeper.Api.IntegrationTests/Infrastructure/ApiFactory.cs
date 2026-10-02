using BOMKeeper.DAL;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace BOMKeeper.Api.IntegrationTests.Infrastructure;

// Hosts the Api in memory against its own postgres:17 container (never the dev database).
// One instance per test collection; see ApiTests (the xUnit collection).
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:17").Build();

    public string ConnectionString => _postgres.GetConnectionString();

    // Disarmed unless a test asks it to fail the next commit.
    public CommitFaultInjector CommitFaults { get; } = new();

    public Task InitializeAsync() => _postgres.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:bomkeeper", ConnectionString);
        builder.ConfigureTestServices(services =>
            services.ConfigureDbContext<BomKeeperDbContext>(options => options.AddInterceptors(CommitFaults)));
    }
}

[CollectionDefinition(Name)]
public sealed class ApiTests : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
