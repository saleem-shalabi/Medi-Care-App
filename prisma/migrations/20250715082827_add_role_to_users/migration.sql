/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `Users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'ACCOUNTANT', 'MAINTENANCE');

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "isAdmin",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
