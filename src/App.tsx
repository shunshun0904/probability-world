import { useMemo, useState } from "react";
import DiceLab from "./DiceLab";
import PhenomenaLab, { LAB_ORDER, LabHighlights } from "./PhenomenaLab";
import type { LabKind } from "./simulations";

type Dist = "binomial" | "normal" | "poisson" | "uniform";
const distributionInfo: Record<Dist, { name: string; subtitle: string; formula: string; description: string; color: string }> = {
  binomial: { name: "二項分布", subtitle: "BINOMIAL DISTRIBUTION", formula: "X ~ B(n, p)", description: "成功・失敗の2通りの結果を何度も繰り返すとき、成功回数にはどんな法則があるのでしょう。", color: "#5b6fe9" },
  normal: { name: "正規分布", subtitle: "NORMAL DISTRIBUTION", formula: "X ~ N(μ, σ²)", description: "身長や測定誤差など、多くの現象で現れる左右対称の釣り鐘型の分布です。", color: "#13a59a" },
  poisson: { name: "ポアソン分布", subtitle: "POISSON DISTRIBUTION", formula: "X ~ Poisson(λ)", description: "一定時間に何件起きるか。まれな出来事の回数を考えるための分布です。", color: "#e59c48" },
  uniform: { name: "一様分布", subtitle: "UNIFORM DISTRIBUTION", formula: "X ~ U(a, b)", description: "ある区間のどの値も同じ密度で現れる、シンプルで重要な確率分布です。", color: "#b27bd3" }
};
const factorial = (n: number) => { let result = 1; for (let i = 2; i <= n; i++) result *= i; return result; };
const choose = (n: number, k: number) => { let result = 1; for (let i = 1; i <= k; i++) result = result * (n - i + 1) / i; return result; };
function points(type: Dist, n: number, p: number, mu: number, sigma: number, lambda: number) {
  if (type === "binomial") return Array.from({ length: n + 1 }, (_, k) => ({ x: k, y: choose(n, k) * p ** k * (1 - p) ** (n - k) }));
  if (type === "poisson") return Array.from({ length: 23 }, (_, k) => ({ x: k, y: Math.exp(-lambda) * lambda ** k / factorial(k) }));
  if (type === "normal") return Array.from({ length: 121 }, (_, i) => { const x = mu - 4 * sigma + i * (8 * sigma / 120); return { x, y: Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI)) }; });
  return Array.from({ length: 121 }, (_, i) => ({ x: -1 + i / 60, y: i >= 30 && i <= 90 ? 1 : 0 }));
}
function DistributionExplorer() {
  const [type, setType] = useState<Dist>("binomial");
  const [n, setN] = useState(12);
  const [p, setP] = useState(0.5);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [lambda, setLambda] = useState(4);
  const info = distributionInfo[type];
  const data = useMemo(() => points(type, n, p, mu, sigma, lambda), [type, n, p, mu, sigma, lambda]);
  const max = Math.max(...data.map(point => point.y), 0.001) * 1.12;
  const xMin = data[0].x, xMax = data[data.length - 1].x;
  const px = (x: number) => 36 + (x - xMin) / (xMax - xMin || 1) * 648;
  const py = (y: number) => 224 - y / max * 190;
  const discrete = type === "binomial" || type === "poisson";
  const line = data.map((point, i) => (i ? "L" : "M") + px(point.x).toFixed(2) + " " + py(point.y).toFixed(2)).join(" ");
  const area = line + " L684 224 L36 224 Z";
  return <section className="pw-playground" id="explore">
    <div className="pw-playgroundHead"><div><span className="pw-kicker">EXPLORE / 01</span><h2>分布を、動かしてみよう。</h2><p>パラメータを変えると、確率のかたちはどう変わる？</p></div><span className="pw-live">● INTERACTIVE</span></div>
    <div className="pw-explorer">
      <div className="pw-explorerSidebar"><span className="pw-smallTitle">分布を選ぶ</span><div className="pw-distButtons">{(Object.keys(distributionInfo) as Dist[]).map(key => <button key={key} type="button" className={type === key ? "pw-selected" : ""} aria-pressed={type === key} onClick={() => setType(key)}>{distributionInfo[key].name}<span>→</span></button>)}</div><div className="pw-parameters"><span className="pw-smallTitle">パラメータを調整</span>{type === "binomial" && <><label>試行回数 n <b>{n}</b><input type="range" min="2" max="30" value={n} onChange={event => setN(Number(event.target.value))}/></label><label>成功確率 p <b>{p.toFixed(2)}</b><input type="range" min="0.05" max="0.95" step="0.05" value={p} onChange={event => setP(Number(event.target.value))}/></label></>}{type === "normal" && <><label>平均 μ <b>{mu}</b><input type="range" min="-3" max="3" step="0.5" value={mu} onChange={event => setMu(Number(event.target.value))}/></label><label>標準偏差 σ <b>{sigma.toFixed(1)}</b><input type="range" min="0.5" max="3" step="0.25" value={sigma} onChange={event => setSigma(Number(event.target.value))}/></label></>}{type === "poisson" && <label>平均発生回数 λ <b>{lambda.toFixed(1)}</b><input type="range" min="0.5" max="12" step="0.5" value={lambda} onChange={event => setLambda(Number(event.target.value))}/></label>}{type === "uniform" && <p className="pw-sideNote">区間 [−0.5, 0.5] の一様分布です。</p>}</div></div>
      <div className="pw-visual"><div className="pw-visualTop"><div><span>{info.subtitle}</span><h3>{info.name}</h3></div><code>{info.formula}</code></div><div className="pw-graph"><svg viewBox="0 0 720 270" preserveAspectRatio="none" role="img" aria-label={info.name + "の確率分布のグラフ"}><line x1="36" y1="224" x2="684" y2="224" stroke="#bdcad6" strokeWidth="1.5"/>{[0.25,0.5,0.75,1].map(t => <line key={t} x1="36" y1={py(max*t)} x2="684" y2={py(max*t)} stroke="#edf0f4" strokeDasharray="5 6"/>)}{discrete ? data.map(point => <rect key={point.x} x={px(point.x)-Math.min(16, 320/data.length)} y={py(point.y)} width={Math.min(32, 640/data.length)} height={Math.max(0,224-py(point.y))} rx="3" fill={info.color} opacity=".86"/>) : <><path d={area} fill={info.color} fillOpacity=".14"/><path d={line} fill="none" stroke={info.color} strokeWidth="3.5" strokeLinejoin="round"/></>}<text x="36" y="250" fill="#718096" fontSize="14">{xMin.toFixed(type === "normal" ? 1 : 0)}</text><text x="684" y="250" textAnchor="end" fill="#718096" fontSize="14">{xMax.toFixed(type === "normal" ? 1 : 0)}</text></svg></div><div className="pw-visualNote"><span className="pw-noteIcon">✦</span>{info.description}</div></div>
    </div>
  </section>;
}
const catalog: { tag: string; title: string; text: string; icon: string; type: Dist }[] = [
  { tag: "DISCRETE", title: "二項分布", text: "コイン投げなど成功回数の分布", icon: "◕", type: "binomial" },
  { tag: "CONTINUOUS", title: "正規分布", text: "身の回りに現れる釣り鐘型", icon: "∩", type: "normal" },
  { tag: "DISCRETE", title: "ポアソン分布", text: "一定時間に起こる出来事の数", icon: "∴", type: "poisson" },
  { tag: "CONTINUOUS", title: "一様分布", text: "どの値も同じように現れる", icon: "▰", type: "uniform" }
];
function Home() {
  return <div className="pw"><header className="pw-header"><a className="pw-logo" href="#top"><span>◈</span><strong>確率の世界</strong><small>PROBABILITY WORLD</small></a><nav aria-label="サイトナビゲーション"><a href="#phenomena">現象から学ぶ</a><a href="#explore">分布を探索</a><a href="#catalog">分布図鑑</a><a href="#laboratory">実験室</a><a href="#learning">学ぶ</a></nav><a className="pw-headerCta" href="#explore">探索をはじめる ↗</a></header><main id="top">
    <section className="pw-hero"><div className="pw-heroText"><div className="pw-eyebrow"><span>✦</span> DISCOVER THE PATTERNS IN CHANCE</div><h1>確率は、<br/><em>見えると</em>おもしろい。</h1><p className="pw-lead">確率を、見て・動かして・発見する。</p><p className="pw-herodesc">数式の向こうにある、意外な規則性。<br/>グラフを動かし、実験しながら、確率と統計の世界を探検しよう。</p><div className="pw-heroActions"><a className="pw-button" href="?lab=arrivals">現象を動かしてみる <span>↗</span></a><a className="pw-textButton" href="#catalog">分布図鑑を見る　→</a></div><div className="pw-heroFoot"><span>SCROLL TO DISCOVER</span><span>↓</span></div></div><div className="pw-heroArt" aria-hidden="true"><svg viewBox="0 0 560 420"><defs><linearGradient id="pwGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#7a83ff"/><stop offset="1" stopColor="#2ad5bc"/></linearGradient></defs>{[1,2,3,4].map(i=><ellipse key={i} cx="288" cy="220" rx={170+i*32} ry={98+i*24} fill="none" stroke="#b8c5e9" opacity=".11" transform="rotate(-22 288 220)"/>)}{Array.from({length:46},(_,i)=>{const x=50+i*10;const v=Math.exp(-.5*((x-285)/90)**2);return <rect key={i} x={x} y={327-v*240} width="6" height={v*240} rx="3" fill="url(#pwGradient)" opacity={.35+.65*v}/>})}<path d="M45 327 C130 327 170 92 285 86 C400 92 445 327 526 327" fill="none" stroke="#d5e0ff" strokeWidth="3"/><circle cx="285" cy="86" r="7" fill="#42d7c1"/><circle cx="285" cy="86" r="18" fill="none" stroke="#42d7c1" opacity=".45"/><text x="70" y="58" fill="#aebddd" fontSize="16">P(X)</text><text x="458" y="361" fill="#aebddd" fontSize="16">X →</text></svg><div className="pw-artBadge"><span>THE NORMAL CURVE</span><strong>μ = 0　σ = 1</strong></div></div></section>
    <div className="pw-statstrip"><span>確率分布をもっと直感的に</span><span><b>01</b> 現象を見る</span><span><b>02</b> 試行する</span><span><b>03</b> 分布を発見する</span></div>
    <LabHighlights/>
    <DistributionExplorer/>
    <section className="pw-section" id="catalog"><div className="pw-sectionHeader"><div><span className="pw-kicker">DISTRIBUTION LIBRARY / 02</span><h2>確率分布の図鑑</h2><p>分布の特徴を知れば、現実の見え方が変わる。</p></div><a href="#explore" className="pw-subtleLink">すべて探索する ↗</a></div><div className="pw-catalog">{catalog.map((item,i)=><a key={item.type} href={item.type==="uniform" ? "#explore" : "?lab="+(item.type==="binomial"?"coin":item.type==="normal"?"normal":"arrivals")} className="pw-catalogCard"><div className={"pw-catalogVisual pw-v"+i}><span>{item.icon}</span></div><div className="pw-catalogBody"><small>{item.tag}</small><h3>{item.title}<span>↗</span></h3><p>{item.text}</p></div></a>)}</div></section>
    <section className="pw-section pw-labSection" id="laboratory"><div className="pw-labIntro"><span className="pw-kicker">EXPERIMENT LAB / 03</span><h2>やってみると、<br/>わかってくる。</h2><p>何度も繰り返すことで見えてくる、確率の不思議。自分の手で実験して、結果を確かめてみよう。</p><a className="pw-button" href="?experiment=dice">サイコロ実験を開く <span>↗</span></a></div><div className="pw-labCard"><div className="pw-labCardHeader"><span>EXPERIMENT 001</span><span className="pw-live">● 体験できます</span></div><div className="pw-labDice" aria-hidden="true">⚄ <span>⚂</span> ⚅</div><h3>サイコロと大数の法則</h3><p>振る回数を増やすと、6つの目の割合はどうなる？</p><a href="?experiment=dice">実験してみる →</a></div></section>
    <section className="pw-section pw-learning" id="learning"><div className="pw-sectionHeader"><div><span className="pw-kicker">LEARNING PATH / 04</span><h2>学びを、少しずつ深めよう。</h2><p>難しい数式からではなく、体験から理解へ。</p></div></div><div className="pw-learningGrid"><article><span>01 / START</span><div>◎</div><h3>確率って何だろう？</h3><p>起こりやすさを数字で表す基本の考え方。</p></article><article><span>02 / EXPLORE</span><div>⌁</div><h3>確率分布を知る</h3><p>二項分布や正規分布の形を比較しよう。</p></article><article><span>03 / DISCOVER</span><div>∑</div><h3>大数の法則を感じる</h3><p>実験を重ねると結果が安定する理由。</p></article></div><div className="pw-upcoming"><span>COMING SOON</span> 中心極限定理・コイン投げ・来客到着・待ち時間・損失リスクの実験を公開中。動画ファイルの自動生成は今後の拡張予定です。</div></section>
  </main><footer className="pw-footer"><strong>◈ 確率の世界</strong><span>確率を、見て・動かして・発見する。</span><small>PROBABILITY WORLD</small></footer></div>;
}
export default function App() {
  const query = new URLSearchParams(window.location.search);
  const lab = query.get("lab");
  if (lab && LAB_ORDER.includes(lab as LabKind)) return <PhenomenaLab kind={lab as LabKind}/>;
  if (query.get("experiment") === "dice") {
    return <><div className="pw-returnBar"><span>確率の世界　/　実験室　/　サイコロと大数の法則</span><a href={window.location.pathname}>← 現象から学ぶトップに戻る</a></div><DiceLab/></>;
  }
  return <Home/>;
}
