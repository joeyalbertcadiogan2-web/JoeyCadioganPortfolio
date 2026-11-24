import sharp from 'sharp';
const dir = process.argv[2], files = process.argv.slice(3);
const tiles = await Promise.all(files.map(f => sharp(`${dir}/${f}`).resize(512,512,{fit:'contain',background:'#ff00ff'}).flatten({background:'#ff00ff'}).png().toBuffer()));
const cols = 3, rows = Math.ceil(tiles.length/cols);
await sharp({create:{width:cols*512,height:rows*512,channels:3,background:'#222'}}).composite(tiles.map((b,i)=>({input:b,left:(i%cols)*512,top:Math.floor(i/cols)*512}))).png().toFile(`${dir}/../sheet.png`);
