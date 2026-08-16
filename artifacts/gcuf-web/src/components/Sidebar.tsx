import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Trophy,
  Building2,
  UserCog,
  LogOut,
  Sun,
  Moon,
  X,
} from "lucide-react";
import collegeLogo from "/college-logo.png";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { useTheme } from "@/context/ThemeContext";

const adminNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/students", label: "Student Lookup", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/toppers", label: "Toppers", icon: Trophy },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/users", label: "Users", icon: UserCog },
];

const professorNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/students", label: "Student Lookup", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/toppers", label: "Toppers", icon: Trophy },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = isAdmin ? adminNav : professorNav;

  const navContent = (
    <>
      {/* Header */}
      <div className="px-5 py-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={collegeLogo} alt="College Logo" className="w-8 h-8 object-contain shrink-0" />
          <div>
            <span className="font-bold text-xs tracking-tight text-foreground leading-tight block">GGC Jhang</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Result Portal</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px]",
                active
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors min-h-[44px]"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        {user && (
          <div className="px-3">
            <p className="text-xs font-medium text-foreground truncate">
              {user.fullName || user.username}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs min-h-[44px]"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible at md+ */}
      <aside className="hidden md:flex w-60 flex-col bg-sidebar border-r border-sidebar-border shrink-0">
        {navContent}
      </aside>

      {/* Mobile overlay drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-opacity duration-200",
          isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-200",
            isOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={onClose}
          aria-hidden="true"
        />
        {/* Drawer panel */}
        <aside
          className={cn(
            "absolute inset-y-0 left-0 w-72 flex flex-col bg-sidebar border-r border-sidebar-border shadow-xl transition-transform duration-200",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
          aria-hidden={!isOpen}
        >
          {navContent}
        </aside>
      </div>
    </>
  );
}
