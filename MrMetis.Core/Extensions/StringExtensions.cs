using System;

namespace MrMetis.Core.Extensions
{
    public static class StringExtensions
    {
        public static bool EqualsIgnoreCase(this string str1, string str2)
        {
            if (str1 is null)
            {
                return str2 is null;
            }

            return str1.Equals(str2, StringComparison.OrdinalIgnoreCase);
        }
    }
}
