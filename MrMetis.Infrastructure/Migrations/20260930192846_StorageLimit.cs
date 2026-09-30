using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrMetis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class StorageLimit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "StorageLimitBytes",
                schema: "dbo",
                table: "Users",
                type: "bigint",
                nullable: false,
                // existing users get the 10 MB new users start with
                defaultValue: 10L * 1024 * 1024);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StorageLimitBytes",
                schema: "dbo",
                table: "Users");
        }
    }
}
