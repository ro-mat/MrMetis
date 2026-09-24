namespace MrMetis.Core.Requests;

public record UserRegistrationRequest(string Email, string Password, string InvitationCode);
