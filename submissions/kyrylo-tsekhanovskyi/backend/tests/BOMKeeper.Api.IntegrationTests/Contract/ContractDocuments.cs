using System.Globalization;
using System.Text.Json.Nodes;
using YamlDotNet.Core;
using YamlDotNet.RepresentationModel;

namespace BOMKeeper.Api.IntegrationTests.Contract;

// Loads OpenAPI documents as JSON nodes: the contract from YAML, fixtures from JSON.
public static class ContractDocuments
{
    // The contract in force (ADR 0010, same rule as scripts/lib/contract.mjs): an active change's
    // contracts/openapi.yaml if one carries it, otherwise the canonical openspec/contracts/openapi.yaml.
    public static string ContractPath
    {
        get
        {
            var openspec = Path.Combine(Path.GetDirectoryName(FindBackendDirectory())!, "openspec");
            var changes = Path.Combine(openspec, "changes");
            var fromChanges = Directory.Exists(changes)
                ? Directory.GetDirectories(changes)
                    .Where(dir => Path.GetFileName(dir) != "archive")
                    .Select(dir => Path.Combine(dir, "contracts", "openapi.yaml"))
                    .Where(File.Exists)
                    .ToArray()
                : [];
            return fromChanges.Length switch
            {
                0 => Path.Combine(openspec, "contracts", "openapi.yaml"),
                1 => fromChanges[0],
                _ => throw new InvalidOperationException(
                    $"More than one active change carries a contract: {string.Join(", ", fromChanges)}"),
            };
        }
    }

    public static JsonNode LoadYaml(string path)
    {
        using var reader = new StringReader(File.ReadAllText(path));
        var stream = new YamlStream();
        stream.Load(reader);
        return ToJson(stream.Documents[0].RootNode) ?? throw new InvalidOperationException($"{path} is empty.");
    }

    public static JsonNode Parse(string json) =>
        JsonNode.Parse(json) ?? throw new InvalidOperationException("The JSON document is empty.");

    private static JsonNode? ToJson(YamlNode node) => node switch
    {
        YamlMappingNode map => new JsonObject(map.Children.Select(entry =>
            KeyValuePair.Create(((YamlScalarNode)entry.Key).Value!, ToJson(entry.Value)))),
        YamlSequenceNode sequence => new JsonArray([.. sequence.Children.Select(ToJson)]),
        YamlScalarNode scalar => Scalar(scalar),
        _ => throw new NotSupportedException($"Unsupported YAML node {node.NodeType} at {node.Start}."),
    };

    // Plain scalars follow the YAML core schema (null, booleans, numbers); quoted scalars ('200') stay
    // strings. Numbers are decimals, so 999999999.99 keeps its exact value.
    private static JsonValue? Scalar(YamlScalarNode scalar)
    {
        var text = scalar.Value ?? string.Empty;
        if (scalar.Style != ScalarStyle.Plain)
        {
            return JsonValue.Create(text);
        }

        return text switch
        {
            "null" or "~" or "" => null,
            "true" => JsonValue.Create(true),
            "false" => JsonValue.Create(false),
            _ when decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) => JsonValue.Create(number),
            _ => JsonValue.Create(text),
        };
    }

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
