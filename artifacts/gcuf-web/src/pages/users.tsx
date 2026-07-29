import { useState } from "react";
import { useGetUsers, useCreateSystemUser, useDeleteSystemUser, getGetUsersQueryKey, useGetDepartments } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, UserCog, Shield, User, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useGetUsers();
  const { data: departments } = useGetDepartments();
  const createUser = useCreateSystemUser();
  const deleteUser = useDeleteSystemUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "", password: "", fullName: "", role: "professor", departmentId: "",
  });

  const [roleOpen, setRoleOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<{ id: number; name: string; currentRole: string; departmentId: number | null } | null>(null);
  const [roleForm, setRoleForm] = useState({ role: "professor", departmentId: "" });
  const [roleLoading, setRoleLoading] = useState(false);

  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreate() {
    if (!form.username || !form.password) {
      toast({ title: "Email and password required", variant: "destructive" });
      return;
    }
    if (form.role === "professor" && (!form.departmentId || form.departmentId === "none")) {
      toast({ title: "Department is required for professors", variant: "destructive" });
      return;
    }
    try {
      await createUser.mutateAsync({
        data: {
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          departmentId: form.departmentId && form.departmentId !== "none" ? parseInt(form.departmentId) : null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      setOpen(false);
      setForm({ username: "", password: "", fullName: "", role: "professor", departmentId: "" });
      toast({ title: "User created" });
    } catch {
      toast({ title: "Failed to create user", variant: "destructive" });
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    try {
      await deleteUser.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      toast({ title: "User deleted" });
    } catch {
      toast({ title: "Failed to delete user", variant: "destructive" });
    }
  }

  function openRoleDialog(u: { id: number; fullName: string | null; username: string; role: string; departmentId: number | null }) {
    setRoleTarget({ id: u.id, name: u.fullName || u.username, currentRole: u.role, departmentId: u.departmentId });
    setRoleForm({
      role: u.role,
      departmentId: u.departmentId ? String(u.departmentId) : "",
    });
    setRoleOpen(true);
  }

  async function handleRoleChange() {
    if (!roleTarget) return;
    if (roleForm.role === "professor" && (!roleForm.departmentId || roleForm.departmentId === "none")) {
      toast({ title: "Department is required for professors", variant: "destructive" });
      return;
    }
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/users/${roleTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          role: roleForm.role,
          departmentId: roleForm.departmentId && roleForm.departmentId !== "none"
            ? parseInt(roleForm.departmentId)
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.error ?? "Failed to update role", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getGetUsersQueryKey() });
      setRoleOpen(false);
      toast({ title: `Role updated to ${roleForm.role}` });
    } catch {
      toast({ title: "Failed to update role", variant: "destructive" });
    } finally {
      setRoleLoading(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Manage system users and professors</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 bg-card border border-card-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <Card className="bg-card border-card-border">
          <CardContent className="py-14 text-center">
            <UserCog className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No users yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(users ?? []).map((u) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <div key={u.id} className="flex items-center gap-3 bg-card border border-card-border rounded-lg px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {u.role === "admin"
                    ? <Shield className="w-4 h-4 text-primary" />
                    : <User className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{u.fullName || u.username}</p>
                    {isSelf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">You</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">@{u.username} · {u.departmentName ?? "No department"}</p>
                </div>
                <Badge variant={u.role === "admin" ? "default" : "outline"} className="text-xs capitalize">
                  {u.role}
                </Badge>
                {/* Transfer role — disabled for self */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-muted-foreground hover:text-foreground"
                  onClick={() => openRoleDialog(u)}
                  disabled={isSelf}
                  title={isSelf ? "Cannot change your own role" : "Change role"}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </Button>
                {/* Delete — disabled for self */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-destructive hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                  onClick={() => handleDelete(u.id)}
                  disabled={isSelf}
                  title={isSelf ? "Cannot delete your own account" : "Delete user"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Email Address *</label>
                <Input type="email" value={form.username} onChange={(e) => setField("username", e.target.value)} placeholder="email@gcuf.edu.pk" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Password *</label>
                <Input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} placeholder="••••••" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Full Name</label>
              <Input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} placeholder="Dr. John Doe" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Role</label>
                <Select value={form.role} onValueChange={(v) => setField("role", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-card-border">
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Department {form.role === "professor" ? "*" : ""}
                </label>
                <Select value={form.departmentId} onValueChange={(v) => setField("departmentId", v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={form.role === "professor" ? "Select department" : "None"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-card-border">
                    {form.role !== "professor" && <SelectItem value="none">None</SelectItem>}
                    {(departments ?? []).map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleCreate}>Create User</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
        <DialogContent className="bg-card border-card-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          {roleTarget && (
            <div className="space-y-4 pt-1">
              <p className="text-sm text-muted-foreground">
                Changing role for <span className="font-semibold text-foreground">{roleTarget.name}</span>
              </p>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">New Role</label>
                <Select value={roleForm.role} onValueChange={(v) => setRoleForm((f) => ({ ...f, role: v, departmentId: v === "admin" ? "" : f.departmentId }))}>
                  <SelectTrigger className="bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-card-border">
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {roleForm.role === "professor" && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Department *</label>
                  <Select value={roleForm.departmentId} onValueChange={(v) => setRoleForm((f) => ({ ...f, departmentId: v }))}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-card-border">
                      {(departments ?? []).map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {roleForm.role === "admin" && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Promoting to Admin removes department restrictions and grants full system access.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setRoleOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleRoleChange} disabled={roleLoading}>
                  {roleLoading ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
