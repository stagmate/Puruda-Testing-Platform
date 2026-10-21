import { CheckCircle2 } from "lucide-react"
import { RichText } from "@/components/rich-text"
import type { QuestionDraft } from "@/lib/question-input"
import { cn } from "@/lib/utils"

const TYPE_LABEL = { SINGLE: "Single correct", MULTIPLE: "Multiple correct", INTEGER: "Integer" } as const
const DIFF_STYLE = {
    BEGINNER: "bg-green-100 text-green-800",
    INTERMEDIATE: "bg-amber-100 text-amber-800",
    ADVANCED: "bg-red-100 text-red-800",
} as const

/** Read-only rendering of a question, with the correct answer marked. */
export function QuestionView({ draft, number, showAnswer = true, showSolution = true }: {
    draft: QuestionDraft
    number?: string | number
    showAnswer?: boolean
    showSolution?: boolean
}) {
    const options = draft.options
        .map((text, i) => ({ text, image: draft.optionImages[i], letter: "ABCD"[i] }))
        .filter(o => o.text || o.image)

    return (
        <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">{TYPE_LABEL[draft.type]}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", DIFF_STYLE[draft.difficulty])}>{draft.difficulty.toLowerCase()}</span>
            </div>

            <p className="leading-relaxed text-slate-900">
                {number !== undefined && <span className="mr-1.5 font-semibold">{number}.</span>}
                <RichText text={draft.text} />
            </p>

            {draft.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.imageUrl} alt="Question diagram" className="max-h-64 max-w-full rounded border bg-white object-contain" />
            )}

            {draft.type === "INTEGER" ? (
                showAnswer && (
                    <p className="text-sm"><span className="text-slate-500">Answer: </span><span className="font-semibold text-green-700">{draft.correct[0] ?? "—"}</span></p>
                )
            ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                    {options.map(o => {
                        const correct = showAnswer && draft.correct.includes(o.letter)
                        return (
                            <li key={o.letter} className={cn("flex items-start gap-2 rounded-md border px-2.5 py-2", correct ? "border-green-300 bg-green-50" : "border-slate-200 bg-white")}>
                                <span className={cn("mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", correct ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600")}>
                                    {o.letter}
                                </span>
                                <div className="min-w-0 flex-1">
                                    {o.text && <RichText text={o.text} />}
                                    {o.image && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={o.image} alt={`Option ${o.letter}`} className="mt-1 max-h-32 max-w-full rounded bg-white object-contain" />
                                    )}
                                </div>
                                {correct && <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-green-600" aria-label="Correct" />}
                            </li>
                        )
                    })}
                </ul>
            )}

            {showSolution && draft.solution && (
                <details className="rounded-md bg-blue-50 px-3 py-2 text-slate-700">
                    <summary className="cursor-pointer text-xs font-semibold text-blue-700">Solution</summary>
                    <p className="mt-1 leading-relaxed"><RichText text={draft.solution} /></p>
                </details>
            )}
        </div>
    )
}
