import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Building2,
  Truck,
  Package,
  FileText,
  Map,
  History,
  Users,
  Settings,
  MapPin,
  ShoppingCart,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const dashboard = [{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard }];

const compras = [
  { title: "Obras", url: "/obras", icon: Building2 },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck },
  { title: "Produtos", url: "/produtos", icon: Package },
  { title: "Solicitações de Compra", url: "/solicitacoes", icon: FileText },
  { title: "Mapas de Cotação", url: "/mapas", icon: Map },
  { title: "Histórico", url: "/historico", icon: History },
];

const configuracoes = [
  { title: "Usuários", url: "/usuarios", icon: Users },
  { title: "Empresa", url: "/empresa", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const isActive = (path: string) => currentPath === path;

  const renderGroup = (label: string, items: typeof dashboard) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <MapPin className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Mapa de Cotações</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Dashboard", dashboard)}
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="flex items-center gap-2">
              <ShoppingCart className="h-3 w-3" /> Compras
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {compras.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {renderGroup("Configurações", configuracoes)}
      </SidebarContent>
    </Sidebar>
  );
}
