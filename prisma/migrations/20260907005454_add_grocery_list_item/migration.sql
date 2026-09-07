-- CreateTable
CREATE TABLE "GroceryListItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rangeStart" TEXT NOT NULL,
    "rangeEnd" TEXT NOT NULL,
    "itemKey" TEXT,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "unit" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "removed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "GroceryListItem_rangeStart_rangeEnd_itemKey_key" ON "GroceryListItem"("rangeStart", "rangeEnd", "itemKey");
