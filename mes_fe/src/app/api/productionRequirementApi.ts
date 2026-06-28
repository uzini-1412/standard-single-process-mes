/** Production requirement API client — BE /api/production/requirement (ProductionController). [Production Mgmt > Production Requirement Calculation]. */
import { postJson } from './request';
import { ProductionRequirement } from '@/types/production/requirement.interface';

// Fetch production requirement calculation list (real-time backend calc based on orders/stock/shipment results)
export function fetchMaterialRequirements(
  params: { dateFrom?: string; dateTo?: string } = {}
): Promise<ProductionRequirement[]> {
  return postJson<ProductionRequirement[]>('/production/requirement/list', params);
}

// Fetch expected shipment quantity map (item code -> expected qty)
// = average shipment over the prior 3 months (from last month) - current month shipment
export async function fetchExpectedShipmentQuantityMap(): Promise<Record<string, number>> {
  return (await postJson<Record<string, number> | null>('/production/requirement/expected-shipment-map', {})) ?? {};
}
