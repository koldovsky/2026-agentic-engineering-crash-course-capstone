using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace BOMKeeper.Api.Errors;

// Writes a problem through IProblemDetailsService, so it is always `application/problem+json`, even on
// controllers whose [Produces] narrows object results to `application/json`.
internal sealed class ProblemDetailsResult(ProblemDetails problem) : IActionResult
{
    public async Task ExecuteResultAsync(ActionContext context)
    {
        var httpContext = context.HttpContext;
        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status400BadRequest;
        await httpContext.RequestServices
            .GetRequiredService<IProblemDetailsService>()
            .WriteAsync(new ProblemDetailsContext { HttpContext = httpContext, ProblemDetails = problem });
    }

    // Model-binding and DataAnnotations failures (for example an unknown enum value): 400 problem details.
    public static IActionResult ForInvalidModelState(ActionContext context) =>
        new ProblemDetailsResult(context.HttpContext.RequestServices
            .GetRequiredService<ProblemDetailsFactory>()
            .CreateValidationProblemDetails(context.HttpContext, context.ModelState));
}
