using BOMKeeper.Api.IntegrationTests.Infrastructure;

namespace BOMKeeper.Api.IntegrationTests.Contract;

// The generated OpenAPI document must match contracts/openapi.yaml under the normalization of design D5.
// A difference is fixed in the code, or escalated as a contract change; never by loosening the comparer.
[Collection(ApiTests.Name)]
public sealed class ContractDriftTests(ApiFactory factory)
{
    [Fact(DisplayName = "contract drift: /openapi/v1.json matches contracts/openapi.yaml")]
    public async Task GeneratedDocumentMatchesContract()
    {
        using var client = factory.CreateClient();
        var generated = ContractDocuments.Parse(
            await client.GetStringAsync(new Uri("/openapi/v1.json", UriKind.Relative)));
        var contract = ContractDocuments.LoadYaml(ContractDocuments.ContractPath);

        var differences = ContractComparer.Compare(contract, generated);

        Assert.True(
            differences.Count == 0,
            $"The API drifted from the contract ({differences.Count} differences):{Environment.NewLine}"
            + string.Join(Environment.NewLine, differences));
    }
}
