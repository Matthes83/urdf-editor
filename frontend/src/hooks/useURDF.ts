/**
 * Hook for URDF import/export operations.
 */

import { useState, useCallback } from 'react';
import { api } from '../services/api';
import { useEditorStore } from '../stores/editorStore';
import type { ValidationResult } from '../types/urdf';

export function useURDF() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRobot = useEditorStore((state) => state.setRobot);
  const robot = useEditorStore((state) => state.robot);

  const importFromFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const importedRobot = await api.importURDF(file);
      setRobot(importedRobot);
      return importedRobot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setRobot]);

  const importFromText = useCallback(async (urdfText: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse locally since we have the text
      const response = await fetch('http://localhost:8000/api/urdf/import/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urdfText),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Import failed');
      }

      const importedRobot = await response.json();
      setRobot(importedRobot);
      return importedRobot;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setRobot]);

  const exportToFile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const urdfXml = await api.exportURDF(robot);

      // Create and download file
      const blob = new Blob([urdfXml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${robot.name}.urdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return urdfXml;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [robot]);

  const exportToText = useCallback(async (): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const urdfXml = await api.exportURDF(robot);
      return urdfXml;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [robot]);

  const validate = useCallback(async (): Promise<ValidationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      return await api.validateURDF(robot);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Validation failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [robot]);

  return {
    isLoading,
    error,
    importFromFile,
    importFromText,
    exportToFile,
    exportToText,
    validate,
    clearError: () => setError(null),
  };
}
