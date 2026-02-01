"""Joint management API routes."""

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel
from models.urdf_models import Joint, JointType, JointLimit, JointDynamics, Origin

router = APIRouter(prefix="/joints", tags=["Joints"])


class CreateJointRequest(BaseModel):
    """Request model for creating a new joint."""
    name: str
    type: JointType
    parent_link: str
    child_link: str
    parent_connection_point_id: Optional[str] = None
    child_connection_point_id: Optional[str] = None
    origin_xyz: tuple[float, float, float] = (0.0, 0.0, 0.0)
    origin_rpy: tuple[float, float, float] = (0.0, 0.0, 0.0)
    axis: tuple[float, float, float] = (0.0, 0.0, 1.0)
    # Limits (for revolute/prismatic)
    lower: Optional[float] = None
    upper: Optional[float] = None
    effort: float = 100.0
    velocity: float = 1.0
    # Dynamics
    damping: float = 0.0
    friction: float = 0.0


@router.post("/create", response_model=Joint)
async def create_joint(request: CreateJointRequest) -> Joint:
    """Create a new joint."""
    # Validate self-connection
    if request.parent_link == request.child_link:
        raise HTTPException(400, "Cannot create joint between a link and itself")

    # Create limit for revolute/prismatic joints
    limit = None
    if request.type in [JointType.REVOLUTE, JointType.PRISMATIC]:
        # Default limits based on joint type
        if request.type == JointType.REVOLUTE:
            lower = request.lower if request.lower is not None else -3.14159
            upper = request.upper if request.upper is not None else 3.14159
        else:  # PRISMATIC
            lower = request.lower if request.lower is not None else -1.0
            upper = request.upper if request.upper is not None else 1.0

        limit = JointLimit(
            lower=lower,
            upper=upper,
            effort=request.effort,
            velocity=request.velocity
        )

    # Create dynamics if non-zero
    dynamics = None
    if request.damping > 0 or request.friction > 0:
        dynamics = JointDynamics(
            damping=request.damping,
            friction=request.friction
        )

    joint = Joint(
        name=request.name,
        type=request.type,
        parent=request.parent_link,
        child=request.child_link,
        origin=Origin(xyz=request.origin_xyz, rpy=request.origin_rpy),
        axis=request.axis,
        limit=limit,
        dynamics=dynamics,
        parent_connection_point_id=request.parent_connection_point_id,
        child_connection_point_id=request.child_connection_point_id
    )

    return joint


class UpdateJointLimitsRequest(BaseModel):
    """Request model for updating joint limits."""
    lower: float
    upper: float
    effort: float = 100.0
    velocity: float = 1.0


class UpdateJointDynamicsRequest(BaseModel):
    """Request model for updating joint dynamics."""
    damping: float = 0.0
    friction: float = 0.0


@router.post("/limits", response_model=JointLimit)
async def create_limits(request: UpdateJointLimitsRequest) -> JointLimit:
    """Create joint limits object."""
    return JointLimit(
        lower=request.lower,
        upper=request.upper,
        effort=request.effort,
        velocity=request.velocity
    )


@router.post("/dynamics", response_model=JointDynamics)
async def create_dynamics(request: UpdateJointDynamicsRequest) -> JointDynamics:
    """Create joint dynamics object."""
    return JointDynamics(
        damping=request.damping,
        friction=request.friction
    )
