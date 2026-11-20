// Whether students may see their marks for a test: always for INSTANT tests,
// and for MANUAL tests once staff have released the results.

export type ResultVisibility = { resultMode: string; resultsReleasedAt: Date | string | null }

export function resultsVisible(test: ResultVisibility): boolean {
    return test.resultMode !== "MANUAL" || test.resultsReleasedAt !== null
}

/** Prisma filter for tests whose results students may see. */
export const VISIBLE_RESULTS_WHERE = {
    OR: [{ resultMode: { not: "MANUAL" } }, { resultsReleasedAt: { not: null } }],
}
