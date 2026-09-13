(() => {
  const A4 = 440;
  const INSTRUMENTS = {
    acoustic: {
      title: 'Guitare acoustique',
      tunings: {
        'Standard': ['E2','A2','D3','G3','B3','E4'],
        'Drop D': ['D2','A2','D3','G3','B3','E4'],
        'Demi-ton plus bas': ['D#2','G#2','C#3','F#3','A#3','D#4'],
        'Un ton plus bas': ['D2','G2','C3','F3','A3','D4'],
        'Open G': ['D2','G2','D3','G3','B3','D4'],
        'Open D': ['D2','A2','D3','F#3','A3','D4']
      }
    },
    electric: {
      title: 'Guitare électrique',
      tunings: {
        'Standard': ['E2','A2','D3','G3','B3','E4'],
        'Drop D': ['D2','A2','D3','G3','B3','E4'],
        'Demi-ton plus bas': ['D#2','G#2','C#3','F#3','A#3','D#4'],
        'Un ton plus bas': ['D2','G2','C3','F3','A3','D4'],
        'Drop C': ['C2','G2','C3','F3','A3','D4']
      }
    },
    bass: {
      title: 'Basse',
      tunings: {
        'Standard': ['E1','A1','D2','G2'],
        'Drop D': ['D1','A1','D2','G2'],
        'Demi-ton plus bas': ['D#1','G#1','C#2','F#2']
      }
    },
    ukulele: {
      title: 'Ukulélé',
      tunings: {
        'Standard': ['G4','C4','E4','A4'],
        'D tuning': ['A4','D4','F#4','B4']
      }
    }
  };

  const els = {
    tunerTitle: document.getElementById('tuner-title'),
    stringButtons: document.getElementById('stringButtons'),
    stageHint: document.getElementById('stageHint'),
    selectedNote: document.getElementById('selectedNote'),
    selectedFrequency: document.getElementById('selectedFrequency'),
    playSelected: document.getElementById('playSelected'),
    repeatToggle: document.getElementById('repeatToggle'),
    tuningSelect: document.getElementById('tuningSelect'),
    tuningNotes: document.getElementById('tuningNotes'),
    earPanel: document.getElementById('earPanel'),
    autoPanel: document.getElementById('autoPanel'),
    micButton: document.getElementById('micButton'),
    micStatusText: document.getElementById('micStatusText'),
    meterNeedle: document.getElementById('meterNeedle'),
    detectedNote: document.getElementById('detectedNote'),
    detectedHz: document.getElementById('detectedHz'),
    tuningMessage: document.getElementById('tuningMessage'),
    selectionFeedback: document.getElementById('selectionFeedback'),
    feedbackNote: document.getElementById('feedbackNote'),
    feedbackFrequency: document.getElementById('feedbackFrequency'),
    tunerSection: document.getElementById('tuner') || document.getElementById('accordeur'),
    visualStrings: document.getElementById('visualStrings')
  };

  let currentInstrument = 'acoustic';
  let currentTuning = 'Standard';
  let selectedString = 0;
  let currentMode = 'ear';
  let audioCtx = null;
  let repeatTimer = null;
  let micStream = null;
  let analyser = null;
  let micSource = null;
  let raf = null;
  let micRunning = false;

  const noteRegex = /^([A-G])(#?)(-?\d)$/;
  const semitoneFromC = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  function noteToMidi(note){
    const m = note.match(noteRegex);
    if(!m) return 69;
    const pitch = semitoneFromC[m[1]] + (m[2] ? 1 : 0);
    const octave = Number(m[3]);
    return 12 * (octave + 1) + pitch;
  }
  function midiToFreq(midi){ return A4 * Math.pow(2,(midi-69)/12); }
  function noteToFreq(note){ return midiToFreq(noteToMidi(note)); }
  function freqToMidi(freq){ return 69 + 12 * Math.log2(freq/A4); }
  function midiToNote(midi){
    const n = Math.round(midi);
    return `${noteNames[(n%12+12)%12]}${Math.floor(n/12)-1}`;
  }

  function ensureAudio(){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playNote(note, duration=1.35){
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    const freq = noteToFreq(note);
    const gain = ctx.createGain();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.value = freq;
    osc2.frequency.value = freq * 2;
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(3800, freq * 18);
    filter.Q.value = .5;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.24, now + .02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    osc1.start(now); osc2.start(now);
    osc1.stop(now + duration + .05); osc2.stop(now + duration + .05);
  }

  function currentNotes(){ return INSTRUMENTS[currentInstrument].tunings[currentTuning]; }

  function renderTunings(){
    const names = Object.keys(INSTRUMENTS[currentInstrument].tunings);
    if(!names.includes(currentTuning)) currentTuning = names[0];
    els.tuningSelect.innerHTML = names.map(name => `<option ${name===currentTuning?'selected':''}>${name}</option>`).join('');
    renderStrings();
  }

  function renderStrings(){
    const notes = currentNotes();
    if(selectedString >= notes.length) selectedString = 0;
    els.stringButtons.className = `string-buttons count-${notes.length}`;
    els.stringButtons.innerHTML = notes.map((note, index) => {
      const hz = noteToFreq(note).toFixed(1);
      return `<button class="string-button ${index===selectedString?'is-selected':''}" data-index="${index}" aria-label="Jouer ${note}" aria-pressed="${index===selectedString}"><strong>${note}</strong><span>${hz} Hz</span></button>`;
    }).join('');
    els.tuningNotes.innerHTML = notes.map(n=>`<span>${n}</span>`).join('');
    renderVisualStrings(notes);
    updateSelected();
  }

  function renderVisualStrings(notes){
    if(!els.visualStrings) return;
    const count = notes.length;
    els.visualStrings.classList.remove('strings-4','strings-6');
    els.visualStrings.classList.add(`strings-${count}`);
    els.visualStrings.innerHTML = notes.map((note,index)=>{
      const pos = count === 1 ? 50 : 22 + (56 * index / (count - 1));
      return `<span class="stage-string ${index===selectedString?'is-selected':''}" data-index="${index}" style="--string-x:${pos}%"><i>${note}</i></span>`;
    }).join('');
  }

  function updateSelected(){
    const note = currentNotes()[selectedString];
    const frequency = `${noteToFreq(note).toFixed(2)} Hz`;
    els.selectedNote.textContent = note;
    els.selectedFrequency.textContent = frequency;
    if(els.feedbackNote) els.feedbackNote.textContent = note;
    if(els.feedbackFrequency) els.feedbackFrequency.textContent = frequency;
    els.stringButtons.querySelectorAll('.string-button').forEach((button,index)=>{
      const active = index === selectedString;
      button.classList.toggle('is-selected',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(els.visualStrings){
      els.visualStrings.querySelectorAll('.stage-string').forEach((stringEl,index)=>{
        stringEl.classList.toggle('is-selected',index===selectedString);
      });
    }
  }

  function scrollToTuner(){
    const target = els.tunerSection;
    if(!target) return;
    const getTargetY = () => Math.max(0, target.getBoundingClientRect().top + window.scrollY - 18);
    // Wait for the instrument state/render to finish, then scroll explicitly.
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        const y = getTargetY();
        try{ window.scrollTo({top:y,behavior:'smooth'}); }
        catch(e){ window.scrollTo(0,y); }
        // Fallback for browsers/embedded views that ignore smooth scroll.
        setTimeout(()=>{
          const remaining = Math.abs(target.getBoundingClientRect().top - 18);
          if(remaining > 90) window.scrollTo(0,getTargetY());
        },420);
      });
    });
  }

  function selectInstrument(name){
    currentInstrument = name;
    currentTuning = Object.keys(INSTRUMENTS[name].tunings)[0];
    selectedString = 0;
    setRepeat(false);
    els.repeatToggle.checked = false;
    document.querySelectorAll('.instrument-card').forEach(b=>b.classList.toggle('is-active',b.dataset.instrument===name));
    els.tunerTitle.textContent = INSTRUMENTS[name].title;
    renderTunings();
  }

  function selectMode(mode){
    currentMode = mode;
    document.querySelectorAll('.mode-button').forEach(btn=>{
      const active = btn.dataset.mode===mode;
      btn.classList.toggle('is-active',active);
      btn.setAttribute('aria-selected',String(active));
    });
    els.earPanel.classList.toggle('is-visible',mode==='ear');
    els.autoPanel.classList.toggle('is-visible',mode==='auto');
    els.stageHint.textContent = mode==='ear' ? "Appuie sur une corde pour entendre la note de référence." : "Joue une corde près du microphone et suis l'indicateur.";
    if(mode==='auto'){
      setRepeat(false);
      els.repeatToggle.checked = false;
    }
    if(mode==='ear' && micRunning) stopMic();
  }

  function setRepeat(enabled){
    clearInterval(repeatTimer);
    repeatTimer = null;
    if(enabled){
      playNote(currentNotes()[selectedString]);
      repeatTimer = setInterval(()=>playNote(currentNotes()[selectedString]),1750);
    }
  }

  async function startMic(){
    if(!navigator.mediaDevices?.getUserMedia){
      els.tuningMessage.textContent = "Ton navigateur ne permet pas l'accès au microphone.";
      return;
    }
    try{
      const ctx = ensureAudio();
      micStream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.05;
      micSource = ctx.createMediaStreamSource(micStream);
      micSource.connect(analyser);
      micRunning = true;
      els.micButton.innerHTML = '<span aria-hidden="true">■</span> Arrêter le microphone';
      els.micStatusText.textContent = 'Microphone actif';
      document.querySelector('.mic-dot')?.classList.add('is-live');
      els.tuningMessage.textContent = 'Joue une corde, une seule à la fois.';
      analysePitch();
    } catch(e){
      els.tuningMessage.textContent = "Autorise le microphone dans ton navigateur pour utiliser l'accordage automatique.";
    }
  }

  function stopMic(){
    micRunning = false;
    if(raf) clearTimeout(raf);
    raf = null;
    micStream?.getTracks().forEach(t=>t.stop());
    micStream = null;
    if(micSource) try{micSource.disconnect()}catch(e){}
    analyser = null;
    micSource = null;
    els.micButton.innerHTML = '<span aria-hidden="true">●</span> Activer le microphone';
    els.micStatusText.textContent = 'Microphone arrêté';
    document.querySelector('.mic-dot')?.classList.remove('is-live');
    els.detectedNote.textContent = '—';
    els.detectedHz.textContent = 'Joue une corde';
    els.meterNeedle.style.left = '50%';
    els.tuningMessage.textContent = 'Active le microphone pour commencer.';
  }

  function autoCorrelate(buffer, sampleRate){
    let rms = 0;
    for(let i=0;i<buffer.length;i++) rms += buffer[i] * buffer[i];
    rms = Math.sqrt(rms / buffer.length);
    if(rms < 0.012) return -1;

    const minLag = Math.max(2, Math.floor(sampleRate / 1200));
    const maxLag = Math.min(buffer.length - 2, Math.floor(sampleRate / 40));
    let bestLag = -1;
    let bestCorrelation = 0;

    for(let lag=minLag; lag<=maxLag; lag++){
      let sum = 0, sumA = 0, sumB = 0;
      const limit = buffer.length - lag;
      for(let i=0;i<limit;i++){
        const a = buffer[i], b = buffer[i+lag];
        sum += a*b; sumA += a*a; sumB += b*b;
      }
      const denom = Math.sqrt(sumA*sumB) || 1;
      const corr = sum/denom;
      if(corr > bestCorrelation){ bestCorrelation = corr; bestLag = lag; }
    }

    if(bestLag < 0 || bestCorrelation < 0.72) return -1;
    return sampleRate / bestLag;
  }

  function nearestTarget(freq){
    let best = null;
    for(const note of currentNotes()){
      const targetFreq = noteToFreq(note);
      const cents = 1200 * Math.log2(freq / targetFreq);
      const score = Math.abs(cents);
      if(!best || score < best.score) best = { note, targetFreq, cents, score };
    }
    return best;
  }

  function analysePitch(){
    if(!micRunning || !analyser || !audioCtx) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf,audioCtx.sampleRate);
    if(freq>40 && freq<1200){
      const target = nearestTarget(freq);
      const rawCents = target.cents;
      const cents = Math.max(-50,Math.min(50,Math.round(rawCents)));
      els.detectedNote.textContent = target.note;
      els.detectedHz.textContent = `${freq.toFixed(1)} Hz · ${rawCents>0?'+':''}${Math.round(rawCents)} cents`;
      els.meterNeedle.style.left = `${50 + cents}%`;
      if(Math.abs(rawCents)<=4) els.tuningMessage.textContent = 'Juste — ne touche plus à rien.';
      else if(rawCents<0) els.tuningMessage.textContent = 'Trop bas — tends légèrement la corde.';
      else els.tuningMessage.textContent = 'Trop haut — détends légèrement la corde.';
    }
    raf = setTimeout(analysePitch, 85);
  }

  document.querySelectorAll('.instrument-card').forEach(btn=>{
    btn.addEventListener('click',()=>{
      selectInstrument(btn.dataset.instrument);
      scrollToTuner();
    });
  });
  document.querySelectorAll('.mode-button').forEach(btn=>btn.addEventListener('click',()=>selectMode(btn.dataset.mode)));

  els.stringButtons.addEventListener('click',e=>{
    const btn=e.target.closest('.string-button');
    if(!btn) return;
    selectedString=Number(btn.dataset.index);
    updateSelected();
    const note = currentNotes()[selectedString];
    const frequency = `${noteToFreq(note).toFixed(2)} Hz`;
    document.querySelectorAll('.string-button').forEach(b=>b.classList.remove('is-playing'));
    if(currentMode==='ear'){
      btn.classList.add('is-playing');
      playNote(note);
      els.stageHint.textContent = `${note} sélectionnée · ${frequency} — note de référence en lecture.`;
      setTimeout(()=>btn.classList.remove('is-playing'),650);
      if(els.repeatToggle.checked) setRepeat(true);
    }
  });

  els.playSelected.addEventListener('click',()=>playNote(currentNotes()[selectedString]));
  els.repeatToggle.addEventListener('change',()=>setRepeat(els.repeatToggle.checked));
  els.tuningSelect.addEventListener('change',()=>{
    currentTuning=els.tuningSelect.value;
    selectedString=0;
    setRepeat(false); els.repeatToggle.checked=false;
    renderStrings();
    if(currentMode==='ear') els.stageHint.textContent = "Appuie sur une corde pour entendre la note de référence.";
  });
  els.micButton.addEventListener('click',()=>micRunning?stopMic():startMic());
  document.addEventListener('visibilitychange',()=>{ if(document.hidden && micRunning) stopMic(); });
  document.getElementById('year').textContent = new Date().getFullYear();
  renderTunings();
})();
