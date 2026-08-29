/* ═══════════════════════════════════════════════════════════════════════
   DMS Dashboard — app.js
   Todo o JavaScript do painel (extraído do index.html original)
═══════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   rfKpiTooltips() — adiciona title descritivo em cada KPI card
   para usuários que queiram contexto extra sem abrir outro painel
   ═══════════════════════════════════════════════════════════════════ */
function rfKpiTooltips(chT, chEns, nProf, nCur, nDis, nAl, cMes){
  const tips = {
    kCH:    `CH Total Semanal: ${fN(chT)}h — soma de todas as horas docentes da seleção atual`,
    kChEns: `CH Ensino: ${fN(chEns)}h — apenas horas de atividade de ensino (aulas)`,
    kPr:    `${nProf} professor${nProf>1?'es':''} distintos com registro no período filtrado`,
    kCu:    `${nCur} curso${nCur>1?'s':''} com atividade docente registrada`,
    kDi:    `${nDis} disciplina${nDis>1?'s':''} distintas ministradas`,
    kAl:    nAl===0
      ? 'Nenhum docente acima de 40h/sem — quadro saudável ✓'
      : `${nAl} docente${nAl>1?'s':''} acima do limite de 40h/sem — verificar redistribuição`,
    kCo:    `Custo bruto mensal total estimado: ${fB(cMes)} (Base + DSR + H.Atividade)`,
  };
  Object.entries(tips).forEach(([id, tip])=>{
    const el = document.getElementById(id);
    if(el){ const card = el.closest('.kc'); if(card) card.title = tip; }
  });
}


/* ═══════════════════════════════════════════════════
   MODULE: navigation — roteamento entre páginas
═══════════════════════════════════════════════════ */
/* ══ NAVEGAÇÃO ENTRE PÁGINAS ══ */
function navigateTo(page){
  const lay = document.getElementById('lay');
  const tp  = document.getElementById('termosPage');
  if(page === 'termos'){
    if(!A.raw.length){ toast('Carregue uma planilha primeiro','error'); return; }
    lay.style.display = 'none';
    tp.classList.add('ativo');
    tpInit();
  } else {
    if(tp) tp.classList.remove('ativo');
    lay.style.display = '';
    const dash = document.getElementById('dash');
    if(dash && dash.classList.contains('hid') && A.raw.length){
      dash.classList.remove('hid');
    }
  }
}

/* ═══════════════════════════════════════════════════
   MODULE: termos-ui — interface do Gerador de Termos
═══════════════════════════════════════════════════ */
/* ══ PÁGINA TERMOS: funções ══ */
function tpInit(){
  // Semestre
  const sel = document.getElementById('tpPeriodo');
  sel.innerHTML = '';
  const ano = new Date().getFullYear();
  for(let a=ano; a<=ano+4; a++){
    [1,2].forEach(s=>{
      const o = document.createElement('option');
      o.value = `${a}.${s}`; o.text = `${a}.${s}`;
      if(`${a}.${s}` === A.periodo) o.selected = true;
      sel.appendChild(o);
    });
  }
  // Data
  const datEl = document.getElementById('tpData');
  if(A.dataTermo) datEl.value = A.dataTermo;
  datEl.onchange = ()=>{ A.dataTermo = datEl.value; };
  sel.onchange   = ()=>{ A.periodo   = sel.value; };
  // Info
  const nCpf = [...new Set(A.raw.map(r=>r.pro).filter(Boolean))].filter(n=>{ const k=n.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().toUpperCase(); return A.cpfMap[k]||A.cpfMap[n.toUpperCase()]; }).length;
  document.getElementById('tpSubtitle').textContent =
    `${[...new Set(A.raw.map(r=>r.pro).filter(Boolean))].length} professores carregados · ${nCpf} CPFs mapeados`;
  tpBuild();
}

function escH(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function tpBuild(){
  const profs = [...new Set(A.raw.map(r=>r.pro).filter(Boolean))].sort();
  const grid  = document.getElementById('tpGrid');
  grid.innerHTML = '';
  const norm  = s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                    .replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();

  // Popular selects de filtro (só na primeira chamada ou se vazio)
  const selArea  = document.getElementById('tpFiltroArea');
  const selCurso = document.getElementById('tpFiltroCurso');
  if(selArea && selArea.options.length <= 1){
    const areas  = [...new Set(A.raw.map(r=>r.esc ).filter(Boolean))].sort();
    const cursos = [...new Set(A.raw.map(r=>r.curN).filter(Boolean))].sort();
    areas .forEach(v=>{ const o=document.createElement('option'); o.value=v; o.text=v; selArea .appendChild(o); });
    cursos.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.text=v; selCurso.appendChild(o); });
  }

  profs.forEach(nome=>{
    const rows = A.raw.filter(r=>r.pro===nome);
    const mat  = rows[0]?.mat||'—';
    const cpf  = A.cpfMap[norm(nome)] || A.cpfMap[nome.toUpperCase()] || null;
    const chT  = rows.reduce((s,r)=>s+(r.ch||0),0);
    const ok   = cpf && cpf !== '-';

    const label = document.createElement('label');
    label.className = 'tpcrd';

    const chk = document.createElement('input');
    chk.type='checkbox'; chk.dataset.nome=nome;
    // área e curso para filtragem
    const areas_prof  = [...new Set(A.raw.filter(r=>r.pro===nome).map(r=>r.esc ).filter(Boolean))];
    const cursos_prof = [...new Set(A.raw.filter(r=>r.pro===nome).map(r=>r.curN).filter(Boolean))];
    chk.dataset.area  = areas_prof.join('|');
    chk.dataset.curso = cursos_prof.join('|');
    chk.style.cssText='margin-top:2px;width:14px;height:14px;flex-shrink:0;accent-color:var(--o);cursor:pointer';
    chk.addEventListener('change',()=>{
      label.classList.toggle('sel', chk.checked);
      tpUpdateCount();
    });

    const info = document.createElement('div');
    info.style.cssText='min-width:0;flex:1;overflow:hidden';
    info.innerHTML =
      `<div class="tpcrd-nome" title="${escH(nome)}">${escH(nome)}</div>`+
      `<div class="tpcrd-meta">Mat: ${escH(String(mat))} &nbsp;·&nbsp; CH: ${fN(chT)}h &nbsp;·&nbsp; ${rows.length} disc.</div>`+
      `<div class="tpcrd-meta" style="color:var(--m);font-size:9.5px">${escH(areas_prof.slice(0,2).join(' · '))}</div>`+
      `<div class="tpcrd-cpf ${ok?'ok':'no'}">${ok?'✓ CPF: '+escH(cpf):'⚠ CPF não mapeado'}</div>`;

    label.appendChild(chk);
    label.appendChild(info);
    grid.appendChild(label);
  });

  document.getElementById('tpCount').textContent = profs.length + ' professores';
  tpUpdateCount();
}

function tpFilter(){
  const q     = document.getElementById('tpSearch').value.toLowerCase();
  const fArea  = (document.getElementById('tpFiltroArea') ||{}).value  || '';
  const fCurso = (document.getElementById('tpFiltroCurso')||{}).value || '';
  document.querySelectorAll('#tpGrid .tpcrd').forEach(c=>{
    const chk   = c.querySelector('input[data-nome]');
    const nome  = chk.dataset.nome.toLowerCase();
    const area  = chk.dataset.area  || '';
    const curso = chk.dataset.curso || '';
    const ok = (!q     || nome.includes(q))
            && (!fArea  || area.includes(fArea))
            && (!fCurso || curso.includes(fCurso));
    c.style.display = ok ? '' : 'none';
  });
}

function tpToggleAll(checked){
  document.querySelectorAll('#tpGrid .tpcrd').forEach(c=>{
    if(c.style.display!=='none'){
      const chk=c.querySelector('input');
      chk.checked=checked;
      c.classList.toggle('sel',checked);
    }
  });
  tpUpdateCount();
}

function tpUpdateCount(){
  const sel = [...document.querySelectorAll('#tpGrid input:checked')].length;
  const tot = [...document.querySelectorAll('#tpGrid input[data-nome]')].length;
  document.getElementById('tpSel').textContent =
    sel===0 ? 'Nenhum professor selecionado'
            : `${sel} professor${sel>1?'es':''} selecionado${sel>1?'s':''}`;
  const sa=document.getElementById('tpSelectAll');
  if(sa){sa.indeterminate=sel>0&&sel<tot; sa.checked=sel===tot&&tot>0;}
}

function tpGetSelecionados(){
  return [...document.querySelectorAll('#tpGrid input:checked')].map(c=>c.dataset.nome);
}

async function tpGerarSelecionados(){
  const nomes=tpGetSelecionados();
  if(!nomes.length){toast('Selecione ao menos um professor','error');return;}
  if(nomes.length===1){ gerarTermoPDF(nomes[0]); }
  else { await tpGerarLote(nomes); }
}

async function tpGerarTodos(){
  const nomes=[...document.querySelectorAll('#tpGrid input[data-nome]')].map(c=>c.dataset.nome);
  if(!nomes.length){toast('Carregue uma planilha primeiro','error');return;}
  await tpGerarLote(nomes);
}

async function tpGerarLote(nomes){
  toast(`Gerando ${nomes.length} termos, aguarde...`,'success');
  const prog=document.getElementById('tpProgress');
  const fill=document.getElementById('tpProgressFill');
  prog.style.display='block'; fill.style.width='0%';
  await new Promise(r=>setTimeout(r,200));
  let JSZip;
  try{
    const m=await import('https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js');
    JSZip=m.default||window.JSZip;
  }catch(e){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
    document.head.appendChild(s);
    await new Promise(r=>{s.onload=r;});
    JSZip=window.JSZip;
  }
  const zip=new JSZip(); let ok=0;
  for(let i=0;i<nomes.length;i++){
    try{
      const doc=buildTermoPDF(nomes[i]);
      zip.file('Termo_'+nomes[i].replace(/[^A-Za-z0-9]/g,'_')+'_'+A.periodo.replace('.','_')+'.pdf',doc.output('arraybuffer'));
      ok++;
    }catch(e){console.warn('Erro termo',nomes[i],e);}
    fill.style.width=Math.round((i+1)/nomes.length*100)+'%';
    await new Promise(r=>setTimeout(r,50));
  }
  prog.style.display='none';
  const blob=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='TermosAditivos_'+A.periodo.replace('.','_')+'_'+ok+'docentes.zip';
  a.click();
  toast(`${ok} termos gerados com sucesso!`,'success');
}
/* ────────────────────────────────────────────
   ESTADO
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: state — fonte única de verdade (objeto A)
═══════════════════════════════════════════════════ */
const A = {
  raw:[], fil:[], cols:[], page:1, pSize:30,
  sCol:null, sDir:1, tData:[], charts:{},
  /* Cross-filter: {field, value} or null */
  cf: null,
  /* Orçado vs Realizado data */
  orcado: null,
  /* CPF map: NOME_UPPER -> CPF */
  cpfMap: {},
  periodo: '2026.1',
  /* Data do termo */
  dataTermo: ''
};

/* TEMA */
/* ── tema atual ── */
const isDk=()=>document.documentElement.getAttribute('data-theme')==='dark';


/* ═══════════════════════════════════════════════════
   MODULE: dataStore
   Alias semântico para o estado global A.
   Permite acesso via dataStore.raw, dataStore.fil etc.
   Compatível com qualquer código que use A diretamente.
═══════════════════════════════════════════════════ */
// dataStore é uma referência ao mesmo objeto A —
// qualquer mutação em um reflete no outro
const dataStore = A; // mesmo objeto, alias descritivo

/* ═══════════════════════════════════════════════════
   MODULE: ui-utils — tema, toast, skeleton, modal
═══════════════════════════════════════════════════ */


/* ── Debounce: evita re-render excessivo ao digitar ── */
let _applyTimer = null;
function applyFDebounced(){
  clearTimeout(_applyTimer);
  _applyTimer = setTimeout(()=>applyF(), 120);
}

/* ── Toggle sidebar mobile ── */

/* ── Dropdown exportação ── */
function toggleExpMenu(e){
  e.stopPropagation();
  document.getElementById('expWrap').classList.toggle('open');
}
function closeExpMenu(){
  document.getElementById('expWrap').classList.remove('open');
}
document.addEventListener('click', ()=>closeExpMenu());

