using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Listings;
using BOMKeeper.BLL.Offers;
using BOMKeeper.BLL.Tests.Fakes;
using BOMKeeper.Entities;
using static BOMKeeper.BLL.Tests.Fakes.FakeDatabase;

namespace BOMKeeper.BLL.Tests.Offers;

public sealed class OfferServiceTests
{
    private readonly FakeDatabase _db = new();
    private readonly OfferService _service;
    private readonly Project _project;
    private readonly Item _item;
    private readonly Listing _listing;

    public OfferServiceTests()
    {
        _service = new OfferService(
            new FakeItemRepository(_db), new FakeListingRepository(_db), new FakeOfferRepository(_db), _db);
        _project = _db.AddProject();
        _item = _db.AddItem(_project, "Inverter");
        _listing = _db.AddListing(_project);
    }

    [Fact(DisplayName = "offers: A bundle listing supplies two items")]
    public async Task BundleListingSuppliesTwoItems()
    {
        var battery = _db.AddItem(_project, "Battery");

        await _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(12000), null));
        await _service.CreateAsync(battery.Id, new OfferDraft(_listing.Id, Price(30000), null));

        Assert.Equal(2, _db.Offers.Count);
        Assert.Single(_db.Offers, o => o.ItemId == _item.Id && o.ListingId == _listing.Id);
        Assert.Single(_db.Offers, o => o.ItemId == battery.Id && o.ListingId == _listing.Id);
    }

    [Fact(DisplayName = "offers: Listing from another project")]
    public async Task ListingFromAnotherProject()
    {
        var otherListing = _db.AddListing(_db.AddProject("Smart home"));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(otherListing.Id, null, null)));

        Assert.Equal("listing-in-other-project", error.Code);
        Assert.Empty(_db.Offers);
        Assert.Equal(0, _db.SaveCount);
    }

    [Fact(DisplayName = "offers: Duplicate link")]
    public async Task DuplicateLink()
    {
        var existing = _db.AddOffer(_item, _listing, asking: Price(12000));

        var error = await Assert.ThrowsAsync<BusinessRuleException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(11000), null)));

        Assert.Equal("duplicate-offer", error.Code);
        Assert.Equal(existing, Assert.Single(_db.Offers));
        Assert.Equal(Price(12000), existing.AskingPrice);
    }

    [Fact(DisplayName = "offers: Reject a negative amount")]
    public async Task RejectNegativeAmount()
    {
        var offer = _db.AddOffer(_item, _db.AddListing(_project, title: "Other ad"));

        var onCreate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(-1), null)));
        var onUpdate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.UpdatePricesAsync(offer.Id, Price(-1), null));

        Assert.Contains("askingPrice.amount", onCreate.Errors.Keys);
        Assert.Contains("askingPrice.amount", onUpdate.Errors.Keys);
        Assert.Null(offer.AskingPrice);
    }

    [Theory(DisplayName = "offers: Reject an invalid currency code")]
    [InlineData("uah")]
    [InlineData("EURO")]
    [InlineData("")]
    public async Task RejectInvalidCurrencyCode(string currency) => await AssertCurrencyRejectedAsync(currency);

    [Fact(DisplayName = "offers: Reject an unknown currency code")]
    public async Task RejectUnknownCurrencyCode() => await AssertCurrencyRejectedAsync("ZZZ");

    [Theory(DisplayName = "offers: Reject special currency codes")]
    [InlineData("XXX")]
    [InlineData("XTS")]
    [InlineData("XAU")]
    [InlineData("XAG")]
    [InlineData("XPT")]
    [InlineData("XPD")]
    [InlineData("XBA")]
    [InlineData("XBD")]
    [InlineData("XDR")]
    [InlineData("XSU")]
    [InlineData("XUA")]
    [InlineData("BOV")]
    [InlineData("CHE")]
    [InlineData("CHW")]
    [InlineData("CLF")]
    [InlineData("COU")]
    [InlineData("MXV")]
    [InlineData("USN")]
    [InlineData("UYI")]
    [InlineData("UYW")]
    public async Task RejectSpecialCurrencyCodes(string currency) => await AssertCurrencyRejectedAsync(currency);

    [Fact(DisplayName = "offers: Reject special currency codes (ordinary codes stay valid)")]
    public async Task OrdinaryCodesStayValid()
    {
        foreach (var currency in new[] { "UAH", "EUR", "USD", "PLN", "CHF", "XOF" })
        {
            var listing = _db.AddListing(_project, title: currency);
            await _service.CreateAsync(_item.Id, new OfferDraft(listing.Id, Price(1, currency), null));
        }

        Assert.Equal(6, _db.Offers.Count);
    }

    [Fact(DisplayName = "offers: Reject more than two decimal places")]
    public async Task RejectMoreThanTwoDecimalPlaces()
    {
        var onAsking = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(10.999m), null)));
        var onAgreed = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, null, Price(10.999m))));

        Assert.Contains("askingPrice.amount", onAsking.Errors.Keys);
        Assert.Contains("agreedPrice.amount", onAgreed.Errors.Keys);
        Assert.Empty(_db.Offers);
    }

    [Fact(DisplayName = "offers: Create an offer (BLL)")]
    public async Task CreateStartsUnverifiedAndNotChosen()
    {
        var offer = await _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(12000), Price(11500.50m)));

        Assert.Equal(OfferFit.Unverified, offer.Fit);
        Assert.False(offer.IsChosen);
        Assert.Equal(Price(12000), offer.AskingPrice);
        Assert.Equal(Price(11500.50m), offer.AgreedPrice);
        Assert.Same(_item, offer.Item);
        Assert.Same(_listing, offer.Listing);
    }

    private async Task AssertCurrencyRejectedAsync(string currency)
    {
        var onAsking = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, Price(100, currency), null)));
        var onAgreed = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(_item.Id, new OfferDraft(_listing.Id, null, Price(100, currency))));
        var listings = new ListingService(new FakeProjectRepository(_db), new FakeListingRepository(_db), _db, new ManualTimeProvider());
        var onListing = await Assert.ThrowsAsync<ValidationFailedException>(
            () => listings.CreateAsync(_project.Id, new ListingDraft("Ad", "https://olx.ua/a", "OLX", null, null, null, Price(100, currency))));

        Assert.Contains("askingPrice.currency", onAsking.Errors.Keys);
        Assert.Contains("agreedPrice.currency", onAgreed.Errors.Keys);
        Assert.Contains("agreedTotal.currency", onListing.Errors.Keys);
        Assert.Empty(_db.Offers);
    }
}
