import React,{useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,Headphones,Minus,Plus,Truck,ShieldCheck} from 'lucide-react';
const groups=[
 {title:'Ordering & checkout',questions:[
  ['How do I place an order?','Browse the shop, select a product and finish, add it to your bag and continue to checkout. A free account is required, and the order is recorded in your MongoDB database.'],
  ['What payment methods are available?','The project uses a cash-on-delivery demonstration workflow. No real payment gateway or credit-card charges are connected.'],
  ['Can I make changes after ordering?','An admin can update the status of an order in the dashboard. Changes to individual order items after placement are not supported in this version.'],
  ['Where can I find my order history?','Sign in, open My Account and scroll to Your Orders. There you can see order numbers, products, totals and updated order status.']
 ]},
 {title:'Shipping & returns',questions:[
  ['How much does shipping cost?','Shipping is free for demonstration orders of $150 or more. A flat $12 shipping charge is added below that amount.'],
  ['When will my order arrive?','NORTHLINE is a portfolio demo, so products are not physically shipped. An admin can mark demo orders as processing, shipped or delivered to demonstrate the complete workflow.'],
  ['Can I request a return?','The project does not process real returns or refunds. For a production launch, a returns workflow and legal policy should be added.'],
  ['Do you offer international shipping?','The sample checkout accepts country details for testing, but real delivery coverage and carriers are not integrated.']
 ]},
 {title:'Account & products',questions:[
  ['Do I need an account to browse?','No, you can view product listings, details and editorial pages freely. An account is needed for checkout and order history.'],
  ['How does my wishlist work?','Tap the heart on a product. Your selections are saved locally in the same browser, including when you close the page.'],
  ['How do product stock counts work?','When MongoDB Atlas is connected, stock comes from the server. Checkout validates quantities and adjusts inventory after successful order creation.'],
  ['Why does the site say sample collection?','If the API is unreachable or the collection is empty, the storefront stays browsable using local demonstration products. Live checkout requires seeded MongoDB records.']
 ]}
];
export default function FAQ(){const[opened,setOpened]=useState('0-0');const[active,setActive]=useState(0);return <div className="nl-long-page"><section className="nl-feature-page-hero nl-faq-hero"><div className="container"><div className="nl-kicker"><i/> THE HELP DESK</div><h1>We're happy<br/><em>to help.</em></h1><p>All the little details about shopping, your account and the NORTHLINE experience.</p></div></section><section className="container nl-faq-body"><aside className="nl-faq-menu"><span className="nl-kicker">HELP TOPICS</span>{groups.map((g,i)=><button key={g.title} onClick={()=>{setActive(i);setOpened(i+'-0')}} className={active===i?'active':''}>{g.title} <span>{String(i+1).padStart(2,'0')}</span></button>)}<div className="nl-faq-aside-card"><Headphones size={28}/><h3>Need more help?</h3><p>Send us a message and we'll store it in the demo support inbox.</p><Link className="nl-underline-link" to="/contact">Get in touch <ArrowUpRight size={17}/></Link></div></aside><div className="nl-faq-answers" id="shipping"><span className="nl-kicker">{String(active+1).padStart(2,'0')} / MOST ASKED</span><h2>{groups[active].title}</h2>{groups[active].questions.map(([q,a],i)=>{const selected=opened===active+'-'+i;return <div className={'nl-faq-row '+(selected?'open':'')} key={q}><button aria-expanded={selected} onClick={()=>setOpened(selected?null:active+'-'+i)}><span>{q}</span>{selected?<Minus size={19}/>:<Plus size={19}/>}</button>{selected&&<p>{a}</p>}</div>})}<div className="nl-faq-tip"><Truck size={22}/><span><strong>A note about delivery</strong><br/>This is a functional MERN internship demonstration, not an operating retailer. Orders and shipments are simulated.</span></div></div></section></div>}
