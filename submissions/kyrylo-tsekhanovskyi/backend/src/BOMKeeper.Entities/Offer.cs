namespace BOMKeeper.Entities;

// Links an item to a listing that could supply it, with unit prices for that item, whether the offered part
// fits, and whether this is the item's chosen offer (at most one per item).
public sealed class Offer
{
    public Guid Id { get; set; }

    public Guid ItemId { get; set; }

    public Item Item { get; set; } = null!;

    public Guid ListingId { get; set; }

    public Listing Listing { get; set; } = null!;

    // Unit price asked by the seller.
    public Money? AskingPrice { get; set; }

    // Unit price agreed with the seller.
    public Money? AgreedPrice { get; set; }

    public OfferFit Fit { get; set; }

    public bool IsChosen { get; set; }

    // The price the item costs through this offer: agreed when set, otherwise asking; null when neither is set.
    public Money? UnitPrice => AgreedPrice ?? AskingPrice;
}

public enum OfferFit
{
    Unverified,
    Fits,
    NotQuiteRight,
    WrongItem,
}
