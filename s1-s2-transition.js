/* S1 → S2: the carry. One scroll RAF: read both live endpoints, calculate, then
   commit styles. Scroll sets the target; the card is drawn from the eased value
   (weaveSmooth, in index.html), so a wheel step glides instead of jumping.
   t ∈ [0,1] is the last viewport of scroll before S2 reaches the top. S1's
   completed record lifts off the thread and is carried, growing, into S2's
   pinned record: header and title on top, an empty body beneath (S2's reader
   opens it once it lands). Its start is measured from S1's live styles; its end
   from the pinned record. S2's script (window.weaveS2) owns the pin; each frame
   this hands it t, and S2 draws its thread and holds its heading back until 1.
   The carry is a function of scroll position, so scrolling back reverses it.
   Measurements are renewed on mode changes, with the record fully laid out. */
(() => {
  'use strict';
  const PICKUP=.06, JITTER=25;
  function init(){
    const hero=window.weaveHero, s2=window.weaveS2;
    if(!hero||!s2)return;
    const root=document.documentElement, section=s2.section, record=s2.record, source=hero.record;
    const view=record.querySelector('.layers-window');
    const clamp=n=>Math.max(0,Math.min(1,n));
    const smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
    const segment=(n,a,b)=>smooth((n-a)/(b-a));
    const mix=(a,b,n)=>a+(b-a)*n;
    const px=n=>`${n}px`;
    const cs=(el,pseudo)=>getComputedStyle(el,pseudo), num=(s,k)=>parseFloat(s[k])||0;
    const shadowParts=value=>value.split(/,(?![^(]*\))/).map(part=>{
      const color=(part.match(/rgba?\(([^)]+)\)/)?.[1]||'0,0,0,0').split(/[,\s/]+/).map(Number);
      return {lengths:[...part.matchAll(/(-?[\d.]+)px/g)].map(m=>+m[1]),rgb:color.slice(0,3),alpha:color[3]??1};
    });
    function copy(el){
      const clone=el.cloneNode(true);
      [clone,...clone.querySelectorAll('*')].forEach(node=>{node.removeAttribute('id');node.removeAttribute('aria-labelledby')});
      return clone;
    }
    // The carrier: S2's header and title block, S1's trail, and an empty body.
    const carry=document.createElement('div');
    carry.className='record carry-record';carry.setAttribute('aria-hidden','true');
    const head=copy(record.querySelector('.record-head'));head.classList.add('carry-head');
    const foot=document.createElement('div');foot.className='carry-foot';
    const trail=copy(source.querySelector('.record-trail'));trail.className='carry-trail';
    const dot=document.createElement('i');dot.className='carry-dot';
    foot.append(trail);carry.append(copy(record.querySelector('.record-top')),head,foot,dot);
    section.append(carry); // After the sticky frame, above the hero's stacking order.
    const endpoint=document.createElement('i');endpoint.className='receipt-endpoint';
    endpoint.setAttribute('aria-hidden','true');source.after(endpoint);
    let frame=0, metrics=null, needsMeasure=true, drawn=-1, seen=null;

    function clearMode(){
      carry.removeAttribute('style');source.style.removeProperty('opacity');record.style.removeProperty('opacity');
      endpoint.removeAttribute('style');endpoint.classList.remove('is-left');
      delete section.dataset.carry;root.classList.remove('s2-carry');
    }
    function measure(){
      clearMode();
      if(!s2.pinned){metrics=null;s2.carry(null);return}
      s2.carry(0); // The body empty, as it is when the card lands.
      // S1, in its 2048-wide artwork: computed styles are unscaled; rects carry the scale k.
      const A=source.getBoundingClientRect(), k=A.width/source.offsetWidth;
      const sb=source.querySelector('.record-top'), st=source.querySelector('h2');
      const sd=source.querySelector('.record-detail'), str=source.querySelector('.record-trail');
      const sbr=sb.getBoundingClientRect(), stail=str.getBoundingClientRect();
      const sbs=cs(sb), sts=cs(st), ss=cs(source), sa=cs(source,'::after'), sdot=cs(source,'::before'), trs=cs(str);
      const smicro=cs(sb.querySelector('.micro'));
      // S2's pinned record, landed, in its own ems.
      const rs=cs(record), F=num(rs,'fontSize');
      const tb=record.querySelector('.record-top'), th=record.querySelector('.record-head');
      const tt=th.querySelector('h3'), td=th.querySelector('p');
      const tbs=cs(tb), ths=th.getBoundingClientRect(), tms=cs(tb.querySelector('.micro'));
      // One em of the carrier: S2's title is 1.6em, so S1's title sets the start.
      const titleEm=num(cs(tt),'fontSize')/F, F1=num(sts,'fontSize')/titleEm;
      const e1=n=>n/F1, e2=n=>n/F, r1=n=>n/k/F1;
      metrics={k,F,
        from:{font:F1,gutter:e1(num(sbs,'paddingLeft')),right:e1(num(sbs,'paddingRight')),
          barTop:e1(num(sbs,'paddingTop')),barBottom:e1(num(sbs,'paddingBottom')),
          folio:e1(num(cs(sb.querySelector('.folio')),'fontSize')),micro:e1(num(smicro,'fontSize')),
          microWeight:num(smicro,'fontWeight'),microSpacing:num(smicro,'letterSpacing')/num(smicro,'fontSize'),
          head:r1(stail.top-sbr.bottom),titleY:r1(st.getBoundingClientRect().top-sbr.bottom),
          titleLead:num(sts,'lineHeight')/num(sts,'fontSize'),
          detailY:r1(sd.getBoundingClientRect().top-sbr.bottom),detailSize:e1(num(cs(sd),'fontSize')),
          foot:r1(stail.height),rule:num(ss,'borderTopWidth'),
          radius:['TopLeft','TopRight','BottomRight','BottomLeft'].map(c=>num(ss,`border${c}Radius`)),
          shadow:shadowParts(ss.boxShadow)[0]},
        to:{gutter:e2(num(tbs,'paddingLeft')),right:e2(num(tbs,'paddingRight')),
          barTop:e2(num(tbs,'paddingTop')),barBottom:e2(num(tbs,'paddingBottom')),
          folio:e2(num(cs(tb.querySelector('.folio')),'fontSize')),micro:e2(num(tms,'fontSize')),
          microWeight:num(tms,'fontWeight'),microSpacing:num(tms,'letterSpacing')/num(tms,'fontSize'),
          head:e2(ths.height),titleY:e2(tt.getBoundingClientRect().top-ths.top),
          titleLead:num(cs(tt),'lineHeight')/num(cs(tt),'fontSize'),
          detailY:e2(td.getBoundingClientRect().top-ths.top),detailSize:e2(num(cs(td),'fontSize')),
          foot:e2(view.getBoundingClientRect().height),rule:num(rs,'borderTopWidth'),
          radius:['TopLeft','TopRight','BottomRight','BottomLeft'].map(c=>num(rs,`border${c}Radius`)),
          shadow:shadowParts(rs.boxShadow)},
        dot:{left:num(sdot,'left'),top:num(sdot,'top'),size:num(sdot,'width'),border:num(sdot,'borderTopWidth')}
      };
      // S1's trail and retained sheet keep S1's proportions, in the carrier's ems.
      const tf=num(trs,'fontSize'), set=(n,v)=>carry.style.setProperty(n,v);
      set('--trail-size',e1(tf)+'em');set('--trail-line',num(trs,'lineHeight')/tf);set('--trail-gap',num(trs,'columnGap')/tf+'em');
      set('--trail-pad',['Top','Right','Bottom','Left'].map(side=>num(trs,'padding'+side)/tf+'em').join(' '));
      set('--sheet-inset',e1(num(sa,'left'))+'em');set('--sheet-bottom',e1(num(sa,'bottom'))+'em');
      set('--sheet-height',e1(num(sa,'height'))+'em');set('--sheet-border',e1(num(sa,'borderBottomWidth'))+'em');
      set('--sheet-opacity',num(sa,'opacity'));
      // Same pseudo-element geometry, in S1's unchanged artwork coordinate space.
      endpoint.style.left=px(parseFloat(source.style.getPropertyValue('--left'))+num(sdot,'left'));
      endpoint.style.top=px(parseFloat(source.style.getPropertyValue('--top'))+num(ss,'borderTopWidth')+num(sdot,'top'));
      endpoint.style.width=sdot.width;endpoint.style.height=sdot.height;
      root.classList.add('s2-carry');
    }
    function flight(a,b,t){
      const {k,F,from:s,to:m}=metrics, e=smooth(t), lift=Math.sin(Math.PI*e);
      const style=carry.style, set=(n,v)=>style.setProperty(n,v);
      // Lengths go in as px: an em inside a custom property would resolve
      // against each child's own type size, not the record's.
      const f=mix(s.font*k,F,e), em=(a,b,n=e)=>px(mix(a,b,n)*f);
      // The body opens downward once the card is clear of the thread; the
      // detail slides right while still under the title, then rises beside it,
      // and the head shortens only as it rises.
      const open=smooth((e-.2)/.7), slide=smooth((e-.05)/.55), rise=smooth((e-.62)/.38);
      style.left=px(mix(a.left,b.left,e));style.top=px(mix(a.top,b.top,e));
      style.width=px(mix(a.width,b.width,e));style.fontSize=px(f);
      style.opacity=String(segment(t,0,PICKUP));
      // S1's top rule is scaled with its artwork; an unscaled border snaps down to
      // whole device pixels. The bar beneath is the same ink, so the remainder
      // goes into its padding and every line keeps S1's position.
      const rule=mix(s.rule*k,m.rule,e), dpr=devicePixelRatio||1, snapped=Math.max(1,Math.floor(rule*dpr+.01))/dpr;
      style.borderTopWidth=px(snapped);
      style.borderRadius=s.radius.map((r,i)=>px(mix(r*k,m.radius[i],e))).join(' ');
      set('--m',e);
      set('--gutter',em(s.gutter,m.gutter));set('--pr',em(s.right,m.right));
      set('--tp1',px(mix(s.barTop,m.barTop,e)*f+rule-snapped));set('--tp2',em(s.barBottom,m.barBottom));
      set('--ff',em(s.folio,m.folio));set('--fm',em(s.micro,m.micro));
      set('--fw',mix(s.microWeight,m.microWeight,e));set('--fl',mix(s.microSpacing,m.microSpacing,e)+'em');
      set('--hh',em(s.head,m.head,rise));
      set('--h3y',em(s.titleY,m.titleY));set('--lh',mix(s.titleLead,m.titleLead,e));
      set('--ps',slide);set('--py',em(s.detailY,m.detailY,rise));
      set('--pf',em(s.detailSize,m.detailSize));
      set('--fh',em(s.foot,m.foot,open));
      set('--to',1-clamp((e-.3)/.25));set('--lo',clamp((e-.55)/.35));
      // S1's shadow on the photo (--overlay) → a lifted sheet mid-flight → S2's
      // resting shadow on paper (--ink). S1's is blended into S2's widest one.
      const wide=m.shadow.reduce((w,p,i)=>p.lengths[2]>m.shadow[w].lengths[2]?i:w,0);
      style.boxShadow=m.shadow.map((rest,i)=>{
        const src=i===wide?{lengths:s.shadow.lengths.map(n=>n*k),rgb:s.shadow.rgb,alpha:s.shadow.alpha}:{lengths:[0,0,0,0],rgb:rest.rgb,alpha:0};
        const lengths=rest.lengths.map((n,j)=>mix(src.lengths[j]||0,n,e)+(i===wide?(j===1?30*lift:j===2?48*lift:0):0));
        const rgb=rest.rgb.map((n,j)=>mix(src.rgb[j],n,e));
        return `${lengths.map(px).join(' ')} rgb(${rgb.join(' ')} / ${mix(src.alpha,rest.alpha,e)+(i===wide?.1*lift:0)})`;
      }).join(',');
      // S1's entry dot, carried at S1's scale while it fades off the lifting card.
      const d=metrics.dot;
      set('--dot-left',px(d.left*k));set('--dot-top',px((d.top+s.rule)*k-snapped));
      set('--dot-size',px(d.size*k));set('--dot-border',px(d.border*k));
      set('--dot-opacity',1-segment(e,0,.12));
    }
    // One frame of the carry at progress t (eased). READ: the section's unshifted
    // top and both live endpoints. WRITE: the carrier, then S2 (which gets the top
    // read here, so it reads nothing after these writes).
    function draw(t){
      if(!metrics)return;
      const top=s2.top, a=source.getBoundingClientRect(), b=record.getBoundingClientRect();
      const complete=hero.complete;
      if(t>0&&t<1&&complete)flight(a,b,t);else carry.style.opacity='0';
      // The carrier fades in on top; S1's card stays solid beneath until it is covered.
      source.style.opacity=t>=PICKUP&&complete?'0':'';
      record.style.opacity=t<1?'0':'';
      endpoint.classList.toggle('is-left',t>=PICKUP&&complete);
      section.dataset.carry=t===0?'source':t<1?'travelling':'landed';
      drawn=t;
      s2.carry(t,top);
    }
    const glide=weaveSmooth(draw);
    function update(){
      frame=0;
      const remeasured=needsMeasure;
      if(needsMeasure){needsMeasure=false;drawn=-1;measure()}
      // The section's unshifted top and the scroll position, as the scroll event read
      // them (before this frame's writes); read now after a re-measure or without one.
      const [top,y]=(!remeasured&&seen)||[s2.top,scrollY], docTop=top+y;
      seen=null;
      // The runway is one viewport, or less when S1 is shorter than the screen.
      const runway=Math.min(innerHeight,docTop)||1, travelled=y-(docTop-runway);
      // The last CSS pixel before the pin already counts as landed (S2 draws it
      // at its landed position): both integer scroll samples around a fractional
      // section boundary show the native record, never the carrier.
      const t=top<=1?1:clamp(1-top/runway);
      // WRITE: a visitor who scrolls on early (or reloads past the hero) gets the
      // finished record, not a half-played one; small jitter is ignored.
      if((s2.pinned&&travelled>JITTER)||y>=docTop)hero.finish();
      // Resting at either end (the top of the page, anywhere past the landing)
      // there is nothing to redraw.
      if(!metrics||(t===drawn&&(t===0||t===1)))return;
      glide(t);
    }
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
    const mode=()=>{needsMeasure=true;schedule()};
    // Scroll events are dispatched before the frame's rAF callbacks, while layout is
    // still clean: the position is read here, and the frame only writes.
    const onScroll=()=>{seen=[s2.top,scrollY];schedule()};
    // The scroll handler only runs while S1 or S2 is on screen: past them the record
    // has landed and nothing changes. Leaving settles it.
    const near=new Set();
    const watch=new IntersectionObserver(entries=>{
      for(const entry of entries)entry.isIntersecting?near.add(entry.target):near.delete(entry.target);
      if(near.size)addEventListener('scroll',onScroll,{passive:true});else removeEventListener('scroll',onScroll);
      schedule();
    });
    watch.observe(section);watch.observe(source.closest('.hero'));
    addEventListener('pageshow',schedule);
    // S2 re-decides its pin on resize, media changes and font loading, then says so.
    section.addEventListener('s2:mode',mode);
    // Both S1's resize observer and S2's pin register first; the carry settles before paint.
    update();
  }
  // S2's script may come after this one; its bridge is ready by DOMContentLoaded.
  if(window.weaveS2)init();else addEventListener('DOMContentLoaded',init,{once:true});
})();
