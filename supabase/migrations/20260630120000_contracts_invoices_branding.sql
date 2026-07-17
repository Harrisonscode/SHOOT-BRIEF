-- ─── Branding fields on profiles ─────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS brand_color    TEXT,           -- hex e.g. #3b6d11
  ADD COLUMN IF NOT EXISTS logo_url       TEXT,           -- storage path or URL
  ADD COLUMN IF NOT EXISTS font_family    TEXT,           -- CSS font name e.g. 'Playfair Display'
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS business_city  TEXT,
  ADD COLUMN IF NOT EXISTS vat_number     TEXT,
  ADD COLUMN IF NOT EXISTS invoice_notes  TEXT,           -- default footer on every invoice
  ADD COLUMN IF NOT EXISTS contract_template TEXT;        -- default contract body

-- ─── Contracts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id        UUID NOT NULL REFERENCES public.shoots(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Photography Contract',
  body            TEXT NOT NULL,                          -- contract text (markdown)
  status          TEXT NOT NULL DEFAULT 'draft',          -- draft | sent | signed
  signed_at       TIMESTAMPTZ,
  signed_name     TEXT,                                   -- name typed by client when signing
  signed_ip       TEXT,
  client_token    UUID NOT NULL DEFAULT gen_random_uuid(), -- for public signing URL
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own contracts"
  ON public.contracts FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "public can read contracts by token"
  ON public.contracts FOR SELECT TO anon, authenticated
  USING (true);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id        UUID NOT NULL REFERENCES public.shoots(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invoice_number  TEXT NOT NULL,                          -- e.g. INV-001
  status          TEXT NOT NULL DEFAULT 'draft',          -- draft | sent | paid | overdue
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE,
  line_items      JSONB NOT NULL DEFAULT '[]',            -- [{description, quantity, unit_price, total}]
  subtotal        NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate        NUMERIC(5,2) NOT NULL DEFAULT 0,        -- percentage
  tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total           NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GBP',
  notes           TEXT,
  client_token    UUID NOT NULL DEFAULT gen_random_uuid(),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "public can read invoices by token"
  ON public.invoices FOR SELECT TO anon, authenticated
  USING (true);
