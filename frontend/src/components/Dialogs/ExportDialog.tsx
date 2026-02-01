/**
 * Dialog for exporting URDF files.
 */

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, X, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
import { useURDF } from '../../hooks/useURDF';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import type { ValidationResult } from '../../types/urdf';

export function ExportDialog() {
  const isOpen = useUIStore((state) => state.dialogs.exportDialog);
  const closeDialog = useUIStore((state) => state.closeDialog);
  const robot = useEditorStore((state) => state.robot);

  const { exportToFile, exportToText, validate, isLoading, error, clearError } = useURDF();

  const [urdfPreview, setUrdfPreview] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Generate preview when dialog opens
  useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen]);

  const generatePreview = async () => {
    try {
      // First validate
      const result = await validate();
      setValidation(result);

      if (result.valid) {
        const xml = await exportToText();
        setUrdfPreview(xml);
      }
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleDownload = async () => {
    try {
      await exportToFile();
      handleClose();
    } catch (err) {
      // Error handled by hook
    }
  };

  const handleCopy = async () => {
    if (urdfPreview) {
      await navigator.clipboard.writeText(urdfPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setUrdfPreview('');
    setValidation(null);
    setCopied(false);
    clearError();
    closeDialog('exportDialog');
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-lg p-6 w-[600px] max-h-[85vh] overflow-y-auto border border-gray-700 z-50">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Export URDF
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Validation result */}
          {validation && !validation.valid && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded">
              <div className="flex items-center gap-2 text-red-300 font-medium mb-2">
                <AlertCircle className="w-5 h-5" />
                Validation Errors
              </div>
              <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {validation?.warnings && validation.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500 rounded">
              <div className="flex items-center gap-2 text-yellow-300 font-medium mb-2">
                <AlertCircle className="w-5 h-5" />
                Warnings
              </div>
              <ul className="list-disc list-inside text-sm text-yellow-300 space-y-1">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Robot info */}
          <div className="mb-4 p-3 bg-gray-800 rounded">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Robot:</span>
                <span className="ml-2 text-white">{robot.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Links:</span>
                <span className="ml-2 text-white">{robot.links.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Joints:</span>
                <span className="ml-2 text-white">{robot.joints.length}</span>
              </div>
            </div>
          </div>

          {/* URDF Preview */}
          {urdfPreview && (
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Preview</span>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs font-mono text-gray-300 overflow-auto max-h-64">
                {urdfPreview}
              </pre>
            </div>
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
              onClick={handleDownload}
              disabled={isLoading || !validation?.valid}
            >
              <Download className="w-4 h-4 mr-2" />
              {isLoading ? 'Exporting...' : 'Download'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
