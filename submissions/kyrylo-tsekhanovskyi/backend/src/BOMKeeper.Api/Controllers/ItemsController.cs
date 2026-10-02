using BOMKeeper.Api.Contracts;
using BOMKeeper.BLL.Items;
using Microsoft.AspNetCore.Mvc;
using NotFoundProblem = BOMKeeper.Api.Contracts.Problems.ProblemDetails;
using ValidationProblem = BOMKeeper.Api.Contracts.Problems.ValidationProblemDetails;

namespace BOMKeeper.Api.Controllers;

[ApiController]
public sealed class ItemsController(ItemService items) : ControllerBase
{
    [HttpGet("api/projects/{projectId:guid}/items", Name = "listProjectItems")]
    [ProducesResponseType<IReadOnlyList<Item>>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<IReadOnlyList<Item>> ListAsync(Guid projectId, CancellationToken cancellationToken) =>
        [.. (await items.ListAsync(projectId, cancellationToken)).Select(Item.From)];

    [HttpPost("api/projects/{projectId:guid}/items", Name = "createItem")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Item>(StatusCodes.Status201Created, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<ActionResult<Item>> CreateAsync(Guid projectId, ItemInput input, CancellationToken cancellationToken)
    {
        var item = await items.CreateAsync(projectId, input.ToBll(), cancellationToken);
        return CreatedAtRoute("getItem", new { itemId = item.Item.Id }, Item.From(item));
    }

    [HttpGet("api/items/{itemId:guid}", Name = "getItem")]
    [ProducesResponseType<Item>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Item> GetAsync(Guid itemId, CancellationToken cancellationToken) =>
        Item.From(await items.GetAsync(itemId, cancellationToken));

    [HttpPut("api/items/{itemId:guid}", Name = "updateItem")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Item>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Item> UpdateAsync(Guid itemId, ItemInput input, CancellationToken cancellationToken) =>
        Item.From(await items.UpdateAsync(itemId, input.ToBll(), cancellationToken));

    [HttpDelete("api/items/{itemId:guid}", Name = "deleteItem")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<NoContentResult> DeleteAsync(Guid itemId, CancellationToken cancellationToken)
    {
        await items.DeleteAsync(itemId, cancellationToken);
        return NoContent();
    }

    [HttpPatch("api/items/{itemId:guid}/status", Name = "setItemStatus")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Item>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Item> SetStatusAsync(Guid itemId, ItemStatusUpdate update, CancellationToken cancellationToken) =>
        Item.From(await items.SetStatusAsync(itemId, update.Status, cancellationToken));
}
