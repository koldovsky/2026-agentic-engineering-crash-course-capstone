using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BOMKeeper.Api.IntegrationTests.Contract;

// Reduces an OpenAPI document to the normalized structure of design D5, as a flat, sorted map of
// "path → value" entries, so two documents can be compared entry by entry.
//
// Kept: every operation under /api/ except /api/health (operationId; path parameters; request body
// requirement, media types and schemas; response status codes, media types, schemas and header names), and
// every schema reachable from them (named components by name, their bodies once): JSON type without null,
// nullability as a boolean however it is spelled, properties, required, enum, minimum, maximum, minLength,
// maxLength, pattern, items and additionalProperties.
// Dropped: info, servers, security, tags, summaries, descriptions, examples, format, multipleOf, x-*,
// key and array element order, and the bodies of 204 responses.
public static class ContractNormalizer
{
    private static readonly string[] Methods = ["get", "put", "post", "delete", "patch", "options", "head", "trace"];
    private static readonly string[] Bounds = ["minimum", "maximum", "minLength", "maxLength", "pattern"];
    private static readonly string[] Unions = ["oneOf", "anyOf"];

    public static SortedDictionary<string, string> Normalize(JsonNode document)
    {
        var walker = new Walker(document);
        walker.Run();
        return walker.Entries;
    }

    private sealed class Walker(JsonNode document)
    {
        private readonly Queue<string> _pending = new();
        private readonly HashSet<string> _queued = new(StringComparer.Ordinal);

        public SortedDictionary<string, string> Entries { get; } = new(StringComparer.Ordinal);

        public void Run()
        {
            if (document["paths"] is JsonObject paths)
            {
                foreach (var (path, pathItem) in paths)
                {
                    if (!path.StartsWith("/api/", StringComparison.Ordinal) || path == "/api/health" || pathItem is not JsonObject item)
                    {
                        continue;
                    }

                    foreach (var method in Methods)
                    {
                        if (item[method] is JsonObject operation)
                        {
                            Operation($"{method.ToUpperInvariant()} {path}", operation, item["parameters"]);
                        }
                    }
                }
            }

            while (_pending.TryDequeue(out var name))
            {
                if (document["components"]?["schemas"]?[name] is { } schema)
                {
                    Schema(Entries, $"schema {name}", schema);
                }
                else
                {
                    Entries[$"schema {name}"] = "unresolved";
                }
            }
        }

        private void Operation(string prefix, JsonObject operation, JsonNode? sharedParameters)
        {
            Entries[prefix] = "operation";
            Entries[$"{prefix} operationId"] = Text(operation["operationId"]);

            // Operation-level parameters override path-level ones with the same name and location.
            var parameters = new Dictionary<string, JsonNode>(StringComparer.Ordinal);
            foreach (var parameter in Items(sharedParameters).Concat(Items(operation["parameters"])).Select(Resolve).OfType<JsonObject>())
            {
                parameters[$"{Text(parameter["in"])}:{Text(parameter["name"])}"] = parameter;
            }

            foreach (var parameter in parameters.Values.Where(p => Text(p["in"]) == "path"))
            {
                var name = $"{prefix} path parameter {Text(parameter["name"])}";
                Entries[$"{name} required"] = Flag(parameter["required"]);
                Schema(Entries, $"{name} schema", parameter["schema"]);
            }

            if (Resolve(operation["requestBody"]) is JsonObject body)
            {
                Entries[$"{prefix} request required"] = Flag(body["required"]);
                Content(Entries, $"{prefix} request", body["content"]);
            }

            if (operation["responses"] is JsonObject responses)
            {
                foreach (var (status, node) in responses)
                {
                    var name = $"{prefix} response {status}";
                    Entries[name] = "response";
                    if (Resolve(node) is not JsonObject response)
                    {
                        continue;
                    }

                    if (response["headers"] is JsonObject headers)
                    {
                        foreach (var (header, _) in headers)
                        {
                            Entries[$"{name} header {header.ToLowerInvariant()}"] = "header";
                        }
                    }

                    if (status != "204")
                    {
                        Content(Entries, name, response["content"]);
                    }
                }
            }
        }

