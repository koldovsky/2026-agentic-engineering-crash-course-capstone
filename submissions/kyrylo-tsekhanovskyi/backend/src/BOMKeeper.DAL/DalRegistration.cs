using BOMKeeper.DAL.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace BOMKeeper.DAL;

// The only DAL surface the Api (composition root) may use: register the database, and migrate it
// on startup. Everything else stays behind the BLL (ADR 0004, architecture tests).
public static class DalRegistration
{
    // Connection string name injected by the AppHost as ConnectionStrings__bomkeeper.
    public const string ConnectionName = "bomkeeper";

    public static TBuilder AddBomKeeperDatabase<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        builder.AddNpgsqlDbContext<BomKeeperDbContext>(ConnectionName);
        builder.Services.AddScoped<IUnitOfWork, EfUnitOfWork>();
        builder.Services.AddScoped<IProjectRepository, ProjectRepository>();
        builder.Services.AddScoped<IItemRepository, ItemRepository>();
        builder.Services.AddScoped<IListingRepository, ListingRepository>();
        builder.Services.AddScoped<IOfferRepository, OfferRepository>();
        return builder;
    }

    public static async Task MigrateBomKeeperDatabaseAsync(
        this IServiceProvider services,
        CancellationToken cancellationToken = default)
    {
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<BomKeeperDbContext>();
        await context.Database.MigrateAsync(cancellationToken);
    }
}