function toggleSidebar(){
  const sb = document.getElementById('sb');
  const overlay = document.getElementById('sbOverlay');
  const isOpen = sb.classList.toggle('mob-open');
  if(overlay) overlay.classList.toggle('active', isOpen);
  // Atualizar ícone do botão header
  const hdrBtn = document.getElementById('hdrMenu');
  if(hdrBtn){
    hdrBtn.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
      : '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }
  // Legacy
  const legBtn = document.getElementById('sbToggle');
  if(legBtn) legBtn.textContent = isOpen ? '✕' : '⚙';
}
function closeSidebar(){
  const sb = document.getElementById('sb');
  const overlay = document.getElementById('sbOverlay');
  if(sb){ sb.classList.remove('mob-open'); }
  if(overlay){ overlay.classList.remove('active'); }
  const hdrBtn = document.getElementById('hdrMenu');
  if(hdrBtn) hdrBtn.innerHTML = '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
}
function togTheme(){
  const el=document.documentElement;
  const cur=el.getAttribute('data-theme');
  const next=cur==='dark'?'clean':'dark';
  el.setAttribute('data-theme',next);
  document.getElementById('tBtn').textContent=next==='dark'?'☀️':'🌙';
  if(A.raw.length) rfCharts();
}

/* TOAST */
function toast(msg,type='success',ms=3800){
  const ic={success:'✅',error:'❌',warning:'⚠️'};
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${ic[type]}</span><span>${msg}</span>`;
  document.getElementById('tc').appendChild(el);
  setTimeout(()=>el.remove(),ms);
}
const showL=()=>document.getElementById('ld').classList.add('show');
const hideL=()=>document.getElementById('ld').classList.remove('show');

/* ── SKELETON ── */
function showSkeleton(){
  document.getElementById('skl').classList.add('show');
  document.getElementById('dash').classList.add('hid');
}
function hideSkeleton(){
  document.getElementById('skl').classList.remove('show');
}

/* ── CROSS-FILTER ── */
function setCF(field, value){
  A.cf={field,value};
  /* Apply on top of existing sidebar filters */
  applyF();
  /* Banner update happens after applyF re-renders, so A.fil is already filtered */
  const fieldLabel={esc:'Escola',tH:'Tipo de Hora',curN:'Curso'}[field]||field;
  document.getElementById('cfLabel').textContent=`${fieldLabel}: "${value}" — ${A.fil.length} registros`;
  document.getElementById('cfBanner').classList.add('show');
}
function clearCF(){
  A.cf=null;
  document.getElementById('cfBanner').classList.remove('show');
  applyF();
}

/* ── MODAL PROFESSOR ── */
function openPModal(nome){
  const rows=A.fil.filter(r=>r.pro===nome);
  if(!rows.length)return;

  /* KPIs */
  const chEns=rows.filter(r=>!isCoordHour(r)).reduce((s,r)=>s+r.ch,0);
  const totalBruto=rows.reduce((s,r)=>s+r.cMes,0);
  const tipos=[...new Set(rows.map(r=>r.tH).filter(Boolean))];

  document.getElementById('mProNome').textContent=nome;
  document.getElementById('mCHEns').textContent=fN(chEns)+' h/sem';
  document.getElementById('mTotalBruto').textContent=fB(totalBruto);
  document.getElementById('mTiposQtd').textContent=tipos.length;

  /* CPF badge */
  const _n=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  const cpf = A.cpfMap[_n(nome)] || A.cpfMap[String(nome||'').toUpperCase()] || '';
  const cpfBadge = document.getElementById('mCpfBadge');
  if(cpfBadge) cpfBadge.textContent = cpf ? `CPF: ${cpf}` : '(CPF não encontrado — carregue a planilha de termos)';

  /* Info do termo */
  const mat = rows[0]?.mat || '—';
  const dtFormatada = A.dataTermo
    ? new Date(A.dataTermo+'T12:00:00').toLocaleDateString('pt-BR')
    : '(defina a data acima)';
  const infoEl = document.getElementById('mTermoInfo');
  if(infoEl) infoEl.textContent = `Matrícula ${mat} · CPF ${cpf||'—'} · Data: ${dtFormatada}`;

  /* Barra de composição */
  const barEns = document.getElementById('mBarEns');
  const barEv  = document.getElementById('mBarEv');
  const barOt  = document.getElementById('mBarOt');
  if(barEns){
    barEns.style.width = pctEns+'%';
    barEv.style.width  = pctEv+'%';
    barOt.style.flex   = (100-+pctEns-+pctEv)>0?'1':'0';
    document.getElementById('mLblEns').textContent = fN(chEns)+' h ('+pctEns+'%)';
    document.getElementById('mLblEv').textContent  = fN(chEv)+' h ('+pctEv+'%)';
  }

  /* Tags de tipo — agrupadas por categoria */
  const tagsByCat = {ensino:[], evento:[], coord:[], outro:[]};
  tipos.forEach(t=>{
    const fake={tH:t};
    tagsByCat[classifyHour(fake)].push(t);
  });
  const catLabel = {ensino:'📖 Ensino', evento:'🎯 Ativ. Complementar', coord:'⚙️ Coordenação', outro:'📌 Outro'};
  const catColor = {ensino:'var(--g)', evento:'#5EA8F5', coord:'var(--o)', outro:'var(--m)'};
  let tagsHtml = '';
  Object.entries(tagsByCat).forEach(([cat, ts])=>{
    if(!ts.length) return;
    tagsHtml += ts.map(t=>`<span class="modal-tag" style="background:${catColor[cat]}22;color:${catColor[cat]};border:1px solid ${catColor[cat]}44" title="${catLabel[cat]}">${t}</span>`).join('');
  });
  document.getElementById('mTiposTags').innerHTML=tagsHtml||'<span style="color:var(--m)">—</span>';

  /* Tabela de disciplinas */
  document.getElementById('mRows').innerHTML=rows.map(r=>`
    <tr>
      <td>${r.dis||'—'}</td>
      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${r.curN||'—'}</td>
      <td>${r.tH||'—'}</td>
      <td>${fN(r.ch)} h</td>
      <td>${fB(r.ha)}</td>
      <td style="color:var(--g)">${fB(r.cMes)}</td>
    </tr>`).join('');

  document.getElementById('pModal').classList.add('show');
  document.body.style.overflow='hidden';
}
function closePModal(){
  document.getElementById('pModal').classList.remove('show');
  document.body.style.overflow='';
}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePModal();});

/* ────────────────────────────────────────────
   UPLOAD
   ──────────────────────────────────────────── */
document.getElementById('fi').addEventListener('change',e=>{
  const f=e.target.files[0]; if(f) loadExcel(f); e.target.value='';
});
const uz=document.getElementById('uz');
uz.addEventListener('dragover',e=>{e.preventDefault();uz.classList.add('dov');});
uz.addEventListener('dragleave',()=>uz.classList.remove('dov'));
uz.addEventListener('drop',e=>{
  e.preventDefault(); uz.classList.remove('dov');
  const f=e.dataTransfer.files[0];
  if(f&&(f.name.endsWith('.xlsx')||f.name.endsWith('.xls'))) loadExcel(f);
  else toast('Selecione um arquivo .xlsx válido.','error');
});

/* ────────────────────────────────────────────
   LER ARQUIVO
   ──────────────────────────────────────────────
   Planilha real: aba "Horas para cadastrar"
   Linha 1: título mesclado
   Linha 2: vazia
   Linha 3: cabeçalhos (colunas A-T)
   Linha 4+: dados
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: data — loadExcel / processData
   Lê XLSX, valida colunas, constrói A.raw
═══════════════════════════════════════════════════ */
function loadExcel(file){
  showL();
  showSkeleton();

  const rdr = new FileReader();
  rdr.onload = e => {
    /* Ceder ao browser: skeleton aparece antes de qualquer processamento */
    setTimeout(() => { _doLoad(e.target.result, file); }, 30);
  };
  rdr.readAsArrayBuffer(file);
}

function _doLoad(buffer, file){
  try{
    /* ── GARGALO 1 FIX: passar buffer direto, sem Uint8Array ─────────
       dense:true → SheetJS só cria objetos para células preenchidas
       bookVBA:false → ignora macros VBA (economiza parse)              */
    const wb = XLSX.read(buffer, {
      type: 'buffer',
      dense: true,
      bookVBA: false,
      bookFiles: false
    });

    /* ── Selecionar aba principal ─────────────────────────────────── */
    // Detectar aba principal — excluindo abas auxiliares conhecidas
    const _skipAbas = ['orcamento','orcado','docente','aux','budget','orçamento'];
    const sn = wb.SheetNames.find(n => {
      const l = n.toLowerCase();
      return l.includes('hora') || l.includes('cadastr') || l.includes('preenchi');
    }) || wb.SheetNames.find(n => {
      // fallback: primeira aba que não é auxiliar
      return !_skipAbas.some(skip => n.toLowerCase().includes(skip));
    }) || wb.SheetNames[0];
    const ws = wb.Sheets[sn];

    /* ── GARGALO 2 FIX: limitar colunas E linhas lidas ───────────────
       sheetRows não existe em dense, usamos o range diretamente       */
    const wsRef = ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    const readRange = wsRef
      ? { s: { r: wsRef.s.r, c: 0 }, e: { r: wsRef.e.r, c: Math.min(wsRef.e.c, 24) } }
      : undefined;

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      raw: true,
      range: readRange
    });

    if(!rows || rows.length < 4){
      toast('Planilha sem dados suficientes.', 'error');
      hideSkeleton(); hideL(); return;
    }

    /* ── Detectar linha de cabeçalho ─────────────────────────────── */
    let hRow = 2;
    for(let i = 0; i < Math.min(8, rows.length); i++){
      const s = rows[i].slice(0, 25).join('|').toLowerCase();
      if(s.includes('modalidade') && (s.includes('professor') || s.includes('disciplina'))){
        hRow = i; break;
      }
    }

    /* ── Extrair cabeçalhos ──────────────────────────────────────── */
    const rawH   = rows[hRow].slice(0, 20);
    const headers = rawH.map(h => String(h ?? '').trim());

    /* ── Mapear campo canônico → índice ──────────────────────────── */
    const idx = {};
    headers.forEach((h, i) => {
      const l = h.toLowerCase();
      if(l === 'modalidade')                              idx.mod  = i;
      else if(l === 'curso nome')                         idx.curN = i;
      else if(l === 'curso cod')                          idx.curC = i;
      else if(l === 'c.c. nome')                          idx.ccN  = i;
      else if(l === 'centro de custo cod.')               idx.ccC  = i;
      else if(l === 'escola')                             idx.esc  = i;
      else if(l === 'turma')                              idx.tur  = i;
      else if(l === 'disciplina')                         idx.dis  = i;
      else if(l === 'cod da disciplina')                  idx.disC = i;
      else if(l.startsWith('professor'))                  idx.pro  = i;
      else if(l.startsWith('matricula')||l.startsWith('matrícula')) idx.mat = i;
      else if(l.includes('título do cargo')||l.includes('titulo do cargo')) idx.car = i;
      else if(l === 'hora aula')                          idx.ha   = i;
      else if(l === 'tipo de hora')                       idx.tH   = i;
      else if(l === 'tipo cod')                           idx.tC   = i;
      else if(/^ch\s*$/.test(l))                          idx.ch   = i;
      else if(l === 'tipo')                               idx.tF   = i;
      else if(l === 'data início' || l === 'data inicio') idx.dI   = i;
      else if(l === 'data fim')                           idx.dF   = i;
      else if(l.startsWith('observ'))                     idx.obs  = i;
    });

    /* Fallbacks por partial match */
    const tryIdx = (field, fn) => {
      if(idx[field] === undefined){
        const i = headers.findIndex(h => fn(h.toLowerCase()));
        if(i >= 0) idx[field] = i;
      }
    };
    tryIdx('pro',  l => l.includes('professor'));
    tryIdx('ch',   l => /^ch\s*$/.test(l) || l === 'ch ');
    tryIdx('ha',   l => l.includes('hora aula'));
    tryIdx('tH',   l => l.includes('tipo de hora'));
    tryIdx('tC',   l => l.includes('tipo cod'));
    tryIdx('curN', l => l.includes('curso'));
    tryIdx('esc',  l => l.includes('escola'));
    tryIdx('dis',  l => l.includes('disciplina') && !l.includes('cod'));

    A.cols = headers.filter(Boolean);

    /* ── Funções auxiliares inline (mais rápido que chamar externas) ─ */
    const gc    = (row, f) => { const i = idx[f]; return (i !== undefined && i < row.length) ? row[i] ?? '' : ''; };
    const _pN   = v => { if(v === '' || v === null || v === undefined) return 0; const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };
    const _pDate = v => {
      if(!v || v === '') return null;
      if(v instanceof Date) return isNaN(v) ? null : v;
      const s = String(v).trim();
      let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
      m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(m) return new Date(s);
      return null;
    };

    /* ── GARGALO 3 FIX: processar em chunks de 200 linhas ────────────
       Cada chunk libera a UI para respirar, evitando "tela congelada"  */
    const dataRows    = rows.slice(hRow + 1).filter(row =>
      row && !row.slice(0, 20).every(c => c === '' || c === null || c === undefined)
    );
    const CHUNK_SIZE  = 200;
    const totalRows   = dataRows.length;
    const pb          = document.getElementById('skLoadFill');
    A.raw = [];

    function _processChunk(offset){
      const end = Math.min(offset + CHUNK_SIZE, totalRows);

      for(let i = offset; i < end; i++){
        const row = dataRows[i];
        const mod = String(gc(row, 'mod')).trim();
        const pro = String(gc(row, 'pro')).trim();
        if(!mod && !pro) continue;

        const ch  = _pN(gc(row, 'ch'));
        const ha  = _pN(gc(row, 'ha'));

        const rawObj = {};
        headers.forEach((h, ci) => { if(h) rawObj[h] = row[ci] ?? ''; });

        /* Pré-calcular folha aqui — evita recalcular no rfDash */
        const chMes = ch * 4.5;
        const base  = ha * chMes;
        const dsr   = base * 0.1667;
        const sub   = base + dsr;
        const hAtv  = sub * 0.12;

        A.raw.push({
          _ri: hRow + 1 + i, _raw: rawObj,
          mod, curN: String(gc(row,'curN')).trim(),
          curC: gc(row,'curC'), ccN: String(gc(row,'ccN')).trim(),
          ccC: gc(row,'ccC'), esc: String(gc(row,'esc')).trim(),
          tur: String(gc(row,'tur')).trim(), dis: String(gc(row,'dis')).trim(),
          disC: gc(row,'disC'), pro,
          mat: gc(row,'mat'), car: String(gc(row,'car')).trim(),
          ha, tH: String(gc(row,'tH')).trim(),
          tC: String(gc(row,'tC')).trim(), ch,
          tF: String(gc(row,'tF')).trim(),
          dI: _pDate(gc(row,'dI')), dF: _pDate(gc(row,'dF')),
          obs: String(gc(row,'obs')).trim(),
          cSem: ha * ch, chMes, base, dsr, hAtv, cMes: sub + hAtv
        });
      }

      /* Atualizar barra de progresso */
      if(pb) pb.style.width = Math.round((end / totalRows) * 80) + '%';

      if(end < totalRows){
        /* Mais chunks a processar — ceder à UI e continuar */
        setTimeout(() => _processChunk(end), 0);
      } else {
        /* ── Todos os chunks prontos ── */
        _onAllChunksReady(wb, file);
      }
    }

    _processChunk(0);

  } catch(err){
    console.error(err);
    hideSkeleton();
    toast('Erro ao processar: ' + err.message, 'error');
    hideL();
  }
}

function _onAllChunksReady(wb, file){
  try{
    if(!A.raw.length){ toast('Nenhuma linha de dados encontrada.','error'); hideSkeleton(); hideL(); return; }

    /* ── CPF Map ─────────────────────────────────────────────────── */
    (function buildCpfMap(wb){
      const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
                       .replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
      let best = null, bestScore = -1;
      wb.SheetNames.forEach(name => {
        let score = 0;
        if(/lista.*prof|prof.*lista/i.test(name)) score += 10;
        if(/docente/i.test(name)) score += 8;
        if(/prof/i.test(name)) score += 4;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true,sheetRows:2});
        if(!rows.length) return;
        const hdr = rows[0].map(c => String(c).toLowerCase());
        if(hdr.some(h => /\bcpf\b/.test(h))) score += 5;
        if(hdr.some(h => /colaborador|nome|professor/.test(h))) score += 3;
        if(score > bestScore){ bestScore = score; best = name; }
      });
      const sheetName = best || wb.SheetNames[1] || wb.SheetNames[0];
      const csData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true,sheetRows:300});
      if(csData.length < 2) return;
      const hdr = csData[0].map(c => String(c).toLowerCase());
      let cpfIdx  = hdr.findIndex(h => /\bcpf\b/.test(h));
      if(cpfIdx < 0) cpfIdx = 5;
      let nomeIdx = hdr.findIndex(h => /colaborador[\s_]?nome|colaborador/.test(h));
      if(nomeIdx < 0) nomeIdx = hdr.findIndex(h => /\b(nome|professor)\b/.test(h));
      if(nomeIdx < 0) nomeIdx = 0;
      A.cpfMap = {};
      for(let r = 1; r < csData.length; r++){
        const rawNome = String(csData[r][nomeIdx] || '').trim();
        const rawCpf  = String(csData[r][cpfIdx]  || '').trim();
        if(!rawNome || rawNome === 'A contratar') continue;
        const digits = rawCpf.replace(/\D/g, '');
        if(digits.length < 9) continue;
        const fmt = digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        A.cpfMap[norm(rawNome)] = fmt;
        A.cpfMap[rawNome.toUpperCase()] = fmt;
      }
      const nCpf = [...new Set(A.raw.map(r => r.pro).filter(Boolean))].filter(n => {
        const k = n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
        return A.cpfMap[k] || A.cpfMap[n.toUpperCase()];
      }).length;
      toast(`\u2713 ${nCpf} CPFs mapeados (aba: ${sheetName})`, 'success');
    })(wb);

    /* ── Orçado vs Realizado ──────────────────────────────────────── */
    /* ── Aba Orçamento — leitura detalhada por curso ─────────────────── */
    const ovSheet = wb.SheetNames.find(n => /or[cç]amento/i.test(n) || /orcamento/i.test(n) || /budget/i.test(n));
    A.orcado = null;
    A.orcadoDetalhado = null;
    if(ovSheet){
      try{
        const ovRows = XLSX.utils.sheet_to_json(wb.Sheets[ovSheet],{header:1,defval:'',raw:false});
        if(ovRows.length >= 2){
          /* Encontrar a linha de header — pode ter título nas primeiras linhas */
          let hdrRowIdx = 0;
          for(let ri=0; ri < Math.min(5, ovRows.length); ri++){
            const row = ovRows[ri].map(c => String(c||'').toLowerCase().trim());
            if(row.some(c => c.includes('curso')) && row.some(c => c.includes('valor') || c.includes('orcado') || c.includes('orçado'))){
              hdrRowIdx = ri; break;
            }
          }
          const hdr = ovRows[hdrRowIdx].map(c => String(c||'').toLowerCase().trim());
          const iCurso  = hdr.findIndex(h => h.includes('curso'));
          const iMod    = hdr.findIndex(h => h.includes('modal'));
          const iCHPrev = hdr.findIndex(h => h.includes('ch') || h.includes('hora'));
          const iValOrc = hdr.findIndex(h => h.includes('orcado') || h.includes('orçado') || h.includes('valor'));

          const detalhado = [];
          for(let ri=hdrRowIdx+1; ri<ovRows.length; ri++){
            const row = ovRows[ri];
            const curso = String(iCurso>=0 ? row[iCurso]||'' : '').trim();
            if(!curso) continue;
          /* Parser numérico robusto: aceita "R$ 46.000,00" (texto BR) e também
             "46000.55" (número puro, como o SheetJS pode devolver células
             sem formatação de moeda) — sem isso, um valor sem vírgula tinha
             o ponto decimal removido por engano, inflando o número. */
          const parseMoneyOrNum = v => {
            let s = String(v ?? '').trim().replace(/[R$\s]/g, '');
            if (!s) return NaN;
            if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
            return parseFloat(s);
          };
          const val = parseMoneyOrNum(iValOrc>=0 ? row[iValOrc] : 0);
          const chP = parseMoneyOrNum(iCHPrev>=0 ? row[iCHPrev] : 0);
            detalhado.push({
              curso,
              modalidade: iMod>=0 ? String(row[iMod]||'').trim() : '',
              chPrevista: isNaN(chP) ? 0 : chP,
              valorOrcado: isNaN(val) ? 0 : val,
            });
          }
          if(detalhado.length){
            A.orcadoDetalhado = detalhado;
            A.orcado = detalhado.reduce((s,r) => s + r.valorOrcado, 0) || null;
          }
        }
        /* Fallback: totalizar linha de total */
        if(!A.orcado){
          for(const row of ovRows){
            const joined = String(row.join('|')).toLowerCase();
            if(joined.includes('total')){
              const nums = row.map(c => parseFloat(String(c||'').replace(/[R$\s.]/g,'').replace(',','.'))).filter(n=>!isNaN(n)&&n>1000);
              if(nums.length){ A.orcado = Math.max(...nums); break; }
            }
          }
        }
      } catch(e){ console.warn('Aba Orçamento:', e); A.orcado = null; }
    }

    A.fil = [...A.raw];
    _lastChartFp = '';
    popF();

    const pb = document.getElementById('skLoadFill');
    if(pb) pb.style.width = '100%';
    hideSkeleton();

    /* ── Mostrar dashboard ───────────────────────────────────────── */
    document.getElementById('es').classList.add('hid');
    document.getElementById('dash').classList.remove('hid');
    /* Inicializar sistema de visões */
    initViews();
    gerarSemestres();

    requestAnimationFrame(() => {
      document.querySelectorAll('.kc').forEach(c => {
        c.classList.remove('kc-anim'); void c.offsetWidth; c.classList.add('kc-anim');
      });
    });

    /* ── Sistema de visões inicializado ────────────────
       A renderização acontece quando o usuário seleciona uma visão no menu */

    // Nada a fazer aqui — initViews() já abriu o menu de seleção
    // O usuário escolhe a visão e o switchView() renderiza tudo


  } catch(err){
    console.error(err);
    hideSkeleton();
    toast('Erro ao processar: ' + err.message, 'error');
  }
  hideL();
}
function rfDash_fase1(){
  const d = A.fil;
  const chT    = d.reduce((s,r) => s + r.ch, 0);
  const chEns  = d.filter(r => isEnsinoHour(r)).reduce((s,r) => s + r.ch, 0);
  const chEv   = d.filter(r => isEventoHour(r)).reduce((s,r) => s + r.ch, 0);
  const prS    = new Set(d.map(r => r.pro).filter(Boolean));
  const cuS    = new Set(d.map(r => r.curN).filter(Boolean));
  const diS    = new Set(d.map(r => r.dis).filter(Boolean));
  const cM     = d.reduce((s,r) => s + r.cMes, 0);
  const pm     = pCHM(d);
  const aler   = Object.entries(pm).filter(([,c]) => c >= 36).sort((a,b) => b[1]-a[1]);
  const ab40   = aler.filter(([,c]) => c > 40);
  const totalBase = d.reduce((s,r) => s + r.base, 0);
  const totalDsr  = d.reduce((s,r) => s + r.dsr,  0);
  const totalHAtv = d.reduce((s,r) => s + r.hAtv, 0);

  setKPI('kCH',  fN(chT));    setKPI('kChEns', fN(chEns)); setKPI('kChEv', fN(chEv));
  setKPI('kPr',  prS.size);   setKPI('kCu',    cuS.size);  setKPI('kDi',   diS.size);
  setKPI('kAl',  ab40.length);
  setKPI('kBase',fB(totalBase)); setKPI('kDsr', fB(totalDsr)); setKPI('kHAtv', fB(totalHAtv));
  setKPI('kCo',  fB(cM));

  const ac = document.getElementById('kAC');
  if(ac) ac.className = 'kc ' + (ab40.some(([,c]) => c > 44) ? 'da crit' : ab40.length ? 'al alert' : 'ok');

  try { rfAlerts(aler); }      catch(e){}
  try { tSF(); }               catch(e){}
  try { rfOvR(cM); }           catch(e){}
  try { rfMetadata(); }        catch(e){}
  try { updateExecSummary(); } catch(e){}
  try { rfResumoExecutivo(); } catch(e){}
  try { rfAlertasInteligentes(); } catch(e){}

  const acts = document.getElementById('dashActions');
  if(acts) acts.style.display = '';
  const inf = document.getElementById('dashActionsInfo');
  if(inf) inf.textContent = d.length + ' registros | ' + prS.size + ' docentes | ' + cuS.size + ' cursos';
}
/* ────────────────────────────────────────────
   FILTROS – POPULAR SELECTS
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: filters — applyFilters / cascateF
   Sidebar, cascata, cross-filter
═══════════════════════════════════════════════════ */
function uniq(arr,k){return[...new Set(arr.map(r=>r[k]).filter(Boolean))].sort();}
function fillS(id,vals){
  const s=document.getElementById(id),cur=s.value;
  s.innerHTML='<option value="">Todos</option>';
  vals.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(v===cur)o.selected=true;s.appendChild(o);});
}
function popF(){
  fillS('fMod',uniq(A.raw,'mod'));
  fillS('fCur',uniq(A.raw,'curN'));
  fillS('fEsc',uniq(A.raw,'esc'));
  fillS('fPro',uniq(A.raw,'pro'));
  fillS('fTH', uniq(A.raw,'tH'));
  const cods=[...new Set(A.raw.map(r=>r.tC).filter(Boolean))].sort((a,b)=>+a-+b||a.localeCompare(b));
  fillS('fTC',cods);
}

/* FILTROS EM CASCATA — Modalidade → Curso / Escola / Professor */
const gv=id=>document.getElementById(id).value;
function cascadeF(){
  const mod = gv('fMod');
  /* base: registros que passam pelo filtro de modalidade */
  const base = mod ? A.raw.filter(r=>r.mod===mod) : A.raw;

  /* preservar seleção atual antes de repopular */
  const prevCur = gv('fCur');
  const prevEsc = gv('fEsc');
  const prevPro = gv('fPro');

  /* repopular Curso, Escola e Professor com valores da modalidade */
  fillS('fCur', uniq(base,'curN'));
  fillS('fEsc', uniq(base,'esc'));
  fillS('fPro', uniq(base,'pro'));

  /* restaurar seleção se ainda válida */
  const tryRestore=(id,val)=>{
    const s=document.getElementById(id);
    const exists=[...s.options].some(o=>o.value===val);
    if(exists && val) s.value=val; else s.value='';
  };
  tryRestore('fCur',prevCur);
  tryRestore('fEsc',prevEsc);
  tryRestore('fPro',prevPro);

  applyF();
}

/* APLICAR FILTROS */
function applyF(){
  if(A.raw.length){
    document.querySelectorAll('.cc canvas').forEach(c=>c.classList.add('updating'));
    setTimeout(()=>document.querySelectorAll('.cc canvas').forEach(c=>c.classList.remove('updating')),180);
  }
  const mod=gv('fMod'),cur=gv('fCur'),esc=gv('fEsc'),pro=gv('fPro'),
        tH=gv('fTH'),tC=gv('fTC'),
        chMi=gv('fChMi')?+gv('fChMi'):null,chMa=gv('fChMa')?+gv('fChMa'):null,
        haMi=gv('fHaMi')?+gv('fHaMi'):null,haMa=gv('fHaMa')?+gv('fHaMa'):null,
        dI=gv('fDI')?new Date(gv('fDI')):null,
        dF=gv('fDF')?new Date(gv('fDF')+'T23:59:59'):null;

  /* Performance: single-pass filter using reduce-like chain */
  A.fil=A.raw.filter(r=>{
    if(mod&&r.mod!==mod)return false;
    if(cur&&r.curN!==cur)return false;
    if(esc&&r.esc!==esc)return false;
    if(pro&&r.pro!==pro)return false;
    if(tH&&r.tH!==tH)return false;
    if(tC&&r.tC!==tC)return false;
    if(chMi!==null&&r.ch<chMi)return false;
    if(chMa!==null&&r.ch>chMa)return false;
    if(haMi!==null&&r.ha<haMi)return false;
    if(haMa!==null&&r.ha>haMa)return false;
    if(dI&&r.dI&&r.dI<dI)return false;
    if(dF&&r.dF&&r.dF>dF)return false;
    /* Cross-filter (chart click) */
    if(A.cf){
      if(A.cf.field==='esc'&&r.esc!==A.cf.value)return false;
      if(A.cf.field==='tH'&&r.tH!==A.cf.value)return false;
      if(A.cf.field==='curN'&&r.curN!==A.cf.value)return false;
    }
    return true;
  });
  A.page=1; rfDash();
}

/* ── Sumário Executivo ── */
function updateExecSummary(){
  const d = A.fil;
  if(!d.length){ document.getElementById('execSummary').style.display='none'; return; }
  document.getElementById('execSummary').style.display='';

  const profs   = new Set(d.map(r=>r.pro).filter(Boolean)).size;
  const cursos  = new Set(d.map(r=>r.curN).filter(Boolean)).size;
  const escolas = new Set(d.map(r=>r.esc).filter(Boolean)).size;
  const chTotal = d.reduce((s,r)=>s+r.ch, 0);
  const chEns   = d.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch, 0);
  const cMes    = d.reduce((s,r)=>s+r.cMes, 0);
  const pm      = pCHM(d);
  const acima40 = Object.values(pm).filter(c=>c>40).length;
  const mediaChP = profs > 0 ? chTotal/profs : 0;

  // Período
  const datas = d.map(r=>r.dI).filter(d=>d instanceof Date && !isNaN(d));
  const semPeriodo = document.getElementById('execPeriodo');
  if(datas.length){
    const min = new Date(Math.min(...datas.map(d=>d.getTime())));
    const max = new Date(Math.max(...datas.map(d=>d.getTime())));
    semPeriodo.textContent = `${fD(min)} → ${fD(max)}`;
  } else {
    semPeriodo.textContent = A.periodo || '—';
  }

  const items = [
    { label:'Professores', val: profs, sub: `${fN(mediaChP)}h média/prof` },
    { label:'Cursos', val: cursos, sub: `${escolas} área${escolas!==1?'s':''}` },
    { label:'CH Total', val: fN(chTotal)+'h', sub: `${fN(chEns)}h ensino` },
    { label:'Total Bruto', val: fB(cMes), sub: 'estimado mensal' },
    { label:'Acima 40h', val: acima40, sub: acima40>0?'⚠ requer atenção':'✓ dentro do limite',
      color: acima40>0 ? 'var(--r)' : 'var(--g)' },
    { label:'Registros', val: d.length, sub: `de ${A.raw.length} total` },
  ];

  const grid = document.getElementById('execGrid');
  grid.innerHTML = items.map(it=>
    `<div class="exec-item">
      <span class="exec-label">${it.label}</span>
      <span class="exec-val" ${it.color?`style="color:${it.color}"`:''}>${it.val}</span>
      <span class="exec-sub">${it.sub}</span>
    </div>`
  ).join('');
}

/* ── Atualizar badge de filtros ativos ── */
function updateFilterBadge(){
  const filters = ['fMod','fCur','fEsc','fPro','fTH','fTC','fChMi','fChMa','fHaMi','fHaMa','fDI','fDF'];
  const active = filters.filter(id=>{
    const el = document.getElementById(id);
    return el && el.value && el.value !== '';
  }).length;
  const badge = document.getElementById('activeFiltersCount');
  if(badge){
    badge.textContent = active > 0 ? `${active} ativo${active>1?'s':''}` : '';
    badge.classList.toggle('vis', active > 0);
  }
}

function clearF(){
  updateFilterBadge();
  ['fMod','fCur','fEsc','fPro','fTH','fTC'].forEach(id=>document.getElementById(id).value='');
  ['fChMi','fChMa','fHaMi','fHaMa','fDI','fDF'].forEach(id=>document.getElementById(id).value='');
  A.cf=null;
  document.getElementById('cfBanner').classList.remove('show');
  A.fil=[...A.raw]; A.page=1; rfDash();
}

/* ────────────────────────────────────────────
   AGREGAÇÕES
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: analytics — gSum, pCHM, classifyHour
   Helpers de cálculo e classificação de horas
═══════════════════════════════════════════════════ */
function gSum(data,kFn,vFn){
  const m={};
  data.forEach(r=>{const k=kFn(r)||'(sem dado)';m[k]=(m[k]||0)+vFn(r);});
  return Object.entries(m).map(([k,v])=>({k,v})).sort((a,b)=>b.v-a.v);
}
/* Mapa CH por professor — APENAS horas de ENSINO (exclui Coordenação).
   Coordenadores têm 40h de coordenação por contrato, não é sobrecarga. */
const COORD_RE=/coordena/i;
function isCoordHour(r){ return COORD_RE.test(r.tH); }

/* ── Classificação de tipos de hora ──────────────────────────
   ENSINO    = sala de aula (Horas Ensino Superior, Ensino Distância AVA…)
   EVENTO    = atividades complementares (Estágio, TCC, RT, PIEX, NDE…)
   COORD     = coordenação (excluída dos alertas de 40h)
   ──────────────────────────────────────────────────────────── */
const ENSINO_RE = /ensino/i;
const EVENTO_RE = /estágio|estagio|tcc|orientação|orientacao|rt|piex|nde|pesquisa|eventual|permanência|permanencia|extensão|extensao/i;

function classifyHour(r){
  const t = r.tH||'';
  if(COORD_RE.test(t))   return 'coord';
  if(ENSINO_RE.test(t))  return 'ensino';
  if(EVENTO_RE.test(t))  return 'evento';
  return 'outro';
}
function isEnsinoHour(r){ return classifyHour(r)==='ensino'; }
function isEventoHour(r){ return classifyHour(r)==='evento'; }
function pCHM(data){
  const m={};
  data.forEach(r=>{
    if(!r.pro||isCoordHour(r))return;
    m[r.pro]=(m[r.pro]||0)+r.ch;
  });
  return m;
}

/* ────────────────────────────────────────────
   FORMATAÇÃO
   ──────────────────────────────────────────── */

/* ── setKPI: atualiza valor com animação de pop ── */
function setKPI(id, val){
  const el = document.getElementById(id);
  if(!el) return;
  if(el.textContent !== String(val)){
    el.textContent = val;
    el.classList.remove('pop','flash');
    void el.offsetWidth;
    el.classList.add('pop','flash');
    // remover flash após animação
    setTimeout(()=>el.classList.remove('flash'), 350);
  }
}

const fN=v=>(+v).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:1});
const fB=v=>(+v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fD=d=>d instanceof Date&&!isNaN(d)?d.toLocaleDateString('pt-BR'):(d?String(d):'');
const tr=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n)+'…':s;};

/* ────────────────────────────────────────────
   RENDER DASHBOARD
   ──────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════════════════
   MODULE: insights
   Gera insights automáticos e resumo executivo para gestores
═══════════════════════════════════════════════════════════════ */

/**
 * rfInsights() — calcula e exibe insights automáticos da gestão
 * Chamado após rfDash() em cada atualização de filtro
 */
function rfInsights(){
  const d = A.fil;
  if(!d.length){
    document.getElementById('insightsPanel').classList.remove('loaded');
    document.getElementById('resumoExecutivo').classList.remove('loaded');
    document.getElementById('alertasInteligentes').classList.remove('loaded');
    return;
  }

  /* ── Cálculos base ── */
  const pm     = pCHM(d);
  const profs  = Object.keys(pm);
  const nProfs = profs.length || 1;

  /* % ensino vs atividades complementares */
  const chEnsinoT = d.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch,0);
  const chEvT     = d.filter(r=>isEventoHour(r)).reduce((s,r)=>s+r.ch,0);
  const chTotalT  = d.reduce((s,r)=>s+r.ch,0)||1;
  const pctEnsino = Math.round((chEnsinoT/chTotalT)*100);

  /* Curso com maior CH */
  const chCurso = {};
  d.forEach(r=>{ if(r.curN) chCurso[r.curN]=(chCurso[r.curN]||0)+r.ch; });
  const topCurso = Object.entries(chCurso).sort((a,b)=>b[1]-a[1])[0] || ['—', 0];

  /* Professor com maior CH ensino */
  const topProf = Object.entries(pm).sort((a,b)=>b[1]-a[1])[0] || ['—', 0];

  /* Curso com maior custo */
  const custoCurso = {};
  d.forEach(r=>{ if(r.curN) custoCurso[r.curN]=(custoCurso[r.curN]||0)+r.cMes; });
  const topCustoCurso = Object.entries(custoCurso).sort((a,b)=>b[1]-a[1])[0] || ['—', 0];

  /* Docentes por faixa */
  const vals      = Object.values(pm);
  const nSaudavel = vals.filter(v=>v<=30).length;
  const nAtencao  = vals.filter(v=>v>30&&v<=39).length;
  const nAcima40  = vals.filter(v=>v>40&&v<=49).length;
  const nCritico  = vals.filter(v=>v>=50).length;
  const nAlerta   = nAcima40 + nCritico;
  const mediaChD  = nProfs > 0 ? (vals.reduce((s,v)=>s+v,0)/nProfs) : 0;

  /* Escola/área mais demandante */
  const chEsc = {};
  d.forEach(r=>{ if(r.esc) chEsc[r.esc]=(chEsc[r.esc]||0)+r.ch; });
  const topEsc = Object.entries(chEsc).sort((a,b)=>b[1]-a[1])[0] || ['—',0];

  /* Concentração: curso com mais docentes */
  const docCurso = {};
  d.forEach(r=>{ if(r.curN&&r.pro) { if(!docCurso[r.curN]) docCurso[r.curN]=new Set(); docCurso[r.curN].add(r.pro); }});
  const topDocCurso = Object.entries(docCurso).sort((a,b)=>b[1].size-a[1].size)[0] || ['—',{size:0}];

  /* ── Atualizar KPI estratégicos ── */
  setKPI('kMediaCH', fN(mediaChD)+'h');
  setKPI('kAcima40', nAlerta);
  /* Pulso visual em situação crítica */
  const acima40El = document.getElementById('kAcima40');
  if(acima40El){
    const cardEl = acima40El.closest('.kc');
    if(cardEl){
      cardEl.classList.toggle('pulse', nCritico > 0);
    }
  }
  setKPI('kCursoCusto', tr(topCustoCurso[0], 20));
  setKPI('kCursoCustoVal', fB(topCustoCurso[1]));
  const kccv = document.getElementById('kCursoCustoVal');
  if(kccv) kccv.textContent = fB(topCustoCurso[1]);
  const pctSaudavel = nProfs > 0 ? Math.round((nSaudavel/nProfs)*100) : 0;
  setKPI('kSaudavel', pctSaudavel+'%');

  /* Trends dos KPIs estratégicos */
  const setTrend = (id, cls, txt) => {
    const el = document.getElementById(id);
    if(el){ el.className='kc-trend '+cls; el.innerHTML=txt; }
  };
  const trendArrowUp   = '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>';
  const trendArrowDown = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

  if(mediaChD <= 20)      setTrend('kMediaCHTrend','up',   trendArrowUp   + fN(mediaChD)+'h — dentro do ideal');
  else if(mediaChD <= 30) setTrend('kMediaCHTrend','neu',  '— '+fN(mediaChD)+'h — moderado');
  else                    setTrend('kMediaCHTrend','down', trendArrowDown + fN(mediaChD)+'h — acima do ideal');

  const pctAlerta = Math.round((nAlerta/nProfs)*100);
  if(nAlerta === 0)       setTrend('kAcima40Pct','up',    trendArrowUp   + '0% do quadro — ótimo');
  else if(pctAlerta <= 15)setTrend('kAcima40Pct','neu',   pctAlerta+'% do quadro');
  else                    setTrend('kAcima40Pct','down',  trendArrowDown + pctAlerta+'% do quadro');

  const pctCustoCurso = A.fil.reduce((s,r)=>s+r.cMes,0);
  const pctCustoFrac  = pctCustoCurso > 0 ? Math.round((topCustoCurso[1]/pctCustoCurso)*100) : 0;
  setTrend('kCursoCustoPct','neu', pctCustoFrac+'% do custo total');

  if(pctSaudavel >= 80)   setTrend('kSaudavelTrend','up',   trendArrowUp   + nSaudavel+' docentes — excelente');
  else if(pctSaudavel>=60)setTrend('kSaudavelTrend','neu',  nSaudavel+' docentes — regular');
  else                    setTrend('kSaudavelTrend','down', trendArrowDown + nSaudavel+' docentes — atenção');

  /* ── Insights Grid ── */
  /* % da CH total do curso mais demandante */
  const totalCHGlobal = Object.values(chCurso).reduce((s,v)=>s+v,0)||1;
  const topCursoFrac = Math.round((topCurso[1]/totalCHGlobal)*100);

  const insightsList = [
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 17V10M12 17V7M16 17v-4"/></svg>', label:'Curso mais demandante', value: topCurso[0], sub: fN(topCurso[1])+'h/sem · '+topCursoFrac+'% do total', status:'info' },
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 19h20l-3-12-5 6-4-7-4 7-4-6z"/></svg>', label:'Maior CH docente', value: topProf[0], sub: fN(topProf[1])+'h/sem ensino', status: topProf[1]>40?'alert':topProf[1]>30?'warn':'ok' },
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 6v2m0 8v2M9 9.5C9 8.1 10.3 7 12 7s3 1.1 3 2.5c0 3-6 1.5-6 4.5C9 15.4 10.3 17 12 17s3-1.1 3-2.5"/></svg>', label:'Maior custo por curso', value: topCustoCurso[0], sub: fB(topCustoCurso[1])+'/mês', status:'info' },
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M9 21V7l9-4v18M9 11h.01M15 11h.01M9 16h.01M15 16h.01"/></svg>', label:'Área mais demandante', value: topEsc[0], sub: fN(topEsc[1])+'h/sem', status:'info' },
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>', label:'Curso com + docentes', value: topDocCurso[0], sub: topDocCurso[1].size+' professores', status:'ok' },
    nAlerta > 0
      ? { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.3L2 20h20L13.7 3.3a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', label:'Risco de sobrecarga', value: nAlerta+' docente'+(nAlerta>1?'s':''), sub: nCritico > 0 ? nCritico+' em situação crítica (≥50h)' : 'Acima de 40h/sem' }
      : { icon:'✅', label:'Carga sob controle', value: '100% dos docentes', sub: 'dentro dos limites recomendados', status:'ok' },
    { icon:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      label:'Ensino vs Atividades', value: pctEnsino+'% ensino',
      sub: fN(chEnsinoT)+'h ensino · '+fN(chEvT)+'h compl.',
      status: pctEnsino>=70?'ok':pctEnsino>=50?'warn':'alert' },
  ];

  document.getElementById('insightsGrid').innerHTML = insightsList.map(it=>
    `<div class="insight-card ${it.status||'info'}">
       <div class="insight-icon">${it.icon}</div>
       <div class="insight-body">
         <span class="insight-label">${it.label}</span>
         <span class="insight-value">${escH(it.value)}</span>
         <span class="insight-sub">${escH(it.sub)}</span>
       </div>
     </div>`
  ).join('');
  document.getElementById('insightsTs').textContent = 'atualizado ' + new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  document.getElementById('insightsPanel').classList.add('loaded');

  /* ── Resumo Executivo ── */
  rfResumoExecutivo(d, pm, nProfs, nAlerta, nCritico, pctSaudavel, topCurso, topCustoCurso, mediaChD);

  /* ── Alertas Acadêmicos ── */
  rfAlertasInteligentes(pm, nSaudavel, nAtencao, nAcima40, nCritico, nProfs);
}

/**
 * rfResumoExecutivo() — gera texto explicativo automático da situação geral
 */
function rfResumoExecutivo(d, pm, nProfs, nAlerta, nCritico, pctSaudavel, topCurso, topCustoCurso, mediaCH){
  const totalCH  = d.reduce((s,r)=>s+r.ch, 0);
  const totalMes = d.reduce((s,r)=>s+r.cMes, 0);
  const cursos   = new Set(d.map(r=>r.curN).filter(Boolean)).size;

  /* Determinar saúde geral */
  let badge, badgeCls, sentenca;
  if(nCritico > 0){
    badge='🔴 Situação Crítica'; badgeCls='crit';
    sentenca=`<strong>${nCritico} docente${nCritico>1?'s':''} em situação crítica</strong> (≥50h/sem) requer${nCritico>1?'em':''} ação imediata da gestão.`;
  } else if(nAlerta > Math.max(1, nProfs*0.15)){
    badge='🟠 Atenção Necessária'; badgeCls='warn';
    sentenca=`<strong>${nAlerta} docente${nAlerta>1?'s':''} acima de 40h/sem</strong> — avaliar redistribuição de carga.`;
  } else if(nAlerta > 0){
    badge='🟡 Situação Moderada'; badgeCls='warn';
    sentenca=`Carga geral sob controle, mas <strong>${nAlerta} docente${nAlerta>1?'s':''}</strong> merecem acompanhamento.`;
  } else {
    badge='🟢 Situação Saudável'; badgeCls='ok';
    sentenca=`Todos os docentes estão dentro dos limites recomendados de carga horária.`;
  }

  const reEl  = document.getElementById('reText');
  const bdgEl = document.getElementById('reBadge');
  const reContainer = document.getElementById('resumoExecutivo');
  bdgEl.textContent=badge; bdgEl.className='re-badge '+badgeCls;
  if(reContainer){
    reContainer.classList.remove('status-ok','status-warn','status-alert','status-crit');
    const statusMap = {ok:'status-ok', warn:'status-warn', warn2:'status-alert', crit:'status-crit'};
    reContainer.classList.add('status-' + (badgeCls === 'crit' ? 'crit' : badgeCls === 'warn' ? 'warn' : 'ok'));
  }

  reEl.innerHTML =
    `O quadro docente atual compreende <strong>${nProfs} professor${nProfs>1?'es':''}</strong> distribuídos em `+
    `<strong>${cursos} curso${cursos>1?'s':''}</strong>, com carga horária semanal total de <strong>${fN(totalCH)}h</strong> `+
    `e custo bruto mensal estimado de <strong>${fB(totalMes)}</strong>. `+
    `A média por docente é de <strong>${fN(mediaCH)}h/sem</strong>. `+
    sentenca+' '+
    `O curso <strong>${escH(topCurso[0])}</strong> concentra a maior carga e `+
    `<strong>${escH(topCustoCurso[0])}</strong> representa o maior custo de folha.`;

  /* Pills de destaque */
  const pills = [
    { ico:'📌', txt: pctSaudavel+'% com carga saudável (≤30h)' },
    { ico:'🎓', txt: cursos+' cursos ativos' },
    { ico:'💼', txt: fN(totalCH)+'h CH total semanal' },
    { ico:'💰', txt: fB(totalMes)+' folha mensal' },
  ];
  if(nAlerta>0) pills.push({ ico:'⚠️', txt: nAlerta+' docente'+(nAlerta>1?'s':'')+' acima de 40h' });

  document.getElementById('rePills').innerHTML = pills.map(p=>
    `<span class="re-pill">${p.ico} ${escH(p.txt)}</span>`
  ).join('');
  document.getElementById('resumoExecutivo').classList.add('loaded');
}

/**
 * rfAlertasInteligentes() — exibe distribuição por faixas + lista de docentes
 */
function rfAlertasInteligentes(pm, nSaud, nAtenc, nAcima, nCrit, nTotal){
  const faixas=[
    { cls:'ok',   ind:'🟢', count:nSaud,  label:'Saudável',    range:'até 30h/sem' },
    { cls:'warn', ind:'🟡', count:nAtenc, label:'Atenção',     range:'31h – 39h/sem' },
    { cls:'over', ind:'🟠', count:nAcima, label:'Acima do Rec.',range:'40h – 49h/sem' },
    { cls:'crit', ind:'🔴', count:nCrit,  label:'Crítico',     range:'50h+ /sem' },
  ];
  const fTotal = faixas.reduce((s,f)=>s+f.count,0)||1;
  document.getElementById('alertaFaixas').innerHTML = faixas.map(f=>{
    const pct = Math.round((f.count/fTotal)*100);
    return `<div class="af-card ${f.cls}" title="${f.count} docente${f.count!==1?'s':''} (${pct}%) — ${f.range}">
       <div class="af-indicator">${f.ind}</div>
       <div class="af-count">${f.count}</div>
       <div class="af-label">${f.label}</div>
       <div class="af-range">${f.range}</div>
       <div class="af-card-pct"><div class="af-card-pct-fill" style="width:${pct}%"></div></div>
     </div>`;
  }).join('');

  /* Lista dos docentes que requerem atenção */
  const problematicos = Object.entries(pm).filter(([,ch])=>ch>30).sort((a,b)=>b[1]-a[1]);
  const maxCH = problematicos.length ? problematicos[0][1] : 40;

  const listEl = document.getElementById('alertaList');
  const secEl  = document.getElementById('alertaProfs');

  if(!problematicos.length){
    secEl.style.display='none';
  } else {
    secEl.style.display='';
    listEl.innerHTML = problematicos.map(([nome,ch])=>{
      const cls  = ch>=50?'crit':ch>=40?'over':'warn';
      const lbl  = ch>=50?'Crítico':ch>=40?'Acima 40h':'Atenção';
      const color= ch>=50?'var(--red)':ch>=40?'var(--orange)':'#ca8a04';
      const pct  = Math.min(100, Math.round((ch/Math.max(maxCH,50))*100));
      return`<div class="af-item">
        <div style="flex:1;min-width:0">
          <div class="af-item-name">${escH(nome)}</div>
          <div class="af-bar"><div class="af-bar-fill" style="width:${pct}%;background:${color}"></div></div>
        </div>
        <span class="af-item-ch" style="color:${color}">${fN(ch)}h</span>
        <span class="af-item-badge ${cls}">${lbl}</span>
      </div>`;
    }).join('');
  }

  const total = nSaud+nAtenc+nAcima+nCrit;
  document.getElementById('alertasTs').textContent = total+' docentes analisados';
  document.getElementById('alertasInteligentes').classList.add('loaded');
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: metadataEngine — painel informativo de dados carregados
═══════════════════════════════════════════════════════════════ */
function rfMetadata(){
  const d = A.fil;
  const panel = document.getElementById('metadataPanel');
  if(!d.length){ panel.classList.remove('visible'); return; }
  panel.classList.add('visible');

  const nDoc  = new Set(d.map(r=>r.pro).filter(Boolean)).size;
  const nCur  = new Set(d.map(r=>r.curN).filter(Boolean)).size;
  const nDis  = new Set(d.map(r=>r.dis).filter(Boolean)).size;

  const setText = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
  setText('metaRegistros',   d.length.toLocaleString('pt-BR'));
  setText('metaDocentes',    nDoc);
  setText('metaCursos',      nCur);
  setText('metaDisciplinas', nDis);
  setText('metaPeriodo',     A.periodo || '—');

}
/* metaLoadedAt é setado em loadExcel — rfMetadata apenas lê */

/* ═══════════════════════════════════════════════════════════════
   MODULE: alertEngine — detecta padrões críticos nos dados
   Regras institucionais:
     🟢  ≤30h  — saudável
     🟡  31–39h — atenção
     🟠  40–49h — acima do recomendado
     🔴  ≥50h  — crítico (ação imediata)
═══════════════════════════════════════════════════════════════ */
function rfAlertEngine(){
  const d = A.fil;
  const panel  = document.getElementById('alertEnginePanel');
  const secEl  = document.getElementById('secAlertEngine');
  const cntEl  = document.getElementById('secAlertCount');

  if(!d.length){
    if(panel)  panel.classList.remove('loaded');
    if(secEl)  secEl.style.display = 'none';
    return;
  }

  const pm      = pCHM(d); /* CH por professor (sem coord) */
  const nProfs  = Object.keys(pm).length || 1;
  const chTotal = Object.values(pm).reduce((s,v)=>s+v, 0);
  const mediaCH = chTotal / nProfs;

  /* CH por curso */
  const chCurso = {};
  d.forEach(r=>{ if(r.curN) chCurso[r.curN]=(chCurso[r.curN]||0)+r.ch; });
  const totalCH = Object.values(chCurso).reduce((s,v)=>s+v,0)||1;
  const mediaCHCurso = totalCH / Math.max(Object.keys(chCurso).length,1);

  /* Docentes por curso */
  const docPorCurso = {};
  d.forEach(r=>{ if(r.curN&&r.pro){ if(!docPorCurso[r.curN]) docPorCurso[r.curN]=new Set(); docPorCurso[r.curN].add(r.pro); }});

  /* Disciplinas por professor */
  const disPorProf = {};
  d.forEach(r=>{ if(r.pro&&r.dis){ if(!disPorProf[r.pro]) disPorProf[r.pro]=new Set(); disPorProf[r.pro].add(r.dis); }});

  const alerts = [];

  /* ── REGRA 1: docentes críticos ≥50h ── */
  const crit50 = Object.entries(pm).filter(([,v])=>v>=50).sort((a,b)=>b[1]-a[1]);
  if(crit50.length > 0){
    alerts.push({
      cls:'crit', sev:'🔴', tag:'Crítico',
      msg: crit50.length===1
        ? `${tr(crit50[0][0],32)} com carga crítica de ${fN(crit50[0][1])}h/sem`
        : `${crit50.length} docentes com carga crítica (≥50h/sem)`,
      sub: crit50.length===1
        ? 'Docente acima de 50h — ação imediata recomendada pela gestão.'
        : crit50.slice(0,3).map(([n,v])=>tr(n,24)+': '+fN(v)+'h').join(' · ')+'...',
    });
  }

  /* ── REGRA 2: docentes acima de 40h ── */
  const over40 = Object.entries(pm).filter(([,v])=>v>=40&&v<50).sort((a,b)=>b[1]-a[1]);
  if(over40.length > 0){
    alerts.push({
      cls:'high', sev:'🟠', tag:'Alta',
      msg: `${over40.length} docente${over40.length>1?'s':''} acima de 40h/sem`,
      sub: over40.slice(0,3).map(([n,v])=>tr(n,24)+': '+fN(v)+'h').join(' · ')+(over40.length>3?' e mais '+(over40.length-3):''),
    });
  }

  /* ── REGRA 3: cursos com CH acima de 30% da média institucional ── */
  const overMediaCurso = Object.entries(chCurso)
    .filter(([,v])=>v > mediaCHCurso*1.3)
    .sort((a,b)=>b[1]-a[1]);
  overMediaCurso.slice(0,3).forEach(([curso,chV])=>{
    const pct = Math.round(((chV/mediaCHCurso)-1)*100);
    alerts.push({
      cls:'med', sev:'🟡', tag:'Média',
      msg: `${tr(curso,36)} com CH ${pct}% acima da média institucional`,
      sub: `Carga: ${fN(chV)}h/sem · Média: ${fN(mediaCHCurso)}h/sem por curso`,
    });
  });

  /* ── REGRA 4: cursos com apenas 1 docente ── */
  const singleDoc = Object.entries(docPorCurso)
    .filter(([,s])=>s.size===1)
    .sort((a,b)=>b[0].localeCompare(a[0]));
  if(singleDoc.length > 0){
    alerts.push({
      cls:'med', sev:'🟡', tag:'Distribuição',
      msg: `${singleDoc.length} curso${singleDoc.length>1?'s':''} com apenas 1 docente`,
      sub: singleDoc.slice(0,4).map(([c])=>tr(c,28)).join(' · ')+(singleDoc.length>4?' +mais':'')+' — baixa redundância docente.',
    });
  }

  /* ── REGRA 5: concentração excessiva de disciplinas ── */
  const maxDis = Math.max(...Object.values(disPorProf).map(s=>s.size), 0);
  if(maxDis > 0){
    const topConc = Object.entries(disPorProf).filter(([,s])=>s.size===maxDis).sort((a,b)=>a[0].localeCompare(b[0]));
    if(maxDis >= 6){
      alerts.push({
        cls:'med', sev:'🟡', tag:'Concentração',
        msg: `${tr(topConc[0][0],32)} com ${maxDis} disciplinas distintas`,
        sub: `Alta concentração curricular. Risco de sobrecarga qualitativa além do volume de horas.`,
      });
    }
  }

  /* ── REGRA 6: desequilíbrio de carga entre docentes ── */
  const vals   = Object.values(pm);
  if(vals.length > 2){
    const maxV = Math.max(...vals);
    const minV = Math.min(...vals);
    const ratio = maxV / (minV||1);
    if(ratio > 3){
      alerts.push({
        cls:'low', sev:'🔵', tag:'Distribuição',
        msg: `Desequilíbrio de ${ratio.toFixed(1)}x entre menor e maior carga docente`,
        sub: `Docente mais sobrecarregado (${fN(maxV)}h) vs menos ativo (${fN(minV)}h). Avaliar redistribuição.`,
      });
    }
  }

  /* ── REGRA 7: tudo OK ── */
  if(!alerts.length){
    alerts.push({
      cls:'info', sev:'✅', tag:'OK',
      msg: 'Carga horária dentro dos parâmetros institucionais',
      sub: `${nProfs} docentes analisados · Média de ${fN(mediaCH)}h/sem · Nenhum desvio crítico detectado.`,
    });
  }

  /* Render */
  const badge = alerts.some(a=>a.cls==='crit') ? 'crit' : alerts.some(a=>a.cls==='high') ? 'warn' : 'ok';
  if(cntEl){ cntEl.textContent=alerts.filter(a=>a.cls!=='info').length||'OK'; cntEl.className='sec-count'; }
  if(secEl) secEl.style.display='';

  panel.innerHTML = '<div class="ae-list">'+alerts.map(a=>
    `<div class="ae-item ${a.cls}">
       <span class="ae-sev">${a.sev}</span>
       <div class="ae-body">
         <div class="ae-msg">${escH(a.msg)}</div>
         <div class="ae-sub">${escH(a.sub)}</div>
         <span class="ae-tag ${a.cls}">${a.tag}</span>
       </div>
     </div>`
  ).join('')+'</div>';
  panel.classList.add('loaded');
}

/* ═══════════════════════════════════════════════════════════════
   MODULE: rankingEngine — rankings automáticos com drill-down
═══════════════════════════════════════════════════════════════ */
function rfRanking(){
  const d = A.fil;
  const panel = document.getElementById('rankingPanel');
  const secEl = document.getElementById('secRanking');

  if(!d.length){
    if(panel) panel.classList.remove('loaded');
    if(secEl) secEl.style.display='none';
    return;
  }
  if(secEl) secEl.style.display='';

  /* Dados */
  const chCurso  = gSum(d, r=>r.curN,     r=>r.ch);
  const pm       = pCHM(d);
  const maxProfCH= Math.max(...Object.values(pm), 1);
  const maxCursCH= chCurso.length ? chCurso[0].v : 1;

  /* CH por curso para ranking de eficiência (CH por docente) */
  const docPorCurso = {};
  d.forEach(r=>{ if(r.curN&&r.pro){ if(!docPorCurso[r.curN]) docPorCurso[r.curN]=new Set(); docPorCurso[r.curN].add(r.pro); }});
  const eficiencia = Object.entries(docPorCurso).map(([cur,docs])=>{
    const chCur = chCurso.find(x=>x.k===cur);
    const chV = chCur ? chCur.v : 0;
    return { k: cur, v: chV / docs.size, docs: docs.size, chTotal: chV };
  }).sort((a,b)=>a.v-b.v); /* menor CH por docente = melhor distribuição */

  const statusTag = v => v>=50?['crit','🔴 Crítico']:v>=40?['over','🟠 Acima']:v>=30?['warn','🟡 Atenção']:['ok','🟢 OK'];
  const chStTag   = v => v>=50?['crit','🔴']:v>=40?['over','🟠']:v>=30?['warn','🟡']:['ok','🟢'];

  /* ── Ranking Cursos (Top 5) ── */
  const rkCursos = chCurso.slice(0,5).map((x,i)=>{
    const [sc,] = chStTag(x.v);
    const pct = Math.round((x.v/maxCursCH)*100);
    const pos = ['p1','p2','p3','pn','pn'][i] || 'pn';
    return `<div class="rk-item">
      <div class="rk-pos ${pos}">${i+1}</div>
      <div class="rk-name" title="${escH(x.k)}">${escH(x.k)}</div>
      <div class="rk-bar-wrap"><div class="rk-bar" style="width:${pct}%;background:var(--${sc==='ok'?'green':sc==='warn'?'orange':sc==='over'?'orange':'red'})"></div></div>
      <div class="rk-val">${fN(x.v)}h</div>
    </div>`;
  }).join('');

  /* ── Ranking Docentes (Top 10) ── */
  const rkProfs = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([nome,ch],i)=>{
    const [sc,lbl] = statusTag(ch);
    const pct = Math.round((ch/maxProfCH)*100);
    const pos = ['p1','p2','p3','pn','pn','pn','pn','pn','pn','pn'][i] || 'pn';
    return `<div class="rk-item" onclick="drillDocente('${escH(nome).replace(/'/g,'&#39;')}')" style="cursor:pointer" title="Clique para drill-down">
      <div class="rk-pos ${pos}">${i+1}</div>
      <div class="rk-name">${escH(tr(nome,26))}</div>
      <div class="rk-bar-wrap"><div class="rk-bar" style="width:${pct}%;background:var(--${sc==='ok'?'green':sc==='over'||sc==='crit'?'red':'orange'})"></div></div>
      <div class="rk-val">${fN(ch)}h</div>
      <span class="rk-status ${sc}">${lbl.split(' ')[0]}</span>
    </div>`;
  }).join('');

  /* ── Ranking Eficiência (Top 5 melhor distribuição) ── */
  const rkEfic = eficiencia.slice(0,5).map((x,i)=>{
    const pos = ['p1','p2','p3','pn','pn'][i] || 'pn';
    return `<div class="rk-item" onclick="drillCurso('${escH(x.k).replace(/'/g,'&#39;')}')" style="cursor:pointer">
      <div class="rk-pos ${pos}">${i+1}</div>
      <div class="rk-name" title="${escH(x.k)}">${escH(tr(x.k,28))}</div>
      <div class="rk-val">${fN(x.v)}h/doc</div>
      <span class="rk-status ok">${x.docs} doc${x.docs>1?'s':''}</span>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div class="rk-tabs">
      <button class="rk-tab active" onclick="rkSwitch(this,'rkCursos')">CH por Curso (Top 5)</button>
      <button class="rk-tab" onclick="rkSwitch(this,'rkDocentes')">Docentes por CH (Top 10)</button>
      <button class="rk-tab" onclick="rkSwitch(this,'rkEficiencia')">Melhor Distribuição</button>
    </div>
    <div id="rkCursos" class="rk-panel active"><div class="rk-list">${rkCursos||'<p style="color:var(--m);font-size:12px">Sem dados</p>'}</div></div>
    <div id="rkDocentes" class="rk-panel"><div class="rk-list">${rkProfs||'<p style="color:var(--m);font-size:12px">Sem dados</p>'}</div></div>
    <div id="rkEficiencia" class="rk-panel"><div class="rk-list">${rkEfic||'<p style="color:var(--m);font-size:12px">Sem dados</p>'}<div style="font-size:10px;color:var(--m);margin-top:10px">Cursos com menor CH média por docente = melhor distribuição da carga.</div></div></div>
  `;
  panel.classList.add('loaded');
}

function rkSwitch(btn, panelId){
  btn.closest('.rk-tabs').querySelectorAll('.rk-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  const box = document.getElementById('rankingPanel');
  box.querySelectorAll('.rk-panel').forEach(p=>p.classList.remove('active'));
  const target = box.querySelector('#'+panelId);
  if(target) target.classList.add('active');
}

/* ═══════════════════════════════════════════════════════════════
   MODULE: heatmapEngine — visualização docente × curso
═══════════════════════════════════════════════════════════════ */
function rfHeatmap(){
  const d = A.fil;
  const panel  = document.getElementById('heatmapPanel');
  const secEl  = document.getElementById('secHeatmap');
  const tbl    = document.getElementById('heatmapTable');
  const noteEl = document.getElementById('heatmapNote');

  if(!d.length){
    if(panel) panel.classList.remove('loaded');
    if(secEl) secEl.style.display='none';
    return;
  }

  /* Construir mapa prof → curso → CH */
  const heat = {}; /* {prof: {curso: ch}} */
  d.forEach(r=>{
    if(!r.pro||!r.curN) return;
    if(!heat[r.pro]) heat[r.pro]={};
    heat[r.pro][r.curN]=(heat[r.pro][r.curN]||0)+r.ch;
  });

  const profs  = Object.keys(heat).sort();
  const cursos = [...new Set(d.map(r=>r.curN).filter(Boolean))].sort();

  /* Limitar para evitar tabela gigante */
  const MAX_PROFS = 30, MAX_CURSOS = 20;
  const pm = pCHM(d);
  const topProfs  = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,MAX_PROFS).map(([n])=>n);
  const chCurso   = gSum(d,r=>r.curN,r=>r.ch);
  const topCursos = chCurso.slice(0,MAX_CURSOS).map(x=>x.k);

  /* Valor máximo para escala de cor */
  let maxVal = 0;
  topProfs.forEach(p=>topCursos.forEach(c=>{ const v=(heat[p]||{})[c]||0; if(v>maxVal) maxVal=v; }));
  maxVal = maxVal||1;

  /* Cor baseada em intensidade relativa + limites institucionais */
  const cellColor = (val) => {
    if(!val) return 'var(--bc,#fff)';
    const c  = isDk();
    if(val>=50) return c?'rgba(227,93,106,.85)':'rgba(220,38,38,.75)';   /* crítico */
    if(val>=40) return c?'rgba(245,138,31,.75)':'rgba(249,115,22,.65)';  /* acima */
    if(val>=30) return c?'rgba(234,179,8,.65)':'rgba(202,138,4,.55)';    /* atenção */
    const t = Math.max(0.1, val/maxVal);
    return c ? `rgba(13,170,99,${(t*.65+.12).toFixed(2)})` : `rgba(26,111,196,${(t*.55+.15).toFixed(2)})`;
  };

  /* Montar tabela */
  const thead = `<thead><tr>
    <th class="hm-th prof">Docente</th>
    ${topCursos.map(c=>`<th class="hm-th curso" title="${escH(c)}">${escH(c)}</th>`).join('')}
    <th class="hm-th" style="min-width:60px;text-align:center">Total</th>
  </tr></thead>`;

  const tbody = '<tbody>'+topProfs.map(prof=>{
    const totalProf = Object.values(heat[prof]||{}).reduce((s,v)=>s+v,0);
    const [sc,] = pm[prof]>=50?['crit']:pm[prof]>=40?['over']:pm[prof]>=30?['warn']:['ok'];
    const borderColor = sc==='crit'?'var(--red)':sc==='over'?'var(--orange)':sc==='warn'?'#ca8a04':'var(--green)';
    return `<tr>
      <td class="hm-prof" onclick="drillDocente('${escH(prof).replace(/'/g,'&#39;')}')"
          style="border-left:3px solid ${borderColor}" title="Clique para drill-down">${escH(prof)}</td>
      ${topCursos.map(curso=>{
        const val = (heat[prof]||{})[curso]||0;
        const bg  = cellColor(val);
        return `<td class="hm-td${val?'':' zero'}" style="background:${bg}" title="${escH(prof)} × ${escH(curso)}: ${val?fN(val)+'h':'—'}">
          <span>${val?fN(val):''}</span>
        </td>`;
      }).join('')}
      <td class="hm-td" style="background:${cellColor(totalProf)};font-size:9.5px" title="Total: ${fN(totalProf)}h">
        <span>${fN(totalProf)}</span>
      </td>
    </tr>`;
  }).join('')+'</tbody>';

  tbl.innerHTML = thead + tbody;
  if(secEl) secEl.style.display='';
  panel.classList.add('loaded');
  if(noteEl){
    const truncP = profs.length>MAX_PROFS, truncC = cursos.length>MAX_CURSOS;
    noteEl.textContent = (truncP||truncC)
      ? `Exibindo ${topProfs.length} de ${profs.length} docentes e ${topCursos.length} de ${cursos.length} cursos (os de maior CH). Use filtros para refinar.`
      : '';
  }
}

/* ═══════════════════════════════════════════════════════════════
   MODULE: drillDown — detalhamento analítico interativo
═══════════════════════════════════════════════════════════════ */
function openDrill(title, breadcrumb, bodyHTML){
  document.getElementById('drillTitle').innerHTML = title;
  document.getElementById('drillBreadcrumb').textContent = breadcrumb;
  document.getElementById('drillBody').innerHTML = bodyHTML;
  document.getElementById('drillModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrill(){
  document.getElementById('drillModal').classList.remove('open');
  document.body.style.overflow = '';
}
/* Fechar com Escape */
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeDrill(); });

/**
 * drillCurso(nome) — mostra docentes e disciplinas de um curso
 */
function drillCurso(curso){
  const d   = A.fil.filter(r=>r.curN===curso);
  if(!d.length){ toast('Sem dados para '+curso,'warning'); return; }

  const pm     = pCHM(d);
  const nDoc   = new Set(d.map(r=>r.pro).filter(Boolean)).size;
  const nDis   = new Set(d.map(r=>r.dis).filter(Boolean)).size;
  const chTot  = Object.values(pm).reduce((s,v)=>s+v,0);
  const custo  = d.reduce((s,r)=>s+r.cMes,0);

  const kpis = `<div class="drill-grid">
    <div class="drill-kpi"><div class="drill-kpi-label">CH Total</div><div class="drill-kpi-val">${fN(chTot)}h</div><div class="drill-kpi-sub">horas/semana</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">Docentes</div><div class="drill-kpi-val">${nDoc}</div><div class="drill-kpi-sub">vinculados</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">Disciplinas</div><div class="drill-kpi-val">${nDis}</div><div class="drill-kpi-sub">distintas</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">Custo Estimado</div><div class="drill-kpi-val" style="font-size:15px">${fB(custo)}</div><div class="drill-kpi-sub">/mês</div></div>
  </div>`;

  const profRows = Object.entries(pm).sort((a,b)=>b[1]-a[1]).map(([nome,ch])=>{
    const [sc,lbl] = ch>=50?['crit','🔴 Crítico']:ch>=40?['over','🟠 Acima']:ch>=30?['warn','🟡 Atenção']:['ok','🟢 OK'];
    return `<div class="drill-row" onclick="drillDocente('${escH(nome).replace(/'/g,"&#39;")}')">
      <span class="drill-row-name">${escH(nome)}</span>
      <span class="drill-row-val">${fN(ch)}h/sem</span>
      <span class="drill-row-status ${sc}">${lbl}</span>
    </div>`;
  }).join('');

  openDrill(
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> '+escH(tr(curso,40)),
    'Curso → Docentes',
    kpis + '<div style="font-size:10px;font-weight:700;color:var(--m);text-transform:uppercase;letter-spacing:.6px;margin:14px 0 8px">Docentes deste curso <span style="font-weight:400;color:var(--m)">(clique para ver disciplinas)</span></div><div class="drill-list">'+profRows+'</div>'
  );
}

/**
 * drillDocente(nome) — mostra disciplinas e análise de um docente
 */
function drillDocente(nome){
  const d    = A.fil.filter(r=>r.pro===nome);
  if(!d.length){ toast('Sem dados para '+nome,'warning'); return; }

  const pm    = pCHM(A.fil);
  const chEns = d.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch,0);
  const chEvt = d.filter(r=>isEventoHour(r)).reduce((s,r)=>s+r.ch,0);
  const chCrd = d.filter(r=>isCoordHour(r)).reduce((s,r)=>s+r.ch,0);
  const custo = d.reduce((s,r)=>s+r.cMes,0);
  const cursos= new Set(d.map(r=>r.curN).filter(Boolean));
  const chTotal= (pm[nome]||0);
  const [sc,lbl] = chTotal>=50?['crit','🔴 Crítico']:chTotal>=40?['over','🟠 Acima do Limite']:chTotal>=30?['warn','🟡 Atenção']:['ok','🟢 Saudável'];

  const kpis = `<div class="drill-grid">
    <div class="drill-kpi"><div class="drill-kpi-label">CH Ensino</div><div class="drill-kpi-val">${fN(chEns)}h</div><div class="drill-kpi-sub">/semana</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">CH Atividades</div><div class="drill-kpi-val">${fN(chEvt)}h</div><div class="drill-kpi-sub">/semana</div></div>
    ${chCrd>0?`<div class="drill-kpi"><div class="drill-kpi-label">Coordenação</div><div class="drill-kpi-val">${fN(chCrd)}h</div><div class="drill-kpi-sub">/semana</div></div>`:''}
    <div class="drill-kpi"><div class="drill-kpi-label">Status CH</div><div class="drill-kpi-val" style="font-size:14px">${lbl}</div><div class="drill-kpi-sub">Total: ${fN(chTotal)}h ensino</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">Custo Estimado</div><div class="drill-kpi-val" style="font-size:15px">${fB(custo)}</div><div class="drill-kpi-sub">/mês</div></div>
    <div class="drill-kpi"><div class="drill-kpi-label">Cursos</div><div class="drill-kpi-val">${cursos.size}</div><div class="drill-kpi-sub">distintos</div></div>
  </div>`;

  /* Disciplinas agrupadas por curso */
  const byCurso = {};
  d.forEach(r=>{ if(!r.curN) return; if(!byCurso[r.curN]) byCurso[r.curN]=[]; byCurso[r.curN].push(r); });
  const disRows = Object.entries(byCurso).sort((a,b)=>b[1].reduce((s,r)=>s+r.ch,0)-a[1].reduce((s,r)=>s+r.ch,0)).map(([cur,rows])=>{
    const chCur = rows.reduce((s,r)=>s+r.ch,0);
    const disNames = [...new Set(rows.map(r=>r.dis||r.tH||'?').filter(Boolean))].slice(0,4);
    return `<div class="drill-row" onclick="drillCurso('${escH(cur).replace(/'/g,"&#39;")}')">
      <div style="flex:1;min-width:0">
        <div class="drill-row-name">${escH(tr(cur,36))}</div>
        <div style="font-size:10px;color:var(--m);margin-top:2px">${disNames.map(n=>escH(tr(n,22))).join(' · ')}</div>
      </div>
      <span class="drill-row-val">${fN(chCur)}h</span>
    </div>`;
  }).join('');

  openDrill(
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> '+escH(nome),
    'Docente → Cursos e Disciplinas',
    kpis+'<div style="font-size:10px;font-weight:700;color:var(--m);text-transform:uppercase;letter-spacing:.6px;margin:14px 0 8px">Cursos com carga atribuída <span style="font-weight:400">(clique para detalhar)</span></div><div class="drill-list">'+disRows+'</div>'
  );
}


/* ═══════════════════════════════════════════════════════════════
   MODULE: gaugeEngine — ocupação média docente com semi-círculos
═══════════════════════════════════════════════════════════════ */

/**
 * Desenha um gauge semicircular via Canvas 2D puro.
 * val: 0–100 (percentual), color: cor do arco, label/sub texto.
 */
function drawGauge(canvas, val, color, label, sub, target){
  const isDark = document.body.dataset.theme === 'dark';
  const dpr    = Math.min(window.devicePixelRatio || 1, 2);

  /* Dimensão: usar offsetWidth do wrapper pai */
  const wrap = canvas.parentElement;
  const WLOG = wrap ? Math.max(wrap.offsetWidth, 100) : 160;
  const HLOG = Math.round(WLOG * 0.56);

  /* Atribuir pixels do buffer = dimensão CSS × dpr */
  canvas.width        = WLOG * dpr;
  canvas.height       = HLOG * dpr;
  canvas.style.width  = WLOG + 'px';
  canvas.style.height = HLOG + 'px';
  canvas.style.background = 'transparent';
  canvas.style.display    = 'block';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1,0,0,1,0,0); /* reset qualquer transform anterior */
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, WLOG, HLOG);

  const W  = WLOG, H = HLOG;
  const cx = W / 2;
  const cy = H - 4;
  const r  = Math.min(W * 0.40, H * 0.88, 68);
  const lw = Math.max(r * 0.16, 8);
  const pct = Math.max(0, Math.min(1, val / 100));

  const START = Math.PI;
  const FILL  = START + pct * Math.PI;

  /* ── helper: hex → rgba ── */
  const hexRgb = (hex) => {
    const x = parseInt(hex.replace('#',''), 16);
    return [(x>>16)&255, (x>>8)&255, x&255];
  };
  let [R,G,B] = [26,111,196];
  try {
    if(color && color[0]==='#' && color.length>=7) [R,G,B] = hexRgb(color);
  } catch(e){}
  const rgba = a => `rgba(${R},${G},${B},${a})`;

  /* ══ 1. TRACK ══ */
  ctx.beginPath();
  ctx.arc(cx, cy, r, START, 2*Math.PI);
  ctx.strokeStyle = isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)';
  ctx.lineWidth   = lw;
  ctx.lineCap     = 'butt';
  ctx.stroke();

  if(pct > 0.01){
    /* ══ 2. GLOW HALO (dark only) ══ */
    if(isDark){
      [lw*2.8, lw*1.8].forEach((w,i) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, START, FILL);
        ctx.strokeStyle = rgba(i===0 ? 0.09 : 0.15);
        ctx.lineWidth   = w;
        ctx.lineCap     = 'round';
        ctx.stroke();
      });
    }

    /* ══ 3. ARCO PRINCIPAL com gradiente ══ */
    const gx1 = cx + Math.cos(START) * r, gy1 = cy + Math.sin(START) * r;
    const gx2 = cx + Math.cos(FILL)  * r, gy2 = cy + Math.sin(FILL)  * r;
    const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
    grad.addColorStop(0,   rgba(isDark ? 0.4 : 0.35));
    grad.addColorStop(0.65, rgba(isDark ? 0.9 : 0.85));
    grad.addColorStop(1,   color);

    ctx.beginPath();
    ctx.arc(cx, cy, r, START, FILL);
    ctx.strokeStyle = grad;
    ctx.lineWidth   = lw;
    ctx.lineCap     = 'round';
    ctx.stroke();

    /* ══ 4. BOLINHA NA PONTA ══ */
    const tipX = cx + Math.cos(FILL) * r;
    const tipY = cy + Math.sin(FILL) * r;
    const dotR = lw * 0.52;

    ctx.shadowColor = isDark ? color : 'transparent';
    ctx.shadowBlur  = isDark ? 14 : 0;
    ctx.beginPath();
    ctx.arc(tipX, tipY, dotR, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();

    /* reflexo branco na bolinha */
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(tipX - dotR*0.2, tipY - dotR*0.2, dotR*0.32, 0, Math.PI*2);
    ctx.fillStyle = isDark ? rgba(0.55) : 'rgba(255,255,255,0.7)';
    ctx.fill();
  }

  /* ══ 5. LINHA DE META ══ */
  if(target !== undefined){
    const ta    = START + (target/100) * Math.PI;
    const inner = r - lw*0.5 - 3;
    const outer = r + lw*0.5 + 3;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(ta)*inner, cy+Math.sin(ta)*inner);
    ctx.lineTo(cx+Math.cos(ta)*outer, cy+Math.sin(ta)*outer);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.35)';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.stroke();
  }
  /* SEM TEXTO no canvas — o % fica no HTML (.gauge-value) */
}

function rfGauge(){
  const d = A.fil;
  const grid    = document.getElementById('gaugeGrid');
  const panel   = document.getElementById('gaugePanel');
  const secEl   = document.getElementById('secGauge');
  const qEl     = panel ? panel.querySelector('.cc-question') : null;
  if(!grid) return;
  if(!d.length){
    grid.innerHTML='';
    if(panel){ panel.classList.remove('has-data'); panel.style.display='none'; }
    if(secEl) secEl.style.display='none';
    return;
  }

  const pm       = pCHM(d);
  const vals     = Object.values(pm);
  const nProfs   = vals.length || 1;
  const mediaCH  = vals.reduce((s,v)=>s+v,0)/nProfs;
  const pctAcima40 = Math.round((vals.filter(v=>v>=40).length/nProfs)*100);
  const pctSaud    = Math.round((vals.filter(v=>v<=30).length/nProfs)*100);
  const maxCH      = vals.length ? Math.max(...vals) : 0;
  const ocupacao   = Math.min(100, Math.round((mediaCH/40)*100));

  /* Cores semânticas resolvidas para o canvas (não usar var() em canvas) */
  const isDark = document.body.dataset.theme === 'dark';
  function gaugeColor(semantic){
    /* Cores calibradas: dark mais saturadas para vibrar no fundo escuro */
    const map = {
      ok:    isDark ? '#10D974' : '#0DA860',   /* verde vibrante */
      warn:  isDark ? '#FBBF24' : '#D97706',   /* âmbar dourado */
      alert: isDark ? '#FB923C' : '#E8751A',   /* laranja vivo */
      crit:  isDark ? '#F87171' : '#DC2626',   /* vermelho suave no dark */
      info:  isDark ? '#60A5FA' : '#1A6FC4',   /* azul claro no dark */
    };
    return map[semantic] || map.info;
  }

  const gauges = [
    {
      val: ocupacao,
      semantic: ocupacao>=90?'crit': ocupacao>=75?'alert': ocupacao>=50?'warn': 'ok',
      label: 'Ocupação Média',
      sub: `${fN(mediaCH)}h/sem em média`,
      target: 75,
    },
    {
      val: pctAcima40,
      semantic: pctAcima40>=30?'crit': pctAcima40>=15?'alert': pctAcima40>0?'warn': 'ok',
      label: 'Docentes > 40h',
      sub: `${vals.filter(v=>v>=40).length} de ${nProfs} docentes`,
    },
    {
      val: pctSaud,
      semantic: pctSaud>=80?'ok': pctSaud>=60?'warn': pctSaud>=40?'alert': 'crit',
      label: 'CH Saudável (≤30h)',
      sub: `${vals.filter(v=>v<=30).length} de ${nProfs} docentes`,
    },
  ].map(g => ({ ...g, color: gaugeColor(g.semantic) }));

  grid.innerHTML = gauges.map((g,idx)=>{
    const semMap = {ok:'var(--ok,#0DA860)',warn:'var(--warn,#D97706)',alert:'var(--alert,#E8751A)',crit:'var(--crit,#DC2626)',info:'var(--info,#1A6FC4)'};
    const cssColor = semMap[g.semantic] || semMap.info;
    return `<div class="gauge-item" style="--gi-color:${cssColor}">
       <div class="gauge-canvas-wrap">
         <canvas id="cGauge${idx}"></canvas>
       </div>
       <div class="gauge-label">${g.label}</div>
       <div class="gauge-value">${Math.round(g.val)}%</div>
       <div class="gauge-sub">${escH(g.sub)}</div>
       ${g.target!==undefined?`<span class="gauge-target">Meta: ${g.target}%</span>`:''}
     </div>`;
  }).join('');

  /* Mostrar painel com conteúdo */
  if(panel){ panel.classList.add('has-data'); panel.style.display=''; }
  if(secEl) secEl.style.display='';
  if(qEl) qEl.style.display='';
  /* Desenhar após renderização do DOM */
  requestAnimationFrame(()=>{
    gauges.forEach((g,idx)=>{
      const cvs = document.getElementById('cGauge'+idx);
      if(cvs){
        const color = getComputedStyle(document.documentElement)
          .getPropertyValue(g.color.replace('var(','').replace(')','').trim()) || g.color;
        drawGauge(cvs, g.val, g.color, g.label, g.sub, g.target);
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODULE: timelineEngine — evolução temporal de CH por período
═══════════════════════════════════════════════════════════════ */
function rfTimeline(){
  const d = A.fil;
  const panel = document.getElementById('timelinePanel');
  const secEl = document.getElementById('secTimeline');
  if(!panel||!d.length){ if(panel) panel.style.display='none'; if(secEl) secEl.style.display='none'; return; }

  /* Verificar se há datas válidas */
  const comData = d.filter(r=>r.dI instanceof Date && !isNaN(r.dI));
  if(comData.length < 3){ panel.style.display='none'; if(secEl) secEl.style.display='none'; return; }

  /* Agrupar CH por mês */
  const byMes = {};
  comData.forEach(r=>{
    const key = `${r.dI.getFullYear()}-${String(r.dI.getMonth()+1).padStart(2,'0')}`;
    byMes[key]=(byMes[key]||0)+r.ch;
  });
  const sorted = Object.entries(byMes).sort((a,b)=>a[0].localeCompare(b[0]));
  if(sorted.length < 2){ panel.style.display='none'; if(secEl) secEl.style.display='none'; return; }

  panel.style.display='';
  if(secEl) secEl.style.display='';

  const c = pal();
  const labels = sorted.map(([k])=>{
    const [y,m] = k.split('-');
    return new Date(+y,+m-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
  });
  const values = sorted.map(([,v])=>v);

  kChart('timeline');
  A.charts.timeline = new Chart(document.getElementById('cTimeline'),{
    type:'line',
    data:{
      labels,
      datasets:[{
        label:'CH Total',
        data:values,
        fill:true,
        borderColor:c[0],
        backgroundColor:c[0].replace('rgb','rgba').replace(')',', .12)') || 'rgba(13,170,99,.1)',
        tension:.4,
        pointRadius:4,
        pointHoverRadius:7,
        pointBackgroundColor:c[0],
        borderWidth:2.5,
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{...bTT(c),callbacks:{
          label:ctx=>`${fN(ctx.parsed.y)}h no período`,
        }}
      },
      scales:{
        x:{...bSc(c,false),title:{display:false}},
        y:{...bSc(c,true),title:{display:true,text:'Horas/sem',font:{size:10},color:c.muted}},
      },
      animation:{duration:600,easing:'easeInOutQuart'},
    }
  });
}

/* ═══════════════════════════════════════════════════════════════
   MODULE: diagEngine — diagnóstico de distribuição de carga
   Calcula Gini simplificado + insights contextuais
═══════════════════════════════════════════════════════════════ */

/**
 * Calcula índice de Gini simplificado para um array de valores.
 * 0 = perfeito equilíbrio, 1 = concentração total.
 */
function calcGini(arr){
  if(!arr.length) return 0;
  const sorted = [...arr].sort((a,b)=>a-b);
  const n = sorted.length;
  const sum = sorted.reduce((s,v)=>s+v,0)||1;
  let cumDiff = 0;
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) cumDiff+=Math.abs(sorted[i]-sorted[j]);
  return cumDiff/(2*n*sum);
}

function rfDiag(){
  const d = A.fil;
  const panel   = document.getElementById('diagPanel');
  const grid    = document.getElementById('diagGrid');
  const secDiag = document.getElementById('secDiag');
  if(!panel||!grid) return;
  if(!d.length){
    panel.classList.remove('has-data'); panel.style.display='none';
    if(secDiag) secDiag.style.display='none';
    return;
  }
  panel.classList.add('has-data'); panel.style.display='';
  if(secDiag) secDiag.style.display='';

  const pm       = pCHM(d);
  const vals     = Object.values(pm);
  const nProfs   = vals.length||1;
  const mediaCH  = vals.reduce((s,v)=>s+v,0)/nProfs;
  const maxCH    = vals.length ? Math.max(...vals) : 0;
  const minCH    = vals.length ? Math.min(...vals) : 0;
  const nCrit50  = vals.filter(v=>v>=50).length;
  const nOver40  = vals.filter(v=>v>=40).length;
  const nWarn30  = vals.filter(v=>v>30&&v<40).length;
  const nOK      = vals.filter(v=>v<=30).length;

  /* CH por curso */
  const chCurso = {};
  d.forEach(r=>{ if(r.curN) chCurso[r.curN]=(chCurso[r.curN]||0)+r.ch; });
  const chCursoVals = Object.values(chCurso);
  const totalCHCursos = chCursoVals.reduce((s,v)=>s+v,0)||1;
  const nCursos = Object.keys(chCurso).length||1;
  const topCurso = Object.entries(chCurso).sort((a,b)=>b[1]-a[1])[0]||['—',0];
  const topPctCurso = Math.round((topCurso[1]/totalCHCursos)*100);
  const topProf  = Object.entries(pm).sort((a,b)=>b[1]-a[1])[0]||['—',0];

  /* Gini por docente */
  const gini = calcGini(vals);
  const giniPct = Math.round(gini*100);
  const giniCls = gini<0.25?'ok':gini<0.45?'warn':'crit';
  const giniLabel = gini<0.25?'Distribuição equilibrada':gini<0.45?'Concentração moderada':'Alta concentração de CH';

  /* Atualizar Gini visual */
  const giniVal  = document.getElementById('giniValue');
  const giniNeedle=document.getElementById('giniNeedle');
  const giniDesc = document.getElementById('giniDesc');
  if(giniVal) giniVal.textContent = gini.toFixed(3);
  if(giniNeedle) giniNeedle.style.left = (gini*100)+'%';
  if(giniDesc) giniDesc.textContent = giniLabel + ` · Quanto mais próximo de 0, mais equânime é a distribuição de carga entre os docentes.`;

  /* Cards de diagnóstico */
  const cards = [
    {
      cls: nCrit50>0?'crit':nOver40>0?'warn':'ok',
      icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
      title: 'Quadro Docente',
      body: `<strong>${nProfs}</strong> docentes ativos · Média <strong>${fN(mediaCH)}h</strong>/sem.`+
            (nCrit50?` <strong style="color:var(--chart-red)">${nCrit50} em situação crítica (≥50h).</strong>`:''),
      footer: `${nOK} saudáveis · ${nWarn30} atenção · ${nOver40} acima · ${nCrit50} críticos`,
    },
    {
      cls: topPctCurso>35?'warn':'ok',
      icon: '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
      title: 'Concentração por Curso',
      body: `<strong>${topCurso[0]}</strong> concentra <strong>${topPctCurso}%</strong> da CH total de ${fN(totalCHCursos)}h.`,
      footer: topPctCurso>35?'⚠ Alta concentração — redistribuição recomendada':'Distribuição entre cursos está equilibrada',
    },
    {
      cls: maxCH>50?'crit':maxCH>40?'warn':'ok',
      icon: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
      title: 'Amplitude de Carga',
      body: `Variação de <strong>${fN(minCH)}h</strong> a <strong>${fN(maxCH)}h</strong> — amplitude de <strong>${fN(maxCH-minCH)}h</strong>.`,
      footer: `Docente mais sobrecarregado: ${topProf[0]}`,
    },
    {
      cls: giniCls,
      icon: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
      title: 'Índice Gini',
      body: `Concentração de CH: <strong>${giniLabel}</strong> (Gini = ${gini.toFixed(2)}).`,
      footer: gini<0.25?'✔ Excelente distribuição':'Avaliar redistribuição de carga entre docentes',
    },
    {
      cls: 'info',
      icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="3"/>',
      title: 'Cobertura por Curso',
      body: `<strong>${nCursos}</strong> cursos · CH média <strong>${fN(totalCHCursos/nCursos)}h</strong>/curso.`,
      footer: `Curso mais demandante: ${topCurso[0]}`,
    },
    {
      cls: nOver40/nProfs > 0.2?'warn':'ok',
      icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      title: 'Risco de Sobrecarga',
      body: `<strong>${Math.round((nOver40/nProfs)*100)}%</strong> dos docentes acima de 40h — <strong>${nOver40}</strong> profissionais.`,
      footer: nOver40/nProfs>0.2?'Ação coordenativa recomendada pela gestão':'Risco sob controle no período atual',
    },
  ];

  grid.innerHTML = cards.map(c=>
    `<div class="diag-card ${c.cls}">
       <div class="diag-card-title">
         <svg viewBox="0 0 24 24">${c.icon}</svg>
         ${c.title}
       </div>
       <div class="diag-card-body">${c.body}</div>
       <div class="diag-card-footer">${c.footer}</div>
     </div>`
  ).join('');

  /* Sugestões analíticas contextuais */
  const sugs = [];
  if(nCrit50>0) sugs.push({ico:'🚨',txt:`${nCrit50} docente${nCrit50>1?'s':''} acima de 50h — convocar reunião de coordenação imediata para redistribuição emergencial de carga.`});
  if(nOver40>0 && nCrit50===0) sugs.push({ico:'⚠️',txt:`${nOver40} docente${nOver40>1?'s':''} entre 40h e 49h — avaliar reatribuição de disciplinas no próximo período.`});
  if(topPctCurso>35) sugs.push({ico:'📊',txt:`O curso ${topCurso[0]} concentra ${topPctCurso}% da CH total — verificar necessidade de ampliar o quadro docente.`});
  if(gini>0.4) sugs.push({ico:'⚖️',txt:`Índice Gini ${gini.toFixed(2)} indica distribuição desigual — redistribuir carga entre docentes com menor ocupação.`});
  if(nProfs>0 && mediaCH<10) sugs.push({ico:'📉',txt:`Média docente baixa (${fN(mediaCH)}h) — possível subocupação do quadro ou dados incompletos na planilha.`});
  if(!sugs.length) sugs.push({ico:'✅',txt:`Distribuição de carga dentro dos parâmetros institucionais. Manter acompanhamento periódico.`});

  const sugsEl = document.getElementById('diagSugs');
  if(sugsEl) sugsEl.innerHTML = sugs.map(s=>`<div class="diag-sug-item"><span class="diag-sug-ico">${s.ico}</span><span>${escH(s.txt)}</span></div>`).join('');
}

/* ═══════════════════════════════════════════════════
   MODULE: render-dashboard — rfDash, rfOvR
   Atualiza KPIs e orçado vs realizado
═══════════════════════════════════════════════════ */
function rfDash(){
  const d=A.fil;
  const chT    = d.reduce((s,r)=>s+r.ch,0);
  const chEns  = d.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch,0);
  const chEv   = d.filter(r=>isEventoHour(r)).reduce((s,r)=>s+r.ch,0);
  const prS    = new Set(d.map(r=>r.pro).filter(Boolean));
  const cuS    = new Set(d.map(r=>r.curN).filter(Boolean));
  const diS    = new Set(d.map(r=>r.dis).filter(Boolean));
  const cM=d.reduce((s,r)=>s+r.cMes,0);
  const pm=pCHM(d);
  const aler=Object.entries(pm).filter(([,c])=>c>=36).sort((a,b)=>b[1]-a[1]);
  const ab40=aler.filter(([,c])=>c>40);

  const totalBase=d.reduce((s,r)=>s+r.base,0);
  const totalDsr =d.reduce((s,r)=>s+r.dsr,0);
  const totalHAtv=d.reduce((s,r)=>s+r.hAtv,0);
  setKPI('kCH',fN(chT));
  setKPI('kChEns',fN(chEns));
  setKPI('kChEv',fN(chEv));
  setKPI('kPr',prS.size);
  setKPI('kCu',cuS.size);
  setKPI('kDi',diS.size);
  setKPI('kAl',ab40.length);
  setKPI('kBase',fB(totalBase));
  setKPI('kDsr',fB(totalDsr));
  setKPI('kHAtv',fB(totalHAtv));
  setKPI('kCo',fB(cM));

  const ac=document.getElementById('kAC');
  const acCls = ab40.some(([,c])=>c>44)?'da crit': ab40.length?'al alert': 'ok';
  ac.className='kc '+acCls;

  const _safeCall = (fn, name) => { try { fn(); } catch(e) { console.error('[rfDash] '+name+' falhou:', e); } };
  _safeCall(rfCharts,      'rfCharts');
  _safeCall(()=>rfAlerts(aler), 'rfAlerts');
  _safeCall(rfDemo,        'rfDemo');
  _safeCall(tSF,           'tSF');
  _safeCall(()=>rfOvR(cM), 'rfOvR');
  _safeCall(rfInsights,    'rfInsights');
  _safeCall(rfAlertEngine, 'rfAlertEngine');
  _safeCall(rfRanking,     'rfRanking');
  _safeCall(rfHeatmap,     'rfHeatmap');
  _safeCall(rfMetadata,    'rfMetadata');
  _safeCall(rfGauge,       'rfGauge');
  _safeCall(rfTimeline,    'rfTimeline');
  _safeCall(rfDiag,        'rfDiag');
  /* Tooltips contextuais nos KPI cards */
  rfKpiTooltips(chT, chEns, prS.size, cuS.size, diS.size, ab40.length, cM);
  /* Barra de ações + info */
  const acts = document.getElementById('dashActions');
  if(acts) acts.style.display='';
  const inf = document.getElementById('dashActionsInfo');
  if(inf) inf.textContent = d.length+' registros | '+prS.size+' docentes | '+cuS.size+' cursos';
}

/* ── Orçado vs Realizado ── */
function rfOvR(realizado){
  const card=document.getElementById('kOVCard');
  const row=document.getElementById('krOV');
  document.getElementById('kRealizado').textContent=fB(realizado);

  if(A.orcado){
    row.style.display='';
    document.getElementById('kOrcado').textContent=fB(A.orcado);
    const delta=((realizado-A.orcado)/A.orcado)*100;
    const sign=delta>0?'+':'';
    const dEl=document.getElementById('kOVDelta');
    const subEl=document.getElementById('kOVSub');
    dEl.textContent=sign+delta.toFixed(1)+'%';
    if(delta>0){
      dEl.className='ov-delta up';
      card.className='kc ov-r';
      subEl.textContent='acima do orçamento — revisar';
    }else if(delta<0){
      dEl.className='ov-delta dn';
      card.className='kc ov-g';
      subEl.textContent='dentro do orçamento ✓';
    }else{
      dEl.className='ov-delta eq';
      card.className='kc';
      subEl.textContent='exatamente no orçamento';
    }
  }else{
    /* Sem aba de orçamento: mostra card com realizado apenas */
    row.style.display='';
    document.getElementById('kOrcado').textContent='—';
    document.getElementById('kOVDelta').textContent='—';
    document.getElementById('kOVSub').textContent='carregue planilha com aba de orçamento';
    document.getElementById('kOVSub').style.display='block';
  }
}

/* ────────────────────────────────────────────
   GRÁFICOS
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: charts — renderCharts (rfCharts)
   Cria/destrói todos os gráficos Chart.js
═══════════════════════════════════════════════════ */
function pal(){
  const dk=isDk(); /* true só para dark */
  return{
    grid:  dk ? 'rgba(255,255,255,.06)'  : 'rgba(30,50,90,.07)',
    ticks: dk ? '#93A1B1'                : '#6B7A99',
    tt:    dk ? '#1E2330'                : '#FFFFFF',
    tb:    dk ? '#242A33'                : '#CBD5E1',
    card:  dk ? '#171A21'                : '#FFFFFF',
    /* Cor principal — verde no dark, LARANJA no clean */
    g: dk ? '#0DAA63' : '#F58A1F',
    o: '#F58A1F',
    b: dk ? '#1A7FBF' : '#1A7FBF',
    r: '#E35D6A',
    /* Paleta multicolorida: clean usa cores mais sólidas/vibrantes */
    p: dk
      ? ['#0DAA63','#1A7FBF','#F58A1F','#8B5CF6','#EF4444','#06B6D4','#F59E0B','#10B981','#6366F1','#EC4899','#84CC16','#F97316']
      : ['#F58A1F','#1A7FBF','#0DAA63','#8B5CF6','#EF4444','#06B6D4','#E8A020','#10B981','#6366F1','#EC4899','#16A34A','#DC7318'],
    ttTitle: dk ? '#E9EEF2' : '#1E293B',
    ttBody:  dk ? '#93A1B1' : '#475569',
    /* alpha helpers — no clean usamos sólido para máximo contraste */
    solid: !dk,
  };
}

/* ── Chart cache fingerprint — evita re-render desnecessário ── */
function chartFingerprint(){
  return `${A.fil.length}|${A.cf?A.cf.field+A.cf.value:''}`;
}
let _lastChartFp = '';

function kChart(k){if(A.charts[k]){A.charts[k].destroy();delete A.charts[k];}}
function bTT(c){return{backgroundColor:c.tt,titleColor:c.ttTitle||c.ticks,bodyColor:c.ttBody||c.ticks,borderColor:c.tb,borderWidth:1,padding:10,cornerRadius:8,borderWidth:1,padding:10,cornerRadius:6,titleFont:{family:'DM Sans',size:10,weight:'700'},bodyFont:{family:'DM Sans',size:10},boxShadow:'0 4px 12px rgba(0,0,0,.15)'};}
function bSc(c,isCur=false){
  return{
    x:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:9}}},
    y:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:9},callback:v=>isCur?fB(v):fN(v)}}
  };
}
function dOpts(c){
  return{responsive:true,maintainAspectRatio:false,cutout:'62%',
    plugins:{
      legend:{position:'bottom',labels:{color:c.ticks,font:{family:'DM Sans',size:9},boxWidth:9,padding:6}},
      tooltip:{...bTT(c),callbacks:{label:ctx=>` ${ctx.label}: ${fN(ctx.parsed)} h`}}
    }};
}

function rfCharts(){
  const fp=chartFingerprint();
  if(fp===_lastChartFp) return;
  _lastChartFp=fp;
  const d=A.fil,c=pal();

  /* 1 – CH por Curso */
  kChart('cur');
  {const g=gSum(d,r=>r.curN,r=>r.ch).slice(0,12);
  A.charts.cur=new Chart(document.getElementById('cCur'),{
    type:'bar',
    data:{labels:g.map(x=>tr(x.k,36)),datasets:[{label:'CH Sem.',data:g.map(x=>x.v),
      backgroundColor:A.cf?c.g+'44':(c.solid?c.g:c.g+'CC'),hoverBackgroundColor:c.g,borderRadius:5,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',
      layout:{padding:{right:44}},
      onClick:(evt,els)=>{if(els.length){const nm=g[els[0].index].k;if(evt.native&&evt.native.shiftKey){drillCurso(nm);}else if(A.cf&&A.cf.field==='curN'&&A.cf.value===nm){clearCF();}else{setCF('curN',nm);};}},
      plugins:{legend:{display:false},tooltip:{...bTT(c),callbacks:{
          title:ctx=>[ctx[0].label],
          label:ctx=>' '+fN(ctx.parsed.x)+' h/sem  ('+((ctx.parsed.x/(g.reduce((s,x)=>s+x.v,0)||1))*100).toFixed(1)+'% do total)',
          afterLabel:ctx=>' Ranking: #'+(ctx.dataIndex+1)+' de '+g.length+' cursos'
        }},valueLabels:{formatter:v=>fN(v)+'h'}},
      scales:{
        x:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:10}}},
        y:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:10},maxTicksLimit:15}}
      }}
  });}

  /* 2 – CH por Professor */
  kChart('pro');
  {/* Exclude professors whose hours are ONLY coordination type */
  const coordTypes=new Set(['Horas Coordenação Novo','Horas Coordenação Antigo','Coordenação Adjunto','Coordenação','Horas Coordenação']);
  /* Build per-professor map: only count non-coordination CH */
  const pmNonCoord={};
  d.forEach(r=>{
    if(!r.pro)return;
    const isCoord=coordTypes.has(r.tH)||/coordena/i.test(r.tH);
    if(!isCoord){pmNonCoord[r.pro]=(pmNonCoord[r.pro]||0)+r.ch;}
  });
  /* Keep professors that have at least some non-coordination hours */
  const pm=pmNonCoord;
  const sr=Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const aCC=c.solid?'':"CC", aBB=c.solid?'':"BB", a66=c.solid?'':"66";
  const bg=sr.map(([,v])=>{
    if(v>44)return c.r+(A.cf?'44':aCC);
    if(v>40)return c.o+(A.cf?'44':aBB);
    if(v>=36)return c.o+(A.cf?'33':a66);
    return c.g+(A.cf?'33':aCC);
  });
  const hv=sr.map(([,v])=>v>44?c.r:v>40?c.o:v>=36?c.o:c.g);
  A.charts.pro=new Chart(document.getElementById('cPro'),{
    type:'bar',
    data:{labels:sr.map(([k])=>tr(k,28)),datasets:[{label:'CH Sem.',data:sr.map(([,v])=>v),backgroundColor:bg,hoverBackgroundColor:hv,borderRadius:5,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',layout:{padding:{right:44}},onHover:(e,els,chart)=>{chart.canvas.style.cursor=els.length?'pointer':'crosshair';},plugins:{legend:{display:false},tooltip:{...bTT(c),callbacks:{title:ctx=>[ctx[0].label],label:ctx=>{const v=ctx.parsed.x;const tot=sr.reduce((s,[,x])=>s+x,0)||1;return[' '+fN(v)+' h/sem  ('+(v/tot*100).toFixed(1)+'% do grupo)'];},afterLabel:ctx=>{const v=ctx.parsed.x;return v>=50?[' 🔴 Crítico ≥50h']:v>44?[' 🟠 Alerta >44h']:v>40?[' 🟡 Atenção >40h']:[' ✓ Regular ≤40h'];}}},valueLabels:{formatter:v=>fN(v)+'h'}},scales:{x:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:9}}},y:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:9}}}}}
  });}

  /* 3 – Barras horizontais: Tipo de Hora */
  kChart('tH');
  {const g=gSum(d,r=>r.tH||'(sem tipo)',r=>r.ch);
   const tot=g.reduce((s,x)=>s+x.v,0)||1;
  A.charts.tH=new Chart(document.getElementById('cTH'),{
    type:'bar',
    data:{
      labels:g.map(x=>x.k),
      datasets:[{
        label:'CH h/sem',
        data:g.map(x=>x.v),
        backgroundColor:g.map((x,i)=>{
          const base=c.p[i%c.p.length];
          if(!A.cf||A.cf.field!=='tH')return base+'CC';
          return x.k===A.cf.value?base+'FF':base+'28';
        }),
        borderWidth:g.map((x)=>(!A.cf||A.cf.field!=='tH')?0:x.k===A.cf.value?2:0),
        borderColor:g.map((x,i)=>c.p[i%c.p.length]),
        hoverBackgroundColor:g.map((_,i)=>c.p[i%c.p.length]+'EE'),
        borderRadius:5,borderSkipped:false,barThickness:14
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:'y',
      layout:{padding:{right:44}},
      onClick:(evt,els)=>{
        if(!els.length)return;
        const val=g[els[0].index].k;
        if(A.cf&&A.cf.field==='tH'&&A.cf.value===val){clearCF();return;}
        setCF('tH',val);
      },
      plugins:{
        legend:{display:false},
        tooltip:{...bTT(c),callbacks:{
          label:ctx=>{
            const pct=((ctx.parsed.x/tot)*100).toFixed(1);
            return ` ${fN(ctx.parsed.x)} h  (${pct}%) — clique para filtrar`;
          }
        }},
        valueLabels:{formatter:v=>fN(v)+'h'}
      },
      scales:{
        x:{display:false,grid:{display:false}},
        y:{grid:{display:false},ticks:{color:c.ticks,font:{family:'DM Sans',size:10},padding:4}}
      }
    }
  });}

  /* 4 – Barras horizontais: CH por Escola */
  kChart('esc');
  {const g=gSum(d,r=>r.esc||'(sem escola)',r=>r.ch);
   const tot=g.reduce((s,x)=>s+x.v,0)||1;
   const pr=[...c.p].reverse();
  A.charts.esc=new Chart(document.getElementById('cEs'),{
    type:'bar',
    data:{
      labels:g.map(x=>x.k),
      datasets:[{
        label:'CH h/sem',
        data:g.map(x=>x.v),
        backgroundColor:g.map((x,i)=>{
          const base=pr[i%pr.length];
          if(!A.cf||A.cf.field!=='esc')return base+'CC';
          return x.k===A.cf.value?base+'FF':base+'28';
        }),
        borderWidth:g.map((x)=>(!A.cf||A.cf.field!=='esc')?0:x.k===A.cf.value?2:0),
        borderColor:g.map((_,i)=>pr[i%pr.length]),
        hoverBackgroundColor:g.map((_,i)=>pr[i%pr.length]+'EE'),
        borderRadius:5,borderSkipped:false,barThickness:20
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:'y',
      layout:{padding:{right:44}},
      onClick:(evt,els)=>{
        if(!els.length)return;
        const val=g[els[0].index].k;
        if(A.cf&&A.cf.field==='esc'&&A.cf.value===val){clearCF();return;}
        setCF('esc',val);
      },
      plugins:{
        legend:{display:false},
        tooltip:{...bTT(c),callbacks:{
          label:ctx=>{
            const pct=((ctx.parsed.x/tot)*100).toFixed(1);
            return ` ${fN(ctx.parsed.x)} h  (${pct}%) — clique para filtrar`;
          }
        }},
        valueLabels:{formatter:v=>fN(v)+'h'}
      },
      scales:{
        x:{display:false,grid:{display:false}},
        y:{grid:{display:false},ticks:{color:c.ticks,font:{family:'DM Sans',size:11},padding:6}}
      }
    }
  });}

  /* 5 – Barras horizontais: Total Bruto por Curso */
  kChart('co');
  {const g=gSum(d,r=>r.curN,r=>r.cMes).slice(0,10);
  A.charts.co=new Chart(document.getElementById('cCo'),{
    type:'bar',
    data:{
      labels:g.map(x=>tr(x.k,36)),
      datasets:[{
        label:'Total Bruto',
        data:g.map(x=>x.v),
        backgroundColor:g.map(x=>{
          if(!A.cf||A.cf.field!=='curN')return c.solid?c.o:c.o+'CC';
          return x.k===A.cf.value?c.o+'FF':c.o+'28';
        }),
        borderWidth:g.map(x=>(!A.cf||A.cf.field!=='curN')?0:x.k===A.cf.value?2:0),
        borderColor:c.o,
        hoverBackgroundColor:c.o+'EE',
        borderRadius:6,borderSkipped:false,barThickness:24
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,indexAxis:'y',
      layout:{padding:{left:0,right:64}},
      plugins:{
        legend:{display:false},
        tooltip:{...bTT(c),callbacks:{label:ctx=>' '+fB(ctx.parsed.x)}},
        valueLabels:{formatter:v=>fB(v)}
      },
      scales:{
        x:{display:false,grid:{display:false}},
        y:{
          grid:{display:false},
          ticks:{
            color:c.ticks,
            font:{family:'DM Sans',size:11},
            padding:6,
            /* Quebra o nome em múltiplas linhas a cada ~28 chars */
            callback:function(val){
              const lbl=this.getLabelForValue(val);
              const words=lbl.split(' ');
              const lines=[];let cur='';
              words.forEach(w=>{
                if((cur+' '+w).trim().length>28&&cur){lines.push(cur);cur=w;}
                else cur=(cur+' '+w).trim();
              });
              if(cur)lines.push(cur);
              return lines;
            }
          }
        }
      }
    }
  });}

  /* ── 6: Doughnut – Distribuição de CH por categoria ── */
  kChart('dist');
  if(document.getElementById('cDist')){
    const ens   = A.fil.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch,0);
    const evt   = A.fil.filter(r=>isEventoHour(r)).reduce((s,r)=>s+r.ch,0);
    const coord = A.fil.filter(r=>isCoordHour(r)).reduce((s,r)=>s+r.ch,0);
    const out   = A.fil.filter(r=>classifyHour(r)==='outro').reduce((s,r)=>s+r.ch,0);
    const dTot  = ens+evt+coord+out||1;
    const dLabels=['Ensino','Atividades','Coord.','Outros'];
    const dVals  =[ens,evt,coord,out];
    const dCols  =[c.g,c.b,'#7C3AED',c.o];
    A.charts.dist=new Chart(document.getElementById('cDist'),{
      type:'doughnut',
      data:{labels:dLabels,datasets:[{data:dVals,
        backgroundColor:dCols.map(x=>x+'CC'),borderColor:dCols,borderWidth:2,
        hoverBackgroundColor:dCols.map(x=>x+'EE'),hoverBorderWidth:3}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
        plugins:{
          legend:{position:'right',labels:{color:c.ticks,
            font:{family:'DM Sans',size:11},
            padding:12,usePointStyle:true,pointStyleWidth:8}},
          tooltip:{...bTT(c),callbacks:{
            label:ctx=>' '+ctx.label+': '+fN(ctx.raw)+'h ('+((ctx.raw/dTot)*100).toFixed(1)+'%)'
          }}
        }
      }
    });
  }

  /* ── 7: Barras – Docentes por faixa de CH semanal ── */
  kChart('faixa');
  if(document.getElementById('cFaixa')){
    const pm=pCHM(A.fil);
    const pmVals=Object.values(pm);
    const fxDef=[
      {lbl:'0–10h', min:0,  max:10},
      {lbl:'10–20h',min:10, max:20},
      {lbl:'20–30h',min:20, max:30},
      {lbl:'30–40h',min:30, max:40},
      {lbl:'40–50h',min:40, max:50},
      {lbl:'50h+',  min:50, max:Infinity}
    ];
    const fxCounts=fxDef.map(f=>pmVals.filter(v=>v>=f.min&&v<f.max).length);
    const fxBg=fxDef.map(f=>f.min>=50?c.r+'CC':f.min>=40?c.o+'CC':f.min>=30?c.o+'88':c.g+'CC');
    const fxHv=fxDef.map(f=>f.min>=40?c.r:c.g);
    A.charts.faixa=new Chart(document.getElementById('cFaixa'),{
      type:'bar',
      data:{labels:fxDef.map(f=>f.lbl),datasets:[{
        label:'Docentes',data:fxCounts,backgroundColor:fxBg,
        hoverBackgroundColor:fxHv,borderRadius:6,borderSkipped:false,barPercentage:.72
      }]},
      options:{responsive:true,maintainAspectRatio:false,
        layout:{padding:{top:20}},
        plugins:{legend:{display:false},
          tooltip:{...bTT(c),callbacks:{
            label:ctx=>' '+ctx.raw+' docente'+(ctx.raw!==1?'s':''),
            afterLabel:ctx=>fxDef[ctx.dataIndex].min>=40?' ⚠ acima do limite recomendado':''
          }},
          valueLabels:{formatter:v=>v>0?String(v):''}
        },
        scales:{
          x:{grid:{display:false},ticks:{color:c.ticks,font:{family:'DM Sans',size:10}}},
          y:{grid:{color:c.grid},ticks:{color:c.ticks,font:{family:'DM Sans',size:10},stepSize:1,precision:0}}
        }
      }
    });
  }

}


/* ────────────────────────────────────────────
   DEMONSTRATIVO DE CÁLCULO POR PROFESSOR
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: demonstrativo — rfDemo
   Tabela demonstrativa de cálculo salarial
═══════════════════════════════════════════════════ */
function rfDemo(){
  const d=A.fil;
  const demoCal = document.getElementById('demoCal');
  const secFin  = demoCal ? demoCal.previousElementSibling : null;
  if(!d.length){
    if(demoCal) demoCal.style.display='none';
    if(secFin && secFin.classList.contains('sec-title')) secFin.style.display='none';
    return;
  }
  if(demoCal) demoCal.style.display='';
  if(secFin && secFin.classList.contains('sec-title')) secFin.style.display='';
  // Agregar por professor: somar CH, base, dsr, hAtv, cMes
  const map={};
  d.forEach(r=>{
    if(!r.pro)return;
    if(!map[r.pro])map[r.pro]={pro:r.pro,ch:0,ha:r.ha,base:0,dsr:0,hAtv:0,cMes:0};
    map[r.pro].ch+=r.ch;
    map[r.pro].base+=r.base;
    map[r.pro].dsr+=r.dsr;
    map[r.pro].hAtv+=r.hAtv;
    map[r.pro].cMes+=r.cMes;
    // Hora Aula pode variar por linha; manter o máximo (ou primeiro)
    if(r.ha>map[r.pro].ha)map[r.pro].ha=r.ha;
  });
  const rows=Object.values(map).sort((a,b)=>b.cMes-a.cMes);
  const pm=pCHM(d);
  /* pm só conta horas de ensino — mesma lógica dos alertas */
  document.getElementById('demoBody').innerHTML=rows.map(r=>{
    const chM=r.ch*4.5;
    const chEns=pm[r.pro]||0; /* apenas horas de ensino desse professor */
    const cls=chEns>44?'tc2':chEns>40?'tw2':'';
    const alertIco=chEns>=36?(chEns>44?'🔴':chEns>40?'🟠':'🟡'):'';
    return`<tr>
      <td class="${cls}" style="font-weight:500">${alertIco} ${r.pro}</td>
      <td>${fN(r.ch)} h</td>
      <td>${fN(chM)} h</td>
      <td>${fB(r.ha)}</td>
      <td>${fB(r.base)}</td>
      <td style="color:var(--o)">${fB(r.dsr)}</td>
      <td style="color:#5EA8F5">${fB(r.hAtv)}</td>
      <td style="color:var(--g);font-weight:600">${fB(r.cMes)}</td>
    </tr>`;
  }).join('');
}

/* ────────────────────────────────────────────
   ALERTAS
   ──────────────────────────────────────────── */
function rfAlerts(aler){
  document.getElementById('aPill').textContent=aler.length;
  const el=document.getElementById('aList');
  if(!aler.length){el.innerHTML='<div class="nd">Nenhum alerta. Todos os professores dentro do limite de 40h/semana.</div>';return;}
  el.innerHTML=aler.map(([p,ch])=>{
    const pct=((ch/40)*100).toFixed(1);
    const cls=ch>=50?'da':ch>40?'wa':'in';
    const ico=ch>=50?'🔴':ch>44?'🟠':ch>40?'🟠':'🟡';
    const lbl=ch>=50?'Crítico (≥50h)':ch>44?'Muito acima (>44h)':ch>40?'Acima do limite':'Próximo do limite';
    return`<div class="ai ${cls}"><span>${ico}</span><span class="an">${p}</span><span style="color:var(--m);font-size:10px">${fN(ch)} h/sem — ${pct}%</span><span class="ab ${cls}">${lbl}</span></div>`;
  }).join('');
}

/* ────────────────────────────────────────────
   TABELA
   ──────────────────────────────────────────── */
/* ═══════════════════════════════════════════════════
   MODULE: table — rfTable, sortT, rfPag
   Tabela paginada com ordenação e mini-bars
═══════════════════════════════════════════════════ */
function tSF(){
  const term=(document.getElementById('tSrc').value||'').toLowerCase();
  A.tData=term?A.fil.filter(r=>A.cols.some(c=>String(r._raw[c]??'').toLowerCase().includes(term))):A.fil;
  A.page=1; rfTable();
}
function rfTable(){
  const data=A.tData,total=data.length;
  const pages=Math.ceil(total/A.pSize)||1,page=Math.min(A.page,pages);
  const start=(page-1)*A.pSize,slice=data.slice(start,start+A.pSize);

  document.getElementById('tCnt').textContent=`${total} registro${total!==1?'s':''}`;
  document.getElementById('pI').textContent=`Página ${page} de ${pages}`;

  /* Cabeçalho */
  document.getElementById('tHd').innerHTML='<tr>'+
    A.cols.map(c=>`<th onclick="sortT(this,'${c.replace(/'/g,"\\'")}'')" class="${A.sCol===c?(A.sDir>0?'sa':'sd'):''}">${c}</th>`).join('')+'</tr>';

  /* CH por professor */
  const pm=pCHM(A.fil);

  /* Corpo */
  const bd=document.getElementById('tBd');
  if(!slice.length){bd.innerHTML=`<tr><td colspan="${A.cols.length}" class="nd">Nenhum registro encontrado.</td></tr>`;return;}
  /* Compute per-professor activity type count (for overload alert) */
  const proTypeCount={};
  A.fil.forEach(r=>{
    if(!r.pro)return;
    if(!proTypeCount[r.pro])proTypeCount[r.pro]=new Set();
    if(r.tH)proTypeCount[r.pro].add(r.tH);
  });

  bd.innerHTML=slice.map(row=>{
    const ch=pm[row.pro]||0;
    const typeCount=row.pro?(proTypeCount[row.pro]?.size||0):0;
    /* Diversidade de Atividades: ícone informativo (versatilidade, não problema) */
    const overloadIcon=typeCount>3
      ?`<span title="✦ ${typeCount} tipos de atividade — Perfil Multifuncional: atua em Ensino e Atividades Complementares" style="cursor:help;margin-left:5px;font-size:10px;opacity:.85">🌟</span>`:'';

    return'<tr>'+A.cols.map(col=>{
      let v=row._raw[col]??'';
      if(v instanceof Date)v=fD(v);
      const cl=col.toLowerCase().trim();

      /* Hora Aula: currency */
      if(cl==='hora aula'&&v!==''&&!isNaN(parseFloat(v)))v=fB(parseFloat(v));

      /* Professor: status dot + nome com cor neutra consistente */
      if(cl.startsWith('professor')){
        const safeV=String(v).replace(/"/g,'&quot;');
        /* Ícone de status semântico ao lado do nome */
        let statusDot='';
        if(ch>44)      statusDot=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--crit,var(--red));margin-left:6px;vertical-align:middle;flex-shrink:0" title="CH crítica: ${fN(ch)}h/sem ≥ 45h"></span>`;
        else if(ch>40) statusDot=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--alert,var(--orange));margin-left:6px;vertical-align:middle;flex-shrink:0" title="CH elevada: ${fN(ch)}h/sem > 40h"></span>`;
        else if(ch>30) statusDot=`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warn,#D97706);margin-left:6px;vertical-align:middle;flex-shrink:0" title="CH moderada: ${fN(ch)}h/sem > 30h"></span>`;
        return`<td title="${safeV} — CH: ${fN(ch)}h/sem" style="font-weight:500">${v}${statusDot}${overloadIcon}</td>`;
      }

      /* CH column: mini progress bar */
      if(cl==='ch'||cl==='ch '){
        const n=parseFloat(String(v).replace(',','.'));
        if(!isNaN(n)){
          const pct=Math.min(100,(n/40)*100);
          const barColor=n>44?'var(--r)':n>40?'var(--o)':n>=36?'#F59E0B':'var(--g)';
          return`<td title="${v} h/sem">
            <div class="ch-cell">
              <span style="font-size:11px">${fN(n)} h</span>
              <div class="ch-bar"><div class="ch-fill" style="width:${pct}%;background:${barColor}"></div></div>
            </div>
          </td>`;
        }
      }

      return`<td title="${String(v).replace(/"/g,'&quot;')}">${v}</td>`;
    }).join('')
    /* Botão de ação */
    +`<td style="white-space:nowrap">
        <button onclick="openPModal(this.dataset.nome)" data-nome="${String(row.pro||'').replace(/"/g,'&quot;')}"
          style="background:rgba(0,74,130,.15);border:1px solid rgba(0,74,130,.3);color:#5EA8F5;border-radius:5px;padding:3px 8px;font-size:10px;cursor:pointer;font-family:var(--font-body);transition:all .18s"
          onmouseover="this.style.background='rgba(0,74,130,.35)'" 
          onmouseout="this.style.background='rgba(0,74,130,.15)'">
          🔍 Ver
        </button>
      </td>`
    +'</tr>';
  }).join('');

  rfPag(page,pages);
}
function rfPag(page,pages){
  const el=document.getElementById('pC');
  let h=`<button class="pb" onclick="goP(${page-1})" ${page<=1?'disabled':''}>‹</button>`;
  let s=Math.max(1,page-3),e=Math.min(pages,s+6);s=Math.max(1,e-6);
  if(s>1)h+=`<button class="pb" onclick="goP(1)">1</button>${s>2?'<span style="color:var(--m);padding:0 3px">…</span>':''}`;
  for(let i=s;i<=e;i++)h+=`<button class="pb ${i===page?'act':''}" onclick="goP(${i})">${i}</button>`;
  if(e<pages)h+=`${e<pages-1?'<span style="color:var(--m);padding:0 3px">…</span>':''}<button class="pb" onclick="goP(${pages})">${pages}</button>`;
  h+=`<button class="pb" onclick="goP(${page+1})" ${page>=pages?'disabled':''}>›</button>`;
  el.innerHTML=h;
}
function goP(p){const pg=Math.ceil(A.tData.length/A.pSize)||1;if(p<1||p>pg)return;A.page=p;rfTable();}
function sortT(th,col){
  if(A.sCol===col)A.sDir*=-1;else{A.sCol=col;A.sDir=1;}
  A.tData.sort((a,b)=>{
    const va=a._raw[col]??'',vb=b._raw[col]??'';
    const na=parseFloat(String(va).replace(',','.')),nb=parseFloat(String(vb).replace(',','.'));
    if(!isNaN(na)&&!isNaN(nb))return(na-nb)*A.sDir;
    return String(va).localeCompare(String(vb),'pt-BR')*A.sDir;
  });
  A.page=1;rfTable();
}

