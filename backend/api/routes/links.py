"""Link management API routes."""

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from models.urdf_models import (
    Link, Visual, Collision, Inertial, Origin, Material,
    BoxGeometry, CylinderGeometry, SphereGeometry,
    ConnectionPoint, InertiaMatrix
)
from services.urdf_service import URDFService

router = APIRouter(prefix="/links", tags=["Links"])
urdf_service = URDFService()


class CreateLinkRequest(BaseModel):
    """Request model for creating a new link."""
    name: str
    geometry_type: str = "box"  # box, cylinder, sphere
    size: Optional[tuple[float, float, float]] = None  # For box
    radius: Optional[float] = None  # For cylinder/sphere
    length: Optional[float] = None  # For cylinder
    color: tuple[float, float, float, float] = (0.8, 0.8, 0.8, 1.0)
    mass: float = 1.0
    position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    create_collision: bool = True
    create_inertial: bool = True


@router.post("/create", response_model=Link)
async def create_link(request: CreateLinkRequest) -> Link:
    """Create a new link with geometry."""
    # Create geometry based on type
    if request.geometry_type == "box":
        size = request.size or (1.0, 1.0, 1.0)
        geometry = BoxGeometry(size=size)
    elif request.geometry_type == "cylinder":
        radius = request.radius or 0.5
        length = request.length or 1.0
        geometry = CylinderGeometry(radius=radius, length=length)
    elif request.geometry_type == "sphere":
        radius = request.radius or 0.5
        geometry = SphereGeometry(radius=radius)
    else:
        raise HTTPException(400, f"Unknown geometry type: {request.geometry_type}")

    # Create visual
    visual = Visual(
        origin=Origin(),
        geometry=geometry,
        material=Material(
            name=f"{request.name}_material",
            color=request.color
        )
    )

    # Create collision (same geometry by default)
    collision = None
    if request.create_collision:
        collision = Collision(
            origin=Origin(),
            geometry=geometry
        )

    # Create inertial with calculated inertia
    inertial = None
    if request.create_inertial:
        inertia = urdf_service.calculate_inertia_for_geometry(geometry, request.mass)
        inertial = Inertial(
            origin=Origin(),
            mass=request.mass,
            inertia=inertia
        )

    link = Link(
        name=request.name,
        visual=visual,
        collision=collision,
        inertial=inertial,
        editor_position=request.position
    )

    return link


class AddConnectionPointRequest(BaseModel):
    """Request model for adding a connection point."""
    name: str
    position: tuple[float, float, float]
    orientation: tuple[float, float, float] = (0.0, 0.0, 0.0)


@router.post("/{link_name}/connection-points", response_model=ConnectionPoint)
async def add_connection_point(link_name: str, request: AddConnectionPointRequest) -> ConnectionPoint:
    """Create a new connection point (returns the point, client should add to link)."""
    point = ConnectionPoint(
        name=request.name,
        position=request.position,
        orientation=request.orientation
    )
    return point


class CalculateInertiaRequest(BaseModel):
    """Request model for calculating inertia."""
    geometry_type: str
    size: Optional[tuple[float, float, float]] = None
    radius: Optional[float] = None
    length: Optional[float] = None
    mass: float = 1.0


@router.post("/calculate-inertia", response_model=InertiaMatrix)
async def calculate_inertia(request: CalculateInertiaRequest) -> InertiaMatrix:
    """Calculate inertia matrix for a geometry."""
    if request.geometry_type == "box":
        geometry = BoxGeometry(size=request.size or (1.0, 1.0, 1.0))
    elif request.geometry_type == "cylinder":
        geometry = CylinderGeometry(
            radius=request.radius or 0.5,
            length=request.length or 1.0
        )
    elif request.geometry_type == "sphere":
        geometry = SphereGeometry(radius=request.radius or 0.5)
    else:
        raise HTTPException(400, f"Unknown geometry type: {request.geometry_type}")

    return urdf_service.calculate_inertia_for_geometry(geometry, request.mass)
