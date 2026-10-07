// 金星×火星の組み合わせロジック。144通りの文章を固定で持たず、
// 12星座の基本データ（data/signs.json）と組み合わせのルール（data/rules.json）から結果を組み立てる。
// 考えること：星座固有の性質／エレメント／モダリティ／金星としての恋愛傾向／火星としての惹かれ方／一致する部分／葛藤する部分
//
// ブランドの最上位ルール（Notion「マヤ｜金星×火星の恋占い MVP計画」）に従う：
// ・事実・傾向 → 意味 → 別の見方 → できること の順に書く
// ・あの人の今の気持ち・過去・未来は書かない（星から確認できないことを希望の側に補わない）
// ・悪い方に決めつけない。最後は希望と小さな行動で終える
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MayaCombine = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  function fill(text, vars) {
    return text.replace(/\{(\w+)\}/g, (_, k) => vars[k]);
  }

  function relation(a, b) {
    const diff = Math.abs(a - b);
    if (diff === 0) return "sameSign";
    if (diff === 6) return "opposite";
    return null;
  }

  // ---- あなたの金星×火星 ----
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

    // いちばんの強さ：エレメントが噛み合えばそれを、噛み合わなければ進み方（モダリティ）の一致を使う
    const match = kind === "tension" ? mo.match : el.match;

    // 迷いやすいところ：エレメントがぶつかればそれを、同じ星座なら偏りを、それ以外は進み方のズレを使う
    let clash, reframe;
    if (kind === "tension") { clash = el.clash; reframe = rules.reframe.element; }
    else if (special === "sameSign") { clash = rules.special.same.clash; reframe = rules.reframe.sameSign; }
    else { clash = mo.clash; reframe = rules.reframe.modality; }

    const harmony = kind !== "tension" && special !== "opposite";
    const lead = "心が求めているのは、" + v.venus.wants + "。" +
      (harmony ? rules.lead.harmony : rules.lead.tension) + m.mars.drawn + "。";

    const tendency = "好きになると、" + v.venus.habit + "。" +
      "惹かれた瞬間には、" + m.mars.action + "。";

    // 有料レポートの材料（画面には出さない）
    const caution = "気をつけたいのは、" + v.venus.pitfall + "と、" + m.mars.pitfall + "が重なったとき。";

    // 同じ言葉ばかりにならないよう、組み合わせごとに言い回しを変える
    const voices = rules.voice[special || kind];
    const voice = voices[(vIndex * 5 + mIndex * 7) % voices.length];

    return {
      venus: { id: v.id, name: v.name },
      mars: { id: m.id, name: m.name },
      typeName: v.venus.phrase + "、" + m.mars.noun,
      summary, lead, tendency, match, clash, reframe,
      remember: v.venus.remember,
      tip: v.venus.tip,
      voice, caution,
      _logic: { element: elKey, modality: moKey, kind, special }
    };
  }

  // ---- あの人が、なぜか惹かれてしまう人 ----
  // hisMars: あの人の火星（0〜11）/ her: { sun, venus, mars }（0〜11）
  function person(signs, rules, hisMars, her) {
    const h = signs[hisMars];
    const ve = signs[her.venus];
    const word = rules.elementWord[h.element];
    const P = rules.person;

    const words = { sign: ve.name, word, herWord: rules.elementWord[ve.element], hisWord: word };
    const rel = relation(her.venus, hisMars);
    const venusKind = rules.elementKind[ve.element + "_" + h.element];

    // 重なり方の強さ：あなたの金星と、あの人の火星の関係で決める
    let level, overlap = [], difference = [];
    if (rel === "sameSign") { level = "strong"; overlap.push(fill(P.overlap.sameSign, words)); }
    else if (venusKind === "same") { level = "strong"; overlap.push(fill(P.overlap.sameElement, words)); }
    else if (rel === "opposite") { level = "opposite"; overlap.push(P.overlap.opposite); difference.push(P.difference.opposite); }
    else if (venusKind === "support") { level = "support"; overlap.push(fill(P.overlap.support, words)); difference.push(fill(P.difference.support, words)); }
    else { level = "weak"; difference.push(fill(P.difference.weak, words)); }

    // 金星以外（太陽・火星）に同じ性質があれば、重なるところとして足す（根拠があるものだけ）
    if (level !== "strong") {
      for (const part of ["sun", "mars"]) {
        if (her[part] === undefined) continue;
        if (signs[her[part]].element === h.element) {
          overlap.push(fill(P.overlap.part, { part: P.parts[part], word }));
          break;
        }
      }
    }

    // 恋の進め方のテンポ（あなたの金星とあの人の火星のモダリティ）
    if (rel === "sameSign") difference.push(P.difference.paceSameSign);
    else if (rel === "opposite") { /* 正反対は「求めるもの」の違いとして書くので、テンポには触れない */ }
    else if (ve.modality === h.modality) overlap.push(P.difference.paceSame);
    else difference.push(fill(P.difference.paceDiff, { herPace: rules.pace[ve.modality], hisPace: rules.pace[h.modality] }));

    return {
      mars: { id: h.id, name: h.name },
      drawn: h.mars.drawn,
      traits: h.mars.traits,
      overlap: overlap.join(""),
      difference: difference.join(""),
      view: P.view[level],
      level
    };
  }

  // ---- ふたりが惹かれ合う理由 ----
  function pair(signs, rules, herVenus, hisMars) {
    const ve = signs[herVenus];
    const h = signs[hisMars];
    const rel = relation(herVenus, hisMars);
    const kind = rel || rules.elementKind[ve.element + "_" + h.element];
    const P = rules.pair[kind];
    const words = { herWord: rules.elementWord[ve.element], hisWord: rules.elementWord[h.element] };

    return {
      kind,
      relation: P.relation,
      why: fill(P.why, words),
      potential: P.potential,
      // 星から読める傾向として書く。あの人の実際の行動・今の気持ち・過去には変換しない
      gap: fill(rules.pair.gap, { feel: ve.venus.feel, sign: h.name, tendency: h.mars.tendency }) + P.gapTail,
      reassure: P.reassure,
      action: h.mars.approach
    };
  }

  return { combine, person, pair };
});
