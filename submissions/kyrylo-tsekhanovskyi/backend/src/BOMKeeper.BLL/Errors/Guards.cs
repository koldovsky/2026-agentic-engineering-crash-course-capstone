using BOMKeeper.BLL.Validation;
using BOMKeeper.DAL.Repositories;

namespace BOMKeeper.BLL.Errors;

internal static class Guards
{
    public static async Task EnsureExistsAsync(this IProjectRepository projects, Guid projectId, CancellationToken cancellationToken)
    {
        if (!await projects.ExistsAsync(projectId, cancellationToken))
        {
            throw NotFoundException.For("Project", projectId);
        }
    }

    // Rejects enum values outside the declared members (the API only accepts names, this is the backstop).
    public static void EnsureDefined<TEnum>(TEnum value, string field)
        where TEnum : struct, Enum
    {
        if (!Enum.IsDefined(value))
        {
            var errors = new FieldErrors();
            errors.Add(field, $"'{value}' is not a known {typeof(TEnum).Name} value.");
            errors.ThrowIfAny();
        }
    }
}
