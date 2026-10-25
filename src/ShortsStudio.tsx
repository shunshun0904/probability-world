import { useEffect, useMemo, useRef, useState } from "react";
import {
  createVideoScript, createVideoStory, drawShortFrame, SHORT_SCRIPTS, VIDEO_DURATIONS,
  VIDEO_HEIGHT, VIDEO_WIDTH, type VideoDuration
} from "./shortsEngine";
import { createVideoExport, triggerDownload, type RecordedShort, type VideoExportTask } from "./shortsRecorder";
import { parseStudioQuery, studioUrl } from "./shortsRoutes";
import { DEFAULT_PARAMS, type LabKind, type LabParams } from "./simulations";
import { LAB_ORDER } from "./shortsEngine";
import "./shortsStudio.css";

const titles:Record<LabKind,string>={
  coin:"コインと二項分布",normal:"測定誤差と正規分布",
  arrivals:"来客数とポアソン分布",wait:"待ち時間と指数分布",
  tails:"極端な損失と裾の重さ"
};
function Slider({title,value,min,max,step=1,suffix="",onChange,disabled=false}:{
 title:string;value:number;min:number;max:number;step?:number;suffix?:string;
 onChange:(v:number)=>void;disabled?:boolean
}) {
  return <label className="sv-slider"><span>{title}<b>{Number.isInteger(value)?value:value.toFixed(2)}{suffix}</b></span><input type="range" value={value} min={min} max={max} step={step} disabled={disabled} onChange={e=>onChange(Number(e.target.value))}/></label>;
}
export default function ShortsStudio(){
  const initial=useMemo(()=>parseStudioQuery(window.location.search),[]);
  const [kind,setKind]=useState<LabKind>(initial.kind);
  const [params,setParams]=useState<LabParams>(initial.params);
  const [seed,setSeed]=useState(20261025);
  const [duration,setDuration]=useState<VideoDuration>(30);
  const [seconds,setSeconds]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [recording,setRecording]=useState(false);
  const [progress,setProgress]=useState(0);
  const [output,setOutput]=useState<RecordedShort|null>(null);
  const [videoUrl,setVideoUrl]=useState("");
  const [error,setError]=useState("");
  const [showScript,setShowScript]=useState(false);
  const canvas=useRef<HTMLCanvasElement|null>(null);
  const task=useRef<VideoExportTask|null>(null);
  const story=useMemo(()=>createVideoStory(kind,params,seed),[kind,params,seed]);
  const script=useMemo(()=>createVideoScript(story,duration),[story,duration]);
  const recordingSupported=typeof window!=="undefined" && "MediaRecorder" in window && typeof HTMLCanvasElement!=="undefined" && "captureStream" in HTMLCanvasElement.prototype;
  useEffect(()=>{
    if(!canvas.current)return;
    const ctx=canvas.current.getContext("2d",{alpha:false});
    if(ctx)drawShortFrame(ctx,story,seconds,duration);
  },[story,seconds,duration]);
  useEffect(()=>{
    if(!playing || recording)return;
    const from=seconds,started=performance.now();let frame=0,lastPaint=0;
    const loop=(now:number)=>{
      if(now-lastPaint>=45){
        const next=Math.min(duration,from+(now-started)/1000);
        setSeconds(next);lastPaint=now;
        if(next>=duration){setPlaying(false);return;}
      }
      frame=requestAnimationFrame(loop);
    };
    frame=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(frame);
    // Only restart playback when playback state or clip identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,recording,duration,story]);
  useEffect(()=>{
    if(!output){setVideoUrl("");return;}
    const url=URL.createObjectURL(output.blob);
    setVideoUrl(url);
    return ()=>URL.revokeObjectURL(url);
  },[output]);
  useEffect(()=>()=>{task.current?.cancel()},[]);
  function updateParams(change:Partial<LabParams>){
    setPlaying(false);setSeconds(0);setOutput(null);setError("");
    setParams(prev=>({...prev,...change}));
  }
  function changeKind(next:LabKind){
    if(recording)return;
    setKind(next);setParams({...DEFAULT_PARAMS});setSeconds(0);setPlaying(false);
    setOutput(null);setError("");
  }
  function newSeed(){
    if(recording)return;
    setSeed(value=>(value+97)>>>0);setSeconds(0);setPlaying(false);setOutput(null);setError("");
  }
  function chooseDuration(value:VideoDuration){
    if(recording)return;
    setDuration(value);setPlaying(false);setSeconds(0);setOutput(null);setError("");
  }
  function exportVideo(){
    if(recording||!recordingSupported)return;
    setPlaying(false);setSeconds(0);setOutput(null);setError("");setProgress(0);
    try {
      const next=createVideoExport(story,duration,p=>setProgress(p));
      task.current=next;setRecording(true);
      next.promise.then(result=>{
        setOutput(result);setProgress(1);
      }).catch(failure=>setError(failure instanceof Error?failure.message:"動画の作成に失敗しました。"))
        .finally(()=>{task.current=null;setRecording(false)});
    } catch (failure) {
      setError(failure instanceof Error?failure.message:"動画の作成に失敗しました。");
    }
  }
  const ctaParams=studioUrl(kind,params);
  const filename="probability-world-"+kind+"-"+duration+"s-script.txt";
  return <div className="sv-page">
    <header className="sv-header"><a className="sv-brand" href={window.location.pathname}>◈ <strong>確率の世界</strong><small>PROBABILITY WORLD</small></a><nav><a href={window.location.pathname+"#phenomena"}>← 実験一覧</a><a href={"?lab="+kind}>元の実験へ ↗</a></nav></header>
    <main><div className="sv-hero"><span className="sv-overline">CREATOR TOOLS / SHORTS STUDIO</span><h1>確率の発見を、<em>30秒の物語</em>に。</h1><p>サイトの確率シミュレーションから、YouTube Shorts向けの縦型アニメーション動画を生成できます。現象・実験・分布・発見を1本に。</p><div className="sv-heroTags"><span>9:16 VERTICAL</span><span>720 × 1280</span><span>DATA-DRIVEN ANIMATION</span></div></div>
      <div className="sv-workspace"><section className="sv-previewPanel"><div className="sv-sectionHeading"><div><span className="sv-overline">01 / LIVE PREVIEW</span><h2>動画プレビュー</h2></div><span className="sv-length">{duration} SEC</span></div><div className="sv-stage"><canvas ref={canvas} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} aria-label="縦型ショート動画の現在のフレーム"/>{output&&videoUrl&&<video className="sv-videoPlayback" src={videoUrl} controls playsInline aria-label="生成した動画の再生"/>}</div><div className="sv-playbackControls"><button disabled={recording} onClick={()=>{setOutput(null);if(seconds>=duration)setSeconds(0);setPlaying(value=>!value)}}>{playing?"Ⅱ 一時停止":"▶ プレビューを再生"}</button><span>{seconds.toFixed(1)} / {duration} 秒</span></div><input className="sv-timeline" type="range" min={0} max={duration} step={0.1} value={seconds} disabled={recording||playing} aria-label="動画プレビューの再生位置" onChange={e=>{setOutput(null);setSeconds(Number(e.target.value))}}/><div className="sv-previewHint">画面内のグラフは、固定シードから生成したシミュレーションデータです。書き出した動画にも同じ結果が使われます。</div></section>
        <aside className="sv-sidePanel"><section className="sv-config"><span className="sv-overline">02 / CHOOSE THE STORY</span><h2>テーマを選ぶ</h2><div className="sv-kindGrid">{LAB_ORDER.map(item=><button key={item} className={kind===item?"sv-active":""} disabled={recording} onClick={()=>changeKind(item)} aria-pressed={kind===item}><span>{SHORT_SCRIPTS[item].symbol}</span>{titles[item]}</button>)}</div><div className="sv-divider"/><div className="sv-headingLine"><h3>実験条件</h3><a href={"?lab="+kind}>詳しい実験を見る ↗</a></div>
          {kind==="coin"&&<><Slider title="1セットのコイン投げ n" value={params.flips} min={2} max={30} disabled={recording} onChange={flips=>updateParams({flips})}/><Slider title="表が出る確率 p" value={params.probability} min={0.05} max={0.95} step={0.05} disabled={recording} onChange={probability=>updateParams({probability})}/></>}
          {kind==="normal"&&<Slider title="足し合わせる誤差の数" value={params.steps} min={1} max={30} disabled={recording} onChange={steps=>updateParams({steps})}/>}
          {(kind==="arrivals"||kind==="wait")&&<Slider title="平均来客率" value={params.rate} min={1} max={20} suffix="人/時" disabled={recording} onChange={rate=>updateParams({rate})}/>}
          {kind==="arrivals"&&<Slider title="営業時間" value={params.minutes} min={15} max={180} step={15} suffix="分" disabled={recording} onChange={minutes=>updateParams({minutes})}/>}
          {kind==="tails"&&<><label className="sv-select">損失の確率モデル<select value={params.tailModel} disabled={recording} onChange={e=>updateParams({tailModel:e.target.value as LabParams["tailModel"]})}><option value="lognormal">対数正規分布</option><option value="pareto">パレート分布</option></select></label>{params.tailModel==="pareto"?<Slider title="パレート形状パラメータ α" value={params.alpha} min={1.2} max={4} step={0.2} disabled={recording} onChange={alpha=>updateParams({alpha})}/>:<Slider title="対数標準偏差 σ" value={params.sigma} min={0.3} max={1.8} step={0.1} disabled={recording} onChange={sigma=>updateParams({sigma})}/>}</>}
          <button className="sv-reroll" onClick={newSeed} disabled={recording}>↻ 実験データを再生成 <span>seed: {seed}</span></button>
        </section><section className="sv-export"><span className="sv-overline">03 / EXPORT THE VIDEO</span><h2>動画を書き出す</h2><div className="sv-duration"><span>長さ</span>{VIDEO_DURATIONS.map(value=><button key={value} disabled={recording} aria-pressed={duration===value} className={duration===value?"sv-active":""} onClick={()=>chooseDuration(value)}>{value}秒</button>)}</div><p className="sv-exportDescription">音声なしの縦型動画です。日本語字幕とグラフの動きが入ります。必要に応じてナレーションやBGMを後から追加してください。</p>{!recordingSupported&&<p className="sv-error" role="alert">このブラウザでは書き出し機能を利用できません。ChromeまたはEdgeの最新版でお試しください。</p>}
            <button className="sv-exportButton" onClick={exportVideo} disabled={!recordingSupported||recording}>▣ {recording?"動画を生成しています…":"縦型動画を生成する"}</button>
            {recording&&<><div className="sv-progressBar"><span style={{width:Math.round(progress*100)+"%"}}/></div><p className="sv-progressText">{Math.round(progress*100)}% — ページを開いたままにしてください。</p><button className="sv-cancelButton" onClick={()=>task.current?.cancel()}>書き出しを中止</button></>}
            {error&&<p className="sv-error" role="alert">{error}</p>}
            {output&&<div className="sv-exportDone" role="status"><strong>✓ 動画ファイルが完成しました</strong><p>形式: {output.format.label} / {(output.blob.size/1024/1024).toFixed(1)} MB</p><button onClick={()=>triggerDownload(output.blob,output.filename)}>↓ 動画をダウンロード</button></div>}
            <div className="sv-exportFoot">ブラウザの録画機能で生成します。MP4に対応していないブラウザではWebM形式になります。YouTubeへの投稿は手動です。</div>
          </section></aside></div>
      <section className="sv-scriptSection"><div><span className="sv-overline">04 / STORYBOARD & SCRIPT</span><h2>台本も、一緒に。</h2><p>今選んでいる現象と実験条件に合わせた、ショート動画の構成です。</p><div className="sv-scriptButtons"><button onClick={()=>setShowScript(value=>!value)}>{showScript?"台本を閉じる":"台本を表示する"}</button><button onClick={()=>triggerDownload(new Blob([script],{type:"text/plain;charset=utf-8"}),filename)}>↓ 台本テキストを保存</button></div></div><div className="sv-storyCards"><div><span>SCENE 01 / QUESTION</span><strong>{story.script.hook}</strong></div><div><span>SCENE 02 / EXPERIMENT</span><strong>{story.script.action}</strong></div><div><span>SCENE 03 / DISTRIBUTION</span><strong>600セットの実測結果と理論分布を比較</strong></div><div><span>SCENE 04 / DISCOVERY</span><strong>{story.script.insight}</strong></div></div>{showScript&&<pre className="sv-scriptText">{script}</pre>}</section>
      <div className="sv-share"><div><strong>同じ設定で動画を作り直せます</strong><span>このURLに実験のパラメータを含めています。</span></div><button onClick={()=>navigator.clipboard.writeText(window.location.origin+window.location.pathname+ctaParams).then(()=>setError("URLをコピーしました。")).catch(()=>setError("コピーできませんでした。URLをアドレスバーからコピーしてください。"))}>共有用URLをコピー ↗</button></div>
    </main><footer className="sv-footer"><a href={window.location.pathname}>◈ 確率の世界</a><span>現象から学び、世界に伝える。</span></footer>
  </div>;
}
