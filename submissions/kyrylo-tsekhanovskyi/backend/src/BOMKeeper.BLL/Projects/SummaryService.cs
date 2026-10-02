using BOMKeeper.BLL.Errors;
using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Projects;

// Item counts by status (every status present), totals per currency ordered by currency code, and the gaps.
public sealed record SummaryReport(
    Guid ProjectId,
    IReadOnlyDictionary<ItemStatus, int> ItemCountsByStatus,
    IReadOnlyList<Money> Totals,
    IReadOnlyList<Item> ItemsWithoutChosenOffer,
    IReadOnlyList<Offer> ChosenOffersWithoutPrice);

// Computes a project's summary in memory from its items and chosen offers (design D3).
public sealed class SummaryService(IProjectRepository projects, IItemRepository items, IOfferRepository offers)
{
    public async Task<SummaryReport> GetAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        await projects.EnsureExistsAsync(projectId, cancellationToken);
        var projectItems = await items.ListByProjectAsync(projectId, cancellationToken);
        var chosen = await offers.ListChosenByProjectAsync(projectId, cancellationToken);
        var chosenByItem = chosen.ToDictionary(o => o.ItemId);

        var counts = Enum.GetValues<ItemStatus>()
            .ToDictionary(status => status, status => projectItems.Count(i => i.Status == status));

        // Σ unit price × quantity over the chosen offers, where the unit price is agreed ?? asking.
        // Never converted between currencies; decimal arithmetic, so a total may exceed a single price's limit.
        var totals = projectItems
            .Select(item => (Item: item, Price: chosenByItem.GetValueOrDefault(item.Id)?.UnitPrice))
            .Where(line => line.Price is not null)
            .GroupBy(line => line.Price!.Currency, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new Money
            {
                Currency = group.Key,
                Amount = group.Sum(line => line.Price!.Amount * line.Item.Quantity),
            })
            .ToList();

        return new SummaryReport(
            projectId,
            counts,
            totals,
            [.. projectItems.Where(item => !chosenByItem.ContainsKey(item.Id))],
            [.. projectItems
                .Select(item => chosenByItem.GetValueOrDefault(item.Id))
                .OfType<Offer>()
                .Where(offer => offer.UnitPrice is null)]);
    }
}
