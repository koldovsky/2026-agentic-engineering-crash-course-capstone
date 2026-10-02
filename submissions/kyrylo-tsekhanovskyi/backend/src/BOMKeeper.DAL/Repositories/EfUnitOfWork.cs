using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace BOMKeeper.DAL.Repositories;

internal sealed class EfUnitOfWork(BomKeeperDbContext context) : IUnitOfWork
{
    public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: { } constraint,
        })
        {
            throw new UniqueConstraintViolationException(constraint, exception);
        }
    }

    // The Aspire Npgsql registration enables a retrying execution strategy, which only allows a
    // user-initiated transaction inside the strategy: the whole unit is retried together. A save that
    // succeeded before a failed commit leaves accepted values in the change tracker, so every attempt
    // starts from an empty tracker and the work reloads what it changes.
    public Task ExecuteInTransactionAsync(Func<CancellationToken, Task> work, CancellationToken cancellationToken = default) =>
        context.Database.CreateExecutionStrategy().ExecuteAsync(
            work,
            async (inner, token) =>
            {
                context.ChangeTracker.Clear();
                await using var transaction = await context.Database.BeginTransactionAsync(token);
                await inner(token);
                await transaction.CommitAsync(token);
            },
            cancellationToken);
}
