using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Projects;

[Collection(ApiTests.Name)]
public sealed class SummaryApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact(DisplayName = "projects: Summary endpoint")]
    public async Task SummaryEndpoint()
    {
        var projectId = await CreateProjectAsync();
        var inverter = await CreateItemAsync(projectId, "Inverter", quantity: 2);
        var battery = await CreateItemAsync(projectId, "Battery");
        var cable = await CreateItemAsync(projectId, "Cable");
        await PatchAsync($"/api/items/{cable}/status", new { status = "Ordered" });
        var listingId = await CreateListingAsync(projectId, "Bundle");
        var inverterOffer = await CreateOfferAsync(inverter, listingId, 12000);
        var batteryOffer = await CreateOfferAsync(battery, listingId);
        await PatchAsync($"/api/offers/{inverterOffer}/choice", new { isChosen = true });
        await PatchAsync($"/api/offers/{batteryOffer}/choice", new { isChosen = true });

        var summary = await GetAsync($"/api/projects/{projectId}/summary");

        Assert.Equal(projectId, summary.GetProperty("projectId").GetString());
        var counts = summary.GetProperty("itemCountsByStatus");
        Assert.Equal(2, counts.GetProperty("needed").GetInt32());
        Assert.Equal(0, counts.GetProperty("sourcing").GetInt32());
        Assert.Equal(1, counts.GetProperty("ordered").GetInt32());
        Assert.Equal(0, counts.GetProperty("received").GetInt32());

        var total = Assert.Single(summary.GetProperty("totals").EnumerateArray());
        Assert.Equal(24000m, total.GetProperty("amount").GetDecimal());
        Assert.Equal("UAH", total.GetProperty("currency").GetString());

        var withoutChoice = Assert.Single(summary.GetProperty("itemsWithoutChosenOffer").EnumerateArray());
        Assert.Equal(cable, withoutChoice.GetProperty("id").GetString());
        Assert.Equal("Cable", withoutChoice.GetProperty("name").GetString());

        var unpriced = Assert.Single(summary.GetProperty("chosenOffersWithoutPrice").EnumerateArray());
        Assert.Equal(batteryOffer, unpriced.GetProperty("offerId").GetString());
        Assert.Equal(battery, unpriced.GetProperty("itemId").GetString());
        Assert.Equal("Battery", unpriced.GetProperty("itemName").GetString());
        Assert.Equal(listingId, unpriced.GetProperty("listingId").GetString());
        Assert.Equal("Bundle", unpriced.GetProperty("listingTitle").GetString());
    }

    [Fact(DisplayName = "projects: Summary endpoint (unknown project)")]
    public async Task SummaryOfUnknownProject() =>
        await GetAsync($"/api/projects/{Guid.NewGuid()}/summary", 404);
}
