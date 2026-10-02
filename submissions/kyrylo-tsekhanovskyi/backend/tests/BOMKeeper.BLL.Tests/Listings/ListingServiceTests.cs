using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Listings;
using BOMKeeper.BLL.Tests.Fakes;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Tests.Listings;

public sealed class ListingServiceTests
{
    private static readonly DateTimeOffset Earlier = new(2026, 9, 1, 8, 0, 0, TimeSpan.Zero);

    private readonly FakeDatabase _db = new();
    private readonly ManualTimeProvider _time = new();
    private readonly ListingService _service;

    public ListingServiceTests() =>
        _service = new ListingService(new FakeProjectRepository(_db), new FakeListingRepository(_db), _db, _time);

    public static TheoryData<string> InvalidUrls => new()
    {
        "/d/uk/obyavlenie/inverter.html",
        "olx.ua/inverter",
        "ftp://files.example.com/inverter.pdf",
        "javascript:alert(1)",
        "https://example.com/" + new string('a', 2048 - "https://example.com/".Length + 1),
    };

    [Theory(DisplayName = "listings: Reject an invalid URL")]
    [MemberData(nameof(InvalidUrls))]
    public async Task RejectInvalidUrl(string url)
    {
        var project = _db.AddProject();
        var listing = _db.AddListing(project);

        var onCreate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(project.Id, Draft(url: url)));
        var onUpdate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.UpdateAsync(listing.Id, Draft(url: url)));

        Assert.Contains("url", onCreate.Errors.Keys);
        Assert.Contains("url", onUpdate.Errors.Keys);
        Assert.Single(_db.Listings);
    }

    [Fact(DisplayName = "listings: Reject an invalid URL (a 2048-character URL is accepted)")]
    public async Task LongestUrlIsAccepted()
    {
        var url = "https://example.com/" + new string('a', 2048 - "https://example.com/".Length);

        var listing = await _service.CreateAsync(_db.AddProject().Id, Draft(url: url));

        Assert.Equal(url, listing.Url);
    }

    [Fact(DisplayName = "listings: Editing fields keeps the status time")]
    public async Task EditingFieldsKeepsStatusTime()
    {
        var listing = _db.AddListing(_db.AddProject(), ListingStatus.Contacted, Earlier);

        var updated = await _service.UpdateAsync(listing.Id, Draft(notes: "Seller asked to call after 18:00"));

        Assert.Equal("Seller asked to call after 18:00", updated.Notes);
        Assert.Equal(ListingStatus.Contacted, updated.Status);
        Assert.Equal(Earlier, updated.StatusChangedAt);
    }

    [Fact(DisplayName = "listings: Any transition is allowed")]
    public async Task AnyTransitionIsAllowed()
    {
        var listing = _db.AddListing(_db.AddProject(), ListingStatus.Scam, Earlier);

        var updated = await _service.SetStatusAsync(listing.Id, ListingStatus.Negotiating);

        Assert.Equal(ListingStatus.Negotiating, updated.Status);
        Assert.Equal(_time.Now, updated.StatusChangedAt);
    }

    [Fact(DisplayName = "listings: Setting the same status keeps the time")]
    public async Task SameStatusKeepsTime()
    {
        var listing = _db.AddListing(_db.AddProject(), ListingStatus.Contacted, Earlier);

        var updated = await _service.SetStatusAsync(listing.Id, ListingStatus.Contacted);

        Assert.Equal(ListingStatus.Contacted, updated.Status);
        Assert.Equal(Earlier, updated.StatusChangedAt);
    }

    [Fact(DisplayName = "listings: Add a listing (BLL)")]
    public async Task AddStartsInFoundAtCreationTime()
    {
        var project = _db.AddProject();

        var listing = await _service.CreateAsync(project.Id, Draft());

        Assert.Equal(ListingStatus.Found, listing.Status);
        Assert.Equal(_time.Now, listing.StatusChangedAt);
        Assert.Equal(project.Id, listing.ProjectId);
    }

    private static ListingDraft Draft(string url = "https://www.olx.ua/d/uk/obyavlenie/inverter.html", string? notes = null) =>
        new("Inverter + battery bundle", url, "OLX", "Taras", "+380 67 000 00 00", notes, null);
}
