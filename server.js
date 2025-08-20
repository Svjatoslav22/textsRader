const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const TEXTS_FILE = path.join(__dirname, 'texts.json');

function loadTexts() {
    try {
        if (fs.existsSync(TEXTS_FILE)) {
            const data = fs.readFileSync(TEXTS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Помилка завантаження текстів:', error);
    }
    return {};
}

function saveTexts(texts) {
    try {
        fs.writeFileSync(TEXTS_FILE, JSON.stringify(texts, null, 2));
        return true;
    } catch (error) {
        console.error('Помилка збереження текстів:', error);
        return false;
    }
}

function generateName(texts) {
    return `Текст ${Object.keys(texts).length + 1}`;
}

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (pathname === '/api/texts') {
        if (req.method === 'GET') {
            const texts = loadTexts();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(texts));
        } 
        else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const { content } = JSON.parse(body);
                    const texts = loadTexts();
                    const name = generateName(texts);
                    texts[name] = content;
                    
                    if (saveTexts(texts)) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, name: name }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Помилка збереження тексту' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Невірний формат даних' }));
                }
            });
        }
        else if (req.method === 'DELETE') {
            const name = parsedUrl.query.name;
            if (!name) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Не вказано назву тексту' }));
                return;
            }
            
            const texts = loadTexts();
            if (texts[name]) {
                delete texts[name];
                if (saveTexts(texts)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Помилка видалення тексту' }));
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Текст не знайдено' }));
            }
        }
        return;
    }
    
    // Обслуговування статичних файлів
    const publicPath = path.join(__dirname, '../public');
    let filePath = path.join(publicPath, req.url === '/' ? '/index.html' : req.url);
    
    if (!filePath.startsWith(publicPath)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const extname = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };
    
    const contentType = contentTypes[extname] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File Not Found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});