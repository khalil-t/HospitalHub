import { auditService } from './auditService.js';

const API_URL = import.meta.env.VITE_API_URL;

export const serviceApi = {
  findByCode: async (code) => {
    const response = await fetch(`${API_URL}/services/code/${code}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch service by code');
    }

    const result = await response.json();

    await auditService.logAction(
      'VIEW',
      'service_lookup',
      null,
      `Looked up service by code: ${code}`,
    );

    return result;
  },

  getAllServices: async () => {
    const response = await fetch(`${API_URL}/services`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch services');
    }

    const result = await response.json();

    await auditService.logAction(
      'VIEW',
      'services_list',
      null,
      `Viewed all services - ${result.length} results`,
    );

    return result;
  },
};