        private void Content(SortedDictionary<string, string> into, string prefix, JsonNode? content)
        {
            if (content is not JsonObject mediaTypes)
            {
                return;
            }

            foreach (var (mediaType, media) in mediaTypes)
            {
                into[$"{prefix} content {mediaType}"] = "media type";
                Schema(into, $"{prefix} content {mediaType} schema", media?["schema"]);
            }
        }

        private void Schema(SortedDictionary<string, string> into, string prefix, JsonNode? node)
        {
            var (core, nullable) = Unwrap(node);
            into[$"{prefix} nullable"] = nullable ? "true" : "false";
            if (core is null)
            {
                return;
            }

            // Enum and bounds first: they also apply next to a $ref (for example from a nullable wrapper).
            var values = Items(core["enum"]).Where(v => v is not null).Select(v => v!.ToJsonString()).Order(StringComparer.Ordinal).ToList();
            if (values.Count > 0)
            {
                into[$"{prefix} enum"] = string.Join(",", values);
            }

            foreach (var bound in Bounds)
            {
                if (core[bound] is JsonValue value)
                {
                    into[$"{prefix} {bound}"] = Canonical(value);
                }
            }

            if (core["$ref"] is JsonValue reference)
            {
                var name = RefName(reference.GetValue<string>());
                into[$"{prefix} $ref"] = name;
                if (_queued.Add(name))
                {
                    _pending.Enqueue(name);
                }

                return;
            }

            var types = Types(core);
            if (types.Count > 0)
            {
                into[$"{prefix} type"] = string.Join("|", types);
            }

            if (core["properties"] is JsonObject properties)
            {
                foreach (var (property, schema) in properties)
                {
                    Schema(into, $"{prefix} property {property}", schema);
                }
            }

            var required = Items(core["required"]).Select(Text).Order(StringComparer.Ordinal).ToList();
            if (required.Count > 0)
            {
                into[$"{prefix} required"] = string.Join(",", required);
            }

            if (core["items"] is { } items)
            {
                Schema(into, $"{prefix} items", items);
            }

            switch (core["additionalProperties"])
            {
                case JsonValue flag when flag.GetValueKind() is JsonValueKind.True or JsonValueKind.False:
                    into[$"{prefix} additionalProperties"] = flag.GetValueKind() == JsonValueKind.True ? "true" : "false";
                    break;
                case JsonObject additional:
                    Schema(into, $"{prefix} additionalProperties", additional);
                    break;
            }

            // Unions that remain after unwrapping nullability, and allOf: members in a canonical order.
            foreach (var keyword in Unions.Append("allOf"))
            {
                var members = Items(core[keyword]).Where(m => !IsNullSchema(m)).ToList();
                if (members.Count == 0)
                {
                    continue;
                }

                var normalized = members
                    .Select(member =>
                    {
                        var entries = new SortedDictionary<string, string>(StringComparer.Ordinal);
                        Schema(entries, string.Empty, member);
                        return entries;
                    })
                    .OrderBy(entries => string.Join(";", entries.Select(e => $"{e.Key}={e.Value}")), StringComparer.Ordinal)
                    .ToList();
                for (var i = 0; i < normalized.Count; i++)
                {
                    foreach (var (key, value) in normalized[i])
                    {
                        into[$"{prefix} {keyword}[{i}]{key}"] = value;
                    }
                }
            }
        }

        private JsonNode? Resolve(JsonNode? node)
        {
            for (var depth = 0; depth < 16 && node?["$ref"] is JsonValue reference; depth++)
            {
                node = Pointer(reference.GetValue<string>());
            }

            return node;
        }

        private JsonNode? Pointer(string reference)
        {
            JsonNode? node = document;
            foreach (var segment in reference.TrimStart('#').Split('/', StringSplitOptions.RemoveEmptyEntries))
            {
                node = node?[segment.Replace("~1", "/", StringComparison.Ordinal).Replace("~0", "~", StringComparison.Ordinal)];
            }

            return node;
        }
    }

