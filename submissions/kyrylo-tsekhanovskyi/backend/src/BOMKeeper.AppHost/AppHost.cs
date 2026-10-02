// Launcher only (ADR 0005): PostgreSQL 17 in Docker with a persistent volume, and the Api that serves
// both the REST API and the Angular build. The connection string is injected as ConnectionStrings__bomkeeper.
var builder = DistributedApplication.CreateBuilder(args);

var database = builder.AddPostgres("pg")
    .WithImageTag("17")
    .WithDataVolume("bomkeeper-data")
    .AddDatabase("bomkeeper");

builder.AddProject<Projects.BOMKeeper_Api>("api")
    .WithReference(database)
    .WaitFor(database)
    .WithExternalHttpEndpoints();

await builder.Build().RunAsync();
