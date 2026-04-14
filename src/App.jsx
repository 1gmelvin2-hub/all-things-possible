import { useState, useEffect, useRef } from "react";

const CLIENTS_KEY   = "atp-clients";
const LOGS_KEY      = "atp-logs";
const MSGS_KEY      = "atp-messages";
const SESSION_KEY   = "atp-session";
const PLANS_KEY     = "atp-plans";
const DESK_KEY      = "atp-desk";
const DESKMOVES_KEY = "atp-deskmoves";
const RATINGS_KEY   = "atp-ratings";
const NUTRITION_KEY  = "atp-nutrition";
const PROGRAM_KEY    = "atp-program";
const BODYSTATS_KEY  = "atp-bodystats";
const GFIT_KEY       = "atp-googlefit";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID||"";
const SHEETS_ID = "1MQn0i-QXvMAOSLsvnBrtycQK9KFdLrvtNAToM10qC-0";
const COACH_PASS     = "ATP2026coach";
const API_KEY       = import.meta.env.VITE_API_KEY||"";
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL||"";
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY||"";

async function sbGet(clientId, key) {
  if(!SUPABASE_URL||!SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/atp_data?client_id=eq.${encodeURIComponent(clientId)}&data_key=eq.${encodeURIComponent(key)}&select=data_value`, {
      headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`}
    });
    const rows = await res.json();
    return rows?.[0]?.data_value ?? null;
  } catch(e) { return null; }
}

