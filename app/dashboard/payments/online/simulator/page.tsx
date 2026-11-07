import { notFound } from "next/navigation";
import { isDummyGatewayMode } from "@/lib/gateway";
import GatewayProviderSimulator from "@/components/GatewayProviderSimulator";

/** Dummy-mode only: stands in for the provider's hosted payment page so the return flow can be exercised end to end. */
export default async function GatewaySimulatorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (!isDummyGatewayMode()) notFound();
  const params = await searchParams;
  const raw = params.payment_id;
  const paymentId = (Array.isArray(raw) ? raw[0] : raw) || "";
  if (!paymentId) notFound();
  return <GatewayProviderSimulator paymentId={paymentId} />;
}
