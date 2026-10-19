import {useEffect,useState} from 'react';
import {api} from '../context/Store';
import {DEMO_PRODUCTS} from '../data/demoProducts';
const safe=(str='')=>String(str).toLowerCase();
function localFilter(params){let p=[...DEMO_PRODUCTS];if(params?.featured==='true')p=p.filter(x=>x.featured);if(params?.category&&params.category!=='All')p=p.filter(x=>x.category===params.category);if(params?.search){let q=safe(params.search);p=p.filter(x=>safe(x.name).includes(q)||safe(x.description).includes(q))}if(params?.sort==='price-asc')p.sort((a,b)=>a.price-b.price);if(params?.sort==='price-desc')p.sort((a,b)=>b.price-a.price);if(params?.sort==='newest')p.reverse();return p}
export function useCatalog(params={}){
 const key=JSON.stringify(params);
 const [state,setState]=useState({products:localFilter(params),loading:false,preview:true,error:''});
 useEffect(()=>{let active=true;setState({products:localFilter(params),loading:true,preview:true,error:''});api.get('/products',{params}).then(r=>{if(active){const live=Array.isArray(r.data.products)?r.data.products:[];setState({products:live.length?live:localFilter(params),loading:false,preview:live.length===0,error:live.length?'':'Your MongoDB collection is empty. Showing curated preview products.'})}}).catch(()=>{if(active)setState({products:localFilter(params),loading:false,preview:true,error:'Backend unavailable. Browsing sample catalog.'})});return()=>{active=false}},[key]);
 return state
}
export async function getProduct(slug){try{return {product:(await api.get('/products/'+slug)).data.product,preview:false}}catch{const product=DEMO_PRODUCTS.find(p=>p.slug===slug);return {product,preview:true}}}
