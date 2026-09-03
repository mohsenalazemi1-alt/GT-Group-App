let allTrades=[];

const KEY=(typeof SUPABASE_PUBLIC_ANON_KEY!=='undefined'?SUPABASE_PUBLIC_ANON_KEY:'');

async function fetchData(){
  try{
    const ctrl=new AbortController();
    const tid=setTimeout(()=>ctrl.abort(),8000);
    const res=await fetch(SUPABASE_URL+'/rest/v1/recommendations?select=*&order=published_at.desc&limit=200',{headers:{apikey:KEY,Authorization:'Bearer '+KEY},signal:ctrl.signal});
    clearTimeout(tid);
    return await res.json();
  }catch(e){return [];}
}

function showTab(id){
  document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});
  document.querySelectorAll('.period').forEach(function(p){p.classList.remove('active')});
  document.getElementById(id).classList.add('active');
}

function daysAgo(n){var d=new Date();d.setDate(d.getDate()-n);d.setHours(0,0,0,0);return d;}
function weeksAgo(n){return daysAgo(n*7);}
function monthsAgo(n){var d=new Date();d.setMonth(d.getMonth()-n,1);d.setHours(0,0,0,0);return d;}

function filterTrades(trades,start,end){
  return trades.filter(function(t){
    var d=new Date(t.published_at);
    return d>=start&&d<=end;
  });
}

function stats(trades){
  var total=trades.length;
  var wins=trades.filter(function(t){return t.status==='win'||t.status==='won'||t.status==='نجاحت'}).length;
  var losses=trades.filter(function(t){return t.status==='loss'||t.status==='lost'||t.status==='خسار'}).length;
  var pending=total-wins-losses;
  var rate=total>0?Math.round((wins/total)*100):0;
  return {total:total,wins:wins,losses:losses,pending:pending,rate:rate};
}

function renderStats(container,s){
  container.innerHTML='<div class="stat-card"><div class="num">'+s.total+'</div><div class="label">إجمالي الصفقات</div></div><div class="stat-card win"><div class="num">'+s.wins+'</div><div class="label">ناجحة</div></div><div class="stat-card loss"><div class="num">'+s.losses+'</div><div class="label">خاسرة</div></div><div class="stat-card"><div class="num">'+s.pending+'</div><div class="label">قيد الانتظار</div></div><div class="stat-card"><div class="num">'+s.rate+'%</div><div class="label">نسبة النجاح</div></div>';
}

function renderTrade(t){
  var d=new Date(t.published_at);
  var date=d.toLocaleDateString('ar-KW',{day:'numeric',month:'short'});
  var time=d.toLocaleTimeString('ar-KW',{hour:'2-digit',minute:'2-digit'});
  var typeClass=(t.type==='sell'||t.type==='short')?'sell':'buy';
  var statusClass=t.status==='win'||t.status==='won'?'win':t.status==='loss'||t.status==='lost'?'loss':'pending';
  var statusText=t.status==='win'||t.status==='won'?'ناجحة':t.status==='loss'||t.status==='lost'?'خسارة':'قيد الانتظار';
  return '<div class="trade"><span class="trade-type '+typeClass+'">'+(t.type||'--')+'</span><div class="trade-info"><span class="trade-symbol">'+(t.symbol||'--')+'</span><span class="trade-meta">'+(t.market||'')+' · دخول: '+(t.entry||'--')+' · TP: '+(t.tp1||'--')+' · SL: '+(t.sl||'--')+' · '+date+' '+time+'</span></div><span class="trade-status '+statusClass+'">'+statusText+'</span></div>';
}

function renderDayGroup(trades,dateStr){
  var dayTrades=trades.filter(function(t){return new Date(t.published_at).toLocaleDateString('ar-KW')===dateStr});
  if(dayTrades.length===0)return '';
  var h='<div class="report-section"><div class="day-header"><h4>'+dateStr+'</h4><span class="count">'+dayTrades.length+' صفقة</span></div><div class="trade-list">';
  dayTrades.forEach(function(t){h+=renderTrade(t)});
  h+='</div></div>';
  return h;
}

function renderWeekGroup(trades,weekStart,weekEnd,label){
  var weekTrades=filterTrades(trades,weekStart,weekEnd);
  if(weekTrades.length===0)return '';
  var s=stats(weekTrades);
  var h='<div class="report-section"><div class="day-header"><h4>'+label+'</h4><span class="count">'+s.total+' صفقة · '+s.rate+'% نجاح</span></div><div class="trade-list">';
  weekTrades.forEach(function(t){h+=renderTrade(t)});
  h+='</div></div>';
  return h;
}

async function loadReports(){
  var el=document.getElementById('dailyContent');
  el.innerHTML='<div class="loading">جاري تحميل البيانات...</div>';
  allTrades=await fetchData();
  if(!allTrades||allTrades.length===0){
    ['dailyContent','weeklyContent','monthlyContent'].forEach(function(id){
      document.getElementById(id).innerHTML='<div class="empty-state"><div class="ico">📊</div><h3>لا توجد توصيات بعد</h3><p>ستظهر التوصيات هنا تلقائياً عند نشرها عبر القناة</p></div>';
    });
    return;
  }
  // Daily
  var dailyS=stats(filterTrades(allTrades,daysAgo(1),new Date()));
  renderStats(document.getElementById('dailyStats'),dailyS);
  var dailyHtml='';
  for(var i=0;i<7;i++){
    var day=new Date();day.setDate(day.getDate()-i);
    dailyHtml+=renderDayGroup(allTrades,day.toLocaleDateString('ar-KW',{weekday:'long',day:'numeric',month:'long'}));
  }
  document.getElementById('dailyContent').innerHTML=dailyHtml||'<div class="empty-state"><div class="ico">📅</div><h3>ما في صفقات اليوم</h3></div>';
  // Weekly
  var weeklyS=stats(filterTrades(allTrades,weeksAgo(4),new Date()));
  renderStats(document.getElementById('weeklyStats'),weeklyS);
  var weeklyHtml='';
  for(var i=0;i<4;i++){
    var ws=weeksAgo(i);var we=i===0?new Date():weeksAgo(i-1);
    var label=i===0?'هذا الأسبوع':i===1?'الأسبوع الماضي':'قبل '+i+' أسابيع';
    weeklyHtml+=renderWeekGroup(allTrades,ws,we,label);
  }
  document.getElementById('weeklyContent').innerHTML=weeklyHtml||'<div class="empty-state"><div class="ico">📆</div><h3>ما في صفقات هالأسبوع</h3></div>';
  // Monthly
  var monthlyS=stats(filterTrades(allTrades,monthsAgo(3),new Date()));
  renderStats(document.getElementById('monthlyStats'),monthlyS);
  var monthlyHtml='';
  for(var i=0;i<3;i++){
    var ms=monthsAgo(i);var me=i===0?new Date():monthsAgo(i-1);
    monthlyHtml+=renderWeekGroup(allTrades,ms,me,ms.toLocaleDateString('ar-KW',{month:'long',year:'numeric'}));
  }
  document.getElementById('monthlyContent').innerHTML=monthlyHtml||'<div class="empty-state"><div class="ico">🗓</div><h3>ما في صفقات هالشهر</h3></div>';
}
loadReports();