/* ────────────────────────────────────────────
   EXPORTAR CSV
   ──────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════
   MODULE: export-excel
   Exporta dados filtrados como .xlsx formatado
═══════════════════════════════════════════════════ */
/**
 * expExcel() — gera planilha .xlsx com 2 abas:
 *   1. "Dados" — registros filtrados com cabeçalho
 *   2. "Resumo" — KPIs e top professores
 */
function expExcel(){
  if(!A.fil.length){ toast('Nenhum dado para exportar.','warning'); return; }
  showL();
  try{
    const WB = XLSX.utils.book_new();

    /* ── Aba 1: Dados filtrados ── */
    const dataRows = [A.cols];
    A.fil.forEach(r=>{
      dataRows.push(A.cols.map(c=>{
        const v = r._raw[c] ?? '';
        return v instanceof Date ? fD(v) : v;
      }));
    });
    const wsData = XLSX.utils.aoa_to_sheet(dataRows);
    // Largura automática das colunas
    wsData['!cols'] = A.cols.map(c=>({wch: Math.min(Math.max(c.length+2, 10), 40)}));
    XLSX.utils.book_append_sheet(WB, wsData, 'Dados');

    /* ── Aba 2: Resumo ── */
    const d = A.fil;
    const profs   = [...new Set(d.map(r=>r.pro).filter(Boolean))];
    const cursos  = [...new Set(d.map(r=>r.curN).filter(Boolean))];
    const chTotal = d.reduce((s,r)=>s+r.ch, 0);
    const cMes    = d.reduce((s,r)=>s+r.cMes, 0);
    const pm      = pCHM(d);
    const topProfs = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,20);
    const hoje    = new Date().toLocaleDateString('pt-BR');

    const resumoRows = [
      ['RELATÓRIO DE CARGA HORÁRIA DOCENTE'],
      [`Gerado em: ${hoje}`, `Semestre: ${A.periodo||'—'}`],
      [],
      ['INDICADORES GERAIS', ''],
      ['Total de Professores', profs.length],
      ['Total de Cursos', cursos.length],
      ['CH Total Semanal (h)', +fN(chTotal).replace(',','.')],
      ['Total Bruto Estimado (R$)', +cMes.toFixed(2)],
      ['Registros no filtro', d.length],
      [],
      ['TOP PROFESSORES POR CH ENSINO', ''],
      ['Professor', 'CH Semanal (h)'],
      ...topProfs.map(([nome,ch])=>[nome, +ch.toFixed(1)]),
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows);
    wsResumo['!cols'] = [{wch:40},{wch:20}];
    XLSX.utils.book_append_sheet(WB, wsResumo, 'Resumo');

    /* ── Download ── */
    const filename = `carga-horaria-${A.periodo||'sem'}-${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(WB, filename);
    toast('Excel exportado com sucesso! 📗','success');
  }catch(e){
    console.error('expExcel error:', e);
    toast('Erro ao gerar Excel: '+e.message,'error');
  }finally{ hideL(); }
}

/* ═══════════════════════════════════════════════════
   MODULE: export-csv — expCSV
   Exportação dos dados filtrados em CSV
═══════════════════════════════════════════════════ */
function expCSV(){
  if(!A.fil.length){toast('Nenhum dado para exportar.','warning');return;}
  const sep=';',rows=[A.cols.join(sep)];
  A.fil.forEach(r=>{
    rows.push(A.cols.map(c=>{
      let v=r._raw[c]??'';
      if(v instanceof Date)v=fD(v);
      v=String(v).replace(/"/g,'""');
      if(String(v).includes(sep)||String(v).includes('\n'))v=`"${v}"`;
      return v;
    }).join(sep));
  });
  const blob=new Blob(['\ufeff'+rows.join('\n')],{type:'text/csv;charset=utf-8;'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`carga-horaria-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  toast('CSV exportado!','success');
}


