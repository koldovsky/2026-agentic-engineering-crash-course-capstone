using BOMKeeper.BLL.Items;
using BOMKeeper.BLL.Listings;
using BOMKeeper.BLL.Offers;
using BOMKeeper.BLL.Projects;
using Microsoft.Extensions.DependencyInjection;

namespace BOMKeeper.BLL;

// Registers the business services. The DAL registers its repositories itself.
public static class BllRegistration
{
    public static IServiceCollection AddBomKeeperServices(this IServiceCollection services)
    {
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<ProjectService>();
        services.AddScoped<ItemService>();
        services.AddScoped<ListingService>();
        services.AddScoped<OfferService>();
        services.AddScoped<SummaryService>();
        return services;
    }
}
