import React,{useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router-dom';

/** Editorial brand reveal on first load and a fast transition on route changes. */
export default function LoadingExperience(){
 const location=useLocation();
 const firstVisit=useRef(true);
 useEffect(()=>{
  // Replace the tiny static HTML splash with the full React animation without a white flash.
  const node=document.getElementById('northline-boot');
  if(node)node.remove();
 },[]);
 const [loading,setLoading]=useState({visible:true,initial:true});
 useEffect(()=>{
  const initial=firstVisit.current;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setLoading({visible:true,initial});
  const timer=window.setTimeout(()=>{
   firstVisit.current=false;
   setLoading({visible:false,initial});
  },reduced?70:(initial?900:410));
  return ()=>window.clearTimeout(timer);
 },[location.pathname,location.search]);
 return <div className={'nl-experience '+(loading.visible?'is-visible':'is-finished')+(loading.initial?' is-initial':' is-route')} role="status" aria-live={loading.visible?'polite':'off'} aria-label={loading.visible?'Loading NORTHLINE page':undefined} aria-hidden={!loading.visible}>
   <div className="nl-experience-grain" aria-hidden="true"/>
   <div className="nl-experience-corner nl-experience-corner--top" aria-hidden="true">A LITTLE MORE CONSIDERED</div>
   <div className="nl-experience-center">
    <div className="nl-experience-symbol" aria-hidden="true"><span>✳</span><i/><i/><i/></div>
    <div className="nl-experience-name">northline<span>✳</span></div>
    <div className="nl-experience-rule" aria-hidden="true"><i/></div>
    <p className="nl-experience-caption">GOOD THINGS TAKE SHAPE</p>
   </div>
   <div className="nl-experience-corner nl-experience-corner--bottom" aria-hidden="true">THOUGHTFULLY CURATED · EST. 2026</div>
 </div>
}

/** Visible only while the associated network operation is busy. */
export function ActionSpinner(){return <span className="nl-action-spinner" aria-hidden="true"/>}
