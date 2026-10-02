using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Validation;
using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Items;

public sealed record ItemDraft(string? Name, int Quantity, string? Notes);

// An item with its chosen offer (null when there is none).
public sealed record ItemDetails(Item Item, Offer? ChosenOffer);

// Adds, reads, edits and deletes the items of a project, and sets their sourcing status by hand.
public sealed class ItemService(
    IProjectRepository projects,
    IItemRepository items,
    IOfferRepository offers,
    IUnitOfWork unitOfWork)
{
    public const int NameMaxLength = 200;
    public const int NotesMaxLength = 2000;
    public const int MinQuantity = 1;
    public const int MaxQuantity = 10000;

    // In the order added, each with its chosen offer.
    public async Task<IReadOnlyList<ItemDetails>> ListAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        await projects.EnsureExistsAsync(projectId, cancellationToken);
        var list = await items.ListByProjectAsync(projectId, cancellationToken);
        var chosen = (await offers.ListChosenByProjectAsync(projectId, cancellationToken)).ToDictionary(o => o.ItemId);
        return [.. list.Select(item => new ItemDetails(item, chosen.GetValueOrDefault(item.Id)))];
    }

    // A new item starts in `Needed`, with no chosen offer.
    public async Task<ItemDetails> CreateAsync(Guid projectId, ItemDraft draft, CancellationToken cancellationToken = default)
    {
        await projects.EnsureExistsAsync(projectId, cancellationToken);
        var (name, quantity, notes) = Validate(draft);
        var item = new Item
        {
            Id = Guid.CreateVersion7(),
            ProjectId = projectId,
            Name = name,
            Quantity = quantity,
            Notes = notes,
            Status = ItemStatus.Needed,
        };

        items.Add(item);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return new ItemDetails(item, null);
    }

    public async Task<ItemDetails> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        await WithChosenOfferAsync(await FindAsync(id, cancellationToken), cancellationToken);

    // Replaces the name, quantity and notes; the status is unchanged.
    public async Task<ItemDetails> UpdateAsync(Guid id, ItemDraft draft, CancellationToken cancellationToken = default)
    {
        var item = await FindAsync(id, cancellationToken);
        (item.Name, item.Quantity, item.Notes) = Validate(draft);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await WithChosenOfferAsync(item, cancellationToken);
    }

    // Any transition is allowed.
    public async Task<ItemDetails> SetStatusAsync(Guid id, ItemStatus status, CancellationToken cancellationToken = default)
    {
        Guards.EnsureDefined(status, "status");
        var item = await FindAsync(id, cancellationToken);
        item.Status = status;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return await WithChosenOfferAsync(item, cancellationToken);
    }

    // The item's offers go with it (ON DELETE CASCADE, design D2).
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        items.Remove(await FindAsync(id, cancellationToken));
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<Item> FindAsync(Guid id, CancellationToken cancellationToken) =>
        await items.FindAsync(id, cancellationToken) ?? throw NotFoundException.For("Item", id);

    private async Task<ItemDetails> WithChosenOfferAsync(Item item, CancellationToken cancellationToken) =>
        new(item, await offers.FindChosenForItemAsync(item.Id, cancellationToken));

    private static (string Name, int Quantity, string? Notes) Validate(ItemDraft draft)
    {
        var errors = new FieldErrors();
        var name = errors.RequiredText("name", draft.Name, NameMaxLength);
        if (draft.Quantity is < MinQuantity or > MaxQuantity)
        {
            errors.Add("quantity", $"The quantity must be a whole number from {MinQuantity} to {MaxQuantity}.");
        }

        var notes = errors.OptionalText("notes", draft.Notes, NotesMaxLength);
        errors.ThrowIfAny();
        return (name, draft.Quantity, notes);
    }
}
