import { MarketingNavBar } from "@/components/marketing/nav-bar";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MarketingNavBar />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
