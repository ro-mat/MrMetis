using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrMetis.Infrastructure.Migrations
{
    public partial class invitation_code : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_UserDatas_UserId",
                schema: "dbo",
                table: "UserDatas");

            migrationBuilder.DropColumn(
                name: "UserId",
                schema: "dbo",
                table: "UserDatas");

            migrationBuilder.AlterColumn<int>(
                name: "UserDataId",
                schema: "dbo",
                table: "Users",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "Modified",
                schema: "dbo",
                table: "Users",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Modified",
                schema: "dbo",
                table: "UserDatas",
                type: "datetime2",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "datetime2");

            migrationBuilder.CreateTable(
                name: "InvitationCodes",
                schema: "dbo",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Created = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Modified = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InvitationCodes", x => x.Id);
                });

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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropTable(
                name: "InvitationCodes",
                schema: "dbo");

            migrationBuilder.DropIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.AlterColumn<int>(
                name: "UserDataId",
                schema: "dbo",
                table: "Users",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Modified",
                schema: "dbo",
                table: "Users",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "Modified",
                schema: "dbo",
                table: "UserDatas",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified),
                oldClrType: typeof(DateTime),
                oldType: "datetime2",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                schema: "dbo",
                table: "UserDatas",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddUniqueConstraint(
                name: "AK_UserDatas_UserId",
                schema: "dbo",
                table: "UserDatas",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users",
                column: "UserDataId",
                unique: true,
                filter: "[UserDataId] IS NOT NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users",
                column: "UserDataId",
                principalSchema: "dbo",
                principalTable: "UserDatas",
                principalColumn: "UserId");
        }
    }
}
