// 画像引擎：纯函数。入参只有玩家行为和行情数据，不接收族群数量，收益因此无法影响画像。
(function (root) {
  const HEAVY = 6;
  const NEST_WATCH = 7;

  function bestBet(alloc) {
    if (!alloc.river && !alloc.mountain) return null;
    return alloc.river >= alloc.mountain ? 'river' : 'mountain';
  }

  function shouldTriggerNight(records) {
    return records.slice(0, 2).filter((r) => r.alloc.nest >= NEST_WATCH).length >= 2;
  }

  function nightVerdict(night) {
    if (!night) return null;
    if (night.answer === 'vague') return 'does_not_understand';
    return night.pickedLowest ? 'waiting_for_evidence' : 'undetermined';
  }

  function evidence(records, seasons) {
    const total = records.reduce((n, r) => n + r.scouts.length, 0);
    const kinds = new Set(records.flatMap((r) => r.scouts)).size;
    const obs = [`3 季共侦察 ${total} 次，用过 ${kinds} 种线索`];
    const s2 = records[1];
    let contrary = false;
    if (s2) {
      const signs = s2.scouts.map((id) => seasons[1].clues[id].signal);
      const riverBet = s2.alloc.river > 0;
      contrary = (signs.includes(1) && signs.includes(-1)) || (riverBet && signs.includes(-1));
      if (contrary) obs.push('第 2 季看到了与表面相反的线索（兽群或风云）');
    }
    const level = total >= 6 ? 'high' : total >= 3 ? 'medium' : 'low';
    return { level, confidence: 'low', observations: obs, contrary };
  }

  function calibration(records, seasons) {
    let matched = 0, unmatched = 0;
    const obs = [];
    records.forEach((r, i) => {
      const bet = bestBet(r.finalAlloc || r.alloc);
      if (!bet) return;
      const units = (r.finalAlloc || r.alloc)[bet];
      const right = seasons[i].outcome[bet] > 0;
      if (units >= HEAVY && right) { matched++; obs.push(`第 ${i + 1} 季重押且方向对`); }
      else if (units >= HEAVY) { unmatched++; obs.push(`第 ${i + 1} 季重押但方向错`); }
      else if (!right) { matched++; obs.push(`第 ${i + 1} 季轻押，方向也错，投入与把握相称`); }
    });
    if (!matched && !unmatched) {
      return { level: 'unknown', confidence: 'low', observations: ['几乎没有下注，无法判断校准'], matched, unmatched };
    }
    const rate = matched / (matched + unmatched);
    return {
      level: rate >= 0.75 ? 'high' : rate >= 0.5 ? 'medium' : 'low',
      confidence: matched + unmatched >= 3 ? 'medium' : 'low',
      observations: obs, matched, unmatched
    };
  }

  function updating(records) {
    const a = records[1] && records[1].eventAction;
    if (a === 'retreat') return { level: 'high', confidence: 'low', observations: ['第 2 季听到坏消息后撤回了河谷的食物'], action: a };
    if (a === 'hold') return { level: 'medium', confidence: 'low', observations: ['第 2 季听到坏消息后没有调整'], action: a };
    if (a === 'double') return { level: 'low', confidence: 'low', observations: ['第 2 季听到坏消息后反而加码'], action: a };
    return { level: 'unknown', confidence: 'low', observations: ['第 2 季没有押河谷，反向消息未被检验'], action: null };
  }

  function chooseSpecies(ev, cal, up, watch, nestSeasons) {
    if (watch === 'waiting_for_evidence') return { species: 'elephant', fit: 'medium' };
    if (watch === 'does_not_understand') return { species: 'squirrel', fit: 'medium' };
    if (watch === 'undetermined') return { species: 'elephant', fit: 'low' };
    if (cal.matched >= 2 && cal.unmatched === 0) return { species: 'cheetah', fit: 'medium' };
    if (ev.level === 'high' && up.level === 'high') return { species: 'fox', fit: 'medium' };
    if (nestSeasons >= 2) return { species: 'elephant', fit: 'low' };
    return ev.level === 'low' ? { species: 'cheetah', fit: 'low' } : { species: 'fox', fit: 'low' };
  }

  function chooseTask(cal, up, watch) {
    if (watch === 'does_not_understand' || watch === 'undetermined') {
      return { task: 'read_chart', reason: watch === 'undetermined'
        ? '你说得出在等什么，但指图时指错了。先确认读图没问题，再判断你是否真的在等证据。'
        : '你多次选择留守，夜谈里也说看不懂。先学会读图，留守才是你自己的选择。' };
    }
    if (watch === 'waiting_for_evidence') {
      return { task: 'migration_rule', reason: '你说得出自己在等什么，也读得懂图。下一步是验证：这个条件在历史上真的灵吗？' };
    }
    if (cal.unmatched > 0 || up.action === 'double') {
      return { task: 'counter_example', reason: up.action === 'double'
        ? '你在坏消息面前选择了加码。去找找：这种信心在什么时候会失效？'
        : '你曾重押但方向错了。去找找让这个信号失效的例子。' };
    }
    return { task: 'migration_rule', reason: '你已经有自己的判断。下一步，把它写成规则，用历史检验一次。' };
  }

  function computeProfile(records, seasons, night, taskDone) {
    const ev = evidence(records, seasons);
    const cal = calibration(records, seasons);
    const up = updating(records);
    const watch = nightVerdict(night);
    const nestSeasons = records.filter((r) => r.alloc.nest >= NEST_WATCH).length;
    const { species, fit } = chooseSpecies(ev, cal, up, watch, nestSeasons);
    const rec = chooseTask(cal, up, watch);

    const uncertain = [];
    if (cal.level === 'unknown') uncertain.push('校准：下注太少，无法判断');
    if (up.level === 'unknown') uncertain.push('更新：没遇到针对你下注的反向证据');
    if (watch === 'undetermined') uncertain.push('留守原因：说法和读图表现不一致，暂不下结论');
    uncertain.push('整局只有 3 季，以上都是线索，不是定论');

    const dims = { evidence: ev, calibration: cal, updating: up };
    if (taskDone) {
      const note = { migration_rule: '用历史检验了一条自己的规则', read_chart: '完成了读图练习', counter_example: '亲手找到了信号失效的例子' }[rec.task];
      ev.observations.push(`任务：${note}`);
      if (ev.level === 'low') ev.level = 'medium';
      else if (ev.level === 'medium') ev.level = 'high';
    }
    return {
      version: 'demo-1',
      data_source: 'sample',
      species, species_fit: fit,
      dimensions: {
        evidence: { level: dims.evidence.level, confidence: 'low', observations: dims.evidence.observations },
        calibration: { level: cal.level, confidence: cal.confidence, observations: cal.observations },
        updating: { level: up.level, confidence: 'low', observations: up.observations }
      },
      watch_reason: watch,
      uncertain,
      recommendation: { task: rec.task, type: 'sample', reason: rec.reason },
      next_step: { status: taskDone ? 'completed' : 'pending' }
    };
  }

  const api = { computeProfile, shouldTriggerNight, nightVerdict, bestBet, HEAVY, NEST_WATCH };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JungleProfile = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
