// 游戏流程与渲染。画像判断都在 profile.js，族群数量只用于游戏表现。
(function () {
  const D = window.JUNGLE_DATA;
  const P = window.JungleProfile;
  const app = document.getElementById('app');
  const SPECIES = {
    fox: { name: '狐狸', line: '先查证，也肯改主意。', color: '#d9803f' },
    elephant: { name: '大象', line: '不见条件不动身。', color: '#8f9bad' },
    cheetah: { name: '猎豹', line: '看准了就全力一扑。', color: '#e0b84f' },
    squirrel: { name: '小松鼠', line: '还在学着认路，这很好。', color: '#b77a4a' }
  };
  const LEVEL = { high: '高', medium: '中', low: '低', unknown: '证据不足' };
  const DIMS = { evidence: '取证', calibration: '校准', updating: '更新' };
  const TERR = { river: '河谷', mountain: '山地', nest: '巢穴' };

  let s;
  function reset() {
    s = { pop: 100, i: 0, records: [], scouts: [], stamina: 3, alloc: { river: 0, mountain: 0, nest: 10 },
      traits: [], night: null, nightAnswer: null, taskDone: false, newTraits: [], openTrait: null };
  }
  const season = () => D.seasons[s.i];
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const has = (id) => s.traits.some((t) => t.id === id);

  function grow(id, label, why) {
    if (has(id)) return;
    s.traits.push({ id, label, why });
    s.newTraits.push(id);
  }

  function critter(colorOverride) {
    const c = colorOverride || '#9db86a';
    const g = (id, body) => has(id) ? `<g class="${s.newTraits.includes(id) ? 'grow' : ''}">${body}</g>` : '';
    const big = has('eyes');
    return `<svg viewBox="0 0 120 100" role="img" aria-label="你的生物，已长出 ${s.traits.length} 个特征">
      ${g('ears', `<path d="M38 34 L28 4 L52 26 Z M82 34 L92 4 L68 26 Z" fill="${c}"/>`)}
      ${g('tail', `<path d="M92 76 C118 76 116 46 104 44 C108 60 100 66 88 66 Z" fill="${c}"/>`)}
      ${g('fur', `<ellipse cx="60" cy="66" rx="42" ry="30" fill="#00000030"/>`)}
      <ellipse cx="60" cy="62" rx="34" ry="32" fill="${c}"/>
      ${g('whisker', `<path d="M30 62 L12 56 M30 68 L12 72 M90 62 L108 56 M90 68 L108 72" stroke="#f5efdc" stroke-width="2.5"/>`)}
      ${g('brain', `<path d="M42 32 Q60 14 78 32 Q60 26 42 32 Z" fill="#f2b84b"/>`)}
      ${g('antenna', `<path d="M50 32 Q44 14 36 12 M70 32 Q76 14 84 12" stroke="#f2b84b" stroke-width="3" fill="none"/><circle cx="36" cy="12" r="4" fill="#f2b84b"/><circle cx="84" cy="12" r="4" fill="#f2b84b"/>`)}
      ${g('feet', `<ellipse cx="42" cy="93" rx="13" ry="6" fill="#f2b84b"/><ellipse cx="78" cy="93" rx="13" ry="6" fill="#f2b84b"/>`)}
      <circle cx="47" cy="54" r="${big ? 11 : 6}" fill="#fff"/><circle cx="73" cy="54" r="${big ? 11 : 6}" fill="#fff"/>
      <circle cx="48" cy="55" r="${big ? 5 : 3}" fill="#10231b"/><circle cx="74" cy="55" r="${big ? 5 : 3}" fill="#10231b"/>
      <path d="M52 72 Q60 78 68 72" stroke="#10231b" stroke-width="2.5" fill="none"/>
    </svg>`;
  }

  function scene(cls = '', level = 40, color) {
    const parts = cls === 'storm' || cls === 'harvest'
      ? Array.from({ length: 16 }, (_, i) => `<span class="particle" style="left:${i * 6.3 + 1}%;animation-delay:${(i * 0.17) % 1}s"></span>`).join('') : '';
    return `<div class="scene ${cls}"><div class="ground"></div><div class="river" style="height:${level}px"></div>${parts}<div class="critter">${critter(color)}</div></div>`;
  }
  const hud = () => `<div class="hud"><span>第 ${s.i + 1} / 3 季 · ${season().name}</span><span class="pop" data-testid="population">族群 ${s.pop}</span></div>`;
  const bars = (vals, opts = {}) => {
    const max = Math.max(...vals);
    return `<div class="bars ${opts.cls || ''}">${vals.map((v, i) => {
      const h = `<i style="height:${Math.round((v / max) * 100)}%"></i>`;
      return opts.tap ? `<button data-bar="${i}" data-testid="bar-${opts.cls ? 'v' : ''}${i}" aria-label="第 ${i + 1} 根">${h}</button>` : h;
    }).join('')}</div>`;
  };
  function render(html) { app.innerHTML = html; window.scrollTo(0, 0); s.newTraits = []; }
  function on(sel, fn) { app.querySelectorAll(sel).forEach((el) => el.addEventListener('click', () => fn(el))); }

  // —— 开场 ——
  function intro() {
    reset();
    render(`<h1>进化丛林</h1>
      <p>你只有一只小生物和 100 只族群。活过 3 个季节，它会长成什么样，全看你怎么做。</p>
      ${scene('', 40)}
      <p class="muted">每一季：侦察、分粮、应对突发。约 5 分钟。</p>
      <button class="primary" data-testid="start">带它出发</button>`);
    on('[data-testid=start]', scoutStage);
  }

  // —— 侦察 ——
  function scoutStage() {
    const se = season();
    const cards = s.scouts.map((id) => {
      const c = se.clues[id];
      return `<div class="card"><strong>${c.label}</strong><p>${c.text}</p>${c.chart ? bars(se.visible.river) : ''}</div>`;
    }).join('');
    render(`${hud()}${scene('', se.visible.river.at(-1) * 0.6)}
      <h2>${se.mood}</h2>
      <p class="muted">体力 ${s.stamina}：派谁去看看？也可以什么都不看。</p>
      <div class="clues">${Object.entries(se.clues).map(([id, c]) =>
        `<button data-clue="${id}" data-testid="clue-${id}" class="${s.scouts.includes(id) ? 'seen' : ''}" ${s.stamina === 0 || s.scouts.includes(id) ? 'disabled' : ''}>${c.label}</button>`).join('')}</div>
      ${cards}
      <button class="primary" data-testid="to-alloc">去分粮</button>`);
    on('[data-clue]', (el) => { s.scouts.push(el.dataset.clue); s.stamina--; scoutStage(); });
    on('[data-testid=to-alloc]', allocStage);
  }

  // —— 分粮 ——
  function allocStage() {
    const a = s.alloc;
    const row = (k, hint) => `<div class="alloc"><span class="name">${TERR[k]}<br><span class="muted">${hint}</span></span>
      ${k === 'nest' ? '' : `<button data-dec="${k}" data-testid="dec-${k}" aria-label="减少${TERR[k]}" ${a[k] === 0 ? 'disabled' : ''}>−</button>`}
      <span class="num" data-testid="num-${k}">${a[k]}</span>
      ${k === 'nest' ? '' : `<button data-inc="${k}" data-testid="inc-${k}" aria-label="增加${TERR[k]}" ${a.nest === 0 ? 'disabled' : ''}>＋</button>`}</div>`;
    render(`${hud()}${scene('', season().visible.river.at(-1) * 0.6)}
      <h2>10 份食物，放哪？</h2>
      <div class="card">${row('river', '水边，收成看河')}${row('mountain', '高处，较稳')}${row('nest', '留着不动，不赚不亏')}</div>
      <button class="primary" data-testid="confirm-alloc">就这么定</button>`);
    on('[data-inc]', (el) => { a[el.dataset.inc]++; a.nest--; allocStage(); });
    on('[data-dec]', (el) => { a[el.dataset.dec]--; a.nest++; allocStage(); });
    on('[data-testid=confirm-alloc]', eventStage);
  }

  // —— 突发 ——
  function eventStage() {
    const se = season();
    s.allocBefore = { ...s.alloc };
    const t = se.event.target;
    const canAct = s.alloc[t] > 0;
    render(`${hud()}${scene('', se.visible.river.at(-1) * 0.6)}
      <h2>斥候回来了</h2><div class="card"><p>${se.event.text}</p></div>
      ${canAct ? `<p class="muted">你在${TERR[t]}放了 ${s.alloc[t]} 份。</p>
        <button class="choice" data-act="retreat" data-testid="act-retreat">全部撤回巢穴</button>
        <button class="choice" data-act="hold" data-testid="act-hold">不动，坚持</button>
        <button class="choice" data-act="double" data-testid="act-double" ${s.alloc.nest === 0 ? 'disabled' : ''}>再加 2 份</button>`
      : `<p class="muted">你没在${TERR[t]}放食物，这事暂时与你无关。</p>
        <button class="primary" data-act="none" data-testid="act-none">继续</button>`}`);
    on('[data-act]', (el) => {
      const act = el.dataset.act;
      if (act === 'retreat') { s.alloc.nest += s.alloc[t]; s.alloc[t] = 0; }
      if (act === 'double') { const n = Math.min(2, s.alloc.nest); s.alloc[t] += n; s.alloc.nest -= n; }
      s.lastAct = act === 'none' ? null : act;
      settle();
    });
  }

  // —— 结算：先动画，后数字 ——
  function settle() {
    const se = season();
    const delta = Math.round((s.alloc.river * se.outcome.river + s.alloc.mountain * se.outcome.mountain) * 10);
    s.records.push({ scouts: [...s.scouts], alloc: s.allocBefore, finalAlloc: { ...s.alloc }, eventAction: s.lastAct });
    const before = s.pop;
    s.pop = Math.max(10, s.pop + delta);
    seasonTraits();
    const grown = s.traits.filter((t) => s.newTraits.includes(t.id));
    const weather = se.outcome.weather;
    const stayed = s.allocBefore.nest >= P.NEST_WATCH;
    render(`<div class="hud"><span>第 ${s.i + 1} / 3 季 · 结算</span><span class="pop" data-testid="population">族群 ${before}</span></div>
      ${scene(weather, weather === 'storm' ? 110 : 60)}
      <h2 id="settle-title">……</h2><div id="settle-rest"></div>`);
    const newTraitHtml = grown.length ? grown.map((g) => `<div class="card" data-testid="grown"><strong>它长出了${g.label}！</strong><p class="muted">${g.why}</p></div>`).join('')
      : `<p class="muted">${stayed ? '它缩在巢里，这一季没有变化。' : '它这一季没长出新东西。'}</p>`;
    setTimeout(() => {
      app.querySelector('#settle-title').textContent = se.outcome.text;
      app.querySelector('[data-testid=population]').textContent = `族群 ${s.pop}`;
      app.querySelector('#settle-rest').innerHTML = `<p>族群 ${delta >= 0 ? '+' : ''}${s.pop - before}</p>${newTraitHtml}
        <button class="primary" data-testid="next-season">${s.i === 2 ? '看看它变成了什么' : '下一季'}</button>`;
      on('[data-testid=next-season]', nextSeason);
    }, 1400);
  }

  function seasonTraits() {
    const r = s.records.at(-1); const n = s.i + 1;
    const se = season();
    const bet = P.bestBet(r.finalAlloc);
    if (r.scouts.length >= 2) grow('eyes', '一双大眼', `第 ${n} 季，你派斥候看了 ${r.scouts.length} 条线索。`);
    else if (n === 2 && r.scouts.some((id) => se.clues[id].signal < 0)) grow('ears', '一对长耳', '第 2 季，你留意到了不祥的线索。');
    if (r.eventAction === 'retreat') grow('tail', '灵活的尾巴', `第 ${n} 季，听到消息后你及时撤了回来。`);
    if (bet && r.finalAlloc[bet] >= P.HEAVY && se.outcome[bet] > 0) grow('whisker', '敏锐的胡须', `第 ${n} 季，你重押${TERR[bet]}并且方向对了。`);
    if (bet && r.finalAlloc[bet] >= P.HEAVY && se.outcome[bet] < 0) grow('fur', '一身伤疤皮毛', `第 ${n} 季，你重押${TERR[bet]}扛过了风暴。`);
  }

  function nextSeason() {
    if (s.i === 2) return finale();
    s.i++;
    s.scouts = []; s.stamina = 3; s.alloc = { river: 0, mountain: 0, nest: 10 };
    if (s.i === 2 && P.shouldTriggerNight(s.records)) return nightTalk();
    scoutStage();
  }

  // —— 巢穴夜谈：区分“等证据”和“看不懂” ——
  function nightTalk() {
    render(`<h2>巢穴夜谈</h2>${scene('night', 24)}
      <div class="card"><p>老猴蹲到你身边：“两季了，你都守在巢里。你在等什么？”</p></div>
      <button class="choice" data-a="rise" data-testid="night-rise">等水位连涨两季再动</button>
      <button class="choice" data-a="herd" data-testid="night-herd">等兽群回来再动</button>
      <button class="choice" data-a="vague" data-testid="night-vague">说不上来，我其实看不太懂</button>`);
    on('[data-a]', (el) => { s.nightAnswer = el.dataset.a; nightPick(); });
  }
  function nightPick() {
    render(`<h2>老猴递来望远镜</h2>
      <div class="card"><p>“那你指给我看，这段日子水位最低的是哪天？”</p>
      ${bars(D.nightChart.values, { tap: true })}</div>`);
    on('[data-bar]', (el) => {
      if (s.night) return; // 只认第一次点击，否则连点能把指错改成指对
      const pickedLowest = Number(el.dataset.bar) === D.nightChart.lowest;
      s.night = { answer: s.nightAnswer, pickedLowest };
      if (s.nightAnswer === 'vague') grow('antenna', '一对好奇的触角', '巢穴夜谈，你老实说了看不懂。这是学习的开始。');
      else if (pickedLowest) grow('brain', '一道记事的金纹', '巢穴夜谈，你说得出在等什么，也指对了图。');
      el.classList.add(pickedLowest ? 'right' : 'wrong');
      setTimeout(scoutStage, 500);
    });
  }

  const profile = () => P.computeProfile(s.records, D.seasons, s.night, s.taskDone);

  // —— 揭晓 ——
  function finale() {
    const series = D.seasons.flatMap((se) => [...se.visible.river, ...se.outcome.series]);
    const max = Math.max(...series);
    const step = 320 / (series.length - 1);
    const pts = series.map((v, i) => `${(i * step).toFixed(1)},${(125 - (v / max) * 115).toFixed(1)}`).join(' ');
    const stormX = (D.seasons[0].visible.river.length + D.seasons[0].outcome.series.length + D.seasons[1].visible.river.length) * step;
    const r2 = s.records[1].finalAlloc;
    const line = r2.river === 0 ? '你躲过的那场风暴' : '你撞上的那场风暴';
    render(`<h2 data-testid="reveal">丛林褪去了</h2>
      <p>刚才的河水，其实是一段行情。</p>
      <div class="card"><svg class="chart" viewBox="0 0 320 130" role="img" aria-label="三季示例走势">
        <rect x="${stormX}" y="0" width="${step * 4}" height="130" fill="#e8694f33"/>
        <polyline points="${pts}" fill="none" stroke="#5bb3d9" stroke-width="3"/></svg>
      <p>${line}，是这段<strong>示例行情</strong>里的大跌（红色区域）。兽群离开，对应成交量下降；黑云，对应波动放大。</p>
      <p class="muted">这是一段示例行情，不对应真实市场事件。这次对错也可能只是运气，不代表能力。</p></div>
      <button class="primary" data-testid="to-card">看看我的物种</button>`);
    on('[data-testid=to-card]', card);
  }

  // —— 人物卡、证据链、推荐、JSON ——
  function card() {
    const p = profile();
    const sp = SPECIES[p.species];
    const dims = Object.entries(p.dimensions).map(([k, d]) => `<div class="dim" data-testid="dim-${k}">
      <strong>${DIMS[k]}</strong>：<span class="level">${LEVEL[d.level]}</span> <span class="muted">把握${LEVEL[d.confidence]}</span>
      <div class="muted">${d.observations.map(esc).join('；')}</div></div>`).join('');
    const open = s.traits.find((t) => t.id === s.openTrait);
    const taskName = { migration_rule: '定迁徙规则', read_chart: '读懂水位图', counter_example: '找反例' }[p.recommendation.task];
    render(`<h2 data-testid="species" data-species="${p.species}">你是一只${sp.name}${p.species_fit === 'low' ? '（把握：低）' : ''}</h2>
      <p>${sp.line}</p>
      ${scene('', 30, sp.color)}
      <div class="card"><strong>进化回放</strong>
        ${s.traits.length ? `<p class="muted">点一个特征，看它是怎么长出来的。</p><div class="traits">${s.traits.map((t) =>
          `<button data-trait="${t.id}" data-testid="trait-${t.id}" class="${s.openTrait === t.id ? 'on' : ''}">${t.label}</button>`).join('')}</div>` : '<p class="muted">这一局它还没长出特征。</p>'}
        ${open ? `<p data-testid="trait-why">${open.why}</p>` : ''}</div>
      <div class="card">${dims}</div>
      <div class="card"><strong>还不确定的</strong><div class="muted">${p.uncertain.map(esc).join('；')}</div></div>
      ${s.taskDone ? `<div class="card" data-testid="task-done"><strong>新地图已完成：${taskName}</strong><p class="muted">画像已按这次行动更新。</p></div>`
      : `<div class="card"><strong>新地图解锁：${taskName}</strong> <span class="muted">（示例资源）</span>
        <p data-testid="reason">${esc(p.recommendation.reason)}</p>
        <button class="primary" data-testid="start-task">进入新地图</button></div>`}
      <details class="card"><summary>结构化结果（JSON）</summary><pre data-testid="json">${esc(JSON.stringify(p, null, 1))}</pre>
        <button data-testid="copy-json">复制</button></details>
      <p class="muted">想继续研究？<a href="https://www.pandaaiquant.com/" target="_blank" rel="noopener">PandaAI 官网</a>（真实入口）。本游戏不提供买卖建议。</p>
      <button class="primary" data-testid="replay">再玩一局</button>`);
    on('[data-trait]', (el) => { s.openTrait = el.dataset.trait; card(); });
    on('[data-testid=start-task]', () => ({ migration_rule: taskRule, read_chart: taskRead, counter_example: taskCounter }[p.recommendation.task]()));
    on('[data-testid=replay]', intro);
    on('[data-testid=copy-json]', (el) => {
      if (navigator.clipboard) navigator.clipboard.writeText(JSON.stringify(p, null, 1)).then(() => { el.textContent = '已复制'; }, () => { el.textContent = '复制失败，请手动选择'; });
    });
  }
  function finishTask(label, why) {
    s.taskDone = true;
    grow('feet', label, why);
    card();
  }

  function taskRule() {
    render(`<h2>新地图：定迁徙规则</h2><p>丛林里有 8 段示例历史。选一条规则，回放看看它灵不灵。</p>
      ${D.rules.map((r) => `<button class="choice" data-r="${r.id}" data-testid="rule-${r.id}">${r.label}</button>`).join('')}<div id="res"></div>`);
    on('[data-r]', (el) => {
      const rule = D.rules.find((r) => r.id === el.dataset.r);
      const taken = D.history.filter(rule.test);
      const hit = taken.filter((h) => h.next > 0).length;
      app.querySelector('#res').innerHTML = `<div class="card" data-testid="rule-result"><p>这条规则让你迁徙 ${taken.length} 次，命中 ${hit} 次，失效 ${taken.length - hit} 次。</p>
        <p class="muted">样本只有 8 段示例，结果只说明“该怎么验证”，不说明规则真的有效。</p></div>
        <button class="primary" data-testid="task-finish">记下这次结果</button>`;
      on('[data-testid=task-finish]', () => finishTask('探路的脚', '新地图里，你用历史检验了一条自己的规则。'));
    });
  }

  function taskRead(step = 0) {
    const R = D.readChart; const st = R.steps[step];
    render(`<h2>新地图：读懂水位图</h2><p class="muted">第 ${step + 1} / 3 步（示例图）</p>
      <div class="card"><p data-testid="read-ask">${st.ask}</p>${bars(R.river, { tap: step < 2 })}${bars(R.volume, { cls: 'vol', tap: step === 2 })}
      <p class="muted" id="hint"></p></div>`);
    on('[data-bar]', (el) => {
      if (Number(el.dataset.bar) === st.target) {
        el.classList.add('right');
        setTimeout(() => (step === 2 ? finishTask('探路的脚', '新地图里，你学会了在图上找高点、大跌和放量。') : taskRead(step + 1)), 350);
      } else { el.classList.add('wrong'); app.querySelector('#hint').textContent = st.hint; }
    });
  }

  function taskCounter() {
    const picked = new Set();
    const draw = () => {
      render(`<h2>新地图：找反例</h2><p>这 5 段示例历史都出现过“水位上涨、风云平静”。翻开它们，找出信号失效的 2 段。</p>
        ${D.counterCases.map((c) => `<button class="choice ${picked.has(c.id) ? 'seen' : ''}" data-c="${c.id}" data-testid="case-${c.id}">${c.text}${picked.has(c.id) ? `：${c.result}` : '（点开）'}</button>`).join('')}
        ${D.counterCases.filter((c) => c.fail).every((c) => picked.has(c.id))
          ? '<button class="primary" data-testid="task-finish">找到了</button>' : ''}`);
      on('[data-c]', (el) => { picked.add(el.dataset.c); draw(); });
      on('[data-testid=task-finish]', () => finishTask('探路的脚', '新地图里，你亲手找到了信号失效的例子。'));
    };
    draw();
  }

  intro();
})();
