import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { pathToFileURL } from 'url';

const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// Initialize SQLite Database
const db = new Database('cineverse_production.db');

// Setup database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'customer',
    city TEXT
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    posterUrl TEXT NOT NULL,
    rating REAL NOT NULL,
    genre TEXT NOT NULL,
    language TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT,
    trailerUrl TEXT,
    backdropUrl TEXT
  );

  CREATE TABLE IF NOT EXISTS theaters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT,
    lat REAL,
    lng REAL,
    rating REAL DEFAULT 4.5,
    screenType TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movieId INTEGER NOT NULL,
    theaterId INTEGER NOT NULL,
    city TEXT NOT NULL,
    time TEXT NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (movieId) REFERENCES movies (id),
    FOREIGN KEY (theaterId) REFERENCES theaters (id)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    showId INTEGER NOT NULL,
    city TEXT NOT NULL,
    seats TEXT NOT NULL,
    totalPrice REAL NOT NULL,
    bookingDate TEXT NOT NULL,
    snacks TEXT,
    snacksPrice REAL DEFAULT 0,
    orderStatus TEXT DEFAULT 'Pending',
    FOREIGN KEY (userId) REFERENCES users (id),
    FOREIGN KEY (showId) REFERENCES shows (id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    posterUrl TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    venue TEXT NOT NULL,
    city TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS event_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    eventId INTEGER NOT NULL,
    tickets INTEGER NOT NULL,
    totalPrice REAL NOT NULL,
    bookingDate TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users (id),
    FOREIGN KEY (eventId) REFERENCES events (id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movieId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (movieId) REFERENCES movies (id),
    FOREIGN KEY (userId) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theaterId INTEGER NOT NULL,
    screenId INTEGER NOT NULL,
    showId INTEGER NOT NULL,
    seatNumber TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available',
    userId INTEGER,
    lockedUntil INTEGER,
    bookingId INTEGER,
    UNIQUE(showId, seatNumber)
  );
`);

// Alter existing users table if missing role column
try {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'");
  db.exec("ALTER TABLE users ADD COLUMN city TEXT");
} catch (e) {
  // Ignore if column already exists
}

// Alter existing theaters table
try {
  db.exec("ALTER TABLE theaters ADD COLUMN address TEXT");
  db.exec("ALTER TABLE theaters ADD COLUMN lat REAL");
  db.exec("ALTER TABLE theaters ADD COLUMN lng REAL");
  db.exec("ALTER TABLE theaters ADD COLUMN rating REAL DEFAULT 4.5");
} catch (e) {}

// Alter existing shows table
try {
  db.exec("ALTER TABLE shows ADD COLUMN city TEXT DEFAULT 'Bengaluru'");
} catch (e) {}

// Alter existing bookings table
try {
  db.exec("ALTER TABLE bookings ADD COLUMN city TEXT DEFAULT 'Bengaluru'");
  db.exec('ALTER TABLE bookings ADD COLUMN snacks TEXT');
  db.exec('ALTER TABLE bookings ADD COLUMN snacksPrice REAL DEFAULT 0');
  db.exec("ALTER TABLE bookings ADD COLUMN orderStatus TEXT DEFAULT 'Pending'");
} catch (e) {}

// Alter existing movies table
try {
  db.exec("ALTER TABLE movies RENAME COLUMN poster TO posterUrl");
} catch (e) {}
try {
  db.exec("ALTER TABLE movies ADD COLUMN backdropUrl TEXT");
} catch (e) {}

// Alter existing events table
try {
  db.exec("ALTER TABLE events RENAME COLUMN poster TO posterUrl");
} catch (e) {}

// Insert initial mock data if empty
const movieCount = db.prepare('SELECT COUNT(*) as count FROM movies').get() as { count: number };
if (movieCount.count === 0) {
  const insertMovie = db.prepare('INSERT INTO movies (title, posterUrl, backdropUrl, rating, genre, language, duration, description, trailerUrl) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertMovie.run('Dune: Part Two', '/assets/movies/dune.png', '/assets/movies/dune.png', 8.8, 'Sci-Fi, Action', 'English', '2h 46m', 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.', 'https://www.youtube.com/embed/Way9Dexny3w');
  insertMovie.run('Oppenheimer', '/assets/movies/oppenheimer.png', '/assets/movies/oppenheimer.png', 8.4, 'Biography, Drama', 'English', '3h', 'The story of American scientist, J. Robert Oppenheimer, and his role in the development of the atomic bomb.', 'https://www.youtube.com/embed/uYPbbksJxIg');
  insertMovie.run('Spider-Man: Across the Spider-Verse', '/assets/movies/spiderman.png', '/assets/movies/spiderman.png', 8.7, 'Animation, Action', 'English', '2h 20m', 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.', 'https://www.youtube.com/embed/cqGjhVJWtEg');
  insertMovie.run('Avatar: The Way of Water', '/assets/movies/avatar.jpg', '/assets/movies/avatar.jpg', 7.6, 'Action, Adventure', 'English', '3h 12m', 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.', 'https://www.youtube.com/embed/d9MyW72ELq0');
  insertMovie.run('The Batman', '/assets/movies/batman.jpg', '/assets/movies/batman.jpg', 7.8, 'Action, Crime', 'English', '2h 56m', 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city\'s hidden corruption.', 'https://www.youtube.com/embed/mqqft2x_Aa4');
  insertMovie.run('Interstellar', '/assets/movies/interstellar.jpg', '/assets/movies/interstellar.jpg', 8.6, 'Sci-Fi, Drama', 'English', '2h 49m', 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', 'https://www.youtube.com/embed/zSWdZVtXT7E');
  insertMovie.run('Inception', '/assets/movies/inception.jpg', '/assets/movies/inception.jpg', 8.8, 'Sci-Fi, Action', 'English', '2h 28m', 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.', 'https://www.youtube.com/embed/YoHD9XEInc0');
  insertMovie.run('The Dark Knight', '/assets/movies/dark_knight.jpg', '/assets/movies/dark_knight.jpg', 9.0, 'Action, Crime', 'English', '2h 32m', 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.', 'https://www.youtube.com/embed/EXeTwQWrcwY');

  const insertTheater = db.prepare('INSERT INTO theaters (name, city, address, lat, lng, rating, screenType) VALUES (?, ?, ?, ?, ?, ?, ?)');
  // Bengaluru
  insertTheater.run('PVR Cinemas', 'Bengaluru', 'Orion Mall, Rajajinagar', 13.0112, 77.5550, 4.5, 'IMAX');
  insertTheater.run('INOX', 'Bengaluru', 'Garuda Mall, Magrath Road', 12.9702, 77.6096, 4.2, '3D');
  insertTheater.run('Cinepolis 4DX', 'Bengaluru', 'Nexus Shantiniketan', 12.9896, 77.7289, 4.6, '4DX');
  // Mumbai
  insertTheater.run('Cinepolis', 'Mumbai', 'Andheri West', 19.1363, 72.8277, 4.3, '2D');
  insertTheater.run('PVR IMAX', 'Mumbai', 'Lower Parel', 18.9930, 72.8258, 4.7, 'IMAX');
  insertTheater.run('INOX', 'Mumbai', 'Nariman Point', 18.9256, 72.8242, 4.4, '3D');
  // Delhi
  insertTheater.run('PVR Director\'s Cut', 'Delhi', 'Vasant Kunj', 28.5414, 77.1555, 4.8, 'Recliner');
  insertTheater.run('INOX', 'Delhi', 'Nehru Place', 28.5494, 77.2527, 4.2, '3D');
  insertTheater.run('Cinepolis', 'Delhi', 'Saket', 28.5286, 77.2193, 4.5, '2D');
  // Hyderabad
  insertTheater.run('AMB Cinemas', 'Hyderabad', 'Gachibowli', 17.4447, 78.3644, 4.9, 'IMAX');
  insertTheater.run('PVR', 'Hyderabad', 'Inorbit Mall', 17.4337, 78.3867, 4.5, '3D');
  insertTheater.run('INOX', 'Hyderabad', 'GVK One', 17.4193, 78.4485, 4.3, '2D');
  // Chennai
  insertTheater.run('SPI Cinemas', 'Chennai', 'Royapettah', 13.0558, 80.2642, 4.8, 'IMAX');
  insertTheater.run('PVR', 'Chennai', 'VR Mall', 13.0837, 80.1969, 4.4, '3D');
  insertTheater.run('INOX', 'Chennai', 'Chennai Citi Centre', 13.0450, 80.2764, 4.2, '2D');
  // Kolkata
  insertTheater.run('INOX', 'Kolkata', 'South City Mall', 22.5016, 88.3619, 4.5, 'IMAX');
  insertTheater.run('PVR', 'Kolkata', 'Mani Square', 22.5780, 88.4000, 4.3, '3D');
  insertTheater.run('Cinepolis', 'Kolkata', 'Acropolis Mall', 22.5149, 88.3933, 4.4, '2D');
  // Pune
  insertTheater.run('PVR', 'Pune', 'Phoenix Marketcity', 18.5621, 73.9167, 4.6, 'IMAX');
  insertTheater.run('INOX', 'Pune', 'Amanora Mall', 18.5196, 73.9400, 4.3, '3D');
  insertTheater.run('Cinepolis', 'Pune', 'Seasons Mall', 18.5186, 73.9350, 4.4, '2D');
  // Ahmedabad
  insertTheater.run('PVR Acropolis', 'Ahmedabad', 'Thaltej Cross Road', 23.0248, 72.5071, 4.5, 'IMAX');
  insertTheater.run('Cinepolis Alpha One', 'Ahmedabad', 'Vastrapur', 23.0394, 72.5312, 4.4, '3D');
  insertTheater.run('INOX Himalaya Mall', 'Ahmedabad', 'Memnagar', 23.0475, 72.5276, 4.2, '2D');
  // Jaipur
  insertTheater.run('Raj Mandir', 'Jaipur', 'Bhagwan Das Road', 26.9163, 75.8090, 4.8, 'Classic');
  insertTheater.run('INOX Crystal Palm', 'Jaipur', 'C-Scheme', 26.9085, 75.8011, 4.3, '3D');
  insertTheater.run('PVR Pink Square', 'Jaipur', 'Adarsh Nagar', 26.8996, 75.8306, 4.1, '2D');
  // Lucknow
  insertTheater.run('PVR Sahara Ganj', 'Lucknow', 'Hazratganj', 26.8529, 80.9431, 4.4, 'IMAX');
  insertTheater.run('INOX Palassio', 'Lucknow', 'Amar Shaheed Path', 26.8095, 80.9992, 4.7, '3D');
  insertTheater.run('Cinepolis One Awadh', 'Lucknow', 'Gomti Nagar', 26.8686, 81.0125, 4.5, '2D');

  const insertShow = db.prepare('INSERT INTO shows (movieId, theaterId, city, time, price) VALUES (?, ?, ?, ?, ?)');
  
  // Helper to add shows for a movie in a city
  const addShows = (movieId: number, city: string, theaterIds: number[]) => {
    theaterIds.forEach(tId => {
      insertShow.run(movieId, tId, city, '10:00 AM', 300);
      insertShow.run(movieId, tId, city, '01:30 PM', 350);
      insertShow.run(movieId, tId, city, '06:00 PM', 450);
      insertShow.run(movieId, tId, city, '09:30 PM', 400);
    });
  };

  // Dune: Part Two (Movie 1)
  addShows(1, 'Bengaluru', [1, 2, 3]);
  addShows(1, 'Mumbai', [4, 5, 6]);
  addShows(1, 'Delhi', [7, 8, 9]);
  addShows(1, 'Hyderabad', [10, 11, 12]);
  addShows(1, 'Chennai', [13, 14, 15]);
  addShows(1, 'Kolkata', [16, 17, 18]);
  addShows(1, 'Pune', [19, 20, 21]);
  addShows(1, 'Ahmedabad', [22, 23, 24]);
  addShows(1, 'Jaipur', [25, 26, 27]);
  addShows(1, 'Lucknow', [28, 29, 30]);

  // Oppenheimer (Movie 2)
  addShows(2, 'Bengaluru', [1, 2]);
  addShows(2, 'Mumbai', [4, 5]);
  addShows(2, 'Delhi', [7, 8]);
  addShows(2, 'Hyderabad', [10, 11]);
  addShows(2, 'Chennai', [13, 14]);
  addShows(2, 'Kolkata', [16, 17]);
  addShows(2, 'Pune', [19, 20]);
  addShows(2, 'Ahmedabad', [22, 23]);
  addShows(2, 'Jaipur', [25, 26]);
  addShows(2, 'Lucknow', [28, 29]);

  // Spider-Man (Movie 3)
  addShows(3, 'Bengaluru', [2, 3]);
  addShows(3, 'Mumbai', [5, 6]);
  addShows(3, 'Delhi', [8, 9]);
  addShows(3, 'Hyderabad', [11, 12]);
  addShows(3, 'Chennai', [14, 15]);
  addShows(3, 'Kolkata', [17, 18]);
  addShows(3, 'Pune', [20, 21]);
  addShows(3, 'Ahmedabad', [23, 24]);
  addShows(3, 'Jaipur', [26, 27]);
  addShows(3, 'Lucknow', [29, 30]);

  // Avatar (Movie 4)
  addShows(4, 'Bengaluru', [1, 3]);
  addShows(4, 'Mumbai', [4, 6]);
  addShows(4, 'Delhi', [7, 9]);
  addShows(4, 'Hyderabad', [10, 12]);
  addShows(4, 'Chennai', [13, 15]);
  addShows(4, 'Kolkata', [16, 18]);
  addShows(4, 'Pune', [19, 21]);
  addShows(4, 'Ahmedabad', [22, 24]);
  addShows(4, 'Jaipur', [25, 27]);
  addShows(4, 'Lucknow', [28, 30]);

  // The Batman (Movie 5)
  addShows(5, 'Bengaluru', [1, 2, 3]);
  addShows(5, 'Mumbai', [4, 5, 6]);
  addShows(5, 'Delhi', [7, 8, 9]);
  addShows(5, 'Hyderabad', [10, 11, 12]);
  addShows(5, 'Chennai', [13, 14, 15]);
  addShows(5, 'Kolkata', [16, 17, 18]);
  addShows(5, 'Pune', [19, 20, 21]);
  addShows(5, 'Ahmedabad', [22, 23, 24]);
  addShows(5, 'Jaipur', [25, 26, 27]);
  addShows(5, 'Lucknow', [28, 29, 30]);

  // Interstellar (Movie 6)
  addShows(6, 'Bengaluru', [1]);
  addShows(6, 'Mumbai', [5]);
  addShows(6, 'Delhi', [7]);
  addShows(6, 'Hyderabad', [10]);
  addShows(6, 'Chennai', [13]);
  addShows(6, 'Kolkata', [16]);
  addShows(6, 'Pune', [19]);
  addShows(6, 'Ahmedabad', [22]);
  addShows(6, 'Jaipur', [25]);
  addShows(6, 'Lucknow', [28]);

  // Inception (Movie 7)
  addShows(7, 'Bengaluru', [2]);
  addShows(7, 'Mumbai', [4]);
  addShows(7, 'Delhi', [8]);
  addShows(7, 'Hyderabad', [11]);
  addShows(7, 'Chennai', [14]);
  addShows(7, 'Kolkata', [17]);
  addShows(7, 'Pune', [20]);
  addShows(7, 'Ahmedabad', [23]);
  addShows(7, 'Jaipur', [26]);
  addShows(7, 'Lucknow', [29]);

  // The Dark Knight (Movie 8)
  addShows(8, 'Bengaluru', [3]);
  addShows(8, 'Mumbai', [6]);
  addShows(8, 'Delhi', [9]);
  addShows(8, 'Hyderabad', [12]);
  addShows(8, 'Chennai', [15]);
  addShows(8, 'Kolkata', [18]);
  addShows(8, 'Pune', [21]);
  addShows(8, 'Ahmedabad', [24]);
  addShows(8, 'Jaipur', [27]);
  addShows(8, 'Lucknow', [30]);
}

const users = [
  { name: 'John Doe', email: 'john.doe@example.com', password: 'password', role: 'customer', city: 'Bengaluru' },
  { name: 'Jane Smith', email: 'jane.smith@example.com', password: 'password', role: 'customer', city: 'Mumbai' },
  { name: 'Popcorn Vendor', email: 'vendor@cineverse.com', password: 'vendor123', role: 'vendor', city: 'Bengaluru' },
  { name: 'Theatre Admin', email: 'admin@theatre.com', password: 'admin123', role: 'theatre_admin', city: 'Bengaluru' }
];

users.forEach(u => {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
  if (!exists) {
    db.prepare('INSERT INTO users (name, email, password, role, city) VALUES (?, ?, ?, ?, ?)').run(u.name, u.email, u.password, u.role, u.city);
  } else {
    // Ensure role and city are correct for existing users (like if we changed them in code)
    db.prepare('UPDATE users SET role = ?, city = ? WHERE email = ?').run(u.role, u.city, u.email);
  }
});

const reviewCount = db.prepare('SELECT COUNT(*) as count FROM reviews').get() as { count: number };
if (reviewCount.count === 0) {
  const insertReview = db.prepare('INSERT INTO reviews (movieId, userId, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?)');
  insertReview.run(1, 1, 9, 'An absolute visual masterpiece. The IMAX experience is unmatched.', new Date(Date.now() - 86400000 * 2).toISOString());
  insertReview.run(1, 2, 10, 'Even better than the first part. Hans Zimmer score is incredible.', new Date(Date.now() - 86400000 * 1).toISOString());
  insertReview.run(2, 1, 9, 'Nolan at his best. Cillian Murphy deserves an Oscar.', new Date(Date.now() - 86400000 * 10).toISOString());
}

const bookingCount = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };
if (bookingCount.count === 0) {
  const insertBooking = db.prepare('INSERT INTO bookings (id, userId, showId, city, seats, totalPrice, bookingDate, snacks, snacksPrice, orderStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertBooking.run(10000001, 1, 1, 'Bengaluru', JSON.stringify(['A1', 'A2']), 900, new Date().toISOString(), JSON.stringify([{name: 'Popcorn', quantity: 2, price: 200}]), 400, 'Pending');
  insertBooking.run(10000002, 1, 4, 'Bengaluru', JSON.stringify(['C10']), 250, new Date(Date.now() - 86400000 * 5).toISOString(), JSON.stringify([{name: 'Coke', quantity: 1, price: 100}]), 100, 'Delivered');

  // Sync seats table with mock bookings
  const insertSeat = db.prepare('INSERT INTO seats (theaterId, screenId, showId, seatNumber, status, userId, bookingId) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insertSeat.run(1, 1, 1, 'A1', 'Booked', 1, 10000001);
  insertSeat.run(1, 1, 1, 'A2', 'Booked', 1, 10000001);
  insertSeat.run(5, 5, 4, 'C10', 'Booked', 1, 10000002);

  // Dynamically find shows for new cities to populate vendor dashboard
  const cityMockBookings = [
    { city: 'Ahmedabad', seat: 'B5', snacks: [{name: 'Nachos', quantity: 1, price: 150}], snacksPrice: 150, status: 'Pending', theaterId: 22 },
    { city: 'Jaipur', seat: 'D12', snacks: [{name: 'Popcorn Large', quantity: 1, price: 250}], snacksPrice: 250, status: 'Preparing', theaterId: 25 },
    { city: 'Lucknow', seat: 'F1', snacks: [{name: 'Coke', quantity: 2, price: 200}], snacksPrice: 200, status: 'Pending', theaterId: 28 }
  ];

  let nextBookingId = 10000003;
  cityMockBookings.forEach(mock => {
    const show = db.prepare('SELECT id FROM shows WHERE city = ? LIMIT 1').get(mock.city) as { id: number };
    if (show) {
      insertBooking.run(nextBookingId, 1, show.id, mock.city, JSON.stringify([mock.seat]), 500, new Date().toISOString(), JSON.stringify(mock.snacks), mock.snacksPrice, mock.status);
      insertSeat.run(mock.theaterId, mock.theaterId, show.id, mock.seat, 'Booked', 1, nextBookingId);
      nextBookingId++;
    }
  });
}

const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
if (eventCount.count === 0) {
  const insertEvent = db.prepare('INSERT INTO events (title, posterUrl, category, date, time, venue, city, price, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  
  // Mumbai
  insertEvent.run('Coldplay Music of the Spheres', 'https://wsrv.nl/?url=images.unsplash.com/photo-1540039155733-5bb30b53aa14&auto=format&fit=crop&w=800&q=80', 'Concert', '2026-11-15', '19:00', 'DY Patil Stadium', 'Mumbai', 4500, 'Experience the magic of Coldplay live in Mumbai.');
  insertEvent.run('Hamlet by Shakespeare', 'https://wsrv.nl/?url=images.unsplash.com/photo-1507676184212-d03ab07a01bf&auto=format&fit=crop&w=800&q=80', 'Theatre', '2026-05-10', '18:30', 'Prithvi Theatre', 'Mumbai', 800, 'A classic rendition of Shakespeare\'s masterpiece.');
  insertEvent.run('Food Truck Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1555939594-58d7cb561ad1&auto=format&fit=crop&w=800&q=80', 'Festivals', '2026-06-12', '12:00', 'Jio World Drive', 'Mumbai', 500, 'Taste the best street food from around the world.');
  insertEvent.run('ISL: Mumbai City FC vs Kerala Blasters', 'https://wsrv.nl/?url=images.unsplash.com/photo-1574629810360-7efbbe195018&auto=format&fit=crop&w=800&q=80', 'Sports', '2026-08-20', '20:00', 'Mumbai Football Arena', 'Mumbai', 800, 'Catch the live football action.');
  insertEvent.run('Arijit Singh Live', 'https://wsrv.nl/?url=images.unsplash.com/photo-1470225620780-dba8ba36b745&auto=format&fit=crop&w=800&q=80', 'Concert', '2026-12-25', '19:00', 'MMRDA Grounds', 'Mumbai', 3000, 'Soulful melodies by Arijit Singh.');

  // Bengaluru
  insertEvent.run('Trevor Noah: Off The Record', 'https://wsrv.nl/?url=images.unsplash.com/photo-1585699324551-f6c309eedeca&w=800&q=80', 'Comedy', '2026-10-20', '20:00', 'Manpho Convention Centre', 'Bengaluru', 2500, 'Get ready for a night of non-stop laughter with Trevor Noah.');
  insertEvent.run('Sunburn Arena ft. Martin Garrix', 'https://wsrv.nl/?url=images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3&auto=format&fit=crop&w=800&q=80', 'Concert', '2026-12-05', '18:00', 'Bhartiya City', 'Bengaluru', 3000, 'The biggest EDM festival is back with Martin Garrix.');

  // Ahmedabad
  insertEvent.run('Garba Night: Falguni Pathak', 'https://wsrv.nl/?url=images.unsplash.com/photo-1583417319070-4a69db38a482&auto=format&fit=crop&w=800&q=80', 'Concert', '2026-10-12', '20:00', 'GMDC Ground', 'Ahmedabad', 1200, 'Celebrate Navratri with the Queen of Dandiya.');
  
  // Jaipur
  insertEvent.run('Jaipur Literature Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1524995997946-a1c2e315a42f&auto=format&fit=crop&w=800&q=80', 'Festivals', '2026-01-25', '10:00', 'Diggi Palace', 'Jaipur', 0, 'The world\'s largest free literary festival.');
  
  // Lucknow
  insertEvent.run('Lucknow Mahotsav', 'https://wsrv.nl/?url=images.unsplash.com/photo-1517604931442-7e0c8ed2963c&auto=format&fit=crop&w=800&q=80', 'Festivals', '2026-11-25', '11:00', 'Awadh Shilpgram', 'Lucknow', 50, 'A celebration of Art, Culture and Cuisine of Avadh.');
  insertEvent.run('IPL 2026: RCB vs CSK', 'https://wsrv.nl/?url=images.unsplash.com/photo-1540747913346-19e32dc3e97e&w=800&q=80', 'Sports', '2026-04-15', '19:30', 'M. Chinnaswamy Stadium', 'Bengaluru', 1500, 'Witness the epic clash between RCB and CSK.');
  insertEvent.run('Comic Con Bengaluru', 'https://wsrv.nl/?url=images.unsplash.com/photo-1612487528505-d2338264c821&w=800&q=80', 'Festivals', '2026-11-20', '10:00', 'BIEC', 'Bengaluru', 800, 'The biggest pop culture event of the year.');

  // Delhi
  insertEvent.run('Pottery Workshop', 'https://wsrv.nl/?url=images.unsplash.com/photo-1565191999001-551c187427bb&w=800&q=80', 'Workshops', '2026-07-01', '10:00', 'Clay Studio', 'Delhi', 1200, 'Learn the art of pottery in this hands-on workshop.');
  insertEvent.run('Zakir Khan Live', 'https://wsrv.nl/?url=images.unsplash.com/photo-1516280440614-37939bbacd81&w=800&q=80', 'Comedy', '2026-09-15', '19:30', 'Siri Fort Auditorium', 'Delhi', 1500, 'Stand-up comedy special by Zakir Khan.');
  insertEvent.run('Delhi Book Fair', 'https://wsrv.nl/?url=images.unsplash.com/photo-1507842217343-583bb7270b66&w=800&q=80', 'Festivals', '2026-08-10', '10:00', 'Pragati Maidan', 'Delhi', 200, 'Explore thousands of books from various publishers.');
  insertEvent.run('Diljit Dosanjh Concert', 'https://wsrv.nl/?url=images.unsplash.com/photo-1493225255756-d9584f8606e9&w=800&q=80', 'Concert', '2026-11-05', '19:00', 'JLN Stadium', 'Delhi', 3500, 'High energy performance by Diljit Dosanjh.');

  // Hyderabad
  insertEvent.run('IPL 2026: SRH vs MI', 'https://wsrv.nl/?url=images.unsplash.com/photo-1531415074968-036ba1b575da&w=800&q=80', 'Sports', '2026-04-20', '19:30', 'Rajiv Gandhi International Stadium', 'Hyderabad', 1200, 'Catch the home team in action.');
  insertEvent.run('Hyderabad Literary Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1463320726281-696a485928c7&w=800&q=80', 'Festivals', '2026-01-26', '10:00', 'Vidyaranya High School', 'Hyderabad', 0, 'A celebration of literature and arts.');
  insertEvent.run('Shreya Ghoshal Live', 'https://wsrv.nl/?url=images.unsplash.com/photo-1498038432885-c6f3f1b912ee&w=800&q=80', 'Concert', '2026-10-10', '19:00', 'Gachibowli Stadium', 'Hyderabad', 2500, 'A magical evening with Shreya Ghoshal.');

  // Chennai
  insertEvent.run('Margazhi Music Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1511671782779-c97d3d27a1d4&w=800&q=80', 'Concert', '2026-12-15', '16:00', 'Music Academy', 'Chennai', 500, 'Annual Carnatic music festival.');
  insertEvent.run('IPL 2026: CSK vs KKR', 'https://wsrv.nl/?url=images.unsplash.com/photo-1512719994953-eabf50895df7&w=800&q=80', 'Sports', '2026-05-05', '19:30', 'M. A. Chidambaram Stadium', 'Chennai', 1500, 'Cheer for the men in yellow.');
  insertEvent.run('Standup by Alex', '/assets/events/comedy.png', 'Comedy', '2026-08-25', '19:00', 'Sir Mutha Venkatasubba Rao Concert Hall', 'Chennai', 1000, 'Musical standup comedy.');

  // Kolkata
  insertEvent.run('Kolkata International Film Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1485846234645-a62644f84728&w=800&q=80', 'Festivals', '2026-12-05', '10:00', 'Nandan', 'Kolkata', 100, 'Screening of international and regional films.');
  insertEvent.run('Mohun Bagan vs East Bengal', 'https://wsrv.nl/?url=images.unsplash.com/photo-1574629810360-7efbbe195018&w=800&q=80', 'Sports', '2026-09-10', '17:00', 'Salt Lake Stadium', 'Kolkata', 500, 'The historic Kolkata Derby.');

  // Pune
  insertEvent.run('NH7 Weekender', 'https://wsrv.nl/?url=images.unsplash.com/photo-1545128485-c400e7702796&w=800&q=80', 'Concert', '2026-11-29', '15:00', 'Mahalakshmi Lawns', 'Pune', 3500, 'The happiest music festival.');
  insertEvent.run('Pune Comedy Festival', 'https://wsrv.nl/?url=images.unsplash.com/photo-1516280440614-37939bbacd81&w=800&q=80', 'Comedy', '2026-07-15', '18:00', 'Balewadi Stadium', 'Pune', 1500, 'Two days of non-stop comedy.');
  insertEvent.run('Osho Meditation Camp', 'https://wsrv.nl/?url=images.unsplash.com/photo-1506126613408-eca07ce68773&w=800&q=80', 'Workshops', '2026-06-20', '08:00', 'Osho Ashram', 'Pune', 2000, 'A weekend of meditation and mindfulness.');
}

const eventBookingCount = db.prepare('SELECT COUNT(*) as count FROM event_bookings').get() as { count: number };
if (eventBookingCount.count === 0) {
  const insertEventBooking = db.prepare('INSERT INTO event_bookings (id, userId, eventId, tickets, totalPrice, bookingDate) VALUES (?, ?, ?, ?, ?, ?)');
  insertEventBooking.run(20000001, 1, 1, 2, 9000, new Date().toISOString());
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/movies', (req, res) => {
  try {
    const { q, city } = req.query;
    let query = 'SELECT DISTINCT m.id, m.title, m.posterUrl, m.backdropUrl, m.rating, m.genre, m.language, m.duration, m.description, m.trailerUrl FROM movies m';
    const params: any[] = [];
    
    // If city is provided and not 'All', filter by city
    if (city && city !== 'All') {
      // Return movies that have shows in this city
      query += ' JOIN shows s ON m.id = s.movieId WHERE s.city = ?';
      params.push(city);
    } else {
      query += ' WHERE 1=1';
    }

    if (q) {
      query += ' AND (m.title LIKE ? OR m.genre LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    let movies = db.prepare(query).all(...params);
    
    // If city was provided but no movies found for that city, fallback to all movies
    // but only if we are on the home page (which usually implies city is selected)
    if (movies.length === 0 && city && city !== 'All') {
      let fallbackQuery = 'SELECT * FROM movies WHERE 1=1';
      const fallbackParams: any[] = [];
      if (q) {
        fallbackQuery += ' AND (title LIKE ? OR genre LIKE ?)';
        fallbackParams.push(`%${q}%`, `%${q}%`);
      }
      movies = db.prepare(fallbackQuery).all(...fallbackParams);
    }

    res.json(movies);
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

app.get('/api/movies/:id', (req, res) => {
  try {
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(req.params.id);
    if (movie) {
      res.json(movie);
    } else {
      res.status(404).json({ error: 'Movie not found' });
    }
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ error: 'Failed to fetch movie' });
  }
});

app.get('/api/movies/:id/reviews', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT reviews.*, users.name as userName
      FROM reviews
      JOIN users ON reviews.userId = users.id
      WHERE reviews.movieId = ?
      ORDER BY reviews.createdAt DESC
    `).all(req.params.id);
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.get('/api/theaters', (req, res) => {
  try {
    const city = req.query.city as string;
    let query = 'SELECT * FROM theaters';
    const params: any[] = [];
    if (city) {
      query += ' WHERE city = ?';
      params.push(city);
    }
    const theaters = db.prepare(query).all(...params);
    res.json(theaters);
  } catch (error) {
    console.error('Error fetching theaters:', error);
    res.status(500).json({ error: 'Failed to fetch theaters' });
  }
});

