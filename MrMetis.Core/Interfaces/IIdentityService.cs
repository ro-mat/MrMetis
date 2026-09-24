using MrMetis.Core.Responses;

namespace MrMetis.Core.Interfaces;

public interface IIdentityService
{
    Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode, CancellationToken ct = default);
    Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default);
}