    // Splits a schema into its non-null core and whether null is allowed, for all three spellings:
    // `type: [x, "null"]`, `oneOf`/`anyOf` with a null member, and `nullable: true`.
    private static (JsonObject? Core, bool Nullable) Unwrap(JsonNode? node)
    {
        if (node is not JsonObject schema)
        {
            return (null, false);
        }

        if (IsNullSchema(schema))
        {
            return (null, true);
        }

        var nullable = schema["nullable"] is JsonValue flag && flag.GetValueKind() == JsonValueKind.True;
        if (schema["type"] is JsonArray types && types.Any(t => Text(t) == "null"))
        {
            nullable = true;
        }

        foreach (var keyword in Unions)
        {
            if (schema[keyword] is not JsonArray members)
            {
                continue;
            }

            var nonNull = members.Where(m => !IsNullSchema(m)).ToList();
            nullable |= nonNull.Count < members.Count;
            if (nonNull.Count == 1 && schema["type"] is null && schema["properties"] is null && schema["$ref"] is null)
            {
                var (inner, innerNullable) = Unwrap(nonNull[0]);
                return (WithWrapperConstraints(inner, schema), nullable || innerNullable);
            }
        }

        return (schema, nullable);
    }

    // Constraints written next to a nullable union apply to its non-null value, so they stay part of the
    // comparison: the wrapper's enum and bounds are copied onto the unwrapped branch (the wrapper wins).
    private static JsonObject? WithWrapperConstraints(JsonObject? inner, JsonObject wrapper)
    {
        var constraints = Bounds.Append("enum").Where(wrapper.ContainsKey).ToList();
        if (constraints.Count == 0)
        {
            return inner;
        }

        var merged = inner?.DeepClone().AsObject() ?? [];
        foreach (var keyword in constraints)
        {
            merged[keyword] = wrapper[keyword]?.DeepClone();
        }

        return merged;
    }

    private static bool IsNullSchema(JsonNode? node) =>
        node?["type"] switch
        {
            JsonValue type => Text(type) == "null",
            JsonArray types => types.Count > 0 && types.All(t => Text(t) == "null"),
            _ => false,
        };

    private static List<string> Types(JsonObject schema) =>
        schema["type"] switch
        {
            JsonValue type when Text(type) != "null" => [Text(type)],
            JsonArray types => [.. types.Select(Text).Where(t => t != "null").Order(StringComparer.Ordinal)],
            _ => [],
        };

    private static IEnumerable<JsonNode?> Items(JsonNode? node) => node as JsonArray ?? [];

    private static string Text(JsonNode? node) => node is JsonValue value && value.GetValueKind() == JsonValueKind.String
        ? value.GetValue<string>()
        : node?.ToJsonString() ?? string.Empty;

    private static string Flag(JsonNode? node) =>
        node is JsonValue value && value.GetValueKind() == JsonValueKind.True ? "true" : "false";

    private static string RefName(string reference) => reference[(reference.LastIndexOf('/') + 1)..];

    // Numbers compare by value (0, 0.0 and 0e0 are equal); patterns compare as text.
    private static string Canonical(JsonValue value)
    {
        var text = Text(value);
        return decimal.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number)
            ? (number / 1.000000000000000000000000000000000m).ToString(CultureInfo.InvariantCulture)
            : text;
    }
}

// Compares two OpenAPI documents through the normalizer and lists every differing path.
public static class ContractComparer
{
    public static IReadOnlyList<string> Compare(JsonNode contract, JsonNode actual)
    {
        var expected = ContractNormalizer.Normalize(contract);
        var generated = ContractNormalizer.Normalize(actual);

        return
        [
            .. expected.Keys.Union(generated.Keys, StringComparer.Ordinal).Order(StringComparer.Ordinal)
                .Select(key => (expected.GetValueOrDefault(key), generated.GetValueOrDefault(key)) switch
                {
                    (null, var value) => $"not in the contract: {key} = {value}",
                    (var value, null) => $"missing in the API:  {key} = {value}",
                    var (want, got) when want != got => $"differs:             {key}: contract {want}, API {got}",
                    _ => null,
                })
                .OfType<string>(),
        ];
    }
}
