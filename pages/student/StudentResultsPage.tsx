import React, { useState, useEffect } from 'react';
import { Printer, Download, FileText } from '../../components/Icons';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthContext';

const StudentResultsPage = () => {
   const { session } = useAuth();
   const [selectedSemester, setSelectedSemester] = useState<number>(1);
   const [student, setStudent] = useState<any>({ name: '', rollNo: '', department: '', batch: '', cgpa: 3.8, avatarUrl: '' });
   const [results, setResults] = useState<any[]>([]);
   const [stats, setStats] = useState({ totalCredits: 0, totalPoints: 0, hasFailed: false, sgpa: '0.00' });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchData = async () => {
         if (!session?.user?.id) return;
         setLoading(true);

         // 1. Fetch Profile
         const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
         if (profile) {
            setStudent(prev => ({
               ...prev,
               name: profile.full_name,
               avatarUrl: profile.avatar_url,
               department: profile.department || 'General',
               batch: profile.batch || '2024-2028',
               rollNo: profile.roll_no || 'N/A'
            }));
         }

         // 2. Fetch Enrollments + Grades (show all courses, group by course)
         const { data: enrollments, error: enrollError } = await supabase
            .from('enrollments')
            .select(`
                id,
                course:courses (id, code, credits, name),
                grade:grades (*)
            `)
            .eq('student_id', session.user.id);

         console.log('Enrollments fetch result:', enrollments, 'Error:', enrollError);

         if (enrollments) {
            let totalCredits = 0;
            let totalPoints = 0;
            let hasFailed = false;

            const processedResults = enrollments.map((enr: any) => {
               // Grade might be array if linked improperly (reverse relation)
               const gradeRecord = Array.isArray(enr.grade) ? enr.grade[0] : enr.grade;

               if (enr.course && gradeRecord) {
                  // Use total from DB or default to the stored value
                  const total = gradeRecord.total || 0;

                  totalCredits += enr.course.credits || 0;
                  let points = 0;
                  const grade = gradeRecord.grade || 'F';
                  if (grade.includes('A')) points = 10;
                  else if (grade.includes('B')) points = 8;
                  else if (grade.includes('C')) points = 6;
                  else if (grade.includes('D')) points = 5;
                  else points = 0; // F

                  totalPoints += points * (enr.course.credits || 0);

                  // Fix: Trust the letter grade if total is missing but grade is passing
                  const isPassingGrade = !grade.includes('F') && points > 0;
                  const status = (total >= 40 || isPassingGrade) ? 'PASS' : 'FAIL';

                  if (status === 'FAIL') hasFailed = true;

                  return {
                     course: enr.course,
                     gradeRecord: { ...gradeRecord, total },
                     status
                  };
               }
               return null;
            }).filter(Boolean);

            setResults(processedResults);
            const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
            setStats({ totalCredits, totalPoints, hasFailed, sgpa });
         }
         setLoading(false);
      };

      fetchData();
   }, [session, selectedSemester]); // Re-run when semester changes

   const sgpa = stats.sgpa;
   const cgpa = student.cgpa; // Static for now

   const handlePrint = () => {
      window.print();
   };

   return (
      <div className="h-full bg-[#F4F4F5] p-6 lg:p-8 overflow-y-auto rounded-t-[2rem] rounded-b-none md:rounded-b-[2rem] pb-32">
         <div className="max-w-5xl mx-auto space-y-6">

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
               <div>
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight">Examination Results</h1>
                  <p className="text-gray-500 font-medium text-sm lg:text-base">View and download your academic performance report.</p>
               </div>
               <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={handlePrint} className="flex-1 md:flex-initial justify-center bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 shadow-sm">
                     <Printer size={18} /> Print
                  </button>
                  <button className="flex-1 md:flex-initial justify-center bg-black text-white px-5 py-2.5 rounded-full font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800">
                     <Download size={18} /> Download PDF
                  </button>
               </div>
            </div>

            {/* Student Info Card */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-center">
               <img src={student.avatarUrl} className="w-20 h-20 lg:w-24 lg:h-24 rounded-full object-cover border-4 border-gray-50" alt="profile" />
               <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 w-full text-center md:text-left">
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Student Name</p>
                     <p className="font-bold text-gray-900 text-base lg:text-lg">{student.name}</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Roll Number</p>
                     <p className="font-bold text-gray-900 text-base lg:text-lg font-mono">{student.rollNo}</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Department</p>
                     <p className="font-bold text-gray-900 text-base lg:text-lg">{student.department}</p>
                  </div>
                  <div>
                     <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Batch</p>
                     <p className="font-bold text-gray-900 text-base lg:text-lg">{student.batch}</p>
                  </div>
               </div>
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar print:hidden">
               {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                  <button
                     key={sem}
                     onClick={() => setSelectedSemester(sem)}
                     className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${selectedSemester === sem
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-gray-500 hover:bg-gray-100'
                        }`}
                  >
                     Semester {sem}
                  </button>
               ))}
            </div>

            {/* Results Content */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">

               {/* Result Header */}
               <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg lg:text-xl text-gray-900">Semester {selectedSemester} Results</h3>
                  {results.length > 0 && (
                     <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase ${stats.hasFailed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                        {stats.hasFailed ? 'Fail' : 'Pass'}
                     </span>
                  )}
               </div>

               {/* Table */}
               {results.length > 0 ? (
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                              <th className="p-5 font-bold whitespace-nowrap">Course Code</th>
                              <th className="p-5 font-bold whitespace-nowrap">Course Title</th>
                              <th className="p-5 font-bold text-center whitespace-nowrap">Credits</th>
                              <th className="p-5 font-bold text-center whitespace-nowrap">Total (100)</th>
                              <th className="p-5 font-bold text-center whitespace-nowrap">Grade</th>
                              <th className="p-5 font-bold text-center whitespace-nowrap">Status</th>
                           </tr>
                        </thead>
                        <tbody className="text-sm">
                           {results.map((item: any, idx) => (
                              <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                 <td className="p-5 font-mono font-medium text-gray-600">{item.course.code}</td>
                                 <td className="p-5 font-bold text-gray-900">{item.course.name}</td>
                                 <td className="p-5 text-center font-medium">{item.course.credits}</td>
                                 <td className="p-5 text-center">
                                    <div className="font-bold text-gray-900 text-lg">
                                       {item.gradeRecord.total || ((item.gradeRecord.internal_marks || 0) + (item.gradeRecord.external_marks || 0))}
                                    </div>
                                    <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap mt-1">
                                       Int: {item.gradeRecord.internal_marks || 0} + Ext: {item.gradeRecord.external_marks || 0}
                                    </div>
                                 </td>
                                 <td className="p-5 text-center font-bold text-gray-900">{item.gradeRecord.grade}</td>
                                 <td className="p-5 text-center">
                                    {item.status === 'PASS'
                                       ? <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded">PASS</span>
                                       : <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded">FAIL</span>
                                    }
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                     <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <FileText size={24} />
                     </div>
                     <p className="font-medium">No results declared for Semester {selectedSemester} yet.</p>
                  </div>
               )}

               {/* Summary Footer */}
               {results.length > 0 && (
                  <div className="bg-[#FFF4D6] p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full">
                        <div>
                           <p className="text-xs text-yellow-800/60 font-bold uppercase">Total Credits</p>
                           <p className="text-xl font-black text-yellow-900">{stats.totalCredits}</p>
                        </div>
                        <div>
                           <p className="text-xs text-yellow-800/60 font-bold uppercase">SGPA</p>
                           <p className="text-xl font-black text-yellow-900">{stats.sgpa}</p>
                        </div>
                        <div>
                           <p className="text-xs text-yellow-800/60 font-bold uppercase">CGPA</p>
                           <p className="text-xl font-black text-yellow-900">{cgpa}</p>
                        </div>
                        <div>
                           <p className="text-xs text-yellow-800/60 font-bold uppercase">Result</p>
                           <p className={`text-xl font-black ${stats.hasFailed ? 'text-red-600' : 'text-green-700'}`}>
                              {stats.hasFailed ? 'FAIL' : 'PASS'}
                           </p>
                        </div>
                     </div>
                  </div>
               )}
            </div>

            {/* Print Only Footer */}
            <div className="hidden print:block pt-12">
               <div className="flex justify-between items-end px-12">
                  <div className="text-center">
                     <div className="w-40 border-b border-black mb-2"></div>
                     <p className="text-sm font-bold">Student Signature</p>
                  </div>
                  <div className="text-center">
                     <div className="w-40 border-b border-black mb-2"></div>
                     <p className="text-sm font-bold">Controller of Examinations</p>
                  </div>
               </div>
               <p className="text-center text-xs text-gray-400 mt-12">Generated by EduSphere SIS on {new Date().toLocaleDateString()}</p>
            </div>

         </div>
      </div >
   )
}

export default StudentResultsPage;
