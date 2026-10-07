// 天体計算の共通部品。診断ページ（ブラウザ）と、将来のレポート生成（Node.js）の両方で使う。
// 天体の位置は astronomy-engine で計算する。AIには推測させない。
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("astronomy-engine"));
  } else {
    root.MayaAstro = factory(root.Astronomy);
  }
})(typeof self !== "undefined" ? self : this, function (Astronomy) {
  const SIGN_IDS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
  const BODIES = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars" };

  // 黄経（その日の黄道座標）
  function longitude(bodyKey, date) {
    const body = Astronomy.Body[BODIES[bodyKey]];
    const vec = Astronomy.GeoVector(body, date, true);
    return Astronomy.Ecliptic(vec).elon;
  }

  function signIndexAt(bodyKey, date) {
    return Math.floor(longitude(bodyKey, date) / 30) % 12;
  }

  // 出生時刻が分からないときは、日本時間のその日の 0:00・12:00・23:59 で調べる。
  // 0:00 と 23:59 で星座がちがえば、境目の日として other に入れる（断定しない）。
  function signOfDay(bodyKey, y, m, d, tzOffsetHours) {
    const tz = tzOffsetHours === undefined ? 9 : tzOffsetHours;
    const at = (h, min) => new Date(Date.UTC(y, m - 1, d, h - tz, min));
    const main = signIndexAt(bodyKey, at(12, 0));
    const a = signIndexAt(bodyKey, at(0, 0));
    const b = signIndexAt(bodyKey, at(23, 59));
    const other = a !== main ? a : (b !== main ? b : null);
    return { index: main, id: SIGN_IDS[main], other: other, otherId: other === null ? null : SIGN_IDS[other] };
  }

  // 出生時刻が分かるときは、その時刻で1つに決める。
  function signAtTime(bodyKey, y, m, d, hh, mm, tzOffsetHours) {
    const tz = tzOffsetHours === undefined ? 9 : tzOffsetHours;
    const idx = signIndexAt(bodyKey, new Date(Date.UTC(y, m - 1, d, hh - tz, mm)));
    return { index: idx, id: SIGN_IDS[idx], other: null, otherId: null };
  }

  // 構造化された天体データを返す（レポート生成でAIに渡す形）
  function chart(birth) {
    const keys = birth.bodies || ["sun", "venus", "mars"];
    const out = { birth: birth, bodies: {} };
    keys.forEach(k => {
      out.bodies[k] = birth.hour === undefined
        ? signOfDay(k, birth.y, birth.m, birth.d, birth.tz)
        : signAtTime(k, birth.y, birth.m, birth.d, birth.hour, birth.minute || 0, birth.tz);
    });
    return out;
  }

  return { SIGN_IDS, longitude, signOfDay, signAtTime, chart };
});
