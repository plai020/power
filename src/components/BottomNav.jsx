import { NavLink } from 'react-router-dom';
import { Home, Calendar as CalendarIcon, BarChart3, Settings } from 'lucide-react';
import './BottomNav.css';

export default function BottomNav() {
  const navItems = [
    { path: '/', label: '首頁', icon: Home },
    { path: '/calendar', label: '月曆', icon: CalendarIcon },
    { path: '/statistics', label: '統計', icon: BarChart3 },
    { path: '/export', label: '設定匯出', icon: Settings }
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={24} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
