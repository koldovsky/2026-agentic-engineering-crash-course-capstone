using BOMKeeper.DAL.Configurations;
using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;

namespace BOMKeeper.DAL.Repositories;

internal sealed class OfferRepository(BomKeeperDbContext context) : IOfferRepository
{
    private IQueryable<Offer> Offers => context.Set<Offer>().Include(o => o.Item).Include(o => o.Listing);

    public Task<Offer?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        Offers.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);

    public Task<bool> ExistsAsync(Guid itemId, Guid listingId, CancellationToken cancellationToken = default) =>
        context.Set<Offer>().AnyAsync(o => o.ItemId == itemId && o.ListingId == listingId, cancellationToken);

    public async Task<IReadOnlyList<Offer>> ListByItemAsync(Guid itemId, CancellationToken cancellationToken = default) =>
        await Offers.Where(o => o.ItemId == itemId).InInsertionOrder().ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<Offer>> ListByListingAsync(Guid listingId, CancellationToken cancellationToken = default) =>
        await Offers.Where(o => o.ListingId == listingId).InInsertionOrder().ToListAsync(cancellationToken);

    public Task<Offer?> FindChosenForItemAsync(Guid itemId, CancellationToken cancellationToken = default) =>
        Offers.FirstOrDefaultAsync(o => o.ItemId == itemId && o.IsChosen, cancellationToken);

    public async Task<IReadOnlyList<Offer>> ListChosenByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        await Offers.Where(o => o.IsChosen && o.Item.ProjectId == projectId).InInsertionOrder().ToListAsync(cancellationToken);

    public void Add(Offer offer) => context.Add(offer);

    public void Remove(Offer offer) => context.Remove(offer);
}
