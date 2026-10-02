using System.Net.Http.Json;
using System.Text.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Items;

[Collection(ApiTests.Name)]
public sealed class ItemsApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact(DisplayName = "items: Add an item")]
    public async Task AddItem()
    {
        var projectId = await CreateProjectAsync();

        using var response = await Client.PostAsJsonAsync(
            new Uri($"/api/projects/{projectId}/items", UriKind.Relative),
            new { name = "Inverter", quantity = 1, notes = "5 kW hybrid" });

        var body = await ExpectAsync(response, 201);
        var id = body.GetProperty("id").GetString();
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/api/items/{id}", response.Headers.Location.ToString(), StringComparison.Ordinal);
        Assert.Equal(projectId, body.GetProperty("projectId").GetString());
        Assert.Equal("Inverter", body.GetProperty("name").GetString());
        Assert.Equal(1, body.GetProperty("quantity").GetInt32());
        Assert.Equal("5 kW hybrid", body.GetProperty("notes").GetString());
        Assert.Equal("Needed", body.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("chosenOffer").ValueKind);
    }

    [Fact(DisplayName = "items: Unknown project")]
    public async Task UnknownProject() =>
        await PostAsync($"/api/projects/{Guid.NewGuid()}/items", new { name = "Inverter", quantity = 1 }, 404);

    [Fact(DisplayName = "items: Update an item")]
    public async Task UpdateItem()
    {
        var projectId = await CreateProjectAsync();
        var id = (await PostAsync($"/api/projects/{projectId}/items", new { name = "Battery", quantity = 1 }))
            .GetProperty("id").GetString();
        await PatchAsync($"/api/items/{id}/status", new { status = "Sourcing" });

        var body = await PutAsync($"/api/items/{id}", new { name = "LiFePO4 battery", quantity = 4, notes = "48 V" });

        Assert.Equal("LiFePO4 battery", body.GetProperty("name").GetString());
        Assert.Equal(4, body.GetProperty("quantity").GetInt32());
        Assert.Equal("48 V", body.GetProperty("notes").GetString());
        Assert.Equal("Sourcing", body.GetProperty("status").GetString());
        Assert.Equal(body.GetRawText(), (await GetAsync($"/api/items/{id}")).GetRawText());
    }

    [Fact(DisplayName = "items: Order is kept for rapid additions")]
    public async Task OrderIsKeptForRapidAdditions()
    {
        var projectId = await CreateProjectAsync();
        var names = Enumerable.Range(1, 20).Select(n => $"Part {n}").ToList();
        foreach (var name in names)
        {
            await PostAsync($"/api/projects/{projectId}/items", new { name, quantity = 1 });
        }

        var list = await GetAsync($"/api/projects/{projectId}/items");

        Assert.Equal(names, list.EnumerateArray().Select(i => i.GetProperty("name").GetString()));
    }

    [Fact(DisplayName = "items: Set status through the API")]
    public async Task SetStatus()
    {
        var projectId = await CreateProjectAsync();
        var id = (await PostAsync($"/api/projects/{projectId}/items", new { name = "Inverter", quantity = 1 }))
            .GetProperty("id").GetString();

        var body = await PatchAsync($"/api/items/{id}/status", new { status = "Ordered" });

        Assert.Equal("Ordered", body.GetProperty("status").GetString());
    }

    [Theory(DisplayName = "items: Unknown status value")]
    [InlineData("\"Lost\"")]
    [InlineData("7")]
    public async Task UnknownStatusValue(string status)
    {
        var projectId = await CreateProjectAsync();
        var id = (await PostAsync($"/api/projects/{projectId}/items", new { name = "Inverter", quantity = 1 }))
            .GetProperty("id").GetString();

        using var content = new StringContent($$"""{"status": {{status}}}""", System.Text.Encoding.UTF8, "application/json");
        using var response = await Client.PatchAsync(new Uri($"/api/items/{id}/status", UriKind.Relative), content);

        await ExpectAsync(response, 400);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
