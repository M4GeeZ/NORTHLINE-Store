import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Routes,Route,Navigate,useLocation} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import {StoreProvider,useStore} from './context/Store';
import Layout from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Product from './pages/Product';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import Checkout from './pages/Checkout';
import Account from './pages/Account';
import About from './pages/About';
import Wishlist from './pages/Wishlist';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import Lookbook from './pages/Lookbook';
import Journal,{JournalArticle} from './pages/Journal';
import Policies from './pages/Policies';
import Cart from './pages/Cart';
import {ArrowUpRight} from 'lucide-react';
import {Link} from 'react-router-dom';
import './style.css';
import './v3.css';
function Protected({children,admin=false}){const{token,user}=useStore();const l=useLocation();if(!token)return <Navigate to={'/login?next='+encodeURIComponent(l.pathname)} replace/>;if(admin&&user?.role!=='admin')return <Navigate to="/account" replace/>;return children}
function NotFound(){return <section className="page-404 container"><span className="eyebrow">404 / PAGE NOT FOUND</span><h1>We couldn't find<br/><em>that good thing.</em></h1><p>Let's get you back to somewhere lovely.</p><Link className="btn btn-dark" to="/">Back to home <ArrowUpRight size={17}/></Link></section>}
function App(){return <BrowserRouter><StoreProvider><Layout><Routes><Route path="/" element={<Home/>}/><Route path="/shop" element={<Shop/>}/><Route path="/product/:slug" element={<Product/>}/><Route path="/wishlist" element={<Wishlist/>}/><Route path="/cart" element={<Cart/>}/><Route path="/about" element={<About/>}/><Route path="/lookbook" element={<Lookbook/>}/><Route path="/journal" element={<Journal/>}/><Route path="/journal/:slug" element={<JournalArticle/>}/><Route path="/policies/:page" element={<Policies/>}/><Route path="/faq" element={<FAQ/>}/><Route path="/contact" element={<Contact/>}/><Route path="/login" element={<Auth/>}/><Route path="/register" element={<Auth register/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/checkout" element={<Protected><Checkout/></Protected>}/><Route path="/account" element={<Protected><Account/></Protected>}/><Route path="/admin" element={<Protected admin><Admin/></Protected>}/><Route path="*" element={<NotFound/>}/></Routes></Layout><Toaster position="bottom-center" toastOptions={{duration:2600,style:{background:'#202d27',color:'#fff',padding:'13px 18px',borderRadius:'4px'}}}/></StoreProvider></BrowserRouter>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
