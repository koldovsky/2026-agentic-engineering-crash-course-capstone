using System.Text.Json.Nodes;

namespace BOMKeeper.Api.IntegrationTests.Contract;

// Design D5 on small fixtures: what the drift comparison reports and what it ignores. No Docker needed.
public sealed class ContractNormalizerTests
{
    private const string Fixture = """
        {
          "openapi": "3.1.1",
          "info": { "title": "Fixture", "version": "v1", "description": "A fixture" },
          "servers": [ { "url": "/" } ],
          "security": [],
          "tags": [ { "name": "things" } ],
          "paths": {
            "/api/health": { "get": { "operationId": "health", "responses": { "200": { "description": "Up" } } } },
            "/api/things": {
              "post": {
                "operationId": "createThing",
                "tags": [ "things" ],
                "summary": "Create a thing",
                "requestBody": {
                  "required": true,
                  "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ThingInput" } } }
                },
                "responses": {
                  "201": {
                    "description": "Created",
                    "headers": { "Location": { "schema": { "type": "string" } } },
                    "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Thing" } } }
                  },
                  "400": { "$ref": "#/components/responses/BadRequest" }
                }
              }
            },
            "/api/things/{thingId}": {
              "parameters": [ { "$ref": "#/components/parameters/thingId" } ],
              "get": {
                "operationId": "getThing",
                "responses": {
                  "200": {
                    "description": "The thing",
                    "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Thing" } } }
                  }
                }
              },
              "delete": { "operationId": "deleteThing", "responses": { "204": { "description": "Deleted" } } }
            }
          },
          "components": {
            "parameters": {
              "thingId": { "name": "thingId", "in": "path", "required": true, "schema": { "type": "string", "format": "uuid" } }
            },
            "responses": {
              "BadRequest": {
                "description": "Invalid input",
                "content": { "application/problem+json": { "schema": { "$ref": "#/components/schemas/Problem" } } }
              }
            },
            "schemas": {
              "Status": { "type": "string", "enum": [ "New", "Done" ] },
              "Price": {
                "type": "object",
                "required": [ "amount", "currency" ],
                "properties": {
                  "amount": { "type": "number", "minimum": 0, "maximum": 999999999.99, "multipleOf": 0.01 },
                  "currency": { "type": "string", "pattern": "^[A-Z]{3}$" }
                }
              },
              "ThingInput": {
                "type": "object",
                "required": [ "name" ],
                "properties": {
                  "name": { "type": "string", "minLength": 1, "maxLength": 200 },
                  "notes": { "type": [ "string", "null" ], "maxLength": 2000 },
                  "price": { "oneOf": [ { "$ref": "#/components/schemas/Price" }, { "type": "null" } ] }
                }
              },
              "Thing": {
                "type": "object",
                "required": [ "id", "name", "status", "tags" ],
                "properties": {
                  "id": { "type": "string", "format": "uuid" },
                  "name": { "type": "string", "description": "The name" },
                  "status": { "$ref": "#/components/schemas/Status" },
                  "tags": { "type": "array", "items": { "type": "string" } },
                  "count": { "type": "integer", "format": "int32" }
                }
              },
              "Problem": {
                "type": "object",
                "required": [ "errors" ],
                "properties": {
                  "errors": { "type": "object", "additionalProperties": { "type": "array", "items": { "type": "string" } } }
                }
              }
            }
          }
        }
        """;

