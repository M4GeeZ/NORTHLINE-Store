import React,{createContext,useContext,useEffect,useMemo,useState} from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {DEMO_PRODUCTS} from '../data/demoProducts';
export const api=axios.create({baseURL:'/api',timeout:8000});
const savedToken=localStorage.getItem('northline-token');
if(savedToken) api.defaults.headers.common.Authorization=`Bearer ${savedToken}`;
const C=createContext(null);
function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
export function StoreProvider({children}){
 const [cart,setCart]=useState(()=>load('northline-cart-v2',[]));
 const [wishlist,setWishlist]=useState(()=>load('northline-wishlist',[]));
 const [token,setToken]=useState(()=>localStorage.getItem('northline-token')||'');
 const [user,setUser]=useState(()=>load('northline-user',null));
 const [cartOpen,setCartOpen]=useState(false);
 const [searchOpen,setSearchOpen]=useState(false);
 useEffect(()=>{localStorage.setItem('northline-cart-v2',JSON.stringify(cart))},[cart]);
 useEffect(()=>{localStorage.setItem('northline-wishlist',JSON.stringify(wishlist))},[wishlist]);
 useEffect(()=>{if(token){localStorage.setItem('northline-token',token);api.defaults.headers.common.Authorization=`Bearer ${token}`}else{localStorage.removeItem('northline-token');delete api.defaults.headers.common.Authorization}},[token]);
 useEffect(()=>{if(user)localStorage.setItem('northline-user',JSON.stringify(user));else localStorage.removeItem('northline-user')},[user]);
 useEffect(()=>{if(!token)return;api.get('/auth/me').then(({data})=>setUser(data.user)).catch(e=>{if(e.response?.status===401){setToken('');setUser(null)}})},[token]);
 // Keep browsing carts and favourites useful if users configure Atlas after trying sample mode.
 useEffect(()=>{let mounted=true;api.get('/products',{timeout:4000}).then(({data})=>{
  if(!mounted||!Array.isArray(data.products)||!data.products.length)return;
  const bySlug=new Map(data.products.map(p=>[p.slug,p]));
  setCart(previous=>previous.map(item=>{
   if(!String(item.product?._id).startsWith('demo-'))return item;
   const live=bySlug.get(item.product?.slug);if(!live)return item;
   return {...item,product:live,key:`${live._id}::${item.finish||''}`,quantity:Math.min(item.quantity,live.stock)};
  }).filter(item=>item.quantity>0));
  setWishlist(previous=>[...new Set(previous.map(id=>{
   if(!String(id).startsWith('demo-'))return id;
   const sample=DEMO_PRODUCTS.find(p=>p._id===id);
   return bySlug.get(sample?.slug)?._id||id;
  }))]);
 }).catch(()=>{});return()=>{mounted=false}},[]);

 useEffect(()=>{document.body.style.overflow=cartOpen||searchOpen?'hidden':'';return()=>{document.body.style.overflow=''}},[cartOpen,searchOpen]);
 function login(data){api.defaults.headers.common.Authorization=`Bearer ${data.token}`;setToken(data.token);setUser(data.user)}
 function logout(){delete api.defaults.headers.common.Authorization;setToken('');setUser(null);toast.success('You have signed out')}
 function add(product,quantity=1,finish=''){
  if(!product||product.stock<1){toast.error('Currently out of stock');return}
  const key=`${product._id}::${finish}`;
  setCart(prev=>{let current=prev.find(x=>x.key===key);return current?prev.map(x=>x.key===key?{...x,quantity:Math.min(product.stock,x.quantity+quantity)}:x):[...prev,{key,product,finish,quantity:Math.min(product.stock,quantity)}]});
  // Cart stays instant: notifications are best-effort, sent in the background.
  // Never trust client-side price/name/email; the API loads details from MongoDB.
  if(!String(product._id).startsWith('demo-') && globalThis.crypto?.randomUUID){
   api.post('/cart-events',{eventId:globalThis.crypto.randomUUID(),productId:product._id,quantity:Math.min(product.stock,quantity),finish:finish||''},{timeout:5000})
     .catch(error=>{if(import.meta.env.DEV)console.warn('Cart notification could not be queued:',error?.response?.data?.message||error.message)});
  }
  toast.success('Added to your bag',{icon:'✦'});
 }
 function update(key,quantity){setCart(old=>old.map(i=>i.key===key?{...i,quantity:Math.min(i.product.stock,quantity)}:i).filter(i=>i.quantity>0))}
 function toggleWish(product){const id=typeof product==='string'?product:product._id;const already=wishlist.includes(id);setWishlist(old=>already?old.filter(i=>i!==id):[...old,id]);toast.success(already?'Removed from wishlist':'Saved to wishlist')}
 const count=cart.reduce((n,item)=>n+item.quantity,0);
 const subtotal=cart.reduce((n,item)=>n+item.product.price*item.quantity,0);
 const value=useMemo(()=>({cart,setCart,wishlist,toggleWish,cartOpen,setCartOpen,searchOpen,setSearchOpen,token,user,login,logout,add,update,count,subtotal}),[cart,wishlist,cartOpen,searchOpen,token,user,count,subtotal]);
 return <C.Provider value={value}>{children}</C.Provider>
}
export const useStore=()=>useContext(C);
