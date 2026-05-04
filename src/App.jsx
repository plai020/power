import { HashRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import CalendarPage from './pages/Calendar';
import Statistics from './pages/Statistics';
import Export from './pages/Export';
import './App.css';

function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/export" element={<Export />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </HashRouter>
  );
}

export default App;
