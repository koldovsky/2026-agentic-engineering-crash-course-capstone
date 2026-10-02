using BOMKeeper.DAL.Configurations;
using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;

namespace BOMKeeper.DAL.Repositories;

internal sealed class ItemRepository(BomKeeperDbContext context) : IItemRepository
{
    public Task<Item?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Set<Item>().FirstOrDefaultAsync(i => i.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Item>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        await context.Set<Item>()
            .Where(i => i.ProjectId == projectId)
            .InInsertionOrder()
            .ToListAsync(cancellationToken);

    public void Add(Item item) => context.Add(item);

    public void Remove(Item item) => context.Remove(item);
}
