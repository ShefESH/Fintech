const $ = id => document.getElementById(id);
const qs = new URLSearchParams(location.search);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '£' + Number(n || 0).toLocaleString('en-GB');
let auth = null, last = null, activeRound = -1, step = 0, selectedAnswer = null;
let playbook = [], viewedFile = '', terminalOpen = false, busy = false, settingsBusy = false, refreshing = false;
let verificationFeedback = '', actionMessage = '', pendingAction = null;
const htmlCache = new Map();
function html(id, value) { if (htmlCache.get(id) !== value) { $(id).innerHTML = value; htmlCache.set(id, value); } }
async function api(endpoint, data) {
  const response = await fetch('/api/' + endpoint, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result = await response.json();
  if (!result.ok) throw Error(result.error || 'Request failed');
  return result;
}
function credentials() { return {code:auth.code, token:auth.token}; }
function alertErr(e) { alert(e.message || String(e)); }
function enter(a) {
  auth = a; sessionStorage.setItem('vaultbreak-auth', JSON.stringify(a));
  $('welcome').hidden = true; $('game').hidden = false; $('hostControls').hidden = !a.host;
  if (a.host) loadHostGuide();
  refresh();
}
$('create').onclick = async () => { try { const x = await api('create',{password:$('password').value}); enter({code:x.code,token:x.token,host:true}); } catch(e) { alertErr(e); } };
$('join').onclick = async () => { try { const x = await api('join',{code:$('room').value.trim().toUpperCase(),name:$('team').value}); enter({code:x.code,token:x.token,host:false}); } catch(e) { alertErr(e); } };
async function host(action) { try { await api('host',{...credentials(),action,duration:Number($('duration').value)}); await refresh(); } catch(e) { alertErr(e); } }
$('start').onclick = () => host('start'); $('inject').onclick = () => host('inject');
$('reveal').onclick = () => host('reveal'); $('finish').onclick = () => host('finish');
$('projector').onclick = () => window.open('/?screen='+auth.code,'vaultbreak-projector');
$('optionalFeatures').onchange = async () => {
  settingsBusy = true; $('optionalFeatures').disabled = true;
  try { await api('host',{...credentials(),action:'settings',optionalFeatures:$('optionalFeatures').checked}); await refresh(); }
  catch(e) { $('settingsStatus').textContent = e.message; $('optionalFeatures').checked = !!last?.optionalFeatures; }
  finally { settingsBusy = false; $('optionalFeatures').disabled = !['lobby','reveal'].includes(last?.phase); }
};
let hostGuide=null,hostSelectedMission=null,previewAction='start';
const hostActions=[
 {id:'start',label:'START MISSION / NEXT',title:'Start the next investigation',description:'From the lobby, opens Mission 1. After a reveal, advances to the following mission, resets the timer, and opens the new case to all teams.',warning:'Cannot be undone. Teams will see the new mission immediately.'},
 {id:'inject',label:'RELEASE NEXT INTELLIGENCE',title:'Publish an incident bulletin',description:'Releases one additional scenario development to all teams in the current live mission. You can publish up to two bulletins per mission.',warning:'The bulletin becomes visible immediately and cannot be retracted.'},
 {id:'reveal',label:'LOCK & REVEAL',title:'Close submissions and calculate scores',description:'Immediately ends the current mission, locks further answers, calculates scores and capital changes, and publishes the correct finding with an explanation.',warning:'Irreversible for this mission. Wait until teams have submitted or time is up.'},
 {id:'finish',label:'FINISH GAME',title:'End the event',description:'After the seventh mission has been revealed, closes the competition and leaves the final leaderboard visible.',warning:'Only available after the final mission reveal.'},
 {id:'projector',label:'OPEN PROJECTOR',title:'Open the audience display',description:'Opens a separate read-only scoreboard window for your projector. It does not show the private host answer key or change game progress.',warning:'Safe to open at any time.'}
];
async function loadHostGuide(){if(!auth?.host||hostGuide)return;try{hostGuide=await api('host-guide',{code:auth.code,token:auth.token});$('hostMissionSelect').innerHTML=hostGuide.missions.map((m,i)=>'<option value="'+i+'">'+String(i+1).padStart(2,'0')+' · '+esc(m.title)+'</option>').join('');$('hostMissionSelect').onchange=()=>{hostSelectedMission=Number($('hostMissionSelect').value);renderHostGuide()};renderHostGuide()}catch(e){$('hostAnswerGuide').textContent='Unable to load private host guide: '+e.message}}
function renderHostGuide(){if(!hostGuide)return;const index=hostSelectedMission??last?.round??0;const m=hostGuide.missions[index];if(!m)return;$('hostMissionSelect').value=String(index);$('hostAnswerGuide').innerHTML='<div class="host-guide-section"><div class="eyebrow">MISSION '+m.number+' / 7 · '+esc(m.category)+'</div><h4>'+esc(m.title)+'</h4><p>'+esc(m.brief)+'</p></div><div class="host-guide-section"><strong>Correct final finding: '+String.fromCharCode(65+m.correct)+'</strong><p class="answer-highlight">'+esc(m.options[m.correct])+'</p><p>'+esc(m.why)+'</p><details><summary>Show all multiple-choice options</summary><ol type="A">'+m.options.map((o,i)=>'<li class="'+(i===m.correct?'correct-answer':'')+'">'+esc(o)+(i===m.correct?' ✓':'')+'</li>').join('')+'</ol></details></div><div class="host-guide-section"><strong>Preferred final handover</strong><p class="answer-highlight">'+esc(m.responseActions[m.correctResponse])+'</p><details><summary>Show all response options</summary><ol>'+m.responseActions.map((o,i)=>'<li class="'+(i===m.correctResponse?'correct-answer':'')+'">'+esc(o)+'</li>').join('')+'</ol></details></div><div class="host-guide-section"><strong>Optional verification challenge</strong><p>'+esc(m.verification.question)+'</p><p class="answer-highlight">Answer: '+esc(m.verification.answer)+'</p><p>'+esc(m.verification.explain)+'</p></div><div class="host-guide-section"><details><summary>Show full simulated evidence files</summary>'+Object.entries(m.evidence).map(([file,lines])=>'<h5>'+esc(file)+'</h5><pre>'+esc(lines.join('\n'))+'</pre>').join('')+'</details></div><div class="host-guide-section"><strong>Host intelligence bulletins (in order)</strong><ol>'+m.bulletins.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ol><p>Potential exposure: '+money(m.impact)+'</p></div>'}
function renderHostPreview(s){if(!auth?.host)return;$('hostActionPreviewButtons').innerHTML=hostActions.map(a=>'<button type="button" class="secondary '+(previewAction===a.id?'host-preview-selected':'')+'" data-preview="'+a.id+'">'+esc(a.label)+'</button>').join('');$('hostActionPreviewButtons').querySelectorAll('button').forEach(b=>b.onclick=()=>{previewAction=b.dataset.preview;renderHostPreview(last||s)});const a=hostActions.find(x=>x.id===previewAction);const enabled=a.id==='start'?(s.phase==='lobby'||s.phase==='reveal'&&s.round<s.total-1):a.id==='inject'?(s.phase==='live'&&s.injectStage<2):a.id==='reveal'?s.phase==='live':a.id==='finish'?(s.phase==='reveal'&&s.round===s.total-1):true;let specific='';if(a.id==='start')specific=s.phase==='lobby'?'Will open Mission 1: '+(hostGuide?.missions[0]?.title||'The Phishing Ledger'):s.phase==='reveal'&&s.round<s.total-1?'Will open Mission '+(s.round+2)+': '+(hostGuide?.missions[s.round+1]?.title||'next case'):'No next mission can start in the current phase.';if(a.id==='inject')specific='Current bulletin: '+s.injectStage+'/2. '+(s.injectStage<2?'Next bulletin: '+(hostGuide?.missions[s.round]?.bulletins[s.injectStage]||'Load the answer guide to see it.'):'Both bulletins have been released.');if(a.id==='reveal')specific='Current mission: '+(s.round+1)+' · '+s.leaderboard.filter(t=>t.answered).length+'/'+s.teamCount+' teams have submitted. Unsubmitted teams will not receive answer points.';if(a.id==='finish')specific='Available only after Mission 7 is revealed.';if(a.id==='projector')specific='Projector URL: '+location.origin+'/?screen='+encodeURIComponent(s.code);$('hostActionPreview').innerHTML='<div class="host-preview-status '+(enabled?'available':'unavailable')+'">'+(enabled?'AVAILABLE NOW':'NOT AVAILABLE IN '+esc(s.phase.toUpperCase()))+'</div><h5>'+esc(a.title)+'</h5><p>'+esc(a.description)+'</p><p class="host-preview-specific">'+esc(specific)+'</p><p class="host-preview-warning">'+esc(a.warning)+'</p>'}
function clock(s) {
  if (s.phase !== 'live') return '—';
  const t = Math.max(0, s.duration - Math.floor((Date.now() - s.startedAt) / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2,'0')}`;
}
function isOpen(s = last) { return !!(s?.self && s.phase === 'live' && s.self.answer == null && clock(s) !== '0:00'); }
async function refresh() {
  if (!auth || refreshing) return;
  refreshing = true;
  try {
    const s = await api('state',{...credentials(),hostToken:auth.host ? auth.token : undefined});
    last = s; $('connectionStatus').hidden = true; $('returnToSignIn').hidden = true;
    if (activeRound !== s.round) {
      activeRound = s.round; pendingAction = null; step = s.self?.journey?.log.length ? 1 : 0; selectedAnswer = null; playbook = []; viewedFile = ''; terminalOpen = false;
      verificationFeedback = ''; actionMessage = ''; $('caseNotes').value = ''; $('verifyAnswer').value = '';
      $('hintOutput').textContent = ''; $('optionalTools').open = false; $('glossary').hidden = true;
      html('fileViewer','<div class="empty-file">Choose a file above to read it here.</div>');
      $('terminalOutput').textContent = 'Type help or ls to begin.';
    }
    if (s.self && s.phase === 'live' && !playbook.length) {
      try { playbook = (await api('playbook',credentials())).actions; }
      catch(e) { actionMessage = 'Could not load responses. Retrying…'; }
    }
    render(s);
  } catch(e) {
    $('connectionStatus').hidden = false;
    $('connectionStatus').textContent = e.message === 'Room not found' ? 'This room is no longer available. Ask your organiser for a new room code.' : 'Connection interrupted. Reconnecting automatically. ' + e.message;
    $('returnToSignIn').hidden = e.message !== 'Room not found';
  } finally { refreshing = false; }
}
$('returnToSignIn').onclick = () => { sessionStorage.removeItem('vaultbreak-auth'); location.href = '/'; };
function setStep(next) {
  if (!isOpen()) return;
  const reviewed = last.self.filesReviewed.length;
  if (next > 0 && reviewed < 2 || next > 1 && !last.self.journey?.complete) return;
  step = next; actionMessage = ''; render(last);
  $(['evidenceHeading','responseHeading','findingHeading'][step]).focus();
}
$('stepEvidence').onclick = $('backEvidence').onclick = () => setStep(0);
$('stepResponse').onclick = $('continueResponse').onclick = $('backResponse').onclick = () => setStep(1);
$('stepFinding').onclick = $('continueFinding').onclick = () => setStep(2);
$('glossaryToggle').onclick = () => { $('glossary').hidden = !$('glossary').hidden; $('glossaryToggle').setAttribute('aria-expanded',String(!$('glossary').hidden)); };
$('terminalToggle').onclick = () => { terminalOpen = !terminalOpen; render(last); };
async function evidence(command, file) {
  if (!isOpen()) return;
  try {
    const r = await api('terminal',{...credentials(),command});
    if (file) {
      viewedFile = file;
      html('fileViewer',`<div class="viewer-title">${esc(file)}</div><pre>${esc(r.output)}</pre><div id="pinActions" class="viewer-actions" ${last.optionalFeatures ? '' : 'hidden'}><button id="pinEvidence" class="secondary">Pin this file</button></div>`);
      $('pinEvidence').onclick = async () => { try { await api('pin',{...credentials(),file:viewedFile}); await refresh(); } catch(e) { $('hintOutput').textContent = e.message; } };
    } else $('hintOutput').textContent = r.output;
    await refresh();
  } catch(e) { $('hintOutput').textContent = e.message; }
}
$('hintButton').onclick = () => evidence('hint'); $('timelineButton').onclick = () => evidence('timeline');
$('fileBrowser').onclick = e => { const b = e.target.closest('[data-file]'); if (b) evidence('inspect '+b.dataset.file,b.dataset.file); };
$('incidentJourney').onclick = async e => {
  const pick = e.target.closest('[data-stage-choice]');
  if (pick && isOpen() && !busy) { pendingAction = Number(pick.dataset.stageChoice); render(last); $('incidentJourney').querySelector('[data-stage-choice="'+pendingAction+'"]').focus(); return; }
  const run = e.target.closest('[data-journey-action]');
  if (!run || !isOpen() || busy) return;
  const action = run.dataset.journeyAction;
  if (action !== 'advance' && pendingAction == null) return;
  busy = true; render(last);
  try {
    const r = await api('respond', {...credentials(), action, response: pendingAction, revision:last.self.journey.revision});
    last.self.journey = r.journey; pendingAction = null; actionMessage = ''; render(last);
    await refresh(); $('journeyFocus')?.focus();
  } catch(e) { actionMessage = e.message; await refresh(); }
  finally { busy = false; render(last); }
};
function renderJourney(s) {
  const j=s.self?.journey;
  if(!j) return;
  const log=j.log.map(x=>`<li><strong>${x.stage}. ${esc(x.action)}</strong><p>${esc(x.result)}</p></li>`).join('');
  let content='';
  if(j.pending){const event=j.log.at(-1);content=`<div class="incident-outcome"><span class="eyebrow">Decision ${event.stage} / 3 · Operations update</span><h4 id="journeyFocus" tabindex="-1">Your action is in motion</h4><div class="dispatch"><small>You instructed</small><p>${esc(event.action)}</p></div><div class="dispatch reply"><small>Operations reports</small><p>${esc(event.result)}</p></div><button data-journey-action="advance" ${busy?'disabled':''}>${event.next?'See what happens next →':'Review the incident →'}</button></div>`;}
  else if(j.complete){content=`<div class="incident-outcome"><h4 id="journeyFocus" tabindex="-1">Incident decisions complete</h4><p>Your handover is recorded. Use the evidence and what happened to write your final finding.</p><ol class="decision-history">${log}</ol></div>`;}
  else {content=`<div class="incident-stage"><span class="eyebrow">Decision ${j.stage} / 3</span><h4 id="journeyFocus" tabindex="-1">${esc(j.node.title)}</h4><p>${esc(j.node.brief)}</p><div class="response-actions">${j.node.choices.map((x,i)=>`<button data-stage-choice="${i}" class="${pendingAction===i?'selected':''}" aria-pressed="${pendingAction===i}" ${busy?'disabled':''}>${esc(x)}</button>`).join('')}</div><div class="stage-commit"><span>Discuss with your team. This action cannot be undone.</span><button data-journey-action="act" ${pendingAction==null||busy?'disabled':''}>${busy?'Carrying out action…':'Carry out action →'}</button></div></div>${j.log.length?`<details class="decision-log"><summary>Earlier decisions (${j.log.length})</summary><ol class="decision-history">${log}</ol></details>`:''}`;}
  html('incidentJourney',content);
}
$('choices').onclick = e => {
  const b = e.target.closest('[data-answer]'); if (!b || !isOpen()) return;
  selectedAnswer = Number(b.dataset.answer); actionMessage = ''; render(last); $('choices').querySelector('[data-answer="'+selectedAnswer+'"]').focus();
};
$('submitCase').onclick = async () => {
  if (!isOpen() || selectedAnswer == null || busy) return;
  busy = true; $('submitCase').disabled = true; $('submitCase').textContent = 'Submitting…';
  try { await api('answer',{...credentials(),answer:selectedAnswer,notes:last.optionalFeatures ? $('caseNotes').value : ''}); actionMessage = ''; await refresh(); $('phasePanel').focus(); }
  catch(e) { actionMessage = e.message; } finally { busy = false; render(last); }
};
$('verifyForm').onsubmit = async e => {
  e.preventDefault(); if (!isOpen() || !last.optionalFeatures || busy) return;
  busy = true;
  try { const r = await api('verify',{...credentials(),answer:$('verifyAnswer').value}); verificationFeedback = r.message; await refresh(); }
  catch(e) { verificationFeedback = e.message; } finally { busy = false; render(last); }
};
$('investmentOptions').onclick = async e => {
  const b = e.target.closest('[data-invest]'); if (!b || !isOpen() || busy) return;
  if (!confirm('Commit this defence budget? You cannot change it during this mission.')) return;
  busy = true;
  try { await api('invest',{...credentials(),choice:Number(b.dataset.invest)}); await refresh(); }
  catch(e) { actionMessage = e.message; } finally { busy = false; render(last); }
};
$('terminalForm').onsubmit = async e => {
  e.preventDefault(); if (!isOpen() || !last.optionalFeatures) return;
  const command = $('terminalInput').value.trim(); if (!command) return;
  $('terminalInput').value = ''; const out = $('terminalOutput'); out.textContent += '\n$ '+command;
  try { const r = await api('terminal',{...credentials(),command}); out.textContent += '\n'+r.output; await refresh(); }
  catch(e) { out.textContent += '\n'+e.message; }
  out.scrollTop = out.scrollHeight;
};
$('exportReport').onclick = () => {
  if (!last?.self) return;
  const rows = [['Mission','Finding correct','Response correct','Points','Financial impact GBP'],...last.self.history.map(x=>[x.title,x.correct,x.responseCorrect,x.points,x.impact])];
  const csv = rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = 'breaking-bank-'+last.code+'-report.csv'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function render(s) {
  if (!s) return;
  const t = s.self, live = s.phase === 'live', open = isOpen(s), submitted = t?.answer != null;
  const reviewed = t?.filesReviewed?.length || 0, responseChosen = !!t?.journey?.complete;
  const revealed = s.phase === 'reveal' || s.phase === 'finished';
  $('role').textContent = auth.host ? 'Event administration' : auth.projector ? 'Event overview' : t?.name || 'Team workspace';
  $('roomtitle').textContent = 'Room '+s.code;
  $('missionNo').textContent = s.phase === 'lobby' ? '—' : `${s.round+1}/${s.total}`;
  $('timer').textContent = clock(s); $('teamCount').textContent = s.teamCount;
  $('missionPanel').hidden = s.phase === 'lobby' || (live && t && !open);
  $('playerWorkspace').hidden = !open;
  $('phasePanel').hidden = live && open;
  $('phaseTitle').textContent = s.phase === 'lobby' ? (auth.host ? 'Ready when you are' : 'You’re in. Waiting for the organiser.') : s.phase === 'finished' ? 'Event complete' : revealed ? 'Mission complete' : submitted ? 'Case submitted' : t ? 'Time is up' : 'Investigation in progress';
  $('phaseMessage').textContent = s.phase === 'lobby' ? (auth.host ? `Share room code ${s.code}. ${s.teamCount} team${s.teamCount===1?'':'s'} joined. Start the first mission when everyone is ready.` : 'Your team has joined the room. The first case will appear here when the organiser starts it.') : s.phase === 'finished' ? 'The final standings are on the leaderboard. Review your results below.' : revealed ? (auth.host ? (s.round===s.total-1?'All missions are complete. Finish the event to show the final standings.':'Results are visible to all teams. Start the next mission when you are ready.') : (s.round===s.total-1?'Review the explanation below. The organiser will finish the event shortly.':'Review the explanation below. The organiser will start the next mission.')) : submitted ? 'Your response and finding are locked. Wait here for the organiser to reveal the results.' : t ? 'Submissions are closed. Wait for the organiser to reveal the results.' : `${s.leaderboard.filter(x=>x.answered).length} of ${s.teamCount} teams have submitted.`;
  html('phaseDetail',s.phase === 'lobby' && t ? '<ol class="lobby-steps"><li>Read at least two evidence files.</li><li>Make three decisions and see how the incident unfolds.</li><li>Select a finding and submit your case.</li></ol>' : submitted && live ? `<p><strong>Your finding:</strong> ${esc(s.roundData?.options[t.answer])}</p>` : '');
  $('category').textContent = s.roundData?.category || '';
  $('missionTitle').textContent = s.roundData?.title || '';
  $('brief').textContent = s.roundData?.brief || '';
  html('evidence',(s.roundData?.data || []).map(x=>`<div class="evidence">${esc(x)}</div>`).join(''));
  $('incidentBanner').hidden = !s.incident;
  $('incidentBanner').textContent = s.incident ? 'Update from the organiser: '+s.incident : '';
  // A stable DOM between polls preserves keyboard focus and open evidence.
  html('fileBrowser',(t?.evidenceFiles||[]).map(f=>`<button type="button" class="file-button ${t.filesReviewed.includes(f)?'reviewed':''}" data-file="${esc(f)}" aria-pressed="${viewedFile===f}">${t.filesReviewed.includes(f)?'✓ ':''}${esc(f)}</button>`).join(''));
  $('fileCount').textContent = reviewed+' reviewed';
  $('evidenceProgress').textContent = reviewed < 2 ? `${2-reviewed} more file${reviewed===0?'s':''} to review` : 'Evidence requirement complete';
  $('continueResponse').disabled = reviewed < 2 || !open;
  $('continueFinding').disabled = !responseChosen || !open; $('continueFinding').hidden = !responseChosen;
  ['evidenceStep','responseStep','findingStep'].forEach((id,i)=>$(id).hidden = i!==step);
  ['stepEvidence','stepResponse','stepFinding'].forEach((id,i)=>{
    $(id).disabled = !open || (i>0 && reviewed<2) || (i>1 && !responseChosen);
    if (i===step) $(id).setAttribute('aria-current','step'); else $(id).removeAttribute('aria-current');
  });
  $('nextInstruction').textContent = step===0 ? (reviewed<2?'Start here: open two evidence files.':'Ready to continue. You can read more files or choose your response.') : step===1 ? (responseChosen?'Your decisions are complete. Continue to your final finding.':'Take an action, read the outcome, then decide what to do next.') : 'Select your finding, review your choices, then submit.';
  renderJourney(s);
  $('responseStatus').textContent = actionMessage;
  html('choices',(s.roundData?.options||[]).map((x,i)=>`<button type="button" class="choice ${selectedAnswer===i?'selected':''}" data-answer="${i}" aria-pressed="${selectedAnswer===i}"><strong>${String.fromCharCode(65+i)}.</strong> ${esc(x)}</button>`).join(''));
  $('selectedResponse').textContent = t?.journey?.log.at(-1)?.action || 'Complete the incident first.';
  $('selectedFinding').textContent = selectedAnswer==null ? 'Choose a finding above.' : s.roundData?.options[selectedAnswer];
  $('submitCase').disabled = busy || !open || reviewed<2 || !responseChosen || selectedAnswer==null;
  $('submitCase').textContent = busy ? 'Please wait…' : 'Submit case';
  $('actionError').textContent = actionMessage;
  $('evidenceExtras').hidden = !s.optionalFeatures;
  $('optionalTools').hidden = !s.optionalFeatures;
  $('lab').hidden = !s.optionalFeatures || !terminalOpen;
  $('terminalToggle').textContent = terminalOpen ? 'Hide advanced terminal' : 'Advanced terminal';
  if ($('pinActions')) $('pinActions').hidden = !s.optionalFeatures;
  if ($('pinEvidence')) $('pinEvidence').textContent = t?.pinned.includes(viewedFile) ? 'Unpin this file' : 'Pin this file';
  html('pinBoard',(t?.pinned||[]).map(f=>`<span class="pin-item">${esc(f)}</span>`).join('') || 'No evidence pinned.');
  $('verifyQuestion').textContent = t?.verification?.question || '';
  $('verifyStatus').textContent = verificationFeedback || (t?.verification?.solved ? 'Verified. 100 bonus points secured.' : `${t?.verification?.attempts||0}/4 attempts used.`);
  $('verifyForm').hidden = !!t?.verification?.solved;
  html('investmentOptions',['Basic fraud monitoring · £20,000 · 10% loss mitigation','Incident response specialists · £45,000 · 25% loss mitigation','Emergency cyber containment · £80,000 · 55% loss mitigation'].map((x,i)=>`<button class="investment-button" data-invest="${i}" ${t?.investment!=null?'disabled':''}>${t?.investment===i?'✓ ':''}${esc(x)}</button>`).join(''));
  $('investmentStatus').textContent = t?.investment!=null ? 'Budget committed. Remaining: '+money(t.budget) : 'Available budget: £120,000';
  const history = t?.history || [], outcome = history.find(x=>x.round===s.round+1);
  html('result',s.reveal ? `<div class="notice"><h3>Correct finding: ${String.fromCharCode(65+s.reveal.correct)}</h3><p>${esc(s.roundData.options[s.reveal.correct])}</p><p>${esc(s.reveal.why)}</p>${outcome?`<div class="outcome-grid"><div><strong>${outcome.points}</strong><span>Points this mission</span></div><div><strong>${outcome.correct?'Correct':'Incorrect'}</strong><span>Your finding${t.answer!=null?' · '+String.fromCharCode(65+t.answer):' · not submitted'}</span></div><div><strong>${outcome.responseCorrect?'Correct':'Incorrect'}</strong><span>Your response</span></div></div>`:''}</div>` : '');
  html('leaderboard',s.leaderboard.map((x,i)=>`<div><span>${i+1}. ${esc(x.name)}${x.answered&&live?' · submitted':''}</span><strong>${x.score} pts</strong></div>`).join('') || '<div>No teams have joined yet.</div>');
  $('teamOverview').hidden = !t || s.phase==='lobby'; $('teamScore').textContent = t?.score || 0; $('capital').textContent = money(t?.capital);
  $('historyPanel').hidden = !history.length;
  html('missionHistory',history.map(x=>`<div class="history-line"><strong>${x.round}. ${esc(x.title)}</strong><span>${x.points} points</span></div>`).join(''));
  $('optionalFeatures').checked = !!s.optionalFeatures;
  $('optionalFeatures').disabled = settingsBusy || !['lobby','reveal'].includes(s.phase);
  $('settingsStatus').textContent = live ? 'Locked during this mission. You can change this after results are revealed.' : s.phase==='finished' ? 'The event has ended.' : `Optional tools are ${s.optionalFeatures?'on':'off'} for the next mission.`;
  $('start').disabled = !(s.phase==='lobby'||s.phase==='reveal'&&s.round<s.total-1);
  $('start').textContent = s.phase==='lobby'?'Start mission 1':'Start next mission';
  $('inject').disabled = !live || s.injectStage>=2; $('reveal').disabled = !live;
  $('finish').disabled = !(s.phase==='reveal'&&s.round===s.total-1);
  if (auth.host) { renderHostPreview(s); if (hostGuide) renderHostGuide(); }
}
try {
  const saved = JSON.parse(sessionStorage.getItem('vaultbreak-auth') || 'null');
  if (qs.has('screen')) enter({code:qs.get('screen').toUpperCase(),projector:true}); else if (saved) enter(saved);
} catch {}
setInterval(()=>{ if (last) { const old = $('timer').textContent; $('timer').textContent = clock(last); if (old!=='0:00' && clock(last)==='0:00') render(last); } },500);
setInterval(refresh,2000);
