// Products menu: opens on hover via CSS; this adds click/tap and Escape for touch and keyboard.
(function(){
  document.querySelectorAll('.dd').forEach(function(dd){
    var btn=dd.querySelector('.dd-btn');
    function set(open){btn.setAttribute('aria-expanded',String(open));dd.classList.toggle('open',open);}
    btn.addEventListener('click',function(){set(btn.getAttribute('aria-expanded')!=='true');});
    dd.addEventListener('keydown',function(e){if(e.key==='Escape'){set(false);btn.focus();}});
    document.addEventListener('click',function(e){if(!dd.contains(e.target))set(false);});
    dd.addEventListener('focusout',function(e){if(!dd.contains(e.relatedTarget))set(false);});
  });
})();
