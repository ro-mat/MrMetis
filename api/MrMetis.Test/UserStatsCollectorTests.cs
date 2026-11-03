using MrMetis.Core.Entities;
using MrMetis.Infrastructure.Telemetry;

namespace MrMetis.Test;

public class UserStatsCollectorTests : DbTestBase
{
    private const long Megabyte = 1024 * 1024;

    [Test]
    public async Task Load_ShouldCountUsersByLimitAndUsage()
    {
        await AddUserWithDataAsync("empty@email.com", Megabyte, null);
        await AddUserWithDataAsync("low@email.com", Megabyte, 100);
        await AddUserWithDataAsync("half@email.com", 10 * Megabyte, (int)(5 * Megabyte));
        await AddUserWithDataAsync("full@email.com", 10 * Megabyte, (int)(10 * Megabyte));
        var deleted = await AddUserWithDataAsync("deleted@email.com", 10 * Megabyte, 100);
        deleted.IsActive = false;
        Db.Update(deleted);
        await Db.SaveChangesAsync();
        await SeedAsync(new InvitationCode { Code = "code", IsActive = true, Created = DateTime.UtcNow });

        var stats = await UserStatsCollector.LoadAsync(Db);

        Assert.That(stats.Users, Is.EqualTo(4));
        Assert.That(stats.UsersWithData, Is.EqualTo(3));
        Assert.That(stats.StorageUsedBytes, Is.EqualTo(100 + 15 * Megabyte));
        Assert.That(stats.UnusedInvitationCodes, Is.EqualTo(1));
        Assert.That(stats.ByLimitMegabytes, Is.EquivalentTo(new Dictionary<string, long> { ["1"] = 2, ["10"] = 2 }));
        Assert.That(stats.ByUsage, Is.EquivalentTo(new Dictionary<string, long>
        {
            ["empty"] = 1,
            ["0-25%"] = 1,
            ["25-50%"] = 0,
            ["50-75%"] = 1,
            ["75-90%"] = 0,
            ["90-100%"] = 1
        }));
    }

    [Test]
    public void From_NoUsers_ShouldReportEveryUsageBucket()
    {
        var stats = UserStats.From([], 0);

        Assert.That(stats.Users, Is.Zero);
        Assert.That(stats.ByLimitMegabytes, Is.Empty);
        Assert.That(stats.ByUsage.Values, Has.All.Zero);
        Assert.That(stats.ByUsage.Keys, Has.Count.EqualTo(UserStats.UsageBuckets.Count + 1));
    }

    private async Task<User> AddUserWithDataAsync(string email, long limitBytes, int? dataBytes)
    {
        var user = await AddUserAsync(email, "hash", limitBytes);
        if (dataBytes is { } bytes)
        {
            var userData = Db.UserDatas.Single(d => d.UserId == user.Id);
            userData.Data = new string('A', bytes);
            await Db.SaveChangesAsync();
            Db.ChangeTracker.Clear();
        }

        return user;
    }
}
