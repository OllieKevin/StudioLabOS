import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import Agreement from "@icon-park/react/es/icons/Agreement";
import ApplicationMenu from "@icon-park/react/es/icons/ApplicationMenu";
import Calendar from "@icon-park/react/es/icons/Calendar";
import Config from "@icon-park/react/es/icons/Config";
import Dashboard from "@icon-park/react/es/icons/Dashboard";
import DatabaseSetting from "@icon-park/react/es/icons/DatabaseSetting";
import FactoryBuilding from "@icon-park/react/es/icons/FactoryBuilding";
import FileTextOne from "@icon-park/react/es/icons/FileTextOne";
import FindOne from "@icon-park/react/es/icons/FindOne";
import FolderOpen from "@icon-park/react/es/icons/FolderOpen";
import UserBusiness from "@icon-park/react/es/icons/UserBusiness";
import Wallet from "@icon-park/react/es/icons/Wallet";
import ActivitySource from "@icon-park/react/es/icons/ActivitySource";
import type { ComponentType } from "react";
import DashboardPage from "./pages/DashboardPage";
import ProjectCenterPage from "./pages/ProjectCenterPage";
import QuoteCenterPage from "./pages/QuoteCenterPage";
import SettingsPage from "./pages/SettingsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import TimelinePage from "./pages/TimelinePage";
import ClientsPage from "./pages/ClientsPage";
import SuppliersPage from "./pages/SuppliersPage";
import LedgerPage from "./pages/LedgerPage";
import DigitalAssetsPage from "./pages/DigitalAssetsPage";
import ContractsPage from "./pages/ContractsPage";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ theme?: "outline" | "filled" | "two-tone" | "multi-color"; size?: number; fill?: string | string[]; strokeWidth?: number }>;
};

const groups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "MENU",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Dashboard },
      { to: "/project-center", label: "项目中心", icon: FolderOpen }
    ]
  },
  {
    title: "交付文档",
    items: [
      { to: "/quote-center", label: "报价中心", icon: FileTextOne },
      { to: "/timeline", label: "时间节点", icon: Calendar }
    ]
  },
  {
    title: "财务模块",
    items: [
      { to: "/ledger", label: "财务总账", icon: Wallet },
      { to: "/subscriptions", label: "软件订阅", icon: ApplicationMenu },
      { to: "/digital-assets", label: "数字资产", icon: DatabaseSetting }
    ]
  },
  {
    title: "业务模块",
    items: [
      { to: "/clients", label: "客户管理", icon: UserBusiness },
      { to: "/contracts", label: "商务合约", icon: Agreement },
      { to: "/suppliers", label: "供应商管理", icon: FactoryBuilding }
    ]
  },
  {
    title: "GENERAL",
    items: [{ to: "/settings", label: "设置", icon: Config }]
  }
];

export default function App() {
  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-block">
          <div className="brand-dot" />
          <div>
            <h1>MixarLabOS</h1>
            <p className="muted">Workspace</p>
          </div>
        </div>

        <nav className="workspace-nav">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="nav-title">{group.title}</p>
              {group.items.map((item) => (
                <NavLink key={item.to} to={item.to} className="nav-item">
                  <item.icon theme="outline" size={18} fill="currentColor" strokeWidth={2} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="search-pill">
            <FindOne theme="outline" size={18} fill="currentColor" />
            <span>Search task</span>
          </div>
          <nav className="mobile-nav">
            <NavLink to="/dashboard">仪表盘</NavLink>
            <NavLink to="/project-center">项目</NavLink>
            <NavLink to="/subscriptions">订阅</NavLink>
            <NavLink to="/quote-center">报价</NavLink>
            <NavLink to="/settings">设置</NavLink>
          </nav>
          <div className="profile-pill">
            <ActivitySource theme="outline" size={20} fill="currentColor" strokeWidth={2} />
            <span className="avatar">K</span>
            <div>
              <div className="profile-name">Kevin</div>
              <div className="muted small">mixarlab.inhouse</div>
            </div>
          </div>
        </header>

        <div className="workspace-content">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/project-center" element={<ProjectCenterPage />} />
            <Route path="/quote-center" element={<QuoteCenterPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/subscriptions" element={<SubscriptionPage />} />
            <Route path="/digital-assets" element={<DigitalAssetsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
