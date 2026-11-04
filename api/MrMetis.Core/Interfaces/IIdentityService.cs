using MrMetis.Core.Dtos;
using MrMetis.Core.Requests;
using MrMetis.Core.Responses;

namespace MrMetis.Core.Interfaces;

public interface IIdentityService
{
    Task<PreloginResponse> PreloginAsync(string email, CancellationToken ct = default);
    Task<AuthenticationResult> RegisterAsync(string email, string password, string? invitationCode, KeyMaterial keys, RecoveryMaterial? recovery = null, CancellationToken ct = default);
    Task<AuthenticationResult> LoginAsync(string email, string password, CancellationToken ct = default);
    Task<KeyMaterial?> GetKeysAsync(int userId, CancellationToken ct = default);
    Task<AuthenticationResult> ChangePasswordAsync(int userId, string currentPassword, string newPassword, KeyMaterial keys, CancellationToken ct = default);
    Task<RecoveryStatus> GetRecoveryStatusAsync(int userId, CancellationToken ct = default);
    Task<AuthenticationResult> SetRecoveryAsync(int userId, string currentPassword, RecoveryMaterial recovery, CancellationToken ct = default);
    Task<string?> StartRecoveryAsync(string email, string recoveryKey, CancellationToken ct = default);
    Task<AuthenticationResult> RecoverAsync(RecoverRequest request, CancellationToken ct = default);
}
