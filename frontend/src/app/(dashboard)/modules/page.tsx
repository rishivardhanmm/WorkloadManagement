"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type Module as ModuleType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Eye} from "lucide-react";


const ORDERING_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "code", label: "Code" },
  { value: "credit_hours", label: "Credit hours" },
];

export default function ModulesPage() {
  const { token } = useAuth();
  const [modules, setModules] = useState<ModuleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ordering, setOrdering] = useState("name");
  const [editing, setEditing] = useState<ModuleType | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewModule, setViewModule] = useState<ModuleType | null>(null);
  const [form, setForm] = useState({ code: "", name: "", department: 0, credit_hours: 15, is_active: true });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  
 

  const load = () => {
    if (!token) return;
    setLoading(true);

    api.modules.list(token, { search: search || undefined, ordering }).then(
      (r) => {
        setModules(r.results || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
  };

  useEffect(() => {
    if (!token) return;
    api.departments.list(token).then((r) => setDepartments(r.results || []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [token, search, ordering]);

  

  const openEdit = (m: ModuleType) => {
    setEditing(m);
    setForm({
      code: m.code ?? "",
      name: m.name,
      department: m.department,
      credit_hours: m.credit_hours,
      is_active: m.is_active ?? true,
    });
  };

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({
      code: "",
      name: "",
      department: departments[0]?.id ?? 0,
      credit_hours: 15,
      is_active: true,
    });
  };
  

  const save = async () => {
    if (!token) return;

    try {
      const payload = { ...form, code: form.code || undefined };

      if (editing) {
        await api.modules.update(token, editing.id, payload);

        setModules((prev) =>
          prev.map((x) =>
            x.id === editing.id
              ? { ...x, ...payload, code: payload.code ?? x.code }
              : x
          )
        );

        setEditing(null);
      } else if (creating) {
        const created = await api.modules.create(token, payload);
        setModules((prev) => [...prev, created]);
        setCreating(false);
      }

      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const remove = async (id: number) => {
    if (!token || !confirm("Delete this module?")) return;
    try {
      await api.modules.delete(token, id);
      setModules((prev) => prev.filter((x) => x.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Modules</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          Add module
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Search</Label>
          <Input
            placeholder="Name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground">Order by</Label>
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={ordering}
            onChange={(e) => setOrdering(e.target.value)}
          >
            {ORDERING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(editing || creating) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{editing ? "Edit module" : "New module"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Module name"
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: Number(e.target.value) }))}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Credit hours</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.credit_hours}
                  onChange={(e) => setForm((f) => ({ ...f, credit_hours: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="mod_active"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="mod_active">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setCreating(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-3">Code</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Active</th>
                    <th className="p-3">Allocated</th>
                    <th className="p-3">Allocated %</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {modules.map((m) => (
                    <tr key={m.id} className="border-b">
                      <td className="p-3">{m.code ?? "—"}</td>
                      <td className="p-3">{m.name}</td>
                      <td className="p-3">
                        {m.department_detail?.name ?? m.department}
                      </td>
                      <td className="p-3">{m.credit_hours}</td>
                      <td className="p-3">{m.is_active ? "Yes" : "No"}</td>
                      <td className="p-3">
                        {m.is_allocated ? (
                          <span className="inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
                            Allocated
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                            Not allocated
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.allocated_percentage != null ? `${m.allocated_percentage}%` : "0%"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setViewModule(m)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="destructive" size="sm" onClick={() => remove(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {viewModule && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-2xl rounded-2xl border bg-background p-6 shadow-xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {viewModule.code ? `${viewModule.code} - ${viewModule.name}` : viewModule.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {viewModule.department_detail?.name ?? "Department"} • {viewModule.credit_hours} hours
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => setViewModule(null)}>
              Close
            </Button>
          </div>

          <div className="mb-4 space-y-4">

            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Allocated</div>
                <div className="mt-1 font-medium">
                  {viewModule.is_allocated ? "Yes" : "No"}
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Allocated %</div>
                <div className="mt-1 font-medium">
                  {viewModule.allocated_percentage ?? 0}%
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="text-sm text-muted-foreground">Remaining %</div>
                <div className="mt-1 font-medium">
                  {100 - (viewModule.allocated_percentage ?? 0)}%
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Allocation usage</span>
                <span>{viewModule.allocated_percentage ?? 0}%</span>
              </div>

              <div className="h-3 w-full rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-emerald-500"
                  style={{
                    width: `${viewModule.allocated_percentage ?? 0}%`,
                  }}
                />
              </div>
            </div>

          </div>

          <div className="space-y-3">
            <h3 className="font-medium">Allocation breakdown</h3>
 
            {viewModule.allocation_breakdown && viewModule.allocation_breakdown.length > 0 ? (
              <div className="space-y-2">
                {viewModule.allocation_breakdown.map((item, idx) => (
                  <div
                    key={`${item.academic_id}-${item.academic_year_id}-${idx}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <div className="font-medium">{item.academic_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.academic_department} • {item.academic_year_label}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-medium">{item.percentage}%</div>
                      <div className="text-sm text-muted-foreground">
                        {item.calculated_hours} hrs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No allocation found for this module in the selected year.
              </p>
            )}
          </div>
        </div>
      </div>
    )}
    </div>
    
  );
}
