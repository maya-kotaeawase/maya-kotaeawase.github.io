// 金星×火星の組み合わせロジック。144通りの文章を固定で持たず、
// 12星座の基本データ（data/signs.json）と組み合わせのルール（data/rules.json）から結果を組み立てる。
// 考えること：星座固有の性質／エレメント／モダリティ／金星としての恋愛傾向／火星としての惹かれ方／一致する部分／葛藤する部分
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MayaCombine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  function relation(vIndex, mIndex) {
    const diff = Math.abs(vIndex - mIndex);
    if (diff === 0) return "sameSign";
    if (diff === 6) return "opposite";
    return null;
  }

  // signs: signs.json の signs 配列 / rules: rules.json / vIndex, mIndex: 0〜11
  function combine(signs, rules, vIndex, mIndex) {
    const v = signs[vIndex];
    const m = signs[mIndex];
    const elKey = v.element + "_" + m.element;
    const moKey = v.modality + "_" + m.modality;
    const kind = rules.elementKind[elKey];          // same / support / tension
    const el = rules.element[elKey];
    const mo = rules.modality[moKey];
    const special = relation(vIndex, mIndex);        // sameSign / opposite / null

    // 心と惹かれ方の関係（いちばん大きな特徴）
    let summary = el.summary;
    if (special === "sameSign") summary = rules.special.same.summary;
    if (special === "opposite") summary = rules.special.opposite.summary;

    // 一致する部分：エレメントが噛み合えばそれを、噛み合わなければ進み方（モダリティ）の一致を使う
    const match = kind === "tension" ? mo.match : el.match;

    // 葛藤する部分：エレメントがぶつかればそれを、同じ星座なら偏りを、それ以外は進み方のズレを使う
    let clash;
    if (kind === "tension") clash = el.clash;
    else if (special === "sameSign") clash = rules.special.same.clash;
    else clash = mo.clash;

    const harmony = kind !== "tension" && special !== "opposite";
    const lead = "心が求めているのは、" + v.venus.wants + "。" +
      (harmony ? rules.lead.harmony : rules.lead.tension) + m.mars.drawn + "。";

    const tendency = "好きになると、" + v.venus.habit + "。" +
      "惹かれた瞬間には、" + m.mars.action + "。";

    const caution = "気をつけたいのは、" + v.venus.pitfall + "と、" + m.mars.pitfall + "が重なったとき。";

    // 同じ言葉ばかりにならないよう、組み合わせごとに言い回しを変える
    const voices = rules.voice[special || kind];
    const voice = voices[(vIndex * 5 + mIndex * 7) % voices.length];

    return {
      venus: { id: v.id, name: v.name },
      mars: { id: m.id, name: m.name },
      typeName: v.venus.phrase + "、" + m.mars.noun,
      summary, lead, match, clash, tendency, caution, voice,
      // 分析・レポート生成用の内部データ（画面には出さない）
      _logic: { element: elKey, modality: moKey, kind, special }
    };
  }

  return { combine };
});
