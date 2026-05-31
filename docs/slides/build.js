const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");

// ---------- palette ----------
const BG_DARK = "0F2433";
const PANEL_D = "183A52";
const LIGHT = "F4F6F8";
const CARD = "FFFFFF";
const WHITE = "FFFFFF";
const TEAL = "0E7C86";
const TEAL_D = "0A565E";
const R = "E0524F"; // child  (red)
const G = "3FA35D"; // father (green)
const B = "4C8FBF"; // mother (blue)
const INK = "1B2A33";
const MUTED = "4E606A";
const IMG_AR = 2.13; // sample image width/height after crop
const AMBER = "C77F12";
const CODEBG = "12303F";

// ---------- fonts ----------
const HEAD = "Noto Serif CJK JP";
const BODY = "Noto Sans CJK JP";
const MONO = "Noto Sans Mono CJK JP";

const ASSET = __dirname + "/assets";
const makeShadow = () => ({ type: "outer", color: "0B1B26", blur: 8, offset: 3, angle: 135, opacity: 0.22 });

// ---------- icons ----------
function renderIconSvg(Icon, color, size) {
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Icon, { color, size: String(size) }));
}
async function icon(Icon, color, size = 256) {
  const svg = renderIconSvg(Icon, color, size);
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

(async () => {
  const I = {
    dna: await icon(fa.FaDna, "#" + WHITE),
    trio: await icon(fa.FaUserFriends, "#" + TEAL),
    filter: await icon(fa.FaFilter, "#" + WHITE),
    image: await icon(fa.FaImage, "#" + WHITE),
    brain: await icon(fa.FaBrain, "#" + WHITE),
    chart: await icon(fa.FaChartBar, "#" + WHITE),
    file: await icon(fa.FaFileAlt, "#" + WHITE),
    server: await icon(fa.FaServer, "#" + WHITE),
    warn: await icon(fa.FaExclamationTriangle, "#" + AMBER),
    check: await icon(fa.FaCheckCircle, "#" + TEAL),
    checkW: await icon(fa.FaCheckCircle, "#7FE3C0"),
    cube: await icon(fa.FaCube, "#" + WHITE),
    code: await icon(fa.FaCode, "#" + WHITE),
  };

  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pres.author = "DeNovoCNN";
  pres.title = "DeNovoCNN — 現在のコードベースでできること";
  const W = 13.33, H = 7.5;

  // ---- helpers ----
  function trioDots(slide, x, y, r, gap, withLabel) {
    const cols = [R, G, B];
    cols.forEach((c, i) => {
      slide.addShape(pres.shapes.OVAL, { x: x + i * (r + gap), y, w: r, h: r, fill: { color: c } });
    });
    if (withLabel) {
      slide.addText(
        [
          { text: "child", options: { color: R, bold: true } },
          { text: "  /  ", options: { color: MUTED } },
          { text: "father", options: { color: G, bold: true } },
          { text: "  /  ", options: { color: MUTED } },
          { text: "mother", options: { color: B, bold: true } },
        ],
        { x: x - 0.5, y: y + r + 0.05, w: 3 * (r + gap) + 1, h: 0.3, fontFace: BODY, fontSize: 10, align: "center" }
      );
    }
  }
  function header(slide, kicker, title) {
    slide.background = { color: LIGHT };
    // top accent: teal bar + RGB motif dots top-right
    slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.12, fill: { color: TEAL } });
    if (kicker) slide.addText(kicker.toUpperCase(), { x: 0.6, y: 0.42, w: 8, h: 0.3, fontFace: BODY, fontSize: 12, color: TEAL, bold: true, charSpacing: 2, margin: 0 });
    slide.addText(title, { x: 0.6, y: 0.66, w: 10.5, h: 0.7, fontFace: HEAD, fontSize: 30, color: INK, bold: true, margin: 0 });
    // motif dots
    [R, G, B].forEach((c, i) => slide.addShape(pres.shapes.OVAL, { x: 12.5 + i * 0.26, y: 0.5, w: 0.17, h: 0.17, fill: { color: c } }));
    // footer
    slide.addText("DeNovoCNN  ·  現在のコードベース (local-customizations)", { x: 0.6, y: 7.05, w: 8, h: 0.3, fontFace: BODY, fontSize: 9, color: MUTED, margin: 0 });
  }
  function iconBadge(slide, x, y, d, fill, iconData) {
    slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, shadow: makeShadow() });
    const p = d * 0.26;
    slide.addImage({ data: iconData, x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p });
  }
  function card(slide, x, y, w, h) {
    slide.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: CARD }, line: { color: "E2E8EC", width: 1 }, shadow: makeShadow() });
  }

  // ============ Slide 1: Title ============
  let s = pres.addSlide();
  s.background = { color: BG_DARK };
  // subtle side panel
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.16, fill: { color: TEAL } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: H - 0.16, w: W, h: 0.16, fill: { color: TEAL } });
  // big trio dots
  const r0 = 0.62, g0 = 0.35, bx = (W - (3 * r0 + 2 * g0)) / 2;
  [R, G, B].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: bx + i * (r0 + g0), y: 1.35, w: r0, h: r0, fill: { color: c }, shadow: makeShadow() }));
  s.addText(
    [
      { text: "child", options: { color: R, bold: true } },
      { text: "      father", options: { color: G, bold: true } },
      { text: "      mother", options: { color: B, bold: true } },
    ],
    { x: 0, y: 2.05, w: W, h: 0.35, fontFace: BODY, fontSize: 13, align: "center" }
  );
  s.addText("DeNovoCNN", { x: 0, y: 2.7, w: W, h: 1.0, fontFace: HEAD, fontSize: 54, color: WHITE, bold: true, align: "center", margin: 0 });
  s.addText("現在のコードベースでできること", { x: 0, y: 3.75, w: W, h: 0.6, fontFace: BODY, fontSize: 22, color: "CFE3E6", align: "center", margin: 0 });
  s.addText("トリオ NGS データからの de novo 変異検出 — 機能と現状(作業途中)の整理", { x: 0, y: 4.45, w: W, h: 0.4, fontFace: BODY, fontSize: 13, color: "9DB2B8", align: "center", margin: 0 });
  s.addText("2026-05-30", { x: 0, y: 6.7, w: W, h: 0.3, fontFace: BODY, fontSize: 11, color: "7E949B", align: "center", margin: 0 });

  // ============ Slide 2: What it is ============
  s = pres.addSlide();
  header(s, "Overview", "DeNovoCNN とは");
  s.addText(
    [
      { text: "子・父・母トリオの BAM/CRAM + VCF から de novo 変異 (DNM) を検出", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "変異周辺のパイルアップ領域を 160×164 の RGB 画像に変換", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "child = R / father = G / mother = B の3チャンネル合成", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "置換・挿入・欠失それぞれ独立した3つの CNN モデルで分類", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "IGV 目視確認を自動化する偽陽性フィルタ", options: { bullet: true } },
    ],
    { x: 0.6, y: 1.85, w: 7.0, h: 4.2, fontFace: BODY, fontSize: 15, color: INK, lineSpacingMultiple: 1.05 }
  );
  // right: sample image framed
  const iw = 4.3, ih = iw / IMG_AR, ix = 8.3, iy = 2.55;
  s.addShape(pres.shapes.RECTANGLE, { x: ix - 0.12, y: iy - 0.12, w: iw + 0.24, h: ih + 0.24, fill: { color: WHITE }, line: { color: "D9E1E6", width: 1 }, shadow: makeShadow() });
  s.addImage({ path: ASSET + "/sample_snp.png", x: ix, y: iy, w: iw, h: ih });
  s.addText("トリオ RGB 画像の例 (160×164)", { x: ix - 0.12, y: iy + ih + 0.16, w: iw + 0.24, h: 0.3, fontFace: BODY, fontSize: 11, color: MUTED, align: "center", margin: 0 });
  s.addText("各列=1塩基を A/C/T/G の4画素に one-hot 符号化", { x: ix - 0.4, y: iy + ih + 0.46, w: iw + 0.8, h: 0.3, fontFace: BODY, fontSize: 10, italic: true, color: MUTED, align: "center", margin: 0 });

  // ============ Slide 3: Pipeline ============
  s = pres.addSlide();
  header(s, "Pipeline", "処理パイプライン");
  const steps = [
    { ic: I.file, t: "入力", d: "VCF +\nBAM/CRAM ×3" },
    { ic: I.filter, t: "候補抽出", d: "bcftools\nisec -C" },
    { ic: I.image, t: "画像生成", d: "トリオ RGB\nパイルアップ" },
    { ic: I.brain, t: "CNN 分類", d: "snp / ins / del\n3モデル" },
    { ic: I.chart, t: "DNM 確率", d: "閾値 ≥ 0.5\nで de novo" },
  ];
  const n = steps.length, cw = 2.15, cgap = 0.42, cstart = (W - (n * cw + (n - 1) * cgap)) / 2, cy = 2.35, ch = 2.7;
  steps.forEach((st, i) => {
    const x = cstart + i * (cw + cgap);
    card(s, x, cy, cw, ch);
    s.addShape(pres.shapes.RECTANGLE, { x, y: cy, w: cw, h: 0.1, fill: { color: TEAL } });
    iconBadge(s, x + cw / 2 - 0.45, cy + 0.32, 0.9, TEAL, st.ic);
    s.addText(String(i + 1), { x: x + 0.12, y: cy + 0.18, w: 0.5, h: 0.4, fontFace: HEAD, fontSize: 20, bold: true, color: "C7D6DA", margin: 0 });
    s.addText(st.t, { x, y: cy + 1.32, w: cw, h: 0.35, fontFace: BODY, fontSize: 15, bold: true, color: INK, align: "center", margin: 0 });
    s.addText(st.d, { x: x + 0.1, y: cy + 1.72, w: cw - 0.2, h: 0.85, fontFace: MONO, fontSize: 10.5, color: MUTED, align: "center", margin: 0 });
    if (i < n - 1) s.addText("→", { x: x + cw + 0.02, y: cy + ch / 2 - 0.3, w: cgap - 0.04, h: 0.6, fontFace: BODY, fontSize: 22, color: TEAL, bold: true, align: "center", valign: "middle", margin: 0 });
  });
  s.addText("現在の既定動作は ③ 画像生成で停止（予測フローはコメントアウト中）", { x: 0.6, y: 5.6, w: 12, h: 0.4, fontFace: BODY, fontSize: 13, italic: true, color: AMBER, align: "center" });

  // ============ Slide 4: Capability 1 ============
  s = pres.addSlide();
  header(s, "Capability 01", "de novo 候補の自動抽出");
  iconBadge(s, 0.6, 1.75, 0.8, TEAL, I.filter);
  s.addText(
    [
      { text: "apply_denovocnn.sh が トリオ VCF 3つを前処理", options: { bullet: true, breakLine: true, paraSpaceAfter: 9 } },
      { text: "bcftools sort → bgzip → tabix で索引付け", options: { bullet: true, breakLine: true, paraSpaceAfter: 9 } },
      { text: "isec -C で「子のみに存在し両親に無い」変異を抽出", options: { bullet: true, breakLine: true, paraSpaceAfter: 9 } },
      { text: "= de novo 候補リスト (5列 TSV) を自動生成", options: { bullet: true } },
    ],
    { x: 1.6, y: 1.75, w: 6.0, h: 2.4, fontFace: BODY, fontSize: 14.5, color: INK }
  );
  // code box
  s.addShape(pres.shapes.RECTANGLE, { x: 1.6, y: 4.25, w: 6.0, h: 1.5, fill: { color: CODEBG }, shadow: makeShadow() });
  s.addText(
    [
      { text: "$ bcftools isec -C \\", options: { breakLine: true } },
      { text: "    child.vcf.gz father.vcf.gz mother.vcf.gz \\", options: { breakLine: true } },
      { text: "    > variants_list.txt", options: {} },
    ],
    { x: 1.8, y: 4.42, w: 5.7, h: 1.2, fontFace: MONO, fontSize: 11, color: "BFE7E2" }
  );
  // stat panel
  card(s, 8.2, 1.85, 4.5, 3.9);
  s.addShape(pres.shapes.RECTANGLE, { x: 8.2, y: 1.85, w: 0.12, h: 3.9, fill: { color: TEAL } });
  s.addText("約 10×", { x: 8.4, y: 2.3, w: 4.1, h: 1.0, fontFace: HEAD, fontSize: 48, bold: true, color: TEAL, align: "center", margin: 0 });
  s.addText("評価対象の変異数を削減", { x: 8.4, y: 3.35, w: 4.1, h: 0.4, fontFace: BODY, fontSize: 13, color: INK, align: "center", margin: 0 });
  s.addText(
    [
      { text: "WES:  < 10,000 変異", options: { breakLine: true, paraSpaceAfter: 6 } },
      { text: "WGS:  ~ 100,000 変異", options: {} },
    ],
    { x: 8.4, y: 4.0, w: 4.1, h: 1.0, fontFace: MONO, fontSize: 13, color: MUTED, align: "center" }
  );

  // ============ Slide 5: Capability 2 (images) ============
  s = pres.addSlide();
  header(s, "Capability 02", "パイルアップ画像の生成");
  s.addText(
    [
      { text: "save_images() がトリオ RGB 画像を PNG 出力 ", options: {} },
      { text: "（現在の既定動作）", options: { color: AMBER, bold: true } },
    ],
    { x: 0.6, y: 1.7, w: 12, h: 0.4, fontFace: BODY, fontSize: 15, color: INK, margin: 0 }
  );
  const samples = [
    { f: "sample_snp.png", t: "置換 (SNP)", c: R },
    { f: "sample_del.png", t: "欠失 (Deletion)", c: G },
    { f: "sample_ins.png", t: "挿入 (Insertion)", c: B },
  ];
  const sw = 3.5, sh = sw / IMG_AR, sgap = 0.6, sstart = (W - (3 * sw + 2 * sgap)) / 2, sy = 2.7;
  samples.forEach((sm, i) => {
    const x = sstart + i * (sw + sgap);
    s.addShape(pres.shapes.RECTANGLE, { x: x - 0.1, y: sy - 0.1, w: sw + 0.2, h: sh + 0.2, fill: { color: WHITE }, line: { color: "D9E1E6", width: 1 }, shadow: makeShadow() });
    s.addImage({ path: ASSET + "/" + sm.f, x, y: sy, w: sw, h: sh });
    s.addShape(pres.shapes.OVAL, { x: x + sw / 2 - 0.09, y: sy + sh + 0.18, w: 0.18, h: 0.18, fill: { color: sm.c } });
    s.addText(sm.t, { x: x - 0.2, y: sy + sh + 0.4, w: sw + 0.4, h: 0.35, fontFace: BODY, fontSize: 13, bold: true, color: INK, align: "center", margin: 0 });
  });
  s.addText(
    [
      { text: "1000 枚 ≈ 4 秒", options: { bold: true, color: TEAL } },
      { text: "  (n_jobs=128, CPU並列)        実際に images/ へ 1,202 枚を生成済み", options: { color: MUTED } },
    ],
    { x: 0.6, y: 6.35, w: 12, h: 0.4, fontFace: BODY, fontSize: 13, align: "center", margin: 0 }
  );

  // ============ Slide 6: Capability 3 (prediction) ============
  s = pres.addSlide();
  header(s, "Capability 03", "DNM 予測（確率判定）");
  iconBadge(s, 0.6, 1.8, 0.8, TEAL, I.brain);
  s.addText(
    [
      { text: "各候補を変異型別モデル (snp / ins / del) で分類", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "DNM 確率を出力し、閾値 ≥ 0.5 で de novo と判定", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "単純な VCF 差分では除けない偽陽性を除去", options: { bullet: true, breakLine: true, paraSpaceAfter: 10 } },
      { text: "child / father / mother の coverage も併せて出力", options: { bullet: true } },
    ],
    { x: 1.6, y: 1.8, w: 6.1, h: 2.6, fontFace: BODY, fontSize: 14.5, color: INK }
  );
  // amber WIP note
  s.addShape(pres.shapes.RECTANGLE, { x: 1.6, y: 4.7, w: 6.1, h: 1.0, fill: { color: "FBF1DD" }, line: { color: AMBER, width: 1 } });
  s.addImage({ data: I.warn, x: 1.78, y: 4.92, w: 0.45, h: 0.45 });
  s.addText("現 dataset.py ではコメントアウト中。元の予測フローは dataset_o.py に保存", { x: 2.4, y: 4.78, w: 5.2, h: 0.85, fontFace: BODY, fontSize: 12, color: "7A5A12", valign: "middle", margin: 0 });
  // perf stats
  card(s, 8.3, 1.95, 4.4, 3.75);
  s.addText("テスト性能", { x: 8.3, y: 2.15, w: 4.4, h: 0.4, fontFace: BODY, fontSize: 13, bold: true, color: MUTED, align: "center", margin: 0 });
  s.addText("96.74%", { x: 8.3, y: 2.6, w: 4.4, h: 0.8, fontFace: HEAD, fontSize: 40, bold: true, color: G, align: "center", margin: 0 });
  s.addText("recall / sensitivity", { x: 8.3, y: 3.38, w: 4.4, h: 0.3, fontFace: BODY, fontSize: 11, color: MUTED, align: "center", margin: 0 });
  s.addText("96.55%", { x: 8.3, y: 3.8, w: 4.4, h: 0.8, fontFace: HEAD, fontSize: 40, bold: true, color: B, align: "center", margin: 0 });
  s.addText("precision", { x: 8.3, y: 4.58, w: 4.4, h: 0.3, fontFace: BODY, fontSize: 11, color: MUTED, align: "center", margin: 0 });
  s.addText("出典: Khazeeva et al., NAR 2022 (gkac511)", { x: 8.3, y: 5.18, w: 4.4, h: 0.3, fontFace: BODY, fontSize: 9.5, italic: true, color: MUTED, align: "center", margin: 0 });

  // ============ Slide 7: Capability 4 ============
  s = pres.addSlide();
  header(s, "Capability 04", "保存画像からの予測 & GPU 推論");
  const c4 = [
    { ic: I.image, t: "保存画像からの予測", lines: ["predict_del.py + process_images.py", "PNG → /255 正規化 → model.predict", "→ .npy 保存 + 予測分布プロット", "deletion モデルのプロトタイプ"] },
    { ic: I.server, t: "GPU 推論 (Docker)", lines: ["tensorflow/build:2.15-python3.11", "TF 2.15 + CUDA 12 で GPU 利用", "1000 枚 ≈ 0.05 分 (CPUの約10倍)", "run_docker.sh で実行"] },
  ];
  const c4w = 5.85, c4gap = 0.6, c4start = (W - (2 * c4w + c4gap)) / 2, c4y = 2.0, c4h = 3.7;
  c4.forEach((cc, i) => {
    const x = c4start + i * (c4w + c4gap);
    card(s, x, c4y, c4w, c4h);
    s.addShape(pres.shapes.RECTANGLE, { x, y: c4y, w: c4w, h: 0.1, fill: { color: i === 0 ? TEAL : B } });
    iconBadge(s, x + 0.4, c4y + 0.42, 0.85, i === 0 ? TEAL : B, cc.ic);
    s.addText(cc.t, { x: x + 1.45, y: c4y + 0.55, w: c4w - 1.6, h: 0.6, fontFace: BODY, fontSize: 17, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(
      cc.lines.map((l, j) => ({ text: l, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })),
      { x: x + 0.45, y: c4y + 1.6, w: c4w - 0.8, h: 1.9, fontFace: BODY, fontSize: 13, color: INK }
    );
  });

  // ============ Slide 8: Inputs & Environment ============
  s = pres.addSlide();
  header(s, "Requirements", "必要な入力と実行環境");
  const reqs = [
    { ic: I.file, t: "入力ファイル", color: TEAL, lines: ["変異リスト TSV（または VCF 3つ）", "BAM/CRAM 3つ + index (.bai / .crai)", "参照ゲノム FASTA + .fai", "CRAM は参照ゲノム必須"] },
    { ic: I.server, t: "実行環境", color: B, lines: ["conda: TF 2.3.1 — CPU 実行", "Docker: TF 2.15 — GPU 実行", "外部ツール: bcftools / bgzip / tabix", "モデル: snp / ins / del (.h5 + SavedModel)"] },
  ];
  const rw = 5.85, rgap = 0.6, rstart = (W - (2 * rw + rgap)) / 2, ry = 2.0, rh = 3.8;
  reqs.forEach((rq, i) => {
    const x = rstart + i * (rw + rgap);
    card(s, x, ry, rw, rh);
    s.addShape(pres.shapes.RECTANGLE, { x, y: ry, w: 0.12, h: rh, fill: { color: rq.color } });
    iconBadge(s, x + 0.4, ry + 0.42, 0.85, rq.color, rq.ic);
    s.addText(rq.t, { x: x + 1.45, y: ry + 0.55, w: rw - 1.6, h: 0.6, fontFace: BODY, fontSize: 18, bold: true, color: INK, valign: "middle", margin: 0 });
    s.addText(
      rq.lines.map((l) => ({ text: l, options: { bullet: true, breakLine: true, paraSpaceAfter: 9 } })),
      { x: x + 0.5, y: ry + 1.65, w: rw - 0.9, h: 2.0, fontFace: BODY, fontSize: 13.5, color: INK }
    );
  });

  // ============ Slide 9: Limitations ============
  s = pres.addSlide();
  header(s, "Current State", "現状の制約（作業途中）");
  const lims = [
    { t: "予測フローがコメントアウト", d: "既定動作は画像生成のみ。完全な予測には dataset_o.py 相当への復帰が必要" },
    { t: "学習コードは未実装", d: "models.py / .fit() なし。学習仕様は docs/TRAINING.md に論文から整理済み" },
    { t: "画像が変異型混在で出力", d: "Target がダミー空文字。再予測時は snp/ins/del へのモデル振り分けが必要" },
  ];
  let ly = 1.9;
  lims.forEach((lm) => {
    card(s, 0.9, ly, 11.5, 1.45);
    s.addShape(pres.shapes.RECTANGLE, { x: 0.9, y: ly, w: 0.12, h: 1.45, fill: { color: AMBER } });
    s.addImage({ data: I.warn, x: 1.25, y: ly + 0.45, w: 0.55, h: 0.55 });
    s.addText(lm.t, { x: 2.1, y: ly + 0.22, w: 10, h: 0.45, fontFace: BODY, fontSize: 17, bold: true, color: INK, margin: 0 });
    s.addText(lm.d, { x: 2.1, y: ly + 0.72, w: 10, h: 0.6, fontFace: BODY, fontSize: 13, color: MUTED, margin: 0 });
    ly += 1.65;
  });

  // ============ Slide 10: Summary ============
  s = pres.addSlide();
  s.background = { color: BG_DARK };
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.16, fill: { color: TEAL } });
  s.addText("まとめ", { x: 0.7, y: 0.7, w: 10, h: 0.8, fontFace: HEAD, fontSize: 34, bold: true, color: WHITE, margin: 0 });
  [R, G, B].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: 12.4 + i * 0.26, y: 0.85, w: 0.17, h: 0.17, fill: { color: c } }));
  const sum = [
    "de novo 候補の自動抽出 (bcftools isec -C)",
    "トリオ RGB パイルアップ画像の生成（既定動作）",
    "DNM 確率の予測（フロー復活で動作・偽陽性フィルタ）",
    "保存画像からの予測プロトタイプ & Docker での GPU 推論",
  ];
  let yy = 1.95;
  sum.forEach((t) => {
    s.addImage({ data: I.checkW, x: 0.9, y: yy, w: 0.42, h: 0.42 });
    s.addText(t, { x: 1.5, y: yy - 0.04, w: 11, h: 0.5, fontFace: BODY, fontSize: 17, color: "EAF2F3", valign: "middle", margin: 0 });
    yy += 0.82;
  });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.9, y: 5.55, w: 11.5, h: 1.1, fill: { color: PANEL_D } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.9, y: 5.55, w: 0.12, h: 1.1, fill: { color: TEAL } });
  s.addText("元の予測フロー復活 + 変異型ごとのモデル振り分けで、完全な DNM 予測パイプラインが動作する", { x: 1.25, y: 5.55, w: 10.9, h: 1.1, fontFace: BODY, fontSize: 15, color: "CFE3E6", italic: true, valign: "middle", margin: 0 });

  await pres.writeFile({ fileName: __dirname + "/DeNovoCNN_capabilities.pptx" });
  console.log("written:", __dirname + "/DeNovoCNN_capabilities.pptx");
})();
