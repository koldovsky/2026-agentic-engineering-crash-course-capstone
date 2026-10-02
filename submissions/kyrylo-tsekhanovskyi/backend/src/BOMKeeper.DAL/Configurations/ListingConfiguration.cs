using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BOMKeeper.DAL.Configurations;

internal sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> builder)
    {
        builder.ToTable("Listings");
        builder.HasKey(l => l.Id);
        builder.Property(l => l.Id).ValueGeneratedNever();
        builder.Property(l => l.Title).HasMaxLength(200);
        builder.Property(l => l.Url).HasMaxLength(2048);
        builder.Property(l => l.Platform).HasMaxLength(50);
        builder.Property(l => l.SellerName).HasMaxLength(200);
        builder.Property(l => l.SellerContact).HasMaxLength(200);
        builder.Property(l => l.Notes).HasMaxLength(2000);
        builder.ComplexProperty(l => l.AgreedTotal, MoneyColumns.Configure);
        builder.Property(l => l.Status).HasConversion<string>().HasMaxLength(20);
        builder.HasOne<Project>().WithMany().HasForeignKey(l => l.ProjectId).OnDelete(DeleteBehavior.Cascade);
        builder.HasSequenceColumn();
    }
}
