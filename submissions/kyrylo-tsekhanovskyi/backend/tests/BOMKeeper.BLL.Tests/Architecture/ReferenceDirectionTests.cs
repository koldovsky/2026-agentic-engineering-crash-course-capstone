using System.Xml.Linq;

namespace BOMKeeper.BLL.Tests.Architecture;

// Enforces the layering in AGENTS.md: Entities <- DAL <- BLL <- Api. The Api is the composition root and
// may reference the DAL only to register it (Program.cs). The AppHost only launches.
// Reads the project files and sources, so the rule holds without loading any assembly.
public sealed class ReferenceDirectionTests
{
    private static readonly string SrcDirectory = Path.Combine(FindBackendDirectory(), "src");

    public static TheoryData<string, string[], string[]> Layering => new()
    {
        // project, references it must have, references it may have
        { "BOMKeeper.Entities", [], [] },
        { "BOMKeeper.DAL", ["BOMKeeper.Entities"], ["BOMKeeper.Entities"] },
        { "BOMKeeper.BLL", ["BOMKeeper.DAL"], ["BOMKeeper.DAL", "BOMKeeper.Entities"] },
        {
            "BOMKeeper.Api",
            ["BOMKeeper.BLL", "BOMKeeper.DAL", "BOMKeeper.ServiceDefaults"],
            ["BOMKeeper.BLL", "BOMKeeper.DAL", "BOMKeeper.ServiceDefaults"]
        },
        { "BOMKeeper.ServiceDefaults", [], [] },
        { "BOMKeeper.AppHost", ["BOMKeeper.Api"], ["BOMKeeper.Api", "BOMKeeper.ServiceDefaults"] },
    };

    [Theory(DisplayName = "architecture: project references follow the layering")]
    [MemberData(nameof(Layering))]
    public void ProjectReferencesFollowLayering(string project, string[] required, string[] allowed)
    {
        var references = ProjectReferences(project);

        Assert.Empty(required.Except(references));
        Assert.Empty(references.Except(allowed));
    }

    [Fact(DisplayName = "architecture: only Program.cs in the Api uses the DAL")]
    public void OnlyProgramUsesDal()
    {
        var apiDirectory = Path.Combine(SrcDirectory, "BOMKeeper.Api");
        var offenders = Directory
            .EnumerateFiles(apiDirectory, "*.cs", SearchOption.AllDirectories)
            .Where(file => !IsBuildOutput(file) && Path.GetFileName(file) != "Program.cs")
            .Where(file => File.ReadAllText(file).Contains("BOMKeeper.DAL", StringComparison.Ordinal))
            .Select(file => Path.GetRelativePath(apiDirectory, file));

        Assert.Empty(offenders);
    }

    [Fact(DisplayName = "architecture: the Api reaches the DAL only through its registration extensions")]
    public void ApiUsesDalOnlyForRegistration()
    {
        var program = File.ReadAllText(Path.Combine(SrcDirectory, "BOMKeeper.Api", "Program.cs"));

        // No DbContext, no EF operations: the DAL registers and migrates itself.
        Assert.DoesNotMatch(@"DbContext|\.Database\b", program);
    }

    [Fact(DisplayName = "architecture: the BLL does not depend on ASP.NET Core")]
    public void BllHasNoAspNetCore()
    {
        var project = XDocument.Load(ProjectFile("BOMKeeper.BLL"));
        var aspNet = project
            .Descendants()
            .Where(e => e.Name.LocalName is "FrameworkReference" or "PackageReference")
            .Select(e => (string?)e.Attribute("Include") ?? string.Empty)
            .Where(name => name.StartsWith("Microsoft.AspNetCore", StringComparison.Ordinal));

        Assert.Empty(aspNet);
    }

    private static string[] ProjectReferences(string project) =>
        XDocument.Load(ProjectFile(project))
            .Descendants()
            .Where(e => e.Name.LocalName == "ProjectReference")
            .Select(e => Path.GetFileNameWithoutExtension(((string?)e.Attribute("Include") ?? string.Empty).Replace('\\', '/')))
            .ToArray();

    private static string ProjectFile(string project) => Path.Combine(SrcDirectory, project, $"{project}.csproj");

    private static bool IsBuildOutput(string file) =>
        file.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) is var parts
        && (parts.Contains("bin") || parts.Contains("obj"));

    private static string FindBackendDirectory()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "BOMKeeper.slnx")))
            {
                return dir.FullName;
            }
        }

        throw new InvalidOperationException("BOMKeeper.slnx not found above the test output directory.");
    }
}