app.get('/api/shows', (req, res) => {
  try {
    const { city, movieId } = req.query;
    let query = `
      SELECT shows.*, theaters.name as theaterName, theaters.city, theaters.screenType 
      FROM shows 
      JOIN theaters ON shows.theaterId = theaters.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (city) {
      query += ` AND theaters.city = ?`;
      params.push(city);
    }
    if (movieId) {
      query += ` AND shows.movieId = ?`;
      params.push(movieId);
    }
    
    const shows = db.prepare(query).all(...params);
    res.json(shows);
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ error: 'Failed to fetch shows' });
  }
});

app.get('/api/shows/:id', (req, res) => {
  try {
    const show = db.prepare(`
      SELECT shows.*, theaters.name as theaterName, theaters.city, theaters.screenType, movies.title as movieTitle
      FROM shows 
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      WHERE shows.id = ?
    `).get(req.params.id);
    
    if (show) {
      res.json(show);
    } else {
      res.status(404).json({ error: 'Show not found' });
    }
  } catch (error) {
    console.error('Error fetching show:', error);
    res.status(500).json({ error: 'Failed to fetch show' });
  }
});

app.post('/api/bookings', (req, res) => {
  const { userId, showId, seats, totalPrice, snacks, snacksPrice } = req.body;
  
  try {
    // Check if seats are already booked
    for (const seat of seats) {
      const existingSeat = db.prepare('SELECT * FROM seats WHERE showId = ? AND seatNumber = ? AND status = ?').get(showId, seat, 'Booked');
      if (existingSeat) {
        return res.status(400).json({ error: `Seat ${seat} is already booked.` });
      }
    }

    const show = db.prepare('SELECT * FROM shows WHERE id = ?').get(showId) as any;
    if (!show) {
      return res.status(404).json({ error: 'Show not found.' });
    }

    const insert = db.prepare('INSERT INTO bookings (userId, showId, city, seats, totalPrice, bookingDate, snacks, snacksPrice, orderStatus) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const result = insert.run(userId || 1, showId, show.city, JSON.stringify(seats), totalPrice, new Date().toISOString(), JSON.stringify(snacks || []), snacksPrice || 0, 'Pending');
    const bookingId = result.lastInsertRowid;

    // Update seats to Booked
    const bookingDate = new Date().toISOString();
    for (const seat of seats) {
      const existingSeat = db.prepare('SELECT * FROM seats WHERE showId = ? AND seatNumber = ?').get(showId, seat) as any;
      if (existingSeat) {
        db.prepare('UPDATE seats SET status = ?, userId = ?, bookingId = ?, lockedUntil = NULL WHERE id = ?')
          .run('Booked', userId || 1, bookingId, existingSeat.id);
      } else {
        db.prepare('INSERT INTO seats (theaterId, screenId, showId, seatNumber, status, userId, bookingId) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(show.theaterId, show.theaterId, showId, seat, 'Booked', userId || 1, bookingId);
      }
      io.to(`show_${showId}`).emit('seat_updated', { showId, seatNumber: seat, status: 'Booked', userId: userId || 1, bookingId, bookingDate: new Date().toISOString(), snacks: JSON.stringify(snacks || []), orderStatus: 'Pending' });
    }

    io.emit('newBooking', { bookingId, showId, theaterId: show.theaterId, city: show.city });
    io.emit('admin_stats_update');
    if (snacks && snacks.length > 0) {
      io.emit('newFoodOrder', { bookingId, showId, theaterId: show.theaterId, city: show.city, snacks });
    }

    res.json({ success: true, bookingId });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Booking failed' });
  }
});

app.get('/api/bookings/:id', (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT bookings.*, shows.time as showTime, theaters.name as theaterName, theaters.screenType, movies.title as movieTitle
      FROM bookings
      JOIN shows ON bookings.showId = shows.id
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      WHERE bookings.id = ?
    `).get(req.params.id);
    
    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ error: 'Booking not found' });
    }
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

