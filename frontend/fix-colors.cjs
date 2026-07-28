const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('d:\\PGDAC Project\\proposal-governance-platform\\frontend\\src');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace color: '#fff' / 'white' / '#ffffff'
    content = content.replace(/color:\s*['"](?:#fff|#ffffff|white)['"]/g, "color: 'var(--text-primary)'");
    
    // Replace color: 'rgba(255,255,255, >0.7)'
    content = content.replace(/color:\s*['"]rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[789]\d*\s*\)['"]/g, "color: 'var(--text-primary)'");

    // Replace color: 'rgba(255,255,255, <0.7)'
    content = content.replace(/color:\s*['"]rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.[1-6]\d*\s*\)['"]/g, "color: 'var(--text-secondary)'");

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed:', file);
        changedFiles++;
    }
});

console.log(`Done! Fixed ${changedFiles} files.`);
