using System.Collections.Generic;
using System.Linq;

namespace MrMetis.Core.Extensions;

public static class ConnectionStringExtensions
{
    public static string? GetFieldValue(this string connectionString, string fieldName)
    {
        var split = connectionString.Split(';');
        var field = split.FirstOrDefault(x => x.StartsWith(fieldName, true, null));
        return field != null && field.Contains('=') ? field.Split('=')[1] : null;
    }

    public static string SetNewDatabase(this string connectionString, string newDatabaseName = "master")
    {
        var split = connectionString.Split(';');
        var res = new List<string>(split.Length);

        foreach (var item in split)
        {
            if (item.StartsWith("Initial Catalog="))
            {
                res.Add($"Initial Catalog={newDatabaseName}");
            }
            else
            {
                res.Add(item);
            }
        }

        return string.Join(";", res);
    }
}