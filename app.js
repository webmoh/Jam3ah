import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Users, 
  Phone, 
  Mail, 
  PlusCircle, 
  Edit3, 
  AlertCircle,
  Clock4,
  CheckCircle,
  XCircle,
  Timer,
  Trash2,
  UserPlus,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  BookOpen
} from 'lucide-react';

// Firebase Configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = process.env.REACT_APP_APP_ID || 'booking-app-123';

const App = () => {
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('sessions');
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const calendarRef = useRef(null);
  const startRef = useRef(null);
  const endRef = useRef(null);
  const dropdownRef = useRef(null);

  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    lecturer: '',
    studentId: '',
    subject: '',
    status: 'مجدولة',
    isEditing: false,
    editId: null
  });

  const [studentForm, setStudentForm] = useState({ name: '', phone: '', email: '' });

  const lecturers = ["د. أحمد علي", "أ. سارة محمود", "د. محمد حسن", "أ. ليلى خالد"];
  const statusOptions = [
    { label: 'حصة مجدولة', value: 'مجدولة', color: 'bg-blue-100 text-blue-700', icon: <Timer size={14} /> },
    { label: 'حصة منتهية', value: 'منتهية', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
    { label: 'حصة ملغية', value: 'ملغية', color: 'bg-red-100 text-red-700', icon: <XCircle size={14} /> }
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  // Authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = process.env.REACT_APP_INITIAL_AUTH_TOKEN;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { 
        console.error("Auth error:", error); 
        // Fallback to anonymous auth
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.error("Anonymous auth also failed:", e);
        }
      }
    };
    
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Data Fetching
  useEffect(() => {
    if (!user) return;
    
    const unsubSessions = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), 
      (snapshot) => {
        setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Sessions error:", error);
        setLoading(false);
      }
    );
    
    const unsubStudents = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'students'), 
      (snapshot) => {
        setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error("Students error:", error);
      }
    );
    
    return () => { 
      unsubSessions(); 
      unsubStudents(); 
    };
  }, [user]);

  // Outside click handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) setIsCalendarOpen(false);
      if (startRef.current && !startRef.current.contains(e.target)) setIsStartTimeOpen(false);
      if (endRef.current && !endRef.current.contains(e.target)) setIsEndTimeOpen(false);
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsSearchOpen(false);
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper Functions
  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    return totalMinutes > 0 ? totalMinutes : 0;
  };

  const formatDuration = (mins) => {
    if (!mins) return "0 دقيقة";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h > 0 ? h + ' ساعة ' : ''}${m > 0 ? m + ' دقيقة' : ''}`.trim() || "0 دقيقة";
  };

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const filteredStudents = useMemo(() => 
    students.filter(s => 
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.phone?.includes(searchTerm)
    ), 
    [students, searchTerm]
  );

  // Handlers
  const handleSubmitSession = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("الرجاء الانتظار حتى يتم التحميل...");
      return;
    }
    
    const duration = calculateDuration(formData.startTime, formData.endTime);
    if (duration <= 0) { 
      alert("وقت النهاية يجب أن يكون بعد وقت البداية"); 
      return; 
    }
    
    const selectedStudent = students.find(s => s.id === formData.studentId);
    if (!selectedStudent) { 
      alert("يرجى اختيار طالب"); 
      return; 
    }

    const sessionData = {
      ...formData,
      duration,
      studentName: selectedStudent.name,
      studentPhone: selectedStudent.phone,
      studentEmail: selectedStudent.email,
      updatedAt: new Date().toISOString()
    };

    try {
      if (formData.isEditing) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'sessions', formData.editId), 
          sessionData
        );
      } else {
        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), 
          sessionData
        );
      }
      
      setFormData({ 
        date: '', 
        startTime: '', 
        endTime: '', 
        lecturer: '', 
        studentId: '', 
        subject: '', 
        status: 'مجدولة', 
        isEditing: false, 
        editId: null 
      });
      
      alert(formData.isEditing ? "تم تحديث الحصة بنجاح" : "تم حجز الحصة بنجاح");
    } catch (err) { 
      console.error("Error saving session:", err);
      alert("حدث خطأ أثناء حفظ الحصة. الرجاء المحاولة مرة أخرى.");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'students'), 
        { ...studentForm, createdAt: new Date().toISOString() }
      );
      
      setStudentForm({ name: '', phone: '', email: '' });
      setActiveTab('sessions');
      alert("تم إضافة الطالب بنجاح");
    } catch (err) {
      console.error("Error adding student:", err);
      alert("حدث خطأ أثناء إضافة الطالب. الرجاء المحاولة مرة أخرى.");
    }
  };

  // Time Picker Component
  const TimePickerPopup = ({ current, onSelect, onClose }) => {
    const [h, m] = (current || "12:00").split(':');
    return (
      <div className="absolute z-50 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 right-0 md:left-0">
        <div className="flex gap-4 justify-center items-center h-40">
          {/* Hours */}
          <div className="flex-1 overflow-y-auto h-full scrollbar-hide text-center">
            <div className="text-[10px] text-gray-400 mb-1">ساعة</div>
            {hours.map(hour => (
              <div 
                key={hour} 
                onClick={() => onSelect(`${hour}:${m}`)}
                className={`cursor-pointer py-1 rounded-md text-sm ${h === hour ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
              >
                {hour}
              </div>
            ))}
          </div>
          {/* Divider */}
          <div className="font-bold text-gray-300 self-center">:</div>
          {/* Minutes */}
          <div className="flex-1 overflow-y-auto h-full scrollbar-hide text-center">
            <div className="text-[10px] text-gray-400 mb-1">دقيقة</div>
            {minutes.map(min => (
              <div 
                key={min} 
                onClick={() => onSelect(`${h}:${min}`)}
                className={`cursor-pointer py-1 rounded-md text-sm ${m === min ? 'bg-blue-600 text-white font-bold' : 'hover:bg-gray-100'}`}
              >
                {min}
              </div>
            ))}
          </div>
        </div>
        <button 
          type="button" 
          onClick={onClose}
          className="w-full mt-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
        >
          تم
        </button>
      </div>
    );
  };

  // Simple CSS-in-JS for this example
  const styles = `
    .min-h-screen { min-height: 100vh; }
    .bg-slate-50 { background-color: #f8fafc; }
    .p-4 { padding: 1rem; }
    .md\\:p-8 { padding: 2rem; }
    .font-sans { font-family: 'IBM Plex Sans Arabic', sans-serif; }
    .text-right { text-align: right; }
    .max-w-6xl { max-width: 72rem; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .mb-8 { margin-bottom: 2rem; }
    .text-center { text-align: center; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .text-3xl { font-size: 1.875rem; }
    .font-bold { font-weight: 700; }
    .text-slate-800 { color: #1e293b; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-center { justify-content: center; }
    .gap-3 { gap: 0.75rem; }
    .text-blue-600 { color: #2563eb; }
    .w-8 { width: 2rem; }
    .h-8 { height: 2rem; }
    .gap-2 { gap: 0.5rem; }
    .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .rounded-full { border-radius: 9999px; }
    .font-medium { font-weight: 500; }
    .transition-all { transition: all 0.3s ease; }
    .bg-blue-600 { background-color: #2563eb; }
    .text-white { color: white; }
    .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .bg-white { background-color: white; }
    .text-slate-600 { color: #475569; }
    .border { border: 1px solid #e2e8f0; }
    .bg-indigo-600 { background-color: #4f46e5; }
    .max-w-md { max-width: 28rem; }
    .rounded-2xl { border-radius: 1rem; }
    .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .border-slate-200 { border-color: #e2e8f0; }
    .p-8 { padding: 2rem; }
    .text-xl { font-size: 1.25rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .text-indigo-500 { color: #6366f1; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .w-full { width: 100%; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .outline-none { outline: none; }
    .focus\\:ring-2:focus { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5); }
    .focus\\:ring-indigo-500:focus { --tw-ring-color: #6366f1; }
    .text-left { text-align: left; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .gap-8 { gap: 2rem; }
    .lg\\:col-span-1 { grid-column: span 1 / span 1; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .sticky { position: sticky; }
    .top-8 { top: 2rem; }
    .text-xl { font-size: 1.25rem; }
    .font-semibold { font-weight: 600; }
    .text-slate-700 { color: #334155; }
    .text-amber-500 { color: #f59e0b; }
    .space-y-5 > * + * { margin-top: 1.25rem; }
    .block { display: block; }
    .text-xs { font-size: 0.75rem; }
    .uppercase { text-transform: uppercase; }
    .mr-1 { margin-right: 0.25rem; }
    .relative { position: relative; }
    .pr-9 { padding-right: 2.25rem; }
    .text-sm { font-size: 0.875rem; }
    .absolute { position: absolute; }
    .right-3 { right: 0.75rem; }
    .top-2\\.5 { top: 0.625rem; }
    .cursor-pointer { cursor: pointer; }
    .hover\\:border-blue-500:hover { border-color: #3b82f6; }
    .w-4 { width: 1rem; }
    .h-4 { height: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .w-72 { width: 18rem; }
    .z-50 { z-index: 50; }
    .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .justify-between { justify-content: space-between; }
    .text-\\[10px\\] { font-size: 10px; }
    .grid-cols-7 { grid-template-columns: repeat(7, minmax(0, 1fr)); }
    .p-2 { padding: 0.5rem; }
    .bg-blue-50 { background-color: #eff6ff; }
    .border-blue-100 { border-color: #dbeafe; }
    .text-blue-700 { color: #1d4ed8; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .w-3 { width: 0.75rem; }
    .h-3 { height: 0.75rem; }
    .lg\\:col-span-2 { grid-column: span 2 / span 2; }
    .overflow-hidden { overflow: hidden; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .p-6 { padding: 1.5rem; }
    .overflow-x-auto { overflow-x: auto; }
    .text-slate-500 { color: #64748b; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .w-12 { width: 3rem; }
    .h-12 { height: 3rem; }
    .text-slate-300 { color: #cbd5e1; }
    .table { display: table; }
    .w-full { width: 100%; }
    .divide-y > * + * { border-top: 1px solid #f1f5f9; }
    .divide-slate-100 > * + * { border-top-color: #f1f5f9; }
    .hover\\:bg-slate-50:hover { background-color: #f8fafc; }
    .transition-colors { transition: background-color 0.3s ease; }
    .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .text-\\[10px\\] { font-size: 10px; }
    .mt-1 { margin-top: 0.25rem; }
    .inline-flex { display: inline-flex; }
    .rounded-full { border-radius: 9999px; }
    .gap-1 { gap: 0.25rem; }
    .text-red-600 { color: #dc2626; }
    .hover\\:bg-red-50:hover { background-color: #fef2f2; }
    .bg-green-50 { background-color: #f0fdf4; }
    .border-green-100 { border-color: #dcfce7; }
    .text-green-700 { color: #15803d; }
    .bg-amber-50 { background-color: #fffbeb; }
    .border-amber-100 { border-color: #fef3c7; }
    .text-amber-700 { color: #b45309; }
    .bg-red-50 { background-color: #fef2f2; }
    .border-red-100 { border-color: #fee2e2; }
    .text-red-700 { color: #b91c1c; }
    .gap-4 { gap: 1rem; }
    .mt-8 { margin-top: 2rem; }
    .border-indigo-200 { border-color: #c7d2fe; }
    .hover\\:shadow-sm:hover { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
    .pt-3 { padding-top: 0.75rem; }
    .border-t { border-top: 1px solid #e2e8f0; }
    .border-slate-100 { border-color: #f1f5f9; }
    .p-1 { padding: 0.25rem; }
    .text-slate-400 { color: #94a3b8; }
    .hover\\:text-red-600:hover { color: #dc2626; }
    .rounded { border-radius: 0.25rem; }
    .bg-indigo-600 { background-color: #4f46e5; }
    .hover\\:bg-indigo-700:hover { background-color: #4338ca; }
    .bg-amber-600 { background-color: #d97706; }
    .hover\\:bg-amber-700:hover { background-color: #b45309; }
    .bg-slate-100 { background-color: #f1f5f9; }
    .hover\\:bg-slate-200:hover { background-color: #e2e8f0; }
    .pl-10 { padding-left: 2.5rem; }
    .w-48 { width: 12rem; }
    .transform { transform: translate(var(--tw-translate-x), var(--tw-translate-y)); }
    -translate-y-1\\/2 { --tw-translate-y: -50%; }
    .top-1\\/2 { top: 50%; }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-right" dir="rtl">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8 text-center space-y-4">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center justify-center gap-3">
              <Clock4 className="text-blue-600 w-8 h-8" /> حجز الحصص والطلاب
            </h1>
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => setActiveTab('sessions')} 
                className={`px-6 py-2 rounded-full font-medium transition-all ${activeTab === 'sessions' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border'}`}
              >
                إدارة الحصص
              </button>
              <button 
                onClick={() => setActiveTab('add-student')} 
                className={`px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${activeTab === 'add-student' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border'}`}
              >
                <UserPlus size={18} /> إضافة طالب
              </button>
            </div>
          </header>

          {activeTab === 'add-student' ? (
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                <UserPlus className="text-indigo-500" /> تسجيل طالب جديد
              </h2>
              <form onSubmit={handleAddStudent} className="space-y-4 text-right">
                <input 
                  type="text" 
                  placeholder="اسم الطالب" 
                  required 
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                  value={studentForm.name} 
                  onChange={e => setStudentForm({...studentForm, name: e.target.value})} 
                />
                <input 
                  type="tel" 
                  placeholder="رقم الهاتف" 
                  required 
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-left" 
                  value={studentForm.phone} 
                  onChange={e => setStudentForm({...studentForm, phone: e.target.value})} 
                />
                <input 
                  type="email" 
                  placeholder="البريد الإلكتروني" 
                  required 
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-left" 
                  value={studentForm.email} 
                  onChange={e => setStudentForm({...studentForm, email: e.target.value})} 
                />
                <button 
                  type="submit" 
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700"
                >
                  حفظ الطالب
                </button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Section */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-8">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-700">
                    {formData.isEditing ? <Edit3 className="text-amber-500" /> : <PlusCircle className="text-blue-500" />}
                    {formData.isEditing ? 'تعديل الحصة' : 'حجز حصة جديدة'}
                  </h2>
                  
                  <form onSubmit={handleSubmitSession} className="space-y-5">
                    {/* Subject Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">اسم المادة</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          required 
                          placeholder="مثال: رياضيات، لغة عربية..." 
                          className="w-full px-3 py-2 pr-9 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                          value={formData.subject} 
                          onChange={e => setFormData({...formData, subject: e.target.value})} 
                        />
                        <BookOpen size={16} className="absolute right-3 top-2.5 text-slate-400" />
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div className="relative" ref={calendarRef}>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">التاريخ</label>
                      <div 
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 bg-white"
                      >
                        <span className={formData.date ? "text-slate-800 text-sm" : "text-slate-400 text-sm"}>
                          {formData.date || 'اختر من التقويم'}
                        </span>
                        <CalendarIcon className="text-slate-400 w-4 h-4" />
                      </div>
                      
                      {isCalendarOpen && (
                        <div className="absolute z-50 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 right-0">
                          <div className="flex justify-between items-center mb-4 text-sm font-bold">
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>
                              <ChevronRight size={18} />
                            </button>
                            <span>{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
                            <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>
                              <ChevronLeft size={18} />
                            </button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-2 text-slate-400 font-bold">
                            {['أحد', 'نثن', 'ثلاث', 'ربع', 'خمس', 'جمعة', 'سبت'].map(d => <div key={d}>{d}</div>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => <div key={i}></div>)}
                            {Array.from({ length: daysInMonth(viewDate.getFullYear(), viewDate.getMonth()) }).map((_, i) => {
                              const d = i + 1;
                              const formattedDate = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
                              return (
                                <div 
                                  key={i} 
                                  onClick={() => { 
                                    setFormData({...formData, date: formattedDate}); 
                                    setIsCalendarOpen(false); 
                                  }} 
                                  className={`p-2 rounded-lg cursor-pointer text-xs transition-colors text-center ${
                                    formData.date === formattedDate ? 'bg-blue-600 text-white font-bold' : 'hover:bg-blue-50 text-slate-600'
                                  }`}
                                >
                                  {d}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Pickers */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative" ref={startRef}>
                        <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">البداية</label>
                        <div 
                          onClick={() => setIsStartTimeOpen(!isStartTimeOpen)} 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 bg-white"
                        >
                          <span className={formData.startTime ? "text-slate-800 text-sm" : "text-slate-400 text-sm"}>
                            {formData.startTime || '00:00'}
                          </span>
                          <Clock className="text-slate-400 w-3 h-3" />
                        </div>
                        {isStartTimeOpen && (
                          <TimePickerPopup 
                            current={formData.startTime} 
                            onSelect={v => setFormData({...formData, startTime: v})} 
                            onClose={() => setIsStartTimeOpen(false)} 
                          />
                        )}
                      </div>

                      <div className="relative" ref={endRef}>
                        <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">النهاية</label>
                        <div 
                          onClick={() => setIsEndTimeOpen(!isEndTimeOpen)} 
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer hover:border-blue-500 bg-white"
                        >
                          <span className={formData.endTime ? "text-slate-800 text-sm" : "text-slate-400 text-sm"}>
                            {formData.endTime || '00:00'}
                          </span>
                          <Clock className="text-slate-400 w-3 h-3" />
                        </div>
                        {isEndTimeOpen && (
                          <TimePickerPopup 
                            current={formData.endTime} 
                            onSelect={v => setFormData({...formData, endTime: v})} 
                            onClose={() => setIsEndTimeOpen(false)} 
                          />
                        )}
                      </div>
                    </div>

                    {/* Duration Display */}
                    {formData.startTime && formData.endTime && calculateDuration(formData.startTime, formData.endTime) > 0 && (
                      <div className="bg-blue-50 p-2 rounded-lg text-center text-blue-700 text-xs font-bold border border-blue-100">
                        المدة: {formatDuration(calculateDuration(formData.startTime, formData.endTime))}
                      </div>
                    )}

                    {/* Student Search */}
                    <div className="relative" ref={dropdownRef}>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">اختيار الطالب</label>
                      <div 
                        onClick={() => setIsSearchOpen(!isSearchOpen)} 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg flex items-center justify-between bg-white cursor-pointer hover:border-blue-400"
                      >
                        <span className={formData.studentId ? "text-slate-800 text-sm" : "text-slate-400 text-sm"}>
                          {students.find(s => s.id === formData.studentId)?.name || 'ابحث عن اسم الطالب...'}
                        </span>
                        <ChevronDown size={16} className="text-slate-400" />
                      </div>
                      
                      {isSearchOpen && (
                        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
                          <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
                            <Search size={14} className="text-slate-400" />
                            <input 
                              autoFocus 
                              type="text" 
                              placeholder="ابحث..." 
                              className="w-full bg-transparent outline-none text-sm" 
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              onClick={e => e.stopPropagation()} 
                            />
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {filteredStudents.map(s => (
                              <div 
                                key={s.id} 
                                onClick={() => { 
                                  setFormData({...formData, studentId: s.id}); 
                                  setIsSearchOpen(false); 
                                }} 
                                className="px-4 py-2 text-sm cursor-pointer hover:bg-blue-50 border-b last:border-0"
                              >
                                <div className="font-bold">{s.name}</div>
                                <div className="text-[10px] text-slate-400">{s.phone}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lecturer Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">المحاضر</label>
                      <select 
                        required 
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        value={formData.lecturer} 
                        onChange={e => setFormData({...formData, lecturer: e.target.value})}
                      >
                        <option value="">اختر المحاضر</option>
                        {lecturers.map((lecturer, index) => (
                          <option key={index} value={lecturer}>{lecturer}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Selection */}
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1 mr-1 uppercase">حالة الحصة</label>
                      <div className="grid grid-cols-3 gap-2">
                        {statusOptions.map((status) => (
                          <button
                            key={status.value}
                            type="button"
                            onClick={() => setFormData({...formData, status: status.value})}
                            className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                              formData.status === status.value ? `${status.color} border-current` : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {status.icon}
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="pt-4">
                      <button 
                        type="submit" 
                        className={`w-full py-3 rounded-xl font-bold text-white ${
                          formData.isEditing ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {formData.isEditing ? 'تحديث الحصة' : 'حجز حصة جديدة'}
                      </button>
                      
                      {formData.isEditing && (
                        <button 
                          type="button"
                          onClick={() => setFormData({ 
                            date: '', 
                            startTime: '', 
                            endTime: '', 
                            lecturer: '', 
                            studentId: '', 
                            subject: '', 
                            status: 'مجدولة', 
                            isEditing: false, 
                            editId: null 
                          })}
                          className="w-full mt-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Quick Stats */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 text-slate-700">إحصائيات سريعة</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <div className="text-2xl font-bold text-blue-700">{sessions.length}</div>
                      <div className="text-xs text-blue-500">إجمالي الحصص</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-2xl font-bold text-green-700">
                        {sessions.filter(s => s.status === 'منتهية').length}
                      </div>
                      <div className="text-xs text-green-500">حصص منتهية</div>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                      <div className="text-2xl font-bold text-amber-700">
                        {sessions.filter(s => s.status === 'مجدولة').length}
                      </div>
                      <div className="text-xs text-amber-500">حصص مجدولة</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="text-2xl font-bold text-red-700">
                        {sessions.filter(s => s.status === 'ملغية').length}
                      </div>
                      <div className="text-xs text-red-500">حصص ملغية</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sessions List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold text-slate-700">الحصص المجدولة</h2>
                      <div className="relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                          type="text" 
                          placeholder="ابحث في الحصص..." 
                          className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-48"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {loading ? (
                      <div className="p-8 text-center text-slate-500">جاري تحميل الحصص...</div>
                    ) : sessions.length === 0 ? (
                      <div className="p-8 text-center">
                        <AlertCircle className="mx-auto text-slate-300 w-12 h-12 mb-3" />
                        <p className="text-slate-500">لا توجد حصص مضافة بعد</p>
                        <p className="text-sm text-slate-400 mt-1">ابدأ بإضافة حصة جديدة</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">الطالب</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">المادة</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">التاريخ</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">الوقت</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">المحاضر</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">الحالة</th>
                              <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase">الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sessions.map((session) => {
                              const statusConfig = statusOptions.find(s => s.value === session.status) || statusOptions[0];
                              return (
                                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-4 px-4">
                                    <div>
                                      <div className="font-medium text-slate-800">{session.studentName}</div>
                                      <div className="text-xs text-slate-500 mt-1">{session.studentPhone}</div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-slate-700 font-medium">{session.subject}</td>
                                  <td className="py-4 px-4">
                                    <div className="text-slate-700">{session.date}</div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span className="text-slate-700">{session.startTime} - {session.endTime}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{formatDuration(session.duration)}</div>
                                  </td>
                                  <td className="py-4 px-4 text-slate-700">{session.lecturer}</td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.color}`}>
                                      {statusConfig.icon}
                                      {session.status}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setFormData({
                                            date: session.date,
                                            startTime: session.startTime,
                                            endTime: session.endTime,
                                            lecturer: session.lecturer,
                                            studentId: session.studentId,
                                            subject: session.subject,
                                            status: session.status,
                                            isEditing: true,
                                            editId: session.id
                                          });
                                          setActiveTab('sessions');
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="تعديل"
                                      >
                                        <Edit3 size={16} />
                                      </button>
                                      <button
                                        onClick={async () => {
                                          if (window.confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
                                            try {
                                              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', session.id));
                                            } catch (err) {
                                              console.error("Error deleting session:", err);
                                              alert("حدث خطأ أثناء حذف الحصة");
                                            }
                                          }
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="حذف"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  
                  {sessions.length > 0 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
                      <div>عرض {sessions.length} حصة</div>
                      <div className="flex gap-4">
                        <div>إجمالي الطلاب: {students.length}</div>
                        <div>إجمالي المدة: {formatDuration(sessions.reduce((acc, s) => acc + (s.duration || 0), 0))}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Students List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mt-8 p-6">
                  <h3 className="text-xl font-semibold mb-6 text-slate-700 flex items-center gap-2">
                    <Users className="text-indigo-500" /> قائمة الطلاب ({students.length})
                  </h3>
                  {students.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <User className="mx-auto text-slate-300 w-12 h-12 mb-3" />
                      <p>لا يوجد طلاب مسجلين بعد</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {students.map((student) => (
                        <div key={student.id} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-bold text-slate-800">{student.name}</div>
                            <button
                              onClick={async () => {
                                if (window.confirm('هل أنت متأكد من حذف هذا الطالب؟')) {
                                  try {
                                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id));
                                  } catch (err) {
                                    console.error("Error deleting student:", err);
                                    alert("حدث خطأ أثناء حذف الطالب");
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="حذف الطالب"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone size={14} className="text-slate-400" />
                              {student.phone}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Mail size={14} className="text-slate-400" />
                              {student.email}
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500">
                              حصص هذا الطالب: {sessions.filter(s => s.studentId === student.id).length}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default App;