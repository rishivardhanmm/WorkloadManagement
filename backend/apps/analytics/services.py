"""
Analytics services: aggregation and risk lists. No business logic in views.
"""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal
from typing import Any, List, Dict, Optional, Sequence

from apps.allocations.models import WorkloadAllocation
from apps.allocations.services import (
    calculate_total_hours,
    calculate_utilisation,
    calculate_status,
    calculate_difference,
)
from apps.departments.models import Department
from apps.academics.models import Academic
from apps.modules.models import ModuleTeachingAllocation

def get_admin_summary(academic_year_id: int) -> Dict[str, Any]:
    """Department summary cards and status counts for admin dashboard."""
    allocations = WorkloadAllocation.objects.filter(
        academic_year_id=academic_year_id
    ).select_related("academic", "academic__department")

    dept_totals = defaultdict(lambda: {"teaching": 0, "research": 0, "admin": 0, "count": 0})
    status_counts = {"OVERLOADED": 0, "UNDERLOADED": 0, "BALANCED": 0}

    utilisation_buckets = {"under_90": 0, "90_110": 0, "over_110": 0}
    for a in allocations:
        total = calculate_total_hours(a.teaching_hours, a.research_hours, a.admin_hours)
        status = calculate_status(total, a.academic.capacity_hours)
        status_counts[status] += 1
        util = calculate_utilisation(total, a.academic.capacity_hours)
        if util < 90:
            utilisation_buckets["under_90"] += 1
        elif util <= 110:
            utilisation_buckets["90_110"] += 1
        else:
            utilisation_buckets["over_110"] += 1
        dept_id = a.academic.department_id
        dept_totals[dept_id]["teaching"] += float(a.teaching_hours)
        dept_totals[dept_id]["research"] += float(a.research_hours)
        dept_totals[dept_id]["admin"] += float(a.admin_hours)
        dept_totals[dept_id]["count"] += 1

    departments = Department.objects.filter(id__in=dept_totals.keys())
    dept_map = {d.id: {"id": d.id, "name": d.name, "code": d.code} for d in departments}

    department_summary = []
    for dept_id, data in dept_totals.items():
        dept_info = dept_map.get(dept_id, {"id": dept_id, "name": "Unknown", "code": ""})
        department_summary.append({
            **dept_info,
            "teaching_hours": round(data["teaching"], 2),
            "research_hours": round(data["research"], 2),
            "admin_hours": round(data["admin"], 2),
            "allocation_count": data["count"],
        })

    return {
        "department_summary": department_summary,
        "status_counts": status_counts,
        "utilisation_buckets": utilisation_buckets,
    }


