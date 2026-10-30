// sprites.js — hand-authored pixel maps for the farm art.
// Each sprite: map[] of rows, one char per art pixel; '.' = transparent,
// other chars look up `pal`. Edit the maps directly to re-art anything.

export function drawSprite(g, spr, x, y) {
  // x, y in integer buffer pixels
  spr.map.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const col = spr.pal[row[c]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(x + c, y + r, 1, 1);
    }
  });
}

// double a pixel map (each char -> 2x2) for the finer PS=3 grid
export const up = (spr) => ({
  pal: spr.pal,
  map: spr.map.flatMap((row) => {
    const d = row.split('').map((c) => c + c).join('');
    return [d, d];
  }),
});

export const barn = {
  pal: { R: '#c23b28', D: '#8f2517', W: '#f4ecdd', K: '#5d2a1c' },
  map: [
    '......DDDDDD....',
    '....DDDDDDDDDD..',
    '..DDDDDDDDDDDD..',
    '.DDDDDDDDDDDDDD.',
    'DDDDDDDDDDDDDDDD',
    'RRRRRRRRRRRRRRRR',
    'RRRWWRRRRRRWWRRR',
    'RRRWWRRRRRRWWRRR',
    'RRRRRRRRRRRRRRRR',
    'RRRRRRKKKKRRRRRR',
    'RRRRRKKKKKKRRRRR',
    'RRRRRKKKKKKRRRRR',
    'RRRRRKKKKKKRRRRR',
    'RRRRRKKKKKKRRRRR',
  ],
};

export const tank = {
  pal: { T: '#a8b4ba', S: '#8896a0', W: '#c8d2d8' },
  map: [
    '.TTTTT.',
    'TWTTTTT',
    'TTTTTTT',
    'TTSSTTT',
    'TTTTTTT',
    'TWTTTTT',
    'TTTTTTT',
    'TTSSTTT',
    'TTTTTTT',
    'TWTTTTT',
    '.TTTTT.',
  ],
};

export const tree = {
  pal: { G: '#4e7a3a', g: '#3c5f2c', B: '#6b4a2e' },
  map: [
    '...GGGG...',
    '..GGGGGG..',
    '.GGgGGGGG.',
    'GGGgGGgGGG',
    'GGGGgGGGGG',
    '.GGgGGGGG.',
    '..GGGGGG..',
    '...GGGG...',
    '....BB....',
    '....BB....',
    '....BB....',
  ],
};

export const sheep = {
  pal: { W: '#f8f4ea', B: '#2c1a10' },
  map: [
    '.WWWWWWW..',
    'WWWWWWWWB.',
    'WWWWWWWWB.',
    '.WWWWWWW..',
    '..B...B...',
    '..B...B...',
  ],
};

export const roo = {
  pal: { K: '#a06a38', D: '#7c4f26', E: '#2c1a10', B: '#c79a63' },
  map: [
    '....KKK..................',
    '...KKK.K................',
    '..KKKKK.................',
    '..KEKK.K................',
    '..KKKKK.................',
    '...KKKKK................',
    '....KKKKKK..............',
    '.....KKKKKKK............',
    '.....KKKKKKKKK..........',
    '....KKKKKKKKKKK.........',
    '...KKKKKKKKKKKK.........',
    '..KKKKKKKKKKKKK.........',
    '.KKKKKKKKKKKKKKK........',
    'KKKKKKKKKKKKKKKK........',
    'KKKKKKKKKKKKKKKKKTT.....',
    'KKKKKKKKKKKKKKKTTTTTT...',
    'KKKKKKKKKKKKTTTTTTTTTT..',
    'KKKKKKKKKKTTTTTTTTTTTTTT',
    'KKKKKKKTTTTTTTTTTTTTTTTT',
    'KKKKKTTTTTTTTTTTTTTTTTT.',
    'KKKTTTTTTTTTTTTTTTTTT...',
    'KTTTTTTTTTTTTTTTTTT.....',
    '.TTTTTTTTTTTTTT.........',
  ],
};

// wooden plank billboard — MERRY XMAS drawn over it with the pixel font
export const signBoard = {
  pal: { D: '#54341a', W: '#8a5a30', w: '#6e4322' },
  map: [
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWD',
    'DWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWD',
    'DWwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwWD',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  ],
};

export const windmillFan = {
  pal: { M: '#8d9aa5', C: '#5d6a75', W: '#c8d2d8' },
  map: [
    '.M..M..M.',
    '.MM.M.MM.',
    '.MMM.MMM.',
    'MMMMWMMMM',
    '.MMM.MMM.',
    '.MM.M.MM.',
    '.M..M..M.',
    '....C....',
  ],
};

export const stocking = {
  pal: { R: '#d92c14', W: '#f4ecdd' },
  map: [
    'WWWW',
    'RRRR',
    'RRRR',
    'RRRRR',
    '.RRRR',
  ],
};

export const star = {
  pal: { Y: '#ffd23f', o: '#e8a813' },
  map: [
    '...Y...',
    '..YYY..',
    'YYYYYYY',
    '.YYYYY.',
    '..YYY..',
    '.Yo.oY.',
  ],
};

export const present = {
  pal: { R: '#d92c14', W: '#f4ecdd' },
  map: [
    '.W..W.',
    '.WWWW.',
    'RRRRRR',
    'RRWWRR',
    'RRWWRR',
    'RRWWRR',
  ],
};

export const present2 = {
  pal: { T: '#2a9d8f', G: '#ffd23f' },
  map: [
    'TGTGT',
    'TTGTT',
    'TTGTT',
    'TTGTT',
  ],
};

export const cloud = {
  pal: { W: '#ffffff', S: '#dceaf2' },
  map: [
    '....WWWW....',
    '..WWWWWWWW..',
    '.WWWWWWWWWWW',
    'WWWWWWWWWWWW',
    '.SSSSSSSSSS.',
  ],
};

export const post = {
  pal: { W: '#8a5a30', D: '#6e4322' },
  map: [
    'WW',
    'WD',
    'WW',
    'WD',
    'WW',
    'WD',
    'WW',
  ],
};

// ---- buried treasures for the deep dirt ----

export const dino = {
  pal: { B: '#ece4cf', K: '#ece4cf' },
  map: [
    'KKK....................',
    'K.KK..BBBBBBBBBBBBBBBBB.',
    'KKKK..BBBBBBBBBBBBBBBBBB',
    '.K.....BB.BB.BB.BB.BB...',
    '........BB.BB.BB.BB.BB..',
    '.......BB..........BB...',
    '.......B.B........B.B...',
    '......BB..........BB....',
    '......B............B....',
  ],
};

export const chest = {
  pal: { B: '#6e4322', Y: '#e8c33c', W: '#f4ecdd' },
  map: [
    '..BBBBBB..',
    '.BYYYYYYB.',
    'BBBBYYBBBB',
    'BYYYYYYWYB',
    'BBBBYYBBBB',
    'BBBBBBBBBB',
  ],
};

export const fossil = {
  pal: { S: '#b3a284' },
  map: [
    '..SSSS..',
    '.SS..SS.',
    'SS.SS.SS',
    'SS.S..SS',
    'SS....S.',
    '.SS..SS.',
    '..SSSS..',
  ],
};
