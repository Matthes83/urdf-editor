/**
 * API client for communicating with the FastAPI backend.
 */

import type { URDFRobot, Link, Joint, ValidationResult } from '../types/urdf';

const API_BASE = 'http://localhost:8000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || error.errors?.join(', ') || 'Request failed');
    }

    return response.json();
  }

  // URDF operations
  async importURDF(file: File): Promise<URDFRobot> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/urdf/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(error.detail || 'Import failed');
    }

    return response.json();
  }

  async exportURDF(robot: URDFRobot): Promise<string> {
    const response = await this.request<{ urdf: string; warnings: string[] }>(
      '/urdf/export/text',
      {
        method: 'POST',
        body: JSON.stringify(robot),
      }
    );
    return response.urdf;
  }

  async validateURDF(robot: URDFRobot): Promise<ValidationResult> {
    return this.request<ValidationResult>('/urdf/validate', {
      method: 'POST',
      body: JSON.stringify(robot),
    });
  }

  // Link operations
  async createLink(params: {
    name: string;
    geometry_type: string;
    size?: [number, number, number];
    radius?: number;
    length?: number;
    color?: [number, number, number, number];
    mass?: number;
    position?: [number, number, number];
  }): Promise<Link> {
    return this.request<Link>('/links/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Joint operations
  async createJoint(params: {
    name: string;
    type: string;
    parent_link: string;
    child_link: string;
    axis?: [number, number, number];
    lower?: number;
    upper?: number;
    effort?: number;
    velocity?: number;
  }): Promise<Joint> {
    return this.request<Joint>('/joints/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
    return response.json();
  }
}

export const api = new ApiClient();
