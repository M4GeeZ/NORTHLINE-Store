import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link,NavLink,useLocation,useNavigate} from 'react-router-dom';
import {ArrowRight,ArrowUpRight,ChevronDown,Facebook,Heart,Instagram,Menu,Minus,Package,Plus,Search,ShoppingBag,Trash2,Truck,UserRound,X} from 'lucide-react';
import {api,useStore} from '../context/Store';
import toast from 'react-hot-toast';
import Lenis from 'lenis';
import LoadingExperience,{ActionSpinner,useExperienceNavigate} from './LoadingExperience';
export const money=n=>`$${Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function SmoothScroll(){
 const location=useLocation();
 const lenisRef=useRef(null);
 useEffect(()=>{
  const previous=window.history.scrollRestoration;
  window.history.scrollRestoration='manual';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduced)return ()=>{window.history.scrollRestoration=previous};
  let frame;
  const lenis=new Lenis({duration:1.15,easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)),smoothWheel:true,wheelMultiplier:.95});
  lenisRef.current=lenis;
  const raf=t=>{lenis.raf(t);frame=requestAnimationFrame(raf)};
  frame=requestAnimationFrame(raf);
  const anchorClick=e=>{const a=e.target.closest('a[href^="#"]');if(a?.hash)lenis.scrollTo(a.hash,{offset:-88})};
  document.addEventListener('click',anchorClick);
  return ()=>{cancelAnimationFrame(frame);document.removeEventListener('click',anchorClick);lenis.destroy();lenisRef.current=null;window.history.scrollRestoration=previous};
 },[]);
 useLayoutEffect(()=>{
  const reset=()=>{lenisRef.current?.scrollTo(0,{immediate:true,force:true});window.scrollTo(0,0)};
  reset();
  const frame=requestAnimationFrame(()=>{
   if(location.hash){
    const id=decodeURIComponent(location.hash.slice(1));
    const element=document.getElementById(id);
    if(element){if(lenisRef.current)lenisRef.current.scrollTo(element,{offset:-88,immediate:true});else element.scrollIntoView({behavior:'instant'})}
    else reset();
   }else reset();
  });
  return ()=>cancelAnimationFrame(frame);
 },[location.pathname,location.search,location.hash,location.key]);
 return null;
}
function ScrollProgress(){const[width,setWidth]=useState(0);useEffect(()=>{let running=false;const update=()=>{if(running)return;running=true;requestAnimationFrame(()=>{let max=document.documentElement.scrollHeight-innerHeight;setWidth(max>0?Math.min(100,scrollY/max*100):0);running=false})};window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update)},[]);return <div className="reading-progress" style={{width:width+'%'}}/>}
function Header(){
 const {count,cartOpen,setCartOpen,searchOpen,setSearchOpen,wishlist,user}=useStore();
 const [menu,setMenu]=useState(false);const location=useLocation();
 useEffect(()=>{setMenu(false)},[location.pathname,location.search]);
 const nav=[['Home','/'],['Shop all','/shop'],['Living','/shop?category=Living'],['Lighting','/shop?category=Lighting'],['Dining','/shop?category=Dining'],['Lookbook','/lookbook'],['Journal','/journal'],['Our story','/about']];
 return <><div className="announcement"><div className="container announcement-content"><span>THE GOOD LIVING EDIT <span className="star-sep">✳</span> THOUGHTFULLY CURATED FOR YOU</span><span>COMPLIMENTARY DELIVERY ON ORDERS OVER $150 <ArrowRight size={13}/></span></div></div>
 <header className="header"><div className="container header-inner">
 <button className="icon-btn mobile-only" onClick={()=>setMenu(v=>!v)} aria-label="Toggle mobile menu" aria-expanded={menu}>{menu?<X/>:<Menu/>}</button>
 <Link className="logo" to="/" aria-label="Northline home">northline<span>✳</span></Link>
 <nav className={'main-nav '+(menu?'open':'')} aria-label="Main navigation">{nav.map(([title,href])=><Link className={location.pathname+location.search===href?'active':''} key={href} to={href}>{title}</Link>)}<Link className="nav-mobile-help" to="/faq">Help center</Link></nav>
 <div className="header-icons"><button className="icon-btn" onClick={()=>setSearchOpen(!searchOpen)} aria-label="Search products"><Search/></button><Link to="/wishlist" className="icon-btn favorite-nav" aria-label="Wishlist"><Heart/>{wishlist.length>0&&<span className="tiny-counter">{wishlist.length}</span>}</Link><Link className="icon-btn account-nav" to={user?'/account':'/login'} aria-label="Account"><UserRound/></Link><button className="icon-btn bag-btn" onClick={()=>setCartOpen(!cartOpen)} aria-label="Shopping bag"><ShoppingBag/><span className="bag-counter">{count}</span></button></div>
 </div></header>{menu&&<div className="nav-backdrop" onClick={()=>setMenu(false)}/>}
 </>
}

function SearchModal(){const {searchOpen,setSearchOpen}=useStore();const[q,setQ]=useState('');const input=useRef(null);const nav=useExperienceNavigate();useEffect(()=>{if(searchOpen){setTimeout(()=>input.current?.focus(),40)}},[searchOpen]);if(!searchOpen)return null;return <div className="search-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)setSearchOpen(false)}}><div className="search-modal" role="dialog" aria-modal="true" aria-label="Search products"><div className="search-modal-top"><span>FIND SOMETHING GOOD</span><button className="icon-btn" onClick={()=>setSearchOpen(false)} aria-label="Close"><X/></button></div><form onSubmit={e=>{e.preventDefault();nav('/shop?search='+encodeURIComponent(q));setSearchOpen(false)}}><Search/><input ref={input} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search our collection..."/><button aria-label="Submit search"><ArrowUpRight/></button></form><p>Popular searches</p><div className="search-suggestions">{['Lighting','Living','Dining','Tech'].map(c=><button key={c} onClick={()=>{nav('/shop?category='+c);setSearchOpen(false)}}>{c} <ArrowUpRight size={13}/></button>)}</div></div></div>}
function CartDrawer(){const {cart,cartOpen,setCartOpen,count,subtotal,update}=useStore();const loc=useLocation();useEffect(()=>setCartOpen(false),[loc.pathname]);if(!cartOpen)return null;return <div className="drawer-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setCartOpen(false)}}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag"><div className="drawer-header"><div><span className="eyebrow">YOUR SHOPPING EDIT</span><h2>Your bag <span>({count})</span></h2></div><button onClick={()=>setCartOpen(false)} className="icon-btn" aria-label="Close cart"><X/></button></div>{cart.length?<><div className="drawer-products">{cart.map(({key,product,quantity,finish})=><div className="drawer-item" key={key}><Link onClick={()=>setCartOpen(false)} to={'/product/'+product.slug}><img src={product.images?.[0]} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/fallback-'+String(product.category||'Living').toLowerCase()+'.svg'}} alt={product.name}/></Link><div className="drawer-item-info"><Link to={'/product/'+product.slug} onClick={()=>setCartOpen(false)} className="cart-name">{product.name}</Link><span>{product.category} {finish?' / '+finish:''}</span><strong>{money(product.price)}</strong><div className="qty-small"><button onClick={()=>update(key,quantity-1)} aria-label="Decrease">{quantity===1?<Trash2 size={13}/>:<Minus size={13}/>}</button><span>{quantity}</span><button onClick={()=>update(key,quantity+1)} aria-label="Increase" disabled={quantity>=product.stock}><Plus size={13}/></button></div></div></div>)}</div><div className="drawer-footer"><div className="shipping-meter"><div className="shipping-meter-head"><Truck size={18}/> {subtotal>=150?'You unlocked free shipping!':`You're ${money(150-subtotal)} away from free shipping`}</div><div className="shipping-track"><div style={{width:Math.min(100,subtotal/150*100)+'%'}}/></div></div><div className="row-spread"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p>Shipping calculated at checkout.</p><Link className="btn btn-dark btn-block" to="/checkout" onClick={()=>setCartOpen(false)}>Secure checkout <ArrowRight size={18}/></Link><Link to="/cart" className="text-btn drawer-continue" onClick={()=>setCartOpen(false)}>View full bag</Link></div></>:<div className="drawer-empty"><ShoppingBag size={48} strokeWidth={1.2}/><h3>Your bag is looking a little empty.</h3><p>Good things are waiting to be discovered.</p><Link className="btn btn-dark" to="/shop" onClick={()=>setCartOpen(false)}>Shop the collection <ArrowUpRight size={18}/></Link></div>}</aside></div>}
function Footer(){
 const[email,setEmail]=useState('');const[ok,setOk]=useState(false);const[busy,setBusy]=useState(false);
 const join=async(e)=>{e.preventDefault();setBusy(true);try{await api.post('/newsletter',{email});setOk(true);setEmail('')}catch(e){toast.error(e.response?.data?.message||'Unable to save subscription. Check the API connection.')}finally{setBusy(false)}};
 return <footer className="footer"><div className="container">
  <div className="footer-upper"><div className="footer-intro"><span className="eyebrow light">NOT JUST ANOTHER NEWSLETTER</span><h2>Good things<br/><em>in your inbox.</em></h2><p>Objects we love, thoughtful styling notes, and a little inspiration for everyday life.</p><form className="newsletter-form" onSubmit={join}><input type="email" required placeholder="Enter your email" aria-label="Newsletter email" value={email} onChange={e=>setEmail(e.target.value)}/><button disabled={busy} aria-busy={busy} aria-label={busy?"Joining newsletter":"Join newsletter"}>{busy?<ActionSpinner/>:<ArrowUpRight/>}</button></form><small>{ok?'You are subscribed in this demo database.':'Your email is saved to MongoDB when the backend is connected. No marketing emails are sent.'}</small></div>
  <div className="footer-menus"><div><h4>COLLECTIONS</h4><Link to="/shop">Shop everything</Link><Link to="/shop?category=Living">Living room</Link><Link to="/shop?category=Lighting">Lighting</Link><Link to="/shop?category=Dining">Dining</Link><Link to="/shop?category=Accessories">Accessories</Link><Link to="/shop?category=Tech">Tech essentials</Link></div><div><h4>DISCOVER</h4><Link to="/about">Our philosophy</Link><Link to="/lookbook">The lookbook</Link><Link to="/journal">Field notes</Link><Link to="/wishlist">Saved items</Link><Link to="/cart">Shopping bag</Link><Link to="/account">My account</Link></div><div><h4>HERE TO HELP</h4><Link to="/faq">Help center</Link><Link to="/policies/shipping">Shipping & delivery</Link><Link to="/policies/returns">Returns & refunds</Link><Link to="/contact">Contact us</Link><Link to="/policies/privacy">Privacy</Link><Link to="/policies/terms">Terms of use</Link></div></div></div>
  <div className="footer-wordmark">northline<span>✳</span></div><div className="footer-bottom"><span>© {new Date().getFullYear()} NORTHLINE STUDIO · CODEALPHA MERN PORTFOLIO PROJECT</span><span>AN INDEPENDENT CONCEPT STORE, NOT AN OPERATING RETAILER</span><span>MADE WITH INTENTION ✳</span></div></div>
 </footer>
}

export default function Layout({children}){const{setCartOpen,setSearchOpen}=useStore();useEffect(()=>{const onKey=e=>{if(e.key==='Escape'){setCartOpen(false);setSearchOpen(false)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[setCartOpen,setSearchOpen]);return <LoadingExperience><SmoothScroll/><ScrollProgress/><Header/><SearchModal/><main id="main-content">{children}</main><Footer/><CartDrawer/></LoadingExperience>}
