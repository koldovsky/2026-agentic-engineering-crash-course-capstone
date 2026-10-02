using System.Net.Http.Json;
using System.Text.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Offers;

[Collection(ApiTests.Name)]
public sealed class OffersApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact(DisplayName = "offers: Create an offer")]
    public async Task CreateOffer()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId, "Inverter");
        var listingId = await CreateListingAsync(projectId, "Inverter + battery bundle");

        using var response = await Client.PostAsJsonAsync(
            new Uri($"/api/items/{itemId}/offers", UriKind.Relative),
            new { listingId, askingPrice = new { amount = 12000, currency = "UAH" } });

        var body = await ExpectAsync(response, 201);
        Assert.NotNull(response.Headers.Location);
        Assert.Equal(itemId, body.GetProperty("itemId").GetString());
        Assert.Equal("Inverter", body.GetProperty("itemName").GetString());
        Assert.Equal(listingId, body.GetProperty("listingId").GetString());
        Assert.Equal("Inverter + battery bundle", body.GetProperty("listingTitle").GetString());
        Assert.Equal("OLX", body.GetProperty("listingPlatform").GetString());
        Assert.Equal("Found", body.GetProperty("listingStatus").GetString());
        Assert.Equal(12000m, body.GetProperty("askingPrice").GetProperty("amount").GetDecimal());
        Assert.Equal("UAH", body.GetProperty("askingPrice").GetProperty("currency").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("agreedPrice").ValueKind);
        Assert.Equal("Unverified", body.GetProperty("fit").GetString());
        Assert.False(body.GetProperty("isChosen").GetBoolean());
    }

    [Fact(DisplayName = "offers: Rule violation over HTTP")]
    public async Task RuleViolationOverHttp()
    {
        var itemId = await CreateItemAsync(await CreateProjectAsync("Solar station"));
        var otherListingId = await CreateListingAsync(await CreateProjectAsync("Smart home"));

        using var response = await Client.PostAsJsonAsync(
            new Uri($"/api/items/{itemId}/offers", UriKind.Relative), new { listingId = otherListingId });

        var body = await ExpectAsync(response, 409);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.EndsWith("/problems/listing-in-other-project", body.GetProperty("type").GetString(), StringComparison.Ordinal);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("title").GetString()));
        Assert.Equal(409, body.GetProperty("status").GetInt32());
    }

    [Fact(DisplayName = "offers: Duplicate link over HTTP")]
    public async Task DuplicateLinkOverHttp()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var listingId = await CreateListingAsync(projectId);
        await PostAsync($"/api/items/{itemId}/offers", new { listingId });

        using var response = await Client.PostAsJsonAsync(new Uri($"/api/items/{itemId}/offers", UriKind.Relative), new { listingId });

        var body = await ExpectAsync(response, 409);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.EndsWith("/problems/duplicate-offer", body.GetProperty("type").GetString(), StringComparison.Ordinal);
    }

    [Fact(DisplayName = "offers: Update prices")]
    public async Task UpdatePrices()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var offerId = await CreateOfferAsync(itemId, await CreateListingAsync(projectId), askingUah: 12000);
        await PatchAsync($"/api/offers/{offerId}/fit", new { fit = "Fits" });

        var body = await PutAsync(
            $"/api/offers/{offerId}",
            new { askingPrice = new { amount = 12000, currency = "UAH" }, agreedPrice = new { amount = 11000, currency = "UAH" } });

        Assert.Equal(11000m, body.GetProperty("agreedPrice").GetProperty("amount").GetDecimal());
        Assert.Equal(12000m, body.GetProperty("askingPrice").GetProperty("amount").GetDecimal());
        Assert.Equal("Fits", body.GetProperty("fit").GetString());
        Assert.False(body.GetProperty("isChosen").GetBoolean());
    }

    [Fact(DisplayName = "offers: Offers of an item")]
    public async Task OffersOfAnItem()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "OLX inverter"), 12000);
        var ebayId = (await PostAsync(
            $"/api/projects/{projectId}/listings",
            new { title = "eBay inverter", url = "https://www.ebay.com/itm/42", platform = "eBay" })).GetProperty("id").GetString()!;
        await CreateOfferAsync(itemId, ebayId, 11000);
        await PatchAsync($"/api/listings/{ebayId}/status", new { status = "Contacted" });

        var offers = (await GetAsync($"/api/items/{itemId}/offers")).EnumerateArray().ToList();

        Assert.Equal(["OLX inverter", "eBay inverter"], offers.Select(o => o.GetProperty("listingTitle").GetString()));
        Assert.Equal(["OLX", "eBay"], offers.Select(o => o.GetProperty("listingPlatform").GetString()));
        Assert.Equal(["Found", "Contacted"], offers.Select(o => o.GetProperty("listingStatus").GetString()));
    }

    [Fact(DisplayName = "offers: Offers of a listing")]
    public async Task OffersOfAListing()
    {
        var projectId = await CreateProjectAsync();
        var listingId = await CreateListingAsync(projectId);
        await CreateOfferAsync(await CreateItemAsync(projectId, "Inverter"), listingId, 12000);
        await CreateOfferAsync(await CreateItemAsync(projectId, "Battery"), listingId, 30000);

        var offers = (await GetAsync($"/api/listings/{listingId}/offers")).EnumerateArray().ToList();

        Assert.Equal(["Inverter", "Battery"], offers.Select(o => o.GetProperty("itemName").GetString()));
    }

    [Fact(DisplayName = "offers: Set fit through the API")]
    public async Task SetFit()
    {
        var projectId = await CreateProjectAsync();
        var offerId = await CreateOfferAsync(await CreateItemAsync(projectId), await CreateListingAsync(projectId));

        var body = await PatchAsync($"/api/offers/{offerId}/fit", new { fit = "WrongItem" });

        Assert.Equal("WrongItem", body.GetProperty("fit").GetString());
    }
}
