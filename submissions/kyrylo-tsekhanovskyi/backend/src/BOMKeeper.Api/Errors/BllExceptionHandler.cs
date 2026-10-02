using BOMKeeper.BLL.Errors;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace BOMKeeper.Api.Errors;

// Maps the BLL exceptions to RFC 9457 problem details in one place (design D4):
// validation → 400 with `errors`, unknown id → 404, business rule → 409 with type `/problems/<code>`.
internal sealed class BllExceptionHandler(IProblemDetailsService problemDetailsService) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ProblemDetails? problem = exception switch
        {
            ValidationFailedException validation => new HttpValidationProblemDetails(
                validation.Errors.ToDictionary(e => e.Key, e => e.Value, StringComparer.Ordinal))
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "One or more validation errors occurred.",
            },
            NotFoundException notFound => new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = notFound.Message,
            },
            BusinessRuleException rule => new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Type = $"/problems/{rule.Code}",
                Title = "Business rule violated",
                Detail = rule.Message,
            },
            _ => null,
        };

        if (problem is null)
        {
            return false;
        }

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
