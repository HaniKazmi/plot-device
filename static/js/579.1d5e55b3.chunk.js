"use strict";(self.webpackChunkplot_device=self.webpackChunkplot_device||[]).push([[579],{5017:function(t,e,n){var r=n(29439),a=n(13967),i=n(57621),o=n(39504),s=n(9688),c=n(89118),l=n(80184),u=function(t){return Object.entries(t).reduce((function(t,e){var n=(0,r.Z)(e,2),a=n[0],i=n[1],o=i.color,s=i.data;t[a]={color:o,data:{}};for(var l=0,u=Object.keys(s).sort()[0].split("-").map((function(t){return parseInt(t)})),d=(0,r.Z)(u,2),h=d[0],f=d[1],p=h;p<=c.zs;p++)for(var x=p===h?f:1;x<=(p===c.zs?c.M7+1:12);x++){var v=p+"-"+(x<10?"0":"")+x;l=t[a].data[v]=l+(s[v]||0)}return t}),{})};e.Z=function(t){var e,n=t.grouped,c=(t.colours,t.cumulative),d=t.stack,h=t.children,f=(0,a.Z)();return c?(e=u(n),d=!0):e=n,(0,l.jsxs)(i.Z,{children:[h,(0,l.jsx)(o.Z,{children:(0,l.jsx)(s.Z,{style:{width:"100%",height:"95vh"},data:Object.entries(e).map((function(t){var n=(0,r.Z)(t,2),a=n[0],i=n[1],o=i.color,s=i.data;return{type:c||!d?"scatter":"bar",name:a,x:Object.keys(s),y:Object.values(s),stackgroup:d?"*":void 0,marker:{color:1===Object.entries(e).length?f.palette.primary.main:o}}})),config:{displayModeBar:!1,responsive:!0},layout:{showlegend:Object.keys(n).length>1&&Object.keys(n).length<8,legend:{x:0,y:1,orientation:"h"},barmode:d?"stack":void 0,margin:{l:40,r:0,t:0,b:40},xaxis:{tickmode:"array"},paper_bgcolor:"dark"===f.palette.mode?"rgba(0,0,0,0)":void 0,plot_bgcolor:"dark"===f.palette.mode?"rgba(0,0,0,0)":void 0,font:{color:f.palette.text.primary}}})})]})}},92073:function(t,e,n){n.d(e,{T:function(){return h}});var r=n(1413),a=n(29439),i=n(45987),o=n(42169),s=n(81918),c=n(29818),l=n(72791),u=n(80184),d=["image","alt","chip"],h=function(t){var e=t.image,n=t.alt,h=t.chip,f=(0,i.Z)(t,d),p=(0,l.useState)(!1),x=(0,a.Z)(p,2),v=x[0],m=x[1];return(0,u.jsxs)(u.Fragment,{children:[(0,u.jsxs)("div",{style:{position:"relative",height:f.height,width:f.width},children:[(0,u.jsx)(o.Z,(0,r.Z)({component:"img",src:e,alt:n,onClick:function(){return m(!0)}},f)),h&&(0,u.jsx)(s.Z,{sx:{position:"absolute",top:0,right:0,margin:1,opacity:.8,bgcolor:h[1],color:function(t){return h[1]&&t.palette.getContrastText(h[1])}},label:h[0],variant:"filled",size:"small"})]}),(0,u.jsx)(c.Z,{open:v,onClose:function(){return m(!1)},maxWidth:!1,PaperProps:{sx:{backgroundColor:"unset",boxShadow:"unset",backgroundImage:"unset"}},children:(0,u.jsx)("img",{style:{maxHeight:"calc(100vh - 64px)",objectFit:"contain",maxWidth:"100%",width:"100vw"},src:e,alt:n,onClick:function(){return m(!1)}})})]})}},95277:function(t,e,n){var r=n(29439),a=n(9585),i=n(79012),o=n(85523),s=n(91440),c=n(39504),l=n(57621),u=n(29818),d=n(34729),h=n(72791),f=n(92073),p=n(80184);e.Z=function(t){var e=t.title,n=t.data,x=t.width,v=t.colour,m=(0,h.useState)(!1),g=(0,r.Z)(m,2),j=g[0],Z=g[1],b=(0,h.useState)(!1),y=(0,r.Z)(b,2),k=y[0],w=y[1];if((0,h.useEffect)((function(){return w(!0)}),[]),!k)return null;var S=n.filter((function(t){return t.banner})).sortByKey("startDate"),C=(0,p.jsxs)(p.Fragment,{children:[(0,p.jsx)(a.Z,{title:e,action:(0,p.jsx)(i.Z,{row:!0,children:(0,p.jsx)(o.Z,{label:"Maximise",control:(0,p.jsx)(s.Z,{checked:j,onChange:function(t,e){return Z(e)}})})})}),(0,p.jsx)(c.Z,{children:(0,p.jsx)(d.Z,{container:!0,spacing:1,alignItems:"center",children:S.map((function(t){return(0,p.jsx)(d.Z,{alignSelf:"stretch",xs:j?12:x,children:(0,p.jsx)(l.Z,{sx:{height:"100%",borderColor:v&&v(t)+90,borderStyle:v&&"solid",borderWidth:v&&3},children:(0,p.jsx)(f.T,{image:t.banner,height:"100%",alt:t.name})})},t.name)}))})})]});return(0,p.jsxs)(l.Z,{children:[C,(0,p.jsx)(u.Z,{open:j,fullScreen:!0,children:C})]})}},21488:function(t,e,n){n.d(e,{R:function(){return x},Z:function(){return v}});var r=n(29439),a=n(20890),i=n(36314),o=n(94721),s=n(57621),c=n(9585),l=n(39504),u=n(95193),d=n(34729),h=n(27222),f=n(92073),p=n(80184),x=function(t){var e=t.icon,n=t.title,u=t.content,f="string"===typeof u?(0,p.jsx)(a.Z,{align:"right",variant:"h4",children:u}):(0,p.jsx)(i.Z,{divider:(0,p.jsx)(o.Z,{orientation:"vertical",flexItem:!0}),justifyContent:"space-evenly",direction:"row",children:u.map((function(t){var e=(0,r.Z)(t,2),n=e[0],o=e[1];return(0,p.jsxs)(i.Z,{direction:"column",flex:"1 1 0",children:[(0,p.jsx)(a.Z,{align:"center",variant:"h5",children:(0,h.W)(o)}),(0,p.jsx)(a.Z,{align:"center",sx:{fontSize:14},color:"text.secondary",children:n})]},n)}))});return(0,p.jsx)(d.Z,{xs:12,sm:6,md:3,children:(0,p.jsxs)(s.Z,{sx:{height:"100%"},children:[(0,p.jsx)(c.Z,{titleTypographyProps:{variant:"h6"},title:n,avatar:e,sx:{paddingBottom:"5px"}}),(0,p.jsx)(l.Z,{sx:{paddingTop:"5px"},children:f})]})})},v=function(t){var e=t.icon,n=t.title,r=t.content,h=t.labelComponent,x=t.chipComponent,v=t.width,m=void 0===v?[12,12,6]:v,g=t.pictureWidth,j=void 0===g?[12,4,6]:g,Z=t.aspectRatio,b=t.divider,y=(0,p.jsx)(o.Z,{orientation:"vertical",flexItem:!0});(0,u.Z)((function(t){return t.breakpoints.down("md")}));return(0,p.jsx)(d.Z,{xs:m[0],sm:m[1],md:m[2],children:(0,p.jsxs)(s.Z,{sx:{height:"100%"},children:[(0,p.jsx)(c.Z,{titleTypographyProps:{variant:"h6"},title:n,avatar:e}),(0,p.jsx)(l.Z,{children:(0,p.jsx)(d.Z,{container:!0,sx:{overflow:"auto",flexWrap:{xs:"nowrap",md:12===m[2]?"nowrap":"wrap"}},spacing:1,alignItems:"center",children:r.map((function(t){var e,r;Array.isArray(t)?(e=t[0],r=t[1]):(e=t,r=t);var o=null===x||void 0===x?void 0:x(r);return(0,p.jsx)(d.Z,{flexShrink:0,alignSelf:"stretch",xs:j[0],sm:j[1],md:j[2],children:(0,p.jsxs)(s.Z,{variant:"outlined",sx:{height:"100%",bgcolor:o&&o[1]+80},children:[(0,p.jsx)(f.T,{image:e.banner,width:"100%",sx:{aspectRatio:Z,flexShrink:0},alt:e.name,chip:o}),(0,p.jsx)(l.Z,{sx:{padding:"10px",":last-child":{paddingBottom:"10px"}},children:h(r).map((function(t,r,o){return(0,p.jsx)(i.Z,{justifyContent:"space-between",alignItems:"baseline",direction:"row",divider:1===o.length||b?y:null,children:t.map((function(t){return(0,p.jsx)(a.Z,{variant:"subtitle2",color:"text.secondary",children:t},t)}))},"".concat(n,"-stacks-").concat(e.name,"-").concat(r))}))})]})},e.name)}))})})]})})}},34824:function(t,e,n){var r=n(37762),a=n(29439),i=n(13967),o=n(64554),s=n(57621),c=n(39504),l=n(72791),u=n(86140),d=n(80184);e.Z=function(t){var e=t.data,n=t.children,h=(0,l.useState)("90vh"),f=(0,a.Z)(h,2),p=f[0],x=f[1],v=(0,i.Z)(),m=(0,l.useCallback)((function(){var t,e=document.getElementsByTagName("text"),n=(0,r.Z)(e);try{for(n.s();!(t=n.n()).done;){var a=t.value;"middle"===a.getAttribute("text-anchor")&&a.setAttribute("fill",v.palette.text.secondary)}}catch(u){n.e(u)}finally{n.f()}var i,o=document.getElementsByTagName("rect"),s=(0,r.Z)(o);try{for(s.s();!(i=s.n()).done;){var c=i.value;if("#9a9a9a"===c.getAttribute("stroke")){var l=c.height.baseVal.value+50;x(l<.9*document.documentElement.clientHeight?l:"90vh")}}}catch(u){s.e(u)}finally{s.f()}}),[v.palette.text.secondary]);return(0,l.useEffect)((function(){return window.addEventListener("resize",m),function(){return window.removeEventListener("resize",m)}}),[m]),(0,d.jsx)(o.Z,{sx:{".backgroundPaper":{backgroundColor:"background.paper"}},children:(0,d.jsxs)(s.Z,{children:[n,(0,d.jsx)(c.Z,{children:(0,d.jsx)("div",{style:{overflowX:"auto",overflowY:"hidden"},children:(0,d.jsx)(u.ZP,{width:"400vw",height:p,chartType:"Timeline",data:[[{type:"string",id:"*"},{type:"string",id:"Name"},{type:"string",role:"tooltip"},{type:"date",id:"Start"},{type:"date",id:"End"}]].concat(e),onLoad:function(){setTimeout(m,50)},chartEvents:[{eventName:"ready",callback:m}],options:{backgroundColor:"dark"===v.palette.mode?v.palette.grey.A700:void 0,timeline:{rowLabelStyle:{color:v.palette.text.primary}}}},p)})})]})})}},9688:function(t,e,n){var r=n(49703),a=n.n(r),i=n(54301),o=n.n(i),s=n(92640),c=n.n(s),l=n(12067);e.Z=(a().register([o(),c()]),(0,l.Z)(a()))},11579:function(t,e,n){n.r(e),n.d(e,{default:function(){return L}});var r=n(36314),a=n(95277),i=n(29439),o=n(9585),s=n(79012),c=n(85523),l=n(91440),u=n(72791),d=n(33727),h=n(5017),f=n(80184),p={name:!1,status:!0,none:!1},x=function(t,e,n,r){var a=t.reduce((function(t,a){var o,s,c,l=(0,i.Z)(a,2),u=l[0],d=l[1],h="none"===e?"":u[e],f=r?null===(o=d.startDate)||void 0===o?void 0:o.toISOString().substring(0,7):null===(s=d.startDate)||void 0===s?void 0:s.getFullYear().toString();return f&&d.minutes?(null!==(c=t[h])&&void 0!==c||(t[h]={color:"",data:{}}),t[h].data[f]=(t[h].data[f]||0)+("Episodes"===n?d.e:d.minutes),t):t}),{});return"Hours"===n&&Object.values(a).forEach((function(t){var e=t.data;return Object.entries(e).forEach((function(t){var n=(0,i.Z)(t,2),r=n[0],a=n[1];return e[r]=Math.floor(a/60)}))})),a},v=function(t){var e=t.data,n=t.measure,a=(0,u.useState)("none"),v=(0,i.Z)(a,2),m=v[0],g=v[1],j=(0,u.useState)(!1),Z=(0,i.Z)(j,2),b=Z[0],y=Z[1],k=(0,u.useState)(!0),w=(0,i.Z)(k,2),S=w[0],C=w[1],D=e.flatMap((function(t){return t.s.map((function(e){return[t,e]}))})),E=x(D,m,n,b);return(0,f.jsx)(h.Z,{grouped:E,cumulative:b,stack:S,children:(0,f.jsx)(o.Z,{title:"Episodes"===n?"Episodes Watched":"Hours Watched",action:(0,f.jsxs)(s.Z,{children:[(0,f.jsx)(d.j,{options:Object.keys(p),value:m,setValue:g}),(0,f.jsxs)(r.Z,{direction:"row",children:[(0,f.jsx)(c.Z,{label:"Cumulative",control:(0,f.jsx)(l.Z,{checked:b,onChange:function(t,e){return y(e)}})}),(0,f.jsx)(c.Z,{label:"Stack",control:(0,f.jsx)(l.Z,{checked:S,onChange:function(t,e){return C(e)},disabled:b})})]})]})})})},m=n(77019),g=n(54091),j=n(88529),Z=n(80485),b=n(31185),y=n(76923),k=n(34729),w=n(89118),S=n(27222),C=n(21488),D=function(t){var e=t.data,n=e.length,r=e.sum("e"),a=Math.floor(e.sum("minutes")/60);return(0,f.jsx)(C.R,{icon:(0,f.jsx)(m.Z,{}),title:"All Time",content:[["Shows",n],["Episodes",r],["Hours",a]]})},E=function(t){var e=t.data.flatMap((function(t){return t.s})).filter((function(t){return t.startDate.getFullYear()===w.zs})),n=e.length,r=e.sum("e"),a=Math.floor(e.sum("minutes")/60);return(0,f.jsx)(C.R,{icon:(0,f.jsx)(g.Z,{}),title:"This Year So Far",content:[["Seasons",n],["Episodes",r],["Hours",a]]})},M=function(t){var e=t.data.flatMap((function(t){return t.s})).reduce((function(t,e){var n,r=e.startDate.getFullYear().toString();return r&&e.minutes?(null!==(n=t[r])&&void 0!==n||(t[r]=[0,0,0]),t[r]=[t[r][0]+1,t[r][1]+e.e,t[r][2]+e.minutes],t):t}),{}),n=Math.floor(Object.values(e).sum(0)/Object.keys(e).length),r=Math.floor(Object.values(e).sum(1)/Object.keys(e).length),a=Math.floor(Object.values(e).sum(2)/Object.keys(e).length/60);return(0,f.jsx)(C.R,{icon:(0,f.jsx)(j.Z,{}),title:"Averages Per Year",content:[["Seasons",n],["Episodes",r],["Hours",a]]})},O=function(t){var e=t.data,n=e.flatMap((function(t){return t.s})),r=Math.round(n.length/e.length),a=Math.round(n.sum("e")/e.length),i=Math.floor(n.sum("minutes")/60/e.length);return(0,f.jsx)(C.R,{icon:(0,f.jsx)(Z.Z,{}),title:"Averages Per Show",content:[["Seasons",r],["Episodes",a],["Hours",i]]})},T=function(t){var e=t.data.flatMap((function(t){return t.s.map((function(e){return[t,e]}))})).filter((function(t){return(0,i.Z)(t,2)[1].endDate})).sort((function(t,e){var n=(0,i.Z)(t,2)[1],r=(0,i.Z)(e,2)[1];return n.endDate<r.endDate?1:-1})).slice(0,6);return(0,f.jsx)(C.Z,{icon:(0,f.jsx)(b.Z,{}),title:"Recently Finished",content:e,width:[12,12,12],pictureWidth:[6,4,2],labelComponent:W})},W=function(t){var e;return[["S ".concat(t.s),(null===(e=t.endDate)||void 0===e?void 0:e.toLocaleDateString(void 0,{month:"short",year:"numeric",day:"numeric"}))||""],["".concat(t.e," Eps"),"".concat((0,S.W)(Math.round(t.minutes/60))," Hours")]]},H=function(t){var e=t.data.filter((function(t){return"Watching"===t.status})).map((function(t){return[t,t.s.at(-1)]})).filter((function(t){var e=(0,i.Z)(t,2);e[0];return!e[1].endDate})).sort((function(t,e){var n=(0,i.Z)(t,2)[1],r=(0,i.Z)(e,2)[1];return n.startDate<r.startDate?1:-1}));return(0,f.jsx)(C.Z,{icon:(0,f.jsx)(y.Z,{}),title:"Currently Watching",content:e,width:[12,12,12],pictureWidth:[6,4,2],labelComponent:A})},A=function(t){var e;return[["S ".concat(t.s),(null===(e=t.startDate)||void 0===e?void 0:e.toLocaleDateString())||""]]},I=function(t){var e=t.data;return(0,f.jsxs)(k.Z,{container:!0,spacing:1,alignItems:"stretch",children:[(0,f.jsx)(D,{data:e}),(0,f.jsx)(E,{data:e}),(0,f.jsx)(M,{data:e}),(0,f.jsx)(O,{data:e}),(0,f.jsx)(T,{data:e}),(0,f.jsx)(H,{data:e})]})},P=n(34824),F=function(t,e,n){var r;return'\n  <div style="display: flex;" class="backgroundPaper">\n    '.concat(n?'<img src="'.concat(n,'" style="height: 150px" /><hr />'):"",'  \n    <div>     \n      <ul style="list-style-type: none;padding: 5px">\n        <li>\n          <span><b>').concat(t,'</b></span>\n        </li>\n      </ul>\n      <hr />\n      <ul style="list-style-type: none;padding-left: 10px">\n        <li>\n          <span><b>Hours: </b></span>\n          <span">').concat(Math.round(e.minutes/60),"</span>\n        </li>\n        <li>\n          <span><b>Period: </b></span>\n          <span>").concat(e.startDate.toLocaleDateString()," - ").concat(null===(r=e.endDate)||void 0===r?void 0:r.toLocaleDateString()," </span>\n        </li>\n        <li>\n          <span><b>Episodes: </b></span>\n          <span>").concat(e.e,"</span>\n        </li>\n      </ul>\n    </div>     \n  </div>\n  ")},z=function(t){var e=t.data,n=(0,u.useState)(!0),r=(0,i.Z)(n,2),a=r[0],d=r[1],h=(a?e.map((function(t){return[t.name,t,t.banner]})):e.flatMap((function(t){return t.s.map((function(e){return["".concat(t.name," - S").concat(e.s),e,t.banner]}))}))).map((function(t){var e=(0,i.Z)(t,3),n=e[0],r=e[1],a=e[2];return["*",n,F(n,r,a),r.startDate,r.endDate||w.zr]}));return(0,f.jsx)(P.Z,{data:h,children:(0,f.jsx)(o.Z,{title:"Timeline",action:(0,f.jsx)(s.Z,{row:!0,children:(0,f.jsx)(c.Z,{label:"Combine Seasons",control:(0,f.jsx)(l.Z,{checked:a,onChange:function(t,e){return d(e)}})})})})})},L=function(t){var e=t.data;return(0,f.jsxs)(r.Z,{spacing:2,children:[(0,f.jsx)(I,{data:e}),(0,f.jsx)(z,{data:e}),(0,f.jsx)(v,{data:e,measure:"Hours"}),(0,f.jsx)(a.Z,{title:"All Shows",data:e,width:3})]})}},27222:function(t,e,n){n.d(e,{W:function(){return r}});var r=(new Intl.NumberFormat).format},33727:function(t,e,n){n.d(e,{j:function(){return o}});var r=n(70118),a=n(64387),i=n(80184),o=function(t){var e=t.options,n=t.value,o=t.setValue;return(0,i.jsx)(r.Z,{variant:"standard",value:n,onChange:function(t){return o(t.target.value)},children:e.map((function(t){return(0,i.jsx)(a.Z,{value:t,children:t},t)}))})}}}]);
//# sourceMappingURL=579.1d5e55b3.chunk.js.map