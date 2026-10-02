using BOMKeeper.BLL.Errors;
using BOMKeeper.BLL.Items;
using BOMKeeper.BLL.Tests.Fakes;
using BOMKeeper.Entities;

namespace BOMKeeper.BLL.Tests.Items;

public sealed class ItemServiceTests
{
    private readonly FakeDatabase _db = new();
    private readonly ItemService _service;

    public ItemServiceTests() =>
        _service = new ItemService(new FakeProjectRepository(_db), new FakeItemRepository(_db), new FakeOfferRepository(_db), _db);

    [Theory(DisplayName = "items: Reject an invalid quantity")]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(10001)]
    public async Task RejectInvalidQuantity(int quantity)
    {
        var project = _db.AddProject();

        var onCreate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(project.Id, new ItemDraft("Inverter", quantity, null)));
        Assert.Contains("quantity", onCreate.Errors.Keys);
        Assert.Empty(_db.Items);

        var item = _db.AddItem(project, quantity: 3);
        var onUpdate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.UpdateAsync(item.Id, new ItemDraft("Inverter", quantity, null)));
        Assert.Contains("quantity", onUpdate.Errors.Keys);
        Assert.Equal(3, item.Quantity);
        Assert.Equal(0, _db.SaveCount);
    }

    [Theory(DisplayName = "items: Reject a blank name")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task RejectBlankName(string? name)
    {
        var project = _db.AddProject();
        var item = _db.AddItem(project, name: "Battery");

        var onCreate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.CreateAsync(project.Id, new ItemDraft(name, 1, null)));
        var onUpdate = await Assert.ThrowsAsync<ValidationFailedException>(
            () => _service.UpdateAsync(item.Id, new ItemDraft(name, 1, null)));

        Assert.Contains("name", onCreate.Errors.Keys);
        Assert.Contains("name", onUpdate.Errors.Keys);
        Assert.Equal("Battery", item.Name);
        Assert.Single(_db.Items);
    }

    [Fact(DisplayName = "items: Any status transition is allowed")]
    public async Task AnyStatusTransitionIsAllowed()
    {
        var item = _db.AddItem(_db.AddProject(), status: ItemStatus.Received);

        var updated = await _service.SetStatusAsync(item.Id, ItemStatus.Sourcing);

        Assert.Equal(ItemStatus.Sourcing, updated.Item.Status);
        Assert.Equal(ItemStatus.Sourcing, item.Status);
    }

    [Fact(DisplayName = "items: Add an item (BLL)")]
    public async Task AddStartsInNeeded()
    {
        var project = _db.AddProject();

        var item = (await _service.CreateAsync(project.Id, new ItemDraft("  Inverter ", 2, "5 kW"))).Item;

        Assert.Equal("Inverter", item.Name);
        Assert.Equal(2, item.Quantity);
        Assert.Equal(ItemStatus.Needed, item.Status);
        Assert.Equal(project.Id, item.ProjectId);
    }

    [Fact(DisplayName = "items: Unknown project (BLL)")]
    public async Task UnknownProject() =>
        await Assert.ThrowsAsync<NotFoundException>(
            () => _service.CreateAsync(Guid.NewGuid(), new ItemDraft("Inverter", 1, null)));
}
