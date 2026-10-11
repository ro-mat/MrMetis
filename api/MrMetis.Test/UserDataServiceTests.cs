using Microsoft.EntityFrameworkCore;
using MrMetis.Core.Dtos;
using MrMetis.Core.Exceptions;
using MrMetis.Infrastructure.Services;

namespace MrMetis.Test;

public class UserDataServiceTests : DbTestBase
{
    private UserDataService _service = null!;
    private int _userId;

    private const long Limit = 10;

    [SetUp]
    public async Task Setup()
    {
        var user = await AddUserAsync("email@email.com", "hash", Limit);

        _userId = user.Id;
        _service = new UserDataService(Db, TimeProvider.System);
    }

    [Test]
    public async Task Get_NewUser_ShouldReturnEmptyData()
    {
        var result = await _service.GetAsync(_userId);

        Assert.That(result.Data, Is.Null);
        Assert.That(result.Usage, Is.EqualTo(new StorageUsage(0, Limit)));
    }

    [Test]
    public async Task Set_ShouldPersistData()
    {
        var result = await _service.SetAsync(_userId, new UserDataDto("encrypted"));

        Assert.That(result.Data, Is.Null);
        Assert.That(result.Usage, Is.EqualTo(new StorageUsage(9, Limit)));
        await using var db = CreateContext();
        var stored = await new UserDataService(db, TimeProvider.System).GetAsync(_userId);
        Assert.That(stored, Is.EqualTo(new UserDataDto("encrypted", new StorageUsage(9, Limit))));
        var userData = await db.UserDatas.SingleAsync();
        Assert.That(userData.Modified, Is.EqualTo(DateTime.UtcNow).Within(TimeSpan.FromMinutes(1)));
    }

    [Test]
    public async Task Set_ExactlyAtLimit_ShouldPersistData()
    {
        var result = await _service.SetAsync(_userId, new UserDataDto("0123456789"));

        Assert.That(result.Usage, Is.EqualTo(new StorageUsage(Limit, Limit)));
    }

    [Test]
    public async Task Set_OverLimit_ShouldThrowAndKeepOldData()
    {
        await _service.SetAsync(_userId, new UserDataDto("old"));

        Assert.That(() => _service.SetAsync(_userId, new UserDataDto("0123456789A")),
            Throws.TypeOf<MrMetisException>().With.Message.EqualTo("storageLimitExceeded"));
        await using var db = CreateContext();
        Assert.That((await db.UserDatas.SingleAsync()).Data, Is.EqualTo("old"));
    }

    [Test]
    public void Get_UnknownUser_ShouldThrow()
    {
        Assert.That(() => _service.GetAsync(_userId + 1),
            Throws.TypeOf<MrMetisException>().With.Message.EqualTo("userNotFound"));
    }

    [Test]
    public async Task Get_SoftDeletedUser_ShouldThrow()
    {
        var user = await Db.Users.FindAsync(_userId) ?? throw new InvalidOperationException();
        user.IsActive = false;
        await Db.SaveChangesAsync();

        Assert.ThrowsAsync<MrMetisException>(() => _service.GetAsync(_userId));
    }
}
