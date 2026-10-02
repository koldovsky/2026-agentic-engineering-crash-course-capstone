namespace BOMKeeper.Entities;

// A part a project needs, how many of it, and where it is in sourcing (set by hand).
public sealed class Item
{
    public Guid Id { get; set; }

    public Guid ProjectId { get; set; }

    public required string Name { get; set; }

    public int Quantity { get; set; }

    public string? Notes { get; set; }

    public ItemStatus Status { get; set; }
}

public enum ItemStatus
{
    Needed,
    Sourcing,
    Ordered,
    Received,
}
