"""URDF data models using Pydantic for validation and serialization."""

from pydantic import BaseModel, Field
from typing import Optional, Union, Annotated, Literal
from enum import Enum
import uuid


class GeometryType(str, Enum):
    BOX = "box"
    CYLINDER = "cylinder"
    SPHERE = "sphere"
    MESH = "mesh"


class BoxGeometry(BaseModel):
    """Box geometry with size in x, y, z dimensions."""
    type: Literal["box"] = "box"
    size: tuple[float, float, float] = (1.0, 1.0, 1.0)


class CylinderGeometry(BaseModel):
    """Cylinder geometry with radius and length."""
    type: Literal["cylinder"] = "cylinder"
    radius: float = 0.5
    length: float = 1.0


class SphereGeometry(BaseModel):
    """Sphere geometry with radius."""
    type: Literal["sphere"] = "sphere"
    radius: float = 0.5


class MeshGeometry(BaseModel):
    """Mesh geometry from external file."""
    type: Literal["mesh"] = "mesh"
    filename: str
    scale: tuple[float, float, float] = (1.0, 1.0, 1.0)


Geometry = Annotated[
    Union[BoxGeometry, CylinderGeometry, SphereGeometry, MeshGeometry],
    Field(discriminator="type")
]


class Origin(BaseModel):
    """Position and orientation (xyz in meters, rpy in radians)."""
    xyz: tuple[float, float, float] = (0.0, 0.0, 0.0)
    rpy: tuple[float, float, float] = (0.0, 0.0, 0.0)


class Material(BaseModel):
    """Visual material with color and optional texture."""
    name: str = "default"
    color: tuple[float, float, float, float] = (0.8, 0.8, 0.8, 1.0)  # RGBA
    texture: Optional[str] = None


class Visual(BaseModel):
    """Visual representation of a link."""
    name: Optional[str] = None
    origin: Origin = Field(default_factory=Origin)
    geometry: Geometry
    material: Optional[Material] = None


class Collision(BaseModel):
    """Collision geometry of a link."""
    name: Optional[str] = None
    origin: Origin = Field(default_factory=Origin)
    geometry: Geometry


class InertiaMatrix(BaseModel):
    """Inertia tensor components."""
    ixx: float = 1.0
    ixy: float = 0.0
    ixz: float = 0.0
    iyy: float = 1.0
    iyz: float = 0.0
    izz: float = 1.0


class Inertial(BaseModel):
    """Inertial properties of a link."""
    origin: Origin = Field(default_factory=Origin)
    mass: float = 1.0
    inertia: InertiaMatrix = Field(default_factory=InertiaMatrix)


class ConnectionPoint(BaseModel):
    """User-defined connection point on a link for joint attachment."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    position: tuple[float, float, float]
    orientation: tuple[float, float, float] = (0.0, 0.0, 0.0)
    attached_joint_id: Optional[str] = None


class Link(BaseModel):
    """URDF Link element representing a rigid body."""
    name: str
    visual: Optional[Visual] = None
    collision: Optional[Collision] = None
    inertial: Optional[Inertial] = None
    connection_points: list[ConnectionPoint] = Field(default_factory=list)

    # Editor metadata (not exported to URDF XML)
    editor_position: tuple[float, float, float] = (0.0, 0.0, 0.0)
    editor_color: str = "#4a9eff"


class JointType(str, Enum):
    REVOLUTE = "revolute"
    PRISMATIC = "prismatic"
    FIXED = "fixed"
    CONTINUOUS = "continuous"
    FLOATING = "floating"
    PLANAR = "planar"


class JointLimit(BaseModel):
    """Joint limits for revolute and prismatic joints."""
    lower: float = -3.14159
    upper: float = 3.14159
    effort: float = 100.0
    velocity: float = 1.0


class JointDynamics(BaseModel):
    """Joint dynamics properties."""
    damping: float = 0.0
    friction: float = 0.0


class Joint(BaseModel):
    """URDF Joint element connecting two links."""
    name: str
    type: JointType
    parent: str  # Parent link name
    child: str   # Child link name
    origin: Origin = Field(default_factory=Origin)
    axis: tuple[float, float, float] = (0.0, 0.0, 1.0)
    limit: Optional[JointLimit] = None
    dynamics: Optional[JointDynamics] = None

    # Connection point references (editor metadata)
    parent_connection_point_id: Optional[str] = None
    child_connection_point_id: Optional[str] = None

    # Current joint state for visualization
    current_value: float = 0.0


class URDFRobot(BaseModel):
    """Complete URDF robot model."""
    name: str = "robot"
    links: list[Link] = Field(default_factory=list)
    joints: list[Joint] = Field(default_factory=list)


class ValidationResult(BaseModel):
    """Result of URDF validation."""
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
