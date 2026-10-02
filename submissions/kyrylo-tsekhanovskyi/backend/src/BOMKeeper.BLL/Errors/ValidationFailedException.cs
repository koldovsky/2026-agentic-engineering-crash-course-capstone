namespace BOMKeeper.BLL.Errors;

// Invalid input. Errors are keyed by the JSON property path of the field (`name`, `askingPrice.amount`).
public sealed class ValidationFailedException : Exception
{
    public ValidationFailedException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more fields are invalid.") => Errors = errors;

    public ValidationFailedException()
        : this(new Dictionary<string, string[]>())
    {
    }

    public ValidationFailedException(string message)
        : base(message) => Errors = new Dictionary<string, string[]>();

    public ValidationFailedException(string message, Exception innerException)
        : base(message, innerException) => Errors = new Dictionary<string, string[]>();

    public IReadOnlyDictionary<string, string[]> Errors { get; }
}