/* ════════════════════════════════════════════════════════════
   SISTEMA COMPLETO DE TERMOS ADITIVOS
   ════════════════════════════════════════════════════════════ */

/* ── Abrir / fechar painel ── */

/* ═══════════════════════════════════════════════════
   MODULE: termos-pdf — generateTermoPDF
   Geração de Termos Aditivos em jsPDF
═══════════════════════════════════════════════════ */
function gerarSemestres(){
  const sel=document.getElementById('periodoSel');
  if(!sel||sel.options.length>0) return;
  const ano=new Date().getFullYear();
  for(let a=ano;a<=ano+4;a++){
    [1,2].forEach(s=>{
      const opt=document.createElement('option');
      opt.value=`${a}.${s}`;
      opt.text=`${a}.${s}`;
      if(`${a}.${s}`===A.periodo) opt.selected=true;
      sel.appendChild(opt);
    });
  }
}
async function gerarTermosSelecionados(){
  const nomes=getSelecionados();
  if(!nomes.length){toast('Selecione ao menos um professor','error');return;}
  closeTermosPanel();
  if(nomes.length===1){ gerarTermoPDF(nomes[0]); }
  else { await gerarLote(nomes); }
}

async function gerarTodosTermos(){
  const nomes=[...document.querySelectorAll('.termo-chk')].map(c=>c.dataset.nome);
  if(!nomes.length){toast('Carregue uma planilha primeiro','error');return;}
  closeTermosPanel();
  await gerarLote(nomes);
}

