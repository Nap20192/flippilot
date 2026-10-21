import { Calculator, Globe, LayoutDashboard, LogIn, LogOut, Moon, Search, SlidersHorizontal, Star, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '@/components/logo';
import { SimpleSelect } from '@/components/simple-select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

const NAV = [
  { to: '/app', label: 'Dashboard', short: 'Home', icon: LayoutDashboard },
  { to: '/app/analyze', label: 'Analyze vehicle', short: 'Analyze', icon: Calculator },
  { to: '/app/deals', label: 'Deal finder', short: 'Deals', icon: Search },
  { to: '/app/watchlist', label: 'Watchlist', short: 'Saved', icon: Star },
  { to: '/app/market', label: 'Market intelligence', short: 'Market', icon: Globe },
  { to: '/app/settings', label: 'Settings', short: 'Settings', icon: SlidersHorizontal },
] as const;

const CURRENCIES = [{ value: 'EUR', label: 'EUR €' }, { value: 'CZK', label: 'CZK Kč' }, { value: 'PLN', label: 'PLN zł' }] as const;

function AppSidebar() {
  const { pathname } = useLocation();
  const { user, logout, watch } = useStore();
  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4">
        <Link to="/" aria-label="FlipPilot home" className="group flex items-center gap-2.5 px-1 text-lg font-bold tracking-tight">
          <Logo size={30} className="transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110" />
          FlipPilot
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((n) => (
                <SidebarMenuItem key={n.to}>
                  <SidebarMenuButton render={<Link to={n.to} />} isActive={pathname === n.to} className="transition-none">
                    <n.icon />
                    <span>{n.label}</span>
                  </SidebarMenuButton>
                  {n.to === '/app/watchlist' && watch.length > 0 && <SidebarMenuBadge>{watch.length}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
          {user ? (
            <>
              <span className="break-all text-muted-foreground">{user.email}</span>
              <Button variant="outline" onClick={() => void logout()}><LogOut data-icon="inline-start" />Sign out</Button>
            </>
          ) : (
            <>
              <b className="font-semibold">Browsing as guest</b>
              <span className="text-xs leading-relaxed text-muted-foreground">Your data stays in this browser. Sign in to sync it and use your own settings.</span>
              <Button variant="outline" nativeButton={false} render={<Link to="/login" />}><LogIn data-icon="inline-start" />Sign in</Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <Button variant="ghost" size="icon" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(dark ? 'light' : 'dark')} className="relative overflow-hidden">
      <Sun className={cn('absolute transition-all duration-500', dark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Moon className={cn('absolute transition-all duration-500', dark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </Button>
  );
}

function MobileNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map((n) => {
        const on = pathname === n.to;
        return (
          <Link key={n.to} to={n.to} aria-current={on ? 'page' : undefined}
            className={cn('relative flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-colors duration-200 active:scale-95', on ? 'text-foreground' : 'text-muted-foreground')}>
            <span className={cn('absolute top-0 h-0.5 rounded-full bg-brand transition-all duration-300', on ? 'w-8 opacity-100' : 'w-0 opacity-0')} />
            <n.icon className={cn('size-5 transition-transform duration-300', on && '-translate-y-0.5 scale-110 text-brand')} />
            {n.short}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { settings, updateSettings, user } = useStore();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-1 h-4" />
          <Link to="/" className="mr-1 flex items-center gap-2 font-bold tracking-tight md:hidden" aria-label="FlipPilot home"><Logo size={22} /></Link>
          <span className="hidden truncate text-sm font-medium sm:inline">{title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">Fixed demo FX rates</Badge>
            <SimpleSelect value={settings.cur} options={CURRENCIES} label="Display currency" className="h-8 w-[92px]" onValueChange={(cur) => void updateSettings({ ...settings, cur })} />
            <ThemeToggle />
            {!user && <Button size="sm" variant="ghost" className="md:hidden" nativeButton={false} render={<Link to="/login" />}>Sign in</Button>}
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:px-8 md:pb-10">{children}</div>
        <MobileNav />
      </SidebarInset>
    </SidebarProvider>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-in fade-in-0 slide-in-from-bottom-3 duration-500 motion-reduce:animate-none">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
