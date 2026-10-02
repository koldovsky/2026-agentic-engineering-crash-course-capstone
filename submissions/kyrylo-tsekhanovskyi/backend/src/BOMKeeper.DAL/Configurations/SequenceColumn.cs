using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BOMKeeper.DAL.Configurations;

// Every table has a database-generated `seq bigint GENERATED ALWAYS AS IDENTITY` column that orders rows
// by insertion (design D2). It is a shadow property: the entities and the API never see it.
internal static class SequenceColumn
{
    public const string Name = "Seq";

    public static void HasSequenceColumn<T>(this EntityTypeBuilder<T> builder)
        where T : class
    {
        builder.Property<long>(Name).UseIdentityAlwaysColumn();
        builder.HasIndex(Name).IsUnique();
    }

    public static IOrderedQueryable<T> InInsertionOrder<T>(this IQueryable<T> query)
        where T : class =>
        query.OrderBy(e => EF.Property<long>(e, Name));

    public static IOrderedQueryable<T> NewestFirst<T>(this IQueryable<T> query)
        where T : class =>
        query.OrderByDescending(e => EF.Property<long>(e, Name));
}