/* ── ZIP de múltiplos PDFs ── */
async function gerarLote(nomes){
  toast(`Gerando ${nomes.length} termos, aguarde...`,'success');
  await new Promise(r=>setTimeout(r,200));
  if(!window.JSZip){
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload=res;s.onerror=rej;document.head.appendChild(s);
    });
  }
  const zip=new window.JSZip();
  let ok=0;
  for(const nome of nomes){
    try{
      const doc=buildTermoPDF(nome);
      zip.file('Termo_'+nome.replace(/[^A-Za-z0-9]/g,'_')+'_'+A.periodo.replace('.','_')+'.pdf',doc.output('arraybuffer'));
      ok++;
    }catch(e){console.error('Erro '+nome,e);}
  }
  const blob=await zip.generateAsync({type:'blob'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='TermosAditivos_'+A.periodo.replace('.','_')+'_'+ok+'docentes.zip';
  a.click();
  toast(`${ok} termos gerados com sucesso!`,'success');
}

/* ── Agregar dados do professor ── */
function getProDataTermo(nome){
  const rows=A.raw.filter(r=>r.pro===nome);
  const _nG=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().toUpperCase();
  const cpf=A.cpfMap[_nG(nome)]||A.cpfMap[String(nome||'').toUpperCase()]||'Não informado';
  const mat=rows[0]?.mat||'';
  /* Agrupa disciplinas pelo nome, somando CH */
  const mp={};
  rows.forEach(r=>{
    const k=(r.dis||'').trim()||'—';
    mp[k]=(mp[k]||0)+(r.ch||0);
  });
  const disciplinas=Object.entries(mp).map(([dis,ch])=>({dis,ch}))
    .sort((a,b)=>a.dis.localeCompare(b.dis,'pt-BR'));
  const chTotal=disciplinas.reduce((s,d)=>s+d.ch,0);
  return {nome,cpf,mat,disciplinas,chTotal};
}

function fmtDataTermoExtenso(){
  if(!A.dataTermo) return 'Curitiba, _____ de ______________ de _______';
  const d=new Date(A.dataTermo+'T12:00:00');
  const M=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
           'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `Curitiba, ${d.getDate()} de ${M[d.getMonth()]} de ${d.getFullYear()}`;
}

/* ════════════════════════════════════════════════════════════
   buildTermoPDF — layout 100% fiel à aba "Carta" da planilha
   ════════════════════════════════════════════════════════════ */
function buildTermoPDF(nome){
  const {jsPDF}=window.jspdf;
  const {nome:n,cpf,mat,disciplinas,chTotal}=getProDataTermo(nome);

  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const PW=210,PH=297,ML=20,MR=20,MT=25;
  const TW=PW-ML-MR; // 170mm

  /* helpers */
  const setF=(sz,wt='normal',fam='times')=>{ doc.setFont(fam,wt); doc.setFontSize(sz); };
  const setC=(...rgb)=>doc.setTextColor(...rgb);
  const txt=(t,x,y,opts={})=>doc.text(String(t),x,y,{maxWidth:TW,...opts});
  const ln=(x1,y1,x2,y2,lw=0.3,rgb=[180,180,180])=>{
    doc.setDrawColor(...rgb);doc.setLineWidth(lw);doc.line(x1,y1,x2,y2);
  };
  const LH=5.5; // line height padrão

  let y=MT;
  const NL=(n=1)=>{ y+=LH*n; };

  /* ─── TÍTULO ─── */
  setF(13,'bold'); setC(0,0,0);
  txt('TERMO ADITIVO DE ALTERAÇÃO DE CARGA HORÁRIA',PW/2,y,{align:'center'});
  y+=10;

  /* ─── PREÂMBULO ─── */
  setF(10,'normal'); setC(40,40,40);
  const pre='Por meio do presente, INSTITUIÇÃO DE ENSINO SUPERIOR, '+
    'pessoa jurídica de direito privado, doravante denominada '+
    'apenas como CONTRATANTE; e, de outro lado, doravante denominado(a) CONTRATADO(A), '+
    'resolvem alterar o Contrato Original de Trabalho nos termos que se seguem:';
  doc.splitTextToSize(pre,TW).forEach(l=>{txt(l,ML,y);NL();});
  y+=4;

  /* ─── DADOS DO PROFESSOR ─── */
  setF(10,'normal'); setC(0,0,0);
  txt('Professor:',ML,y);
  setF(10,'bold');
  txt(n,ML+21,y);
  y+=LH+1;

  setF(10,'normal');
  txt('Matrícula:',ML,y);
  setF(10,'bold');
  txt(String(mat),ML+21,y);
  setF(10,'normal');
  txt('CPF:',ML+85,y);
  setF(10,'bold');
  txt(cpf,ML+95,y);
  y+=LH+1;

  /* Total CH alinhado à direita */
  setF(10,'normal'); setC(80,80,80);
  txt('Total:',PW-MR-30,y);
  setF(10,'bold'); setC(0,0,0);
  txt(fN(chTotal).replace('.',',')+'hs',PW-MR,y,{align:'right'});
  y+=8;

  /* ─── TABELA DISCIPLINAS ─── */
  /* Header da tabela */
  doc.setFillColor(245,138,31); // cor primária
  doc.rect(ML,y,TW,7,'F');
  setF(10,'bold'); setC(255,255,255);
  txt('Disciplina',ML+3,y+4.8);
  txt('CH',PW-MR-3,y+4.8,{align:'right'});
  y+=7;

  setF(9.5,'normal'); setC(30,30,30);
  const ROW_H=6.5;
  disciplinas.forEach((d,i)=>{
    if(y+ROW_H>PH-60){doc.addPage();y=MT;}
    /* zebra */
    if(i%2===0){doc.setFillColor(252,247,240);doc.rect(ML,y,TW,ROW_H,'F');}
    /* borda inferior leve */
    ln(ML,y+ROW_H,PW-MR,y+ROW_H,0.2,[220,220,220]);
    /* texto */
    const nomeDis=d.dis.length>80?d.dis.slice(0,78)+'…':d.dis;
    txt(`${i+1}.  ${nomeDis}`,ML+3,y+4.5,{maxWidth:TW-18});
    setF(9.5,'bold');
    txt(String(d.ch).replace('.',','),PW-MR-3,y+4.5,{align:'right'});
    setF(9.5,'normal');
    y+=ROW_H;
  });

  /* Linha de total */
  doc.setFillColor(240,240,240);
  doc.rect(ML,y,TW,7,'F');
  setF(10,'bold'); setC(0,0,0);
  txt('Total Carga Horária',ML+3,y+4.8);
  txt(fN(chTotal).replace('.',',')+'hs',PW-MR-3,y+4.8,{align:'right'});
  y+=7+8;

  /* ─── CLÁUSULAS ─── */
  const clausulas=[
    {t:'Cláusula Primeira:',
     c:'Fica ajustado a partir do semestre '+A.periodo+', a alteração da Carga Horária '+
       'do(a) CONTRATADO(A), em virtude de alteração de turmas.'},
    {t:'Cláusula Segunda:',
     c:'A redução da carga horária do(a) CONTRATADO(A) se faz necessária devido à diminuição '+
       'do número de turmas e/ou alunos matriculados no curso/disciplina ministrado(a) pelo(a) '+
       'CONTRATADO(A), conforme planejamento acadêmico para o semestre '+A.periodo+'.'},
    {t:'Cláusula Terceira:',
     c:'A alteração da carga horária também visa adequar a distribuição de aulas entre os '+
       'docentes, garantindo uma melhor organização e eficiência no cumprimento do calendário '+
       'acadêmico e das atividades pedagógicas.'},
    {t:'Cláusula Quarta:',
     c:'Fica estabelecido que a redução da carga horária não implicará em prejuízo para o(a) '+
       'CONTRATADO(A) quanto aos seus direitos trabalhistas, sendo mantidos todos os benefícios '+
       'e condições previstas no contrato original, exceto no que tange à proporcionalidade da '+
       'remuneração, que será ajustada conforme a nova carga horária.'},
  ];

  clausulas.forEach(({t,c})=>{
    if(y>PH-50){doc.addPage();y=MT;}
    /* Renderizar título em bold + texto normal na mesma linha */
    setF(10,'bold'); setC(0,0,0);
    const tw_title=doc.getTextWidth(t+' ');
    /* Juntar tudo e splitear */
    setF(10,'normal');
    const full=t+' '+c;
    const lines=doc.splitTextToSize(full,TW);
    /* Primeira linha: título em bold */
    setF(10,'bold'); setC(0,0,0);
    txt(t,ML,y);
    /* Resto em normal na mesma linha após título */
    setF(10,'normal'); setC(40,40,40);
    const firstRest=lines[0].substring(t.length).trimStart();
    if(firstRest) txt(firstRest,ML+tw_title,y,{maxWidth:TW-tw_title});
    y+=LH;
    lines.slice(1).forEach(l=>{txt(l,ML,y);y+=LH;});
    y+=3; // espaço entre cláusulas
  });

  /* ─── DATA ─── */
  if(y>PH-40){doc.addPage();y=MT;}
  y+=6;
  setF(10,'normal'); setC(40,40,40);
  txt(fmtDataTermoExtenso(),ML,y);
  y+=14;

  /* ─── ASSINATURA CENTRALIZADA ─── */
  const sigW=80, sigX=(PW-sigW)/2;
  ln(sigX,y,sigX+sigW,y,0.5,[60,60,60]);

  y+=5;
  setF(9,'normal'); setC(60,60,60);
  txt('Assinatura do Contratado',sigX+sigW/2,y,{align:'center'});

  y+=4;
  setF(8.5,'normal'); setC(100,100,100);
  txt(n,sigX+sigW/2,y,{align:'center'});

  y+=4;
  txt('Mat: '+String(mat)+'   CPF: '+cpf,sigX+sigW/2,y,{align:'center'});

  return doc;
}

function gerarTermoPDF(nome){
  try{
    const doc=buildTermoPDF(nome);
    doc.save('Termo_'+nome.replace(/[^A-Za-z0-9]/g,'_')+'_'+A.periodo.replace('.','_')+'.pdf');
    toast('Termo gerado: '+nome,'success');
  }catch(e){toast('Erro: '+e.message,'error');console.error(e);}
}

function gerarTermoPDFBytes(nome){
  try{return buildTermoPDF(nome).output('arraybuffer');}
  catch(e){console.error(e);return null;}
}

/* alias p/ botão no modal do professor */
function gerarTermo(nome){gerarTermoPDF(nome);}

/* ────────────────────────────────────────────
   EXPORTAR PDF
   ──────────────────────────────────────────── */

/* ═══════════════════════════════════════════════════
   MODULE: quick-report
   Gera resumo textual para cópia rápida/relatório
═══════════════════════════════════════════════════ */
/**
 * gerarResumoTexto() — gera texto estruturado para
 * copiar/colar em e-mails ou documentos
 */
function gerarResumoTexto(){
  const d = A.fil;
  if(!d.length){ toast('Nenhum dado para gerar resumo.','error'); return; }

  const profs   = new Set(d.map(r=>r.pro).filter(Boolean));
  const cursos  = new Set(d.map(r=>r.curN).filter(Boolean));
  const chTotal = d.reduce((s,r)=>s+r.ch, 0);
  const cMes    = d.reduce((s,r)=>s+r.cMes, 0);
  const pm      = pCHM(d);
  const acima40 = Object.entries(pm).filter(([,c])=>c>40);
  const hoje    = new Date().toLocaleDateString('pt-BR');

  let txt = `RELATÓRIO DE CARGA HORÁRIA DOCENTE\n`;
  txt += `Gerado em: ${hoje} | Semestre: ${A.periodo||'—'}\n`;
  txt += `${'─'.repeat(50)}\n\n`;
  txt += `RESUMO GERAL\n`;
  txt += `• Professores ativos: ${profs.size}\n`;
  txt += `• Cursos atendidos: ${cursos.size}\n`;
  txt += `• CH Total Semanal: ${fN(chTotal)}h\n`;
  txt += `• Total Bruto Estimado: ${fB(cMes)}\n`;
  txt += `• Registros: ${d.length}\n\n`;

  if(acima40.length){
    txt += `ALERTAS — ACIMA DE 40H/SEM (${acima40.length})\n`;
    acima40.forEach(([nome, ch])=>{ txt += `  ⚠ ${nome}: ${fN(ch)}h\n`; });
    txt += '\n';
  }

  // Top 5 professores por CH
  const topProfs = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  txt += `TOP 5 PROFESSORES (CH Ensino)\n`;
  topProfs.forEach(([nome,ch],i)=>{ txt += `  ${i+1}. ${nome}: ${fN(ch)}h/sem\n`; });

  // Copiar para clipboard
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(()=>{
      toast('Resumo copiado para a área de transferência! 📋','success');
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('Resumo copiado! 📋','success');
  }
  return txt;
}

/* ═══════════════════════════════════════════════════
   MODULE: export-pdf — generatePDF (expPDF)
   Exporta dashboard completo em PDF 3 páginas
═══════════════════════════════════════════════════ */
async function expPDF() {
  if(!A.fil.length){ toast('Carregue dados primeiro','error'); return; }
  showL();
  try {
    const { jsPDF } = window.jspdf;
    const dark = isDk();

    /* ── Paleta adaptada ao tema ── */
    const P = dark ? {
      bg:[15,17,21], s1:[23,26,33], s2:[36,42,51],
      t:[233,238,242], m:[147,161,177], sep:[36,42,51],
      row0:[23,26,33], row1:[28,32,40], cardBg:[23,26,33], cardBorder:[36,42,51],
    } : {
      bg:[248,250,253], s1:[255,255,255], s2:[235,240,250],
      t:[26,34,51], m:[107,122,153], sep:[220,228,242],
      row0:[255,255,255], row1:[245,248,253], cardBg:[255,255,255], cardBorder:[220,228,242],
    };
    const O=[245,138,31], G=[13,170,99], R=[220,38,38], B=[26,111,196], Y=[217,119,6];

    const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' });
    const pw  = doc.internal.pageSize.getWidth();   /* 297mm */
    const ph  = doc.internal.pageSize.getHeight();  /* 210mm */

    /* ── Helpers ── */
    const sf  = (w,s) => { doc.setFont('helvetica',w); doc.setFontSize(s); };
    const sc  = (...c) => doc.setTextColor(...c);
    const fl  = (...c) => doc.setFillColor(...c);
    const sd  = (...c) => doc.setDrawColor(...c);
    const lw  = (w)    => doc.setLineWidth(w);
    const txt = (t,x,y,opts) => doc.text(String(t),x,y,opts||{});

    /* ── Cabeçalho de página ── */
    const pageHeader = (sub, pg) => {
      fl(...P.bg);   doc.rect(0,0,pw,ph,'F');
      fl(...P.s1);   doc.rect(0,0,pw,16,'F');
      sd(...O); lw(.7); doc.line(0,16,pw,16);
      fl(...O); doc.roundedRect(8,3,10,10,2,2,'F');
      sf('bold',9); sc(255,255,255); txt('U',11.8,9.8);
      sf('bold',10); sc(...O); txt('DMS/IES',22,10);
      const uw=doc.getTextWidth('DMS/IES');
      sd(...P.sep); lw(.3); doc.line(22+uw+4,4,22+uw+4,13);
      sf('normal',7); sc(...P.t); txt(sub,22+uw+8,10);
      sf('normal',6); sc(...P.m);
      txt(new Date().toLocaleDateString('pt-BR')+' — Pág. '+pg, pw-8,10,{align:'right'});
    };

    /* ── Barra horizontal (dados→pixels) ── */
    const barH = (x,y,w,h,val,max,col,label,valStr) => {
      const barW = max>0 ? (val/max)*w : 0;
      fl(...P.row1); doc.rect(x,y,w,h,'F');
      fl(...col);    doc.rect(x,y,barW,h,'F');
      sf('normal',6); sc(...P.t);
      txt(label,x+2,y+h*.72,{maxWidth:w*.55});
      sf('bold',7); sc(...col);
      txt(valStr,x+w-1,y+h*.72,{align:'right'});
    };

    /* ── Cálculos base ── */
    const pm        = pCHM(A.fil);
    const chT       = A.fil.reduce((s,r)=>s+r.ch,0);
    const cM        = A.fil.reduce((s,r)=>s+r.cMes,0);
    const prSet     = new Set(A.fil.map(r=>r.pro).filter(Boolean));
    const cuSet     = new Set(A.fil.map(r=>r.curN).filter(Boolean));
    const chEns     = A.fil.filter(r=>isEnsinoHour(r)).reduce((s,r)=>s+r.ch,0);
    const aboveLim  = Object.entries(pm).filter(([,c])=>c>40).sort((a,b)=>b[1]-a[1]);
    const criticos  = aboveLim.filter(([,c])=>c>=50);
    const alertas   = aboveLim.filter(([,c])=>c>=40&&c<50);
    const vals      = Object.values(pm);
    const nSaudavel = vals.filter(v=>v<=30).length;
    const nAtencao  = vals.filter(v=>v>30&&v<=39).length;
    const nAlerta   = vals.filter(v=>v>40&&v<50).length;
    const nCritico  = vals.filter(v=>v>=50).length;
    const mediaCH   = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : 0;

    /* CH por curso */
    const chCurso = {};
    A.fil.forEach(r=>{ if(r.curN) chCurso[r.curN]=(chCurso[r.curN]||0)+r.ch; });
    const topCursos = Object.entries(chCurso).sort((a,b)=>b[1]-a[1]).slice(0,10);

    /* CH por professor (ensino) */
    const topProfs = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,10);

    /* Custo por curso */
    const custoCurso = {};
    A.fil.forEach(r=>{ if(r.curN) custoCurso[r.curN]=(custoCurso[r.curN]||0)+r.cMes; });
    const topCusto = Object.entries(custoCurso).sort((a,b)=>b[1]-a[1]).slice(0,8);

    /* ╔══════════════════════════════════════════════════════╗
       ║  PÁGINA 1 — SITUAÇÃO GERAL + ALERTAS                ║
       ╚══════════════════════════════════════════════════════╝ */
    pageHeader('Relatório de Gestão de Carga Horária Docente', 1);
    let y = 22;

    /* Título */
    sf('bold',15); sc(...P.t);
    txt('Relatório de Inteligência Docente', 10, y); y+=6;
    sf('normal',7); sc(...P.m);
    txt(`Período: ${A.periodo||'—'}  ·  ${A.fil.length} registros analisados  ·  Gerado em ${new Date().toLocaleString('pt-BR')}`, 10, y); y+=5;
    sd(...P.sep); lw(.2); doc.line(10,y,pw-10,y); y+=5;

    /* ── KPI Cards (7 cards) ── */
    const cards = [
      {lbl:'CUSTO BRUTO MENSAL',    val:fB(cM),                         col:O},
      {lbl:'CH TOTAL SEMANAL',      val:fN(chT)+'h',                    col:B},
      {lbl:'CH ENSINO',             val:fN(chEns)+'h',                  col:G},
      {lbl:'DOCENTES ATIVOS',       val:String(prSet.size),             col:B},
      {lbl:'CURSOS',                val:String(cuSet.size),             col:B},
      {lbl:'MÉDIA CH/DOCENTE',      val:fN(mediaCH)+'h',                col:mediaCH>40?[R[0],R[1],R[2]]:mediaCH>30?Y:G},
      {lbl:'ALERTAS SOBRECARGA',    val:String(aboveLim.length),        col:aboveLim.length?(criticos.length?R:O):G},
    ];
    const ncards=cards.length, cw=(pw-20)/ncards, ch_=16;
    cards.forEach(({lbl,val,col},i)=>{
      const x=10+i*cw;
      fl(...P.cardBg); doc.roundedRect(x,y,cw-1.5,ch_,1.5,1.5,'F');
      sd(...P.cardBorder); lw(.25); doc.roundedRect(x,y,cw-1.5,ch_,1.5,1.5,'S');
      fl(...col); doc.roundedRect(x,y,cw-1.5,1.5,.5,.5,'F');
      sf('normal',4.5); sc(...P.m); txt(lbl,x+2.5,y+6,{maxWidth:cw-5});
      sf('bold',8.5); sc(...col); txt(val,x+2.5,y+13.5);
    });
    y+=ch_+5;

    /* ── Status geral ── */
    const statusCol = criticos.length?R : aboveLim.length>prSet.size*.15?O : G;
    const statusTxt = criticos.length?'⚠ ATENÇÃO: Situação crítica detectada' :
                      aboveLim.length?'⚠ Docentes acima do limite recomendado' :
                      '✓ Quadro docente dentro dos parâmetros';
    fl(...statusCol.map(v=>Math.min(255,v+200)));
    doc.roundedRect(10,y,pw-20,9,2,2,'F');
    fl(...statusCol); doc.roundedRect(10,y,3,9,1,1,'F');
    sf('bold',7.5); sc(...statusCol);
    txt(statusTxt, 16, y+6);
    sf('normal',6); sc(...P.m);
    txt(`${nSaudavel} saudáveis (≤30h)  ·  ${nAtencao} atenção (31–39h)  ·  ${nAlerta} alerta (40–49h)  ·  ${nCritico} críticos (≥50h)`, pw-12, y+6, {align:'right'});
    y+=14;

    /* ── Tabela de alertas ── */
    if(aboveLim.length){
      sf('bold',8); sc(...P.t); txt('DOCENTES QUE REQUEREM AÇÃO IMEDIATA', 10, y); y+=2;
      sf('normal',5.5); sc(...P.m); txt('Ordenado por CH — Limite legal: 40h/sem de ensino', 10, y+4); y+=7;

      /* Cabeçalho da tabela */
      fl(...P.s2); doc.rect(10,y,pw-20,6.5,'F');
      sf('bold',6); sc(...P.m);
      const tcols=[['DOCENTE',80],['CH MENSAL',28],['STATUS',28],['AÇÃO SUGERIDA',pw-20-80-28-28-6]];
      let cx=13;
      tcols.forEach(([c,w])=>{ txt(c,cx,y+4.5); cx+=w; });
      y+=6.5;

      const maxRows = Math.min(aboveLim.length, Math.floor((ph-y-15)/6));
      aboveLim.slice(0,maxRows).forEach(([nome,ch],ri)=>{
        const isCrit=ch>=50, isAlert=ch>=40;
        const cor=isCrit?R:O;
        const acao=isCrit?'Redistribuir carga urgente':ch>44?'Revisar contrato':'Monitorar';
        fl(...(ri%2===0?P.row0:P.row1)); doc.rect(10,y,pw-20,6,'F');
        if(isCrit){ fl(...R); doc.rect(10,y,2,6,'F'); }
        sf('normal',6); sc(...cor);
        cx=13;
        const nomeT=nome.length>42?nome.slice(0,40)+'…':nome;
        [[nomeT,80],[fN(ch)+'h/sem',28],[isCrit?'CRÍTICO':ch>44?'ALERTA':'ATENÇÃO',28],[acao,pw-20-80-28-28-6]]
          .forEach(([v,w])=>{ txt(v,cx,y+4); cx+=w; });
        y+=6;
      });
      if(aboveLim.length>maxRows){
        sf('normal',5.5); sc(...P.m);
        txt(`... e mais ${aboveLim.length-maxRows} docente(s) — veja o painel interativo`, 13, y+4);
      }
    } else {
      fl(...[220,252,231]); doc.roundedRect(10,y,pw-20,12,2,2,'F');
      sf('bold',8); sc(...G); txt('✓ Nenhum docente acima do limite de 40h/sem', 14, y+8);
      y+=16;
    }

    /* ╔══════════════════════════════════════════════════════╗
       ║  PÁGINA 2 — DISTRIBUIÇÃO DE CARGA                   ║
       ╚══════════════════════════════════════════════════════╝ */
    doc.addPage();
    pageHeader('Distribuição de Carga Horária por Curso e Docente', 2);
    y = 22;

    const colW = (pw-26)/2;  /* largura de cada coluna */

    /* ── Coluna esquerda: CH por Curso ── */
    sf('bold',8); sc(...P.t); txt('CH SEMANAL POR CURSO (Top 10)', 10, y);
    sf('normal',5.5); sc(...P.m); txt('Carga horária total de ensino por curso', 10, y+4);

    /* ── Coluna direita: CH por Professor ── */
    txt('CH SEMANAL POR DOCENTE (Top 10)', 14+colW, y);
    sf('normal',5.5); sc(...P.m); txt('Carga horária de ensino por docente', 14+colW, y+4);
    y+=8;

    const barRowH=9, barGap=1;
    const maxCurso = topCursos[0]?.[1]||1;
    const maxProf  = topProfs[0]?.[1]||1;

    topCursos.slice(0,10).forEach(([nome,val],i)=>{
      const by=y+i*(barRowH+barGap);
      /* posição no ranking */
      const rankCol=i===0?O:i<3?B:G;
      fl(...rankCol); doc.circle(11.5,by+barRowH/2,2.5,'F');
      sf('bold',5); sc(255,255,255); txt(String(i+1),i<9?10.8:10.2,by+barRowH/2+1.8);
      /* barra */
      const bx=16, bw=colW-8;
      const bBarW=maxCurso>0?(val/maxCurso)*bw:0;
      fl(...P.row1); doc.rect(bx,by,bw,barRowH,'F');
      fl(...B.map((v,j)=>j===2?Math.min(255,v+60):v)); /* azul mais claro */
      doc.rect(bx,by,bBarW,barRowH,'F');
      /* nome do curso */
      const nomeT=nome.length>30?nome.slice(0,28)+'…':nome;
      sf('normal',5.5); sc(...P.t); txt(nomeT,bx+2,by+barRowH*.68,{maxWidth:bw*.58});
      sf('bold',6.5); sc(...B); txt(fN(val)+'h',bx+bw-1,by+barRowH*.68,{align:'right'});
    });

    topProfs.slice(0,10).forEach(([nome,val],i)=>{
      const by=y+i*(barRowH+barGap);
      const profX=14+colW;
      const isCrit=val>=50, isAlert=val>=40;
      const pCol=isCrit?R:isAlert?O:G;
      fl(...pCol); doc.circle(profX+1.5,by+barRowH/2,2.5,'F');
      sf('bold',5); sc(255,255,255); txt(String(i+1),i<9?profX+.8:profX+.4,by+barRowH/2+1.8);
      const bx=profX+6, bw=colW-8;
      const bBarW=maxProf>0?(val/maxProf)*bw:0;
      fl(...P.row1); doc.rect(bx,by,bw,barRowH,'F');
      fl(...pCol.map(v=>Math.min(255,v+80)));
      doc.rect(bx,by,bBarW,barRowH,'F');
      const nomeT=nome.length>28?nome.slice(0,26)+'…':nome;
      sf('normal',5.5); sc(...P.t); txt(nomeT,bx+2,by+barRowH*.68,{maxWidth:bw*.55});
      sf('bold',6.5); sc(...pCol); txt(fN(val)+'h',bx+bw-1,by+barRowH*.68,{align:'right'});
    });

    y+=10*(barRowH+barGap)+6;
    sd(...P.sep); lw(.2); doc.line(10,y,pw-10,y); y+=6;

    /* ── Faixa de CH (distribuição) ── */
    sf('bold',8); sc(...P.t); txt('DISTRIBUIÇÃO POR FAIXA DE CARGA HORÁRIA', 10, y); y+=6;

    const faixas=[
      {lbl:'Saudável (≤30h)',  n:nSaudavel, col:G},
      {lbl:'Atenção (31–39h)', n:nAtencao,  col:Y},
      {lbl:'Alerta (40–49h)',  n:nAlerta,   col:O},
      {lbl:'Crítico (≥50h)',   n:nCritico,  col:R},
    ];
    const faixaW=(pw-20)/faixas.length;
    const total=vals.length||1;
    faixas.forEach(({lbl,n,col},i)=>{
      const fx=10+i*faixaW, pct=Math.round((n/total)*100);
      fl(...P.cardBg); doc.roundedRect(fx,y,faixaW-3,20,2,2,'F');
      sd(...P.cardBorder); lw(.2); doc.roundedRect(fx,y,faixaW-3,20,2,2,'S');
      fl(...col); doc.roundedRect(fx,y,faixaW-3,2,.5,.5,'F');
      sf('bold',14); sc(...col); txt(String(n),fx+3,y+13);
      sf('normal',5); sc(...P.m); txt(lbl,fx+3,y+17.5);
      sf('bold',7); sc(...P.m); txt(pct+'%',fx+faixaW-6,y+13,{align:'right'});
    });
    y+=26;

    /* ╔══════════════════════════════════════════════════════╗
       ║  PÁGINA 3 — CUSTO + DIAGNÓSTICO                     ║
       ╚══════════════════════════════════════════════════════╝ */
    doc.addPage();
    pageHeader('Custo Mensal e Diagnóstico da Gestão', 3);
    y = 22;

    /* ── Custo por curso ── */
    sf('bold',8); sc(...P.t); txt('CUSTO BRUTO MENSAL POR CURSO (Top 8)', 10, y);
    sf('normal',5.5); sc(...P.m); txt('Total de salário bruto + DSR por curso', 10, y+4); y+=9;

    const maxCusto=topCusto[0]?.[1]||1;
    const custoBarH=8, custoW=pw-20;
    topCusto.forEach(([nome,val],i)=>{
      const by=y+i*(custoBarH+1.5);
      const frac=val/maxCusto;
      const barW=frac*(custoW-60);
      /* Rank badge */
      fl(...(i===0?O:i<3?B:G)); doc.circle(11.5,by+custoBarH/2,2.5,'F');
      sf('bold',5); sc(255,255,255); txt(String(i+1),i<9?10.8:10.2,by+custoBarH/2+1.8);
      /* trilha */
      fl(...P.row1); doc.rect(16,by,custoW-60,custoBarH,'F');
      /* barra */
      const custCol=i===0?O:B;
      fl(...custCol.map(v=>Math.min(255,v+70))); doc.rect(16,by,barW,custoBarH,'F');
      /* nome */
      const nT=nome.length>38?nome.slice(0,36)+'…':nome;
      sf('normal',5.5); sc(...P.t); txt(nT,18,by+custoBarH*.68,{maxWidth:custoW*.4});
      /* valor */
      sf('bold',6.5); sc(...custCol); txt(fB(val),custoW-42,by+custoBarH*.68,{align:'right'});
      /* % do total */
      sf('normal',5.5); sc(...P.m); txt('('+Math.round((val/cM)*100)+'%)',custoW-20,by+custoBarH*.68,{align:'right'});
    });

    y+=topCusto.length*(custoBarH+1.5)+8;
    sd(...P.sep); lw(.2); doc.line(10,y,pw-10,y); y+=6;

    /* ── Diagnóstico e recomendações ── */
    sf('bold',8); sc(...P.t); txt('DIAGNÓSTICO E RECOMENDAÇÕES', 10, y); y+=6;

    const recomendacoes=[];
    if(criticos.length)
      recomendacoes.push({tipo:'CRÍTICO', txt:`${criticos.length} docente(s) com ≥50h/sem — risco de passivo trabalhista. Redistribuir carga imediatamente.`, col:R});
    if(alertas.length)
      recomendacoes.push({tipo:'ALERTA', txt:`${alertas.length} docente(s) entre 40–49h/sem — avaliar redistribuição ou contratação complementar.`, col:O});
    if(nSaudavel/total<.6)
      recomendacoes.push({tipo:'ATENÇÃO', txt:`Apenas ${Math.round((nSaudavel/total)*100)}% do quadro está na faixa saudável (≤30h) — revisar distribuição geral.`, col:Y});
    if(topCursos[0]&&topCursos[0][1]/chT>.25)
      recomendacoes.push({tipo:'CONCENTRAÇÃO', txt:`"${topCursos[0][0]}" concentra ${Math.round((topCursos[0][1]/chT)*100)}% da CH total — verificar dependência de curso único.`, col:B});
    if(mediaCH<=30&&!aboveLim.length)
      recomendacoes.push({tipo:'POSITIVO', txt:`Quadro equilibrado — média de ${fN(mediaCH)}h/sem, todos os docentes dentro dos limites recomendados.`, col:G});
    if(!recomendacoes.length)
      recomendacoes.push({tipo:'OK', txt:'Distribuição de carga dentro dos parâmetros esperados para o período analisado.', col:G});

    recomendacoes.forEach(({tipo,txt:t,col},i)=>{
      if(y+11>ph-12) return;
      const mix=col.map(v=>Math.min(255,v+185));
      fl(...mix); doc.roundedRect(10,y,pw-20,10,2,2,'F');
      fl(...col); doc.roundedRect(10,y,3,10,1,1,'F');
      sf('bold',6); sc(...col); txt(tipo+': ',15,y+4.5);
      const tipoW=doc.getTextWidth(tipo+': ');
      sf('normal',6); sc(...P.t);
      const lines=doc.splitTextToSize(t,pw-32-tipoW);
      txt(lines[0]||'',15+tipoW,y+4.5);
      if(lines[1]) txt(lines[1],15,y+8.5,{maxWidth:pw-32});
      y+=12;
    });

    /* ── Rodapé final ── */
    y=ph-10;
    sd(...P.sep); lw(.2); doc.line(10,y,pw-10,y);
    sf('normal',5.5); sc(...P.m);
    txt('DMS — Sistema de Gestão de Carga Horária Docente · IES · Gerado automaticamente',10,y+5);
    txt('Confidencial — uso interno',pw-10,y+5,{align:'right'});

    doc.save('Relatorio_Gestao_Docente_'+new Date().toISOString().slice(0,10)+'.pdf');
    toast('Relatório PDF gerado com sucesso!','success');

  } catch(err){
    toast('Erro ao gerar PDF: '+err.message,'error');
    console.error('[expPDF]',err);
  }
  hideL();
}



/* ═══════════════════════════════════════════════════════════════
   PUBLIC API — aliases semânticos
═══════════════════════════════════════════════════════════════ */
/** Reprocessa filtros e atualiza toda a UI */
function processData(){ applyF(); }
/** Recria todos os gráficos */
function renderCharts(){ rfCharts(); }
/** Aplica filtros da sidebar */
function applyFilters(){ applyF(); }
/** Exporta dashboard em PDF */
function generatePDF(){ expPDF(); }

/* Chart.js defaults */
Chart.defaults.font.family='DM Sans';
  /* ── Plugin: cross-fade opacidade ao hover em charts de barra ── */
  /* cross-fade plugin removido */
;

Chart.defaults.animation.duration=280; Chart.defaults.animation.easing='easeInOutQuart';
Chart.defaults.scale.grid.lineWidth=0.7;

/* ── Plugin: rótulos de valor direto nas barras (sem precisar passar o mouse) ──
   Ativa-se por gráfico via options.plugins.valueLabels:{formatter:v=>...} */
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart, args, opts) {
    if (!opts || !opts.formatter) return;
    const { ctx } = chart;
    const fmt   = opts.formatter;
    const color = opts.color || '#334155';
    const horizontal = chart.options.indexAxis === 'y';
    chart.data.datasets.forEach((dataset, dsIndex) => {
      const meta = chart.getDatasetMeta(dsIndex);
      if (meta.hidden || meta.type !== 'bar') return;
      meta.data.forEach((el, index) => {
        const value = dataset.data[index];
        if (value === null || value === undefined) return;
        const text = fmt(value, index);
        if (!text) return;
        const pos = el.tooltipPosition ? el.tooltipPosition() : el;
        ctx.save();
        ctx.font = "600 10px 'DM Sans', sans-serif";
        ctx.fillStyle = color;
        if (horizontal) {
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, pos.x + 6, pos.y);
        } else {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(text, pos.x, pos.y - 4);
        }
        ctx.restore();
      });
    });
  }
};
Chart.register(valueLabelsPlugin);

