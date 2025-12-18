import React from 'react';
import { Plus } from './Icons';

interface ManagementSectionProps {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
}

const ManagementSection: React.FC<ManagementSectionProps> = ({ 
  title, 
  onAdd, 
  children 
}) => {
  return (
    <div className="h-full bg-gray-50 p-6 md:p-8 overflow-y-auto rounded-b-[2rem]">
       <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          {onAdd && (
            <button 
              onClick={onAdd}
              className="bg-black text-white px-5 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-lg"
            >
              <Plus size={20} /> <span className="hidden sm:inline">Add New</span>
            </button>
          )}
       </div>
       <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 min-h-[500px]">
          {children}
       </div>
    </div>
  )
}

export default ManagementSection;