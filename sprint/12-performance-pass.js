'use strict';
(()=>{
 const css=document.createElement('style');css.id='eiPerformancePass';css.textContent='@supports(content-visibility:auto){.check-how,.check-deep,.si-section,footer{content-visibility:auto;contain-intrinsic-size:auto 700px}} img[loading="lazy"]{content-visibility:auto}';document.head.appendChild(css);
 document.querySelectorAll('img:not([loading])').forEach(img=>{if(!img.closest('.check-hero'))img.loading='lazy'});
})();