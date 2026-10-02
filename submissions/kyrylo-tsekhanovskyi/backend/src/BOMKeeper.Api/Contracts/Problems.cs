namespace BOMKeeper.Api.Contracts.Problems;

// Documentation-only shapes of the problem responses. Their names and `required` lists match the contract
// schemas (design D4); the bodies themselves are written by the ASP.NET Core problem details service.

// RFC 9457 problem details (404).
public sealed class ProblemDetails
{
    public string? Type { get; init; }

    public string? Title { get; init; }

    public int? Status { get; init; }

    public string? Detail { get; init; }

    public string? Instance { get; init; }
}

// A violated business rule (409); `type` is `/problems/<code>`.
public sealed class RuleViolationProblemDetails
{
    public required string Type { get; init; }

    public required string Title { get; init; }

    public required int Status { get; init; }

    public string? Detail { get; init; }

    public string? Instance { get; init; }
}

// Invalid input (400) with field errors keyed by JSON property path.
public sealed class ValidationProblemDetails
{
    public string? Type { get; init; }

    public required string Title { get; init; }

    public required int Status { get; init; }

    public string? Detail { get; init; }

    public string? Instance { get; init; }

    public required IDictionary<string, string[]> Errors { get; init; }
}
