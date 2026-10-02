using System.ComponentModel.DataAnnotations;
using BOMKeeper.BLL.Items;
using BOMKeeper.Entities;

namespace BOMKeeper.Api.Contracts;

// Request and response bodies of the items operations (contracts/openapi.yaml).
public sealed class ItemInput
{
    [StringLength(ItemService.NameMaxLength, MinimumLength = 1)]
    public required string Name { get; init; }

    [Range(ItemService.MinQuantity, ItemService.MaxQuantity)]
    public required int Quantity { get; init; }

    [MaxLength(ItemService.NotesMaxLength)]
    public string? Notes { get; init; }

    public ItemDraft ToBll() => new(Name, Quantity, Notes);
}

public sealed class ItemStatusUpdate
{
    public required ItemStatus Status { get; init; }
}

public sealed class ChosenOfferSummary
{
    public required Guid OfferId { get; init; }

    public required Guid ListingId { get; init; }

    public required string ListingTitle { get; init; }

    // Agreed price if set, otherwise asking price; null when neither is set.
    public required Money? UnitPrice { get; init; }
}

public sealed class Item
{
    public required Guid Id { get; init; }

    public required Guid ProjectId { get; init; }

    public required string Name { get; init; }

    public required int Quantity { get; init; }

    public required string? Notes { get; init; }

    public required ItemStatus Status { get; init; }

    public required ChosenOfferSummary? ChosenOffer { get; init; }

    public static Item From(ItemDetails details) => new()
    {
        Id = details.Item.Id,
        ProjectId = details.Item.ProjectId,
        Name = details.Item.Name,
        Quantity = details.Item.Quantity,
        Notes = details.Item.Notes,
        Status = details.Item.Status,
        ChosenOffer = details.ChosenOffer is { } offer
            ? new ChosenOfferSummary
            {
                OfferId = offer.Id,
                ListingId = offer.ListingId,
                ListingTitle = offer.Listing.Title,
                UnitPrice = Money.From(offer.UnitPrice),
            }
            : null,
    };
}
