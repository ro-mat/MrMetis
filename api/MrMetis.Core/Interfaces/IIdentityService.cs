using MrMetis.Core.Dtos;
using MrMetis.Core.Responses;

namespace MrMetis.Core.Interfaces;

public interface IIdentityService
{
    Task<PreloginResponse> PreloginAsync(string email, CancellationToken ct = default);
    Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode, KeyMaterial keys, CancellationToken ct = default);
    Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default);
}
