using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using MrMetis.Core.Entities;
using MrMetis.Core.Options;
using MrMetis.Infrastructure.Helpers;

namespace MrMetis.Infrastructure.Contexts;

public class MrMetisContext(DbContextOptions<MrMetisContext> options, IOptions<DatabaseOptions> databaseOptions)
    : DbContext(options)
{
    private readonly string _schema = databaseOptions.Value.Schema;

    public DbSet<User> Users => Set<User>();
    public DbSet<UserData> UserDatas => Set<UserData>();
    public DbSet<InvitationCode> InvitationCodes => Set<InvitationCode>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema(_schema);

        builder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();

            entity.ToTable(nameof(Users), _schema);
        });

        builder.Entity<UserData>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.User)
                .WithOne(d => d.UserData)
                .HasForeignKey<User>(e => e.UserDataId)
                .IsRequired();

            entity.ToTable(nameof(UserDatas), _schema);
        });

        builder.Entity<InvitationCode>(entity =>
        {
            entity.HasKey(e => e.Id);

            entity.ToTable(nameof(InvitationCodes), _schema);
        });

        builder.ApplySoftDeleteQueryFilter();
    }
}