app.get('/api/users/:userId/bookings', (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT bookings.*, shows.time as showTime, theaters.name as theaterName, theaters.city, theaters.screenType, movies.title as movieTitle
      FROM bookings
      JOIN shows ON bookings.showId = shows.id
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      WHERE bookings.userId = ?
      ORDER BY bookings.bookingDate DESC
    `).all(req.params.userId);
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user bookings' });
  }
});

app.get('/api/events', (req, res) => {
  try {
    const { category, city } = req.query;
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: any[] = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (city && city !== 'All') {
      query += ' AND city = ?';
      params.push(city);
    }

    let events = db.prepare(query).all(...params);
    
    // Fallback to all events if none found for city
    if (events.length === 0 && city && city !== 'All') {
      let fallbackQuery = 'SELECT * FROM events WHERE 1=1';
      const fallbackParams: any[] = [];
      if (category) {
        fallbackQuery += ' AND category = ?';
        fallbackParams.push(category);
      }
      events = db.prepare(fallbackQuery).all(...fallbackParams);
    }

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/events/:id', (req, res) => {
  try {
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    if (event) {
      res.json(event);
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

app.post('/api/event-bookings', (req, res) => {
  const { userId, eventId, tickets, totalPrice } = req.body;
  
  try {
    const insert = db.prepare('INSERT INTO event_bookings (userId, eventId, tickets, totalPrice, bookingDate) VALUES (?, ?, ?, ?, ?)');
    const result = insert.run(userId || 1, eventId, tickets, totalPrice, new Date().toISOString());
    res.json({ success: true, bookingId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Event booking failed' });
  }
});

app.get('/api/event-bookings/:id', (req, res) => {
  try {
    const booking = db.prepare(`
      SELECT event_bookings.*, events.title as eventTitle, events.date as eventDate, events.time as eventTime, events.venue, events.city
      FROM event_bookings
      JOIN events ON event_bookings.eventId = events.id
      WHERE event_bookings.id = ?
    `).get(req.params.id);
    
    if (booking) {
      res.json(booking);
    } else {
      res.status(404).json({ error: 'Event booking not found' });
    }
  } catch (error) {
    console.error('Error fetching event booking:', error);
    res.status(500).json({ error: 'Failed to fetch event booking' });
  }
});

app.get('/api/users/:userId/event-bookings', (req, res) => {
  try {
    const bookings = db.prepare(`
      SELECT event_bookings.*, events.title as eventTitle, events.date as eventDate, events.time as eventTime, events.venue, events.city
      FROM event_bookings
      JOIN events ON event_bookings.eventId = events.id
      WHERE event_bookings.userId = ?
      ORDER BY event_bookings.bookingDate DESC
    `).all(req.params.userId);
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user event bookings:', error);
    res.status(500).json({ error: 'Failed to fetch user event bookings' });
  }
});

// Vendor APIs
app.post('/api/vendor/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ? AND role = 'vendor'").get(email, password);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials or not a vendor' });
    }
  } catch (error) {
    console.error('Error during vendor login:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

app.get('/api/vendor/orders', (req, res) => {
  try {
    const city = req.query.city as string;
    let query = `
      SELECT bookings.id, bookings.seats, bookings.snacks, bookings.snacksPrice, bookings.orderStatus, bookings.bookingDate,
             shows.time as showTime, theaters.name as theaterName, theaters.screenType, movies.title as movieTitle,
             users.name as userName, users.email as userEmail
      FROM bookings
      JOIN shows ON bookings.showId = shows.id
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      JOIN users ON bookings.userId = users.id
    `;
    const params: any[] = [];
    
    if (city) {
      query += ` WHERE theaters.city = ?`;
      params.push(city);
    }
    
    query += ` ORDER BY bookings.bookingDate DESC`;
    
    const orders = db.prepare(query).all(...params);
    console.log('Vendor orders:', orders);
    res.json(orders);
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Failed to fetch vendor orders' });
  }
});

app.put('/api/vendor/orders/:id/status', (req, res) => {
  const { status } = req.body;
  try {
    db.prepare('UPDATE bookings SET orderStatus = ? WHERE id = ?').run(status, req.params.id);
    io.emit('orderStatusUpdate', { id: req.params.id, status });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/admin/dashboard/:theatreId', (req, res) => {
  const theatreId = req.params.theatreId;
  
  try {
    const totalBookingsRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings b
      JOIN shows s ON b.showId = s.id
      WHERE s.theaterId = ?
    `).get(theatreId) as { count: number };
    
    const totalRevenueRow = db.prepare(`
      SELECT SUM(totalPrice) as ticketRevenue, SUM(snacksPrice) as foodRevenue
      FROM bookings b
      JOIN shows s ON b.showId = s.id
      WHERE s.theaterId = ?
    `).get(theatreId) as { ticketRevenue: number, foodRevenue: number };
    
    const showAnalytics = db.prepare(`
      SELECT 
        s.id as showId,
        m.title as movieName,
        s.time as showTime,
        COUNT(se.id) as totalSeats,
        SUM(CASE WHEN se.status = 'Booked' THEN 1 ELSE 0 END) as bookedSeatsCount
      FROM shows s
      JOIN movies m ON s.movieId = m.id
      LEFT JOIN seats se ON s.id = se.showId
      WHERE s.theaterId = ?
      GROUP BY s.id
    `).all(theatreId) as any[];

    const showWiseAnalytics = showAnalytics.map(show => {
      const occupancy = show.totalSeats > 0 ? Math.round((show.bookedSeatsCount / show.totalSeats) * 100) : 0;
      return {
        movieName: show.movieName,
        showTime: show.showTime,
        bookedSeatsCount: show.bookedSeatsCount,
        totalSeats: show.totalSeats,
        occupancyPercentage: occupancy
      };
    });

    res.json({
      totalBookings: totalBookingsRow.count || 0,
      totalRevenue: (totalRevenueRow.ticketRevenue || 0) + (totalRevenueRow.foodRevenue || 0),
      ticketRevenue: totalRevenueRow.ticketRevenue || 0,
      foodRevenue: totalRevenueRow.foodRevenue || 0,
      showWiseAnalytics
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/admin/bookings', (req, res) => {
  try {
    const query = `
      SELECT bookings.id, bookings.seats, bookings.totalPrice, bookings.bookingDate, bookings.snacks, bookings.orderStatus,
             shows.time as showTime, theaters.name as theaterName, theaters.city, movies.title as movieTitle, users.name as userName, users.email as userEmail
      FROM bookings
      JOIN shows ON bookings.showId = shows.id
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      JOIN users ON bookings.userId = users.id
      ORDER BY bookings.bookingDate DESC
    `;
    const bookings = db.prepare(query).all();
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching admin bookings:', error);
    res.status(500).json({ error: 'Failed to fetch admin bookings' });
  }
});

// Theatre Admin APIs
app.post('/api/theatre-admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND password = ? AND role = 'theatre_admin'").get(email, password);
    
    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(401).json({ error: 'Invalid credentials or not a theatre admin' });
    }
  } catch (error) {
    console.error('Error during theatre admin login:', error);
    res.status(500).json({ error: 'Failed to process login' });
  }
});

