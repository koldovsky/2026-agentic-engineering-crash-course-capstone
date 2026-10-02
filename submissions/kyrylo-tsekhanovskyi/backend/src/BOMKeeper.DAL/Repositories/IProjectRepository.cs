using BOMKeeper.Entities;

namespace BOMKeeper.DAL.Repositories;

public interface IProjectRepository
{
    Task<Project?> FindAsync(Guid id, CancellationToken cancellationToken = default);

    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    // Newest first, with the number of items and listings of each project.
    Task<IReadOnlyList<ProjectCounts>> ListWithCountsAsync(CancellationToken cancellationToken = default);

    void Add(Project project);

    void Remove(Project project);
}

public sealed record ProjectCounts(Project Project, int ItemCount, int ListingCount);
