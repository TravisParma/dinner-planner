-- CreateTable
CREATE TABLE "IngredientLibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "defaultUnit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "IngredientLibraryItem_name_key" ON "IngredientLibraryItem"("name");
