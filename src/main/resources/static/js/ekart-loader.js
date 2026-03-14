/* Ekart Global Page Loader */
(function(){
  function addCSS(){
    if(document.getElementById('el_css'))return;
    var s=document.createElement('style');
    s.id='el_css';
    s.innerHTML='#ekart_loader{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;background:rgba(5,8,20,.93);display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px}'
      +'#ekart_loader.show{display:flex}'
      +'.el_ring{width:52px;height:52px;border:3px solid rgba(245,168,0,.2);border-top:3px solid #f5a800;border-radius:50%;animation:elS .75s linear infinite}'
      +'.el_icon{font-size:2.2rem;animation:elB .9s ease-in-out infinite}'
      +'.el_text{font-family:Poppins,sans-serif;font-size:.9rem;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.06em}'
      +'.el_dots span{display:inline-block;color:#f5a800;animation:elD 1.2s infinite}'
      +'.el_dots span:nth-child(2){animation-delay:.2s}.el_dots span:nth-child(3){animation-delay:.4s}'
      +'@keyframes elS{to{transform:rotate(360deg)}}'
      +'@keyframes elB{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}'
      +'@keyframes elD{0%,80%,100%{opacity:0}40%{opacity:1}}';
    document.head.appendChild(s);
  }

  function addHTML(){
    if(document.getElementById('ekart_loader'))return;
    var d=document.createElement('div');
    d.id='ekart_loader';
    d.innerHTML='<div class="el_icon">&#128722;</div><div class="el_ring"></div><div class="el_text">Please wait<span class="el_dots"><span>.</span><span>.</span><span>.</span></span></div>';
    document.body.appendChild(d);
  }

  var timer;
  function show(){
    var el=document.getElementById('ekart_loader');
    if(el){el.classList.add('show');}
    clearTimeout(timer);
    timer=setTimeout(hide,8000);
  }
  function hide(){
    var el=document.getElementById('ekart_loader');
    if(el){el.classList.remove('show');}
  }

  document.addEventListener('click',function(e){
    var a=e.target.closest('a[href]');
    if(!a)return;
    var h=a.getAttribute('href')||'';
    if(!h||h[0]==='#'||h.indexOf('javascript')===0||h.indexOf('mailto')===0||h.indexOf('tel')===0)return;
    if(a.target==='_blank')return;
    if(e.ctrlKey||e.metaKey||e.shiftKey)return;
    show();
  },true);

  document.addEventListener('submit',function(e){
    if(e.target.tagName==='FORM')show();
  },true);

  window.addEventListener('load',function(){setTimeout(hide,300);});
  window.addEventListener('pageshow',function(){setTimeout(hide,300);});
  window.addEventListener('popstate',hide);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){addCSS();addHTML();});
  }else{
    addCSS();addHTML();
  }

  window.EkartLoader={show:show,hide:hide};
})();