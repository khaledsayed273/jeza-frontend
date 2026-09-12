import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'wouter';
import { api } from '../lib/api';
import html2canvas from 'html2canvas';

type ApiQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

type FlatQuizQuestion = {
  category: string;
  color: string;
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
  source: string;
};

function flattenQuizData(apiData: { categories: Array<{ id: string; title: string; color?: string; questions: ApiQuizQuestion[] }> }): FlatQuizQuestion[] {
  const result: FlatQuizQuestion[] = [];
  const optionKeys = ['أ', 'ب', 'ج', 'د'];
  for (const cat of apiData.categories) {
    for (const q of cat.questions) {
      const opts: Record<string, string> = {};
      q.options.forEach((o, i) => { opts[optionKeys[i] || `#${i+1}`] = o; });
      result.push({
        category: cat.title,
        color: cat.color || 'purple',
        question: q.question,
        options: opts,
        correct: q.options[q.correctAnswer] || '',
        explanation: q.explanation || '',
        source: '',
      });
    }
  }
  return result;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getRandomQuestions(allQuestions: FlatQuizQuestion[]) {
  return shuffle(allQuestions).slice(0, 5);
}

const SCORE_PER_QUESTION = 20;
const TIMER_SECONDS = 10;
const TIMER_DELAY_SECONDS = 3;
const LEADERBOARD_KEY = 'labor_law_quiz_leaderboard_v3';
const PARTICIPANTS_KEY = 'labor_law_quiz_participants_v1';
const CERTIFICATES_KEY = 'labor_law_quiz_certificates_v1';

function getParticipantsCount(): number {
  try { return parseInt(localStorage.getItem(PARTICIPANTS_KEY) || '0', 10); } catch { return 0; }
}
function incrementParticipants(): number {
  const n = getParticipantsCount() + 1;
  try { localStorage.setItem(PARTICIPANTS_KEY, String(n)); } catch {}
  return n;
}
function getCertificatesCount(): number {
  try { return parseInt(localStorage.getItem(CERTIFICATES_KEY) || '0', 10); } catch { return 0; }
}
function incrementCertificates(): number {
  const n = getCertificatesCount() + 1;
  try { localStorage.setItem(CERTIFICATES_KEY, String(n)); } catch {}
  return n;
}

interface LeaderboardEntry {
  name: string;
  totalScore: number;
  attempts: number;
  bestScore: number;
  date: string;
}

function getLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToLeaderboard(name: string, score: number): LeaderboardEntry[] {
  const board = getLeaderboard();
  const existing = board.find(e => e.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) {
    existing.attempts += 1;
    existing.totalScore += score;
    if (score > existing.bestScore) existing.bestScore = score;
    existing.date = new Date().toLocaleDateString('ar-SA');
  } else {
    board.push({
      name: name.trim(),
      totalScore: score,
      attempts: 1,
      bestScore: score,
      date: new Date().toLocaleDateString('ar-SA'),
    });
  }
  board.sort((a, b) => b.bestScore - a.bestScore || b.totalScore - a.totalScore);
  const top10 = board.slice(0, 10);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(top10));
  return top10;
}

// دائرة النتيجة SVG
function ScoreCircle({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  let color1 = '#22c55e';
  let color2 = '#16a34a';
  if (pct < 40) { color1 = '#ef4444'; color2 = '#dc2626'; }
  else if (pct < 70) { color1 = '#f59e0b'; color2 = '#d97706'; }

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-pink-200 font-medium tracking-wider">نتيجة التقييم الذاتي</p>
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e1b4b" strokeWidth="14" />
          <circle
            cx="80" cy="80" r={radius} fill="none"
            stroke="url(#scoreGrad)" strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-white">{pct}%</span>
          <span className="text-xs text-pink-300">{score}/{total}</span>
        </div>
      </div>
      <p className="text-xs text-white/50">
        {pct === 100 ? '🏆 إجابات صحيحة بالكامل!' : pct >= 70 ? '✅ أداء جيد' : pct >= 40 ? '⚠️ تحتاج مراجعة' : '❌ راجع المادة النظامية'}
      </p>
    </div>
  );
}

