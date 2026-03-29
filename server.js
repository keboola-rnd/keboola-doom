import express from 'express';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Keboola POSTs to / on startup — handle all methods
app.all('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));

// Serve static files (src/, mp3, etc.) — index:false so '/' goes through app.all above
app.use(express.static(__dirname, { index: false }));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Keboola Doom running on port ${PORT}`);
});
