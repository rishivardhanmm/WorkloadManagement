export function getApiBase(): string {
  if (typeof process.env.NEXT_PUBLIC_API_URL !== "undefined" && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function request<T>(
  path: string,
  options: { method?: Method; body?: unknown; token?: string | null } = {}
): Promise<T> {
  const base = getApiBase();
  const { method = "GET", body, token } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) =>
      request<{ access: string; refresh: string }>("/api/auth/login", {
        method: "POST",
        body: { username, password },
      }),
    refresh: (refresh: string) =>
      request<{ access: string }>("/api/auth/refresh", {
        method: "POST",
        body: { refresh },
      }),
    me: (token: string) =>
      request<{ id: number; username: string; email: string; role: string }>("/api/auth/me", { token }),
  },
  years: {
    list: (token: string) => request<{ results: AcademicYear[] }>("/api/years", { token }),
    create: (token: string, data: { label: string; is_current?: boolean; is_locked?: boolean }) =>
      request<AcademicYear>("/api/years", { method: "POST", body: data, token }),
    update: (token: string, id: number, data: { label?: string; is_current?: boolean; is_locked?: boolean }) =>
      request<AcademicYear>(`/api/years/${id}`, { method: "PATCH", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/years/${id}`, { method: "DELETE", token }),
  },
  departments: {
    list: (token: string) => request<{ results: Department[] }>("/api/departments", { token }),
    create: (token: string, data: { name: string; code?: string }) =>
      request<Department>("/api/departments", { method: "POST", body: data, token }),
    update: (token: string, id: number, data: { name?: string; code?: string }) =>
      request<Department>(`/api/departments/${id}`, { method: "PATCH", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/departments/${id}`, { method: "DELETE", token }),
  },
  academics: {
    list: (token: string, dept?: number) =>
      request<{ results: Academic[] }>(`/api/academics${dept != null ? `?dept=${dept}` : ""}`, { token }),
    create: (token: string, data: Partial<Academic>) =>
      request<Academic>("/api/academics", { method: "POST", body: data, token }),
    update: (token: string, id: number, data: Partial<Academic>) =>
      request<Academic>(`/api/academics/${id}`, { method: "PATCH", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/academics/${id}`, { method: "DELETE", token }),
    eligibleModules: (token: string, academicId: number) =>
      request<Module[]>(`/api/academics/${academicId}/eligible-modules`, { token }),
  },
  eligibility: {
    list: (token: string, academicId?: number) =>
      request<{ results: Eligibility[] }>(
        `/api/eligibility${academicId != null ? `?academic=${academicId}` : ""}`,
        { token }
      ),
    create: (token: string, data: { academic: number; module: number }) =>
      request<Eligibility>("/api/eligibility", { method: "POST", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/eligibility/${id}`, { method: "DELETE", token }),
  },
  modules: {
    list: (token: string, params?: { search?: string; ordering?: string }) => {
      const q = new URLSearchParams();
      if (params?.search) q.set("search", params.search);
      if (params?.ordering) q.set("ordering", params.ordering);
      const query = q.toString();
      return request<{ results: Module[] }>(`/api/modules${query ? `?${query}` : ""}`, { token });
    },
    create: (token: string, data: Partial<Module>) =>
      request<Module>("/api/modules", { method: "POST", body: data, token }),
    update: (token: string, id: number, data: Partial<Module>) =>
      request<Module>(`/api/modules/${id}`, { method: "PATCH", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/modules/${id}`, { method: "DELETE", token }),
  },
  allocations: {
    list: (token: string, params?: { year?: number; dept?: number; academic?: number }) => {
      const q = new URLSearchParams();
      if (params?.year) q.set("year", String(params.year));
      if (params?.dept) q.set("dept", String(params.dept));
      if (params?.academic) q.set("academic", String(params.academic));
      const query = q.toString();
      return request<{ results: WorkloadAllocation[] }>(
        `/api/allocations${query ? `?${query}` : ""}`,
        { token }
      );
    },
    create: (token: string, data: AllocationWrite) =>
      request<WorkloadAllocation>("/api/allocations", { method: "POST", body: data, token }),
    update: (token: string, id: number, data: Partial<AllocationWrite>) =>
      request<WorkloadAllocation>(`/api/allocations/${id}`, { method: "PATCH", body: data, token }),
    delete: (token: string, id: number) =>
      request(`/api/allocations/${id}`, { method: "DELETE", token }),
  },
    moduleTeachingAllocations: {
    list: (
      token: string,
      params?: {
        module?: number;
        academic?: number;
        academic_year?: number;
        department?: number;
      }
    ) => {
      const search = new URLSearchParams();

      if (params?.module) search.set("module", String(params.module));
      if (params?.academic) search.set("academic", String(params.academic));
      if (params?.academic_year) search.set("academic_year", String(params.academic_year));
      if (params?.department) search.set("department", String(params.department));

      const query = search.toString();
      return request<ModuleTeachingAllocation[]>(
        `/api/module-teaching-allocations${query ? `?${query}` : ""}`,
        { token }
      );
    },

    create: (token: string, payload: ModuleTeachingAllocationPayload) =>
      request<ModuleTeachingAllocation>("/api/module-teaching-allocations", {
        method: "POST",
        token,
        body: payload,
      }),

    update: (token: string, id: number, payload: Partial<ModuleTeachingAllocationPayload>) =>
      request<ModuleTeachingAllocation>(`/api/module-teaching-allocations/${id}`, {
        method: "PATCH",
        token,
        body: payload,
      }),

    remove: (token: string, id: number) =>
      request<void>(`/api/module-teaching-allocations/${id}`, {
        method: "DELETE",
        token,
      }),
  },
  analytics: {
    adminSummary: (token: string, year: number) =>
      request<AdminSummary>("/api/analytics/admin/summary?year=" + year, { token }),
    adminRisk: (token: string, year: number, dept?: number) => {
      const q = "year=" + year + (dept != null ? "&dept=" + dept : "");
      return request<RiskItem[]>("/api/analytics/admin/risk?" + q, { token });
    },
    adminAcademicsBreakdown: (
      token: string,
      year: number,
      opts?: { dept?: number; academic_ids?: number[]; limit?: number }
    ) => {
      const params = new URLSearchParams({ year: String(year) });
      if (opts?.dept != null) params.set("dept", String(opts.dept));
      if (opts?.academic_ids?.length) params.set("academic_ids", opts.academic_ids.join(","));
      if (opts?.limit != null) params.set("limit", String(opts.limit));
      return request<AcademicBreakdownItem[]>(
        "/api/analytics/admin/academics-breakdown?" + params.toString(),
        { token }
      );
    },
    myWorkload: (token: string, year: number) =>
      request<MyWorkload>("/api/academic/my-workload?year=" + year, { token }),
    history: (token: string) =>
      request<HistoryItem[]>("/api/academic/history", { token }),
    groupSummary: (token: string, year: number) =>
      request<GroupSummary>("/api/academic/group-summary?year=" + year, { token }),
  },
};

export interface AcademicYear {
  id: number;
  label: string;
  is_current: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface Academic {
  id: number;
  user: number | null;
  first_name: string;
  last_name: string;
  username: string;
  full_name: string;
  email: string;
  department: number;
  department_detail?: Department;
  capacity_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Eligibility {
  id: number;
  academic: number;
  module: number;
  academic_detail?: Academic;
  module_detail?: Module;
}

export interface Module {
  id: number;
  code: string | null;
  name: string;
  department: number;
  credit_hours: number;
  is_active: boolean;
}
export interface ModuleTeachingAllocation {
  id: number;
  module: number;
  module_detail?: Module;
  academic: number;
  academic_detail?: Academic;
  academic_year: number;
  academic_year_detail?: AcademicYear;
  percentage: number;
}

export interface ModuleTeachingAllocationPayload {
  module: number;
  academic: number;
  academic_year: number;
  percentage: number;
}

export interface WorkloadAllocation {
  id: number;
  academic: number;
  academic_detail?: Academic;
  academic_year: number;
  academic_year_detail?: AcademicYear;
  teaching_hours: string;
  research_hours: string;
  admin_hours: string;
  notes: string;
  total_hours?: string;
  utilisation?: number;
  difference?: number;
  status?: "OVERLOADED" | "UNDERLOADED" | "BALANCED";
  created_by_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AllocationWrite {
  academic: number;
  academic_year: number;
  teaching_hours: number;
  research_hours: number;
  admin_hours: number;
  notes?: string;
}

export interface AdminSummary {
  department_summary: Array<{
    id: number;
    name: string;
    code: string;
    teaching_hours: number;
    research_hours: number;
    admin_hours: number;
    allocation_count: number;
  }>;
  status_counts: { OVERLOADED: number; UNDERLOADED: number; BALANCED: number };
  utilisation_buckets: { under_90: number; "90_110": number; over_110: number };
}

export interface AcademicBreakdownItem {
  academic_id: number;
  full_name: string;
  department_name: string;
  teaching_hours: number;
  research_hours: number;
  admin_hours: number;
  total_hours: number;
  capacity_hours: number;
  utilisation_pct: number;
  difference: number;
  status: "OVERLOADED" | "UNDERLOADED" | "BALANCED";
}

export interface RiskItem {
  id: number;
  academic_id: number;
  academic_name: string;
  department: string;
  teaching_hours?: number;
  research_hours?: number;
  admin_hours?: number;
  total_hours: number;
  capacity_hours: number;
  utilisation_pct: number;
  difference?: number;
  status: string;
}

export interface MyWorkload {
  academic_id: number;
  academic_year_id: number;
  teaching_hours: number;
  research_hours: number;
  admin_hours: number;
  total_hours: number;
  capacity_hours: number;
  utilisation: number;
  difference: number;
  status: string;
}

export interface HistoryItem {
  year_label: string;
  academic_year_id: number;
  total_hours: number;
}

export interface GroupSummary {
  department_name: string;
  academic_year_id: number;
  distribution: { under_90: number; "90_110": number; over_110: number };
}