app.get('/api/theatre-admin/bookings', (req, res) => {
  try {
    const city = req.query.city as string;
    
    let query = `
      SELECT bookings.id, bookings.seats, bookings.totalPrice, bookings.bookingDate, bookings.snacks, bookings.orderStatus,
             shows.time as showTime, theaters.name as theaterName, theaters.city, movies.title as movieTitle, users.name as userName, users.email as userEmail
      FROM bookings
      JOIN shows ON bookings.showId = shows.id
      JOIN theaters ON shows.theaterId = theaters.id
      JOIN movies ON shows.movieId = movies.id
      JOIN users ON bookings.userId = users.id
    `;
    const params: any[] = [];
    
    if (city) {
      query += ` WHERE theaters.city = ?`;
      params.push(city);
    }
    
    query += ` ORDER BY bookings.bookingDate DESC`;
    
    const bookings = db.prepare(query).all(...params);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching theatre admin bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.get('/api/theatre-admin/shows', (req, res) => {
  try {
    const city = req.query.city as string;
    
    let query = `
      SELECT shows.id, shows.time, shows.price, movies.title as movieTitle, theaters.name as theaterName, theaters.screenType
      FROM shows
      JOIN movies ON shows.movieId = movies.id
      JOIN theaters ON shows.theaterId = theaters.id
    `;
    
    const params: any[] = [];
    if (city) {
      query += ` WHERE theaters.city = ?`;
      params.push(city);
    }
    
    query += ` ORDER BY shows.time ASC`;
    
    const shows = db.prepare(query).all(...params);
    
    res.json(shows);
  } catch (error) {
    console.error('Error fetching theatre admin shows:', error);
    res.status(500).json({ error: 'Failed to fetch shows' });
  }
});

app.get('/api/theatre-admin/analytics', (req, res) => {
  try {
    const city = req.query.city as string;
    
    let totalBookingsQuery = 'SELECT COUNT(*) as count FROM bookings';
    let totalRevenueQuery = 'SELECT SUM(totalPrice) as total, SUM(snacksPrice) as foodTotal FROM bookings';
    let seatsStatsQuery = `
      SELECT 
        SUM(CASE WHEN seats.status = 'Booked' THEN 1 ELSE 0 END) as bookedSeats,
        SUM(CASE WHEN seats.status = 'Available' THEN 1 ELSE 0 END) as availableSeats
      FROM seats
    `;
    let showPerformanceQuery = `
      SELECT s.id, m.title as movieTitle, s.time, 
             COUNT(b.id) as bookingsCount, 
             SUM(b.totalPrice) as revenue,
             150 as totalSeats,
             (SELECT COUNT(*) FROM seats WHERE showId = s.id AND status = 'Booked') as bookedSeatsCount
      FROM shows s
      JOIN movies m ON s.movieId = m.id
      LEFT JOIN bookings b ON s.id = b.showId
    `;
    
    const params: any[] = [];
    
    if (city) {
      totalBookingsQuery += ' WHERE city = ?';
      totalRevenueQuery += ' WHERE city = ?';
      
      seatsStatsQuery += `
        JOIN shows ON seats.showId = shows.id
        JOIN theaters ON shows.theaterId = theaters.id
        WHERE theaters.city = ?
      `;
      
      showPerformanceQuery += `
        JOIN theaters ON s.theaterId = theaters.id
        WHERE theaters.city = ?
      `;
      
      params.push(city);
    }
    
    showPerformanceQuery += `
      GROUP BY s.id
      ORDER BY revenue DESC
      LIMIT 10
    `;

    const totalBookings = db.prepare(totalBookingsQuery).get(...params) as { count: number };
    const revenueData = db.prepare(totalRevenueQuery).get(...params) as { total: number, foodTotal: number };
    const seatsStats = db.prepare(seatsStatsQuery).get(...params) as { bookedSeats: number, availableSeats: number };
    const showPerformance = db.prepare(showPerformanceQuery).all(...params);

    res.json({
      totalBookings: totalBookings.count,
      totalRevenue: revenueData.total || 0,
      foodRevenue: revenueData.foodTotal || 0,
      ticketRevenue: (revenueData.total || 0) - (revenueData.foodTotal || 0),
      bookedSeats: seatsStats.bookedSeats || 0,
      availableSeats: seatsStats.availableSeats || 0,
      showPerformance
    });
  } catch (error) {
    console.error('Error fetching theatre admin analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/shows/:id/seats', (req, res) => {
  try {
    // Clean up expired locks first
    db.prepare('UPDATE seats SET status = ?, userId = NULL, lockedUntil = NULL WHERE status = ? AND lockedUntil < ?')
      .run('Available', 'Locked', Date.now());

    const seats = db.prepare(`
      SELECT seats.*, bookings.bookingDate, bookings.snacks, bookings.orderStatus 
      FROM seats 
      LEFT JOIN bookings ON seats.bookingId = bookings.id 
      WHERE seats.showId = ?
    `).all(req.params.id);
    res.json(seats);
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).json({ error: 'Failed to fetch seats' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      configFile: './vite.config.ts'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  // Socket.io logic
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_show', (showId) => {
      socket.join(`show_${showId}`);
    });

    socket.on('lock_seat', ({ showId, seatNumber, userId }) => {
      const lockedUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      try {
        const show = db.prepare('SELECT * FROM shows WHERE id = ?').get(showId) as any;
        if (!show) return;

        const existingSeat = db.prepare('SELECT * FROM seats WHERE showId = ? AND seatNumber = ?').get(showId, seatNumber) as any;
        
        if (existingSeat) {
          if (existingSeat.status === 'Available' || (existingSeat.status === 'Locked' && existingSeat.lockedUntil < Date.now())) {
            db.prepare('UPDATE seats SET status = ?, userId = ?, lockedUntil = ? WHERE id = ?')
              .run('Locked', userId, lockedUntil, existingSeat.id);
            io.to(`show_${showId}`).emit('seat_updated', { showId, seatNumber, status: 'Locked', userId });
            io.emit('seatLocked', { showId, seatNumber, userId });
            io.emit('admin_stats_update');
          }
        } else {
          db.prepare('INSERT INTO seats (theaterId, screenId, showId, seatNumber, status, userId, lockedUntil) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(show.theaterId, show.theaterId, showId, seatNumber, 'Locked', userId, lockedUntil);
          io.to(`show_${showId}`).emit('seat_updated', { showId, seatNumber, status: 'Locked', userId });
          io.emit('seatLocked', { showId, seatNumber, userId });
          io.emit('admin_stats_update');
        }
      } catch (error) {
        console.error('Error locking seat:', error);
      }
    });

    socket.on('unlock_seat', ({ showId, seatNumber, userId }) => {
      try {
        const existingSeat = db.prepare('SELECT * FROM seats WHERE showId = ? AND seatNumber = ? AND userId = ? AND status = ?').get(showId, seatNumber, userId, 'Locked') as any;
        if (existingSeat) {
          db.prepare('UPDATE seats SET status = ?, userId = NULL, lockedUntil = NULL WHERE id = ?').run('Available', existingSeat.id);
          io.to(`show_${showId}`).emit('seat_updated', { showId, seatNumber, status: 'Available' });
          io.emit('admin_stats_update');
        }
      } catch (error) {
        console.error('Error unlocking seat:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
