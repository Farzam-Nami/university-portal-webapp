const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const publicDirectory = path.join(projectRoot, 'public');

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            return walk(fullPath);
        }

        return [fullPath];
    });
}

const projectFiles = walk(projectRoot);

test('required frontend pages and assets are present', () => {
    const requiredFiles = [
        'index.html',
        'login.html',
        'signup.html',
        'dashboard.html',
        'profile.html',
        'courses.html',
        'food-reservation.html',
        'financial.html',
        'news.html',
        'news-detail.html',
        'requests.html',
        'styles.css',
        'sidebar.js',
        'courses.js',
        'food-reservation.js',
        'back_img.jpg'
    ];

    requiredFiles.forEach(file => {
        assert.ok(fs.existsSync(path.join(publicDirectory, file)), `${file} should exist`);
    });
});

test('HTML pages declare English language and left-to-right layout', () => {
    const htmlFiles = projectFiles.filter(file => file.endsWith('.html'));

    htmlFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        assert.match(content, /<html[^>]*lang="en"[^>]*dir="ltr"/i, path.relative(projectRoot, file));
    });
});

test('source and documentation files contain no Persian-script text', () => {
    const textFiles = projectFiles.filter(file =>
        /\.(html|js|css|json|md)$/.test(file)
    );
    const persianScript = /[\u0600-\u06FF]/;

    textFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        assert.equal(persianScript.test(content), false, path.relative(projectRoot, file));
    });
});

test('local database files and dependency folders are excluded', () => {
    const forbiddenExtensions = new Set([
        '.db',
        '.sqlite',
        '.sqlite3',
        '.bson',
        '.dump',
        '.archive'
    ]);

    projectFiles.forEach(file => {
        assert.equal(forbiddenExtensions.has(path.extname(file).toLowerCase()), false,
            path.relative(projectRoot, file));
        assert.equal(path.basename(file).startsWith('.env'), false,
            path.relative(projectRoot, file));
        assert.equal(file.split(path.sep).includes('node_modules'), false,
            path.relative(projectRoot, file));
    });
});

test('database connection uses environment configuration', () => {
    const databaseSource = fs.readFileSync(path.join(projectRoot, 'db.js'), 'utf8');

    assert.match(databaseSource, /process\.env\.MONGODB_URI/);
    assert.match(databaseSource, /process\.env\.MONGODB_DB/);
});

test('no sample account or hard-coded registration payload is included', () => {
    const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const databaseSource = fs.readFileSync(path.join(projectRoot, 'db.js'), 'utf8');

    assert.doesNotMatch(serverSource, /testuser/i);
    assert.doesNotMatch(serverSource, /Received registration data/i);
    assert.doesNotMatch(serverSource, /Login attempt for/i);
    assert.doesNotMatch(databaseSource, /initializeCoursesCollection/);
});

test('package scripts provide start, development, and test commands', () => {
    const packageData = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );

    assert.equal(packageData.scripts.start, 'node server.js');
    assert.equal(packageData.scripts.dev, 'nodemon server.js');
    assert.equal(packageData.scripts.test, 'node --test');
});

test('server page routes point to existing frontend files', () => {
    const serverSource = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
    const expectedPageFiles = [
        'index.html',
        'login.html',
        'signup.html',
        'dashboard.html',
        'profile.html',
        'courses.html',
        'food-reservation.html',
        'financial.html',
        'news.html',
        'news-detail.html',
        'requests.html'
    ];

    expectedPageFiles.forEach(file => {
        assert.ok(fs.existsSync(path.join(publicDirectory, file)), `${file} should exist`);
        assert.ok(serverSource.includes(`'${file}'`), `server.js should reference ${file}`);
    });
});
