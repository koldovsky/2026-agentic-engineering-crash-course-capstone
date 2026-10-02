using BOMKeeper.BLL.Errors;

namespace BOMKeeper.BLL.Validation;

// Collects field errors keyed by JSON property path, then throws them together (design D3).
public sealed class FieldErrors
{
    private readonly Dictionary<string, List<string>> _errors = new(StringComparer.Ordinal);

    public bool IsEmpty => _errors.Count == 0;

    public void Add(string field, string message)
    {
        if (!_errors.TryGetValue(field, out var messages))
        {
            messages = [];
            _errors[field] = messages;
        }

        messages.Add(message);
    }

    // A required text: trimmed, 1..maxLength characters after trimming.
    public string RequiredText(string field, string? value, int maxLength)
    {
        var trimmed = value?.Trim() ?? string.Empty;
        if (trimmed.Length == 0)
        {
            Add(field, $"The {field} is required.");
        }
        else if (trimmed.Length > maxLength)
        {
            Add(field, $"The {field} must be at most {maxLength} characters.");
        }

        return trimmed;
    }

    // An optional text of at most maxLength characters; null stays null.
    public string? OptionalText(string field, string? value, int maxLength)
    {
        if (value is not null && value.Length > maxLength)
        {
            Add(field, $"The {field} must be at most {maxLength} characters.");
        }

        return value;
    }

    public void ThrowIfAny()
    {
        if (!IsEmpty)
        {
            throw new ValidationFailedException(_errors.ToDictionary(e => e.Key, e => e.Value.ToArray(), StringComparer.Ordinal));
        }
    }
}
