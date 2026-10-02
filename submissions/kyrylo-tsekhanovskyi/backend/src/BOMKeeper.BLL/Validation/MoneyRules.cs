using System.Text.RegularExpressions;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Validation;

// Every price (offer asking and agreed prices, listing agreed total): an amount from 0 to 999999999.99
// with at most two decimal places, and an active ISO 4217 code in three uppercase letters.
public static partial class MoneyRules
{
    public const decimal MaxAmount = 999_999_999.99m;

    // Adds errors under `<field>.amount` and `<field>.currency`; null (no price) is valid.
    public static void Validate(this FieldErrors errors, string field, Money? money)
    {
        if (money is null)
        {
            return;
        }

        if (money.Amount is < 0 or > MaxAmount)
        {
            errors.Add($"{field}.amount", $"The amount must be from 0 to {MaxAmount}.");
        }
        else if (money.Amount != decimal.Round(money.Amount, 2))
        {
            errors.Add($"{field}.amount", "The amount must have at most two decimal places.");
        }

        if (money.Currency is null || !CurrencyShape().IsMatch(money.Currency))
        {
            errors.Add($"{field}.currency", "The currency must be three uppercase letters, for example UAH.");
        }
        else if (!CurrencyCodes.IsActive(money.Currency))
        {
            errors.Add($"{field}.currency", $"'{money.Currency}' is not an active ISO 4217 currency code.");
        }
    }

    [GeneratedRegex("^[A-Z]{3}$", RegexOptions.CultureInvariant)]
    private static partial Regex CurrencyShape();
}
