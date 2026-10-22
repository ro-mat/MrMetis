namespace MrMetis.Core.Interfaces;

public interface ITokenService
{
    string CreateToken(int userId, string email);
}
