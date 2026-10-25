import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DEFAULT_PARAMS, MAX_TRIALS, empiricalStats, makeHistogram, simulate, tailSurvival,
  theoreticalStats, type LabKind, type LabParams, type Trial
} from "./simulations";
import { studioUrl } from "./shortsRoutes";
import "./phenomena.css";

type LabDescription = {
  symbol: string; title: string; english: string; phenomenon: string; intro: string;
  hint: string; model: string; formula: string; observation: string;
  challenge: string; answer: string; wrongAnswer: string; explanation: string;
  shortHook: string; shortReveal: string; color: string; label: string;
};
export const LAB_ORDER: LabKind[] = ["coin", "normal", "arrivals", "wait", "tails"];
export const LABS: Record<LabKind, LabDescription> = {
  coin: {
    symbol: "◒", title: "コイン投げと二項分布", english: "BINOMIAL DISTRIBUTION",
    phenomenon: "表と裏が、何度も現れる。", intro: "コインを何度も投げたとき、「表の回数」はいつも同じ？ 1セットの実験を繰り返して、成功回数の分布をつくろう。",
    hint: "1セットの中でコインを n 回投げ、「表が出た回数」を1つのデータとして記録します。",
    model: "独立したコイン投げで、各回の表の確率が一定であると仮定します。",
    formula: "X ~ Binomial(n, p)",
    observation: "10回投げても、表が5回とは限りません。ただし、たくさんのセットを比べると、その回数の現れやすさにパターンが見えてきます。",
    challenge: "表の確率が50%なら、10回投げたとき必ず5回表が出る？",
    answer: "必ずではない", wrongAnswer: "必ず5回になる", explanation: "平均は5回でも、1セットごとの結果は変動します。分布はそのばらつきを表しています。",
    shortHook: "コインを10回投げると、表は必ず5回？", shortReveal: "何百セットも繰り返すと、二項分布の山が浮かび上がる。",
    color: "#5b6ee1", label: "表の回数"
  },
  normal: {
    symbol: "∿", title: "小さな誤差と正規分布", english: "NORMAL DISTRIBUTION · CLT",
    phenomenon: "小さな偶然が、重なったら。", intro: "測定には、小さなランダムな誤差がいくつも加わります。独立な誤差の合計は、どんな形にまとまるでしょう？",
    hint: "1セットで、独立な一様分布の小さな誤差を n 個加え、分散が1になるように標準化します。",
    model: "各誤差を独立な一様分布として発生させます。正規曲線は中心極限定理による近似であり、有限個のときは完全一致しません。",
    formula: "Z = ΣUᵢ / √(n/12)",
    observation: "誤差を1個だけ足すと平らな形です。多くの独立な誤差を足して標準化すると、釣り鐘のような形に近づきます。",
    challenge: "独立な小さな誤差をたくさん足すと、分布はどうなりやすい？",
    answer: "釣り鐘型に近づく", wrongAnswer: "必ず一様なまま", explanation: "中心極限定理により、条件が満たされれば標準化した合計は正規分布に近づきます。",
    shortHook: "ランダムな誤差を足すと、なぜ釣り鐘型になる？", shortReveal: "1個、4個、20個。分布の形が少しずつ変わる。",
    color: "#16a799", label: "標準化された誤差"
  },
  arrivals: {
    symbol: "●", title: "来客とポアソン分布", english: "POISSON DISTRIBUTION",
    phenomenon: "次のお客さんは、いつ来る？", intro: "お店にお客さんが来る時刻はランダム。1回の営業で来た人数を数え、何度も営業を再現してみよう。",
    hint: "一定の到着率をもつポアソン過程を使い、各回の営業時間内に起きた来客を数えます。",
    model: "客同士が独立に、一定の率で到着する単純なポアソン過程です。実際の混雑の波や時間帯の変化は含めません。",
    formula: "N(t) ~ Poisson(λt)",
    observation: "理論上は平均と分散が等しいモデルです。200回営業させても、毎回の来客数は違います。",
    challenge: "平均7.5人の営業なら、毎回7〜8人が来る？",
    answer: "営業ごとにばらつく", wrongAnswer: "毎回7〜8人", explanation: "平均は多くの営業をまとめた値であり、一度の営業人数は確率的に変動します。",
    shortHook: "1時間に平均5人来る店。今日は何人来る？", shortReveal: "何百日の営業を再現すると、ポアソン分布が見えてくる。",
    color: "#d89541", label: "1回の営業の来客数"
  },
  wait: {
    symbol: "◷", title: "待ち時間と指数分布", english: "EXPONENTIAL DISTRIBUTION",
    phenomenon: "『平均5分待ち』は、5分で来る？", intro: "ランダムに来るお客さんを待つ時間は、短いことも長いこともあります。次の来客までの時間を記録しよう。",
    hint: "一定の到着率をもつポアソン過程で、次の1人が来るまでの待ち時間を発生させます。",
    model: "到着が独立・一定率で起こるときに待ち時間が指数分布に従います。現実の予約客やピーク時間は別のモデルが必要です。",
    formula: "T ~ Exponential(λ)",
    observation: "短い待ち時間ほど起こりやすく、まれに長く待つこともあります。平均時間は『いつもその時刻』を意味しません。",
    challenge: "平均待ち時間が12分なら、次の来客は12分後に来る？",
    answer: "待ち時間は毎回違う", wrongAnswer: "毎回12分後", explanation: "指数分布の平均は繰り返し観測した値の目安。個々の待ち時間を確定させるものではありません。",
    shortHook: "平均12分待ちなら、12分後に来る？", shortReveal: "短い待ち時間が多く、長い待ち時間もときどき起こる。",
    color: "#bd83cb", label: "待ち時間（分）"
  },
  tails: {
    symbol: "↗", title: "極端な損失と裾の重い分布", english: "LOGNORMAL / PARETO",
    phenomenon: "平均は同じ。でもリスクは違う。", intro: "どちらも平均100万円になるように設定した2つのモデル。損失が極端に大きくなる頻度を比較しよう。",
    hint: "対数正規分布とパレート分布から、1件あたりの損失額（万円）を発生させます。",
    model: "所得や保険損失などを説明するための仮想モデルです。現実の損失データが必ずこれらの分布に従うわけではありません。",
    formula: "E[X] = 100 万円",
    observation: "平均を固定しても、分布の形と極端な値の出方は変わります。パレート分布では形状 α≤2 の場合、理論分散が無限大です。",
    challenge: "平均が同じ2つの損失モデルなら、大きな損失のリスクも同じ？",
    answer: "同じとは限らない", wrongAnswer: "いつも同じ", explanation: "平均だけでは裾の重さを表せません。極端な損失の確率や分散も比べる必要があります。",
    shortHook: "平均100万円の2つの損失モデル。危険度は同じ？", shortReveal: "裾の重さが違うと、極端な損失の出方が変わる。",
    color: "#d36c80", label: "損失額（万円）"
  }
};
function fmt(n: number, digits = 2) { return Number.isFinite(n) ? n.toLocaleString("ja-JP", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "∞"; }
function pct(n: number) { return (100 * n).toFixed(1) + "%"; }

export function LabHighlights() {
  return <section id="phenomena" className="ph-highlights">
    <div className="ph-sectionIntro"><div><span className="pw-kicker">START WITH A PHENOMENON / 01</span><h2>現象から、確率を発見する。</h2><p>身近な出来事を何度も再現すると、そこに確率分布が浮かび上がります。</p></div><span className="ph-badge">5 INTERACTIVE LABS</span></div>
    <div className="ph-featured">
      <a className="ph-featuredMain" href="?lab=arrivals"><span className="ph-mini">FEATURED EXPERIMENT / 001</span><div className="ph-dots" aria-hidden="true"><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span></div><h3>お客さんは、<br/>何人来るだろう？</h3><p>来客をシミュレーションして、ポアソン分布を見つけよう。</p><strong>来客数の実験をする ↗</strong></a>
      <div className="ph-featuredGrid">{LAB_ORDER.filter(kind => kind !== "arrivals").map(kind => <a key={kind} className={"ph-tile ph-tile-"+kind} href={"?lab="+kind}><span className="ph-tileSymbol">{LABS[kind].symbol}</span><div><small>{LABS[kind].english}</small><h3>{LABS[kind].title}</h3><p>{LABS[kind].phenomenon}</p></div><span className="ph-tileArrow">↗</span></a>)}</div>
    </div>
    <div className="ph-threeSteps"><div><span>01</span><strong>現象を見る</strong><p>何が起きるか、まず予想する</p></div><div><span>02</span><strong>何度も試行する</strong><p>実際にデータを生み出す</p></div><div><span>03</span><strong>理論と比べる</strong><p>分布が現れる理由を考える</p></div></div>
  </section>;
}

function Scenario({ kind, params, trial }: { kind: LabKind; params: LabParams; trial: Trial | null }) {
  const count = trial?.value ?? 0;
  if (kind === "coin") return <div className="ph-scene ph-sceneCoin"><div className="ph-sceneCaption">1セット：{params.flips}回のコイン投げ</div><div className="ph-coins">{trial ? trial.details.map((value, i) => <span key={i} className={value ? "ph-head" : "ph-tail"} title={value ? "表" : "裏"}>{value ? "表" : "裏"}</span>) : Array.from({ length: Math.min(params.flips, 20) }, (_,i)=><span key={i} className="ph-coinPlaceholder">?</span>)}</div><div className="ph-sceneResult">表が出た回数 <strong>{trial ? count + " 回" : "—"}</strong></div></div>;
  if (kind === "normal") return <div className="ph-scene ph-sceneNormal"><div className="ph-sceneCaption">測定を左右する小さな誤差（{params.steps}要因）</div><div className="ph-errorBars">{trial ? trial.details.map((value, i) => <div key={i} className="ph-errorAxis"><span className={value >= 0 ? "ph-positive" : "ph-negative"} style={{height: (Math.abs(value)*94) + "%", top: value >= 0 ? undefined : "50%", bottom: value >= 0 ? "50%" : undefined}}></span></div>) : Array.from({length:params.steps}, (_, i)=><div key={i} className="ph-errorAxis"/>)}</div><div className="ph-errorLegend">− 誤差 <span>0</span> ＋ 誤差</div><div className="ph-sceneResult">標準化した合計 <strong>{trial ? fmt(count) : "—"}</strong></div></div>;
  if (kind === "arrivals") return <div className="ph-scene ph-sceneArrivals"><div className="ph-sceneCaption">ある日の店舗 / 営業時間 {params.minutes} 分</div><div className="ph-shop"><span className="ph-storeIcon">▣</span><span>OPEN</span><span className="ph-shopPeople">{trial ? "●".repeat(Math.min(8, trial.details.length)) : "○ ○ ○"}</span></div><div className="ph-timeline"><span className="ph-track"></span>{trial?.details.map((time, i) => <span key={i} className="ph-arrivalDot" title={"開始から"+fmt(time,1)+"分"} style={{left: (time/params.minutes*100)+"%"}} />)}</div><div className="ph-timelineLabels"><span>開店 0分</span><span>閉店 {params.minutes}分</span></div><div className="ph-sceneResult">この日の来客数 <strong>{trial ? count + " 人" : "—"}</strong></div></div>;
  if (kind === "wait") return <div className="ph-scene ph-sceneWait"><div className="ph-sceneCaption">お客さんが次に来るまでの時間</div><div className="ph-clock"><span className="ph-clockIcon">◴</span><strong>{trial ? fmt(count,1) : "--.-"}</strong><small>min</small></div><div className="ph-waitTrack"><span style={{width: (trial ? Math.min(100, count/(180/params.rate)*100) : 0) +"%"}}></span></div><div className="ph-timelineLabels"><span>0分</span><span>平均 {fmt(60/params.rate,1)}分</span><span>{fmt(180/params.rate,0)}分</span></div><div className="ph-sceneResult">理論上の平均待ち時間 <strong>{fmt(60/params.rate,1)} 分</strong></div></div>;
  return <div className="ph-scene ph-sceneTails"><div className="ph-sceneCaption">1件あたりの損失額を観測（平均100万円のモデル）</div><div className="ph-lossGraphic"><span>¥</span><strong>{trial ? fmt(count,1) : "—"}</strong><small>万円</small></div><div className="ph-lossTags"><span>通常の損失</span><span className={count >= 300 ? "ph-riskActive" : ""}>300万円以上の損失</span></div><div className="ph-sceneResult">理論上の300万円超の確率 <strong>{pct(tailSurvival(300,params))}</strong></div></div>;
}

function Histogram({kind, params, trials, cdf}: {kind: LabKind; params: LabParams; trials: Trial[]; cdf: boolean}) {
  const bins = useMemo(() => makeHistogram(kind,params,trials),[kind,params,trials]);
  let runningObserved = 0, runningTheoretical = 0;
  const values = bins.map(bin => {
    runningObserved += bin.observed; runningTheoretical += bin.theoretical;
    return { label: bin.label, observed: cdf ? runningObserved : bin.observed, theoretical: cdf ? Math.min(1,runningTheoretical) : bin.theoretical };
  });
  const high = cdf ? 1.05 : Math.max(0.08, ...values.map(item => Math.max(item.observed,item.theoretical)))*1.2;
  const x = (i:number) => 43 + (i+0.5) / values.length * 684;
  const y = (v:number) => 239 - Math.max(0, v)/high * 198;
  const theoreticalLine = values.map((v,i) => (i ? "L" : "M") + x(i).toFixed(2) + " " + y(v.theoretical).toFixed(2)).join(" ");
  const empiricalLine = values.map((v,i) => (i ? "L" : "M") + x(i).toFixed(2) + " " + y(v.observed).toFixed(2)).join(" ");
  const tickIndices = [0, Math.floor((values.length-1)/4),Math.floor((values.length-1)/2),Math.floor(3*(values.length-1)/4),values.length-1];
  return <div className="ph-chart"><div className="ph-chartLegend"><span><i className="ph-swatchObserved"/>実測 {cdf ? "累積割合" : "相対度数"}</span><span><i className="ph-swatchTheory"/>理論 {cdf ? "累積確率" : "確率"}</span></div><svg role="img" aria-label={"シミュレーション結果と理論の"+(cdf ? "累積分布" : "確率分布")+"を比較したグラフ"} viewBox="0 0 760 285" preserveAspectRatio="none"><line x1="43" y1="239" x2="727" y2="239" stroke="#c7d2e3" strokeWidth="1.5"/>{[0.25,0.5,0.75,1].map(part=><g key={part}><line x1="43" y1={y(high*part)} x2="727" y2={y(high*part)} stroke="#edf1f6" strokeDasharray="4 5"/><text x="37" y={y(high*part)+4} textAnchor="end" fontSize="11" fill="#9aa7b9">{pct(high*part)}</text></g>)}{cdf ? (trials.length > 0 && <path d={empiricalLine} stroke="#6477df" strokeWidth="3" fill="none" strokeLinejoin="round"/>) : values.map((v,i) => <rect key={i} x={x(i)-Math.max(2, 325/values.length)} y={y(v.observed)} width={Math.max(4,650/values.length)} height={Math.max(0,239-y(v.observed))} rx="3" fill="#6477df" fillOpacity=".78"/>)}<path d={theoreticalLine} stroke="#e59b52" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round"/>{tickIndices.map((i,j)=><text key={j} x={x(i)} y="264" textAnchor="middle" fontSize="11" fill="#8794aa">{values[i].label}</text>)}</svg><div className="ph-chartFooter"><span>{LABS[kind].label} →</span><span>{trials.length.toLocaleString("ja-JP")} セットの観測</span></div></div>;
}

function Parameter({label,value,min,max,step=1,onChange}: {label:string;value:number;min:number;max:number;step?:number;onChange:(v:number)=>void}) {
  return <label className="ph-parameter"><span>{label}<strong>{Number.isInteger(value) ? value : value.toFixed(2)}</strong></span><input type="range" min={min} max={max} step={step} value={value} onChange={event=>onChange(Number(event.target.value))}/></label>;
}
export default function PhenomenaLab({kind}: {kind:LabKind}) {
  const config=LABS[kind];
  const [params,setParams]=useState<LabParams>(DEFAULT_PARAMS);
  const [trials,setTrials]=useState<Trial[]>([]);
  const [last,setLast]=useState<Trial|null>(null);
  const [running,setRunning]=useState(false);
  const [batch,setBatch]=useState(25);
  const [cdf,setCdf]=useState(false);
  const [quiz,setQuiz]=useState<"correct"|"wrong"|null>(null);
  const [videoMode,setVideoMode]=useState(false);
  const trialsRef=useRef<Trial[]>([]);
  const modify=(changes:Partial<LabParams>)=>{
    setParams(prev=>({...prev,...changes}));trialsRef.current=[];setTrials([]);setLast(null);setRunning(false);setQuiz(null);
  };
  const run=useCallback((amount:number)=>{
    const remaining=MAX_TRIALS-trialsRef.current.length;
    if(remaining<=0){setRunning(false);return;}
    const fresh=Array.from({length:Math.min(amount,remaining)},()=>simulate(kind,params));
    if(!fresh.length)return;
    setLast(fresh[fresh.length-1]);
    const compact=fresh.map(trial=>({value:trial.value,details:[]}));
    const next=[...trialsRef.current,...compact];
    trialsRef.current=next;setTrials(next);
    if(next.length>=MAX_TRIALS)setRunning(false);
  },[kind,params]);
  useEffect(()=>{if(!running)return;const interval=window.setInterval(()=>run(batch),200);return()=>window.clearInterval(interval)},[running,batch,run]);
  const reset=()=>{setRunning(false);trialsRef.current=[];setTrials([]);setLast(null);setQuiz(null);};
  const theory=theoreticalStats(kind,params);
  const actual=useMemo(()=>empiricalStats(trials),[trials]);
  const tailFrequency=kind==="tails" && trials.length ? trials.filter(trial=>trial.value>=300).length/trials.length:0;
  const replayText=trials.length===0 ? "まだ実験を始めていません。最初のセットを実行してみましょう。" : trials.length<100 ? "試行回数が少ない間は、実測値と理論値に差が出ます。もっと繰り返してみましょう。" : "たくさん繰り返すと、実測分布は理論上の形に近づく傾向があります。毎回の結果が予測できるわけではありません。";
  return <div className={"ph-page"+(videoMode?" ph-videoMode":"")} style={{"--ph-accent":config.color} as CSSProperties}>
    <header className="ph-header"><a href={window.location.pathname} className="ph-logo">◈ <strong>確率の世界</strong><span>PROBABILITY WORLD</span></a><div className="ph-headerActions"><a href={window.location.pathname+"#phenomena"}>← 実験一覧に戻る</a><a href={studioUrl(kind,params)}>◧ 動画を生成 ↗</a><button type="button" onClick={()=>setVideoMode(v=>!v)} aria-pressed={videoMode}>{videoMode?"通常表示に戻す":"▣ 動画素材モード"}</button></div></header>
    <main><section className="ph-intro"><div className="ph-introText"><span className="ph-eyebrow">EXPERIMENT LAB　/　{String(LAB_ORDER.indexOf(kind)+1).padStart(2,"0")}</span><h1>{config.phenomenon}</h1><p>{config.intro}</p><span className="ph-formula">{config.formula}</span></div><div className="ph-introSymbol" aria-hidden="true">{config.symbol}</div></section>
      <div className="ph-content"><div className="ph-labHeader"><div><span className="ph-overline">SIMULATE & DISCOVER</span><h2>{config.title}</h2><p>{config.hint}</p></div><div className="ph-runningIndicator"><span className={running?"ph-pulse":""}/> {running?"RUNNING":"INTERACTIVE"}</div></div>
        <div className="ph-labGrid"><aside className="ph-controls"><div className="ph-controlHeading"><span>01</span><strong>条件を決める</strong></div>
          {kind==="coin"&&<><Parameter label="1セットの投げる回数 n" value={params.flips} min={2} max={30} onChange={v=>modify({flips:v})}/><Parameter label="表の確率 p" value={params.probability} min={0.1} max={0.9} step={0.05} onChange={v=>modify({probability:v})}/></>}
          {kind==="normal"&&<Parameter label="独立な誤差の個数 n" value={params.steps} min={1} max={30} onChange={v=>modify({steps:v})}/>}
          {(kind==="arrivals"||kind==="wait")&&<Parameter label="平均来客率（人 / 時間）" value={params.rate} min={1} max={20} onChange={v=>modify({rate:v})}/>}
          {kind==="arrivals"&&<Parameter label="営業時間（分）" value={params.minutes} min={15} max={180} step={15} onChange={v=>modify({minutes:v})}/>}
          {kind==="tails"&&<><label className="ph-selectLabel">比較する損失モデル<select value={params.tailModel} onChange={e=>modify({tailModel:e.target.value as LabParams["tailModel"]})}><option value="lognormal">対数正規分布</option><option value="pareto">パレート分布</option></select></label>{params.tailModel==="lognormal" ? <Parameter label="対数標準偏差 σ" value={params.sigma} min={0.3} max={1.8} step={0.1} onChange={v=>modify({sigma:v})}/> : <Parameter label="形状 α（裾の重さ）" value={params.alpha} min={1.2} max={4} step={0.2} onChange={v=>modify({alpha:v})}/>}<p className="ph-controlNote">どちらも理論平均は100万円。形を変えながら、300万円超の頻度を比較してください。</p></>}
          <div className="ph-divider"/><div className="ph-smallHeading">1回の操作で追加するセット数</div><div className="ph-batch" role="group" aria-label="1回の操作で追加する試行セット数">{[1,25,200].map(n=><button key={n} className={batch===n?"ph-active":""} onClick={()=>setBatch(n)} aria-pressed={batch===n}>{n}</button>)}</div>
          <button className="ph-runButton" disabled={trials.length>=MAX_TRIALS} onClick={()=>run(batch)}>＋ {batch} セット実験する ↗</button><button className="ph-playButton" disabled={trials.length>=MAX_TRIALS} onClick={()=>setRunning(x=>!x)}>{running?"Ⅱ 自動再生を停止":"▶ 自動再生する"}</button><button className="ph-resetButton" disabled={!trials.length} onClick={reset}>↺ やり直す</button><p className="ph-limit">最大 {MAX_TRIALS.toLocaleString()} セットまで</p>
          <div className="ph-theoryBox"><span>理論上の平均</span><strong>{fmt(theory.mean)} <small>{theory.unit}</small></strong><span>理論上の分散</span><strong>{fmt(theory.variance)} <small>{theory.unit ? theory.unit+"²" : ""}</small></strong></div>
        </aside>
        <div className="ph-observe"><div className="ph-sceneHeading"><div><span className="ph-overline">02 / WATCH IT HAPPEN</span><h3>現象を観察する</h3></div><span className="ph-trialNumber">{trials.length.toLocaleString("ja-JP")} セット実施</span></div><Scenario kind={kind} params={params} trial={last}/><div className="ph-graphHeading"><div><span className="ph-overline">03 / THE PATTERN APPEARS</span><h3>分布が見えてくる</h3></div><div className="ph-chartTabs" role="group" aria-label="グラフの種類"><button className={!cdf?"ph-active":""} onClick={()=>setCdf(false)} aria-pressed={!cdf}>分布</button><button className={cdf?"ph-active":""} onClick={()=>setCdf(true)} aria-pressed={cdf}>累積分布</button></div></div>
          <Histogram kind={kind} params={params} trials={trials} cdf={cdf}/>
          <div className="ph-stats"><div><span>試行セット数</span><strong>{trials.length.toLocaleString("ja-JP")}</strong></div><div><span>実測平均</span><strong>{trials.length ? fmt(actual.mean) : "—"}</strong></div><div><span>実測分散</span><strong>{trials.length ? fmt(actual.variance) : "—"}</strong></div>{kind==="tails"&&<div><span>300万円以上</span><strong>{trials.length ? pct(tailFrequency) : "—"}</strong></div>}</div><p className="ph-chartInsight"><span>✦</span>{replayText}</p>
        </div></div>
        <section className="ph-explain"><div><span className="ph-overline">04 / UNDERSTAND THE MODEL</span><h2>なぜ、こんな形になるの？</h2><p>{config.observation}</p><div className="ph-modelNotice"><strong>モデルの前提</strong><p>{config.model}</p></div></div><div className="ph-question"><span className="ph-overline">PREDICTION QUIZ</span><h3>{config.challenge}</h3><div className="ph-quizAnswers"><button onClick={()=>setQuiz("correct")}>{config.answer}</button><button onClick={()=>setQuiz("wrong")}>{config.wrongAnswer}</button></div>{quiz&&<div className={"ph-answer "+(quiz==="correct"?"ph-correct":"ph-incorrect")}><strong>{quiz==="correct"?"その通り！":"もう一度考えてみよう"}</strong><p>{config.explanation}</p></div>}</div></section>
        <section className="ph-short"><div><span className="ph-overline">FROM LAB TO SHORT VIDEO</span><h2>この実験を、30秒の動画に。</h2><p>この実験の条件をそのまま使い、現象・試行・分布・発見を15秒または30秒の縦型動画にできます。プレビューを見てからWebMまたはMP4形式で保存できます。</p><a className="ph-studioLink" href={studioUrl(kind,params)}>◧ ショート動画スタジオを開く ↗</a></div><div className="ph-shortFrames"><div><span>0–5 SEC</span><strong>{config.shortHook}</strong></div><div><span>5–20 SEC</span><strong>条件を変えて、実験を繰り返す</strong></div><div><span>20–30 SEC</span><strong>{config.shortReveal}</strong></div></div></section>
        <div className="ph-next"><span>次の実験もしてみよう</span><div>{LAB_ORDER.filter(item=>item!==kind).map(item=><a key={item} href={"?lab="+item}>{LABS[item].title} ↗</a>)}</div></div>
      </div></main><footer className="ph-footer"><a href={window.location.pathname}>◈ 確率の世界</a><span>確率を、見て・動かして・発見する。</span></footer>
  </div>;
}
