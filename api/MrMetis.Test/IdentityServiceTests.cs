using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using MrMetis.Core;
using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Core.Responses;
using MrMetis.Infrastructure.Services;

namespace MrMetis.Test;

public class IdentityServiceTests : DbTestBase
{
    private const string Email = "email@email.com";
    private const string InvitationCode = "code";

    private const string Password = "password";

    private static readonly KeyMaterial Keys = new(Convert.ToBase64String(new byte[Kdf.SaltBytes]), Kdf.MinIterations, "wrapped");

    private static readonly JwtOptions Jwt = new()
    {
        Secret = "BudgetYourLife999-unit-test-secret-at-least-32-bytes",
        Issuer = "test",
        Audience = "test"
    };

    private IdentityService _service = null!;

    [SetUp]
    public void Setup()
    {
        _service = CreateService(new StorageOptions { DefaultLimitMegabytes = 10 });
    }

    [Test]
    public async Task Login_WithCorrectPassword_ShouldReturnTokenAndKey()
    {
        await AddUser();

        var result = await _service.LoginAsync(Email, Password);

        Assert.That(result.Success, Is.True);
        Assert.That(result.Token, Is.Not.Empty);
        Assert.That(result.WrappedKey, Is.EqualTo(Keys.WrappedKey));
    }

    [Test]
    public async Task Login_WithBadPassword_ShouldReturnError()
    {
        await AddUser();

        var result = await _service.LoginAsync(Email, "bad");

        AssertFailed(result.Success, result.Token, result.Errors, "failedLogin");
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

        var result = await _service.RegisterAsync(Email, "password", "bad", Keys);

        AssertFailed(result.Success, result.Token, result.Errors, "codeInvalid");
    }

    [Test]
    public async Task Register_WithExistingEmail_ShouldReturnError()
    {
        await AddInvitationCode();
        await AddUserAsync(Email, "hash");

        var result = await _service.RegisterAsync(Email, Password, InvitationCode, Keys);

        AssertFailed(result.Success, result.Token, result.Errors, "emailExists");
    }

    [Test]
    public async Task Register_WithValidData_ShouldCreateUserAndUseCode()
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", InvitationCode, Keys);

        Assert.That(result.Success, Is.True);
        await using var db = CreateContext();
        var user = await db.Users.Include(u => u.UserData).SingleAsync();
        Assert.That(user.Email, Is.EqualTo(Email));
        Assert.That(user.Password, Is.Not.EqualTo("password"));
        Assert.That(user.KdfSalt, Is.EqualTo(Keys.Salt));
        Assert.That(user.KdfIterations, Is.EqualTo(Keys.Iterations));
        Assert.That(user.WrappedKey, Is.EqualTo(Keys.WrappedKey));
        Assert.That(user.UserData.UserId, Is.EqualTo(user.Id));
        AssertCreatedNow(user.IsActive, user.Created, user.Modified);
        AssertCreatedNow(user.UserData.IsActive, user.UserData.Created, user.UserData.Modified);

        // invitation code is soft deleted
        Assert.That(await db.InvitationCodes.AnyAsync(), Is.False);
        var code = await db.InvitationCodes.IgnoreQueryFilters().SingleAsync();
        Assert.That(code.IsActive, Is.False);
        Assert.That(code.Modified, Is.GreaterThan(code.Created));

        Assert.That((await _service.LoginAsync(Email, "password")).Success, Is.True);
        Assert.That((await _service.RegisterAsync("other@email.com", "password", InvitationCode, Keys)).Errors, Is.EqualTo(new[] { "codeInvalid" }));
    }

    [Test]
    public async Task Register_ShouldReturnTokenWithUserClaims()
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", InvitationCode, Keys);

        var token = new JsonWebTokenHandler().ReadJsonWebToken(result.Token);
        await using var db = CreateContext();
        var user = await db.Users.SingleAsync();
        Assert.That(token.GetClaim(JwtRegisteredClaimNames.Email).Value, Is.EqualTo(Email));
        Assert.That(token.GetClaim("id").Value, Is.EqualTo(user.Id.ToString()));
        Assert.That(token.ValidTo, Is.EqualTo(DateTime.UtcNow.AddMinutes(120)).Within(TimeSpan.FromMinutes(1)));
    }

    [Test]
    public async Task Register_ShouldFixStorageLimitForTheUser()
    {
        await AddInvitationCode();
        await _service.RegisterAsync(Email, "password", InvitationCode, Keys);

        // the configured limit changes later
        await AddInvitationCode("other");
        await CreateService(new StorageOptions { DefaultLimitMegabytes = 20 })
            .RegisterAsync("other@email.com", "password", "other", Keys);

        await using var db = CreateContext();
        var limits = await db.Users.OrderBy(u => u.Id).Select(u => u.StorageLimitBytes).ToListAsync();
        Assert.That(limits, Is.EqualTo(new[] { 10L * 1024 * 1024, 20L * 1024 * 1024 }));
    }

    [TestCase("AAAA", Kdf.MinIterations, "wrapped")]
    [TestCase("not base64!", Kdf.MinIterations, "wrapped")]
    [TestCase("AAAAAAAAAAAAAAAAAAAAAA==", Kdf.MinIterations - 1, "wrapped")]
    [TestCase("AAAAAAAAAAAAAAAAAAAAAA==", Kdf.MinIterations, "")]
    public async Task Register_WithBadKeyMaterial_ShouldReturnError(string salt, int iterations, string wrappedKey)
    {
        await AddInvitationCode();

        var result = await _service.RegisterAsync(Email, "password", InvitationCode, new KeyMaterial(salt, iterations, wrappedKey));

        AssertFailed(result.Success, result.Token, result.Errors, "kdfInvalid");
        await using var db = CreateContext();
        Assert.That(await db.Users.AnyAsync(), Is.False);
    }

    [Test]
    public async Task Prelogin_KnownUser_ShouldReturnStoredKdf()
    {
        await AddInvitationCode();
        await _service.RegisterAsync(Email, "password", InvitationCode, Keys);

        var result = await _service.PreloginAsync(Email);

        Assert.That(result, Is.EqualTo(new PreloginResponse(Keys.Salt, Keys.Iterations)));
    }

    [Test]
    public async Task Prelogin_UnknownUser_ShouldReturnStableFakeSalt()
    {
        var result = await _service.PreloginAsync("nobody@email.com");

        Assert.That(result.Iterations, Is.EqualTo(Kdf.MinIterations));
        Assert.That(Convert.FromBase64String(result.Salt!), Has.Length.EqualTo(Kdf.SaltBytes));
        Assert.That((await _service.PreloginAsync("nobody@email.com")).Salt, Is.EqualTo(result.Salt));
        Assert.That((await _service.PreloginAsync("other@email.com")).Salt, Is.Not.EqualTo(result.Salt));
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

    private async Task AddUser()
    {
        await AddInvitationCode();
        await _service.RegisterAsync(Email, Password, InvitationCode, Keys);
        Db.ChangeTracker.Clear();
    }

    private IdentityService CreateService(StorageOptions storage) =>
        new(Db, Options.Create(Jwt), Options.Create(storage), new PasswordHasher<User>(), TimeProvider.System);

    private Task AddInvitationCode(string code = InvitationCode) =>
        SeedAsync(new InvitationCode { Code = code, IsActive = true, Created = DateTime.UtcNow.AddDays(-1) });
}
