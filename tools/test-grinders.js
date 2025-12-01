(async () => {
  const headers = {};
  if (process.env.AUTH_TOKEN) headers['Authorization'] = `Bearer ${process.env.AUTH_TOKEN}`;
  const res = await fetch('http://localhost:3000/api/grinders', { headers });
  const grinders = await res.json();
  const html = grinders.map(g => {
    return `<div data-id="${g.id}">${g.name} <span>${g.notes}</span></div>`;
  }).join('\n');
  console.log('Simulated grinders-list:');
  console.log(html);
})();
