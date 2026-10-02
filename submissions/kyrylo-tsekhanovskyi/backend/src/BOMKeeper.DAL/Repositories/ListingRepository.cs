using BOMKeeper.DAL.Configurations;
using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;

namespace BOMKeeper.DAL.Repositories;

internal sealed class ListingRepository(BomKeeperDbContext context) : IListingRepository
{
    public Task<Listing?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Set<Listing>().FirstOrDefaultAsync(l => l.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Listing>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        await context.Set<Listing>()
            .Where(l => l.ProjectId == projectId)
            .InInsertionOrder()
            .ToListAsync(cancellationToken);

    public void Add(Listing listing) => context.Add(listing);

    public void Remove(Listing listing) => context.Remove(listing);
}
