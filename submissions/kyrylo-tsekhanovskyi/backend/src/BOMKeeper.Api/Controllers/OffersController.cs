using BOMKeeper.Api.Contracts;
using BOMKeeper.BLL.Offers;
using Microsoft.AspNetCore.Mvc;
using NotFoundProblem = BOMKeeper.Api.Contracts.Problems.ProblemDetails;
using RuleProblem = BOMKeeper.Api.Contracts.Problems.RuleViolationProblemDetails;
using ValidationProblem = BOMKeeper.Api.Contracts.Problems.ValidationProblemDetails;

namespace BOMKeeper.Api.Controllers;

[ApiController]
public sealed class OffersController(OfferService offers) : ControllerBase
{
    [HttpGet("api/items/{itemId:guid}/offers", Name = "listItemOffers")]
    [ProducesResponseType<IReadOnlyList<Offer>>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<IReadOnlyList<Offer>> ListByItemAsync(Guid itemId, CancellationToken cancellationToken) =>
        [.. (await offers.ListByItemAsync(itemId, cancellationToken)).Select(Offer.From)];

    [HttpPost("api/items/{itemId:guid}/offers", Name = "createOffer")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Offer>(StatusCodes.Status201Created, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    [ProducesResponseType<RuleProblem>(StatusCodes.Status409Conflict, MediaTypes.Problem)]
    public async Task<ActionResult<Offer>> CreateAsync(Guid itemId, OfferCreate input, CancellationToken cancellationToken)
    {
        var offer = await offers.CreateAsync(itemId, input.ToBll(), cancellationToken);
        // Offers have no GET of their own; the Location names the offer's resource URL (PUT/DELETE).
        return Created(new Uri($"/api/offers/{offer.Id}", UriKind.Relative), Offer.From(offer));
    }

    [HttpGet("api/listings/{listingId:guid}/offers", Name = "listListingOffers")]
    [ProducesResponseType<IReadOnlyList<Offer>>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<IReadOnlyList<Offer>> ListByListingAsync(Guid listingId, CancellationToken cancellationToken) =>
        [.. (await offers.ListByListingAsync(listingId, cancellationToken)).Select(Offer.From)];

    [HttpPut("api/offers/{offerId:guid}", Name = "updateOffer")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Offer>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Offer> UpdateAsync(Guid offerId, OfferUpdate input, CancellationToken cancellationToken) =>
        Offer.From(await offers.UpdatePricesAsync(
            offerId, input.AskingPrice?.ToEntity(), input.AgreedPrice?.ToEntity(), cancellationToken));

    [HttpDelete("api/offers/{offerId:guid}", Name = "deleteOffer")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<NoContentResult> DeleteAsync(Guid offerId, CancellationToken cancellationToken)
    {
        await offers.DeleteAsync(offerId, cancellationToken);
        return NoContent();
    }

    [HttpPatch("api/offers/{offerId:guid}/fit", Name = "setOfferFit")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Offer>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Offer> SetFitAsync(Guid offerId, OfferFitUpdate update, CancellationToken cancellationToken) =>
        Offer.From(await offers.SetFitAsync(offerId, update.Fit, cancellationToken));

    [HttpPatch("api/offers/{offerId:guid}/choice", Name = "setOfferChoice")]
    [Consumes(MediaTypes.Json)]
    [ProducesResponseType<Offer>(StatusCodes.Status200OK, MediaTypes.Json)]
    [ProducesResponseType<ValidationProblem>(StatusCodes.Status400BadRequest, MediaTypes.Problem)]
    [ProducesResponseType<NotFoundProblem>(StatusCodes.Status404NotFound, MediaTypes.Problem)]
    public async Task<Offer> SetChoiceAsync(Guid offerId, OfferChoiceUpdate update, CancellationToken cancellationToken) =>
        Offer.From(await offers.SetChoiceAsync(offerId, update.IsChosen, cancellationToken));
}
