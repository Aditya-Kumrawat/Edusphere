import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, Eye, Users, Clock, FileText, AlertCircle,
  Award, Calendar, Settings, X, BookOpen, TrendingUp, BarChart2, Filter, Flame,
  Wand2, CheckCircle, Loader2, Save
} from '../../components/Icons';
import { supabase } from '../../services/mongoAdapter';
import { useAuth } from '../../context/AuthContext';

// Question interface
interface Question {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Quiz result from database
interface QuizResult {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  subject: string;
  grade: number;
  mode: 'rapid' | 'full';
  score: number;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  best_streak: number;
  duration: number;
  completed_at: string;
  test_id?: string;
}

// Test interface for created tests
interface Test {
  id: string;
  course_id: string;
  creator_id: string;
  title: string;
  topic: string;
  description: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: Question[];
  duration: number;
  total_marks: number;
  due_date: string;
  status: 'draft' | 'published' | 'active' | 'completed';
  type: 'coding' | 'quiz' | 'assignment';
  created_at: string;
  is_proctored: boolean;
}

// Course interface for selection
interface Course {
  id: string;
  name: string;
  code: string;
}

const TestManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'results' | 'tests'>('tests');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  // Create Test Wizard State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testConfig, setTestConfig] = useState({
    title: '',
    topic: '',
    subject: '',
    course_id: '',
    difficulty: 'Medium' as 'Easy' | 'Medium' | 'Hard',
    questionCount: 10,
    duration: 30, // minutes
    dueDate: '',
    isProctored: true
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

  // Fetch Tests and Results
  useEffect(() => {
    fetchTests();
    fetchQuizResults();
    fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;
    const { data } = await supabase.from('courses').select('id, name, code'); // Assuming faculty links are handled elsewhere or fetching all for now
    if (data) setCourses(data);
  };

  const fetchTests = async () => {
    setLoadingTests(true);
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTests(data);
    setLoadingTests(false);
  };

  const fetchQuizResults = async () => {
    setLoadingResults(true);
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (data) setQuizResults(data);
    setLoadingResults(false);
  };

  // Hardcoded DBMS Questions
  const DBMS_QUESTIONS: Question[] = [
    { id: 'dbms-1', question: 'Which SQL keyword is used to sort the result set in ascending or descending order?', options: ['ORDER BY', 'SORT BY', 'GROUP BY', 'FILTER'], answerIndex: 0, difficulty: 'easy' },
    { id: 'dbms-2', question: 'Which SQL statement is used to extract data from a database?', options: ['GET', 'SELECT', 'EXTRACT', 'FETCH'], answerIndex: 1, difficulty: 'easy' },
    { id: 'dbms-3', question: 'What is the correct syntax to select all columns from a table named "employees"?', options: ['SELECT * FROM employees;', 'SELECT all FROM employees;', 'SELECT employees FROM *;', 'SELECT * WHERE employees;'], answerIndex: 0, difficulty: 'easy' },
    { id: 'dbms-4', question: 'Which of the following SQL commands is used to delete data from a table?', options: ['REMOVE', 'DELETE', 'DROP', 'CLEAR'], answerIndex: 1, difficulty: 'easy' },
    { id: 'dbms-5', question: 'Which clause is used to filter the records returned by a SQL query?', options: ['WHERE', 'HAVING', 'LIKE', 'LIMIT'], answerIndex: 0, difficulty: 'easy' },
    { id: 'dbms-6', question: 'Which of the following SQL functions is used to count the number of rows in a table?', options: ['COUNT()', 'SUM()', 'AVG()', 'ROW_COUNT()'], answerIndex: 0, difficulty: 'medium' },
    { id: 'dbms-7', question: 'Which SQL statement is used to modify an existing record in a table?', options: ['MODIFY', 'UPDATE', 'ALTER', 'CHANGE'], answerIndex: 1, difficulty: 'easy' },
    { id: 'dbms-8', question: 'Which SQL keyword is used to combine rows from two or more tables, based on a related column?', options: ['JOIN', 'UNION', 'MERGE', 'COMBINE'], answerIndex: 0, difficulty: 'medium' },
    { id: 'dbms-9', question: 'What is the purpose of the GROUP BY clause in SQL?', options: ['To sort the result set', 'To filter rows based on a condition', 'To group rows that have the same values', 'To limit the number of rows returned'], answerIndex: 2, difficulty: 'medium' },
    { id: 'dbms-10', question: 'What will the following SQL query do: SELECT DISTINCT city FROM customers;?', options: ['Return all customer cities including duplicates', 'Return only unique customer cities without duplicates', 'Return the number of customer cities', 'Return customers from each city'], answerIndex: 1, difficulty: 'medium' },
  ];

  // AI Generation Logic
  const generateQuestions = async () => {
    if (!testConfig.topic || !testConfig.subject) return;

    setIsGenerating(true);

    // Check if subject is DBMS - use hardcoded questions
    if (testConfig.subject.toLowerCase().includes('dbms') || testConfig.topic.toLowerCase().includes('dbms') || testConfig.topic.toLowerCase().includes('sql') || testConfig.topic.toLowerCase().includes('database')) {
      const questions = DBMS_QUESTIONS.slice(0, testConfig.questionCount);
      setGeneratedQuestions(questions);
      setCreateStep(2);
      setIsGenerating(false);
      return;
    }

    const GEMINI_API_KEY = 'AIzaSyCSmGAAojxkMN1zTGuUDPRVaXDvEHm-0jY';

    const prompt = `You are an expert teacher creating a quiz for students.
        Topic: ${testConfig.topic}
        Subject: ${testConfig.subject}
        Difficulty: ${testConfig.difficulty}
        Count: ${testConfig.questionCount}

        Generate ${testConfig.questionCount} multiple-choice questions.
        IMPORTANT: Respond with ONLY valid JSON in this exact format:
        {
        "questions": [
            { "question": "Question text", "options": ["A", "B", "C", "D"], "answerIndex": 0, "difficulty": "medium" }
        ]
        }`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      // Handle rate limit and other HTTP errors
      if (!response.ok) {
        if (response.status === 429) {
          alert('API rate limit exceeded. Please wait a moment and try again.');
        } else {
          alert(`API error: ${response.status}. Please try again.`);
        }
        setIsGenerating(false);
        return;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      // Handle missing response text
      if (!text) {
        alert('No response from AI. Please try again.');
        setIsGenerating(false);
        return;
      }

      let cleanText = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) cleanText = jsonMatch[0];

      const responseData = JSON.parse(cleanText);

      if (responseData.questions) {
        const questions = responseData.questions.map((q: any, i: number) => ({
          ...q,
          id: `q-${Date.now()}-${i}`
        }));
        setGeneratedQuestions(questions);
        setCreateStep(2);
      } else {
        alert('Invalid response format. Please try again.');
      }
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const publishTest = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.from('tests').insert({
        course_id: testConfig.course_id,
        creator_id: user._id,
        title: testConfig.title,
        topic: testConfig.topic,
        subject: testConfig.subject,
        difficulty: testConfig.difficulty,
        questions: generatedQuestions, // Auto-converted to JSONB
        duration: testConfig.duration,
        total_marks: generatedQuestions.length * 10,
        due_date: testConfig.dueDate ? new Date(testConfig.dueDate).toISOString() : null,
        status: 'published',
        is_proctored: testConfig.isProctored
      });

      if (error) throw error;

      alert('Test published successfully!');
      setIsCreateOpen(false);
      resetWizard();
      fetchTests();
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Failed to publish test.');
    }
  };

