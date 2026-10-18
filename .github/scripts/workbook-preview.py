from pathlib import Path
import json, subprocess, shutil, os
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[2]
out=root/'hht/assets/workbook-split'
out.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['node',str(root/'.github/scripts/workbook-preview.cjs')],stdout=subprocess.PIPE,text=True)
port=server.stdout.readline().strip()
base=f'http://127.0.0.1:{port}'
index='/hht/docs/student-workbook.md'
records=[]
def verify(page,path,fragment):
    assert unquote(urlsplit(page.url).path)==path,(page.url,path)
    assert unquote(urlsplit(page.url).fragment)==fragment,(page.url,fragment)
    assert page.locator('[id="'+fragment+'"]').count()==1,(path,fragment)
    records.append({'path':path,'fragment':fragment})

try:
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=(shutil.which('google-chrome') or shutil.which('chromium')),headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':950},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda err:errors.append(str(err)))
    for day in range(1,16):
      path=f'/hht/docs/workbook/day-{day:02d}.md'
      for suffix in ('','-concepts','-actions','-done'):
        fragment=f'day-{day}{suffix}'
        page.goto(base+index)
        page.locator(f'a[href="./workbook/day-{day:02d}.md#{fragment}"]').click()
        verify(page,path,fragment)
      page.locator('a[href="../student-workbook.md#workbook-days"]').last.click()
      verify(page,index,'workbook-days')
      page.goto(base+path)
      for other in (day-1,day+1):
        if not 1<=other<=15: continue
        page.locator(f'a[href="day-{other:02d}.md#day-{other}"]').first.click()
        verify(page,f'/hht/docs/workbook/day-{other:02d}.md',f'day-{other}')
        page.goto(base+path)
      page.goto(base+f'/hht/lessons/{day:02d}/README.md')
      page.locator(f'a[href="../../docs/workbook/day-{day:02d}.md#day-{day}"]').first.click()
      verify(page,path,f'day-{day}')
    page.goto(base+'/hht/student/assignment-checks.md')
    for day in range(1,16):
      page.locator(f'a[href="../docs/workbook/day-{day:02d}.md#day-{day}-done"]').click()
      verify(page,f'/hht/docs/workbook/day-{day:02d}.md',f'day-{day}-done')
      page.goto(base+'/hht/student/assignment-checks.md')
    page.goto(base+index)
    for day in range(1,16):
      for suffix in ('','-concepts','-actions','-done'):
        assert page.locator(f'[id="day-{day}{suffix}"]').count()==1
    page.screenshot(path=str(out/'index.png'))
    page.goto(base+'/hht/docs/workbook/day-03.md#day-3')
    page.screenshot(path=str(out/'day-03.png'))
    page.goto(base+'/hht/docs/workbook/day-03.md#day-3-done')
    page.screenshot(path=str(out/'day-03-done.png'))
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+index)
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
    page.locator('a[href="./workbook/day-15.md#day-15"]').click()
    verify(page,'/hht/docs/workbook/day-15.md','day-15')
    page.screenshot(path=str(out/'mobile-day-15.png'))
    for doc in sorted((root/'hht/docs/workbook').glob('*.md')):
      page.goto(base+'/'+doc.relative_to(root).as_posix())
      page.wait_for_load_state('networkidle')
      broken=page.locator('img').evaluate_all('(imgs)=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute("src"))')
      assert not broken,(doc.name,broken)
    assert not errors,errors
    browser.close()
  result={'baseline':'8ddb7540c20c97cdff93d961a6b77c8f0dcbafb6','renderer':'Local marked GFM preview in Chromium; not the GitHub or VS Code UI','clicks':len(records),'legacy_ids':60,'mobile_width':390,'all_workbook_images_loaded':True,'navigation':records}
  (out/'checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
  print('BROWSER PASS:',len(records),'clicks, 60 legacy IDs, all workbook images, 390px navigation')
finally:
  server.terminate()
  try: server.wait(timeout=5)
  except subprocess.TimeoutExpired: server.kill();server.wait()
