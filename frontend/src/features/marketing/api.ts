import { apiClient } from "@/api/client";
import type { ApiResponse } from "@/api/types";

export interface ContactLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  restaurantName?: string;
  message: string;
  /** Honeypot — leave empty */
  companyWebsite?: string;
}

export async function submitContactLead(payload: ContactLeadPayload) {
  await apiClient.post<ApiResponse<null>>("/contact", payload);
}
