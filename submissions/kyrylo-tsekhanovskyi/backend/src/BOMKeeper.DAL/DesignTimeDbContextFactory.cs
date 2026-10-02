using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace BOMKeeper.DAL;

// Used only by `dotnet ef migrations add`, so migrations can be generated from the DAL alone.
// The connection string is never opened: generating a migration does not touch a database.
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<BomKeeperDbContext>
{
    public BomKeeperDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<BomKeeperDbContext>()
            .UseNpgsql("Host=localhost;Database=bomkeeper_design_time")
            .Options);
}
