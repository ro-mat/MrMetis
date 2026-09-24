using System.Security.Cryptography;
using System.Text;

namespace MrMetis.Core.Helpers;

/// <summary>
/// Legacy password hash (iterated salted SHA-256). Only used to verify users created before the switch to
/// PasswordHasher, whose hash is upgraded on their next successful login.
/// </summary>
public static class HashHelper
{
    private const int Iterations = 1205;

    public static bool Verify(string password, string salt, string hash)
    {
        var computed = HashString(password, salt);
        return CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(computed), Encoding.UTF8.GetBytes(hash));
    }

    public static string HashString(string str, string salt)
    {
        for (var i = 0; i < Iterations; i++)
        {
            str = Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(str + salt)));
        }

        return str;
    }
}
