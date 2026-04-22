-- Super-admin overrides for OpenAI system prompts (inventory import + coral AI)
CREATE TABLE "ai_system_prompts" (
    "key" VARCHAR(80) NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_system_prompts_pkey" PRIMARY KEY ("key")
);
