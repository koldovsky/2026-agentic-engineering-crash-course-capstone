using BOMKeeper.BLL.Offers;
using BOMKeeper.Entities;

namespace BOMKeeper.Api.Contracts;

// Request and response bodies of the offers operations (contracts/openapi.yaml). Prices are unit prices.
public sealed class OfferCreate
{
    public required Guid ListingId { get; init; }

    public Money? AskingPrice { get; init; }

    public Money? AgreedPrice { get; init; }

    public OfferDraft ToBll() => new(ListingId, AskingPrice?.ToEntity(), AgreedPrice?.ToEntity());
}

public sealed class OfferUpdate
{
    public required Money? AskingPrice { get; init; }

    public required Money? AgreedPrice { get; init; }
}

public sealed class OfferFitUpdate
{
    public required OfferFit Fit { get; init; }
}

public sealed class OfferChoiceUpdate
{
    public required bool IsChosen { get; init; }
}

public sealed class Offer
{
    public required Guid Id { get; init; }

    public required Guid ItemId { get; init; }

    public required string ItemName { get; init; }

    public required Guid ListingId { get; init; }

    public required string ListingTitle { get; init; }

    public required string ListingPlatform { get; init; }

    public required ListingStatus ListingStatus { get; init; }

    public required Money? AskingPrice { get; init; }

    public required Money? AgreedPrice { get; init; }

    public required OfferFit Fit { get; init; }

    public required bool IsChosen { get; init; }

    public static Offer From(Entities.Offer offer) => new()
    {
        Id = offer.Id,
        ItemId = offer.ItemId,
        ItemName = offer.Item.Name,
        ListingId = offer.ListingId,
        ListingTitle = offer.Listing.Title,
        ListingPlatform = offer.Listing.Platform,
        ListingStatus = offer.Listing.Status,
        AskingPrice = Money.From(offer.AskingPrice),
        AgreedPrice = Money.From(offer.AgreedPrice),
        Fit = offer.Fit,
        IsChosen = offer.IsChosen,
    };
}
