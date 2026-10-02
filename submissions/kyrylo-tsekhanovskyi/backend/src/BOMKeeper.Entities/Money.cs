namespace BOMKeeper.Entities;

// An amount in one currency (ISO 4217 code). Amounts in different currencies are never converted.
// Stored as two columns, amount numeric(12,2) and currency char(3); a missing price is null (design D2).
public sealed record Money
{
    public required decimal Amount { get; init; }

    public required string Currency { get; init; }
}
