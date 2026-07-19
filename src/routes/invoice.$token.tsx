import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2, CreditCard } from "lucide-react";
import { ApertureIcon } from "@/components/Logo";
import { buildBrand, BrandStyle, BrandLogo } from "@/lib/brand";
import { format } from "date-fns";

export const Route = createFileRoute("/invoice/$token")({
  component: InvoicePage,
});

const CUR_SYM: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
const fmt = (amount: number, currency = "GBP") =>
  `${CUR_SYM[currency] ?? currency}${Number(amount).toFixed(2)}`;

function InvoicePage() {
  const { token } = Route.useParams();
  const search = useSearch({ strict: false }) as any;
  const justPaid = search?.paid === "1" || search?.paid === 1;

  const [invoice, setInvoice] = useState<any | null>(null);
  const [photographer, setPhotographer] = useState<any | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("invoices") as any)
        .select("*, shoots(name, client_name, client_email), profiles!invoices_user_id_fkey(display_name, business_name, email, phone, website, brand_color, logo_url, font_family, is_pro, business_address, business_city, vat_number)")
        .eq("client_token", token)
        .maybeSingle() as any;

      if (!data) { setNotFound(true); return; }

      const prof = data.profiles;
      if (prof?.logo_url && !prof.logo_url.startsWith("http")) {
        const { data: signed } = await supabase.storage.from("logos").createSignedUrl(prof.logo_url, 3600);
        if (signed?.signedUrl) data.profiles._resolvedLogoUrl = signed.signedUrl;
      }

      setInvoice(data);
      setPhotographer(data.profiles);
    })();
  }, [token]);

  const brand = buildBrand(photographer, (photographer as any)?._resolvedLogoUrl ?? null);

  if (notFound) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🧾</div>
        <h1 className="text-xl font-bold text-gray-900">Invoice not found</h1>
        <p className="text-gray-500 mt-2 text-sm">This link may be invalid or expired.</p>
      </div>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-[#f8faf7] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  );

  const isPaid = invoice.status === "paid" || justPaid;

  return (
    <div className="min-h-screen bg-[#f8faf7]" style={{ fontFamily: brand.fontFamily }}>
      <BrandStyle brand={brand} />

      {/* Top bar */}
      <div
        className="fixed top-0 inset-x-0 z-50 bg-white border-b border-gray-100 flex items-center gap-3 px-4"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: '12px', height: 'calc(52px + env(safe-area-inset-top, 0px))' }}
      >
        <BrandLogo brand={brand} className="h-6 w-auto max-w-[120px]" />
      </div>

      <div style={{ paddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' }}>
        <div className="max-w-2xl mx-auto px-4 py-10">

          {isPaid ? (
            <div className="text-center py-16">
              <CheckCircle className="h-16 w-16 mx-auto mb-4" style={{ color: brand.color }} />
              <h1 className="text-2xl font-bold text-gray-900">Payment received!</h1>
              <p className="text-gray-500 mt-2">Thank you — {photographer?.business_name || photographer?.display_name} has been notified.</p>
            </div>
          ) : (
            <>
              {/* Invoice header */}
              <div className="rounded-xl border bg-white shadow-sm p-6 sm:p-8 mb-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</div>
                    <div className="text-gray-500 mt-1 text-sm">{invoice.shoots?.name}{invoice.shoots?.client_name ? ` · ${invoice.shoots.client_name}` : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" style={{ color: brand.color }}>{fmt(invoice.total, invoice.currency)}</div>
                    <div className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-full inline-block capitalize ${
                      invoice.status === "paid" ? "bg-green-100 text-green-700" :
                      invoice.status === "overdue" ? "bg-red-100 text-red-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>{invoice.status}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Issue date</div>
                    <div className="text-gray-800 font-medium">{format(new Date(invoice.issue_date), "d MMMM yyyy")}</div>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Due date</div>
                      <div className="text-gray-800 font-medium">{format(new Date(invoice.due_date), "d MMMM yyyy")}</div>
                    </div>
                  )}
                </div>

                {/* From */}
                <div className="mt-5 pt-5 border-t text-sm">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">From</div>
                  <div className="text-gray-900 font-medium">{photographer?.business_name || photographer?.display_name}</div>
                  {photographer?.business_address && <div className="text-gray-500">{photographer.business_address}{photographer.business_city ? `, ${photographer.business_city}` : ""}</div>}
                  {photographer?.email && <div className="text-gray-500">{photographer.email}</div>}
                  {photographer?.vat_number && <div className="text-gray-400 text-xs mt-1">VAT: {photographer.vat_number}</div>}
                </div>
              </div>

              {/* Line items */}
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Description</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Qty</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Price</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500 text-xs uppercase tracking-wide">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.line_items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-5 py-3 text-gray-900">{item.description}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{item.quantity}</td>
                        <td className="px-5 py-3 text-right text-gray-500">{fmt(item.unit_price, invoice.currency)}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(item.total, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-gray-50">
                    <tr>
                      <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">Subtotal</td>
                      <td className="px-5 py-2 text-right text-sm text-gray-900">{fmt(invoice.subtotal, invoice.currency)}</td>
                    </tr>
                    {invoice.tax_rate > 0 && (
                      <tr>
                        <td colSpan={3} className="px-5 py-2 text-right text-sm text-gray-500">Tax ({invoice.tax_rate}%)</td>
                        <td className="px-5 py-2 text-right text-sm text-gray-900">{fmt(invoice.tax_amount, invoice.currency)}</td>
                      </tr>
                    )}
                    <tr className="font-bold text-base">
                      <td colSpan={3} className="px-5 py-3 text-right text-gray-900">Total due</td>
                      <td className="px-5 py-3 text-right" style={{ color: brand.color }}>{fmt(invoice.total, invoice.currency)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="rounded-xl border bg-white shadow-sm p-5 mb-6 text-sm text-gray-600 leading-relaxed">
                  {invoice.notes}
                </div>
              )}

              {/* Payment button */}
              {invoice.payment_link_enabled && invoice.status !== "paid" && (
                <div className="rounded-xl border bg-white shadow-sm p-6 text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">Pay this invoice</h3>
                  <p className="text-sm text-gray-500 mb-4">Secure payment processed by Stripe</p>
                  <a
                    href={`https://buy.stripe.com/invoice-${invoice.client_token}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brand.color }}
                  >
                    <CreditCard className="h-4 w-4" />
                    Pay {fmt(invoice.total, invoice.currency)} now
                  </a>
                </div>
              )}
            </>
          )}

          <div className="text-center text-xs text-gray-300 pb-6 mt-8">
            Powered by <span className="font-medium">Shoot Brief</span>
          </div>
        </div>
      </div>
    </div>
  );
}
