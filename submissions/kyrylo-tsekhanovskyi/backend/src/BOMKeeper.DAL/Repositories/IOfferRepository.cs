using BOMKeeper.Entities;

namespace BOMKeeper.DAL.Repositories;

// Offers are always returned with their item and listing loaded.
public interface IOfferRepository
{
    Task<Offer?> FindAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid itemId, Guid listingId, CancellationToken cancellationToken = default);

    // In the order created.
    Task<IReadOnlyList<Offer>> ListByItemAsync(Guid itemId, CancellationToken cancellationToken = default);

    // In the order created, across items.
    Task<IReadOnlyList<Offer>> ListByListingAsync(Guid listingId, CancellationToken cancellationToken = default);

    // The item's chosen offer, if any (at most one, enforced by a partial unique index).
    Task<Offer?> FindChosenForItemAsync(Guid itemId, CancellationToken cancellationToken = default);

    // The chosen offers of all items of a project.
    Task<IReadOnlyList<Offer>> ListChosenByProjectAsync(Guid projectId, CancellationToken cancellationToken = default);

    void Add(Offer offer);

    void Remove(Offer offer);
}