  const resetWizard = () => {
    setCreateStep(1);
    setTestConfig({
      title: '',
      topic: '',
      subject: '',
      course_id: '',
      difficulty: 'Medium',
      questionCount: 10,
      duration: 30,
      dueDate: '',
      isProctored: true
    });
    setGeneratedQuestions([]);
  };

  // Delete Test
  const deleteTest = async (testId: string) => {
    console.log('Delete clicked for test:', testId);
    if (!confirm('Are you sure you want to delete this test?')) return;

    console.log('User confirmed deletion');
    try {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      console.log('Delete response, error:', error);
      if (error) throw error;
      alert('Test deleted successfully!');
      fetchTests();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete test.');
    }
  };

  // Filter results
  const filteredResults = quizResults.filter(result => {
    const matchesSearch =
      result.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.student_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.subject.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || result.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="h-full bg-slate-50 overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] rounded-b-none pb-32">
      <div className="p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-1">
              📊 Test Management
            </h1>
            <p className="text-gray-500 font-medium">
              Create AI-powered tests and view student results
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-sm"
          >
            <Wand2 size={18} />
            Generate AI Test
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'tests'
              ? 'bg-white text-black shadow-md border border-gray-100'
              : 'text-gray-500 hover:bg-white/50'
              }`}
          >
            My Tests
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'results'
              ? 'bg-white text-black shadow-md border border-gray-100'
              : 'text-gray-500 hover:bg-white/50'
              }`}
          >
            Student Results
          </button>
        </div>

