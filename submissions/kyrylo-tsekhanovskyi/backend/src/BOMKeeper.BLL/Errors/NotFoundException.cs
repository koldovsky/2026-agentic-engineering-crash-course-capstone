namespace BOMKeeper.BLL.Errors;

// An unknown id.
public sealed class NotFoundException : Exception
{
    public NotFoundException()
    {
    }

    public NotFoundException(string message)
        : base(message)
    {
    }

    public NotFoundException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public static NotFoundException For(string resource, Guid id) => new($"{resource} '{id}' does not exist.");
}
