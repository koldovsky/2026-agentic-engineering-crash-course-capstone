using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Validation;
using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Listings;

public sealed record ListingDraft(
    string? Title,
    string? Url,
    string? Platform,
    string? SellerName,
    string? SellerContact,
    string? Notes,
    Money? AgreedTotal);

// Adds, reads, edits and deletes the listings of a project, and tracks the negotiation status.
public sealed class ListingService(
    IProjectRepository projects,
    IListingRepository listings,
    IUnitOfWork unitOfWork,
    TimeProvider time)
{
    public const int TitleMaxLength = 200;
    public const int UrlMaxLength = 2048;
    public const int PlatformMaxLength = 50;
    public const int SellerMaxLength = 200;
    public const int NotesMaxLength = 2000;

    public async Task<IReadOnlyList<Listing>> ListAsync(Guid projectId, CancellationToken cancellationToken = default)
    {
        await projects.EnsureExistsAsync(projectId, cancellationToken);
        return await listings.ListByProjectAsync(projectId, cancellationToken);
    }

    // A new listing starts in `Found`, with its status time set to the creation time.
    public async Task<Listing> CreateAsync(Guid projectId, ListingDraft draft, CancellationToken cancellationToken = default)
    {
        await projects.EnsureExistsAsync(projectId, cancellationToken);
        var valid = Validate(draft);
        var listing = new Listing
        {
            Id = Guid.CreateVersion7(),
            ProjectId = projectId,
            Title = valid.Title!,
            Url = valid.Url!,
            Platform = valid.Platform!,
            Status = ListingStatus.Found,
            StatusChangedAt = time.UtcNow(),
        };
        Apply(listing, valid);

        listings.Add(listing);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return listing;
    }

    public async Task<Listing> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        await listings.FindAsync(id, cancellationToken) ?? throw NotFoundException.For("Listing", id);

    // Replaces every field except the status and its time.
    public async Task<Listing> UpdateAsync(Guid id, ListingDraft draft, CancellationToken cancellationToken = default)
    {
        var listing = await GetAsync(id, cancellationToken);
        Apply(listing, Validate(draft));
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return listing;
    }

    // Any transition is allowed; the status time moves only when the status actually changes.
    public async Task<Listing> SetStatusAsync(Guid id, ListingStatus status, CancellationToken cancellationToken = default)
    {
        Guards.EnsureDefined(status, "status");
        var listing = await GetAsync(id, cancellationToken);
        if (listing.Status != status)
        {
            listing.Status = status;
            listing.StatusChangedAt = time.UtcNow();
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }

        return listing;
    }

    // The listing's offers go with it; the linked items stay (ON DELETE CASCADE, design D2).
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        listings.Remove(await GetAsync(id, cancellationToken));
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static void Apply(Listing listing, ListingDraft valid)
    {
        listing.Title = valid.Title!;
        listing.Url = valid.Url!;
        listing.Platform = valid.Platform!;
        listing.SellerName = valid.SellerName;
        listing.SellerContact = valid.SellerContact;
        listing.Notes = valid.Notes;
        listing.AgreedTotal = valid.AgreedTotal;
    }

    private static ListingDraft Validate(ListingDraft draft)
    {
        var errors = new FieldErrors();
        var title = errors.RequiredText("title", draft.Title, TitleMaxLength);
        var url = ValidateUrl(errors, draft.Url);
        var platform = errors.RequiredText("platform", draft.Platform, PlatformMaxLength);
        var sellerName = errors.OptionalText("sellerName", draft.SellerName, SellerMaxLength);
        var sellerContact = errors.OptionalText("sellerContact", draft.SellerContact, SellerMaxLength);
        var notes = errors.OptionalText("notes", draft.Notes, NotesMaxLength);
        errors.Validate("agreedTotal", draft.AgreedTotal);
        errors.ThrowIfAny();
        return new ListingDraft(title, url, platform, sellerName, sellerContact, notes, draft.AgreedTotal);
    }

    // An absolute http or https URL of at most 2048 characters.
    private static string ValidateUrl(FieldErrors errors, string? value)
    {
        var url = value?.Trim() ?? string.Empty;
        if (url.Length > UrlMaxLength)
        {
            errors.Add("url", $"The url must be at most {UrlMaxLength} characters.");
        }
        else if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || string.IsNullOrEmpty(uri.Host))
        {
            errors.Add("url", "The url must be an absolute http or https URL.");
        }

        return url;
    }
}
