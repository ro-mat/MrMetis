using MrMetis.Core.Dtos;
using MrMetis.Core.Entities;
using MrMetis.Core.Exceptions;
using MrMetis.Infrastructure.Services;

namespace MrMetis.Test;

public class UserDataServiceTests : DbTestBase
{
    private UserDataService _service = null!;
    private int _userId;

    [SetUp]
    public async Task Setup()
    {
        var user = new User { Email = "email@email.com", Password = "hash", UserData = new UserData() };
        Db.Users.Add(user);
        await Db.SaveChangesAsync();
        Db.ChangeTracker.Clear();

        _userId = user.Id;
        _service = new UserDataService(Db);
    }

    [Test]
    public async Task Get_NewUser_ShouldReturnEmptyData()
    {
        var result = await _service.GetAsync(_userId);

        Assert.That(result.Data, Is.Null);
    }

    [Test]
    public async Task Set_ShouldPersistData()
    {
        var result = await _service.SetAsync(_userId, new UserDataDto("encrypted"));

        Assert.That(result.Data, Is.EqualTo("encrypted"));
        await using var db = CreateContext();
        Assert.That((await new UserDataService(db).GetAsync(_userId)).Data, Is.EqualTo("encrypted"));
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
        Db.Users.Remove(await Db.Users.FindAsync(_userId) ?? throw new InvalidOperationException());
        await Db.SaveChangesAsync();

        Assert.ThrowsAsync<MrMetisException>(() => _service.GetAsync(_userId));
    }
}