/* ═══════════════════════════════════════════════════════════════════════
   SISTEMA DE VISÕES — Executivo | Operacional | Orçamento
   Cada visão usa os mesmos dados (A.fil) já carregados.
   Não recarrega arquivo, não perde filtros.
═══════════════════════════════════════════════════════════════════════ */

let _currentView = 'executivo';
let _eChartCusto = null;
let _eChartCH    = null;
let _eChartOrc   = null;
let _eChartOrcCH = null;

function switchView(view) {
  if (_currentView === view && view !== 'menu') return;
  _currentView = view;

  // Atualizar botões da nav
  ['executivo','operacional','orcamento'].forEach(v => {
    const btn = document.getElementById('vBtn-' + v);
    if (!btn) return;
    const isActive = v === view;
    btn.classList.toggle('active', isActive);
    btn.style.background = isActive ? 'var(--bc)' : 'transparent';
    btn.style.color      = isActive ? 'var(--t)'  : 'var(--m)';
    btn.style.fontWeight = isActive ? '600'        : '500';
    btn.style.boxShadow  = isActive ? '0 1px 4px rgba(15,23,42,.10)' : 'none';
  });

  const elMenu = document.getElementById('viewMenu');
  const elExec = document.getElementById('viewExecutivo');
  const elOper = document.getElementById('dash-operacional');
  const elOrc  = document.getElementById('viewOrcamento');
  const sb          = document.getElementById('sb');
  const btnVoltar   = document.getElementById('btnVoltarMenu');

  // Ocultar tudo com display:none inline
  [elMenu, elExec, elOper, elOrc].forEach(el => {
    if (el) { el.classList.remove('active'); el.style.display = 'none'; }
  });
  if (sb) sb.style.display = 'none';
  // Botão Menu + separador: visíveis nas visões, ocultos no menu
  if (btnVoltar) btnVoltar.style.display = view === 'menu' ? 'none' : 'flex';
  const btnVoltarSep = document.getElementById('btnVoltarSep');
  if (btnVoltarSep) btnVoltarSep.style.display = view === 'menu' ? 'none' : 'block';
  // dashControls, metadataPanel, expWrap, viewNav, Termos, Sobre: só aparecem nas visões (não no menu)
  const dc  = document.getElementById('dashControls');
  const mp  = document.getElementById('metadataPanel');
  const ew  = document.getElementById('expWrap');
  const nav = document.getElementById('viewNav');
  const bT  = document.getElementById('bTermos');
  const bS  = document.getElementById('btnSobre');
  if (dc)  dc.style.display  = view === 'menu' ? 'none' : '';
  if (mp)  mp.style.display  = view === 'menu' ? 'none' : '';
  if (ew) {
    if (view === 'menu') { ew.classList.remove('vis'); }
    else { ew.classList.add('vis'); }
  }
  if (nav) {
    if (view === 'menu') { nav.classList.remove('visible'); }
    else { nav.classList.add('visible'); }
  }
  if (bT) bT.style.display = view === 'menu' ? 'none' : '';
  if (bS) {
    if (view === 'menu') { bS.classList.remove('visible'); }
    else { bS.classList.add('visible'); }
  }

  // Ativar visão correta — apenas remover display:none, preservar outros estilos
  function mostrar(el) {
    if (!el) return;
    el.style.display = '';   // remove o display:none inline, classe active assume
    el.classList.add('active');
  }

  if (view === 'menu')        mostrar(elMenu);
  if (view === 'executivo')   mostrar(elExec);
  if (view === 'operacional') {
    mostrar(elOper);
    if (sb) sb.removeAttribute('style');
  }
  if (view === 'orcamento')   mostrar(elOrc);

  // Renderizar — só com dados
  if (!A.raw.length) return;
  if (view === 'executivo')   renderExecutivo();
  if (view === 'orcamento')   renderOrcamento();
  if (view === 'operacional') {
    rfDash();
    requestAnimationFrame(() => {
      try { rfCharts(); } catch(e){}
      requestAnimationFrame(() => {
        try { rfGauge(); }       catch(e){}
        try { rfHeatmap(); }     catch(e){}
        try { rfRanking(); }     catch(e){}
        try { rfTimeline(); }    catch(e){}
        try { rfDiag(); }        catch(e){}
        try { rfAlertEngine(); } catch(e){}
        try { rfInsights(); }    catch(e){}
      });
    });
  }
}


