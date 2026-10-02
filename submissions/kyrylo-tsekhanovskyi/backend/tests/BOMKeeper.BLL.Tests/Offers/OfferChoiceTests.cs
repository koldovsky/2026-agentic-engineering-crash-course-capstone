using BOMKeeper.BLL.Offers;
using BOMKeeper.BLL.Tests.Fakes;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Tests.Offers;

public sealed class OfferChoiceTests
{
    private readonly FakeDatabase _db = new();
    private readonly OfferService _service;
    private readonly Project _project;

    public OfferChoiceTests()
    {
        _service = new OfferService(
            new FakeItemRepository(_db), new FakeListingRepository(_db), new FakeOfferRepository(_db), _db);
        _project = _db.AddProject();
    }

    [Fact(DisplayName = "offers: Choosing switches the choice")]
    public async Task ChoosingSwitchesTheChoice()
    {
        var item = _db.AddItem(_project);
        var offer1 = _db.AddOffer(item, _db.AddListing(_project, title: "Ad 1"));
        var offer2 = _db.AddOffer(item, _db.AddListing(_project, title: "Ad 2"));

        await _service.SetChoiceAsync(offer1.Id, isChosen: true);
        var result = await _service.SetChoiceAsync(offer2.Id, isChosen: true);

        Assert.True(result.IsChosen);
        Assert.True(offer2.IsChosen);
        Assert.False(offer1.IsChosen);
    }

    [Fact(DisplayName = "offers: Choice is per item")]
    public async Task ChoiceIsPerItem()
    {
        var bundle = _db.AddListing(_project);
        var offerA = _db.AddOffer(_db.AddItem(_project, "Inverter"), bundle);
        var offerB = _db.AddOffer(_db.AddItem(_project, "Battery"), bundle);

        await _service.SetChoiceAsync(offerA.Id, isChosen: true);
        await _service.SetChoiceAsync(offerB.Id, isChosen: true);

        Assert.True(offerA.IsChosen);
        Assert.True(offerB.IsChosen);
    }

    [Fact(DisplayName = "offers: Un-choose an offer")]
    public async Task UnChooseAnOffer()
    {
        var item = _db.AddItem(_project);
        var offer = _db.AddOffer(item, _db.AddListing(_project), isChosen: true);

        var result = await _service.SetChoiceAsync(offer.Id, isChosen: false);

        Assert.False(result.IsChosen);
        Assert.DoesNotContain(_db.Offers, o => o.ItemId == item.Id && o.IsChosen);
    }

    [Fact(DisplayName = "items: Choosing an offer does not change the item status")]
    public async Task ChoosingDoesNotChangeItemStatus()
    {
        var item = _db.AddItem(_project, status: ItemStatus.Needed);
        var listing = _db.AddListing(_project, ListingStatus.Negotiating);
        var offer = _db.AddOffer(item, listing);
        offer.Fit = OfferFit.NotQuiteRight;

        await _service.SetChoiceAsync(offer.Id, isChosen: true);

        Assert.Equal(ItemStatus.Needed, item.Status);
        Assert.Equal(ListingStatus.Negotiating, listing.Status);
        Assert.Equal(OfferFit.NotQuiteRight, offer.Fit);
    }
}