// شهادة احترافية - تصميم أبيض ذهبي
function Certificate({ name, score, total, date }: { name: string; score: number; total: number; date: string }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = pct >= 60;
  return (
    <div style={{
      background: '#fff',
      width: '620px',
      minHeight: '440px',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
      borderRadius: '4px',
      direction: 'ltr',
    }}>
      {/* إطار ذهبي خارجي */}
      <div style={{
        position: 'absolute', inset: '6px',
        border: '2.5px solid #c9a84c',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
      {/* إطار ذهبي داخلي */}
      <div style={{
        position: 'absolute', inset: '12px',
        border: '1px solid #e8c97a',
        pointerEvents: 'none',
        zIndex: 10,
      }} />
      {/* زخارف الزوايا */}
      {[
        { top: 2, left: 2, transform: 'none' },
        { top: 2, right: 2, transform: 'scaleX(-1)' },
        { bottom: 2, left: 2, transform: 'scaleY(-1)' },
        { bottom: 2, right: 2, transform: 'scale(-1,-1)' },
      ].map((pos, i) => (
        <svg key={i} width="60" height="60" viewBox="0 0 60 60" style={{ position: 'absolute', ...pos, zIndex: 11 }}>
          <path d="M2,2 L20,2 M2,2 L2,20" stroke="#c9a84c" strokeWidth="2" fill="none"/>
          <path d="M2,2 L12,2 L12,8 L8,8 L8,12 L2,12 Z" fill="none" stroke="#c9a84c" strokeWidth="1"/>
          <circle cx="14" cy="14" r="3" fill="none" stroke="#c9a84c" strokeWidth="1"/>
          <path d="M17,2 Q22,7 27,2 Q22,7 27,12 Q22,7 17,12 Q22,7 17,2" fill="none" stroke="#e8c97a" strokeWidth="0.8" opacity="0.7"/>
        </svg>
      ))}
      {/* المحتوى الداخلي */}
      <div style={{ padding: '24px 40px 20px', position: 'relative', zIndex: 5 }}>
        {/* الهيدر - اللوغو والعنوان */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          {/* لوغو مواكبة الأصلي - يسار */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <img
              src="/assets/mawakaba_logo_6274832c.webp"
              alt="مواكبة"
              style={{ width: '52px', height: '52px', objectFit: 'contain' }}
            />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '8px', fontWeight: '700', color: '#8b6914', margin: 0, letterSpacing: '1px', fontFamily: 'Arial' }}>MAWAKABA</p>
              <p style={{ fontSize: '6px', color: '#a07820', margin: 0, fontFamily: 'Arial' }}>HR SOLUTIONS</p>
            </div>
          </div>
          {/* العنوان الأوسط */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ fontSize: '9px', letterSpacing: '3px', color: '#c9a84c', margin: '0 0 2px', fontFamily: 'Arial', fontWeight: '600' }}>SAUDI LABOR LAW</p>
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)', margin: '4px auto', width: '120px' }}/>
          </div>
          {/* مساحة يمين */}
          <div style={{ width: '80px' }}/>
        </div>
        {/* عنوان الشهادة */}
        <div style={{ textAlign: 'center', margin: '8px 0 12px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '900',
            color: '#1a1a1a',
            margin: '0 0 2px',
            letterSpacing: '2px',
            fontFamily: "'Georgia', serif",
            textTransform: 'uppercase',
          }}>CERTIFICATE</h1>
          <p style={{
            fontSize: '11px',
            letterSpacing: '4px',
            color: '#8b6914',
            margin: '0 0 4px',
            fontFamily: 'Arial',
          }}>OF COMPLETION</p>
          <div style={{ height: '1.5px', background: 'linear-gradient(90deg, transparent, #c9a84c 20%, #c9a84c 80%, transparent)', margin: '0 auto', width: '200px' }}/>
        </div>
        {/* نص الشهادة */}
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <p style={{ fontSize: '10px', color: '#555', margin: '0 0 6px', letterSpacing: '1px', fontFamily: 'Arial' }}>PROUDLY PRESENTED TO:</p>
          {/* اسم المتدرب */}
          <div style={{ position: 'relative', display: 'inline-block', margin: '4px 0 8px' }}>
            <p style={{
              fontSize: '26px',
              fontWeight: '700',
              color: '#1a1a1a',
              margin: 0,
              fontFamily: "'Georgia', serif",
              letterSpacing: '1px',
            }}>{name}</p>
            <div style={{ height: '2px', background: 'linear-gradient(90deg, #c9a84c, #e8c97a, #c9a84c)', borderRadius: '1px', marginTop: '2px' }}/>
          </div>
          <p style={{
            fontSize: '10px',
            color: '#444',
            margin: '6px auto 0',
            maxWidth: '380px',
            lineHeight: '1.6',
            fontFamily: 'Arial',
          }}>
            has successfully completed the Saudi Labor Law quiz<br/>
            with a score of <strong style={{ color: passed ? '#2d7a3a' : '#c9a84c' }}>{pct}%</strong> — {passed ? 'PASSED ✓' : 'NEEDS REVIEW'}
          </p>
          <p style={{ fontSize: '9px', color: '#888', margin: '4px 0 0', fontFamily: 'Arial' }}>Date: {date}</p>
        </div>
        {/* الفوتر - التوقيع والختم */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #e8c97a',
        }}>
          {/* توقيع جزاء البقمي - يسار */}
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            {/* التوقيع الحقيقي لجزاء البقمي - مستخرج من صورة عقد جسر */}
            <svg width="130" height="60" viewBox="0 0 130 60" style={{ display: 'block', margin: '0 auto' }}>
              {/* الحركة الأولى - صعود مائل للأعلى */}
              <path d="M8,45 C12,40 16,32 22,26 C26,22 30,20 34,22 C38,24 36,32 40,30"
                stroke="#4a0a1a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {/* الحركة الثانية - حلقة وسطى */}
              <path d="M40,30 C44,28 48,22 52,20 C56,18 60,20 62,24 C64,28 62,34 66,32 C70,30 72,24 76,22"
                stroke="#4a0a1a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {/* الحركة الثالثة - انحناء كبير للأعلى */}
              <path d="M76,22 C80,18 84,14 90,16 C96,18 94,28 98,26 C102,24 104,18 108,16 C112,14 116,18 118,24 C120,28 118,34 116,38"
                stroke="#4a0a1a" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              {/* خط ذيل التوقيع */}
              <path d="M116,38 C114,42 110,46 104,47 C96,48 80,46 60,47 C44,48 28,47 16,48"
                stroke="#4a0a1a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              {/* نقطة في بداية التوقيع */}
              <circle cx="8" cy="45" r="1.5" fill="#4a0a1a"/>
              {/* خط أفقي قصير في المنتصف */}
              <path d="M50,36 C60,35 70,35 80,36"
                stroke="#4a0a1a" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5"/>
            </svg>
            <div style={{ borderTop: '1px solid #c9a84c', paddingTop: '4px', marginTop: '2px' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a', margin: '0', letterSpacing: '1px', fontFamily: 'Arial' }}>JZA AL BAQAMI</p>
              <p style={{ fontSize: '7px', color: '#888', margin: '1px 0 0', fontFamily: 'Arial' }}>COURSE INSTRUCTOR</p>
            </div>
          </div>
          {/* ختم مواكبة - أسود مع شعار حقيقي */}
          <div style={{ textAlign: 'center', position: 'relative', width: '90px', height: '90px' }}>
            {/* الدائرة الخارجية */}
            <svg width="90" height="90" viewBox="0 0 90 90" style={{ position: 'absolute', top: 0, left: 0 }}>
              <circle cx="45" cy="45" r="43" fill="#111" stroke="#333" strokeWidth="2"/>
              <circle cx="45" cy="45" r="36" fill="#1a1a1a" stroke="#444" strokeWidth="1"/>
              <circle cx="45" cy="45" r="29" fill="#111" stroke="#555" strokeWidth="0.5" strokeDasharray="2 2"/>
              <path id="sealTopArc" d="M 8,45 A 37,37 0 0,1 82,45" fill="none"/>
              <text fontSize="6" fill="#ccc" fontFamily="Arial" fontWeight="bold" letterSpacing="1.5">
                <textPath href="#sealTopArc" startOffset="3%">MAWAKABA • HR SOLUTIONS</textPath>
              </text>
              <path id="sealBottomArc" d="M 8,45 A 37,37 0 0,0 82,45" fill="none"/>
              <text fontSize="5.5" fill="#aaa" fontFamily="Arial" letterSpacing="1">
                <textPath href="#sealBottomArc" startOffset="8%">SAUDI ARABIA • ١٤٤٦</textPath>
              </text>
              <text x="22" y="47" textAnchor="middle" fontSize="5" fill="#666">★</text>
              <text x="68" y="47" textAnchor="middle" fontSize="5" fill="#666">★</text>
            </svg>
            {/* شعار مواكبة الحقيقي في المنتصف */}
            <img
              src="/assets/mawakaba_logo_6274832c.webp"
              alt="مواكبة"
              style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '38px', height: '38px',
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)',
                marginTop: '-3px',
              }}
            />
          </div>
          {/* يمين - مواكبة */}
          <div style={{ textAlign: 'center', minWidth: '140px' }}>
            <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '18px', fontWeight: '900', color: '#c9a84c', margin: '0', letterSpacing: '2px', fontFamily: 'Arial' }}>مواكبة</p>
                <p style={{ fontSize: '7px', color: '#888', margin: '2px 0 0', letterSpacing: '0.5px', fontFamily: 'Arial' }}>MAWAKABA PLATFORM</p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #c9a84c', paddingTop: '4px', marginTop: '2px' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', color: '#1a1a1a', margin: '0', letterSpacing: '1px', fontFamily: 'Arial' }}>MAWAKABA</p>
              <p style={{ fontSize: '7px', color: '#888', margin: '1px 0 0', fontFamily: 'Arial' }}>HR DEVELOPMENT</p>
            </div>
          </div>
        </div>
      </div>
      {/* QR Code للتحقق من الشهادة */}
      <div style={{ position: 'absolute', bottom: '18px', right: '22px', zIndex: 12, textAlign: 'center' }}>
        <QRCodeSVG
          value="https://jeza-saudiz-2vujls9j.manus.space"
          size={48}
          bgColor="#ffffff"
          fgColor="#1a1a1a"
          level="M"
        />
        <p style={{ fontSize: '6px', color: '#999', margin: '2px 0 0', fontFamily: 'Arial', letterSpacing: '0.3px' }}>تحقق من الشهادة</p>
      </div>
    </div>
  );
}

