import { useNavigate } from "react-router-dom";
import {
  GraduationCap, ShoppingCart, UtensilsCrossed, Bed,
  Scissors, Pill, Wrench, Building2, LogIn,
  Users, BookOpen, Briefcase, RefreshCw, Download,
  Award, FileSearch, Moon, Star, ChevronRight, Monitor
} from "lucide-react";
import { usePWAUpdate } from "@/hooks/use-pwa-update";
import { toast } from "@/hooks/use-toast";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import { SponsorMarquee } from "@/components/SponsorMarquee";

/* ─── Win2K Design Tokens ─────────────────────────────────────────────────── */
const W = {
  silver: "#c0c0c0",
  darkEdge: "#808080",
  lightEdge: "#ffffff",
  shadow: "#404040",
  face: "#d4d0c8",
  titleBar: "linear-gradient(to right, #000080, #1084d0)",
  titleBarActive: "linear-gradient(to right, #000080, #1084d0)",
  navy: "#000080",
  teal: "#008080",
  white: "#ffffff",
  black: "#000000",
  btnFace: "#d4d0c8",
  text: "#000000",
  inset: "inset 1px 1px 0 #808080, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #404040, inset -2px -2px 0 #dfdfdf",
  raised: "inset -1px -1px 0 #808080, inset 1px 1px 0 #ffffff, inset -2px -2px 0 #404040, inset 2px 2px 0 #dfdfdf",
};

/* ─── Reusable Win2K Components ───────────────────────────────────────────── */