function renderExecutivo() {
  const d  = A.fil.length ? A.fil : A.raw;
  if (!d.length) return;

  /* Cálculos */
  const prMap  = {};
  d.forEach(r => {
    if (!r.pro) return;
    prMap[r.pro] = (prMap[r.pro] || 0) + (r.ch || 0);
  });
  const prVals  = Object.values(prMap);
  const nProf   = prVals.length;
  const cMes    = d.reduce((s, r) => s + (r.cMes || 0), 0);
  const nCursos = new Set(d.map(r => r.curN).filter(Boolean)).size;
  const mediaCH = nProf ? (prVals.reduce((s,v) => s+v, 0) / nProf) : 0;

  const saudavel = prVals.filter(v => v <= 30).length;
  const atencao  = prVals.filter(v => v > 30 && v <= 36).length;
  const alerta   = prVals.filter(v => v > 36 && v <= 40).length;
  const critico  = prVals.filter(v => v > 40).length;

  const acima40  = Object.entries(prMap)
    .filter(([,c]) => c > 40)
    .sort((a,b) => b[1]-a[1]);

  /* Hero — Custo */
  const el = id => document.getElementById(id);
  el('eHeroCusto').textContent = fB(cMes);

  const custoBadge = el('eHeroCustoBadge');
  if (A.orcado) {
    const pct  = ((cMes / A.orcado) * 100).toFixed(1);
    const over = cMes > A.orcado;
    custoBadge.textContent  = (over ? '▲ ' : '▼ ') + pct + '% do orçamento';
    custoBadge.className    = 'exec-hero-badge ' + (over ? 'bad' : 'ok');
  } else {
    custoBadge.textContent = 'aba Orçamento não carregada';
    custoBadge.className   = 'exec-hero-badge warn';
  }

  /* Hero — Orçado vs Realizado */
  if (A.orcado) {
    const delta = cMes - A.orcado;
    el('eHeroOrcDelta').textContent = (delta >= 0 ? '+' : '') + fB(delta);
    el('eHeroOrcSub').textContent   = 'orçado: ' + fB(A.orcado);
    el('eHeroOrcBadge').textContent = delta > 0 ? 'Acima do orçamento' : 'Dentro do orçamento';
    el('eHeroOrcBadge').className   = 'exec-hero-badge ' + (delta > 0 ? 'bad' : 'ok');
  } else {
    el('eHeroOrcDelta').textContent = '—';
    el('eHeroOrcSub').textContent   = 'adicione aba Orçamento na planilha';
    el('eHeroOrcBadge').textContent = 'sem dados de orçamento';
    el('eHeroOrcBadge').className   = 'exec-hero-badge warn';
  }

  /* Hero — Risco */
  el('eHeroRisco').textContent = critico;
  const riscoBadge = el('eHeroRiscoBadge');
  riscoBadge.textContent = critico === 0 ? 'Nenhum risco identificado'
    : critico <= 3 ? critico + ' docente(s) — atenção necessária'
    : critico + ' docentes — situação crítica';
  riscoBadge.className = 'exec-hero-badge ' + (critico === 0 ? 'ok' : critico <= 3 ? 'warn' : 'bad');

  /* KPIs secundários */
  el('eKpiProfessores').textContent = nProf;
  el('eKpiCursos').textContent      = nCursos;
  el('eKpiMediaCH').textContent     = fN(mediaCH) + 'h';
  el('eKpiSaudavel').textContent    = saudavel;

  /* Barra de faixas */
  const total = nProf || 1;
  const pct   = n => Math.round((n / total) * 100);
  el('eFaixaSaudavel').style.width = pct(saudavel) + '%';
  el('eFaixaAtencao').style.width  = pct(atencao)  + '%';
  el('eFaixaAlerta').style.width   = pct(alerta)   + '%';
  el('eFaixaCritico').style.width  = pct(critico)  + '%';
  el('eFaixaSaudavel').textContent = saudavel > 0 ? saudavel : '';
  el('eFaixaAtencao').textContent  = atencao  > 0 ? atencao  : '';
  el('eFaixaAlerta').textContent   = alerta   > 0 ? alerta   : '';
  el('eFaixaCritico').textContent  = critico  > 0 ? critico  : '';

  el('eLegSaudavel').textContent = 'Saudável (até 30h) — ' + saudavel;
  el('eLegAtencao').textContent  = 'Atenção (30–36h) — ' + atencao;
  el('eLegAlerta').textContent   = 'Alerta (36–40h) — ' + alerta;
  el('eLegCritico').textContent  = 'Crítico (>40h) — ' + critico;

  /* Alertas */
  const pill = el('eAlertsPill');
  const list = el('eAlertsList');
  pill.textContent = acima40.length;

  if (!acima40.length) {
    list.innerHTML = '<div class="exec-empty" style="color:#0DAA63">✅ Nenhum docente acima do limite legal de 40h/sem.</div>';
  } else {
    list.innerHTML = acima40.slice(0, 15).map(([nome, ch]) => {
      const crit = ch > 44;
      const color = crit ? '#E35D6A' : '#F58A1F';
      const label = crit ? 'Crítico' : 'Alerta';
      const acao  = crit ? 'Redução imediata necessária' : 'Avaliar redistribuição';
      return `
        <div class="exec-alert-row">
          <div class="exec-alert-status" style="background:${color}"></div>
          <div class="exec-alert-nome">${escH(nome)}</div>
          <div class="exec-alert-ch ${crit ? 'crit' : 'warn'}">${fN(ch)}h/sem</div>
          <div class="exec-alert-acao">${label} — ${acao}</div>
        </div>`;
    }).join('');
    if (acima40.length > 15) {
      list.innerHTML += `<div class="exec-empty" style="font-size:11px">+ ${acima40.length - 15} docente(s) — acesse a visão Operacional para ver todos.</div>`;
    }
  }

  /* Botão PDF */
  const pdfBtn = el('eBtnExpPDF');
  if (pdfBtn) pdfBtn.style.display = '';

  /* Gráficos */
  _renderExecCharts(d);
}

