using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BOMKeeper.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddChosenOfferIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Offers_ItemId_Chosen",
                table: "Offers",
                column: "ItemId",
                unique: true,
                filter: "\"IsChosen\"");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Offers_ItemId_Chosen",
                table: "Offers");
        }
    }
}
