using System.Net;
using System.Net.Http.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Offers;

// Findings of docs/reviews/2026-09-30-be-be-checker.md (task 14.1).
[Collection(ApiTests.Name)]
public sealed class ReviewFindingsApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    private readonly ApiFactory _factory = factory;

    [Fact(DisplayName = "review: a retried choice switch leaves the response and the database in agreement")]
    public async Task RetriedChoiceSwitchAgrees()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var first = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 1"));
        var second = await CreateOfferAsync(itemId, await CreateListingAsync(projectId, "Ad 2"));
        await PatchAsync($"/api/offers/{first}/choice", new { isChosen = true });

        _factory.CommitFaults.FailNextCommit();
        var body = await PatchAsync($"/api/offers/{second}/choice", new { isChosen = true });

        Assert.True(body.GetProperty("isChosen").GetBoolean());
        var chosen = (await GetAsync($"/api/items/{itemId}/offers")).EnumerateArray()
            .Where(o => o.GetProperty("isChosen").GetBoolean())
            .Select(o => o.GetProperty("id").GetString());
        Assert.Equal([second], chosen);
    }

    [Fact(DisplayName = "review: concurrent duplicate links return 409, never 500")]
    public async Task ConcurrentDuplicatesReturnConflict()
    {
        var projectId = await CreateProjectAsync();
        var itemId = await CreateItemAsync(projectId);
        var listingId = await CreateListingAsync(projectId);

        var responses = await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
        {
            using var response = await Client.PostAsJsonAsync(
                new Uri($"/api/items/{itemId}/offers", UriKind.Relative), new { listingId });
            return (response.StatusCode, Body: await response.Content.ReadAsStringAsync());
        }));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
        Assert.All(
            responses.Where(r => r.StatusCode != HttpStatusCode.Created),
            r =>
            {
                Assert.True(r.StatusCode == HttpStatusCode.Conflict, $"{(int)r.StatusCode}: {r.Body}");
                Assert.Contains("/problems/duplicate-offer", r.Body, StringComparison.Ordinal);
            });
    }
}
