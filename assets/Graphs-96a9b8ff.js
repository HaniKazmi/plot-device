import{r as u,_ as W,b as v,c as R,j as e,s as P,g as lt,e as ct,f as it,h as E,i as ut,u as dt,k as pt,l as ht,d as I,C as A,T as b,a as S,E as K,m as xt}from"./index-89341689.js";import{a as jt,D as h,c as mt,T as V,b as gt,d as Y,e as ft,f as F,U as yt,g as Ct,A as bt,P as vt,i as Dt,h as St,j as kt,C as B,m as Tt,F as M,S as q,B as Rt,k as Pt,l as Ft}from"./Timeline-c3f46296.js";import{a as $t,c as Gt,G as L,s as X,b as D,r as Et,d as Z,M as J,T as It,p as zt,i as At,F as k,S as T}from"./types-435a9cd5.js";import{a as Q,C as Bt}from"./index-26443084.js";import{S as H}from"./Stack-b7372bf3.js";import{F as tt}from"./FormControl-f5d53eaf.js";const Mt=["ownerState"];function et(t){return u.forwardRef(function(a,n){const l=W(a,Mt);return u.createElement(t,v({},l,{ref:n}))})}const Lt=R(e.jsx("path",{d:"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"}),"RadioButtonUnchecked"),Ht=R(e.jsx("path",{d:"M8.465 8.465C9.37 7.56 10.62 7 12 7C14.76 7 17 9.24 17 12C17 13.38 16.44 14.63 15.535 15.535C14.63 16.44 13.38 17 12 17C9.24 17 7 14.76 7 12C7 10.62 7.56 9.37 8.465 8.465Z"}),"RadioButtonChecked"),_t=P("span")({position:"relative",display:"flex"}),Vt=P(Lt)({transform:"scale(1)"}),Yt=P(Ht)(({theme:t,ownerState:s})=>v({left:0,position:"absolute",transform:"scale(0)",transition:t.transitions.create("transform",{easing:t.transitions.easing.easeIn,duration:t.transitions.duration.shortest})},s.checked&&{transform:"scale(1)",transition:t.transitions.create("transform",{easing:t.transitions.easing.easeOut,duration:t.transitions.duration.shortest})}));function st(t){const{checked:s=!1,classes:a={},fontSize:n}=t,l=v({},t,{checked:s});return e.jsxs(_t,{className:a.root,ownerState:l,children:[e.jsx(Vt,{fontSize:n,className:a.background,ownerState:l}),e.jsx(Yt,{fontSize:n,className:a.dot,ownerState:l})]})}const wt=u.createContext(void 0),Ot=wt;function Ut(){return u.useContext(Ot)}function Nt(t){return ct("MuiRadio",t)}const Wt=lt("MuiRadio",["root","checked","disabled","colorPrimary","colorSecondary","sizeSmall"]),w=Wt,Kt=["checked","checkedIcon","color","icon","name","onChange","size","className"],qt=t=>{const{classes:s,color:a,size:n}=t,l={root:["root",`color${E(a)}`,n!=="medium"&&`size${E(n)}`]};return v({},s,ht(l,Nt,s))},Xt=P($t,{shouldForwardProp:t=>it(t)||t==="classes",name:"MuiRadio",slot:"Root",overridesResolver:(t,s)=>{const{ownerState:a}=t;return[s.root,s[`color${E(a.color)}`]]}})(({theme:t,ownerState:s})=>v({color:(t.vars||t).palette.text.secondary},!s.disableRipple&&{"&:hover":{backgroundColor:t.vars?`rgba(${s.color==="default"?t.vars.palette.action.activeChannel:t.vars.palette[s.color].mainChannel} / ${t.vars.palette.action.hoverOpacity})`:ut(s.color==="default"?t.palette.action.active:t.palette[s.color].main,t.palette.action.hoverOpacity),"@media (hover: none)":{backgroundColor:"transparent"}}},s.color!=="default"&&{[`&.${w.checked}`]:{color:(t.vars||t).palette[s.color].main}},{[`&.${w.disabled}`]:{color:(t.vars||t).palette.action.disabled}}));function Zt(t,s){return typeof s=="object"&&s!==null?t===s:String(t)===String(s)}const O=e.jsx(st,{checked:!0}),U=e.jsx(st,{}),Jt=u.forwardRef(function(s,a){var n,l;const o=dt({props:s,name:"MuiRadio"}),{checked:i,checkedIcon:c=O,color:r="primary",icon:d=U,name:y,onChange:p,size:x="medium",className:m}=o,g=W(o,Kt),j=v({},o,{color:r,size:x}),C=qt(j),f=Ut();let $=i;const rt=Gt(p,f&&f.onChange);let G=y;return f&&(typeof $>"u"&&($=Zt(f.value,o.value)),typeof G>"u"&&(G=f.name)),e.jsx(Xt,v({type:"radio",icon:u.cloneElement(d,{fontSize:(n=U.props.fontSize)!=null?n:x}),checkedIcon:u.cloneElement(c,{fontSize:(l=O.props.fontSize)!=null?l:x}),ownerState:j,classes:C,name:G,checked:$,onChange:rt,ref:a,className:pt(C.root,m)},g))}),at=Jt,Qt=R(e.jsx("path",{d:"M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"}),"VideogameAsset"),te=R(e.jsx("path",{d:"M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"}),"Whatshot"),ot=({item:t,...s})=>e.jsx(jt,{alt:t.name,image:t.banner,detailComponent:a=>{var n,l,o;return e.jsx(Q,{sx:{background:a,color:i=>a&&i.palette.getContrastText(a)},children:e.jsxs(L,{container:!0,spacing:1,children:[e.jsx(ee,{colour:a,item:t}),e.jsx(h,{colour:a,label:"Start Date",value:t.exactDate?t.startDate.toLocaleDateString():(n=t.startDate)==null?void 0:n.getFullYear()}),e.jsx(h,{colour:a,label:"End Date",value:t.exactDate?(l=t.endDate)==null?void 0:l.toLocaleDateString():(o=t.endDate)==null?void 0:o.getFullYear()}),e.jsx(h,{colour:a,label:"Days To Beat",value:t.exactDate?t.numDays:void 0}),e.jsx(h,{colour:a,label:"Hours",value:t.hours}),e.jsx(h,{colour:X(t),label:"Status",value:t.status}),e.jsx(h,{colour:D(t),label:"Platform",value:t.platform}),e.jsx(h,{colour:a,label:"Release Date",value:t.releaseDate.toLocaleDateString()}),e.jsx(h,{colour:a,label:"Format",value:t.format}),e.jsx(h,{colour:a,label:"Developer",value:t.developer}),e.jsx(h,{colour:a,label:"Publisher",value:t.publisher}),e.jsx(h,{colour:a,label:"Franchise",value:t.franchise}),e.jsx(h,{colour:Et(t),label:"PEGI",value:t.rating}),e.jsx(h,{colour:a,label:"Genre",value:t.genre}),e.jsx(h,{large:!0,colour:a,label:"Themes",value:t.theme.join(" - ")})]})})},...s}),z=new Date(2004,0,1),N=I(z,A),ee=({colour:t,item:s})=>{if(!s.startDate||s.startDate<z)return null;const a=s.endDate?s.exactDate?s.endDate:new Date(s.startDate.getFullYear(),s.startDate.getMonth()+1,s.startDate.getDay()):A,l=I(z,s.startDate)/N*100,o=Math.max((s.numDays??I(s.startDate,a))/N*100,.5),i=100-o-l;return e.jsx(mt,{segments:[e.jsx(V,{percent:l},0),e.jsx(gt,{percent:o,backgroundColour:["secondary.dark","secondary.light"],tooltip:e.jsxs(e.Fragment,{children:[s.exactDate?e.jsxs(e.Fragment,{children:[e.jsxs(b,{children:["Played ",s.startDate.toLocaleDateString()," - ",a.toLocaleDateString()]}),e.jsxs(b,{children:[s.numDays," Days"]})]}):e.jsxs(b,{children:["Played in ",s.startDate.getFullYear()]}),e.jsxs(b,{children:[s.hours," Hours"]})]})},1),e.jsx(V,{percent:i},2)],colour:t})},se=({data:t,measure:s,yearType:a,yearTo:n,filterDispatch:l})=>e.jsxs(L,{container:!0,spacing:1,alignItems:"stretch",children:[e.jsx(oe,{data:t,yearTo:n,yearType:a,filterDispatch:l}),e.jsx(ne,{data:t,yearTo:n,yearType:a,filterDispatch:l}),e.jsx(re,{data:t,yearType:a}),e.jsx(le,{data:t}),e.jsx(ae,{data:t,measure:s}),e.jsx(ue,{data:t}),e.jsx(ie,{data:t}),e.jsx(ce,{data:t})]}),ae=({data:t,measure:s})=>{const a=["Beat","Playing","Endless","Abandoned"],n=["Nintendo","PlayStation","PC","iOS","Xbox"],l=o=>s=="Games"?o.length:o.sum("hours");return e.jsx(L,{xs:12,sm:12,md:8,children:e.jsxs(H,{justifyContent:"space-between",height:"100%",spacing:1,children:[e.jsx(Y,{title:"Status",icon:e.jsx(ft,{}),data:t,measureFunc:l,groupKey:"status",group:a,groupToColour:o=>X({status:o}),measureLabel:s}),e.jsx(Y,{title:"Platforms",icon:e.jsx(Qt,{}),data:t,measureFunc:l,groupKey:"company",group:n,groupToColour:o=>D({company:o}),measureLabel:s==="Games"?"Games":"Hours"})]})})},oe=({data:t,yearType:s,yearTo:a,filterDispatch:n})=>{const l=t.filter(r=>r.hours),o=l.sum("hours"),i=l.length,c=e.jsx(tt,{variant:"standard",sx:{minWidth:130,margin:0},children:e.jsx(Z,{SelectDisplayProps:{style:{padding:0}},value:a,displayEmpty:!0,onChange:r=>n({type:"updateFilter",filter:"yearTo",value:r.target.value}),renderValue:r=>e.jsx(b,{variant:"h6",children:r==S?"All Time":`Up To ${r}`}),slots:{root:et("span")},children:Array.from({length:S-K+1},(r,d)=>S-d).map(r=>e.jsx(J,{value:r,children:r},r))})});return e.jsx(F,{icon:e.jsx(It,{}),title:c,action:e.jsx(at,{size:"small",checked:s=="date",onChange:()=>n({type:"toggleYearType"})}),content:[["Games",i],["Hours",o]]})},ne=({data:t,yearTo:s,yearType:a,filterDispatch:n})=>{const l=t.filter(r=>r.startDate.getFullYear()===s&&r.hours),o=l.sum("hours"),i=l.length,c=e.jsx(tt,{variant:"standard",sx:{minWidth:120,margin:0},children:e.jsx(Z,{SelectDisplayProps:{style:{padding:0}},value:s,displayEmpty:!0,onChange:r=>n({type:"updateFilter",filter:"yearTo",value:r.target.value}),renderValue:r=>e.jsxs(b,{variant:"h6",children:["In ",r]}),slots:{root:et("span")},children:Array.from({length:S-K+1},(r,d)=>S-d).map(r=>e.jsx(J,{value:r,children:r},r))})});return e.jsx(F,{icon:e.jsx(yt,{}),title:c,action:e.jsx(at,{size:"small",checked:a=="exact",onChange:()=>n({type:"toggleYearType"})}),content:[["Games",i],["Hours",o]]})},re=({data:t,yearType:s})=>{if(s=="exact")return;const a=t.reduce((o,i)=>{var r;const c=(r=i.startDate)==null?void 0:r.getFullYear().toString();return!c||!i.hours||(o[c]??(o[c]=[0,0]),o[c]=[o[c][0]+1,o[c][1]+i.hours]),o},{}),n=parseFloat((Object.values(a).sum(0)/Object.keys(a).length).toFixed(2)),l=parseFloat((Object.values(a).sum(1)/Object.keys(a).length).toFixed(2));return e.jsx(F,{icon:e.jsx(Ct,{}),title:"Yearly Average",content:[["Games",n],["Hours",l]]})},le=({data:t})=>{const s=t.filter(l=>l.status==="Beat"&&l.hours&&l.numDays),a=Math.round(s.sum("hours")/s.length),n=Math.round(s.sum("numDays")/s.length);return e.jsx(F,{icon:e.jsx(bt,{}),title:"Game Average",content:[["Hours",a],["Days To Beat",n]]})},ce=({data:t})=>{const s=t.filter(({party:a})=>!a).filter(a=>a.hours&&a.startDate&&a.endDate).sortByKey("endDate").slice(0,6);return e.jsx(_,{icon:e.jsx(vt,{}),title:"Recently Finished",content:s,labelComponent:nt})},ie=({data:t})=>{const s=t.filter(a=>a.hours&&a.startDate&&a.endDate).sortByKey("hours").slice(0,6);return e.jsx(_,{icon:e.jsx(te,{}),title:"Most Played",content:s,labelComponent:nt})},ue=({data:t})=>{const s=t.filter(a=>a.status==="Playing").sortByKey("startDate").reverse();return s.length==0?null:e.jsx(_,{icon:e.jsx(Dt,{}),title:"Currently Playing",content:s,labelComponent:de,width:[12,12,4],pictureWidth:[12,4,12],wrap:!1})},nt=t=>{var s;return[[((s=t.endDate)==null?void 0:s.toLocaleDateString())??"",`${St(t.hours)} Hours`]]},de=t=>{var s;return[[((s=t.startDate)==null?void 0:s.toLocaleDateString())??""]]},_=t=>e.jsx(kt,{aspectRatio:"16/9",divider:!0,chipComponent:zt,landscape:!0,MediaComponent:ot,...t}),pe=t=>t.every(s=>typeof s=="string"),he=({data:t,measure:s})=>{const a=xt(),n=[u.useState("company"),u.useState("platform"),u.useState("franchise")],{ids:l,labels:o,parents:i,values:c,colours:r}=u.useMemo(()=>me(t,n.map(([d])=>d),s),[t,s,...n]);return e.jsxs(Bt,{children:[e.jsx(B,{title:"Sunburst",action:e.jsx(je,{controlStates:n})}),e.jsx(Q,{children:e.jsx(Tt,{style:{width:"100%",height:"95vh",maxHeight:"100vw"},data:[{labels:o,parents:i,values:c,ids:l,type:"sunburst",branchvalues:"total",maxdepth:3,sort:!1,marker:{line:{color:a.palette.background.paper},colors:r}}],config:{displayModeBar:!1,responsive:!0},layout:{margin:{l:0,r:0,b:0,t:0},paper_bgcolor:a.palette.mode==="dark"?"rgba(0,0,0,0)":void 0}})})]})},xe=["company","format","franchise","name","platform","publisher","genre","rating","status","startDate"],je=({controlStates:t})=>e.jsx(M,{children:t.map(([s,a],n)=>e.jsx(q,{options:xe,value:s,setValue:a},"sunburst-control-"+n))}),me=(t,s,a)=>{const n=(p,x)=>{const m=p[x];return m instanceof Date?m.getFullYear().toString():m},l=t.filter(p=>!(a==="Hours"&&p.hours===void 0)).reduce((p,x)=>{const m=s.map(j=>n(x,j));if(!pe(m))return p;let g=p;return m.forEach(j=>g=g[j]=g[j]||{}),g[x.name]=x,p},{}),o=[],i=[],c=[],r=[],d=[],y=(p,x)=>{let m=0,g="";return Object.entries(p).sort(([j],[C])=>j.localeCompare(C)).forEach(([j,C])=>{let f;At(C)?(f=a==="Hours"?C.hours:1,s[0]==="company"&&(g=D(C))):[f,g]=y(C,`${x}-${j}`),i.push(j),c.push(x),r.push(f),o.push(`${x}-${j}`),d.push(g),m+=f}),[m,g]};return y(l,""),{labels:i,parents:c,values:r,ids:o,colours:d}},ge={none:!0,company:!0,format:!0,franchise:!1,name:!1,platform:!0,developer:!1,publisher:!1,rating:!0,status:!0,genre:!0},fe=({data:t,measure:s,yearType:a})=>{const[n,l]=u.useState("company"),[o,i]=u.useState(!1),[c,r]=u.useState(!0),d=ye(t,n,s,o,a);return e.jsx(Rt,{grouped:d,cumulative:o,stack:c,children:e.jsx(B,{title:`${s} Played`,action:e.jsxs(M,{children:[e.jsx(q,{options:Object.keys(ge),value:n,setValue:l}),e.jsxs(H,{direction:"row",children:[e.jsx(k,{label:"Cumulative",control:e.jsx(T,{checked:o,onChange:(y,p)=>i(p)})}),e.jsx(k,{label:"Stack",control:e.jsx(T,{checked:c,onChange:(y,p)=>r(p),disabled:o})})]})]})})})},ye=(t,s,a,n,l)=>t.reduce((o,i)=>{var d,y;const c=s==="none"?"":i[s],r=n||l=="exact"?(d=i.startDate)==null?void 0:d.toISOString().substring(0,7):(y=i.startDate)==null?void 0:y.getFullYear().toString();return!r||!i.hours||(o[c]??(o[c]={color:s==="company"?D(i):"",data:{}}),o[c].data[r]=(o[c].data[r]||0)+(a==="Games"?1:i.hours)),o},{}),Ce=({data:t})=>{const[s,a]=u.useState(!1),[n,l]=u.useState(!1),o=s?({company:c})=>c:()=>"*",i=t.filter(({party:c})=>n||!c).filter(({exactDate:c,startDate:r})=>c&&r.getFullYear()>2014).map(c=>[o(c),c.name,be(c),c.startDate,c.endDate??A]);return e.jsx(Pt,{data:i,showRowLabels:s,children:e.jsx(B,{title:"Timeline",action:e.jsxs(M,{row:!0,children:[e.jsx(k,{label:"Group Data",control:e.jsx(T,{checked:s,onChange:(c,r)=>a(r)})}),e.jsx(k,{label:"Party",control:e.jsx(T,{checked:n,onChange:(c,r)=>l(r)})})]})})})},be=t=>{var s,a;return`
<div style="display: flex; border: 1px solid black; background-color: ${D(t)}" class="backgroundPaper">
  <div style="flex: 0.6; white-space:nowrap; padding: 10px; "> 
    <b>${t.name}</b><br> 
    <hr />
    Hours: ${t.hours}<br> 
    Period: ${(s=t.startDate)==null?void 0:s.toLocaleDateString()} - ${((a=t.endDate)==null?void 0:a.toLocaleDateString())??"present"}<br> 
    Days: ${t.numDays??"-"}
  </div>
  ${t.banner?`
      <div style="flex: 1; min-width: 200px">
        <img src="${t.banner}"
        style="max-width: 100%; max-height: 200px;"> 
      </div>
   `:""}
</div>
`},Pe=({vgData:t,filterState:s,filterDispatch:a})=>t.length>0?e.jsxs(H,{spacing:2,children:[e.jsx(se,{data:t,yearType:s.yearType,yearTo:s.yearTo,measure:s.measure,filterDispatch:a}),e.jsx(Ce,{data:t}),e.jsx(he,{data:t,measure:s.measure}),e.jsx(fe,{data:t,measure:s.measure,yearType:s.yearType}),e.jsx(Ft,{MediaComponent:ot,title:"All Games",data:t,width:4,colour:D})]}):e.jsx(b,{variant:"h1",textAlign:"center",children:"No Data Found"});export{Pe as default};
//# sourceMappingURL=Graphs-96a9b8ff.js.map