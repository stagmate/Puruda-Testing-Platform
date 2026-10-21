"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type User = {
    id: string
    name: string
    email: string
    role: string
    createdAt: string
}

export function UserManagement() {
    const [users, setUsers] = useState<User[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "STUDENT" })
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)

    const fetchUsers = async () => {
        const res = await fetch(`/api/admin/users?page=${page}&limit=10`)
        if (res.ok) {
            const { data, meta } = await res.json()
            setUsers(data)
            setTotalPages(Math.max(1, meta.totalPages))
            // If the last user on a page was deleted, step back a page.
            if (page > 1 && data.length === 0) setPage(p => Math.max(1, p - 1))
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [page]) // Refetch when page changes

    const handleAddUser = async () => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                body: JSON.stringify(newUser)
            })
            if (res.ok) {
                setIsOpen(false)
                fetchUsers()
                setNewUser({ name: "", email: "", password: "", role: "STUDENT" })
            } else {
                alert(`Failed to create user: ${await res.text()}`)
            }
        } catch (e) {
            alert("Error creating user")
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return
        const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        if (!res.ok) alert(`Could not delete user: ${await res.text()}`)
        fetchUsers()
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">System Users</h2>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>Add User</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>Create a new account for a student, teacher, or admin.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Email</Label>
                                <Input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} type="email" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Password</Label>
                                <Input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} type="password" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Role</Label>
                                <Select value={newUser.role} onValueChange={v => setNewUser({ ...newUser, role: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="STUDENT">Student</SelectItem>
                                        <SelectItem value="TEACHER">Teacher</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddUser}>Create Account</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Phones: stacked list so role and delete stay visible */}
            <ul className="divide-y rounded-lg border sm:hidden">
                {users.map(user => (
                    <li key={user.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{user.name || "-"}</p>
                            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                            <span className={`mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold ${roleBadge(user.role)}`}>{user.role}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="shrink-0 text-red-600 hover:text-red-700">Delete</Button>
                    </li>
                ))}
            </ul>

            <div className="hidden border rounded-lg sm:block">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell>{user.name || "-"}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${roleBadge(user.role)}`}>
                                        {user.role}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-700">Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 text-sm">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                    <span className="text-muted-foreground tabular-nums">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    )
}

function roleBadge(role: string) {
    if (role === "ADMIN") return "bg-red-100 text-red-800"
    if (role === "TEACHER") return "bg-blue-100 text-blue-800"
    return "bg-green-100 text-green-800"
}
