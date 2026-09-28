/* RKK V4.4.1 — Planning & Alignment Fix
   Load after index.html. Does not alter existing data key.
*/
(function(){
  const V=window.__RKK441__={};
  const origPlanTable=window.planTable;
  const rp0=window.rp;

  const css=document.createElement('style');
  css.textContent=`
    .num{text-align:right!important;white-space:nowrap;font-variant-numeric:tabular-nums}
    .numhead{text-align:right!important}
    .futurebox{border:1px solid #bfdbfe;background:#f8fbff;border-radius:14px;padding:12px;margin-top:10px}
    .futureitem{display:grid;grid-template-columns:150px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid #e5e7eb}
    .futureitem:last-child{border-bottom:0}
    .futuremonth{font-weight:800}
    @media(max-width:620px){.futureitem{grid-template-columns:1fr auto}.futureitem .futurelabel{grid-column:1/-1}}
  `;
  document.head.appendChild(css);

  function ym(y,m){return y*12+(m-1)}
  function activeYM(){return ym(Number(db.settings.year),Number(db.settings.month))}
  function planActual(p){return db.tx.filter(t=>t.planId===p.id).reduce((s,t)=>s+Number(t.amount||0),0)}
  function planStatus(p){
    const cur=activeYM(), py=ym(p.year,p.month), actual=planActual(p);
    if(py>cur) return {cls:'ok',badge:'Belum berjalan',text:'Belum masuk periode'};
    if(py<cur) return {cls:'warn',badge:'Periode lewat',text: actual?`Aktual ${rp0(actual)}`:'Belum ada aktual'};
    const pct=p.amount?actual/p.amount*100:0;
    if(p.type==='Pendapatan'){
      return actual>=p.amount?{cls:'ok',badge:'Tercapai',text:`${Math.round(pct)}% tercapai`}:actual>=p.amount*.8?{cls:'warn',badge:'Hampir tercapai',text:`${Math.round(pct)}% tercapai`}:{cls:'ok',badge:'Berjalan',text:`${Math.round(pct)}% tercapai`};
    }
    return actual>p.amount?{cls:'bad',badge:'OVER',text:`Over ${rp0(actual-p.amount)} (${Math.round(pct)}%)`}:actual>=p.amount*.8?{cls:'warn',badge:'Perhatian',text:`Terpakai ${Math.round(pct)}%`}:{cls:'ok',badge:'Aman',text:`Terpakai ${Math.round(pct)}%`};
  }
  function table(arr){
    if(!arr.length) return '<div class="empty">Belum ada rencana untuk pilihan periode ini.</div>';
    return `<div class="tablewrap"><table><thead><tr><th>Jenis</th><th>Akun</th><th class="numhead">Rencana</th><th class="numhead">Aktual</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${
      arr.map(p=>{
        const r=planActual(p), st=planStatus(p);
        return `<tr><td>${esc(p.type)}</td><td>${esc(p.accountLabel)}</td><td class="num">${rp0(p.amount)}</td><td class="num">${rp0(r)}</td><td><span class="badge ${st.cls}">${st.badge}</span><br><small>${st.text}</small></td><td><button class="btn secondary" onclick="editPlan('${p.id}')">✏️</button> <button class="btn danger" onclick="deletePlan('${p.id}')">🗑️</button></td></tr>`;
      }).join('')
    }</tbody></table></div>`;
  }

  window.renderRencana=function(){
    const all=[...db.plans].sort((a,b)=>ym(a.year,a.month)-ym(b.year,b.month)||String(a.accountLabel).localeCompare(String(b.accountLabel)));
    const cur=activeYM();
    const upcoming=all.filter(p=>ym(p.year,p.month)>=cur);
    const f=window.__rkkPlanFilter||'upcoming';
    let arr=f==='current'?all.filter(p=>ym(p.year,p.month)===cur):f==='3'?all.filter(p=>ym(p.year,p.month)>=cur&&ym(p.year,p.month)<=cur+2):f==='6'?all.filter(p=>ym(p.year,p.month)>=cur&&ym(p.year,p.month)<=cur+5):f==='all'?all:upcoming;
    const groups={};
    arr.forEach(p=>{const k=`${p.year}-${String(p.month).padStart(2,'0')}`;(groups[k]??=[]).push(p)});
    const sections=Object.entries(groups).map(([k,ps])=>{
      const [y,m]=k.split('-').map(Number);
      const total=ps.reduce((s,p)=>s+p.amount,0);
      return `<div class="card"><div class="between"><div><b>${months[m-1]} ${y}</b><div class="muted">${ps.length} rencana</div></div><b>${rp0(total)}</b></div>${table(ps)}</div>`;
    }).join('');
    rencana.innerHTML=`<div class="between"><h2>Rencana</h2><button class="btn primary" onclick="openPlan()">＋ Tambah Rencana</button></div>
      <div class="card"><div class="grid2">
        <div><label>Daftar Rencana</label><select onchange="window.__rkkPlanFilter=this.value;renderRencana()">
          <option value="upcoming" ${f==='upcoming'?'selected':''}>Mendatang + Bulan Berjalan</option>
          <option value="current" ${f==='current'?'selected':''}>Bulan Berjalan</option>
          <option value="3" ${f==='3'?'selected':''}>3 Bulan Ke Depan</option>
          <option value="6" ${f==='6'?'selected':''}>6 Bulan Ke Depan</option>
          <option value="all" ${f==='all'?'selected':''}>Semua Rencana</option>
        </select></div>
        <div><label>Periode Evaluasi Saat Ini</label><div class="notice" style="margin:0"><b>${months[db.settings.month-1]} ${db.settings.year}</b></div></div>
      </div>
      <div class="notice">💡 Rencana dapat dibuat <b>sebelum bulan berjalan</b> untuk mengantisipasi kebutuhan bulan mendatang. Rencana masa depan berstatus <b>Belum berjalan</b>, bukan OVER.</div></div>
      ${sections||'<div class="card"><div class="empty">Belum ada rencana.</div></div>'}`;
  };

  // Add future agenda to Dashboard without changing current-period evaluation.
  const oldDash=window.renderDashboard;
  window.renderDashboard=function(){
    oldDash();
    const cur=activeYM(), future=[...db.plans].filter(p=>ym(p.year,p.month)>cur).sort((a,b)=>ym(a.year,a.month)-ym(b.year,b.month));
    const box=document.createElement('div'); box.className='card';
    const groups={}; future.forEach(p=>{const k=`${p.year}-${String(p.month).padStart(2,'0')}`;(groups[k]??=[]).push(p)});
    const rows=Object.entries(groups).slice(0,6).map(([k,ps])=>{
      const [y,m]=k.split('-').map(Number), total=ps.reduce((s,p)=>s+p.amount,0);
      return `<div class="futureitem"><div class="futuremonth">${months[m-1]} ${y}</div><div class="futurelabel">${ps.length} rencana</div><div class="num"><b>${rp0(total)}</b></div></div>`;
    }).join('');
    box.innerHTML=`<div class="between"><div><h3>Agenda Keuangan Mendatang</h3><div class="muted">Rencana yang sudah disiapkan untuk bulan setelah periode evaluasi.</div></div><button class="btn secondary" onclick="go('rencana')">Kelola Rencana</button></div>${rows?`<div class="futurebox">${rows}</div>`:'<div class="empty">Belum ada rencana untuk bulan mendatang.</div>'}`;
    document.getElementById('dashboard').appendChild(box);
  };

  // Numeric alignment in existing transaction/evaluation/report tables.
  const oldRenderTx=window.renderTransaksi;
  window.renderTransaksi=function(){oldRenderTx(); document.querySelectorAll('#transaksi table tr').forEach(tr=>{[...tr.children].forEach((c,i)=>{if(i===5)c.classList.add('num')})})};
  const oldRenderEval=window.renderEvaluasi;
  window.renderEvaluasi=function(){oldRenderEval(); document.querySelectorAll('#evaluasi table').forEach(tbl=>tbl.querySelectorAll('tr').forEach(tr=>{[...tr.children].forEach((c,i)=>{if([1,2,3].includes(i))c.classList.add('num')})}))};
  const oldRenderLap=window.renderLaporan;
  window.renderLaporan=function(){oldRenderLap(); document.querySelectorAll('#laporan .kpi b').forEach(b=>b.classList.add('num'))};

  // Ensure future plans can be entered explicitly. Existing form already supports month/year;
  // this only adds a visible hint and leaves stored data untouched.
  const oldOpenPlan=window.openPlan;
  window.openPlan=function(existing=null){
    oldOpenPlan(existing);
    const m=document.querySelector('.modal');
    if(m){
      const hint=document.createElement('div');
      hint.className='notice';
      hint.innerHTML='📅 <b>Perencanaan ke depan:</b> pilih bulan dan tahun kapan kebutuhan akan terjadi. Rencana tidak harus berada di bulan berjalan.';
      m.querySelector('.modalbox')?.insertBefore(hint,m.querySelector('.modalbox').children[1]||null);
    }
  };

  // Re-render using patched functions after page initialization.
  const oldRender=window.render;
  window.render=function(){oldRender();};
})();
