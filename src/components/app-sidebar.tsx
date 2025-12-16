import { LayoutDashboard, Radio, Settings, Signal } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary-foreground",
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
  );
export function AppSidebar(): JSX.Element {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="inline-flex items-center gap-2.5 p-2">
          <Signal className="h-6 w-6 text-blue-500" />
          <span className="text-lg font-semibold text-foreground">ValleyScope</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink to="/" className={navLinkClasses}>
              <LayoutDashboard className="h-4 w-4" />
              Command Dashboard
            </NavLink>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <NavLink to="/feeds" className={navLinkClasses}>
              <Radio className="h-4 w-4" />
              Feed Explorer
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}