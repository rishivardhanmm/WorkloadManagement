"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useYearId } from "@/components/providers/YearProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Save, X } from "lucide-react";
import {
  api,
  type WorkloadAllocation,
  type Academic,
  type Department,
  type AcademicYear,
  type Module,
  type Eligibility,
} from "@/lib/api";

export default function AllocationsPage() {
  const { token } = useAuth();
  const yearId = useYearId().yearId;
  const [allocations, setAllocations] = useState<WorkloadAllocation[]>([]);
  const [academics, setAcademics] = useState<Academic[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ teaching_hours: 0, research_hours: 0, admin_hours: 0, notes: "" });
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ academic: 0, academic_year: yearId ?? 0, teaching_hours: 0, research_hours: 0, admin_hours: 0, notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewAllocation, setViewAllocation] = useState<WorkloadAllocation | null>(null);
  const [teachingItems, setTeachingItems] = useState<
    { module: number; percentage: number }[]
  >([{ module: 0, percentage: 100 }]);
  const [eligibilities, setEligibilities] = useState<Eligibility[]>([]);
  const [researchRoles, setResearchRoles] = useState<any[]>([]);
  const [adminRoles, setAdminRoles] = useState<any[]>([]);

  const [researchItems, setResearchItems] = useState<
    { research_role: number; percentage: number }[]
  >([{ research_role: 0, percentage: 100 }]);

  const [adminItems, setAdminItems] = useState<
    { admin_role: number; percentage: number }[]
  >([{ admin_role: 0, percentage: 100 }]);

  const [modules, setModules] = useState<Module[]>([]);
  const [eligibleModules, setEligibleModules] = useState<Module[]>([]);
  const selectedAcademic = academics.find((a) => a.id === createForm.academic);
  const eligibleResearchRoles = selectedAcademic
    ? researchRoles.filter((r) => r.department === selectedAcademic.department)
    : [];

  const eligibleAdminRoles = selectedAcademic
    ? adminRoles.filter((r) => r.department === selectedAcademic.department)
    : [];
    

  const calculatedTeachingHours = teachingItems.reduce((sum, item) => {
    const module = modules.find((m) => m.id === item.module);
    if (!module) return sum;

    const hours = Number(module.credit_hours || 0) * ((Number(item.percentage) || 0) / 100);
    return sum + hours;
  }, 0);
  const calculatedResearchHours = researchItems.reduce((sum, item) => {
  const role = eligibleResearchRoles.find((r) => r.id === item.research_role);
  if (!role) return sum;

  const hours = Number(role.expected_hours || 0) * ((Number(item.percentage) || 0) / 100);
  return sum + hours;
}, 0);

