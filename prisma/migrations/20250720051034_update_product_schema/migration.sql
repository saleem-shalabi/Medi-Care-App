/*
  Warnings:

  - You are about to drop the column `details` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `ProductMedia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductStock` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `description` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProductMedia" DROP CONSTRAINT "ProductMedia_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductPricing" DROP CONSTRAINT "ProductPricing_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductStock" DROP CONSTRAINT "ProductStock_productId_fkey";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "details",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "images" TEXT[],
ADD COLUMN     "qrCode" TEXT,
ADD COLUMN     "rentPrice" DOUBLE PRECISION,
ADD COLUMN     "rentStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "saleStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellPrice" DOUBLE PRECISION,
ADD COLUMN     "videos" TEXT[];

-- DropTable
DROP TABLE "ProductMedia";

-- DropTable
DROP TABLE "ProductPricing";

-- DropTable
DROP TABLE "ProductStock";

-- DropEnum
DROP TYPE "MediaType";
