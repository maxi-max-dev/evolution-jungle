// 示例数据：人工编写，不是真实行情，不对应任何真实标的或日期。
// 接入 Panda Data 时只替换本文件。visible = 玩家当时可见；outcome = 结算后才揭晓。
(function (root) {
  const DATA = {
    source: 'sample',
    seasons: [
      {
        id: 1, name: '雨季', mood: '河水慢慢涨起来了',
        visible: { river: [40, 43, 42, 46, 49, 52], volume: [3, 4, 4, 5, 6, 6] },
        clues: {
          water: { label: '上游水位', text: '上游水位连涨，河谷的果子在变多。', signal: 1 },
          herd: { label: '跟踪兽群', text: '兽群正往河谷走，队伍一天比一天长。', signal: 1 },
          wind: { label: '观察风云', text: '云层薄，风很轻。', signal: 1 },
          scope: { label: '望远镜', text: '河谷的水位线一路向上。', signal: 1, chart: true }
        },
        event: { target: 'river', text: '斥候回来了：“河谷里已经挤满了别的族群。”', sign: 1 },
        outcome: { river: 0.3, mountain: 0.02, series: [54, 57, 60, 63], text: '丰收！河谷果实落满一地。', weather: 'harvest' }
      },
      {
        id: 2, name: '闷热季', mood: '水位还高，兽群却少了',
        visible: { river: [63, 66, 68, 67, 69, 68], volume: [6, 5, 4, 3, 3, 2] },
        clues: {
          water: { label: '上游水位', text: '水位还在高处，看上去一切都好。', signal: 1 },
          herd: { label: '跟踪兽群', text: '兽群悄悄离开河谷，脚印越来越少。', signal: -1 },
          wind: { label: '观察风云', text: '远处积起黑云，风向开始乱了。', signal: -1 },
          scope: { label: '望远镜', text: '水位涨不动了，在高处来回晃。', signal: 1, chart: true }
        },
        event: { target: 'river', text: '斥候喘着气跑回来：“上游的堤坝裂了！”', sign: -1 },
        outcome: { river: -0.5, mountain: -0.1, series: [58, 44, 34, 30], text: '风暴！洪水冲垮了河谷。', weather: 'storm' }
      },
      {
        id: 3, name: '回暖季', mood: '河水起伏不定，山上开了花',
        visible: { river: [30, 34, 31, 35, 32, 36], volume: [3, 4, 3, 4, 3, 4] },
        clues: {
          water: { label: '上游水位', text: '水位忽高忽低，说不清方向。', signal: 0 },
          herd: { label: '跟踪兽群', text: '兽群开始往山地聚。', signal: -1 },
          wind: { label: '观察风云', text: '风雨交替，但没有大风暴。', signal: 0 },
          scope: { label: '望远镜', text: '水位在一个区间里反复。', signal: 0, chart: true }
        },
        event: { target: 'mountain', text: '斥候说：“山上果子不少，但有蛇出没。”', sign: 1 },
        outcome: { river: 0.05, mountain: 0.3, series: [34, 37, 35, 38], text: '山地丰收，河谷平平。', weather: 'harvest' }
      }
    ],
    // 夜谈小游戏用图：第 3 根柱最低。
    nightChart: { values: [52, 44, 30, 38, 47, 55], lowest: 2 },
    // 读图任务用图。
    readChart: {
      river: [30, 36, 42, 50, 58, 34, 28, 32],
      volume: [2, 2, 3, 3, 4, 8, 5, 3],
      steps: [
        { ask: '水位涨得最高的是哪一天？点它。', target: 4, hint: '找最高的那根蓝柱。这叫“阶段高点”。' },
        { ask: '大跌发生在哪一天？点跌下去的第一根。', target: 5, hint: '找比前一根矮了一大截的柱子。' },
        { ask: '兽群最多（放量）是哪一天？看下面的小柱。', target: 5, hint: '看下排，哪根最高。放量常和大波动同时出现。' }
      ]
    },
    // 迁徙规则回放：8 段示例历史。up2=水位连涨；herd=兽群到来；next=下一季河谷表现。
    history: [
      { up2: true, herd: true, next: 1 }, { up2: true, herd: false, next: -1 },
      { up2: false, herd: true, next: 1 }, { up2: true, herd: true, next: 1 },
      { up2: false, herd: false, next: -1 }, { up2: true, herd: false, next: 1 },
      { up2: true, herd: true, next: -1 }, { up2: false, herd: true, next: -1 }
    ],
    rules: [
      { id: 'up2', label: '水位连涨两季才进河谷', test: (h) => h.up2 },
      { id: 'herd', label: '看到兽群才进河谷', test: (h) => h.herd },
      { id: 'both', label: '水位和兽群都对才进河谷', test: (h) => h.up2 && h.herd }
    ],
    // 找反例：信号都是“水位上涨 + 风云平静”，其中 2 段失效。
    counterCases: [
      { id: 'a', text: '第一段', result: '之后继续上涨', fail: false },
      { id: 'b', text: '第二段', result: '之后突然大跌', fail: true },
      { id: 'c', text: '第三段', result: '之后小幅上涨', fail: false },
      { id: 'd', text: '第四段', result: '之后持续下滑', fail: true },
      { id: 'e', text: '第五段', result: '之后继续上涨', fail: false }
    ]
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.JUNGLE_DATA = DATA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