const calculatedAdminHours = adminItems.reduce((sum, item) => {
  const role = eligibleAdminRoles.find((r) => r.id === item.admin_role);
  if (!role) return sum;

  const hours = Number(role.expected_hours || 0) * ((Number(item.percentage) || 0) / 100);
  return sum + hours;
}, 0);

  const selectedYear = years.find((y) => y.id === yearId);
  const isLocked = selectedYear?.is_locked ?? false;
  

  useEffect(() => {
    if (!token) return;

    api.departments.list(token).then((r) => setDepartments(r.results || []));
    api.academics.list(token).then((r) => setAcademics(r.results || []));
    api.eligibility.list(token).then((r) => setEligibilities(r.results || []));
    api.years.list(token).then((r) => setYears(r.results || []));
    api.modules.list(token).then((r) => setModules(r.results || []));
    api.researchRoles.list(token).then((r) => setResearchRoles(r.results || []));
    api.adminRoles.list(token).then((r) => setAdminRoles(r.results || []));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.allocations.list(token, {
      academic_year: yearId ?? undefined,
      department: deptFilter || undefined,
    }).then(
      (r) => {
        setAllocations(r.results || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [token, yearId, deptFilter]);

  useEffect(() => {
    if (!selectedAcademic) {
      setEligibleModules([]);
      return;
    }

    const departmentModules = modules.filter(
      (m) => m.department === selectedAcademic.department
    );

    const academicEligibilities = eligibilities.filter(
      (e) => e.academic === selectedAcademic.id
    );

    if (academicEligibilities.length === 0) {
      setEligibleModules(departmentModules);
      return;
    }

    const eligibleModuleIds = new Set(
      academicEligibilities.map((e) => e.module)
    );

    setEligibleModules(
      departmentModules.filter((m) => eligibleModuleIds.has(m.id))
    );
  }, [selectedAcademic, modules, eligibilities]);

  useEffect(() => {
    setTeachingItems([{ module: 0, percentage: 100 }]);
    setResearchItems([{ research_role: 0, percentage: 100 }]);
    setAdminItems([{ admin_role: 0, percentage: 100 }]);
  }, [createForm.academic]);

  const startEdit = (a: WorkloadAllocation) => {
    if (isLocked) return;
    setEditingId(a.id);
    setEditForm({
      teaching_hours: Number(a.teaching_hours),
      research_hours: Number(a.research_hours),
      admin_hours: Number(a.admin_hours),
      notes: a.notes || "",
    });
  };

  useEffect(() => {
    setCreateForm((prev) => ({
      ...prev,
      teaching_hours: Number(calculatedTeachingHours.toFixed(2)),
    }));
  }, [calculatedTeachingHours]);

  useEffect(() => {
    setCreateForm((prev) => ({
      ...prev,
      research_hours: Number(calculatedResearchHours.toFixed(2)),
    }));
  }, [calculatedResearchHours]);

  useEffect(() => {
    setCreateForm((prev) => ({
      ...prev,
      admin_hours: Number(calculatedAdminHours.toFixed(2)),
    }));
  }, [calculatedAdminHours]);

  const saveEdit = async () => {
    if (!token || editingId == null) return;
    setSaving(true);
    setError(null);
    try {
      await api.allocations.update(token, editingId, editForm);
      setAllocations((prev) =>
        prev.map((x) =>
          x.id === editingId
            ? {
                ...x,
                teaching_hours: String(editForm.teaching_hours),
                research_hours: String(editForm.research_hours),
                admin_hours: String(editForm.admin_hours),
                notes: editForm.notes,
              }
            : x
        )
      );
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      academic: 0,
      academic_year: yearId ?? 0,
      teaching_hours: 0,
      research_hours: 0,
      admin_hours: 0,
      notes: "",
    });
    setTeachingItems([{ module: 0, percentage: 100 }]);
    setEligibleModules([]);
    setResearchItems([{ research_role: 0, percentage: 100 }]);
    setAdminItems([{ admin_role: 0, percentage: 100 }]);
  };

  const refreshAllocations = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await api.allocations.list(token, {
        department: deptFilter || undefined,
        academic_year: yearId || undefined,
      });
      setAllocations(res.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load allocations");
    } finally {
      setLoading(false);
    }
  };

  const createAllocation = async () => {
    if (!token || !createForm.academic || !createForm.academic_year) return;

    setSaving(true);
    setError(null);

    try {
      await api.allocations.create(token, {
        academic: createForm.academic,
        academic_year: createForm.academic_year,
        teaching_hours: createForm.teaching_hours,
        research_hours: createForm.research_hours,
        admin_hours: createForm.admin_hours,
        notes: createForm.notes,
        teaching_items: teachingItems
          .filter((item) => item.module)
          .map((item) => ({
            module: item.module,
            percentage: item.percentage,
          })),
        research_items: researchItems
          .filter((item) => item.research_role)
          .map((item) => ({
            research_role: item.research_role,
            percentage: item.percentage,
          })),

        admin_items: adminItems
          .filter((item) => item.admin_role)
          .map((item) => ({
            admin_role: item.admin_role,
            percentage: item.percentage,
          })),
      });

      await refreshAllocations();
      resetCreateForm();
      setShowCreate(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const deleteAllocation = async (id: number) => {
    if (!token || isLocked || !confirm("Delete this allocation?")) return;
    try {
      await api.allocations.delete(token, id);
      setAllocations((prev) => prev.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  if (!yearId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Allocations</h1>
        <p className="text-muted-foreground">Select an academic year in the header.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Allocations</h1>
        {isLocked && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            This year is locked. Viewing only; create/edit/delete disabled.
          </p>
        )}
        {!isLocked && (
          <Button
          onClick={() => {
            setCreateForm((f) => ({ ...f, academic_year: yearId ?? 0 }));
            setShowCreate(true);
          }}
        >
            <Plus className="h-4 w-4 mr-1" />
            Add allocation
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Department:</span>
        <select
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value === "" ? "" : Number(e.target.value))}
        >
          <option value="">All</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {showCreate && !isLocked && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Academic</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={createForm.academic}
                  onChange={(e) => setCreateForm((f) => ({ ...f, academic: Number(e.target.value) }))}
                >
                  <option value={0}>Select</option>
                  {academics.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name} ({a.department_detail?.name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={createForm.academic_year}
                  onChange={(e) => setCreateForm((f) => ({ ...f, academic_year: Number(e.target.value) }))}
                >
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label>Teaching Allocation</label>

                {teachingItems.map((row, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={row.module}
                      onChange={(e) => {
                        const updated = [...teachingItems];
                        updated[index].module = Number(e.target.value);
                        setTeachingItems(updated);
                      }}
                    >
                      <option value={0}>Select Module</option>
                      {eligibleModules.map((m: Module) => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `${m.code} - ${m.name}` : m.name}
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.percentage}
                      onChange={(e) => {
                        const updated = [...teachingItems];
                        updated[index].percentage = Number(e.target.value) || 0;
                        setTeachingItems(updated);
                      }}
                      className="w-28"
                    />

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (teachingItems.length === 1) {
                          setTeachingItems([{ module: 0, percentage: 100 }]);
                          return;
                        }
                        setTeachingItems((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      X
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setTeachingItems((prev) => [...prev, { module: 0, percentage: 100 }])
                  }
                >
                  + Add Module
                </Button>

                

                {!createForm.academic && (
                  <p className="text-sm text-muted-foreground">
                    Select an academic first to see eligible modules.
                  </p>
                )}

                {createForm.academic && eligibleModules.length === 0 && (
                  <p className="text-sm text-destructive">
                    No eligible modules found for the selected academic.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label>Research Allocation</label>

                {researchItems.map((row, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={row.research_role}
                      onChange={(e) => {
                        const updated = [...researchItems];
                        updated[index].research_role = Number(e.target.value);
                        setResearchItems(updated);
                      }}
                    >
                      <option value={0}>Select Research Role</option>
                      {eligibleResearchRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.percentage}
                      onChange={(e) => {
                        const updated = [...researchItems];
                        updated[index].percentage = Number(e.target.value) || 0;
                        setResearchItems(updated);
                      }}
                      className="w-28"
                    />

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (researchItems.length === 1) {
                          setResearchItems([{ research_role: 0, percentage: 100 }]);
                          return;
                        }
                        setResearchItems((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      X
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setResearchItems((prev) => [...prev, { research_role: 0, percentage: 100 }])
                  }
                >
                  + Add Research Role
                </Button>

                {!createForm.academic && (
                  <p className="text-sm text-muted-foreground">
                    Select an academic first to see department research roles.
                  </p>
                )}

                {createForm.academic && eligibleResearchRoles.length === 0 && (
                  <p className="text-sm text-destructive">
                    No active research roles found for the selected academic’s department.
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label>Admin Allocation</label>

                {adminItems.map((row, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={row.admin_role}
                      onChange={(e) => {
                        const updated = [...adminItems];
                        updated[index].admin_role = Number(e.target.value);
                        setAdminItems(updated);
                      }}
                    >
                      <option value={0}>Select Admin Role</option>
                      {eligibleAdminRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>

                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.percentage}
                      onChange={(e) => {
                        const updated = [...adminItems];
                        updated[index].percentage = Number(e.target.value) || 0;
                        setAdminItems(updated);
                      }}
                      className="w-28"
                    />

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (adminItems.length === 1) {
                          setAdminItems([{ admin_role: 0, percentage: 100 }]);
                          return;
                        }
                        setAdminItems((prev) => prev.filter((_, i) => i !== index));
                      }}
                    >
                      X
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setAdminItems((prev) => [...prev, { admin_role: 0, percentage: 100 }])
                  }
                >
                  + Add Admin Role
                </Button>

                {!createForm.academic && (
                  <p className="text-sm text-muted-foreground">
                    Select an academic first to see department admin roles.
                  </p>
                )}

                {createForm.academic && eligibleAdminRoles.length === 0 && (
                  <p className="text-sm text-destructive">
                    No active admin roles found for the selected academic’s department.
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={createAllocation} disabled={saving || !createForm.academic || !createForm.academic_year}>
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
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Academic</th>
                    <th className="text-left p-3 font-medium">Year</th>
                    <th className="text-right p-3 font-medium">Teaching</th>
                    <th className="text-right p-3 font-medium">Research</th>
                    <th className="text-right p-3 font-medium">Admin</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-32 p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map((a) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        {a.academic_detail?.full_name ?? a.academic}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {a.academic_year_detail?.label ?? a.academic_year}
                      </td>
                      {editingId === a.id ? (
                        <>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              className="w-20 h-8 text-right"
                              value={editForm.teaching_hours}
                              onChange={(e) => setEditForm((f) => ({ ...f, teaching_hours: Number(e.target.value) || 0 }))}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              className="w-20 h-8 text-right"
                              value={editForm.research_hours}
                              onChange={(e) => setEditForm((f) => ({ ...f, research_hours: Number(e.target.value) || 0 }))}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min={0}
                              className="w-20 h-8 text-right"
                              value={editForm.admin_hours}
                              onChange={(e) => setEditForm((f) => ({ ...f, admin_hours: Number(e.target.value) || 0 }))}
                            />
                          </td>
                          <td className="p-3 text-right">—</td>
                          <td className="p-3">—</td>
                          <td className="p-3 flex gap-1">
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
                          <td className="p-3 text-right">{a.teaching_hours}</td>
                          <td className="p-3 text-right">{a.research_hours}</td>
                          <td className="p-3 text-right">{a.admin_hours}</td>
                          <td className="p-3 text-right">{a.total_hours ?? "—"}</td>
                          <td className="p-3">
                            {a.status && (
                              <Badge
                                variant={
                                  a.status === "OVERLOADED"
                                    ? "overloaded"
                                    : a.status === "UNDERLOADED"
                                      ? "underloaded"
                                      : "balanced"
                                }
                              >
                                {a.status}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewAllocation(a)}>
                              View
                            </Button>
                            {!isLocked && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                                  Edit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => deleteAllocation(a.id)}>
                                  Delete
                                </Button>
                              </>
                            )}
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

      {viewAllocation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setViewAllocation(null)}
          role="dialog"
          aria-modal="true"
        >
          <Card
            className="max-w-md w-full mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Allocation details</h3>
                <Button variant="ghost" size="sm" onClick={() => setViewAllocation(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p><span className="text-muted-foreground">Academic:</span> {viewAllocation.academic_detail?.full_name ?? viewAllocation.academic}</p>
              <p><span className="text-muted-foreground">Year:</span> {viewAllocation.academic_year_detail?.label ?? viewAllocation.academic_year}</p>
              <p><span className="text-muted-foreground">Teaching / Research / Admin:</span> {viewAllocation.teaching_hours} / {viewAllocation.research_hours} / {viewAllocation.admin_hours}</p>
              {viewAllocation.status && (
                <p>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <Badge
                    variant={
                      viewAllocation.status === "OVERLOADED"
                        ? "overloaded"
                        : viewAllocation.status === "UNDERLOADED"
                          ? "underloaded"
                          : "balanced"
                    }
                  >
                    {viewAllocation.status}
                  </Badge>
                </p>
              )}
              {(viewAllocation.created_by_username != null || viewAllocation.updated_at) && (
                <p className="text-xs text-muted-foreground pt-2 border-t">
                  {viewAllocation.created_by_username != null && <>Created by {viewAllocation.created_by_username}</>}
                  {viewAllocation.created_by_username != null && viewAllocation.updated_at && " · "}
                  {viewAllocation.updated_at && (
                    <>Last updated {new Date(viewAllocation.updated_at).toLocaleString()}</>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
