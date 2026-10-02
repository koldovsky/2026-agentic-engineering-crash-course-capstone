using BOMKeeper.Api.Contracts;
using BOMKeeper.Api.Errors;
using BOMKeeper.Api.OpenApi;
using BOMKeeper.BLL;
using BOMKeeper.DAL;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;

var builder = WebApplication.CreateBuilder(args);

// Composition root (ADR 0004): the only place in the Api that touches the DAL, through its
// registration extensions only.
builder.AddServiceDefaults();
builder.AddBomKeeperDatabase();
builder.Services.AddBomKeeperServices();

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<BllExceptionHandler>();
builder.Services
    .AddControllers(options =>
    {
        // Validation errors are keyed by JSON property path (`name`, `askingPrice.amount`), as in the BLL.
        options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());
        ApiJson.AcceptJsonOnly(options);
    })
    .AddJsonOptions(options => ApiJson.Configure(options.JsonSerializerOptions))
    .ConfigureApiBehaviorOptions(options =>
        options.InvalidModelStateResponseFactory = ProblemDetailsResult.ForInvalidModelState);

// The OpenAPI generator reads the minimal-API JSON options, so they match the MVC ones.
builder.Services.ConfigureHttpJsonOptions(options => ApiJson.Configure(options.SerializerOptions));
builder.Services.AddOpenApi(options => options.AddContractTransformers());

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    await app.Services.MigrateBomKeeperDatabaseAsync();
    app.MapOpenApi();
}

// The Api also serves the Angular build from wwwroot (ADR 0005).
app.UseStaticFiles();
app.MapDefaultEndpoints();
app.MapControllers();

// Unknown /api routes are 404 problem details, never the SPA page.
app.MapFallback("/api/{**path}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound));
app.MapFallbackToFile("index.html");

await app.RunAsync();
