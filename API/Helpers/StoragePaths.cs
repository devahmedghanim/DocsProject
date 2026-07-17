namespace NexusPms.Api.Helpers;

//#region Edit By AI
public static class StoragePaths
{
    public static string NormalizeRoute(string? route)
    {
        return (route ?? string.Empty).Trim().Trim('/').ToLowerInvariant();
    }

    public static bool IsSafeSegment(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return value.All(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_');
    }
}
//#endregion Edit By AI
