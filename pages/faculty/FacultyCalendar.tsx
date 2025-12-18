import React, { useState } from 'react';
import {
   ArrowLeft, ChevronLeft, ChevronRight, Clock, MapPin,
   MoreVertical, Plus, Calendar as CalendarIcon, Filter
} from '../../components/Icons';
import { StaggerContainer, StaggerItem, HoverCard } from '../../components/AnimatedComponents';
import { motion } from 'framer-motion';

const FacultyCalendar = () => {
   const [currentDate, setCurrentDate] = useState(new Date());
   const [selectedDate, setSelectedDate] = useState<number>(new Date().getDate());

   // Mock Events
   const events = [
      { id: 1, title: 'Medical Terminology Lecture', time: '10:00 AM - 11:30 AM', type: 'Lecture', color: 'bg-blue-50 text-blue-600 border-blue-100', location: 'Room 301' },
      { id: 2, title: 'Department Meeting', time: '02:00 PM - 03:00 PM', type: 'Meeting', color: 'bg-purple-50 text-purple-600 border-purple-100', location: 'Conference Hall A' },
      { id: 3, title: 'Office Hours', time: '04:00 PM - 05:00 PM', type: 'Other', color: 'bg-orange-50 text-orange-600 border-orange-100', location: 'Cabin 4B' },
   ];

   const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
   const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

   const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] font-sans pb-32">

         <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
               <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Schedule & Calendar</h1>
                  <p className="text-gray-500 font-medium">Manage your classes, meetings, and events.</p>
               </div>
               <div className="flex gap-3">
                  <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-full font-bold text-sm shadow-sm border border-gray-100 text-gray-600 hover:text-black">
                     <Filter size={16} /> Filter
                  </button>
                  <button className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full font-bold text-sm shadow-lg hover:bg-gray-800 transition-colors">
                     <Plus size={18} /> Add Event
                  </button>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 h-auto lg:h-[600px]">

               {/* LEFT: Calendar Grid */}
               <div className="flex-1 bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                     <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-gray-900">
                           {monthNames[currentDate.getMonth()]} <span className="text-gray-400 font-medium">{currentDate.getFullYear()}</span>
                        </h2>
                     </div>
                     <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                           <ChevronLeft size={20} />
                        </button>
                        <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                           <ChevronRight size={20} />
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-7 mb-4">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-wider py-2">
                           {day}
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2 flex-1">
                     {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty - ${i} `} />
                     ))}
                     {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = day === selectedDate;
                        const hasEvent = [5, 12, 15, 20, 25].includes(day); // Mock data

                        return (
                           <button
                              key={day}
                              onClick={() => setSelectedDate(day)}
                              className={`aspect - square rounded - 2xl flex flex - col items - center justify - center relative transition - all group ${isSelected
                                    ? 'bg-black text-white shadow-lg scale-105'
                                    : 'hover:bg-gray-50 text-gray-700'
                                 } `}
                           >
                              <span className={`text - sm font - bold ${isSelected ? 'text-white' : 'text-gray-700'} `}>{day}</span>
                              {hasEvent && (
                                 <div className={`w - 1.5 h - 1.5 rounded - full mt - 1 ${isSelected ? 'bg-white' : 'bg-blue-500'} `} />
                              )}
                           </button>
                        )
                     })}
                  </div>
               </div>

               {/* RIGHT: Daily Schedule */}
               <div className="w-full lg:w-[400px] bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">Upcoming Events</h3>
                        <p className="text-sm font-medium text-gray-500">{monthNames[currentDate.getMonth()]} {selectedDate}</p>
                     </div>
                     <div className="p-2 bg-gray-50 rounded-full text-gray-400">
                        <CalendarIcon size={20} />
                     </div>
                  </div>

                  <StaggerContainer className="flex-1 overflow-y-auto pr-2 space-y-4">
                     {events.map((event, idx) => (
                        <StaggerItem key={event.id}>
                           <HoverCard className={`p - 5 rounded - [2rem] border ${event.color} relative group`}>
                              <div className="flex justify-between items-start mb-3">
                                 <span className={`px - 3 py - 1 rounded - full text - [10px] font - black uppercase tracking - wide bg - white / 50 backdrop - blur - sm`}>
                                    {event.type}
                                 </span>
                                 <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical size={16} />
                                 </button>
                              </div>
                              <h4 className="font-bold text-gray-900 text-lg mb-2 leading-tight">{event.title}</h4>
                              <div className="flex flex-col gap-2">
                                 <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                                    <Clock size={14} /> {event.time}
                                 </div>
                                 <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                                    <MapPin size={14} /> {event.location}
                                 </div>
                              </div>
                           </HoverCard>
                        </StaggerItem>
                     ))}

                     {/* Empty State Mock */}
                     <div className="p-8 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                        <p className="text-gray-400 font-medium text-sm">No more events for this day</p>
                        <button className="text-black font-bold text-xs mt-2 hover:underline">+ Add Reminder</button>
                     </div>
                  </StaggerContainer>
               </div>

            </div>
         </div>
      </div>
   )
}

export default FacultyCalendar;
