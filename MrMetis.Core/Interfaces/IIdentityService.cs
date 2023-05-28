using System.Threading.Tasks;
using MrMetis.Core.Responses;

namespace MrMetis.Core.Interfaces;

public interface IIdentityService
{
    Task<AuthenticationResult> RegisterAsync(string email, string password, string invitationCode);
    Task<AuthenticationResult> LoginAsync(string email, string password);
}