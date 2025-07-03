-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('SINGLE_PLAYER', 'MULTIPLAYER');

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "difficulty" TEXT,
ADD COLUMN     "gameType" "GameType" NOT NULL DEFAULT 'MULTIPLAYER';
