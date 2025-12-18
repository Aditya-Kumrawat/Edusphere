import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Target, Zap, FileText, CheckCircle, XCircle, RotateCcw,
  AlertCircle, TrendingUp, BookOpen, Star, Play, History, BarChart2,
  ArrowRight, X, Award, Flame, Timer, Lock, Calendar, Settings
} from '../../components/Icons';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabaseClient';

// Question interface
interface Question {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

// Assigned Test Interface
interface AssignedTest {
  id: string;
  title: string;
  topic: string;
  subject: string;
  difficulty: string;
  questions: Question[];
  duration: number;
  total_marks: number;
  due_date: string;
  status: string;
  course_id: string;
  creator_id: string;
}

// Quiz result interface
interface QuizResult {
  id: string;
  subject: string;
  grade: number;
  mode: string;
  score: number;
  total_questions: number; // Changed from totalQuestions to match DB column naming if we were mapping directly, but for UI standardizing on camelCase or snake_case consistently is key. 
  // Wait, the previous file mixed camelCase in interface and snake_case in logic. Let's fix standard usage.
  // For now, I'll stick to camelCase for UI state and map to snake_case for DB.
  correct_answers: number;
  accuracy: number;
  best_streak: number;
  duration: number;
  completed_at: string;
}

type TestMode = 'rapid' | 'full' | 'assigned' | null;

// Subject list for different grades
const getSubjectsForGrade = (grade: number): string[] => {
  if (grade <= 10) return ['English', 'Social Studies', 'Science', 'Maths'];
  return ['Physics', 'Chemistry', 'Biology', 'Maths', 'English', 'Computer Science'];
};

// Generate fallback question when API fails
const generateFallbackQuestion = (subject: string, grade: number): Question => ({
  id: `fallback-${Date.now()}-${Math.random()}`,
  question: `What is a fundamental concept in ${subject} for Class ${grade}?`,
  options: ['Concept A', 'Concept B', 'Concept C', 'Concept D'],
  answerIndex: Math.floor(Math.random() * 4),
  difficulty: 'medium',
});

// Fetch questions from Gemini API
const fetchQuestionsFromGemini = async (subject: string, grade: number, count: number = 10): Promise<Question[]> => {
  try {
    const GEMINI_API_KEY = 'AIzaSyCSmGAAojxkMN1zTGuUDPRVaXDvEHm-0jY';
    if (!GEMINI_API_KEY) {
      console.log('No Gemini API key found, using fallback questions');
      return Array.from({ length: count }, () => generateFallbackQuestion(subject, grade));
    }

    const prompt = `You are an expert teacher creating a quiz for Class ${grade} students studying ${subject}.
    Generate ${count} multiple-choice questions appropriate for this grade level.
    IMPORTANT: Respond with ONLY valid JSON in this exact format:
    {
      "questions": [
        { "question": "Your question here", "options": ["A", "B", "C", "D"], "answerIndex": 0, "difficulty": "easy" }
      ]
    }`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      }),
    });

    // Handle rate limit and other HTTP errors - return fallback questions instead of crashing
    if (!response.ok) {
      console.warn(`Gemini API error: ${response.status}. Using fallback questions.`);
      return Array.from({ length: count }, () => generateFallbackQuestion(subject, grade));
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Handle missing response text
    if (!text) {
      console.warn('No response text from Gemini. Using fallback questions.');
      return Array.from({ length: count }, () => generateFallbackQuestion(subject, grade));
    }

    let cleanText = text.trim().replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanText = jsonMatch[0];

    const responseData = JSON.parse(cleanText);
    if (!responseData.questions || !Array.isArray(responseData.questions)) {
      throw new Error('Invalid response format');
    }

    return responseData.questions.map((q: any, index: number) => ({
      id: `gemini-${Date.now()}-${index}`,
      question: q.question,
      options: q.options,
      answerIndex: q.answerIndex,
      difficulty: q.difficulty || 'medium'
    }));
  } catch (err) {
    console.error("Gemini Error:", err);
    return Array.from({ length: count }, () => generateFallbackQuestion(subject, grade));
  }
};

