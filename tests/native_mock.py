import asyncio, json
from playwright.async_api import async_playwright
MOCK = """
window.__calls=[];
window.SKNative={
 syncAlarms:(j)=>__calls.push(['sync',JSON.parse(j)]),
 notify:(t,b)=>__calls.push(['notify',t,b]),
 testAlarm:(j)=>__calls.push(['test',j]),
 permissions:()=>JSON.stringify({notifications:true,exactAlarm:true,fullScreen:false,overlay:false,battery:true}),
 requestPermission:(w)=>__calls.push(['perm',w]),
 startVoice:(id)=>{__calls.push(['voice',id]); setTimeout(()=>SKBridge.onVoice(id,'بكرة الساعة تسعة الصبح موعد عاجل صيانة السيارة',null),200)},
 setSyncCredentials:(j)=>__calls.push(['creds',j]),
 takeActions:()=>window.__acts?JSON.stringify(window.__acts.splice(0)):'[]',
 version:()=>'v1.0.test'
};
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, timezone_id='Asia/Riyadh')
        await ctx.add_init_script(MOCK)
        pg = await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html#/tasks'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='/home/claude/shots/n1-banner.png')
        await pg.click('a[href^="#/task/new?mode=voice"]'); await pg.wait_for_timeout(900)
        await pg.screenshot(path='/home/claude/shots/n2-voice.png', full_page=True)
        await pg.click('[data-act=save-drafts]'); await pg.wait_for_timeout(300)
        calls = await pg.evaluate('__calls')
        syncs=[c for c in calls if c[0]=='sync']
        print('voice called', any(c[0]=='voice' for c in calls))
        print('last sync', json.dumps(syncs[-1][1], ensure_ascii=False)[:600])
        it = await pg.evaluate('SK.store.activeItems()[0].id')
        await pg.evaluate("id=>{window.__acts=[{id,action:'done',at:Date.now()}]; SKBridge.onResume();}", it)
        await pg.wait_for_timeout(200)
        print('done after native action', await pg.evaluate("id=>SK.store.getItem(id).done", it))
        calls = await pg.evaluate('__calls'); print('last sync after done', [c for c in calls if c[0]=='sync'][-1][1])
        await pg.goto('http://localhost:8765/index.html#/settings'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/n3-settings.png', full_page=True)
        print('errors', errs)
        await b.close()
asyncio.run(main())
