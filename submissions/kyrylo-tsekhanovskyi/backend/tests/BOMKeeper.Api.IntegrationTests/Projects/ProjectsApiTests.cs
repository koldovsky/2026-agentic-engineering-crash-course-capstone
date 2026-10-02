using System.Net;
using System.Net.Http.Json;
using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Projects;

[Collection(ApiTests.Name)]
public sealed class ProjectsApiTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact(DisplayName = "projects: Create a project")]
    public async Task CreateProject()
    {
        using var response = await Client.PostAsJsonAsync(
            new Uri("/api/projects", UriKind.Relative),
            new { name = "  Solar station  ", description = "Panels on the roof" });

        var body = await ExpectAsync(response, 201);
        var id = body.GetProperty("id").GetString();
        Assert.NotNull(response.Headers.Location);
        Assert.EndsWith($"/api/projects/{id}", response.Headers.Location.ToString(), StringComparison.Ordinal);
        Assert.Equal("Solar station", body.GetProperty("name").GetString());
        Assert.Equal("Panels on the roof", body.GetProperty("description").GetString());
        Assert.True(body.GetProperty("createdAt").TryGetDateTimeOffset(out _));
    }

    [Fact(DisplayName = "projects: Get a project")]
    public async Task GetProject()
    {
        var id = await CreateProjectAsync("Smart home");

        var body = await GetAsync($"/api/projects/{id}");

        Assert.Equal(id, body.GetProperty("id").GetString());
        Assert.Equal("Smart home", body.GetProperty("name").GetString());
    }

    [Fact(DisplayName = "projects: Update a project")]
    public async Task UpdateProject()
    {
        var created = await PostAsync("/api/projects", new { name = "Solar", description = (string?)null });
        var id = created.GetProperty("id").GetString();

        var body = await PutAsync($"/api/projects/{id}", new { name = "Solar station", description = "10 kW" });

        Assert.Equal("Solar station", body.GetProperty("name").GetString());
        Assert.Equal("10 kW", body.GetProperty("description").GetString());
        Assert.Equal(
            created.GetProperty("createdAt").GetDateTimeOffset(),
            body.GetProperty("createdAt").GetDateTimeOffset());
    }

    [Theory(DisplayName = "projects: Validation error shape")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ValidationErrorShape(string name)
    {
        using var response = await Client.PostAsJsonAsync(new Uri("/api/projects", UriKind.Relative), new { name });

        var body = await ExpectAsync(response, 400);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.True(body.GetProperty("errors").TryGetProperty("name", out _), body.ToString());
    }

    [Fact(DisplayName = "projects: Unknown id")]
    public async Task UnknownId()
    {
        using var response = await Client.GetAsync(new Uri($"/api/projects/{Guid.NewGuid()}", UriKind.Relative));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
}
