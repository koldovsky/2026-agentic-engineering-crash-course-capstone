using BOMKeeper.DAL.Configurations;
using BOMKeeper.Entities;
using Microsoft.EntityFrameworkCore;

namespace BOMKeeper.DAL.Repositories;

internal sealed class ProjectRepository(BomKeeperDbContext context) : IProjectRepository
{
    public Task<Project?> FindAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Set<Project>().FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        context.Set<Project>().AnyAsync(p => p.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ProjectCounts>> ListWithCountsAsync(CancellationToken cancellationToken = default) =>
        await context.Set<Project>()
            .AsNoTracking()
            .NewestFirst()
            .Select(p => new ProjectCounts(
                p,
                context.Set<Item>().Count(i => i.ProjectId == p.Id),
                context.Set<Listing>().Count(l => l.ProjectId == p.Id)))
            .ToListAsync(cancellationToken);

    public void Add(Project project) => context.Add(project);

    public void Remove(Project project) => context.Remove(project);
}
