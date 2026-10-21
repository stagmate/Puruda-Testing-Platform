"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RichText } from "@/components/rich-text"
import { ImageSlot } from "./image-slot"
import { normalizeQuestion, type QuestionDraft, type QuestionType, type Difficulty } from "@/lib/question-input"
import { cn } from "@/lib/utils"

const LETTERS = ["A", "B", "C", "D"]
const TYPES: { value: QuestionType; label: string; hint: string }[] = [
    { value: "SINGLE", label: "Single correct", hint: "MCQ, one answer" },
    { value: "MULTIPLE", label: "Multiple correct", hint: "MCQ, one or more answers" },
    { value: "INTEGER", label: "Integer", hint: "Numeric answer" },
]

/** Validation message for a draft, or null if it can be saved. */
export function draftError(d: QuestionDraft): string | null {
    return normalizeQuestion({ ...d }).error ?? null
}

/** Edits a question draft: type, text, images, options, correct answer(s), solution. */
export function QuestionEditor({ value, onChange, showErrors = false }: {
    value: QuestionDraft
    onChange: (d: QuestionDraft) => void
    showErrors?: boolean
}) {
    const d = value
    const set = (patch: Partial<QuestionDraft>) => onChange({ ...d, ...patch })
    const error = showErrors ? draftError(d) : null
    const hasMarkup = (s: string) => /[\^_]\{|\^[-+−]?\w/.test(s)

    const setType = (type: QuestionType) => {
        if (type === d.type) return
        let correct = d.correct
        if (type === "INTEGER" || d.type === "INTEGER") correct = []
        else if (type === "SINGLE") correct = d.correct.slice(0, 1)
        set({ type, correct })
    }

    const toggleCorrect = (letter: string) => {
        if (d.type === "SINGLE") return set({ correct: [letter] })
        const has = d.correct.includes(letter)
        set({ correct: (has ? d.correct.filter(c => c !== letter) : [...d.correct, letter]).sort() })
    }

    return (
        <div className="space-y-5">
            {/* Type */}
            <fieldset>
                <legend className="mb-2 text-sm font-medium">Question type</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup">
                    {TYPES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            role="radio"
                            aria-checked={d.type === t.value}
                            onClick={() => setType(t.value)}
                            className={cn(
                                "rounded-lg border px-3 py-2 text-left transition",
                                d.type === t.value ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 hover:border-slate-300"
                            )}
                        >
                            <span className="block text-sm font-medium">{t.label}</span>
                            <span className="block text-xs text-slate-500">{t.hint}</span>
                        </button>
                    ))}
                </div>
            </fieldset>

            {/* Text */}
            <div className="space-y-2">
                <Label htmlFor="q-text">Question</Label>
                <Textarea id="q-text" value={d.text} onChange={e => set({ text: e.target.value })} placeholder="Type the question…" className="min-h-24" />
                <p className="text-xs text-slate-500">Subscript: <code>H_&#123;2&#125;O</code> · Superscript: <code>10^&#123;5&#125;</code>, <code>Cu^&#123;2+&#125;</code></p>
                {hasMarkup(d.text) && (
                    <p className="rounded bg-slate-50 px-3 py-2 text-sm"><span className="mr-2 text-xs text-slate-500">Preview</span><RichText text={d.text} /></p>
                )}
                <ImageSlot url={d.imageUrl} onChange={imageUrl => set({ imageUrl })} label="question image" />
            </div>

            {/* Options / answer */}
            {d.type === "INTEGER" ? (
                <div className="space-y-2">
                    <Label htmlFor="q-int">Correct answer</Label>
                    <Input
                        id="q-int"
                        inputMode="decimal"
                        value={d.correct[0] ?? ""}
                        onChange={e => set({ correct: e.target.value.trim() ? [e.target.value.trim()] : [] })}
                        placeholder="e.g. 4"
                        className="max-w-48"
                    />
                </div>
            ) : (
                <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                        Options <span className="font-normal text-slate-500">— {d.type === "SINGLE" ? "pick the correct one" : "tick every correct one"}</span>
                    </legend>
                    {LETTERS.map((letter, i) => {
                        const correct = d.correct.includes(letter)
                        return (
                            <div key={letter} className={cn("rounded-lg border p-2.5 sm:p-3", correct ? "border-green-300 bg-green-50/60" : "border-slate-200")}>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        role={d.type === "SINGLE" ? "radio" : "checkbox"}
                                        aria-checked={correct}
                                        aria-label={`Mark option ${letter} correct`}
                                        onClick={() => toggleCorrect(letter)}
                                        className={cn(
                                            "flex h-8 w-8 shrink-0 items-center justify-center border text-sm font-bold transition",
                                            d.type === "SINGLE" ? "rounded-full" : "rounded-md",
                                            correct ? "border-green-600 bg-green-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:border-green-500"
                                        )}
                                    >
                                        {letter}
                                    </button>
                                    <Input
                                        value={d.options[i]}
                                        onChange={e => { const options = [...d.options]; options[i] = e.target.value; set({ options }) }}
                                        placeholder={`Option ${letter}`}
                                        aria-label={`Option ${letter} text`}
                                    />
                                </div>
                                <div className="mt-2 flex items-center gap-3 pl-10">
                                    <ImageSlot
                                        compact
                                        url={d.optionImages[i]}
                                        onChange={url => { const optionImages = [...d.optionImages]; optionImages[i] = url; set({ optionImages }) }}
                                        label={`option ${letter} image`}
                                    />
                                    {hasMarkup(d.options[i]) && <span className="text-sm"><RichText text={d.options[i]} /></span>}
                                </div>
                            </div>
                        )
                    })}
                </fieldset>
            )}

            {/* Solution + difficulty */}
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
                <div className="space-y-2">
                    <Label htmlFor="q-sol">Solution <span className="font-normal text-slate-500">(optional)</span></Label>
                    <Textarea id="q-sol" value={d.solution} onChange={e => set({ solution: e.target.value })} placeholder="Worked solution…" className="min-h-20" />
                </div>
                <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={d.difficulty} onValueChange={v => set({ difficulty: v as Difficulty })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BEGINNER">Beginner</SelectItem>
                            <SelectItem value="INTERMEDIATE">Intermediate</SelectItem>
                            <SelectItem value="ADVANCED">Advanced</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
        </div>
    )
}