        {/* My Tests Tab */}
        {activeTab === 'tests' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {tests.map((test, index) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-1">{test.title}</h3>
                    <p className="text-xs text-gray-500 font-medium mb-2">{test.topic}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-600">
                        {test.difficulty}
                      </span>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600">
                        {test.questions.length} Qs
                      </span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${test.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {test.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-500 mb-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{test.duration} mins duration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Due: {test.due_date ? new Date(test.due_date).toLocaleDateString() : 'No due date'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold text-xs hover:bg-gray-100">
                    View Stats
                  </button>
                  <button
                    onClick={() => deleteTest(test.id)}
                    className="py-2 px-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
            {tests.length === 0 && !loadingTests && (
              <div className="col-span-full py-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tests created yet.</p>
                <button onClick={() => setIsCreateOpen(true)} className="text-blue-600 font-bold mt-2 hover:underline">
                  Create your first test
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Results Tab (Existing Logic) */}
        {activeTab === 'results' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Search and Filters same as before... */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Test/Subject</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Accuracy</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((result) => (
                    <tr key={result.id} onClick={() => setSelectedResult(result)} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">{result.student_name}</p>
                        <p className="text-xs text-gray-500">{result.student_email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{result.subject}</p>
                        <p className="text-xs text-gray-500 capitalize">{result.mode} Mode</p>
                      </td>
                      <td className="px-6 py-4 font-black">{result.score}</td>
                      <td className="px-6 py-4 font-bold text-green-600">{result.accuracy}%</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(result.completed_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Create Test Modal */}
        <AnimatePresence>
          {isCreateOpen && (
            <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
              >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                    <Wand2 className="text-blue-600" />
                    {createStep === 1 ? 'Configure AI Test' : 'Review Questions'}
                  </h2>
                  <button onClick={() => setIsCreateOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                  {createStep === 1 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                          <input
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Mid-Term Physics"
                            value={testConfig.title}
                            onChange={e => setTestConfig({ ...testConfig, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Course</label>
                          <select
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.course_id}
                            onChange={e => setTestConfig({ ...testConfig, course_id: e.target.value })}
                          >
                            <option value="">Select Course</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Topic for AI</label>
                        <input
                          className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. Thermodynamics and Laws of Motion"
                          value={testConfig.topic}
                          onChange={e => setTestConfig({ ...testConfig, topic: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                          <input
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.subject}
                            onChange={e => setTestConfig({ ...testConfig, subject: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Difficulty</label>
                          <select
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.difficulty}
                            onChange={e => setTestConfig({ ...testConfig, difficulty: e.target.value as any })}
                          >
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Questions</label>
                          <input
                            type="number"
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.questionCount}
                            onChange={e => setTestConfig({ ...testConfig, questionCount: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Duration (mins)</label>
                          <input
                            type="number"
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.duration}
                            onChange={e => setTestConfig({ ...testConfig, duration: parseInt(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Due Date</label>
                          <input
                            type="datetime-local"
                            className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500"
                            value={testConfig.dueDate}
                            onChange={e => setTestConfig({ ...testConfig, dueDate: e.target.value })}
                          />
                        </div>
                      </div>

                      <button
                        onClick={generateQuestions}
                        disabled={isGenerating || !testConfig.topic}
                        className="w-full py-4 mt-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <><Loader2 className="animate-spin" /> Generating Questions...</>
                        ) : (
                          <><Wand2 /> Generate with Gemini AI</>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {generatedQuestions.map((q, idx) => (
                        <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <div className="flex justify-between mb-2">
                            <span className="font-bold text-blue-600">Consider Question {idx + 1}</span>
                            <span className="text-xs uppercase font-bold bg-white px-2 py-1 rounded shadow-sm">{q.difficulty}</span>
                          </div>
                          <p className="font-medium text-gray-900 mb-3">{q.question}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, i) => (
                              <div key={i} className={`text-sm p-2 rounded-lg ${i === q.answerIndex ? 'bg-green-100 text-green-700 font-bold border border-green-200' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {createStep === 2 && (
                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between">
                    <button onClick={() => setCreateStep(1)} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900">
                      Back
                    </button>
                    <button
                      onClick={publishTest}
                      className="px-8 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800 shadow-sm flex items-center gap-2"
                    >
                      <Save size={18} />
                      Publish Test
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Result Detail Modal */}
        <AnimatePresence>
          {selectedResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedResult(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-gray-900">Quiz Result Details</h2>
                  <button
                    onClick={() => setSelectedResult(null)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <p className="text-sm text-gray-500 mb-1">Student</p>
                    <p className="font-bold text-gray-900">{selectedResult.student_name}</p>
                    <p className="text-sm text-gray-500">{selectedResult.student_email}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl text-center">
                      <p className="text-3xl font-black text-blue-600">{selectedResult.score}</p>
                      <p className="text-xs text-blue-600 font-medium">Score</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${selectedResult.accuracy >= 60 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      <p className="text-3xl font-black">{selectedResult.accuracy}%</p>
                      <p className="text-xs font-medium">Accuracy</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TestManagement;
