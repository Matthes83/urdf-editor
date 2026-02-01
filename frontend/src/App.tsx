import { useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { useUIStore } from './stores/uiStore';
import { useEditorStore } from './stores/editorStore';

function App() {
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const { setActiveTool } = useUIStore.getState();
      const temporal = useEditorStore.temporal.getState();

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
        case 'escape':
          setActiveTool('select');
          // Cancel connection if in progress
          useUIStore.getState().cancelConnection();
          break;
        case 'g':
          setActiveTool('move');
          break;
        case 'r':
          setActiveTool('rotate');
          break;
        case 's':
          if (!e.metaKey && !e.ctrlKey) {
            setActiveTool('scale');
          }
          break;
        case 'l':
          setActiveTool('add-link');
          break;
        case 'p':
          setActiveTool('add-connection-point');
          break;
        case 'delete':
        case 'backspace':
          // Delete selected element
          const { selectedLinkId, selectedJointId, deleteLink, deleteJoint } =
            useEditorStore.getState();
          if (selectedJointId) {
            deleteJoint(selectedJointId);
          } else if (selectedLinkId) {
            deleteLink(selectedLinkId);
          }
          break;
      }

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          temporal.redo();
        } else {
          temporal.undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        temporal.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return <MainLayout />;
}

export default App;
