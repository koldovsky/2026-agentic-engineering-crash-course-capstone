using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Validation;
using BOMKeeper.DAL.Repositories;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Projects;

public sealed record ProjectDraft(string? Name, string? Description);

public sealed record ProjectOverview(Project Project, int ItemCount, int ListingCount);

// Creates, reads, edits and deletes projects.
public sealed class ProjectService(IProjectRepository projects, IUnitOfWork unitOfWork, TimeProvider time)
{
    public const int NameMaxLength = 200;
    public const int DescriptionMaxLength = 2000;

    public async Task<IReadOnlyList<ProjectOverview>> ListAsync(CancellationToken cancellationToken = default) =>
        [.. (await projects.ListWithCountsAsync(cancellationToken))
            .Select(row => new ProjectOverview(row.Project, row.ItemCount, row.ListingCount))];

    public async Task<Project> CreateAsync(ProjectDraft input, CancellationToken cancellationToken = default)
    {
        var (name, description) = Validate(input);
        var project = new Project
        {
            Id = Guid.CreateVersion7(),
            Name = name,
            Description = description,
            CreatedAt = time.UtcNow(),
        };

        projects.Add(project);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return project;
    }

    public async Task<Project> GetAsync(Guid id, CancellationToken cancellationToken = default) =>
        await projects.FindAsync(id, cancellationToken) ?? throw NotFoundException.For("Project", id);

    public async Task<Project> UpdateAsync(Guid id, ProjectDraft input, CancellationToken cancellationToken = default)
    {
        var project = await GetAsync(id, cancellationToken);
        (project.Name, project.Description) = Validate(input);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return project;
    }

    // Items, listings and offers go with the project (ON DELETE CASCADE, design D2).
    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        projects.Remove(await GetAsync(id, cancellationToken));
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private static (string Name, string? Description) Validate(ProjectDraft input)
    {
        var errors = new FieldErrors();
        var name = errors.RequiredText("name", input.Name, NameMaxLength);
        var description = errors.OptionalText("description", input.Description, DescriptionMaxLength);
        errors.ThrowIfAny();
        return (name, description);
    }
}