    public static TheoryData<string, Action<JsonNode>> Reported => new()
    {
        { "a missing path", doc => Paths(doc).Remove("/api/things/{thingId}") },
        { "a missing method", doc => Paths(doc)["/api/things/{thingId}"]!.AsObject().Remove("delete") },
        { "a changed operationId", doc => Paths(doc)["/api/things"]!["post"]!["operationId"] = "addThing" },
        { "a changed enum", doc => Schema(doc, "Status")["enum"]!.AsArray().Add("Archived") },
        { "a changed required set", doc => Schema(doc, "ThingInput")["required"]!.AsArray().Add("notes") },
        { "a changed property type", doc => Property(doc, "Thing", "count")["type"] = "number" },
        { "a changed nullability", doc => Property(doc, "ThingInput", "notes")["type"] = "string" },
        { "a changed minimum", doc => Property(doc, "Price", "amount")["minimum"] = 1 },
        { "a changed maximum", doc => Property(doc, "Price", "amount")["maximum"] = 99999.99 },
        { "a changed minLength", doc => Property(doc, "ThingInput", "name")["minLength"] = 0 },
        { "a changed maxLength", doc => Property(doc, "ThingInput", "name")["maxLength"] = 100 },
        { "a changed pattern", doc => Property(doc, "Price", "currency")["pattern"] = "^[A-Z]{2,3}$" },
        { "a changed array items schema", doc => Property(doc, "Thing", "tags")["items"]!["type"] = "integer" },
        {
            "a changed additionalProperties",
            doc => Property(doc, "Problem", "errors")["additionalProperties"] = new JsonObject { ["type"] = "string" }
        },
        { "a changed request media type", doc => RenameKey(Paths(doc)["/api/things"]!["post"]!["requestBody"]!["content"]!, "application/json", "text/json") },
        { "a changed response media type", doc => RenameKey(Paths(doc)["/api/things/{thingId}"]!["get"]!["responses"]!["200"]!["content"]!, "application/json", "text/plain") },
        { "a missing Location header on a 201", doc => Paths(doc)["/api/things"]!["post"]!["responses"]!["201"]!.AsObject().Remove("headers") },
        { "a missing response status", doc => Paths(doc)["/api/things"]!["post"]!["responses"]!.AsObject().Remove("400") },
        { "a changed path parameter", doc => Components(doc)["parameters"]!["thingId"]!["schema"]!["type"] = "integer" },
        { "a changed request body requirement", doc => Paths(doc)["/api/things"]!["post"]!["requestBody"]!["required"] = false },
    };

    public static TheoryData<string, Action<JsonNode>> Ignored => new()
    {
        { "nullability as nullable: true", doc => Property(doc, "ThingInput", "notes").ReplaceWith(Parse("""{ "type": "string", "nullable": true, "maxLength": 2000 }""")) },
        { "nullability as oneOf with null", doc => Property(doc, "ThingInput", "notes").ReplaceWith(Parse("""{ "oneOf": [ { "type": "null" }, { "type": "string", "maxLength": 2000 } ] }""")) },
        { "nullability of a $ref as anyOf with null", doc => Property(doc, "ThingInput", "price").ReplaceWith(Parse("""{ "anyOf": [ { "type": "null" }, { "$ref": "#/components/schemas/Price" } ] }""")) },
        { "nullability of a $ref as nullable: true", doc => Property(doc, "ThingInput", "price").ReplaceWith(Parse("""{ "$ref": "#/components/schemas/Price", "nullable": true }""")) },
        { "a different format", doc => Property(doc, "Thing", "count")["format"] = "int64" },
        { "a missing multipleOf", doc => Property(doc, "Price", "amount").AsObject().Remove("multipleOf") },
        { "different descriptions and summaries", doc =>
            {
                Property(doc, "Thing", "name").AsObject().Remove("description");
                Paths(doc)["/api/things"]!["post"]!["summary"] = "Another summary";
                Paths(doc)["/api/things"]!["post"]!["responses"]!["201"]!["description"] = "Another description";
            }
        },
        { "different tags, servers, security and info", doc =>
            {
                doc.AsObject().Remove("tags");
                doc["servers"] = new JsonArray(new JsonObject { ["url"] = "https://example.com" });
                doc["security"] = new JsonArray(new JsonObject { ["apiKey"] = new JsonArray() });
                doc["info"]!["title"] = "Other";
                Paths(doc)["/api/things"]!["post"]!.AsObject().Remove("tags");
            }
        },
        { "a different key and element order", doc =>
            {
                var thing = Schema(doc, "Thing");
                var reversed = new JsonObject(thing["properties"]!.AsObject().Reverse()
                    .Select(p => KeyValuePair.Create(p.Key, p.Value?.DeepClone())));
                thing["properties"] = reversed;
                thing["required"] = new JsonArray("tags", "status", "name", "id");
                Schema(doc, "Status")["enum"] = new JsonArray("Done", "New");
            }
        },
        { "a missing /api/health", doc => Paths(doc).Remove("/api/health") },
        { "a body on a 204", doc => Paths(doc)["/api/things/{thingId}"]!["delete"]!["responses"]!["204"]!["content"] = Parse("""{ "application/json": { "schema": { "type": "string" } } }""") },
        { "an unused component schema", doc => Components(doc)["schemas"]!["Unused"] = Parse("""{ "type": "object" }""") },
        { "an inlined parameter", doc => Paths(doc)["/api/things/{thingId}"]!["parameters"] = Parse("""[ { "name": "thingId", "in": "path", "required": true, "schema": { "type": "string" } } ]""") },
    };