function _renderExecCharts(d) {
  const c    = pal();
  const TOPN = 10;

  /* Custo por curso */
  const custoCurso = {};
  d.forEach(r => {
    if (r.curN) custoCurso[r.curN] = (custoCurso[r.curN] || 0) + (r.cMes || 0);
  });
  const topCusto = Object.entries(custoCurso).sort((a,b) => b[1]-a[1]).slice(0, TOPN);

  const canvasCusto = document.getElementById('eChartCusto');
  if (canvasCusto) {
    if (_eChartCusto) { _eChartCusto.destroy(); }
    _eChartCusto = new Chart(canvasCusto, {
      type: 'bar',
      data: {
        labels: topCusto.map(([k]) => tr(k, 28)),
        datasets: [{ data: topCusto.map(([,v]) => +v.toFixed(2)),
          backgroundColor: c.p[1] + 'CC',
          borderColor: c.p[1], borderWidth: 1, borderRadius: 4 }]
      },
      options: { ...dOpts(c),
        indexAxis: 'y',
        plugins: { ...dOpts(c).plugins,
          tooltip: { ...bTT(c), callbacks: { label: ctx => ' ' + fB(ctx.parsed.x) } }
        },
        scales: { x: { ...bSc(c).x, ticks: { ...bSc(c).x.ticks,
          callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } }, y: bSc(c).y }
      }
    });
  }

  /* CH por curso */
  const chCurso = {};
  d.forEach(r => {
    if (r.curN) chCurso[r.curN] = (chCurso[r.curN] || 0) + (r.ch || 0);
  });
  const topCH = Object.entries(chCurso).sort((a,b) => b[1]-a[1]).slice(0, TOPN);

  const canvasCH = document.getElementById('eChartCH');
  if (canvasCH) {
    if (_eChartCH) { _eChartCH.destroy(); }
    _eChartCH = new Chart(canvasCH, {
      type: 'bar',
      data: {
        labels: topCH.map(([k]) => tr(k, 28)),
        datasets: [{ data: topCH.map(([,v]) => +v.toFixed(1)),
          backgroundColor: c.p[0] + 'CC',
          borderColor: c.p[0], borderWidth: 1, borderRadius: 4 }]
      },
      options: { ...dOpts(c),
        indexAxis: 'y',
        plugins: { ...dOpts(c).plugins,
          tooltip: { ...bTT(c), callbacks: { label: ctx => ' ' + fN(ctx.parsed.x) + 'h' } }
        },
        scales: { x: { ...bSc(c).x, ticks: { ...bSc(c).x.ticks,
          callback: v => v + 'h' } }, y: bSc(c).y }
      }
    });
  }
}

/* ─── RENDERIZAÇÃO — VISÃO ORÇAMENTO ─────────────────────────────── */
function renderOrcamento() {
  const orcData = A.orcadoDetalhado;
  const empty   = document.getElementById('orcEmpty');
  const kpiGrid = document.getElementById('orcKpiGrid');
  const chartCard = document.getElementById('orcChartCard');
  const tableWrap = document.getElementById('orcTableWrap');
  const secFin  = document.getElementById('orcSecFin');
  const secCH   = document.getElementById('orcSecCH');
  const kpiGridCH = document.getElementById('orcKpiGridCH');
  const chartCardCH = document.getElementById('orcChartCardCH');

  if (!orcData || !orcData.length) {
    empty.style.display = '';
    kpiGrid.style.display = 'none';
    chartCard.style.display = 'none';
    tableWrap.style.display = 'none';
    if (secFin) secFin.style.display = 'none';
    if (secCH) secCH.style.display = 'none';
    if (kpiGridCH) kpiGridCH.style.display = 'none';
    if (chartCardCH) chartCardCH.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  kpiGrid.style.display = '';
  chartCard.style.display = '';
  tableWrap.style.display = '';
  if (secFin) secFin.style.display = '';
  if (secCH) secCH.style.display = '';
  if (kpiGridCH) kpiGridCH.style.display = '';
  if (chartCardCH) chartCardCH.style.display = '';

  /* Calcular custo realizado por curso */
  const realCurso = {};
  (A.fil.length ? A.fil : A.raw).forEach(r => {
    if (r.curN) realCurso[r.curN] = (realCurso[r.curN] || 0) + (r.cMes || 0);
  });
  const chRealCurso = {};
  (A.fil.length ? A.fil : A.raw).forEach(r => {
    if (r.curN) chRealCurso[r.curN] = (chRealCurso[r.curN] || 0) + (r.ch || 0);
  });

  /* Enriquecer com realizado */
  const rows = orcData.map(row => ({
    ...row,
    chReal:    chRealCurso[row.curso] || 0,
    custoReal: realCurso[row.curso]   || 0,
    delta:     (realCurso[row.curso] || 0) - row.valorOrcado,
  }));

  /* KPIs */
  const totalOrc  = rows.reduce((s,r) => s + r.valorOrcado, 0);
  const totalReal = rows.reduce((s,r) => s + r.custoReal,   0);
  const desvio    = totalReal - totalOrc;
  const cursosOk  = rows.filter(r => r.custoReal <= r.valorOrcado * 1.05).length;

  /* KPIs — Carga Horária (CH) */
  const chTotalOrc  = rows.reduce((s,r) => s + r.chPrevista, 0);
  const chTotalReal = rows.reduce((s,r) => s + r.chReal,     0);
  const chDesvio    = chTotalReal - chTotalOrc;

  const el = id => document.getElementById(id);
  el('orcTotalOrc').textContent  = fB(totalOrc);
  el('orcTotalReal').textContent = fB(totalReal);
  el('orcDesvio').textContent    = (desvio >= 0 ? '+' : '') + fB(desvio);
  el('orcDesvio').className      = 'exec-kpi-val ' + (desvio > 0 ? 'orc-delta-neg' : 'orc-delta-pos');
  el('orcCursosOk').textContent  = cursosOk + '/' + rows.length;

  if (el('orcChTotalOrc'))  el('orcChTotalOrc').textContent  = fN(chTotalOrc) + 'h';
  if (el('orcChTotalReal')) el('orcChTotalReal').textContent = fN(chTotalReal) + 'h';
  if (el('orcChDesvio')) {
    el('orcChDesvio').textContent = (chDesvio >= 0 ? '+' : '') + fN(chDesvio) + 'h';
    el('orcChDesvio').className   = 'exec-kpi-val ' + (chDesvio > 0 ? 'orc-delta-neg' : 'orc-delta-pos');
  }

  /* Tabela */
  const tbody = el('orcTableBody');
  tbody.innerHTML = rows.sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta)).map(r => {
    const ok   = r.custoReal <= r.valorOrcado * 1.05;
    const crit = r.custoReal >  r.valorOrcado * 1.20;
    const sem  = ok ? 'ok' : crit ? 'bad' : 'warn';
    const lbl  = ok ? '✓ Ok' : crit ? '▲ Excedido' : '⚠ Atenção';
    const dSign = r.delta >= 0 ? '+' : '';
    return `<tr>
      <td style="font-weight:600">${escH(tr(r.curso, 32))}</td>
      <td>${escH(r.modalidade || '—')}</td>
      <td style="text-align:right">${fN(r.chPrevista)}h</td>
      <td style="text-align:right">${fN(r.chReal)}h</td>
      <td style="text-align:right">${fB(r.valorOrcado)}</td>
      <td style="text-align:right">${fB(r.custoReal)}</td>
      <td style="text-align:right" class="${r.delta>0?'orc-delta-neg':'orc-delta-pos'}">${dSign}${fB(r.delta)}</td>
      <td style="text-align:center"><span class="orc-semaforo ${sem}">${lbl}</span></td>
    </tr>`;
  }).join('');

  /* Gráfico comparativo — Custo */
  const topRows = rows.sort((a,b) => b.valorOrcado - a.valorOrcado).slice(0, 12);
  const c = pal();
  const canvasOrc = el('eChartOrc');
  if (canvasOrc) {
    if (_eChartOrc) { _eChartOrc.destroy(); }
    _eChartOrc = new Chart(canvasOrc, {
      type: 'bar',
      data: {
        labels: topRows.map(r => tr(r.curso, 24)),
        datasets: [
          { label: 'Orçado',    data: topRows.map(r => +r.valorOrcado.toFixed(2)),
            backgroundColor: c.p[1] + '99', borderColor: c.p[1],
            borderWidth: 1, borderRadius: 3 },
          { label: 'Realizado', data: topRows.map(r => +r.custoReal.toFixed(2)),
            backgroundColor: c.p[0] + '99', borderColor: c.p[0],
            borderWidth: 1, borderRadius: 3 },
        ]
      },
      options: { ...dOpts(c),
        layout:{padding:{top:20}},
        plugins: { ...dOpts(c).plugins,
          legend: { display: true, labels: { color: c.ticks, font: { size: 11 } } },
          tooltip: { ...bTT(c), callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fB(ctx.parsed.y) } },
          valueLabels: { formatter: v => fB(v) }
        },
        scales: { x: bSc(c).x, y: { ...bSc(c).y, ticks: { ...bSc(c).y.ticks,
          callback: v => 'R$' + (v/1000).toFixed(0) + 'k' } } }
      }
    });
  }

  /* Gráfico comparativo — CH */
  const canvasOrcCH = el('eChartOrcCH');
  if (canvasOrcCH) {
    if (_eChartOrcCH) { _eChartOrcCH.destroy(); }
    _eChartOrcCH = new Chart(canvasOrcCH, {
      type: 'bar',
      data: {
        labels: topRows.map(r => tr(r.curso, 24)),
        datasets: [
          { label: 'CH Orçada',    data: topRows.map(r => +r.chPrevista.toFixed(1)),
            backgroundColor: c.p[3] + '99', borderColor: c.p[3],
            borderWidth: 1, borderRadius: 3 },
          { label: 'CH Realizada', data: topRows.map(r => +r.chReal.toFixed(1)),
            backgroundColor: c.p[2] + '99', borderColor: c.p[2],
            borderWidth: 1, borderRadius: 3 },
        ]
      },
      options: { ...dOpts(c),
        layout:{padding:{top:20}},
        plugins: { ...dOpts(c).plugins,
          legend: { display: true, labels: { color: c.ticks, font: { size: 11 } } },
          tooltip: { ...bTT(c), callbacks: { label: ctx => ' ' + ctx.dataset.label + ': ' + fN(ctx.parsed.y) + 'h' } },
          valueLabels: { formatter: v => fN(v) + 'h' }
        },
        scales: { x: bSc(c).x, y: { ...bSc(c).y, ticks: { ...bSc(c).y.ticks,
          callback: v => fN(v) + 'h' } } }
      }
    });
  }
}

/* Inicializar visões após carregar dados */
function initViews() {
  // viewNav, Termos e Sobre só aparecem nas visões (Executivo/Operacional/Orçamento) — controlados pelo switchView()
  // btnVoltarMenu e separador começam ocultos — aparecem nas visões
  const btnVoltar = document.getElementById('btnVoltarMenu');
  const btnVoltarSep = document.getElementById('btnVoltarSep');
  if (btnVoltar) btnVoltar.style.display = 'none';
  if (btnVoltarSep) btnVoltarSep.style.display = 'none';

  const infoTxt = document.getElementById('vmenuInfoTxt');
  if (infoTxt) {
    const profs  = new Set(A.raw.map(r => r.pro).filter(Boolean)).size;
    const cursos = new Set(A.raw.map(r => r.curN).filter(Boolean)).size;
    infoTxt.textContent = A.raw.length + ' registros · ' + profs + ' docentes · ' + cursos + ' cursos';
  }

  _currentView = null;

  // Mostrar menu diretamente — garantia máxima
  const vm = document.getElementById('viewMenu');
  if (vm) {
    vm.removeAttribute('style');
    vm.classList.add('active');
    // position:fixed já está no CSS — apenas garantir display via classe
  }

  // Garantir que tudo mais está oculto na tela do menu
  ['viewExecutivo','dash-operacional','viewOrcamento'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('active'); el.style.display = 'none'; }
  });
  const sb  = document.getElementById('sb');
  const dc  = document.getElementById('dashControls');
  const mp  = document.getElementById('metadataPanel');
  const ew  = document.getElementById('expWrap');
  const nav = document.getElementById('viewNav');
  const bT  = document.getElementById('bTermos');
  const bS  = document.getElementById('btnSobre');
  if (sb)  sb.style.display  = 'none';
  if (dc)  dc.style.display  = 'none';
  if (mp)  mp.style.display  = 'none';
  if (ew)  ew.classList.remove('vis');
  if (nav) nav.classList.remove('visible');
  if (bT)  bT.style.display  = 'none';
  if (bS)  bS.classList.remove('visible');

  _currentView = 'menu';
}


function abrirSobre(){
  const modal   = document.getElementById('sobreModal');
  const target  = document.getElementById('sobreModalContent');
  const source  = document.getElementById('sobrePanel');
  if(target && source && !target.innerHTML.trim()){
    target.innerHTML = source.innerHTML;
  }
  modal.classList.add('open');
}

console.info('%cDMS Dashboard ✔','color:#0DAA63;font-weight:bold;font-size:13px');

/* ── Scroll hint: ativa gradiente quando tabela tem overflow ── */
function updateScrollHint(){
  const wrap = document.getElementById('twWrap');
  const scroll = document.getElementById('twScroll');
  if(!wrap||!scroll) return;
  const hasScroll = scroll.scrollWidth > scroll.clientWidth + 4;
  wrap.classList.toggle('has-scroll', hasScroll);
  scroll.onscroll = ()=>{
    const atEnd = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 8;
    wrap.classList.toggle('has-scroll', !atEnd && hasScroll);
  };
}

/* ═══════════════════════════════════════════════════════════════════════
   CHART VIEWER — lógica de navegação entre abas
   ═══════════════════════════════════════════════════════════════════════ */
let _cvTab = 0;
const _cvTotal = 7;

function switchChartTab(idx){
  if(idx === 'prev') idx = (_cvTab - 1 + _cvTotal) % _cvTotal;
  else if(idx === 'next') idx = (_cvTab + 1) % _cvTotal;
  else idx = parseInt(idx);
  _cvTab = idx;

  // Abas ativas
  document.querySelectorAll('.cv-tab').forEach(t =>
    t.classList.toggle('active', parseInt(t.dataset.tab) === idx));

  // Paineis — mostrar o correto
  document.querySelectorAll('.cv-pane').forEach(p =>
    p.classList.toggle('active', parseInt(p.dataset.pane) === idx));

  // Counter
  const cnt = document.getElementById('cvCounter');
  if(cnt) cnt.textContent = (idx+1) + ' / ' + _cvTotal;

  // Scroll a aba ativa na barra
  const activeTab = document.querySelector('.cv-tab.active');
  if(activeTab) activeTab.scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
  // Mover indicador de progresso
  const tabsScroll = document.querySelector('.cv-tabs-scroll');
  if(tabsScroll) tabsScroll.style.setProperty('--tab-progress', idx);

  // Mapa idx → chave em A.charts (exato)
  const chartKeyMap = {0:'cur', 1:'pro', 2:'tH', 3:'esc', 4:'co', 5:'dist', 6:'faixa'};
  const key = chartKeyMap[idx];

  // Aguardar display:block do pane para o canvas ter dimensões reais
  setTimeout(()=>{
    const chart = A.charts && A.charts[key];
    if(chart){
      chart.resize();
      requestAnimationFrame(()=>{ try{ chart.resize(); }catch(e){} });
    }
  }, 50);
}

/* Teclado: setas esquerda/direita quando o viewer está em foco */
document.addEventListener('keydown', e => {
  if(!document.getElementById('chartViewer')) return;
  if(document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if(e.key === 'ArrowLeft')  switchChartTab('prev');
  if(e.key === 'ArrowRight') switchChartTab('next');
});


/* Após trocar de aba: resize de todos os charts visíveis */
function resizeActiveChart(){
  const pane = document.querySelector('.cv-pane.active');
  if(!pane) return;
  const canvas = pane.querySelector('canvas');
  if(!canvas) return;
  const cid = canvas.id;
  // Buscar chart pelo canvas
  for(const key of Object.keys(A.charts)){
    const ch = A.charts[key];
    if(ch && ch.canvas && ch.canvas.id === cid){
      ch.resize(); break;
    }
  }
}
