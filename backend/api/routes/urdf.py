"""URDF import/export API routes."""

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from services.urdf_service import URDFService
from models.urdf_models import URDFRobot, ValidationResult

router = APIRouter(prefix="/urdf", tags=["URDF"])
urdf_service = URDFService()


@router.post("/import", response_model=URDFRobot)
async def import_urdf(file: UploadFile = File(...)) -> URDFRobot:
    """Import URDF file and convert to editor format."""
    if not file.filename or not file.filename.endswith('.urdf'):
        raise HTTPException(400, "File must be a .urdf file")

    content = await file.read()
    try:
        robot = urdf_service.parse_urdf(content.decode('utf-8'))
        return robot
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/import/text", response_model=URDFRobot)
async def import_urdf_text(urdf_content: str) -> URDFRobot:
    """Import URDF from text content."""
    try:
        robot = urdf_service.parse_urdf(urdf_content)
        return robot
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/export")
async def export_urdf(robot: URDFRobot) -> Response:
    """Export editor state to URDF XML."""
    # Validate first
    result = urdf_service.validate_urdf(robot)
    if not result.valid:
        raise HTTPException(400, {"errors": result.errors})

    xml_content = urdf_service.generate_urdf(robot)

    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Content-Disposition": f'attachment; filename="{robot.name}.urdf"'
        }
    )


@router.post("/export/text")
async def export_urdf_text(robot: URDFRobot) -> dict:
    """Export editor state to URDF XML as text response."""
    # Debug: Log joint data
    for joint in robot.joints:
        print(f"[DEBUG] Joint '{joint.name}':")
        print(f"  - origin.xyz: {joint.origin.xyz}")
        print(f"  - parent_connection_point_id: {joint.parent_connection_point_id}")
        parent_link = next((l for l in robot.links if l.name == joint.parent), None)
        if parent_link:
            print(f"  - Parent '{parent_link.name}' has {len(parent_link.connection_points)} connection points")
            for cp in parent_link.connection_points:
                print(f"    - CP '{cp.name}' (id={cp.id}): position={cp.position}")

    # Validate first
    result = urdf_service.validate_urdf(robot)
    if not result.valid:
        raise HTTPException(400, {"errors": result.errors, "warnings": result.warnings})

    xml_content = urdf_service.generate_urdf(robot)
    return {"urdf": xml_content, "warnings": result.warnings}


@router.post("/validate", response_model=ValidationResult)
async def validate_urdf(robot: URDFRobot) -> ValidationResult:
    """Validate URDF structure."""
    return urdf_service.validate_urdf(robot)
