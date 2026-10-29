import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(viewport={'width':390,'height':844}, timezone_id='Asia/Riyadh')
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html#/tasks'); await pg.wait_for_timeout(300)
        await pg.evaluate("""()=>{const d=new Date(); d.setHours(d.getHours()+2); SK.store.putItem({type:'appointment',title:'موعد المستشفى',level:'important',due:d.getTime(),timeSet:true,before:0,repeat:'none',done:false});
          const e=new Date(); e.setHours(e.getHours()-3); SK.store.putItem({type:'task',title:'الاتصال بالمؤجر',level:'urgent',due:e.getTime(),timeSet:true,before:0,repeat:'none',done:false});
          SK.store.putTx({kind:'income',amount:10000,currency:'SAR',categoryId:'salary',title:'الراتب',date:Date.now()}); SK.store.putTx({kind:'expense',amount:100,currency:'USD',categoryId:'groceries',title:'مقاضي',date:Date.now()});}""")
        await pg.goto('http://localhost:8765/index.html#/settings'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='/home/claude/shots/th0.png')
        for pal, mode in [('orange','light'),('orange','dark'),('blue','dark'),('purple','light'),('teal','dark'),('mono','light')]:
            await pg.evaluate("([p,m])=>{SK.store.putSettings({theme:{palette:p,mode:m}}); }", [pal,mode])
            await pg.goto('http://localhost:8765/index.html#/tasks'); await pg.reload(); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/home/claude/shots/th-{pal}-{mode}-tasks.png')
            await pg.goto('http://localhost:8765/index.html#/money'); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'/home/claude/shots/th-{pal}-{mode}-money.png')
        print('errors', errs); await b.close()
asyncio.run(main())
