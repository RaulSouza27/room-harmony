import { BACKEND_URL } from "@/config/api";

export interface AuditLogItem {
  id: number;
  createdAt: string;
  userId: number | null;
  userName: string;
  userEmail: string;
  userRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string | null;
  details: string | null;
  ipAddress: string | null;
}

export interface AuditLogResponse {
  content: AuditLogItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

function getHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? window.localStorage.getItem("clinica-salas-jwt") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchAuditLogs(params?: {
  page?: number;
  size?: number;
  search?: string;
  action?: string;
  targetType?: string;
}): Promise<AuditLogResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append("page", params.page.toString());
  if (params?.size !== undefined) query.append("size", params.size.toString());
  if (params?.search) query.append("search", params.search);
  if (params?.action) query.append("action", params.action);
  if (params?.targetType) query.append("targetType", params.targetType);

  const response = await fetch(`${BACKEND_URL}/api/audit-logs?${query.toString()}`, {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error("Erro ao buscar histórico de auditoria.");
  }

  return response.json();
}

export async function createAuditLog(payload: {
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  details?: string;
}): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/api/audit-logs`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Erro ao registrar log de auditoria:", error);
  }
}

