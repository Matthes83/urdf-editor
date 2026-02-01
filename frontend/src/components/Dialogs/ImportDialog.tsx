/**
 * Dialog for importing URDF files.
 */

import { useState, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '../ui';
import { useURDF } from '../../hooks/useURDF';
import { useUIStore } from '../../stores/uiStore';

export function ImportDialog() {
  const isOpen = useUIStore((state) => state.dialogs.importDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);

  const { importFromFile, importFromText, isLoading, error, clearError } = useURDF();

  const [urdfText, setUrdfText] = useState('');
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      clearError();
    }
  };

  const handleImport = async () => {
    try {
      if (mode === 'file' && selectedFile) {
        await importFromFile(selectedFile);
      } else if (mode === 'text' && urdfText.trim()) {
        await importFromText(urdfText);
      }
      handleClose();
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUrdfText('');
    clearError();
    closeDialog('importDialog');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-lg p-6 w-[500px] max-h-[85vh] overflow-y-auto border border-gray-700 z-50">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Import URDF
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={mode === 'file' ? 'primary' : 'default'}
              onClick={() => setMode('file')}
            >
              <Upload className="w-4 h-4 mr-2" />
              File
            </Button>
            <Button
              variant={mode === 'text' ? 'primary' : 'default'}
              onClick={() => setMode('text')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Text
            </Button>
          </div>

          {/* File upload */}
          {mode === 'file' && (
            <div
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".urdf,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              {selectedFile ? (
                <p className="text-white">{selectedFile.name}</p>
              ) : (
                <>
                  <p className="text-gray-300">Click to select a URDF file</p>
                  <p className="text-sm text-gray-500 mt-1">.urdf or .xml</p>
                </>
              )}
            </div>
          )}

          {/* Text input */}
          {mode === 'text' && (
            <textarea
              value={urdfText}
              onChange={(e) => setUrdfText(e.target.value)}
              placeholder="Paste URDF XML here..."
              className="w-full h-64 bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm font-mono text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={
                isLoading ||
                (mode === 'file' && !selectedFile) ||
                (mode === 'text' && !urdfText.trim())
              }
            >
              {isLoading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
