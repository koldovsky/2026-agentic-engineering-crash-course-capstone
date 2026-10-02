using BOMKeeper.Api.Contracts;
using BOMKeeper.BLL.Listings;
using Microsoft.AspNetCore.Mvc;
using NotFoundProblem = BOMKeeper.Api.Contracts.Problems.ProblemDetails;
using ValidationProblem = BOMKeeper.Api.Contracts.Problems.ValidationProblemDetails;

namespace BOMKeeper.Api.Controllers;

[ApiController]
public sealed class ListingsController(ListingService listings) : ControllerBase
{
    [HttpGet("api/projects/{projectId:guid}/listings", Name = "listProjectListings")]
    [ProducesResponseType<IReadOnlyList<Listing>>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<IReadOnlyList<Listing>> ListAsync(Guid projectId, CancellationToken cancellationToken) =>
        [.. (await listings.ListAsync(projectId, cancellationToken)).Select(Listing.From)];

    [HttpPost("api/projects/{projectId:guid}/listings", Name = "createListing")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Listing>(StatusCodes.Status201Created, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<ActionResult<Listing>> CreateAsync(Guid projectId, ListingInput input, CancellationToken cancellationToken)
    {
        var listing = await listings.CreateAsync(projectId, input.ToBll(), cancellationToken);
        return CreatedAtRoute("getListing", new { listingId = listing.Id }, Listing.From(listing));
    }

    [HttpGet("api/listings/{listingId:guid}", Name = "getListing")]
    [ProducesResponseType<Listing>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Listing> GetAsync(Guid listingId, CancellationToken cancellationToken) =>
        Listing.From(await listings.GetAsync(listingId, cancellationToken));

    [HttpPut("api/listings/{listingId:guid}", Name = "updateListing")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Listing>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Listing> UpdateAsync(Guid listingId, ListingInput input, CancellationToken cancellationToken) =>
        Listing.From(await listings.UpdateAsync(listingId, input.ToBll(), cancellationToken));

    [HttpDelete("api/listings/{listingId:guid}", Name = "deleteListing")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<NoContentResult> DeleteAsync(Guid listingId, CancellationToken cancellationToken)
    {
        await listings.DeleteAsync(listingId, cancellationToken);
        return NoContent();
    }

    [HttpPatch("api/listings/{listingId:guid}/status", Name = "setListingStatus")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Listing>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Listing> SetStatusAsync(Guid listingId, ListingStatusUpdate update, CancellationToken cancellationToken) =>
        Listing.From(await listings.SetStatusAsync(listingId, update.Status, cancellationToken));
}
