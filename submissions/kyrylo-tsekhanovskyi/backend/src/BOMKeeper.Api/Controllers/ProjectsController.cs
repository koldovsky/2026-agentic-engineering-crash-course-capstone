using BOMKeeper.Api.Contracts;
using BOMKeeper.BLL.Projects;
using Microsoft.AspNetCore.Mvc;
using NotFoundProblem = BOMKeeper.Api.Contracts.Problems.ProblemDetails;
using ValidationProblem = BOMKeeper.Api.Contracts.Problems.ValidationProblemDetails;

namespace BOMKeeper.Api.Controllers;

[ApiController]
[Route("api/projects")]
public sealed class ProjectsController(ProjectService projects, SummaryService summaries) : ControllerBase
{
    [HttpGet("{projectId:guid}/summary", Name = "getProjectSummary")]
    [ProducesResponseType<ProjectSummary>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<ProjectSummary> GetSummaryAsync(Guid projectId, CancellationToken cancellationToken) =>
        ProjectSummary.From(await summaries.GetAsync(projectId, cancellationToken));

    [HttpGet(Name = "listProjects")]
    [ProducesResponseType<IReadOnlyList<ProjectListEntry>>(StatusCodes.Status200OK, MediaTypes.Json)]
    public async Task<IReadOnlyList<ProjectListEntry>> ListAsync(CancellationToken cancellationToken) =>
        [.. (await projects.ListAsync(cancellationToken)).Select(ProjectListEntry.From)];

    [HttpPost(Name = "createProject")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Project>(StatusCodes.Status201Created, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    public async Task<ActionResult<Project>> CreateAsync(ProjectInput input, CancellationToken cancellationToken)
    {
        var project = await projects.CreateAsync(input.ToBll(), cancellationToken);
        return CreatedAtRoute("getProject", new { projectId = project.Id }, Project.From(project));
    }

    [HttpGet("{projectId:guid}", Name = "getProject")]
    [ProducesResponseType<Project>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Project> GetAsync(Guid projectId, CancellationToken cancellationToken) =>
        Project.From(await projects.GetAsync(projectId, cancellationToken));

    [HttpPut("{projectId:guid}", Name = "updateProject")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Project>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Project> UpdateAsync(Guid projectId, ProjectInput input, CancellationToken cancellationToken) =>
        Project.From(await projects.UpdateAsync(projectId, input.ToBll(), cancellationToken));

    [HttpDelete("{projectId:guid}", Name = "deleteProject")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<NoContentResult> DeleteAsync(Guid projectId, CancellationToken cancellationToken)
    {
        await projects.DeleteAsync(projectId, cancellationToken);
        return NoContent();
    }
}
