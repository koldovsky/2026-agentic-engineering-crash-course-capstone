using System.Net.Http.Json;
using System.Text.Json;
using Npgsql;

namespace BOMKeeper.Api.IntegrationTests.Infrastructure;

// Base for API tests: an HttpClient on the shared host, and a clean database before every test
// (design D7: migrations are applied once, tables are truncated between tests).
public abstract class ApiTestBase(ApiFactory factory) : IAsyncLifetime
{
    private const string ResetSql = """
        DO $$
        DECLARE tables text;
        BEGIN
          SELECT string_agg(format('%I.%I', schemaname, tablename), ', ') INTO tables
          FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> '__EFMigrationsHistory';
          IF tables IS NOT NULL THEN
            EXECUTE 'TRUNCATE ' || tables || ' RESTART IDENTITY CASCADE';
          END IF;
        END $$;
        """;

    // Creating the client starts the host once per collection, which applies the migrations.
    protected HttpClient Client { get; } = factory.CreateClient();

    public async Task InitializeAsync()
    {
        await using var connection = new NpgsqlConnection(factory.ConnectionString);
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(ResetSql, connection);
        await command.ExecuteNonQueryAsync();
    }

    public Task DisposeAsync()
    {
        Client.Dispose();
        return Task.CompletedTask;
    }

    protected async Task<JsonElement> PostAsync(string url, object body, int expectedStatus = 201)
    {
        using var response = await Client.PostAsJsonAsync(new Uri(url, UriKind.Relative), body);
        return await ExpectAsync(response, expectedStatus);
    }

    protected async Task<JsonElement> GetAsync(string url, int expectedStatus = 200)
    {
        using var response = await Client.GetAsync(new Uri(url, UriKind.Relative));
        return await ExpectAsync(response, expectedStatus);
    }

    protected async Task<JsonElement> PutAsync(string url, object body, int expectedStatus = 200)
    {
        using var response = await Client.PutAsJsonAsync(new Uri(url, UriKind.Relative), body);
        return await ExpectAsync(response, expectedStatus);
    }

    protected async Task<JsonElement> PatchAsync(string url, object body, int expectedStatus = 200)
    {
        using var response = await Client.PatchAsJsonAsync(new Uri(url, UriKind.Relative), body);
        return await ExpectAsync(response, expectedStatus);
    }

    protected async Task DeleteAsync(string url, int expectedStatus = 204)
    {
        using var response = await Client.DeleteAsync(new Uri(url, UriKind.Relative));
        await ExpectAsync(response, expectedStatus);
    }

    // Creates a project and returns its id.
    protected async Task<string> CreateProjectAsync(string name = "Solar station") =>
        (await PostAsync("/api/projects", new { name })).GetProperty("id").GetString()!;

    // Adds an item to a project and returns its id.
    protected async Task<string> CreateItemAsync(string projectId, string name = "Inverter", int quantity = 1) =>
        (await PostAsync($"/api/projects/{projectId}/items", new { name, quantity })).GetProperty("id").GetString()!;

    // Adds an OLX listing to a project and returns its id.
    protected async Task<string> CreateListingAsync(string projectId, string title = "Inverter + battery bundle") =>
        (await PostAsync(
            $"/api/projects/{projectId}/listings",
            new { title, url = $"https://www.olx.ua/d/uk/obyavlenie/{Guid.NewGuid():N}.html", platform = "OLX" }))
        .GetProperty("id").GetString()!;

    // Links an item to a listing with an optional asking price in UAH and returns the offer id.
    protected async Task<string> CreateOfferAsync(string itemId, string listingId, decimal? askingUah = null) =>
        (await PostAsync(
            $"/api/items/{itemId}/offers",
            new { listingId, askingPrice = askingUah is { } amount ? new { amount, currency = "UAH" } : null }))
        .GetProperty("id").GetString()!;

    protected static async Task<JsonElement> ExpectAsync(HttpResponseMessage response, int expectedStatus)
    {
        var text = await response.Content.ReadAsStringAsync();
        Assert.True(
            (int)response.StatusCode == expectedStatus,
            $"Expected {expectedStatus}, got {(int)response.StatusCode}: {text}");
        if (text.Length == 0)
        {
            return default;
        }

        using var document = JsonDocument.Parse(text);
        return document.RootElement.Clone();
    }
}
