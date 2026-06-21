from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.rbac import require_role, Role
from app.services.reports.generator import ReportGenerator

router = APIRouter()

@router.get("/pdf/{report_type}")
def download_pdf_report(
    report_type: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)),
    db: Session = Depends(get_db)
):
    """Generate and download ReportLab PDF reports."""
    report_type = report_type.lower()
    if report_type not in ["executive", "risk", "recovery", "supplier", "monthly"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type. Choose from: executive, risk, recovery, supplier, monthly"
        )
        
    pdf_bytes = ReportGenerator.generate_pdf(db, current_user["org_id"], report_type)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=supplyvision_{report_type}_report.pdf"}
    )

@router.get("/xlsx/{report_type}")
def download_excel_report(
    report_type: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)),
    db: Session = Depends(get_db)
):
    """Generate and download openpyxl Excel reports."""
    report_type = report_type.lower()
    if report_type not in ["executive", "risk", "recovery", "supplier", "monthly"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type. Choose from: executive, risk, recovery, supplier, monthly"
        )
        
    excel_bytes = ReportGenerator.generate_excel(db, current_user["org_id"], report_type)
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=supplyvision_{report_type}_report.xlsx"}
    )

@router.get("/csv/{report_type}")
def download_csv_report(
    report_type: str,
    current_user: dict = Depends(require_role(Role.AUDITOR)),
    db: Session = Depends(get_db)
):
    """Generate and download CSV reports."""
    report_type = report_type.lower()
    if report_type not in ["executive", "risk", "recovery", "supplier", "monthly"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid report type. Choose from: executive, risk, recovery, supplier, monthly"
        )
        
    csv_str = ReportGenerator.generate_csv(db, current_user["org_id"], report_type)
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=supplyvision_{report_type}_report.csv"}
    )
