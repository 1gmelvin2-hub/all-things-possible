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
const FAVORITES_KEY  = "atp-favorites";
const GFIT_KEY       = "atp-googlefit";
const GYM_KEY        = "atp-gym";
const GYM_STARTS_KEY = "atp-gymstarts";
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
    const body = JSON.stringify({client_id:"__global__", data_key: key, data_value: value, updated_at: new Date().toISOString()});
    const headers = {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    };
    // Use PUT-style upsert which Safari handles better than PATCH
   const res = await fetch(`${SUPABASE_URL}/rest/v1/atp_data`, {
      method: "POST",
      headers,
      body
    });
    if(!res.ok){
      await fetch(`${SUPABASE_URL}/rest/v1/atp_data?client_id=eq.__global__&data_key=eq.${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: {"apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal"},
        body: JSON.stringify({data_value: value, updated_at: new Date().toISOString()})
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

function RunningTab({currentClient,G,card,iStyle,btnGreen,btnMango,lbl,todayStr,fmtDate,sbSetGlobal}){
  const RUNNING_KEY="atp-running";
  const PLANS={
    "c25k":{
      name:"Couch to 5K",icon:"🏃",weeks:9,goal:"5K (3.1 miles)",
      desc:"Go from couch to running 5K in 9 weeks",color:"#10b981",
      schedule:[
        {week:1,intervals:[{run:1,walk:2,repeat:6}],totalMin:23},
        {week:2,intervals:[{run:2,walk:2,repeat:5}],totalMin:24},
        {week:3,intervals:[{run:3,walk:2,repeat:4}],totalMin:24},
        {week:4,intervals:[{run:5,walk:2,repeat:3}],totalMin:26},
        {week:5,intervals:[{run:8,walk:2,repeat:2},{run:5,walk:0,repeat:1}],totalMin:28},
        {week:6,intervals:[{run:12,walk:2,repeat:2}],totalMin:32},
        {week:7,intervals:[{run:20,walk:0,repeat:1}],totalMin:30},
        {week:8,intervals:[{run:25,walk:0,repeat:1}],totalMin:35},
        {week:9,intervals:[{run:30,walk:0,repeat:1}],totalMin:40},
      ]
    },
    "5kto10k":{
      name:"5K to 10K",icon:"🏃",weeks:8,goal:"10K (6.2 miles)",
      desc:"Build from 5K to 10K in 8 weeks",color:"#3b82f6",
      schedule:[
        {week:1,intervals:[{run:5,walk:1,repeat:4}],totalMin:28},
        {week:2,intervals:[{run:8,walk:1,repeat:3}],totalMin:29},
        {week:3,intervals:[{run:10,walk:1,repeat:3}],totalMin:35},
        {week:4,intervals:[{run:15,walk:1,repeat:2}],totalMin:34},
        {week:5,intervals:[{run:20,walk:1,repeat:2}],totalMin:44},
        {week:6,intervals:[{run:25,walk:0,repeat:1},{run:10,walk:1,repeat:1}],totalMin:38},
        {week:7,intervals:[{run:35,walk:0,repeat:1}],totalMin:45},
        {week:8,intervals:[{run:50,walk:0,repeat:1}],totalMin:60},
      ]
    },
    "half":{
      name:"Half Marathon",icon:"🏅",weeks:12,goal:"Half Marathon (13.1 miles)",
      desc:"Train for your first half marathon in 12 weeks",color:"#8b5cf6",
      schedule:[
        {week:1,intervals:[{run:20,walk:0,repeat:1}],totalMin:30},
        {week:2,intervals:[{run:25,walk:0,repeat:1}],totalMin:35},
        {week:3,intervals:[{run:30,walk:0,repeat:1}],totalMin:40},
        {week:4,intervals:[{run:35,walk:0,repeat:1}],totalMin:45},
        {week:5,intervals:[{run:40,walk:0,repeat:1}],totalMin:50},
        {week:6,intervals:[{run:45,walk:0,repeat:1}],totalMin:55},
        {week:7,intervals:[{run:50,walk:0,repeat:1}],totalMin:60},
        {week:8,intervals:[{run:55,walk:0,repeat:1}],totalMin:65},
        {week:9,intervals:[{run:60,walk:0,repeat:1}],totalMin:70},
        {week:10,intervals:[{run:70,walk:0,repeat:1}],totalMin:80},
        {week:11,intervals:[{run:45,walk:0,repeat:1}],totalMin:55},
        {week:12,intervals:[{run:30,walk:0,repeat:1}],totalMin:40},
      ]
    },
    "full":{
      name:"Full Marathon",icon:"🏆",weeks:16,goal:"Full Marathon (26.2 miles)",
      desc:"Train for the ultimate distance in 16 weeks",color:"#f59e0b",
      schedule:[
        {week:1,intervals:[{run:25,walk:0,repeat:1}],totalMin:35},
        {week:2,intervals:[{run:30,walk:0,repeat:1}],totalMin:40},
        {week:3,intervals:[{run:35,walk:0,repeat:1}],totalMin:45},
        {week:4,intervals:[{run:40,walk:0,repeat:1}],totalMin:50},
        {week:5,intervals:[{run:45,walk:0,repeat:1}],totalMin:55},
        {week:6,intervals:[{run:50,walk:0,repeat:1}],totalMin:60},
        {week:7,intervals:[{run:55,walk:0,repeat:1}],totalMin:65},
        {week:8,intervals:[{run:60,walk:0,repeat:1}],totalMin:70},
        {week:9,intervals:[{run:70,walk:0,repeat:1}],totalMin:80},
        {week:10,intervals:[{run:80,walk:0,repeat:1}],totalMin:90},
        {week:11,intervals:[{run:90,walk:0,repeat:1}],totalMin:100},
        {week:12,intervals:[{run:100,walk:0,repeat:1}],totalMin:110},
        {week:13,intervals:[{run:110,walk:0,repeat:1}],totalMin:120},
        {week:14,intervals:[{run:90,walk:0,repeat:1}],totalMin:100},
        {week:15,intervals:[{run:60,walk:0,repeat:1}],totalMin:70},
        {week:16,intervals:[{run:30,walk:0,repeat:1}],totalMin:40},
      ]
    },
  };

  const [runPhase,setRunPhase]=useState(()=>{
    try{ const s=localStorage.getItem(RUNNING_KEY+"_plan"); return s?"session":"setup"; }catch(e){ return "setup"; }
  });
  const [selectedPlan,setSelectedPlan]=useState(()=>{
    try{ return localStorage.getItem(RUNNING_KEY+"_plan")||""; }catch(e){ return ""; }
  });
  const [runHistory,setRunHistory]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem(RUNNING_KEY)||"[]"); }catch(e){ return []; }
  });
  const [activePhase,setActivePhase]=useState("setup");
  const [currentIntervalIdx,setCurrentIntervalIdx]=useState(0);
  const [currentRepeat,setCurrentRepeat]=useState(0);
  const [isRunning,setIsRunning]=useState(true);
  const [timerSec,setTimerSec]=useState(0);
  const [timerActive,setTimerActive]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [runRating,setRunRating]=useState(null);
  const [warmupDone,setWarmupDone]=useState(false);
  const [cooldownActive,setCooldownActive]=useState(false);
  const [runPhoto,setRunPhoto]=useState(null);
  const [analyzingRunPhoto,setAnalyzingRunPhoto]=useState(false);
  const [runPhotoData,setRunPhotoData]=useState(null);
  const runPhotoRef=useRef(null);
  const timerRef=useRef(null);
  const API_KEY=import.meta.env.VITE_API_KEY||"";

  async function analyzeRunPhoto(file){
    setAnalyzingRunPhoto(true);
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
            max_tokens:800,
            messages:[{role:"user",content:[
              {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
              {type:"text",text:`This is a running workout screenshot from a fitness tracker or GPS watch. Extract all visible data. Return ONLY valid JSON, no markdown:
{"distanceMiles":3.1,"distanceKm":5.0,"durationMin":32,"avgPaceMinPerMile":"10:20","bestPaceMinPerMile":"9:45","peakBpm":172,"avgBpm":155,"calories":380,"elevationFt":120,"zones":{"zone1":{"pct":5},"zone2":{"pct":15},"zone3":{"pct":35},"zone4":{"pct":35},"zone5":{"pct":10}},"splits":[{"mile":1,"pace":"10:30"},{"mile":2,"pace":"10:15"},{"mile":3,"pace":"10:05"}]}
Set any field not visible to null. For splits include as many as visible.`}
            ]}]
          })
        });
        const data=await res.json();
        const raw=data.content?.[0]?.text||"{}";
        const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
        setRunPhotoData(parsed);
        setAnalyzingRunPhoto(false);
      };
      reader.readAsDataURL(file);
    }catch(e){console.error(e);setAnalyzingRunPhoto(false);}
  }

  function getCurrentWeek(){
    try{
      const prog=JSON.parse(localStorage.getItem("atp-program")||"{}");
      return prog[currentClient.id]?.currentWeek||1;
    }catch(e){ return 1; }
  }

  function getPlanWeek(planKey){
    // Auto-detect week based on run history
    const planRuns=runHistory.filter(r=>r.plan===planKey);
    const plan=PLANS[planKey];
    if(!plan) return 1;
    const weekNum=Math.min(plan.weeks, Math.floor(planRuns.length/3)+1);
    return weekNum;
  }

  useEffect(()=>{
    if(timerActive&&timerSec>0){
      // Ping at 3,2,1
      if(timerSec<=3){
        try{
          const ctx=new(window.AudioContext||window.webkitAudioContext)();
          const osc=ctx.createOscillator();
          const gain=ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(440,ctx.currentTime);
          gain.gain.setValueAtTime(0.2,ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.1);
        }catch(e){}
      }
      timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000);
    } else if(timerActive&&timerSec===0){
      advanceRun();
    }
    return()=>clearTimeout(timerRef.current);
  },[timerActive,timerSec]);

  function buildSession(planKey){
    const plan=PLANS[planKey];
    const weekNum=getPlanWeek(planKey);
    const weekPlan=plan.schedule[weekNum-1];
    if(!weekPlan) return null;

    // Build full interval list
    const intervals=[];
    weekPlan.intervals.forEach(interval=>{
      for(let r=0;r<interval.repeat;r++){
        if(interval.run>0) intervals.push({type:"run",duration:interval.run*60,label:`Run ${interval.run} min`});
        if(interval.walk>0) intervals.push({type:"walk",duration:interval.walk*60,label:`Walk ${interval.walk} min`});
      }
    });

    return{
      plan:planKey,
      planName:plan.name,
      weekNum,
      totalWeeks:plan.weeks,
      goal:plan.goal,
      color:plan.color,
      warmup:{duration:5*60,label:"Warm-up Walk"},
      intervals,
      cooldown:{duration:5*60,label:"Cool-down Walk"},
      totalMin:weekPlan.totalMin+10,
    };
  }

  const [currentSession,setCurrentSession]=useState(null);

  function startRun(planKey){
    const session=buildSession(planKey);
    if(!session) return;
    setCurrentSession(session);
    setActivePhase("preview");
  }

  function beginSession(){
    setActivePhase("active");
    setWarmupDone(false);
    setCooldownActive(false);
    setCurrentIntervalIdx(0);
    setCurrentRepeat(0);
    setSessionComplete(false);
    setRunRating(null);
    // Start with warmup
    setIsRunning(false);
    setTimerSec(5*60);
    setTimerActive(true);
  }

  function advanceRun(){
    if(!currentSession) return;

    // Play end sound
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880,ctx.currentTime);
      osc.frequency.setValueAtTime(660,ctx.currentTime+0.15);
      gain.gain.setValueAtTime(0.4,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.5);
    }catch(e){}

    if(!warmupDone){
      // Warmup done — start intervals
      setWarmupDone(true);
      const first=currentSession.intervals[0];
      setIsRunning(first.type==="run");
      setCurrentIntervalIdx(0);
      setTimerSec(first.duration);
      return;
    }

    if(cooldownActive){
      // Cooldown done — session complete!
      setSessionComplete(true);
      setTimerActive(false);
      return;
    }

    const nextIdx=currentIntervalIdx+1;
    if(nextIdx>=currentSession.intervals.length){
      // All intervals done — start cooldown
      setCooldownActive(true);
      setIsRunning(false);
      setTimerSec(5*60);
      return;
    }

    const next=currentSession.intervals[nextIdx];
    setCurrentIntervalIdx(nextIdx);
    setIsRunning(next.type==="run");
    setTimerSec(next.duration);
  }

  async function saveRun(rating,photoData=null){
    const entry={
      date:todayStr(),
      plan:currentSession.plan,
      planName:currentSession.planName,
      weekNum:currentSession.weekNum,
      totalMin:currentSession.totalMin,
      rating,
      distanceMiles:photoData?.distanceMiles||null,
      avgPace:photoData?.avgPaceMinPerMile||null,
      peakBpm:photoData?.peakBpm||null,
      calories:photoData?.calories||null,
      zones:photoData?.zones||null,
      splits:photoData?.splits||null,
      clientId:currentClient.id,
      ts:new Date().toISOString(),
    };
    const newHistory=[...runHistory,entry];
    setRunHistory(newHistory);
    try{
      localStorage.setItem(RUNNING_KEY,JSON.stringify(newHistory));
      await sbSetGlobal("atp-running-"+currentClient.id, newHistory);
    }catch(e){}
    setRunRating(rating);
    try{logWeeklySession("run");}catch{}
  }

  const plan=selectedPlan?PLANS[selectedPlan]:null;
  const planWeek=selectedPlan?getPlanWeek(selectedPlan):1;
  const progressPct=currentSession?Math.round((currentIntervalIdx/currentSession.intervals.length)*100):0;
  const activeInterval=currentSession?.intervals[currentIntervalIdx];

  // PLAN SELECTION
  if(activePhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#064e3b,#10b981)`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🏃 Running</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Choose Your Plan</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>From first steps to full marathon — your faith-powered running journey starts here!</div>
      </div>

      {Object.entries(PLANS).map(([key,p])=>{
        const weekNum=getPlanWeek(key);
        const runs=runHistory.filter(r=>r.plan===key);
        const isActive=selectedPlan===key;
        return(
          <button key={key} onClick={()=>{setSelectedPlan(key);try{localStorage.setItem(RUNNING_KEY+"_plan",key);}catch(e){}}} style={{...card,cursor:"pointer",textAlign:"left",width:"100%",border:`2px solid ${isActive?p.color:G.border}`,background:isActive?p.color+"11":"#fff"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:48,height:48,borderRadius:"50%",background:p.color+"22",border:`2px solid ${p.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem",flexShrink:0}}>{p.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:isActive?p.color:G.text}}>{p.name}</div>
                <div style={{fontSize:"0.68rem",color:G.textSoft}}>{p.goal}</div>
              </div>
              {isActive&&<div style={{fontSize:"0.68rem",padding:"3px 9px",borderRadius:20,background:p.color,color:"#fff",fontWeight:700}}>Active</div>}
            </div>
            <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:8}}>{p.desc}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{flex:1,height:5,background:G.creamDark,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.round((weekNum/p.weeks)*100)}%`,background:p.color,borderRadius:3}}/>
              </div>
              <div style={{fontSize:"0.66rem",color:p.color,fontWeight:700}}>Week {weekNum}/{p.weeks}</div>
            </div>
            {runs.length>0&&<div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>{runs.length} runs completed</div>}
          </button>
        );
      })}

     {selectedPlan&&(
        <button onClick={()=>startRun(selectedPlan)} style={{...btnGreen,background:`linear-gradient(135deg,#064e3b,#10b981)`,boxShadow:"0 4px 14px rgba(16,185,129,.3)"}}>
          🏃 Week {planWeek} Run → Go!
        </button>
      )} 
    </div>
  );

  // PREVIEW
  if(activePhase==="preview"&&currentSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#064e3b,#10b981)`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🏃 {currentSession.planName}</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Week {currentSession.weekNum} of {currentSession.totalWeeks}</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>{currentSession.totalMin} min total · {currentSession.intervals.length} intervals</div>
      </div>

      {/* Warmup */}
      <div style={{...card,borderLeft:`4px solid #60a5fa`}}>
        <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text,marginBottom:4}}>🚶 Warm-up Walk</div>
        <div style={{fontSize:"0.7rem",color:G.textSoft}}>5 minutes easy walking to prepare your body</div>
      </div>

      {/* Intervals */}
      <div style={card}>
        <div style={lbl}>Today's Intervals</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {currentSession.intervals.map((interval,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:interval.type==="run"?currentSession.color+"11":"#dbeafe",borderRadius:8,borderLeft:`3px solid ${interval.type==="run"?currentSession.color:"#60a5fa"}`}}>
              <span style={{fontSize:"1rem"}}>{interval.type==="run"?"🏃":"🚶"}</span>
              <span style={{fontSize:"0.76rem",fontWeight:600,color:interval.type==="run"?currentSession.color:"#3b82f6"}}>{interval.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cooldown */}
      <div style={{...card,borderLeft:`4px solid #60a5fa`}}>
        <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text,marginBottom:4}}>🚶 Cool-down Walk</div>
        <div style={{fontSize:"0.7rem",color:G.textSoft}}>5 minutes easy walking to recover</div>
      </div>

      <button onClick={beginSession} style={{...btnGreen,background:`linear-gradient(135deg,#064e3b,#10b981)`,boxShadow:"0 4px 14px rgba(16,185,129,.3)"}}>▶ Start Run</button>
      <button onClick={()=>setActivePhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Plan</button>
    </div>
  );

  // ACTIVE RUN
  if(activePhase==="active"&&currentSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRunning?"#f0fdf4":"#eff6ff"}}>
      {/* Progress bar */}
      <div style={{height:6,background:"#d1fae5"}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:`linear-gradient(90deg,#064e3b,#10b981)`,transition:"width .5s"}}/>
      </div>

      {sessionComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#10b981",textAlign:"center"}}>Run Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! Week {currentSession.weekNum} done. You are getting closer to your {currentSession.goal} goal! All things are possible! 🙏</div>
         {!runRating?(
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
              {/* Running photo upload */}
              <div style={{background:"#f0fdf4",border:"1px solid #6ee7b7",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,color:"#059669",marginBottom:4}}>🏃 Log Run Data (optional)</div>
                <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:8,lineHeight:1.6}}>Upload your watch screenshot — AI reads distance, pace, BPM and splits!</div>
                {!runPhotoData&&(
                  <button onClick={()=>runPhotoRef.current?.click()} style={{width:"100%",padding:"10px",borderRadius:10,border:"2px dashed #6ee7b7",background:"#ecfdf5",color:"#059669",fontSize:"0.76rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                    {analyzingRunPhoto?"✨ Reading your run data...":"📸 Upload Watch Screenshot"}
                  </button>
                )}
                <input ref={runPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setRunPhoto(URL.createObjectURL(f));analyzeRunPhoto(f);}}}/>
                {runPhotoData&&(
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                      <div style={{fontSize:"0.7rem",fontWeight:700,color:"#059669"}}>✅ Run data extracted!</div>
                      <button onClick={()=>{setRunPhotoData(null);setRunPhoto(null);}} style={{fontSize:"0.62rem",color:G.textSoft,background:"none",border:"none",cursor:"pointer"}}>✕</button>
                    </div>
                    {/* Key stats grid */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                      {[
                        {l:"Distance",v:runPhotoData.distanceMiles?`${runPhotoData.distanceMiles} mi`:runPhotoData.distanceKm?`${runPhotoData.distanceKm} km`:null,c:"#059669"},
                        {l:"Avg Pace",v:runPhotoData.avgPaceMinPerMile?`${runPhotoData.avgPaceMinPerMile}/mi`:null,c:"#10b981"},
                        {l:"Duration",v:runPhotoData.durationMin?`${runPhotoData.durationMin}m`:null,c:"#7c3aed"},
                        {l:"Peak BPM",v:runPhotoData.peakBpm,c:"#dc2626"},
                        {l:"Calories",v:runPhotoData.calories,c:G.mangoDeep},
                        {l:"Elevation",v:runPhotoData.elevationFt?`${runPhotoData.elevationFt}ft`:null,c:"#6b7280"},
                      ].filter(x=>x.v).map((x,i)=>(
                        <div key={i} style={{textAlign:"center",padding:"7px 4px",background:"#ecfdf5",borderRadius:8,border:"1px solid #6ee7b7"}}>
                          <div style={{fontSize:"0.88rem",fontWeight:900,color:x.c}}>{x.v}</div>
                          <div style={{fontSize:"0.54rem",color:G.textSoft}}>{x.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Zone bar */}
                    {runPhotoData.zones&&(
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:"0.62rem",color:G.textSoft,marginBottom:4}}>Heart Rate Zones</div>
                        <div style={{display:"flex",gap:2,height:8,borderRadius:4,overflow:"hidden"}}>
                          {Object.entries(runPhotoData.zones).map(([k,z],i)=>{
                            const colors=["#6b7280","#60a5fa","#10b981","#f59e0b","#dc2626"];
                            return z?.pct>0?(<div key={k} style={{flex:z.pct,background:colors[i]}}/>):null;
                          })}
                        </div>
                      </div>
                    )}
                    {/* Splits */}
                    {runPhotoData.splits&&runPhotoData.splits.length>0&&(
                      <div>
                        <div style={{fontSize:"0.62rem",color:G.textSoft,marginBottom:4}}>Mile Splits</div>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {runPhotoData.splits.map((s,i)=>(
                            <div key={i} style={{padding:"4px 8px",borderRadius:6,background:"#d1fae5",fontSize:"0.64rem",fontWeight:700,color:"#059669"}}>
                              Mi {s.mile}: {s.pace}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your run?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(r=>(
                  <button key={r} onClick={()=>saveRun(r,runPhotoData)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${runRating===r?"#10b981":G.border}`,background:runRating===r?"#d1fae5":G.cream,color:runRating===r?"#10b981":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          ):(
            <div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:12}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:"#10b981"}}>Run saved! {runRating<=2?"Next week we'll push harder! 💪":runRating===3?"Perfect pace! 🌟":"Great effort — keep going! 🙏"}</div>
              <button onClick={()=>{setActivePhase("setup");setSessionComplete(false);setCurrentSession(null);}} style={{...btnGreen,background:"linear-gradient(135deg,#064e3b,#10b981)"}}>🏃 Back to Plans</button>
            </div>
          )}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          {/* Phase label */}
          <div style={{fontSize:"0.75rem",fontWeight:700,color:!warmupDone?"#3b82f6":cooldownActive?"#3b82f6":isRunning?currentSession.color:"#3b82f6",textTransform:"uppercase",letterSpacing:1}}>
            {!warmupDone?"🚶 WARM-UP":cooldownActive?"🚶 COOL-DOWN":isRunning?"🏃 RUN":"🚶 WALK"}
          </div>

          {/* Interval progress dots */}
          {warmupDone&&!cooldownActive&&(
            <div style={{display:"flex",gap:3}}>
              {currentSession.intervals.map((_,i)=>(
                <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<currentIntervalIdx?"#10b981":i===currentIntervalIdx?currentSession.color:G.border,transition:"background .3s"}}/>
              ))}
            </div>
          )}

          {/* Big timer */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:16}}>
            <div style={{width:190,height:190,borderRadius:"50%",background:!warmupDone||cooldownActive?"#dbeafe":isRunning?currentSession.color+"22":"#dbeafe",border:`6px solid ${!warmupDone||cooldownActive?"#3b82f6":isRunning?currentSession.color:"#3b82f6"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${isRunning?currentSession.color+"44":"#3b82f644"}`}}>
              <div style={{fontSize:"0.7rem",color:!warmupDone||cooldownActive?"#3b82f6":isRunning?currentSession.color:"#3b82f6",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
                {!warmupDone?"WARM UP":cooldownActive?"COOL DOWN":isRunning?"RUN":"WALK"}
              </div>
              <div style={{fontSize:"4rem",fontWeight:900,color:timerSec<=10?"#f87171":!warmupDone||cooldownActive?"#3b82f6":isRunning?currentSession.color:"#3b82f6",fontVariantNumeric:"tabular-nums",lineHeight:1}}>
                {Math.floor(timerSec/60).toString().padStart(2,"0")}:{(timerSec%60).toString().padStart(2,"0")}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>remaining</div>
            </div>

            {/* Next interval preview */}
            {warmupDone&&!cooldownActive&&activeInterval&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.7rem",color:G.textSoft}}>
                  {currentIntervalIdx<currentSession.intervals.length-1?
                    `Next: ${currentSession.intervals[currentIntervalIdx+1]?.label||"Cool-down"}`:
                    "Next: Cool-down Walk"}
                </div>
                <div style={{fontSize:"0.66rem",color:G.textSoft,marginTop:2}}>
                  Interval {currentIntervalIdx+1} of {currentSession.intervals.length}
                </div>
              </div>
            )}

            {/* Motivation */}
            <div style={{...card,background:"linear-gradient(135deg,#f0fdf4,#fff)",border:`1px solid ${currentSession.color}44`,padding:"10px 14px",textAlign:"center",maxWidth:300}}>
              <div style={{fontSize:"0.72rem",color:"#064e3b",fontStyle:"italic",lineHeight:1.6}}>
                {isRunning?
                  ['"I can do all things through Christ who strengthens me." — Phil 4:13',
                   '"Run with perseverance the race marked out for us." — Heb 12:1',
                   '"Be strong and courageous." — Joshua 1:9',
                   '"Those who hope in the Lord will renew their strength." — Isaiah 40:31'
                  ][currentIntervalIdx%4]:
                  "Great work! Breathe deep and recover. You\'re doing amazing! 🙏"}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:timerActive?"#ef4444":"#10b981",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);advanceRun();setTimeout(()=>setTimerActive(true),100);}} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}

function CalisthenicsTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr,fmtDate}){
  const CALS_KEY="atp-cals";
  const [calsPhase,setCalsPhase]=useState("setup");
  const [calsDuration,setCalsDuration]=useState(currentClient.workoutDuration||"45 min");
  const [calsSession,setCalsSession]=useState(null);
  const [generatingCals,setGeneratingCals]=useState(false);
  const [currentExIdx,setCurrentExIdx]=useState(0);
  const [timerSec,setTimerSec]=useState(0);
  const [timerActive,setTimerActive]=useState(false);
  const [isRest,setIsRest]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [sessionRating,setSessionRating]=useState(null);
  const [calsHistory,setCalsHistory]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem(CALS_KEY)||"[]"); }catch(e){ return []; }
  });
  const [calsPhoto,setCalsPhoto]=useState(null);
  const [analyzingCalsPhoto,setAnalyzingCalsPhoto]=useState(false);
  const [calsPhotoData,setCalsPhotoData]=useState(null);
  const [calsBpm,setCalsBpm]=useState("");
  const calsPhotoRef=useRef(null);
  const timerRef=useRef(null);
  const API_KEY=import.meta.env.VITE_API_KEY||"";

  async function analyzeCalsPhoto(file){
    setAnalyzingCalsPhoto(true);
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
            max_tokens:600,
            messages:[{role:"user",content:[
              {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
              {type:"text",text:`This is a workout/fitness tracker screenshot from a calisthenics or bodyweight workout. Extract all visible data. Return ONLY valid JSON, no markdown:
{"peakBpm":165,"avgBpm":140,"calories":320,"durationMin":30,"zones":{"zone1":{"pct":10},"zone2":{"pct":20},"zone3":{"pct":40},"zone4":{"pct":25},"zone5":{"pct":5}}}
Set any field not visible to null.`}
            ]}]
          })
        });
        const data=await res.json();
        const raw=data.content?.[0]?.text||"{}";
        const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
        setCalsPhotoData(parsed);
        if(parsed.peakBpm) setCalsBpm(String(parsed.peakBpm));
        setAnalyzingCalsPhoto(false);
      };
      reader.readAsDataURL(file);
    }catch(e){console.error(e);setAnalyzingCalsPhoto(false);}
  }

  useEffect(()=>{
    if(timerActive&&timerSec>0){
      timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000);
    } else if(timerActive&&timerSec===0){
      advanceCals();
    }
    return()=>clearTimeout(timerRef.current);
  },[timerActive,timerSec]);

  function getCurrentWeek(){
    try{
      const prog=JSON.parse(localStorage.getItem("atp-program")||"{}");
      return prog[currentClient.id]?.currentWeek||1;
    }catch(e){ return 1; }
  }

  function getLastRating(){
    if(calsHistory.length===0) return 3;
    return calsHistory[calsHistory.length-1].rating||3;
  }

  function getDifficultyMix(weekNum, lastRating){
    // Adjust based on rating
    let weekAdj=weekNum;
    if(lastRating<=2) weekAdj=Math.min(12,weekNum+1); // Too easy — bump up
    if(lastRating>=4) weekAdj=Math.max(1,weekNum-1); // Too hard — ease back

    if(weekAdj<=2) return{beginning:6,intermediate:4,advanced:0,superAdvanced:0};
    if(weekAdj<=8) return{beginning:2,intermediate:5,advanced:3,superAdvanced:0};
    return{beginning:1,intermediate:3,advanced:4,superAdvanced:2};
  }

  function getExerciseCount(duration){
    if(duration==="30 min") return 12;
    if(duration==="45 min") return 18;
    if(duration==="60 min") return 20;
    return 24;
  }

  function getWorkDuration(level){
    if(level==="Beginning") return 30;
    if(level==="Intermediate") return 40;
    if(level==="Advanced") return 50;
    return 60; // Super Advanced
  }

  async function generateCalsSession(){
    setGeneratingCals(true);
    const weekNum=getCurrentWeek();
    const lastRating=getLastRating();
    const mix=getDifficultyMix(weekNum,lastRating);
    const totalCount=getExerciseCount(calsDuration);

    let workoutRows=sheetData.workouts||[];
    if(workoutRows.length===0){
      try{
        const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
        const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        workoutRows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:workoutRows}));
        setSheetLoaded(true);
      }catch(e){ console.error(e); }
    }

    function getByLevelAndCat(cat,level,count){
      return workoutRows.slice(1).filter(row=>(row[1]||"").toLowerCase()===cat.toLowerCase()&&(row[2]||"").toLowerCase()===level.toLowerCase()).slice(0,count).map(row=>({
        name:row[0]||"",
        category:row[1]||"",
        level:row[2]||level,
        duration:getWorkDuration(level),
        instructions:row[5]||"",
        muscles:row[6]||"",
        progression:row[7]||"none",
        videoUrl:row[8]||null,
      }));
    }

    // Get exercises by difficulty for both calisthenics and abs
    const half=Math.floor;
    const calsBegin=getByLevelAndCat("Calisthenics","Beginning",mix.beginning);
    const calsInter=getByLevelAndCat("Calisthenics","Intermediate",mix.intermediate);
    const calsAdv=getByLevelAndCat("Calisthenics","Advanced",mix.advanced);
    const calsSA=getByLevelAndCat("Calisthenics","Super Advanced",mix.superAdvanced);

    const absBegin=getByLevelAndCat("Abs","Beginning",half(mix.beginning*0.8));
    const absInter=getByLevelAndCat("Abs","Intermediate",half(mix.intermediate*0.8));
    const absAdv=getByLevelAndCat("Abs","Advanced",half(mix.advanced*0.8));
    const absSA=getByLevelAndCat("Abs","Super Advanced",half(mix.superAdvanced*0.8));

    // Combine all exercises
    const allExercises=[...calsBegin,...calsInter,...calsAdv,...calsSA,...absBegin,...absInter,...absAdv,...absSA];

    // Shuffle for round 1
    const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);
    const round1=shuffle(allExercises).slice(0,totalCount);

    // Round 2 — same exercises different order
    const rounds=calsDuration==="30 min"?2:calsDuration==="45 min"?2:3;
    const allRounds=[];
    for(let r=0;r<rounds;r++){
      allRounds.push(...shuffle(round1));
    }

    setCalsSession({
      exercises:allRounds,
      uniqueCount:round1.length,
      rounds,
      duration:calsDuration,
      weekNum,
      lastRating,
      mix,
      generatedAt:todayStr(),
    });
    setCurrentExIdx(0);
    setIsRest(false);
    setSessionComplete(false);
    setSessionRating(null);
    setCalsPhase("preview");
    setGeneratingCals(false);
  }

  function startCalsSession(){
    if(!calsSession) return;
    setCalsPhase("active");
    setCurrentExIdx(0);
    setIsRest(false);
    const firstEx=calsSession.exercises[0];
    setTimerSec(firstEx?.duration||30);
    setTimerActive(true);
    setSessionComplete(false);
  }

  function advanceCals(){
    if(!calsSession) return;
    if(isRest){
      // Rest done — next exercise
      const nextIdx=currentExIdx+1;
      if(nextIdx>=calsSession.exercises.length){
        setSessionComplete(true);
        setTimerActive(false);
        return;
      }
      setCurrentExIdx(nextIdx);
      setIsRest(false);
      setTimerSec(calsSession.exercises[nextIdx].duration||30);
    } else {
      // Exercise done — rest
      setIsRest(true);
      setTimerSec(15);
    }
  }

  function saveCalsSession(rating){
    const entry={
      date:todayStr(),
      duration:calsSession.duration,
      weekNum:calsSession.weekNum,
      exercises:calsSession.uniqueCount,
      rounds:calsSession.rounds,
      rating,
      mix:calsSession.mix,
      ts:new Date().toISOString(),
    };
    const newHistory=[...calsHistory,entry];
    setCalsHistory(newHistory);
    try{
      localStorage.setItem(CALS_KEY,JSON.stringify(newHistory));
      // Supabase sync
      fetch(`${window.SUPABASE_URL}/rest/v1/atp_data`,{method:"POST",headers:{"apikey":window.SUPABASE_KEY,"Authorization":`Bearer ${window.SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":"resolution=merge-duplicates"},body:JSON.stringify({client_id:"__global__",data_key:CALS_KEY+"-"+currentClient.id,data_value:newHistory,updated_at:new Date().toISOString()})}).catch(()=>{});
    }catch(e){}
    setSessionRating(rating);
    setSessionComplete(true);
  }

  const weekNum=getCurrentWeek();
  const phase=weekNum<=2?"Foundation":weekNum<=8?"Build":"Peak";
  const phaseColor=weekNum<=2?"#60a5fa":weekNum<=8?G.greenMid:G.mangoDeep;
  const activeEx=calsSession?.exercises[currentExIdx];
  const currentRound=calsSession?Math.floor(currentExIdx/calsSession.uniqueCount)+1:1;
  const progressPct=calsSession?Math.round((currentExIdx/calsSession.exercises.length)*100):0;

  // SETUP SCREEN
  if(calsPhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#7c3aed,#a78bfa)`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🤸 Calisthenics & Abs</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Week {weekNum} — {phase} Phase</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>Circuit training — calisthenics and abs mixed throughout. No equipment needed!</div>
      </div>

      {/* Phase indicator */}
      <div style={{...card,border:`2px solid ${phaseColor}44`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={lbl}>📊 Current Difficulty Mix</div>
          <div style={{fontSize:"0.62rem",padding:"2px 8px",borderRadius:20,background:phaseColor+"22",color:phaseColor,fontWeight:700}}>{phase}</div>
        </div>
        {(()=>{
          const lastRating=getLastRating();
          const mix=getDifficultyMix(weekNum,lastRating);
          return(
            <div style={{display:"flex",flexDirection:"column",gap:4}}>
              {[{l:"Beginning",v:mix.beginning,c:"#60a5fa"},{l:"Intermediate",v:mix.intermediate,c:G.greenMid},{l:"Advanced",v:mix.advanced,c:G.mango},{l:"Super Advanced",v:mix.superAdvanced,c:G.mangoDeep}].filter(x=>x.v>0).map((x,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:"0.68rem",color:G.textSoft}}>{x.l}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:60,height:6,background:G.creamDark,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(x.v/10)*100}%`,background:x.c,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:"0.68rem",fontWeight:700,color:x.c}}>{x.v}</span>
                  </div>
                </div>
              ))}
              {lastRating<=2&&<div style={{fontSize:"0.64rem",color:G.greenMid,fontStyle:"italic",marginTop:4}}>💪 Bumped up — you rated last session {lastRating}/5!</div>}
              {lastRating>=4&&<div style={{fontSize:"0.64rem",color:G.mango,fontStyle:"italic",marginTop:4}}>💙 Eased back — you rated last session {lastRating}/5</div>}
            </div>
          );
        })()}
      </div>

      <div style={card}>
        <div style={lbl}>⏱ How long do you have?</div>
        <div style={{display:"flex",gap:6}}>
          {["30 min","45 min","60 min","90 min"].map(t=>(
            <button key={t} onClick={()=>setCalsDuration(t)} style={{flex:1,padding:"9px 0",borderRadius:10,border:`2px solid ${calsDuration===t?"#7c3aed":G.border}`,background:calsDuration===t?"#f5f3ff":G.cream,color:calsDuration===t?"#7c3aed":G.textSoft,fontSize:"0.72rem",fontWeight:calsDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
          ))}
        </div>
        <div style={{marginTop:8,fontSize:"0.62rem",color:G.textSoft}}>{getExerciseCount(calsDuration)} exercises × {calsDuration==="30 min"?2:calsDuration==="45 min"?2:3} rounds</div>
      </div>

      {calsHistory.length>0&&(
        <div style={{...card,background:"#f5f3ff",border:`1px solid #a78bfa44`}}>
          <div style={lbl}>📊 Last Session</div>
          <div style={{fontSize:"0.74rem",color:G.text}}>{calsHistory[calsHistory.length-1].duration} · {fmtDate(calsHistory[calsHistory.length-1].date)}</div>
          <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3}}>Week {calsHistory[calsHistory.length-1].weekNum} · Rated {calsHistory[calsHistory.length-1].rating}/5</div>
        </div>
      )}

      <button onClick={generateCalsSession} disabled={generatingCals} style={{...btnGreen,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",boxShadow:"0 4px 14px rgba(124,58,237,.3)",opacity:generatingCals?0.7:1}}>
        {generatingCals?"🤸 Building your session...":"🤸 Generate Session"}
      </button>
    </div>
  );

  // PREVIEW SCREEN
  if(calsPhase==="preview"&&calsSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#7c3aed,#a78bfa)`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🤸 Your Session</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{calsDuration} Circuit — {calsSession.rounds} Rounds</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>{calsSession.uniqueCount} unique exercises · {calsSession.exercises.length} total sets</div>
      </div>

      <div style={card}>
        <div style={lbl}>Round 1 Preview</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {calsSession.exercises.slice(0,calsSession.uniqueCount).map((ex,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:G.creamDark,borderRadius:10}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:ex.level==="Beginning"?"#60a5fa":ex.level==="Intermediate"?G.greenMid:ex.level==="Advanced"?G.mango:"#7c3aed",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.6rem",fontWeight:700,flexShrink:0}}>{ex.duration}s</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.76rem",fontWeight:700,color:G.text}}>{ex.name}</div>
                <div style={{fontSize:"0.6rem",color:G.textSoft}}>{ex.level} · {ex.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button onClick={startCalsSession} style={{...btnGreen,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",boxShadow:"0 4px 14px rgba(124,58,237,.3)"}}>▶ Start Session</button>
      <button onClick={()=>setCalsPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
    </div>
  );

  // ACTIVE SESSION
  if(calsPhase==="active"&&calsSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRest?"#f0faf4":"#f5f3ff"}}>
      {/* Progress bar */}
      <div style={{height:6,background:"#e9d5ff"}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:"linear-gradient(90deg,#7c3aed,#a78bfa)",transition:"width .5s"}}/>
      </div>

      {sessionComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#7c3aed",textAlign:"center"}}>Session Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! All things are possible! 🙏</div>
         {!sessionRating&&(
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
              {/* Photo upload */}
              <div style={{background:"#f5f3ff",border:"1px solid #c4b5fd",borderRadius:10,padding:"12px 14px"}}>
                <div style={{fontSize:"0.72rem",fontWeight:700,color:"#7c3aed",marginBottom:4}}>❤️ Log Heart Rate Data (optional)</div>
                <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:8,lineHeight:1.6}}>Upload your watch screenshot — AI reads BPM, calories and zones!</div>
                {!calsPhotoData&&(
                  <button onClick={()=>calsPhotoRef.current?.click()} style={{width:"100%",padding:"10px",borderRadius:10,border:"2px dashed #a78bfa",background:"#faf5ff",color:"#7c3aed",fontSize:"0.76rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:8}}>
                    {analyzingCalsPhoto?"✨ Reading your data...":"📸 Upload Watch Screenshot"}
                  </button>
                )}
                <input ref={calsPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setCalsPhoto(URL.createObjectURL(f));analyzeCalsPhoto(f);}}}/>
                {calsPhotoData&&(
                  <div style={{marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <div style={{fontSize:"0.7rem",fontWeight:700,color:"#7c3aed"}}>✅ Data extracted!</div>
                      <button onClick={()=>{setCalsPhotoData(null);setCalsPhoto(null);setCalsBpm("");}} style={{fontSize:"0.62rem",color:G.textSoft,background:"none",border:"none",cursor:"pointer"}}>✕</button>
                    </div>
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
                      {calsPhotoData.peakBpm&&<span style={{fontSize:"0.7rem",fontWeight:700,color:"#dc2626"}}>❤️ {calsPhotoData.peakBpm} BPM peak</span>}
                      {calsPhotoData.calories&&<span style={{fontSize:"0.7rem",fontWeight:700,color:G.mangoDeep}}>🔥 {calsPhotoData.calories} cal</span>}
                      {calsPhotoData.durationMin&&<span style={{fontSize:"0.7rem",fontWeight:700,color:"#7c3aed"}}>⏱ {calsPhotoData.durationMin} min</span>}
                    </div>
                    {calsPhotoData.zones&&(
                      <div style={{display:"flex",gap:3}}>
                        {Object.entries(calsPhotoData.zones).map(([k,z],i)=>{
                          const colors=["#6b7280","#60a5fa","#10b981","#f59e0b","#dc2626"];
                          return z?.pct>0?(<div key={k} style={{flex:z.pct,height:6,background:colors[i],borderRadius:2}}/>):null;
                        })}
                      </div>
                    )}
                  </div>
                )}
                {!calsPhotoData&&(
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <input type="text" inputMode="numeric" pattern="[0-9]*" value={calsBpm||""} onChange={e=>setCalsBpm(e.target.value.replace(/[^0-9]/g,""))} placeholder="or enter BPM manually" style={{...iStyle,flex:1,textAlign:"center"}}/>
                    <span style={{fontSize:"0.68rem",color:G.textSoft}}>BPM</span>
                  </div>
                )}
              </div>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your workout?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(r=>(
                  <button key={r} onClick={()=>{
                    const entry={date:todayStr(),duration:calsSession.duration,weekNum:calsSession.weekNum,exercises:calsSession.uniqueCount,rounds:calsSession.rounds,rating:r,bpm:calsBpm?parseInt(calsBpm):null,calories:calsPhotoData?.calories||null,zones:calsPhotoData?.zones||null,mix:calsSession.mix,ts:new Date().toISOString()};
                    const newHistory=[...calsHistory,entry];
                    setCalsHistory(newHistory);
                    try{localStorage.setItem(CALS_KEY,JSON.stringify(newHistory));}catch(e){}
                    setSessionRating(r);
                  }} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${sessionRating===r?"#7c3aed":G.border}`,background:sessionRating===r?"#f5f3ff":G.cream,color:sessionRating===r?"#7c3aed":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          )}
          {sessionRating&&<button onClick={()=>{setCalsPhase("setup");setSessionComplete(false);setCalsSession(null);}} style={{...btnGreen,background:"linear-gradient(135deg,#7c3aed,#a78bfa)"}}>🤸 New Session</button>}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          {/* Round indicator */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:"0.68rem",color:"#7c3aed",fontWeight:700}}>Round {currentRound} of {calsSession.rounds}</div>
            <div style={{fontSize:"0.68rem",color:G.textSoft}}>Exercise {(currentExIdx%calsSession.uniqueCount)+1} of {calsSession.uniqueCount}</div>
          </div>

          {/* Block indicators */}
          <div style={{display:"flex",gap:3}}>
            {Array.from({length:calsSession.uniqueCount}).map((_,i)=>{
              const globalIdx=(currentRound-1)*calsSession.uniqueCount+i;
              const done=globalIdx<currentExIdx;
              const active=globalIdx===currentExIdx;
              return(<div key={i} style={{flex:1,height:4,borderRadius:2,background:done?G.greenMid:active?"#7c3aed":G.border,transition:"background .3s"}}/>);
            })}
          </div>

          {/* Big timer */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:12}}>
            <div style={{width:170,height:170,borderRadius:"50%",background:isRest?"#d8f3dc":"#ede9fe",border:`6px solid ${isRest?G.greenMid:"#7c3aed"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 30px ${isRest?G.greenMid:"#7c3aed"}44`}}>
              <div style={{fontSize:"0.65rem",color:isRest?G.greenMid:"#7c3aed",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{isRest?"REST":"GO"}</div>
              <div style={{fontSize:"3.5rem",fontWeight:900,color:isRest?G.greenMid:"#7c3aed",fontVariantNumeric:"tabular-nums",lineHeight:1}}>{timerSec}</div>
              <div style={{fontSize:"0.58rem",color:G.textSoft,marginTop:4}}>seconds</div>
            </div>

            {!isRest&&activeEx&&(
              <div style={{textAlign:"center",width:"100%"}}>
                <div style={{fontSize:"1.1rem",fontWeight:900,color:G.text,marginBottom:4}}>{activeEx.name}</div>
                <div style={{fontSize:"0.62rem",padding:"3px 10px",borderRadius:20,background:activeEx.level==="Beginning"?"#dbeafe":activeEx.level==="Intermediate"?"#d1fae5":activeEx.level==="Advanced"?"#fef3c7":"#ede9fe",color:activeEx.level==="Beginning"?"#1d4ed8":activeEx.level==="Intermediate"?G.green:activeEx.level==="Advanced"?G.brown:"#7c3aed",fontWeight:600,display:"inline-block",marginBottom:8}}>{activeEx.level}</div>
                <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>{activeEx.instructions}</div>
                {/* Video placeholder */}
                <div style={{marginTop:10,padding:"8px 14px",borderRadius:10,background:"#f1f5f9",border:`1px dashed ${G.border}`,display:"inline-flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:"1rem"}}>🎥</span>
                  <span style={{fontSize:"0.64rem",color:G.textSoft}}>Video Coming Soon</span>
                </div>
              </div>
            )}

    {isRest&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:G.greenMid,marginBottom:8}}>Breathe! 💚</div>
                <div style={{fontSize:"0.7rem",color:G.textSoft,marginBottom:4}}>Next exercise:</div>
                <div style={{fontSize:"1.6rem",fontWeight:900,color:G.text,lineHeight:1.2}}>{calsSession.exercises[currentExIdx+1]?.name||"🏆 Last one!"}</div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:timerActive?"#7c3aed":G.green,color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);advanceCals();setTimeout(()=>setTimerActive(true),100);}} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}
function TRXTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr,fmtDate,sbSetGlobal}){
  const TRX_KEY="atp-trx";
  const [trxPhase,setTrxPhase]=useState("setup");
  const [trxSession,setTrxSession]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [currentExIdx,setCurrentExIdx]=useState(0);
  const [isRest,setIsRest]=useState(false);
  const [sessionPhase,setSessionPhase]=useState("warmup");
  const [timerSec,setTimerSec]=useState(30);
  const [timerActive,setTimerActive]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [trxRating,setTrxRating]=useState(null);
  const [trxHistory,setTrxHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(TRX_KEY)||"[]");}catch{return[];}
  });
  const timerRef=useRef(null);
  const API_KEY=import.meta.env.VITE_API_KEY||"";

  function getWeekNum(){
    const streak=trxHistory.length;
    return Math.min(12,Math.floor(streak/7)+1);
  }

  function getMix(weekNum){
    if(weekNum<=2) return{beginner:7,intermediate:3,advanced:0};
    if(weekNum<=4) return{beginner:5,intermediate:5,advanced:0};
    if(weekNum<=6) return{beginner:3,intermediate:5,advanced:2};
    return{beginner:1,intermediate:4,advanced:5};
  }

  function getPhaseName(weekNum){
    if(weekNum<=2) return"🌱 Foundation";
    if(weekNum<=4) return"💪 Building";
    if(weekNum<=6) return"🔥 Progressing";
    return"⭐ Advanced";
  }

  function playBeep(type="tick"){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      if(type==="end"){
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        osc.frequency.setValueAtTime(660,ctx.currentTime+0.2);
        gain.gain.setValueAtTime(0.4,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.6);
      } else {
        osc.frequency.setValueAtTime(440,ctx.currentTime);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.15);
      }
    }catch(e){}
  }

  useEffect(()=>{
    if(!timerActive) return;
    if(timerSec<=0){
      playBeep("end");
      advanceTRX();
      return;
    }
    if(timerSec<=3&&!isRest) playBeep("tick");
    timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000);
    return()=>clearTimeout(timerRef.current);
  },[timerActive,timerSec,isRest]);

  function parseDuration(str){
    if(!str) return 30;
    const n=parseInt(str);
    return isNaN(n)?30:n;
  }

  function buildSession(){
    const weekNum=getWeekNum();
    const mix=getMix(weekNum);
    const rows=sheetData.workouts||[];

    const getByLevel=(level,count)=>rows.slice(1).filter(row=>(row[2]||"").toLowerCase()===`trx ${level}`).map(row=>({
      name:row[0]||"",
      level:row[2]||"",
      duration:parseDuration(row[3]),
      instructions:row[5]||"",
      muscles:row[6]||"",
      isHold:(row[3]||"").includes("20")||(row[3]||"").includes("30 sec")&&(row[0]||"").toLowerCase().includes("hold"),
    }));

    const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);

    // Separate movements and holds for better variety
    const beginners=shuffle(getByLevel("beginner",30));
    const intermediates=shuffle(getByLevel("intermediate",30));
    const advanced=shuffle(getByLevel("advanced",30));

    const mainExercises=[
      ...beginners.slice(0,mix.beginner),
      ...intermediates.slice(0,mix.intermediate),
      ...advanced.slice(0,mix.advanced),
    ];

    // Ensure mix of holds and movements
    const sorted=mainExercises.sort(()=>Math.random()-0.5).slice(0,10);

    // Warmup — light beginner movements
    const warmup=shuffle(beginners.filter(e=>!e.isHold)).slice(0,3);
    if(warmup.length<3){
      const fallbacks=[
        {name:"TRX Squat",instructions:"Lower into squat using straps",duration:30,muscles:"Legs",level:"TRX Beginner"},
        {name:"TRX Hip Press",instructions:"Lift hips upward pressing through heels",duration:30,muscles:"Glutes",level:"TRX Beginner"},
        {name:"TRX Chest Press",instructions:"Lean forward and press away",duration:30,muscles:"Chest",level:"TRX Beginner"},
      ];
      while(warmup.length<3) warmup.push(fallbacks[warmup.length]);
    }

    // Cooldown — pull from stretch sheet
    const stretches=shuffle(rows.slice(1).filter(row=>(row[1]||"").toLowerCase().includes("stretch")&&(row[2]||"").toLowerCase().includes("beginning"))).slice(0,4);
    const cooldown=stretches.length>=3?stretches:[
      {name:"Chest Opener",instructions:"Interlace fingers behind back, lift chest",duration:30,muscles:"Chest"},
      {name:"Standing Forward Fold",instructions:"Hinge forward and let arms hang",duration:30,muscles:"Hamstrings"},
      {name:"Shoulder Cross Body Stretch",instructions:"Pull arm across chest gently",duration:30,muscles:"Shoulders"},
    ];

    // Fallback main exercises if sheet empty
    if(sorted.length<5){
      const FALLBACK_MAIN=[
        {name:"TRX Row",instructions:"Pull chest to handles keeping body straight",duration:30,muscles:"Back",level:"TRX Beginner"},
        {name:"TRX Squat",instructions:"Lower into squat using straps",duration:30,muscles:"Legs",level:"TRX Beginner"},
        {name:"TRX Push-Up",instructions:"Push-up with hands in straps",duration:30,muscles:"Chest",level:"TRX Beginner"},
        {name:"TRX Plank Hold",instructions:"Hold plank with feet in straps",duration:20,muscles:"Core",level:"TRX Beginner"},
        {name:"TRX Lunge",instructions:"Step back into reverse lunge",duration:30,muscles:"Legs",level:"TRX Beginner"},
        {name:"TRX Hamstring Curl",instructions:"Curl heels toward glutes",duration:30,muscles:"Hamstrings",level:"TRX Beginner"},
        {name:"TRX Mountain Climbers",instructions:"Drive knees toward chest rapidly",duration:30,muscles:"Core",level:"TRX Beginner"},
        {name:"TRX Chest Fly",instructions:"Open arms wide then close",duration:30,muscles:"Chest",level:"TRX Beginner"},
        {name:"TRX Pike Hold",instructions:"Hold hips lifted in pike",duration:20,muscles:"Core",level:"TRX Beginner"},
        {name:"TRX Triceps Press",instructions:"Lean forward and extend elbows",duration:30,muscles:"Triceps",level:"TRX Beginner"},
      ];
      while(sorted.length<10) sorted.push(FALLBACK_MAIN[sorted.length%FALLBACK_MAIN.length]);
    }

    return{warmup,main:sorted.slice(0,10),cooldown,weekNum,generatedAt:todayStr()};
  }

  function advanceTRX(){
    if(!trxSession) return;
    if(isRest){
      // Rest done — next exercise
      if(sessionPhase==="warmup"){
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trxSession.warmup.length){
          setSessionPhase("main");
          setCurrentExIdx(0);
          setIsRest(false);
          setTimerSec(trxSession.main[0]?.duration||30);
        } else {
          setCurrentExIdx(nextIdx);
          setIsRest(false);
          setTimerSec(trxSession.warmup[nextIdx]?.duration||30);
        }
      } else if(sessionPhase==="main"){
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trxSession.main.length){
          setSessionPhase("cooldown");
          setCurrentExIdx(0);
          setIsRest(false);
          setTimerSec(trxSession.cooldown[0]?.duration||30);
        } else {
          setCurrentExIdx(nextIdx);
          setIsRest(false);
          setTimerSec(trxSession.main[nextIdx]?.duration||30);
        }
      } else {
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trxSession.cooldown.length){
          setSessionComplete(true);
          setTimerActive(false);
        } else {
          setCurrentExIdx(nextIdx);
          setIsRest(false);
          setTimerSec(trxSession.cooldown[nextIdx]?.duration||30);
        }
      }
    } else {
      // Exercise done
      if(sessionPhase==="warmup"){
        // No rest in warmup — go straight to next
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trxSession.warmup.length){
          setSessionPhase("main");
          setCurrentExIdx(0);
          setTimerSec(trxSession.main[0]?.duration||30);
        } else {
          setCurrentExIdx(nextIdx);
          setTimerSec(trxSession.warmup[nextIdx]?.duration||30);
        }
      } else if(sessionPhase==="cooldown"){
        // No rest in cooldown
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trxSession.cooldown.length){
          setSessionComplete(true);
          setTimerActive(false);
        } else {
          setCurrentExIdx(nextIdx);
          setTimerSec(trxSession.cooldown[nextIdx]?.duration||30);
        }
      } else {
        // Main — rest 20 sec between exercises
        setIsRest(true);
        setTimerSec(20);
      }
    }
  }

  async function generateSession(){
    setGenerating(true);
    if(!sheetLoaded){
      try{
        const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
        const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        const rows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:rows}));
        setSheetLoaded(true);
      }catch(e){console.error(e);}
    }
    const session=buildSession();
    setTrxSession(session);
    setCurrentExIdx(0);
    setIsRest(false);
    setSessionPhase("warmup");
    setSessionComplete(false);
    setTrxRating(null);
    setTrxPhase("preview");
    setGenerating(false);
  }

  function startSession(){
    setTrxPhase("active");
    setCurrentExIdx(0);
    setIsRest(false);
    setSessionPhase("warmup");
    setTimerSec(trxSession.warmup[0]?.duration||30);
    setTimerActive(true);
    setSessionComplete(false);
  }

  async function saveSession(rating){
    const entry={date:todayStr(),weekNum:trxSession.weekNum,rating,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...trxHistory,entry];
    setTrxHistory(newHistory);
    try{
      localStorage.setItem(TRX_KEY,JSON.stringify(newHistory));
      await sbSetGlobal("atp-trx-"+currentClient.id,newHistory);
    }catch(e){}
    setTrxRating(rating);
  }

  const weekNum=getWeekNum();
  const activeEx=trxSession?
    sessionPhase==="warmup"?trxSession.warmup[currentExIdx]:
    sessionPhase==="main"?trxSession.main[currentExIdx]:
    trxSession.cooldown[currentExIdx]:null;

  const totalEx=trxSession?(trxSession.warmup.length+trxSession.main.length+trxSession.cooldown.length):0;
  const doneEx=trxSession?(
    sessionPhase==="warmup"?currentExIdx:
    sessionPhase==="main"?trxSession.warmup.length+currentExIdx:
    trxSession.warmup.length+trxSession.main.length+currentExIdx
  ):0;
  const progressPct=totalEx>0?Math.round((doneEx/totalEx)*100):0;
  const phaseColor=sessionPhase==="warmup"?"#60a5fa":sessionPhase==="main"?"#dc2626":G.greenMid;

  // SETUP
  if(trxPhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:"linear-gradient(135deg,#1e3a5f,#2563eb)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🔗 TRX Training</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Week {weekNum} — {getPhaseName(weekNum)}</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>Suspension training — builds strength, balance and core stability!</div>
        {trxHistory.length>0&&<div style={{marginTop:6,fontSize:"0.68rem",color:"rgba(255,255,255,.8)",fontWeight:700}}>🔥 {trxHistory.length} sessions completed</div>}
      </div>

      {(()=>{
        const mix=getMix(weekNum);
        return(
          <div style={{...card,border:"1.5px solid #2563eb44"}}>
            <div style={lbl}>📊 Today's Mix</div>
            {[{l:"Beginner",v:mix.beginner,c:"#60a5fa"},{l:"Intermediate",v:mix.intermediate,c:"#2563eb"},{l:"Advanced",v:mix.advanced,c:"#1e3a5f"}].filter(x=>x.v>0).map((x,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{fontSize:"0.68rem",color:G.textSoft,width:90}}>{x.l}</div>
                <div style={{flex:1,height:6,background:G.creamDark,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(x.v/10)*100}%`,background:x.c,borderRadius:3}}/>
                </div>
                <div style={{fontSize:"0.68rem",fontWeight:700,color:x.c,width:16}}>{x.v}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {trxHistory.length>0&&(
        <div style={{...card,background:"#eff6ff",border:"1px solid #bfdbfe"}}>
          <div style={lbl}>📊 Last Session</div>
          <div style={{fontSize:"0.74rem",color:G.text}}>{fmtDate(trxHistory[trxHistory.length-1].date)}</div>
          <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3}}>Week {trxHistory[trxHistory.length-1].weekNum} · Rated {trxHistory[trxHistory.length-1].rating}/5</div>
        </div>
      )}

      <button onClick={generateSession} disabled={generating} style={{...btnGreen,background:generating?"#ccc":"linear-gradient(135deg,#1e3a5f,#2563eb)",boxShadow:"0 4px 14px rgba(37,99,235,.3)",opacity:generating?0.7:1}}>
        {generating?"🔗 Building your session...":"🔗 Generate TRX Session"}
      </button>
    </div>
  );

  // PREVIEW
  if(trxPhase==="preview"&&trxSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:"linear-gradient(135deg,#1e3a5f,#2563eb)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🔗 Your Session</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Week {weekNum} TRX Circuit</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>{trxSession.warmup.length} warm-up · {trxSession.main.length} main · {trxSession.cooldown.length} cool-down</div>
      </div>

      {[{label:"🟢 Warm-Up",items:trxSession.warmup,color:"#60a5fa"},{label:"💪 Main Circuit",items:trxSession.main,color:"#2563eb"},{label:"🧘 Cool-Down",items:trxSession.cooldown,color:G.greenMid}].map((section,si)=>(
        <div key={si} style={{...card,borderLeft:`4px solid ${section.color}`}}>
          <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text,marginBottom:8}}>{section.label}</div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {section.items.map((ex,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:"0.74rem",color:G.text}}>{ex.name}</span>
                <span style={{fontSize:"0.64rem",color:section.color,fontWeight:700}}>{ex.duration}s</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={startSession} style={{...btnGreen,background:"linear-gradient(135deg,#1e3a5f,#2563eb)",boxShadow:"0 4px 14px rgba(37,99,235,.3)"}}>▶ Start Session</button>
      <button onClick={()=>setTrxPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
    </div>
  );

  // ACTIVE
  if(trxPhase==="active"&&trxSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRest?"#f0faf4":sessionPhase==="warmup"?"#eff6ff":sessionPhase==="main"?"#fff5f5":"#f0fdf4"}}>
      <div style={{height:6,background:G.creamDark}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:`linear-gradient(90deg,#1e3a5f,#2563eb)`,transition:"width .5s"}}/>
      </div>

      {sessionComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#2563eb",textAlign:"center"}}>TRX Session Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! All things are possible! 🙏</div>
          {!trxRating?(
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your session?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(r=>(
                  <button key={r} onClick={()=>saveSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${trxRating===r?"#2563eb":G.border}`,background:trxRating===r?"#eff6ff":G.cream,color:trxRating===r?"#2563eb":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          ):(
            <button onClick={()=>{setTrxPhase("setup");setSessionComplete(false);setTrxSession(null);}} style={{...btnGreen,background:"linear-gradient(135deg,#1e3a5f,#2563eb)"}}>🔗 New Session</button>
          )}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          {/* Phase label */}
          <div style={{fontSize:"0.75rem",fontWeight:700,color:phaseColor,textTransform:"uppercase",letterSpacing:1}}>
            {sessionPhase==="warmup"?"🟢 WARM-UP":sessionPhase==="main"?"💪 MAIN CIRCUIT":"🧘 COOL-DOWN"}
          </div>

          {/* Progress dots */}
          <div style={{display:"flex",gap:3}}>
            {(sessionPhase==="warmup"?trxSession.warmup:sessionPhase==="main"?trxSession.main:trxSession.cooldown).map((_,i)=>(
              <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<currentExIdx?phaseColor:i===currentExIdx?phaseColor+"88":G.border,transition:"background .3s"}}/>
            ))}
          </div>

          {/* Big timer */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:16}}>
            <div style={{width:180,height:180,borderRadius:"50%",background:isRest?"#d8f3dc":phaseColor+"22",border:`6px solid ${isRest?G.greenMid:phaseColor}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 30px ${phaseColor}44`}}>
              <div style={{fontSize:"0.7rem",color:isRest?G.greenMid:phaseColor,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{isRest?"REST":sessionPhase==="warmup"?"WARM UP":sessionPhase==="main"?"GO":"STRETCH"}</div>
              <div style={{fontSize:"4rem",fontWeight:900,color:timerSec<=3?"#f87171":isRest?G.greenMid:phaseColor,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{timerSec}</div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>seconds</div>
            </div>

            {!isRest&&activeEx&&(
              <div style={{textAlign:"center",padding:"0 8px"}}>
                <div style={{fontSize:"1.8rem",fontWeight:900,color:G.text,marginBottom:8,lineHeight:1.2}}>{activeEx.name}</div>
                <div style={{fontSize:"0.76rem",color:G.textSoft,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>{activeEx.instructions}</div>
                <div style={{marginTop:8,fontSize:"0.64rem",padding:"3px 10px",borderRadius:20,background:phaseColor+"22",color:phaseColor,fontWeight:700,display:"inline-block"}}>{activeEx.muscles}</div>
              </div>
            )}

            {isRest&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"1rem",fontWeight:700,color:G.greenMid,marginBottom:4}}>Rest 😮‍💨</div>
                <div style={{fontSize:"0.74rem",color:G.textSoft}}>Next: {(sessionPhase==="main"?trxSession.main:trxSession.cooldown)[currentExIdx+1]?.name||"Done!"}</div>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:timerActive?"#2563eb":G.green,color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);advanceTRX();setTimeout(()=>setTimerActive(true),100);}} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}
function TrampolineTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr,fmtDate,sbSetGlobal}){
  const TRAMP_KEY="atp-trampoline";
  const LEVEL_COLORS={Beginner:"#10b981",Intermediate:"#f59e0b",Advanced:"#ef4444"};

  const [trampPhase,setTrampPhase]=useState("setup");
  const [selectedLevel,setSelectedLevel]=useState(null);
  const [trampSession,setTrampSession]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [currentExIdx,setCurrentExIdx]=useState(0);
  const [sessionPhase,setSessionPhase]=useState("warmup");
  const [isRest,setIsRest]=useState(false);
  const [timerSec,setTimerSec]=useState(60);
  const [timerActive,setTimerActive]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [trampRating,setTrampRating]=useState(null);
  const [trampHistory,setTrampHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(TRAMP_KEY)||"[]");}catch{return[];}
  });
  const timerRef=useRef(null);

  function getAutoLevel(){
    const sessions=trampHistory.length;
    if(sessions>=14) return"Advanced";
    if(sessions>=7) return"Intermediate";
    return"Beginner";
  }

  function getRestTime(level){
    if(level==="Beginner") return 60;
    if(level==="Intermediate") return 45;
    return 30;
  }

  function getTotalMin(level){
    if(level==="Beginner") return 30;
    if(level==="Intermediate") return 45;
    return 60;
  }

  function getZoneLabel(level){
    if(level==="Beginner") return"Zone 2 — Fat Burn 💚";
    if(level==="Intermediate") return"Zone 2-3 — Aerobic 💛";
    return"Zone 3 — Cardio 🔥";
  }

  function parseDuration(str){
    if(!str) return 60;
    const n=parseInt(str);
    return isNaN(n)?60:n;
  }

  function playBeep(type="tick"){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      if(type==="end"){
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        osc.frequency.setValueAtTime(660,ctx.currentTime+0.2);
        gain.gain.setValueAtTime(0.4,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.6);
      } else {
        osc.frequency.setValueAtTime(440,ctx.currentTime);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.15);
      }
    }catch(e){}
  }

  useEffect(()=>{
    if(!timerActive) return;
    if(timerSec<=0){
      playBeep("end");
      advanceTramp();
      return;
    }
    if(timerSec<=3) playBeep("tick");
    timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000);
    return()=>clearTimeout(timerRef.current);
  },[timerActive,timerSec]);

  function buildSession(level){
    const rows=sheetData.workouts||[];
    const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);

    const getByPhase=(phase)=>shuffle(rows.slice(1).filter(row=>
      (row[1]||"").toLowerCase()==="trampoline"&&
      (row[2]||"").toLowerCase()===phase.toLowerCase()
    ).map(row=>({
      name:row[0]||"",
      level:row[2]||"",
      duration:parseDuration(row[3]),
      instructions:row[5]||"",
      muscles:row[6]||"",
    })));

    // Warmup — 5 exercises, 60 sec each = 5 min
    let warmup=getByPhase("warm-up").slice(0,5);
    if(warmup.length<5){
      const fallbacks=[
        {name:"Easy Basic Bounce",instructions:"Light bounce with soft knees",duration:60,muscles:"Legs/Cardio"},
        {name:"March in Place",instructions:"March lightly while bouncing",duration:60,muscles:"Legs"},
        {name:"Side Step Bounce",instructions:"Step side to side while bouncing",duration:60,muscles:"Legs"},
        {name:"Gentle Jog Bounce",instructions:"Light jog with minimal lift",duration:60,muscles:"Legs/Cardio"},
        {name:"Arm Swing Bounce",instructions:"Bounce while swinging arms gently",duration:60,muscles:"Full Body"},
      ];
      while(warmup.length<5) warmup.push(fallbacks[warmup.length%fallbacks.length]);
    }

    // Main bounce exercises
    const levelKey=level.toLowerCase();
    let mainExs=getByPhase(level);
    const restTime=getRestTime(level);
    const totalMin=getTotalMin(level);
    const warmupMin=5;
    const cooldownMin=4;
    const mainMin=totalMin-warmupMin-cooldownMin;

    // Calculate how many exercises fit in mainMin accounting for rest
    const exDuration=parseDuration(mainExs[0]?.duration||"240")/60; // in minutes
    const restMin=restTime/60;
    const exWithRest=exDuration+restMin;
    const numExercises=Math.max(3,Math.floor(mainMin/exWithRest));
    const main=mainExs.slice(0,numExercises);

    if(main.length<3){
      const fallbacks=[
        {name:"Basic Bounce",instructions:"Light bounce with soft knees",duration:240,muscles:"Legs/Cardio"},
        {name:"High Knees",instructions:"Lift knees high while bouncing",duration:240,muscles:"Core/Legs"},
        {name:"Boxer Shuffle",instructions:"Shift weight left/right",duration:240,muscles:"Legs/Cardio"},
        {name:"Twist Bounce",instructions:"Twist hips side to side",duration:240,muscles:"Core"},
        {name:"Power Bounce",instructions:"Higher controlled jumps",duration:240,muscles:"Legs/Cardio"},
      ];
      while(main.length<3) main.push(fallbacks[main.length%fallbacks.length]);
    }

    // Cooldown — 4-5 exercises, no rest
    let cooldown=getByPhase("cool-down").slice(0,4);
    if(cooldown.length<3){
      const fallbacks=[
        {name:"Slow Bounce to Stop",instructions:"Gradually reduce bounce until standing still",duration:60,muscles:"Full Body"},
        {name:"Standing Hamstring Stretch",instructions:"Hinge forward and stretch hamstrings",duration:45,muscles:"Legs"},
        {name:"Standing Quad Stretch",instructions:"Hold ankle behind to stretch quad",duration:45,muscles:"Legs"},
        {name:"Hip Flexor Stretch",instructions:"Step one foot back and sink into hip",duration:45,muscles:"Hips"},
      ];
      while(cooldown.length<3) cooldown.push(fallbacks[cooldown.length%fallbacks.length]);
    }

    return{warmup,main,cooldown,level,restTime,totalMin,generatedAt:todayStr()};
  }

  function advanceTramp(){
    if(!trampSession) return;

    if(isRest){
      const nextIdx=currentExIdx+1;
      if(sessionPhase==="main"){
        if(nextIdx>=trampSession.main.length){
          setSessionPhase("cooldown");
          setCurrentExIdx(0);
          setIsRest(false);
          setTimerSec(trampSession.cooldown[0]?.duration||45);
        } else {
          setCurrentExIdx(nextIdx);
          setIsRest(false);
          setTimerSec(trampSession.main[nextIdx]?.duration||240);
        }
      }
    } else {
      if(sessionPhase==="warmup"){
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trampSession.warmup.length){
          setSessionPhase("main");
          setCurrentExIdx(0);
          setTimerSec(trampSession.main[0]?.duration||240);
        } else {
          setCurrentExIdx(nextIdx);
          setTimerSec(trampSession.warmup[nextIdx]?.duration||60);
        }
      } else if(sessionPhase==="main"){
        setIsRest(true);
        setTimerSec(trampSession.restTime||60);
      } else {
        const nextIdx=currentExIdx+1;
        if(nextIdx>=trampSession.cooldown.length){
          setSessionComplete(true);
          setTimerActive(false);
        } else {
          setCurrentExIdx(nextIdx);
          setTimerSec(trampSession.cooldown[nextIdx]?.duration||45);
        }
      }
    }
  }

  async function generateSession(){
    setGenerating(true);
    const level=selectedLevel||getAutoLevel();
    if(!sheetLoaded){
      try{
        const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
        const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        const rows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:rows}));
        setSheetLoaded(true);
      }catch(e){console.error(e);}
    }
    const session=buildSession(level);
    setTrampSession(session);
    setCurrentExIdx(0);
    setIsRest(false);
    setSessionPhase("warmup");
    setSessionComplete(false);
    setTrampRating(null);
    setTrampPhase("preview");
    setGenerating(false);
  }

  function startSession(){
    setTrampPhase("active");
    setCurrentExIdx(0);
    setIsRest(false);
    setSessionPhase("warmup");
    setTimerSec(trampSession.warmup[0]?.duration||60);
    setTimerActive(true);
    setSessionComplete(false);
  }

  async function saveSession(rating){
    const entry={date:todayStr(),level:trampSession.level,totalMin:trampSession.totalMin,rating,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...trampHistory,entry];
    setTrampHistory(newHistory);
    try{
      localStorage.setItem(TRAMP_KEY,JSON.stringify(newHistory));
      await sbSetGlobal("atp-trampoline-"+currentClient.id,newHistory);
    }catch(e){}
    setTrampRating(rating);
  }

  const autoLevel=getAutoLevel();
  const level=selectedLevel||autoLevel;
  const levelColor=LEVEL_COLORS[level]||G.green;
  const activeEx=trampSession?
    sessionPhase==="warmup"?trampSession.warmup[currentExIdx]:
    sessionPhase==="main"?trampSession.main[currentExIdx]:
    trampSession.cooldown[currentExIdx]:null;

  const totalEx=trampSession?(trampSession.warmup.length+trampSession.main.length+trampSession.cooldown.length):0;
  const doneEx=trampSession?(
    sessionPhase==="warmup"?currentExIdx:
    sessionPhase==="main"?trampSession.warmup.length+currentExIdx:
    trampSession.warmup.length+trampSession.main.length+currentExIdx
  ):0;
  const progressPct=totalEx>0?Math.round((doneEx/totalEx)*100):0;

  // SETUP
  if(trampPhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#064e3b,${G.greenMid})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🦘 Trampoline Training</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Let's Bounce!</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>Low impact, high energy cardio — gentle on joints, great for lymphatic health!</div>
        {trampHistory.length>0&&<div style={{marginTop:6,fontSize:"0.68rem",color:"rgba(255,255,255,.8)",fontWeight:700}}>🔥 {trampHistory.length} sessions completed</div>}
      </div>

      <div style={card}>
        <div style={lbl}>🎯 Select Your Level</div>
        <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:10}}>Auto-selected: <strong style={{color:LEVEL_COLORS[autoLevel]}}>{autoLevel}</strong> based on your history</div>
        {[
          {l:"Beginner",desc:"30 min · Zone 2 · 60 sec rest",color:"#10b981"},
          {l:"Intermediate",desc:"45 min · Zone 2-3 · 45 sec rest",color:"#f59e0b"},
          {l:"Advanced",desc:"60 min · Zone 3 · 30 sec rest",color:"#ef4444"},
        ].map(opt=>(
          <button key={opt.l} onClick={()=>setSelectedLevel(opt.l)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 13px",borderRadius:10,border:`2px solid ${(selectedLevel||autoLevel)===opt.l?opt.color:G.border}`,background:(selectedLevel||autoLevel)===opt.l?opt.color+"11":G.cream,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit",marginBottom:8}}>
            <div style={{width:12,height:12,borderRadius:"50%",background:opt.color,flexShrink:0}}/>
            <div>
              <div style={{fontSize:"0.8rem",fontWeight:700,color:(selectedLevel||autoLevel)===opt.l?opt.color:G.text}}>{opt.l}</div>
              <div style={{fontSize:"0.64rem",color:G.textSoft}}>{opt.desc}</div>
            </div>
            {(selectedLevel||autoLevel)===opt.l&&<span style={{marginLeft:"auto",color:opt.color,fontWeight:700}}>✓</span>}
          </button>
        ))}
      </div>

      <div style={{...card,background:"#f0fdf4",border:`1px solid ${G.greenLight}`}}>
        <div style={{fontSize:"0.72rem",color:G.green,fontWeight:700,marginBottom:4}}>❤️ {getZoneLabel(level)}</div>
        <div style={{fontSize:"0.68rem",color:G.textSoft,lineHeight:1.6}}>
          {level==="Beginner"?"Comfortable pace — you can hold a conversation. Burns fat and builds base fitness.":
          level==="Intermediate"?"Moderate effort — slightly breathless. Builds cardiovascular fitness.":
          "High effort — challenging to speak. Maximum cardio and calorie burn."}
        </div>
      </div>

      {trampHistory.length>0&&(
        <div style={{...card,background:"#f0fdf4",border:`1px solid ${G.greenLight}`}}>
          <div style={lbl}>📊 Last Session</div>
          <div style={{fontSize:"0.74rem",color:G.text}}>{trampHistory[trampHistory.length-1].level} · {fmtDate(trampHistory[trampHistory.length-1].date)}</div>
          <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3}}>{trampHistory[trampHistory.length-1].totalMin} min · Rated {trampHistory[trampHistory.length-1].rating}/5</div>
        </div>
      )}

      <button onClick={generateSession} disabled={generating} style={{...btnGreen,background:generating?"#ccc":`linear-gradient(135deg,#064e3b,${G.greenMid})`,boxShadow:"0 4px 14px rgba(16,185,129,.3)",opacity:generating?0.7:1}}>
        {generating?"🦘 Building your session...":"🦘 Generate Trampoline Session"}
      </button>
    </div>
  );

  // PREVIEW
  if(trampPhase==="preview"&&trampSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#064e3b,${G.greenMid})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🦘 Your Session</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{trampSession.level} · {trampSession.totalMin} min</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>{getZoneLabel(trampSession.level)}</div>
      </div>

      {[
        {label:"🟢 Warm-Up (5 min)",items:trampSession.warmup,color:"#10b981",note:"No rest between exercises"},
        {label:"🔴 Main Bounce",items:trampSession.main,color:levelColor,note:`${trampSession.restTime}s rest between exercises`},
        {label:"🔵 Cool-Down",items:trampSession.cooldown,color:"#3b82f6",note:"No rest between stretches"},
      ].map((section,si)=>(
        <div key={si} style={{...card,borderLeft:`4px solid ${section.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text}}>{section.label}</div>
            <div style={{fontSize:"0.62rem",color:G.textSoft}}>{section.note}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {section.items.map((ex,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontSize:"0.74rem",color:G.text}}>{ex.name}</span>
                <span style={{fontSize:"0.64rem",color:section.color,fontWeight:700}}>{Math.floor(ex.duration/60)}:{(ex.duration%60).toString().padStart(2,"0")} min</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button onClick={startSession} style={{...btnGreen,background:`linear-gradient(135deg,#064e3b,${G.greenMid})`,boxShadow:"0 4px 14px rgba(16,185,129,.3)"}}>▶ Start Session</button>
      <button onClick={()=>setTrampPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
    </div>
  );

  // ACTIVE
  if(trampPhase==="active"&&trampSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRest?"#f0faf4":sessionPhase==="warmup"?"#f0fdf4":sessionPhase==="main"?levelColor+"11":"#eff6ff"}}>
      <div style={{height:6,background:G.creamDark}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:`linear-gradient(90deg,#064e3b,${G.greenMid})`,transition:"width .5s"}}/>
      </div>

      {sessionComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:G.green,textAlign:"center"}}>Bounce Session Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! {trampSession.totalMin} minutes done! All things are possible! 🙏</div>
          {!trampRating?(
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your session?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(r=>(
                  <button key={r} onClick={()=>saveSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${trampRating===r?G.green:G.border}`,background:trampRating===r?"#d8f3dc":G.cream,color:trampRating===r?G.green:G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          ):(
            <button onClick={()=>{setTrampPhase("setup");setSessionComplete(false);setTrampSession(null);}} style={{...btnGreen,background:`linear-gradient(135deg,#064e3b,${G.greenMid})`}}>🦘 New Session</button>
          )}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          {/* Phase label */}
          <div style={{fontSize:"0.75rem",fontWeight:700,color:sessionPhase==="warmup"?"#10b981":sessionPhase==="main"?levelColor:"#3b82f6",textTransform:"uppercase",letterSpacing:1}}>
            {sessionPhase==="warmup"?"🟢 WARM-UP":sessionPhase==="main"?"🦘 BOUNCE TIME":"🔵 COOL-DOWN"}
          </div>

          {/* Progress dots */}
          <div style={{display:"flex",gap:3}}>
            {(sessionPhase==="warmup"?trampSession.warmup:sessionPhase==="main"?trampSession.main:trampSession.cooldown).map((_,i)=>(
              <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<currentExIdx?levelColor:i===currentExIdx?levelColor+"88":G.border,transition:"background .3s"}}/>
            ))}
          </div>

          {/* Big timer and exercise */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:16}}>
            <div style={{width:200,height:200,borderRadius:"50%",background:isRest?"#d8f3dc":levelColor+"22",border:`6px solid ${isRest?G.greenMid:levelColor}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${levelColor}44`,transition:"border-color .5s,background .5s"}}>
              <div style={{fontSize:"0.7rem",color:isRest?G.greenMid:levelColor,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
                {isRest?"REST":sessionPhase==="warmup"?"WARM UP":sessionPhase==="main"?"BOUNCE":"STRETCH"}
              </div>
              <div style={{fontSize:"3.5rem",fontWeight:900,color:timerSec<=3?"#f87171":isRest?G.greenMid:levelColor,fontVariantNumeric:"tabular-nums",lineHeight:1}}>
                {Math.floor(timerSec/60).toString().padStart(2,"0")}:{(timerSec%60).toString().padStart(2,"0")}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>remaining</div>
            </div>

            {!isRest&&activeEx&&(
              <div style={{textAlign:"center",padding:"0 8px"}}>
                <div style={{fontSize:"2rem",fontWeight:900,color:G.text,marginBottom:8,lineHeight:1.2}}>{activeEx.name}</div>
                <div style={{fontSize:"0.84rem",color:G.textSoft,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>{activeEx.instructions}</div>
                <div style={{marginTop:8,fontSize:"0.7rem",padding:"4px 12px",borderRadius:20,background:levelColor+"22",color:levelColor,fontWeight:700,display:"inline-block"}}>{activeEx.muscles}</div>
              </div>
            )}

            {isRest&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"1.6rem",fontWeight:900,color:G.greenMid,marginBottom:4}}>Rest 😮‍💨</div>
                <div style={{fontSize:"0.82rem",color:G.textSoft}}>Catch your breath!</div>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:timerActive?levelColor:G.green,color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);advanceTramp();setTimeout(()=>setTimerActive(true),100);}} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}

function GymTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr,fmtDate,setTab}){
  const GYM_MUSCLE_GROUPS=["Chest","Back","Shoulders","Arms (Biceps/Triceps)","Legs","Core/Abs"];
  const GYM_CAT_MAP={"Chest":["gym chest"],"Back":["gym back"],"Shoulders":["gym shoulders"],"Arms (Biceps/Triceps)":["gym biceps","gym triceps"],"Legs":["gym legs"],"Core/Abs":["gym core"]};
  const BASELINE_EXERCISES=["Bench Press","Squat","Bicep Curl","Shoulder Press"];
  const BLAST_LAYOUTS={
    1:{1:"Chest",2:"Back",3:null,4:"Shoulders",5:"Chest",6:null,0:null},
    2:{1:"Back",2:"Chest",3:null,4:"Shoulders",5:null,6:"Chest",0:null},
  };
const MACHINE_CIRCUITS={
  upper:{name:"Upper Body",emoji:"💪",color:"#3b82f6",exercises:[
    {name:"Chest Press Machine",muscles:"Chest, Shoulders, Triceps",instructions:"Sit with back flat. Push handles forward until arms nearly straight. Return slowly.",sets:3,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Lat Pulldown",muscles:"Back, Biceps",instructions:"Grip bar wide. Pull down to upper chest squeezing shoulder blades. Return with control.",sets:3,reps:12,startingWeight:50,restBetweenSets:45,restAfterExercise:60},
    {name:"Seated Cable Row",muscles:"Mid Back, Biceps",instructions:"Sit tall, pull handle to lower chest elbows back. Squeeze at top. Return slowly.",sets:3,reps:12,startingWeight:45,restBetweenSets:45,restAfterExercise:60},
    {name:"Shoulder Press Machine",muscles:"Shoulders, Triceps",instructions:"Grip handles at shoulder height. Press up until arms nearly straight. Lower slowly.",sets:3,reps:12,startingWeight:30,restBetweenSets:45,restAfterExercise:60},
    {name:"Pec Deck Fly",muscles:"Chest",instructions:"Arms on pads at shoulder height. Bring together in front of chest. Return with control.",sets:3,reps:12,startingWeight:35,restBetweenSets:45,restAfterExercise:60},
    {name:"Tricep Pushdown",muscles:"Triceps",instructions:"Push cable handle down until arms fully extended. Keep elbows tucked. Return slowly.",sets:3,reps:12,startingWeight:25,restBetweenSets:45,restAfterExercise:60},
  ]},
  lower:{name:"Lower Body",emoji:"🦵",color:"#10b981",exercises:[
    {name:"Leg Press",muscles:"Quads, Glutes, Hamstrings",instructions:"Feet hip-width on platform. Lower until knees at 90 degrees. Press through heels to extend.",sets:3,reps:12,startingWeight:80,restBetweenSets:60,restAfterExercise:75},
    {name:"Leg Extension",muscles:"Quadriceps",instructions:"Pad just above ankles. Extend legs until straight, hold 1 sec. Lower slowly.",sets:3,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Seated Leg Curl",muscles:"Hamstrings",instructions:"Pad behind lower leg. Curl down as far as comfortable. Return slowly.",sets:3,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Hip Abductor Machine",muscles:"Glutes, Hip Abductors",instructions:"Pads on outer thighs. Press legs outward. Return slowly.",sets:3,reps:15,startingWeight:50,restBetweenSets:45,restAfterExercise:60},
    {name:"Hip Adductor Machine",muscles:"Inner Thighs",instructions:"Pads on inner thighs. Press legs inward. Return slowly.",sets:3,reps:15,startingWeight:50,restBetweenSets:45,restAfterExercise:60},
    {name:"Calf Raise Machine",muscles:"Calves",instructions:"Balls of feet on platform. Rise on toes, hold 1 sec. Lower slowly.",sets:3,reps:15,startingWeight:60,restBetweenSets:30,restAfterExercise:45},
  ]},
  full:{name:"Full Body",emoji:"🔥",color:"#f59e0b",exercises:[
    {name:"Chest Press Machine",muscles:"Chest, Shoulders, Triceps",instructions:"Push handles forward until arms nearly straight. Return slowly.",sets:2,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Leg Press",muscles:"Quads, Glutes, Hamstrings",instructions:"Feet hip-width. Lower until 90 degrees. Press through heels.",sets:2,reps:12,startingWeight:80,restBetweenSets:60,restAfterExercise:75},
    {name:"Lat Pulldown",muscles:"Back, Biceps",instructions:"Pull to upper chest squeezing shoulder blades.",sets:2,reps:12,startingWeight:50,restBetweenSets:45,restAfterExercise:60},
    {name:"Leg Extension",muscles:"Quadriceps",instructions:"Extend legs until straight, hold 1 sec. Lower slowly.",sets:2,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Shoulder Press Machine",muscles:"Shoulders, Triceps",instructions:"Press up until arms nearly straight. Lower slowly.",sets:2,reps:12,startingWeight:30,restBetweenSets:45,restAfterExercise:60},
    {name:"Seated Leg Curl",muscles:"Hamstrings",instructions:"Curl down as far as comfortable. Return slowly.",sets:2,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Seated Cable Row",muscles:"Mid Back, Biceps",instructions:"Pull to lower chest elbows back. Squeeze at top.",sets:2,reps:12,startingWeight:45,restBetweenSets:45,restAfterExercise:60},
    {name:"Calf Raise Machine",muscles:"Calves",instructions:"Rise on toes, hold 1 sec. Lower slowly.",sets:2,reps:15,startingWeight:60,restBetweenSets:30,restAfterExercise:45},
  ]},
  glutes:{name:"Glutes & Legs",emoji:"🍑",color:"#ec4899",exercises:[
    {name:"Hip Thrust Machine",muscles:"Glutes, Hamstrings",instructions:"Pad across hips. Drive hips up until body straight. Squeeze glutes at top. Lower slowly.",sets:3,reps:12,startingWeight:45,restBetweenSets:60,restAfterExercise:75},
    {name:"Glute Kickback Machine",muscles:"Glutes",instructions:"Place foot on pad. Kick back and up squeezing glute. Complete all reps then switch sides.",sets:3,reps:12,startingWeight:30,restBetweenSets:45,restAfterExercise:60},
    {name:"Hip Abductor Machine",muscles:"Glutes, Hip Abductors",instructions:"Press legs outward. Squeeze glutes. Return slowly.",sets:3,reps:15,startingWeight:50,restBetweenSets:45,restAfterExercise:60},
    {name:"Leg Press High Foot",muscles:"Glutes, Hamstrings",instructions:"Feet HIGH on platform hip-width. Lower to 90 degrees. Press through heels targeting glutes more.",sets:3,reps:12,startingWeight:70,restBetweenSets:60,restAfterExercise:75},
    {name:"Seated Leg Curl",muscles:"Hamstrings, Glutes",instructions:"Curl down as far as comfortable. Squeeze hamstrings. Return slowly.",sets:3,reps:12,startingWeight:40,restBetweenSets:45,restAfterExercise:60},
    {name:"Calf Raise Machine",muscles:"Calves",instructions:"Rise on toes, hold 1 sec. Lower below platform for full stretch.",sets:3,reps:15,startingWeight:60,restBetweenSets:30,restAfterExercise:45},
  ]},
};

  // Mode
  const [gymMode,setGymMode]=useState("");

  // Blast state
  const [blastLayout,setBlastLayout]=useState(()=>{try{return parseInt(localStorage.getItem("atp-blast-layout")||"0")||0;}catch(e){return 0;}});
  const [blastPhase,setBlastPhase]=useState("setup");
  const [blastSession,setBlastSession]=useState(null);
  const [blastExIdx,setBlastExIdx]=useState(0);
  const [blastSets,setBlastSets]=useState({});
  const [swapTimer,setSwapTimer]=useState(0);
  const [swapRunning,setSwapRunning]=useState(false);
  const [blastComplete,setBlastComplete]=useState(false);
  const [blastRating,setBlastRating]=useState(null);
  const [showAddon,setShowAddon]=useState(false);
  const [blastHistory,setBlastHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("atp-blast-new")||"[]");}catch(e){return[];}});
  const swapRef=useRef(null);
  const blastAdvRef=useRef(null);
  const [blastSuperIdx,setBlastSuperIdx]=useState(0);
  const [blastRoundIdx,setBlastRoundIdx]=useState(0);
  const [blastExInBlock,setBlastExInBlock]=useState(0);
  const [blastWorkTimer,setBlastWorkTimer]=useState(0);
  const [blastWorkTotal,setBlastWorkTotal]=useState(0);
  const [blastTimerOn,setBlastTimerOn]=useState(false);
  const [blastTimerMode,setBlastTimerMode]=useState("work");
  const [blastSessionWeights,setBlastSessionWeights]=useState({});

  // Full program state
  const [gymPhase,setGymPhase]=useState(()=>{try{const s=localStorage.getItem("atp-gymstarts");return s?"session":"baseline";}catch(e){return"baseline";}});
  const [baselineWeights,setBaselineWeights]=useState(()=>{try{return JSON.parse(localStorage.getItem("atp-gymstarts")||"{}");}catch(e){return{};}});
  const [baselineForm,setBaselineForm]=useState({});
  const [gymHistory,setGymHistory]=useState(()=>{try{return JSON.parse(localStorage.getItem("atp-gym")||"[]");}catch(e){return[];}});
  const [selectedGroups,setSelectedGroups]=useState([]);
  const [gymDuration,setGymDuration]=useState(currentClient.workoutDuration||"45 min");
  const [gymSession,setGymSession]=useState(null);
  const [generatingGym,setGeneratingGym]=useState(false);
  const [activePhase,setActivePhase]=useState("setup");
  const [currentExIdx,setCurrentExIdx]=useState(0);
  const [currentSetIdx,setCurrentSetIdx]=useState(0);
  const [completedSets,setCompletedSets]=useState({});
  const [restTimerSec,setRestTimerSec]=useState(0);
  const [restRunning,setRestRunning]=useState(false);
  const [sessionRating,setSessionRating]=useState(null);
  const [sessionComplete,setSessionComplete]=useState(false);
  const restRef=useRef(null);
  // MACHINE CIRCUIT STATE
  const [machineCircuitView,setMachineCircuitView]=useState('select');
  const [machineCircuitKey,setMachineCircuitKey]=useState(null);
  const [machineExerciseIdx,setMachineExerciseIdx]=useState(0);
  const [machineSetIdx,setMachineSetIdx]=useState(0);
  const [machinePhase,setMachinePhase]=useState('exercise');
  const [machineTimer,setMachineTimer]=useState(0);
  const [machineTimerTotal,setMachineTimerTotal]=useState(0);
  const [machineTimerActive,setMachineTimerActive]=useState(false);
  const [machineWeights,setMachineWeights]=useState(()=>{try{return JSON.parse(localStorage.getItem('atp-machine-weights-'+currentClient.id)||'{}');}catch{return{};}});
  const [machineSessionWeights,setMachineSessionWeights]=useState({});
  const [machineRating,setMachineRating]=useState(0);
  const [machineSetsLog,setMachineSetsLog]=useState([]);
  // Full Program v2 state
  const [progControlLevel,setProgControlLevel]=useState('');
  const [progExercises,setProgExercises]=useState([]);
  const [progAddAbs,setProgAddAbs]=useState(false);
  const [progPhase,setProgPhase]=useState('control');
  const [progExIdx,setProgExIdx]=useState(0);
  const [progSetIdx,setProgSetIdx]=useState(0);
  const [progWorkPhase,setProgWorkPhase]=useState('work');
  const [progTimer,setProgTimer]=useState(0);
  const [progTimerTotal,setProgTimerTotal]=useState(0);
  const [progTimerActive,setProgTimerActive]=useState(false);
  const [progSessionWeights,setProgSessionWeights]=useState({});
  const [progSavedWeights,setProgSavedWeights]=useState(()=>{try{return JSON.parse(localStorage.getItem('atp-pw-'+currentClient.id)||'{}');}catch{return{};}});
  const [progRating,setProgRating]=useState(0);
  const [progSwapIdx,setProgSwapIdx]=useState(null);
  const progAdvanceRef=useRef(null);
  const [progLoadedRows,setProgLoadedRows]=useState([]);
  const loadedRowsRef=useRef([]);
 // Swap timer effect
  useEffect(()=>{
    if(swapRunning&&swapTimer>0){swapRef.current=setTimeout(()=>setSwapTimer(s=>s-1),1000);}
    else if(swapRunning&&swapTimer===0){setSwapRunning(false);}
    return()=>clearTimeout(swapRef.current);
  },[swapRunning,swapTimer]);

  // Blast timer countdown
  useEffect(()=>{
    if(!blastTimerOn||blastWorkTimer<=0) return;
    const id=setTimeout(()=>setBlastWorkTimer(t=>t-1),1000);
    return()=>clearTimeout(id);
  },[blastTimerOn,blastWorkTimer]);

  // Blast timer advance on zero
  useEffect(()=>{
    if(blastTimerOn&&blastWorkTimer===0) blastAdvRef.current?.();
  },[blastTimerOn,blastWorkTimer]);

  // Rest timer effect
  useEffect(()=>{
    if(restRunning&&restTimerSec>0){restRef.current=setTimeout(()=>setRestTimerSec(s=>s-1),1000);}
    else if(restRunning&&restTimerSec===0){setRestRunning(false);}
    return()=>clearTimeout(restRef.current);
  },[restRunning,restTimerSec]);

  // Program timer countdown
  useEffect(()=>{
    if(!progTimerActive||progTimer<=0) return;
    const id=setTimeout(()=>setProgTimer(t=>t-1),1000);
    return()=>clearTimeout(id);
  },[progTimerActive,progTimer]);

  // Program timer advance on zero
  useEffect(()=>{
    if(progTimerActive&&progTimer===0) progAdvanceRef.current?.();
  },[progTimerActive,progTimer]);

  useEffect(()=>{
    if(!machineTimerActive||machineTimer<=0) return;
    const id=setTimeout(()=>setMachineTimer(t=>t-1),1000);
    return()=>clearTimeout(id);
  },[machineTimerActive,machineTimer]);
  function getCurrentWeek(){
    try{const prog=JSON.parse(localStorage.getItem("atp-program")||"{}");return prog[currentClient.id]?.currentWeek||1;}catch(e){return 1;}
  }

  function getBlastWeight(baseWeight,weekNum){
    const increments=Math.floor((weekNum-1)/2);
    return Math.round((parseFloat(baseWeight||45)+(increments*5))/5)*5;
  }

  function getTodayBlastGroup(){
    const today=new Date().getDay();
    const layout=BLAST_LAYOUTS[blastLayout||1];
    return layout?layout[today]:null;
  }

  async function generateBlastSession(group){
    const weekNum=getCurrentWeek();
    const phase=weekNum<=4?"volume":weekNum<=8?"intensity":"density";
    const workSec=phase==="volume"?38:phase==="intensity"?42:47;
    const restSec=phase==="volume"?52:phase==="intensity"?45:37;
    const switchSec=10;
    let workoutRows=sheetData.workouts||[];
    if(workoutRows.length===0){
      try{
        const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        workoutRows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:workoutRows}));setSheetLoaded(true);
      }catch(e){}
    }
    const w=(name,base)=>getBlastWeight(baselineWeights[name]||base||45,weekNum);
    const extraRound=phase==="intensity"?1:0;
    const programs={
      "Chest":{blocks:[
        {name:"Superset 1",rounds:5+extraRound,exercises:[
          {name:"Dumbbell Chest Press",weight:w("Dumbbell Chest Press",50),muscles:"Chest, Triceps",instructions:"Press dumbbells up from chest. Squeeze at top."},
          {name:"Dumbbell Chest Fly",weight:w("Dumbbell Chest Fly",30),muscles:"Chest",instructions:"Arms wide, slight bend. Open fully, squeeze hard at top."},
        ]},
        {name:"Finisher 1",rounds:3,isFinisher:true,exercises:[
          {name:"Cable Crossover",weight:w("Cable Crossover",25),muscles:"Chest",instructions:"Cross arms in front. Squeeze chest hard. Slow negative."},
        ]},
        {name:"Superset 2",rounds:4,exercises:[
          {name:"Incline Dumbbell Press",weight:w("Incline Dumbbell Press",40),muscles:"Upper Chest",instructions:"Press on incline, elbows at 45 degrees. Full stretch at bottom."},
          {name:"Incline Dumbbell Fly",weight:w("Incline Dumbbell Fly",25),muscles:"Upper Chest",instructions:"Open wide on incline. Deep stretch. Squeeze at top."},
        ]},
        {name:"🔥 Finisher 2 — To Failure",rounds:1,isFinisher:true,isFailure:true,exercises:[
          {name:"Push-Ups to Failure",weight:0,muscles:"Chest",instructions:"Full range every rep. Don't stop until you physically cannot do another!"},
        ]},
      ]},
      "Back":{blocks:[
        {name:"Superset 1",rounds:4+extraRound,exercises:[
          {name:"Chest-Supported Row",weight:w("Chest-Supported Row",40),muscles:"Back",instructions:"Chest on bench. Pull to hips, squeeze shoulder blades hard."},
          {name:"Single-Arm Row Right",weight:w("Single-Arm Row",45),muscles:"Back",instructions:"Right side. Pull to hip, lead with elbow. Full stretch at bottom."},
          {name:"Single-Arm Row Left",weight:w("Single-Arm Row",45),muscles:"Back",instructions:"Left side. Same form — pull to hip, lead with elbow."},
        ]},
        {name:"Finisher 1",rounds:3,isFinisher:true,exercises:[
          {name:"Neutral-Grip Lat Pulldown",weight:w("Lat Pulldown",50),muscles:"Lats",instructions:"Pull to upper chest. Slow negative. Feel the lats stretch."},
        ]},
        {name:"Superset 2",rounds:3,exercises:[
          {name:"Wide-Grip Seated Row",weight:w("Seated Cable Row",45),muscles:"Back",instructions:"Wide grip. Pull to chest, squeeze shoulder blades at end."},
          {name:"Face Pull High Angle",weight:w("Face Pull",20),muscles:"Rear Delts",instructions:"Rope at face height. Pull to forehead, elbows high and wide."},
        ]},
        {name:"🔥 Finisher 2 — Burnout",rounds:1,isFinisher:true,isFailure:true,exercises:[
          {name:"Straight-Arm Pulldown",weight:w("Straight Arm Pulldown",25),muscles:"Lats",instructions:"Arms straight. Pull from overhead to hips. Go til failure — lats on fire!"},
        ]},
      ]},
      "Shoulders":{blocks:[
        {name:"Superset 1",rounds:4+extraRound,exercises:[
          {name:"Lateral Raise",weight:w("Lateral Raise",15),muscles:"Side Delts",instructions:"Raise arms to shoulder height. Lead with elbows. Control the descent."},
          {name:"Front Raise",weight:w("Front Raise",15),muscles:"Front Delts",instructions:"Alternating arms. Raise to eye level. Slow on the way down."},
        ]},
        {name:"Finisher 1",rounds:2,isFinisher:true,exercises:[
          {name:"Single-Arm Cable Lateral Raise",weight:w("Cable Lateral Raise",10),muscles:"Side Delts",instructions:"Full stretch at bottom. Slow raise to shoulder height. Squeeze at top."},
        ]},
        {name:"Superset 2",rounds:3,exercises:[
          {name:"Seated Dumbbell Shoulder Press",weight:w("Dumbbell Shoulder Press",35),muscles:"Shoulders",instructions:"Press overhead. Lock out at top. Lower slowly to ears."},
          {name:"Rear Delt Fly",weight:w("Rear Delt Fly",15),muscles:"Rear Delts",instructions:"Bent over. Raise elbows out and up. Squeeze rear delts hard."},
        ]},
        {name:"🔥 Finisher 2 — Burnout",rounds:1,isFinisher:true,isFailure:true,exercises:[
          {name:"Face Pull Mid-Angle — To Failure",weight:w("Face Pull",20),muscles:"Rear Delts",instructions:"Cable at mid chest. Pull to chin. Keep going til arms give out!"},
        ]},
      ]},
      "Arms (Biceps/Triceps)":{blocks:[
        {name:"Superset 1",rounds:4+extraRound,exercises:[
          {name:"Straight Bar Curl",weight:w("Barbell Curl",40),muscles:"Biceps",instructions:"Strict curl. No swinging. Squeeze hard at top."},
          {name:"Cable Pushdown",weight:w("Cable Pushdown",35),muscles:"Triceps",instructions:"Push down. Lock out fully. Elbows pinned to sides."},
        ]},
        {name:"Superset 2",rounds:3,exercises:[
          {name:"Incline Dumbbell Curl",weight:w("Incline Dumbbell Curl",20),muscles:"Biceps",instructions:"Arms hang on incline. Full stretch. Curl slowly — feel every inch."},
          {name:"Overhead Cable Extension",weight:w("Overhead Cable Extension",30),muscles:"Triceps",instructions:"Arms overhead. Extend fully. Slow 3-second negative."},
        ]},
        {name:"Superset 3",rounds:2,exercises:[
          {name:"Hammer Curl",weight:w("Hammer Curl",25),muscles:"Biceps, Forearms",instructions:"Neutral grip. Alternate arms. Control the descent."},
          {name:"Skull Crushers",weight:w("Skull Crushers",35),muscles:"Triceps",instructions:"Lower bar to forehead slowly. Extend arms fully."},
        ]},
        {name:"🔥 Finisher — Total Burnout",rounds:1,isFinisher:true,isFailure:true,exercises:[
          {name:"21s Bicep Curl",weight:w("Barbell Curl",30),muscles:"Biceps",instructions:"7 lower half + 7 upper half + 7 full reps. Arms should be cooked after this!"},
          {name:"Rope Pushdowns to Failure",weight:w("Cable Pushdown",25),muscles:"Triceps",instructions:"Every last rep. Triceps should be completely on fire!"},
        ]},
      ]},
      "Legs":{blocks:[
        {name:"🏋️ Heavy Squat Block",rounds:4,isHeavy:true,exercises:[
          {name:"Barbell Back Squat",weight:getBlastWeight(baselineWeights["Barbell Back Squat"]||95,weekNum)+((weekNum>1?Math.floor((weekNum-1)/2):0)*5),muscles:"Quads, Glutes",instructions:"Bar on traps. Sit back and down, chest up. Drive through heels."},
        ]},
        {name:"Superset 1",rounds:4,exercises:[
          {name:"Walking Lunges",weight:w("Walking Lunges",25),muscles:"Quads, Glutes",instructions:"Step forward, lower back knee near floor. Drive front heel to stand."},
          {name:"Leg Extension",weight:w("Leg Extension",50),muscles:"Quads",instructions:"Extend legs until straight. Hold 1 sec at top. Lower slowly."},
        ]},
        {name:"Finisher 1",rounds:2,isFinisher:true,exercises:[
          {name:"Leg Press",weight:w("Leg Press",90),muscles:"Quads, Glutes",instructions:"Feet hip-width. Lower to 90 degrees. Press through heels."},
        ]},
        {name:"Posterior Chain Superset",rounds:3,exercises:[
          {name:"Romanian Deadlift",weight:w("Romanian Deadlift",60),muscles:"Hamstrings, Glutes",instructions:"Hinge at hips. Bar drags down legs. Feel the hamstring stretch."},
          {name:"Leg Curl",weight:w("Leg Curl",45),muscles:"Hamstrings",instructions:"Curl heels to glutes. Squeeze hard at top."},
        ]},
        {name:"🔥 Finisher 2 — Calves Burnout",rounds:2,isFinisher:true,exercises:[
          {name:"Standing Calf Raise",weight:w("Calf Raise",60),muscles:"Calves",instructions:"Rise to toes, hold 1 sec. Lower below platform for full stretch."},
          {name:"Seated Calf Raise",weight:w("Seated Calf Raise",50),muscles:"Calves",instructions:"Full range. Feel the burn. Go til they give out!"},
        ]},
      ]},
    };
    const dayKey=group==="Shoulders + Arms"?"Shoulders":group==="Chest/Arms"?"Chest":group;
    const dayProgram=programs[dayKey]||programs["Chest"];
    const initWeights={};
    dayProgram.blocks.forEach(b=>b.exercises.forEach(ex=>{initWeights[ex.name]=ex.weight;}));
    setBlastSessionWeights(initWeights);
    setBlastSession({group,weekNum,phase,workSec,restSec,switchSec,blocks:dayProgram.blocks,generatedAt:todayStr()});
    setBlastSuperIdx(0);setBlastRoundIdx(0);setBlastExInBlock(0);
    setBlastTimerMode("work");setBlastWorkTimer(workSec);setBlastWorkTotal(workSec);
    setBlastTimerOn(false);setBlastComplete(false);setBlastRating(null);setShowAddon(false);
    setBlastPhase("preview");
  }

  async function saveBlastSession(rating){
    const entry={date:todayStr(),group:blastSession.group,weekNum:blastSession.weekNum,exercises:blastSession.exercises.map(e=>({name:e.name,sets:e.sets,reps:e.reps,weight:e.weight})),rating,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...blastHistory,entry];
    setBlastHistory(newHistory);
    try{localStorage.setItem("atp-blast-new",JSON.stringify(newHistory));await sbSetGlobal("atp-blast-"+currentClient.id,newHistory);}catch(e){}
    setBlastRating(rating);setShowAddon(true);
    try{logWeeklySession("gym");}catch{}
  }

  function getWeekPrescription(exerciseName,weekNum){
    const baseline=baselineWeights[exerciseName]||baselineWeights[BASELINE_EXERCISES.find(b=>exerciseName.toLowerCase().includes(b.toLowerCase().split(" ")[0]))]||45;
    const weightWeeks=[3,6,9];
    const weightIncrements=weightWeeks.filter(w=>w<=weekNum).length;
    const currentWeight=Math.round((parseFloat(baseline)+(weightIncrements*5))/5)*5;
    let reps=8;
    if(weekNum===1)reps=8;
    else if(weightWeeks.includes(weekNum))reps=8;
    else{const lastWeightWeek=weightWeeks.filter(w=>w<weekNum).pop()||0;const repWeeksAfter=weekNum-lastWeightWeek-1;reps=Math.min(8+(repWeeksAfter*2),16);}
    return{weight:currentWeight,reps,sets:3};
  }

  async function generateGymSession(){
    if(selectedGroups.length===0)return;
    setGeneratingGym(true);
    const mins=parseInt(gymDuration)||45;
    const exPerGroup=mins<=30?3:mins<=45?4:mins<=60?5:7;
    let workoutRows=sheetData.workouts||[];
    if(workoutRows.length===0){
      try{
        const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        workoutRows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:workoutRows}));setSheetLoaded(true);
      }catch(e){console.error(e);}
    }
    const weekNum=getCurrentWeek();
    const exercises=[];
    selectedGroups.forEach(group=>{
     const cats=GYM_CAT_MAP[group]||[];
            const activeRows=loadedRowsRef.current.length>0?loadedRowsRef.current:(sheetData.workouts||[]);
            console.log("PICK SCREEN - activeRows:",activeRows.length,"group:",group,"cats:",cats);
            const sheetPool=activeRows.slice(1).filter(row=> cats.some(c=>(row[1]||"").toLowerCase().includes(c))).slice(0,exPerGroup).map(row=>({name:row[0]||"",category:row[1]||"",muscles:row[6]||group,instructions:row[5]||"",progression:row[7]||"increase gym",group}));
     exercises.push(...groupExs);
// FALLBACK if sheet returned nothing
if(groupExs.length===0){
  const FALLBACKS={
    "Chest":[{name:"Dumbbell Chest Press",muscles:"Chest",instructions:"Press dumbbells up from chest level."},{name:"Push-Ups",muscles:"Chest"},{name:"Dumbbell Fly",muscles:"Chest"}],
    "Back":[{name:"Bent-Over Row",muscles:"Back",instructions:"Hinge at hips, pull bar to chest."},{name:"Lat Pulldown",muscles:"Back"},{name:"Dumbbell Row",muscles:"Back"}],
    "Shoulders":[{name:"Shoulder Press",muscles:"Shoulders",instructions:"Press dumbbells overhead."},{name:"Lateral Raise",muscles:"Shoulders"},{name:"Front Raise",muscles:"Shoulders"}],
    "Arms (Biceps/Triceps)":[{name:"Bicep Curl",muscles:"Biceps",instructions:"Curl dumbbells to shoulders."},{name:"Tricep Extension",muscles:"Triceps"},{name:"Hammer Curl",muscles:"Biceps"}],
    "Legs":[{name:"Barbell Squat",muscles:"Legs",instructions:"Squat to 90 degrees."},{name:"Leg Press",muscles:"Legs"},{name:"Romanian Deadlift",muscles:"Hamstrings"}],
    "Core/Abs":[{name:"Plank",muscles:"Core",instructions:"Hold 60 sec."},{name:"Crunches",muscles:"Abs"},{name:"Leg Raises",muscles:"Abs"}],
  };
  const fb=(FALLBACKS[group]||[]).slice(0,exPerGroup).map(ex=>({...ex,category:"Gym",progression:"increase gym",group}));
  exercises.push(...fb);
} 
    });
    const interleaved=[];
    if(selectedGroups.length===2){
      const group1=exercises.filter(e=>e.group===selectedGroups[0]);
      const group2=exercises.filter(e=>e.group===selectedGroups[1]);
      const maxLen=Math.max(group1.length,group2.length);
      for(let i=0;i<maxLen;i++){if(i<group1.length)interleaved.push(group1[i]);if(i<group2.length)interleaved.push(group2[i]);}
    } else {interleaved.push(...exercises);}
    const withPrescription=interleaved.filter(ex=>ex.name).map(ex=>({...ex,...getWeekPrescription(ex.name,weekNum)}));
    const warmupExs=workoutRows.slice(1).filter(row=>(row[1]||"").toLowerCase().includes("warm-up")).slice(0,3).map(row=>({name:row[0],instructions:row[5]||"",muscles:"Full Body",group:"Warm-up",sets:1,reps:8,weight:0,progression:"none"}));
    if(warmupExs.length<3){const defaults=["Jumping Jacks","Arm Circles","Hip Rotations"];while(warmupExs.length<3)warmupExs.push({name:defaults[warmupExs.length],instructions:"Keep it light",muscles:"Full Body",group:"Warm-up",sets:1,reps:10,weight:0,progression:"none"});}
    const coreExs=[{name:"Plank",instructions:"Hold for 60 seconds, core tight",muscles:"Core",group:"Core",sets:3,reps:"60 sec",weight:0,progression:"increase time"},{name:"Crunches",instructions:"Focus on the squeeze at the top",muscles:"Core",group:"Core",sets:3,reps:15,weight:0,progression:"increase reps"}];
    setGymSession({groups:selectedGroups,duration:gymDuration,weekNum,exercises:[...warmupExs,...withPrescription,...(selectedGroups.includes("Core/Abs")?[]:coreExs.slice(0,2))],generatedAt:todayStr()});
    setCurrentExIdx(0);setCurrentSetIdx(0);setCompletedSets({});setSessionRating(null);setSessionComplete(false);setActivePhase("preview");setGeneratingGym(false);
  }

  async function saveGymSession(rating){
    const entry={date:todayStr(),groups:gymSession.groups,duration:gymSession.duration,weekNum:gymSession.weekNum,exercises:gymSession.exercises.map(e=>({name:e.name,sets:e.sets,reps:e.reps,weight:e.weight})),rating,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...gymHistory,entry];
    setGymHistory(newHistory);
    try{localStorage.setItem("atp-gym",JSON.stringify(newHistory));await sbSetGlobal("atp-gym-"+currentClient.id,newHistory);}catch(e){}
    setSessionComplete(true);setSessionRating(rating);
  }

  const weekNum=getCurrentWeek();
  const allSetsComplete=gymSession&&gymSession.exercises.every((ex,ei)=>Array.from({length:ex.sets||1}).every((_,si)=>completedSets[`${ei}-${si}`]));

  // ── MODE SELECTOR ──
  if(!gymMode) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,#1a1a2e,#16213e)`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🏋️ Gym</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Choose Your Workout Style</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.8)"}}>Week {weekNum} · Pick how you want to train today</div>
      </div>
      {[
        {id:"blast",icon:"💥",label:"Quick Blast",desc:"30 min · Structured weekly split · Dumbbells · +5lbs every 2 weeks",color:"#ef4444"},
        {id:"program",icon:"📈",label:"Full Program",desc:"45-90 min · Pick muscle groups · Progressive overload",color:"#6366f1"},
      {id:"machine",icon:"💪",label:"Machine Circuit",desc:"Lunch break friendly - 30-45 min",color:"#6b7280"},  
      ].map(m=>(
        <button key={m.id} onClick={()=>!m.soon&&setGymMode(m.id)} style={{...card,cursor:m.soon?"default":"pointer",textAlign:"left",width:"100%",border:`2px solid ${m.color}33`,background:`${m.color}08`,opacity:m.soon?0.6:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:52,height:52,borderRadius:"50%",background:m.color+"22",border:`2px solid ${m.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem",flexShrink:0}}>{m.icon}</div>
            <div>
              <div style={{fontSize:"0.88rem",fontWeight:700,color:m.color}}>{m.label}{m.soon&&<span style={{fontSize:"0.6rem",color:"#94a3b8",fontWeight:400,marginLeft:6}}>coming soon</span>}</div>
              <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3,lineHeight:1.5}}>{m.desc}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  // ── QUICK BLAST ──
  if(gymMode==="blast"){
    // Layout selection (first time)
    if(!blastLayout) return(
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,background:`linear-gradient(135deg,#7f1d1d,#ef4444)`,border:"none"}}>
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>💥 Quick Blast Setup</div>
          <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Choose Your Weekly Layout</div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>Pick once — app handles the rest every day!</div>
        </div>
        {[
          {opt:1,label:"Option 1 — Balanced",schedule:[{day:"Mon",group:"Chest"},{day:"Tue",group:"Back"},{day:"Wed",group:"Rest"},{day:"Thu",group:"Shoulders + Arms"},{day:"Fri",group:"Chest/Arms"},{day:"Sat",group:"Rest"},{day:"Sun",group:"Rest"}]},
          {opt:2,label:"Option 2 — Rest Early",schedule:[{day:"Mon",group:"Back"},{day:"Tue",group:"Chest"},{day:"Wed",group:"Rest"},{day:"Thu",group:"Shoulders + Arms"},{day:"Fri",group:"Rest"},{day:"Sat",group:"Chest/Arms"},{day:"Sun",group:"Rest"}]},
        ].map(({opt,label,schedule})=>(
          <button key={opt} onClick={()=>{setBlastLayout(opt);try{localStorage.setItem("atp-blast-layout",String(opt));}catch(e){}}} style={{...card,cursor:"pointer",textAlign:"left",width:"100%",border:`2px solid #ef444433`}}>
            <div style={{fontSize:"0.82rem",fontWeight:700,color:"#ef4444",marginBottom:10}}>{label}</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {schedule.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:10,alignItems:"center"}}>
                  <div style={{width:36,fontSize:"0.68rem",fontWeight:700,color:s.group==="Rest"?G.textSoft:"#ef4444"}}>{s.day}</div>
                  <div style={{fontSize:"0.72rem",color:s.group==="Rest"?G.textSoft:G.text,fontWeight:s.group==="Rest"?400:600}}>{s.group==="Rest"?"— Rest":s.group}</div>
                </div>
              ))}
            </div>
          </button>
        ))}
        <button onClick={()=>setGymMode("")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back</button>
      </div>
    );

    const todayGroup=getTodayBlastGroup();
    const isRestDay=!todayGroup||todayGroup==="Rest";

    // Daily setup
    if(blastPhase==="setup") return(
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,background:`linear-gradient(135deg,#7f1d1d,#ef4444)`,border:"none"}}>
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>💥 Quick Blast</div>
          <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{isRestDay?"Rest Day 💤":`Today: ${todayGroup} 💪`}</div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>Structured weekly split · Tap to start today's workout</div>
        </div>

        {isRestDay?(
          <div style={{...card,textAlign:"center",padding:"28px 20px"}}>
            <div style={{fontSize:"2rem",marginBottom:8}}>😴</div>
            <div style={{fontSize:"0.88rem",fontWeight:700,color:G.brown,marginBottom:6}}>Rest Day!</div>
            <div style={{fontSize:"0.74rem",color:G.textSoft,lineHeight:1.7,marginBottom:16}}>Your muscles grow during rest. Enjoy today! Want to add a core session?</div>
            <button onClick={()=>setTab&&setTab("cals")} style={{...btnGreen,padding:"10px 20px",width:"auto",margin:"0 auto"}}>💪 Optional Abs Session</button>
          </div>
        ):(
          <>
            <div style={{...card,background:"#fff5f5",border:`1px solid #fecaca`}}>
              <div style={lbl}>📅 Your Week</div>
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                {(blastLayout===1?[{day:"Mon",group:"Chest"},{day:"Tue",group:"Back"},{day:"Wed",group:"Rest"},{day:"Thu",group:"Shoulders + Arms"},{day:"Fri",group:"Chest/Arms"},{day:"Sat",group:"Rest"},{day:"Sun",group:"Rest"}]:[{day:"Mon",group:"Back"},{day:"Tue",group:"Chest"},{day:"Wed",group:"Rest"},{day:"Thu",group:"Shoulders + Arms"},{day:"Fri",group:"Rest"},{day:"Sat",group:"Chest/Arms"},{day:"Sun",group:"Rest"}]).map((s,i)=>{
                  const dayNums=[1,2,3,4,5,6,0];
                  const isToday=new Date().getDay()===dayNums[i];
                  return(
                    <div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"4px 8px",borderRadius:8,background:isToday?"#fee2e2":"transparent"}}>
                      <div style={{width:32,fontSize:"0.68rem",fontWeight:isToday?700:400,color:isToday?"#ef4444":G.textSoft}}>{s.day}</div>
                      <div style={{fontSize:"0.72rem",color:isToday?"#ef4444":s.group==="Rest"?G.textSoft:G.text,fontWeight:isToday?700:400}}>{s.group==="Rest"?"— Rest":s.group}</div>
                      {isToday&&<div style={{marginLeft:"auto",fontSize:"0.6rem",padding:"2px 7px",borderRadius:20,background:"#ef4444",color:"#fff",fontWeight:700}}>TODAY</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {blastHistory.length>0&&(
              <div style={{...card,background:"#fff5f5",border:`1px solid #fecaca`}}>
                <div style={lbl}>📊 Last Blast</div>
                <div style={{fontSize:"0.74rem",color:G.text}}>{blastHistory[blastHistory.length-1].group} — {fmtDate(blastHistory[blastHistory.length-1].date)}</div>
                <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3}}>Week {blastHistory[blastHistory.length-1].weekNum} · Rated {blastHistory[blastHistory.length-1].rating}/5</div>
              </div>
            )}
            <button onClick={()=>generateBlastSession(todayGroup)} style={{...btnGreen,background:"linear-gradient(135deg,#7f1d1d,#ef4444)",boxShadow:"0 4px 14px rgba(239,68,68,.3)"}}>💥 Start {todayGroup} Blast!</button>
            <button onClick={()=>{setBlastLayout(0);try{localStorage.removeItem("atp-blast-layout");}catch(e){}}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>⚙️ Change layout</button>
          </>
        )}
        <button onClick={()=>setGymMode("")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back to gym modes</button>
      </div>
    );
// Blast preview
    if(blastPhase==="preview"&&blastSession) return(
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,background:`linear-gradient(135deg,#7f1d1d,#ef4444)`,border:"none"}}>
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>💥 Quick Blast</div>
          <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{blastSession.group} — {blastSession.phase==="volume"?"Volume Phase":blastSession.phase==="intensity"?"Intensity Phase":"Density Phase"}</div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>Week {blastSession.weekNum} · {blastSession.workSec}s work · {blastSession.restSec}s rest · {blastSession.switchSec}s switch</div>
        </div>
        {blastSession.blocks.map((block,bi)=>(
          <div key={bi} style={{...card,borderLeft:`4px solid ${block.isFinisher?"#f59e0b":block.isHeavy?"#8b5cf6":"#ef4444"}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text}}>{block.name}</div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,padding:"2px 8px",borderRadius:20,background:block.isFinisher?"#fef3c7":block.isHeavy?"#ede9fe":"#fff5f5",color:block.isFinisher?"#92400e":block.isHeavy?"#6d28d9":"#ef4444",fontWeight:700}}>
                {block.isHeavy?"6-10 reps":block.isFailure?"To Failure":`${block.rounds} rounds`}
              </div>
            </div>
            {block.exercises.map((ex,ei)=>(
              <div key={ei} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderTop:ei>0?`1px solid ${G.border}`:"none"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {block.exercises.length>1&&<div style={{width:18,height:18,borderRadius:"50%",background:"#ef4444",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.58rem",fontWeight:700,flexShrink:0}}>{String.fromCharCode(65+ei)}</div>}
                    <div style={{fontSize:"0.76rem",fontWeight:600,color:G.text}}>{ex.name}</div>
                  </div>
                  <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:2,marginLeft:block.exercises.length>1?24:0}}>{ex.muscles}</div>
                </div>
                {ex.weight>0&&<div style={{fontSize:"0.76rem",fontWeight:700,color:"#ef4444"}}>{blastSessionWeights[ex.name]||ex.weight} lbs</div>}
              </div>
            ))}
          </div>
        ))}
        <button onClick={()=>{
          setBlastSuperIdx(0);setBlastRoundIdx(0);setBlastExInBlock(0);
          setBlastTimerMode("work");
          setBlastWorkTimer(blastSession.workSec);
          setBlastWorkTotal(blastSession.workSec);
          setBlastTimerOn(true);
          setBlastPhase("active");
        }} style={{...btnGreen,background:"linear-gradient(135deg,#7f1d1d,#ef4444)",boxShadow:"0 4px 14px rgba(239,68,68,.3)"}}>▶ Start Blast!</button>
        <button onClick={()=>setBlastPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back</button>
      </div>
    );
    
// Blast active
    if(blastPhase==="active"&&blastSession){
      const block=blastSession.blocks[blastSuperIdx];
      const ex=block?.exercises[blastExInBlock];
      const circ=2*Math.PI*52;
      const timerProg=blastWorkTotal>0?blastWorkTimer/blastWorkTotal:0;
      const modeColor=blastTimerMode==="work"?"#ef4444":blastTimerMode==="switch"?"#f59e0b":"#10b981";
      const modeBg=blastTimerMode==="work"?"#fff5f5":blastTimerMode==="switch"?"#fffbeb":"#f0fdf4";
      const modeLabel=blastTimerMode==="work"?"LIFT!":blastTimerMode==="switch"?"SWITCH":"REST";

      blastAdvRef.current=()=>{
        setBlastTimerOn(false);
        if(!blastSession||!block) return;
        const totalEx=block.exercises.length;
        const totalRounds=block.rounds;
        if(blastTimerMode==="work"){
          if(blastExInBlock<totalEx-1){
            setBlastTimerMode("switch");
            setBlastWorkTimer(blastSession.switchSec);
            setBlastWorkTotal(blastSession.switchSec);
            setBlastTimerOn(true);
          } else if(blastRoundIdx<totalRounds-1){
            setBlastTimerMode("rest");
            setBlastWorkTimer(blastSession.restSec);
            setBlastWorkTotal(blastSession.restSec);
            setBlastTimerOn(true);
          } else {
            const nextBlock=blastSuperIdx+1;
            if(nextBlock<blastSession.blocks.length){
              setBlastSuperIdx(nextBlock);setBlastRoundIdx(0);setBlastExInBlock(0);
              setBlastTimerMode("work");setBlastWorkTimer(blastSession.workSec);setBlastWorkTotal(blastSession.workSec);setBlastTimerOn(true);
            } else {setBlastComplete(true);}
          }
        } else if(blastTimerMode==="switch"){
          setBlastExInBlock(e=>e+1);
          setBlastTimerMode("work");setBlastWorkTimer(blastSession.workSec);setBlastWorkTotal(blastSession.workSec);setBlastTimerOn(true);
        } else if(blastTimerMode==="rest"){
          setBlastRoundIdx(r=>r+1);setBlastExInBlock(0);
          setBlastTimerMode("work");setBlastWorkTimer(blastSession.workSec);setBlastWorkTotal(blastSession.workSec);setBlastTimerOn(true);
        }
      };

      return(
        <div style={{flex:1,display:"flex",flexDirection:"column",background:modeBg}}>
          <div style={{height:6,background:"#fecaca"}}>
            <div style={{height:"100%",width:`${(blastSuperIdx/blastSession.blocks.length)*100}%`,background:"linear-gradient(90deg,#7f1d1d,#ef4444)",transition:"width .5s"}}/>
          </div>
          {blastComplete?(
            showAddon?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
                <div style={{fontSize:"2rem"}}>💥</div>
                <div style={{fontSize:"1rem",fontWeight:900,color:"#ef4444",textAlign:"center"}}>Blast Complete! 🔥</div>
                <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! Got more time today?</div>
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
                  <button onClick={()=>{if(setTab)setTab("cals");}} style={{...card,cursor:"pointer",textAlign:"center",border:`2px solid #7c3aed`,background:"#f5f3ff",padding:"14px"}}>
                    <div style={{fontSize:"1.2rem",marginBottom:4}}>🤸</div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7c3aed"}}>Add Abs Session</div>
                  </button>
                  <button onClick={async()=>{await generateBlastSession("Legs");setBlastComplete(false);setShowAddon(false);}} style={{...card,cursor:"pointer",textAlign:"center",border:`2px solid ${G.green}`,background:"#f0faf4",padding:"14px"}}>
                    <div style={{fontSize:"1.2rem",marginBottom:4}}>🦵</div>
                    <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green}}>Add Legs Session</div>
                  </button>
                  <button onClick={()=>{setBlastPhase("setup");setBlastComplete(false);setBlastSession(null);setGymMode("");}} style={{...btnGreen,padding:"12px"}}>✅ I'm Done — Great Workout!</button>
                </div>
              </div>
            ):(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
                <div style={{fontSize:"3rem"}}>🏆</div>
                <div style={{fontSize:"1.1rem",fontWeight:900,color:"#ef4444",textAlign:"center"}}>Blast Complete!</div>
                {!blastRating&&(
                  <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your blast?</div>
                    <div style={{display:"flex",gap:6}}>
                      {[1,2,3,4,5].map(r=>(
                        <button key={r} onClick={()=>saveBlastSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${blastRating===r?"#ef4444":G.border}`,background:blastRating===r?"#fee2e2":G.cream,color:blastRating===r?"#ef4444":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                      ))}
                    </div>
                    <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
                  </div>
                )}
              </div>
            )
          ):(
            <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:"0.68rem",color:"#ef4444",fontWeight:700}}>{block?.name}</div>
                <div style={{fontSize:"0.68rem",color:G.textSoft}}>Round {blastRoundIdx+1}/{block?.rounds}</div>
              </div>
              <div style={{display:"flex",gap:4}}>
                {blastSession.blocks.map((_,i)=>(
                  <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<blastSuperIdx?"#ef4444":i===blastSuperIdx?"#ef4444":"#fecaca",opacity:i===blastSuperIdx?1:i<blastSuperIdx?0.8:0.3}}/>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
                <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="160" height="160" style={{transform:"rotate(-90deg)"}}>
                    <circle cx="80" cy="80" r="52" fill="none" stroke="#fecaca" strokeWidth="10"/>
                    <circle cx="80" cy="80" r="52" fill="none" stroke={modeColor} strokeWidth="10"
                      strokeDasharray={`${circ*timerProg} ${circ}`} strokeLinecap="round"/>
                  </svg>
                  <div style={{position:"absolute",textAlign:"center"}}>
                    <div style={{fontSize:"2.8rem",fontWeight:900,color:blastWorkTimer<=5&&blastTimerMode==="work"?"#7f1d1d":modeColor,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{blastWorkTimer}</div>
                    <div style={{fontSize:"0.68rem",fontWeight:700,color:modeColor,letterSpacing:"0.1em"}}>{modeLabel}</div>
                  </div>
                </div>
                {blastTimerMode==="switch"&&block&&(
                  <div style={{textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:"#f59e0b"}}>
                    ➡ Next: {block.exercises[blastExInBlock+1]?.name||""}
                  </div>
                )}
              </div>
              {ex&&blastTimerMode!=="rest"&&(
                <div style={{...card,border:`2px solid ${modeColor}`,textAlign:"center",padding:"14px 16px"}}>
                  {block.exercises.length>1&&(
                    <div style={{fontSize:"0.62rem",fontWeight:700,color:modeColor,marginBottom:4,letterSpacing:"0.1em"}}>EXERCISE {String.fromCharCode(65+blastExInBlock)}</div>
                  )}
                  <div style={{fontSize:"1.2rem",fontWeight:900,color:"#ef4444",marginBottom:6}}>{ex.name}</div>
                  <div style={{fontSize:"0.68rem",color:G.textSoft,fontStyle:"italic",marginBottom:10}}>{ex.instructions}</div>
                  {ex.weight>0&&(
                    <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
                      <button onClick={()=>setBlastSessionWeights(w=>({...w,[ex.name]:Math.max(0,(w[ex.name]||ex.weight)-5)}))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.1rem"}}>-</button>
                      <div style={{fontSize:"1.8rem",fontWeight:900,color:"#ef4444",minWidth:60,textAlign:"center"}}>{blastSessionWeights[ex.name]||ex.weight}</div>
                      <button onClick={()=>setBlastSessionWeights(w=>({...w,[ex.name]:(w[ex.name]||ex.weight)+5}))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.1rem"}}>+</button>
                      <span style={{fontSize:"0.64rem",color:G.textSoft}}>lbs</span>
                    </div>
                  )}
                </div>
              )}
              {blastTimerMode==="rest"&&block&&(
                <div style={{...card,background:"#f0fdf4",border:"1px solid #bbf7d0",textAlign:"center",padding:"14px"}}>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:G.green,marginBottom:4}}>Rest up! 💚</div>
                  <div style={{fontSize:"0.8rem",color:G.textSoft}}>Next round: {block.exercises[0]?.name}</div>
                </div>
              )}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setBlastTimerOn(a=>!a)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:blastTimerOn?modeColor:"#6b7280",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>
                  {blastTimerOn?"⏸ Pause":"▶ Resume"}
                </button>
                <button onClick={()=>blastAdvRef.current?.()} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
              </div>
            </div>
          )}
        </div>
      );
    }
  }
   
// ── FULL PROGRAM ──
  if(gymMode==="program"){

    // ── SETUP ──
    if(progPhase==="control"||progPhase==="setup") return(
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{...card,background:`linear-gradient(135deg,#1a1a2e,#16213e)`,border:"none"}}>
          <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>📈 Full Program</div>
          <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Build Your Session</div>
          <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.8)"}}>Week {weekNum} · You pick every exercise · Rep timer included</div>
        </div>
        <div style={card}>
          <div style={lbl}>⏱ How long do you have?</div>
          <div style={{display:"flex",gap:6}}>
            {["45 min","60 min","90 min"].map(t=>(
              <button key={t} onClick={()=>setGymDuration(t)} style={{flex:1,padding:"10px 0",borderRadius:10,border:`2px solid ${gymDuration===t?"#6366f1":G.border}`,background:gymDuration===t?"#eef2ff":G.cream,color:gymDuration===t?"#6366f1":G.textSoft,fontSize:"0.72rem",fontWeight:gymDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>
                {t}
                <div style={{fontSize:"0.56rem",marginTop:2}}>{t==="45 min"?"4 exercises":t==="60 min"?"6 exercises":"9 exercises"}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={card}>
          <div style={lbl}>💪 Muscle Groups (pick 1 or 2)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {GYM_MUSCLE_GROUPS.filter(g=>g!=="Core/Abs").map(g=>{
              const sel=selectedGroups.includes(g);
              return(<button key={g} onClick={()=>{if(sel){setSelectedGroups(p=>p.filter(x=>x!==g));}else if(selectedGroups.length<2){setSelectedGroups(p=>([...p,g]));}}} style={{padding:"10px 8px",borderRadius:10,border:`2px solid ${sel?"#6366f1":G.border}`,background:sel?"#eef2ff":G.cream,color:sel?"#6366f1":G.text,fontSize:"0.74rem",fontWeight:sel?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                {sel?"✓ ":""}{g}
              </button>);
            })}
          </div>
          {selectedGroups.length>0&&<div style={{marginTop:8,fontSize:"0.68rem",color:"#6366f1",fontWeight:600}}>Selected: {selectedGroups.join(" + ")}</div>}
        </div>
        <div style={card}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setProgAddAbs(a=>!a)} style={{width:26,height:26,borderRadius:6,border:`2px solid ${progAddAbs?"#6366f1":G.border}`,background:progAddAbs?"#6366f1":G.cream,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.8rem",flexShrink:0}}>{progAddAbs?"✓":""}</button>
            <div>
              <div style={{fontSize:"0.78rem",fontWeight:600,color:G.text}}>Add Abs at the end?</div>
              <div style={{fontSize:"0.62rem",color:G.textSoft}}>3 core exercises added after your main workout</div>
            </div>
          </div>
        </div>
        <button onClick={async()=>{
          if(!selectedGroups.length){alert("Pick at least one muscle group!");return;}
          setProgPhase("loading");
          try{
            const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent("Workout Suggestions")}`);
            const text=await res.text();
            const json=JSON.parse(text.substring(47).slice(0,-2));
            const rows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
            setSheetData(p=>({...p,workouts:rows}));
            setSheetLoaded(true);
            const exCount=gymDuration==="45 min"?4:gymDuration==="60 min"?6:9;
            const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);
            function getExs(group,count){
              const cats=GYM_CAT_MAP[group]||[];
              const matches=rows.slice(1).filter(row=>cats.some(c=>(row[1]||"").toLowerCase().includes(c))).map(row=>({name:row[0]||"",muscles:row[6]||group,instructions:row[5]||"",group})).filter(e=>e.name);
              return shuffle(matches).slice(0,count);
            }
            let list=[];
            if(selectedGroups.length===2){
              const perGroup=Math.ceil(exCount/2);
              const g1=getExs(selectedGroups[0],perGroup);
              const g2=getExs(selectedGroups[1],perGroup);
              const max=Math.max(g1.length,g2.length);
              for(let i=0;i<max;i++){if(i<g1.length)list.push(g1[i]);if(i<g2.length)list.push(g2[i]);}
            } else {
              list=getExs(selectedGroups[0],exCount);
            }
            if(progAddAbs){
              list.push(
                {name:"Plank Hold",muscles:"Core",instructions:"Hold straight line, core tight.",group:"Core/Abs"},
                {name:"Crunches",muscles:"Abs",instructions:"Curl shoulders toward knees, squeeze at top.",group:"Core/Abs"},
                {name:"Leg Raises",muscles:"Lower Abs",instructions:"Raise legs to 90 degrees, lower without touching floor.",group:"Core/Abs"},
              );
            }
            list=list.map(ex=>({...ex,weight:progSavedWeights[ex.name]||0}));
            setProgExercises(list);
            setProgSessionWeights({});
            setProgPhase("pick");
          }catch(e){
            console.error(e);
            setProgPhase("setup");
            alert("Could not load exercises. Check your connection and try again.");
          }
        }} disabled={!selectedGroups.length} style={{...btnGreen,background:"linear-gradient(135deg,#4f46e5,#6366f1)",opacity:selectedGroups.length>0?1:0.5}}>
          ✋ Load Exercises & Pick
        </button>
        <button onClick={()=>setGymMode("")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back to gym modes</button>
      </div>
    );

    // ── LOADING ──
    if(progPhase==="loading") return(
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:24}}>
        <div style={{fontSize:"3rem"}}>💪</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#4f46e5"}}>Loading exercises...</div>
        <div style={{fontSize:"0.72rem",color:G.textSoft}}>Fetching your {selectedGroups.join(" + ")} library</div>
        <div style={{width:200,height:6,background:"#e0e7ff",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:"60%",background:"linear-gradient(90deg,#4f46e5,#6366f1)",borderRadius:3,animation:"pulse 1s ease-in-out infinite"}}/>
        </div>
      </div>
    );

    // ── PICK ──
    if(progPhase==="pick"){
      const exCount=gymDuration==="45 min"?4:gymDuration==="60 min"?6:9;
      return(
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...card,background:`linear-gradient(135deg,#4f46e5,#6366f1)`,border:"none"}}>
            <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>📈 Pick Your Exercises</div>
            <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{selectedGroups.join(" + ")}{progAddAbs?" + Abs":""}</div>
            <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>{progExercises.length} exercises · {gymDuration} · 6 sets each</div>
          </div>
          <div style={{...card,background:"#f0f9ff",border:"1px solid #bae6fd",fontSize:"0.72rem",color:"#0369a1"}}>
            ✅ {sheetData.workouts?.length||0} exercises loaded from your library. Pick from the dropdowns below!
          </div>
          {progExercises.map((ex,i)=>{
            const isAbs=progAddAbs&&i>=progExercises.length-3;
            const group=isAbs?"Core/Abs":ex.group||(selectedGroups.length===2?(i%2===0?selectedGroups[0]:selectedGroups[1]):selectedGroups[0]);
            const cats=GYM_CAT_MAP[group]||[];
            const pool=isAbs?[
              {name:"Plank Hold",muscles:"Core",instructions:"Hold straight line, core tight."},
              {name:"Crunches",muscles:"Abs",instructions:"Curl shoulders toward knees."},
              {name:"Leg Raises",muscles:"Lower Abs",instructions:"Raise legs to 90 degrees."},
              {name:"Russian Twists",muscles:"Obliques",instructions:"Rotate side to side."},
              {name:"Bicycle Crunches",muscles:"Abs",instructions:"Alternate elbow to knee."},
            ]:(sheetData.workouts||[]).slice(1).filter(row=>cats.some(c=>(row[1]||"").toLowerCase().includes(c))).map(row=>({name:row[0]||"",muscles:row[6]||group,instructions:row[5]||""})).filter(e=>e.name);
            const weight=progSessionWeights[ex.name]!=null?progSessionWeights[ex.name]:(progSavedWeights[ex.name]||0);
            const currentEx=pool.find(p=>p.name===ex.name)||pool[0]||ex;
            return(
              <div key={i} style={{...card,border:`2px solid ${isAbs?"#14b8a644":"#6366f133"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:isAbs?"#14b8a6":"#6366f1",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <div style={{fontSize:"0.72rem",fontWeight:700,color:G.textSoft}}>{isAbs?"Core/Abs":group}</div>
                  <div style={{marginLeft:"auto",fontSize:"0.62rem",color:"#6366f1"}}>{pool.length} options</div>
                </div>
                <select value={ex.name} onChange={e=>{
                  const picked=pool.find(p=>p.name===e.target.value);
                  if(!picked) return;
                  const updated=[...progExercises];
                  updated[i]={...picked,group,weight:progSavedWeights[picked.name]||0};
                  setProgExercises(updated);
                }} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`2px solid #6366f1`,background:"#f8f7ff",color:"#4f46e5",fontSize:"0.82rem",fontWeight:600,marginBottom:8,fontFamily:"inherit",cursor:"pointer"}}>
                  {pool.map(p=>(
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                {currentEx.instructions&&<div style={{fontSize:"0.62rem",color:G.textSoft,fontStyle:"italic",marginBottom:10}}>{currentEx.instructions}</div>}
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:"0.64rem",color:G.textSoft}}>Weight:</span>
                  <button onClick={()=>setProgSessionWeights(w=>({...w,[ex.name]:Math.max(0,(w[ex.name]!=null?w[ex.name]:0)-5)}))} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.1rem",color:G.text}}>-</button>
                  <input type="number" value={weight} onChange={e=>setProgSessionWeights(w=>({...w,[ex.name]:parseInt(e.target.value)||0}))} style={{width:64,textAlign:"center",border:`2px solid #6366f1`,borderRadius:8,padding:"5px",fontSize:"1rem",fontWeight:700,color:G.text}}/>
                  <button onClick={()=>setProgSessionWeights(w=>({...w,[ex.name]:(w[ex.name]!=null?w[ex.name]:0)+5}))} style={{width:30,height:30,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.1rem",color:G.text}}>+</button>
                  <span style={{fontSize:"0.6rem",color:G.textSoft}}>lbs</span>
                  {progSavedWeights[ex.name]>0&&<span style={{fontSize:"0.6rem",color:"#6366f1",marginLeft:4}}>Last: {progSavedWeights[ex.name]}lbs</span>}
                </div>
              </div>
            );
          })}
          <button onClick={()=>{
            const withWeights=progExercises.map(ex=>({...ex,weight:progSessionWeights[ex.name]!=null?progSessionWeights[ex.name]:(progSavedWeights[ex.name]||0)}));
            setProgExercises(withWeights);
            setProgExIdx(0);setProgSetIdx(0);setProgWorkPhase("work");
            setProgTimer(0);setProgTimerTotal(0);setProgTimerActive(false);
            setProgPhase("active");
          }} style={{...btnGreen,background:"linear-gradient(135deg,#4f46e5,#6366f1)",boxShadow:"0 4px 14px rgba(99,102,241,.3)"}}>
            ▶ Start Session
          </button>
          <button onClick={()=>setProgPhase("control")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
        </div>
      );
    }

    // ── ACTIVE SESSION ──
    if(progPhase==="active"&&progExercises.length>0){
      const ex=progExercises[progExIdx];
      if(!ex) return null;
      const weight=progSessionWeights[ex.name]!=null?progSessionWeights[ex.name]:(progSavedWeights[ex.name]||0);
      const nextEx=progExercises[progExIdx+1];
      const totalSets=6;
      const allSetsThisExDone=Array.from({length:totalSets}).every((_,si)=>completedSets[`${progExIdx}-${si}`]);

      function speakRep(repNum,totalReps){
        if(!window.speechSynthesis) return;
        const utterances=[
          new SpeechSynthesisUtterance(`Rep ${repNum}`),
          new SpeechSynthesisUtterance("Up!"),
          new SpeechSynthesisUtterance("Hold"),
          new SpeechSynthesisUtterance("Down"),
          new SpeechSynthesisUtterance("3"),
          new SpeechSynthesisUtterance("2"),
          new SpeechSynthesisUtterance("1"),
        ];
        const rates=[1,1.2,0.9,0.8,0.8,0.8,0.8];
        utterances.forEach((u,i)=>{u.rate=rates[i];u.pitch=i===1?1.3:1;u.volume=1;});
        if(repNum===totalReps){
          const done=new SpeechSynthesisUtterance("Set complete! Rest.");
          done.rate=1;done.pitch=1.2;
          utterances.push(done);
        }
        window.speechSynthesis.cancel();
        let idx=0;
        function next(){
          if(idx<utterances.length){
            const u=utterances[idx++];
            u.onend=next;
            window.speechSynthesis.speak(u);
          }
        }
        next();
      }

      return(
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#f8f7ff"}}>
          <div style={{height:6,background:"#e0e7ff"}}>
            <div style={{height:"100%",width:`${(progExIdx/progExercises.length)*100}%`,background:"linear-gradient(90deg,#4f46e5,#6366f1)",transition:"width .5s"}}/>
          </div>
          <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12,overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"0.68rem",color:"#6366f1",fontWeight:700}}>Exercise {progExIdx+1}/{progExercises.length}</div>
              <div style={{fontSize:"0.68rem",color:G.textSoft}}>Set {progSetIdx+1} of {totalSets}</div>
            </div>
            <div style={{...card,border:`2px solid #6366f1`,textAlign:"center",padding:16}}>
              <div style={{fontSize:"1.2rem",fontWeight:900,color:"#4f46e5",marginBottom:4}}>{ex.name}</div>
              <div style={{fontSize:"0.64rem",color:G.textSoft,fontStyle:"italic"}}>{ex.instructions}</div>
            </div>
            <div style={{...card,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:10}}>
                <span style={{fontSize:"0.64rem",color:G.textSoft}}>Weight:</span>
                <button onClick={()=>setProgSessionWeights(w=>({...w,[ex.name]:Math.max(0,(w[ex.name]||0)-5)}))} style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.2rem",color:G.text}}>-</button>
                <div style={{fontSize:"2rem",fontWeight:900,color:"#4f46e5",minWidth:64,textAlign:"center"}}>{weight}</div>
                <button onClick={()=>setProgSessionWeights(w=>({...w,[ex.name]:(w[ex.name]||0)+5}))} style={{width:34,height:34,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1.2rem",color:G.text}}>+</button>
                <span style={{fontSize:"0.64rem",color:G.textSoft}}>lbs</span>
              </div>
              <div style={{fontSize:"0.7rem",fontWeight:700,color:G.textSoft,marginBottom:8,textAlign:"center"}}>Sets — tap when done, then use rep timer</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {Array.from({length:totalSets}).map((_,si)=>{
                  const done=completedSets[`${progExIdx}-${si}`];
                  const isCurrent=si===progSetIdx;
                  return(
                    <button key={si} onClick={()=>{
                      if(done) return;
                      setCompletedSets(p=>({...p,[`${progExIdx}-${si}`]:true}));
                      if(si<totalSets-1) setProgSetIdx(si+1);
                      setRestTimerSec(60);setRestRunning(true);
                    }} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${done?"#6366f1":isCurrent?"#6366f1":G.border}`,background:done?"#6366f1":isCurrent?"#eef2ff":G.cream,color:done?"#fff":isCurrent?"#6366f1":G.textSoft,fontSize:"0.72rem",fontWeight:700,cursor:done?"default":"pointer",minWidth:40}}>
                      {done?"✓":`S${si+1}`}
                    </button>
                  );
                })}
              </div>
              <div style={{...card,background:"#f0faf4",border:`1px solid ${G.greenLight}`,padding:"10px 12px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{fontSize:"0.7rem",fontWeight:700,color:G.green}}>⏱ Rest Timer</div>
                  <div style={{fontSize:"1.4rem",fontWeight:900,color:restRunning?G.green:restTimerSec>0?"#f87171":G.textSoft,fontVariantNumeric:"tabular-nums"}}>{Math.floor(restTimerSec/60).toString().padStart(2,"0")}:{(restTimerSec%60).toString().padStart(2,"0")}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  {[30,45,60,90].map(s=>(
                    <button key={s} onClick={()=>{setRestTimerSec(s);setRestRunning(true);}} style={{flex:1,padding:"6px 0",borderRadius:8,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.64rem",cursor:"pointer"}}>{s}s</button>
                  ))}
                  <button onClick={()=>{setRestRunning(false);setRestTimerSec(0);}} style={{padding:"6px 10px",borderRadius:8,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.64rem",cursor:"pointer"}}>↺</button>
                </div>
                {restTimerSec===0&&!restRunning&&<div style={{fontSize:"0.64rem",color:G.greenMid,fontWeight:600,textAlign:"center",marginTop:4}}>✅ Rest done — next set!</div>}
              </div>
            </div>
            <div style={{...card,background:"#fdf4ff",border:"1px solid #e9d5ff",padding:"12px 14px"}}>
              <div style={{fontSize:"0.72rem",fontWeight:700,color:"#7c3aed",marginBottom:8}}>🎙 Rep Timer — Talking Coach</div>
              <div style={{fontSize:"0.64rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>Up fast · Hold 1s · Down 3-2-1 · Tap to start rep count</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[6,8,10,12,15].map(reps=>(
                  <button key={reps} onClick={()=>{
                    window.speechSynthesis?.cancel();
                    let rep=1;
                    function doRep(){
                      if(rep>reps) return;
                      speakRep(rep,reps);
                      rep++;
                      setTimeout(doRep,6000);
                    }
                    doRep();
                  }} style={{flex:1,padding:"10px 0",borderRadius:10,border:"2px solid #7c3aed",background:"#fdf4ff",color:"#7c3aed",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{reps} reps</button>
                ))}
              </div>
              <button onClick={()=>window.speechSynthesis?.cancel()} style={{width:"100%",marginTop:8,padding:"8px",borderRadius:10,border:"1px solid #e9d5ff",background:"#f5f3ff",color:"#7c3aed",fontSize:"0.68rem",cursor:"pointer",fontFamily:"inherit"}}>⏹ Stop Timer</button>
            </div>
            {nextEx&&allSetsThisExDone&&(
              <div style={{...card,background:"#f0fdf4",border:"1px solid #bbf7d0",textAlign:"center",padding:"10px 14px"}}>
                <div style={{fontSize:"0.62rem",color:G.textSoft,marginBottom:3}}>Next up:</div>
                <div style={{fontSize:"1rem",fontWeight:700,color:"#059669"}}>{nextEx.name}</div>
                <div style={{fontSize:"0.62rem",color:G.textSoft}}>{nextEx.muscles}</div>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              {progExIdx>0&&<button onClick={()=>{setProgExIdx(i=>i-1);setProgSetIdx(0);setRestRunning(false);setRestTimerSec(0);window.speechSynthesis?.cancel();}} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.8rem",cursor:"pointer"}}>← Back</button>}
              {progExIdx<progExercises.length-1?(
                <button onClick={()=>{setProgExIdx(i=>i+1);setProgSetIdx(0);setRestRunning(false);setRestTimerSec(0);window.speechSynthesis?.cancel();}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#4f46e5,#6366f1)",color:"#fff",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>Next Exercise →</button>
              ):(
                <button onClick={()=>{window.speechSynthesis?.cancel();setProgPhase("complete");}} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#4f46e5,#6366f1)",color:"#fff",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>✅ Finish Session</button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── COMPLETE ──
    if(progPhase==="complete"){
      const saveSession=async()=>{
        const newWeights={...progSavedWeights};
        progExercises.forEach(ex=>{if(progSessionWeights[ex.name]!=null)newWeights[ex.name]=progSessionWeights[ex.name];});
        setProgSavedWeights(newWeights);
        try{localStorage.setItem("atp-pw-"+currentClient.id,JSON.stringify(newWeights));}catch{}
        const entry={date:todayStr(),groups:selectedGroups,duration:gymDuration,weekNum,exercises:progExercises.map(ex=>({name:ex.name,sets:6,reps:8,weight:progSessionWeights[ex.name]!=null?progSessionWeights[ex.name]:(progSavedWeights[ex.name]||0)})),rating:progRating,clientId:currentClient.id,ts:new Date().toISOString()};
        const newHist=[...gymHistory,entry];
        setGymHistory(newHist);
        try{localStorage.setItem("atp-gym",JSON.stringify(newHist));await sbSetGlobal("atp-gym-"+currentClient.id,newHist);}catch{}
        try{logWeeklySession("gym");}catch{}
        setProgPhase("control");setProgExercises([]);setProgSessionWeights({});setProgRating(0);setSelectedGroups([]);setGymMode("");
      };
      return(
        <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:16,alignItems:"center",textAlign:"center"}}>
          <div style={{fontSize:"4rem"}}>🏆</div>
          <div style={{fontSize:"1.3rem",fontWeight:900,color:"#4f46e5"}}>Session Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,lineHeight:1.7}}>Outstanding work {currentClient.name.split(" ")[0]}! {progExercises.length} exercises done. All things are possible! 🙏</div>
          <div style={{width:"100%",background:"#f9fafb",borderRadius:12,padding:16,textAlign:"left"}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:G.textSoft,marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Session Summary</div>
            {progExercises.map((ex,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:i<progExercises.length-1?"1px solid #e5e7eb":"none",fontSize:"0.72rem"}}>
                <span style={{color:G.text}}>{ex.name}</span>
                <span style={{color:"#6366f1",fontWeight:700}}>6 sets @ {progSessionWeights[ex.name]!=null?progSessionWeights[ex.name]:(progSavedWeights[ex.name]||0)}lbs</span>
              </div>
            ))}
          </div>
          <div style={{width:"100%"}}>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:G.brown,marginBottom:10}}>How was your workout?</div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              {[1,2,3,4,5].map(s=>(
                <button key={s} onClick={()=>setProgRating(s)} style={{fontSize:"2rem",background:"none",border:"none",cursor:"pointer",opacity:progRating>=s?1:0.25}}>⭐</button>
              ))}
            </div>
          </div>
          <button onClick={saveSession} style={{...btnGreen,background:"linear-gradient(135deg,#4f46e5,#6366f1)",width:"100%"}}>
            💾 Save and Finish
          </button>
        </div>
      );
    }

    return null;
  }
  
const renderMachineCircuit=()=>{
    const circuit=machineCircuitKey?MACHINE_CIRCUITS[machineCircuitKey]:null;
    const getProgramWeek=()=>{try{const d=JSON.parse(localStorage.getItem('atp-program-'+currentClient.id)||'{}');if(d.startDate){const diff=Math.floor((Date.now()-new Date(d.startDate))/86400000);return Math.min(Math.max(Math.floor(diff/7)+1,1),12);}return 1;}catch{return 1;}};
    const week=getProgramWeek();
    const cycleWeek=((week-1)%6)+1;
    const getTargetReps=(ex)=>ex.reps+(cycleWeek>=3&&cycleWeek<=4?2:0);
    const getBaseWeight=(ex)=>machineWeights[ex.name]||ex.startingWeight;
    const getTargetWeight=(ex)=>getBaseWeight(ex)+(cycleWeek>=5?5:0);
    const mcFmt=(s)=>Math.floor(s/60)+':'+(s%60).toString().padStart(2,'0');
    const startTimer=(secs)=>{setMachineTimer(secs);setMachineTimerTotal(secs);setMachineTimerActive(true);};
    const circ=2*Math.PI*52;
    const timerProg=machineTimerTotal>0?machineTimer/machineTimerTotal:0;

    const handleCompleteSet=()=>{
      const ex=circuit.exercises[machineExerciseIdx];
      const wt=machineSessionWeights[ex.name]!=null?machineSessionWeights[ex.name]:getTargetWeight(ex);
      setMachineSetsLog(prev=>[...prev,{exercise:ex.name,set:machineSetIdx+1,weight:wt,reps:getTargetReps(ex)}]);
      const nextSet=machineSetIdx+1;
      if(nextSet<ex.sets){setMachineSetIdx(nextSet);setMachinePhase('set-rest');startTimer(ex.restBetweenSets);}
      else{
        const nextEx=machineExerciseIdx+1;
        if(nextEx<circuit.exercises.length){setMachineExerciseIdx(nextEx);setMachineSetIdx(0);setMachinePhase('ex-rest');startTimer(ex.restAfterExercise);}
        else{
          const newW={...machineWeights};
          circuit.exercises.forEach(e=>{if(machineSessionWeights[e.name]!=null)newW[e.name]=machineSessionWeights[e.name];});
          setMachineWeights(newW);
          localStorage.setItem('atp-machine-weights-'+currentClient.id,JSON.stringify(newW));
          setMachineTimerActive(false);setMachineCircuitView('complete');
        }
      }
    };

    const handleTimerContinue=()=>{setMachineTimerActive(false);setMachineTimer(0);setMachinePhase('exercise');};

    if(machineCircuitView==='select') return(
      <div style={{padding:'20px'}}>
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <div style={{fontSize:'40px'}}>💪</div>
          <h2 style={{margin:'8px 0 4px',color:'#1f2937',fontSize:'22px'}}>Machine Circuit</h2>
          <p style={{color:'#6b7280',margin:0,fontSize:'14px'}}>Lunch-break friendly - 30-45 min</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
          {Object.entries(MACHINE_CIRCUITS).map(([key,c])=>(
            <button key={key} onClick={()=>{setMachineCircuitKey(key);setMachineCircuitView('preview');}}
              style={{background:'white',border:'2px solid '+c.color+'30',borderRadius:'16px',padding:'24px 12px',cursor:'pointer',textAlign:'center',boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
              <div style={{fontSize:'40px',marginBottom:'8px'}}>{c.emoji}</div>
              <div style={{fontWeight:'700',color:c.color,fontSize:'15px'}}>{c.name}</div>
              <div style={{color:'#9ca3af',fontSize:'12px',marginTop:'4px'}}>{c.exercises.length} machines - {c.exercises.reduce((t,e)=>t+e.sets,0)} sets</div>
            </button>
          ))}
        </div>
        <button onClick={()=>setGymMode('')} style={{width:'100%',padding:'12px',background:'none',border:'1px solid #e5e7eb',borderRadius:'10px',color:'#6b7280',cursor:'pointer',fontSize:'14px'}}>Back to Gym</button>
      </div>
    );

    if(machineCircuitView==='preview'&&circuit){
      const totalSets=circuit.exercises.reduce((t,e)=>t+e.sets,0);
      const estMins=Math.ceil(circuit.exercises.reduce((t,e)=>t+(e.sets*30)+((e.sets-1)*e.restBetweenSets)+e.restAfterExercise,0)/60);
      return(
        <div style={{padding:'20px'}}>
          <div style={{textAlign:'center',marginBottom:'20px'}}>
            <div style={{fontSize:'52px'}}>{circuit.emoji}</div>
            <h2 style={{margin:'8px 0 4px',color:'#1f2937'}}>{circuit.name}</h2>
            <div style={{display:'flex',justifyContent:'center',gap:'14px',color:'#6b7280',fontSize:'13px',flexWrap:'wrap'}}>
              <span>{circuit.exercises.length} exercises</span>
              <span>{totalSets} sets</span>
              <span>~{estMins} min</span>
              <span>Week {week}</span>
            </div>
          </div>
          {cycleWeek>=5&&<div style={{background:'#fef3c7',border:'1px solid #f59e0b',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#92400e'}}>Weight increase week! Targets are +5 lbs from your last session.</div>}
          {cycleWeek>=3&&cycleWeek<=4&&<div style={{background:'#ecfdf5',border:'1px solid #10b981',borderRadius:'10px',padding:'10px 14px',marginBottom:'16px',fontSize:'13px',color:'#065f46'}}>Rep increase week! Targeting +2 extra reps per set.</div>}
          <div style={{background:'#f9fafb',borderRadius:'12px',marginBottom:'20px'}}>
            {circuit.exercises.map((ex,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:i<circuit.exercises.length-1?'1px solid #e5e7eb':'none'}}>
                <div style={{width:'26px',height:'26px',borderRadius:'50%',background:circuit.color,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:'700',flexShrink:0}}>{i+1}</div>
                <div style={{marginLeft:'12px',flex:1}}>
                  <div style={{fontWeight:'600',fontSize:'14px',color:'#1f2937'}}>{ex.name}</div>
                  <div style={{color:'#9ca3af',fontSize:'11px'}}>{ex.muscles}</div>
                </div>
                <div style={{textAlign:'right',fontSize:'13px'}}>
                  <div style={{fontWeight:'700',color:'#374151'}}>{ex.sets}x{getTargetReps(ex)}</div>
                  <div style={{color:'#6b7280'}}>{getTargetWeight(ex)} lbs</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={()=>{
            const sw={};circuit.exercises.forEach(ex=>{sw[ex.name]=getTargetWeight(ex);});
            setMachineSessionWeights(sw);setMachineExerciseIdx(0);setMachineSetIdx(0);
            setMachinePhase('exercise');setMachineSetsLog([]);setMachineTimerActive(false);setMachineTimer(0);
            setMachineCircuitView('session');
          }} style={{width:'100%',padding:'16px',background:circuit.color,color:'white',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer'}}>
            Start Circuit
          </button>
          <button onClick={()=>setMachineCircuitView('select')} style={{width:'100%',marginTop:'10px',padding:'12px',background:'none',border:'1px solid #e5e7eb',borderRadius:'10px',color:'#6b7280',cursor:'pointer',fontSize:'14px'}}>Back</button>
        </div>
      );
    }

    if(machineCircuitView==='session'&&circuit){
      const ex=circuit.exercises[machineExerciseIdx];
      const prevEx=circuit.exercises[machineExerciseIdx-1];
      const nextEx=circuit.exercises[machineExerciseIdx+1];
      if(!ex) return null;
      const sessionWeight=machineSessionWeights[ex.name]!=null?machineSessionWeights[ex.name]:getTargetWeight(ex);
      const targetReps=getTargetReps(ex);
      return(
        <div style={{padding:'16px'}}>
          <div style={{marginBottom:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'6px'}}>
              <span style={{color:circuit.color,fontWeight:'700'}}>{circuit.emoji} {circuit.name}</span>
              <span style={{color:'#6b7280'}}>Exercise {machineExerciseIdx+1}/{circuit.exercises.length}</span>
            </div>
            <div style={{background:'#e5e7eb',borderRadius:'999px',height:'6px'}}>
              <div style={{background:circuit.color,height:'6px',borderRadius:'999px',width:((machineExerciseIdx/circuit.exercises.length)*100)+'%',transition:'width 0.4s ease'}}/>
            </div>
          </div>
          {machinePhase==='exercise'&&(
            <div>
              <div style={{background:'white',borderRadius:'16px',padding:'20px',boxShadow:'0 2px 12px rgba(0,0,0,0.08)',marginBottom:'16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                  <div style={{flex:1,paddingRight:'12px'}}>
                    <div style={{fontWeight:'800',fontSize:'20px',color:'#111827',lineHeight:'1.2'}}>{ex.name}</div>
                    <div style={{fontSize:'13px',color:circuit.color,fontWeight:'600',marginTop:'4px'}}>{ex.muscles}</div>
                  </div>
                  <div style={{background:circuit.color+'15',borderRadius:'12px',padding:'10px 16px',textAlign:'center',flexShrink:0}}>
                    <div style={{fontSize:'11px',color:'#6b7280'}}>Set</div>
                    <div style={{fontSize:'24px',fontWeight:'800',color:circuit.color,lineHeight:'1'}}>{machineSetIdx+1}/{ex.sets}</div>
                  </div>
                </div>
                <div style={{background:'#f9fafb',borderRadius:'10px',padding:'12px',marginBottom:'16px',fontSize:'13px',color:'#374151',lineHeight:'1.5'}}>{ex.instructions}</div>
                <div style={{display:'flex',gap:'12px'}}>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'#9ca3af',marginBottom:'6px'}}>Weight (lbs)</div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
                      <button onClick={()=>setMachineSessionWeights(w=>({...w,[ex.name]:Math.max(0,(w[ex.name]!=null?w[ex.name]:getTargetWeight(ex))-5)}))} style={{width:'34px',height:'34px',borderRadius:'50%',border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:'20px',color:'#374151'}}>-</button>
                      <input type="number" value={sessionWeight} onChange={e=>setMachineSessionWeights(w=>({...w,[ex.name]:parseInt(e.target.value)||0}))} style={{width:'68px',textAlign:'center',border:'2px solid '+circuit.color,borderRadius:'8px',padding:'6px 4px',fontSize:'22px',fontWeight:'700',color:'#111827'}}/>
                      <button onClick={()=>setMachineSessionWeights(w=>({...w,[ex.name]:(w[ex.name]!=null?w[ex.name]:getTargetWeight(ex))+5}))} style={{width:'34px',height:'34px',borderRadius:'50%',border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:'20px',color:'#374151'}}>+</button>
                    </div>
                  </div>
                  <div style={{flex:1,textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'#9ca3af',marginBottom:'6px'}}>Target Reps</div>
                    <div style={{fontSize:'36px',fontWeight:'800',color:'#111827'}}>{targetReps}</div>
                  </div>
                </div>
              </div>
              <button onClick={handleCompleteSet} style={{width:'100%',padding:'18px',background:circuit.color,color:'white',border:'none',borderRadius:'14px',fontSize:'18px',fontWeight:'700',cursor:'pointer'}}>
                Complete Set {machineSetIdx+1}
              </button>
              {nextEx&&machineSetIdx===ex.sets-1&&<div style={{marginTop:'12px',padding:'10px 14px',background:'#f9fafb',borderRadius:'10px',fontSize:'13px',color:'#6b7280'}}>Next up: <strong style={{color:'#374151'}}>{nextEx.name}</strong></div>}
            </div>
          )}
          {(machinePhase==='set-rest'||machinePhase==='ex-rest')&&(
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{fontSize:'28px'}}>{machinePhase==='set-rest'?'😮':'Done!'}</div>
              <h3 style={{margin:'4px 0 2px',color:'#1f2937'}}>{machinePhase==='set-rest'?`Set ${machineSetIdx} Complete!`:prevEx?prevEx.name:''}</h3>
              <p style={{color:'#6b7280',margin:'0 0 20px',fontSize:'14px'}}>{machinePhase==='set-rest'?`Rest before set ${machineSetIdx+1}`:`${prevEx?prevEx.sets:''} sets complete!`}</p>
              <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',marginBottom:'20px'}}>
                <svg width="140" height="140" style={{transform:'rotate(-90deg)'}}>
                  <circle cx="70" cy="70" r="52" fill="none" stroke="#e5e7eb" strokeWidth="8"/>
                  <circle cx="70" cy="70" r="52" fill="none" stroke={circuit.color} strokeWidth="8" strokeDasharray={(circ*timerProg)+' '+circ} strokeLinecap="round"/>
                </svg>
                <div style={{position:'absolute',textAlign:'center'}}>
                  <div style={{fontSize:'34px',fontWeight:'800',color:'#111827'}}>{mcFmt(machineTimer)}</div>
                  <div style={{fontSize:'11px',color:'#9ca3af'}}>REST</div>
                </div>
              </div>
              <div style={{background:'#f9fafb',borderRadius:'10px',padding:'12px',marginBottom:'20px',fontSize:'13px',color:'#374151'}}>
                {machinePhase==='set-rest'?`Up next: ${ex.name} - Set ${machineSetIdx+1} - ${sessionWeight} lbs x ${targetReps} reps`:`Next: ${ex.name} - ${ex.muscles}`}
              </div>
              <button onClick={handleTimerContinue} style={{padding:'14px 36px',background:machineTimer<=0?circuit.color:'#6b7280',color:'white',border:'none',borderRadius:'12px',fontSize:'16px',fontWeight:'700',cursor:'pointer'}}>
                {machineTimer<=0?'Go!':'Skip Rest'}
              </button>
            </div>
          )}
        </div>
      );
    }

    if(machineCircuitView==='complete'&&circuit){
      const saveWorkout=async()=>{
        const entry={date:new Date().toISOString(),type:'Machine Circuit',circuit:circuit.name,exercises:circuit.exercises.length,sets:machineSetsLog.length,week,rating:machineRating};
        try{const key='atp-workouts-'+currentClient.id;const hist=JSON.parse(localStorage.getItem(key)||'[]');hist.unshift(entry);localStorage.setItem(key,JSON.stringify(hist.slice(0,100)));}catch{}
        try{await sbSetGlobal('atp-machine-'+currentClient.id,entry);}catch{}
        setMachineRating(0);setMachineSetsLog([]);setMachineCircuitView('select');setGymMode('');
      };
      return(
        <div style={{padding:'20px',textAlign:'center'}}>
          <div style={{fontSize:'64px',marginBottom:'8px'}}>🏆</div>
          <h2 style={{margin:'0 0 4px',color:'#1f2937',fontSize:'24px'}}>Circuit Complete!</h2>
          <div style={{fontSize:'20px',marginBottom:'24px'}}>{circuit.emoji} {circuit.name}</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
            {[['Exercises',circuit.exercises.length],['Total Sets',machineSetsLog.length],['Program Week',week],['Progression',cycleWeek>=5?'+5 lbs':cycleWeek>=3?'+2 reps':'Foundation']].map(([label,val])=>(
              <div key={label} style={{background:'#f9fafb',borderRadius:'12px',padding:'16px'}}>
                <div style={{fontSize:'20px',fontWeight:'800',color:'#111827'}}>{val}</div>
                <div style={{fontSize:'12px',color:'#6b7280'}}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#f9fafb',borderRadius:'12px',padding:'16px',marginBottom:'24px',textAlign:'left'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#374151',marginBottom:'10px'}}>Session Summary</div>
            {circuit.exercises.map((ex,i)=>{
              const exSets=machineSetsLog.filter(s=>s.exercise===ex.name);
              const wt=exSets.length?Math.round(exSets.reduce((t,s)=>t+s.weight,0)/exSets.length):getTargetWeight(ex);
              return(<div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:i<circuit.exercises.length-1?'1px solid #e5e7eb':'none',fontSize:'13px'}}>
                <span style={{color:'#374151'}}>{ex.name}</span>
                <span style={{color:'#6b7280'}}>{exSets.length||ex.sets}x{getTargetReps(ex)} @ {wt} lbs</span>
              </div>);
            })}
          </div>
          <div style={{marginBottom:'24px'}}>
            <div style={{fontSize:'15px',fontWeight:'600',color:'#374151',marginBottom:'12px'}}>How was your workout?</div>
            <div style={{display:'flex',justifyContent:'center',gap:'8px'}}>
              {[1,2,3,4,5].map(star=>(
                <button key={star} onClick={()=>setMachineRating(star)} style={{fontSize:'34px',background:'none',border:'none',cursor:'pointer',opacity:machineRating>=star?1:0.25}}>*</button>
              ))}
            </div>
          </div>
          <button onClick={saveWorkout} style={{width:'100%',padding:'16px',background:circuit.color,color:'white',border:'none',borderRadius:'14px',fontSize:'17px',fontWeight:'700',cursor:'pointer'}}>
            Save and Finish
          </button>
        </div>
      );
    }
   return null;
  };
  if(gymMode==="machine") return renderMachineCircuit();
  return null;
}
   
function GroceryTab({currentClient,G,card,iStyle,btnGreen,lbl,nutrition}){
  const GROCERY_KEY="atp-grocery";
  const API_KEY=import.meta.env.VITE_API_KEY||"";
  const macros={protein:Math.round(currentClient.weight*0.7),carbs:75,sugar:25};

  // Phases: "select" | "budget" | "list" | "shop"
  const [phase,setPhase]=useState("select");
  const [loading,setLoading]=useState(false);
  const [groceryList,setGroceryList]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(GROCERY_KEY+"-"+currentClient.id)||"null");}catch{return null;}
  });
  const [checkedItems,setCheckedItems]=useState({});
  const [budget,setBudget]=useState("");
  const [selectedItems,setSelectedItems]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(GROCERY_KEY+"-sel-"+currentClient.id)||"null")||{};}catch{return {};}
  });
  const [customInputs,setCustomInputs]=useState({});
  const [expandedSection,setExpandedSection]=useState("Proteins");

  // Smart memory: scan nutrition logs to detect frequent foods + quantities
  function buildSmartUsuals(){
    const usuals={};
    const clientNutr=nutrition[currentClient.id]||{};
    const allEntries=Object.values(clientNutr).flat().filter(m=>m.meal!=="__water__"&&m.text);
    const counts={};
    allEntries.forEach(entry=>{
      const words=entry.text.toLowerCase();
      PYRAMID_FOODS.forEach(section=>{
        section.items.forEach(food=>{
          const key=food.name.toLowerCase();
          if(words.includes(key)){
            counts[food.name]=(counts[food.name]||0)+1;
          }
        });
      });
    });
    // If logged 4+ times assume they eat it often → flag for quantity boost
    Object.entries(counts).forEach(([name,count])=>{
      if(count>=4) usuals[name]=count;
    });
    return usuals;
  }

  // Upside down pyramid food library
  const PYRAMID_FOODS=[
    {section:"Proteins 🥩",color:"#dc2626",tip:"Foundation of the pyramid — eat most",items:[
      {name:"Steak (ribeye or sirloin)",unit:"lbs",defaultQty:2,perWeek:2},
      {name:"Eggs",unit:"count",defaultQty:12,perWeek:12,smartMultiplier:true},
      {name:"Ground beef (85/15)",unit:"lbs",defaultQty:2,perWeek:2},
      {name:"Chicken thighs",unit:"lbs",defaultQty:3,perWeek:3},
      {name:"Chicken breast",unit:"lbs",defaultQty:2,perWeek:2},
      {name:"Salmon",unit:"lbs",defaultQty:1.5,perWeek:1.5},
      {name:"Tuna (canned)",unit:"cans",defaultQty:4,perWeek:4},
      {name:"Turkey (ground)",unit:"lbs",defaultQty:1,perWeek:1},
      {name:"Shrimp",unit:"lbs",defaultQty:1,perWeek:1},
      {name:"Bacon",unit:"lbs",defaultQty:1,perWeek:1},
      {name:"Greek yogurt (plain)",unit:"cups",defaultQty:7,perWeek:7},
      {name:"Cottage cheese",unit:"oz",defaultQty:16,perWeek:16},
    ]},
    {section:"Produce 🥦",color:"#16a34a",tip:"Leafy greens, non-starchy vegetables",items:[
      {name:"Spinach",unit:"oz",defaultQty:10,perWeek:10},
      {name:"Broccoli",unit:"lbs",defaultQty:2,perWeek:2},
      {name:"Avocado",unit:"count",defaultQty:4,perWeek:4},
      {name:"Bell peppers",unit:"count",defaultQty:4,perWeek:4},
      {name:"Zucchini",unit:"count",defaultQty:3,perWeek:3},
      {name:"Cauliflower",unit:"head",defaultQty:1,perWeek:1},
      {name:"Cucumber",unit:"count",defaultQty:2,perWeek:2},
      {name:"Celery",unit:"bunch",defaultQty:1,perWeek:1},
      {name:"Cabbage",unit:"head",defaultQty:1,perWeek:1},
      {name:"Mushrooms",unit:"oz",defaultQty:8,perWeek:8},
    ]},
    {section:"Dairy & Fats 🥑",color:"#d97706",tip:"Healthy fats — satisfy and nourish",items:[
      {name:"Butter (grass-fed)",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Olive oil",unit:"fl oz",defaultQty:16,perWeek:16},
      {name:"Heavy cream",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Cheddar cheese",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Cream cheese",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Almonds",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Walnuts",unit:"oz",defaultQty:4,perWeek:4},
      {name:"Mozzarella",unit:"oz",defaultQty:8,perWeek:8},
    ]},
    {section:"Pantry & Spices 🧂",color:"#7c3aed",tip:"Flavor without the carbs",items:[
      {name:"Sea salt",unit:"oz",defaultQty:4,perWeek:4},
      {name:"Black pepper",unit:"oz",defaultQty:2,perWeek:2},
      {name:"Garlic (fresh)",unit:"head",defaultQty:2,perWeek:2},
      {name:"Lemon",unit:"count",defaultQty:4,perWeek:4},
      {name:"Apple cider vinegar",unit:"oz",defaultQty:16,perWeek:16},
      {name:"Coconut oil",unit:"oz",defaultQty:8,perWeek:8},
      {name:"Chicken broth",unit:"carton",defaultQty:2,perWeek:2},
      {name:"Canned tomatoes",unit:"can",defaultQty:2,perWeek:2},
    ]},
    {section:"Berries (small amounts) 🍓",color:"#db2777",tip:"Low-sugar fruit — in moderation",items:[
      {name:"Blueberries",unit:"pint",defaultQty:1,perWeek:1},
      {name:"Strawberries",unit:"lbs",defaultQty:1,perWeek:1},
      {name:"Raspberries",unit:"pint",defaultQty:1,perWeek:1},
    ]},
  ];

  // Build smart quantities from nutrition logs
  const smartUsuals=buildSmartUsuals();

  function getSmartQty(item){
    const logged=smartUsuals[item.name]||0;
    if(!logged) return item.defaultQty;
    // Eggs example: if logged 4/day → need 28/week
    const dailyRate=logged/7; // logs are spread across days
    const weeklyNeed=Math.ceil(dailyRate*7);
    return Math.max(item.defaultQty, Math.ceil(weeklyNeed/5)*5||weeklyNeed);
  }

  function toggleItem(section,itemName,qty,unit){
    const key=section+"::"+itemName;
    setSelectedItems(prev=>{
      const updated={...prev};
      if(updated[key]){delete updated[key];}
       else{updated[key]={name:itemName,qty:String(Math.round(qty)||1),unit,section};}     localStorage.setItem(GROCERY_KEY+"-sel-"+currentClient.id,JSON.stringify(updated));
      return updated;
    });
  }

  function updateQty(section,itemName,qty){
    const key=section+"::"+itemName;
    setSelectedItems(prev=>{
      if(!prev[key]) return prev;
      const updated={...prev,[key]:{...prev[key],qty}};
      localStorage.setItem(GROCERY_KEY+"-sel-"+currentClient.id,JSON.stringify(updated));
      return updated;
    });
  }

  function addCustomItem(section){
    const val=(customInputs[section]||"").trim();
    if(!val) return;
    const key=section+"::"+val;
    setSelectedItems(prev=>{
      const updated={...prev,[key]:{name:val,qty:"1",unit:"item",section,custom:true}};
      localStorage.setItem(GROCERY_KEY+"-sel-"+currentClient.id,JSON.stringify(updated));
      return updated;
    });
    setCustomInputs(p=>({...p,[section]:""}));
  }

  const selectedCount=Object.keys(selectedItems).length;

  async function generateList(){
    if(selectedCount===0){alert("Please select at least a few items first.");return;}
    setLoading(true);
    try{
      const itemList=Object.values(selectedItems).map(i=>`${i.name} — ${i.qty} ${i.unit}`).join("\n");
      const prompt=`You are a frugal Christian health coach helping a client grocery shop. The client follows the Upside Down Food Pyramid (high protein, healthy fats, low carbs/sugar).

Client's macro targets: ${macros.protein}g protein/day, under ${macros.carbs}g carbs/day, under ${macros.sugar}g sugar/day.
Weekly budget: $${budget||"100"}

Client selected these items:
${itemList}

Your job:
1. Use ONLY the items the client selected — do NOT add any items they did not choose.
2. Keep the quantities as specified unless a quantity makes no sense (e.g. round eggs up to nearest carton of 12).
3. Estimate a realistic price for each item at a regular grocery store.
4. DO NOT spend their entire budget. Show them that eating healthy can be CHEAPER than junk food. Aim to come in 15-25% UNDER budget if possible.
5. Give a savings message celebrating how much they saved vs budget AND vs a typical week of fast food.
6. Organize by store section.

Return ONLY valid JSON, no markdown:
{
  "sections": [
    {"name":"Proteins","items":[{"item":"Chicken breast","quantity":"3 lbs","est":"$9.00"}]},
    {"name":"Produce","items":[]}
  ],
  "totalEstimate": "$74",
  "budgetGiven": "$${budget||100}",
  "savings": "$26",
  "savingsMessage": "You saved $26 vs your budget — proof that eating clean costs LESS than a week of fast food!",
  "tip": "One sentence faith-based encouragement about nourishing the temple God gave you."
}`;

      const res=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"content-type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:2000,messages:[{role:"user",content:prompt}]})
      });
      const data=await res.json();
      const raw=data.content?.[0]?.text||"{}";
      const clean=raw.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      setGroceryList(parsed);
      setCheckedItems({});
      localStorage.setItem(GROCERY_KEY+"-"+currentClient.id,JSON.stringify(parsed));
      setPhase("list");
    }catch(err){console.error(err);alert("Could not generate list. Please try again.");}
    setLoading(false);
  }

  function toggleCheck(sectionName,itemName){
    const key=sectionName+"::"+itemName;
    setCheckedItems(p=>({...p,[key]:!p[key]}));
  }

  function clearAll(){
    setGroceryList(null);setSelectedItems({});setCheckedItems({});setBudget("");setPhase("select");
    localStorage.removeItem(GROCERY_KEY+"-"+currentClient.id);
    localStorage.removeItem(GROCERY_KEY+"-sel-"+currentClient.id);
  }

  // ── PHASE: SELECT ──
  if(phase==="select") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:"linear-gradient(135deg,#5b21b6,#7c3aed)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🛒 Grocery Planner</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>What do you need this week?</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>Tap items from each section of the Upside Down Pyramid. Smart quantities are pre-filled based on your eating habits.</div>
      </div>

      {selectedCount>0&&(
        <div style={{position:"sticky",top:0,zIndex:20,background:"linear-gradient(135deg,#059669,#10b981)",borderRadius:12,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 4px 14px rgba(16,185,129,.3)"}}>
          <div style={{fontSize:"0.78rem",fontWeight:700,color:"#fff"}}>✓ {selectedCount} item{selectedCount!==1?"s":""} selected</div>
          <button onClick={()=>setPhase("budget")} style={{padding:"7px 14px",borderRadius:20,border:"none",background:"#fff",color:"#059669",fontSize:"0.74rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Next: Set Budget →</button>
        </div>
      )}

      {PYRAMID_FOODS.map((sec,si)=>{
        const isOpen=expandedSection===sec.section;
        const sectionSelected=Object.values(selectedItems).filter(i=>i.section===sec.section).length;
        return(
          <div key={si} style={{...card,overflow:"hidden",border:`1.5px solid ${isOpen?sec.color+"66":G.border}`}}>
            <button onClick={()=>setExpandedSection(isOpen?null:sec.section)} style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",background:"transparent",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:sec.color,flexShrink:0}}/>
                <div style={{textAlign:"left"}}>
                  <div style={{fontSize:"0.82rem",fontWeight:700,color:isOpen?sec.color:G.text}}>{sec.section}</div>
                  <div style={{fontSize:"0.62rem",color:G.textSoft,fontStyle:"italic"}}>{sec.tip}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                {sectionSelected>0&&<div style={{fontSize:"0.64rem",padding:"2px 8px",borderRadius:20,background:sec.color+"22",color:sec.color,fontWeight:700}}>{sectionSelected} selected</div>}
                <div style={{fontSize:"0.75rem",color:isOpen?sec.color:G.textSoft,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>▼</div>
              </div>
            </button>

            {isOpen&&(
              <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${G.border}`}}>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.items.map((item,ii)=>{
                    const key=sec.section+"::"+item.name;
                    const isSelected=!!selectedItems[key];
                    const smartQty=getSmartQty(item);
                    const isSmart=smartQty!==item.defaultQty;
                    const displayQty=isSelected?selectedItems[key].qty:smartQty;
                    return(
                      <div key={ii} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,background:isSelected?sec.color+"11":G.creamDark,border:`1.5px solid ${isSelected?sec.color+"55":G.border}`,transition:"all .2s"}}>
                        <button onClick={()=>toggleItem(sec.section,item.name,smartQty,item.unit)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${isSelected?sec.color:G.border}`,background:isSelected?sec.color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.8rem",flexShrink:0}}>{isSelected?"✓":""}</button>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"0.76rem",fontWeight:isSelected?700:400,color:isSelected?sec.color:G.text}}>{item.name}</div>
                          {isSmart&&<div style={{fontSize:"0.58rem",color:"#059669",fontWeight:600}}>🧠 Smart qty based on your logs</div>}
                        </div>
                    {isSelected?(
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <button onClick={e=>{e.stopPropagation();const cur=parseFloat(selectedItems[sec.section+"::"+item.name]?.qty)||1;updateQty(sec.section,item.name,String(Math.max(1,cur-1)));}} style={{width:28,height:28,borderRadius:8,border:`2px solid ${sec.color}`,background:"#fff",color:sec.color,fontSize:"1rem",fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>−</button>
                            <div style={{minWidth:32,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:sec.color}}>{displayQty}</div>
                   <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();const cur=parseFloat(selectedItems[sec.section+"::"+item.name]?.qty)||1;updateQty(sec.section,item.name,String(Math.max(1,cur-1)));}} style={{width:32,height:32,borderRadius:8,border:`2px solid ${sec.color}`,background:"#fff",color:sec.color,fontSize:"1.2rem",fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,touchAction:"manipulation"}}>−</button>
                            <div style={{minWidth:36,textAlign:"center",fontSize:"0.88rem",fontWeight:700,color:sec.color}}>{displayQty}</div>
                            <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();const cur=parseFloat(selectedItems[sec.section+"::"+item.name]?.qty)||1;updateQty(sec.section,item.name,String(cur+1));}} style={{width:32,height:32,borderRadius:8,border:`2px solid ${sec.color}`,background:sec.color,color:"#fff",fontSize:"1.2rem",fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,touchAction:"manipulation"}}>+</button>   
                            <span style={{fontSize:"0.62rem",color:G.textSoft}}>{item.unit}</span>
                          </div>
                        ):(
                          <span style={{fontSize:"0.64rem",color:G.textSoft}}>{smartQty} {item.unit}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Custom item add */}
                <div style={{display:"flex",gap:7,marginTop:10}}>
                  <input value={customInputs[sec.section]||""} onChange={e=>setCustomInputs(p=>({...p,[sec.section]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addCustomItem(sec.section)} placeholder={`Add custom ${sec.section.split(" ")[0].toLowerCase()} item...`} style={{...iStyle,flex:1,fontSize:"0.72rem",padding:"7px 10px"}}/>
                  <button onClick={()=>addCustomItem(sec.section)} style={{padding:"7px 12px",borderRadius:9,border:"none",background:sec.color,color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer"}}>+</button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {selectedCount>0&&(
        <button onClick={()=>setPhase("budget")} style={{...btnGreen,background:"linear-gradient(135deg,#5b21b6,#7c3aed)",boxShadow:"0 4px 14px rgba(124,58,237,.3)"}}>
          Next: Set Budget ({selectedCount} items selected) →
        </button>
      )}

      {groceryList&&(
        <button onClick={()=>setPhase("list")} style={{background:"transparent",border:`1px solid ${G.border}`,borderRadius:10,padding:"9px",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
          📋 View saved list
        </button>
      )}
    </div>
  );

  // ── PHASE: BUDGET ──
  if(phase==="budget") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <button onClick={()=>setPhase("select")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0}}>← Back to selections</button>

      <div style={{...card,background:"linear-gradient(135deg,#5b21b6,#7c3aed)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>💰 Set Your Budget</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>How much do you want to spend?</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>AI will try to come in UNDER budget — saving you money while eating healthy.</div>
      </div>

      {/* Selected items summary */}
      <div style={card}>
        <div style={lbl}>Your selected items ({selectedCount})</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:4}}>
          {Object.values(selectedItems).map((item,i)=>(
            <div key={i} style={{fontSize:"0.68rem",padding:"3px 10px",borderRadius:20,background:"#ede9fe",color:"#5b21b6",fontWeight:600}}>
              {item.name} — {item.qty} {item.unit}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={lbl}>Weekly grocery budget ($)</div>
       <input type="text" inputMode="numeric" pattern="[0-9]*" value={budget} onChange={e=>setBudget(e.target.value.replace(/[^0-9]/g,""))} placeholder="e.g. 100" style={{...iStyle,fontSize:"1.1rem",fontWeight:700,textAlign:"center"}}/>
        <div style={{marginTop:10,padding:"10px 12px",background:"#f0fdf4",borderRadius:10,border:"1px solid #bbf7d0"}}>
          <div style={{fontSize:"0.72rem",color:"#15803d",lineHeight:1.7,fontStyle:"italic"}}>
            💡 <strong>Fun fact:</strong> A week of fast food for one person averages $75–$100. A week of high-protein, low-carb groceries? Often under $80 — and your body will thank you. Healthy eating is not expensive. It just takes a plan.
          </div>
        </div>
      </div>

      <button onClick={generateList} disabled={loading||!budget} style={{...btnGreen,background:loading||!budget?"#C4B5FD":"linear-gradient(135deg,#5b21b6,#7c3aed)",boxShadow:"0 4px 14px rgba(124,58,237,.3)",cursor:loading||!budget?"not-allowed":"pointer",opacity:budget?1:0.6}}>
        {loading?"✨ Building your list...":"🛒 Generate My Grocery List"}
      </button>
    </div>
  );

  // ── PHASE: LIST (view + edit) ──
  if((phase==="list"||phase==="shop")&&groceryList) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:8,marginBottom:4}}>
        <button onClick={()=>setPhase("select")} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.68rem",cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit selections</button>
        <button onClick={()=>setPhase(phase==="list"?"shop":"list")} style={{flex:1,padding:"6px 12px",borderRadius:20,border:"none",background:phase==="list"?"linear-gradient(135deg,#059669,#10b981)":"linear-gradient(135deg,#5b21b6,#7c3aed)",color:"#fff",fontSize:"0.68rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
          {phase==="list"?"🛍️ Start Shopping Mode":"📋 Back to List View"}
        </button>
      </div>

      {/* Faith tip */}
      {groceryList.tip&&(
        <div style={{background:"#FFF7ED",border:"1px solid #FED7AA",borderRadius:12,padding:"10px 14px",textAlign:"center",fontSize:"0.74rem",color:"#92400E",fontStyle:"italic",lineHeight:1.6}}>
          ✝️ {groceryList.tip}
        </div>
      )}

      {/* Budget summary */}
      <div style={{...card,background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)",border:"1px solid #6ee7b7"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div>
            <div style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Estimated Total</div>
            <div style={{fontSize:"1.6rem",fontWeight:900,color:"#059669"}}>{groceryList.totalEstimate}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>Your Budget</div>
            <div style={{fontSize:"1.1rem",fontWeight:700,color:G.textSoft}}>{groceryList.budgetGiven||`$${budget}`}</div>
          </div>
        </div>
        {groceryList.savings&&(
          <div style={{padding:"8px 12px",background:"#059669",borderRadius:10,textAlign:"center"}}>
            <div style={{fontSize:"0.78rem",fontWeight:900,color:"#fff"}}>💚 You saved {groceryList.savings} vs your budget!</div>
          </div>
        )}
        {groceryList.savingsMessage&&(
          <div style={{marginTop:8,fontSize:"0.7rem",color:"#065f46",lineHeight:1.6,fontStyle:"italic",textAlign:"center"}}>{groceryList.savingsMessage}</div>
        )}
      </div>

      {/* Shopping list by section */}
      {(groceryList.sections||[]).map((section,i)=>{
        const sectionChecked=section.items.filter(item=>checkedItems[section.name+"::"+item.item]).length;
        const allDone=sectionChecked===section.items.length;
        return(
          <div key={i} style={{...card,opacity:allDone&&phase==="shop"?0.6:1,transition:"opacity .3s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:"0.82rem",color:allDone?"#059669":G.text}}>{allDone&&phase==="shop"?"✓ ":""}{section.name}</div>
              {phase==="shop"&&<div style={{fontSize:"0.62rem",color:G.textSoft}}>{sectionChecked}/{section.items.length}</div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:1}}>
              {(section.items||[]).map((item,j)=>{
                const checkKey=section.name+"::"+item.item;
                const isChecked=!!checkedItems[checkKey];
                return(
                  <div key={j} onClick={()=>phase==="shop"&&toggleCheck(section.name,item.item)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 6px",borderBottom:j<section.items.length-1?"1px solid #F3F4F6":"none",cursor:phase==="shop"?"pointer":"default",opacity:isChecked?0.5:1,transition:"opacity .2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {phase==="shop"&&(
                        <div style={{width:20,height:20,borderRadius:5,border:`2px solid ${isChecked?"#059669":G.border}`,background:isChecked?"#059669":"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.7rem",flexShrink:0}}>{isChecked?"✓":""}</div>
                      )}
                      <span style={{fontSize:"0.78rem",color:G.text,textDecoration:isChecked?"line-through":"none"}}>{item.item}</span>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{color:G.textSoft,fontSize:"0.68rem"}}>{item.quantity}</span>
                      {item.est&&<span style={{fontSize:"0.68rem",fontWeight:700,color:"#059669"}}>{item.est}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button onClick={clearAll} style={{width:"100%",padding:10,background:"#F3F4F6",color:"#6B7280",border:"none",borderRadius:8,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
        🔄 Start New List
      </button>
    </div>
  );

  return null;
}

function AbsTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr}){
  const ABS_KEY="atp-abs";
  const HARDCODED_ABS=[
    {name:"Crunches",instructions:"Lie on back, knees bent. Curl shoulders toward knees, squeeze at top.",level:"Beginning",duration:30},
    {name:"Plank Hold",instructions:"Hold a straight line from head to heels. Keep core tight, breathe.",level:"Beginning",duration:30},
    {name:"Leg Raises",instructions:"Lie flat, legs straight. Raise to 90° slowly, lower without touching floor.",level:"Beginning",duration:30},
    {name:"Bicycle Crunches",instructions:"Alternate elbow to opposite knee in a cycling motion. Slow and controlled.",level:"Intermediate",duration:30},
    {name:"Russian Twists",instructions:"Sit at 45°, feet raised. Rotate torso side to side touching the floor.",level:"Intermediate",duration:30},
    {name:"Mountain Climbers",instructions:"Plank position. Drive knees to chest alternately at a steady pace.",level:"Intermediate",duration:30},
    {name:"Reverse Crunches",instructions:"Lie on back, lift hips off floor by pulling knees toward chest.",level:"Intermediate",duration:30},
    {name:"Heel Touches",instructions:"Lie on back, knees bent. Crunch side to side touching each heel.",level:"Beginning",duration:30},
    {name:"Dead Bug",instructions:"Lie on back, arms up. Extend opposite arm and leg, keep lower back flat.",level:"Intermediate",duration:30},
    {name:"Flutter Kicks",instructions:"Lie flat, legs 6 inches off floor. Alternate small kicks rapidly.",level:"Intermediate",duration:30},
    {name:"V-Ups",instructions:"Lie flat. Simultaneously raise legs and torso to form a V shape.",level:"Advanced",duration:30},
    {name:"Plank to Downward Dog",instructions:"From plank, push hips up to downward dog, return to plank. Repeat.",level:"Intermediate",duration:30},
    {name:"Side Plank Left",instructions:"Balance on left forearm and feet stacked. Keep hips high. Hold.",level:"Intermediate",duration:30},
    {name:"Side Plank Right",instructions:"Balance on right forearm and feet stacked. Keep hips high. Hold.",level:"Intermediate",duration:30},
    {name:"Toe Touches",instructions:"Lie on back, legs straight up. Reach hands toward toes, squeeze abs.",level:"Beginning",duration:30},
    {name:"Scissor Kicks",instructions:"Lie flat, legs raised. Cross legs over each other in a scissor motion.",level:"Intermediate",duration:30},
    {name:"Hollow Body Hold",instructions:"Lie on back, arms overhead, legs straight. Lift both off floor slightly. Hold.",level:"Advanced",duration:30},
    {name:"Ab Wheel Rollout",instructions:"Kneel with ab wheel. Roll forward slowly, engage core, pull back.",level:"Advanced",duration:30},
  ];

  const [absPhase,setAbsPhase]=useState("setup");
  const [absDuration,setAbsDuration]=useState("10 min");
  const [absSession,setAbsSession]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [currentExIdx,setCurrentExIdx]=useState(0);
  const [isRest,setIsRest]=useState(false);
  const [timerSec,setTimerSec]=useState(30);
  const [timerActive,setTimerActive]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [absRating,setAbsRating]=useState(null);
  const [absHistory,setAbsHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(ABS_KEY)||"[]");}catch{return [];}
  });
  const timerRef=useRef(null);

  function playPing(type="tick"){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      if(type==="end"){
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        osc.frequency.setValueAtTime(660,ctx.currentTime+0.15);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.5);
      } else {
        osc.frequency.setValueAtTime(440,ctx.currentTime);
        gain.gain.setValueAtTime(0.2,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.1);
      }
    }catch(e){}
  }

 
  function advanceAbs(){
    if(!absSession) return;
    if(isRest){
      const nextIdx=currentExIdx+1;
      if(nextIdx>=absSession.exercises.length){
        setSessionComplete(true);setTimerActive(false);return;
      }
      setCurrentExIdx(nextIdx);setIsRest(false);setTimerSec(30);
    } else {
      if(currentExIdx<absSession.exercises.length-1){
        setIsRest(true);setTimerSec(15);
      } else {
        setSessionComplete(true);setTimerActive(false);
      }
    }
  }

  function getCurrentWeek(){
    try{const prog=JSON.parse(localStorage.getItem("atp-program")||"{}");return prog[currentClient.id]?.currentWeek||1;}catch{return 1;}
  }

  function getExerciseCount(duration){
    if(duration==="5 min") return 6;
    if(duration==="10 min") return 12;
    return 18;
  }

  async function generateSession(){
    setGenerating(true);
    const weekNum=getCurrentWeek();
    const count=getExerciseCount(absDuration);

    let sheetAbs=[];
    if(sheetData.workouts&&sheetData.workouts.length>0){
      sheetAbs=sheetData.workouts.slice(1).filter(row=>(row[1]||"").toLowerCase().includes("abs")||(row[1]||"").toLowerCase().includes("core")).map(row=>({
        name:row[0]||"",instructions:row[5]||"",level:row[2]||"Beginning",duration:30
      })).filter(e=>e.name);
    } else {
      try{
        const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
        const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        const rows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
              setSheetData(p=>({...p,workouts:rows}));
              setSheetLoaded(true);
              loadedRowsRef.current=rows;
        sheetAbs=rows.slice(1).filter(row=>(row[1]||"").toLowerCase().includes("abs")||(row[1]||"").toLowerCase().includes("core")).map(row=>({
          name:row[0]||"",instructions:row[5]||"",level:row[2]||"Beginning",duration:30
        })).filter(e=>e.name);
      }catch(e){console.error(e);}
    }

const pool=sheetAbs.length>=6?sheetAbs:HARDCODED_ABS;

    // Progressive difficulty by week — week 1 all beginner, ramps up
    const levelWeights=weekNum===1?{Beginning:1,Intermediate:0,Advanced:0}:
      weekNum<=3?{Beginning:0.8,Intermediate:0.2,Advanced:0}:
      weekNum<=4?{Beginning:0.6,Intermediate:0.4,Advanced:0}:
      weekNum<=6?{Beginning:0.3,Intermediate:0.6,Advanced:0.1}:
      weekNum<=8?{Beginning:0.1,Intermediate:0.6,Advanced:0.3}:
      weekNum<=10?{Beginning:0,Intermediate:0.4,Advanced:0.6}:
      {Beginning:0,Intermediate:0.2,Advanced:0.8};

    // Also adjust based on last session rating
    const lastRating=absHistory.length>0?absHistory[absHistory.length-1].rating:3;

    const weighted=[];
    pool.forEach(ex=>{
      let w=levelWeights[ex.level]||0;
      // If too easy last time, boost harder exercises
      if(lastRating<=2&&ex.level==="Advanced") w=Math.min(1,w+0.4);
      if(lastRating<=2&&ex.level==="Beginning") w=Math.max(0,w-0.3);
      // If too hard last time, boost easier exercises
      if(lastRating>=4&&ex.level==="Beginning") w=Math.min(1,w+0.4);
      if(lastRating>=4&&ex.level==="Advanced") w=Math.max(0,w-0.3);
      if(Math.random()<w+0.1) weighted.push(ex);
    });

    // Build 6 unique exercises then repeat for sets
    const shuffled=[...weighted].sort(()=>Math.random()-0.5);
    const base6=shuffled.slice(0,6);
    while(base6.length<6){
      const fallback=HARDCODED_ABS[base6.length%HARDCODED_ABS.length];
      base6.push(fallback);
    }

    // Repeat sets based on duration
    const sets=absDuration==="5 min"?1:absDuration==="10 min"?2:3;
    const selected=[];
    for(let s=0;s<sets;s++) selected.push(...base6.map(ex=>({...ex,set:s+1})));

    setAbsSession({exercises:selected,base6,sets,duration:absDuration,weekNum,lastRating,generatedAt:todayStr()});
    setCurrentExIdx(0);setIsRest(false);setSessionComplete(false);setAbsRating(null);
    setAbsPhase("preview");
    setGenerating(false);
  }

  function startSession(){
    setAbsPhase("active");
    setCurrentExIdx(0);setIsRest(false);
    setTimerSec(30);setTimerActive(true);setSessionComplete(false);
  }

  async function saveSession(rating){
    const entry={date:todayStr(),duration:absDuration,exercises:absSession.exercises.length,weekNum:absSession.weekNum,rating,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...absHistory,entry];
    setAbsHistory(newHistory);
    try{localStorage.setItem(ABS_KEY,JSON.stringify(newHistory));}catch(e){}
    setAbsRating(rating);
  }

  const activeEx=absSession?.exercises[currentExIdx];
  const progressPct=absSession?Math.round((currentExIdx/absSession.exercises.length)*100):0;
  const phase=getCurrentWeek()<=4?"Foundation":getCurrentWeek()<=8?"Build":"Peak";
  const phaseColor=getCurrentWeek()<=4?"#60a5fa":getCurrentWeek()<=8?"#10b981":"#f97316";

  // SETUP
  if(absPhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:"linear-gradient(135deg,#0f766e,#14b8a6)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🔥 Core & Abs</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Week {getCurrentWeek()} — {phase} Phase</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>30 sec on · 15 sec rest · progressive difficulty by week</div>
      </div>

      <div style={card}>
        <div style={lbl}>⏱ How long do you have?</div>
        <div style={{display:"flex",gap:8}}>
          {["5 min","10 min","15 min"].map(t=>(
            <button key={t} onClick={()=>setAbsDuration(t)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${absDuration===t?"#0f766e":G.border}`,background:absDuration===t?"#ccfbf1":G.cream,color:absDuration===t?"#0f766e":G.textSoft,fontSize:"0.78rem",fontWeight:absDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>
              {t}
              <div style={{fontSize:"0.58rem",color:absDuration===t?"#0f766e":G.textSoft,marginTop:2}}>{getExerciseCount(t)} exercises</div>
            </button>
          ))}
        </div>
      </div>

      {absHistory.length>0&&(
        <div style={{...card,background:"#f0fdfa",border:"1px solid #99f6e4"}}>
          <div style={lbl}>📊 Last Session</div>
          <div style={{fontSize:"0.74rem",color:G.text}}>{absHistory[absHistory.length-1].duration} · {fmtDate(absHistory[absHistory.length-1].date)}</div>
          <div style={{fontSize:"0.68rem",color:G.textSoft,marginTop:3}}>Week {absHistory[absHistory.length-1].weekNum} · Rated {absHistory[absHistory.length-1].rating}/5</div>
        </div>
      )}

      <button onClick={generateSession} disabled={generating} style={{...btnGreen,background:generating?"#ccc":"linear-gradient(135deg,#0f766e,#14b8a6)",boxShadow:"0 4px 14px rgba(15,118,110,.3)",opacity:generating?0.7:1}}>
        {generating?"🔥 Building your session...":"🔥 Generate Abs Session"}
      </button>
    </div>
  );

  // PREVIEW
  if(absPhase==="preview"&&absSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:"linear-gradient(135deg,#0f766e,#14b8a6)",border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🔥 Your Session</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>{absDuration} Core Blast — {absSession.sets} set{absSession.sets>1?"s":""} of {absSession.base6?.length||6}</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)"}}>30 sec work · 15 sec rest · same 6 exercises repeated</div>
      </div>
      <div style={card}>
        <div style={lbl}>Today's Exercises</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {absSession.exercises.map((ex,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:G.creamDark,borderRadius:10,borderLeft:`3px solid ${ex.level==="Beginning"?"#60a5fa":ex.level==="Advanced"?"#f97316":"#14b8a6"}`}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:ex.level==="Beginning"?"#60a5fa":ex.level==="Advanced"?"#f97316":"#14b8a6",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:"0.6rem",fontWeight:700,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.76rem",fontWeight:700,color:G.text}}>{ex.name}</div>
                <div style={{fontSize:"0.6rem",color:G.textSoft}}>{ex.level} · 30 sec</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={startSession} style={{...btnGreen,background:"linear-gradient(135deg,#0f766e,#14b8a6)",boxShadow:"0 4px 14px rgba(15,118,110,.3)"}}>▶ Start Session</button>
      <button onClick={()=>setAbsPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
    </div>
  );

  // ACTIVE
  if(absPhase==="active"&&absSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRest?"#f0fdfa":"#f0fdf4"}}>
      <div style={{height:6,background:"#ccfbf1"}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:"linear-gradient(90deg,#0f766e,#14b8a6)",transition:"width .5s"}}/>
      </div>

      {sessionComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#0f766e",textAlign:"center"}}>Core Blast Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! Your core is getting stronger every session. All things are possible! 🙏</div>
          {!absRating?(
            <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your session?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,4,5].map(r=>(
                  <button key={r} onClick={()=>saveSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${absRating===r?"#0f766e":G.border}`,background:absRating===r?"#ccfbf1":G.cream,color:absRating===r?"#0f766e":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                ))}
              </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          ):(
            <button onClick={()=>{setAbsPhase("setup");setSessionComplete(false);setAbsSession(null);}} style={{...btnGreen,background:"linear-gradient(135deg,#0f766e,#14b8a6)"}}>🔥 New Session</button>
          )}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          <div style={{display:"flex",gap:3}}>
            {absSession.exercises.map((_,i)=>(
              <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<currentExIdx?"#14b8a6":i===currentExIdx?"#0f766e":G.border,transition:"background .3s"}}/>
            ))}
          </div>

          <div style={{fontSize:"0.75rem",fontWeight:700,color:isRest?"#14b8a6":"#0f766e",textTransform:"uppercase",letterSpacing:1}}>
            {isRest?"😮‍💨 REST":"🔥 GO"}
          </div>

          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:16}}>
            <div style={{width:180,height:180,borderRadius:"50%",background:isRest?"#ccfbf1":"#f0fdfa",border:`6px solid ${isRest?"#14b8a6":"#0f766e"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 30px ${isRest?"#14b8a644":"#0f766e44"}`}}>
              <div style={{fontSize:"0.7rem",color:isRest?"#14b8a6":"#0f766e",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{isRest?"REST":"BURN"}</div>
              <div style={{fontSize:"4rem",fontWeight:900,color:timerSec<=3?"#f87171":isRest?"#14b8a6":"#0f766e",fontVariantNumeric:"tabular-nums",lineHeight:1}}>{timerSec}</div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>seconds</div>
            </div>

            {!isRest&&activeEx&&(
              <div style={{textAlign:"center",padding:"0 8px"}}>
                <div style={{fontSize:"1.8rem",fontWeight:900,color:G.text,marginBottom:8,lineHeight:1.2}}>{activeEx.name}</div>
                {absSession.sets>1&&<div style={{fontSize:"0.68rem",padding:"2px 12px",borderRadius:20,background:"#ccfbf1",color:"#0f766e",fontWeight:700,display:"inline-block",marginBottom:8}}>Set {activeEx.set} of {absSession.sets}</div>}
                <div style={{fontSize:"0.76rem",color:G.textSoft,lineHeight:1.7,maxWidth:300,margin:"0 auto"}}>{activeEx.instructions}</div>
                <div style={{marginTop:8,fontSize:"0.64rem",color:G.textSoft}}>{currentExIdx+1} of {absSession.exercises.length} total</div>
              </div>
            )}

            {isRest&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#14b8a6",marginBottom:4}}>Breathe! 💚</div>
                <div style={{fontSize:"0.74rem",color:G.textSoft}}>Next: {absSession.exercises[currentExIdx+1]?.name||"Done!"}</div>
              </div>
            )}
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:timerActive?"#0f766e":"#14b8a6",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);advanceAbs();setTimeout(()=>setTimerActive(true),100);}} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}

function HIITTab({currentClient,sheetData,sheetLoaded,setSheetData,setSheetLoaded,SHEETS_ID,G,card,iStyle,btnGreen,btnMango,lbl,todayStr}){
  // Audio ping function
  function playPing(type="tick"){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if(type==="end"){
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        osc.frequency.setValueAtTime(660,ctx.currentTime+0.1);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime+0.4);
      } else if(type==="tick"){
        osc.frequency.setValueAtTime(440,ctx.currentTime);
        gain.gain.setValueAtTime(0.2,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime+0.1);
      } else if(type==="start"){
        osc.frequency.setValueAtTime(660,ctx.currentTime);
        osc.frequency.setValueAtTime(880,ctx.currentTime+0.15);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime+0.4);
      }
    }catch(e){}
  }
  const [hiitPhase,setHiitPhase]=useState("setup");
  const [hiitDuration,setHiitDuration]=useState(currentClient.workoutDuration||"45 min");
  const [hiitType,setHiitType]=useState("boxing");
  const [hiitSession,setHiitSession]=useState(null);
  const [generatingHiit,setGeneratingHiit]=useState(false);
  const [currentBlock,setCurrentBlock]=useState(0);
  const [currentExercise,setCurrentExercise]=useState(0);
  const [timerActive,setTimerActive]=useState(false);
  const [timeLeft,setTimeLeft]=useState(0);
  const [isRest,setIsRest]=useState(false);
  const [sessionComplete,setSessionComplete]=useState(false);
  const [isGloveTime,setIsGloveTime]=useState(false);
 const [hiitRating,setHiitRating]=useState(null);
  const [hiitBpm,setHiitBpm]=useState("");
  const [hiitPhoto,setHiitPhoto]=useState(null);
  const [analyzingHiitPhoto,setAnalyzingHiitPhoto]=useState(false);
  const [hiitPhotoData,setHiitPhotoData]=useState(null);
  const hiitPhotoRef=useRef(null);
  const [hiitHistory,setHiitHistory]=useState(()=>{
    try{ return JSON.parse(localStorage.getItem("atp-hiit")||"[]"); }catch(e){ return []; }
  });
  const hiitTimerRef=useRef(null);

async function analyzeHiitPhoto(file){
    setAnalyzingHiitPhoto(true);
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
            max_tokens:800,
            messages:[{role:"user",content:[
              {type:"image",source:{type:"base64",media_type:mediaType,data:base64}},
              {type:"text",text:`This is a workout heart rate screenshot. Extract all data you can see. Return ONLY valid JSON, no markdown:
{"peakBpm":180,"avgBpm":155,"calories":652,"durationMin":40,"zones":{"zone1":{"bpm":"0-118","minutes":7,"pct":20},"zone2":{"bpm":"119-147","minutes":2,"pct":6},"zone3":{"bpm":"148-160","minutes":10,"pct":27},"zone4":{"bpm":"161-174","minutes":14,"pct":36},"zone5":{"bpm":"175+","minutes":4,"pct":11}},"summary":"One sentence about the workout intensity"}
If any field is not visible set it to null.`}
            ]}]
          })
        });
        const data=await res.json();
        const raw=data.content?.[0]?.text||"{}";
        const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
        setHiitPhotoData(parsed);
        if(parsed.peakBpm) setHiitBpm(String(parsed.peakBpm));
        setAnalyzingHiitPhoto(false);
      };
      reader.readAsDataURL(file);
    }catch(e){console.error(e);setAnalyzingHiitPhoto(false);}
  }

  async function saveHiitSession(rating){
    const entry={
      date:new Date().toISOString().split("T")[0],
      type:hiitSession?.type||"boxing",
      duration:hiitSession?.duration||"45 min",
      blocks:hiitSession?.blocks?.length||0,
      rating,
      bpm:hiitBpm?parseInt(hiitBpm):null,
      calories:hiitPhotoData?.calories||null,
      zones:hiitPhotoData?.zones||null,
      durationMin:hiitPhotoData?.durationMin||null,
      clientId:currentClient.id,
      ts:new Date().toISOString(),
    };
    const newHistory=[...hiitHistory,entry];
    setHiitHistory(newHistory);
    try{
      localStorage.setItem("atp-hiit",JSON.stringify(newHistory));
      await sbSetGlobal("atp-hiit-"+currentClient.id, newHistory);
    }catch(e){}
    setHiitRating(rating);
    try{logWeeklySession("hiit");}catch{}
  }

 useEffect(()=>{
    if(timerActive&&timeLeft>0){
      // Play ping at 3,2,1 seconds
      if(timeLeft<=3&&!isRest) playPing("tick");
      hiitTimerRef.current=setTimeout(()=>setTimeLeft(t=>t-1),1000);
    } else if(timerActive&&timeLeft===0){
      playPing("end");
      advanceHiit();
    }
    return()=>clearTimeout(hiitTimerRef.current);
  },[timerActive,timeLeft]);

function advanceHiit(){
    if(!hiitSession) return;
    const block=hiitSession.blocks[currentBlock];
    if(!block){setSessionComplete(true);setTimerActive(false);return;}

    if(isGloveTime){
      setIsGloveTime(false);
      setIsRest(false);
      const nextBlock=currentBlock+1;
      if(nextBlock>=hiitSession.blocks.length){setSessionComplete(true);setTimerActive(false);return;}
      setCurrentBlock(nextBlock);
      setCurrentExercise(0);
      setTimeLeft(hiitSession.blocks[nextBlock]?.exercises[0]?.duration||20);
      playPing("start");
      return;
    }

    if(isRest){
      const nextEx=currentExercise+1;
      if(nextEx>=block.exercises.length){
        const nextBlock=currentBlock+1;
        if(nextBlock>=hiitSession.blocks.length){setSessionComplete(true);setTimerActive(false);return;}
        setIsRest(true);
        setIsGloveTime(true);
        setTimeLeft(15);
      } else {
        setCurrentExercise(nextEx);
        setIsRest(false);
        setTimeLeft(block.exercises[nextEx].duration);
        playPing("start");
      }
    } else {
      if(block.restBetween>0&&currentExercise<block.exercises.length-1){
        setIsRest(true);
        setIsGloveTime(false);
        setTimeLeft(block.restBetween);
      } else {
        const nextEx=currentExercise+1;
        if(nextEx>=block.exercises.length){
          const nextBlock=currentBlock+1;
          if(nextBlock>=hiitSession.blocks.length){setSessionComplete(true);setTimerActive(false);return;}
          setIsRest(true);
          setIsGloveTime(true);
          setTimeLeft(15);
        } else {
          setCurrentExercise(nextEx);
          setIsRest(false);
          setTimeLeft(block.exercises[nextEx].duration);
          playPing("start");
        }
      }
    }
  }

  async function generateHiitSession(){
    setGeneratingHiit(true);
    const c=currentClient;
    let workoutRows=sheetData.workouts||[];
    if(workoutRows.length===0){
      try{
        const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
        const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
        const text=await res.text();
        const json=JSON.parse(text.substring(47).slice(0,-2));
        workoutRows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
        setSheetData(p=>({...p,workouts:workoutRows}));
        setSheetLoaded(true);
      }catch(e){ console.error(e); }
    }

  function getExercises(cats,count){
      const matches=workoutRows.slice(1).filter(row=>cats.some(c=>(row[2]||"").toLowerCase().includes(c.toLowerCase()))).map(row=>({name:row[0],instructions:row[5]||"",duration:60,category:row[2]||row[1]}));
      // Shuffle and pick random exercises so every session is different
      const shuffled=[...matches].sort(()=>Math.random()-0.5);
      return shuffled.slice(0,count);
    }

    const warmupExs=getExercises(["warm-up"],5);
    if(warmupExs.length<5) for(let i=warmupExs.length;i<5;i++) warmupExs.push({name:["Jumping Jacks","High Knees","Arm Circles","Hip Rotations","Light Jog in Place"][i]||"Warm-up",instructions:"Keep it light and easy",duration:60});

   const shadowExs=getExercises(["basic shadow boxing","defensive footwork"],6);
    if(shadowExs.length<6) for(let i=shadowExs.length;i<6;i++) shadowExs.push({name:["Jab-Cross","Slip Left","Slip Right","Bob and Weave","Jab-Cross-Hook","Footwork Drill"][i]||"Shadow Box",instructions:"Stay light on your feet",duration:60});

    const bagExs1=hiitType==="kickboxing"?getExercises(["kickboxing combo"],4):hiitType==="mixed"?getExercises(["kickboxing combo","boxing only"],4):getExercises(["boxing only"],4);
    if(bagExs1.length<4) for(let i=bagExs1.length;i<4;i++) bagExs1.push({name:["Jab-Cross","Power Hook","Body Shots","Uppercut Combo"][i]||"Bag Work",instructions:"Full power!",duration:20});

    const bagExs2=hiitType==="kickboxing"?getExercises(["kickboxing combo"],8).slice(2,6):hiitType==="mixed"?getExercises(["heavy bag combo","kickboxing combo"],8).slice(2,6):getExercises(["heavy bag combo"],8).slice(2,6);
    if(bagExs2.length<4) for(let i=bagExs2.length;i<4;i++) bagExs2.push({name:["Jab-Cross-Hook","Overhand Right","Left Hook Body","Combo Finish"][i]||"Bag Work",instructions:"Mix up your combinations",duration:20});

    const bagExs3=hiitType==="kickboxing"?getExercises(["kickboxing combo"],12).slice(4,8):hiitType==="mixed"?getExercises(["kickboxing combo","power punching"],12).slice(4,8):getExercises(["boxing only","power punching"],12).slice(4,8);
    if(bagExs3.length<4) for(let i=bagExs3.length;i<4;i++) bagExs3.push({name:["Power Jab","Cross-Hook-Cross","Uppercut-Hook","Final Combo"][i]||"Bag Work",instructions:"Push through — last round!",duration:20});

    const cals1=[{name:"Push-Ups",instructions:"Full range of motion",duration:60},{name:"Burpees",instructions:"Explosive jump at the top",duration:60}];
    const cals2=[{name:"Mountain Climbers",instructions:"Keep hips level",duration:60},{name:"Jump Squats",instructions:"Land softly",duration:60}];

    const warmdownExs=getExercises(["beginning stretch","intermediate stretch"],5);
    const abExs=[
      {name:"Plank",instructions:"Hold strong — core tight",duration:60},
      {name:"Crunches",instructions:"Focus on the squeeze",duration:60},
      {name:"Leg Raises",instructions:"Control the movement",duration:60},
      {name:"Russian Twists",instructions:"Rotate fully each side",duration:60},
      {name:"Bicycle Crunches",instructions:"Slow and controlled",duration:60},
    ];
    const warmdownFull=[...abExs,...warmdownExs].slice(0,8);

   const mins=parseInt(hiitDuration)||45;
    const blocks=mins<=30?[
      {name:"🔥 Warm-Up",color:"#60a5fa",restBetween:0,exercises:warmupExs.slice(0,5)},
      {name:"🥊 Shadow Boxing",color:G.green,restBetween:20,exercises:shadowExs.slice(0,4)},
      {name:"💥 Heavy Bag Round 1",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs1[0]||{}),name:`Combo 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs1[1]||{}),name:`Combo 2: ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs1[0]||{}),name:`Combined: ${bagExs1[0]?.name||"Jab-Cross"} + ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      {name:"💥 Heavy Bag Round 2",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs2[0]||{}),name:`Combo 1: ${bagExs2[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs2[1]||{}),name:`Combo 2: ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs2[0]||{}),name:`Combined: ${bagExs2[0]?.name||"Jab-Cross"} + ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"🤸 Warm Down & Abs",color:G.greenMid,restBetween:0,exercises:warmdownFull.slice(0,4)},
    ]:mins<=45?[
      {name:"🔥 Warm-Up",color:"#60a5fa",restBetween:0,exercises:warmupExs.slice(0,5)},
      {name:"🥊 Shadow Boxing",color:G.green,restBetween:20,exercises:shadowExs.slice(0,5)},
      {name:"💥 Heavy Bag Round 1",color:G.mangoDeep,restBetween:20,exercises:[
        {...(bagExs1[0]||{}),name:`Combo 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},
        {...(bagExs1[1]||{}),name:`Combo 2: ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs1[0]||{}),name:`Combined: ${bagExs1[0]?.name||"Jab-Cross"} + ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs1[2]||bagExs1[0]||{}),name:`Power: ${bagExs1[2]?.name||"Power Shots"}`,duration:60},
      ]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      {name:"💥 Heavy Bag Round 2",color:G.mangoDeep,restBetween:20,exercises:[
        {...(bagExs2[0]||{}),name:`Combo 1: ${bagExs2[0]?.name||"Jab-Cross"}`,duration:60},
        {...(bagExs2[1]||{}),name:`Combo 2: ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs2[0]||{}),name:`Combined: ${bagExs2[0]?.name||"Jab-Cross"} + ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs2[2]||bagExs2[0]||{}),name:`Power: ${bagExs2[2]?.name||"Power Shots"}`,duration:60},
      ]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals2},
      {name:"💥 Heavy Bag Round 3",color:G.mangoDeep,restBetween:20,exercises:[
        {...(bagExs3[0]||{}),name:`Combo 1: ${bagExs3[0]?.name||"Jab-Cross"}`,duration:60},
        {...(bagExs3[1]||{}),name:`Combo 2: ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs3[0]||{}),name:`Combined: ${bagExs3[0]?.name||"Jab-Cross"} + ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60},
        {...(bagExs3[2]||bagExs3[0]||{}),name:`Power: ${bagExs3[2]?.name||"Power Shots"}`,duration:60},
      ]},
      {name:"⚡ Speed Round",color:"#dc2626",restBetween:15,exercises:(()=>{
        const speedExs=getExercises(["speed punching"],7);
        const LOCKED_FINALE=[
          {name:"Speed Jab",instructions:"Single jab at maximum speed. Snap it out and pull it back fast.",duration:60},
          {name:"Speed Jab-Cross",instructions:"Jab then cross at full speed. Reset immediately and repeat.",duration:60},
          {name:"Speed Jab-Cross-Hook-Lead Body Hook",instructions:"Jab-Cross-Hook then drop and lead body hook. Build to full speed.",duration:60},
          {name:"Speed Jab-Cross-Hook-Lead Body Hook-Rear Body Hook",instructions:"Full 5-punch speed combo. Master the sequence then go full speed!",duration:60},
        ];
        if(speedExs.length>=5){
          const randomExs=speedExs.filter(e=>!LOCKED_FINALE.some(f=>f.name===e.name)).slice(0,3).map(e=>({...e,duration:60}));
          return [...randomExs,...LOCKED_FINALE];
        }
       return [
          {name:"Speed Hooks",instructions:"Rapid fire hooks both hands. Keep elbows tight, rotate hips fast.",duration:60},
          {name:"Speed Cross",instructions:"Fast straight right hand at maximum speed. Reset and repeat.",duration:60},
          {name:"Jab-Jab-Cross-Cross",instructions:"Double jab double cross at full speed. Reset and go again.",duration:60},
          {name:"Speed Jab",instructions:"Single jab at maximum speed. Snap it out and pull it back fast.",duration:60},
          {name:"Speed Jab-Cross",instructions:"Jab then cross at full speed. Reset immediately and repeat.",duration:60},
          {name:"Speed Jab-Cross-Hook-Lead Body Hook",instructions:"Jab-Cross-Hook then drop and lead body hook. Build to full speed.",duration:60},
          {name:"Speed Jab-Cross-Hook-Lead Body Hook-Rear Body Hook",instructions:"Full 5-punch speed combo. Jab-Cross-Hook-Lead Body-Rear Body. Full speed!",duration:60},
        ];
      })()},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      {name:"💥 Heavy Bag Round 5 — Power Finish",color:G.mangoDeep,restBetween:20,exercises:[
        {...(bagExs1[0]||{}),name:`Power 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},
        {...(bagExs2[0]||{}),name:`Power 2: ${bagExs2[0]?.name||"Hook"}`,duration:60},
        {...(bagExs3[0]||{}),name:`Power Finish: ${bagExs3[0]?.name||"Final Combo"}`,duration:60},
        {name:"Last Round — Everything Left",instructions:"Dig deep — give everything you have left in the tank!",duration:60},
      ]},
      {name:"🤸 Warm Down",color:G.greenMid,restBetween:0,exercises:warmdownFull.slice(0,5)},
    ]:mins<=60?[
      {name:"🔥 Warm-Up",color:"#60a5fa",restBetween:0,exercises:warmupExs.slice(0,5)},
      {name:"🥊 Shadow Boxing",color:G.green,restBetween:20,exercises:shadowExs.slice(0,5)},
      {name:"💥 Heavy Bag Round 1",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs1[0]||{}),name:`Combo 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs1[1]||{}),name:`Combo 2: ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs1[0]||{}),name:`Combined: ${bagExs1[0]?.name||"Jab-Cross"} + ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      {name:"💥 Heavy Bag Round 2",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs2[0]||{}),name:`Combo 1: ${bagExs2[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs2[1]||{}),name:`Combo 2: ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs2[0]||{}),name:`Combined: ${bagExs2[0]?.name||"Jab-Cross"} + ${bagExs2[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals2},
      {name:"💥 Heavy Bag Round 3",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs3[0]||{}),name:`Combo 1: ${bagExs3[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs3[1]||{}),name:`Combo 2: ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs3[0]||{}),name:`Combined: ${bagExs3[0]?.name||"Jab-Cross"} + ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:[...cals1,...cals2].slice(0,2)},
      {name:"💥 Heavy Bag Round 4",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs1[0]||{}),name:`Combo 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs1[1]||{}),name:`Combo 2: ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs1[0]||{}),name:`Combined: ${bagExs1[0]?.name||"Jab-Cross"} + ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"🤸 Warm Down & Abs",color:G.greenMid,restBetween:0,exercises:warmdownFull.slice(0,8)},
    ]:[
      {name:"🔥 Warm-Up",color:"#60a5fa",restBetween:0,exercises:warmupExs.slice(0,5)},
      {name:"🥊 Shadow Boxing",color:G.green,restBetween:20,exercises:shadowExs.slice(0,6)},
      {name:"💥 Heavy Bag Round 1",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs1[0]||{}),name:`Combo 1: ${bagExs1[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs1[1]||{}),name:`Combo 2: ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs1[0]||{}),name:`Combined: ${bagExs1[0]?.name||"Jab-Cross"} + ${bagExs1[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals2},
      {name:"💥 Heavy Bag Round 3",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs3[0]||{}),name:`Combo 1: ${bagExs3[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs3[1]||{}),name:`Combo 2: ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs3[0]||{}),name:`Combined: ${bagExs3[0]?.name||"Jab-Cross"} + ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals1},
      {name:"💥 Heavy Bag Round 4",color:G.mangoDeep,restBetween:30,exercises:bagExs2.slice(0,4)},
      {name:"💪 Calisthenics",color:"#a78bfa",restBetween:30,exercises:cals2},
      {name:"💥 Heavy Bag Round 5",color:G.mangoDeep,restBetween:20,exercises:[{...(bagExs3[0]||{}),name:`Combo 1: ${bagExs3[0]?.name||"Jab-Cross"}`,duration:60},{...(bagExs3[1]||{}),name:`Combo 2: ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60},{...(bagExs3[0]||{}),name:`Combined: ${bagExs3[0]?.name||"Jab-Cross"} + ${bagExs3[1]?.name||"Hook-Uppercut"}`,duration:60}]},
      {name:"🤸 Warm Down & Abs",color:G.greenMid,restBetween:0,exercises:warmdownFull},
    ]; 

    setHiitSession({type:hiitType,duration:hiitDuration,blocks,generatedAt:todayStr()});
    setCurrentBlock(0); setCurrentExercise(0); setIsRest(false); setSessionComplete(false);
    setHiitPhase("ready");
    setGeneratingHiit(false);
  }

  function startSession(){
    setHiitPhase("active");
    setCurrentBlock(0); setCurrentExercise(0); setIsRest(false);
    setTimeLeft(60); setTimerActive(true); setSessionComplete(false);
  }

  const totalExercises=hiitSession?hiitSession.blocks.reduce((a,b)=>a+b.exercises.length,0):0;
  const completedExercises=hiitSession?hiitSession.blocks.slice(0,currentBlock).reduce((a,b)=>a+b.exercises.length,0)+currentExercise:0;
  const progressPct=totalExercises>0?Math.round((completedExercises/totalExercises)*100):0;
  const activeBlock=hiitSession?.blocks[currentBlock];
  const activeExercise=activeBlock?.exercises[currentExercise];

  if(hiitPhase==="setup") return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🔥 HIIT Training</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:G.white,marginBottom:4}}>All Things Possible Boxing</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.88)",lineHeight:1.7}}>Warm-up → Shadow Boxing → Heavy Bag Rounds → Calisthenics → Warm Down</div>
      </div>
      <div style={card}>
        <div style={lbl}>🥊 Session Type</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[{id:"boxing",icon:"🥊",label:"Boxing",desc:"Shadow boxing, heavy bag, footwork"},{id:"kickboxing",icon:"🦵",label:"Kickboxing",desc:"Kicks, combos, heavy bag"},{id:"mixed",icon:"🔥",label:"Mixed",desc:"Boxing + kickboxing combined"}].map(t=>(
            <button key={t.id} onClick={()=>setHiitType(t.id)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 13px",borderRadius:10,border:`2px solid ${hiitType===t.id?G.mangoDeep:G.border}`,background:hiitType===t.id?"#fff3e0":G.cream,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
              <span style={{fontSize:"1.5rem"}}>{t.icon}</span>
              <div><div style={{fontSize:"0.8rem",fontWeight:700,color:hiitType===t.id?G.mangoDeep:G.text}}>{t.label}</div><div style={{fontSize:"0.65rem",color:G.textSoft}}>{t.desc}</div></div>
              {hiitType===t.id&&<span style={{marginLeft:"auto",color:G.mangoDeep}}>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <div style={card}>
        <div style={lbl}>⏱ Session Duration</div>
        <div style={{display:"flex",gap:6}}>
          {["30 min","45 min","60 min","90 min"].map(t=>(
            <button key={t} onClick={()=>setHiitDuration(t)} style={{flex:1,padding:"9px 0",borderRadius:10,border:`2px solid ${hiitDuration===t?G.mangoDeep:G.border}`,background:hiitDuration===t?"#fff3e0":G.cream,color:hiitDuration===t?G.mangoDeep:G.textSoft,fontSize:"0.72rem",fontWeight:hiitDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
          ))}
        </div>
      </div>
      <button onClick={generateHiitSession} disabled={generatingHiit} style={{...btnMango,opacity:generatingHiit?0.7:1}}>
        {generatingHiit?"🔥 Building your session...":"🔥 Generate Session"}
      </button>
    </div>
  );

  if(hiitPhase==="ready"&&hiitSession) return(
    <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{...card,background:`linear-gradient(135deg,${G.mangoDeep},${G.mango})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🔥 Your Session</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:G.white,marginBottom:4}}>{hiitDuration} Boxing Workout</div>
        <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.88)"}}>{hiitSession.blocks.length} blocks · {totalExercises} exercises</div>
      </div>
      {hiitSession.blocks.map((block,bi)=>(
        <div key={bi} style={{...card,borderLeft:`4px solid ${block.color}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:"0.78rem",fontWeight:700,color:G.text}}>{block.name}</div>
            <div style={{fontSize:"0.62rem",color:G.textSoft}}>{block.exercises.length} exercises{block.restBetween>0?` · ${block.restBetween}s rest`:""}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4}}>
            {block.exercises.map((ex,ei)=>(
              <div key={ei} style={{fontSize:"0.7rem",color:G.textSoft,display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:5,height:5,borderRadius:"50%",background:block.color,flexShrink:0}}/>
                {ex.name} <span style={{color:G.textSoft,fontSize:"0.62rem"}}>· 1 min</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={startSession} style={btnMango}>▶ Start Session</button>
      <button onClick={()=>setHiitPhase("setup")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Change Settings</button>
    </div>
  );

  if(hiitPhase==="active"&&hiitSession) return(
    <div style={{flex:1,display:"flex",flexDirection:"column",background:isRest?"#f0faf4":activeBlock?activeBlock.color+"11":"#fff"}}>
      <div style={{height:6,background:G.creamDark}}>
        <div style={{height:"100%",width:`${progressPct}%`,background:`linear-gradient(90deg,${G.mangoDeep},${G.mango})`,transition:"width .5s"}}/>
      </div>
      {sessionComplete?(
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
          <div style={{fontSize:"3rem"}}>🏆</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:G.green,textAlign:"center"}}>Session Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Amazing work {currentClient.name.split(" ")[0]}! You completed a full boxing HIIT session. All things are possible! 🙏</div>
  {!hiitRating?(
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
           {/* Workout photo upload */}
                  <div style={{...card,background:"#fff3e0",border:`1px solid ${G.mango}44`,padding:"12px 14px"}}>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:G.mangoDeep,marginBottom:4}}>❤️ Log Heart Rate Data (optional)</div>
                    <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>Upload your watch screenshot — AI reads your zones, BPM and calories automatically!</div>

                    {/* Photo upload button */}
                    {!hiitPhotoData&&(
                      <button onClick={()=>hiitPhotoRef.current?.click()} style={{width:"100%",padding:"12px",borderRadius:12,border:`2px dashed ${G.mango}`,background:"#fff9f0",color:G.mangoDeep,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:4,marginBottom:10}}>
                        <span style={{fontSize:"1.4rem"}}>📸</span>
                        <span>{analyzingHiitPhoto?"✨ Reading your workout data...":"Upload Watch Screenshot"}</span>
                        <span style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:400}}>AI extracts zones, BPM & calories</span>
                      </button>
                    )}
                    <input ref={hiitPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f){setHiitPhoto(URL.createObjectURL(f));analyzeHiitPhoto(f);}}}/>

                    {/* Photo data results */}
                    {hiitPhotoData&&(
                      <div style={{marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <div style={{fontSize:"0.7rem",fontWeight:700,color:G.mangoDeep}}>✅ Data extracted!</div>
                          <button onClick={()=>{setHiitPhotoData(null);setHiitPhoto(null);setHiitBpm("");}} style={{fontSize:"0.62rem",color:G.textSoft,background:"none",border:"none",cursor:"pointer"}}>✕ Remove</button>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                          {[
                            {l:"Peak BPM",v:hiitPhotoData.peakBpm,c:"#dc2626"},
                            {l:"Calories",v:hiitPhotoData.calories,c:G.mangoDeep},
                            {l:"Duration",v:hiitPhotoData.durationMin?`${hiitPhotoData.durationMin}m`:null,c:"#7c3aed"},
                          ].filter(x=>x.v).map((x,i)=>(
                            <div key={i} style={{textAlign:"center",padding:"8px 4px",background:"#fff9f0",borderRadius:8,border:`1px solid ${G.mango}44`}}>
                              <div style={{fontSize:"1rem",fontWeight:900,color:x.c}}>{x.v}</div>
                              <div style={{fontSize:"0.56rem",color:G.textSoft}}>{x.l}</div>
                            </div>
                          ))}
                        </div>
                        {/* Zone bars */}
                        {hiitPhotoData.zones&&(
                          <div style={{display:"flex",flexDirection:"column",gap:4}}>
                            {Object.entries(hiitPhotoData.zones).filter(([,z])=>z?.pct>0).map(([key,z],i)=>{
                              const colors=["#6b7280","#60a5fa","#10b981","#f59e0b","#dc2626"];
                              const labels=["Zone 1","Zone 2","Zone 3","Zone 4","Zone 5"];
                              return(
                                <div key={key} style={{display:"flex",alignItems:"center",gap:6}}>
                                  <div style={{fontSize:"0.58rem",color:colors[i],fontWeight:700,width:40,flexShrink:0}}>{labels[i]}</div>
                                  <div style={{flex:1,height:6,background:"#f3f4f6",borderRadius:3,overflow:"hidden"}}>
                                    <div style={{height:"100%",width:`${z.pct}%`,background:colors[i],borderRadius:3}}/>
                                  </div>
                                  <div style={{fontSize:"0.58rem",color:G.textSoft,width:28,textAlign:"right"}}>{z.pct}%</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Manual BPM fallback */}
                    {!hiitPhotoData&&(
                      <div>
                        <div style={{fontSize:"0.64rem",color:G.textSoft,marginBottom:6,textAlign:"center"}}>— or enter manually —</div>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={hiitBpm||""} onChange={e=>setHiitBpm(e.target.value.replace(/[^0-9]/g,""))} placeholder="e.g. 165" style={{...iStyle,flex:1,fontSize:"1rem",fontWeight:700,textAlign:"center"}}/>
                          <span style={{fontSize:"0.72rem",color:G.textSoft,flexShrink:0}}>BPM</span>
                        </div>
                        {hiitBpm&&currentClient.age&&(()=>{
                          const maxHR=220-parseInt(currentClient.age);
                          const pct=Math.round((parseInt(hiitBpm)/maxHR)*100);
                          const zone=pct>=90?"Zone 5 — Max Effort 🔥":pct>=80?"Zone 4 — Threshold 💪":pct>=70?"Zone 3 — Aerobic ✅":pct>=60?"Zone 2 — Fat Burn 🟡":"Zone 1 — Easy 🟢";
                          const zoneColor=pct>=90?"#dc2626":pct>=80?G.mangoDeep:pct>=70?"#10b981":pct>=60?"#f59e0b":"#6b7280";
                          return(
                            <div style={{marginTop:8,textAlign:"center",fontSize:"0.7rem",fontWeight:700,color:zoneColor}}>
                              {pct}% max HR — {zone}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was your workout?</div>
                  <div style={{display:"flex",gap:6}}>
                    {[1,2,3,4,5].map(r=>(
                      <button key={r} onClick={()=>saveHiitSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${hiitRating===r?G.mangoDeep:G.border}`,background:hiitRating===r?"#fff3e0":G.cream,color:hiitRating===r?G.mangoDeep:G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                    ))}
                  </div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
            </div>
          ):(
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:G.green,marginBottom:12}}>Rating saved — {hiitRating<=2?"We'll push harder next time! 💪":hiitRating===3?"Perfect intensity! 🌟":"We'll adjust for next time 🙏"}</div>
              <button onClick={()=>{setHiitPhase("setup");setSessionComplete(false);setTimerActive(false);setHiitRating(null);setIsGloveTime(false);}} style={btnGreen}>🔄 New Session</button>
            </div>
          )}
        </div>
      ):(
        <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:12}}>
          <div style={{display:"flex",gap:4}}>
            {hiitSession.blocks.map((_,i)=>(
              <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<currentBlock?G.greenMid:i===currentBlock?G.mangoDeep:G.border,transition:"background .3s"}}/>
            ))}
          </div>
         <div style={{fontSize:"0.75rem",fontWeight:700,color:activeBlock?.color||G.text,textTransform:"uppercase",letterSpacing:1}}>{activeBlock?.name}</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:12}}>
            <div style={{width:180,height:180,borderRadius:"50%",background:isGloveTime?"#fff3e0":isRest?"#d8f3dc":activeBlock?.color+"22",border:`6px solid ${isGloveTime?G.mangoDeep:isRest?G.greenMid:activeBlock?.color||G.mango}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 30px ${isGloveTime?G.mangoDeep:isRest?G.greenMid:activeBlock?.color||G.mango}44`}}>
              <div style={{fontSize:"0.7rem",color:isGloveTime?G.mangoDeep:isRest?G.greenMid:activeBlock?.color||G.mango,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>{isGloveTime?"GLOVES":isRest?"REST":"GO"}</div>
              <div style={{fontSize:"4rem",fontWeight:900,color:timeLeft<=3&&!isRest?"#f87171":isGloveTime?G.mangoDeep:isRest?G.greenMid:activeBlock?.color||G.mangoDeep,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{timeLeft}</div>
              <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>seconds</div>
            </div>
{isGloveTime&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"2rem",marginBottom:8}}>🥊</div>
                <div style={{fontSize:"1.6rem",fontWeight:900,color:G.mangoDeep,marginBottom:6}}>Gloves!</div>
                <div style={{fontSize:"0.82rem",color:G.textSoft}}>{hiitSession.blocks[currentBlock+1]?.name||"Next up"}...</div>
              </div>
            )}
           
            {!isRest&&!isGloveTime&&activeExercise&&(
              <div style={{textAlign:"center",paddingHorizontal:8}}>
                <div style={{fontSize:"1.8rem",fontWeight:900,color:G.text,marginBottom:6,lineHeight:1.2,textAlign:"center"}}>{activeExercise.name}</div>
                <div style={{fontSize:"0.76rem",color:G.textSoft,lineHeight:1.7,maxWidth:300,margin:"0 auto"}}>{activeExercise.instructions}</div>
              </div>
            )}
            {isRest&&!isGloveTime&&(
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"1rem",fontWeight:700,color:G.greenMid,marginBottom:4}}>Rest up! 💚</div>
                <div style={{fontSize:"0.76rem",color:G.textSoft}}>Next: {activeBlock?.exercises[currentExercise+1]?.name||hiitSession.blocks[currentBlock+1]?.exercises[0]?.name||"Warm Down"}</div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none"}}>
            {activeBlock?.exercises.map((ex,i)=>(
              <div key={i} style={{flexShrink:0,padding:"4px 10px",borderRadius:20,background:i<currentExercise?G.greenLight:i===currentExercise?activeBlock.color:G.creamDark,border:`1px solid ${i===currentExercise?activeBlock.color:G.border}`,fontSize:"0.62rem",color:i===currentExercise?G.white:G.textSoft,fontWeight:i===currentExercise?700:400}}>{ex.name}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"12px",borderRadius:12,border:"none",background:timerActive?G.mangoDeep:G.green,color:G.white,fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={advanceHiit} style={{padding:"12px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}
function MorningTenTab({currentClient,G,card,iStyle,btnGreen,lbl,todayStr,fmtDate,sheetData,sheetLoaded,fetchSheets,SHEETS_ID,setSheetData,setSheetLoaded}){
  const MORNING_KEY="atp-morning10";
  const STRETCH_STREAK_KEY="atp-stretchstreak";
  const BODY_PARTS=["Leg","Hip","Back","Shoulder/Arm"];
  const COLORS=["#10b981","#3b82f6","#ef4444","#f59e0b","#f97316","#8b5cf6"];
  const [phase,setPhase]=useState("choose");
  const [activityType,setActivityType]=useState(null);
  const [selectedParts,setSelectedParts]=useState([]);
  const [exercises,setExercises]=useState([]);
  const [timerSec,setTimerSec]=useState(600);
  const [timerActive,setTimerActive]=useState(false);
  const [timerDone,setTimerDone]=useState(false);
  const [currentMinute,setCurrentMinute]=useState(0);
  const [sessionComplete,setSessionComplete]=useState(false);
  const timerRef=useRef(null);
  const [stretchHistory,setStretchHistory]=useState(()=>{
    try{return JSON.parse(localStorage.getItem(STRETCH_STREAK_KEY)||"[]");}catch{return[];}
  });

  function getStretchStreak(){
    let streak=0;
    let d=new Date();d.setHours(0,0,0,0);
    for(let i=0;i<60;i++){
      const ds=d.toISOString().split("T")[0];
      if(stretchHistory.some(e=>e.date===ds)){streak++;}
      else if(i>0){break;}
      d.setDate(d.getDate()-1);
    }
    return streak;
  }

  function getWeekNum(){
    const streak=getStretchStreak();
    return Math.floor(streak/7)+1;
  }

  function getMix(weekNum){
    if(weekNum<=2) return{beginning:7,intermediate:3,hard:0};
    if(weekNum<=4) return{beginning:5,intermediate:5,hard:0};
    if(weekNum<=6) return{beginning:3,intermediate:5,hard:2};
    return{beginning:1,intermediate:4,hard:5};
  }

  function getPhaseName(weekNum){
    if(weekNum<=2) return"🌱 Foundation";
    if(weekNum<=4) return"💪 Building";
    if(weekNum<=6) return"🔥 Progressing";
    return"⭐ Advanced";
  }

  function buildExercises(parts){
    const weekNum=getWeekNum();
    const mix=getMix(weekNum);
    let pool=[];
    if(sheetData.workouts&&sheetData.workouts.length>0){
      pool=sheetData.workouts.slice(1).filter(row=>{
        const cat=(row[1]||"").toLowerCase();
        const muscles=(row[6]||"").toLowerCase();
        const matchesPart=parts.some(p=>muscles.includes(p.toLowerCase())||muscles.includes(p.split("/")[0].toLowerCase()));
        const isStretch=cat.includes("stretch");
        return isStretch&&matchesPart;
      }).map(row=>({
        name:row[0]||"",
        level:row[2]||"Beginning Stretch",
        instructions:row[5]||"",
        muscles:row[6]||"",
      }));
    }
    const shuffle=arr=>[...arr].sort(()=>Math.random()-0.5);
    const beginners=shuffle(pool.filter(e=>e.level.toLowerCase().includes("beginning")));
    const intermediates=shuffle(pool.filter(e=>e.level.toLowerCase().includes("intermediate")));
    const hards=shuffle(pool.filter(e=>e.level.toLowerCase().includes("hard")));
    const selected=[
      ...beginners.slice(0,mix.beginning),
      ...intermediates.slice(0,mix.intermediate),
      ...hards.slice(0,mix.hard),
    ];
    // Pad with fallbacks if not enough
    const FALLBACKS=[
      {name:"Neck Side Stretch",instructions:"Tilt ear to shoulder, hold",level:"Beginning Stretch",muscles:"Shoulder/Arm"},
      {name:"Shoulder Rolls",instructions:"Roll shoulders slowly backward 10 times",level:"Beginning Stretch",muscles:"Shoulder/Arm"},
      {name:"Standing Side Bend",instructions:"Reach arm overhead and lean sideways",level:"Beginning Stretch",muscles:"Back"},
      {name:"Seated Forward Fold",instructions:"Reach toward toes with long spine",level:"Beginning Stretch",muscles:"Leg"},
      {name:"Hip Flexor Lunge Stretch",instructions:"Shift weight forward to open hip",level:"Beginning Stretch",muscles:"Hip"},
      {name:"Cat Stretch",instructions:"Round spine upward gently",level:"Beginning Stretch",muscles:"Back"},
      {name:"Cobra Stretch",instructions:"Press chest upward",level:"Beginning Stretch",muscles:"Back"},
      {name:"Butterfly Stretch",instructions:"Press knees gently downward",level:"Beginning Stretch",muscles:"Hip"},
      {name:"Wrist Flexor Stretch",instructions:"Pull fingers back gently",level:"Beginning Stretch",muscles:"Shoulder/Arm"},
      {name:"Ankle Circles",instructions:"Rotate ankle slowly each direction",level:"Beginning Stretch",muscles:"Leg"},
    ];
    while(selected.length<10){
      selected.push(FALLBACKS[selected.length%FALLBACKS.length]);
    }
    return selected.slice(0,10);
  }

  const minuteIndex=9-Math.floor(timerSec/60);
  const currentColor=COLORS[minuteIndex%COLORS.length];
  const currentExercise=exercises[minuteIndex]||null;

  function playBeep(type="tick"){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      if(type==="end"){
        osc.frequency.setValueAtTime(880,ctx.currentTime);
        osc.frequency.setValueAtTime(660,ctx.currentTime+0.2);
        gain.gain.setValueAtTime(0.4,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.6);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.6);
      } else {
        osc.frequency.setValueAtTime(type==="switch"?660:440,ctx.currentTime);
        gain.gain.setValueAtTime(0.3,ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);
        osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.15);
      }
    }catch(e){}
  }

  useEffect(()=>{
    if(!timerActive) return;
    if(timerSec<=0){
      playBeep("end");
      setTimerActive(false);
      setSessionComplete(true);
      // Save to streak
      const entry={date:todayStr(),type:activityType,parts:selectedParts};
      const newHistory=[...stretchHistory.filter(e=>e.date!==todayStr()),entry];
      setStretchHistory(newHistory);
      try{localStorage.setItem(STRETCH_STREAK_KEY,JSON.stringify(newHistory));}catch(e){}
      return;
    }
    // Beep at 3,2,1 before minute switch
    const secsIntoMinute=timerSec%60;
    if(secsIntoMinute===3||secsIntoMinute===2||secsIntoMinute===1){
      playBeep("tick");
    }
    // Beep on minute switch
    if(secsIntoMinute===0&&timerSec<600){
      playBeep("switch");
    }
    timerRef.current=setTimeout(()=>setTimerSec(s=>s-1),1000);
    return()=>clearTimeout(timerRef.current);
  },[timerActive,timerSec]);

  async function startActivity(type){
    setActivityType(type);
    if(type==="stretching"){
      if(!sheetLoaded) await fetchSheets();
      setPhase("pickparts");
    } else {
      setTimerSec(600);setTimerDone(false);setSessionComplete(false);
      setPhase("active");
      setTimeout(()=>setTimerActive(true),300);
    }
  }

  function startStretching(){
    if(selectedParts.length===0) return;
    const exs=buildExercises(selectedParts);
    setExercises(exs);
    setTimerSec(600);setTimerDone(false);setSessionComplete(false);
    setPhase("active");
    setTimeout(()=>setTimerActive(true),300);
  }

  function togglePart(part){
    setSelectedParts(p=>p.includes(part)?p.filter(x=>x!==part):p.length<2?[...p,part]:p);
  }

  const weekNum=getWeekNum();
  const streak=getStretchStreak();
  const todayDone=stretchHistory.some(e=>e.date===todayStr());

  if(phase==="choose") return(
    <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
      <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>☀️ Morning 10</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>How do you want to spend your 10 minutes?</div>
        <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.85)"}}>Start every morning with intention. 🙏</div>
        {streak>0&&<div style={{marginTop:8,fontSize:"0.68rem",color:"rgba(255,255,255,.9)",fontWeight:700}}>🔥 {streak} day streak!</div>}
        {todayDone&&<div style={{marginTop:4,fontSize:"0.66rem",color:"rgba(255,255,255,.8)"}}>✓ Morning 10 complete today!</div>}
      </div>
      {[
        {id:"walk",icon:"🚶",label:"Walk",desc:"10 minutes of movement and fresh air"},
        {id:"quiet",icon:"🤫",label:"Quiet Time",desc:"10 minutes of stillness and peace"},
        {id:"stretching",icon:"🤸",label:"Stretching",desc:`${getPhaseName(weekNum)} — Week ${weekNum} · personalized for you`},
      ].map(a=>(
        <button key={a.id} onClick={()=>startActivity(a.id)} style={{...card,cursor:"pointer",textAlign:"left",width:"100%",display:"flex",alignItems:"center",gap:14,border:`2px solid ${G.greenLight}`,padding:"14px 16px"}}>
          <span style={{fontSize:"2rem"}}>{a.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"0.88rem",fontWeight:700,color:G.green}}>{a.label}</div>
            <div style={{fontSize:"0.7rem",color:G.textSoft,marginTop:2}}>{a.desc}</div>
          </div>
          <span style={{fontSize:"1.2rem",color:G.greenMid}}>→</span>
        </button>
      ))}
    </div>
  );

  if(phase==="pickparts") return(
    <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
      <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:4}}>🤸 Stretching</div>
        <div style={{fontSize:"0.88rem",fontWeight:700,color:"#fff",marginBottom:4}}>Which body part do you want to focus on?</div>
        <div style={{fontSize:"0.7rem",color:"rgba(255,255,255,.85)"}}>Pick up to 2 areas · {getPhaseName(weekNum)} · Week {weekNum}</div>
      </div>
      <div style={card}>
        <div style={lbl}>Focus Area (pick 1 or 2)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {BODY_PARTS.map(part=>{
            const selected=selectedParts.includes(part);
            const icon=part==="Leg"?"🦵":part==="Hip"?"🍑":part==="Back"?"🔙":"💪";
            return(
              <button key={part} onClick={()=>togglePart(part)} style={{padding:"14px 10px",borderRadius:12,border:`2px solid ${selected?G.green:G.border}`,background:selected?"#d8f3dc":G.cream,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                <span style={{fontSize:"1.6rem"}}>{icon}</span>
                <span style={{fontSize:"0.78rem",fontWeight:selected?700:400,color:selected?G.green:G.text}}>{part}</span>
                {selected&&<span style={{fontSize:"0.6rem",color:G.greenMid,fontWeight:700}}>✓ Selected</span>}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={startStretching} disabled={selectedParts.length===0} style={{...btnGreen,opacity:selectedParts.length>0?1:0.5}}>
        🤸 Start My Stretches →
      </button>
      <button onClick={()=>setPhase("choose")} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Back</button>
    </div>
  );

  if(phase==="active") return(
    <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
      {sessionComplete?(
        <div style={{...card,textAlign:"center",padding:"28px 20px",border:`2px solid ${G.greenMid}`}}>
          <div style={{fontSize:"3rem",marginBottom:8}}>🌟</div>
          <div style={{fontSize:"1.1rem",fontWeight:900,color:G.green,marginBottom:6}}>Morning 10 Complete!</div>
          <div style={{fontSize:"0.78rem",color:G.textSoft,lineHeight:1.7,marginBottom:12}}>
            {activityType==="stretching"?"Amazing stretch session! Your body will thank you. 🙏":activityType==="walk"?"Great walk! Movement is medicine. 🙏":"Beautiful quiet time. God is with you. 🙏"}
          </div>
          {streak>0&&<div style={{fontSize:"0.82rem",fontWeight:700,color:G.mango,marginBottom:12}}>🔥 {streak} day streak!</div>}
          <button onClick={()=>{setPhase("choose");setActivityType(null);setSelectedParts([]);setExercises([]);setTimerSec(600);setSessionComplete(false);}} style={{...btnGreen,padding:"10px"}}>← Back to Morning 10</button>
        </div>
      ):(
        <>
          <div style={{height:6,background:G.creamDark,borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((600-timerSec)/600)*100}%`,background:currentColor,transition:"width 1s,background 0.5s",borderRadius:3}}/>
          </div>
          <div style={{...card,background:currentColor+"22",border:`3px solid ${currentColor}`,textAlign:"center",padding:"24px 16px",transition:"border-color 0.5s,background 0.5s"}}>
            <div style={{fontSize:"0.68rem",fontWeight:700,color:currentColor,textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>
              {activityType==="stretching"?`Exercise ${minuteIndex+1} of 10`:activityType==="walk"?"Keep Walking!":"Be Still"}
            </div>
            <div style={{fontSize:"4.5rem",fontWeight:900,color:currentColor,fontVariantNumeric:"tabular-nums",lineHeight:1,marginBottom:8,transition:"color 0.5s"}}>
              {Math.floor(timerSec/60).toString().padStart(2,"0")}:{(timerSec%60).toString().padStart(2,"0")}
            </div>
            {activityType==="stretching"&&currentExercise&&(
              <>
                <div style={{fontSize:"1.6rem",fontWeight:900,color:G.text,marginBottom:6,lineHeight:1.2}}>{currentExercise.name}</div>
                <div style={{fontSize:"0.76rem",color:G.textSoft,lineHeight:1.6,maxWidth:280,margin:"0 auto"}}>{currentExercise.instructions}</div>
                <div style={{marginTop:8,fontSize:"0.62rem",padding:"3px 10px",borderRadius:20,background:currentColor+"33",color:currentColor,fontWeight:700,display:"inline-block"}}>{currentExercise.muscles}</div>
              </>
            )}
            {activityType==="walk"&&(
              <div style={{fontSize:"0.9rem",color:G.textSoft,fontStyle:"italic",marginTop:4}}>
                {["Keep moving! 🚶","You're doing great! 💪","Fresh air, fresh mind 🌿","Almost halfway there! 🙏","God walks beside you ✝️","Keep the pace! 🌟","You've got this! 🔥","Final stretch! 💚","One more minute! 🌈","Done! Amazing work! 🏆"][minuteIndex]||"Keep going!"}
              </div>
            )}
            {activityType==="quiet"&&(
              <div style={{fontSize:"0.9rem",color:G.textSoft,fontStyle:"italic",marginTop:4}}>
                {["Be still and know... 🙏","Breathe in His peace ✝️","Listen for His voice 🕊️","You are not alone 💚","Rest in His presence 🌿","Let go of worry 🌟","He hears your heart ❤️","Peace that surpasses all 🌈","Trust in His plan 🙏","Amen. 🕊️"][minuteIndex]||"Be still..."}
              </div>
            )}
          </div>
          {activityType==="stretching"&&exercises.length>0&&(
            <div style={{display:"flex",gap:3}}>
              {exercises.map((_,i)=>(
                <div key={i} style={{flex:1,height:4,borderRadius:2,background:i<minuteIndex?G.greenMid:i===minuteIndex?currentColor:G.border,transition:"background 0.5s"}}/>
              ))}
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setTimerActive(r=>!r)} style={{flex:1,padding:"13px",borderRadius:12,border:"none",background:timerActive?G.mangoDeep:G.green,color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{timerActive?"⏸ Pause":"▶ Resume"}</button>
            <button onClick={()=>{setTimerActive(false);setPhase("choose");setActivityType(null);setSelectedParts([]);setExercises([]);setTimerSec(600);}} style={{padding:"13px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>✕ Stop</button>
          </div>
        </>
      )}
    </div>
  );

  return null;
}
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
  const [blastWeights,setBlastWeights] = useState({});
  const [blastSession,setBlastSession] = useState(null);
  const [blastPhase,setBlastPhase] = useState("setup");
  const [blastBlockIdx,setBlastBlockIdx] = useState(0);
  const [blastRoundIdx,setBlastRoundIdx] = useState(0);
  const [blastExIdx,setBlastExIdx] = useState(0);
  const [blastIsRest,setBlastIsRest] = useState(false);
  const [blastIsTransition,setBlastIsTransition] = useState(false);
  const [blastTimerSec,setBlastTimerSec] = useState(30);
  const [blastTimerActive,setBlastTimerActive] = useState(false);
  const [blastComplete,setBlastComplete] = useState(false);
  const [blastRating,setBlastRating] = useState(null);
  const [blastHistory,setBlastHistory] = useState(()=>{
    try{return JSON.parse(localStorage.getItem("atp-blast")||"[]");}catch{return [];}
  });
  const blastTimerRef=useRef(null);
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
  const [programTabs,setProgramTabs] = useState([]);
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
  const [favorites,setFavorites]   = useState({});
  const [showFavSetup,setShowFavSetup] = useState(false);
  const [favForm,setFavForm]       = useState({Breakfast:"",Lunch:"",Dinner:"",Snack:""});
  const [editingFavs,setEditingFavs] = useState(false);
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
  const [weeklyGoals,setWeeklyGoals] = useState(()=>{try{return JSON.parse(localStorage.getItem("atp-weekly-goals-"+(currentClient?.id||"guest"))||"null");}catch{return null;}});
  const [weeklyLog,setWeeklyLog] = useState(()=>{try{return JSON.parse(localStorage.getItem("atp-weekly-log-"+(currentClient?.id||"guest"))||"{}");}catch{return{};}});
    const [editingGoals,setEditingGoals] = useState(false);
    const [goalForm,setGoalForm] = useState({gym:0,hiit:0,run:0,cals:0,trx:0,bounce:0});
  // coach
  const [msgDraft,setMsgDraft]     = useState({});
  const [selectedClientCoach,setSelectedClientCoach] = useState(null);
  const [coachAiLoading,setCoachAiLoading] = useState(false);
  const [coachAiAnalysis,setCoachAiAnalysis] = useState("");
  const [coachAiDraft,setCoachAiDraft] = useState("");
  const [coachAiQuestion,setCoachAiQuestion] = useState("");
  const [onboard,setOnboard]       = useState({name:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",passcode:""});
  const [editPasscode,setEditPasscode] = useState({});
  const [aiLoading,setAiLoading]   = useState(false);
  const [aiReply,setAiReply]       = useState("");

  // self registration
  const EQUIPMENT_OPTIONS=["Dumbbells","Resistance bands","Yoga mat","Treadmill","Pull-up bar","Gym membership","No equipment"];
  const DAYS_OF_WEEK=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const WORKOUT_TIMES=["Morning","Afternoon","Evening","No preference"];
 const [selfReg,setSelfReg]       = useState({name:"",email:"",birthday:"",age:"",weight:"",goalWeight:"",goal:"",level:"Beginner",likes:"",equipment:[],equipmentOther:"",workoutDays:[],workoutTime:"Morning",quickMoveDays:[],longRunDay:"",canUpdateSchedule:true,injury:"none",medical:"none",passcode:"",confirmPasscode:"",phone:"",textConsent:false,agreedToTerms:false,agreedAt:""});
  const [selfRegGroup,setSelfRegGroup] = useState(0);
  const [selfRegError,setSelfRegError] = useState("");
  const [tempPasscode,setTempPasscode] = useState({});
  const [clientMsgDraft,setClientMsgDraft] = useState("");
  const [tooltip,setTooltip] = useState({visible:false,text:"",x:0,y:0});
  const [inviteCode,setInviteCode] = useState("ATP2026join");
  const [inviteCodeInput,setInviteCodeInput] = useState("");
  const [editInviteCode,setEditInviteCode] = useState("");
  const [showInactive,setShowInactive] = useState(false);
  const [photoPreview,setPhotoPreview] = useState(null);
  const [photoMacros,setPhotoMacros] = useState(null);
  const [analyzingPhoto,setAnalyzingPhoto] = useState(false);
  const [showPasscodeReveal,setShowPasscodeReveal] = useState({});
  const photoInputRef = useRef(null);
  const [fromHealthBoard,setFromHealthBoard] = useState(false);
  const [toast,setToast] = useState("");
  function showToast(msg){setToast(msg);setTimeout(()=>setToast(""),2500);}

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

        const sbFavs = await sbGetSafe(FAVORITES_KEY);
        const fv = sbFavs || JSON.parse(localStorage.getItem(FAVORITES_KEY)||"null");
        if(fv) setFavorites(fv); 
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
    sbSetGlobal(FAVORITES_KEY, favorites);
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
    showToast("Check-in saved!");
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
// ── WORKOUT SHEET LOOKUP ───────────────────────────────────────────────────
  function getSheetExercises(category, level){
    if(!sheetData.workouts||sheetData.workouts.length===0) return [];
    const catMap={
      "Chest":["Gym Chest"],
      "Back":["Gym Back"],
      "Shoulders":["Gym Shoulders"],
      "Arms (Biceps/Triceps)":["Gym Biceps","Gym Triceps"],
      "Legs":["Gym Legs"],
      "Core/Abs":["Gym Core"],
      "Full Body":["Gym Chest","Gym Shoulders","Gym Legs"],
      "Cardio":["Warm-up","Kickboxing Combo","Heavy Bag Combo"],
      "Stretching":["Beginning Stretch","Intermediate Stretch","Hard Stretch"],
      "Boxing":["Basic Shadow Boxing","Advanced Shadow Boxing","Heavy Bag Combo","Boxing Only","Power Punching","Defensive Footwork","Kickboxing Combo"],
      "HIIT":["Warm-up","Kickboxing Combo","Heavy Bag Combo"],
    };
    const levelMap={
      "Beginner":["Stretch","Warm-up","Gym"],
      "Intermediate":["Stretch","Warm-up","Gym","Shadow Boxing","Heavy Bag"],
      "Advanced":["Stretch","Warm-up","Gym","Shadow Boxing","Heavy Bag","Kickboxing","Boxing"],
    };
    const cats=catMap[category]||[];
    return sheetData.workouts.slice(1).filter(row=>{
      const rowCat=(row[1]||"").toLowerCase();
      const matchesCat=cats.some(c=>rowCat.includes(c.toLowerCase()));
      return matchesCat;
    }).map(row=>({
      name:row[0]||"",
      category:row[1]||"",
      level:row[2]||"",
      duration:row[3]||"",
      equipment:row[4]||"",
      instructions:row[5]||"",
      muscles:row[6]||"",
      progression:row[7]||"none",
    }));
  }

  function getProgressionNote(exercise, weekNum){
    const prog=exercise.progression||"none";
    if(prog==="none") return "Same as week 1 — focus on form and consistency";
    if(prog==="increase gym"){
      const weightWeeks=[3,6,9];
      const repWeeks=[2,4,5,7,8,10,11,12];
      if(weekNum===1) return "Start with a comfortable weight for 6-8 reps";
      if(weightWeeks.includes(weekNum)) return `Increase weight by 5lbs, reset to 6-8 reps`;
      if(repWeeks.includes(weekNum)) return `Add 2 reps from last week`;
    }
    if(prog==="increase reps") return weekNum===1?"Start with comfortable reps":`Add 2 reps from last week`;
    if(prog==="increase time") return weekNum===1?"Hold for starting duration":`Add 10 seconds from last week`;
    if(prog.startsWith("increase time 1x/next:")){
      const next=prog.split("next:")[1]?.trim();
      if(weekNum<=4) return `Add 10 seconds each week`;
      return `Progress to: ${next}`;
    }
    if(prog.startsWith("next:")){
      const next=prog.split("next:")[1]?.trim();
      if(weekNum<=6) return "Master current exercise — focus on form";
      return `Progress to: ${next}`;
    }
    return "Follow coach guidance";
  }

  async function notifyCoachWorkout(clientName, request, found){
    const cid="coach";
    const msg=found
      ?`💪 Workout Update: ${clientName} just requested "${request}" exercises and started their workout!`
      :`⚠️ Workout Alert: ${clientName} requested "${request}" but this category isn't in the library yet. Add exercises to the sheet and let them know to retry!`;
    const newMsgs={...messages};
    // Send to all coach-visible threads — use client ID
    const clientObj=clients.find(c=>c.name===clientName||c.id===currentClient?.id);
    if(clientObj){
      const thread=[...(messages[clientObj.id]||[]),{from:"client-alert",text:msg,ts:new Date().toISOString(),alert:true}];
      const nm={...messages,[clientObj.id]:thread};
      persist(null,null,nm,null,null,null,null,null);
    }
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
      showToast("Meal logged!");
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

    // Load sheet if not loaded
    if(!sheetLoaded) await fetchSheets();

    // Try to match goal to sheet categories
    const goalLower=workoutGoalInput.toLowerCase();
    const categoryGuess=
      goalLower.includes("shoulder")?"Shoulders":
      goalLower.includes("arm")||goalLower.includes("bicep")||goalLower.includes("tricep")?"Arms (Biceps/Triceps)":
      goalLower.includes("chest")?"Chest":
      goalLower.includes("back")?"Back":
      goalLower.includes("leg")||goalLower.includes("squat")?"Legs":
      goalLower.includes("core")||goalLower.includes("ab")?"Core/Abs":
      goalLower.includes("stretch")||goalLower.includes("flexib")?"Stretching":
      goalLower.includes("box")||goalLower.includes("punch")||goalLower.includes("jab")?"Boxing":
      goalLower.includes("cardio")||goalLower.includes("hiit")?"HIIT":
      goalLower.includes("full")||goalLower.includes("total")?"Full Body":null;

    const sheetExercises=categoryGuess?getSheetExercises(categoryGuess,c.level):[];
    const hasSheetData=sheetExercises.length>=3;

    // Notify Maria
    await notifyCoachWorkout(c.name, workoutGoalInput, hasSheetData||!!categoryGuess);

    // If no sheet match — alert and stop
    if(categoryGuess&&!hasSheetData){
      setGeneratingPlan(false);
      setWorkoutGoalInput("");
      alert(`I don't have "${workoutGoalInput}" exercises in the library yet! Your coach has been notified and will add them soon. Check your messages for an update! 🙏`);
      return;
    }

    const exerciseList=hasSheetData
      ?sheetExercises.slice(0,12).map(e=>`${e.name} (${e.muscles}, progression: ${e.progression}, instructions: ${e.instructions})`).join("\n")
      :"Use general fitness exercises appropriate for the client";

    const prompt=`You are a certified personal trainer. Create a specific 7-day weekly workout plan.
CLIENT: ${c.name}, Age: ${c.age}, Weight: ${c.weight}lbs, Level: ${c.level}, Goal: "${workoutGoalInput}"
Equipment: ${c.equipment||c.likes||"general fitness"}
INJURIES: ${c.injury&&c.injury!=="none"?c.injury:"None"}

${hasSheetData?`USE THESE SPECIFIC EXERCISES FROM THE COACH'S LIBRARY:\n${exerciseList}\n\nOnly use exercises from this list. Include sets, reps, rest periods and the exact instructions provided.`:"Be very specific — sets, reps, duration, rest periods, form tips."}

Rest days get light stretching or walking.
Return ONLY valid JSON (no markdown): {"goal":"${workoutGoalInput}","days":[{"day":"Monday","type":"workout","focus":"Focus area","duration":"45 min","exercises":[{"name":"Exercise Name","sets":3,"reps":"10-12","rest":"60 sec","tip":"Form tip"}]},{"day":"Tuesday","type":"rest","focus":"Active Recovery","duration":"20 min","exercises":[{"name":"Light walk","sets":1,"reps":"20 min","rest":"","tip":"Keep it easy"}]}]}`;
    try{
      const raw=await callClaude(prompt);
      const plan=JSON.parse(raw.replace(/```json|```/g,"").trim());
      persist(null,null,null,{...plans,[c.id]:{...plan,generatedAt:todayStr(),intensityLevel:1,fromSheet:hasSheetData,category:categoryGuess}},null,null,null,null);
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

  async function generateWeek(weekNum,goals,avgRating,prevWeekSummary,tabs=[]){
    setGeneratingWeek(true);
    const c=currentClient;
    const phase=getPhase(weekNum);
    const intensity=avgRating<=2?"increase the difficulty — more sets, reps, and intensity":avgRating>=4?"decrease the difficulty — fewer sets, lighter load, more rest":"maintain similar difficulty with natural progression";
    const clientTabs=tabs.length>0?tabs:(program[c.id]?.tabs||[]);
    const tabInstructions=clientTabs.length>0?`
SPECIALIZED TABS: This client uses these tabs: ${clientTabs.map(t=>t==="hiit"?"HIIT/Boxing":t==="gym"?"Gym":t==="cals"?"Calisthenics & Abs":t).join(", ")}.
CRITICAL: The client's goals specify EXACTLY how many days per tab — read the goals carefully and match exactly:
- Goals say "${goals.join(" and ")}"
- Extract the exact number of days for each tab from the goals
- Remaining days get home/bodyweight exercises or rest
For tab days set exercises to ONLY: [{"name":"→ Go to [Tab Name] tab","sets":1,"reps":"Full session","rest":"","tip":"Open the [Tab Name] tab for today's workout"}]
Non-tab days get specific home exercises with sets/reps.`:"";
    const prompt=`You are a certified personal trainer creating Week ${weekNum} of a 12-week progressive fitness program. CLIENT: ${c.name}, Age: ${c.age}, Weight: ${c.weight}lbs, Level: ${c.level}, Equipment: ${c.equipment||c.likes||"general fitness"}, 12-Week Goals: ${goals.filter(g=>g).join(" AND ")}, Phase: ${phase.name} (${phase.desc}), Week: ${weekNum} of 12. ${prevWeekSummary?"Last week: "+prevWeekSummary:""} Adjustment: ${intensity}.${tabInstructions} Create a specific 7-day plan. Return ONLY valid JSON (no markdown): {"week":${weekNum},"phase":"${phase.name}","focus":"Week focus in 5 words","days":[{"day":"Monday","type":"workout","focus":"Focus","duration":"45 min","exercises":[{"name":"Exercise","sets":3,"reps":"10-12","rest":"60 sec","tip":"Form tip"}]},{"day":"Tuesday","type":"rest","focus":"Active Recovery","duration":"20 min","exercises":[{"name":"Light walk","sets":1,"reps":"20 min","rest":"","tip":"Easy pace"}]}]}`;
    try{
      const raw=await callClaude(prompt);
      const weekPlan=JSON.parse(raw.replace(/```json|```/g,"").trim());
      const cid=c.id;
      const existing=program[cid]||{goals,currentWeek:1,weeks:{},startDate:todayStr()};
      const updated={...existing,weeks:{...existing.weeks,[weekNum]:weekPlan},currentWeek:weekNum};
      const newProgram={...program,[cid]:updated};
      setProgram(newProgram);
      try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(newProgram));}catch(e){}
      sbSetGlobal(PROGRAM_KEY, newProgram);
    }catch(e){console.error(e);}
    setGeneratingWeek(false);
  }

 async function startProgram(){
    if(!programGoal1.trim()) return;
    const goals=[programGoal1.trim(),programGoal2.trim()].filter(g=>g);
    const cid=currentClient.id;
    const newProgram={...program,[cid]:{goals,currentWeek:1,weeks:{},startDate:todayStr(),tabs:programTabs||[]}};
    setProgram(newProgram);
    try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(newProgram));}catch(e){}
    sbSetGlobal(PROGRAM_KEY, newProgram);
    await generateWeek(1,goals,3,"",programTabs||[]);
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

const BLAST_GROUPS={
    "Chest":{ 
      weightLabel:"Dumbbell press weight (lbs)", weightPlaceholder:"e.g. 40",
      weights:["chest"],
      blocks:[
        {name:"Chest Superset 1",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Dumbbell Chest Press",instructions:"Lie on bench, dumbbells at chest. Press up explosively, lower slowly. Full range.",scaleKey:"chest",scale:1},
          {name:"Dumbbell Chest Fly",instructions:"Arms wide, slight bend in elbows. Open chest fully, squeeze at top.",scaleKey:"chest",scale:0.7},
        ]},
        {name:"Chest Finisher 1",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Cable Crossover",instructions:"Cables at shoulder height. Pull down and across, squeeze chest hard at center.",scaleKey:"chest",scale:0.5},
        ]},
        {name:"Chest Superset 2",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Incline Dumbbell Press",instructions:"45° incline. Press up and slightly inward. Full stretch at bottom, squeeze at top.",scaleKey:"chest",scale:0.85},
          {name:"Incline Dumbbell Fly",instructions:"Incline bench, arms wide. Feel deep stretch, squeeze chest together at top.",scaleKey:"chest",scale:0.6},
        ]},
        {name:"Chest Finisher 2",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Push-Ups to Failure",instructions:"Hands shoulder width. Lower chest to floor, explode up. Keep going until failure!",scaleKey:null,scale:0},
        ]},
      ]
    },
    "Back":{
      weightLabel:"Bent-over row weight (lbs)", weightPlaceholder:"e.g. 95",
      weights:["back"],
      blocks:[
        {name:"Back Superset 1",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Bent-Over Barbell Row",instructions:"Hinge at hips, back flat. Pull bar to lower chest. Squeeze shoulder blades together.",scaleKey:"back",scale:1},
          {name:"Dumbbell Row",instructions:"One knee on bench. Pull dumbbell to hip, lead with elbow. Full stretch down.",scaleKey:"back",scale:0.55},
        ]},
        {name:"Back Finisher 1",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Lat Pulldown",instructions:"Wide grip, pull bar to upper chest. Lean back slightly. Feel the lats stretch fully.",scaleKey:"back",scale:0.85},
        ]},
        {name:"Back Superset 2",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Seated Cable Row",instructions:"Sit tall, pull handle to abdomen. Squeeze at end, slow controlled return.",scaleKey:"back",scale:0.9},
          {name:"Face Pull",instructions:"Cable at face height. Pull to forehead, elbows high and wide. External rotation.",scaleKey:"back",scale:0.35},
        ]},
        {name:"Back Finisher 2",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Straight Arm Pulldown",instructions:"Arms straight, pull cable from overhead to hips. Lat isolation. Slow and controlled.",scaleKey:"back",scale:0.3},
        ]},
      ]
    },
    "Shoulders":{
      weightLabel:"Dumbbell shoulder press weight (lbs)", weightPlaceholder:"e.g. 35",
      weights:["shoulders"],
      blocks:[
        {name:"Shoulder Superset 1",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Dumbbell Shoulder Press",instructions:"Press dumbbells overhead, lock out at top. Lower to ear level. Control descent.",scaleKey:"shoulders",scale:1},
          {name:"Lateral Raise",instructions:"Slight bend in elbows. Raise arms to shoulder height. Lead with elbows not hands.",scaleKey:"shoulders",scale:0.25},
        ]},
        {name:"Shoulder Finisher 1",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Arnold Press",instructions:"Start palms facing you, rotate outward as you press overhead. Full rotation each rep.",scaleKey:"shoulders",scale:0.85},
        ]},
        {name:"Shoulder Superset 2",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Front Raise",instructions:"Alternating arms. Raise to eye level, keep slight bend. Control the descent slowly.",scaleKey:"shoulders",scale:0.25},
          {name:"Rear Delt Fly",instructions:"Bent over. Raise elbows out and up, squeeze rear delts hard. Slow and controlled.",scaleKey:"shoulders",scale:0.2},
        ]},
        {name:"Shoulder Finisher 2",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Upright Row",instructions:"Narrow grip, pull bar up to chin height. Elbows flare high and wide above hands.",scaleKey:"shoulders",scale:0.65},
        ]},
      ]
    },
    "Arms (Biceps/Triceps)":{
      weightLabel:null,
      weights:["bicep","tricep"],
      weightLabels:{bicep:"Dumbbell curl weight (lbs)",tricep:"Tricep extension weight (lbs)"},
      weightPlaceholders:{bicep:"e.g. 25",tricep:"e.g. 30"},
      blocks:[
        {name:"Bicep Superset",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Straight Bar Curl",instructions:"Stand, curl bar from hips to shoulders. Squeeze hard at top. Elbows stay fixed.",scaleKey:"bicep",scale:1},
          {name:"Hammer Curl",instructions:"Neutral grip, thumbs up. Curl dumbbells alternating. Control the descent fully.",scaleKey:"bicep",scale:0.9},
        ]},
        {name:"Bicep Finisher",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Behind the Back Cable Curl",instructions:"Cable behind you at lowest setting. Curl forward. Stretch is incredible — feel it!",scaleKey:"bicep",scale:0.7},
        ]},
        {name:"Tricep Superset",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Cable Pushdown",instructions:"Push down, lock out at bottom. Keep elbows pinned tight to sides throughout.",scaleKey:"tricep",scale:1},
          {name:"Overhead Tricep Extension",instructions:"Hold dumbbell overhead with both hands. Lower behind head slowly, extend fully.",scaleKey:"tricep",scale:0.9},
        ]},
        {name:"Tricep Finisher",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Skull Crushers",instructions:"Lie on bench, lower bar to forehead. Extend arms fully. Control the weight down.",scaleKey:"tricep",scale:0.85},
        ]},
      ]
    },
    "Legs":{
      weightLabel:"Squat weight (lbs)", weightPlaceholder:"e.g. 135",
      weights:["legs"],
      blocks:[
        {name:"Quad Superset",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Barbell Squat",instructions:"Bar on traps. Sit back and down, chest up. Drive through heels to stand explosively.",scaleKey:"legs",scale:1},
          {name:"Walking Lunges",instructions:"Step forward, lower back knee near floor. Drive front heel to stand. Alternate legs.",scaleKey:"legs",scale:0.25},
        ]},
        {name:"Leg Finisher 1",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Leg Press",instructions:"Feet shoulder width. Lower to 90°, press through heels. Do not lock out knees.",scaleKey:"legs",scale:1.8},
        ]},
        {name:"Posterior Chain Superset",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Romanian Deadlift",instructions:"Slight knee bend. Hinge at hips, bar drags down legs. Feel hamstring stretch deeply.",scaleKey:"legs",scale:0.85},
          {name:"Leg Curl",instructions:"Lie on machine. Curl heels to glutes, squeeze at top. Slow controlled descent.",scaleKey:"legs",scale:0.45},
        ]},
        {name:"Leg Finisher 2",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Calf Raises",instructions:"Stand on edge, full range. Rise to toes, hold 1 sec, lower fully. Feel the burn!",scaleKey:"legs",scale:1.2},
        ]},
      ]
    },
    "Core/Abs":{
      weightLabel:null,
      weights:[],
      blocks:[
        {name:"Core Superset 1",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Crunches",instructions:"Lie on back, knees bent. Curl shoulders toward knees, squeeze abs hard at top.",scaleKey:null,scale:0},
          {name:"Leg Raises",instructions:"Lie flat, legs straight. Raise to 90° slowly, lower without touching the floor.",scaleKey:null,scale:0},
        ]},
        {name:"Core Finisher 1",type:"finisher",duration:8,workSec:45,restSec:30,exercises:[
          {name:"Plank Hold",instructions:"Hold a straight line from head to heels. Core tight, breathe steadily. Don't quit!",scaleKey:null,scale:0},
        ]},
        {name:"Core Superset 2",type:"superset",duration:7,restBetween:0,restAfterPair:30,exercises:[
          {name:"Russian Twists",instructions:"Sit at 45°, feet raised. Rotate torso side to side touching the floor each rep.",scaleKey:null,scale:0},
          {name:"Bicycle Crunches",instructions:"Alternate elbow to opposite knee in cycling motion. Slow and fully controlled.",scaleKey:null,scale:0},
        ]},
        {name:"Core Finisher 2",type:"finisher",duration:6,workSec:45,restSec:30,exercises:[
          {name:"Flutter Kicks",instructions:"Lie flat, legs 6 inches off floor. Alternate small rapid kicks. Core stays tight!",scaleKey:null,scale:0},
        ]},
      ]
    },
  };
  function buildBlastSession(group, weightInputs){
    const g=BLAST_GROUPS[group];
    if(!g) return null;
    const blocks=g.blocks.map(block=>({
      ...block,
      exercises:block.exercises.map(ex=>{
        const w=ex.scaleKey?parseFloat(weightInputs[ex.scaleKey]||0):0;
        const scaled=w>0?Math.round((w*ex.scale)/5)*5:0;
        return{...ex,weight:scaled,weightLabel:scaled>0?`${scaled} lbs`:"Bodyweight"};
      })
    }));
    return{group,blocks,weightInputs,totalMin:30,generatedAt:todayStr()};
  }

  useEffect(()=>{
    if(blastTimerActive&&blastTimerSec>0){
      if(blastTimerSec<=3){
        try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(440,ctx.currentTime);gain.gain.setValueAtTime(0.2,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.1);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.1);}catch(e){}
      }
      blastTimerRef.current=setTimeout(()=>setBlastTimerSec(s=>s-1),1000);
    } else if(blastTimerActive&&blastTimerSec===0){
      try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);osc.frequency.setValueAtTime(880,ctx.currentTime);osc.frequency.setValueAtTime(660,ctx.currentTime+0.15);gain.gain.setValueAtTime(0.3,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);osc.start(ctx.currentTime);osc.stop(ctx.currentTime+0.5);}catch(e){}
      advanceBlast();
    }
    return()=>clearTimeout(blastTimerRef.current);
  },[blastTimerActive,blastTimerSec,blastIsRest,blastIsTransition]);

  function advanceBlast(){
    if(!blastSession) return;
    const block=blastSession.blocks[blastBlockIdx];
    if(!block){setBlastComplete(true);setBlastTimerActive(false);return;}

    if(blastIsTransition){
      // Transition done — start next block
      setBlastIsTransition(false);
      setBlastIsRest(false);
      setBlastExIdx(0);
      setBlastRoundIdx(0);
      const nextBlock=blastSession.blocks[blastBlockIdx];
      setBlastTimerSec(nextBlock.type==="superset"?30:nextBlock.workSec||45);
      return;
    }

    if(blastIsRest){
      // Rest done
      if(block.type==="superset"){
        // After pair rest — start next round or next block
        const nextRound=blastRoundIdx+1;
        const blockDurationSec=block.duration*60;
        const roundDuration=30+30+30; // ex1+ex2+rest
        const roundsDone=(nextRound)*roundDuration;
        if(roundsDone>=blockDurationSec){
          // Block done — transition
          const nextBlockIdx=blastBlockIdx+1;
          if(nextBlockIdx>=blastSession.blocks.length){setBlastComplete(true);setBlastTimerActive(false);return;}
          setBlastBlockIdx(nextBlockIdx);
          setBlastIsRest(false);
          setBlastIsTransition(true);
          setBlastTimerSec(60);
        } else {
          setBlastRoundIdx(nextRound);
          setBlastExIdx(0);
          setBlastIsRest(false);
          setBlastTimerSec(30);
        }
      } else {
        // Finisher rest done — next set or next block
        const nextRound=blastRoundIdx+1;
        const blockDurationSec=block.duration*60;
        const setDuration=(block.workSec||45)+(block.restSec||30);
        const setsDone=nextRound*setDuration;
        if(setsDone>=blockDurationSec){
          const nextBlockIdx=blastBlockIdx+1;
          if(nextBlockIdx>=blastSession.blocks.length){setBlastComplete(true);setBlastTimerActive(false);return;}
          setBlastBlockIdx(nextBlockIdx);
          setBlastIsRest(false);
          setBlastIsTransition(true);
          setBlastTimerSec(60);
        } else {
          setBlastRoundIdx(nextRound);
          setBlastIsRest(false);
          setBlastTimerSec(block.workSec||45);
        }
      }
    } else {
      // Exercise done
      if(block.type==="superset"){
        const nextEx=blastExIdx+1;
        if(nextEx<block.exercises.length){
          // Move to next exercise in superset — no rest
          setBlastExIdx(nextEx);
          setBlastTimerSec(30);
        } else {
          // Superset pair done — rest
          setBlastIsRest(true);
          setBlastTimerSec(30);
        }
      } else {
        // Finisher — rest after each set
        setBlastIsRest(true);
        setBlastTimerSec(block.restSec||30);
      }
    }
  }

  async function saveBlastSession(rating){
    const entry={date:todayStr(),group:blastSession.group,rating,weights:blastSession.weightInputs,clientId:currentClient.id,ts:new Date().toISOString()};
    const newHistory=[...blastHistory,entry];
    setBlastHistory(newHistory);
    try{localStorage.setItem("atp-blast",JSON.stringify(newHistory));}catch(e){}
    setBlastRating(rating);
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
- ONLY show THIS WEEK'S prescription — no future weeks, no progressions mentioned
- ALL weights must be in 5lb increments ONLY (e.g. 25, 30, 35, 40, 45) — never use 27.5, 32.5 or any non-5lb increment
- Rest periods between 60-90 seconds

Return ONLY valid JSON array (no markdown):
[{"id":"ex1","icon":"💪","label":"Exercise Name","unit":"reps","defaultAmt":10,"instruction":"3 sets x 10 reps @ 45lbs — rest 60 sec — form tip here"}]`
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
useEffect(()=>{
    if(!currentClient?.id) return;
    try{
      const goals=JSON.parse(localStorage.getItem("atp-weekly-goals-"+currentClient.id)||"null");
      const log=JSON.parse(localStorage.getItem("atp-weekly-log-"+currentClient.id)||"{}");
      setWeeklyGoals(goals);
      setWeeklyLog(log);
    }catch{}
  },[currentClient?.id]);
  function getWeekKey(){
    const d=new Date();
    const day=d.getDay();
    const diff=d.getDate()-day+(day===0?-6:1);
    const monday=new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  }

  function logWeeklySession(type){
    const key=getWeekKey();
    const cid=currentClient.id;
    const existing=weeklyLog[key]||{};
    const updated={...weeklyLog,[key]:{...existing,[type]:(existing[type]||0)+1}};
    setWeeklyLog(updated);
    try{localStorage.setItem("atp-weekly-log-"+cid,JSON.stringify(updated));}catch{}
  }

  function getWeekProgress(){
    const key=getWeekKey();
    return weeklyLog[key]||{};
  }
function logWeeklySession(type){
    const cid=currentClient.id;
    const key=getWeekKey();
    const existing=weeklyLog[key]||{};
    const updated={...weeklyLog,[key]:{...existing,[type]:(existing[type]||0)+1}};
    setWeeklyLog(updated);
    try{localStorage.setItem("atp-weekly-log-"+cid,JSON.stringify(updated));}catch{}
    // Track streak
    try{
      const streakKey="atp-weekly-streak-"+cid;
      const streaks=JSON.parse(localStorage.getItem(streakKey)||"{}");
      const thisWeekGoal=(weeklyGoals||{})[type]||0;
      const thisWeekDone=(updated[key]||{})[type]||0;
      if(thisWeekGoal>0&&thisWeekDone>=thisWeekGoal){
        streaks[type]=(streaks[type]||0)+1;
        localStorage.setItem(streakKey,JSON.stringify(streaks));
      }
    }catch{}
  }

  function getProgressionSuggestion(){
    const cid=currentClient.id;
    try{
      const streaks=JSON.parse(localStorage.getItem("atp-weekly-streak-"+cid)||"{}");
      const suggestions=[];
      if((streaks.gym||0)>=2) suggestions.push({type:"gym",icon:"🏋️",msg:"You hit your Gym goal 2 weeks straight! Try adding +5 lbs this week.",action:"addweight"});
      if((streaks.hiit||0)>=2){
        const lastHiit=JSON.parse(localStorage.getItem("atp-hiit")||"[]").slice(-1)[0];
        const cur=lastHiit?.duration||"30 min";
        const next=cur==="30 min"?"45 min":cur==="45 min"?"60 min":cur==="60 min"?"90 min":null;
        if(next) suggestions.push({type:"hiit",icon:"🥊",msg:`You crushed HIIT ${streaks.hiit} weeks straight! Ready to level up to ${next}?`,action:"hiitduration",next});
      }
      if((streaks.run||0)>=2){
        const lastRun=JSON.parse(localStorage.getItem("atp-running")||"[]").slice(-1)[0];
        const planMap={"c25k":"5kto10k","5kto10k":"half","half":"full"};
        const nextPlan=planMap[lastRun?.plan];
        if(nextPlan) suggestions.push({type:"run",icon:"🏃",msg:`Amazing running consistency! Ready to move up to the next plan?`,action:"runplan",next:nextPlan});
      }
      if((streaks.cals||0)>=2) suggestions.push({type:"cals",icon:"🤸",msg:"Calisthenics streak! Your difficulty level is advancing next session.",action:"calslevel"});
      if((streaks.bounce||0)>=2) suggestions.push({type:"bounce",icon:"🦘",msg:"Bounce streak! Ready to move up a level?",action:"bouncelevel"});
      return suggestions;
    }catch{return[];}
  }
function logSet(di,ei){ const k=`${di}-${ei}`; setLoggedSets(p=>({...p,[k]:(p[k]||0)+1})); }

  function sendCoachMessage(cid,text){
    if(!text.trim())return;
    persist(null,null,{...messages,[cid]:[...(messages[cid]||[]),{from:"coach",text,ts:new Date().toISOString()}]},null,null,null,null,null);
 setMsgDraft(p=>({...p,[cid]:""}));
    showToast("Message sent!");
  }
 async function getAIEncouragement(){
    setAiLoading(true); setAiReply("");
    const c=currentClient;
    const tl=(logs[c.id]||{})[todayStr()];

 // Gather all workout history from Supabase
    let hiitHistory=[],gymHistory=[],calsHistory=[];
    try{
      const [hiitRaw,gymRaw,calsRaw]=await Promise.all([
        sbGetGlobal("atp-hiit-"+c.id),
        sbGetGlobal("atp-gym-"+c.id),
        sbGetGlobal("atp-cals-"+c.id),
      ]);
      hiitHistory=Array.isArray(hiitRaw)?hiitRaw.slice(-7):[];
      gymHistory=Array.isArray(gymRaw)?gymRaw.slice(-7):[];
      calsHistory=Array.isArray(calsRaw)?calsRaw.slice(-7):[];
    }catch(e){ console.error("Workout history fetch error:",e); }
    const workoutRatings=(ratings[c.id]||[]).slice(-7);
    const quickMoves=Object.keys((deskLog[c.id]||{})).slice(-7);

    const hiitSummary=hiitHistory.length>0?`Boxing/HIIT: ${hiitHistory.length} sessions this week, avg rating ${(hiitHistory.reduce((a,h)=>a+h.rating,0)/hiitHistory.length).toFixed(1)}/5`:"";
    const gymSummary=gymHistory.length>0?`Gym: ${gymHistory.length} sessions — ${[...new Set(gymHistory.flatMap(h=>h.groups||[]))].join(", ")} worked`:"";
    const calsSummary=calsHistory.length>0?`Calisthenics: ${calsHistory.length} sessions this week`:"";
    const workoutSummary=workoutRatings.length>0?`Home workouts: ${workoutRatings.length} sessions, avg rating ${(workoutRatings.reduce((a,r)=>a+r.rating,0)/workoutRatings.length).toFixed(1)}/5`:"";
    const quickSummary=quickMoves.length>0?`Quick Moves: active ${quickMoves.length} days this week`:"";

    const allWorkouts=[hiitSummary,gymSummary,calsSummary,workoutSummary,quickSummary].filter(s=>s).join(". ");

    const recentRatings=(ratings[c.id]||[]).slice(-3);
    const avgRating=recentRatings.length>0?(recentRatings.reduce((a,r)=>a+r.rating,0)/recentRatings.length).toFixed(1):null;

    const prompt=`You are a warm faith-based coach for "All Things Possible." Client: ${c.name}, age ${c.age}, goal: "${c.goal}". ${tl?`Today: mood=${tl.mood}, energy=${tl.energy}.`:""}

WORKOUT ACTIVITY THIS WEEK:
${allWorkouts||"No workouts logged yet this week."}

Write 3-4 sentences of warm personal encouragement rooted in Christian faith. 
- If they worked out, SPECIFICALLY mention which workouts they did (boxing, gym, calisthenics etc.) by name
- Celebrate their physical effort AND nutrition together
- If no workouts yet, encourage them to get started
- End with a short relevant scripture
Be genuine, personal and specific — not generic. Like a coach who actually knows what they did this week.`;

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
      id:"c"+Date.now(), name:selfReg.name, email:selfReg.email||"", age:parseInt(selfReg.age)||0, birthday:selfReg.birthday||"",      weight:parseFloat(selfReg.weight)||0, goalWeight:parseFloat(selfReg.goalWeight)||0,
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
       <img src="/marialogo.png" alt="All Things Possible" style={{width:280,height:280,borderRadius:"50%",objectFit:"cover",margin:"0 auto 24px",display:"block",border:"4px solid rgba(255,255,255,.6)",boxShadow:"0 6px 30px rgba(0,0,0,.25)"}}/> 
      <div style={{fontSize:"0.95rem",fontWeight:700,color:G.white,textShadow:"0 2px 8px rgba(0,0,0,.2)"}}>All Things Possible</div>
        <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.85)",marginTop:4,letterSpacing:"2px",textTransform:"uppercase"}}>Health & Wellness Coaching</div>
        <div style={{marginTop:12,fontSize:"0.65rem",color:"rgba(255,255,255,.7)",fontStyle:"italic"}}>Philippians 4:13</div> 
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  if(screen==="login"){
   const Header=()=>(<div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,padding:"26px 24px 20px",textAlign:"center"}}><img src="/marialogo.png" alt="All Things Possible" style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",margin:"0 auto 10px",display:"block",border:"2px solid rgba(255,255,255,.4)",boxShadow:"0 2px 10px rgba(0,0,0,.15)"}}/><div style={{fontSize:"1.5rem",fontWeight:900,color:G.white}}>All Things Possible</div><div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.8)",marginTop:4,fontStyle:"italic"}}>"I can do all things through Christ who strengthens me"</div></div>); 
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
     {q:"What is your birthday?",field:"birthday",placeholder:"",type:"birthday"},   
          {q:"Current weight (lbs)?",field:"weight",placeholder:"e.g. 165",type:"number"},
          {q:"Goal weight (lbs)?",field:"goalWeight",placeholder:"e.g. 145",type:"number"},
          {q:"Phone number?",field:"phone",placeholder:"e.g. 407-555-1234",type:"tel"},
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
        {title:"Terms & Agreement",icon:"📋",fields:[
          {q:"disclaimer",field:"agreedToTerms",type:"disclaimer"},
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
        if(group.fields[0].type==="disclaimer") return selfReg.agreedToTerms===true;
        return group.fields.every(f=>f.type==="select"||f.type==="birthday"||selfReg[f.field]?.trim());
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
            {f.type==="disclaimer"&&(
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      <div style={{height:280,overflowY:"auto",padding:"14px 16px",background:G.creamDark,borderRadius:10,border:`1px solid ${G.border}`,fontSize:"0.68rem",color:G.text,lineHeight:1.8}}>
                        <div style={{fontWeight:700,fontSize:"0.78rem",color:G.green,marginBottom:8,textAlign:"center"}}>ALL THINGS POSSIBLE HEALTH COACHING</div>
                        <div style={{fontWeight:700,fontSize:"0.72rem",color:G.text,marginBottom:12,textAlign:"center"}}>Client Acknowledgement & Informed Consent</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Health & Medical Disclaimer</div>
                        <div style={{marginBottom:10}}>The coaching services provided by All Things Possible Health Coaching are for general wellness and motivational purposes only. MJ Melvin is not a licensed physician, registered dietitian, or certified medical professional. Nothing in this program constitutes medical advice, diagnosis, or treatment. Always consult your physician or qualified healthcare provider before beginning any new exercise program, nutrition plan, or wellness regimen — especially if you have any pre-existing medical conditions, injuries, or are pregnant.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Assumption of Risk</div>
                        <div style={{marginBottom:10}}>I understand that participation in any fitness or nutrition program involves inherent risks, including but not limited to physical injury, muscle soreness, or adverse health effects. I voluntarily assume full responsibility for any risks, injuries, or damages that may occur during participation in this program.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Results Disclaimer</div>
                        <div style={{marginBottom:10}}>Individual results vary. All Things Possible Health Coaching makes no guarantees regarding specific outcomes including weight loss, fitness improvements, or health benefits. Your results will depend on many factors including your commitment, consistency, and individual physiology.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Faith-Based Approach</div>
                        <div style={{marginBottom:10}}>I understand that All Things Possible Health Coaching incorporates Christian faith-based principles including prayer, scripture, and spiritual encouragement as part of the coaching experience. Participation in these elements is optional but encouraged.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Data & Privacy</div>
                        <div style={{marginBottom:10}}>My personal information including name, weight, health data, and wellness goals will be stored securely and used solely for coaching purposes. This information will not be sold or shared with third parties.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Text Message Consent</div>
                        <div style={{marginBottom:10}}>If I have provided my phone number and consented to receive text messages, I understand I may receive coaching tips, encouragement, and program updates via SMS. Message and data rates may apply. I may opt out at any time by replying STOP.</div>
                        <div style={{fontWeight:700,color:G.brown,marginBottom:4}}>Acknowledgement</div>
                        <div style={{marginBottom:10}}>By checking the box below I confirm that I am 18 years of age or older, I have read and understood this entire agreement, I agree to participate voluntarily and take full responsibility for my health decisions, and I release All Things Possible Health Coaching and MJ Melvin from any liability.</div>
                        <div style={{fontStyle:"italic",textAlign:"center",color:G.green,fontWeight:600}}>"I can do all things through Christ who strengthens me." — Philippians 4:13</div>
                      </div>
           {/* Text consent */}
                      <div style={{padding:"12px 14px",background:"#f0faf4",borderRadius:10,border:`1px solid ${G.greenLight}`}}>
                        <div style={{fontSize:"0.72rem",color:G.textSoft,lineHeight:1.6,marginBottom:10}}>I consent to receive text messages from All Things Possible Health Coaching. Message & data rates may apply. Reply STOP to opt out.</div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setSelfReg(p=>({...p,textConsent:true}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:`2px solid ${selfReg.textConsent===true?G.greenMid:G.border}`,background:selfReg.textConsent===true?"#d8f3dc":G.cream,color:selfReg.textConsent===true?G.green:G.textSoft,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Yes</button>
                          <button onClick={()=>setSelfReg(p=>({...p,textConsent:false}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:`2px solid ${selfReg.textConsent===false&&selfReg.textConsent!==undefined?G.border:G.border}`,background:selfReg.textConsent===false&&selfReg.textConsent!==undefined?G.creamDark:G.cream,color:G.textSoft,fontSize:"0.82rem",fontWeight:400,cursor:"pointer",fontFamily:"inherit"}}>No</button>
                        </div>
                      </div>
                      {/* Agreement */}
                      <div style={{padding:"12px 14px",background:selfReg.agreedToTerms?"#d8f3dc":G.redLight,borderRadius:10,border:`2px solid ${selfReg.agreedToTerms?G.greenMid:G.red}`}}>
                        <div style={{fontSize:"0.74rem",color:selfReg.agreedToTerms?G.green:G.red,fontWeight:600,lineHeight:1.6,marginBottom:10}}>I have read and agree to the All Things Possible Health Coaching terms and informed consent agreement.</div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setSelfReg(p=>({...p,agreedToTerms:true,agreedAt:new Date().toISOString()}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:`2px solid ${selfReg.agreedToTerms?G.greenMid:G.border}`,background:selfReg.agreedToTerms?"#d8f3dc":G.cream,color:selfReg.agreedToTerms?G.green:G.textSoft,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✓ I Agree</button>
                          <button onClick={()=>setSelfReg(p=>({...p,agreedToTerms:false,agreedAt:""}))} style={{flex:1,padding:"14px 0",borderRadius:10,border:`2px solid ${selfReg.agreedToTerms===false?G.red:G.border}`,background:selfReg.agreedToTerms===false?G.redLight:G.cream,color:selfReg.agreedToTerms===false?G.red:G.textSoft,fontSize:"0.82rem",fontWeight:400,cursor:"pointer",fontFamily:"inherit"}}>✕ No</button>
                        </div>
                      </div>
                    </div>
                  )}
             {f.type==="birthday"&&(
                    <div>
                      <input type="date" value={selfReg.birthday||""} max={new Date().toISOString().split("T")[0]} onChange={e=>{
                        const bday=e.target.value;
                        const age=bday?Math.floor((new Date()-new Date(bday))/(365.25*24*60*60*1000)):0;
                        setSelfReg(p=>({...p,birthday:bday,age:String(age)}));
                        setSelfRegError("");
                      }} style={iStyle}/>
                      {selfReg.birthday&&<div style={{marginTop:6,fontSize:"0.72rem",color:G.green,fontWeight:600}}>🎂 Age: {selfReg.age} years old</div>}
                    </div>
                  )}
                  {f.type!=="select"&&f.type!=="equipment"&&f.type!=="workoutDays"&&f.type!=="disclaimer"&&f.type!=="birthday"&&(
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
const MAIN_TABS=[["prayer","🙏","Prayer"],["checkin","📋","Check-In"],["workout","💪","Workout"],["desk","⚡","Quick Move"],["nutrition","🥩","Nutrition"]];
 const MORE_TABS=[["grocery","🛒","Grocery"],["stats","🔢","My Stats"],["progress","📈","Progress"],["messages","💌","Messages"],["hiit","🔥","HIIT"],["gym","🏋️","Gym"],["cals","🤸","Cals"],["abs","🔥","Abs"],["running","🏃","Run"],["trampoline","🦘","Bounce"],["trx","🔗","TRX"]];
    const ALL_TABS=[...MAIN_TABS,...MORE_TABS];
    return(
      <div style={{minHeight:"100vh",background:G.creamDark,fontFamily:"'Palatino Linotype',Palatino,serif",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto"}}>
       {/* Header */}
        <div style={{background:`linear-gradient(135deg,${G.green},${G.greenMid})`,position:"sticky",top:0,zIndex:10,boxShadow:"0 3px 16px rgba(45,106,79,.25)"}}>
          <div style={{position:"relative",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 16px",minHeight:90}}>
            <div style={{zIndex:2}}>
              <div style={{fontSize:"0.64rem",color:"rgba(255,255,255,.8)"}}>Hi, {currentClient.name.split(" ")[0]}!</div>
              <div style={{fontSize:"0.58rem",color:"rgba(255,255,255,.7)"}}>{new Date().toLocaleDateString("en-US",{weekday:"short",month:"2-digit",day:"2-digit",year:"2-digit"})}</div>
            </div>
            <img src="/marialogo.png" alt="All Things Possible" style={{position:"absolute",left:"50%",transform:"translateX(-50%)",height:90,width:90,objectFit:"cover",borderRadius:"50%",border:"3px solid rgba(255,255,255,.6)",boxShadow:"0 3px 16px rgba(0,0,0,.3)",zIndex:1}}/>
            <div style={{textAlign:"right",zIndex:2}}>
              <div style={{fontSize:"1rem",fontWeight:900,color:G.white}}>{currentClient.weight} lbs</div>
              <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.7)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"inherit"}}>Sign out</button>
            </div>
          </div> <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.54rem",color:"rgba(255,255,255,.75)",marginBottom:2}}><span>Goal: {currentClient.goalWeight} lbs</span><span>{Math.max(0,Math.round((currentClient.weight-currentClient.goalWeight)*10)/10)} lbs to go</span></div>
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

       {toast&&(
          <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1e293b",color:"#fff",padding:"10px 20px",borderRadius:20,fontSize:"0.78rem",fontWeight:700,zIndex:999,boxShadow:"0 4px 20px rgba(0,0,0,.3)",whiteSpace:"nowrap"}}>
            ✓ {toast}
          </div>
        )}
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
          const weekProgress=getWeekProgress();
          const weekKey=getWeekKey();
          const allGoalsMet=weeklyGoals&&Object.entries(weeklyGoals).filter(([,v])=>v>0).every(([k,v])=>(weekProgress[k]||0)>=v);

          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
{/* ── PROGRESSION SUGGESTIONS ── */}
            {(()=>{
              const suggestions=getProgressionSuggestion();
              if(suggestions.length===0) return null;
              return suggestions.map((s,i)=>(
                <div key={i} style={{...card,background:`linear-gradient(135deg,${G.mango},${G.mangoDeep})`,border:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:"2rem"}}>{s.icon}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:"#fff",marginBottom:3}}>🔥 Level Up Time!</div>
                      <div style={{fontSize:"0.68rem",color:"rgba(255,255,255,.9)",lineHeight:1.6}}>{s.msg}</div>
                    </div>
                    <button onClick={()=>{
                      // Clear streak so suggestion doesn't keep showing
                      try{
                        const streakKey="atp-weekly-streak-"+currentClient.id;
                        const streaks=JSON.parse(localStorage.getItem(streakKey)||"{}");
                        streaks[s.type]=0;
                        localStorage.setItem(streakKey,JSON.stringify(streaks));
                      }catch{}
                      // Navigate to relevant tab
                      if(s.type==="hiit") setTab("hiit");
                      if(s.type==="run") setTab("running");
                      if(s.type==="gym") setTab("gym");
                      if(s.type==="cals") setTab("cals");
                      if(s.type==="bounce") setTab("trampoline");
                    }} style={{padding:"6px 12px",borderRadius:20,border:"none",background:"rgba(255,255,255,.25)",color:"#fff",fontSize:"0.68rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                      Let's Go!
                    </button>
                  </div>
                </div>
              ));
            })()}
            {/* ── WEEKLY GOALS ── */}
            {!editingGoals&&weeklyGoals&&!allGoalsMet&&(
              <div style={{...card,border:`1.5px solid ${G.greenMid}44`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>🎯 This Week's Goals</div>
                  <button onClick={()=>{
                    setGoalForm({...weeklyGoals});
                    setEditingGoals(true);
                  }} style={{fontSize:"0.62rem",padding:"3px 9px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,cursor:"pointer",fontFamily:"inherit"}}>Edit</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {[
                    {id:"gym",icon:"🏋️",label:"Gym"},
                    {id:"hiit",icon:"🥊",label:"HIIT"},
                    {id:"run",icon:"🏃",label:"Running"},
                    {id:"cals",icon:"🤸",label:"Calisthenics"},
                    {id:"trx",icon:"🔗",label:"TRX"},
                    {id:"bounce",icon:"🦘",label:"Bounce"},
                  ].filter(t=>(weeklyGoals[t.id]||0)>0).map(t=>{
                    const done=weekProgress[t.id]||0;
                    const goal=weeklyGoals[t.id]||0;
                    const pct=Math.min(100,Math.round((done/goal)*100));
                    const complete=done>=goal;
                    return(
                      <div key={t.id}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:"1rem"}}>{t.icon}</span>
                            <span style={{fontSize:"0.74rem",fontWeight:600,color:complete?G.green:G.text}}>{t.label}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:"0.7rem",color:complete?G.green:G.textSoft,fontWeight:700}}>{done}/{goal}</span>
                            <button onClick={()=>logWeeklySession(t.id)} style={{padding:"3px 9px",borderRadius:20,border:"none",background:complete?G.greenLight:G.green,color:complete?G.green:G.white,fontSize:"0.62rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                              {complete?"✓ Done":"+1"}
                            </button>
                          </div>
                        </div>
                        <div style={{height:6,background:G.creamDark,borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${pct}%`,background:complete?G.greenMid:G.green,borderRadius:3,transition:"width .4s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All goals met celebration */}
            {allGoalsMet&&!editingGoals&&(
              <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none",textAlign:"center",padding:"20px"}}>
                <div style={{fontSize:"2.5rem",marginBottom:6}}>🏆</div>
                <div style={{fontSize:"0.92rem",fontWeight:900,color:G.white,marginBottom:4}}>Weekly Goals Complete!</div>
                <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7,marginBottom:10}}>Amazing work {currentClient.name.split(" ")[0]}! You crushed all your goals this week. All things are possible! 🙏</div>
                <button onClick={()=>{setEditingGoals(true);setGoalForm({...weeklyGoals});}} style={{padding:"8px 18px",borderRadius:20,border:"none",background:"rgba(255,255,255,.2)",color:G.white,fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Set Next Week's Goals</button>
              </div>
            )}

            {/* Goal setup / edit */}
            {(!weeklyGoals||editingGoals)&&(
              <div style={{...card,border:`1.5px solid ${G.green}44`}}>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:G.green,marginBottom:4}}>🎯 Set Your Weekly Goals</div>
                <div style={{fontSize:"0.66rem",color:G.textSoft,marginBottom:12,lineHeight:1.6}}>How many times do you want to work out this week? Set 0 to skip a type.</div>
                <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
                  {[
                    {id:"gym",icon:"🏋️",label:"Gym sessions"},
                    {id:"hiit",icon:"🥊",label:"HIIT sessions"},
                    {id:"run",icon:"🏃",label:"Running sessions"},
                    {id:"cals",icon:"🤸",label:"Calisthenics sessions"},
                    {id:"trx",icon:"🔗",label:"TRX sessions"},
                    {id:"bounce",icon:"🦘",label:"Bounce sessions"},
                  ].map(t=>(
                    <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,justifyContent:"space-between"}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:"1rem"}}>{t.icon}</span>
                        <span style={{fontSize:"0.74rem",color:G.text}}>{t.label}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <button onClick={()=>setGoalForm(p=>({...p,[t.id]:Math.max(0,(p[t.id]||0)-1)}))} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1rem",color:G.text}}>-</button>
                        <div style={{width:24,textAlign:"center",fontSize:"0.9rem",fontWeight:700,color:G.text}}>{goalForm[t.id]||0}</div>
                        <button onClick={()=>setGoalForm(p=>({...p,[t.id]:(p[t.id]||0)+1}))} style={{width:28,height:28,borderRadius:"50%",border:`1px solid ${G.border}`,background:G.cream,cursor:"pointer",fontSize:"1rem",color:G.text}}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>{
                  const cid=currentClient.id;
                  setWeeklyGoals(goalForm);
                  try{localStorage.setItem("atp-weekly-goals-"+cid,JSON.stringify(goalForm));}catch{}
                  setEditingGoals(false);
                }} style={{...btnGreen,padding:"10px",fontSize:"0.78rem"}}>
                  ✅ Save My Weekly Goals
                </button>
                {weeklyGoals&&<button onClick={()=>setEditingGoals(false)} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.72rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center",marginTop:6,width:"100%"}}>← Cancel</button>}
              </div>
            )}

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

                {/* Specialized tab selector */}
                <div style={card}>
                  <div style={lbl}>💪 Which specialized tabs will you use?</div>
                  <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:10,lineHeight:1.6}}>Select the tabs you plan to use. On those days your 12-week plan will direct you to the right tab. Leave unselected to have workouts built directly into your plan.</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {[
                      {id:"hiit",icon:"🥊",label:"HIIT / Boxing",desc:"Shadow boxing, heavy bag, kickboxing"},
                      {id:"gym",icon:"🏋️",label:"Gym",desc:"Weighted exercises with progressive overload"},
                     {id:"cals",icon:"🤸",label:"Calisthenics & Abs",desc:"Bodyweight circuit training"},
                      {id:"running",icon:"🏃",label:"Running",desc:"Couch to 5K, half marathon, full marathon"},
                    ].map(t=>{
                      const selected=(programTabs||[]).includes(t.id);
                      return(
                        <button key={t.id} onClick={()=>{
                          if(t.soon) return;
                          setProgramTabs(p=>{
                            const prev=p||[];
                            return selected?prev.filter(x=>x!==t.id):[...prev,t.id];
                          });
                        }} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 13px",borderRadius:10,border:`2px solid ${selected?G.green:G.border}`,background:selected?"#d8f3dc":t.soon?G.creamDark:G.cream,cursor:t.soon?"default":"pointer",textAlign:"left",width:"100%",fontFamily:"inherit",opacity:t.soon?0.5:1}}>
                          <span style={{fontSize:"1.4rem"}}>{t.icon}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"0.78rem",fontWeight:700,color:selected?G.green:G.text}}>{t.label}{t.soon&&<span style={{fontSize:"0.6rem",color:G.textSoft,fontWeight:400,marginLeft:6}}>coming soon</span>}</div>
                            <div style={{fontSize:"0.64rem",color:G.textSoft}}>{t.desc}</div>
                          </div>
                          {selected&&<span style={{color:G.greenMid,fontSize:"1rem"}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {(programTabs||[]).length>0&&(
                    <div style={{marginTop:10,padding:"8px 12px",background:"#f0faf4",borderRadius:8,fontSize:"0.68rem",color:G.green,lineHeight:1.6}}>
                      ✅ Your 12-week plan will schedule {(programTabs||[]).map(t=>t==="hiit"?"HIIT/Boxing":t==="gym"?"Gym":t==="cals"?"Calisthenics":t).join(", ")} days and direct you to the right tab each day!
                    </div>
                  )}
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
                  const sessionDuration=day.sessionDuration||(currentClient.workoutDuration||"45 min");
                  return(<div style={card}>
                    {/* Session duration selector */}
                    <div style={{marginBottom:12,paddingBottom:12,borderBottom:`1px solid ${G.border}`}}>
                      <div style={{fontSize:"0.72rem",fontWeight:700,color:G.green,marginBottom:8}}>⏱ How long do you have today?</div>
                      <div style={{display:"flex",gap:6}}>
                        {["30 min","45 min","60 min","90 min"].map(t=>(
                          <button key={t} onClick={async()=>{
                            if(t===sessionDuration) return;
                            const cid=currentClient.id;
                            const updatedDays=currentWeekPlan.days.map((d,i)=>i===selectedDay?{...d,sessionDuration:t}:d);
                            const updatedWeek={...currentWeekPlan,days:updatedDays};
                            const updatedProgram={...program,[cid]:{...program[cid],weeks:{...program[cid].weeks,[program[cid].currentWeek]:updatedWeek}}};
                            setProgram(updatedProgram);
                            try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(updatedProgram));}catch(e){}
            sbSetGlobal(PROGRAM_KEY, updatedProgram);
            // Regenerate this day with new duration
                            setGeneratingWeek(true);
                            const c=currentClient;
                            let workoutRows=sheetData.workouts||[];
                            if(workoutRows.length===0){
                              try{
                                const base=`https://docs.google.com/spreadsheets/d/${SHEETS_ID}/gviz/tq?tqx=out:json&sheet=`;
                                const res=await fetch(`${base}${encodeURIComponent("Workout Suggestions")}`);
                                const text=await res.text();
                                const json=JSON.parse(text.substring(47).slice(0,-2));
                                workoutRows=json.table.rows.map(row=>row.c.map(cell=>cell?.v||cell?.f||""));
                              }catch(e){}
                            }
                            const exerciseCount=t==="30 min"?4:t==="45 min"?6:t==="60 min"?8:12;
                            const catMap={"Chest":["gym chest"],"Shoulders":["gym shoulders"],"Arms (Biceps/Triceps)":["gym biceps","gym triceps"],"Legs":["gym legs"],"Back":["gym back"],"Core/Abs":["gym core"],"Stretching":["beginning stretch","intermediate stretch"],"Boxing":["basic shadow boxing","heavy bag combo","boxing only","power punching","defensive footwork","kickboxing combo"]};
                            const dayFocus=day.focus||"";
                            const catGuess=Object.keys(catMap).find(k=>dayFocus.toLowerCase().includes(k.toLowerCase()))||null;
                            const cats=catGuess?catMap[catGuess]:[];
                            const sheetExs=workoutRows.slice(1).filter(row=>cats.some(c=>(row[1]||"").toLowerCase().includes(c))).slice(0,exerciseCount).map(row=>({name:row[0],instructions:row[5],muscles:row[6],progression:row[7]}));
                            const hasSheet=sheetExs.length>=3;
                            const prompt=`You are a personal trainer. Rebuild this workout day for exactly ${t}. Client: ${c.name}, level: ${c.level}, focus: ${day.focus}.${hasSheet?` Use ONLY these exercises: ${sheetExs.map(e=>e.name).join(", ")}.`:""} Include exactly ${exerciseCount} exercises with sets, reps, rest periods scaled to fit ${t} total. Return ONLY valid JSON: {"day":"${day.day}","type":"${day.type}","focus":"${day.focus}","duration":"${t}","sessionDuration":"${t}","exercises":[{"name":"Exercise","sets":3,"reps":"10-12","rest":"60 sec","tip":"Form tip"}]}`;
                            try{
                              const raw=await callClaude(prompt);
                              const newDay=JSON.parse(raw.replace(/```json|```/g,"").trim());
                              const rebuiltDays=currentWeekPlan.days.map((d,i)=>i===selectedDay?{...newDay,sessionDuration:t}:d);
                              const rebuiltWeek={...currentWeekPlan,days:rebuiltDays};
                              const rebuiltProgram={...program,[cid]:{...program[cid],weeks:{...program[cid].weeks,[program[cid].currentWeek]:rebuiltWeek}}};
                              setProgram(rebuiltProgram);
                             try{localStorage.setItem(PROGRAM_KEY,JSON.stringify(rebuiltProgram));}catch(e){}
            sbSetGlobal(PROGRAM_KEY, rebuiltProgram);
            }catch(e){console.error(e);}
            setGeneratingWeek(false); 
                          }} style={{flex:1,padding:"8px 0",borderRadius:10,border:`2px solid ${sessionDuration===t?G.green:G.border}`,background:sessionDuration===t?"#d8f3dc":G.cream,color:sessionDuration===t?G.green:G.textSoft,fontSize:"0.72rem",fontWeight:sessionDuration===t?700:400,cursor:"pointer",fontFamily:"inherit"}}>{t}</button>
                        ))}
                      </div>
                      {sessionDuration!==(currentClient.workoutDuration||"45 min")&&(
                        <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:5,fontStyle:"italic"}}>Default: {currentClient.workoutDuration||"45 min"} · Today: {sessionDuration}</div>
                      )}
                    </div> 
   {(()=>{
                      const exercises=day.exercises||[];
                      // Check if this is a tab-redirect day
                      const isTabDay=exercises.length===1&&exercises[0]?.name?.startsWith("→ Go to");
                      const tabName=isTabDay?exercises[0].name.replace("→ Go to ","").replace(" tab","").trim():"";
                      const tabId=tabName.toLowerCase().includes("hiit")||tabName.toLowerCase().includes("boxing")?"hiit":tabName.toLowerCase().includes("gym")?"gym":tabName.toLowerCase().includes("calist")?"cals":"";
                      const tabIcon=tabId==="hiit"?"🥊":tabId==="gym"?"🏋️":tabId==="cals"?"🤸":"💪";
                      const tabColor=tabId==="hiit"?G.mangoDeep:tabId==="gym"?"#4f46e5":tabId==="cals"?"#7c3aed":G.green;
                      if(isTabDay) return(
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"20px 0"}}>
                          <div style={{width:80,height:80,borderRadius:"50%",background:tabColor+"22",border:`3px solid ${tabColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem"}}>{tabIcon}</div>
                          <div style={{textAlign:"center"}}>
                            <div style={{fontSize:"1rem",fontWeight:900,color:tabColor,marginBottom:6}}>{tabName} Day! {tabIcon}</div>
                            <div style={{fontSize:"0.74rem",color:G.textSoft,lineHeight:1.6,marginBottom:16}}>Today is your {tabName} session. Head over to the {tabName} tab to start your workout!</div>
                          </div>
                          <button onClick={()=>setTab(tabId)} style={{padding:"14px 28px",borderRadius:14,border:"none",background:tabColor,color:"#fff",fontSize:"0.88rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 14px ${tabColor}44`}}>
                            → Open {tabName} Tab
                          </button>
                        </div>
                      );
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
                  <div style={lbl}>💥 What do you want to blast today?</div>
                  <div style={{display:"flex",flexDirection:"column",gap:7}}>
                    {Object.keys(BLAST_GROUPS).map(t=>{
                      const lastBlast=blastHistory.filter(h=>h.group===t).slice(-1)[0];
                      return(
                        <button key={t} onClick={()=>setGymTarget(t)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:10,border:`2px solid ${gymTarget===t?"#dc2626":G.border}`,background:gymTarget===t?"#fef2f2":G.cream,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:"inherit"}}>
                          <div>
                            <div style={{fontSize:"0.8rem",fontWeight:gymTarget===t?700:400,color:gymTarget===t?"#dc2626":G.text}}>{t}</div>
                            {lastBlast&&<div style={{fontSize:"0.6rem",color:G.textSoft}}>Last: {fmtDate(lastBlast.date)} · rated {lastBlast.rating}/5</div>}
                          </div>
                          {gymTarget===t&&<span style={{color:"#dc2626",fontSize:"1rem"}}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Blast weight inputs */}
              {moveSetupSit==="gym"&&gymTarget&&(()=>{
                const g=BLAST_GROUPS[gymTarget];
                if(!g) return null;
                const lastBlast=blastHistory.filter(h=>h.group===gymTarget).slice(-1)[0];
                if(g.weights.length===0) return(
                  <div style={{...card,background:"#f0fdf4",border:`1px solid ${G.greenLight}`}}>
                    <div style={{fontSize:"0.72rem",color:G.green,lineHeight:1.7}}>💪 <strong>Bodyweight only</strong> — no weight needed for this blast!</div>
                  </div>
                );
                return(
                  <div style={card}>
                    <div style={lbl}>⚖️ Your weights</div>
                    {lastBlast&&(
                      <div style={{marginBottom:10,padding:"7px 12px",background:"#fef2f2",borderRadius:8,fontSize:"0.68rem",color:"#dc2626",fontWeight:600}}>
                        💡 Last session: {Object.entries(lastBlast.weights||{}).map(([k,v])=>`${k}: ${v}lbs`).join(" · ")} · rated {lastBlast.rating}/5
                        {lastBlast.rating<=2?" — try adding 5 lbs!":lastBlast.rating>=4?" — consider dropping 5 lbs":""}
                      </div>
                    )}
                    {g.weights.map(wKey=>(
                      <div key={wKey} style={{marginBottom:12}}>
                        <div style={{fontSize:"0.72rem",fontWeight:700,color:"#dc2626",marginBottom:6}}>{g.weightLabels?g.weightLabels[wKey]:g.weightLabel}</div>
                        <input type="text" inputMode="numeric" pattern="[0-9]*" value={blastWeights[gymTarget+"_"+wKey]||""} onChange={e=>setBlastWeights(p=>({...p,[gymTarget+"_"+wKey]:e.target.value.replace(/[^0-9]/g,"")}))} placeholder={g.weightPlaceholders?g.weightPlaceholders[wKey]:g.weightPlaceholder} style={{...iStyle,fontSize:"1rem",fontWeight:700,textAlign:"center"}}/>
                      </div>
                    ))}
                    {/* Exercise preview */}
                    {g.weights.every(wKey=>blastWeights[gymTarget+"_"+wKey])&&(
                      <div style={{marginTop:4}}>
                        <div style={{fontSize:"0.64rem",color:G.textSoft,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Your session preview:</div>
                        {g.blocks.map((block,bi)=>(
                          <div key={bi} style={{marginBottom:8}}>
                            <div style={{fontSize:"0.68rem",fontWeight:700,color:"#dc2626",marginBottom:4}}>{block.name}</div>
                            {block.exercises.map((ex,ei)=>{
                              const w=ex.scaleKey?parseFloat(blastWeights[gymTarget+"_"+ex.scaleKey]||0):0;
                              const scaled=w>0?Math.round((w*ex.scale)/5)*5:0;
                              return(
                                <div key={ei} style={{display:"flex",justifyContent:"space-between",fontSize:"0.7rem",padding:"3px 0",borderBottom:`1px solid ${G.border}`}}>
                                  <span style={{color:G.text}}>{ex.name}</span>
                                  <span style={{color:"#dc2626",fontWeight:700}}>{scaled>0?`${scaled} lbs`:"Bodyweight"}</span>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                if(moveSetupSit==="gym"){
                  if(!gymTarget){alert("Please select what you want to blast!");return;}
                  const g=BLAST_GROUPS[gymTarget];
                  const weightInputs={};
                  if(g&&g.weights.length>0){
                    const allFilled=g.weights.every(wKey=>blastWeights[gymTarget+"_"+wKey]);
                    if(!allFilled){alert("Please enter your weights first!");return;}
                    g.weights.forEach(wKey=>{ weightInputs[wKey]=blastWeights[gymTarget+"_"+wKey]; });
                  }
                  const session=buildBlastSession(gymTarget,weightInputs);
                  setBlastSession(session);
                  setBlastPhase("active");
                  setBlastBlockIdx(0);setBlastRoundIdx(0);setBlastExIdx(0);
                  setBlastIsRest(false);setBlastIsTransition(false);
                  setBlastComplete(false);setBlastRating(null);
                  setBlastTimerSec(30);setBlastTimerActive(true);
                  setShowMoveSetup(false);
                  const blastProfile={...profile,situation:"gym"};
                  setMoveProfile(p=>({...p,[currentClient.id]:blastProfile}));
                  return;
                }
                if(moveSetupSit==="desk"&&!deskTarget){alert("Please select how you are working!");return;}
                setShowMoveSetup(false);
                const enjoys=moveSetupSit==="desk"?`${deskTarget} — enjoys: ${moveSetupEnjoys||currentClient?.likes||"general fitness"}`:moveSetupEnjoys;
                generateDeskMoves(moveSetupSit,enjoys);
              }} disabled={generatingDesk||!moveSetupSit||(moveSetupSit==="desk"&&!deskTarget)} style={{...btnGreen,opacity:moveSetupSit?1:0.5}}>
                {generatingDesk?"✨ Creating your moves...":moveSetupSit==="gym"?"💥 Start Blast Session":"✨ Create My Quick Moves"}
              </button>
   
              {profile&&<button onClick={()=>setShowMoveSetup(false)} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Cancel</button>}
            </div>
          );

          // Blast session active
          if(profile.situation==="gym"&&blastSession&&blastPhase==="active"){
            const block=blastSession.blocks[blastBlockIdx];
            const activeEx=block?.exercises[blastExIdx];
            const totalBlocks=blastSession.blocks.length;
            const progressPct=Math.round((blastBlockIdx/totalBlocks)*100);
            return(
              <div style={{flex:1,display:"flex",flexDirection:"column",background:blastIsTransition?"#1a1a2e":blastIsRest?"#fef2f2":"#fff5f5"}}>
                <div style={{height:6,background:"#fecaca"}}>
                  <div style={{height:"100%",width:`${progressPct}%`,background:"linear-gradient(90deg,#7f1d1d,#dc2626)",transition:"width .5s"}}/>
                </div>

                {blastComplete?(
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,gap:16}}>
                    <div style={{fontSize:"3rem"}}>💥</div>
                    <div style={{fontSize:"1.1rem",fontWeight:900,color:"#dc2626",textAlign:"center"}}>BLAST COMPLETE!</div>
                    <div style={{fontSize:"0.78rem",color:G.textSoft,textAlign:"center",lineHeight:1.7}}>Feel those {gymTarget}? That's growth happening. All things are possible! 🙏</div>
                    {!blastRating?(
                      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:8}}>
                        <div style={{fontSize:"0.76rem",fontWeight:700,color:G.brown,textAlign:"center"}}>How was the intensity?</div>
                        <div style={{display:"flex",gap:6}}>
                          {[1,2,3,4,5].map(r=>(
                            <button key={r} onClick={()=>saveBlastSession(r)} style={{flex:1,padding:"12px 0",borderRadius:10,border:`2px solid ${blastRating===r?"#dc2626":G.border}`,background:blastRating===r?"#fef2f2":G.cream,color:blastRating===r?"#dc2626":G.textSoft,fontSize:"1.1rem",fontWeight:900,cursor:"pointer"}}>{r}</button>
                          ))}
                        </div>
                        <div style={{fontSize:"0.62rem",color:G.textSoft,textAlign:"center"}}>1 = Too Easy · 3 = Just Right · 5 = Too Hard</div>
                      </div>
                    ):(
                      <div style={{textAlign:"center",display:"flex",flexDirection:"column",gap:12}}>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#dc2626"}}>{blastRating<=2?"Adding weight next time 💪":blastRating===3?"Perfect intensity! 🔥":"Easing weight next time 🙏"}</div>
                        <button onClick={()=>{setBlastPhase("setup");setBlastComplete(false);setBlastSession(null);setBlastTimerActive(false);setShowMoveSetup(true);setMoveSetupSit("gym");}} style={{...btnGreen,background:"linear-gradient(135deg,#7f1d1d,#dc2626)"}}>💥 New Blast</button>
                      </div>
                    )}
                  </div>
                ):(
                  <div style={{flex:1,display:"flex",flexDirection:"column",padding:16,gap:10}}>
                    {/* Block indicators */}
                    <div style={{display:"flex",gap:4}}>
                      {blastSession.blocks.map((b,i)=>(
                        <div key={i} style={{flex:1,padding:"4px 0",borderRadius:6,background:i<blastBlockIdx?"#dc2626":i===blastBlockIdx?"#fef2f2":"#f3f4f6",border:`1.5px solid ${i<=blastBlockIdx?"#dc2626":G.border}`,textAlign:"center"}}>
                          <div style={{fontSize:"0.52rem",fontWeight:700,color:i<blastBlockIdx?"#fff":i===blastBlockIdx?"#dc2626":G.textSoft}}>{i<blastBlockIdx?"✓":b.type==="superset"?"SS":"FIN"}</div>
                        </div>
                      ))}
                    </div>

                    {/* Current block name */}
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:blastIsTransition?"#fff":blastIsRest?"#fca5a5":"#dc2626",textTransform:"uppercase",letterSpacing:1}}>
                      {blastIsTransition?"🔄 GET READY":blastIsRest?"😮‍💨 REST":block?.name}
                    </div>

                    {/* Big timer */}
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:12}}>
                      <div style={{width:180,height:180,borderRadius:"50%",background:blastIsTransition?"#16213e":blastIsRest?"#fef2f2":"#fff5f5",border:`6px solid ${blastIsTransition?"#60a5fa":blastIsRest?"#fca5a5":"#dc2626"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",boxShadow:`0 0 40px ${blastIsTransition?"#60a5fa44":blastIsRest?"#fca5a544":"#dc262644"}`}}>
                        <div style={{fontSize:"0.7rem",color:blastIsTransition?"#60a5fa":blastIsRest?"#fca5a5":"#dc2626",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>
                          {blastIsTransition?"NEXT UP":blastIsRest?"REST":"BLAST"}
                        </div>
                        <div style={{fontSize:"4rem",fontWeight:900,color:blastTimerSec<=3?"#f87171":blastIsTransition?"#60a5fa":blastIsRest?"#fca5a5":"#dc2626",fontVariantNumeric:"tabular-nums",lineHeight:1}}>{blastTimerSec}</div>
                        <div style={{fontSize:"0.62rem",color:G.textSoft,marginTop:4}}>seconds</div>
                      </div>

                      {blastIsTransition&&(
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:"1.1rem",fontWeight:900,color:"#60a5fa",marginBottom:4}}>Next: {blastSession.blocks[blastBlockIdx]?.name}</div>
                          <div style={{fontSize:"0.72rem",color:G.textSoft}}>{blastSession.blocks[blastBlockIdx]?.type==="superset"?"Back to back, no rest between exercises!":"Straight sets — push every rep!"}</div>
                        </div>
                      )}

                      {!blastIsRest&&!blastIsTransition&&activeEx&&(
                        <div style={{textAlign:"center",padding:"0 8px"}}>
                          <div style={{fontSize:"1.8rem",fontWeight:900,color:G.text,marginBottom:6,lineHeight:1.2}}>{activeEx.name}</div>
                          <div style={{fontSize:"0.9rem",fontWeight:700,color:"#dc2626",marginBottom:8}}>{activeEx.weightLabel}</div>
                          <div style={{fontSize:"0.74rem",color:G.textSoft,lineHeight:1.6,maxWidth:300,margin:"0 auto"}}>{activeEx.instructions}</div>
                          {block?.type==="superset"&&blastExIdx===0&&block.exercises.length>1&&(
                            <div style={{marginTop:8,fontSize:"0.66rem",padding:"4px 12px",borderRadius:20,background:"#fef2f2",color:"#dc2626",fontWeight:700,display:"inline-block"}}>
                              ⚡ No rest — {block.exercises[1]?.name} is next!
                            </div>
                          )}
                        </div>
                      )}

                      {blastIsRest&&!blastIsTransition&&(
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:"0.85rem",fontWeight:700,color:"#dc2626",marginBottom:4}}>Breathe! 💪</div>
                          <div style={{fontSize:"0.72rem",color:G.textSoft}}>
                            {block?.type==="superset"?`Round ${blastRoundIdx+2} coming up — same pair!`:`Set ${blastRoundIdx+2} coming — push it!`}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setBlastTimerActive(r=>!r)} style={{flex:1,padding:"14px",borderRadius:12,border:"none",background:blastTimerActive?"#dc2626":"#10b981",color:"#fff",fontSize:"0.85rem",fontWeight:700,cursor:"pointer"}}>{blastTimerActive?"⏸ Pause":"▶ Resume"}</button>
                      <button onClick={()=>{setBlastTimerActive(false);advanceBlast();setTimeout(()=>setBlastTimerActive(true),100);}} style={{padding:"14px 16px",borderRadius:12,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.85rem",cursor:"pointer"}}>⏭ Skip</button>
                    </div>
                  </div>
                )}
              </div>
            );
          }

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
        {tab==="nutrition"&&(()=>{
          const clientFavs=favorites[currentClient.id]||null;
          const needsSetup=!clientFavs&&!showFavSetup;

          // First time setup
          if(needsSetup||showFavSetup) return(
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}>
                <div style={{fontSize:"0.62rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>🥗 Quick Add Setup</div>
                <div style={{fontSize:"0.88rem",fontWeight:700,color:G.white,marginBottom:4}}>{editingFavs?"Update Your Favorites":"Let's set up your favorites!"}</div>
                <div style={{fontSize:"0.72rem",color:"rgba(255,255,255,.85)",lineHeight:1.7}}>Tell us what you typically eat — we'll add quick-tap buttons to make logging meals faster!</div>
              </div>

              {["Breakfast","Lunch","Dinner","Snack"].map(meal=>(
                <div key={meal} style={card}>
                  <div style={lbl}>{meal==="Breakfast"?"🌅":meal==="Lunch"?"☀️":meal==="Dinner"?"🌙":"🍎"} Typical {meal} foods</div>
                  <div style={{fontSize:"0.68rem",color:G.textSoft,marginBottom:8}}>Separate with commas — e.g. "scrambled eggs, bacon, coffee"</div>
                  <textarea value={favForm[meal]||""} onChange={e=>setFavForm(p=>({...p,[meal]:e.target.value}))} placeholder={
                    meal==="Breakfast"?"e.g. scrambled eggs, bacon, protein shake, oatmeal":
                    meal==="Lunch"?"e.g. grilled chicken, salad, turkey wrap":
                    meal==="Dinner"?"e.g. steak, salmon, ground beef, roasted veggies":
                    "e.g. almonds, cheese, protein bar, hard boiled eggs"
                  } rows={2} style={{...iStyle,resize:"none"}}/>
                </div>
              ))}

              <button onClick={()=>{
                // Parse favorites into arrays
                const parsed={};
                ["Breakfast","Lunch","Dinner","Snack"].forEach(meal=>{
                  parsed[meal]=(favForm[meal]||"").split(",").map(f=>f.trim()).filter(f=>f.length>0);
                });
                const newFavs={...favorites,[currentClient.id]:parsed};
                setFavorites(newFavs);
                try{
                  localStorage.setItem(FAVORITES_KEY,JSON.stringify(newFavs));
                  sbSetGlobal(FAVORITES_KEY,newFavs);
                }catch(e){}
                setShowFavSetup(false);
                setEditingFavs(false);
              }} style={btnGreen}>✓ Save My Favorites</button>

              {editingFavs&&<button onClick={()=>{setShowFavSetup(false);setEditingFavs(false);}} style={{background:"transparent",border:"none",color:G.textSoft,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>← Cancel</button>}
            </div>
          );

          return(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"0.85rem",fontWeight:700,color:G.green}}>🥗 Nutrition Tracker</div>
              <button onClick={()=>{
                // Pre-fill form with existing favorites
                const existing=favorites[currentClient.id]||{};
                setFavForm({
                  Breakfast:(existing.Breakfast||[]).join(", "),
                  Lunch:(existing.Lunch||[]).join(", "),
                  Dinner:(existing.Dinner||[]).join(", "),
                  Snack:(existing.Snack||[]).join(", "),
                });
                setEditingFavs(true);
                setShowFavSetup(true);
              }} style={{padding:"5px 10px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.64rem",cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit Favorites</button>
            </div>

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
              
             {/* Favorites quick-tap */}
              {clientFavs&&clientFavs[mealType]&&clientFavs[mealType].length>0&&(
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>⚡ Quick Add</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {clientFavs[mealType].map((fav,i)=>(
                      <button key={i} onClick={()=>setMealText(p=>p?p+", "+fav:fav)} style={{padding:"6px 12px",borderRadius:20,border:`1.5px solid ${G.greenLight}`,background:"#f0faf4",color:G.green,fontSize:"0.72rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                        + {fav}
                      </button>
                    ))}
                    <button onClick={()=>setMealText("")} style={{padding:"6px 12px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,fontSize:"0.68rem",cursor:"pointer",fontFamily:"inherit"}}>✕ Clear</button>
                  </div>
                </div>
              )}

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
            {todayMeals.length>0&&(<div style={card}><div style={lbl}>Today's Meals</div><div style={{display:"flex",flexDirection:"column",gap:10}}>{todayMeals.map((m,i)=>(<div key={i} style={{background:G.creamDark,borderRadius:10,padding:"10px 12px",borderLeft:`3px solid ${G.greenMid}`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}><span style={{fontSize:"0.78rem",fontWeight:700,color:G.green}}>{m.meal}</span><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:"0.62rem",color:G.textSoft}}>{new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span><button onPointerDown={()=>{const ts=m.ts;const cid=currentClient.id;const today=todayStr();persist(null,null,null,null,null,null,null,{...nutrition,[cid]:{...(nutrition[cid]||{}),[today]:((nutrition[cid]||{})[today]||[]).filter(x=>x.ts!==ts)}});}} style={{width:22,height:22,borderRadius:5,border:"1px solid #ef4444",background:"#fee2e2",cursor:"pointer",fontSize:"0.65rem",color:"#ef4444",padding:0}}>🗑</button></div></div><div style={{fontSize:"0.72rem",color:G.textSoft,marginBottom:5}}>{m.text}</div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{[{l:"P",v:m.protein,c:"#4ade80"},{l:"F",v:m.fat,c:"#fbbf24"},{l:"C",v:m.carbs,c:"#fb923c"},{l:"S",v:m.sugar,c:"#f87171"}].map((x,j)=>(<span key={j} style={{fontSize:"0.65rem"}}><span style={{fontWeight:700,color:x.c}}>{x.v}g</span><span style={{color:G.textSoft}}> {x.l}</span></span>))}<span style={{fontSize:"0.65rem",color:G.brown,fontWeight:600}}>{m.calories} kcal</span></div>{m.feedback&&<div style={{fontSize:"0.63rem",color:G.green,fontStyle:"italic",marginTop:4}}>💡 {m.feedback}</div>}</div>))}</div></div>)}
      {/* Weekly averages */}
            {(()=>{const weekly=getWeeklyNutrition(currentClient.id);if(!weekly) return null;return(<div style={card}><div style={lbl}>7-Day Averages ({weekly.days} days)</div><div style={{display:"flex",flexDirection:"column",gap:6}}><MacroBar label="🥩 Protein avg" value={weekly.protein} target={targets.protein} isLow={true}/><MacroBar label="🌾 Carbs avg" value={weekly.carbs} target={targets.carbs} isLow={false}/><MacroBar label="🍬 Sugar avg" value={weekly.sugar} target={targets.sugar} isLow={false}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:8,fontSize:"0.65rem",color:G.textSoft}}><span>Avg calories</span><span style={{fontWeight:700,color:G.brown}}>{weekly.calories} kcal/day</span></div></div>);})()}
          </div>
          );
        })()} 

        {/* ── PRAYER ── */}
        {tab==="prayer"&&(
          <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:12}}>
            <MorningTenTab currentClient={currentClient} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate} sheetData={sheetData} sheetLoaded={sheetLoaded} fetchSheets={fetchSheets} SHEETS_ID={SHEETS_ID} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded}/>
            <div style={{...card,background:`linear-gradient(135deg,${G.green},${G.greenMid})`,border:"none"}}><div style={{fontSize:"0.58rem",color:"rgba(255,255,255,.75)",letterSpacing:"2px",textTransform:"uppercase",marginBottom:6}}>Today's Scripture</div><div style={{fontSize:"0.88rem",color:G.white,fontStyle:"italic",lineHeight:1.7,marginBottom:6}}>"{SCRIPTURES[scriptureIdx].verse}"</div><div style={{fontSize:"0.68rem",color:"rgba(255,255,255,.8)",fontWeight:700}}>— {SCRIPTURES[scriptureIdx].ref}</div></div>
            <div style={card}><div style={{fontSize:"0.7rem",color:G.green,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>🙏 Today's Prayer</div><div style={{fontSize:"0.8rem",color:G.text,lineHeight:1.75,fontStyle:"italic"}}>{PRAYERS[prayerIdx]}</div></div>
      
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
    {id:"hiitbpm",label:"❤️ HIIT Peak BPM", data:(()=>{
      try{const h=JSON.parse(localStorage.getItem("atp-hiit")||"[]");return h.filter(e=>e.bpm&&e.clientId===cid).map(e=>({date:e.date,value:e.bpm}));}catch{return [];}
    })(), unit:" bpm", color:"#dc2626"},
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

            {/* Health Score Card */}
            {(()=>{
              const cid=currentClient.id;
              // Nutrition score
              const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
              const nutriScore=nutriDays.length>0?Math.round(nutriDays.reduce((acc,date)=>{
                const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");
                const t=getDayTotals(meals);const tgt=getTargets(currentClient.weight);
                return acc+(t.protein>=tgt.protein*0.8?40:t.protein>=tgt.protein*0.6?20:0)+(t.carbs<=tgt.carbs?30:t.carbs<=tgt.carbs*1.2?15:0)+(t.sugar<=tgt.sugar?30:t.sugar<=tgt.sugar*1.3?15:0);
              },0)/nutriDays.length):0;

              // Workout consistency (last 7 days)
              let hiitDays=[];
              try{hiitDays=JSON.parse(localStorage.getItem("atp-hiit")||"[]").filter(e=>e.clientId===cid);}catch{}
              const recentWorkouts=[...hiitDays].filter(e=>{const d=new Date(e.date+"T12:00:00");return(new Date()-d)/86400000<=7;});
              const workoutScore=Math.min(100,recentWorkouts.length*25);

              // BPM zone score — more time in zones 3-4 = better
              const lastHiitWithZones=hiitDays.filter(e=>e.zones).slice(-1)[0];
              const zoneScore=lastHiitWithZones?(
                (lastHiitWithZones.zones.zone3?.pct||0)*0.8+
                (lastHiitWithZones.zones.zone4?.pct||0)*1.0+
                (lastHiitWithZones.zones.zone5?.pct||0)*0.6
              ):null;

              // Weight trend
              const weightLogs=Object.values(logs[cid]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?1:-1).slice(-4);
              let weightScore=50;
              if(weightLogs.length>=2){
                const diff=parseFloat(weightLogs[weightLogs.length-1].weight)-parseFloat(weightLogs[0].weight);
                weightScore=diff<=0?Math.min(100,50+Math.abs(diff)*10):Math.max(0,50-diff*10);
              }

              // Overall score
              const overall=Math.round((nutriScore*0.35)+(workoutScore*0.35)+(weightScore*0.2)+(zoneScore!==null?Math.min(100,zoneScore):50)*0.1);
              const color=overall>=70?"#10b981":overall>=50?"#f59e0b":"#dc2626";
              const label=overall>=70?"🟢 Thriving":overall>=50?"🟡 Making Progress":"🔴 Needs Attention";
              const bgColor=overall>=70?"#f0fdf4":overall>=50?"#fffbeb":"#fef2f2";
              const borderColor=overall>=70?"#6ee7b7":overall>=50?"#fcd34d":"#fca5a5";

              const breakdown=[
                {l:"🥗 Nutrition",v:nutriScore,color:nutriScore>=70?"#10b981":nutriScore>=50?"#f59e0b":"#dc2626"},
                {l:"💪 Workouts",v:workoutScore,color:workoutScore>=75?"#10b981":workoutScore>=50?"#f59e0b":"#dc2626"},
                {l:"⚖️ Weight Trend",v:weightScore,color:weightScore>=70?"#10b981":weightScore>=50?"#f59e0b":"#dc2626"},
                ...(zoneScore!==null?[{l:"❤️ Heart Zones",v:Math.min(100,Math.round(zoneScore)),color:zoneScore>=60?"#10b981":zoneScore>=40?"#f59e0b":"#dc2626"}]:[]),
              ];

              return(
                <div style={{...card,background:bgColor,border:`2px solid ${borderColor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:"0.62rem",color:G.textSoft,fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>Overall Health Score</div>
                      <div style={{fontSize:"0.78rem",fontWeight:700,color}}>{label}</div>
                    </div>
                    <div style={{width:64,height:64,borderRadius:"50%",background:color+"22",border:`4px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column"}}>
                      <div style={{fontSize:"1.3rem",fontWeight:900,color,lineHeight:1}}>{overall}</div>
                      <div style={{fontSize:"0.5rem",color,fontWeight:600}}>/100</div>
                    </div>
                  </div>
                  <div style={{height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden",marginBottom:12}}>
                    <div style={{height:"100%",width:`${overall}%`,background:color,borderRadius:4,transition:"width .8s"}}/>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {breakdown.map((b,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{fontSize:"0.68rem",color:G.textSoft,width:100,flexShrink:0}}>{b.l}</div>
                        <div style={{flex:1,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${b.v}%`,background:b.color,borderRadius:3,transition:"width .6s"}}/>
                        </div>
                        <div style={{fontSize:"0.64rem",fontWeight:700,color:b.color,width:28,textAlign:"right"}}>{b.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:10,fontSize:"0.62rem",color:G.textSoft,fontStyle:"italic",textAlign:"center"}}>
                    Updated based on last 7 days · Upload HIIT screenshot for heart zone score
                  </div>
                </div>
              );
            })()}

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
    {tab==="grocery"&&<GroceryTab currentClient={currentClient} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} lbl={lbl} nutrition={nutrition}/>}
      {tab==="abs"&&<AbsTab currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate}/>}      {tab==="running"&&<RunningTab currentClient={currentClient} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate} sbSetGlobal={sbSetGlobal}/>}         {tab==="cals"&&<CalisthenicsTab  currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate}/>}
{tab==="trx"&&<TRXTab currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate} sbSetGlobal={sbSetGlobal}/>}
        {tab==="trampoline"&&<TrampolineTab currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate} sbSetGlobal={sbSetGlobal}/>}        
{tab==="gym"&&<GymTab currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr} fmtDate={fmtDate} setTab={setTab}/>}
        {tab==="hiit"&&<HIITTab currentClient={currentClient} sheetData={sheetData} sheetLoaded={sheetLoaded} setSheetData={setSheetData} setSheetLoaded={setSheetLoaded} SHEETS_ID={SHEETS_ID} G={G} card={card} iStyle={iStyle} btnGreen={btnGreen} btnMango={btnMango} lbl={lbl} todayStr={todayStr}/>}



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
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:"0.83rem",fontWeight:700,color:G.brown}}>Your Clients</div>
              <button onClick={()=>setShowInactive(s=>!s)} style={{fontSize:"0.62rem",padding:"3px 10px",borderRadius:20,border:`1px solid ${G.border}`,background:G.cream,color:G.textSoft,cursor:"pointer",fontFamily:"inherit"}}>{showInactive?"Hide Inactive":"Show Inactive"}</button>
            </div>
            {[...clients].sort((a,b)=>(b.active===false?-1:1)-(a.active===false?-1:1)).filter(c=>c.active!==false||showInactive).map(client=>{
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
                <div>
                  <div style={{fontSize:"0.95rem",fontWeight:700,color:G.text}}>{selectedClientCoach.name}</div>
                  <div style={{fontSize:"0.66rem",color:G.textSoft}}>Age {selectedClientCoach.age} · {selectedClientCoach.weight}lbs → {selectedClientCoach.goalWeight}lbs</div>
                  {selectedClientCoach.birthday&&(()=>{
                    const bday=new Date(selectedClientCoach.birthday+"T12:00:00");
                    const today=new Date();
                    const isBirthday=bday.getMonth()===today.getMonth()&&bday.getDate()===today.getDate();
                    const next=new Date(today.getFullYear(),bday.getMonth(),bday.getDate());
                    if(next<today) next.setFullYear(today.getFullYear()+1);
                    const daysUntil=Math.ceil((next-today)/86400000);
                    return(
                      <div style={{marginTop:4,fontSize:"0.68rem",color:isBirthday?G.mangoDeep:G.textSoft,fontWeight:isBirthday?700:400}}>
                        {isBirthday?"🎂 TODAY IS THEIR BIRTHDAY! Send a message!":daysUntil<=7?`🎂 Birthday in ${daysUntil} days — ${bday.toLocaleDateString("en-US",{month:"long",day:"numeric"})}`:`🎂 ${bday.toLocaleDateString("en-US",{month:"long",day:"numeric"})}`}
                      </div>
                    );
                  })()}
                </div>
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

   {/* AI Coach Analysis */}
              {(()=>{
                const cid=selectedClientCoach.id;

            

                async function runCoachAnalysis(question){
                  setCoachAiLoading(true);setCoachAiAnalysis("");setCoachAiDraft("");
                  // Gather all client data
                  const clientR=ratings[cid]||[];
                  const lastRatings=clientR.slice(-5);
                  const avgRating=lastRatings.length>0?(lastRatings.reduce((a,r)=>a+r.rating,0)/lastRatings.length).toFixed(1):"no data";
                  const weightLogs=Object.values(logs[cid]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?1:-1).slice(-6);
                  const weightTrend=weightLogs.length>=2?`${weightLogs[0].weight}lbs → ${weightLogs[weightLogs.length-1].weight}lbs over ${weightLogs.length} weigh-ins`:"not enough weigh-ins";
                  const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
                  const nutriScore=nutriDays.length>0?Math.round(nutriDays.reduce((acc,date)=>{const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");const t=getDayTotals(meals);const tgt=getTargets(selectedClientCoach.weight);return acc+(t.protein>=tgt.protein*0.8?40:20)+(t.carbs<=tgt.carbs?30:0)+(t.sugar<=tgt.sugar?30:0);},0)/nutriDays.length):0;
                  let hiitHistory=[];
                  try{hiitHistory=JSON.parse(localStorage.getItem("atp-hiit")||"[]").filter(e=>e.clientId===cid).slice(-5);}catch{}
                  const bpmTrend=hiitHistory.filter(e=>e.bpm).map(e=>`${e.bpm}bpm (${e.date})`).join(", ")||"no BPM data";
                  const checkInStreak=Object.keys(logs[cid]||{}).sort().reverse().length;
                  const clientProgram=program[cid];

                  const prompt=`You are a professional health coach assistant helping Coach MJ analyze a client. Be specific, data-driven, and actionable.

CLIENT PROFILE:
Name: ${selectedClientCoach.name}, Age: ${selectedClientCoach.age}, Current weight: ${selectedClientCoach.weight}lbs, Goal weight: ${selectedClientCoach.goalWeight}lbs
Goal: ${selectedClientCoach.goal}, Level: ${selectedClientCoach.level}
Injuries: ${selectedClientCoach.injury||"none"}, Medical: ${selectedClientCoach.medical||"none"}

DATA (last 7-30 days):
- Weight trend: ${weightTrend}
- Nutrition compliance score: ${nutriScore}/100 (${nutriDays.length} days logged)
- Workout ratings: avg ${avgRating}/5 (last 5 sessions)
- HIIT BPM history: ${bpmTrend}
- Check-in streak: ${checkInStreak} days total
- Program: Week ${clientProgram?.currentWeek||"not started"} of 12

COACH'S QUESTION: ${question}

Respond with TWO sections:
1. ANALYSIS: 3-4 sentences of specific, data-driven coaching insight
2. CLIENT MESSAGE: A warm, faith-based message MJ can send directly to ${selectedClientCoach.name.split(" ")[0]} (2-3 sentences, encouraging, specific to their data, end with a scripture or faith reference)

Format exactly as:
ANALYSIS: [your analysis]
MESSAGE: [the client message]`;

                  try{
                    const res=await fetch("https://api.anthropic.com/v1/messages",{
                      method:"POST",
                      headers:{"content-type":"application/json","x-api-key":import.meta.env.VITE_API_KEY||"","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
                      body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,messages:[{role:"user",content:prompt}]})
                    });
                    const data=await res.json();
                    const text=data.content?.[0]?.text||"";
                    const analysisMatch=text.match(/ANALYSIS:([\s\S]*?)MESSAGE:/);
                    const messageMatch=text.match(/MESSAGE:([\s\S]*?)$/);
                    setCoachAiAnalysis(analysisMatch?analysisMatch[1].trim():"Unable to generate analysis.");
                    setCoachAiDraft(messageMatch?messageMatch[1].trim():"");
                  }catch(e){setCoachAiAnalysis("Error generating analysis. Please try again.");}
                  setCoachAiLoading(false);
                }

      const PRESET_QUESTIONS=[
                  {id:"overall",label:"📊 Overall Progress",q:`Analyze ${selectedClientCoach.name}'s overall health and fitness progress.`},
                  {id:"weight",label:"⚖️ Weight Not Moving",q:`${selectedClientCoach.name}'s weight isn't changing. What should I adjust?`},
                  {id:"intensity",label:"💪 Workout Intensity",q:`Is ${selectedClientCoach.name}'s workout intensity appropriate for their goals?`},
                  {id:"focus",label:"🎯 This Week's Focus",q:`What should I focus on with ${selectedClientCoach.name} this week?`},
                  {id:"nutrition",label:"🥗 Nutrition Review",q:`Review ${selectedClientCoach.name}'s nutrition habits and suggest improvements.`},
                ];

                async function runCoachAnalysis(question){
                  setCoachAiLoading(true);setCoachAiAnalysis("");setCoachAiDraft("");
                  const clientR=ratings[cid]||[];
                  const lastRatings=clientR.slice(-5);
                  const avgRating=lastRatings.length>0?(lastRatings.reduce((a,r)=>a+r.rating,0)/lastRatings.length).toFixed(1):"no data";
                  const weightLogs=Object.values(logs[cid]||{}).filter(l=>l.weight).sort((a,b)=>a.date>b.date?1:-1).slice(-6);
                  const weightTrend=weightLogs.length>=2?`${weightLogs[0].weight}lbs → ${weightLogs[weightLogs.length-1].weight}lbs over ${weightLogs.length} weigh-ins`:"not enough weigh-ins";
                  const nutriDays=Object.keys(nutrition[cid]||{}).filter(d=>((nutrition[cid]||{})[d]||[]).some(m=>m.meal!=="__water__")).sort().slice(-7);
                  const nutriScore=nutriDays.length>0?Math.round(nutriDays.reduce((acc,date)=>{const meals=((nutrition[cid]||{})[date]||[]).filter(m=>m.meal!=="__water__");const t=getDayTotals(meals);const tgt=getTargets(selectedClientCoach.weight);return acc+(t.protein>=tgt.protein*0.8?40:20)+(t.carbs<=tgt.carbs?30:0)+(t.sugar<=tgt.sugar?30:0);},0)/nutriDays.length):0;
                  let hiitHistory=[];
                  try{hiitHistory=JSON.parse(localStorage.getItem("atp-hiit")||"[]").filter(e=>e.clientId===cid).slice(-5);}catch{}
                  const bpmTrend=hiitHistory.filter(e=>e.bpm).map(e=>`${e.bpm}bpm (${e.date})`).join(", ")||"no BPM data";
                  const checkInStreak=Object.keys(logs[cid]||{}).sort().reverse().length;
                  const clientProgram=program[cid];
                  const prompt=`You are a professional health coach assistant helping Coach MJ analyze a client. Be specific, data-driven, and actionable.

CLIENT PROFILE:
Name: ${selectedClientCoach.name}, Age: ${selectedClientCoach.age}, Current weight: ${selectedClientCoach.weight}lbs, Goal weight: ${selectedClientCoach.goalWeight}lbs
Goal: ${selectedClientCoach.goal}, Level: ${selectedClientCoach.level}
Injuries: ${selectedClientCoach.injury||"none"}, Medical: ${selectedClientCoach.medical||"none"}

DATA (last 7-30 days):
- Weight trend: ${weightTrend}
- Nutrition compliance score: ${nutriScore}/100 (${nutriDays.length} days logged)
- Workout ratings: avg ${avgRating}/5 (last 5 sessions)
- HIIT BPM history: ${bpmTrend}
- Check-in streak: ${checkInStreak} days total
- Program: Week ${clientProgram?.currentWeek||"not started"} of 12

COACH'S QUESTION: ${question}

Respond with TWO sections:
1. ANALYSIS: 3-4 sentences of specific, data-driven coaching insight
2. CLIENT MESSAGE: A warm, faith-based message MJ can send directly to ${selectedClientCoach.name.split(" ")[0]} (2-3 sentences, encouraging, specific to their data, end with a scripture or faith reference)

Format exactly as:
ANALYSIS: [your analysis]
MESSAGE: [the client message]`;
                  try{
                    const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":import.meta.env.VITE_API_KEY||"","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:600,messages:[{role:"user",content:prompt}]})});
                    const data=await res.json();
                    const text=data.content?.[0]?.text||"";
                    const analysisMatch=text.match(/ANALYSIS:([\s\S]*?)MESSAGE:/);
                    const messageMatch=text.match(/MESSAGE:([\s\S]*?)$/);
                    setCoachAiAnalysis(analysisMatch?analysisMatch[1].trim():"Unable to generate analysis.");
                    setCoachAiDraft(messageMatch?messageMatch[1].trim():"");
                  }catch(e){setCoachAiAnalysis("Error generating analysis. Please try again.");}
                  setCoachAiLoading(false);
                }

                return(
                  <div style={{...card,border:`1.5px solid ${G.mango}44`,background:"#fff9f0"}}>
                    <div style={{fontSize:"0.72rem",fontWeight:700,color:G.mangoDeep,marginBottom:8}}>🤖 AI Coach Analysis</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10}}>
                      {PRESET_QUESTIONS.map(q=>(
                        <button key={q.id} onClick={()=>{setCoachAiQuestion(q.id);runCoachAnalysis(q.q);}} style={{padding:"10px 12px",borderRadius:10,border:`2px solid ${coachAiQuestion===q.id?G.mangoDeep:G.border}`,background:coachAiQuestion===q.id?"#fff3e0":G.cream,color:coachAiQuestion===q.id?G.mangoDeep:G.text,fontSize:"0.74rem",fontWeight:coachAiQuestion===q.id?700:400,cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                          {q.label}
                        </button>
                      ))}
                    </div>
                    {coachAiLoading&&<div style={{textAlign:"center",padding:"14px 0",fontSize:"0.76rem",color:G.mangoDeep}}>✨ Analyzing {selectedClientCoach.name.split(" ")[0]}'s data...</div>}
                    {coachAiAnalysis&&!coachAiLoading&&(
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        <div style={{padding:"12px 14px",background:"#fff",borderRadius:10,border:`1px solid ${G.mango}44`}}>
                          <div style={{fontSize:"0.64rem",fontWeight:700,color:G.mangoDeep,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Analysis</div>
                          <div style={{fontSize:"0.76rem",color:G.text,lineHeight:1.7}}>{coachAiAnalysis}</div>
                        </div>
                        {coachAiDraft&&(
                          <div style={{padding:"12px 14px",background:"#f0faf4",borderRadius:10,border:`1px solid ${G.greenLight}`}}>
                            <div style={{fontSize:"0.64rem",fontWeight:700,color:G.green,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>Suggested Message to {selectedClientCoach.name.split(" ")[0]}</div>
                            <div style={{fontSize:"0.76rem",color:G.text,lineHeight:1.7,marginBottom:10,fontStyle:"italic"}}>{coachAiDraft}</div>
                            <button onClick={()=>{sendCoachMessage(cid,coachAiDraft);setCoachAiDraft("");setCoachAiAnalysis("");setCoachAiQuestion("");}} style={{...btnGreen,padding:"9px",fontSize:"0.76rem"}}>✉️ Send This Message</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={card}><div style={lbl}>Send Encouragement</div>
                <textarea value={msgDraft[selectedClientCoach.id]||""} onChange={e=>setMsgDraft(p=>({...p,[selectedClientCoach.id]:e.target.value}))} placeholder={`Write to ${selectedClientCoach.name.split(" ")[0]}...`} rows={3} style={{...iStyle,resize:"none",marginBottom:8}}/>
                <button onClick={()=>sendCoachMessage(selectedClientCoach.id,msgDraft[selectedClientCoach.id]||"")} style={btnMango}>✉️ Send Message</button>
              </div>

              {/* Legal agreement */}
              {selectedClientCoach.agreedToTerms&&(
                <div style={{...card,border:`1.5px solid ${G.greenLight}`,background:"#f0faf4"}}>
                  <div style={lbl}>📋 Legal Agreement</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"0.74rem",color:G.text,fontWeight:600}}>✅ Terms Agreed</span>
                      <span style={{fontSize:"0.68rem",color:G.textSoft}}>{new Date(selectedClientCoach.agreedAt||"").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                    </div>
                    {selectedClientCoach.phone&&(
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{fontSize:"0.74rem",color:G.textSoft}}>📱 Phone</span>
                        <span style={{fontSize:"0.74rem",fontWeight:700,color:G.text}}>{selectedClientCoach.phone}</span>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:"0.74rem",color:G.textSoft}}>💬 Text Consent</span>
                      <span style={{fontSize:"0.74rem",fontWeight:700,color:selectedClientCoach.textConsent?G.green:G.red}}>{selectedClientCoach.textConsent?"Yes — OK to text":"No — do not text"}</span>
                    </div>
                    <div style={{marginTop:4,padding:"8px 10px",background:G.white,borderRadius:8,fontSize:"0.64rem",color:G.textSoft,fontStyle:"italic",lineHeight:1.6}}>Client agreed to All Things Possible Health Coaching terms and informed consent on the date above.</div>
                  </div>
                </div>
              )}

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

      