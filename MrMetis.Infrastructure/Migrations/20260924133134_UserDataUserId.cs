using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrMetis.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UserDataUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // add the new key as nullable first, so existing links can be copied before the old key is dropped
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                schema: "dbo",
                table: "UserDatas",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE d SET d.UserId = u.Id
                FROM dbo.UserDatas d
                JOIN dbo.Users u ON u.UserDataId = d.Id");

            // rows no user points to were unreachable
            migrationBuilder.Sql("DELETE FROM dbo.UserDatas WHERE UserId IS NULL");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                schema: "dbo",
                table: "UserDatas",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_UserDatas_UserId",
                schema: "dbo",
                table: "UserDatas",
                column: "UserId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_UserDatas_Users_UserId",
                schema: "dbo",
                table: "UserDatas",
                column: "UserId",
                principalSchema: "dbo",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserDataId",
                schema: "dbo",
                table: "Users",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE u SET u.UserDataId = d.Id
                FROM dbo.Users u
                JOIN dbo.UserDatas d ON d.UserId = u.Id");

            migrationBuilder.AlterColumn<int>(
                name: "UserDataId",
                schema: "dbo",
                table: "Users",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.DropForeignKey(
                name: "FK_UserDatas_Users_UserId",
                schema: "dbo",
                table: "UserDatas");

            migrationBuilder.DropIndex(
                name: "IX_UserDatas_UserId",
                schema: "dbo",
                table: "UserDatas");

            migrationBuilder.DropColumn(
                name: "UserId",
                schema: "dbo",
                table: "UserDatas");

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users",
                column: "UserDataId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users",
                column: "UserDataId",
                principalSchema: "dbo",
                principalTable: "UserDatas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
