import React,{useLayoutEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';

/**
 * NORTHLINE editorial reveal.
 * The progress line always completes 0 -> 100% before the entire screen
 * slides upward. Internal navigation replays the effect with a shorter fill.
 * Timing is decorative: real network buttons keep their independent busy states.
 */
export default function LoadingExperience(){
 const location=useLocation();
 const firstVisit=useRef(true);
 const [phase,setPhase]=useState('filling');
 const [initial,setInitial]=useState(true);

 // Remove the no-flash HTML splash right before the first React paint.
 useLayoutEffect(()=>{
  document.getElementById('northline-boot')?.remove();
 },[]);

 useLayoutEffect(()=>{
  setPhase('filling');
  setInitial(firstVisit.current);
  // Keep the transition accessible for people who prefer less motion.
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
   const timer=window.setTimeout(()=>{
    firstVisit.current=false;
    setPhase('leaving');
   },80);
   return ()=>window.clearTimeout(timer);
  }
 },[location.key,location.pathname,location.search]);

 const finishProgress=event=>{
  if(event.animationName!=='nl-progress-fill' || phase!=='filling')return;
  firstVisit.current=false;
  setPhase('leaving');
 };

 return <div
  key={location.key}
  className={'nl-experience '+(phase==='filling'?'is-visible':'is-finished')+(initial?' is-initial':' is-route')}
  role="status"
  aria-live={phase==='filling'?'polite':'off'}
  aria-label={phase==='filling'?'Opening NORTHLINE page':undefined}
  aria-hidden={phase!=='filling'}>
   <div className="nl-experience-grain" aria-hidden="true"/>
   <div className="nl-experience-corner nl-experience-corner--top" aria-hidden="true">A LITTLE MORE CONSIDERED</div>
   <div className="nl-experience-center">
    <div className="nl-experience-symbol" aria-hidden="true"><span>✳</span><i/><i/><i/></div>
    <div className="nl-experience-name">northline<span>✳</span></div>
    <div className="nl-experience-rule" aria-hidden="true"><i onAnimationEnd={finishProgress}/></div>
    <p className="nl-experience-caption">GOOD THINGS TAKE SHAPE</p>
   </div>
   <div className="nl-experience-corner nl-experience-corner--bottom" aria-hidden="true">THOUGHTFULLY CURATED · EST. 2026</div>
 </div>;
}

/** Only shown while a real async operation is in progress. */
export function ActionSpinner(){return <span className="nl-action-spinner" aria-hidden="true"/>}
