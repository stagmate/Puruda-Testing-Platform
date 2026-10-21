import { Difficulty, QuestionType } from "@prisma/client"

export function isQuestionType(v: unknown): v is QuestionType {
    return typeof v === "string" && (Object.values(QuestionType) as string[]).includes(v)
}

export function isDifficulty(v: unknown): v is Difficulty {
    return typeof v === "string" && (Object.values(Difficulty) as string[]).includes(v)
}
