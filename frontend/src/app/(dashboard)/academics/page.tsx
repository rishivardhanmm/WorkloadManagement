"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { api, type Academic, type Department, type Eligibility, type Module } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2 } from "lucide-react";

type FormState = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  department: number;
  capacity_hours: number;
  is_active: boolean;
};

export default function AcademicsPage() {
  const { token } = useAuth();
  const [academics, setAcademics] = useState<Academic[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState<number | "">("");
  const [editing, setEditing] = useState<Academic | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    department: 0,
    capacity_hours: 1500,
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [eligibilities, setEligibilities] = useState<Eligibility[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  
  const [usernameTouched, setUsernameTouched] = useState(false);

  const normalizeValue = (value?: string | null) => (value ?? "").trim().toLowerCase();

  const normalizedUsername = normalizeValue(form.username);
  const normalizedEmail = normalizeValue(form.email);

  const duplicateUsername = academics.some((a: Academic) => {
    if (editing && a.id === editing.id) return false;
    return normalizeValue(a.username) === normalizedUsername;
  });



  function buildUsernameCandidates(firstName: string, lastName: string) {
    const first = firstName.trim();
    const last = lastName.trim();

    if (!first || !last) return [];

    return [
      `${first} ${last}`,
      `${first}${last}`.replace(/\s+/g, "").toLowerCase(),
      `${last}${first}`.replace(/\s+/g, "").toLowerCase(),
    ];
  }

  function pickAvailableUsername(firstName: string, lastName: string, excludeId?: number) {
    const firstRaw = firstName.trim();
    const lastRaw = lastName.trim();

    if (!firstRaw || !lastRaw) return "";

    const taken = new Set(
      academics
        .filter((a: Academic) => (excludeId ? a.id !== excludeId : true))
        .map((a: Academic) => normalizeValue(a.username))
    );

    const candidates = buildUsernameCandidates(firstRaw, lastRaw);

    for (const candidate of candidates) {
      if (!taken.has(normalizeValue(candidate))) {
        return candidate;
      }
    }

    const first = firstRaw.replace(/\s+/g, "").toLowerCase();
    const last = lastRaw.replace(/\s+/g, "").toLowerCase();

    for (let i = 100; i <= 999; i++) {
      const candidate = `${first}${last}${i}`;
      if (!taken.has(candidate)) {
        return candidate;
      }
    }

    return "";
  }

  useEffect(() => {
    if (!token) return;
    api.departments.list(token).then((r) => setDepartments(r.results || []));
  }, [token]);

  useEffect(() => {
    if (!token || !editing) return;
    setEligibilityLoading(true);
    api.eligibility.list(token, { academic: editing.id }).then(
      (r) => {
        setEligibilities(r.results || []);
        setEligibilityLoading(false);
      },
      () => setEligibilityLoading(false)
    );
    api.modules.list(token).then((r) => setModules(r.results || []));
  }, [token, editing?.id]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.academics.list(token, deptFilter || undefined).then(
      (r) => {
        setAcademics(r.results || []);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [token, deptFilter]);

  useEffect(() => {
    if (usernameTouched) return;

    const suggested = pickAvailableUsername(form.first_name, form.last_name, editing?.id);

    if (suggested && suggested !== form.username) {
      setForm((f: FormState) => ({ ...f, username: suggested }));
    }
  }, [form.first_name, form.last_name, academics, editing?.id, usernameTouched, form.username]);

  const openEdit = (a: Academic) => {
    setFormError(null);
    setUsernameTouched(true);
    setEditing(a);
    setForm({
      first_name: a.first_name ?? "",
      last_name: a.last_name ?? "",
      username: a.username ?? "",
      email: a.email ?? "",
      department: a.department,
      capacity_hours: a.capacity_hours,
      is_active: a.is_active,
    });
  };

  const openCreate = () => {
    setFormError(null);
    setUsernameTouched(false);
    setCreating(true);
    setEditing(null);
    setForm({
      first_name: "",
      last_name: "",
      username: "",
      email: "",
      department: departments[0]?.id ?? 0,
      capacity_hours: 1500,
      is_active: true,
    });
  };

  const save = async () => {
    if (!token) return;

    setFormError(null);

    if (!form.first_name.trim()) {
      setFormError("First name is required.");
      return;
    }

    if (!form.last_name.trim()) {
      setFormError("Last name is required.");
      return;
    }

    if (!form.username.trim()) {
      setFormError("Username is required.");
      return;
    }

    if (duplicateUsername) {
      setFormError("Username already exists. Try another one.");
      return;
    }

    

    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      department: form.department,
      capacity_hours: form.capacity_hours,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        const updated = await api.academics.update(token, editing.id, payload);
        setAcademics((prev: Academic[]) =>
          prev.map((a: Academic) => (a.id === editing.id ? updated : a))
        );
        setEditing(null);
      } else if (creating) {
        const created = await api.academics.create(token, payload);
        setAcademics((prev: Academic[]) => [...prev, created]);
        setCreating(false);
      }

      setFormError(null);
      setUsernameTouched(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const remove = async (id: number) => {
    if (!token || !confirm("Delete this academic?")) return;
    try {
      await api.academics.delete(token, id);
      setAcademics((prev: Academic[]) => prev.filter((a: Academic) => a.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Academics</h1>
        <div className="flex items-center gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            value={deptFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setDeptFilter(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">All departments</option>
            {departments.map((d: Department) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {(editing || creating) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{editing ? "Edit academic" : "New academic"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f: FormState) => ({ ...f, first_name: value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="First name"
                />
              </div>

              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((f: FormState) => ({ ...f, last_name: value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="Last name"
                />
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUsernameTouched(true);
                    setForm((f: FormState) => ({ ...f, username: value }));
                    if (formError) setFormError(null);
                  }}
                  placeholder="Username"
                />
                {normalizedUsername && duplicateUsername && (
                  <p className="mt-1 text-sm text-destructive">
                    Username already exists. Try another one.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm((f: FormState) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                  disabled={!!editing}
                />
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.department}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setForm((f: FormState) => ({ ...f, department: Number(e.target.value) }))
                  }
                >
                  {departments.map((d: Department) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Capacity (hours)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.capacity_hours}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setForm((f: FormState) => ({
                      ...f,
                      capacity_hours: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            {formError && !duplicateUsername && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-input"
              />
              <Label htmlFor="is_active">Active</Label>
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
            {editing && (
              <div className="border-t pt-4 mt-4 space-y-3">
                <CardTitle className="text-base">Eligible modules</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Eligibility is enforced: academic and module must be active and in the same department.
                </p>
                {eligibilityLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : (
                  <>
                    <ul className="text-sm space-y-1">
                      {eligibilities.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 py-1">
                          <span>
                            {e.module_detail?.name ?? e.module} ({(e.module_detail as { department_detail?: { name: string } })?.department_detail?.name ?? ""})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={async () => {
                              if (!token) return;
                              try {
                                await api.eligibility.delete(token, e.id);
                                setEligibilities((prev) => prev.filter((x) => x.id !== e.id));
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Failed to remove");
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </li>
                      ))}
                      {eligibilities.length === 0 && (
                        <li className="text-muted-foreground">No eligible modules assigned.</li>
                      )}
                    </ul>
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm flex-1 max-w-xs"
                        defaultValue=""
                        onChange={async (e) => {
                          const moduleId = Number(e.target.value);
                          e.target.value = "";
                          if (!token || !moduleId) return;
                          try {
                            await api.eligibility.create(token, { academic: editing.id, module: moduleId });
                            const mod = modules.find((m) => m.id === moduleId);
                            setEligibilities((prev) => [
                              ...prev,
                              { id: 0, academic: editing.id, module: moduleId, module_detail: mod },
                            ]);
                            const list = await api.eligibility.list(token, { academic: editing.id });
                            setEligibilities(list.results || []);
                          } catch (err) {
                            alert(err instanceof Error ? err.message : "Failed to add");
                          }
                        }}
                      >
                        <option value="">Add module…</option>
                        {modules
                          .filter(
                            (m) =>
                              m.department === editing.department &&
                              !eligibilities.some((e) => e.module === m.id)
                          )
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.code ?? ""})
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Department</th>
                    <th className="text-right p-3 font-medium">Capacity</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="w-24 p-3" />
                  </tr>
                </thead>
                <tbody>
                  {academics.map((a: Academic) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <div>{a.full_name}</div>
                        <div className="text-xs text-muted-foreground">{a.username}</div>
                      </td>
                      <td className="p-3 text-muted-foreground">{a.email}</td>
                      <td className="p-3">
                        {a.department_detail?.name ?? a.department}
                      </td>
                      <td className="p-3 text-right">{a.capacity_hours}</td>
                      <td className="p-3">
                        <span
                          className={
                            a.is_active
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }
                        >
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="p-3 flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
