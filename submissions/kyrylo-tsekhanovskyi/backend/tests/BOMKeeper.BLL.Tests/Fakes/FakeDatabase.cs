using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Tests.Fakes;

// In-memory stand-in for the DAL: lists in insertion order and a unit of work that counts saves.
// Hand-written fakes instead of a mocking library (AGENTS.md).
public sealed class FakeDatabase : IUnitOfWork
{
    public List<Project> Projects { get; } = [];

    public List<Item> Items { get; } = [];

    public List<Listing> Listings { get; } = [];

    public List<Offer> Offers { get; } = [];

    public int SaveCount { get; private set; }

    public Offer AddOffer(Item item, Listing listing, Money? asking = null, Money? agreed = null, bool isChosen = false)
    {
        var offer = new Offer
        {
            Id = Guid.NewGuid(),
            ItemId = item.Id,
            Item = item,
            ListingId = listing.Id,
            Listing = listing,
            AskingPrice = asking,
            AgreedPrice = agreed,
            IsChosen = isChosen,
        };
        Offers.Add(offer);
        return offer;
    }

    public static Money Price(decimal amount, string currency = "UAH") => new() { Amount = amount, Currency = currency };

    public Listing AddListing(
        Project project,
        ListingStatus status = ListingStatus.Found,
        DateTimeOffset statusChangedAt = default,
        string title = "Inverter + battery bundle")
    {
        var listing = new Listing
        {
            Id = Guid.NewGuid(),
            ProjectId = project.Id,
            Title = title,
            Url = "https://www.olx.ua/d/uk/obyavlenie/bundle.html",
            Platform = "OLX",
            Status = status,
            StatusChangedAt = statusChangedAt,
        };
        Listings.Add(listing);
        return listing;
    }

    public Project AddProject(string name = "Solar station")
    {
        var project = new Project { Id = Guid.NewGuid(), Name = name };
        Projects.Add(project);
        return project;
    }

    public Item AddItem(Project project, string name = "Inverter", int quantity = 1, ItemStatus status = ItemStatus.Needed)
    {
        var item = new Item { Id = Guid.NewGuid(), ProjectId = project.Id, Name = name, Quantity = quantity, Status = status };
        Items.Add(item);
        return item;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        SaveCount++;
        return Task.CompletedTask;
    }

    public int TransactionCount { get; private set; }

    public async Task ExecuteInTransactionAsync(Func<CancellationToken, Task> work, CancellationToken cancellationToken = default)
    {
        TransactionCount++;
        await work(cancellationToken);
    }
}

public sealed class FakeProjectRepository(FakeDatabase db) : IProjectRepository
{
    public Task<Project?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Projects.Find(p => p.Id == id));

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Projects.Exists(p => p.Id == id));

    public Task<IReadOnlyList<ProjectCounts>> ListWithCountsAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<ProjectCounts>>(
            [.. Enumerable.Reverse(db.Projects).Select(p => new ProjectCounts(
                p,
                db.Items.Count(i => i.ProjectId == p.Id),
                db.Listings.Count(l => l.ProjectId == p.Id)))]);

    public void Add(Project project) => db.Projects.Add(project);

    public void Remove(Project project) => db.Projects.Remove(project);
}

public sealed class FakeItemRepository(FakeDatabase db) : IItemRepository
{
    public Task<Item?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Items.Find(i => i.Id == id));

    public Task<IReadOnlyList<Item>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Item>>(db.Items.FindAll(i => i.ProjectId == projectId));

    public void Add(Item item) => db.Items.Add(item);

    public void Remove(Item item) => db.Items.Remove(item);
}

public sealed class FakeListingRepository(FakeDatabase db) : IListingRepository
{
    public Task<Listing?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Listings.Find(l => l.Id == id));

    public Task<IReadOnlyList<Listing>> ListByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Listing>>(db.Listings.FindAll(l => l.ProjectId == projectId));

    public void Add(Listing listing) => db.Listings.Add(listing);

    public void Remove(Listing listing) => db.Listings.Remove(listing);
}

public sealed class FakeOfferRepository(FakeDatabase db) : IOfferRepository
{
    public Task<Offer?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Offers.Find(o => o.Id == id));

    public Task<bool> ExistsAsync(Guid itemId, Guid listingId, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Offers.Exists(o => o.ItemId == itemId && o.ListingId == listingId));

    public Task<IReadOnlyList<Offer>> ListByItemAsync(Guid itemId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Offer>>(db.Offers.FindAll(o => o.ItemId == itemId));

    public Task<IReadOnlyList<Offer>> ListByListingAsync(Guid listingId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Offer>>(db.Offers.FindAll(o => o.ListingId == listingId));

    public Task<Offer?> FindChosenForItemAsync(Guid itemId, CancellationToken cancellationToken = default) =>
        Task.FromResult(db.Offers.Find(o => o.ItemId == itemId && o.IsChosen));

    public Task<IReadOnlyList<Offer>> ListChosenByProjectAsync(Guid projectId, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Offer>>(db.Offers.FindAll(o => o.IsChosen && o.Item.ProjectId == projectId));

    public void Add(Offer offer) => db.Offers.Add(offer);

    public void Remove(Offer offer) => db.Offers.Remove(offer);
}
