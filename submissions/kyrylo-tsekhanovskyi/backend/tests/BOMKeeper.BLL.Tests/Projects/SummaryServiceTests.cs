using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Projects;
using BOMKeeper.BLL.Tests.Fakes;
using BOMKeeper.Entities;
using static BOMKeeper.BLL.Tests.Fakes.FakeDatabase;

namespace BOMKeeper.BLL.Tests.Projects;

public sealed class SummaryServiceTests
{
    private readonly FakeDatabase _db = new();
    private readonly SummaryService _service;
    private readonly Project _project;
    private readonly Listing _listing;

    public SummaryServiceTests()
    {
        _service = new SummaryService(new FakeProjectRepository(_db), new FakeItemRepository(_db), new FakeOfferRepository(_db));
        _project = _db.AddProject();
        _listing = _db.AddListing(_project);
    }

    [Fact(DisplayName = "projects: Counts by status include zeros")]
    public async Task CountsByStatusIncludeZeros()
    {
        _db.AddItem(_project, "A", status: ItemStatus.Needed);
        _db.AddItem(_project, "B", status: ItemStatus.Needed);
        _db.AddItem(_project, "C", status: ItemStatus.Ordered);
        _db.AddItem(_db.AddProject("Other"), "D", status: ItemStatus.Received);

        var summary = await _service.GetAsync(_project.Id);

        Assert.Equal(2, summary.ItemCountsByStatus[ItemStatus.Needed]);
        Assert.Equal(0, summary.ItemCountsByStatus[ItemStatus.Sourcing]);
        Assert.Equal(1, summary.ItemCountsByStatus[ItemStatus.Ordered]);
        Assert.Equal(0, summary.ItemCountsByStatus[ItemStatus.Received]);
    }

    [Fact(DisplayName = "projects: Total uses agreed price over asking price, times quantity")]
    public async Task TotalUsesAgreedOverAskingTimesQuantity()
    {
        _db.AddOffer(_db.AddItem(_project, "A", quantity: 2), _listing, asking: Price(100), agreed: Price(90), isChosen: true);
        _db.AddOffer(_db.AddItem(_project, "B", quantity: 1), _listing, asking: Price(50), isChosen: true);

        var summary = await _service.GetAsync(_project.Id);

        Assert.Equal([Price(230)], summary.Totals);
    }

    [Fact(DisplayName = "projects: Totals are kept per currency")]
    public async Task TotalsAreKeptPerCurrency()
    {
        _db.AddOffer(_db.AddItem(_project, "A"), _listing, asking: Price(1000, "UAH"), isChosen: true);
        _db.AddOffer(_db.AddItem(_project, "B"), _listing, asking: Price(25, "EUR"), isChosen: true);
        _db.AddOffer(_db.AddItem(_project, "C"), _listing, asking: Price(500, "UAH"), isChosen: false);

        var summary = await _service.GetAsync(_project.Id);

        Assert.Equal([Price(25, "EUR"), Price(1000, "UAH")], summary.Totals);
    }

    [Fact(DisplayName = "projects: Totals may exceed the single-price limit")]
    public async Task TotalsMayExceedTheSinglePriceLimit()
    {
        _db.AddOffer(_db.AddItem(_project, "A", quantity: 2), _listing, agreed: Price(999_999_999.99m), isChosen: true);

        var summary = await _service.GetAsync(_project.Id);

        Assert.Equal([Price(1_999_999_999.98m)], summary.Totals);
    }

    [Fact(DisplayName = "projects: Missing choices and prices are reported")]
    public async Task MissingChoicesAndPricesAreReported()
    {
        var withoutChoice = _db.AddItem(_project, "Inverter");
        _db.AddOffer(withoutChoice, _listing, asking: Price(12000));
        var unpriced = _db.AddOffer(_db.AddItem(_project, "Battery"), _listing, isChosen: true);

        var summary = await _service.GetAsync(_project.Id);

        Assert.Equal([withoutChoice], summary.ItemsWithoutChosenOffer);
        Assert.Equal([unpriced], summary.ChosenOffersWithoutPrice);
        Assert.Empty(summary.Totals);
    }

    [Fact(DisplayName = "projects: Summary endpoint (BLL unknown project)")]
    public async Task UnknownProject() =>
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync(Guid.NewGuid()));
}
