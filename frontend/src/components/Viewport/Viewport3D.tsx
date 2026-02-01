/**
 * Main 3D viewport component using React Three Fiber.
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Suspense, Component, type ReactNode } from 'react';
import { URDFRenderer } from './URDFRenderer';
import { ConnectionPreviewLine } from './ConnectionPreviewLine';
import { useUIStore } from '../../stores/uiStore';

// Error Boundary for catching 3D rendering errors
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-red-400 font-semibold mb-2">3D Rendering Fehler</h2>
            <p className="text-gray-300 text-sm mb-4">
              {this.state.error?.message || 'Ein unbekannter Fehler ist aufgetreten.'}
            </p>
            <button
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Viewport3D() {
  const viewportSettings = useUIStore((state) => state.viewportSettings);

  return (
    <CanvasErrorBoundary>
      <div className="w-full h-full bg-gray-900">
        <Canvas
          camera={{
            position: [3, 3, 3],
            fov: 50,
            near: 0.01,
            far: 1000,
          }}
          shadows
          gl={{ antialias: true, alpha: false }}
          onPointerMissed={() => {
            // Clear selection when clicking on empty space
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#1a1a2e');
          }}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1}
              castShadow
              shadow-mapSize={[2048, 2048]}
            />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />
            <hemisphereLight intensity={0.3} />

            {/* Ground Grid */}
            {viewportSettings.showGrid && (
              <Grid
                args={[20, 20]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#4a4a4a"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#666666"
                fadeDistance={30}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid
              />
            )}

            {/* Axes Helper */}
            {viewportSettings.showAxes && (
              <axesHelper args={[2]} />
            )}

            {/* URDF Robot Visualization */}
            <URDFRenderer />

            {/* Connection Preview Line */}
            <ConnectionPreviewLine />

            {/* Camera Controls */}
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.05}
              minDistance={0.5}
              maxDistance={50}
              maxPolarAngle={Math.PI * 0.9}
            />

            {/* Navigation Gizmo */}
            <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
              <GizmoViewport
                axisColors={['#ff3653', '#0adb50', '#2c8fdf']}
                labelColor="white"
              />
            </GizmoHelper>
          </Suspense>
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
}
