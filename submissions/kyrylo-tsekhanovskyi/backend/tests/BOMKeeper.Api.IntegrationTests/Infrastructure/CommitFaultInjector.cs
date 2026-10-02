using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Npgsql;

namespace BOMKeeper.Api.IntegrationTests.Infrastructure;

// Fails the next transaction commit once with a transient Npgsql error, after the transaction's saves
// have run, so the retrying execution strategy retries the whole unit of work.
public sealed class CommitFaultInjector : DbTransactionInterceptor
{
    private int _armed;

    public void FailNextCommit() => Interlocked.Exchange(ref _armed, 1);

    public override ValueTask<InterceptionResult> TransactionCommittingAsync(
        DbTransaction transaction,
        TransactionEventData eventData,
        InterceptionResult result,
        CancellationToken cancellationToken = default)
    {
        if (Interlocked.Exchange(ref _armed, 0) == 1)
        {
            throw new NpgsqlException("Injected transient failure before commit.", new TimeoutException());
        }

        return ValueTask.FromResult(result);
    }
}
