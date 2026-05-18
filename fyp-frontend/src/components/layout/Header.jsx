  import React from 'react';
  import { Menu } from 'lucide-react'; // Hamburger Icon

  const Header = ({ title, onMenuClick }) => {
    return (
      <header className="flex justify-between items-center mb-8 sticky top-0 z-30 bg-gray-50/90 backdrop-blur-md py-4 lg:static lg:bg-transparent lg:p-0">
        
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <button 
              onClick={onMenuClick}
              className="lg:hidden p-2 text-slate-600 hover:bg-white rounded-lg transition-colors"
          >
              <Menu size={24} />
          </button>

          <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
              <p className="text-slate-500 text-sm hidden sm:block">Welcome back to the portal</p>
          </div>
        </div>
        
        {/* <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-500 hidden sm:block">Role View:</span>
          <select className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm outline-none transition-all cursor-pointer hover:border-indigo-300">
            <option>Admin Panel</option>
            <option>Doctor Panel</option>
          </select>
        </div> */}
      </header>
    );
  };

  export default Header;