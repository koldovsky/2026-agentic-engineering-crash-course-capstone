using System.ComponentModel.DataAnnotations;
using BOMKeeper.BLL.Projects;

namespace BOMKeeper.Api.Contracts;

// Request and response bodies of the projects operations. Names, bounds and `required` lists mirror
// contracts/openapi.yaml; the BLL stays the authority for every rule (design D4).
public sealed class ProjectInput
{
    [StringLength(ProjectService.NameMaxLength, MinimumLength = 1)]
    public required string Name { get; init; }

    [MaxLength(ProjectService.DescriptionMaxLength)]
    public string? Description { get; init; }

    public ProjectDraft ToBll() => new(Name, Description);
}

public sealed class Project
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string? Description { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }

    public static Project From(Entities.Project project) => new()
    {
        Id = project.Id,
        Name = project.Name,
        Description = project.Description,
        CreatedAt = project.CreatedAt,
    };
}

public sealed class ProjectListEntry
{
    public required Guid Id { get; init; }

    public required string Name { get; init; }

    public required string? Description { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }

    public required int ItemCount { get; init; }

    public required int ListingCount { get; init; }

    public static ProjectListEntry From(ProjectOverview overview) => new()
    {
        Id = overview.Project.Id,
        Name = overview.Project.Name,
        Description = overview.Project.Description,
        CreatedAt = overview.Project.CreatedAt,
        ItemCount = overview.ItemCount,
        ListingCount = overview.ListingCount,
    };
}