const TestArena = () => {
  const { session, user } = useAuth();
  const [mode, setMode] = useState<TestMode>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number>(10);
  const [running, setRunning] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [testStartTime, setTestStartTime] = useState(0);
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
  const streakAudio = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'));

  // Assigned Tests State
  const [assignedTests, setAssignedTests] = useState<AssignedTest[]>([]);
  const [activeAssignedTest, setActiveAssignedTest] = useState<AssignedTest | null>(null);

  const particles = Array.from({ length: 20 });

  useEffect(() => {
    if (session?.user) {
      fetchQuizResults();
      fetchAssignedTests();
    }
  }, [session]);

  const fetchQuizResults = async () => {
    const { data } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('student_id', session?.user.id)
      .order('completed_at', { ascending: false })
      .limit(10);
    if (data) setQuizHistory(data);
  };

  const fetchAssignedTests = async () => {
    if (!session?.user?.id) return;

    // 1. Get student course enrollments
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', session.user.id);

    if (!enrollments || enrollments.length === 0) return;

    const courseIds = enrollments.map(e => e.course_id);

    // 2. Fetch tests for these courses
    const { data: tests } = await supabase
      .from('tests')
      .select('*')
      .in('course_id', courseIds)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // 3. Filter out already completed tests (Optional logic, can show them as completed later)
    // For now, let's just show them all and maybe mark completed ones visually if we fetched results too.
    if (tests) setAssignedTests(tests);
  };

  const getTestDuration = (m: TestMode) => {
    if (m === 'rapid') return 120;
    if (m === 'full') return 600;
    return activeAssignedTest ? activeAssignedTest.duration * 60 : 300;
  };

  useEffect(() => {
    if (running && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            saveQuizResult(); // Save when time runs out
            setShowResult(true);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [running, timeLeft]);

  const loadNextQuestion = useCallback(() => {
    if (questionQueue.length > 0) {
      const [next, ...rest] = questionQueue;
      setCurrentQuestion(next);
      setQuestionQueue(rest);
      setSelectedAnswer(null);
      setAnswerFeedback(null);
    } else {
      // No more questions - save results and show result screen
      saveQuizResult();
      setShowResult(true);
      setRunning(false);
    }
  }, [questionQueue]);

  // Save quiz result to Supabase
  const saveQuizResult = async () => {
    if (!session?.user) return;

    const duration = Math.floor((Date.now() - testStartTime) / 1000);
    const finalAccuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    try {
      await supabase.from('quiz_results').insert({
        student_id: session.user.id,
        student_name: session.user.email?.split('@')[0] || 'Student',
        student_email: session.user.email,
        subject: activeAssignedTest ? activeAssignedTest.subject : selectedSubject,
        grade: selectedGrade,
        mode: activeAssignedTest ? 'full' : (mode || 'rapid'), // Assigned tests count as full for now or custom
        score: score,
        total_questions: answeredCount,
        correct_answers: correctCount,
        accuracy: finalAccuracy,
        best_streak: bestStreak,
        duration: duration,
        completed_at: new Date().toISOString(),
        test_id: activeAssignedTest ? activeAssignedTest.id : null
      });
      fetchQuizResults();
    } catch (err) {
      console.error('Failed to save quiz result:', err);
    }
  };

  const handleStartTest = async () => {
    setShowInstructions(false);
    setIsLoadingQuestions(true);

    let questions: Question[] = [];

    if (mode === 'assigned' && activeAssignedTest) {
      // Load assigned test questions
      questions = activeAssignedTest.questions;
    } else if (selectedSubject && selectedGrade !== null) {
      // Generate practice questions
      questions = await fetchQuestionsFromGemini(selectedSubject, selectedGrade, mode === 'rapid' ? 10 : 20);
    }

    if (questions.length > 0) {
      setCurrentQuestion(questions[0]);
      setQuestionQueue(questions.slice(1));
    }

    setIsLoadingQuestions(false);
    setRunning(true);
    setTimeLeft(getTestDuration(mode));
    setTestStartTime(Date.now());
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnsweredCount(0);
    setCorrectCount(0);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !currentQuestion || isAnimating) return;
    setIsAnimating(true);
    const isCorrect = selectedAnswer === currentQuestion.answerIndex;
    setAnswerFeedback(isCorrect ? 'correct' : 'wrong');

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      const multiplier = Math.min(Math.floor(newStreak / 3) + 1, 5);
      setScore((prev) => prev + 10 * multiplier);
      setCorrectCount((prev) => prev + 1);
      streakAudio.current.play().catch(() => { });
    } else {
      setStreak(0);
    }

    setAnsweredCount((prev) => prev + 1);
    setTimeout(() => { setIsAnimating(false); loadNextQuestion(); }, 800);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetTest = () => {
    setRunning(false);
    setShowResult(false);
    setScore(0);
    setQuestionQueue([]);
    setActiveAssignedTest(null);
    setMode(null);
  };

  // Render Mode Selection or Test Interface
  return (
    <div className="h-full bg-slate-50 overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] rounded-b-none pb-32">
      {!running && !showResult && !showInstructions ? (
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {/* Header */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">Test Arena</h1>
              <p className="text-gray-500 font-medium">Challenge yourself and master your subjects</p>
            </div>
          </motion.div>

          {/* Assigned Tests Section */}
          {assignedTests.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Award className="text-purple-600" />
                Assigned Tests
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedTests.map((test) => (
                  <motion.div
                    key={test.id}
                    whileHover={{ y: -4 }}
                    className="bg-white p-6 rounded-2xl shadow-sm border border-purple-100 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                    onClick={() => {
                      setActiveAssignedTest(test);
                      setMode('assigned');
                      setShowInstructions(true);
                    }}
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <FileText size={80} className="text-purple-600" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {test.subject}
                        </span>
                        {test.due_date && (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded-lg">
                            <Clock size={12} /> Due: {new Date(test.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{test.title}</h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{test.topic}</p>

                      <div className="flex items-center justify-between text-sm font-medium text-gray-600 pt-4 border-t border-gray-50">
                        <div className="flex items-center gap-1"><Target size={14} /> {test.questions.length} Qs</div>
                        <div className="flex items-center gap-1"><Timer size={14} /> {test.duration} mins</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Practice Modes */}
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap className="text-blue-600" />
            Practice Mode
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Rapid Fire Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => { setMode('rapid'); setShowInstructions(true); }}
              className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden cursor-pointer shadow-xl shadow-blue-200"
            >
              <div className="relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl w-fit mb-6 backdrop-blur-sm">
                  <Zap size={32} className="text-yellow-300" />
                </div>
                <h3 className="text-3xl font-black mb-2">Rapid Fire</h3>
                <p className="text-blue-100 font-medium mb-6 text-lg">Speed & Accuracy test. 10 Questions. 2 Minutes.</p>
                <button className="bg-white text-blue-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-50 transition-colors">
                  Start Practice <ArrowRight size={18} />
                </button>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-20 rotate-12">
                <Timer size={200} />
              </div>
            </motion.div>

            {/* Full Test Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              onClick={() => { setMode('full'); setShowInstructions(true); }}
              className="bg-white rounded-3xl p-8 border border-gray-100 relative overflow-hidden cursor-pointer shadow-xl shadow-gray-100 group"
            >
              <div className="relative z-10">
                <div className="p-3 bg-green-100 rounded-2xl w-fit mb-6 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <FileText size={32} />
                </div>
                <h3 className="text-3xl font-black mb-2 text-gray-900">Custom Test</h3>
                <p className="text-gray-500 font-medium mb-6 text-lg">Deep dive into subjects. Choose your topic.</p>
                <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
                  Configure Test <Settings size={18} />
                </button>
              </div>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12 text-green-900">
                <Target size={200} />
              </div>
            </motion.div>
          </div>

          {/* History */}
          {quizHistory.length > 0 && (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <History className="text-orange-500" /> Recent Activity
              </h3>
              <div className="space-y-4">
                {quizHistory.map((quiz, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl ${quiz.score > 80 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {Math.round(quiz.accuracy)}%
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{quiz.subject}</h4>
                        <p className="text-sm text-gray-500">{new Date(quiz.completed_at).toLocaleDateString()} • {quiz.mode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-gray-900">{quiz.score} XP</p>
                      <p className="text-xs text-gray-500 font-bold text-orange-500">🔥 {quiz.best_streak} streak</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Test Interface (Running or Result)
        <div className="max-w-5xl mx-auto p-4 lg:p-8 min-h-screen flex flex-col">
          {/* Instructions Modal */}
          <AnimatePresence>
            {showInstructions && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl">
                  <h2 className="text-2xl font-black text-gray-900 mb-4">
                    {mode === 'assigned' ? activeAssignedTest?.title : `Ready for ${mode === 'rapid' ? 'Rapid Fire' : 'Full Test'}?`}
                  </h2>

                  {mode !== 'assigned' && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                        <select
                          className="w-full p-3 bg-gray-50 rounded-xl font-bold"
                          value={selectedSubject || ''}
                          onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                          <option value="" disabled>Select Subject</option>
                          {getSubjectsForGrade(selectedGrade).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Class</label>
                        <select
                          className="w-full p-3 bg-gray-50 rounded-xl font-bold"
                          value={selectedGrade}
                          onChange={(e) => setSelectedGrade(Number(e.target.value))}
                        >
                          {[9, 10, 11, 12].map(g => <option key={g} value={g}>Class {g}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <Clock size={20} className="text-blue-500" />
                      <span className="font-medium">{Math.floor(getTestDuration(mode) / 60)} Minutes Duration</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <Target size={200} className="w-5 h-5 text-green-500" />
                      <span className="font-medium">Multiple Choice Questions</span>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-3 rounded-xl">
                      <Flame size={20} className="text-orange-500" />
                      <span className="font-medium">Streak Bonuses Active</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button onClick={() => setShowInstructions(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button
                      onClick={handleStartTest}
                      disabled={mode !== 'assigned' && !selectedSubject}
                      className="flex-1 py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                    >
                      Start Quiz
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading State */}
          {isLoadingQuestions && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
              <h2 className="text-2xl font-black text-gray-900 animate-pulse">Generating Challenge...</h2>
              <p className="text-gray-500 mt-2 font-medium">Preparing questions just for you</p>
            </div>
          )}

          {/* Active Question Interface */}
          {running && !isLoadingQuestions && currentQuestion && (
            <div className="flex-1 max-w-3xl mx-auto w-full flex flex-col justify-center">
              {/* Top Bar */}
              <div className="flex justify-between items-center mb-12">
                <div className="flex items-center gap-4">
                  <button onClick={resetTest} className="p-2 bg-white rounded-xl hover:bg-gray-100 text-gray-500"><X size={24} /></button>
                  <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                    <Flame className={`${streak > 2 ? 'text-orange-500 animate-bounce' : 'text-gray-300'}`} fill={streak > 2 ? "currentColor" : "none"} />
                    <span className="font-black text-xl">{streak}</span>
                  </div>
                </div>
                <div className="bg-black text-white px-6 py-2 rounded-xl font-mono text-xl font-bold tracking-wider shadow-lg shadow-blue-500/20">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Question Card */}
              <motion.div
                key={currentQuestion.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-white mb-8 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-2 bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${((answeredCount) / (activeAssignedTest ? activeAssignedTest.questions.length : (mode === 'rapid' ? 10 : 20))) * 100}%` }}
                    className="h-full bg-blue-600"
                  />
                </div>
                <span className="inline-block px-3 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">
                  Question {answeredCount + 1}
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-8">
                  {currentQuestion.question}
                </h2>

                <div className="grid gap-4">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={`p-5 rounded-2xl text-left font-bold text-lg transition-all border-2 flex justify-between items-center group ${selectedAnswer === idx
                        ? answerFeedback === 'correct'
                          ? 'bg-green-50 border-green-500 text-green-700 shadow-green-100'
                          : 'bg-red-50 border-red-500 text-red-700 shadow-red-100'
                        : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-lg text-gray-700'
                        }`}
                    >
                      <span className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${selectedAnswer === idx ? 'bg-white/50' : 'bg-white text-gray-400 group-hover:bg-black group-hover:text-white transition-colors'}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </span>
                      {selectedAnswer === idx && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          {answerFeedback === 'correct' ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null || isAnimating}
                className={`w-full py-5 rounded-2xl font-black text-xl tracking-wide shadow-xl transition-all ${selectedAnswer !== null
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.02] shadow-blue-500/30'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {selectedAnswer === null ? 'Select an Option' : 'Lock Answer'}
              </button>
            </div>
          )}

          {/* Results Screen */}
          {showResult && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-2xl w-full text-center relative overflow-hidden">
                {score > 50 && <div className="absolute inset-0 bg-gradient-to-b from-yellow-50/50 to-transparent pointer-events-none" />}

                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.2 }} className="w-24 h-24 bg-yellow-400 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-yellow-200 rotate-12">
                  <Award size={48} className="text-yellow-900" />
                </motion.div>

                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
                  {score > 100 ? 'Magnificent!' : 'Good Effort!'}
                </h2>
                <p className="text-xl text-gray-500 font-medium mb-10">
                  You conquered the {activeAssignedTest?.title || (mode === 'rapid' ? 'Rapid Fire' : selectedSubject)} quiz
                </p>

                <div className="grid grid-cols-3 gap-4 mb-10">
                  <div className="bg-blue-50 p-6 rounded-3xl">
                    <p className="text-blue-600 font-bold mb-1 uppercase text-xs tracking-wider">Score</p>
                    <p className="text-3xl font-black text-blue-900">{score}</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-3xl">
                    <p className="text-green-600 font-bold mb-1 uppercase text-xs tracking-wider">Correct</p>
                    <p className="text-3xl font-black text-green-900">{correctCount}</p>
                  </div>
                  <div className="bg-purple-50 p-6 rounded-3xl">
                    <p className="text-purple-600 font-bold mb-1 uppercase text-xs tracking-wider">Streak</p>
                    <p className="text-3xl font-black text-purple-900">{bestStreak}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={resetTest} className="flex-1 py-4 bg-gray-100 text-gray-900 rounded-2xl font-bold hover:bg-gray-200 transition-colors">
                    Dashboard
                  </button>
                  <button onClick={() => { resetTest(); setMode('rapid'); setShowInstructions(true); }} className="flex-1 py-4 bg-black text-white rounded-2xl font-bold hover:scale-105 transition-transform shadow-xl">
                    Play Again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestArena;