export default function LaborLawQuizPage() {
  const quizQuery = api.quiz.getAll.useQuery();
  const allQuizQuestions = useMemo(
    () => (quizQuery.data ? flattenQuizData(quizQuery.data as any) : []),
    [quizQuery.data],
  );
  const [step, setStep] = useState<'intro' | 'quiz' | 'result'>('intro');
  const [userName, setUserName] = useState('');
  const [questions, setQuestions] = useState<FlatQuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<{
    question: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
    timedOut: boolean;
    explanation: string;
    source: string;
  }[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDelaying, setTimerDelaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [certificatesCount, setCertificatesCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLeaderboard(getLeaderboard());
    setParticipantsCount(getParticipantsCount());
    setCertificatesCount(getCertificatesCount());
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (delayRef.current) { clearTimeout(delayRef.current); delayRef.current = null; }
    setTimerActive(false);
    setTimerDelaying(false);
  }, []);

  const startTimerWithDelay = useCallback(() => {
    setTimerDelaying(true);
    setTimeLeft(TIMER_SECONDS);
    delayRef.current = setTimeout(() => {
      setTimerDelaying(false);
      setTimerActive(true);
    }, TIMER_DELAY_SECONDS * 1000);
  }, []);

  useEffect(() => {
    if (!timerActive) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          setSelected('__timeout__');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, stopTimer]);

  const startQuiz = () => {
    if (!userName.trim()) return;
    if (allQuizQuestions.length === 0) return;
    const qs = getRandomQuestions(allQuizQuestions);
    setQuestions(qs);
    setCurrent(0);
    setSelected(null);
    setAnswers([]);
    setScore(0);
    startTimerWithDelay();
    setStep('quiz');
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    stopTimer();
    setSelected(option);
  };

  const handleNext = () => {
    if (selected === null) return;
    const q = questions[current];
    const isTimedOut = selected === '__timeout__';
    const isCorrect = !isTimedOut && selected === q.correct;
    const newAnswers = [...answers, {
      question: q.question,
      selected: isTimedOut ? '(انتهى الوقت)' : selected,
      correct: q.correct,
      isCorrect,
      timedOut: isTimedOut,
      explanation: q.explanation || '',
      source: q.source || '',
    }];
    const newScore = score + (isCorrect ? SCORE_PER_QUESTION : 0);
    setAnswers(newAnswers);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      startTimerWithDelay();
      setScore(newScore);
    } else {
      setScore(newScore);
      stopTimer();
      const updated = saveToLeaderboard(userName, newScore);
      setLeaderboard(updated);
      // زيادة عداد الشهادات إذا اجتاز 60%
      const pctFinal = Math.round((newScore / (questions.length * SCORE_PER_QUESTION)) * 100);
      if (pctFinal >= 60) setCertificatesCount(incrementCertificates());
      setStep('result');
    }
  };

  const restart = () => {
    stopTimer();
    setStep('intro');
    setUserName('');
    setSelected(null);
    setAnswers([]);
    setScore(0);
    setLeaderboard(getLeaderboard());
  };

  const shareQuiz = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: 'اختبار نظام العمل السعودي', text: `اختبر معرفتك بنظام العمل السعودي مع أ. جزاء البقمي 🎓\n${url}`, url }); } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch { /* not available */ }
    }
  };

  const printCert = () => {
    const printContent = certRef.current?.innerHTML;
    if (!printContent) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><meta charset="utf-8"/><title>شهادة إتمام - مواكبة</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: Georgia, serif;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff; }
    .no-print { display: none !important; }
  }
