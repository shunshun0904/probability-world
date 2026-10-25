import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deviation, frequencies, rollDie, summarize, THEORETICAL } from "./probability";

const FACES = ["⚀","⚁","⚂","⚃","⚄","⚅"];
const PERCENT = (value: number) => (value * 100).toFixed(1) + "%";
const MAX_ROLLS = 100000;
const OPTIONS = [1, 10, 100, 1000];
type Point = { n: number; error: number };

export default function App() {
  const [rolls, setRolls] = useState<number[]>([]);
  const [history, setHistory] = useState<Point[]>([]);
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState(100);
  const rollsRef = useRef(rolls);
  const historyRef = useRef(history);
  rollsRef.current = rolls;
  historyRef.current = history;
  const counts = useMemo(() => summarize(rolls), [rolls]);
  const frequency = useMemo(() => frequencies(counts), [counts]);
  const error = deviation(counts);
  const latest = rolls.at(-1);
  const addRolls = useCallback((amount: number) => {
    const current = rollsRef.current;
    const space = Math.max(0, MAX_ROLLS - current.length);
    const actual = Math.min(amount, space);
    if (!actual) return;
    const added = Array.from({ length: actual }, rollDie);
    const next = [...current, ...added];
    const nextCounts = summarize(current);
    const points = [...historyRef.current];
    // Record error every 10 rolls and at the end, keeping at most 500 points.
    for (let i = 0; i < added.length; i++) {
      nextCounts[added[i] - 1]++;
      const n = current.length + i + 1;
      if (n <= 10 || n % 10 === 0 || i === added.length - 1) {
        points.push({ n, error: deviation(nextCounts) });
      }
    }
    const trimmed = points.length <= 500 ? points : points.filter((_, index) => index % Math.ceil(points.length / 500) === 0 || index === points.length - 1);
    rollsRef.current = next;
    historyRef.current = trimmed;
    setRolls(next);
    setHistory(trimmed);
    if (next.length >= MAX_ROLLS) setRunning(false);
  }, []);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => addRolls(batch), 160);
    return () => window.clearInterval(id);
  }, [running, batch, addRolls]);
  const reset = () => { setRunning(false); rollsRef.current = []; historyRef.current = []; setRolls([]); setHistory([]); };
  const displayMax = Math.max(0.25, ...frequency) * 1.08;
  const trace = history.length > 0 ? history.map((p, index) => {
    const x = 12 + (index / Math.max(1, history.length - 1)) * 656;
    const y = 168 - Math.min(p.error / 0.85, 1) * 148;
    return (index ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ") : "";

  return <div className="site">
    <header className="topbar"><a href="#home" className="brand"><span className="brandmark">◈</span> 確率の世界 <span className="brandEnglish">PROBABILITY WORLD</span></a><nav aria-label="メインナビゲーション"><a href="#experiment">実験する</a><a href="#learn">学ぶ</a></nav></header>
    <main id="home">
      <section className="hero"><div className="heroInner"><div className="eyebrow"><span className="sparkle">✦</span> THE BEAUTY OF RANDOMNESS</div><h1>偶然のなかに、<br/><em>法則</em>を見つけよう。</h1><p>確率を、見て・動かして・発見する。<br/>難しい数式より先に、まずはサイコロを振ってみよう。</p><a className="heroButton" href="#experiment">さっそく実験する <span aria-hidden="true">↗</span></a><div className="heroDeco" aria-hidden="true"><div className="orbit orbitOne"></div><div className="orbit orbitTwo"></div><span className="bigDice">⚄</span><span className="diceSmall diceA">⚂</span><span className="diceSmall diceB">⚅</span></div></div></section>
      <section className="experimentWrap" id="experiment"><div className="sectionLabel">01 / INTERACTIVE LAB</div><div className="sectionHeading"><div><h2>サイコロ実験室</h2><p>6つの目は、本当に同じ確率で出るのでしょうか？</p></div><span className="livePill"><span className="liveDot"></span> INTERACTIVE</span></div>
        <div className="experimentGrid"><section className="card controlCard"><div className="cardOverline">ROLL THE DICE</div><div className="die" aria-label={latest ? "直近の出目 " + latest : "まだサイコロを振っていません"}>{latest ? FACES[latest - 1] : "⚄"}</div><div className="resultLabel">{latest ? "最後に出た目：" + latest : "準備はいいですか？"}</div><div className="stats"><div><strong>{rolls.length.toLocaleString("ja-JP")}</strong><span>試行回数</span></div><div><strong>{PERCENT(error)}</strong><span>最大誤差</span></div></div><div className="controlLabel">一度に振る回数</div><div className="batchOptions" role="group" aria-label="一度に振る回数">{OPTIONS.map(option => <button key={option} className={batch === option ? "selected" : ""} onClick={() => setBatch(option)} aria-pressed={batch === option}>{option.toLocaleString()}</button>)}</div><button className="primaryButton" onClick={() => addRolls(batch)} disabled={rolls.length >= MAX_ROLLS}>サイコロを {batch.toLocaleString()} 回振る <span>↗</span></button><button className="secondaryButton" onClick={() => setRunning(current => !current)} disabled={rolls.length >= MAX_ROLLS}>{running ? "Ⅱ  自動実験を停止" : "▶  自動で振り続ける"}</button><button className="resetButton" onClick={reset} disabled={!rolls.length}>↺ 実験をリセット</button><p className="limitNote">最大 {MAX_ROLLS.toLocaleString()} 回まで試行できます。</p></section>
          <section className="card chartCard"><div className="cardTitle"><div><div className="cardOverline">OBSERVED VS. EXPECTED</div><h3>出目の確率を比べよう</h3></div><div className="legend"><span><i className="legendObserved"></i> 実測値</span><span><i className="legendExpected"></i> 理論値（16.7%）</span></div></div><div className="barChart" role="img" aria-label="1から6の出目の相対度数と理論確率の棒グラフ">{frequency.map((value, index) => <div className="barColumn" key={index}><div className="barPlot"><div className="theoryLine" style={{bottom: (THEORETICAL / displayMax * 100) + "%"}}></div><div className="bar" style={{height: (value / displayMax * 100) + "%"}}></div></div><strong>{index + 1}</strong><small>{PERCENT(value)}</small></div>)}</div><div className="chartBottom"><span>6つの目の相対度数</span><span>理論確率：1/6 ≒ 16.7%</span></div><div className="insight"><span className="insightIcon">✦</span><p>{rolls.length === 0 ? "サイコロを振ると、ここに実験結果が表示されます。" : rolls.length < 30 ? "まだ試行回数が少ないので、出目にばらつきが見られます。回数を増やしてみましょう。" : "試行回数を増やすと、各出目の相対度数は理論値の約16.7%に近づく傾向があります。ただし毎回ぴったり一致するわけではありません。"}</p></div></section></div>
        <section className="card convergenceCard"><div className="cardTitle"><div><div className="cardOverline">THE LAW OF LARGE NUMBERS</div><h3>試行を重ねると、誤差はどうなる？</h3></div><span className="tag">大数の法則</span></div><p className="convergenceIntro">6つの出目について「相対度数と理論確率の差」の最大値を追跡します。試行回数が増えるほど、誤差は小さくなる傾向があります。</p><div className="lineChart" role="img" aria-label="試行回数に対する最大誤差の推移"><svg viewBox="0 0 680 200" preserveAspectRatio="none" aria-hidden="true"><line x1="12" x2="668" y1="168" y2="168" stroke="#c9d3df"/><line x1="12" x2="668" y1="95" y2="95" stroke="#e5eaf0" strokeDasharray="5 5"/><line x1="12" x2="668" y1="20" y2="20" stroke="#e5eaf0" strokeDasharray="5 5"/>{trace && <path d={trace} fill="none" stroke="#3867f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}</svg>{history.length === 0 && <div className="emptyChart">実験を始めるとグラフが描かれます</div>}</div><div className="axisLabels"><span>1 回</span><span>試行回数 →</span><span>{rolls.length.toLocaleString()} 回</span></div></section>
      </section>
      <section className="learn" id="learn"><div className="sectionLabel">02 / DISCOVER THE IDEA</div><h2>数字が語る、<br/><em>おもしろい法則。</em></h2><div className="learnCards"><article><span className="learnNumber">01</span><h3>理論確率</h3><p>公平なサイコロでは、どの目も出る確率は 1/6。振る前に考えられる確率です。</p></article><article><span className="learnNumber">02</span><h3>相対度数</h3><p>実際に出た割合のこと。「1の目が出た回数 ÷ 全試行回数」で計算します。</p></article><article><span className="learnNumber">03</span><h3>大数の法則</h3><p>試行回数を十分に増やすと、相対度数は理論確率へ近づいていきます。</p></article></div></section>
    </main><footer><span>◈ 確率の世界</span><span>確率を、見て・動かして・発見する。</span></footer>
  </div>;
}
