import fs from 'fs';
import https from 'https';

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.themoviedb.org/'
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to get '${url}' (${res.statusCode})`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
};

async function main() {
  try {
    console.log('Downloading Dune: Part Two...');
    await download('https://image.tmdb.org/t/p/original/xJ0pB3t3C3S6e1l9C5b1k8g2s.jpg', 'public/assets/movies/dune.jpg');
    console.log('Downloading Oppenheimer...');
    await download('https://image.tmdb.org/t/p/original/rLb2CwFh4Pq22FpQ41c0pQ3b3f2.jpg', 'public/assets/movies/oppenheimer.jpg');
    console.log('Downloading Spider-Man...');
    await download('https://image.tmdb.org/t/p/original/iiXpPnz69uTMcnnI7AzQZ6o3pRr.jpg', 'public/assets/movies/spiderman.jpg');
    console.log('All downloads completed correctly!');
  } catch (err) {
    console.error('Download script failed:', err);
  }
}

main();
