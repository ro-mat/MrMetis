using System;
using System.Security.Cryptography;
using System.Text;
using MrMetis.Core.Dtos;

namespace MrMetis.Core.Helpers;

public class HashHelper
{
    private const int Iterations = 1205;

    public static HashModel HashString(string str, string salt = null)
    {
        salt ??= GetSalt();
        using var sha256 = SHA256.Create();
        byte[] hashedBytes;

        for (var i = 0; i < Iterations; i++)
        {
            hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(str + salt));
            str = BitConverter.ToString(hashedBytes).Replace("-", "").ToLower();
        }

        return new HashModel
        {
            Hash = str,
            Salt = salt
        };
    }

    private static string GetSalt()
    {
        var bytes = new byte[128 / 8];
        using var keyGenerator = RandomNumberGenerator.Create();
        keyGenerator.GetBytes(bytes);
        return BitConverter.ToString(bytes).Replace("-", "").ToLower();
    }
}