using Microsoft.EntityFrameworkCore;

namespace BOMKeeper.DAL;

// Code-first model of BOMKeeper. Entity configurations live next to it as IEntityTypeConfiguration<T>.
public sealed class BomKeeperDbContext(DbContextOptions<BomKeeperDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder) =>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BomKeeperDbContext).Assembly);
}
