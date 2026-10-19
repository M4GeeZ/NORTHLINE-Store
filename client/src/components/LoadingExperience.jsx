import React,{createContext,useCallback,useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {useLocation,useNavigate} from 'react-router-dom';

// Durations include the exit animation, not just the progress-line fill.
const TIMINGS={
 initial:{fill:1350,exit:650}, // 2.00 seconds, full upward panel reveal
 page:{fill:900,exit:400},    // 1.30 seconds, fade out only
 item:{fill:700,exit:300}     // 1.00 second, fade out only
};
const NavigationContext=createContext(null);
const prefersReducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const itemPath=pathname=>/^\/(?:product|journal)\/[^/]+/.test(pathname);
const currentAddress=()=>window.location.pathname+window.location.search+window.location.hash;

/** Use for imperative navigations after login, sign out or search. */
export function useExperienceNavigate(){
 const start=useContext(NavigationContext);
 const fallback=useNavigate();
 return useCallback((to,options)=>start?start(to,options):fallback(to,options),[start,fallback]);
}

/**
 * Transition controller for all internal links and programmatic app navigation.
 * Intercepts clicks BEFORE React Router handles them; new content is rendered
 * behind the already visible loader, so it never flashes before the transition.
 */
export default function LoadingExperience({children}){
 const navigate=useNavigate();
 const location=useLocation();
 const [transition,setTransition]=useState({id:0,mode:'initial',phase:'cover'});
 const transitionRef=useRef({id:0,mode:'initial',phase:'cover'});
 const busyRef=useRef(true);
 const previousLocationRef=useRef(location.key);
 const framesRef=useRef(new Set());
 const sequenceRef=useRef(0);

 const change=useCallback(next=>{
  transitionRef.current=next;
  setTransition(next);
 },[]);

 const complete=useCallback(()=>{
  const old=transitionRef.current;
  if(old.phase==='hidden')return;
  busyRef.current=false;
  change({...old,phase:'hidden'});
 },[change]);
 const startExit=useCallback(()=>{
  const old=transitionRef.current;
  if(old.phase!=='cover')return;
  change({...old,phase:'exit'});
 },[change]);

 const startNavigation=useCallback((to,options={},hint)=>{
  if(typeof to==='number'){navigate(to);return}
  const target=new URL(to,window.location.href);
  const source=new URL(window.location.href);
  if(target.origin!==source.origin){window.location.assign(target.href);return}
  const sameDocument=target.pathname===source.pathname&&target.search===source.search;
  if(sameDocument&&target.hash){
   // A same-page anchor is a scroll action, not a new-page transition.
   navigate(target.pathname+target.search+target.hash,options);
   return;
  }
  if(target.pathname+target.search+target.hash===currentAddress()){
   window.scrollTo({top:0,behavior:'instant'});
   return;
  }
  if(busyRef.current)return;
  if(prefersReducedMotion()){
   navigate(target.pathname+target.search+target.hash,options);
   return;
  }
  const mode=hint==='item'||itemPath(target.pathname)?'item':'page';
  busyRef.current=true;
  const next={id:++sequenceRef.current,mode,phase:'cover'};
  // This synchronous commit makes the overlay visible BEFORE navigation.
  flushSync(()=>change(next));
  // Paint the overlay, then change the route underneath it.
  const a=requestAnimationFrame(()=>{
   framesRef.current.delete(a);
   const b=requestAnimationFrame(()=>{
    framesRef.current.delete(b);
    navigate(target.pathname+target.search+target.hash,options);
   });
   framesRef.current.add(b);
  });
  framesRef.current.add(a);
 },[navigate,change]);

 // Attach in the capture phase, ahead of React Router's bubble-phase <Link>.
 useEffect(()=>{
  function clickCapture(event){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
   if(!(event.target instanceof Element))return;
   const anchor=event.target.closest('a[href]');
   if(!anchor||anchor.hasAttribute('download')||anchor.hasAttribute('data-no-preload'))return;
   if(anchor.target&&anchor.target!=='_self')return;
   const url=new URL(anchor.href,window.location.href);
   if(url.origin!==window.location.origin)return;
   if(url.pathname===window.location.pathname&&url.search===window.location.search&&url.hash)return;
   if(url.pathname+url.search+url.hash===currentAddress())return;
   // Do not block default navigation for off-site, modified, or in-page links.
   event.preventDefault();
   const mode=anchor.closest('.product-card, .journal-card, [data-preloader="item"]')?'item':undefined;
   startNavigation(url.pathname+url.search+url.hash,{},mode);
  }
  document.addEventListener('click',clickCapture,true);
  return ()=>document.removeEventListener('click',clickCapture,true);
 },[startNavigation]);

 // Covers Back/Forward and third-party navigations, before browser paint.
 useLayoutEffect(()=>{
  if(previousLocationRef.current===location.key)return;
  previousLocationRef.current=location.key;
  if(busyRef.current||prefersReducedMotion())return;
  const mode=itemPath(location.pathname)?'item':'page';
  busyRef.current=true;
  change({id:++sequenceRef.current,mode,phase:'cover'});
 },[location.key,location.pathname,change]);

 useLayoutEffect(()=>{
  // Static boot splash hides the app before JavaScript starts.
  document.getElementById('northline-boot')?.remove();
 },[]);

 useEffect(()=>{
  if(transition.phase!=='cover')return;
  const timer=window.setTimeout(startExit,prefersReducedMotion()?60:TIMINGS[transition.mode].fill+90);
  return ()=>window.clearTimeout(timer);
 },[transition.id,transition.phase,transition.mode,startExit]);
 useEffect(()=>{
  if(transition.phase!=='exit')return;
  const timer=window.setTimeout(complete,prefersReducedMotion()?30:TIMINGS[transition.mode].exit+90);
  return ()=>window.clearTimeout(timer);
 },[transition.id,transition.phase,transition.mode,complete]);
 useEffect(()=>()=>{for(const frame of framesRef.current)cancelAnimationFrame(frame)},[]);

 const progressEnd=event=>{
  if(event.animationName==='nl-progress-fill')startExit();
 };
 const exitEnd=event=>{
  const expected=transition.mode==='initial'?'transform':'opacity';
  if(event.target===event.currentTarget&&event.propertyName===expected)complete();
 };
 const value=useCallback((to,options)=>startNavigation(to,options),[startNavigation]);
 const visible=transition.phase!=='hidden';
 return <NavigationContext.Provider value={value}>
  {children}
  <div
   className={'nl-experience is-'+transition.phase+' is-'+transition.mode}
   style={{'--nl-progress-duration':`${TIMINGS[transition.mode].fill}ms`,'--nl-exit-duration':`${TIMINGS[transition.mode].exit}ms`}}
   role={visible?'status':undefined}
   aria-live={visible?'polite':'off'}
   aria-label={visible?'Opening NORTHLINE page':undefined}
   aria-hidden={!visible}
   onTransitionEnd={exitEnd}>
    <div className="nl-experience-grain" aria-hidden="true"/>
    <div className="nl-experience-corner nl-experience-corner--top" aria-hidden="true">A LITTLE MORE CONSIDERED</div>
    <div className="nl-experience-center">
     <div className="nl-experience-symbol" aria-hidden="true"><span>✳</span><i/><i/><i/></div>
     <div className="nl-experience-name">northline<span>✳</span></div>
     <div className="nl-experience-rule" aria-hidden="true"><i key={transition.id} onAnimationEnd={progressEnd}/></div>
     <p className="nl-experience-caption">GOOD THINGS TAKE SHAPE</p>
    </div>
    <div className="nl-experience-corner nl-experience-corner--bottom" aria-hidden="true">THOUGHTFULLY CURATED · EST. 2026</div>
  </div>
 </NavigationContext.Provider>;
}

/** Small spinner for genuine network/form actions, unchanged. */
export function ActionSpinner(){return <span className="nl-action-spinner" aria-hidden="true"/>}
