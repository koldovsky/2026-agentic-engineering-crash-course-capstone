using BOMKeeper.Entities;

namespace BOMKeeper.DAL.Repositories;

public interface IListingRepository
{
    Task<Listing?> FindAsync(Guid id, CancellationToken cancellationToken = default);

    // In the order added.
    Task<IReadOnlyList<Listing>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);

    void Add(Listing listing);

    void Remove(Listing listing);
}
