using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrMetis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Recovery : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RecoveryAuthHash",
                schema: "dbo",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RecoveryCreated",
                schema: "dbo",
                table: "Users",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RecoveryWrappedKey",
                schema: "dbo",
                table: "Users",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RecoveryAuthHash",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RecoveryCreated",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "RecoveryWrappedKey",
                schema: "dbo",
                table: "Users");
        }
    }
}
