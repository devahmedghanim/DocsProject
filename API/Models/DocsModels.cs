using System.Text.Json.Serialization;

namespace NexusPms.Api.Models;

//#region Edit By AI
public sealed class LocalizedText
{
    [JsonPropertyName("ar")]
    public string Ar { get; set; } = string.Empty;

    [JsonPropertyName("en")]
    public string En { get; set; } = string.Empty;
}

public sealed class GroupModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("route")]
    public string Route { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = "📂";

    [JsonPropertyName("order")]
    public int Order { get; set; }

    [JsonPropertyName("title")]
    public LocalizedText Title { get; set; } = new();

    [JsonPropertyName("desc")]
    public LocalizedText Desc { get; set; } = new();
}

public sealed class SectionModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("route")]
    public string Route { get; set; } = string.Empty;

    [JsonPropertyName("icon")]
    public string Icon { get; set; } = "📄";

    [JsonPropertyName("order")]
    public int Order { get; set; }

    [JsonPropertyName("groupRoute")]
    public string GroupRoute { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public LocalizedText Title { get; set; } = new();

    [JsonPropertyName("desc")]
    public LocalizedText Desc { get; set; } = new();
}

public sealed class GuideMedia
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "image";

    [JsonPropertyName("src")]
    public string Src { get; set; } = string.Empty;
}

public sealed class GuideModel
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("number")]
    public int Number { get; set; } = 1;

    [JsonPropertyName("title")]
    public LocalizedText Title { get; set; } = new();

    [JsonPropertyName("desc")]
    public LocalizedText Desc { get; set; } = new();

    [JsonPropertyName("media")]
    public Dictionary<string, GuideMedia> Media { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}
//#endregion Edit By AI
