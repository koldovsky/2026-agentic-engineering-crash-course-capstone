using System.Net.Http.Json;
using System.Text.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Listings;

[Collection(ApiTests.Name)]
public sealed class ListingsApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    private const string OlxUrl = "https://www.olx.ua/d/uk/obyavlenie/inverter-battery-bundle.html";

    [Fact(DisplayName = "listings: Add a listing")]
    public async Task AddListing()
    {
        var projectId = await CreateProjectAsync();

        using var response = await Client.PostAsJsonAsync(
            new Uri($"/api/projects/{projectId}/listings", UriKind.Relative),
            new { title = "Inverter + battery bundle", url = OlxUrl, platform = "OLX" });

        var body = await ExpectAsync(response, 201);
        var id = body.GetProperty("id").GetString();
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/api/listings/{id}", response.Headers.Location.ToString(), StringComparison.Ordinal);
        Assert.Equal(projectId, body.GetProperty("projectId").GetString());
        Assert.Equal("Inverter + battery bundle", body.GetProperty("title").GetString());
        Assert.Equal(OlxUrl, body.GetProperty("url").GetString());
        Assert.Equal("OLX", body.GetProperty("platform").GetString());
        Assert.Equal("Found", body.GetProperty("status").GetString());
        Assert.True(body.GetProperty("statusChangedAt").TryGetDateTimeOffset(out _));
        Assert.Equal(JsonValueKind.Null, body.GetProperty("agreedTotal").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("sellerName").ValueKind);
    }

    [Fact(DisplayName = "listings: List listings")]
    public async Task ListListings()
    {
        var projectId = await CreateProjectAsync();
        await PostAsync($"/api/projects/{projectId}/listings", new { title = "Bundle", url = OlxUrl, platform = "OLX" });
        await PostAsync(
            $"/api/projects/{projectId}/listings",
            new { title = "Battery", url = "https://www.ebay.com/itm/1", platform = "eBay" });

        var list = await GetAsync($"/api/projects/{projectId}/listings");

        Assert.Equal(["Bundle", "Battery"], list.EnumerateArray().Select(l => l.GetProperty("title").GetString()));
        Assert.All(list.EnumerateArray(), l =>
        {
            Assert.Equal("Found", l.GetProperty("status").GetString());
            Assert.True(l.GetProperty("statusChangedAt").TryGetDateTimeOffset(out _));
        });
        Assert.Equal(["OLX", "eBay"], list.EnumerateArray().Select(l => l.GetProperty("platform").GetString()));
    }

    [Fact(DisplayName = "listings: Update a listing")]
    public async Task UpdateListing()
    {
        var projectId = await CreateProjectAsync();
        var created = await PostAsync(
            $"/api/projects/{projectId}/listings",
            new { title = "Bundle", url = OlxUrl, platform = "OLX" });
        var id = created.GetProperty("id").GetString();

        var body = await PutAsync($"/api/listings/{id}", new
        {
            title = "Inverter + battery bundle",
            url = OlxUrl,
            platform = "OLX",
            sellerName = "Taras",
            sellerContact = "+380 67 000 00 00",
            notes = "Pickup in Lviv",
            agreedTotal = new { amount = 45000.50m, currency = "UAH" },
        });

        Assert.Equal("Inverter + battery bundle", body.GetProperty("title").GetString());
        Assert.Equal("Taras", body.GetProperty("sellerName").GetString());
        Assert.Equal(45000.50m, body.GetProperty("agreedTotal").GetProperty("amount").GetDecimal());
        Assert.Equal("UAH", body.GetProperty("agreedTotal").GetProperty("currency").GetString());
        Assert.Equal("Found", body.GetProperty("status").GetString());
        Assert.Equal(created.GetProperty("statusChangedAt").GetDateTimeOffset(), body.GetProperty("statusChangedAt").GetDateTimeOffset());
        Assert.Equal(body.GetRawText(), (await GetAsync($"/api/listings/{id}")).GetRawText());
    }

    [Fact(DisplayName = "listings: Set status through the API")]
    public async Task SetStatus()
    {
        var projectId = await CreateProjectAsync();
        var created = await PostAsync($"/api/projects/{projectId}/listings", new { title = "Bundle", url = OlxUrl, platform = "OLX" });

        var body = await PatchAsync($"/api/listings/{created.GetProperty("id").GetString()}/status", new { status = "Negotiating" });

        Assert.Equal("Negotiating", body.GetProperty("status").GetString());
        Assert.True(body.GetProperty("statusChangedAt").GetDateTimeOffset() >= created.GetProperty("statusChangedAt").GetDateTimeOffset());
    }

    [Fact(DisplayName = "projects: List projects with counts")]
    public async Task ListProjectsWithCounts()
    {
        var older = await CreateProjectAsync("Smart home");
        var newer = await CreateProjectAsync("Solar station");
        await PostAsync($"/api/projects/{newer}/items", new { name = "Inverter", quantity = 1 });
        await PostAsync($"/api/projects/{newer}/items", new { name = "Battery", quantity = 2 });
        await PostAsync($"/api/projects/{newer}/listings", new { title = "Bundle", url = OlxUrl, platform = "OLX" });

        var list = (await GetAsync("/api/projects")).EnumerateArray().ToList();

        Assert.Equal([newer, older], list.Select(p => p.GetProperty("id").GetString()));
        Assert.Equal(2, list[0].GetProperty("itemCount").GetInt32());
        Assert.Equal(1, list[0].GetProperty("listingCount").GetInt32());
        Assert.Equal(0, list[1].GetProperty("itemCount").GetInt32());
        Assert.Equal(0, list[1].GetProperty("listingCount").GetInt32());
    }
}
