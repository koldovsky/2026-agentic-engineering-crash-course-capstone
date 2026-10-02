using System.Text.Json.Nodes;

namespace BOMKeeper.Api.IntegrationTests.Contract;

// Review finding (task 14.1): constraints written next to a nullable union still take part in the comparison.
public sealed class NullableWrapperConstraintTests
{
    private const string Fixture = """
        {
          "paths": {
            "/api/things": {
              "post": {
                "operationId": "createThing",
                "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ThingInput" } } } },
                "responses": { "204": { "description": "Done" } }
              }
            }
          },
          "components": {
            "schemas": {
              "ThingInput": {
                "type": "object",
                "properties": {
                  "code": { "oneOf": [ { "type": "string" }, { "type": "null" } ], "maxLength": 10, "pattern": "^[a-z]+$" },
                  "weight": { "anyOf": [ { "type": "number" }, { "type": "null" } ], "minimum": 0 }
                }
              }
            }
          }
        }
        """;

    public static TheoryData<string, string, JsonNode> Changes => new()
    {
        { "code", "maxLength", JsonValue.Create(20) },
        { "code", "pattern", JsonValue.Create("^[A-Z]+$") },
        { "weight", "minimum", JsonValue.Create(1) },
    };

    [Theory(DisplayName = "contract drift: a nullable union's sibling constraint is reported")]
    [MemberData(nameof(Changes))]
    public void SiblingConstraintIsReported(string property, string keyword, JsonNode value)
    {
        var actual = ContractDocuments.Parse(Fixture);
        actual["components"]!["schemas"]!["ThingInput"]!["properties"]![property]![keyword] = value.DeepClone();

        var differences = ContractComparer.Compare(ContractDocuments.Parse(Fixture), actual);

        Assert.Contains(differences, d => d.Contains($"property {property} {keyword}", StringComparison.Ordinal));
    }

    [Fact(DisplayName = "contract drift: a nullable union's sibling constraint is kept")]
    public void SiblingConstraintIsKept()
    {
        var normalized = ContractNormalizer.Normalize(ContractDocuments.Parse(Fixture));

        Assert.Equal("10", normalized["schema ThingInput property code maxLength"]);
        Assert.Equal("true", normalized["schema ThingInput property code nullable"]);
        Assert.Equal("0", normalized["schema ThingInput property weight minimum"]);
    }
}
