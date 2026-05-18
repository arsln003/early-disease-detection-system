import React from 'react';

const StatsCard = ({ title, value, icon: Icon, colorClass }) => {
  // Extracting color for background opacity dynamically
  // colorClass example: "text-blue-600" -> We need bg-blue-50
  const baseColor = colorClass.split('-')[1]; // 'blue', 'red', etc.

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <div>
        <p className="text-slate-500 text-sm font-medium tracking-wide">{title}</p>
        <h3 className={`text-3xl font-bold mt-2 text-slate-800`}>{value}</h3>
      </div>
      <div className={`p-4 rounded-xl bg-${baseColor}-50 group-hover:bg-${baseColor}-100 transition-colors`}>
        <Icon size={24} className={colorClass} />
      </div>
    </div>
  );
};

export default StatsCard;