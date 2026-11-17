'use strict';
function applyTheme(mode='system'){
  const dark=mode==='dark'||(mode==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  const button=document.getElementById('themeBtn');
  if(button){button.textContent=dark?'☀ Chiaro':'☾ Scuro';button.setAttribute('aria-label',dark?'Passa alla modalità chiara':'Passa alla modalità scura')}
}
try{const settings=JSON.parse(localStorage.getItem('repo-atlas.settings.v1')||'{}');applyTheme(settings.theme||'system')}catch{applyTheme('system')}
