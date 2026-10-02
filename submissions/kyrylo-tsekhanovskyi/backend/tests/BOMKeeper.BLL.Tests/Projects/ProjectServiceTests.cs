using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Projects;
using BOMKeeper.BLL.Tests.Fakes;

namespace BOMKeeper.BLL.Tests.Projects;

public sealed class ProjectServiceTests
{
    private readonly FakeDatabase _db = new();
    private readonly ManualTimeProvider _time = new();
    private readonly ProjectService _service;

    public ProjectServiceTests() => _service = new ProjectService(new FakeProjectRepository(_db), _db, _time);

    [Theory(DisplayName = "projects: Reject a blank or too long name")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    [InlineData("x201")]
    public async Task RejectBlankOrTooLongName(string? name)
    {
        if (name == "x201")
        {
            name = new string('x', 201);
        }

        var error = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(new ProjectDraft(name, "A description")));

        Assert.Contains("name", error.Errors.Keys);
        Assert.Empty(_db.Projects);
        Assert.Equal(0, _db.SaveCount);
    }

    [Fact(DisplayName = "projects: Create a project (BLL)")]
    public async Task CreateTrimsNameAndStampsTime()
    {
        var project = await _service.CreateAsync(new ProjectDraft("  Solar station  ", "Roof panels"));

        Assert.Equal("Solar station", project.Name);
        Assert.Equal("Roof panels", project.Description);
        Assert.Equal(_time.Now, project.CreatedAt);
        Assert.NotEqual(Guid.Empty, project.Id);
        Assert.Single(_db.Projects);
    }

    [Fact(DisplayName = "projects: Unknown id (BLL)")]
    public async Task UnknownIdThrowsNotFound() =>
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetAsync(Guid.NewGuid()));
}
