using BOMKeeper.Api.Contracts;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace BOMKeeper.Api.OpenApi;

// Fills in what the OpenAPI generator cannot derive from the code, so /openapi/v1.json matches
// contracts/openapi.yaml (design D4, D5). Everything else comes from the controllers and DTOs.
internal static class ContractTransformers
{
    public static OpenApiOptions AddContractTransformers(this OpenApiOptions options)
    {
        options.AddOperationTransformer(AddLocationHeaderToCreated);
        options.AddSchemaTransformer(DescribeEnumsAsStrings);
        options.AddSchemaTransformer(BoundMoneyTotalBelowOnly);
        return options;
    }

    // Every 201 carries the URL of the created resource (CreatedAtRoute / Created set it).
    private static Task AddLocationHeaderToCreated(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        if (operation.Responses?.TryGetValue("201", out var response) == true && response is OpenApiResponse created)
        {
            created.Headers ??= new Dictionary<string, IOpenApiHeader>(StringComparer.Ordinal);
            created.Headers["Location"] = new OpenApiHeader
            {
                Description = "URL of the created resource",
                Schema = new OpenApiSchema { Type = JsonSchemaType.String },
            };
        }

        return Task.CompletedTask;
    }

    // Enums are serialized as their names (JsonStringEnumConverter), so their schema is a string enum.
    private static Task DescribeEnumsAsStrings(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        if (context.JsonTypeInfo.Type.IsEnum)
        {
            schema.Type = JsonSchemaType.String;
        }

        return Task.CompletedTask;
    }

    // A total has no upper bound (it may exceed the single-price limit), which [Range] cannot express.
    private static Task BoundMoneyTotalBelowOnly(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        if (context.JsonTypeInfo.Type == typeof(MoneyTotal)
            && schema.Properties?.TryGetValue("amount", out var amount) == true
            && amount is OpenApiSchema amountSchema)
        {
            amountSchema.Minimum = "0";
        }

        return Task.CompletedTask;
    }
}