function Win2kButton({
  children,
  onClick,
  primary = false,
  small = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: W.btnFace,
        border: "2px solid",
        borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
        outline: primary ? `2px solid ${W.black}` : "none",
        outlineOffset: "-3px",
        fontFamily: "Tahoma, Arial, sans-serif",
        fontSize: small ? "11px" : "12px",
        padding: small ? "2px 8px" : "4px 16px",
        cursor: "pointer",
        color: W.black,
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        whiteSpace: "nowrap" as const,
        userSelect: "none" as const,
        minWidth: primary ? "75px" : undefined,
      }}
      onMouseDown={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`;
        el.style.paddingLeft = small ? "10px" : "18px";
        el.style.paddingTop = small ? "3px" : "5px";
      }}
      onMouseUp={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`;
        el.style.paddingLeft = small ? "8px" : "16px";
        el.style.paddingTop = small ? "2px" : "4px";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`;
        el.style.paddingLeft = small ? "8px" : "16px";
        el.style.paddingTop = small ? "2px" : "4px";
      }}
    >
      {children}
    </button>
  );
}

function TitleBar({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div
      style={{
        background: W.titleBar,
        padding: "3px 6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {icon && <span style={{ color: W.white, display: "flex" }}>{icon}</span>}
        <span
          style={{
            color: W.white,
            fontFamily: "Tahoma, Arial, sans-serif",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: "flex", gap: "2px" }}>
        {["_", "□", "✕"].map((c) => (
          <button
            key={c}
            style={{
              background: W.btnFace,
              border: `1px solid ${W.darkEdge}`,
              width: "16px",
              height: "14px",
              fontSize: "9px",
              fontFamily: "Tahoma",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              color: W.black,
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

function Win2kPanel({
  title,
  icon,
  children,
  style,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        border: "2px solid",
        borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
        background: W.face,
        ...style,
      }}
    >
      <TitleBar title={title} icon={icon} />
      <div style={{ padding: "8px" }}>{children}</div>
    </div>
  );
}

function StatusBar({ text }: { text: string }) {
  return (
    <div
      style={{
        background: W.face,
        borderTop: `1px solid ${W.darkEdge}`,
        padding: "2px 4px",
        fontFamily: "Tahoma, Arial, sans-serif",
        fontSize: "11px",
        color: W.black,
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span
        style={{
          flex: 1,
          border: `1px solid`,
          borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
          padding: "1px 4px",
        }}
      >
        {text}
      </span>
      <span
        style={{
          border: `1px solid`,
          borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
          padding: "1px 8px",
        }}
      >
        Ready
      </span>
    </div>
  );
}

/* ─── Category Icon colours (classic palette) ────────────────────────────── */
const iconColors: Record<string, string> = {
  education: "#000080",
  retail: "#008000",
  restaurant: "#c04000",
  hotel: "#800080",
  salon: "#c00060",
  healthcare: "#008080",
  repair: "#806000",
  other: "#404040",
};

interface CategoryCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  businessTypes: string[];
}

const categories: CategoryCard[] = [
  { id: "education", title: "Schools & Education", description: "Kindergartens, Primary & Secondary", icon: <GraduationCap size={20} />, route: "/signup", businessTypes: ["kindergarten", "primary_school", "secondary_school"] },
  { id: "retail", title: "Retail & Shops", description: "Supermarkets, Boutiques & Hardware", icon: <ShoppingCart size={20} />, route: "/signup", businessTypes: ["retail_shop", "supermarket"] },
  { id: "restaurant", title: "Restaurants & Bars", description: "Restaurants, Cafes & Food Service", icon: <UtensilsCrossed size={20} />, route: "/signup", businessTypes: ["restaurant", "bar", "cafe"] },
  { id: "hotel", title: "Hotels & Lodges", description: "Hotels, Lodges & Guest Houses", icon: <Bed size={20} />, route: "/signup", businessTypes: ["hotel", "lodge"] },
  { id: "salon", title: "Salons & Spas", description: "Beauty Salons, Spas & Barber Shops", icon: <Scissors size={20} />, route: "/signup", businessTypes: ["salon", "spa"] },
  { id: "healthcare", title: "Healthcare", description: "Pharmacies, Clinics & Hospitals", icon: <Pill size={20} />, route: "/signup", businessTypes: ["pharmacy", "clinic"] },
  { id: "repair", title: "Repair Services", description: "Garages, Phone Repair & Workshops", icon: <Wrench size={20} />, route: "/signup", businessTypes: ["garage", "tech_repair"] },
  { id: "other", title: "Other Business", description: "Any other business type", icon: <Building2 size={20} />, route: "/signup", businessTypes: ["other"] },
];

const publicServices = [
  { id: "exam-results", title: "Check Exam Results", description: "Look up UNEB national examination results by index number", icon: <Award size={16} />, route: "/exam-results" },
  { id: "job-status", title: "Job Status Tracker", description: "Track your repair job or service request", icon: <FileSearch size={16} />, route: "/job-status" },
];

const secondaryUsers = [
  { id: "parent", title: "Parent Portal", description: "Track child's progress, fees & attendance", icon: <Users size={16} />, route: "/parent" },
  { id: "renter", title: "KaRental Ko", description: "View lease, payments & maintenance", icon: <Building2 size={16} />, route: "/renter" },
  { id: "teacher", title: "Teacher Access", description: "Manage classes, grades & students", icon: <BookOpen size={16} />, route: "/login" },
  { id: "staff", title: "Staff Login", description: "Access your workplace dashboard", icon: <Briefcase size={16} />, route: "/login" },
];

/* ─── Page ─────────────────────────────────────────────────────────────────── */
export default function PWAHome() {
  const navigate = useNavigate();
  const { needRefresh, updateServiceWorker, checkForUpdates, isChecking } = usePWAUpdate();

  const handleCheckUpdates = async () => {
    await checkForUpdates();
    if (!needRefresh) {
      toast({ title: "You're up to date!", description: "No new updates available." });
    }
  };

  const handleUpdate = async () => {
    await updateServiceWorker();
    toast({ title: "Updating...", description: "The app will reload with the latest version." });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#3a6ea5",  /* classic Win2K desktop blue */
        fontFamily: "Tahoma, Arial, sans-serif",
        fontSize: "12px",
        color: W.black,
      }}
    >
      {/* ── Taskbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: W.face,
          borderBottom: `2px solid ${W.darkEdge}`,
          padding: "2px 4px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 0 #ffffff",
        }}
      >
        {/* Start button */}
        <button
          style={{
            background: W.btnFace,
            border: "2px solid",
            borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
            fontFamily: "Tahoma, Arial, sans-serif",
            fontSize: "12px",
            fontWeight: "bold",
            padding: "2px 8px 2px 4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <img src={kabejjaLogo} alt="TennaHub" style={{ height: "20px", width: "auto" }} />
          <span>Start</span>
        </button>

        {/* Divider */}
        <div style={{ width: "1px", height: "24px", background: W.darkEdge, borderRight: `1px solid ${W.lightEdge}`, margin: "0 2px" }} />

        {/* Active window pill */}
        <div
          style={{
            background: W.face,
            border: "2px solid",
            borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
            padding: "2px 8px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flex: 1,
            maxWidth: "220px",
          }}
        >
          <Monitor size={14} />
          <span style={{ fontWeight: "bold", fontSize: "11px" }}>TennaHub - Home</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* System tray */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            border: "2px solid",
            borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
            padding: "2px 6px",
          }}
        >
          {needRefresh ? (
            <Win2kButton small onClick={handleUpdate}>
              <Download size={12} />
              Update
            </Win2kButton>
          ) : (
            <Win2kButton small onClick={handleCheckUpdates}>
              <RefreshCw size={12} className={isChecking ? "animate-spin" : ""} />
              {isChecking ? "Checking..." : "Check Updates"}
            </Win2kButton>
          )}
          <Win2kButton small onClick={() => navigate("/login")}>
            <LogIn size={12} />
            Login
          </Win2kButton>
          <span style={{ fontSize: "11px", color: W.black }}>
            {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ── Desktop area ──────────────────────────────────────────────────── */}
      <div style={{ padding: "12px", maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* ── Ramadan / Lent Banner (as a dialog window) ─────────────────── */}
        <Win2kPanel
          title="Important Notice - Seasonal Greetings"
          icon={<Moon size={12} />}
        >
          <div
            style={{
              background: W.white,
              border: "2px solid",
              borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
              padding: "8px 12px",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            {/* Icon */}
            <div style={{ fontSize: "32px", lineHeight: 1 }}>🌙</div>
            <div>
              <p style={{ fontWeight: "bold", marginBottom: "2px" }}>
                Ramadan Kareem — رمضان كريم
              </p>
              <p style={{ color: "#333", marginBottom: "6px", fontSize: "11px" }}>
                Wishing all Muslims a blessed and peaceful holy month. 🤲
              </p>
              <div
                style={{
                  borderTop: `1px solid ${W.darkEdge}`,
                  paddingTop: "6px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "16px" }}>✝️</span>
                <div>
                  <p style={{ fontWeight: "bold", fontSize: "11px" }}>Happy Lenten Season</p>
                  <p style={{ color: "#333", fontSize: "11px" }}>
                    Wishing all Christians a reflective and blessed season of prayer &amp; fasting. 🙏
                  </p>
                </div>
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <Win2kButton small primary>
                OK
              </Win2kButton>
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={8} style={{ position: "absolute", opacity: 0.15, top: `${20 + i * 15}%`, left: `${i * 18}%` }} />
          ))}
        </Win2kPanel>

        {/* ── Hero / Welcome ──────────────────────────────────────────────── */}
        <Win2kPanel title="TennaHub v3.0 - Business Management Suite" icon={<Monitor size={12} />}>
          <div
            style={{
              background: W.white,
              border: "2px solid",
              borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
              padding: "12px 16px",
              display: "flex",
              gap: "16px",
              alignItems: "center",
            }}
          >
            <img src={kabejjaLogo} alt="TennaHub" style={{ height: "60px", width: "auto" }} />
            <div>
              <h1
                style={{
                  fontFamily: "Tahoma, Arial, sans-serif",
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: W.navy,
                  marginBottom: "4px",
                }}
              >
                Welcome to TennaHub
              </h1>
              <p style={{ fontSize: "12px", color: "#333", marginBottom: "8px" }}>
                Powered by Kabejja Systems — Made for Uganda 🇺🇬
              </p>
              <p style={{ fontSize: "11px", color: "#555" }}>
                Select your business category below to register, or log in to manage your existing dashboard.
              </p>
              <p style={{ fontSize: "11px", color: "#008080", marginTop: "4px", fontStyle: "italic" }}>
                ✓ Trusted by 500+ Ugandan businesses
              </p>
            </div>
          </div>
        </Win2kPanel>

        {/* ── Business Categories ────────────────────────────────────────── */}
        <Win2kPanel title="Select Business Category" icon={<Building2 size={12} />}>
          <p style={{ fontSize: "11px", color: "#444", marginBottom: "8px" }}>
            Click on a business type to register and get started with powerful management tools:
          </p>
          {/* Category grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(172px, 1fr))",
              gap: "4px",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(cat.route, { state: { suggestedCategory: cat.id, suggestedBusinessTypes: cat.businessTypes } })}
                style={{
                  background: W.btnFace,
                  border: "2px solid",
                  borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  textAlign: "left",
                  fontFamily: "Tahoma, Arial, sans-serif",
                  fontSize: "11px",
                  color: W.black,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = W.navy; (e.currentTarget.querySelectorAll("span") as any).forEach((s: any) => { s.style.color = W.white; }); e.currentTarget.querySelector(".cat-icon")!.setAttribute("style", `color:${W.white}`); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = W.btnFace; (e.currentTarget.querySelectorAll("span") as any).forEach((s: any) => { s.style.color = W.black; }); e.currentTarget.querySelector(".cat-icon")!.setAttribute("style", `color:${iconColors[cat.id]}`); }}
                onMouseDown={(e) => { e.currentTarget.style.borderColor = `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`; }}
                onMouseUp={(e) => { e.currentTarget.style.borderColor = `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`; }}
              >
                <span
                  className="cat-icon"
                  style={{ color: iconColors[cat.id], display: "flex", flexShrink: 0, marginTop: "2px" }}
                >
                  {cat.icon}
                </span>
                <div>
                  <span style={{ display: "block", fontWeight: "bold", fontSize: "11px" }}>{cat.title}</span>
                  <span style={{ display: "block", fontSize: "10px", color: "#555" }}>{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </Win2kPanel>

        {/* ── Public Services ────────────────────────────────────────────── */}
        <Win2kPanel title="Public Services — No Login Required" icon={<Award size={12} />}>
          <p style={{ fontSize: "11px", color: "#444", marginBottom: "6px" }}>
            The following services are available to the general public:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {publicServices.map((svc) => (
              <div
                key={svc.id}
                style={{
                  background: W.white,
                  border: "2px solid",
                  borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
                  padding: "6px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                }}
                onClick={() => navigate(svc.route)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#000080"; e.currentTarget.style.color = W.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = W.white; e.currentTarget.style.color = W.black; }}
              >
                <span style={{ color: W.teal, display: "flex" }}>{svc.icon}</span>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                    {svc.title}
                    <ChevronRight size={12} style={{ opacity: 0.6 }} />
                  </div>
                  <div style={{ fontSize: "11px", opacity: 0.8 }}>{svc.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Win2kPanel>

        {/* ── Employee & Parent Access ───────────────────────────────────── */}
        <Win2kPanel title="Employee & Parent Access" icon={<Users size={12} />}>
          <p style={{ fontSize: "11px", color: "#444", marginBottom: "6px" }}>
            Access your organisation&apos;s dashboard:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: "4px",
            }}
          >
            {secondaryUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => navigate(u.route)}
                style={{
                  background: W.btnFace,
                  border: "2px solid",
                  borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: "Tahoma, Arial, sans-serif",
                  fontSize: "11px",
                  color: W.black,
                  textAlign: "left",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = W.navy; e.currentTarget.style.color = W.white; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = W.btnFace; e.currentTarget.style.color = W.black; }}
                onMouseDown={(e) => { e.currentTarget.style.borderColor = `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`; }}
                onMouseUp={(e) => { e.currentTarget.style.borderColor = `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`; }}
              >
                <span style={{ display: "flex", color: W.teal }}>{u.icon}</span>
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "11px" }}>{u.title}</div>
                  <div style={{ fontSize: "10px", opacity: 0.7 }}>{u.description}</div>
                </div>
              </button>
            ))}
          </div>
        </Win2kPanel>

        {/* ── Business Owner CTA ─────────────────────────────────────────── */}
        <Win2kPanel title="Business Owner Sign-In" icon={<LogIn size={12} />}>
          <div
            style={{
              background: W.white,
              border: "2px solid",
              borderColor: `${W.darkEdge} ${W.lightEdge} ${W.lightEdge} ${W.darkEdge}`,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "2px" }}>
                Already registered? Sign in to your dashboard.
              </p>
              <p style={{ fontSize: "11px", color: "#555" }}>
                Manage your business, staff, inventory, fees &amp; more.
              </p>
            </div>
            <Win2kButton primary onClick={() => navigate("/login")}>
              <LogIn size={13} />
              Sign In
            </Win2kButton>
          </div>
        </Win2kPanel>

        {/* ── Sponsors ──────────────────────────────────────────────────── */}
        <div
          style={{
            border: "2px solid",
            borderColor: `${W.lightEdge} ${W.darkEdge} ${W.darkEdge} ${W.lightEdge}`,
            background: W.face,
            overflow: "hidden",
          }}
        >
          <TitleBar title="Our Sponsors &amp; Partners" />
          <SponsorMarquee />
        </div>
      </div>

      {/* ── Status Bar ───────────────────────────────────────────────────── */}
      <StatusBar text="TennaHub — Powered by Kabejja Systems | Trusted by 500+ Ugandan businesses" />
    </div>
  );
}
