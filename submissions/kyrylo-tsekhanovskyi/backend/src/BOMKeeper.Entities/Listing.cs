namespace BOMKeeper.Entities;

// An ad or shop page that could supply parts of a project, and how the negotiation with its seller is going.
public sealed class Listing
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public required string Title { get; set; }

    public required string Url { get; set; }

    public required string Platform { get; set; }

    public string? SellerName { get; set; }

    public string? SellerContact { get; set; }

    public string? Notes { get; set; }

    public Money? AgreedTotal { get; set; }

    public ListingStatus Status { get; set; }

    // When the status last actually changed (the creation time for a new listing).
    public DateTimeOffset StatusChangedAt { get; set; }
}

public enum ListingStatus
{
    Found,
    Contacted,
    Negotiating,
    Agreed,
    Purchased,
    Received,
    NotResponding,
    Declined,
    Scam,
}
