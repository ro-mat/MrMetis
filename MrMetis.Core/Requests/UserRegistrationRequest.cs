namespace MrMetis.Core.Requests;

public class UserRegistrationRequest
{
    public string Email { get; set; }
    public string Password { get; set; }
    public string InvitationCode { get; set; }
}