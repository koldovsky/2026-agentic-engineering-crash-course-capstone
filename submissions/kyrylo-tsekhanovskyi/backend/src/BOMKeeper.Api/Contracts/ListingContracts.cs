using System.ComponentModel.DataAnnotations;
using BOMKeeper.BLL.Listings;
using BOMKeeper.Entities;

namespace BOMKeeper.Api.Contracts;

// Request and response bodies of the listings operations (contracts/openapi.yaml).
public sealed class ListingInput
{
    [StringLength(ListingService.TitleMaxLength, MinimumLength = 1)]
    public required string Title { get; init; }

    // Absolute http or https URL (checked by the BLL).
    [MaxLength(ListingService.UrlMaxLength)]
    public required string Url { get; init; }

    // Free text; the UI suggests OLX, eBay, Allegro, Amazon, Rozetka, Prom.
    [StringLength(ListingService.PlatformMaxLength, MinimumLength = 1)]
    public required string Platform { get; init; }

    [MaxLength(ListingService.SellerMaxLength)]
    public string? SellerName { get; init; }

    [MaxLength(ListingService.SellerMaxLength)]
    public string? SellerContact { get; init; }

    [MaxLength(ListingService.NotesMaxLength)]
    public string? Notes { get; init; }

    public Money? AgreedTotal { get; init; }

    public ListingDraft ToBll() =>
        new(Title, Url, Platform, SellerName, SellerContact, Notes, AgreedTotal?.ToEntity());
}

public sealed class ListingStatusUpdate
{
    public required ListingStatus Status { get; init; }
}

public sealed class Listing
{
    public required Guid Id { get; init; }

    public required Guid ProjectId { get; init; }

    public required string Title { get; init; }

    public required string Url { get; init; }

    public required string Platform { get; init; }

    public required string? SellerName { get; init; }

    public required string? SellerContact { get; init; }

    public required string? Notes { get; init; }

    public required Money? AgreedTotal { get; init; }

    public required ListingStatus Status { get; init; }

    public required DateTimeOffset StatusChangedAt { get; init; }

    public static Listing From(Entities.Listing listing) => new()
    {
        Id = listing.Id,
        ProjectId = listing.ProjectId,
        Title = listing.Title,
        Url = listing.Url,
        Platform = listing.Platform,
        SellerName = listing.SellerName,
        SellerContact = listing.SellerContact,
        Notes = listing.Notes,
        AgreedTotal = Money.From(listing.AgreedTotal),
        Status = listing.Status,
        StatusChangedAt = listing.StatusChangedAt,
    };
}
