using BOMKeeper.Entities;

namespace BOMKeeper.DAL.Repositories;

public interface IItemRepository
{
    Task<Item?> FindAsync(Guid id, CancellationToken cancellationToken = default);

    // In the order added.
    Task<IReadOnlyList<Item>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);

    void Add(Item item);

    void Remove(Item item);
}
