import React,{useRef,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {ArrowLeft,ArrowRight,ArrowUpRight,Eye,EyeOff,KeyRound,LockKeyhole,Mail,Phone,ShieldCheck,Smartphone} from 'lucide-react';
import toast from 'react-hot-toast';
import {api,useStore} from '../context/Store';
import {loginWithGoogle,phoneVerifier,requestPhoneCode,socialConfigured} from '../services/firebase';

function GoogleMark(){return <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.44-.19-2.14H12v4.02h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.88-1.74 2.99-4.3 2.99-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.39l-3.23-2.5c-.9.6-2.05.97-3.39.97-2.61 0-4.83-1.77-5.62-4.15H3.05v2.57A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.38 13.93a6 6 0 0 1 0-3.86V7.5H3.05a10 10 0 0 0 0 9l3.33-2.57z"/><path fill="#EA4335" d="M12 5.92c1.43 0 2.71.49 3.72 1.46l2.86-2.86A9.58 9.58 0 0 0 12 2a10 10 0 0 0-8.95 5.5l3.33 2.57c.79-2.38 3.01-4.15 5.62-4.15z"/></svg>}
const explain=e=>{
 const code=e?.code||'';
 if(code.includes('popup-closed'))return 'Google sign-in window was closed.';
 if(code.includes('unauthorized-domain'))return 'Add localhost to Firebase Authentication authorized domains.';
 if(code.includes('invalid-phone-number'))return 'Enter a valid number with country code, e.g. +923001234567.';
 if(code.includes('too-many-requests'))return 'Too many attempts. Please try again later.';
 return e?.response?.data?.message||e?.message||'Could not sign in. Please try again.';
};
export default function Auth({register=false}){
 const [params]=useSearchParams();
 const [form,setForm]=useState({name:'',email:'',password:''});
 const [show,setShow]=useState(false);
 const [busy,setBusy]=useState(false);
 const [mode,setMode]=useState('email');
 const [phone,setPhone]=useState('');
 const [smsCode,setSmsCode]=useState('');
 const [sent,setSent]=useState(false);
 const confirmation=useRef(null);
 const verifier=useRef(null);
 const {login}=useStore();
 const navigate=useNavigate();
 const next=params.get('next')?.startsWith('/')&&!params.get('next')?.startsWith('//')?params.get('next'):'/account';
 async function finish(idToken){const {data}=await api.post('/auth/firebase',{idToken});login(data);toast.success('Welcome to NORTHLINE!');navigate(next)}
 async function submit(e){e.preventDefault();setBusy(true);try{const{data}=await api.post('/auth/'+(register?'register':'login'),form);login(data);toast.success(register?'Your account is ready!':'Welcome back!');navigate(next)}catch(e){toast.error(explain(e))}finally{setBusy(false)}}
 async function google(){setBusy(true);try{await finish(await loginWithGoogle())}catch(e){toast.error(explain(e))}finally{setBusy(false)}}
 async function requestSMS(e){e.preventDefault();setBusy(true);try{
  if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new Error('Enter your number with country code: +923001234567');
  verifier.current ||=phoneVerifier('northline-recaptcha');
  confirmation.current=await requestPhoneCode(phone,verifier.current);
  setSent(true);toast.success('Verification code sent to your phone.');
 }catch(e){toast.error(explain(e));try{verifier.current?.clear()}catch{}verifier.current=null}finally{setBusy(false)}}
 async function verifySMS(e){e.preventDefault();setBusy(true);try{
  const result=await confirmation.current.confirm(smsCode);
  await finish(await result.user.getIdToken());
 }catch(e){toast.error(explain(e))}finally{setBusy(false)}}
 return <section className="auth-page"><div className="auth-art"><img src="https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=1500&q=85" alt="Warm contemporary living room"/><div><span>THE GOOD LIVING CLUB / NORTHLINE</span><h2>Better things<br/><em>start here.</em></h2></div></div>
 <div className="auth-panel"><div className="auth-box nl-auth-v5"><span className="eyebrow with-dash">YOUR OWN LITTLE CORNER OF NORTHLINE</span><h1>{register?'Welcome to the club.':'Lovely to see you again.'}</h1><p>{register?'Create your account to save favourites and track every order.':'Sign in to pick up exactly where you left off.'}</p>
 <div className="nl-auth-tabs" role="tablist" aria-label="Sign-in method"><button role="tab" aria-selected={mode==='email'} className={mode==='email'?'on':''} onClick={()=>setMode('email')}><Mail size={16}/> Email</button><button role="tab" aria-selected={mode==='phone'} className={mode==='phone'?'on':''} onClick={()=>setMode('phone')}><Phone size={16}/> Phone</button></div>
 {mode==='email'?<><form className="nl-auth-form" onSubmit={submit}>{register&&<label>YOUR NAME<input required minLength={2} autoComplete="name" placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}
 <label>EMAIL ADDRESS<input required type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 <div className="nl-password-heading"><span>PASSWORD</span>{!register&&<Link to="/forgot-password">Forgot password?</Link>}</div><div className="password-field"><input required minLength={register?8:1} type={show?'text':'password'} autoComplete={register?'new-password':'current-password'} placeholder={register?'At least 8 characters':'Enter your password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
 <button className="btn btn-dark btn-block nl-auth-submit" disabled={busy}>{busy?'Please wait...':register?'Create account':'Sign in'} <ArrowUpRight size={18}/></button></form>
 <div className="nl-auth-divider"><span>OR CONTINUE WITH</span></div><button type="button" className="nl-social-btn" disabled={busy} onClick={google}><GoogleMark/> Continue with Google <ArrowUpRight size={16}/></button>
 <button type="button" className="nl-social-btn" disabled={busy} onClick={()=>setMode('phone')}><Smartphone size={20}/> Continue with phone number <ArrowUpRight size={16}/></button>
 <p className="auth-toggle">{register?'Already a member?':'New around here?'} <Link to={register?'/login':'/register'}>{register?'Sign in':'Create an account'}</Link></p></>
 :<div className="nl-phone-flow"><div className="nl-provider-info"><ShieldCheck size={21}/> Secure SMS verification. No password needed.</div>
 {!sent?<form onSubmit={requestSMS}><label>PHONE NUMBER (INTERNATIONAL FORMAT)<input type="tel" required placeholder="+923001234567" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value.trim())}/></label><button className="btn btn-dark btn-block" disabled={busy}>{busy?'Sending...':'Send verification code'} <ArrowRight size={18}/></button></form>
 :<form onSubmit={verifySMS}><p>We sent a 6-digit SMS code to <strong>{phone}</strong>.</p><label>SMS VERIFICATION CODE<input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" placeholder="000000" value={smsCode} onChange={e=>setSmsCode(e.target.value.replace(/\D/g,''))}/></label><button className="btn btn-dark btn-block" disabled={busy}>{busy?'Verifying...':'Verify & continue'} <ArrowRight size={18}/></button><button type="button" className="nl-subtle-link" onClick={()=>{setSent(false);setSmsCode('');confirmation.current=null;try{verifier.current?.clear()}catch{}verifier.current=null}}>Use a different number</button></form>}
 <div id="northline-recaptcha"/><button type="button" className="nl-subtle-link" onClick={()=>setMode('email')}><ArrowLeft size={15}/> Use email instead</button></div>}
 {!socialConfigured&&<p className="nl-setup-hint">Google and phone sign-in need Firebase configuration before they can be used. Email/password works independently.</p>}
 <p className="auth-footnote"><LockKeyhole size={14}/> Your account uses secure verification. We never ask you to share an OTP.</p>
 </div></div></section>
}