async function sbSet(clientId, key, value) {
  if(!SUPABASE_URL||!SUPABASE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/atp_data`, {
      method: "POST",
      headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates"},
      body: JSON.stringify({client_id: clientId, data_key: key, data_value: value, updated_at: new Date().toISOString()})
    });
  } catch(e) {}
}

async function sbGetGlobal(key) {
  if(!SUPABASE_URL||!SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/atp_data?client_id=eq.__global__&data_key=eq.${encodeURIComponent(key)}&select=data_value`, {
      headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`}
    });
    const rows = await res.json();
    return rows?.[0]?.data_value ?? null;
  } catch(e) { return null; }
}

async function sbSetGlobal(key, value) {
  if(!SUPABASE_URL||!SUPABASE_KEY) return;
  try {
    // Check if row exists first
    const check = await fetch(`${SUPABASE_URL}/rest/v1/atp_data?client_id=eq.__global__&data_key=eq.${encodeURIComponent(key)}&select=id`, {
      headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`}
    });
    const rows = await check.json();
    if(rows && rows.length > 0) {
      // Row exists — PATCH it
      await fetch(`${SUPABASE_URL}/rest/v1/atp_data?client_id=eq.__global__&data_key=eq.${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json"},
        body: JSON.stringify({data_value: value, updated_at: new Date().toISOString()})
      });
    } else {
      // Row does not exist — POST it
      await fetch(`${SUPABASE_URL}/rest/v1/atp_data`, {
        method: "POST",
        headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json"},
        body: JSON.stringify({client_id:"__global__", data_key: key, data_value: value, updated_at: new Date().toISOString()})
      });
    }
  } catch(e) { console.error("Supabase sync error:",key,e); }
}
const G = {
  green:"#2d6a4f", greenMid:"#52b788", greenLight:"#b7e4c7",
  mango:"#f4a261", mangoDeep:"#e76f51",
  cream:"#fdf8f0", creamDark:"#f5ede0",
  brown:"#7c5c3a", white:"#ffffff",
  text:"#2c2c2c", textSoft:"#6b5a4a", border:"#e0d0be",
  red:"#dc2626", redLight:"#fee2e2",
};

const RATING_INFO = {
  1:{label:"Too Easy",   color:"#4ade80", msg:"Great news! We'll make your next workout harder."},
  2:{label:"A Bit Easy", color:"#a3e635", msg:"Noted! Three of these in a row and we'll level up."},
  3:{label:"Just Right", color:"#facc15", msg:"Perfect — you're right on track. Keep it up! 🌟"},
  4:{label:"Too Hard",   color:"#fb923c", msg:"Noted! Three of these in a row and we'll ease up."},
  5:{label:"Too Hard",   color:"#f87171", msg:"We'll adjust your plan to be more manageable right away."},
};

function getTargets(weightLbs){
  const protein=Math.round(weightLbs*0.7);
  return {protein, fat:Math.round(weightLbs*0.3), carbs:75, sugar:25, calories:Math.round(weightLbs*10)};
}

function trafficLight(value,target,isLow=false){
  const ratio=value/target;
  if(isLow){ if(ratio>=0.9) return "#4ade80"; if(ratio>=0.7) return "#facc15"; return "#f87171"; }
  else { if(ratio<=0.7) return "#4ade80"; if(ratio<=0.9) return "#facc15"; return "#f87171"; }
}

// Returns true if today is Tuesday (2) or Friday (5)
function isWeighDay(){ const d=new Date().getDay(); return d===2||d===5; }
function getWeighDayName(){ const d=new Date().getDay(); if(d===2) return "Tuesday"; if(d===5) return "Friday"; const next=[2,5].map(t=>(t-d+7)%7).sort((a,b)=>a-b)[0]; return new Date(Date.now()+next*86400000).toLocaleDateString("en-US",{weekday:"long"}); }

const SCRIPTURES=[
  {verse:"I can do all things through Christ who strengthens me.",ref:"Philippians 4:13"},
  {verse:"For I know the plans I have for you, plans to prosper you and not to harm you.",ref:"Jeremiah 29:11"},
  {verse:"She is clothed with strength and dignity; she can laugh at the days to come.",ref:"Proverbs 31:25"},
  {verse:"The Lord is my strength and my shield; my heart trusts in him, and he helps me.",ref:"Psalm 28:7"},
  {verse:"Do you not know that your bodies are temples of the Holy Spirit?",ref:"1 Corinthians 6:19"},
  {verse:"Be strong and courageous. Do not be afraid; do not be discouraged.",ref:"Joshua 1:9"},
  {verse:"Come to me, all you who are weary and burdened, and I will give you rest.",ref:"Matthew 11:28"},
];
const PRAYERS=[
  "Lord, thank You for this body You have given me. Help me to honor it as Your temple today. Give me strength when I am weak, and peace when I am overwhelmed. Guide my steps toward health and wholeness. Amen.",
  "Heavenly Father, as I begin this journey, I surrender my goals to You. Let my motivation be rooted in gratitude for life itself. Remind me that I am fearfully and wonderfully made. Amen.",
  "Lord, on the days when progress feels slow, remind me that You are doing a new thing in me. Give me patience with myself and joy in the small victories. Your timing is perfect. Amen.",
  "Father, quiet my mind today. Help me release stress and anxiety, and fill me with Your peace that surpasses all understanding. Let this time of stillness renew my spirit. Amen.",
];
const DAILY_STRETCHES=[
  {theme:"Neck & Shoulders",stretches:[{name:"Neck Side Tilt",desc:"Slowly tilt your right ear toward your right shoulder. Hold 20 sec. Switch sides.",duration:"40 sec"},{name:"Shoulder Rolls",desc:"Roll both shoulders backward in large slow circles, 10 times. Then forward 10 times.",duration:"45 sec"},{name:"Chin Tucks",desc:"Gently pull your chin straight back. Hold 5 sec, repeat 8 times.",duration:"40 sec"},{name:"Cross-Body Arm Stretch",desc:"Bring one arm across your chest, hold at the elbow for 20 sec. Switch arms.",duration:"40 sec"},{name:"Seated Prayer Hands",desc:"Press palms together at chest. Slowly lower hands until you feel a wrist stretch. Hold 20 sec.",duration:"20 sec"}]},
  {theme:"Hips & Lower Back",stretches:[{name:"Seated Figure-4",desc:"Cross right ankle over left knee. Gently press down on the right knee. Hold 30 sec. Switch.",duration:"60 sec"},{name:"Seated Forward Fold",desc:"Sit at edge of chair, feet flat. Fold forward slowly, arms hang. Hold 30 sec.",duration:"30 sec"},{name:"Knee-to-Chest Pull",desc:"Hug your right knee to your chest. Hold 20 sec. Switch legs.",duration:"40 sec"},{name:"Seated Cat-Cow",desc:"Hands on knees — arch back (cow), then round it (cat). 10 slow cycles.",duration:"60 sec"},{name:"Hip Circle Sways",desc:"Sitting tall, sway hips side to side in slow circles. 10 each direction.",duration:"45 sec"}]},
  {theme:"Full Body Wake-Up",stretches:[{name:"Overhead Reach",desc:"Stand, interlace fingers, reach arms overhead. Lean left then right. Hold 15 sec each.",duration:"30 sec"},{name:"Calf Raises",desc:"Rise on your toes, hold 3 sec, lower slowly. 15 reps.",duration:"45 sec"},{name:"Standing Side Bend",desc:"Feet hip-width. Slide one hand down your leg as you lean sideways. Hold 20 sec. Switch.",duration:"40 sec"},{name:"Torso Twist",desc:"Arms out like a T. Slowly rotate upper body left, then right. 10 reps each side.",duration:"45 sec"},{name:"Forward Bend Hang",desc:"Fold forward slowly, letting arms and head hang. Breathe. Hold 30 sec.",duration:"30 sec"}]},
  {theme:"Chest & Spine",stretches:[{name:"Chest Opener",desc:"Interlace fingers behind back. Squeeze shoulder blades, lift chest. Hold 20 sec.",duration:"20 sec"},{name:"Seated Spinal Twist",desc:"Sit sideways on chair. Hold the back with both hands, gently twist. Hold 20 sec each side.",duration:"40 sec"},{name:"Wall Angel",desc:"Arms at 90° against wall. Slowly slide arms overhead, keeping wall contact. 10 reps.",duration:"60 sec"},{name:"Door Frame Stretch",desc:"Forearms on each side of doorway, lean forward gently. Hold 30 sec.",duration:"30 sec"},{name:"Seated Row Squeeze",desc:"Arms extended forward. Pull elbows back, squeeze shoulder blades. Hold 5 sec. 10 reps.",duration:"45 sec"}]},
  {theme:"Legs & Circulation",stretches:[{name:"Seated Leg Extension",desc:"Extend right leg straight out. Hold 10 sec, flex foot. 10 reps each leg.",duration:"60 sec"},{name:"Ankle Circles",desc:"Lift one foot slightly. Rotate ankle in wide circles — 10 each direction. Switch.",duration:"45 sec"},{name:"Standing Quad Stretch",desc:"Pull one heel toward your seat. Hold 20 sec. Use chair for balance. Switch.",duration:"40 sec"},{name:"Seated Hamstring Stretch",desc:"Extend one leg, flex foot. Lean forward gently. Hold 25 sec. Switch.",duration:"50 sec"},{name:"March in Place",desc:"Lift knees alternately in a slow march. 30 steps. Breathe rhythmically.",duration:"45 sec"}]},
  {theme:"Wrists & Arms",stretches:[{name:"Wrist Circles",desc:"Extend both arms. Make slow large circles — 10 each direction.",duration:"30 sec"},{name:"Prayer Wrist Stretch",desc:"Press palms together, fingers up. Slowly lower toward waist. Hold 20 sec.",duration:"20 sec"},{name:"Finger Spreads",desc:"Spread fingers as wide as possible. Hold 5 sec, make a fist. 10 reps.",duration:"45 sec"},{name:"Tricep Stretch",desc:"Reach one arm overhead, bend at elbow. Press elbow back gently. Hold 20 sec. Switch.",duration:"40 sec"},{name:"Forearm Stretch",desc:"Extend one arm, palm up. Pull fingers back gently. Hold 20 sec. Switch.",duration:"40 sec"}]},
  {theme:"Breathwork & Release",stretches:[{name:"4-7-8 Breathing",desc:"Inhale 4 counts, hold 7, exhale for 8. Repeat 4 times. Calms the nervous system.",duration:"2 min"},{name:"Diaphragmatic Breath",desc:"One hand on chest, one on belly. Breathe so only the belly hand rises. 10 slow breaths.",duration:"90 sec"},{name:"Lion's Breath",desc:"Inhale deeply. Exhale forcefully through mouth, tongue out. 5 times. Releases tension.",duration:"45 sec"},{name:"Body Scan",desc:"Eyes closed. Starting at feet, consciously relax each part of your body upward.",duration:"2 min"},{name:"Gratitude Breath",desc:"With each inhale, think of something you're grateful for. Exhale and release tension. 8 breaths.",duration:"90 sec"}]},
];

const DEMO_CLIENTS=[
  {id:"c1",name:"Maria Santos",   age:52,weight:168,goalWeight:145,goal:"Lose weight & feel energized",level:"Beginner",    joined:"2026-03-01",avatar:"MS",likes:"Walking, dancing, light yoga",   passcode:"maria123"},
  {id:"c2",name:"Denise Williams",age:44,weight:192,goalWeight:160,goal:"Build strength & confidence",  level:"Intermediate",joined:"2026-03-10",avatar:"DW",likes:"Strength training, hiking",       passcode:"denise123"},
  {id:"c3",name:"Joyce Carter",   age:61,weight:155,goalWeight:148,goal:"Stay active & reduce stress",  level:"Beginner",    joined:"2026-03-15",avatar:"JC",likes:"Gentle stretching, water aerobics",passcode:"joyce123"},
];

const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(d){const x=new Date(d+"T12:00:00");return `${MONTHS[x.getMonth()]} ${x.getDate()}`;}
function todayStr(){return new Date().toISOString().split("T")[0];}
function timeAgo(d){const diff=Math.floor((new Date()-new Date(d+"T12:00:00"))/86400000);if(diff===0)return"Today";if(diff===1)return"Yesterday";return`${diff} days ago`;}
function getDayOfWeek(){return new Date().getDay();}

const MOOD_OPTS=[{emoji:"😔",label:"Struggling"},{emoji:"😐",label:"Okay"},{emoji:"🙂",label:"Good"},{emoji:"😊",label:"Great"},{emoji:"🌟",label:"Amazing"}];
const ENERGY_OPTS=["Low","Medium","High"];
const MEAL_TYPES=["Breakfast","Lunch","Dinner","Snack"];

const SITUATIONS=[
  {id:"desk",    icon:"💻", label:"At my desk"},
  {id:"chair",   icon:"🪑", label:"Sitting in a chair"},
  {id:"car",     icon:"🚗", label:"Driving / in car"},
  {id:"small",   icon:"📦", label:"In a small space"},
  {id:"outside", icon:"🌳", label:"Outside / walking"},
  {id:"gym",     icon:"🏋️", label:"At the gym"},
];

const GYM_TARGETS=["Chest","Back","Shoulders","Arms (Biceps/Triceps)","Legs","Core/Abs","Full Body","Cardio"];
const GYM_LIFT_WEIGHTS={"Shoulders":["Shoulder Press","Lateral Raise"],"Arms (Biceps/Triceps)":["Bicep Curl","Tricep Pushdown"],"Chest":["Bench Press","Chest Fly"],"Back":["Bent-Over Row","Lat Pulldown"],"Legs":["Squat","Leg Press"],"Core/Abs":[],"Full Body":["Squat","Deadlift"],"Cardio":[]};
const DESK_TARGETS=["Seated at desk","Standing next to desk","Mix of both"];

const MOVEPROFILE_KEY="atp-moveprofile";

export default function AllThingsPossible(){
  const [screen,setScreen]         = useState("splash");
  const [currentClient,setCurrentClient] = useState(null);
  const [clients,setClients]       = useState(DEMO_CLIENTS);
  const [logs,setLogs]             = useState({});
  const [messages,setMessages]     = useState({});
  const [plans,setPlans]           = useState({});
  const [deskMoves,setDeskMoves]   = useState({});
  const [deskLog,setDeskLog]       = useState({});
  const [ratings,setRatings]       = useState({});
  const [nutrition,setNutrition]   = useState({});
  const [moveProfile,setMoveProfile] = useState({});
  const [showMoveSetup,setShowMoveSetup] = useState(false);
  const [moveSetupSit,setMoveSetupSit] = useState("");
  const [moveSetupEnjoys,setMoveSetupEnjoys] = useState("");
 const [gymTarget,setGymTarget]             = useState("");
  const [deskTarget,setDeskTarget]           = useState("");
  const [gymLiftWeights,setGymLiftWeights]   = useState({});
  const [program,setProgram]       = useState({});
  const [bodyStats,setBodyStats]   = useState({});
  const [bodyForm,setBodyForm]     = useState({arms:"",chest:"",waist:"",hips:"",thighs:"",bloodSugar:"",cholesterol:"",bloodPressure:"",steps:"",heartRate:"",sleep:""});
  const [savingBody,setSavingBody] = useState(false);
  const [bodySaved,setBodySaved]   = useState(false);
  const [openChart,setOpenChart]   = useState(null);
  const [workoutTimerSec,setWorkoutTimerSec] = useState(0);
  const [workoutTimerRunning,setWorkoutTimerRunning] = useState(false);
  const [restTimerSec,setRestTimerSec] = useState(0);
  const [restTimerRunning,setRestTimerRunning] = useState(false);
  const [restInputVal,setRestInputVal] = useState("60");
  const [restInputUnit,setRestInputUnit] = useState("seconds");
  const [workoutFeedback,setWorkoutFeedback] = useState("");
  const [changingDuration,setChangingDuration] = useState(false);
  const [gFitConnected,setGFitConnected] = useState(false);
  const [gFitData,setGFitData]           = useState(null);
  const [gFitLoading,setGFitLoading]     = useState(false);
 const [gFitToken,setGFitToken]         = useState(null);
  const [sheetData,setSheetData]         = useState({workouts:[],recipes:[],foods:[]});
  const [sheetLoading,setSheetLoading]   = useState(false);
  const [sheetLoaded,setSheetLoaded]     = useState(false);
  const [activeSheetTab,setActiveSheetTab] = useState("recipes");
  const [foodSearch,setFoodSearch]       = useState(""); const workoutTimerRef = useRef(null);
  const restTimerRef = useRef(null);
  const [programGoal1,setProgramGoal1] = useState("");
  const [programGoal2,setProgramGoal2] = useState("");
  const [generatingWeek,setGeneratingWeek] = useState(false);
  const [tab,setTab]               = useState("prayer");
  const [coachTab,setCoachTab]     = useState("clients");

  // login
  const [loginMode,setLoginMode]   = useState("select");
  const [loginTarget,setLoginTarget] = useState(null);
  const [passcodeInput,setPasscodeInput] = useState("");
  const [passcodeError,setPasscodeError] = useState("");
  const [coachPassInput,setCoachPassInput] = useState("");
  const [coachPassError,setCoachPassError] = useState("");
  const [showPass,setShowPass]     = useState(false);

  // checkin form — removed workout, removed water
  const [form,setForm] = useState({mood:"",energy:"",weight:"",prayerDone:false});
  const [saved,setSaved] = useState(false);

  // nutrition summary on check-in
  const [nutriSummary,setNutriSummary]   = useState("");
  const [loadingNutri,setLoadingNutri]   = useState(false);

  // nutrition form
  const [mealType,setMealType]     = useState("Breakfast");
  const [mealText,setMealText]     = useState("");
  const [waterGlasses,setWaterGlasses] = useState(0); // water lives in nutrition now
  const [analyzingMeal,setAnalyzingMeal] = useState(false);

  // prayer
  const [timerSec,setTimerSec]     = useState(600);
  const [timerRunning,setTimerRunning] = useState(false);
  const [timerDone,setTimerDone]   = useState(false);
  const timerRef = useRef(null);
  const [scriptureIdx] = useState(Math.floor(Math.random()*SCRIPTURES.length));
  const [prayerIdx]    = useState(Math.floor(Math.random()*PRAYERS.length));

  // workout
  const [workoutGoalInput,setWorkoutGoalInput] = useState("");
  const [generatingPlan,setGeneratingPlan]     = useState(false);
  const [generatingDesk,setGeneratingDesk]     = useState(false);
  const [adjustingPlan,setAdjustingPlan]       = useState(false);
  const [selectedDay,setSelectedDay]           = useState(null);
  const [loggedSets,setLoggedSets]             = useState({});
  const [dayRating,setDayRating]               = useState(null);
  const [ratingSubmitted,setRatingSubmitted]   = useState(false);
  const [adjustMsg,setAdjustMsg]               = useState("");

  // coach
  const [msgDraft,setMsgDraft]     = useState({});
  const [selectedClientCoach,setSelectedClientCoach] = useState(null);
  const [onboard,setOnboard]       = useState({name:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",passcode:""});
  const [editPasscode,setEditPasscode] = useState({});
  const [aiLoading,setAiLoading]   = useState(false);
  const [aiReply,setAiReply]       = useState("");

  // self registration
  const EQUIPMENT_OPTIONS=["Dumbbells","Resistance bands","Yoga mat","Treadmill","Pull-up bar","Gym membership","No equipment"];
  const DAYS_OF_WEEK=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const WORKOUT_TIMES=["Morning","Afternoon","Evening","No preference"];
 const [selfReg,setSelfReg]       = useState({name:"",email:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",equipment:[],equipmentOther:"",workoutDays:[],workoutTime:"Morning",quickMoveDays:[],longRunDay:"",canUpdateSchedule:true,injury:"none",medical:"none",passcode:"",confirmPasscode:""});
  const [selfRegGroup,setSelfRegGroup] = useState(0);
  const [selfRegError,setSelfRegError] = useState("");
  const [tempPasscode,setTempPasscode] = useState({});
  const [clientMsgDraft,setClientMsgDraft] = useState("");
  const [tooltip,setTooltip] = useState({visible:false,text:"",x:0,y:0});
  const [inviteCode,setInviteCode] = useState("ATP2026join");
  const [inviteCodeInput,setInviteCodeInput] = useState("");
  const [editInviteCode,setEditInviteCode] = useState("");
  const [photoPreview,setPhotoPreview] = useState(null);
  const [photoMacros,setPhotoMacros] = useState(null);
  const [analyzingPhoto,setAnalyzingPhoto] = useState(false);
  const [showPasscodeReveal,setShowPasscodeReveal] = useState({});
  const photoInputRef = useRef(null);
  const [fromHealthBoard,setFromHealthBoard] = useState(false);

  useEffect(()=>{
    async function loadData(){
      try{
        // Try Supabase with a 3-second timeout, fall back to localStorage
        async function sbGetSafe(key){
          try{
            return await Promise.race([
              sbGetGlobal(key),
              new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),3000))
            ]);
          }catch(e){ return null; }
        }
        const sbClients = await sbGetSafe(CLIENTS_KEY);
        const cl = sbClients || JSON.parse(localStorage.getItem(CLIENTS_KEY)||"null");
        if(cl) setClients(cl);

       const sbLogs = await sbGetSafe(LOGS_KEY);
        const lg = sbLogs || JSON.parse(localStorage.getItem(LOGS_KEY)||"null");
        if(lg) setLogs(lg);

        const sbMsgs = await sbGetSafe(MSGS_KEY);
        const ms = sbMsgs || JSON.parse(localStorage.getItem(MSGS_KEY)||"null");
        if(ms) setMessages(ms);

        const sbPlans = await sbGetSafe(PLANS_KEY);
        const pl = sbPlans || JSON.parse(localStorage.getItem(PLANS_KEY)||"null");
        if(pl) setPlans(pl);

        const sbDesk = await sbGetSafe(DESK_KEY);
        const dk = sbDesk || JSON.parse(localStorage.getItem(DESK_KEY)||"null");
        if(dk) setDeskLog(dk);

        const sbDeskMoves = await sbGetSafe(DESKMOVES_KEY);
        const dm = sbDeskMoves || JSON.parse(localStorage.getItem(DESKMOVES_KEY)||"null");
        if(dm) setDeskMoves(dm);

        const sbRatings = await sbGetSafe(RATINGS_KEY);
        const rt = sbRatings || JSON.parse(localStorage.getItem(RATINGS_KEY)||"null");
        if(rt) setRatings(rt);

        const sbNutrition = await sbGetSafe(NUTRITION_KEY);
        const nt = sbNutrition || JSON.parse(localStorage.getItem(NUTRITION_KEY)||"null");
        if(nt) setNutrition(nt);

        const sbMoveProfile = await sbGetSafe(MOVEPROFILE_KEY);
        const mp = sbMoveProfile || JSON.parse(localStorage.getItem(MOVEPROFILE_KEY)||"null");
        if(mp) setMoveProfile(mp);

        const sbProgram = await sbGetSafe(PROGRAM_KEY);
        const pg = sbProgram || JSON.parse(localStorage.getItem(PROGRAM_KEY)||"null");
        if(pg) setProgram(pg);

        const sbBodyStats = await sbGetSafe(BODYSTATS_KEY);
        const bs = sbBodyStats || JSON.parse(localStorage.getItem(BODYSTATS_KEY)||"null");
        if(bs) setBodyStats(bs); 
        const sbInvite = await sbGetGlobal("atp-invitecode");
        if(sbInvite) setInviteCode(sbInvite);
        const sc=localStorage.getItem(SESSION_KEY);
        if(sc){
          const s=JSON.parse(sc);
          if(s.role==="coach"){ setScreen("coach"); }
          else if(s.clientId){
            const clientList = cl || DEMO_CLIENTS;
            const found = clientList.find(c=>c.id===s.clientId);
            if(found){
              setCurrentClient(found);
              setScreen("client");
              const todayLg=(lg||{})[found.id]||{};
              const prayedToday=todayLg[todayStr()]?.prayerDone||false;
              if(prayedToday){ setTab("checkin"); }
              else { setTab("prayer"); }
            }
          }
        }
      }catch(e){ console.error("Load error:",e); }
      setTimeout(()=>{ if(!localStorage.getItem(SESSION_KEY)) setScreen("login"); },1800);
    }
    loadData();
  },[]);

 useEffect(()=>{
    async function loadData(){
      try{
        // STEP 1 — Load localStorage instantly so app never freezes
        async function sbGetSafe(key){
          try{
            return await Promise.race([
              sbGetGlobal(key),
              new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),3000))
            ]);
          }catch(e){ return null; }
        }

        // Load from localStorage immediately
        try{
          const cl=localStorage.getItem(CLIENTS_KEY); if(cl) setClients(JSON.parse(cl));
          const lg=localStorage.getItem(LOGS_KEY); if(lg) setLogs(JSON.parse(lg));
          const ms=localStorage.getItem(MSGS_KEY); if(ms) setMessages(JSON.parse(ms));
          const pl=localStorage.getItem(PLANS_KEY); if(pl) setPlans(JSON.parse(pl));
          const dk=localStorage.getItem(DESK_KEY); if(dk) setDeskLog(JSON.parse(dk));
          const dm=localStorage.getItem(DESKMOVES_KEY); if(dm) setDeskMoves(JSON.parse(dm));
          const rt=localStorage.getItem(RATINGS_KEY); if(rt) setRatings(JSON.parse(rt));
          const nt=localStorage.getItem(NUTRITION_KEY); if(nt) setNutrition(JSON.parse(nt));
          const mp=localStorage.getItem(MOVEPROFILE_KEY); if(mp) setMoveProfile(JSON.parse(mp));
          const pg=localStorage.getItem(PROGRAM_KEY); if(pg) setProgram(JSON.parse(pg));
          const bs=localStorage.getItem(BODYSTATS_KEY); if(bs) setBodyStats(JSON.parse(bs));
        }catch(e){}

        // Handle session immediately — don't wait for Supabase
        const sc=localStorage.getItem(SESSION_KEY);
        if(sc){
          try{
            const s=JSON.parse(sc);
            const localClients=JSON.parse(localStorage.getItem(CLIENTS_KEY)||"[]");
            const clientList=localClients.length?localClients:DEMO_CLIENTS;
            if(s.role==="coach"){ setScreen("coach"); }
            else if(s.clientId){
              const found=clientList.find(c=>c.id===s.clientId);
              if(found){
                setCurrentClient(found);
                setScreen("client");
                const todayLg=(JSON.parse(localStorage.getItem(LOGS_KEY)||"{}"))[found.id]||{};
                const prayedToday=todayLg[todayStr()]?.prayerDone||false;
                if(prayedToday){ setTab("checkin"); }
                else { setTab("prayer"); }
              }
            }
          }catch(e){}
        } else {
          setScreen("login");
        }

        // STEP 2 — Sync Supabase in background after UI is already showing
        const sbClients = await sbGetSafe(CLIENTS_KEY);
        const cl = sbClients || JSON.parse(localStorage.getItem(CLIENTS_KEY)||"null");
        if(cl) setClients(cl);

        const sbLogs = await sbGetGlobal(LOGS_KEY);
        const lg = sbLogs || JSON.parse(localStorage.getItem(LOGS_KEY)||"null");
        if(lg) setLogs(lg);

        const sbMsgs = await sbGetGlobal(MSGS_KEY);
        const ms = sbMsgs || JSON.parse(localStorage.getItem(MSGS_KEY)||"null");
        if(ms) setMessages(ms);

        const sbPlans = await sbGetGlobal(PLANS_KEY);
        const pl = sbPlans || JSON.parse(localStorage.getItem(PLANS_KEY)||"null");
        if(pl) setPlans(pl);

        const sbDesk = await sbGetGlobal(DESK_KEY);
        const dk = sbDesk || JSON.parse(localStorage.getItem(DESK_KEY)||"null");
        if(dk) setDeskLog(dk);

        const sbDeskMoves = await sbGetGlobal(DESKMOVES_KEY);
        const dm = sbDeskMoves || JSON.parse(localStorage.getItem(DESKMOVES_KEY)||"null");
        if(dm) setDeskMoves(dm);

        const sbRatings = await sbGetGlobal(RATINGS_KEY);
        const rt = sbRatings || JSON.parse(localStorage.getItem(RATINGS_KEY)||"null");
        if(rt) setRatings(rt);

        const sbNutrition = await sbGetGlobal(NUTRITION_KEY);
        const nt = sbNutrition || JSON.parse(localStorage.getItem(NUTRITION_KEY)||"null");
        if(nt) setNutrition(nt);

        const sbMoveProfile = await sbGetGlobal(MOVEPROFILE_KEY);
        const mp = sbMoveProfile || JSON.parse(localStorage.getItem(MOVEPROFILE_KEY)||"null");
        if(mp) setMoveProfile(mp);

        const sbProgram = await sbGetGlobal(PROGRAM_KEY);
        const pg = sbProgram || JSON.parse(localStorage.getItem(PROGRAM_KEY)||"null");
        if(pg) setProgram(pg);

        const sbBodyStats = await sbGetGlobal(BODYSTATS_KEY);
        const bs = sbBodyStats || JSON.parse(localStorage.getItem(BODYSTATS_KEY)||"null");
        if(bs) setBodyStats(bs);

 }catch(e){ console.error("Load error:",e); }
    }
    // Safety timeout — never stay on splash longer than 4 seconds
    setTimeout(()=>{ setScreen(s=>s==="splash"?"login":s); },4000);
    loadData();
  },[]); 

 // localStorage-only useEffect removed — Supabase useEffect above handles everything 

 useEffect(()=>{
    if(timerRunning&&timerSec>0){ timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000); }
    else if(timerSec===0&&timerRunning){ setTimerRunning(false); setTimerDone(true); }
    return()=>clearTimeout(timerRef.current);
  },[timerRunning,timerSec]);

  useEffect(()=>{
    if(currentClient&&program[currentClient.id]&&tab==="workout"){ checkAndAdvanceWeek(); }
  },[tab,currentClient?.id]);

  useEffect(()=>{
    if(workoutTimerRunning){ workoutTimerRef.current=setTimeout(()=>setWorkoutTimerSec(s=>s+1),1000); }
    return()=>clearTimeout(workoutTimerRef.current);
  },[workoutTimerRunning,workoutTimerSec]);

  useEffect(()=>{
    if(restTimerRunning&&restTimerSec>0){ restTimerRef.current=setTimeout(()=>setRestTimerSec(s=>s-1),1000); }
    else if(restTimerSec===0&&restTimerRunning){ setRestTimerRunning(false); }
    return()=>clearTimeout(restTimerRef.current);
  },[restTimerRunning,restTimerSec]);

function persist(nc,nl,nm,np,ndk,ndm,nr,nn){
    const cl=nc||clients,lg=nl||logs,ms=nm||messages,pl=np||plans;
    const dk=ndk||deskLog,dm=ndm||deskMoves,rt=nr||ratings,nt=nn||nutrition;
    setClients(cl);setLogs(lg);setMessages(ms);setPlans(pl);
    setDeskLog(dk);setDeskMoves(dm);setRatings(rt);setNutrition(nt);
    try{
      localStorage.setItem(CLIENTS_KEY,JSON.stringify(cl));
      localStorage.setItem(LOGS_KEY,JSON.stringify(lg));
      localStorage.setItem(MSGS_KEY,JSON.stringify(ms));
      localStorage.setItem(PLANS_KEY,JSON.stringify(pl));
      localStorage.setItem(DESK_KEY,JSON.stringify(dk));
      localStorage.setItem(DESKMOVES_KEY,JSON.stringify(dm));
      localStorage.setItem(RATINGS_KEY,JSON.stringify(rt));
      localStorage.setItem(NUTRITION_KEY,JSON.stringify(nt));
      localStorage.setItem(MOVEPROFILE_KEY,JSON.stringify(moveProfile));
      localStorage.setItem(PROGRAM_KEY,JSON.stringify(program));
      localStorage.setItem(BODYSTATS_KEY,JSON.stringify(bodyStats));
    }catch(e){}
    // Sync to Supabase (non-blocking)
    sbSetGlobal(CLIENTS_KEY, cl);
    sbSetGlobal(LOGS_KEY, lg);
    sbSetGlobal(MSGS_KEY, ms);
    sbSetGlobal(PLANS_KEY, pl);
    sbSetGlobal(DESK_KEY, dk);
    sbSetGlobal(DESKMOVES_KEY, dm);
    sbSetGlobal(RATINGS_KEY, rt);
    sbSetGlobal(NUTRITION_KEY, nt);
    sbSetGlobal(MOVEPROFILE_KEY, moveProfile);
    sbSetGlobal(PROGRAM_KEY, program);
    sbSetGlobal(BODYSTATS_KEY, bodyStats);
  }
  function startClientLogin(c){ setLoginTarget(c); setPasscodeInput(""); setPasscodeError(""); setLoginMode("passcode"); }

  function toggleEquipment(item){
    setSelfReg(p=>({...p,equipment:p.equipment.includes(item)?p.equipment.filter(e=>e!==item):[...p.equipment,item]}));
  }
  function toggleWorkoutDay(day){
    setSelfReg(p=>({...p,workoutDays:p.workoutDays.includes(day)?p.workoutDays.filter(d=>d!==day):[...p.workoutDays,day]}));
  }
  function toggleQuickMoveDay(day){
    setSelfReg(p=>({...p,quickMoveDays:p.quickMoveDays.includes(day)?p.quickMoveDays.filter(d=>d!==day):[...p.quickMoveDays,day]}));
  }
  function generateTempPasscode(cid){
    const temp="ATP"+Math.floor(1000+Math.random()*9000);
    const nc=clients.map(c=>c.id===cid?{...c,passcode:temp}:c);
    persist(nc,null,null,null,null,null,null,null);
    setTempPasscode(p=>({...p,[cid]:temp}));
  }
  function submitPasscode(){
    const stored=clients.find(c=>c.id===loginTarget.id);
    const code=stored?.passcode||loginTarget.passcode;
    if(passcodeInput.trim()===code){ setCurrentClient(stored||loginTarget); setScreen("client"); setTab("checkin"); setLoginMode("select"); setPasscodeInput(""); setPasscodeError(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"client",clientId:loginTarget.id})); }catch(e){} }
    else { setPasscodeError("Incorrect passcode. Please contact your coach."); setPasscodeInput(""); }
  }
  function submitCoachPass(){
    if(coachPassInput===COACH_PASS){ setScreen("coach"); setCoachTab("clients"); setCoachPassInput(""); setCoachPassError(""); setLoginMode("select"); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"coach"})); }catch(e){} }
    else { setCoachPassError("Incorrect coach password."); setCoachPassInput(""); }
  }
  function logout(){ setCurrentClient(null); setScreen("login"); setLoginMode("select"); setAiReply(""); setNutriSummary(""); setSelectedDay(null); setLoggedSets({}); setDayRating(null); setRatingSubmitted(false); setAdjustMsg(""); setMealText(""); setWaterGlasses(0); try{ localStorage.removeItem(SESSION_KEY); }catch(e){} }

  function submitCheckin(){
    const today=todayStr(); const cid=currentClient.id;
    const entry={...form,date:today,ts:new Date().toISOString()};
    const newLogs={...logs,[cid]:{...(logs[cid]||{}),[today]:entry}};
    let nc=clients;
    if(form.weight){ nc=clients.map(c=>c.id===cid?{...c,weight:parseFloat(form.weight)}:c); setCurrentClient(nc.find(c=>c.id===cid)); }
    persist(nc,newLogs,null,null,null,null,null,null);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    setForm({mood:"",energy:"",weight:"",prayerDone:false});
  }

  async function callClaude(prompt){
    try{
      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:4000,messages:[{role:"user",content:prompt}]})
      });
      const data=await res.json();
      return data.content?.[0]?.text||"";
    }catch(e){ console.error("API error:",e); return ""; }
  }

  // ── GENERATE 7-DAY NUTRITION SUMMARY for check-in ─────────────────────────
  async function generateNutriSummary(clientId, clientWeight){
    setLoadingNutri(true); setNutriSummary("");
    const clientNutr=nutrition[clientId]||{};
    const days=Object.keys(clientNutr).sort().slice(-7);
    if(days.length===0){ setNutriSummary("No meals logged yet this week. Head to the Nutrition tab to start tracking! 🥗"); setLoadingNutri(false); return; }
    const targets=getTargets(clientWeight);
    const summary=days.map(date=>{
      const meals=clientNutr[date]||[];
      const t=meals.reduce((a,m)=>({p:a.p+(m.protein||0),c:a.c+(m.carbs||0),s:a.s+(m.sugar||0),f:a.f+(m.fat||0),cal:a.cal+(m.calories||0)}),{p:0,c:0,s:0,f:0,cal:0});
      const mealNames=meals.map(m=>m.text).join(", ");
      return `${fmtDate(date)}: protein ${t.p}g, carbs ${t.c}g, sugar ${t.s}g, fat ${t.f}g, ${t.cal} cal. Foods: ${mealNames||"not logged"}`;
    }).join("\n");
    const prompt=`You are a warm, encouraging health coach for "All Things Possible" — a Christian-based wellness program. This is NOT a diet — we help people eat better over time. Occasional off days are totally OK and normal.

Client's 7-day nutrition summary:
${summary}

Daily targets: Protein ${targets.protein}g (priority), Carbs under ${targets.carbs}g, Sugar under ${targets.sugar}g.

Write a SHORT, warm 3-4 sentence summary of how they did this week. Be encouraging and positive first. If they had a tough day or two, acknowledge it gently and remind them one off day doesn't undo their progress. Give ONE specific, practical tip for the coming week based on their actual data (e.g. if protein was low, suggest a specific easy high-protein food). End with a brief faith-based encouragement. Keep it conversational and warm — like a coach who genuinely cares, not a drill sergeant.`;
    try{ const r=await callClaude(prompt); setNutriSummary(r); }
    catch(e){ setNutriSummary("You're doing great! Keep focusing on protein-rich whole foods and stay hydrated. Every good choice counts. 🙏"); }
    setLoadingNutri(false);
  }

  // ── NUTRITION: Analyze a meal ──────────────────────────────────────────────
  async function analyzeMeal(){
    if(!mealText.trim()) return;
    setAnalyzingMeal(true);
    try{
      const today=todayStr(); const cid=currentClient.id;
      const todayMeals=(nutrition[cid]||{})[today]||[];

      // Step 1 — check Master Food List first
      let matchedFoods=[];
      if(sheetData.foods.length>0){
        const mealWords=mealText.toLowerCase().split(/[\s,]+/);
        matchedFoods=sheetData.foods.filter(row=>{
          const foodName=(row[0]||"").toLowerCase();
          return mealWords.some(word=>word.length>2&&foodName.includes(word));
        });
      }

      let macros;
      if(matchedFoods.length>0){
        // Use sheet data — add up all matched foods
        const totals=matchedFoods.reduce((acc,row)=>({
          protein:acc.protein+(parseFloat(row[2])||0),
          carbs:acc.carbs+(parseFloat(row[3])||0),
          fat:acc.fat+(parseFloat(row[4])||0),
          sugar:acc.sugar+(parseFloat(row[5])||0),
          calories:acc.calories+(parseFloat(row[6])||0),
        }),{protein:0,carbs:0,fat:0,sugar:0,calories:0});
        macros={
          protein:Math.round(totals.protein),
          fat:Math.round(totals.fat),
          carbs:Math.round(totals.carbs),
          sugar:Math.round(totals.sugar),
          calories:Math.round(totals.calories),
          feedback:`Matched from food database: ${matchedFoods.map(r=>r[0]).join(", ")}. Great choice for your goals!`
        };
      } else {
        // Step 2 — fall back to AI estimate
        const prompt=`Analyze this meal for someone following the upside-down food pyramid (high protein, healthy fats, low carbs/sugar). Meal: "${mealText}". Estimate macros. Return ONLY valid JSON (no markdown): {"protein":45,"fat":22,"carbs":12,"sugar":4,"calories":410,"feedback":"Brief 1-sentence feedback on how well this fits the high protein/low carb approach."}`;
        const raw=await callClaude(prompt);
        macros=JSON.parse(raw.replace(/```json|```/g,"").trim());
      }

      const newEntry={meal:mealType,text:mealText,protein:macros.protein||0,fat:macros.fat||0,carbs:macros.carbs||0,sugar:macros.sugar||0,calories:macros.calories||0,feedback:macros.feedback||"",ts:new Date().toISOString()};
      persist(null,null,null,null,null,null,null,{...nutrition,[cid]:{...(nutrition[cid]||{}),[today]:[...todayMeals,newEntry]}});
      setMealText(""); setMealType("Breakfast");
    }catch(e){ console.error(e); }
    setAnalyzingMeal(false);
  }

  // Log water in nutrition tab
  function logWater(glasses){
    setWaterGlasses(glasses);
    const today=todayStr(); const cid=currentClient.id;
    const existing=nutrition[cid]||{};
    const todayData=existing[today]||[];
    // Store water as a special entry
    const filtered=todayData.filter(m=>m.meal!=="__water__");
    persist(null,null,null,null,null,null,null,{...nutrition,[cid]:{...existing,[today]:[...filtered,{meal:"__water__",glasses,ts:new Date().toISOString()}]}});
  }

  // Get today's water
  function getTodayWater(cid){
    const todayData=(nutrition[cid]||{})[todayStr()]||[];
    const w=todayData.find(m=>m.meal==="__water__");
    return w?.glasses||0;
  }

  // ── WORKOUT ───────────────────────────────────────────────────────────────
  async function generateWorkoutPlan(){
    if(!workoutGoalInput.trim()) return;
    setGeneratingPlan(true);
    const c=currentClient;
    const prompt=`You are a certified personal trainer. Create a specific 7-day weekly workout plan for: Name: ${c.name}, Age: ${c.age}, Weight: ${c.weight}lbs, Goal weight: ${c.goalWeight}lbs, Fitness level: ${c.level}, Likes: ${c.likes||"general fitness"}, Goal: "${workoutGoalInput}". Be very specific — sets, reps, duration, rest periods, form tips. Rest days get light activity. Return ONLY valid JSON (no markdown): {"goal":"${workoutGoalInput}","days":[{"day":"Monday","type":"workout","focus":"Focus area","duration":"45 min","exercises":[{"name":"Exercise Name","sets":3,"reps":"10-12","rest":"60 sec","tip":"Form tip"}]},{"day":"Tuesday","type":"rest","focus":"Active Recovery","duration":"20 min","exercises":[{"name":"Light walk","sets":1,"reps":"20 min","rest":"","tip":"Keep it easy"}]}]}`;
    try{
      const raw=await callClaude(prompt);
      const plan=JSON.parse(raw.replace(/```json|```/g,"").trim());
      persist(null,null,null,{...plans,[c.id]:{...plan,generatedAt:todayStr(),intensityLevel:1}},null,null,null,null);
      setWorkoutGoalInput(""); setSelectedDay(null);
    }catch(e){ console.error(e); }
    setGeneratingPlan(false);
  }

  function connectGoogleFit(){
    const clientId=GOOGLE_CLIENT_ID;
    const redirectUri=window.location.origin;
    const scope="https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read https://www.googleapis.com/auth/fitness.sleep.read https://www.googleapis.com/auth/fitness.body.read";
    const authUrl=`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&prompt=consent&include_granted_scopes=true`;
    window.location.href=authUrl;
  }

  useEffect(()=>{
    const hash=window.location.hash;
    if(hash&&hash.includes("access_token")){
      const params=new URLSearchParams(hash.substring(1));
      const token=params.get("access_token");
      if(token){
        setGFitToken(token); setGFitConnected(true);
        fetchGoogleFitData(token);
        try{localStorage.setItem(GFIT_KEY,token);}catch(e){}
        window.history.replaceState(null,null," ");
      }
    }
    const savedToken=localStorage.getItem(GFIT_KEY);
    if(savedToken){ setGFitToken(savedToken); setGFitConnected(true); fetchGoogleFitData(savedToken); }
  },[]);

  async function fetchGoogleFitData(token){
    setGFitLoading(true);
    try{
     const now=Date.now();
      const midnight=new Date(); midnight.setHours(0,0,0,0);
      const dayAgo=midnight.getTime();
      const weekAgo=now-7*86400000;

      // Steps today
      const stepsRes=await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",{
        method:"POST",
        headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({aggregateBy:[{dataTypeName:"com.google.step_count.delta"}],bucketByTime:{durationMillis:86400000},startTimeMillis:dayAgo,endTimeMillis:now})
      });
      const stepsData=await stepsRes.json();
      const steps=stepsData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal||0;

      // Heart rate
      const hrRes=await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",{
        method:"POST",
        headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({aggregateBy:[{dataTypeName:"com.google.heart_rate.bpm"}],bucketByTime:{durationMillis:86400000},startTimeMillis:dayAgo,endTimeMillis:now})
      });
      const hrData=await hrRes.json();
      const heartRate=Math.round(hrData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal||0);

      // Sleep
      const sleepRes=await fetch("https://www.googleapis.com/fitness/v1/users/me/sessions?activityType=72",{
        headers:{"Authorization":`Bearer ${token}`}
      });
      const sleepData=await sleepRes.json();
      const sleepMs=sleepData.session?.slice(-1)[0]?(parseInt(sleepData.session.slice(-1)[0].endTimeMillis)-parseInt(sleepData.session.slice(-1)[0].startTimeMillis)):0;
      const sleep=+(sleepMs/3600000).toFixed(1);

      // Calories
      const calRes=await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",{
        method:"POST",
        headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({aggregateBy:[{dataTypeName:"com.google.calories.expended"}],bucketByTime:{durationMillis:86400000},startTimeMillis:dayAgo,endTimeMillis:now})
      });
      const calData=await calRes.json();
      const calories=Math.round(calData.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal||0);

      const fitData={steps,heartRate,sleep,calories,lastSync:new Date().toISOString()};
      setGFitData(fitData);

      // Auto-save to body stats
      if(currentClient&&(steps||heartRate||sleep)){
        const cid=currentClient.id;
        const existing=(bodyStats[cid]||[]);
        const todayEntry=existing.find(e=>e.date===todayStr());
        if(todayEntry){
          const updated=existing.map(e=>e.date===todayStr()?{...e,steps:steps||e.steps,heartRate:heartRate||e.heartRate,sleep:sleep||e.sleep}:e);
          const nb={...bodyStats,[cid]:updated};
          setBodyStats(nb);
          try{localStorage.setItem(BODYSTATS_KEY,JSON.stringify(nb));}catch(e){}
        } else {
          const newEntry={date:todayStr(),ts:new Date().toISOString(),steps:steps||"",heartRate:heartRate||"",sleep:sleep||""};
          const nb={...bodyStats,[cid]:[...existing,newEntry]};
          setBodyStats(nb);
          try{localStorage.setItem(BODYSTATS_KEY,JSON.stringify(nb));}catch(e){}
        }
      }
    }catch(e){ console.error("Google Fit error:",e); }
    setGFitLoading(false);
  }

  async function fetchSheets(){
    setSheetLoading(true);
    try{
      const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
      async function getSheet(name){
        const res=await fetch(`${base}${encodeURIComponent(name)}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        const rows=json.table.rows;
        return rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
      }
      const [workouts,recipes,foods]=await Promise.all([
        getSheet("Workout Suggestions"),
        getSheet("Recipe Suggestions"),
        getSheet("Master Food List")
      ]);
      setSheetData({workouts,recipes,foods});
      setSheetLoaded(true);
    }catch(e){ console.error("Sheets error:",e); }
    setSheetLoading(false);
  }

  function saveBodyStats(){
    setSavingBody(true);
    const cid=currentClient.id;
    const entry={...bodyForm,date:todayStr(),ts:new Date().toISOString()};
    const clientStats=[...(bodyStats[cid]||[]),entry];
    const nb={...bodyStats,[cid]:clientStats};
    setBodyStats(nb);
    try{localStorage.setItem(BODYSTATS_KEY,JSON.stringify(nb));}catch(e){}
    setSavingBody(false); setBodySaved(true);
    setTimeout(()=>setBodySaved(false),3000);
    setBodyForm({arms:"",chest:"",waist:"",hips:"",thighs:"",bloodSugar:"",cholesterol:"",bloodPressure:"",steps:"",heartRate:"",sleep:""});
  }

  function getPhase(week){if(week<=4) return{name:"Foundation",color:"#60a5fa",desc:"Building base fitness and habits"}; if(week<=8) return{name:"Build",color:G.greenMid,desc:"Increasing intensity and volume"}; return{name:"Peak",color:G.mangoDeep,desc:"Maximum effort and performance"}; }

  async function generateWeek(weekNum,goals,avgRating,prevWeekSummary){
    setGeneratingWeek(true);
    const c=currentClient;
    const phase=getPhase(weekNum);
    const intensity=avgRating<=2?"increase the difficulty — more sets, reps, and intensity":avgRating>=4?"decrease the difficulty — fewer sets, lighter load, more rest":"maintain similar difficulty with natural progression";
    const prompt=`You are a certified personal trainer creating Week ${weekNum} of a 12-week progressive fitness program. CLIENT: ${c.name}, Age: ${c.age}, Weight: ${c.weight}lbs, Level: ${c.level}, Equipment: ${c.equipment||c.likes||"general fitness"}, 12-Week Goals: ${goals.filter(g=>g).join(" AND ")}, Phase: ${phase.name} (${phase.desc}), Week: ${weekNum} of 12. ${prevWeekSummary?"Last week: "+prevWeekSummary:""} Adjustment: ${intensity}. Create a specific 7-day plan. Return ONLY valid JSON (no markdown): {"week":${weekNum},"phase":"${phase.name}","focus":"Week focus in 5 words","days":[{"day":"Monday","type":"workout","focus":"Focus","duration":"45 min","exercises":[{"name":"Exercise","sets":3,"reps":"10-12","rest":"60 sec","tip":"Form tip"}]},{"day":"Tuesday","type":"rest","focus":"Active Recovery","duration":"20 min","exercises":[{"name":"Light walk","sets":1,"reps":"20 min","rest":"","tip":"Easy pace"}]}]}`;
    try{
      const raw=await callClaude(prompt);
      const weekPlan=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const cid=c.id;
      const existing=program[cid]||{goals,currentWeek:1,weeks:{},startDate:todayStr()};
      const updated={...existing,weeks:{...existing.weeks,[weekNum]:weekPlan},currentWeek:weekNum};
      const newProgram={...program,[cid]:updated};
      setProgram(newProgram);
      try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(newProgram));}catch(e){}
    }catch(e){console.error(e);}
    setGeneratingWeek(false);
  }

  async function startProgram(){
    if(!programGoal1.trim()) return;
    const goals=[programGoal1.trim(),programGoal2.trim()].filter(g=>g);
    const cid=currentClient.id;
    const newProgram={...program,[cid]:{goals,currentWeek:1,weeks:{},startDate:todayStr()}};
    setProgram(newProgram);
    try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(newProgram));}catch(e){}
    await generateWeek(1,goals,3,"");
  }

  async function checkAndAdvanceWeek(){
    const cid=currentClient.id;
    const clientProgram=program[cid];
    if(!clientProgram) return;
    const startDate=new Date(clientProgram.startDate+"T12:00:00");
    const now=new Date();
    const weeksElapsed=Math.floor((now-startDate)/(7*24*60*60*1000))+1;
    const targetWeek=Math.min(12,weeksElapsed);
    if(targetWeek>clientProgram.currentWeek&&!clientProgram.weeks[targetWeek]){
      const clientRatings=ratings[cid]||[];
      const lastWeekRatings=clientRatings.slice(-7);
      const avgRating=lastWeekRatings.length>0?Math.round(lastWeekRatings.reduce((a,r)=>a+r.rating,0)/lastWeekRatings.length):3;
      const prevWeek=clientProgram.weeks[clientProgram.currentWeek];
      const prevSummary=prevWeek?prevWeek.phase+" phase, focus: "+prevWeek.focus:"";
      const updatedProgram={...program,[cid]:{...clientProgram,currentWeek:targetWeek}};
      setProgram(updatedProgram);
      try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(updatedProgram));}catch(e){}
      await generateWeek(targetWeek,clientProgram.goals,avgRating,prevSummary);
    }
  }

  async function submitWorkoutRating(rating){
    if(!currentClient||selectedDay===null) return;
    const cid=currentClient.id;
    const day=plans[cid]?.days?.[selectedDay];
    if(!day) return;
    const entry={date:todayStr(),dayIndex:selectedDay,dayName:day.day,rating,feedback:workoutFeedback||""};
    const clientRatings=[...(ratings[cid]||[]),entry];
    const nr={...ratings,[cid]:clientRatings};
    persist(null,null,null,null,null,null,nr,null);
    setDayRating(rating); setRatingSubmitted(true);
    const recent=clientRatings.slice(-3);
    const last3Same=recent.length===3&&recent.every(r=>r.rating===rating);
    const needsAdjust=(rating===1)||(rating===5)||((rating===2||rating===4)&&last3Same);
    if(needsAdjust){
      const direction=rating<=2?"harder":"easier";
      setAdjustMsg(`Adjusting your plan to be ${direction}...`);
      setAdjustingPlan(true);
      const currentPlan=plans[cid];
      const prompt=`You are a personal trainer. Client rated workout ${rating}/5 — plan needs to be ${direction}. Current plan has these days: ${currentPlan.days?.map(d=>d.day).join(", ")}. Rewrite just the exercises — ${direction==="harder"?"add 1 set, increase reps by 2, reduce rest by 15 sec":"remove 1 set, reduce reps by 2, increase rest by 15 sec"}. Client: ${currentClient.name}, level: ${currentClient.level}, goal: ${currentPlan.goal}. Return ONLY valid JSON same format as input.`;
      try{
        const raw=await callClaude(prompt);
        const newDays=JSON.parse(raw.replace(/```json|```/g,"").trim());
        persist(null,null,null,{...plans,[cid]:{...plans[cid],days:Array.isArray(newDays)?newDays:newDays.days||plans[cid].days,lastAdjusted:todayStr(),adjustedFor:direction}},null,null,nr,null);
        setAdjustMsg(`✅ Plan adjusted to be ${direction}!`);
      }catch(e){ setAdjustMsg("Plan noted — your coach will review your rating."); }
      setAdjustingPlan(false);
    } else { setAdjustMsg(RATING_INFO[rating].msg); }
  }

  async function generateDeskMoves(situation, enjoys){
    setGeneratingDesk(true);
    const c=currentClient;
const sit=SITUATIONS.find(s=>s.id===situation);
    const isGym=situation==="gym";
    const prompt=isGym?
`Create exactly 5 gym exercises targeting: ${enjoys}. Client: ${c.name}, age ${c.age}, fitness level: ${c.level}, equipment: ${c.equipment||"full gym"}, goal: ${c.goal}.

INJURIES TO RESPECT: ${c.injury&&c.injury!=="none"?`Client has: ${c.injury}. AVOID exercises that aggravate this.`:"None reported."}

Rules:
- All exercises use GYM EQUIPMENT (machines, barbells, dumbbells, cables)
- Include specific weight suggestions based on ${c.level} fitness level
- Each exercise: sets, reps, rest period, form tip
- Focus ONLY on ${enjoys} — do not mix muscle groups
- Progress from compound to isolation exercises

Return ONLY valid JSON array (no markdown):
[{"id":"ex1","icon":"💪","label":"Exercise Name","unit":"reps","defaultAmt":10,"instruction":"Sets x Reps, weight suggestion, form tip"}]`
:
`Create exactly 5 quick exercises for someone who is currently: "${sit?.label||situation}". They enjoy: "${enjoys||c.likes||"general fitness"}". Client: ${c.name}, age ${c.age}, fitness level: ${c.level}, goal: ${c.goal}.

INJURIES & MEDICAL CONDITIONS TO RESPECT: ${c.injury&&c.injury!=="none"?`Client has: ${c.injury}. AVOID any exercises that aggravate this.`:"None reported."} ${c.medical&&c.medical!=="none"?`Medical conditions: ${c.medical}. Keep exercises safe and appropriate.`:""}

IMPORTANT RULES based on situation:
- "Driving / in car": ONLY safe seated exercises (shoulder rolls, neck stretches, hand squeezes, breathing, calf raises at stops). NO exercises requiring both hands or eyes off road.
- "At my desk": ${enjoys.includes("Standing")?'Client is FREE TO MOVE near their desk — they are NOT tied to their chair. Give them a mix of floor exercises (push-ups, planks, ab work, burpees), standing moves, and desk-assisted exercises. They have full range of motion in their desk area.':enjoys.includes("Seated")?'Client is SEATED at their desk — focus on seated exercises only (chair stretches, seated core, leg raises, desk stretches).':'Mix of seated AND standing/floor exercises near the desk.'}
- "In a small space": bodyweight only, no equipment, minimal floor space
- "Outside / walking": walking-friendly moves they can do while moving or on a quick stop

Each exercise must be doable in 1-3 minutes. Tailor entirely to their situation, what they enjoy, AND their injury status.
Return ONLY valid JSON array (no markdown):
[{"id":"ex1","icon":"💪","label":"Exercise Name","unit":"reps","defaultAmt":10,"instruction":"Clear safe instruction for this situation"}]`;
    try{
      const raw=await callClaude(prompt);
      const moves=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const newProfile={...moveProfile,[c.id]:{situation,enjoys,moves,generatedAt:todayStr()}};
      setMoveProfile(newProfile);
      try{localStorage.setItem(MOVEPROFILE_KEY,JSON.stringify(newProfile));}catch(e){}
      persist(null,null,null,null,null,{...deskMoves,[c.id]:moves},null,null);
    }catch(e){ console.error(e); }
    setGeneratingDesk(false);
  }

  function logDeskMove(moveId,amt){
    const today=todayStr(); const cid=currentClient.id;
    const existing=(deskLog[cid]||{})[today]||{};
    persist(null,null,null,null,{...deskLog,[cid]:{...(deskLog[cid]||{}),[today]:{...existing,[moveId]:(existing[moveId]||0)+amt}}},null,null,null);
  }

  function logSet(di,ei){ const k=`${di}-${ei}`; setLoggedSets(p=>({...p,[k]:(p[k]||0)+1})); }

  function sendCoachMessage(cid,text){
    if(!text.trim())return;
    persist(null,null,{...messages,[cid]:[...(messages[cid]||[]),{from:"coach",text,ts:new Date().toISOString()}]},null,null,null,null,null);
    setMsgDraft(p=>({...p,[cid]:""}));
  }

  async function getAIEncouragement(){
    setAiLoading(true); setAiReply("");
    const c=currentClient;
    const tl=(logs[c.id]||{})[todayStr()];
    const recentRatings=(ratings[c.id]||[]).slice(-3);
    const avgRating=recentRatings.length>0?(recentRatings.reduce((a,r)=>a+r.rating,0)/recentRatings.length).toFixed(1):null;
    const workoutCount=(ratings[c.id]||[]).length;
    const prompt=`You are a warm faith-based coach for "All Things Possible." Client: ${c.name}, age ${c.age}, goal: "${c.goal}". ${tl?`Today: mood=${tl.mood}, energy=${tl.energy}.`:""} ${workoutCount>0?`Workout activity: ${workoutCount} workouts logged, recent avg difficulty rating ${avgRating}/5.`:"No workouts logged yet."} Write 3-4 sentences of warm personal encouragement rooted in Christian faith. IMPORTANT: If they have logged workouts, specifically acknowledge the hard work they are putting in at the gym or during their workouts — not just nutrition. Celebrate both their physical effort AND their eating habits. End with a short scripture. Be genuine and personal.`;
    try{ const r=await callClaude(prompt); setAiReply(r); }
    catch(e){ setAiReply("You are fearfully and wonderfully made. Keep going — all things are possible!"); }
    setAiLoading(false);
  }
function submitSelfReg(){
    if(selfReg.passcode.length<4){ setSelfRegError("Passcode must be at least 4 characters."); return; }
    if(selfReg.passcode!==selfReg.confirmPasscode){ setSelfRegError("Passcodes don't match — please try again."); return; }
    if(clients.find(c=>c.passcode===selfReg.passcode)){ setSelfRegError("That passcode is taken — choose a different one."); return; }
    const equipList=[...selfReg.equipment,...(selfReg.equipmentOther.trim()?[selfReg.equipmentOther.trim()]:[])].join(", ")||"None";
    const nc={
      id:"c"+Date.now(), name:selfReg.name, age:parseInt(selfReg.age)||0,
      weight:parseFloat(selfReg.weight)||0, goalWeight:parseFloat(selfReg.goalWeight)||0,
      goal:selfReg.goal||"General wellness", level:selfReg.level,
      joined:todayStr(), avatar:selfReg.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
      likes:selfReg.likes||"", equipment:equipList,
     workoutDays:selfReg.workoutDays, workoutTime:selfReg.workoutTime||"Morning",
      workoutDuration:selfReg.workoutDuration||"45 min",
      quickMoveDays:selfReg.quickMoveDays, longRunDay:selfReg.longRunDay||"",
      canUpdateSchedule:selfReg.canUpdateSchedule,
      injury:selfReg.injury||"none", medical:selfReg.medical||"none",
      passcode:selfReg.passcode, active:true, onboarded:true
    };
    const newClients=[...clients,nc];
    persist(newClients,null,null,null,null,null,null,null);
    // Force immediate Supabase push for new registration
    sbSetGlobal(CLIENTS_KEY, newClients);
    setCurrentClient(nc); setScreen("client"); setTab("prayer");
    setLoginMode("select");
    try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"client",clientId:nc.id})); }catch(e){}
  }
function submitSelfReg(){
    if(selfReg.passcode.length<4){ setSelfRegError("Passcode must be at least 4 characters."); return; }
    if(selfReg.passcode!==selfReg.confirmPasscode){ setSelfRegError("Passcodes don't match — please try again."); return; }
    if(clients.find(c=>c.passcode===selfReg.passcode)){ setSelfRegError("That passcode is taken — choose a different one."); return; }
    const equipList=[...selfReg.equipment,...(selfReg.equipmentOther.trim()?[selfReg.equipmentOther.trim()]:[])].join(", ")||"None";
    const nc={
      id:"c"+Date.now(), name:selfReg.name, email:selfReg.email||"", age:parseInt(selfReg.age)||0,
      weight:parseFloat(selfReg.weight)||0, goalWeight:parseFloat(selfReg.goalWeight)||0,
      goal:selfReg.goal||"General wellness", level:selfReg.level,
      joined:todayStr(), avatar:selfReg.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
      likes:selfReg.likes||"", equipment:equipList,
     workoutDays:selfReg.workoutDays, workoutTime:selfReg.workoutTime||"Morning",
      workoutDuration:selfReg.workoutDuration||"45 min",
      quickMoveDays:selfReg.quickMoveDays, longRunDay:selfReg.longRunDay||"",
      canUpdateSchedule:selfReg.canUpdateSchedule,
      injury:selfReg.injury||"none", medical:selfReg.medical||"none",
      passcode:selfReg.passcode, active:true, onboarded:true
    };
   
const newClients=[...clients,nc];
    persist(newClients,null,null,null,null,null,null,null);
    sbSetGlobal(CLIENTS_KEY, newClients);
    setCurrentClient(nc); setScreen("client"); setTab("prayer");
    setLoginMode("select");
    try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"client",clientId:nc.id})); }catch(e){}
  }
  // ── HEALTH BOARD HELPERS ──────────────────────────────────────────────────
  const CYAN="#22d3ee";
  function getLoginStatus(cid){
    const allDates=Object.keys(logs[cid]||{}).sort().reverse();
    if(allDates.length===0) return{color:CYAN,reason:"Never logged in — reach out to get them started!"};
    const diff=Math.floor((new Date()-new Date(allDates[0]+"T12:00:00"))/86400000);
    if(diff<=2) return{color:"#4ade80",reason:`Checked in ${diff===0?"today":diff===1?"yesterday":`${diff} days ago`}`};
    if(diff<=5) return{color:"#facc15",reason:`Last check-in ${diff} days ago — nudge them!`};
    return{color:"#f87171",reason:`No check-in in ${diff} days — follow up needed`};
  }
  function getWeightStatus(cid){
    const weightLogs=Object.values(logs[cid]||{}).filter(l=>l.weight&&l.date).sort((a,b)=>a.date>b.date?1:-1);
    if(weightLogs.length<2) return{color:CYAN,reason:"Not enough weigh-ins yet — encourage them to log Tuesday & Friday"};
    const last=weightLogs[weightLogs.length-1];
    const prev=weightLogs[weightLogs.length-2];
    const diff=+(parseFloat(last.weight)-parseFloat(prev.weight)).toFixed(1);
    if(diff<=-1.5&&diff>=-3) return{color:"#4ade80",reason:`Lost ${Math.abs(diff)} lbs — perfect healthy range!`};
    if(diff>-1.5&&diff<=0) return{color:"#facc15",reason:`Only lost ${Math.abs(diff)} lbs — below target pace of 1.5-3 lbs/week`};
    if(diff>0&&diff<=1.5) return{color:"#facc15",reason:`Gained ${diff} lbs — worth checking in on`};
    if(diff<-3) return{color:"#f87171",reason:`Lost ${Math.abs(diff)} lbs — losing too fast, may need adjustment`};
    return{color:"#f87171",reason:`Gained ${diff} lbs — coach follow-up needed`};
  }
  function getNutritionStatus(cid){
    const clientWeight=clients.find(c=>c.id===cid)?.weight||150;
    const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
    if(nutriDays.length===0) return{color:CYAN,reason:"No meals logged this week — encourage them to start tracking"};
    const score=Math.round(nutriDays.reduce((acc,date)=>{
      const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");
      const t=getDayTotals(meals); const tgt=getTargets(clientWeight);
      return acc+(t.protein>=tgt.protein*0.8?40:t.protein>=tgt.protein*0.6?20:0)+(t.carbs<=tgt.carbs?30:t.carbs<=tgt.carbs*1.2?15:0)+(t.sugar<=tgt.sugar?30:t.sugar<=tgt.sugar*1.3?15:0);
    },0)/nutriDays.length);
    if(score>=70) return{color:"#4ade80",reason:`Nutrition score ${score}% — eating well!`};
    if(score>=50) return{color:"#facc15",reason:`Nutrition score ${score}% — room for improvement`};
    return{color:"#f87171",reason:`Nutrition score ${score}% — struggling, needs coaching`};
  }
  function getWorkoutStatus(cid){
    const clientR=ratings[cid]||[];
    if(clientR.length===0) return{color:CYAN,reason:"No workouts logged yet — help them get started"};
    const last=clientR[clientR.length-1];
    const daysSince=Math.floor((new Date()-new Date(last.date+"T12:00:00"))/86400000);
    const recent=clientR.slice(-3);
    const allOne=recent.length>=3&&recent.every(r=>r.rating===1);
    const allFive=recent.length>=3&&recent.every(r=>r.rating===5);
    if(daysSince>=6) return{color:"#f87171",reason:`No workout in ${daysSince} days — check in!`};
    if(allOne) return{color:"#f87171",reason:"Last 3 workouts rated Too Easy — plan needs adjusting"};
    if(allFive) return{color:"#f87171",reason:"Last 3 workouts rated Too Hard — client may be struggling"};
    if(daysSince>=3) return{color:"#facc15",reason:`Last workout ${daysSince} days ago — gentle nudge time`};
    const mixed=recent.some(r=>r.rating===1)&&recent.some(r=>r.rating===5);
    if(mixed) return{color:"#facc15",reason:"Inconsistent workout ratings — check in with client"};
    return{color:"#4ade80",reason:`Workout logged ${daysSince===0?"today":daysSince===1?"yesterday":`${daysSince} days ago`} — on track!`};
  }
  function getMessageStatus(cid){
    const allMsgs=messages[cid]||[];
    const coachMsgs=allMsgs.filter(m=>m.from==="coach");
    const clientMsgs2=allMsgs.filter(m=>m.from==="client");
    if(allMsgs.length===0) return{color:CYAN,reason:"No messages yet — send a welcome message!"};
    // Check if there's an unanswered client message
    if(clientMsgs2.length>0){
      const lastClientMsg=clientMsgs2[clientMsgs2.length-1];
      const lastCoachMsg=coachMsgs.length>0?coachMsgs[coachMsgs.length-1]:null;
      const clientMsgTime=new Date(lastClientMsg.ts).getTime();
      const coachMsgTime=lastCoachMsg?new Date(lastCoachMsg.ts).getTime():0;
      if(clientMsgTime>coachMsgTime){
        // Client messaged after last coach reply
        const waitMins=Math.floor((Date.now()-clientMsgTime)/60000);
        const waitHrs=Math.floor(waitMins/60);
        const msgSentToday=new Date(lastClientMsg.ts).toDateString()===new Date().toDateString();
        if(waitMins<=120) return{color:"#4ade80",reason:`Client messaged ${waitMins}min ago — within 2hr window`};
        if(msgSentToday) return{color:"#facc15",reason:`Client messaged ${waitHrs}hrs ago — reply today!`};
        return{color:"#f87171",reason:`Client message unanswered since ${new Date(lastClientMsg.ts).toLocaleDateString()} — urgent!`};
      }
    }
    // No unanswered client message — check coach's last outreach
    if(coachMsgs.length===0) return{color:CYAN,reason:"No messages sent yet — reach out!"};
    const lastCoach=coachMsgs[coachMsgs.length-1];
    const minsSince=Math.floor((Date.now()-new Date(lastCoach.ts).getTime())/60000);
    if(minsSince<=120) return{color:"#4ade80",reason:`Last message sent ${minsSince} min ago`};
    const sameDay=new Date(lastCoach.ts).toDateString()===new Date().toDateString();
    if(sameDay) return{color:"#facc15",reason:"Messaged today but over 2 hours ago"};
    return{color:"#f87171",reason:`Last message ${Math.floor(minsSince/1440)} days ago — client may feel unsupported`};
  }
  function getOverallStatus(cid){
    const statuses=[getLoginStatus(cid),getWeightStatus(cid),getNutritionStatus(cid),getWorkoutStatus(cid),getMessageStatus(cid)];
    if(statuses.some(s=>s.color==="#f87171")) return "#f87171";
    if(statuses.some(s=>s.color==="#facc15")) return "#facc15";
    if(statuses.some(s=>s.color===CYAN)) return CYAN;
    return "#4ade80";
  }

  // ── PHOTO NUTRITION SCAN ──────────────────────────────────────────────────
  async function analyzePhoto(file){
    setAnalyzingPhoto(true); setPhotoMacros(null);
    try{
      const reader=new FileReader();
      reader.onload=async(e)=>{
        const base64=e.target.result.split(",")[1];
        const mediaType=file.type||"image/jpeg";
        const res=await fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
          body:JSON.stringify({
            model:"claude-haiku-4-5-20251001",
            max_tokens:1000,
            messages:[{role:"user",content:[
              {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
              {type:"text",text:`Look at this image carefully. If it shows a nutrition label, extract the EXACT values. If it shows a plate or bowl of food, ESTIMATE the macros based on what you see and approximate portion sizes. Either way return ONLY valid JSON (no markdown, no explanation): {"description":"What you identified in 1 sentence","protein":0,"fat":0,"carbs":0,"sugar":0,"calories":0,"confidence":"exact" or "estimated"}`}
            ]}]
          })
        });
        const data=await res.json();
        const raw=data.content?.[0]?.text||"{}";
        const macros=JSON.parse(raw.replace(/```json|```/g,"").trim());
        setPhotoMacros(macros);
        setAnalyzingPhoto(false);
      };
      reader.readAsDataURL(file);
    }catch(e){ console.error(e); setAnalyzingPhoto(false); }
  }

  function addNewClient(){


    if(!onboard.name||!onboard.weight||!onboard.passcode) return;
const nc={id:"c"+Date.now(),name:onboard.name,age:parseInt(onboard.age)||0,weight:parseFloat(onboard.weight)||0,goalWeight:parseFloat(onboard.goalWeight)||0,goal:onboard.goal||"General wellness",level:onboard.level,joined:todayStr(),avatar:onboard.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),likes:onboard.likes||"",passcode:onboard.passcode,active:true};
    persist([...clients,nc],null,null,null,null,null,null,null);
    setOnboard({name:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",passcode:""});
    setCoachTab("clients");
  }

  function updateClientPasscode(cid,newCode){
    if(!newCode.trim()) return;
    persist(clients.map(c=>c.id===cid?{...c,passcode:newCode.trim()}:c),null,null,null,null,null,null,null);
    setEditPasscode(p=>({...p,[cid]:""}));
  }

  // ── NUTRITION HELPERS ──────────────────────────────────────────────────────
  function getTargetedMeals(cid){ return Object.fromEntries(Object.entries(nutrition[cid]||{}).map(([date,meals])=>[date,(meals||[]).filter(m=>m.meal!=="__water__")])); }

  function getDayTotals(meals){ return (meals||[]).filter(m=>m.meal!=="__water__").reduce((a,m)=>({protein:a.protein+(m.protein||0),fat:a.fat+(m.fat||0),carbs:a.carbs+(m.carbs||0),sugar:a.sugar+(m.sugar||0),calories:a.calories+(m.calories||0)}),{protein:0,fat:0,carbs:0,sugar:0,calories:0}); }

  function getWeeklyNutrition(cid){
    const allMeals=getTargetedMeals(cid);
    const days=Object.keys(allMeals).sort().slice(-7).filter(d=>allMeals[d].length>0);
    if(days.length===0) return null;
    const totals=days.reduce((acc,date)=>{ const t=getDayTotals(allMeals[date]); return {protein:acc.protein+t.protein,fat:acc.fat+t.fat,carbs:acc.carbs+t.carbs,sugar:acc.sugar+t.sugar,calories:acc.calories+t.calories,days:acc.days+1}; },{protein:0,fat:0,carbs:0,sugar:0,calories:0,days:0});
    return totals.days>0?{protein:Math.round(totals.protein/totals.days),fat:Math.round(totals.fat/totals.days),carbs:Math.round(totals.carbs/totals.days),sugar:Math.round(totals.sugar/totals.days),calories:Math.round(totals.calories/totals.days),days:totals.days}:null;
  }

  // ── SHARED STYLES ─────────────────────────────────────────────────────────
  const card={background:G.white,borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(45,106,79,.08)",border:`1px solid ${G.border}`};
  const iStyle={width:"100%",padding:"10px 13px",borderRadius:10,border:`1.5px solid ${G.border}`,background:G.cream,color:G.text,fontSize:"0.82rem",outline:"none",fontFamily:"'Palatino Linotype',Palatino,serif",boxSizing:"border-box"};
  const btnGreen={padding:"12px 20px",borderRadius:12,border:"none",background:`linear-gradient(135deg,${G.green},${G.greenMid})`,color:G.white,fontSize:"0.85rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%",boxShadow:`0 4px 14px rgba(45,106,79,.3)`};
  const btnMango={...btnGreen,background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,boxShadow:`0 4px 14px rgba(231,111,81,.3)`};
  const lbl={fontSize:"0.66rem",color:G.textSoft,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1};
  const todayStretch=DAILY_STRETCHES[getDayOfWeek()%DAILY_STRETCHES.length];

  // Prayer must be completed today before other tabs unlock
   const todayLog     = currentClient ? (logs[currentClient.id]||{})[todayStr()] : null;
  const prayerDoneToday = todayLog?.prayerDone || false; const [lockedMsg,setLockedMsg] = useState("");
  const [showMoreMenu,setShowMoreMenu] = useState(false);
  const clientPlan   = currentClient ? plans[currentClient.id] : null;
  const clientMoves  = currentClient ? (deskMoves[currentClient.id]||[]) : [];
  const todayDeskLog = currentClient ? ((deskLog[currentClient.id]||{})[todayStr()]||{}) : {};
  const clientMsgs   = currentClient ? (messages[currentClient.id]||[]).filter(m=>m.from==="coach") : [];
  const clientLogs   = currentClient ? (logs[currentClient.id]||{}) : {};
  const allLogs      = Object.values(clientLogs).sort((a,b)=>a.date>b.date?-1:1);
  const clientRatings= currentClient ? (ratings[currentClient.id]||[]) : [];
  const todayMeals   = currentClient ? ((nutrition[currentClient.id]||{})[todayStr()]||[]).filter(m=>m.meal!=="__water__") : [];
  const todayTotals  = getDayTotals(todayMeals);
  const targets      = currentClient ? getTargets(currentClient.weight) : getTargets(150);
  const todayWater   = currentClient ? getTodayWater(currentClient.id) : 0;
  const weighDay     = isWeighDay();

  function MacroBar({label,value,target,isLow=false,unit="g"}){
    const color=trafficLight(value,target,isLow);
    const pct=Math.min(100,Math.round((value/target)*100));
    return(<div><div style={{display:"flex",justifyContent:"space-between",fontSize:"0.66rem",marginBottom:2}}><span style={{color:G.textSoft,fontWeight:600}}>{label}</span><span style={{color,fontWeight:700}}>{value}{unit} <span style={{color:G.textSoft,fontWeight:400}}>/ {target}{unit}</span></span></div><div style={{height:6,background:G.creamDark,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:3,transition:"width .4s"}}/></div></div>);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLASH
  // ═══════════════════════════════════════════════════════════════════════════
  if(screen==="splash") return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${G.green},${G.greenMid} 50%,${G.mango})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Palatino Linotype',Palatino,serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:90,height:90,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"3px solid rgba(255,255,255,.5)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:"2.8rem"}}>✦</div>
        <div style={{fontSize:"2rem",fontWeight:900,color:G.white,textShadow:"0 2px 8px rgba(0,0,0,.2)"}}>All Things Possible</div>
        <div style={{fontSize:"0.85rem",color:"rgba(255,255,255,.85)",marginTop:6,letterSpacing:"2px",textTransform:"uppercase"}}>Health & Wellness Coaching</div>
        <div style={{marginTop:28,fontSize:"0.82rem",color:"rgba(255,255,255,.7)",fontStyle:"italic"}}>Philippians 4:13</div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  if(screen==="login"){
    const Header=()=>(<div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"26px 24px 20px",textAlign:"center"}}><div style={{width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 10px",fontSize:"1.6rem"}}>✦</div><div style={{fontSize:"1.5rem",fontWeight:900,color:G.white}}>All Things Possible</div><div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.8)",marginTop:4,fontStyle:"italic"}}>"I can do all things through Christ who strengthens me"</div></div>);
    if(loginMode==="select") return(
      <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}><Header/>
        <div style={{flex:1,padding:"22px 20px",display:"flex",flexDirection:"column",gap:12}}>
  <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",marginBottom:2}}>Enter your passcode to sign in</div>
         {/* Welcome message */}
          <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none",marginBottom:4}}>
            <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6,textAlign:"center"}}>Welcome to</div>
            <div style={{fontSize:"1.1rem",fontWeight:900,color:G.white,textAlign:"center",marginBottom:4}}>All Things Possible</div>
            <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.85)",fontStyle:"italic",textAlign:"center",marginBottom:10}}>"I can do all things through Christ who strengthens me." — Philippians 4:13</div>
            <div style={{width:"100%",height:1,background:"rgba(255,255,255,.2)",marginBottom:10}}/>
            <div style={{fontSize:"0.78rem",fontWeight:700,color:G.white,textAlign:"center",marginBottom:8}}>This is not a diet. This is a lifestyle.</div>
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.88)",lineHeight:1.75,marginBottom:10}}>Welcome to a coaching program designed to transform how you think about your health, and your relationship with food — from the inside out. Together we will train your body and mind to embrace a new way of eating and living based on the <strong style={{color:"#fde68a"}}>Upside-Down Food Pyramid</strong> — a proven approach that puts high-quality proteins and healthy fats first, and minimizes sugar, refined carbs, and processed foods.</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:10}}>
              {["🥩 Fuel your body with lean proteins, eggs, fish, and meat","🥑 Embrace healthy fats that nourish and satisfy","🥦 Fill your plate with vibrant vegetables","🍬 Reduce sugar, starchy carbs, and processed foods","💧 Hydrate, move, pray, and rest with intention"].map((item,i)=>(
                <div key={i} style={{fontSize:"0.7rem",color:"rgba(255,255,255,.9)",display:"flex",alignItems:"flex-start",gap:6}}><span style={{flexShrink:0}}>{item.split(" ")[0]}</span><span>{item.split(" ").slice(1).join(" ")}</span></div>
              ))}
            </div>
            <div style={{width:"100%",height:1,background:"rgba(255,255,255,.2)",marginBottom:10}}/>
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.88)",lineHeight:1.7,textAlign:"center",marginBottom:6}}>This is a journey — not a race. <strong style={{color:"#fde68a"}}>Progress over perfection. Grace over guilt. Faith over fear.</strong></div>
            <div style={{fontSize:"0.78rem",fontWeight:700,color:G.white,textAlign:"center"}}>We are so glad you are here. 🙏</div>
          </div>
          {/* Passcode login */}
          <div style={card}>
            <div style={{fontSize:"0.66rem",color:G.textSoft,fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:1}}>Your Passcode</div>
            <div style={{position:"relative"}}>
              <input type={showPass?"text":"password"} value={passcodeInput} onChange={e=>{setPasscodeInput(e.target.value);setPasscodeError("");}} onKeyDown={e=>{
                if(e.key==="Enter"&&passcodeInput.trim()){
                  if(passcodeInput.trim()===COACH_PASS){ setScreen("coach"); setCoachTab("clients"); setPasscodeInput(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"coach"})); }catch(ex){} return; }
                  const found=clients.find(c=>c.passcode===passcodeInput.trim()&&c.active!==false);
            if(passcodeInput.trim()===COACH_PASS){ setScreen("coach"); setCoachTab("clients"); setPasscodeInput(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"coach"})); }catch(ex){} return; }
                  else if(found){ setCurrentClient(found); setScreen("client"); setTab("prayer"); setPasscodeInput(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"client",clientId:found.id})); }catch(ex){} }
                  else{ setPasscodeError("Passcode not found. Please try again or contact your coach."); setPasscodeInput(""); }
                }
              }} placeholder="Enter your passcode..." autoFocus style={{...iStyle,paddingRight:48}}/>
              <button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"1rem",color:G.textSoft}}>{showPass?"🙈":"👁️"}</button>
            </div>
            {passcodeError&&<div style={{marginTop:8,padding:"8px 12px",background:G.redLight,borderRadius:8,fontSize:"0.74rem",color:G.red}}>{passcodeError}</div>}
          </div>
          <button onClick={()=>{
            if(passcodeInput.trim()===COACH_PASS){ setScreen("coach"); setCoachTab("clients"); setPasscodeInput(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"coach"})); }catch(e){} return; }
            const found=clients.find(c=>c.passcode===passcodeInput.trim()&&c.active!==false);
            if(found){ setCurrentClient(found); setScreen("client"); setTab("prayer"); setPasscodeInput(""); try{ localStorage.setItem(SESSION_KEY,JSON.stringify({role:"client",clientId:found.id})); }catch(e){} }
            else{ setPasscodeError("Passcode not found. Please try again or contact your coach."); setPasscodeInput(""); }
          }} disabled={!passcodeInput.trim()} style={{...btnGreen,opacity:passcodeInput.trim()?1:0.5}}>🔓 Sign In</button>
          <button onClick={()=>setLoginMode("forgot")} style={{background:"transparent",border:"none",color:G.mango,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",textAlign:"center"}}>Forgot passcode?</button>
          <div style={{textAlign:"center",marginTop:6,display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{setSelfRegGroup(-1);setSelfRegError("");setInviteCodeInput("");setSelfReg({name:"",email:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",equipment:[],equipmentOther:"",workoutDays:[],workoutTime:"Morning",quickMoveDays:[],longRunDay:"",canUpdateSchedule:true,injury:"none",medical:"none",passcode:"",confirmPasscode:""});setLoginMode("register");}} style={{padding:"11px 20px",borderRadius:12,border:`1.5px solid ${G.greenMid}`,background:"#d8f3dc",color:G.green,fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✦ New Client? Register Here</button>
            <button onClick={()=>setLoginMode("coach")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>Coach login</button>
          </div>
        </div>
      </div>
    );
    if(loginMode==="passcode"&&loginTarget) return(
      <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}><Header/>
        <div style={{flex:1,padding:"28px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{textAlign:"center"}}><div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",fontWeight:700,color:G.white,margin:"0 auto 10px"}}>{loginTarget.avatar}</div><div style={{fontSize:"1rem",fontWeight:700,color:G.text}}>Hi, {loginTarget.name.split(" ")[0]}! 👋</div><div style={{fontSize:"0.74rem",color:G.textSoft,marginTop:3}}>Enter your personal passcode</div></div>
          <div style={card}><div style={lbl}>Your Passcode</div><div style={{position:"relative"}}><input type={showPass?"text":"password"} value={passcodeInput} onChange={e=>{setPasscodeInput(e.target.value);setPasscodeError("");}} onKeyDown={e=>e.key==="Enter"&&submitPasscode()} placeholder="Enter your passcode" autoFocus style={{...iStyle,paddingRight:48}}/><button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"1rem",color:G.textSoft}}>{showPass?"🙈":"👁️"}</button></div>{passcodeError&&<div style={{marginTop:8,padding:"8px 12px",background:G.redLight,borderRadius:8,fontSize:"0.74rem",color:G.red}}>{passcodeError}</div>}</div>
          <button onClick={submitPasscode} disabled={!passcodeInput.trim()} style={{...btnGreen,opacity:passcodeInput.trim()?1:0.5}}>🔓 Sign In</button>
          <div style={{textAlign:"center"}}><button onClick={()=>{setLoginMode("select");setPasscodeInput("");setPasscodeError("");}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>← Back</button></div>
        </div>
      </div>
    );
    if(loginMode==="forgot") return(
      <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}>
        <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"26px 24px 20px",textAlign:"center"}}><div style={{fontSize:"1.5rem",fontWeight:900,color:G.white}}>All Things Possible</div></div>
        <div style={{flex:1,padding:"28px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{textAlign:"center",fontSize:"2rem",marginBottom:4}}>🔑</div>
          <div style={card}><div style={{fontSize:"0.9rem",fontWeight:700,color:G.green,marginBottom:8,textAlign:"center"}}>Forgot Your Passcode?</div><div style={{fontSize:"0.78rem",color:G.textSoft,lineHeight:1.7,textAlign:"center"}}>No worries! Contact your coach and they'll send a reset code to your email, or generate a temporary passcode from their dashboard.</div></div>
          <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`}}><div style={{fontSize:"0.74rem",color:G.green,fontStyle:"italic",textAlign:"center",lineHeight:1.7}}>"Come to me, all you who are weary and burdened, and I will give you rest." — Matthew 11:28</div></div>
          <button onClick={()=>setLoginMode("select")} style={btnGreen}>← Back to Login</button>
        </div>
      </div>
    );

 if(loginMode==="register") {
      // Step 0 — invite code gate
      if(selfRegGroup===-1) return(
        <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}>
          <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"22px 24px 18px",textAlign:"center"}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontSize:"1.5rem"}}>✦</div>
            <div style={{fontSize:"1.3rem",fontWeight:900,color:G.white}}>All Things Possible</div>
            <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.8)",marginTop:3,fontStyle:"italic"}}>Begin your wellness journey</div>
          </div>
          <div style={{flex:1,padding:"28px 20px",display:"flex",flexDirection:"column",gap:16}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:"2rem",marginBottom:8}}>🔐</div><div style={{fontSize:"0.9rem",fontWeight:700,color:G.green,marginBottom:6}}>Enter Your Invite Code</div><div style={{fontSize:"0.74rem",color:G.textSoft,lineHeight:1.6}}>Your coach provided you with an invite code to join All Things Possible. Enter it below to get started.</div></div>
            <div style={card}>
              <div style={lbl}>Invite Code</div>
              <input value={inviteCodeInput} onChange={e=>{setInviteCodeInput(e.target.value);setSelfRegError("");}} placeholder="Enter your invite code..." style={iStyle} autoFocus/>
              {selfRegError&&<div style={{marginTop:8,padding:"8px 12px",background:G.redLight,borderRadius:8,fontSize:"0.74rem",color:G.red}}>{selfRegError}</div>}
            </div>
            <button onClick={()=>{
              if(inviteCodeInput.trim().toLowerCase()===inviteCode.toLowerCase()){setSelfRegError("");setSelfRegGroup(0);}
              else{setSelfRegError("Invalid invite code. Please check with your coach.");}
            }} disabled={!inviteCodeInput.trim()} style={{...btnGreen,opacity:inviteCodeInput.trim()?1:0.5}}>Continue →</button>
            <button onClick={()=>{setLoginMode("select");setInviteCodeInput("");setSelfRegError("");}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back</button>
          </div>
        </div>
      );

      const GROUPS=[
        {title:"Personal Info",icon:"👤",fields:[
          {q:"What's your full name?",field:"name",placeholder:"e.g. Maria Santos",type:"text"},
          {q:"Your email address",field:"email",placeholder:"e.g. maria@email.com",type:"email"},
          {q:"How old are you?",field:"age",placeholder:"e.g. 45",type:"number"},
          {q:"Current weight (lbs)?",field:"weight",placeholder:"e.g. 165",type:"number"},
          {q:"Goal weight (lbs)?",field:"goalWeight",placeholder:"e.g. 145",type:"number"},
        ]},
        {title:"Goals & Activity",icon:"🎯",fields:[
          {q:"What is your wellness goal?",field:"goal",placeholder:"e.g. Lose weight, feel energized, reduce stress...",type:"text"},
          {q:"What activities do you enjoy?",field:"likes",placeholder:"e.g. Walking, yoga, swimming, dancing...",type:"text"},
          {q:"Fitness level",field:"level",type:"select"},
        ]},
        {title:"Equipment",icon:"🏋️",fields:[
          {q:"What equipment do you have access to?",field:"equipment",type:"equipment"},
        ]},
        {title:"Workout Schedule",icon:"📅",fields:[
          {q:"Which days do you want to work out?",field:"workoutDays",type:"workoutDays"},
        ]},
        {title:"Health Info",icon:"🏥",fields:[
          {q:"Any injuries your coach should know about?",field:"injury",placeholder:"e.g. Bad left knee, or type 'none'",type:"text"},
          {q:"Any medical conditions your coach should know about?",field:"medical",placeholder:"e.g. Type 2 diabetes, or type 'none'",type:"text"},
        ]},
        {title:"Create Account",icon:"🔑",fields:[
          {q:"Create your personal passcode",field:"passcode",placeholder:"Min 4 characters — you'll use this to log in",type:"password"},
          {q:"Confirm your passcode",field:"confirmPasscode",placeholder:"Type your passcode again",type:"password"},
        ]},
      ];
      const group=GROUPS[selfRegGroup];
      const isLast=selfRegGroup===GROUPS.length-1;
      const groupComplete=()=>{
        if(group.fields[0].type==="equipment") return true;
        if(group.fields[0].type==="workoutDays") return selfReg.workoutDays.length>0;
        return group.fields.every(f=>f.type==="select"||selfReg[f.field]?.trim());
      };
      return(
        <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}>
          <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"22px 24px 18px",textAlign:"center"}}>
            <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px",fontSize:"1.5rem"}}>✦</div>
            <div style={{fontSize:"1.3rem",fontWeight:900,color:G.white}}>All Things Possible</div>
            <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.8)",marginTop:3,fontStyle:"italic"}}>Begin your wellness journey</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"20px 20px",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",gap:6,justifyContent:"center"}}>
              {GROUPS.map((_,i)=><div key={i} style={{flex:1,height:5,borderRadius:3,background:i<selfRegGroup?G.greenMid:i===selfRegGroup?G.green:G.border,transition:"background .3s"}}/>)}
            </div>
            <div style={{textAlign:"center",padding:"4px 0"}}>
              <div style={{fontSize:"1.8rem",marginBottom:4}}>{group.icon}</div>
              <div style={{fontSize:"0.95rem",fontWeight:700,color:G.green}}>{group.title}</div>
              <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:2}}>Step {selfRegGroup+1} of {GROUPS.length}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:11}}>
              {group.fields.map((f,i)=>(
                <div key={i} style={card}>
                  <div style={lbl}>{f.q}</div>
                  {f.type==="select"&&(
                    <div style={{display:"flex",gap:7}}>{["Beginner","Intermediate","Advanced"].map(l=><button key={l} onClick={()=>setSelfReg(p=>({...p,level:l}))} style={{flex:1,padding:"9px 0",borderRadius:10,border:`2px solid ${selfReg.level===l?G.greenMid:G.border}`,background:selfReg.level===l?"#d8f3dc":G.cream,color:selfReg.level===l?G.green:G.textSoft,fontSize:"0.74rem",fontWeight:selfReg.level===l?700:400,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>)}</div>
                  )}
                  {f.type==="equipment"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                        {EQUIPMENT_OPTIONS.map(eq=>(
                          <button key={eq} onClick={()=>toggleEquipment(eq)} style={{padding:"9px 10px",borderRadius:10,border:`2px solid ${selfReg.equipment.includes(eq)?G.greenMid:G.border}`,background:selfReg.equipment.includes(eq)?"#d8f3dc":G.cream,color:selfReg.equipment.includes(eq)?G.green:G.text,fontSize:"0.74rem",fontWeight:selfReg.equipment.includes(eq)?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                            {selfReg.equipment.includes(eq)?"✓ ":""}{eq}
                          </button>
                        ))}
                      </div>
                      <input value={selfReg.equipmentOther} onChange={e=>setSelfReg(p=>({...p,equipmentOther:e.target.value}))} placeholder="Other equipment (optional)..." style={iStyle}/>
                    </div>
                  )}
                  {f.type==="workoutDays"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      <div>
                        <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,marginBottom:8}}>📅 Select your workout days:</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          {DAYS_OF_WEEK.map(day=>(
                            <button key={day} onClick={()=>toggleWorkoutDay(day)} style={{padding:"9px 10px",borderRadius:10,border:`2px solid ${selfReg.workoutDays.includes(day)?G.green:G.border}`,background:selfReg.workoutDays.includes(day)?"#d8f3dc":G.cream,color:selfReg.workoutDays.includes(day)?G.green:G.text,fontSize:"0.76rem",fontWeight:selfReg.workoutDays.includes(day)?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                              {selfReg.workoutDays.includes(day)?"✓ ":""}{day}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,marginBottom:8}}>⏰ Preferred workout time:</div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {WORKOUT_TIMES.map(t=>(
                            <button key={t} onClick={()=>setSelfReg(p=>({...p,workoutTime:t}))} style={{padding:"8px 12px",borderRadius:20,border:`2px solid ${selfReg.workoutTime===t?G.green:G.border}`,background:selfReg.workoutTime===t?"#d8f3dc":G.cream,color:selfReg.workoutTime===t?G.green:G.textSoft,fontSize:"0.74rem",fontWeight:selfReg.workoutTime===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,marginBottom:4}}>⚡ Quick Move days:</div>
                        <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:8,lineHeight:1.6,padding:"6px 10px",background:"#f0faf4",borderRadius:8}}>Quick Moves are short 2-5 minute exercises you can do anywhere between workouts — at your desk, in a chair, or on the go. Which days would you like Quick Move suggestions?</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          {DAYS_OF_WEEK.map(day=>(
                            <button key={day} onClick={()=>toggleQuickMoveDay(day)} style={{padding:"9px 10px",borderRadius:10,border:`2px solid ${selfReg.quickMoveDays.includes(day)?G.greenMid:G.border}`,background:selfReg.quickMoveDays.includes(day)?"#d8f3dc":G.cream,color:selfReg.quickMoveDays.includes(day)?G.green:G.text,fontSize:"0.76rem",fontWeight:selfReg.quickMoveDays.includes(day)?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                              {selfReg.quickMoveDays.includes(day)?"✓ ":""}{day}
                            </button>
                          ))}
                        </div>
                      </div>
                      {(selfReg.goal?.toLowerCase().includes("run")||selfReg.likes?.toLowerCase().includes("run"))&&(
                        <div>
                          <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,marginBottom:8}}>🏃 Best day for your long run:</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                            {DAYS_OF_WEEK.map(day=>(
                              <button key={day} onClick={()=>setSelfReg(p=>({...p,longRunDay:day}))} style={{padding:"9px 10px",borderRadius:10,border:`2px solid ${selfReg.longRunDay===day?G.mangoDeep:G.border}`,background:selfReg.longRunDay===day?"#fff3e0":G.cream,color:selfReg.longRunDay===day?G.mangoDeep:G.text,fontSize:"0.76rem",fontWeight:selfReg.longRunDay===day?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                                {selfReg.longRunDay===day?"✓ ":""}{day}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
 {/* Workout duration */}
                      <div>
                        <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,marginBottom:8}}>⏱ Default workout duration:</div>
                        <div style={{display:"flex",gap:6}}>
                          {["30 min","45 min","60 min","90 min"].map(t=>(
                            <button key={t} onClick={()=>setSelfReg(p=>({...p,workoutDuration:t}))} style={{flex:1,padding:"9px 0",borderRadius:10,border:`2px solid ${selfReg.workoutDuration===t?G.green:G.border}`,background:selfReg.workoutDuration===t?"#d8f3dc":G.cream,color:selfReg.workoutDuration===t?G.green:G.textSoft,fontSize:"0.72rem",fontWeight:selfReg.workoutDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",background:"#f0faf4",borderRadius:10,border:`1px solid ${G.greenLight}`}}>
                        <button onClick={()=>setSelfReg(p=>({...p,canUpdateSchedule:!p.canUpdateSchedule}))} style={{width:24,height:24,borderRadius:5,border:`2px solid ${selfReg.canUpdateSchedule?G.greenMid:G.border}`,background:selfReg.canUpdateSchedule?G.greenMid:G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.85rem",flexShrink:0,marginTop:1}}>{selfReg.canUpdateSchedule?"✓":""}</button>
                        <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6}}>I understand I can update my workout schedule anytime from my profile settings.</div>
                      </div>
                    </div>
                  )}
                  {f.type!=="select"&&f.type!=="equipment"&&f.type!=="workoutDays"&&(
                    <input type={f.type} value={selfReg[f.field]||""} onChange={e=>{setSelfReg(p=>({...p,[f.field]:e.target.value}));setSelfRegError("");}} placeholder={f.placeholder} style={iStyle} autoFocus={i===0}/>
                  )}
                </div>
              ))}
              {selfRegError&&<div style={{padding:"8px 12px",background:G.redLight,borderRadius:8,fontSize:"0.74rem",color:G.red}}>{selfRegError}</div>}
            </div>
            <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`,padding:"10px 14px",textAlign:"center"}}>
              <div style={{fontSize:"0.72rem",color:G.green,fontStyle:"italic"}}>"I can do all things through Christ who strengthens me." — Philippians 4:13</div>
            </div>
            <button onClick={()=>{setSelfRegError("");if(isLast){submitSelfReg();}else{setSelfRegGroup(s=>s+1);}}} disabled={!groupComplete()} style={{...btnGreen,opacity:groupComplete()?1:0.5}}>
              {isLast?"✦ Begin My Journey →":"Continue →"}
            </button>
            {selfRegGroup>0&&<button onClick={()=>{setSelfRegGroup(s=>s-1);setSelfRegError("");}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back</button>}
            <button onClick={()=>{setLoginMode("select");setSelfRegGroup(0);setSelfRegError("");}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>Cancel</button>
          </div>
        </div>
      );
    }

    if(loginMode==="coach") return(
      <div style={{minHeight:"100vh",background:G.cream,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column"}}>
        <div style={{background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,padding:"26px 24px 20px",textAlign:"center"}}><div style={{fontSize:"1.5rem",fontWeight:900,color:G.white}}>Coach Login</div></div>
        <div style={{flex:1,padding:"28px 20px",display:"flex",flexDirection:"column",gap:16}}>
          <div style={{textAlign:"center",fontSize:"2rem"}}>👑</div>
          <div style={card}><div style={lbl}>Coach Password</div><div style={{position:"relative"}}><input type={showPass?"text":"password"} value={coachPassInput} onChange={e=>{setCoachPassInput(e.target.value);setCoachPassError("");}} onKeyDown={e=>e.key==="Enter"&&submitCoachPass()} placeholder="Enter coach password" autoFocus style={{...iStyle,paddingRight:48}}/><button onClick={()=>setShowPass(s=>!s)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:"1rem",color:G.textSoft}}>{showPass?"🙈":"👁️"}</button></div>{coachPassError&&<div style={{marginTop:8,padding:"8px 12px",background:G.redLight,borderRadius:8,fontSize:"0.74rem",color:G.red}}>{coachPassError}</div>}</div>
          <button onClick={submitCoachPass} disabled={!coachPassInput.trim()} style={{...btnMango,opacity:coachPassInput.trim()?1:0.5}}>👑 Enter Dashboard</button>
          <button onClick={()=>{setLoginMode("select");setCoachPassInput("");setCoachPassError("");}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline",textAlign:"center"}}>← Back</button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT APP
  // ═══════════════════════════════════════════════════════════════════════════
  if(screen==="client"&&currentClient){
const MAIN_TABS=[["prayer","🙏","Prayer"],["checkin","📋","Check-In"],["workout","💪","Workout"],["desk","⚡","Quick Move"],["nutrition","🥗","Nutrition"]];
    const MORE_TABS=[["stats","🔢","My Stats"],["progress","📈","Progress"],["messages","💌","Messages"],["hiit","🔥","HIIT"]];
    const ALL_TABS=[...MAIN_TABS,...MORE_TABS];
    return(
      <div style={{minHeight:"100vh",background:G.creamDark,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
       {/* Header */}
        <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"12px 16px 9px",position:"sticky",top:0,zIndex:10,boxShadow:"0 3px 16px rgba(45,106,79,.25)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div><div style={{fontSize:"0.92rem",fontWeight:900,color:G.white}}>✦ All Things Possible</div><div style={{fontSize:"0.64rem",color:"rgba(255,255,255,.8)"}}>Hi, {currentClient.name.split(" ")[0]}! &nbsp;{new Date().toLocaleDateString("en-US",{weekday:"short",month:"2-digit",day:"2-digit",year:"2-digit"})}</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:"1rem",fontWeight:900,color:G.white}}>{currentClient.weight} lbs</div><button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.7)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button></div>
          </div>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.54rem",color:"rgba(255,255,255,.75)",marginBottom:2}}><span>Goal: {currentClient.goalWeight} lbs</span><span>{Math.max(0,currentClient.weight-currentClient.goalWeight)} lbs to go</span></div>
            <div style={{height:4,background:"rgba(255,255,255,.2)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,Math.max(0,((220-currentClient.weight)/(220-(currentClient.goalWeight||150)))*100))}%`,background:G.mango,borderRadius:2}}/></div>
          </div>
        </div>
{/* Tabs */}
        <div style={{display:"flex",borderBottom:`1px solid ${G.border}`,background:G.white,overflowX:"auto",scrollbarWidth:"none"}}>
      
          {MAIN_TABS.map(([id,icon,label])=>{
            const locked=id!=="prayer"&&!prayerDoneToday;
            return(<button key={id} onClick={()=>{
              if(locked){setLockedMsg("Complete your prayer and check the box at the bottom of the Prayer tab to unlock the rest of your day. 💚");setTab("prayer");return;}
              setLockedMsg("");setTab(id);setShowMoreMenu(false);
            }} style={{flexShrink:0,padding:"7px 9px",border:"none",background:"transparent",color:tab===id?G.green:locked?"#c8b8a8":G.textSoft,borderBottom:tab===id?`2px solid ${G.green}`:"2px solid transparent",fontSize:"0.55rem",fontWeight:tab===id?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:52,opacity:locked?0.6:1}}>
              <span style={{fontSize:"0.82rem"}}>{locked?"🔒":icon}</span>
              <span>{label}</span>
            </button>);
          })}
          {/* More button */}
          <button onClick={()=>setShowMoreMenu(m=>!m)} style={{flexShrink:0,padding:"7px 9px",border:"none",background:"transparent",color:MORE_TABS.some(([id])=>tab===id)?G.green:G.textSoft,borderBottom:MORE_TABS.some(([id])=>tab===id)?`2px solid ${G.green}`:"2px solid transparent",fontSize:"0.55rem",fontWeight:MORE_TABS.some(([id])=>tab===id)?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:1,minWidth:52,position:"relative"}}>
            <span style={{fontSize:"0.82rem"}}>•••</span>
            <span>More</span>
            {clientMsgs.length>0&&!prayerDoneToday===false&&<div style={{position:"absolute",top:4,right:8,width:6,height:6,borderRadius:"50%",background:G.mangoDeep}}/>}
          </button>
       </div>
        {/* More dropdown — outside tab bar so it's not clipped */}
        {showMoreMenu&&(
          <div style={{position:"fixed",top:106,right:4,background:G.white,border:`1px solid ${G.border}`,borderRadius:12,boxShadow:"0 8px 24px rgba(0,0,0,.15)",zIndex:100,minWidth:160,overflow:"hidden"}}>
            {MORE_TABS.map(([id,icon,label])=>{
              const locked=!prayerDoneToday;
              return(<button key={id} onClick={()=>{
                if(locked){setLockedMsg("Complete your prayer first to unlock all features. 💚");setTab("prayer");setShowMoreMenu(false);return;}
                setTab(id);setShowMoreMenu(false);setLockedMsg("");
              }} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"11px 16px",border:"none",background:tab===id?"#f0faf4":G.white,color:tab===id?G.green:G.text,fontSize:"0.78rem",fontWeight:tab===id?700:400,cursor:"pointer",fontFamily:"inherit",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:"1rem"}}>{locked?"🔒":icon}</span>
                <span>{label}</span>
                {id==="messages"&&clientMsgs.length>0&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:G.mangoDeep}}/>}
              </button>);
            })}
          </div>
        )}   

       {showMoreMenu&&<div onClick={()=>setShowMoreMenu(false)} style={{position:"fixed",inset:0,zIndex:99}}/>}

        {lockedMsg&&(
          <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"10px 16px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:"1.2rem"}}>🙏</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"0.74rem",fontWeight:700,color:G.white,marginBottom:2}}>Start with Prayer First</div>
              <div style={{fontSize:"0.66rem",color:"rgba(255,255,255,.85)"}}>{lockedMsg}</div>
            </div>
            <button onClick={()=>setLockedMsg("")} style={{background:"rgba(255,255,255,.2)",border:"none",color:G.white,fontSize:"0.68rem",borderRadius:8,padding:"4px 8px",cursor:"pointer"}}>✕</button>
          </div>
        )}
       
        {/* ── CHECK-IN ── */}
        {tab==="checkin"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:11}}>
            {saved&&<div style={{background:"#d8f3dc",border:"1px solid #52b788",borderRadius:10,padding:"10px 14px",fontSize:"0.77rem",color:G.green,fontWeight:600,textAlign:"center"}}>✓ Check-in saved! Great work today. 🌟</div>}
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>Daily Check-In — {fmtDate(todayStr())}</div>

            {/* Mood */}
            <div style={card}><div style={lbl}>How are you feeling?</div><div style={{display:"flex",gap:5}}>{MOOD_OPTS.map(m=><button key={m.label} onClick={()=>setForm(p=>({...p,mood:m.label}))} style={{flex:1,padding:"7px 2px",borderRadius:10,border:`2px solid ${form.mood===m.label?G.greenMid:G.border}`,background:form.mood===m.label?"#d8f3dc":G.cream,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}><span style={{fontSize:"1.15rem"}}>{m.emoji}</span><span style={{fontSize:"0.5rem",color:form.mood===m.label?G.green:G.textSoft}}>{m.label}</span></button>)}</div></div>

            {/* Energy */}
            <div style={card}><div style={lbl}>Energy Level</div><div style={{display:"flex",gap:7}}>{ENERGY_OPTS.map(e=><button key={e} onClick={()=>setForm(p=>({...p,energy:e}))} style={{flex:1,padding:"8px 0",borderRadius:10,border:`2px solid ${form.energy===e?G.greenMid:G.border}`,background:form.energy===e?"#d8f3dc":G.cream,color:form.energy===e?G.green:G.textSoft,fontSize:"0.76rem",fontWeight:form.energy===e?700:400,cursor:"pointer",fontFamily:"inherit"}}>{e}</button>)}</div></div>

            {/* Weight — Tuesday & Friday only */}
            {weighDay?(
              <div style={{...card,border:`2px solid ${G.greenMid}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                  <div style={lbl}>⚖️ Weigh-In Day!</div>
                  <div style={{fontSize:"0.62rem",padding:"2px 9px",borderRadius:20,background:"#d8f3dc",color:G.green,fontWeight:700}}>Tue/Fri</div>
                </div>
                <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:8}}>Today is your scheduled weigh-in day. Step on the scale and log it!</div>
                <input type="number" value={form.weight} onChange={e=>setForm(p=>({...p,weight:e.target.value}))} placeholder="e.g. 163" style={iStyle}/>
              </div>
            ):(
              <div style={{...card,background:G.creamDark,border:`1px solid ${G.border}`}}>
                <div style={{fontSize:"0.72rem",color:G.textSoft,textAlign:"center"}}>⚖️ Next weigh-in: <strong style={{color:G.green}}>{getWeighDayName()}</strong> — keep up the great work until then!</div>
              </div>
            )}

            {/* 7-Day Nutrition Summary */}
            <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={lbl}>🥗 This Week's Eating</div>
                <button onClick={()=>generateNutriSummary(currentClient.id,currentClient.weight)} disabled={loadingNutri} style={{padding:"4px 10px",borderRadius:20,border:"none",background:loadingNutri?"#ccc":`linear-gradient(135deg,${G.green},${G.greenMid})`,color:G.white,fontSize:"0.62rem",fontWeight:700,cursor:loadingNutri?"not-allowed":"pointer"}}>
                  {loadingNutri?"Loading...":"↻ Refresh"}
                </button>
              </div>
              {nutriSummary?(
                <div style={{fontSize:"0.78rem",color:G.text,lineHeight:1.7,fontStyle:"italic"}}>{nutriSummary}</div>
              ):(
                <div style={{textAlign:"center",padding:"8px 0"}}>
                  <div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:8}}>Get a personalized summary of how you ate this week — encouragement, tips, and a gentle nudge if needed.</div>
                  <button onClick={()=>generateNutriSummary(currentClient.id,currentClient.weight)} disabled={loadingNutri} style={{...btnGreen,padding:"9px",fontSize:"0.77rem",background:loadingNutri?"#ccc":`linear-gradient(135deg,${G.green},${G.greenMid})`}}>
                    {loadingNutri?"Generating...":"✨ Get My Nutrition Summary"}
                  </button>
                </div>
              )}
            </div>

            {/* AI Encouragement */}
            <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`}}><div style={lbl}>✦ Your Coach Says</div>{aiReply?<div style={{fontSize:"0.79rem",color:G.text,lineHeight:1.65,fontStyle:"italic"}}>{aiReply}</div>:<button onClick={getAIEncouragement} disabled={aiLoading} style={{...btnMango,padding:"9px",fontSize:"0.77rem",background:aiLoading?"#ccc":`linear-gradient(135deg,${G.mango},${G.mangoDeep})`}}>{aiLoading?"Getting your message...":"💌 Get today's encouragement"}</button>}</div>

            <button onClick={submitCheckin} style={btnGreen}>✓ Save Check-In</button>
          </div>
        )}

   {/* ── WORKOUT ── */}
        {tab==="workout"&&(()=>{
          const cid=currentClient.id;
          const clientProgram=program[cid];
          const currentWeekNum=clientProgram?.currentWeek||1;
          const currentWeekPlan=clientProgram?.weeks[currentWeekNum];
          const phase=getPhase(currentWeekNum);
          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
             <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
           <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>💪 12-Week Program</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:"0.72rem",color:changingDuration?G.green:G.textSoft,fontWeight:700}}>{currentClient.workoutDuration||"45 min"}</div>
                <button onClick={()=>setChangingDuration(d=>!d)} style={{width:20,height:20,borderRadius:5,border:`2px solid ${changingDuration?G.greenMid:G.border}`,background:changingDuration?G.greenMid:G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.7rem",flexShrink:0}}>{changingDuration?"✓":""}</button>
              </div>
            </div>
            {changingDuration&&(
              <div style={{...card,padding:"10px 12px",marginBottom:4,border:`1px solid ${G.greenLight}`,background:"#f0faf4"}}>
                <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:7}}>Select your workout duration — next week will be generated to fit this time:</div>
                <div style={{display:"flex",gap:6}}>
                  {["30 min","45 min","60 min","90 min"].map(t=>{
                    const isSelected=(currentClient.workoutDuration||"45 min")===t;
                    return(<button key={t} onClick={()=>{
                      const nc=clients.map(c=>c.id===currentClient.id?{...c,workoutDuration:t}:c);
                      persist(nc,null,null,null,null,null,null,null);
                      setCurrentClient({...currentClient,workoutDuration:t});
                      setChangingDuration(false);
                    }} style={{flex:1,padding:"8px 0",borderRadius:10,border:`2px solid ${isSelected?G.green:G.border}`,background:isSelected?"#d8f3dc":G.cream,color:isSelected?G.green:G.textSoft,fontSize:"0.72rem",fontWeight:isSelected?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>);
                  })}
                </div>
              </div>
            )}   
              {/* Workout timer */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:"0.88rem",fontWeight:900,color:workoutTimerRunning?G.green:G.textSoft,fontVariantNumeric:"tabular-nums"}}>{Math.floor(workoutTimerSec/3600).toString().padStart(2,"0")}:{Math.floor((workoutTimerSec%3600)/60).toString().padStart(2,"0")}:{(workoutTimerSec%60).toString().padStart(2,"0")}</div>
                <button onClick={()=>setWorkoutTimerRunning(r=>!r)} style={{padding:"4px 8px",borderRadius:8,border:"none",background:workoutTimerRunning?G.mangoDeep:G.green,color:G.white,fontSize:"0.62rem",fontWeight:700,cursor:"pointer"}}>{workoutTimerRunning?"⏸":"▶"}</button>
                <button onClick={()=>{setWorkoutTimerSec(0);setWorkoutTimerRunning(false);}} style={{padding:"4px 7px",borderRadius:8,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.62rem",cursor:"pointer"}}>↺</button>
              </div>
            </div>         {!clientProgram&&(
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
                  <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>Your 12-Week Journey</div>
                  <div style={{fontSize:"0.88rem",fontWeight:700,color:G.white,marginBottom:6}}>Set your goals and we'll build a progressive 12-week program tailored just for you.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {[{phase:"Foundation",weeks:"1-4",desc:"Build base fitness and habits"},{phase:"Build",weeks:"5-8",desc:"Increase intensity and volume"},{phase:"Peak",weeks:"9-12",desc:"Maximum performance"}].map((p,i)=>(
                      <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                        <div style={{width:6,height:6,borderRadius:"50%",background:"rgba(255,255,255,.6)",flexShrink:0}}/>
                        <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,.9)"}}><strong>{p.phase}</strong> (Weeks {p.weeks}) — {p.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={card}>
                  <div style={lbl}>🎯 Goal 1 (required)</div>
                  <input value={programGoal1} onChange={e=>setProgramGoal1(e.target.value)} placeholder="e.g. Run a 5K, Do 10 push-ups, Walk 30 min..." style={iStyle}/>
                  <div style={{fontSize:"0.64rem",color:G.textSoft,marginTop:5}}>Be specific — the more detail the better your program will be</div>
                </div>
                <div style={card}>
                  <div style={lbl}>🎯 Goal 2 (optional)</div>
                  <input value={programGoal2} onChange={e=>setProgramGoal2(e.target.value)} placeholder="e.g. Build arm strength, Lose 15 lbs, Touch my toes..." style={iStyle}/>
                </div>
                <button onClick={startProgram} disabled={generatingWeek||!programGoal1.trim()} style={{...btnMango,opacity:programGoal1.trim()?1:0.5}}>
                  {generatingWeek?"✨ Building Week 1...":"🚀 Start My 12-Week Program"}
                </button>
              </div>
            )}
            {clientProgram&&(<>
              <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:"0.6rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:3}}>Your Goals</div>
                    {clientProgram.goals.map((g,i)=><div key={i} style={{fontSize:"0.78rem",fontWeight:700,color:G.white}}>🎯 {g}</div>)}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"0.62rem",padding:"3px 9px",borderRadius:20,background:phase.color+"44",color:G.white,fontWeight:700,border:"1px solid rgba(255,255,255,.3)"}}>{phase.name}</div>
                  </div>
                </div>
                <div style={{marginTop:4}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.6rem",color:"rgba(255,255,255,.75)",marginBottom:4}}>
                    <span>Week {currentWeekNum} of 12</span>
                    <span>{Math.round((currentWeekNum/12)*100)}% complete</span>
                  </div>
                  <div style={{height:6,background:"rgba(255,255,255,.2)",borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(currentWeekNum/12)*100}%`,background:G.mango,borderRadius:3,transition:"width .5s"}}/>
                  </div>
                  <div style={{display:"flex",gap:2,marginTop:5}}>
                    {Array.from({length:12},(_,i)=>{
                      const w=i+1;
                      const done=clientProgram.weeks[w];
                      const isCurrent=w===currentWeekNum;
                      const ph=getPhase(w);
                      return(<div key={i} style={{flex:1,height:4,borderRadius:2,background:isCurrent?G.mango:done?ph.color:"rgba(255,255,255,.2)",transition:"background .3s"}}/>);
                    })}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.52rem",color:"rgba(255,255,255,.6)",marginTop:3}}>
                    <span>Foundation</span><span>Build</span><span>Peak</span>
                  </div>
                </div>
              </div>
              {generatingWeek&&(
                <div style={{...card,textAlign:"center",padding:"20px"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:6}}>✨</div>
                  <div style={{fontSize:"0.8rem",fontWeight:700,color:G.green,marginBottom:4}}>Building Week {currentWeekNum}...</div>
                  <div style={{fontSize:"0.7rem",color:G.textSoft}}>Personalizing your workout based on your progress</div>
                </div>
              )}
              {currentWeekPlan&&!generatingWeek&&(<>
                <div style={{...card,border:`1.5px solid ${phase.color}44`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:G.text}}>Week {currentWeekNum} — {currentWeekPlan.focus}</div>
                    <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:phase.color+"22",color:phase.color,fontWeight:700}}>{phase.name}</div>
                  </div>
                  <div style={{fontSize:"0.68rem",color:G.textSoft}}>{phase.desc}</div>
                </div>
                <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none"}}>
                  {currentWeekPlan.days?.map((day,i)=>{
                    const lastRating=(clientRatings.filter(r=>r.dayIndex===i&&r.week===currentWeekNum)||[]).slice(-1)[0];
                    return(<button key={i} onClick={()=>{setSelectedDay(selectedDay===i?null:i);setDayRating(null);setRatingSubmitted(false);setAdjustMsg("");}} style={{flexShrink:0,padding:"7px 11px",borderRadius:10,border:`2px solid ${selectedDay===i?G.green:G.border}`,background:selectedDay===i?G.green:G.cream,color:selectedDay===i?G.white:G.textSoft,fontSize:"0.7rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",position:"relative"}}>
                      {day.day?.slice(0,3)}
                      {lastRating&&<div style={{position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:RATING_INFO[lastRating.rating]?.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",fontWeight:900,color:G.white}}>{lastRating.rating}</div>}
                    </button>);
                  })}
                </div>
                {selectedDay!==null&&currentWeekPlan.days?.[selectedDay]&&(()=>{
                  const day=currentWeekPlan.days[selectedDay];
                  return(<div style={card}>
   {(()=>{
                      const exercises=day.exercises||[];
                      const groupSize=4;
                      const groups=[];
                      for(let i=0;i<exercises.length;i+=groupSize){ groups.push(exercises.slice(i,i+groupSize)); }
                      return(
                        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
                          {groups.map((group,gi)=>{
                            const groupDone=group.every((_,ji)=>(loggedSets[`${selectedDay}-${gi*groupSize+ji}`]||0)>=(_.sets||1));
                            const isOpenGroup=openChart===`group-${selectedDay}-${gi}`;
                            return(
                              <div key={gi} style={{borderRadius:12,border:`1.5px solid ${groupDone?G.greenMid:isOpenGroup?G.green:G.border}`,overflow:"hidden"}}>
                                <button onClick={()=>setOpenChart(isOpenGroup?null:`group-${selectedDay}-${gi}`)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:groupDone?"#d8f3dc":isOpenGroup?"#f0faf4":G.creamDark,border:"none",cursor:"pointer",fontFamily:"inherit"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                                    <div style={{width:24,height:24,borderRadius:"50%",background:groupDone?G.greenMid:isOpenGroup?G.green:G.border,display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.7rem",fontWeight:900}}>{groupDone?"✓":gi+1}</div>
                                    <div style={{textAlign:"left"}}>
                                      <div style={{fontSize:"0.78rem",fontWeight:700,color:groupDone?G.greenMid:isOpenGroup?G.green:G.text}}>Group {gi+1}</div>
                                      <div style={{fontSize:"0.62rem",color:G.textSoft}}>{group.map(e=>e.name).join(" · ")}</div>
                                    </div>
                                  </div>
                                  <div style={{fontSize:"0.75rem",color:isOpenGroup?G.green:G.textSoft,transition:"transform .2s",transform:isOpenGroup?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
                                </button>
                                {isOpenGroup&&(
                                  <div style={{display:"flex",flexDirection:"column",gap:8,padding:"8px 12px 12px"}}>
                                    {group.map((ex,ji)=>{
                                      const j=gi*groupSize+ji;
                                      const k=`${selectedDay}-${j}`,done=loggedSets[k]||0,total=ex.sets||1;
                                      return(<div key={j} style={{background:G.creamDark,borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${done>=total?G.greenMid:G.border}`}}>
                                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                                          <div style={{fontSize:"0.8rem",fontWeight:700,color:G.text}}>{ex.name}</div>
                                          <button onClick={()=>logSet(selectedDay,j)} style={{padding:"4px 10px",borderRadius:8,border:"none",background:done>=total?G.greenLight:G.green,color:done>=total?G.green:G.white,fontSize:"0.66rem",fontWeight:700,cursor:"pointer"}}>{done>=total?"✓ Done":"+Set"}</button>
                                        </div>
                                        <div style={{display:"flex",gap:10,fontSize:"0.66rem",color:G.textSoft}}>{ex.sets&&<span>📋 {ex.sets} sets</span>}{ex.reps&&<span>🔄 {ex.reps}</span>}{ex.rest&&<span>⏱ {ex.rest}</span>}</div>
                                        {ex.tip&&<div style={{fontSize:"0.66rem",color:G.green,fontStyle:"italic",marginTop:3}}>💡 {ex.tip}</div>}
                                        {total>1&&<div style={{display:"flex",gap:4,marginTop:5}}>{Array.from({length:total}).map((_,k2)=><div key={k2} style={{width:7,height:7,borderRadius:"50%",background:k2<done?G.greenMid:G.border}}/>)}</div>}
                                      </div>);
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
       {day.type!=="rest"&&(<div style={{borderTop:`1px solid ${G.border}`,paddingTop:12}}>

                      {/* Rest Timer */}
                      <div style={{...card,background:"#f0faf4",border:`1px solid ${G.greenLight}`,padding:"10px 12px",marginBottom:12}}>
                        <div style={{fontSize:"0.7rem",fontWeight:700,color:G.green,marginBottom:8}}>⏱ Rest Timer</div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <input type="number" value={restInputVal} onChange={e=>setRestInputVal(e.target.value)} style={{...iStyle,width:70,padding:"6px 10px",fontSize:"0.82rem"}}/>
                          <div style={{display:"flex",gap:6}}>
                            {["seconds","minutes"].map(u=>(<button key={u} onClick={()=>setRestInputUnit(u)} style={{padding:"6px 10px",borderRadius:8,border:`2px solid ${restInputUnit===u?G.green:G.border}`,background:restInputUnit===u?"#d8f3dc":G.cream,color:restInputUnit===u?G.green:G.textSoft,fontSize:"0.68rem",fontWeight:restInputUnit===u?700:400,cursor:"pointer",fontFamily:"inherit"}}>{u}</button>))}
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{fontSize:"1.4rem",fontWeight:900,color:restTimerRunning?G.green:restTimerSec===0?G.textSoft:"#f87171",fontVariantNumeric:"tabular-nums",minWidth:60}}>{Math.floor(restTimerSec/60).toString().padStart(2,"0")}:{(restTimerSec%60).toString().padStart(2,"0")}</div>
                          <button onClick={()=>{const secs=restInputUnit==="minutes"?parseInt(restInputVal||1)*60:parseInt(restInputVal||60);setRestTimerSec(secs);setRestTimerRunning(true);}} style={{flex:1,padding:"8px",borderRadius:9,border:"none",background:`linear-gradient(135deg,${G.green},${G.greenMid})`,color:G.white,fontSize:"0.74rem",fontWeight:700,cursor:"pointer"}}>▶ Start Rest</button>
                          <button onClick={()=>{setRestTimerRunning(false);setRestTimerSec(0);}} style={{padding:"8px 10px",borderRadius:9,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.74rem",cursor:"pointer"}}>↺</button>
                        </div>
                        {restTimerSec===0&&!restTimerRunning&&restInputVal&&<div style={{fontSize:"0.66rem",color:G.greenMid,fontWeight:600,textAlign:"center",marginTop:4}}>✅ Rest complete — time to go!</div>}
                      </div>

                      {/* Rating + Feedback */}
                      {!ratingSubmitted?(
                        <>
                          <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,marginBottom:6}}>How was this workout?</div>
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:5}}>Optional — tell your coach more about how it went:</div>
                            <textarea value={workoutFeedback} onChange={e=>setWorkoutFeedback(e.target.value)} placeholder="e.g. Felt too long, shoulder was tight, loved the squats..." rows={2} style={{...iStyle,resize:"none"}}/>
                          </div>
                          <div style={{fontSize:"0.64rem",color:G.textSoft,marginBottom:9}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
                          <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(r=>(<button key={r} onClick={()=>setDayRating(r)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`2px solid ${dayRating===r?RATING_INFO[r].color:G.border}`,background:dayRating===r?RATING_INFO[r].color+"22":G.cream,color:dayRating===r?RATING_INFO[r].color:G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>))}</div>
                          {dayRating&&(<div style={{marginTop:8}}><div style={{fontSize:"0.72rem",color:RATING_INFO[dayRating].color,fontWeight:600,textAlign:"center",marginBottom:8}}>{RATING_INFO[dayRating].label}</div><button onClick={()=>submitWorkoutRating(dayRating)} disabled={adjustingPlan} style={{...btnGreen,padding:"10px",fontSize:"0.8rem",background:adjustingPlan?"#ccc":`linear-gradient(135deg,${G.green},${G.greenMid})`}}>{adjustingPlan?"✨ Adjusting...":"✓ Submit Rating"}</button></div>)}
                        </>
                      ):(
                        <div style={{background:RATING_INFO[dayRating]?.color+"11",border:`1px solid ${RATING_INFO[dayRating]?.color}44`,borderRadius:10,padding:"12px",textAlign:"center"}}>
                          <div style={{fontSize:"1.5rem",marginBottom:4}}>{dayRating<=2?"💪":dayRating===3?"🌟":dayRating===4?"😤":"🙏"}</div>
                          <div style={{fontSize:"0.8rem",fontWeight:700,color:RATING_INFO[dayRating]?.color,marginBottom:4}}>Rating {dayRating} — {RATING_INFO[dayRating]?.label}</div>
                          {workoutFeedback&&<div style={{fontSize:"0.7rem",color:G.textSoft,fontStyle:"italic",marginBottom:4}}>"{workoutFeedback}"</div>}
                          <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6}}>{adjustMsg}</div>
                        </div>
                      )}
                    </div>)}   
                  </div>);
                })()}
                {selectedDay===null&&(
                  <div style={card}><div style={lbl}>This Week</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {currentWeekPlan.days?.map((day,i)=>{
                        const lastRating=(clientRatings.filter(r=>r.dayIndex===i&&r.week===currentWeekNum)||[]).slice(-1)[0];
                        return(<button key={i} onClick={()=>{setSelectedDay(i);setDayRating(null);setRatingSubmitted(false);setAdjustMsg("");}} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 11px",borderRadius:10,background:G.creamDark,border:`1px solid ${G.border}`,cursor:"pointer",textAlign:"left",width:"100%"}}>
                          <div style={{width:34,height:34,borderRadius:"50%",background:day.type==="rest"?`linear-gradient(135deg,${G.mango},${G.mangoDeep})`:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.62rem",fontWeight:700,flexShrink:0}}>{day.day?.slice(0,3)}</div>
                          <div style={{flex:1}}><div style={{fontSize:"0.77rem",fontWeight:700,color:G.text}}>{day.focus}</div><div style={{fontSize:"0.63rem",color:G.textSoft}}>{day.duration} · {day.exercises?.length||0} exercises</div></div>
                          {lastRating?<div style={{width:24,height:24,borderRadius:"50%",background:RATING_INFO[lastRating.rating]?.color+"22",border:`2px solid ${RATING_INFO[lastRating.rating]?.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.7rem",fontWeight:900,color:RATING_INFO[lastRating.rating]?.color}}>{lastRating.rating}</div>:<span style={{fontSize:"0.68rem",color:G.greenMid}}>→</span>}
                        </button>);
                      })}
                    </div>
                  </div>
                )}
              </>)}
              {Object.keys(clientProgram.weeks).length>1&&(
                <div style={card}><div style={lbl}>Completed Weeks</div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {Object.entries(clientProgram.weeks).filter(([w])=>parseInt(w)<currentWeekNum).reverse().map(([w,wk])=>{
                      const ph=getPhase(parseInt(w));
                      return(<div key={w} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${G.border}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:ph.color,flexShrink:0}}/>
                          <span style={{fontSize:"0.74rem",fontWeight:700,color:G.text}}>Week {w}</span>
                          <span style={{fontSize:"0.64rem",color:G.textSoft}}>{wk.focus}</span>
                        </div>
                        <span style={{fontSize:"0.62rem",padding:"2px 7px",borderRadius:20,background:ph.color+"22",color:ph.color,fontWeight:600}}>{ph.name}</span>
                      </div>);
                    })}
                  </div>
                </div>
              )}
   
         <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={async()=>{
                  if(clientProgram.currentWeek>=12){alert("You have completed all 12 weeks! 🎉 Reset to start again.");return;}
                  if(window.confirm(`Move to Week ${clientProgram.currentWeek+1}? Your current week will be saved.`)){
                    const clientRatings2=ratings[cid]||[];
                    const lastWeekRatings=clientRatings2.slice(-7);
                    const avgRating=lastWeekRatings.length>0?Math.round(lastWeekRatings.reduce((a,r)=>a+r.rating,0)/lastWeekRatings.length):3;
                    const prevWeek=clientProgram.weeks[clientProgram.currentWeek];
                    const prevSummary=prevWeek?prevWeek.phase+" phase, focus: "+prevWeek.focus:"";
                    const nextWeek=clientProgram.currentWeek+1;
                    const updatedProgram={...clientProgram,currentWeek:nextWeek};
                    const newProgram={...program,[cid]:updatedProgram};
                    setProgram(newProgram);
                    try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(newProgram));}catch(e){}
                    await generateWeek(nextWeek,clientProgram.goals,avgRating,prevSummary);
                  }
                }} style={{...btnGreen,flex:1,fontSize:"0.74rem",padding:"10px"}}>
                  {clientProgram.currentWeek>=12?"🎉 Program Complete!":"➡️ Start Week "+(clientProgram.currentWeek+1)}
                </button>
                <button onClick={()=>{if(window.confirm("Reset your 12-week program? All progress will be lost.")){const np={...program};delete np[cid];setProgram(np);try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(np));}catch(e){}}}} style={{...btnMango,fontSize:"0.74rem",padding:"10px",width:"auto"}}>↻ Reset</button>
              </div>
            </>)}
          </div>
          );
        })()}

        {/* ── QUICK MOVES ── */}  
        {tab==="desk"&&(()=>{
          const cid=currentClient.id;
          const profile=moveProfile[cid];
          const hasMoves=clientMoves.length>0&&profile&&!showMoveSetup;

          // Setup screen
          if(!profile||showMoveSetup) return(
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>⚡ Quick Moves Setup</div>
              <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`}}>
                <div style={{fontSize:"0.78rem",color:G.textSoft,lineHeight:1.6}}>Tell us where you are and what you enjoy — we'll create 5 personalized exercises just for your situation!</div>
              </div>

              {/* Situation picker */}
              <div style={card}>
                <div style={lbl}>📍 Where are you right now?</div>
                <div style={{display:"flex",flexDirection:"column",gap:7}}>
                  {SITUATIONS.map(s=>(
                    <button key={s.id} onClick={()=>setMoveSetupSit(s.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 13px",borderRadius:10,border:`2px solid ${moveSetupSit===s.id?G.green:G.border}`,background:moveSetupSit===s.id?"#d8f3dc":G.cream,cursor:"pointer",textAlign:"left",width:"100%"}}>
                      <span style={{fontSize:"1.3rem"}}>{s.icon}</span>
                      <span style={{fontSize:"0.8rem",fontWeight:moveSetupSit===s.id?700:400,color:moveSetupSit===s.id?G.green:G.text}}>{s.label}</span>
                      {moveSetupSit===s.id&&<span style={{marginLeft:"auto",color:G.greenMid,fontSize:"1rem"}}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>

   {/* Desk target dropdown */}
              {moveSetupSit==="desk"&&(
                <div style={card}>
                  <div style={lbl}>🪑 How are you working?</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {DESK_TARGETS.map(t=>(
                      <button key={t} onClick={()=>setDeskTarget(t)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:10,border:`2px solid ${deskTarget===t?G.green:G.border}`,background:deskTarget===t?"#d8f3dc":G.cream,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
                        <span style={{fontSize:"0.8rem",fontWeight:deskTarget===t?700:400,color:deskTarget===t?G.green:G.text}}>
                          {t==="Seated at desk"?"🪑 Seated at desk":t==="Standing next to desk"?"🧍 Standing next to desk":"🔄 Mix of both"}
                        </span>
                        {deskTarget===t&&<span style={{color:G.greenMid,fontSize:"1rem"}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gym target dropdown */}
              {moveSetupSit==="gym"&&(
                <div style={card}>
                  <div style={lbl}>🎯 What do you want to work on today?</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {GYM_TARGETS.map(t=>(
                      <button key={t} onClick={()=>setGymTarget(t)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:10,border:`2px solid ${gymTarget===t?G.green:G.border}`,background:gymTarget===t?"#d8f3dc":G.cream,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
                        <span style={{fontSize:"0.8rem",fontWeight:gymTarget===t?700:400,color:gymTarget===t?G.green:G.text}}>{t}</span>
                        {gymTarget===t&&<span style={{color:G.greenMid,fontSize:"1rem"}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gym starting weights */}
              {moveSetupSit==="gym"&&gymTarget&&(GYM_LIFT_WEIGHTS[gymTarget]||[]).length>0&&(
                <div style={card}>
                  <div style={lbl}>🏋️ How much can you comfortably lift?</div>
                  <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>This helps us build progressive overload into your 12-week plan. Enter what feels comfortable for <strong>1 set of 10 reps</strong>.</div>
                  {(GYM_LIFT_WEIGHTS[gymTarget]||[]).map(lift=>(
                    <div key={lift} style={{marginBottom:10}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:G.green,marginBottom:5}}>💪 {lift}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <input type="number" value={gymLiftWeights[lift]||""} onChange={e=>setGymLiftWeights(p=>({...p,[lift]:e.target.value}))} placeholder="e.g. 45" style={{...iStyle,width:90,padding:"7px 10px"}}/>
                        <span style={{fontSize:"0.76rem",color:G.textSoft}}>lbs</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Enjoys input */}
              {moveSetupSit!=="gym"&&(
                <div style={card}>
                  <div style={lbl}>🏃 What exercise do you enjoy?</div>
                  <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:8}}>e.g. walking, stretching, yoga, dancing, light weights...</div>
                  <input value={moveSetupEnjoys} onChange={e=>setMoveSetupEnjoys(e.target.value)} placeholder="Type what you enjoy..." style={iStyle}/>
                </div>
              )}

      <button onClick={()=>{
                if(!moveSetupSit){alert("Please select your situation first!");return;}
                if(moveSetupSit==="gym"&&!gymTarget){alert("Please select what you want to work on!");return;}
                if(moveSetupSit==="desk"&&!deskTarget){alert("Please select how you are working!");return;}
                setShowMoveSetup(false);
               const liftInfo=moveSetupSit==="gym"&&Object.keys(gymLiftWeights).length>0?` Starting weights: ${Object.entries(gymLiftWeights).map(([k,v])=>`${k}: ${v}lbs`).join(", ")}. Build progressive overload into suggestions.`:"";
                const enjoys=moveSetupSit==="gym"?gymTarget+liftInfo:moveSetupSit==="desk"?`${deskTarget} — enjoys: ${moveSetupEnjoys||c?.likes||"general fitness"}`:moveSetupEnjoys;
                generateDeskMoves(moveSetupSit,enjoys); 
                generateDeskMoves(moveSetupSit,enjoys);
              }} disabled={generatingDesk||!moveSetupSit||(moveSetupSit==="gym"&&!gymTarget)||(moveSetupSit==="desk"&&!deskTarget)} style={{...btnGreen,opacity:(moveSetupSit&&(moveSetupSit!=="gym"||gymTarget)&&(moveSetupSit!=="desk"||deskTarget))?1:0.5}}>
                {generatingDesk?"✨ Creating your moves...":"✨ Create My Quick Moves"}
              </button>  
              {profile&&<button onClick={()=>setShowMoveSetup(false)} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Cancel</button>}
            </div>
          );

          // Moves display
          const sit=SITUATIONS.find(s=>s.id===profile.situation);
          return(
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>⚡ Quick Moves</div>

              {/* Current situation badge */}
              <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`,padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"1.3rem"}}>{sit?.icon}</span>
                    <div>
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{sit?.label}</div>
                      {profile.situation==="gym"?<div style={{fontSize:"0.64rem",color:G.textSoft}}>Target: {profile.enjoys}</div>:profile.enjoys&&<div style={{fontSize:"0.64rem",color:G.textSoft}}>Enjoys: {profile.enjoys}</div>}  
                    </div>
                  </div>
                  <button onClick={()=>{setMoveSetupSit(profile.situation);setMoveSetupEnjoys(profile.enjoys||"");setShowMoveSetup(true);}} style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.64rem",cursor:"pointer",fontFamily:"inherit"}}>↻ Change</button>
                </div>
              </div>

              {generatingDesk&&<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"1.5rem",marginBottom:6}}>⚡</div><div style={{fontSize:"0.78rem",color:G.textSoft}}>Creating your personalized moves...</div></div>}

              {/* Exercise cards */}
              {!generatingDesk&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                {clientMoves.map((move,i)=>(
                  <div key={i} style={{...card,padding:"12px",border:`1.5px solid ${G.greenLight}`,display:"flex",flexDirection:"column",gap:5}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"1.4rem"}}>{move.icon}</span><span style={{fontSize:"0.68rem",fontWeight:700,color:G.green}}>{todayDeskLog[move.id]||0} {move.unit}</span></div>
                    <div style={{fontSize:"0.74rem",fontWeight:700,color:G.text}}>{move.label}</div>
                    <div style={{fontSize:"0.61rem",color:G.textSoft,lineHeight:1.5}}>{move.instruction}</div>
                    <button onClick={()=>logDeskMove(move.id,move.defaultAmt||10)} style={{padding:"7px 0",borderRadius:9,border:"none",background:`linear-gradient(135deg,${G.green},${G.greenMid})`,color:G.white,fontSize:"0.72rem",fontWeight:700,cursor:"pointer",marginTop:2}}>+ {move.defaultAmt||10} {move.unit}</button>
                  </div>
                ))}
              </div>}

              {/* Today's tally */}
              {Object.keys(todayDeskLog).length>0&&(
                <div style={{...card,background:"#f0faf4",border:`1px solid ${G.greenLight}`}}>
                  <div style={lbl}>Today's Tally</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{clientMoves.filter(m=>todayDeskLog[m.id]).map((m,i)=><div key={i} style={{fontSize:"0.7rem",padding:"3px 10px",borderRadius:20,background:G.greenLight,color:G.green,fontWeight:600}}>{m.icon} {todayDeskLog[m.id]} {m.unit}</div>)}</div>
                </div>
              )}
            </div>
          );
        })()} 

        {/* ── NUTRITION ── */}
        {tab==="nutrition"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>🥗 Nutrition Tracker</div>

            {/* Daily macro summary */}
            <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fff9f0)",border:`1px solid ${G.greenLight}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={lbl}>Today's Macros</div><div style={{fontSize:"0.62rem",color:G.textSoft}}>{todayMeals.length} meal{todayMeals.length!==1?"s":""} logged</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                <MacroBar label="🥩 Protein" value={todayTotals.protein} target={targets.protein} isLow={true}/>
                <MacroBar label="🥑 Fat" value={todayTotals.fat} target={targets.fat} isLow={true}/>
                <MacroBar label="🌾 Carbs" value={todayTotals.carbs} target={targets.carbs} isLow={false}/>
                <MacroBar label="🍬 Sugar" value={todayTotals.sugar} target={targets.sugar} isLow={false}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:`1px solid ${G.border}`}}><span style={{fontSize:"0.68rem",color:G.textSoft}}>Calories (secondary)</span><span style={{fontSize:"0.8rem",fontWeight:700,color:G.brown}}>{todayTotals.calories} kcal</span></div>
              <div style={{marginTop:6,fontSize:"0.63rem",color:G.textSoft,fontStyle:"italic"}}>Protein target: {targets.protein}g (based on {currentClient.weight}lbs) · Carbs: &lt;{targets.carbs}g · Sugar: &lt;{targets.sugar}g</div>
            </div>

            {/* 💧 Water — now lives here */}
            <div style={card}>
              <div style={lbl}>💧 Water Intake</div>
              <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:8}}>Aim for 8+ glasses a day. Staying hydrated supports energy, digestion, and weight goals.</div>
              <div style={{display:"flex",gap:5}}>{[4,6,8,10,12].map(n=><button key={n} onClick={()=>logWater(n)} style={{flex:1,padding:"8px 0",borderRadius:10,border:`2px solid ${todayWater===n?G.greenMid:G.border}`,background:todayWater===n?"#d8f3dc":G.cream,color:todayWater===n?G.green:G.textSoft,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>{n}</button>)}</div>
              {todayWater>0&&<div style={{marginTop:6,fontSize:"0.68rem",color:G.greenMid,textAlign:"center",fontWeight:600}}>💧 {todayWater} glasses logged today {todayWater>=8?"— great hydration! 🌟":""}</div>}
            </div>

            {/* Upside-down pyramid */}
            <div style={card}>
              <div style={lbl}>🔺 Upside-Down Pyramid</div>
              {[{tier:"EAT MOST",foods:"Meat · Fish · Eggs · Poultry",color:"#4ade80"},{tier:"EAT PLENTY",foods:"Leafy greens · Broccoli · Peppers · Zucchini",color:"#a3e635"},{tier:"EAT REGULARLY",foods:"Avocado · Olive oil · Nuts · Cheese · Butter",color:"#fbbf24"},{tier:"EAT LITTLE",foods:"Berries · Legumes",color:"#fb923c"},{tier:"AVOID",foods:"Grains · Starchy carbs · Sugar · Processed foods",color:"#f87171"}].map((t,i)=>(<div key={i} style={{background:t.color+"11",borderRadius:7,padding:"5px 9px",marginBottom:4,borderLeft:`3px solid ${t.color}`}}><div style={{fontSize:"0.58rem",color:t.color,fontWeight:700,letterSpacing:1}}>{t.tier}</div><div style={{fontSize:"0.68rem",color:G.text,marginTop:1}}>{t.foods}</div></div>))}
            </div>

        {/* Log a meal */}
            <div style={card}>
              <div style={lbl}>Log a Meal</div>
              <div style={{display:"flex",gap:5,marginBottom:9,flexWrap:"wrap"}}>{MEAL_TYPES.map(t=>(<button key={t} onClick={()=>setMealType(t)} style={{padding:"5px 11px",borderRadius:20,border:`2px solid ${mealType===t?G.green:G.border}`,background:mealType===t?"#d8f3dc":G.cream,color:mealType===t?G.green:G.textSoft,fontSize:"0.72rem",fontWeight:mealType===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>))}</div>
              
              {/* Two input options */}
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <button onClick={()=>photoInputRef.current?.click()} style={{flex:1,padding:"12px",borderRadius:12,border:`2px dashed ${G.greenMid}`,background:"#f0faf4",color:G.green,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <span style={{fontSize:"1.4rem"}}>📸</span>
                  <span>Snap Label or Food</span>
                  <span style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:400}}>AI reads it for you</span>
                </button>
                <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0]; if(f){setPhotoPreview(URL.createObjectURL(f));setPhotoMacros(null);analyzePhoto(f);}}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"12px",borderRadius:12,border:`2px dashed ${G.border}`,background:G.creamDark,color:G.textSoft,fontSize:"0.78rem",fontWeight:700,gap:4}}>
                  <span style={{fontSize:"1.4rem"}}>⌨️</span>
                  <span>Type it in</span>
                  <span style={{fontSize:"0.62rem",fontWeight:400}}>below</span>
                </div>
              </div>

              {/* Photo preview + confirm */}
              {photoPreview&&(
                <div style={{marginBottom:10}}>
                  <img src={photoPreview} alt="Food" style={{width:"100%",borderRadius:10,maxHeight:180,objectFit:"cover",marginBottom:8}}/>
                  {analyzingPhoto&&<div style={{textAlign:"center",fontSize:"0.76rem",color:G.green,fontWeight:600}}>✨ Claude is reading your food...</div>}
                  {photoMacros&&!analyzingPhoto&&(
                    <div style={{background:"#f0faf4",borderRadius:10,padding:"12px",border:`1px solid ${G.greenLight}`}}>
                      <div style={{fontSize:"0.74rem",fontWeight:700,color:G.green,marginBottom:4}}>📸 {photoMacros.confidence==="exact"?"Label Read":"Visual Estimate"}</div>
                      <div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:8,fontStyle:"italic"}}>{photoMacros.description}</div>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10}}>
                        {[{l:"Protein",v:photoMacros.protein,c:"#4ade80"},{l:"Fat",v:photoMacros.fat,c:"#fbbf24"},{l:"Carbs",v:photoMacros.carbs,c:"#fb923c"},{l:"Sugar",v:photoMacros.sugar,c:"#f87171"}].map((x,i)=><span key={i} style={{fontSize:"0.7rem"}}><span style={{fontWeight:700,color:x.c}}>{x.v}g</span><span style={{color:G.textSoft}}> {x.l}</span></span>)}
                        <span style={{fontSize:"0.7rem",color:G.brown,fontWeight:700}}>{photoMacros.calories} kcal</span>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>{
                          const today=todayStr(); const cid=currentClient.id;
                          const todayMealsNow=(nutrition[cid]||{})[today]||[];
                          const newEntry={meal:mealType,text:photoMacros.description||"Photo logged meal",protein:photoMacros.protein||0,fat:photoMacros.fat||0,carbs:photoMacros.carbs||0,sugar:photoMacros.sugar||0,calories:photoMacros.calories||0,feedback:`${photoMacros.confidence==="exact"?"Exact from label":"AI visual estimate"} 📸`,ts:new Date().toISOString()};
                          persist(null,null,null,null,null,null,null,{...nutrition,[cid]:{...(nutrition[cid]||{}),[today]:[...todayMealsNow,newEntry]}});
                          setPhotoPreview(null); setPhotoMacros(null);
                        }} style={{...btnGreen,flex:1,padding:"9px",fontSize:"0.76rem"}}>✓ Log This Meal</button>
                        <button onClick={()=>{setPhotoPreview(null);setPhotoMacros(null);}} style={{padding:"9px 13px",borderRadius:10,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.74rem",cursor:"pointer"}}>✕</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <textarea value={mealText} onChange={e=>setMealText(e.target.value)} placeholder={`Or type your ${mealType.toLowerCase()}...\ne.g. "2 scrambled eggs, 3 strips bacon, black coffee"`} rows={3} style={{...iStyle,resize:"none",marginBottom:9}}/>
              <button onClick={analyzeMeal} disabled={analyzingMeal||!mealText.trim()} style={{...btnGreen,opacity:mealText.trim()?1:0.5}}>{analyzingMeal?"✨ Analyzing macros...":"✓ Log & Analyze Macros"}</button>
            </div>

            {/* Today's meal log */}
            {todayMeals.length>0&&(<div style={card}><div style={lbl}>Today's Meals</div><div style={{display:"flex",flexDirection:"column",gap:10}}>{todayMeals.map((m,i)=>(<div key={i} style={{background:G.creamDark,borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${G.greenMid}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{m.meal}</span><span style={{fontSize:"0.62rem",color:G.textSoft}}>{new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span></div><div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:5}}>{m.text}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{l:"P",v:m.protein,c:"#4ade80"},{l:"F",v:m.fat,c:"#fbbf24"},{l:"C",v:m.carbs,c:"#fb923c"},{l:"S",v:m.sugar,c:"#f87171"}].map((x,j)=>(<span key={j} style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:x.c}}>{x.v}g</span><span style={{color:G.textSoft}}> {x.l}</span></span>))}<span style={{fontSize:"0.65rem",color:G.brown,fontWeight:600}}>{m.calories} kcal</span></div>{m.feedback&&<div style={{fontSize:"0.63rem",color:G.green,fontStyle:"italic",marginTop:4}}>💡 {m.feedback}</div>}</div>))}</div></div>)}

            {/* Weekly averages */}
            {(()=>{const weekly=getWeeklyNutrition(currentClient.id);if(!weekly) return null;return(<div style={card}><div style={lbl}>7-Day Averages ({weekly.days} days)</div><div style={{display:"flex",flexDirection:"column",gap:6}}><MacroBar label="🥩 Protein avg" value={weekly.protein} target={targets.protein} isLow={true}/><MacroBar label="🌾 Carbs avg" value={weekly.carbs} target={targets.carbs} isLow={false}/><MacroBar label="🍬 Sugar avg" value={weekly.sugar} target={targets.sugar} isLow={false}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:"0.65rem",color:G.textSoft}}><span>Avg calories</span><span style={{fontWeight:700,color:G.brown}}>{weekly.calories} kcal/day</span></div></div>);})()}
          </div>
        )}

        {/* ── PRAYER ── */}
        {tab==="prayer"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}><div style={{fontSize:"0.58rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>Today's Scripture</div><div style={{fontSize:"0.88rem",color:G.white,fontStyle:"italic",lineHeight:1.7,marginBottom:6}}>"{SCRIPTURES[scriptureIdx].verse}"</div><div style={{fontSize:"0.68rem",color:"rgba(255,255,255,.8)",fontWeight:700}}>— {SCRIPTURES[scriptureIdx].ref}</div></div>
            <div style={card}><div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>🙏 Today's Prayer</div><div style={{fontSize:"0.8rem",color:G.text,lineHeight:1.75,fontStyle:"italic"}}>{PRAYERS[prayerIdx]}</div></div>
            <div style={{...card,background:"linear-gradient(135deg,#f0faf4,#fffbf0)",border:`1px solid ${G.greenLight}`}}>
              <div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>✝️ 10 Minutes of Peace</div>
              <div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:12}}>Set aside this time to be still. Breathe. Listen.</div>
              <div style={{textAlign:"center",marginBottom:12}}><div style={{fontSize:"2.8rem",fontWeight:900,color:timerDone?G.greenMid:G.green,fontVariantNumeric:"tabular-nums"}}>{Math.floor(timerSec/60).toString().padStart(2,"0")}:{(timerSec%60).toString().padStart(2,"0")}</div>{timerDone&&<div style={{fontSize:"0.78rem",color:G.greenMid,fontWeight:700,marginTop:3}}>🌟 Peace time complete. God is with you.</div>}</div>
              <div style={{display:"flex",gap:8}}><button onClick={()=>{setTimerRunning(r=>!r);setTimerDone(false);}} style={{flex:1,padding:"10px",borderRadius:10,border:"none",background:timerRunning?G.mangoDeep:G.green,color:G.white,fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>{timerRunning?"⏸ Pause":"▶ Start"}</button><button onClick={()=>{setTimerSec(600);setTimerRunning(false);setTimerDone(false);}} style={{padding:"10px 14px",borderRadius:10,border:`1.5px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.8rem",cursor:"pointer"}}>Reset</button></div>
            </div>
            <div style={card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}><div style={{fontSize:"0.7rem",color:G.brown,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>🧘 Today's Stretches</div><div style={{fontSize:"0.6rem",padding:"3px 8px",borderRadius:20,background:"#fff3e0",color:G.brown,fontWeight:700}}>{todayStretch.theme}</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>{todayStretch.stretches.map((s,i)=>(<div key={i} style={{background:G.creamDark,borderRadius:10,padding:"9px 11px",borderLeft:`3px solid ${G.greenMid}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><div style={{fontSize:"0.77rem",fontWeight:700,color:G.text}}>{s.name}</div><div style={{fontSize:"0.6rem",color:G.greenMid,fontWeight:600}}>⏱ {s.duration}</div></div><div style={{fontSize:"0.69rem",color:G.textSoft,lineHeight:1.6}}>{s.desc}</div></div>))}</div>
            </div>
            <div style={{...card,display:"flex",alignItems:"center",gap:12}}><button onClick={()=>{
  const newVal=!form.prayerDone;
  setForm(p=>({...p,prayerDone:newVal,prayerDate:todayStr()}));
  if(newVal){
    const today=todayStr(); const cid=currentClient.id;
    const existing=(logs[cid]||{})[today]||{};
    const newLogs={...logs,[cid]:{...(logs[cid]||{}),[today]:{...existing,prayerDone:true,date:today}}};
    persist(clients,newLogs,messages,plans,deskLog,deskMoves,ratings,nutrition);
  }
}} style={{width:28,height:28,borderRadius:6,border:`2px solid ${form.prayerDone?G.greenMid:G.border}`,background:form.prayerDone?G.greenMid:G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.95rem",flexShrink:0}}>{form.prayerDone?"✓":""}</button><div style={{fontSize:"0.76rem",color:G.textSoft}}>I completed my prayer & reflection time today</div></div>
          </div>
        )}

{/* ── RESOURCES ── */}
        {tab==="resources"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>📚 Resources</div>

            {/* Sub tabs */}
            <div style={{display:"flex",gap:6}}>
              {[{id:"recipes",label:"🥗 Recipes"},{id:"workouts",label:"💪 Workouts"},{id:"foods",label:"🍎 Food List"}].map(t=>(
                <button key={t.id} onClick={()=>{setActiveSheetTab(t.id);if(!sheetLoaded)fetchSheets();}} style={{flex:1,padding:"7px 4px",borderRadius:10,border:`2px solid ${activeSheetTab===t.id?G.green:G.border}`,background:activeSheetTab===t.id?"#d8f3dc":G.cream,color:activeSheetTab===t.id?G.green:G.textSoft,fontSize:"0.66rem",fontWeight:activeSheetTab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
              ))}
            </div>

            {/* Load button if not loaded */}
            {!sheetLoaded&&!sheetLoading&&(
              <div style={{...card,textAlign:"center",padding:"20px"}}>
                <div style={{fontSize:"1.5rem",marginBottom:8}}>📚</div>
                <div style={{fontSize:"0.78rem",color:G.textSoft,marginBottom:12}}>Load recipes, workout ideas, and food nutrition data from your coach.</div>
                <button onClick={fetchSheets} style={btnGreen}>📥 Load Resources</button>
              </div>
            )}

            {sheetLoading&&(
              <div style={{...card,textAlign:"center",padding:"20px"}}>
                <div style={{fontSize:"0.78rem",color:G.textSoft}}>✨ Loading resources...</div>
              </div>
            )}

            {/* Recipes */}
            {sheetLoaded&&activeSheetTab==="recipes"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {sheetData.recipes.length===0?<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"0.78rem",color:G.textSoft}}>No recipes added yet — check back soon!</div></div>
                :sheetData.recipes.slice(1).map((row,i)=>(
                  <div key={i} style={{...card,border:`1.5px solid ${G.greenLight}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:"#d8f3dc",color:G.green,fontWeight:600}}>{row[1]}</div>
                    </div>
                    <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:6}}>⏱ {row[2]} prep</div>
                    {row[3]&&<div style={{fontSize:"0.72rem",color:G.text,marginBottom:4}}><strong>Ingredients:</strong> {row[3]}</div>}
                    {row[4]&&<div style={{fontSize:"0.72rem",color:G.text,marginBottom:6}}><strong>Instructions:</strong> {row[4]}</div>}
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {row[5]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#4ade80"}}>{row[5]}g</span><span style={{color:G.textSoft}}> P</span></span>}
                      {row[6]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fb923c"}}>{row[6]}g</span><span style={{color:G.textSoft}}> C</span></span>}
                      {row[7]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fbbf24"}}>{row[7]}g</span><span style={{color:G.textSoft}}> F</span></span>}
                      {row[9]&&<span style={{fontSize:"0.65rem",color:G.brown,fontWeight:600}}>{row[9]} kcal</span>}
                    </div>
                    {row[10]&&<div style={{fontSize:"0.63rem",color:G.green,fontStyle:"italic",marginTop:4}}>💡 {row[10]}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Workouts */}
            {sheetLoaded&&activeSheetTab==="workouts"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
               {sheetData.workouts.length===0?<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"0.78rem",color:G.textSoft}}>No workouts added yet!</div></div>
                :sheetData.workouts.slice(1).map((row,i)=>(
                  <div key={i} style={{...card,border:`1.5px solid ${G.greenLight}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:"#d8f3dc",color:G.green,fontWeight:600}}>{row[2]}</div>
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                      {row[1]&&<span style={{fontSize:"0.65rem",padding:"2px 8px",borderRadius:20,background:G.creamDark,color:G.textSoft}}>{row[1]}</span>}
                      {row[3]&&<span style={{fontSize:"0.65rem",color:G.textSoft}}>⏱ {row[3]}</span>}
                      {row[4]&&<span style={{fontSize:"0.65rem",color:G.textSoft}}>🏋️ {row[4]}</span>}
                    </div>
                    {row[5]&&<div style={{fontSize:"0.72rem",color:G.text,marginBottom:4}}>{row[5]}</div>}
                    {row[6]&&<div style={{fontSize:"0.63rem",color:G.green,fontStyle:"italic"}}>💪 {row[6]}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Food List */}
            {sheetLoaded&&activeSheetTab==="foods"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <input value={foodSearch} onChange={e=>setFoodSearch(e.target.value)} placeholder="🔍 Search foods..." style={iStyle}/>
                  {sheetData.foods.slice(1).filter(row=>!foodSearch||row[0]?.toLowerCase().includes(foodSearch.toLowerCase())).map((row,i)=>(                <div key={i} style={{...card,padding:"10px 12px",border:`1px solid ${G.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",color:G.textSoft}}>{row[1]}</div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {row[2]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#4ade80"}}>{row[2]}g</span><span style={{color:G.textSoft}}> P</span></span>}
                      {row[3]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fb923c"}}>{row[3]}g</span><span style={{color:G.textSoft}}> C</span></span>}
                      {row[4]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fbbf24"}}>{row[4]}g</span><span style={{color:G.textSoft}}> F</span></span>}
                      {row[5]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#f87171"}}>{row[5]}g</span><span style={{color:G.textSoft}}> S</span></span>}
                      {row[6]&&<span style={{fontSize:"0.65rem",color:G.brown,fontWeight:600}}>{row[6]} kcal</span>}
                      {row[7]&&<span style={{fontSize:"0.6rem",padding:"1px 7px",borderRadius:20,background:G.creamDark,color:G.textSoft}}>{row[7]}</span>}
                    </div>
                  </div>
                ))}
                {sheetData.foods.filter(row=>!foodSearch||row[0]?.toLowerCase().includes(foodSearch.toLowerCase())).length===0&&<div style={{...card,textAlign:"center",padding:"16px"}}><div style={{fontSize:"0.76rem",color:G.textSoft}}>No foods found matching "{foodSearch}"</div></div>}
              </div>
            )}

            {sheetLoaded&&<button onClick={()=>{setSheetLoaded(false);fetchSheets();}} style={{...btnMango,fontSize:"0.74rem",padding:"10px"}}>↻ Refresh Resources</button>}
          </div>
        )}

        {/* ── MY STATS ── */}
        {tab==="stats"&&(()=>{
          const clientBodyStats=bodyStats[currentClient.id]||[];
          const lastStats=clientBodyStats.length>0?clientBodyStats[clientBodyStats.length-1]:null;
          const firstStats=clientBodyStats.length>1?clientBodyStats[0]:null;
          const cid=currentClient.id;
          // Streak: consecutive days with a check-in
          const allDates=Object.keys(logs[cid]||{}).sort().reverse();
          let streak=0; let d=new Date(); d.setHours(0,0,0,0);
          for(let i=0;i<60;i++){ const ds=d.toISOString().split("T")[0]; if(allDates.includes(ds)){streak++;}else if(i>0){break;} d.setDate(d.getDate()-1); }
          // Prayer streak
          let prayerStreak=0; let pd=new Date(); pd.setHours(0,0,0,0);
          for(let i=0;i<60;i++){ const ds=pd.toISOString().split("T")[0]; if((logs[cid]||{})[ds]?.prayerDone){prayerStreak++;}else if(i>0){break;} pd.setDate(pd.getDate()-1); }
          // Nutrition compliance (last 7 days with meals logged)
          const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
          const nutriCompliance=nutriDays.length>0?Math.round(nutriDays.reduce((acc,date)=>{
            const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");
            const t=getDayTotals(meals); const tgt=getTargets(currentClient.weight);
            const score=(t.protein>=tgt.protein*0.8?40:t.protein>=tgt.protein*0.6?20:0)+(t.carbs<=tgt.carbs?30:t.carbs<=tgt.carbs*1.2?15:0)+(t.sugar<=tgt.sugar?30:t.sugar<=tgt.sugar*1.3?15:0);
            return acc+score;
          },0)/nutriDays.length):null;
          // Water history last 7 days
          const waterHistory=Array.from({length:7},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().split("T")[0]; const w=((nutrition[cid]||{})[ds]||[]).find(m=>m.meal==="__water__"); return{date:ds,glasses:w?.glasses||0}; }).reverse();
          // Monthly summary
          const now=new Date(); const monthStart=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`;
          const monthLogs=Object.values(logs[cid]||{}).filter(l=>l.date>=monthStart);
          const monthMeals=Object.entries(nutrition[cid]||{}).filter(([d])=>d>=monthStart).reduce((a,[,meals])=>a+(meals.filter(m=>m.meal!=="__water__").length),0);
          const monthPrayer=monthLogs.filter(l=>l.prayerDone).length;
          // Weight chart data
          const weightData=Object.values(logs[cid]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?1:-1).slice(-8);
          const weightLost=+(currentClient.weight-(currentClient.goalWeight||150));
          const startWeight=weightData.length>0?parseFloat(weightData[0].weight):currentClient.weight;
          const totalLost=+(startWeight-currentClient.weight).toFixed(1);

          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>🔢 My Stats</div>

       {/* Google Fit — Coming Soon */}
            <div style={{...card,background:G.creamDark,border:`1px solid ${G.border}`,opacity:0.6}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#e5e7eb",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>🏃</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:G.textSoft}}>Google Fit Sync</div>
                  <div style={{fontSize:"0.62rem",color:G.textSoft}}>Coming soon — auto-sync steps, heart rate & sleep</div>
                </div>
                <div style={{fontSize:"0.62rem",padding:"3px 9px",borderRadius:20,background:G.border,color:G.textSoft,fontWeight:600}}>Soon</div>
              </div>
            </div>

            {/* Top stat cards */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {[
                {l:"Check-In Streak",v:`${streak} days`,sub:"consecutive days",c:G.green,icon:"🔥"},
                {l:"Prayer Streak",v:`${prayerStreak} days`,sub:"days of reflection",c:G.brown,icon:"🙏"},
                {l:"Weight Lost",v:`${Math.max(0,totalLost)} lbs`,sub:`${Math.max(0,currentClient.weight-(currentClient.goalWeight||150))} lbs to goal`,c:G.mango,icon:"⚖️"},
                {l:"Nutrition Score",v:nutriCompliance!==null?`${nutriCompliance}%`:"—",sub:"7-day avg compliance",c:nutriCompliance>=70?"#4ade80":nutriCompliance>=50?"#facc15":"#f87171",icon:"🥗"},
              ].map((s,i)=>(
                <div key={i} style={{...card,border:`1.5px solid ${s.c}33`}}>
                  <div style={{fontSize:"0.62rem",color:s.c,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{s.icon} {s.l}</div>
                  <div style={{fontSize:"1.2rem",fontWeight:900,color:G.text}}>{s.v}</div>
                  <div style={{fontSize:"0.58rem",color:G.textSoft}}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Weight trend chart */}
            {/* Body Measurements Log */}
            <div style={card}>
              <div style={lbl}>📏 Body Measurements (inches)</div>
              {bodySaved&&<div style={{padding:"7px 12px",background:"#d8f3dc",borderRadius:8,fontSize:"0.74rem",color:G.green,fontWeight:600,marginBottom:8,textAlign:"center"}}>✓ Stats saved! 🌟</div>}
              <div style={{fontSize:"0.63rem",color:G.textSoft,marginBottom:8}}>Check the measurements you want to track — skip any that don't apply to you.</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:10}}>
                {[{label:"💪 Arms (bicep)",field:"arms"},{label:"🫁 Chest",field:"chest"},{label:"⭕ Waist",field:"waist"},{label:"🍑 Hips",field:"hips"},{label:"🦵 Thighs",field:"thighs"}].map((m,i)=>{
                  const isChecked=bodyForm[m.field+"_track"]||false;
                  return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:isChecked?"#f0faf4":G.creamDark,borderRadius:10,border:`1px solid ${isChecked?G.greenLight:G.border}`}}>
                    <button onClick={()=>setBodyForm(p=>({...p,[m.field+"_track"]:!isChecked,[m.field]:isChecked?"":p[m.field]}))} style={{width:22,height:22,borderRadius:5,border:`2px solid ${isChecked?G.greenMid:G.border}`,background:isChecked?G.greenMid:G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.8rem",flexShrink:0}}>{isChecked?"✓":""}</button>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.68rem",color:isChecked?G.green:G.textSoft,fontWeight:isChecked?700:400,marginBottom:isChecked?4:0}}>{m.label}</div>
                      {isChecked&&<input type="number" value={bodyForm[m.field]||""} onChange={e=>setBodyForm(p=>({...p,[m.field]:e.target.value}))} placeholder="inches" style={{...iStyle,padding:"6px 10px",fontSize:"0.76rem"}}/>}
                      {isChecked&&lastStats?.[m.field]&&<div style={{fontSize:"0.58rem",color:G.textSoft,marginTop:2}}>Last: {lastStats[m.field]}"</div>}
                    </div>
                  </div>);
                })}
              </div>

              {/* Health Metrics */}
              <div style={{borderTop:`1px solid ${G.border}`,paddingTop:10,marginBottom:10}}>
                <div style={{fontSize:"0.68rem",fontWeight:700,color:G.brown,marginBottom:4}}>🏥 Health Metrics</div>
                <div style={{fontSize:"0.63rem",color:G.textSoft,marginBottom:8}}>Check the metrics you want to track — skip any that don't apply to you.</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[{label:"🩸 Blood Sugar",field:"bloodSugar",placeholder:"mg/dL",type:"number"},{label:"💊 Cholesterol",field:"cholesterol",placeholder:"mg/dL",type:"number"},{label:"❤️ Blood Pressure",field:"bloodPressure",placeholder:"e.g. 120/80",type:"text"},{label:"👟 Steps",field:"steps",placeholder:"steps today",type:"number"},{label:"💓 Resting Heart Rate",field:"heartRate",placeholder:"bpm",type:"number"},{label:"😴 Sleep",field:"sleep",placeholder:"hours",type:"number"}].map((m,i)=>{
                    const isChecked=bodyForm[m.field+"_track"]||false;
                    return(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:isChecked?"#f0faf4":G.creamDark,borderRadius:10,border:`1px solid ${isChecked?G.greenLight:G.border}`}}>
                      <button onClick={()=>setBodyForm(p=>({...p,[m.field+"_track"]:!isChecked,[m.field]:isChecked?"":p[m.field]}))} style={{width:22,height:22,borderRadius:5,border:`2px solid ${isChecked?G.greenMid:G.border}`,background:isChecked?G.greenMid:G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:G.white,fontSize:"0.8rem",flexShrink:0}}>{isChecked?"✓":""}</button>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"0.68rem",color:isChecked?G.green:G.textSoft,fontWeight:isChecked?700:400,marginBottom:isChecked?4:0}}>{m.label}</div>
                        {isChecked&&<input type={m.type} value={bodyForm[m.field]||""} onChange={e=>setBodyForm(p=>({...p,[m.field]:e.target.value}))} placeholder={m.placeholder} style={{...iStyle,padding:"6px 10px",fontSize:"0.76rem"}}/>}
                        {isChecked&&lastStats?.[m.field]&&<div style={{fontSize:"0.58rem",color:G.textSoft,marginTop:2}}>Last: {lastStats[m.field]}</div>}
                      </div>
                    </div>);
                  })}
                </div>
              </div>

              <button onClick={saveBodyStats} disabled={savingBody} style={{...btnGreen,padding:"10px",fontSize:"0.8rem"}}>
                {savingBody?"Saving...":"✓ Save Body Stats"}
              </button>
            </div>

            {/* Body stats history */}
            {clientBodyStats.length>0&&firstStats&&(
              <div style={card}>
                <div style={lbl}>📊 Measurement Progress</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[{label:"💪 Arms",field:"arms",unit:'"'},{label:"🫁 Chest",field:"chest",unit:'"'},{label:"⭕ Waist",field:"waist",unit:'"'},{label:"🍑 Hips",field:"hips",unit:'"'},{label:"🦵 Thighs",field:"thighs",unit:'"'}].map((m,i)=>{
                    if(!lastStats?.[m.field]||!firstStats?.[m.field]) return null;
                    const diff=+(parseFloat(lastStats[m.field])-parseFloat(firstStats[m.field])).toFixed(1);
                    return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${G.border}`}}>
                      <span style={{fontSize:"0.74rem",color:G.text}}>{m.label}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        {diff!==0&&<span style={{fontSize:"0.62rem",color:diff<0?"#4ade80":"#f87171",fontWeight:600}}>{diff<0?"↓":"↑"}{Math.abs(diff)}{m.unit}</span>}
                        <span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{lastStats[m.field]}{m.unit}</span>
                      </div>
                    </div>);
                  })}
                </div>
                <div style={{marginTop:8,fontSize:"0.63rem",color:G.textSoft}}>Comparing latest to first logged entry on {fmtDate(firstStats.date)}</div>
              </div>
            )}

            {/* Health metrics history */}
            {lastStats&&(
              <div style={card}>
                <div style={lbl}>🏥 Latest Health Metrics</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[{label:"🩸 Blood Sugar",field:"bloodSugar",unit:" mg/dL"},{label:"💊 Cholesterol",field:"cholesterol",unit:" mg/dL"},{label:"❤️ Blood Pressure",field:"bloodPressure",unit:""},{label:"👟 Steps",field:"steps",unit:" steps"},{label:"💓 Heart Rate",field:"heartRate",unit:" bpm"},{label:"😴 Sleep",field:"sleep",unit:" hrs"}].map((m,i)=>{
                    if(!lastStats[m.field]) return null;
                    return(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${G.border}`}}>
                      <span style={{fontSize:"0.72rem",color:G.textSoft}}>{m.label}</span>
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{lastStats[m.field]}{m.unit}</span>
                    </div>);
                  })}
                  <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>Logged {fmtDate(lastStats.date)}</div>
                </div>
              </div>
            )}

            {/* Weight trend chart */}
            {weightData.length>=2&&(
              <div style={card}>
                <div style={lbl}>⚖️ Weight Trend</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:4,height:80,marginBottom:8}}>
                  {(()=>{
                    const vals=weightData.map(w=>parseFloat(w.weight));
                    const mn=Math.min(...vals)-2, mx=Math.max(...vals)+2, range=mx-mn;
                    return weightData.map((w,i)=>{
                      const h=Math.max(8,Math.round(((parseFloat(w.weight)-mn)/range)*68));
                      const isLast=i===weightData.length-1;
                      return(
                        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                          <div style={{fontSize:"0.52rem",color:isLast?G.green:G.textSoft,fontWeight:isLast?700:400}}>{w.weight}</div>
                          <div style={{width:"100%",height:h,borderRadius:"4px 4px 0 0",background:isLast?`linear-gradient(180deg,${G.greenMid},${G.green})`:`linear-gradient(180deg,${G.greenLight},${G.greenMid})`,minHeight:8}}/>
                          <div style={{fontSize:"0.48rem",color:G.textSoft,textAlign:"center"}}>{fmtDate(w.date).replace(" ","")}</div>
                        </div>
                      );
                    });
                  })()}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.66rem"}}>
                  <span style={{color:G.textSoft}}>Start: {startWeight} lbs</span>
                  <span style={{color:totalLost>0?G.greenMid:G.textSoft,fontWeight:700}}>{totalLost>0?`↓ ${totalLost} lbs lost`:totalLost<0?`↑ ${Math.abs(totalLost)} lbs gained`:"No change"}</span>
                  <span style={{color:G.textSoft}}>Goal: {currentClient.goalWeight} lbs</span>
                </div>
              </div>
            )}

            {/* Nutrition compliance */}
            {nutriCompliance!==null&&(
              <div style={card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={lbl}>🥗 Nutrition Compliance</div>
                  <div style={{fontSize:"1.1rem",fontWeight:900,color:nutriCompliance>=70?"#4ade80":nutriCompliance>=50?"#facc15":"#fb923c"}}>{nutriCompliance}%</div>
                </div>
                <div style={{height:8,background:G.creamDark,borderRadius:4,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",width:`${nutriCompliance}%`,background:nutriCompliance>=70?"#4ade80":nutriCompliance>=50?"#facc15":"#fb923c",borderRadius:4,transition:"width .5s"}}/>
                </div>
                <div style={{fontSize:"0.66rem",color:G.textSoft,lineHeight:1.6}}>
                  Scored on: protein target (40pts) + carbs in range (30pts) + sugar in range (30pts). Based on {nutriDays.length} logged days this week.
                </div>
                <div style={{marginTop:6,fontSize:"0.66rem",color:nutriCompliance>=70?G.greenMid:nutriCompliance>=50?G.brown:G.red,fontWeight:600}}>
                  {nutriCompliance>=70?"🌟 Great eating habits this week! Keep it up."
                    :nutriCompliance>=50?"💪 Good progress — focus on hitting your protein target."
                    :"🥩 Try to prioritize protein-rich foods and reduce carbs/sugar."}
                </div>
              </div>
            )}

            {/* Water intake history */}
            <div style={card}>
              <div style={lbl}>💧 Water Intake — Last 7 Days</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:60,marginBottom:6}}>
                {waterHistory.map((w,i)=>{
                  const h=Math.max(4,Math.round((w.glasses/12)*52));
                  const isToday=w.date===todayStr();
                  const good=w.glasses>=8;
                  return(
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{fontSize:"0.5rem",color:good?"#60a5fa":G.textSoft,fontWeight:good?700:400}}>{w.glasses>0?w.glasses:""}</div>
                      <div style={{width:"100%",height:h,borderRadius:"3px 3px 0 0",background:isToday?"#60a5fa":good?"#93c5fd":"#dbeafe",minHeight:4}}/>
                      <div style={{fontSize:"0.48rem",color:G.textSoft}}>{fmtDate(w.date).split(" ")[0]}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontSize:"0.64rem",color:G.textSoft,textAlign:"center"}}>
                {waterHistory.filter(w=>w.glasses>=8).length}/7 days hit 8+ glasses 💧
              </div>
            </div>

            {/* Monthly summary */}
            <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
              <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,.8)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
                {new Date().toLocaleString("default",{month:"long"})} Summary
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                {[{l:"Check-Ins",v:monthLogs.length,icon:"📋"},{l:"Meals Logged",v:monthMeals,icon:"🥗"},{l:"Prayers",v:monthPrayer,icon:"🙏"}].map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:"1.3rem",fontWeight:900,color:G.white}}>{s.v}</div>
                    <div style={{fontSize:"0.58rem",color:"rgba(255,255,255,.75)"}}>{s.icon} {s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weight history list */}
            {weightData.length>0&&(
              <div style={card}>
                <div style={lbl}>⚖️ Weigh-In Log (Tue/Fri)</div>
                {weightData.slice().reverse().map((l,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${G.border}`}}>
                    <span style={{fontSize:"0.72rem",color:G.textSoft}}>{fmtDate(l.date)}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {i<weightData.length-1&&(()=>{
                        const diff=+(parseFloat(l.weight)-parseFloat(weightData.slice().reverse()[i+1]?.weight)).toFixed(1);
                        return diff!==0?<span style={{fontSize:"0.62rem",color:diff<0?"#4ade80":"#f87171",fontWeight:600}}>{diff<0?"↓":"↑"}{Math.abs(diff)}</span>:null;
                      })()}
                      <span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{l.weight} lbs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          );
        })()}

        {/* ── PROGRESS ── */}
        {tab==="progress"&&(()=>{
          const cid=currentClient.id;
          const clientBodyStats=bodyStats[cid]||[];
          const allLogs2=Object.values(logs[cid]||{}).sort((a,b)=>a.date>b.date?1:-1);

          // Weight data
          const weightData2=allLogs2.filter(l=>l.weight).map(l=>({date:l.date,value:parseFloat(l.weight)}));

          // Body measurement data
          const getMeasData=(field)=>clientBodyStats.filter(s=>s[field]).map(s=>({date:s.date,value:parseFloat(s[field])}));

          // Health metric data
          const getHealthData=(field)=>clientBodyStats.filter(s=>s[field]).map(s=>({date:s.date,value:field==="bloodPressure"?s[field]:parseFloat(s[field])}));

          // Nutrition compliance per day
          const nutriDays2=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort();
          const complianceData=nutriDays2.map(date=>{
            const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");
            const t=getDayTotals(meals); const tgt=getTargets(currentClient.weight);
            const score=(t.protein>=tgt.protein*0.8?40:t.protein>=tgt.protein*0.6?20:0)+(t.carbs<=tgt.carbs?30:t.carbs<=tgt.carbs*1.2?15:0)+(t.sugar<=tgt.sugar?30:t.sugar<=tgt.sugar*1.3?15:0);
            return{date,value:score};
          });

          const CHARTS=[
            {id:"weight",  label:"⚖️ Weight",          data:weightData2,    unit:"lbs", color:G.mango},
            {id:"waist",   label:"⭕ Waist",            data:getMeasData("waist"),  unit:'"', color:"#f87171"},
            {id:"arms",    label:"💪 Arms",             data:getMeasData("arms"),   unit:'"', color:"#60a5fa"},
            {id:"chest",   label:"🫁 Chest",            data:getMeasData("chest"),  unit:'"', color:"#a78bfa"},
            {id:"hips",    label:"🍑 Hips",             data:getMeasData("hips"),   unit:'"', color:"#f472b6"},
            {id:"thighs",  label:"🦵 Thighs",           data:getMeasData("thighs"), unit:'"', color:"#fb923c"},
            {id:"sugar",   label:"🩸 Blood Sugar",      data:getHealthData("bloodSugar"),  unit:" mg/dL", color:"#f87171"},
            {id:"steps",   label:"👟 Steps",            data:getHealthData("steps"),       unit:" steps", color:"#4ade80"},
            {id:"sleep",   label:"😴 Sleep",            data:getHealthData("sleep"),       unit:" hrs",   color:"#818cf8"},
            {id:"nutrition",label:"🥗 Nutrition Score", data:complianceData, unit:"%",  color:G.greenMid},
          ];

          function MiniLineChart({data,color,unit}){
            if(!data||data.length<2) return <div style={{fontSize:"0.7rem",color:G.textSoft,textAlign:"center",padding:"10px 0"}}>Need at least 2 data points to show chart</div>;
            const vals=data.map(d=>typeof d.value==="number"?d.value:0).filter(v=>!isNaN(v));
            if(vals.length<2) return null;
            const mn=Math.min(...vals),mx=Math.max(...vals),range=mx-mn||1;
            const W=300,H=80,pad=20;
            const pts=data.filter(d=>typeof d.value==="number"&&!isNaN(d.value));
            const coords=pts.map((d,i)=>({
              x:pad+(i/(pts.length-1))*(W-pad*2),
              y:H-pad-((d.value-mn)/range)*(H-pad*2),
              d
            }));
            const pathD=coords.map((c,i)=>`${i===0?"M":"L"} ${c.x} ${c.y}`).join(" ");
            const first=pts[0],last=pts[pts.length-1];
            const diff=typeof first.value==="number"&&typeof last.value==="number"?+(last.value-first.value).toFixed(1):null;
            return(
              <div>
                <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:80}}>
                  <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  {coords.map((c,i)=><circle key={i} cx={c.x} cy={c.y} r="3" fill={color}/>)}
                  <text x={coords[0].x} y={H-4} fontSize="8" fill={G.textSoft} textAnchor="middle">{fmtDate(first.date)}</text>
                  <text x={coords[coords.length-1].x} y={H-4} fontSize="8" fill={G.textSoft} textAnchor="middle">{fmtDate(last.date)}</text>
                  <text x={coords[0].x} y={coords[0].y-6} fontSize="9" fill={color} textAnchor="middle">{first.value}{unit}</text>
                  <text x={coords[coords.length-1].x} y={coords[coords.length-1].y-6} fontSize="9" fill={color} textAnchor="middle" fontWeight="bold">{last.value}{unit}</text>
                </svg>
                {diff!==null&&diff!==0&&<div style={{textAlign:"center",fontSize:"0.68rem",fontWeight:700,color:diff<0?"#4ade80":"#f87171"}}>{diff<0?"↓":"↑"} {Math.abs(diff)}{unit} since first log</div>}
              </div>
            );
          }

          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>📈 Progress Charts</div>
            <div style={{fontSize:"0.7rem",color:G.textSoft,marginTop:-6}}>Tap a metric to see your trend over time.</div>

            {CHARTS.map(chart=>{
              const hasData=chart.data.length>=2;
              const isOpen=openChart===chart.id;
              const latest=chart.data.length>0?chart.data[chart.data.length-1]:null;
              return(
                <div key={chart.id} style={{...card,border:`1.5px solid ${isOpen?chart.color+"88":G.border}`,overflow:"hidden"}}>
                  <button onClick={()=>setOpenChart(isOpen?null:chart.id)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:10,height:10,borderRadius:"50%",background:hasData?chart.color:G.border,flexShrink:0}}/>
                      <div style={{textAlign:"left"}}>
                        <div style={{fontSize:"0.8rem",fontWeight:700,color:isOpen?chart.color:G.text}}>{chart.label}</div>
                        {latest&&<div style={{fontSize:"0.62rem",color:G.textSoft}}>Latest: {latest.value}{chart.unit} · {fmtDate(latest.date)}</div>}
                        {!hasData&&<div style={{fontSize:"0.62rem",color:G.textSoft}}>No data yet — log in My Stats tab</div>}
                      </div>
                    </div>
                    <div style={{fontSize:"0.8rem",color:isOpen?chart.color:G.textSoft,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
                  </button>
                  {isOpen&&(
                    <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${G.border}`}}>
                      <MiniLineChart data={chart.data} color={chart.color} unit={chart.unit}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}

       {/* ── HIIT ── */}
        {tab==="hiit"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>🔥 HIIT Workouts</div>
            <div style={{...card,background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,border:"none"}}>
              <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>High Intensity Interval Training</div>
              <div style={{fontSize:"0.88rem",fontWeight:700,color:G.white,marginBottom:4}}>Short. Intense. Effective.</div>
              <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.88)",lineHeight:1.7}}>HIIT workouts alternate between intense bursts and short recovery periods. Even 15-20 minutes can torch calories and boost metabolism for hours.</div>
            </div>
            <div style={{...card,textAlign:"center",padding:"28px 20px"}}>
              <div style={{fontSize:"2rem",marginBottom:8}}>🏗️</div>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:G.brown,marginBottom:6}}>HIIT Workouts Coming Soon</div>
              <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6}}>We're building personalized HIIT sessions pulled from your coach's workout library. Interval timers, heart rate zones, and custom rounds — all coming in the next update!</div>
            </div>
          </div>
        )}

        {/* ── MESSAGES ── */}
        {tab==="messages"&&(()=>{
          const allClientMsgs=messages[currentClient.id]||[];
          const coachMsgsForClient=allClientMsgs.filter(m=>m.from==="coach");
          const myMsgsToCoach=allClientMsgs.filter(m=>m.from==="client");
          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:11}}>
            <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>💌 Messages</div>
            <div style={card}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:G.green,marginBottom:8}}>✦ From Your Coach</div>
              {coachMsgsForClient.length===0
                ?<div style={{fontSize:"0.74rem",color:G.textSoft,textAlign:"center",padding:"8px 0"}}>No messages yet — your coach will reach out soon! 🙏</div>
                :coachMsgsForClient.map((m,i)=>(<div key={i} style={{background:"#f0faf4",borderRadius:10,padding:"10px 12px",marginBottom:6,border:`1px solid ${G.greenLight}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:"0.66rem",fontWeight:700,color:G.green}}>✦ Coach MJ</span><span style={{fontSize:"0.6rem",color:G.textSoft}}>{new Date(m.ts).toLocaleDateString()}</span></div><div style={{fontSize:"0.79rem",color:G.text,lineHeight:1.65}}>{m.text}</div></div>))}
            </div>
            <div style={card}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:G.brown,marginBottom:8}}>✉️ Message Your Coach</div>
              {myMsgsToCoach.length>0&&(
                <div style={{marginBottom:10}}>
                  {myMsgsToCoach.slice(-3).map((m,i)=>(<div key={i} style={{background:G.creamDark,borderRadius:10,padding:"8px 12px",marginBottom:6,borderLeft:`3px solid ${G.mango}`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:"0.64rem",fontWeight:700,color:G.brown}}>You</span><span style={{fontSize:"0.6rem",color:G.textSoft}}>{new Date(m.ts).toLocaleDateString()}</span></div><div style={{fontSize:"0.74rem",color:G.text}}>{m.text}</div></div>))}
                </div>
              )}
              <textarea value={clientMsgDraft} onChange={e=>setClientMsgDraft(e.target.value)} placeholder="Write a message to your coach..." rows={3} style={{...iStyle,resize:"none",marginBottom:8}}/>
              <button onClick={()=>{
                if(!clientMsgDraft.trim()) return;
                const cid=currentClient.id;
                const newMsg={from:"client",text:clientMsgDraft.trim(),ts:new Date().toISOString()};
                persist(null,null,{...messages,[cid]:[...(messages[cid]||[]),newMsg]},null,null,null,null,null);
                setClientMsgDraft("");
              }} disabled={!clientMsgDraft.trim()} style={{...btnMango,opacity:clientMsgDraft.trim()?1:0.5,padding:"10px",fontSize:"0.78rem"}}>
                ✉️ Send to Coach
              </button>
            </div>
          </div>
          );
        })()}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COACH DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  if(screen==="coach"){
    return(
      <div style={{minHeight:"100vh",background:G.creamDark,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
        <div style={{background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,padding:"12px 16px 9px",position:"sticky",top:0,zIndex:10,boxShadow:"0 3px 16px rgba(231,111,81,.25)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:"0.92rem",fontWeight:900,color:G.white}}>✦ Coach Dashboard</div><div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.85)"}}>All Things Possible</div></div>
            <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{textAlign:"right"}}><div style={{fontSize:"0.68rem",color:G.white,fontWeight:700}}>{clients.length} clients</div><div style={{fontSize:"0.56rem",color:"rgba(255,255,255,.75)"}}>{clients.filter(c=>(logs[c.id]||{})[todayStr()]).length} in today</div></div><button onClick={logout} style={{background:"rgba(255,255,255,.2)",border:"none",color:G.white,fontSize:"0.62rem",cursor:"pointer",padding:"5px 9px",borderRadius:8,fontFamily:"inherit"}}>Sign out</button></div>
          </div>
        </div>

        <div style={{display:"flex",borderBottom:`1px solid ${G.border}`,background:G.white}}>
        {[["clients","👥","Clients"],["healthboard","📊","Board"],["messages","💌","Messages"],["add","➕","Add"],["passcodes","🔑","Passcodes"],["resources","📚","Resources"]].map(([id,icon,label])=>{
          const hasUnread=id==="messages"&&clients.some(c=>{
            const allM=messages[c.id]||[];
            const clientM=allM.filter(m=>m.from==="client");
            const coachM=allM.filter(m=>m.from==="coach");
            if(clientM.length===0) return false;
            const lastClient=new Date(clientM[clientM.length-1].ts).getTime();
            const lastCoach=coachM.length>0?new Date(coachM[coachM.length-1].ts).getTime():0;
            return lastClient>lastCoach;
          });
          return(<button key={id} onClick={()=>{setCoachTab(id);setSelectedClientCoach(null);setFromHealthBoard(false);if(id==="resources"&&!sheetLoaded)fetchSheets();}} style={{flex:1,padding:"7px 2px",border:"none",background:"transparent",color:coachTab===id?G.mangoDeep:G.textSoft,borderBottom:coachTab===id?`2px solid ${G.mangoDeep}`:"2px solid transparent",fontSize:"0.52rem",fontWeight:coachTab===id?700:400,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:1,position:"relative"}}>
            <span style={{fontSize:"0.82rem"}}>{icon}</span>
            <span>{label}</span>
            {hasUnread&&<div style={{position:"absolute",top:4,right:6,width:7,height:7,borderRadius:"50%",background:G.mangoDeep}}/>}
          </button>);
        })}
        </div>

        {coachTab==="clients"&&!selectedClientCoach&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:9}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>Your Clients</div>
            {clients.map(client=>{
              const cl=logs[client.id]||{},checked=!!cl[todayStr()];
              const last=Object.values(cl).sort((a,b)=>a.date>b.date?-1:1)[0];
              const clientR=ratings[client.id]||[];
              const lastRating=clientR[clientR.length-1];
              const todayClientMeals=((nutrition[client.id]||{})[todayStr()]||[]).filter(m=>m.meal!=="__water__");
              const proteinToday=todayClientMeals.reduce((a,m)=>a+(m.protein||0),0);
              const clientTargets=getTargets(client.weight);
              const waterToday=getTodayWater(client.id);
              return(<button key={client.id} onClick={()=>setSelectedClientCoach(client)} style={{...card,cursor:"pointer",textAlign:"left",width:"100%",border:`1.5px solid ${checked?G.greenLight:G.border}`,background:checked?"#f0faf4":G.white}}>
                <div style={{display:"flex",alignItems:"center",gap:11}}>
                  <div style={{width:44,height:44,borderRadius:"50%",background:checked?`linear-gradient(135deg,${G.greenMid},${G.green})`:`linear-gradient(135deg,#ccc,#999)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.8rem",fontWeight:700,color:G.white,flexShrink:0,position:"relative"}}>{client.avatar}{checked&&<div style={{position:"absolute",bottom:0,right:0,width:11,height:11,borderRadius:"50%",background:G.greenMid,border:"2px solid white"}}/>}</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><div style={{fontSize:"0.82rem",fontWeight:700,color:G.text}}>{client.name}</div><div style={{fontSize:"0.58rem",color:checked?G.greenMid:G.textSoft,fontWeight:checked?700:400}}>{checked?"✓ Today":last?timeAgo(last.date):"No logs"}</div></div>
                    <div style={{fontSize:"0.66rem",color:G.textSoft,marginTop:1}}>{client.goal}</div>
                    <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.6rem",color:G.brown}}>{client.weight} → {client.goalWeight} lbs</span>
                      {proteinToday>0&&<span style={{fontSize:"0.6rem",color:proteinToday>=clientTargets.protein*0.8?"#4ade80":"#f87171"}}>🥩 {proteinToday}g</span>}
                      {waterToday>0&&<span style={{fontSize:"0.6rem",color:"#60a5fa"}}>💧 {waterToday}g</span>}
                      {lastRating&&<span style={{fontSize:"0.6rem",color:RATING_INFO[lastRating.rating]?.color,fontWeight:600}}>★ {lastRating.rating}/5</span>}
                    </div>
                  </div>
                </div>
              </button>);
            })}
          </div>
        )}

        {coachTab==="clients"&&selectedClientCoach&&(()=>{
          const clientTargets=getTargets(selectedClientCoach.weight);
          const weekly=getWeeklyNutrition(selectedClientCoach.id);
          const todayClientNutr=((nutrition[selectedClientCoach.id]||{})[todayStr()]||[]).filter(m=>m.meal!=="__water__");
          const todayClientTotals=getDayTotals(todayClientNutr);
          const clientR=ratings[selectedClientCoach.id]||[];
          const waterToday=getTodayWater(selectedClientCoach.id);
          const [coachNutriSummary,setCoachNutriSummary] = [null,()=>{}]; // placeholder — see note below

          return(
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
             <button onClick={()=>{setSelectedClientCoach(null);if(fromHealthBoard){setCoachTab("healthboard");setFromHealthBoard(false);}}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0}}>{fromHealthBoard?"← Back to Health Board":"← Back"}</button> 
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.95rem",fontWeight:700,color:G.white}}>{selectedClientCoach.avatar}</div>
                <div><div style={{fontSize:"0.95rem",fontWeight:700,color:G.text}}>{selectedClientCoach.name}</div><div style={{fontSize:"0.66rem",color:G.textSoft}}>Age {selectedClientCoach.age} · {selectedClientCoach.weight}lbs → {selectedClientCoach.goalWeight}lbs</div></div>
              </div>

  {(()=>{
                const cid=selectedClientCoach.id;
                const allDates=Object.keys(logs[cid]||{}).sort().reverse();
                let streak=0; let sd=new Date(); sd.setHours(0,0,0,0);
                for(let i=0;i<60;i++){ const ds=sd.toISOString().split("T")[0]; if(allDates.includes(ds)){streak++;}else if(i>0){break;} sd.setDate(sd.getDate()-1); }
                let pStreak=0; let spd=new Date(); spd.setHours(0,0,0,0);
                for(let i=0;i<60;i++){ const ds=spd.toISOString().split("T")[0]; if((logs[cid]||{})[ds]?.prayerDone){pStreak++;}else if(i>0){break;} spd.setDate(spd.getDate()-1); }
                const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
                const nutriScore=nutriDays.length>0?Math.round(nutriDays.reduce((acc,date)=>{ const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__"); const t=getDayTotals(meals); const tgt=getTargets(selectedClientCoach.weight); return acc+(t.protein>=tgt.protein*0.8?40:t.protein>=tgt.protein*0.6?20:0)+(t.carbs<=tgt.carbs?30:t.carbs<=tgt.carbs*1.2?15:0)+(t.sugar<=tgt.sugar?30:t.sugar<=tgt.sugar*1.3?15:0); },0)/nutriDays.length):null;
                const weightData=Object.values(logs[cid]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?1:-1).slice(-6);
                const startW=weightData.length>0?parseFloat(weightData[0].weight):selectedClientCoach.weight;
                const totalLost=+(startW-selectedClientCoach.weight).toFixed(1);
                return(<>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                    {[{l:"Check-In Streak",v:`${streak}d`,c:G.green},{l:"Protein Target",v:`${clientTargets.protein}g`,c:G.mango},{l:"Nutrition Score",v:nutriScore!==null?`${nutriScore}%`:"—",c:nutriScore>=70?"#4ade80":nutriScore>=50?"#facc15":"#f87171"}].map((s,i)=>(<div key={i} style={{...card,textAlign:"center",padding:"9px 7px"}}><div style={{fontSize:"1.1rem",fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:"0.55rem",color:G.textSoft}}>{s.l}</div></div>))}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                    {[{l:"Prayer Streak",v:`${pStreak}d`,c:G.brown},{l:"Weight Lost",v:`${Math.max(0,totalLost)}lbs`,c:G.greenMid},{l:"Avg Rating",v:clientR.length?(clientR.reduce((a,r)=>a+r.rating,0)/clientR.length).toFixed(1):"—",c:"#fb923c"}].map((s,i)=>(<div key={i} style={{...card,textAlign:"center",padding:"9px 7px"}}><div style={{fontSize:"1.1rem",fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:"0.55rem",color:G.textSoft}}>{s.l}</div></div>))}
                  </div>
                  {/* Weight mini chart for coach */}
                  {weightData.length>=2&&(<div style={card}><div style={lbl}>⚖️ Weight Trend</div><div style={{display:"flex",alignItems:"flex-end",gap:3,height:50,marginBottom:4}}>{(()=>{ const vals=weightData.map(w=>parseFloat(w.weight)); const mn=Math.min(...vals)-1,mx=Math.max(...vals)+1,range=mx-mn; return weightData.map((w,i)=>{ const h=Math.max(6,Math.round(((parseFloat(w.weight)-mn)/range)*42)); const isLast=i===weightData.length-1; return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}><div style={{fontSize:"0.48rem",color:isLast?G.green:G.textSoft}}>{w.weight}</div><div style={{width:"100%",height:h,borderRadius:"3px 3px 0 0",background:isLast?G.green:G.greenLight}}/><div style={{fontSize:"0.44rem",color:G.textSoft}}>{fmtDate(w.date).replace(" ","")}</div></div>); }); })()}</div><div style={{fontSize:"0.63rem",color:totalLost>0?G.greenMid:G.textSoft,fontWeight:700,textAlign:"center"}}>{totalLost>0?`↓ ${totalLost} lbs lost since first log`:totalLost<0?`↑ ${Math.abs(totalLost)} lbs gained`:"Weight stable"}</div></div>)}
                </>);
              })()}

              {/* Today's nutrition */}
              <div style={card}>
                <div style={lbl}>Today's Nutrition & Hydration</div>
                {todayClientNutr.length>0?(
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <MacroBar label="🥩 Protein" value={todayClientTotals.protein} target={clientTargets.protein} isLow={true}/>
                    <MacroBar label="🌾 Carbs" value={todayClientTotals.carbs} target={clientTargets.carbs} isLow={false}/>
                    <MacroBar label="🍬 Sugar" value={todayClientTotals.sugar} target={clientTargets.sugar} isLow={false}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.65rem",marginTop:4}}><span style={{color:G.textSoft}}>Calories</span><span style={{fontWeight:700,color:G.brown}}>{todayClientTotals.calories} kcal</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.65rem"}}><span style={{color:G.textSoft}}>Meals logged</span><span style={{fontWeight:700,color:G.green}}>{todayClientNutr.length}</span></div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.65rem"}}><span style={{color:G.textSoft}}>💧 Water</span><span style={{fontWeight:700,color:"#60a5fa"}}>{waterToday>0?`${waterToday} glasses`:"Not logged"}</span></div>
                  </div>
                ):<div style={{fontSize:"0.72rem",color:G.textSoft,textAlign:"center",padding:"8px 0"}}>No meals logged today yet</div>}
              </div>

              {/* 7-day averages */}
              {weekly&&(<div style={card}>
                <div style={lbl}>7-Day Nutrition Averages</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <MacroBar label="🥩 Protein avg" value={weekly.protein} target={clientTargets.protein} isLow={true}/>
                  <MacroBar label="🌾 Carbs avg" value={weekly.carbs} target={clientTargets.carbs} isLow={false}/>
                  <MacroBar label="🍬 Sugar avg" value={weekly.sugar} target={clientTargets.sugar} isLow={false}/>
                </div>
                <div style={{fontSize:"0.63rem",color:G.textSoft,marginTop:6}}>Avg {weekly.calories} kcal/day · {weekly.days} days tracked</div>
                {weekly.protein<clientTargets.protein*0.7&&<div style={{marginTop:6,padding:"5px 9px",background:"#fee2e2",borderRadius:7,fontSize:"0.66rem",color:G.red}}>⚠ Protein consistently low — consider a coaching nudge</div>}
                {weekly.carbs>clientTargets.carbs*0.9&&<div style={{marginTop:6,padding:"5px 9px",background:"#fff7ed",borderRadius:7,fontSize:"0.66rem",color:G.mangoDeep}}>⚠ Carbs trending high — remind client of the pyramid</div>}
                {weekly.sugar>clientTargets.sugar*0.9&&<div style={{marginTop:6,padding:"5px 9px",background:"#fff7ed",borderRadius:7,fontSize:"0.66rem",color:G.mangoDeep}}>⚠ Sugar intake trending high</div>}
              </div>)}

              {/* Workout ratings */}
       
{clientR.slice(-5).reverse().map((r,i)=>(<div key={i} style={{padding:"5px 0",borderBottom:`1px solid ${G.border}`}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"0.7rem",color:G.textSoft}}>{fmtDate(r.date)} · {r.dayName}</span><span style={{fontSize:"0.7rem",fontWeight:700,color:RATING_INFO[r.rating]?.color}}>{r.rating}/5 {RATING_INFO[r.rating]?.label}</span></div>{r.feedback&&<div style={{fontSize:"0.65rem",color:G.textSoft,fontStyle:"italic",marginTop:2}}>"{r.feedback}"</div>}</div>))}
              {/* Weight history */}
              {Object.values(logs[selectedClientCoach.id]||{}).filter(l=>l.weight).length>0&&(<div style={card}><div style={lbl}>Weight History (Tue/Fri)</div>{Object.values(logs[selectedClientCoach.id]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?-1:1).slice(0,6).map((l,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${G.border}`}}><span style={{fontSize:"0.7rem",color:G.textSoft}}>{fmtDate(l.date)}</span><span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{l.weight} lbs</span></div>))}</div>)}

              {/* Recent check-ins */}
              <div style={card}><div style={lbl}>Recent Check-Ins</div>
                {Object.values(logs[selectedClientCoach.id]||{}).sort((a,b)=>a.date>b.date?-1:1).slice(0,5).map((l,i)=>(<div key={i} style={{padding:"6px 0",borderBottom:`1px solid ${G.border}`}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:"0.72rem",fontWeight:700,color:G.text}}>{fmtDate(l.date)}</span>{l.mood&&<span>{MOOD_OPTS.find(m=>m.label===l.mood)?.emoji}</span>}</div><div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>{l.energy&&<span>⚡ {l.energy}</span>}{l.weight&&<span>⚖️ {l.weight}lbs</span>}</div></div>))}
                {Object.keys(logs[selectedClientCoach.id]||{}).length===0&&<div style={{fontSize:"0.72rem",color:G.textSoft,textAlign:"center",padding:"8px 0"}}>No check-ins yet</div>}
              </div>

    <div style={card}><div style={lbl}>Send Encouragement</div>
                <textarea value={msgDraft[selectedClientCoach.id]||""} onChange={e=>setMsgDraft(p=>({...p,[selectedClientCoach.id]:e.target.value}))} placeholder={`Write to ${selectedClientCoach.name.split(" ")[0]}...`} rows={3} style={{...iStyle,resize:"none",marginBottom:8}}/>
                <button onClick={()=>sendCoachMessage(selectedClientCoach.id,msgDraft[selectedClientCoach.id]||"")} style={btnMango}>✉️ Send Message</button>
              </div>

              {/* Client health info */}
              {(selectedClientCoach.injury||selectedClientCoach.medical||selectedClientCoach.equipment)&&(
                <div style={card}>
                  <div style={lbl}>Health & Equipment Info</div>
                  {selectedClientCoach.equipment&&<div style={{fontSize:"0.76rem",color:G.text,marginBottom:6}}><span style={{color:G.textSoft,fontWeight:600}}>Equipment: </span>{selectedClientCoach.equipment}</div>}
                  {selectedClientCoach.injury&&selectedClientCoach.injury!=="none"&&<div style={{fontSize:"0.76rem",color:G.text,marginBottom:6}}><span style={{color:G.red,fontWeight:600}}>Injury: </span>{selectedClientCoach.injury}</div>}
                  {selectedClientCoach.medical&&selectedClientCoach.medical!=="none"&&<div style={{fontSize:"0.76rem",color:G.text}}><span style={{color:G.mangoDeep,fontWeight:600}}>Medical: </span>{selectedClientCoach.medical}</div>}
                </div>
              )}

              {/* Body stats for coach */}
              {(()=>{
                const clientBS=bodyStats[selectedClientCoach.id]||[];
                const lastBS=clientBS.length>0?clientBS[clientBS.length-1]:null;
                if(!lastBS) return null;
                return(
                  <div style={card}>
                    <div style={lbl}>📏 Latest Body Stats — {fmtDate(lastBS.date)}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                      {[{l:"Arms",f:"arms",u:'"'},{l:"Chest",f:"chest",u:'"'},{l:"Waist",f:"waist",u:'"'},{l:"Hips",f:"hips",u:'"'},{l:"Thighs",f:"thighs",u:'"'}].map((m,i)=>lastBS[m.f]?(<div key={i} style={{textAlign:"center",padding:"6px",background:G.creamDark,borderRadius:8}}><div style={{fontSize:"0.9rem",fontWeight:900,color:G.green}}>{lastBS[m.f]}{m.u}</div><div style={{fontSize:"0.55rem",color:G.textSoft}}>{m.l}</div></div>):null)}
                    </div>
                    <div style={{borderTop:`1px solid ${G.border}`,paddingTop:8}}>
                      <div style={{fontSize:"0.68rem",fontWeight:700,color:G.brown,marginBottom:6}}>Health Metrics</div>
                      <div style={{display:"flex",flexDirection:"column",gap:4}}>
                        {[{l:"🩸 Blood Sugar",f:"bloodSugar",u:" mg/dL"},{l:"💊 Cholesterol",f:"cholesterol",u:" mg/dL"},{l:"❤️ Blood Pressure",f:"bloodPressure",u:""},{l:"👟 Steps",f:"steps",u:" steps"},{l:"💓 Heart Rate",f:"heartRate",u:" bpm"},{l:"😴 Sleep",f:"sleep",u:" hrs"}].map((m,i)=>lastBS[m.f]?(<div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:"0.7rem"}}><span style={{color:G.textSoft}}>{m.l}</span><span style={{fontWeight:700,color:G.green}}>{lastBS[m.f]}{m.u}</span></div>):null)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Schedule info */}
              {selectedClientCoach.workoutDays?.length>0&&(
                <div style={card}>
                  <div style={lbl}>📅 Workout Schedule</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    <div style={{fontSize:"0.74rem",color:G.text}}><span style={{color:G.textSoft,fontWeight:600}}>Workout days: </span>{selectedClientCoach.workoutDays?.join(", ")||"Not set"}</div>
                    <div style={{fontSize:"0.74rem",color:G.text}}><span style={{color:G.textSoft,fontWeight:600}}>Preferred time: </span>{selectedClientCoach.workoutTime||"Not set"}</div>
                    {selectedClientCoach.quickMoveDays?.length>0&&<div style={{fontSize:"0.74rem",color:G.text}}><span style={{color:G.textSoft,fontWeight:600}}>Quick Move days: </span>{selectedClientCoach.quickMoveDays.join(", ")}</div>}
                    {selectedClientCoach.longRunDay&&<div style={{fontSize:"0.74rem",color:G.text}}><span style={{color:G.mangoDeep,fontWeight:600}}>Long run day: </span>{selectedClientCoach.longRunDay}</div>}
                  </div>
                </div>
              )}

              {/* Reset passcode */}
              <div style={card}>
                <div style={lbl}>🔑 Passcode Reset</div>
                <div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>If {selectedClientCoach.name.split(" ")[0]} forgot their passcode, generate a temporary one and text or email it to them.</div>
                {tempPasscode[selectedClientCoach.id]&&(
                  <div style={{padding:"10px 14px",background:"#d8f3dc",borderRadius:10,textAlign:"center",marginBottom:8}}>
                    <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:3}}>Temporary passcode:</div>
                    <div style={{fontSize:"1.4rem",fontWeight:900,color:G.green,letterSpacing:4,fontFamily:"monospace"}}>{tempPasscode[selectedClientCoach.id]}</div>
                    <div style={{fontSize:"0.64rem",color:G.textSoft,marginTop:3}}>Share this with {selectedClientCoach.name.split(" ")[0]} — they can log in with this code</div>
                  </div>
                )}
                <button onClick={()=>generateTempPasscode(selectedClientCoach.id)} style={{...btnGreen,padding:"9px",fontSize:"0.78rem"}}>
                  {tempPasscode[selectedClientCoach.id]?"↻ Generate New Temp Code":"🔑 Generate Temp Passcode"}
                </button>
              </div>
              <div style={{...card,border:`1.5px solid ${selectedClientCoach.active===false?G.red:G.greenMid}`}}>
                <div style={lbl}>Client Status</div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:selectedClientCoach.active===false?G.red:G.green}}>{selectedClientCoach.active===false?"⛔ Inactive":"✅ Active"}</div>
                    <div style={{fontSize:"0.66rem",color:G.textSoft,marginTop:2}}>{selectedClientCoach.active===false?"Client cannot log in — hidden from login screen":"Client can log in and access the app"}</div>
                  </div>
                  <button onClick={()=>{
                    const updated=clients.map(c=>c.id===selectedClientCoach.id?{...c,active:selectedClientCoach.active===false?true:false}:c);
                    persist(updated,null,null,null,null,null,null,null);
                    setSelectedClientCoach({...selectedClientCoach,active:selectedClientCoach.active===false?true:false});
                  }} style={{padding:"8px 14px",borderRadius:10,border:"none",background:selectedClientCoach.active===false?`linear-gradient(135deg,${G.green},${G.greenMid})`:`linear-gradient(135deg,${G.red},#ef4444)`,color:G.white,fontSize:"0.74rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {selectedClientCoach.active===false?"Reactivate":"Deactivate"}
                  </button>
                </div>
                <div style={{fontSize:"0.64rem",color:G.textSoft,fontStyle:"italic"}}>💡 When you add payments — deactivated clients won't be charged.</div>
              </div>    
            </div>
          );
        })()}

        {/* ── HEALTH BOARD ── */}
        {coachTab==="healthboard"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>📊 Health Board</div>
            <div style={{fontSize:"0.7rem",color:G.textSoft,marginTop:-6}}>Tap any colored box to see why. Tap a client row to view their profile.</div>

            {/* Summary cards */}
            {(()=>{
              const active=clients.filter(c=>c.active!==false);
              const allGreen=active.filter(c=>getOverallStatus(c.id)==="#4ade80").length;
              const needAttn=active.filter(c=>getOverallStatus(c.id)==="#facc15").length;
              const followUp=active.filter(c=>getOverallStatus(c.id)==="#f87171").length;
              const noContact=active.filter(c=>getOverallStatus(c.id)===CYAN).length;
              return(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6}}>
                  {[{l:"On Track",v:allGreen,c:"#4ade80",icon:"✅"},{l:"Attention",v:needAttn,c:"#facc15",icon:"⚠️"},{l:"Follow Up",v:followUp,c:"#f87171",icon:"🚨"},{l:"No Contact",v:noContact,c:CYAN,icon:"💬"}].map((s,i)=>(
                    <div key={i} style={{...card,textAlign:"center",padding:"8px 4px",border:`1.5px solid ${s.c}44`,background:`${s.c}11`}}>
                      <div style={{fontSize:"1.1rem",fontWeight:900,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:"0.54rem",color:G.textSoft}}>{s.icon} {s.l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Legend */}
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              {[{c:"#4ade80",l:"On track"},{c:"#facc15",l:"Needs attention"},{c:"#f87171",l:"Follow up"},{c:CYAN,l:"No data/contact"}].map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                  <div style={{width:10,height:10,borderRadius:2,background:s.c,flexShrink:0}}/>
                  <span style={{fontSize:"0.6rem",color:G.textSoft}}>{s.l}</span>
                </div>
              ))}
            </div>

            {/* Table header */}
            <div style={{background:G.creamDark,borderRadius:10,padding:"7px 10px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 0.6fr 0.7fr 0.7fr 0.6fr",gap:4,alignItems:"center"}}>
                {["Client","Login","Weight","Nutrition","Workout","Msgs"].map((h,i)=>(
                  <div key={i} style={{fontSize:"0.56rem",fontWeight:700,color:G.textSoft,textTransform:"uppercase",letterSpacing:0.5,textAlign:i===0?"left":"center"}}>{h}</div>
                ))}
              </div>
            </div>

            {/* Client rows — active only */}
            {clients.filter(c=>c.active!==false).map(client=>{
              const overall=getOverallStatus(client.id);
              const login=getLoginStatus(client.id);
              const weight=getWeightStatus(client.id);
              const nutr=getNutritionStatus(client.id);
              const workout=getWorkoutStatus(client.id);
              const msgs=getMessageStatus(client.id);
              const rowBg=overall==="#4ade80"?"#f0faf4":overall==="#facc15"?"#fffbf0":overall==="#f87171"?"#fff5f5":"#f0feff";
              return(
                <div key={client.id} style={{...card,padding:"10px",border:`1.5px solid ${overall}55`,background:rowBg,cursor:"pointer"}}
                  onClick={()=>{setSelectedClientCoach(client);setCoachTab("clients");setFromHealthBoard(true);}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.5fr 0.6fr 0.6fr 0.7fr 0.7fr 0.6fr",gap:4,alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.64rem",fontWeight:700,color:G.white,flexShrink:0}}>{client.avatar}</div>
                      <div>
                        <div style={{fontSize:"0.72rem",fontWeight:700,color:G.text}}>{client.name.split(" ")[0]}</div>
                        <div style={{fontSize:"0.56rem",color:G.textSoft}}>{client.weight}lbs</div>
                      </div>
                    </div>
                    {[login,weight,nutr,workout,msgs].map((s,i)=>(
                      <div key={i} style={{display:"flex",justifyContent:"center"}}
                        onClick={e=>{
                          e.stopPropagation();
                          const rect=e.currentTarget.getBoundingClientRect();
                          setTooltip({visible:true,text:s.reason,x:rect.left,y:rect.top});
                          setTimeout(()=>setTooltip(t=>({...t,visible:false})),3500);
                        }}>
                        <div style={{width:26,height:26,borderRadius:6,background:s.color,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:`0 2px 6px ${s.color}55`,border:"1.5px solid rgba(255,255,255,0.4)"}}>
                          <span style={{fontSize:"0.65rem",color:s.color==="#facc15"?"#78350f":"#fff",fontWeight:900}}>{s.color==="#4ade80"?"✓":s.color==="#facc15"?"!":s.color==="#f87171"?"✕":"?"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Tooltip */}
            {tooltip.visible&&(
              <div style={{position:"fixed",top:Math.max(10,tooltip.y-70),left:Math.min(window.innerWidth-220,Math.max(10,tooltip.x-50)),background:"#1e293b",color:"#fff",padding:"9px 13px",borderRadius:10,fontSize:"0.72rem",maxWidth:210,zIndex:1000,boxShadow:"0 4px 20px rgba(0,0,0,.4)",lineHeight:1.5,pointerEvents:"none"}}>
                {tooltip.text}
              </div>
            )}
          </div>
        )}

{coachTab==="passcodes"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:11}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>🔑 Passcodes & Access</div>

            {/* Invite Code */}
            <div style={{...card,border:`2px solid ${G.mangoDeep}44`,background:"#fff9f0"}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:G.mangoDeep,marginBottom:4}}>🔐 Client Invite Code</div>
              <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>Share this code with new clients so they can self-register. Change it anytime to control who can join.</div>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:G.creamDark,borderRadius:9,marginBottom:10}}>
                <span style={{fontSize:"0.7rem",color:G.textSoft}}>Current code:</span>
                <span style={{fontSize:"1rem",fontWeight:900,color:G.mangoDeep,fontFamily:"monospace",letterSpacing:2}}>{inviteCode}</span>
              </div>
              <div style={{display:"flex",gap:7}}>
                <input value={editInviteCode} onChange={e=>setEditInviteCode(e.target.value)} placeholder="New invite code..." style={{...iStyle,flex:1}}/>
                <button onClick={()=>{
                  if(!editInviteCode.trim()) return;
                  setInviteCode(editInviteCode.trim());
                  sbSetGlobal("atp-invitecode",editInviteCode.trim());
                  setEditInviteCode("");
                }} disabled={!editInviteCode.trim()} style={{padding:"9px 13px",borderRadius:9,border:"none",background:editInviteCode.trim()?G.mangoDeep:"#ccc",color:G.white,fontSize:"0.74rem",fontWeight:700,cursor:editInviteCode.trim()?"pointer":"not-allowed"}}>Update</button>
              </div>
            </div>

            {/* Client Passcodes */}
            <div style={{fontSize:"0.72rem",fontWeight:700,color:G.textSoft,marginTop:4}}>CLIENT PASSCODES</div>
            {clients.map(client=>(<div key={client.id} style={card}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.75rem",fontWeight:700,color:G.white}}>{client.avatar}</div>
                <div style={{flex:1}}><div style={{fontSize:"0.82rem",fontWeight:700,color:G.text}}>{client.name}</div>{client.email&&<div style={{fontSize:"0.62rem",color:G.textSoft}}>{client.email}</div>}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:G.creamDark,borderRadius:9,marginBottom:10}}>
                <span style={{fontSize:"0.7rem",color:G.textSoft}}>Passcode:</span>
                <span style={{fontSize:"0.82rem",fontWeight:700,color:G.green,fontFamily:"monospace",flex:1}}>{showPasscodeReveal[client.id]?client.passcode:"••••••"}</span>
                <button onClick={()=>setShowPasscodeReveal(p=>({...p,[client.id]:!p[client.id]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:"0.9rem",color:G.textSoft}}>{showPasscodeReveal[client.id]?"🙈":"👁️"}</button>
              </div>
              <div style={{display:"flex",gap:7}}><input value={editPasscode[client.id]||""} onChange={e=>setEditPasscode(p=>({...p,[client.id]:e.target.value}))} placeholder="New passcode..." style={{...iStyle,flex:1}}/><button onClick={()=>updateClientPasscode(client.id,editPasscode[client.id]||"")} disabled={!editPasscode[client.id]?.trim()} style={{padding:"9px 13px",borderRadius:9,border:"none",background:editPasscode[client.id]?.trim()?G.green:"#ccc",color:G.white,fontSize:"0.74rem",fontWeight:700,cursor:editPasscode[client.id]?.trim()?"pointer":"not-allowed"}}>Update</button></div>
            </div>))}
          </div>
        )}

      {coachTab==="messages"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>💌 Messages</div>
            {clients.map(client=>{
              const allMsgs=messages[client.id]||[];
              const clientMsgsIn=allMsgs.filter(m=>m.from==="client");
              const coachMsgsOut=allMsgs.filter(m=>m.from==="coach");
              const hasUnread=clientMsgsIn.length>0&&(coachMsgsOut.length===0||new Date(clientMsgsIn[clientMsgsIn.length-1].ts)>new Date(coachMsgsOut[coachMsgsOut.length-1].ts));
              return(<div key={client.id} style={{...card,border:`1.5px solid ${hasUnread?G.mangoDeep:G.border}`,background:hasUnread?"#fff9f0":G.white}}>
                <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:9}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${G.greenMid},${G.green})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700,color:G.white}}>{client.avatar}</div>
                  <div style={{flex:1}}><div style={{fontSize:"0.8rem",fontWeight:700,color:G.text}}>{client.name}</div></div>
                  {hasUnread&&<div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:"#fff3e0",color:G.mangoDeep,fontWeight:700}}>📩 Reply needed</div>}
                </div>
                {clientMsgsIn.length>0&&(
                  <div style={{marginBottom:10,background:"#fff9f0",borderRadius:10,padding:"8px 10px",border:`1px solid ${G.mango}44`}}>
                    <div style={{fontSize:"0.64rem",fontWeight:700,color:G.mangoDeep,marginBottom:6}}>From {client.name.split(" ")[0]}:</div>
                    {clientMsgsIn.slice(-2).map((m,i)=>(<div key={i} style={{marginBottom:i<clientMsgsIn.slice(-2).length-1?6:0,paddingBottom:i<clientMsgsIn.slice(-2).length-1?6:0,borderBottom:i<clientMsgsIn.slice(-2).length-1?`1px solid ${G.border}`:"none"}}>
                      <div style={{fontSize:"0.6rem",color:G.textSoft,marginBottom:2}}>{new Date(m.ts).toLocaleDateString()} {new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</div>
                      <div style={{fontSize:"0.74rem",color:G.text}}>{m.text}</div>
                    </div>))}
                  </div>
                )}
                <textarea value={msgDraft[client.id]||""} onChange={e=>setMsgDraft(p=>({...p,[client.id]:e.target.value}))} placeholder={hasUnread?`Reply to ${client.name.split(" ")[0]}...`:`Message ${client.name.split(" ")[0]}...`} rows={2} style={{...iStyle,resize:"none",marginBottom:7}}/>
                <button onClick={()=>sendCoachMessage(client.id,msgDraft[client.id]||"")} style={{...btnMango,padding:"9px",fontSize:"0.76rem"}}>✉️ Send</button>
              </div>);
            })}
          </div>
        )}  

        {coachTab==="resources"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>📚 Resources Manager</div>
            <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6}}>These resources are managed in your Google Sheet. Update the sheet and tap Refresh to see changes.</div>

            {/* Sub tabs */}
            <div style={{display:"flex",gap:6}}>
              {[{id:"recipes",label:"🥗 Recipes"},{id:"workouts",label:"💪 Workouts"},{id:"foods",label:"🍎 Food List"}].map(t=>(
                <button key={t.id} onClick={()=>setActiveSheetTab(t.id)} style={{flex:1,padding:"7px 4px",borderRadius:10,border:`2px solid ${activeSheetTab===t.id?G.mangoDeep:G.border}`,background:activeSheetTab===t.id?"#fff3e0":G.cream,color:activeSheetTab===t.id?G.mangoDeep:G.textSoft,fontSize:"0.66rem",fontWeight:activeSheetTab===t.id?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t.label}</button>
              ))}
            </div>

            {sheetLoading&&<div style={{...card,textAlign:"center",padding:"20px"}}><div style={{fontSize:"0.78rem",color:G.textSoft}}>✨ Loading resources...</div></div>}

            {/* Recipes */}
            {sheetLoaded&&activeSheetTab==="recipes"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:"0.7rem",color:G.textSoft}}>{sheetData.recipes.length} recipes in sheet</div>
                {sheetData.recipes.map((row,i)=>(
                  <div key={i} style={{...card,border:`1.5px solid ${G.greenLight}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:"#d8f3dc",color:G.green}}>{row[1]}</div>
                    </div>
                    <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:4}}>⏱ {row[2]} · P:{row[5]}g C:{row[6]}g F:{row[7]}g · {row[9]} kcal</div>
                    {row[3]&&<div style={{fontSize:"0.7rem",color:G.text}}><strong>Ingredients:</strong> {row[3]}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Workouts */}
            {sheetLoaded&&activeSheetTab==="workouts"&&(
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{fontSize:"0.7rem",color:G.textSoft}}>{sheetData.workouts.length} exercises in sheet</div>
                {sheetData.workouts.map((row,i)=>(
                  <div key={i} style={{...card,border:`1.5px solid ${G.greenLight}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:"#d8f3dc",color:G.green}}>{row[2]}</div>
                    </div>
                    <div style={{fontSize:"0.68rem",color:G.textSoft}}>{row[1]} · ⏱ {row[3]} · 🏋️ {row[4]}</div>
                    {row[6]&&<div style={{fontSize:"0.66rem",color:G.green,fontStyle:"italic",marginTop:3}}>💪 {row[6]}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Food List */}
            {sheetLoaded&&activeSheetTab==="foods"&&(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:"0.7rem",color:G.textSoft}}>{sheetData.foods.length} foods in sheet</div>
                <input value={foodSearch} onChange={e=>setFoodSearch(e.target.value)} placeholder="🔍 Search foods..." style={iStyle}/>
                {sheetData.foods.filter(row=>!foodSearch||row[0]?.toLowerCase().includes(foodSearch.toLowerCase())).map((row,i)=>(
                  <div key={i} style={{...card,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text}}>{row[0]}</div>
                      <div style={{fontSize:"0.62rem",color:G.textSoft}}>{row[1]}</div>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                      {row[2]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#4ade80"}}>{row[2]}g</span><span style={{color:G.textSoft}}> P</span></span>}
                      {row[3]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fb923c"}}>{row[3]}g</span><span style={{color:G.textSoft}}> C</span></span>}
                      {row[4]&&<span style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:"#fbbf24"}}>{row[4]}g</span><span style={{color:G.textSoft}}> F</span></span>}
                      {row[6]&&<span style={{fontSize:"0.65rem",color:G.brown,fontWeight:600}}>{row[6]} kcal</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sheetLoaded&&<button onClick={()=>{setSheetLoaded(false);fetchSheets();}} style={{...btnMango,fontSize:"0.74rem",padding:"10px"}}>↻ Refresh from Google Sheet</button>}
          </div>
        )}

        {coachTab==="add"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
            <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>Add New Client</div>
            {[{label:"Full Name",field:"name",placeholder:"e.g. Sharon Johnson",type:"text"},{label:"Age",field:"age",placeholder:"e.g. 48",type:"number"},{label:"Current Weight (lbs)",field:"weight",placeholder:"e.g. 172",type:"number"},{label:"Goal Weight (lbs)",field:"goalWeight",placeholder:"e.g. 150",type:"number"},{label:"Wellness Goal",field:"goal",placeholder:"e.g. Lose weight, reduce stress...",type:"text"},{label:"Activity Preferences",field:"likes",placeholder:"e.g. Walking, yoga, swimming...",type:"text"}].map(f=>(<div key={f.field} style={card}><div style={lbl}>{f.label}</div><input type={f.type} value={onboard[f.field]||""} onChange={e=>setOnboard(p=>({...p,[f.field]:e.target.value}))} placeholder={f.placeholder} style={iStyle}/></div>))}
            <div style={card}><div style={lbl}>Fitness Level</div><div style={{display:"flex",gap:7}}>{["Beginner","Intermediate","Advanced"].map(l=><button key={l} onClick={()=>setOnboard(p=>({...p,level:l}))} style={{flex:1,padding:"8px 0",borderRadius:10,border:`2px solid ${onboard.level===l?G.greenMid:G.border}`,background:onboard.level===l?"#d8f3dc":G.cream,color:onboard.level===l?G.green:G.textSoft,fontSize:"0.7rem",fontWeight:onboard.level===l?700:400,cursor:"pointer",fontFamily:"inherit"}}>{l}</button>)}</div></div>
            <div style={{...card,border:`2px solid ${G.green}`}}><div style={lbl}>🔑 Passcode (required)</div><input value={onboard.passcode||""} onChange={e=>setOnboard(p=>({...p,passcode:e.target.value}))} placeholder="e.g. sharon2026" style={iStyle}/></div>
            <button onClick={addNewClient} disabled={!onboard.name||!onboard.weight||!onboard.passcode} style={{...btnGreen,opacity:onboard.name&&onboard.weight&&onboard.passcode?1:0.5}}>➕ Add Client</button>
          </div>
        )}
      </div>
    );
  }
  return null;
}
