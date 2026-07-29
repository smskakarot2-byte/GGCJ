import { useState } from "react";
import {
  useGetDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  getGetDepartmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Building2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function DepartmentsPage() {
  const { data: departments, isLoading } = useGetDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    await createDept.mutateAsync({ data: { name: newName.trim() } });
    queryClient.invalidateQueries({ queryKey: getGetDepartmentsQueryKey() });
    setNewName("");
    toast({ title: "Department created" });
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    await updateDept.mutateAsync({ id, data: { name: editName.trim() } });
    queryClient.invalidateQueries({ queryKey: getGetDepartmentsQueryKey() });
    setEditId(null);
    toast({ title: "Department updated" });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this department? All associated courses and results will be removed.")) return;
    await deleteDept.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetDepartmentsQueryKey() });
    toast({ title: "Department deleted" });
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">Departments</h1>
        <p className="text-sm text-muted-foreground">Manage university departments</p>
      </div>

      {/* Add new */}
      <Card className="bg-card border-card-border">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-2">
            <Input
              placeholder="New department name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={!newName.trim()} className="gap-2">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-card border border-card-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (departments ?? []).length === 0 ? (
        <Card className="bg-card border-card-border">
          <CardContent className="py-14 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No departments yet. Add one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {(departments ?? []).map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 bg-card border border-card-border rounded-lg px-4 py-3"
            >
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              {editId === d.id ? (
                <>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(d.id)}
                  />
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-400" onClick={() => handleUpdate(d.id)}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-foreground">{d.name}</span>
                  <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => { setEditId(d.id); setEditName(d.name); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(d.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
