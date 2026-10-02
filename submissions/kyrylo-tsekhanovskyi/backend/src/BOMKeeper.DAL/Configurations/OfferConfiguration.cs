using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BOMKeeper.DAL.Configurations;

internal sealed class OfferConfiguration : IEntityTypeConfiguration<Offer>
{
    public void Configure(EntityTypeBuilder<Offer> builder)
    {
        builder.ToTable("Offers");
        builder.HasKey(o => o.Id);
        builder.Property(o => o.Id).ValueGeneratedNever();
        builder.ComplexProperty(o => o.AskingPrice, MoneyColumns.Configure);
        builder.ComplexProperty(o => o.AgreedPrice, MoneyColumns.Configure);
        builder.Ignore(o => o.UnitPrice);
        builder.Property(o => o.Fit).HasConversion<string>().HasMaxLength(20);
        builder.HasOne(o => o.Item).WithMany().HasForeignKey(o => o.ItemId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(o => o.Listing).WithMany().HasForeignKey(o => o.ListingId).OnDelete(DeleteBehavior.Cascade);

        // Database backstop of the `duplicate-offer` rule (design D2).
        builder.HasIndex(o => new { o.ItemId, o.ListingId }, UniqueConstraints.OfferItemListing).IsUnique();

        // At most one chosen offer per item (design D2). Checked per statement, so switching the choice
        // clears the old choice before setting the new one (design D3).
        builder.HasIndex(o => o.ItemId, "IX_Offers_ItemId_Chosen").IsUnique().HasFilter("\"IsChosen\"");
        builder.HasSequenceColumn();
    }
}
