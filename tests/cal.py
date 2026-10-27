import asyncio
from playwright.async_api import async_playwright
MOCK = """
window.__ev={}; window.__n=100;
window.SKNative={syncAlarms(){},notify(){},testAlarm(){},setConfig(){},setSyncCredentials(){},takeActions:()=>'[]',version:()=>'vtest',
 permissions:()=>JSON.stringify({notifications:true,exactAlarm:true,fullScreen:true,overlay:true,battery:true,location:true,bgLocation:true,calendar:true}),
 requestPermission(){}, calendars:()=>JSON.stringify([{id:3,name:'hoopoe@gmail.com',account:'hoopoe@gmail.com',google:true,primary:true,writable:true},{id:5,name:'العمل',account:'hoopoe@gmail.com',google:true,writable:true}]),
 calendarUpsert:(j)=>{const o=JSON.parse(j); const id=o.eventId>0?o.eventId:++__n; __ev[id]=o; return String(id)}, calendarDelete:(id)=>{delete __ev[id]} };
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844})
        await ctx.add_init_script(MOCK); pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html#/tasks'); await pg.wait_for_timeout(300)
        await pg.evaluate("()=>{SK.store.putItem({type:'appointment',title:'موعد قديم',level:'important',due:Date.now()+864e5,timeSet:true,before:0,repeat:'none',done:false})}")
        await pg.goto('http://localhost:8765/index.html#/settings'); await pg.wait_for_timeout(300)
        await pg.check('[name=calOn]'); await pg.click('[data-act=save-cal]'); await pg.wait_for_timeout(300)
        print('after backfill', await pg.evaluate("Object.values(__ev).map(e=>e.title+'@'+e.calId)"))
        await pg.evaluate("()=>{SK.store.putItem({type:'event',title:'زواج',level:'normal',due:Date.now()+2*864e5,timeSet:true,before:0,repeat:'none',done:false})}")
        it = await pg.evaluate("SK.store.activeItems().find(i=>i.title==='زواج')")
        print('new item eventId', it.get('calEventId'), await pg.evaluate("Object.keys(__ev).length"))
        await pg.evaluate("id=>SK.store.removeItem(id)", it['id'])
        print('after delete', await pg.evaluate("Object.values(__ev).map(e=>e.title)"))
        await pg.screenshot(path='/home/claude/shots/cal.png', full_page=False)
        print('errors', errs); await b.close()
asyncio.run(main())
