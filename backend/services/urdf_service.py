"""Service for URDF parsing, generation, and validation."""

from lxml import etree
from typing import Optional
import tempfile
import os
import math

from models.urdf_models import (
    URDFRobot, Link, Joint, JointType, Visual, Collision, Inertial,
    Origin, Material, InertiaMatrix, JointLimit, JointDynamics,
    BoxGeometry, CylinderGeometry, SphereGeometry, MeshGeometry,
    ValidationResult
)


class URDFService:
    """Service for URDF parsing, validation, and generation."""

    def parse_urdf(self, urdf_content: str) -> URDFRobot:
        """Parse URDF XML string into internal model."""
        try:
            root = etree.fromstring(urdf_content.encode('utf-8'))

            if root.tag != 'robot':
                raise ValueError("Root element must be 'robot'")

            robot_name = root.get('name', 'robot')
            robot = URDFRobot(name=robot_name)

            # Parse links
            for link_elem in root.findall('link'):
                link = self._parse_link(link_elem)
                robot.links.append(link)

            # Parse joints
            for joint_elem in root.findall('joint'):
                joint = self._parse_joint(joint_elem)
                robot.joints.append(joint)

            return robot

        except etree.XMLSyntaxError as e:
            raise ValueError(f"Invalid XML syntax: {str(e)}")

    def _parse_link(self, elem: etree._Element) -> Link:
        """Parse a link element."""
        name = elem.get('name')
        if not name:
            raise ValueError("Link must have a name attribute")

        link = Link(name=name)

        # Parse visual
        visual_elem = elem.find('visual')
        if visual_elem is not None:
            link.visual = self._parse_visual(visual_elem)

        # Parse collision
        collision_elem = elem.find('collision')
        if collision_elem is not None:
            link.collision = self._parse_collision(collision_elem)

        # Parse inertial
        inertial_elem = elem.find('inertial')
        if inertial_elem is not None:
            link.inertial = self._parse_inertial(inertial_elem)

        return link

    def _parse_visual(self, elem: etree._Element) -> Visual:
        """Parse a visual element."""
        visual = Visual(
            name=elem.get('name'),
            origin=self._parse_origin(elem.find('origin')),
            geometry=self._parse_geometry(elem.find('geometry'))
        )

        material_elem = elem.find('material')
        if material_elem is not None:
            visual.material = self._parse_material(material_elem)

        return visual

    def _parse_collision(self, elem: etree._Element) -> Collision:
        """Parse a collision element."""
        return Collision(
            name=elem.get('name'),
            origin=self._parse_origin(elem.find('origin')),
            geometry=self._parse_geometry(elem.find('geometry'))
        )

    def _parse_inertial(self, elem: etree._Element) -> Inertial:
        """Parse an inertial element."""
        inertial = Inertial(
            origin=self._parse_origin(elem.find('origin'))
        )

        mass_elem = elem.find('mass')
        if mass_elem is not None:
            inertial.mass = float(mass_elem.get('value', '1.0'))

        inertia_elem = elem.find('inertia')
        if inertia_elem is not None:
            inertial.inertia = InertiaMatrix(
                ixx=float(inertia_elem.get('ixx', '1.0')),
                ixy=float(inertia_elem.get('ixy', '0.0')),
                ixz=float(inertia_elem.get('ixz', '0.0')),
                iyy=float(inertia_elem.get('iyy', '1.0')),
                iyz=float(inertia_elem.get('iyz', '0.0')),
                izz=float(inertia_elem.get('izz', '1.0'))
            )

        return inertial

    def _parse_origin(self, elem: Optional[etree._Element]) -> Origin:
        """Parse an origin element."""
        if elem is None:
            return Origin()

        xyz_str = elem.get('xyz', '0 0 0')
        rpy_str = elem.get('rpy', '0 0 0')

        xyz = tuple(map(float, xyz_str.split()))
        rpy = tuple(map(float, rpy_str.split()))

        return Origin(xyz=xyz, rpy=rpy)

    def _parse_geometry(self, elem: Optional[etree._Element]):
        """Parse a geometry element."""
        if elem is None:
            return BoxGeometry()

        box = elem.find('box')
        if box is not None:
            size_str = box.get('size', '1 1 1')
            size = tuple(map(float, size_str.split()))
            return BoxGeometry(size=size)

        cylinder = elem.find('cylinder')
        if cylinder is not None:
            return CylinderGeometry(
                radius=float(cylinder.get('radius', '0.5')),
                length=float(cylinder.get('length', '1.0'))
            )

        sphere = elem.find('sphere')
        if sphere is not None:
            return SphereGeometry(
                radius=float(sphere.get('radius', '0.5'))
            )

        mesh = elem.find('mesh')
        if mesh is not None:
            scale_str = mesh.get('scale', '1 1 1')
            scale = tuple(map(float, scale_str.split()))
            return MeshGeometry(
                filename=mesh.get('filename', ''),
                scale=scale
            )

        return BoxGeometry()

    def _parse_material(self, elem: etree._Element) -> Material:
        """Parse a material element."""
        material = Material(name=elem.get('name', 'default'))

        color_elem = elem.find('color')
        if color_elem is not None:
            rgba_str = color_elem.get('rgba', '0.8 0.8 0.8 1.0')
            rgba = tuple(map(float, rgba_str.split()))
            material.color = rgba

        texture_elem = elem.find('texture')
        if texture_elem is not None:
            material.texture = texture_elem.get('filename')

        return material

    def _parse_joint(self, elem: etree._Element) -> Joint:
        """Parse a joint element."""
        name = elem.get('name')
        joint_type = elem.get('type')

        if not name or not joint_type:
            raise ValueError("Joint must have name and type attributes")

        parent_elem = elem.find('parent')
        child_elem = elem.find('child')

        if parent_elem is None or child_elem is None:
            raise ValueError(f"Joint '{name}' must have parent and child elements")

        joint = Joint(
            name=name,
            type=JointType(joint_type),
            parent=parent_elem.get('link'),
            child=child_elem.get('link'),
            origin=self._parse_origin(elem.find('origin'))
        )

        # Parse axis
        axis_elem = elem.find('axis')
        if axis_elem is not None:
            xyz_str = axis_elem.get('xyz', '0 0 1')
            joint.axis = tuple(map(float, xyz_str.split()))

        # Parse limits
        limit_elem = elem.find('limit')
        if limit_elem is not None:
            joint.limit = JointLimit(
                lower=float(limit_elem.get('lower', '-3.14159')),
                upper=float(limit_elem.get('upper', '3.14159')),
                effort=float(limit_elem.get('effort', '100.0')),
                velocity=float(limit_elem.get('velocity', '1.0'))
            )

        # Parse dynamics
        dynamics_elem = elem.find('dynamics')
        if dynamics_elem is not None:
            joint.dynamics = JointDynamics(
                damping=float(dynamics_elem.get('damping', '0.0')),
                friction=float(dynamics_elem.get('friction', '0.0'))
            )

        return joint

    def generate_urdf(self, robot: URDFRobot) -> str:
        """Generate URDF XML from internal model."""
        root = etree.Element('robot', name=robot.name)

        # Add links
        for link in robot.links:
            link_elem = self._generate_link_element(link)
            root.append(link_elem)

        # Add joints
        for joint in robot.joints:
            joint_elem = self._generate_joint_element(joint)
            root.append(joint_elem)

        # Format XML with proper indentation
        xml_string = etree.tostring(
            root,
            pretty_print=True,
            xml_declaration=True,
            encoding='UTF-8'
        ).decode('utf-8')

        return xml_string

    def _generate_link_element(self, link: Link) -> etree._Element:
        """Generate XML element for link."""
        elem = etree.Element('link', name=link.name)

        if link.visual:
            visual_elem = self._generate_visual_element(link.visual)
            elem.append(visual_elem)

        if link.collision:
            collision_elem = self._generate_collision_element(link.collision)
            elem.append(collision_elem)

        if link.inertial:
            inertial_elem = self._generate_inertial_element(link.inertial)
            elem.append(inertial_elem)

        return elem

    def _generate_visual_element(self, visual: Visual) -> etree._Element:
        """Generate XML element for visual."""
        elem = etree.Element('visual')
        if visual.name:
            elem.set('name', visual.name)

        elem.append(self._generate_origin_element(visual.origin))
        elem.append(self._generate_geometry_element(visual.geometry))

        if visual.material:
            elem.append(self._generate_material_element(visual.material))

        return elem

    def _generate_collision_element(self, collision: Collision) -> etree._Element:
        """Generate XML element for collision."""
        elem = etree.Element('collision')
        if collision.name:
            elem.set('name', collision.name)

        elem.append(self._generate_origin_element(collision.origin))
        elem.append(self._generate_geometry_element(collision.geometry))

        return elem

    def _generate_inertial_element(self, inertial: Inertial) -> etree._Element:
        """Generate XML element for inertial."""
        elem = etree.Element('inertial')

        elem.append(self._generate_origin_element(inertial.origin))

        mass_elem = etree.SubElement(elem, 'mass', value=str(inertial.mass))

        inertia = inertial.inertia
        inertia_elem = etree.SubElement(elem, 'inertia',
            ixx=str(inertia.ixx),
            ixy=str(inertia.ixy),
            ixz=str(inertia.ixz),
            iyy=str(inertia.iyy),
            iyz=str(inertia.iyz),
            izz=str(inertia.izz)
        )

        return elem

    def _generate_origin_element(self, origin: Origin) -> etree._Element:
        """Generate XML element for origin."""
        return etree.Element('origin',
            xyz=' '.join(map(str, origin.xyz)),
            rpy=' '.join(map(str, origin.rpy))
        )

    def _generate_geometry_element(self, geometry) -> etree._Element:
        """Generate XML element for geometry."""
        elem = etree.Element('geometry')

        if isinstance(geometry, BoxGeometry):
            etree.SubElement(elem, 'box', size=' '.join(map(str, geometry.size)))
        elif isinstance(geometry, CylinderGeometry):
            etree.SubElement(elem, 'cylinder',
                radius=str(geometry.radius),
                length=str(geometry.length)
            )
        elif isinstance(geometry, SphereGeometry):
            etree.SubElement(elem, 'sphere', radius=str(geometry.radius))
        elif isinstance(geometry, MeshGeometry):
            mesh_elem = etree.SubElement(elem, 'mesh', filename=geometry.filename)
            if geometry.scale != (1.0, 1.0, 1.0):
                mesh_elem.set('scale', ' '.join(map(str, geometry.scale)))

        return elem

    def _generate_material_element(self, material: Material) -> etree._Element:
        """Generate XML element for material."""
        elem = etree.Element('material', name=material.name)

        etree.SubElement(elem, 'color',
            rgba=' '.join(map(str, material.color))
        )

        if material.texture:
            etree.SubElement(elem, 'texture', filename=material.texture)

        return elem

    def _generate_joint_element(self, joint: Joint) -> etree._Element:
        """Generate XML element for joint."""
        elem = etree.Element('joint', name=joint.name, type=joint.type.value)

        etree.SubElement(elem, 'parent', link=joint.parent)
        etree.SubElement(elem, 'child', link=joint.child)

        elem.append(self._generate_origin_element(joint.origin))

        # Axis (not needed for fixed joints)
        if joint.type != JointType.FIXED:
            etree.SubElement(elem, 'axis', xyz=' '.join(map(str, joint.axis)))

        # Limits (required for revolute and prismatic)
        if joint.limit and joint.type in [JointType.REVOLUTE, JointType.PRISMATIC]:
            etree.SubElement(elem, 'limit',
                lower=str(joint.limit.lower),
                upper=str(joint.limit.upper),
                effort=str(joint.limit.effort),
                velocity=str(joint.limit.velocity)
            )

        # Dynamics (optional)
        if joint.dynamics:
            etree.SubElement(elem, 'dynamics',
                damping=str(joint.dynamics.damping),
                friction=str(joint.dynamics.friction)
            )

        return elem

    def validate_urdf(self, robot: URDFRobot) -> ValidationResult:
        """Validate URDF structure."""
        errors = []
        warnings = []

        # Check for at least one link
        if len(robot.links) == 0:
            errors.append("Robot must have at least one link")
            return ValidationResult(valid=False, errors=errors, warnings=warnings)

        link_names = {link.name for link in robot.links}

        # Check for duplicate link names
        if len(link_names) != len(robot.links):
            errors.append("Duplicate link names detected")

        # Check for root link (link with no parent joint)
        child_links = {j.child for j in robot.joints}
        root_links = [l for l in robot.links if l.name not in child_links]

        if len(root_links) == 0 and len(robot.joints) > 0:
            errors.append("No root link found (all links are children of joints)")
        elif len(root_links) > 1:
            warnings.append(f"Multiple root links found: {[l.name for l in root_links]}")

        # Check for circular dependencies
        if self._has_circular_dependency(robot):
            errors.append("Circular dependency detected in kinematic chain")

        # Check joint references
        for joint in robot.joints:
            if joint.parent not in link_names:
                errors.append(f"Joint '{joint.name}' references unknown parent link '{joint.parent}'")
            if joint.child not in link_names:
                errors.append(f"Joint '{joint.name}' references unknown child link '{joint.child}'")

        # Check required limits for revolute/prismatic
        for joint in robot.joints:
            if joint.type in [JointType.REVOLUTE, JointType.PRISMATIC] and joint.limit is None:
                errors.append(f"Joint '{joint.name}' of type '{joint.type.value}' requires limits")

        # Check for duplicate joint names
        joint_names = [j.name for j in robot.joints]
        if len(set(joint_names)) != len(joint_names):
            errors.append("Duplicate joint names detected")

        return ValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )

    def _has_circular_dependency(self, robot: URDFRobot) -> bool:
        """Check for circular dependencies in the kinematic tree."""
        parent_map = {j.child: j.parent for j in robot.joints}

        for link in robot.links:
            visited = set()
            current = link.name

            while current in parent_map:
                if current in visited:
                    return True
                visited.add(current)
                current = parent_map[current]

        return False

    def calculate_inertia_for_geometry(self, geometry, mass: float) -> InertiaMatrix:
        """Calculate inertia matrix for primitive geometry."""
        if isinstance(geometry, BoxGeometry):
            x, y, z = geometry.size
            ixx = (mass / 12.0) * (y*y + z*z)
            iyy = (mass / 12.0) * (x*x + z*z)
            izz = (mass / 12.0) * (x*x + y*y)
            return InertiaMatrix(ixx=ixx, iyy=iyy, izz=izz)

        elif isinstance(geometry, CylinderGeometry):
            r = geometry.radius
            h = geometry.length
            ixx = (mass / 12.0) * (3*r*r + h*h)
            iyy = ixx
            izz = (mass / 2.0) * r * r
            return InertiaMatrix(ixx=ixx, iyy=iyy, izz=izz)

        elif isinstance(geometry, SphereGeometry):
            r = geometry.radius
            i = (2.0 / 5.0) * mass * r * r
            return InertiaMatrix(ixx=i, iyy=i, izz=i)

        # Default for mesh or unknown
        return InertiaMatrix()
