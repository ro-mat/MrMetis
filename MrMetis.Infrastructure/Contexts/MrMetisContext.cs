using System;
using MrMetis.Core.Entities;
using MrMetis.Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace MrMetis.Infrastructure.Contexts
{
    public class MrMetisContext : DbContext
    {
        private string _schemaUsed { get; set; }

        public MrMetisContext()
        {
        }

        /// <summary>
        /// Only used by localhost
        /// </summary>
        /// <param name="options"></param>
        /// <param name="configuration"></param>
        public MrMetisContext(DbContextOptions<MrMetisContext> options)
            : base(options)
        {
            _schemaUsed = "dbo";
            Database.SetCommandTimeout(30);
        }

        public MrMetisContext(DbContextOptions<MrMetisContext> options, IConfiguration configuration)
            : base(options)
        {
            _schemaUsed = configuration["Database:Schema"];
            Database.SetCommandTimeout(!String.IsNullOrEmpty(configuration["Database:CommandTimeout"]) ? int.Parse(configuration["Database:CommandTimeout"]) : 30);
        }

        public virtual DbSet<User> Users { get; set; }
        public virtual DbSet<UserData> UserDatas { get; set; }
        public virtual DbSet<InvitationCode> InvitationCodes { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.ApplyBaseEntityConfiguration();
            builder.HasDefaultSchema(_schemaUsed);

            base.OnModelCreating(builder);

            builder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.ToTable(nameof(Users), _schemaUsed);
            });

            builder.Entity<UserData>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.User)
                    .WithOne(d => d.UserData)
                    .HasForeignKey<User>(e => e.UserDataId)
                    .IsRequired();

                entity.ToTable(nameof(UserDatas), _schemaUsed);
            });

            builder.Entity<InvitationCode>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.ToTable(nameof(InvitationCodes), _schemaUsed);
            });
        }
    }
}