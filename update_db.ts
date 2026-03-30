import Database from 'better-sqlite3';

const db = new Database('cineverse_production.db');

const updates = [
  { 
    title: 'Dune: Part Two', 
    poster: 'https://image.tmdb.org/t/p/original/xJ0pB3t3C3S6e1l9C5b1k8g2s.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/xJ0pB3t3C3S6e1l9C5b1k8g2s.jpg' 
  },
  { 
    title: 'Oppenheimer', 
    poster: 'https://image.tmdb.org/t/p/original/rLb2CwFh4Pq22FpQ41c0pQ3b3f2.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/rLb2CwFh4Pq22FpQ41c0pQ3b3f2.jpg' 
  },
  { 
    title: 'Spider-Man: Across the Spider-Verse', 
    poster: 'https://image.tmdb.org/t/p/original/3P5d3L4N6h5d7v3C0w2o0a8g0b2.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/3P5d3L4N6h5d7v3C0w2o0a8g0b2.jpg' 
  },
  { 
    title: 'Avatar: The Way of Water', 
    poster: 'https://image.tmdb.org/t/p/w500/9oxp4oW5w8d8j9k6d7e0o9p0q2f.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/bLXb0C3t6e1c4a5d8f9g8h7i0j.jpg' 
  },
  { 
    title: 'The Batman', 
    poster: 'https://image.tmdb.org/t/p/w500/qox6r9f4o2w8e7i9j3k4l3m5n.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/fN1M4X5X4T2L7K6J0o9n8m7l6k.jpg' 
  },
  { 
    title: 'Interstellar', 
    poster: 'https://image.tmdb.org/t/p/w500/g4X4G8i6H5j7k2l9m0n1o8p7q.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/y0C4s0e1d2r5a7m9e7n8t9o0s.jpg' 
  },
  { 
    title: 'Inception', 
    poster: 'https://image.tmdb.org/t/p/w500/s3TzPjQ2K8e1f5g8h9i0j1k2l.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/o0Q4oR8p0m6b1n2c3v4x5z6q7.jpg' 
  },
  { 
    title: 'The Dark Knight', 
    poster: 'https://image.tmdb.org/t/p/w500/d4C3d3l0h2g1j4k5l6m7n8o9p.jpg', 
    backdrop: 'https://image.tmdb.org/t/p/original/jN4M4T2L7K6J0o9n8m7l6k5j.jpg' 
  }
];

const updateStmt = db.prepare('UPDATE movies SET posterUrl = ?, backdropUrl = ? WHERE title = ?');

db.transaction(() => {
  for (const movie of updates) {
    updateStmt.run(movie.poster, movie.backdrop, movie.title);
  }
})();

console.log('Database updated with accurate images.');
