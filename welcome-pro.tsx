// Branding config loaded from photographer profile
export type BrandConfig = {
  color: string;         // hex e.g. #3b6d11
  fontFamily: string;    // CSS font-family string
  logoUrl: string | null;
  businessName: string;
};

// Default Shoot Brief brand (used when photographer is free tier or hasn't set branding)
export const DEFAULT_BRAND: BrandConfig = {
  color: "#4f8a1f",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  logoUrl: null,
  businessName: "Shoot Brief",
};

export function buildBrand(profile: {
  brand_color?: string | null;
  logo_url?: string | null;
  display_name?: string | null;
  business_name?: string | null;
  is_pro?: boolean;
  font_family?: string | null;
} | null, resolvedLogoUrl?: string | null): BrandConfig {
  // Only apply custom branding for Pro users
  if (!profile?.is_pro) return DEFAULT_BRAND;

  return {
    color: profile.brand_color || DEFAULT_BRAND.color,
    fontFamily: profile.font_family || DEFAULT_BRAND.fontFamily,
    logoUrl: resolvedLogoUrl ?? null,
    businessName: profile.business_name || profile.display_name || "Your Photographer",
  };
}

// Injects brand CSS variables into the page
export function BrandStyle({ brand }: { brand: BrandConfig }) {
  return (
    <style>{`
      :root {
        --brand-color: ${brand.color};
        --brand-color-light: ${brand.color}22;
        --brand-color-ring: ${brand.color}44;
        --brand-font: ${brand.fontFamily};
      }
      body {
        font-family: var(--brand-font) !important;
      }
      .brand-btn {
        background-color: var(--brand-color) !important;
        color: #fff !important;
      }
      .brand-btn:hover { opacity: 0.9; }
      .brand-accent { color: var(--brand-color) !important; }
      .brand-border { border-color: var(--brand-color) !important; }
      .brand-ring:focus { 
        outline: none !important;
        box-shadow: 0 0 0 3px var(--brand-color-ring) !important;
        border-color: var(--brand-color) !important;
      }
      .brand-progress { background-color: var(--brand-color) !important; }
      .brand-bg-light { background-color: var(--brand-color-light) !important; }
      .brand-check { accent-color: var(--brand-color); }
    `}</style>
  );
}

// Logo or fallback aperture icon
export function BrandLogo({ brand, className = "h-7 w-auto max-w-[140px]" }: { brand: BrandConfig; className?: string }) {
  if (brand.logoUrl) {
    return <img src={brand.logoUrl} alt={brand.businessName} className={className} style={{ objectFit: "contain" }} />;
  }
  // Fallback: show business name in brand color
  return (
    <span className="font-bold text-base" style={{ color: brand.color }}>{brand.businessName}</span>
  );
}
