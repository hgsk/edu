// Serialize switches and release the owned Unity runtime before replacing its frame.
let sampleSwitch = Promise.resolve();
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-webgl]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (location.protocol === 'file:') return;
  event.preventDefault();
  sampleSwitch = sampleSwitch.catch(() => {}).then(async () => {
    for (const frame of document.querySelectorAll('iframe.sample-player')) {
      let timer;
      try {
        const instance = frame.contentWindow.courseInstance;
        if (instance) await Promise.race([
          instance.Quit(),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Quit timeout')), 5000); })
        ]);
      } catch (error) { console.warn('Sample shutdown fallback', error); }
      finally { clearTimeout(timer); frame.remove(); }
    }
    const frame = document.createElement('iframe');
    frame.className = 'sample-player'; frame.title = link.textContent;
    frame.src = link.href; frame.allow = 'autoplay; fullscreen'; frame.allowFullscreen = true;
    link.closest('p').after(frame);
    frame.style.cssText = 'width:100%;height:640px;border:0;display:block';
  }).catch(error => console.error('Sample switch failed', error));
});
