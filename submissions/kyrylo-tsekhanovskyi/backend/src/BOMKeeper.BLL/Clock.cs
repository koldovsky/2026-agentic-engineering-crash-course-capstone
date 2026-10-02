namespace BOMKeeper.BLL;

internal static class Clock
{
    // The current UTC time at the precision PostgreSQL stores (microseconds), so a value returned on
    // creation equals the value read back later.
    public static DateTimeOffset UtcNow(this TimeProvider time)
    {
        var now = time.GetUtcNow();
        return now.AddTicks(-(now.Ticks % (TimeSpan.TicksPerMillisecond / 1000)));
    }
}
