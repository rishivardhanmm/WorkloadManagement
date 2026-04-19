"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type Department } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { useYearId } from "@/components/providers/YearProvider";

type ResearchRole = {
  id: number;
  name: string;
  department: number;
  expected_hours: number | string;
  is_active: boolean;
  is_allocated?: boolean;
  allocated_hours?: number;
  allocation_breakdown?: {
    academic_id: number;
    academic_name: string;
    academic_year_id: number;
    academic_year_label: string;
    percentage: number;
    calculated_hours: number;
  }[];
};

export default function ResearchRolesPage() {
  const { token } = useAuth();
  const yearId = useYearId().yearId;

  const [roles, setRoles] = useState<ResearchRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewRole, setViewRole] = useState<ResearchRole | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    department: 0,
    expected_hours: 0,
    is_active: true,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    department: 0,
    expected_hours: 0,
    is_active: true,
  });

  const load = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const [deptRes, roleRes] = await Promise.all([
        api.departments.list(token),
        api.researchRoles.list(token, {
            department: deptFilter || undefined,
            academic_year: yearId || undefined,
            }),
      ]);

      const rolesList = roleRes.results || roleRes;
      const filteredRoles = search
        ? rolesList.filter((r: ResearchRole) =>
            r.name.toLowerCase().includes(search.toLowerCase())
          )
        : rolesList;

      setDepartments(deptRes.results || []);
      setRoles(filteredRoles);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load research roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token, deptFilter, search, yearId]);

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      department: 0,
      expected_hours: 0,
      is_active: true,
    });
  };

  const createRole = async () => {
    if (!token || !createForm.name || !createForm.department) return;

    setSaving(true);
    setError(null);

    try {
      await api.researchRoles.create(token, {
        name: createForm.name,
        department: createForm.department,
        expected_hours: Number(createForm.expected_hours) || 0,
        is_active: createForm.is_active,
      });

      resetCreateForm();
      setShowCreate(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create research role");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (role: ResearchRole) => {
    setEditingId(role.id);
    setEditForm({
      name: role.name,
      department: role.department,
      expected_hours: Number(role.expected_hours) || 0,
      is_active: role.is_active,
    });
  };

  const saveEdit = async () => {
    if (!token || editingId == null) return;

    setSaving(true);
    setError(null);

    try {
      await api.researchRoles.update(token, editingId, {
        name: editForm.name,
        department: editForm.department,
        expected_hours: Number(editForm.expected_hours) || 0,
        is_active: editForm.is_active,
      });

      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save research role");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (id: number) => {
    if (!token) return;

    const ok = window.confirm("Delete this research role?");
    if (!ok) return;

    setSaving(true);
    setError(null);

    try {
      await api.researchRoles.delete(token, id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete research role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Research Roles</h1>
        

        <Button
          onClick={() => {
            resetCreateForm();
            setShowCreate(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Research Role
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search role name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />

        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Create Research Role</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Role Name</label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Department</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={createForm.department}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, department: Number(e.target.value) }))
                  }
                >
                  <option value={0}>Select</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Expected Hours</label>
                <Input
                  type="number"
                  min={0}
                  value={createForm.expected_hours}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      expected_hours: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, is_active: e.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createRole} disabled={saving || !createForm.name || !createForm.department}>
                Create
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setShowCreate(false);
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
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">Name</th>
                        <th className="p-3 text-left font-medium">Department</th>
                        <th className="p-3 text-right font-medium">Expected Hours</th>
                        <th className="p-3 text-left font-medium">Active</th>
                        <th className="p-3 text-left font-medium">Allocated</th>
                        <th className="p-3 text-right font-medium">Allocated Hours</th>
                        <th className="w-32 p-3">Actions</th>
                    </tr>
                </thead>
                <tbody>
                  {roles.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                      {editingId === r.id ? (
                        <>
                          <td className="p-3">
                            <Input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, name: e.target.value }))
                              }
                            />
                          </td>
                          <td className="p-3">
                            <select
                              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                              value={editForm.department}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  department: Number(e.target.value),
                                }))
                              }
                            >
                              <option value={0}>Select</option>
                              {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              className="h-8 w-24 text-right"
                              value={editForm.expected_hours}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  expected_hours: Number(e.target.value) || 0,
                                }))
                              }
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={editForm.is_active}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  is_active: e.target.checked,
                                }))
                              }
                            />
                          </td>
                          
                          <td className="flex gap-1 p-3">
                            <Button variant="ghost" size="sm" onClick={saveEdit} disabled={saving}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-3">{r.name}</td>
                          <td className="p-3">
                            {departments.find((d) => d.id === r.department)?.name ?? r.department}
                          </td>
                          <td className="p-3 text-right">{r.expected_hours}</td>
                          <td className="p-3">{r.is_active ? "Yes" : "No"}</td>
                          <td className="p-3">{r.is_allocated ? "Yes" : "No"}</td>
                          <td className="p-3 text-right">{r.allocated_hours ?? 0}</td>
                          <td className="flex gap-1 p-3">
                            <Button variant="ghost" size="sm" onClick={() => setViewRole(r)}>
                                View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(r)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteRole(r.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {viewRole && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
                <div>
                <h2 className="text-xl font-semibold">{viewRole.name}</h2>
                <p className="text-sm text-muted-foreground">
                    Allocated hours: {viewRole.allocated_hours ?? 0}
                </p>
                </div>

                <Button variant="outline" onClick={() => setViewRole(null)}>
                Close
                </Button>
            </div>

            <div className="space-y-3">
                {viewRole.allocation_breakdown && viewRole.allocation_breakdown.length > 0 ? (
                viewRole.allocation_breakdown.map((item, idx) => (
                    <div
                    key={`${item.academic_id}-${item.academic_year_id}-${idx}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                    >
                    <div>
                        <div className="font-medium">{item.academic_name}</div>
                        <div className="text-sm text-muted-foreground">
                        {item.academic_year_label}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="font-medium">{item.percentage}%</div>
                        <div className="text-sm text-muted-foreground">
                        {item.calculated_hours} hrs
                        </div>
                    </div>
                    </div>
                ))
                ) : (
                <p className="text-sm text-muted-foreground">
                    No allocation found for this role in the selected year.
                </p>
                )}
            </div>
            </div>
        </div>
        )}
    </div>
  );
}