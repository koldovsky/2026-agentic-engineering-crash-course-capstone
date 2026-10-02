using System.ComponentModel.DataAnnotations;
using BOMKeeper.Entities;

namespace BOMKeeper.Api.Contracts;

// Response body of getProjectSummary (contracts/openapi.yaml).
public sealed class ProjectSummary
{
    public required Guid ProjectId { get; init; }

    public required ItemCountsByStatus ItemCountsByStatus { get; init; }

    // One entry per currency, ordered by currency code.
    public required IReadOnlyList<MoneyTotal> Totals { get; init; }

    public required IReadOnlyList<ItemRef> ItemsWithoutChosenOffer { get; init; }

    public required IReadOnlyList<OfferRef> ChosenOffersWithoutPrice { get; init; }

    public static ProjectSummary From(BLL.Projects.SummaryReport summary) => new()
    {
        ProjectId = summary.ProjectId,
        ItemCountsByStatus = new ItemCountsByStatus
        {
            Needed = summary.ItemCountsByStatus[ItemStatus.Needed],
            Sourcing = summary.ItemCountsByStatus[ItemStatus.Sourcing],
            Ordered = summary.ItemCountsByStatus[ItemStatus.Ordered],
            Received = summary.ItemCountsByStatus[ItemStatus.Received],
        },
        Totals = [.. summary.Totals.Select(t => new MoneyTotal { Amount = t.Amount, Currency = t.Currency })],
        ItemsWithoutChosenOffer = [.. summary.ItemsWithoutChosenOffer.Select(i => new ItemRef { Id = i.Id, Name = i.Name })],
        ChosenOffersWithoutPrice =
        [
            .. summary.ChosenOffersWithoutPrice.Select(o => new OfferRef
            {
                OfferId = o.Id,
                ItemId = o.ItemId,
                ItemName = o.Item.Name,
                ListingId = o.ListingId,
                ListingTitle = o.Listing.Title,
            }),
        ],
    };
}

// Item count per item status; every status is present, 0 when empty.
public sealed class ItemCountsByStatus
{
    public required int Needed { get; init; }

    public required int Sourcing { get; init; }

    public required int Ordered { get; init; }

    public required int Received { get; init; }
}

// An aggregated amount in one currency. No upper bound: a total may exceed the single-price limit.
public sealed class MoneyTotal
{
    public required decimal Amount { get; init; }

    [RegularExpression("^[A-Z]{3}$")]
    public required string Currency { get; init; }
}

public sealed class ItemRef
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }
}

public sealed class OfferRef
{
    public required Guid OfferId { get; init; }

    public required Guid ItemId { get; init; }

    public required string ItemName { get; init; }

    public required Guid ListingId { get; init; }

    public required string ListingTitle { get; init; }
}
