import { selectedStudentForRequest } from "@/lib/backend";
import { returnReference } from "@/lib/gateway";
import GatewayReturn from "@/components/GatewayReturn";

/**
 * Landing page for the provider's return URL after the parent pays on an
 * external page (card form, Tokopedia, Blibli). It resolves whichever
 * reference the provider sends back and hands over to the status page, which
 * keeps polling until the payment callback marks the checkout paid.
 */
export default async function GatewayReturnPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { child, studentId } = await selectedStudentForRequest();
  const childQuery = studentId ? `?student_id=${encodeURIComponent(studentId)}` : `?child=${child.id}`;
  const listHref = `/dashboard/payments${childQuery}`;
  const reference = returnReference(params);
  return <GatewayReturn reference={reference} listHref={listHref} childQuery={childQuery} />;
}
