using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace BOMKeeper.Api.Contracts;

// JSON as the contract describes it (design D4), for MVC and for the OpenAPI generator alike.
internal static class ApiJson
{
    // Enums by name only, and numbers as JSON numbers only (no numbers in strings).
    public static void Configure(JsonSerializerOptions options)
    {
        options.Converters.Add(new JsonStringEnumConverter(namingPolicy: null, allowIntegerValues: false));
        options.NumberHandling = JsonNumberHandling.Strict;
    }

    // Request bodies are `application/json` only, as in the contract.
    public static void AcceptJsonOnly(MvcOptions options)
    {
        foreach (var formatter in options.InputFormatters.OfType<SystemTextJsonInputFormatter>())
        {
            formatter.SupportedMediaTypes.Remove("text/json");
            formatter.SupportedMediaTypes.Remove("application/*+json");
        }
    }
}