    [Theory(DisplayName = "contract drift: the normalizer reports")]
    [MemberData(nameof(Reported))]
    public void Reports(string change, Action<JsonNode> mutate)
    {
        var differences = ContractComparer.Compare(ContractDocuments.Parse(Fixture), Mutated(mutate));

        Assert.True(differences.Count > 0, $"Expected {change} to be reported.");
    }

    [Theory(DisplayName = "contract drift: the normalizer ignores")]
    [MemberData(nameof(Ignored))]
    public void Ignores(string change, Action<JsonNode> mutate)
    {
        var differences = ContractComparer.Compare(ContractDocuments.Parse(Fixture), Mutated(mutate));

        Assert.True(differences.Count == 0, $"Expected {change} to be ignored, got:{Environment.NewLine}{string.Join(Environment.NewLine, differences)}");
    }

    [Fact(DisplayName = "contract drift: a document equals itself")]
    public void DocumentEqualsItself() =>
        Assert.Empty(ContractComparer.Compare(ContractDocuments.Parse(Fixture), ContractDocuments.Parse(Fixture)));

    [Fact(DisplayName = "contract drift: differences name the differing path")]
    public void DifferencesNameThePath()
    {
        var differences = ContractComparer.Compare(
            ContractDocuments.Parse(Fixture),
            Mutated(doc => Property(doc, "ThingInput", "name")["maxLength"] = 100));

        Assert.Contains(differences, d => d.Contains("ThingInput", StringComparison.Ordinal) && d.Contains("maxLength", StringComparison.Ordinal));
    }

    [Fact(DisplayName = "contract drift: the contract YAML loads")]
    public void ContractYamlLoads()
    {
        var contract = ContractDocuments.LoadYaml(ContractDocuments.ContractPath);

        var normalized = ContractNormalizer.Normalize(contract);

        Assert.Contains(normalized, e => e.Value == "listProjects");
        Assert.Equal("999999999.99", normalized["schema Money property amount maximum"]);
        Assert.Equal("true", normalized["schema Item property chosenOffer nullable"]);
    }

    private static JsonNode Mutated(Action<JsonNode> mutate)
    {
        var document = ContractDocuments.Parse(Fixture);
        mutate(document);
        return document;
    }

    private static JsonNode Parse(string json) => ContractDocuments.Parse(json);

    private static JsonObject Paths(JsonNode doc) => doc["paths"]!.AsObject();

    private static JsonNode Components(JsonNode doc) => doc["components"]!;

    private static JsonNode Schema(JsonNode doc, string name) => Components(doc)["schemas"]![name]!;

    private static JsonNode Property(JsonNode doc, string schema, string property) => Schema(doc, schema)["properties"]![property]!;

    private static void RenameKey(JsonNode node, string from, string to)
    {
        var obj = node.AsObject();
        var value = obj[from];
        obj.Remove(from);
        obj[to] = value;
    }
}
