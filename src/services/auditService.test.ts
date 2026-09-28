import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAuditLogs } from './auditService';

describe('auditService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('fetchAuditLogs includes auth header and search params', async () => {
    localStorage.setItem('clinica-salas-jwt', 'mock-token-123');

    const mockResponseData = {
      content: [
        {
          id: 1,
          createdAt: '2026-09-28T10:00:00Z',
          userId: 10,
          userName: 'Admin User',
          userEmail: 'admin@clinica.com',
          userRole: 'ADMINISTRADOR',
          action: 'LOGIN',
          targetType: 'USER',
          targetId: '10',
          targetName: 'Admin User',
          details: 'Sucesso',
          ipAddress: '127.0.0.1',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponseData,
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchAuditLogs({ page: 0, size: 10, search: 'Admin' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/audit-logs?page=0&size=10&search=Admin');
    expect(options.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token-123',
    });
    expect(result).toEqual(mockResponseData);
  });

  it('throws error when response is not ok', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(fetchAuditLogs()).rejects.toThrow('Erro ao buscar histórico de auditoria.');
  });
});