def get_admin_risk(
    academic_year_id: int,
    dept_id: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """List of academics with status != BALANCED for the year. Optional department filter."""
    qs = WorkloadAllocation.objects.filter(
        academic_year_id=academic_year_id
    ).select_related("academic", "academic__department")
    if dept_id is not None:
        qs = qs.filter(academic__department_id=dept_id)

    risk_list = []
    for a in qs:
        total = calculate_total_hours(a.teaching_hours, a.research_hours, a.admin_hours)
        st = calculate_status(total, a.academic.capacity_hours)
        if st == "BALANCED":
            continue
        utilisation = calculate_utilisation(total, a.academic.capacity_hours)
        diff = calculate_difference(total, a.academic.capacity_hours)
        risk_list.append({
            "id": a.id,
            "academic_id": a.academic_id,
            "academic_name": a.academic.full_name,
            "department": a.academic.department.name,
            "teaching_hours": float(a.teaching_hours),
            "research_hours": float(a.research_hours),
            "admin_hours": float(a.admin_hours),
            "total_hours": float(total),
            "capacity_hours": a.academic.capacity_hours,
            "utilisation_pct": round(utilisation, 2),
            "difference": round(float(diff), 2),
            "status": st,
        })
    return risk_list


def get_admin_academics_breakdown(
    academic_year_id: int,
    dept_id: Optional[int] = None,
    academic_ids: Optional[Sequence[int]] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Per-academic workload breakdown for admin dashboard.
    Uses allocations for the given year; supports dept filter, academic_ids filter, or limit (top N by total_hours).
    All computations use allocations/services.
    """
    qs = WorkloadAllocation.objects.filter(
        academic_year_id=academic_year_id
    ).select_related("academic", "academic__department")
    if dept_id is not None:
        qs = qs.filter(academic__department_id=dept_id)
    if academic_ids is not None:
        qs = qs.filter(academic_id__in=academic_ids)

    rows = []
    for a in qs:
        total = calculate_total_hours(a.teaching_hours, a.research_hours, a.admin_hours)
        utilisation = calculate_utilisation(total, a.academic.capacity_hours)
        diff = calculate_difference(total, a.academic.capacity_hours)
        st = calculate_status(total, a.academic.capacity_hours)
        rows.append({
            "academic_id": a.academic_id,
            "full_name": a.academic.full_name,
            "department_name": a.academic.department.name,
            "teaching_hours": round(float(a.teaching_hours), 2),
            "research_hours": round(float(a.research_hours), 2),
            "admin_hours": round(float(a.admin_hours), 2),
            "total_hours": round(float(total), 2),
            "capacity_hours": a.academic.capacity_hours,
            "utilisation_pct": round(utilisation, 2),
            "difference": round(float(diff), 2),
            "status": st,
        })

    if academic_ids is not None and academic_ids:
        order = {aid: i for i, aid in enumerate(academic_ids)}
        rows.sort(key=lambda r: order.get(r["academic_id"], 999999))
    elif limit is not None:
        rows.sort(key=lambda r: (-r["total_hours"], r["full_name"]))
        rows = rows[:limit]
    else:
        rows.sort(key=lambda r: (r["full_name"], r["academic_id"]))

    return rows
def get_module_teaching_hours_for_academic(academic_id: int, academic_year_id: int) -> Decimal:
    allocations = ModuleTeachingAllocation.objects.filter(
        academic_id=academic_id,
        academic_year_id=academic_year_id,
        module__is_active=True,
        academic__is_active=True,
    ).select_related("module")

    total = Decimal("0")
    for row in allocations:
        module_hours = Decimal(str(row.module.credit_hours))
        percentage = Decimal(str(row.percentage))
        total += module_hours * (percentage / Decimal("100"))

    return total

def get_academic_my_workload(user_id: int, academic_year_id: int) -> Optional[Dict[str, Any]]:
    """Single academic's workload for the year (for logged-in academic)."""
    try:
        academic = Academic.objects.get(user_id=user_id)
    except Academic.DoesNotExist:
        return None

    allocation = WorkloadAllocation.objects.filter(
        academic=academic,
        academic_year_id=academic_year_id,
    ).select_related("academic_year").first()

    teaching_hours = get_module_teaching_hours_for_academic(academic.id, academic_year_id)
    research_hours = allocation.research_hours if allocation else Decimal("0")
    admin_hours = allocation.admin_hours if allocation else Decimal("0")

    total = calculate_total_hours(
        teaching_hours,
        research_hours,
        admin_hours,
    )

    return {
        "academic_id": academic.id,
        "academic_year_id": academic_year_id,
        "teaching_hours": float(teaching_hours),
        "research_hours": float(research_hours),
        "admin_hours": float(admin_hours),
        "total_hours": float(total),
        "capacity_hours": academic.capacity_hours,
        "utilisation": round(
            calculate_utilisation(total, academic.capacity_hours),
            2,
        ),
        "difference": float(total - Decimal(academic.capacity_hours)),
        "status": calculate_status(total, academic.capacity_hours),
    }


def get_academic_history(user_id: int) -> List[Dict[str, Any]]:
    """Year-by-year total hours for the logged-in academic (for trend chart)."""
    try:
        academic = Academic.objects.get(user_id=user_id)
    except Academic.DoesNotExist:
        return []

    allocations = WorkloadAllocation.objects.filter(
        academic=academic
    ).select_related("academic_year").order_by("academic_year__label")

    return [
        {
            "year_label": a.academic_year.label,
            "academic_year_id": a.academic_year_id,
            "total_hours": float(
                calculate_total_hours(a.teaching_hours, a.research_hours, a.admin_hours)
            ),
        }
        for a in allocations
    ]


def get_academic_group_summary(
    user_id: int,
    academic_year_id: int,
) -> Optional[Dict[str, Any]]:
    """Anonymised department distribution. No peer names."""
    try:
        academic = Academic.objects.get(user_id=user_id)
    except Academic.DoesNotExist:
        return None

    # Same department only, anonymised: buckets and counts
    allocations = WorkloadAllocation.objects.filter(
        academic_year_id=academic_year_id,
        academic__department=academic.department,
        academic__is_active=True,
    ).select_related("academic")

    utilisation_buckets = defaultdict(int)
    for a in allocations:
        total = calculate_total_hours(a.teaching_hours, a.research_hours, a.admin_hours)
        util = calculate_utilisation(total, a.academic.capacity_hours)
        if util < 90:
            bucket = "under_90"
        elif util <= 110:
            bucket = "90_110"
        else:
            bucket = "over_110"
        utilisation_buckets[bucket] += 1

    return {
        "department_name": academic.department.name,
        "academic_year_id": academic_year_id,
        "distribution": {
            "under_90": utilisation_buckets["under_90"],
            "90_110": utilisation_buckets["90_110"],
            "over_110": utilisation_buckets["over_110"],
        },
    }