</style>
</head><body>${printContent}</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); w.close(); }, 800);
  };

  const exportCertPng = async () => {
    if (!certRef.current) return;
    const el = certRef.current.firstElementChild as HTMLElement;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `شهادة-مواكبة-${userName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      printCert();
    }
  };

  const timerPercent = (timeLeft / TIMER_SECONDS) * 100;
  const timerColor = timeLeft > 6 ? '#22c55e' : timeLeft > 3 ? '#f59e0b' : '#ef4444';
  const today = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  // ==================== صفحة البداية ====================
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col" dir="rtl">
        <nav className="border-b border-white/10 bg-[#0d1326]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              الرئيسية
            </Link>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs transition-all border border-pink-500/30">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                المتصدرون
              </button>
              <button onClick={shareQuiz} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs transition-all border border-pink-500/30">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {copied ? 'تم النسخ!' : 'مشاركة'}
              </button>
            </div>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-pink-500/20 border border-pink-500/40 mb-4">
                <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">اختبار نظام العمل السعودي</h1>
              <p className="text-white/50 text-sm">أ. جزاء البقمي | ٥ أسئلة عشوائية | ١٠ ثواني لكل سؤال</p>
            </div>

            <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6">
              <label className="block text-sm text-pink-200 mb-2 font-medium">اسمك الكريم</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startQuiz()}
                placeholder="أدخل اسمك لحفظ نتيجتك..."
                className="w-full bg-white/5 border border-pink-500/30 rounded-xl px-4 py-3 text-white placeholder-white/30 text-sm focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400/30 transition-all"
              />
              <button
                onClick={startQuiz}
                disabled={!userName.trim()}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white font-bold text-sm hover:from-pink-500 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-pink-500/20"
              >
                ابدأ الاختبار
              </button>
            </div>

            {/* عدادات ديناميكية */}
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {/* عداد الأسئلة */}
              <div className="bg-white/5 border border-pink-500/20 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 to-transparent pointer-events-none" />
                <p className="text-pink-300 font-black text-lg leading-none">٥٠٠</p>
                <p className="text-white/40 text-xs mt-1">سؤال متاح</p>
              </div>
              {/* عداد المشاركين */}
              <div className="bg-white/5 border border-amber-500/20 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
                <p className="text-amber-300 font-black text-lg leading-none tabular-nums">
                  {participantsCount.toLocaleString('ar-SA')}
                </p>
                <p className="text-white/40 text-xs mt-1">مشارك</p>
              </div>
              {/* عداد الشهادات */}
              <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-3 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                <p className="text-emerald-300 font-black text-lg leading-none tabular-nums">
                  {certificatesCount.toLocaleString('ar-SA')}
                </p>
                <p className="text-white/40 text-xs mt-1">شهادة مُصدَرة</p>
              </div>
            </div>
          </div>
        </div>

        {/* لوحة المتصدرين */}
        {showLeaderboard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowLeaderboard(false)}>
            <div className="bg-[#0d1326] border border-pink-500/30 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">🏆 لوحة المتصدرين</h2>
                <button onClick={() => setShowLeaderboard(false)} className="text-white/40 hover:text-white">✕</button>
              </div>
              {leaderboard.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-4">لا توجد نتائج بعد</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((e, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                      <span className={`text-lg font-bold w-6 text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/30'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{e.name}</p>
                        <p className="text-white/40 text-xs">{e.attempts} محاولة • آخر: {e.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-pink-300 font-bold text-sm">{e.bestScore}%</p>
                        <p className="text-white/30 text-xs">مجموع: {e.totalScore}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== صفحة الاختبار ====================
  if (step === 'quiz') {
    const q = questions[current];
    const opts = Object.entries(q.options);
    const isAnswered = selected !== null;

    return (
      <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col" dir="rtl">
        <nav className="border-b border-white/10 bg-[#0d1326]/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
            <span className="text-white/50 text-xs">سؤال {current + 1} من {questions.length}</span>
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < current ? 'bg-pink-400' : i === current ? 'bg-pink-300 scale-125' : 'bg-white/20'}`} />
              ))}
            </div>
            <span className="text-pink-300 text-xs font-bold">{score} نقطة</span>
          </div>
        </nav>

        <div className="flex-1 flex items-start justify-center px-4 py-6">
          <div className="w-full max-w-5xl">
            {/* بطاقة السؤال */}
            <div className="bg-gradient-to-br from-pink-950/60 to-pink-900/30 border border-pink-500/30 rounded-2xl p-5 mb-4 relative overflow-hidden">
              {/* الفئة */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                  {q.category}
                </span>
              </div>

              {/* نص السؤال */}
              <p className="text-white text-xs leading-relaxed font-medium mb-4">{q.question}</p>

              {/* التايمر - في منتصف السؤال */}
              <div className="mb-1">
                {timerDelaying ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-pink-500/30 rounded-full" />
                    </div>
                    <span className="text-white/30 text-xs w-8 text-center">جاهز</span>
                  </div>
                ) : isAnswered ? null : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
                      />
                    </div>
                    <span className="text-xs w-8 text-center font-mono font-bold" style={{ color: timerColor }}>{timeLeft}s</span>
                  </div>
                )}
              </div>
            </div>

            {/* الخيارات */}
            <div className="space-y-1.5">
              {opts.map(([key, val]) => {
                const isCorrect = val === q.correct;
                const isSelected = selected === val;
                const isTimeout = selected === '__timeout__';

                let cls = 'bg-white/5 border-white/15 text-white/80 hover:bg-pink-500/10 hover:border-pink-500/40 cursor-pointer';
                if (isAnswered) {
                  if (isCorrect) cls = 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200';
                  else if (isSelected && !isCorrect) cls = 'bg-red-500/20 border-red-400/60 text-red-200';
                  else cls = 'bg-white/3 border-white/10 text-white/40 cursor-default';
                }

                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(val)}
                    disabled={isAnswered}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-right transition-all text-xs ${cls}`}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border ${isAnswered && isCorrect ? 'bg-emerald-500/30 border-emerald-400/50 text-emerald-300' : isAnswered && isSelected && !isCorrect ? 'bg-red-500/30 border-red-400/50 text-red-300' : 'bg-white/10 border-white/20 text-white/50'}`}>
                      {isAnswered && isCorrect ? '✓' : isAnswered && isSelected && !isCorrect ? '✗' : key}
                    </span>
                    <span className="flex-1 leading-relaxed">{val}</span>
                  </button>
                );
              })}
            </div>

            {/* رسالة انتهاء الوقت */}
            {selected === '__timeout__' && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center">
                ⏰ انتهى الوقت! الإجابة الصحيحة: <strong>{q.correct}</strong>
              </div>
            )}

            {/* زر التالي */}
            {isAnswered && (
              <button
                onClick={handleNext}
                className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white font-bold text-sm hover:from-pink-500 hover:to-pink-400 transition-all shadow-lg shadow-pink-500/20"
              >
                {current + 1 < questions.length ? 'السؤال التالي ←' : 'عرض النتيجة 🏆'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== صفحة النتيجة ====================
  const totalPoints = questions.length * SCORE_PER_QUESTION;
  const myRank = leaderboard.findIndex(e => e.name.trim().toLowerCase() === userName.trim().toLowerCase()) + 1;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white" dir="rtl">
      <nav className="border-b border-white/10 bg-[#0d1326]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={restart} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            إعادة الاختبار
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowLeaderboard(true)} className="px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs border border-pink-500/30 transition-all">
              🏆 المتصدرون
            </button>
            <button onClick={shareQuiz} className="px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 text-xs border border-pink-500/30 transition-all">
              {copied ? '✓ تم النسخ' : '↗ مشاركة'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* دائرة النتيجة */}
        <div className="flex flex-col items-center mb-8">
          <ScoreCircle score={score} total={totalPoints} />
          <p className="text-white/60 text-sm mt-3">مرحباً <span className="text-pink-300 font-bold">{userName}</span></p>
          {myRank > 0 && <p className="text-white/40 text-xs mt-1">ترتيبك: #{myRank} في لوحة المتصدرين</p>}
        </div>

        {/* مراجعة الإجابات مع الشرح */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-pink-500 rounded-full" />
            مراجعة الإجابات مع الشرح النظامي
          </h2>
          <div className="space-y-3">
            {answers.map((a, i) => (
              <div key={i} className={`rounded-xl border p-4 ${a.isCorrect ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-red-500/8 border-red-500/25'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <span className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${a.isCorrect ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'}`}>
                    {a.isCorrect ? '✓' : '✗'}
                  </span>
                  <p className="text-white/80 text-xs leading-relaxed">{a.question}</p>
                </div>
                {!a.isCorrect && (
                  <div className="mr-7 space-y-1">
                    <p className="text-red-300 text-xs">إجابتك: {a.selected}</p>
                    <p className="text-emerald-300 text-xs">الصحيحة: {a.correct}</p>
                  </div>
                )}
                {/* مصدر الإجابة */}
                {!a.isCorrect && a.source && (
                  <div className="mr-7 mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-200 text-xs leading-relaxed">
                      <span className="font-bold text-amber-300">📚 المصدر: </span>
                      {a.source}
                    </p>
                  </div>
                )}
                {/* الشرح النظامي */}
                {!a.isCorrect && a.explanation && (
                  <div className="mr-7 mt-2 p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
                    <p className="text-pink-200 text-xs leading-relaxed">
                      <span className="font-bold text-pink-300">📖 الشرح: </span>
                      {a.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* الشهادة */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-pink-500 rounded-full" />
            شهادة الإتمام
          </h2>
          <div className="overflow-x-auto">
            <div ref={certRef} className="inline-block">
              <Certificate name={userName} score={score} total={totalPoints} date={today} />
            </div>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap justify-center">
            <button
              onClick={exportCertPng}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/35 text-pink-200 text-xs border border-pink-500/40 transition-all font-bold"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              تصدير الشهادة PNG
            </button>
            <button
              onClick={printCert}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs border border-white/15 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة
            </button>
          </div>
        </div>

        {/* لوحة المتصدرين */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-amber-500 rounded-full" />
            لوحة المتصدرين العشرة
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-6">لا توجد نتائج بعد</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((e, i) => {
                const isMe = e.name.trim().toLowerCase() === userName.trim().toLowerCase();
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isMe ? 'bg-pink-500/15 border-pink-500/40' : i === 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-white/4 border-white/10'}`}>
                    <span className="text-base w-7 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/30 text-xs font-bold">{i + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isMe ? 'text-pink-300' : 'text-white'}`}>{e.name} {isMe && '(أنت)'}</p>
                      <p className="text-white/35 text-xs">{e.attempts} محاولة • آخر تحديث: {e.date}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${isMe ? 'text-pink-300' : 'text-amber-300'}`}>{e.bestScore} نقطة</p>
                      <p className="text-white/30 text-xs">مجموع: {e.totalScore}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={restart}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 text-white font-bold text-sm hover:from-pink-500 hover:to-pink-400 transition-all shadow-lg shadow-pink-500/20"
        >
          🔄 اختبار جديد
        </button>
      </div>

      {/* لوحة المتصدرين popup */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowLeaderboard(false)}>
          <div className="bg-[#0d1326] border border-pink-500/30 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">🏆 لوحة المتصدرين</h2>
              <button onClick={() => setShowLeaderboard(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-4">لا توجد نتائج بعد</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((e, i) => {
                  const isMe = e.name.trim().toLowerCase() === userName.trim().toLowerCase();
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-pink-500/15 border border-pink-500/30' : i === 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                      <span className="text-lg font-bold w-6 text-center">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-white/30 text-xs">{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isMe ? 'text-pink-300' : 'text-white'}`}>{e.name}</p>
                        <p className="text-white/40 text-xs">{e.attempts} محاولة • {e.date}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${isMe ? 'text-pink-300' : 'text-amber-300'}`}>{e.bestScore} نقطة</p>
                        <p className="text-white/30 text-xs">مجموع: {e.totalScore}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
