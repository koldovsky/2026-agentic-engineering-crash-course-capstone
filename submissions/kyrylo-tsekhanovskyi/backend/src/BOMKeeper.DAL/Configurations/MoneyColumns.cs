using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BOMKeeper.DAL.Configurations;

// Money as an optional complex value: `amount numeric(12,2)` and `currency char(3)`, both null when the
// price is missing (design D2).
internal static class MoneyColumns
{
    public static void Configure(ComplexPropertyBuilder<Money> money)
    {
        money.Property(m => m.Amount).HasPrecision(12, 2);
        money.Property(m => m.Currency).HasMaxLength(3).IsFixedLength();
    }
}
