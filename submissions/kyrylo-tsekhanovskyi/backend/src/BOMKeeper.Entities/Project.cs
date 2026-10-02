namespace BOMKeeper.Entities;

// A DIY project: a named workspace that groups the items it needs and the listings that may supply them.
public sealed class Project
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    // UTC creation time. Only projects keep a creation time (design D2).
    public DateTimeOffset CreatedAt { get; set; }
}
