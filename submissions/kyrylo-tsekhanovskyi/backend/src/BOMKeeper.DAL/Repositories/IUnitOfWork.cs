namespace BOMKeeper.DAL.Repositories;

// Saves the changes tracked by the repositories of the current scope.
public interface IUnitOfWork
{
    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    // Runs work (which may save several times, in order) inside one transaction, and commits it. The work
    // may run more than once (transient failures are retried), each time with an empty change tracker, so
    // it must load the entities it changes itself. Unsaved changes made before the call are discarded.
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> work, CancellationToken cancellationToken = default);
}
