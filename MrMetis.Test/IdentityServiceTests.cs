using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Services;

namespace MrMetis.Test;

public class IdentityServiceTests : DbTestBase
{
    private const string Email = "email@email.com";
    private const string InvitationCode = "code";

    // user created with the legacy HashHelper hash
    private const string LegacyHash = "d7c8efc324bf9028757eb6c21c0f89e132ce05d520d4e52a70c0ed85dbaa0de3";
    private const string LegacySalt = "aslqvigxjd6y2k30kud6i3a67g930yc1";
    private const string LegacyPassword = "8570rglys6qtzb619yiweu9bhtg1o2hhu0qwyn22u52adbdmwkf25wkgf1mzt1ej";

    private IdentityService _service = null!;

    [SetUp]
    public void Setup()
    {
        var jwt = new JwtOptions
        {
            Secret = "BudgetYourLife999-unit-test-secret-at-least-32-bytes",
            Issuer = "test",
            Audience = "test"
        };
        _service = new IdentityService(Db, Options.Create(jwt), new PasswordHasher<User>(), TimeProvider.System);
    }

    [Test]
    public async Task Login_LegacyUserWithCorrectData_ShouldReturnToken()
    {
        await AddLegacyUser(LegacyHash, LegacySalt);

        var result = await _service.LoginAsync(Email, LegacyPassword);

        Assert.That(result.Success, Is.True);
        Assert.That(result.Token, Is.Not.Empty);
    }

    [Test]
    public async Task Login_LegacyUser_ShouldUpgradeHash()
    {
        await AddLegacyUser(LegacyHash, LegacySalt);

        await _service.LoginAsync(Email, LegacyPassword);

        await using var db = CreateContext();
        var user = await db.Users.SingleAsync();
        Assert.That(user.Salt, Is.Null);
        Assert.That(user.Password, Is.Not.EqualTo(LegacyHash));
        Assert.That(user.Modified, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromMinutes(1)));
        Assert.That((await _service.LoginAsync(Email, LegacyPassword)).Success, Is.True);
        Assert.That((await _service.LoginAsync(Email, "bad")).Success, Is.False);
    }

    [TestCase("bad", LegacySalt, LegacyPassword)]
    [TestCase(LegacyHash, "bad", LegacyPassword)]
    [TestCase(LegacyHash, LegacySalt, "bad")]
    public async Task Login_LegacyUserWithBadData_ShouldReturnError(string dbPass, string salt, string userPass)
    {
        await AddLegacyUser(dbPass, salt);

        var result = await _service.LoginAsync(Email, userPass);

        AssertFailed(result.Success, result.Token, result.Errors, "failedLogin");
        await using var db = CreateContext();
        Assert.That((await db.Users.SingleAsync()).Salt, Is.EqualTo(salt));
    }

    [Test]
    public async Task Login_WithBadEmail_ShouldReturnError()
    {
        var result = await _service.LoginAsync("any", "any");

        AssertFailed(result.Success, result.Token, result.Errors, "failedLogin");
    }

    [Test]
    public async Task Register_WithBadCode_ShouldReturnError()
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", "bad");

        AssertFailed(result.Success, result.Token, result.Errors, "codeInvalid");
    }

    [Test]
    public async Task Register_WithExistingEmail_ShouldReturnError()
    {
        await AddInvitationCode();
        await AddLegacyUser(LegacyHash, LegacySalt);

        var result = await _service.RegisterAsync(Email, "password", InvitationCode);

        AssertFailed(result.Success, result.Token, result.Errors, "emailExists");
    }

    [Test]
    public async Task Register_WithValidData_ShouldCreateUserAndUseCode()
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", InvitationCode);

        Assert.That(result.Success, Is.True);
        await using var db = CreateContext();
        var user = await db.Users.Include(u => u.UserData).SingleAsync();
        Assert.That(user.Email, Is.EqualTo(Email));
        Assert.That(user.Password, Is.Not.EqualTo("password"));
        Assert.That(user.Salt, Is.Null);
        Assert.That(user.UserData.UserId, Is.EqualTo(user.Id));
        AssertCreatedNow(user.IsActive, user.Created, user.Modified);
        AssertCreatedNow(user.UserData.IsActive, user.UserData.Created, user.UserData.Modified);

        // invitation code is soft deleted
        Assert.That(await db.InvitationCodes.AnyAsync(), Is.False);
        var code = await db.InvitationCodes.IgnoreQueryFilters().SingleAsync();
        Assert.That(code.IsActive, Is.False);
        Assert.That(code.Modified, Is.GreaterThan(code.Created));

        Assert.That((await _service.LoginAsync(Email, "password")).Success, Is.True);
        Assert.That((await _service.RegisterAsync("other@email.com", "password", InvitationCode)).Errors, Is.EqualTo(new[] { "codeInvalid" }));
    }

    [Test]
    public async Task Register_ShouldReturnTokenWithUserClaims()
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", InvitationCode);

        var token = new JsonWebTokenHandler().ReadJsonWebToken(result.Token);
        await using var db = CreateContext();
        var user = await db.Users.SingleAsync();
        Assert.That(token.GetClaim(JwtRegisteredClaimNames.Email).Value, Is.EqualTo(Email));
        Assert.That(token.GetClaim("id").Value, Is.EqualTo(user.Id.ToString()));
        Assert.That(token.ValidTo, Is.EqualTo(DateTime.UtcNow.AddMinutes(120)).Within(TimeSpan.FromMinutes(1)));
    }

    private static void AssertCreatedNow(bool isActive, DateTime created, DateTime? modified)
    {
        Assert.That(isActive, Is.True);
        Assert.That(created, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromMinutes(1)));
        Assert.That(modified, Is.EqualTo(created));
    }

    private static void AssertFailed(bool success, string? token, IReadOnlyList<string> errors, string error)
    {
        Assert.That(success, Is.False);
        Assert.That(token, Is.Null);
        Assert.That(errors, Is.EqualTo(new[] { error }));
    }

    private async Task AddLegacyUser(string hash, string salt)
    {
        var created = DateTime.UtcNow.AddDays(-1);
        Db.Users.Add(new User
        {
            Email = Email,
            Password = hash,
            Salt = salt,
            UserData = new UserData { IsActive = true, Created = created },
            IsActive = true,
            Created = created
        });
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }

    private async Task AddInvitationCode()
    {
        Db.InvitationCodes.Add(new InvitationCode { Code = InvitationCode, IsActive = true, Created = DateTime.UtcNow.AddDays(-1) });
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();
    }
}
