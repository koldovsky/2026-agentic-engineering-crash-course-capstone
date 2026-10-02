namespace BOMKeeper.DAL.Repositories;

// A save violated a unique index. The DAL raises it instead of the provider's exception, so the BLL can
// map it to a business rule without depending on EF Core or Npgsql types.
public sealed class UniqueConstraintViolationException : Exception
{
    public UniqueConstraintViolationException(string constraintName, Exception innerException)
        : base($"Unique constraint '{constraintName}' was violated.", innerException) => ConstraintName = constraintName;

    public UniqueConstraintViolationException()
        : this(string.Empty, new InvalidOperationException())
    {
    }

    public UniqueConstraintViolationException(string message)
        : base(message) => ConstraintName = string.Empty;

    public string ConstraintName { get; }
}

// Names of the unique indexes the BLL maps to business rules.
public static class UniqueConstraints
{
    // offer(item, listing): the backstop of `duplicate-offer` (design D2).
    public const string OfferItemListing = "IX_Offers_ItemId_ListingId";
}
