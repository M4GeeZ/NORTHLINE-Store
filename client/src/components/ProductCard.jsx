import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Heart,Plus,Star} from 'lucide-react';
import {useStore} from '../context/Store';
import {money} from './Layout';
export default function ProductCard({product,number}){
 const {add,setCartOpen,wishlist,toggleWish}=useStore();const saved=wishlist.includes(product._id);
 return <article className="product-card">
  <div className="product-visual">
   <Link className="product-photo" to={'/product/'+product.slug} aria-label={'View '+product.name}><img loading="lazy" src={product.images?.[0]} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src='/images/fallback-'+String(product.category||'Living').toLowerCase()+'.svg'}} alt={product.name}/></Link>
   {product.badge&&<span className="product-tag">{product.badge}</span>}
   <button className={'heart-action '+(saved?'active':'')} onClick={()=>toggleWish(product)} aria-label={saved?'Remove from wishlist':'Add to wishlist'}><Heart size={19} fill={saved?'currentColor':'none'}/></button>
   <button className="quick-add" onClick={()=>{add(product,1,product.colors?.[0]||'');setCartOpen(true)}} disabled={!product.stock}><Plus size={18}/> {product.stock?'Quick add':'Sold out'}</button>
  </div>
  <div className="product-meta"><span>{product.category}</span>{product.rating>0&&<span className="product-rating"><Star size={12} fill="currentColor"/> {Number(product.rating).toFixed(1)}</span>}</div>
  <div className="product-caption"><Link to={'/product/'+product.slug}>{product.name}</Link><span>{money(product.price)}</span></div>
  {product.compareAtPrice>product.price&&<div className="product-price-old"><s>{money(product.compareAtPrice)}</s><span>Save {Math.round((1-product.price/product.compareAtPrice)*100)}%</span></div>}
 </article>
}
