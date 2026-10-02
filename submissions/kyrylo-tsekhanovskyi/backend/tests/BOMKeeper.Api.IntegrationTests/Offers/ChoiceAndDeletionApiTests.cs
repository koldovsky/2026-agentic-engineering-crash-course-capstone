using System.Text.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Offers;

[Collection(ApiTests.Name)]
public sealed class ChoiceAndDeletionApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact(DisplayName = "offers: Switching back and forth")]
    public async Task SwitchingBackAndForth()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var offer1 = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 1"), 12000);
        var offer2 = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 2"), 11000);

        foreach (var offerId in new[] { offer1, offer2, offer1 })
        {
            var body = await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = true });
            Assert.True(body.GetProperty("isChosen").GetBoolean());

            Assert.Equal([offerId], await ChosenOfferIdsAsync(itemId));
        }
    }

    [Fact(DisplayName = "offers: Choose through the API")]
    public async Task ChooseThroughTheApi()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var first = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 1"));
        var second = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 2"));
        await PatchAsync($"/api/offers/{first}/choice", new { isChosen = true });

        var body = await PatchAsync($"/api/offers/{second}/choice", new { isChosen = true });

        Assert.Equal(second, body.GetProperty("id").GetString());
        Assert.True(body.GetProperty("isChosen").GetBoolean());
        Assert.Equal([second], await ChosenOfferIdsAsync(itemId));
    }

    [Fact(DisplayName = "offers: Un-choose an offer (API)")]
    public async Task UnChooseThroughTheApi()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var offerId = await CreateOfferAsync(itemId, await CreateListingAsync(projectId));
        await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = true });

        var body = await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = false });

        Assert.False(body.GetProperty("isChosen").GetBoolean());
        Assert.Empty(await ChosenOfferIdsAsync(itemId));
        Assert.Equal(JsonValueKind.Null, (await GetAsync($"/api/items/{itemId}")).GetProperty("chosenOffer").ValueKind);
    }

    [Fact(DisplayName = "offers: Delete an offer")]
    public async Task DeleteAnOffer()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var offerId = await CreateOfferAsync(itemId, await CreateListingAsync(projectId), 12000);
        await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = true });

        await DeleteAsync($"/api/offers/{offerId}");

        Assert.Empty((await GetAsync($"/api/items/{itemId}/offers")).EnumerateArray());
        Assert.Equal(JsonValueKind.Null, (await GetAsync($"/api/items/{itemId}")).GetProperty("chosenOffer").ValueKind);
    }

    [Fact(DisplayName = "items: List items with chosen offers")]
    public async Task ListItemsWithChosenOffers()
    {
        var projectId = await CreateProjectAsync();
        var inverter = await CreateItemAsync(projectId, "Inverter");
        var battery = await CreateItemAsync(projectId, "Battery");
        var listingId = await CreateListingAsync(projectId, "Inverter ad");
        var offerId = await CreateOfferAsync(inverter, listingId, 12000);
        await PutAsync(
            $"/api/offers/{offerId}",
            new { askingPrice = new { amount = 12000, currency = "UAH" }, agreedPrice = new { amount = 11000, currency = "UAH" } });
        await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = true });

        var items = (await GetAsync($"/api/projects/{projectId}/items")).EnumerateArray().ToList();

        Assert.Equal([inverter, battery], items.Select(i => i.GetProperty("id").GetString()));
        var chosen = items[0].GetProperty("chosenOffer");
        Assert.Equal(offerId, chosen.GetProperty("offerId").GetString());
        Assert.Equal(listingId, chosen.GetProperty("listingId").GetString());
        Assert.Equal("Inverter ad", chosen.GetProperty("listingTitle").GetString());
        Assert.Equal(11000m, chosen.GetProperty("unitPrice").GetProperty("amount").GetDecimal());
        Assert.Equal("UAH", chosen.GetProperty("unitPrice").GetProperty("currency").GetString());
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("chosenOffer").ValueKind);
        Assert.Equal(chosen.GetRawText(), (await GetAsync($"/api/items/{inverter}")).GetProperty("chosenOffer").GetRawText());
    }

    [Fact(DisplayName = "items: Delete an item and its offers")]
    public async Task DeleteAnItemAndItsOffers()
    {
        var projectId = await CreateProjectAsync();
        var inverter = await CreateItemAsync(projectId, "Inverter");
        var battery = await CreateItemAsync(projectId, "Battery");
        var listingId = await CreateListingAsync(projectId);
        await CreateOfferAsync(inverter, listingId);
        await CreateOfferAsync(battery, listingId);

        await DeleteAsync($"/api/items/{inverter}");

        var offers = (await GetAsync($"/api/listings/{listingId}/offers")).EnumerateArray().ToList();
        Assert.Equal(["Battery"], offers.Select(o => o.GetProperty("itemName").GetString()));
        await GetAsync($"/api/listings/{listingId}");
        await GetAsync($"/api/items/{inverter}", 404);
    }

    [Fact(DisplayName = "listings: Delete a listing, keep the items")]
    public async Task DeleteAListingKeepTheItems()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var listingId = await CreateListingAsync(projectId);
        var offerId = await CreateOfferAsync(itemId, listingId, 12000);
        await PatchAsync($"/api/offers/{offerId}/choice", new { isChosen = true });

        await DeleteAsync($"/api/listings/{listingId}");

        var item = await GetAsync($"/api/items/{itemId}");
        Assert.Equal(JsonValueKind.Null, item.GetProperty("chosenOffer").ValueKind);
        Assert.Empty((await GetAsync($"/api/items/{itemId}/offers")).EnumerateArray());
        await GetAsync($"/api/listings/{listingId}", 404);
    }

    [Fact(DisplayName = "projects: Delete a project and its data")]
    public async Task DeleteAProjectAndItsData()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var listingId = await CreateListingAsync(projectId);
        var offerId = await CreateOfferAsync(itemId, listingId, 12000);
        var otherProject = await CreateProjectAsync("Smart home");
        var otherItem = await CreateItemAsync(otherProject);

        await DeleteAsync($"/api/projects/{projectId}");

        await GetAsync($"/api/projects/{projectId}", 404);
        await GetAsync($"/api/projects/{projectId}/items", 404);
        await GetAsync($"/api/projects/{projectId}/listings", 404);
        await GetAsync($"/api/items/{itemId}", 404);
        await GetAsync($"/api/items/{itemId}/offers", 404);
        await GetAsync($"/api/listings/{listingId}", 404);
        await GetAsync($"/api/listings/{listingId}/offers", 404);
        await PutAsync($"/api/offers/{offerId}", new { askingPrice = (object?)null, agreedPrice = (object?)null }, 404);
        await GetAsync($"/api/items/{otherItem}");
    }

    private async Task<List<string?>> ChosenOfferIdsAsync(string itemId) =>
        [.. (await GetAsync($"/api/items/{itemId}/offers")).EnumerateArray()
            .Where(o => o.GetProperty("isChosen").GetBoolean())
            .Select(o => o.GetProperty("id").GetString())];
}
