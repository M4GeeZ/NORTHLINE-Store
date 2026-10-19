import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Heart} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import {useCatalog} from '../hooks/useCatalog';
import {useStore} from '../context/Store';
export default function Wishlist(){const {wishlist}=useStore();const {products}=useCatalog();const filtered=products.filter(p=>wishlist.includes(p._id));return <section className="container inner-page wishlist-page"><span className="eyebrow with-dash">THINGS YOU LOVE</span><h1>The saved edit<span className="serif-accent">.</span></h1><p className="page-lead">A little corner of all your favourite finds.</p>{filtered.length?<div className="product-grid">{filtered.map(p=><ProductCard key={p._id} product={p}/>)}</div>:<div className="empty-state"><Heart size={45} strokeWidth={1.1}/><h2>Nothing saved just yet.</h2><p>Tap the heart on any product to keep it here for later.</p><Link className="btn btn-dark" to="/shop">Discover good things <ArrowUpRight size={17}/></Link></div>}</section>}
