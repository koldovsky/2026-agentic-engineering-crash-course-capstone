using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

namespace BOMKeeper.Api.Contracts;

// An amount in one currency; never converted. The BLL enforces two decimal places and ISO 4217 codes.
public sealed class Money
{
    [Range(typeof(decimal), "0", "999999999.99", ParseLimitsInInvariantCulture = true)]
    public required decimal Amount { get; init; }

    [RegularExpression("^[A-Z]{3}$")]
    public required string Currency { get; init; }

    public Entities.Money ToEntity() => new() { Amount = Amount, Currency = Currency };

    [return: NotNullIfNotNull(nameof(money))]
    public static Money? From(Entities.Money? money) =>
        money is null ? null : new Money { Amount = money.Amount, Currency = money.Currency };
}
