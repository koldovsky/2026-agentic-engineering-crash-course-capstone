using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Validation;
using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Offers;

public sealed record OfferDraft(Guid ListingId, Money? AskingPrice, Money? AgreedPrice);

// Links items to listings of the same project, keeps their unit prices and fit, and the item's choice.
public sealed class OfferService(
    IItemRepository items,
    IListingRepository listings,
    IOfferRepository offers,
    IUnitOfWork unitOfWork)
{
    // A new offer has fit `Unverified` and is not chosen.
    public async Task<Offer> CreateAsync(Guid itemId, OfferDraft draft, CancellationToken cancellationToken = default)
    {
        var item = await items.FindAsync(itemId, cancellationToken) ?? throw NotFoundException.For("Item", itemId);
        var listing = await listings.FindAsync(draft.ListingId, cancellationToken)
            ?? throw NotFoundException.For("Listing", draft.ListingId);
        ValidatePrices(draft.AskingPrice, draft.AgreedPrice);

        if (listing.ProjectId != item.ProjectId)
        {
            throw new BusinessRuleException(
                BusinessRuleException.ListingInOtherProject,
                "The listing belongs to a different project than the item.");
        }

        if (await offers.ExistsAsync(item.Id, listing.Id, cancellationToken))
        {
            throw DuplicateOffer();
        }

        var offer = new Offer
        {
            Id = Guid.CreateVersion7(),
            ItemId = item.Id,
            Item = item,
            ListingId = listing.Id,
            Listing = listing,
            AskingPrice = draft.AskingPrice,
            AgreedPrice = draft.AgreedPrice,
            Fit = OfferFit.Unverified,
            IsChosen = false,
        };

        offers.Add(offer);
        try
        {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (UniqueConstraintViolationException exception)
            when (exception.ConstraintName == UniqueConstraints.OfferItemListing)
        {
            // A concurrent request linked the same pair after the check above: same rule, same answer.
            throw DuplicateOffer();
        }

        return offer;
    }

    private static BusinessRuleException DuplicateOffer() =>
        new(BusinessRuleException.DuplicateOffer, "The item is already linked to this listing.");

    public async Task<IReadOnlyList<Offer>> ListByItemAsync(Guid itemId, CancellationToken cancellationToken = default)
    {
        _ = await items.FindAsync(itemId, cancellationToken) ?? throw NotFoundException.For("Item", itemId);
        return await offers.ListByItemAsync(itemId, cancellationToken);
    }

    public async Task<IReadOnlyList<Offer>> ListByListingAsync(Guid listingId, CancellationToken cancellationToken = default)
    {
        _ = await listings.FindAsync(listingId, cancellationToken) ?? throw NotFoundException.For("Listing", listingId);
        return await offers.ListByListingAsync(listingId, cancellationToken);
    }

    public async Task<Offer> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        await offers.FindAsync(id, cancellationToken) ?? throw NotFoundException.For("Offer", id);

    // Replaces both unit prices (null clears a price); the fit and the choice are unchanged.
    public async Task<Offer> UpdatePricesAsync(
        Guid id,
        Money? askingPrice,
        Money? agreedPrice,
        CancellationToken cancellationToken = default)
    {
        var offer = await GetAsync(id, cancellationToken);
        ValidatePrices(askingPrice, agreedPrice);
        offer.AskingPrice = askingPrice;
        offer.AgreedPrice = agreedPrice;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return offer;
    }

    // Any fit can follow any other.
    public async Task<Offer> SetFitAsync(Guid id, OfferFit fit, CancellationToken cancellationToken = default)
    {
        Guards.EnsureDefined(fit, "fit");
        var offer = await GetAsync(id, cancellationToken);
        offer.Fit = fit;
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return offer;
    }

    // Choosing un-chooses the item's previous choice in the same operation; un-choosing leaves the item with
    // no choice. The item status, the listing status and the fit are never touched.
    // The partial unique index is checked per statement, so the writes are ordered inside one transaction:
    // clear the old choice and save, then set the new one and save (design D3).
    // Each attempt of the unit of work (it may be retried) reloads the offers it changes.
    public async Task<Offer> SetChoiceAsync(Guid id, bool isChosen, CancellationToken cancellationToken = default)
    {
        Offer? result = null;
        await unitOfWork.ExecuteInTransactionAsync(
            async token =>
            {
                var offer = await GetAsync(id, token);
                result = offer;
                if (offer.IsChosen == isChosen)
                {
                    return;
                }

                var current = await offers.FindChosenForItemAsync(offer.ItemId, token);
                if (current is not null)
                {
                    current.IsChosen = false;
                    await unitOfWork.SaveChangesAsync(token);
                }

                if (isChosen)
                {
                    offer.IsChosen = true;
                    await unitOfWork.SaveChangesAsync(token);
                }
            },
            cancellationToken);

        return result!;
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        offers.Remove(await GetAsync(id, cancellationToken));
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static void ValidatePrices(Money? askingPrice, Money? agreedPrice)
    {
        var errors = new FieldErrors();
        errors.Validate("askingPrice", askingPrice);
        errors.Validate("agreedPrice", agreedPrice);
        errors.ThrowIfAny();
    }
}
