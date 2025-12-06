"use client"

import { useState } from "react"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CSVUploader() {
    const [data, setData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setHeaders(results.meta.fields || [])
                    setData(results.data)
                },
            })
        }
    }

    const saveQuestions = async () => {
        try {
            const res = await fetch("/api/teacher/upload-questions", {
                method: "POST",
                body: JSON.stringify({ questions: data }),
            })
            if (res.ok) {
                alert("Questions saved successfully!")
                setData([])
                setHeaders([])
            } else {
                alert("Failed to save questions")
            }
        } catch (e) {
            console.error(e)
            alert("Error saving questions")
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="csv-upload">Upload Questions (CSV)</Label>
                <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} />
            </div>

            {data.length > 0 && (
                <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Preview ({data.length} rows)</h3>
                    <div className="overflow-auto max-h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {headers.map((header) => (
                                        <TableHead key={header}>{header}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.slice(0, 10).map((row, index) => (
                                    <TableRow key={index}>
                                        {headers.map((header) => (
                                            <TableCell key={`${index}-${header}`}>{row[header]}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={saveQuestions}>Save Questions</Button>
                    </div>
                </div>
            )}
        </div>
    )
}
