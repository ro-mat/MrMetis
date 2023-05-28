using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MrMetis.Infrastructure.Migrations
{
    public partial class nullable_user_data : Migration
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

            migrationBuilder.AlterColumn<int>(
                name: "UserDataId",
                schema: "dbo",
                table: "Users",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

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

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_UserDatas_UserDataId",
                schema: "dbo",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_UserDataId",
                schema: "dbo",
                table: "Users");

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
                principalColumn: "UserId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
