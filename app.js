async function searchMovie() {
  const query = document.getElementById("searchInput").value;

  const res = await fetch(`/api/search?query=${query}`);
  const data = await res.json();

  if (!data.results.length) return;

  const movie = data.results[0];

  document.getElementById("target").innerHTML = `
    <div class="card">
      <h2>${movie.title}</h2>
      <p>${movie.overview}</p>
      <p>⭐ ${movie.vote_average}</p>
    </div>
  `;

  loadSimilar(movie.id);
}

async function loadSimilar(id) {
  const res = await fetch(`/api/similar?id=${id}`);
  const data = await res.json();

  let html = "<h2>Similar Movies</h2>";

  data.results.forEach(m => {
    html += `
      <div class="card">
        <h3>${m.title}</h3>
        <p>${m.overview}</p>
        <p>⭐ ${m.vote_average}</p>
      </div>
    `;
  });

  document.getElementById("similar").innerHTML = html;
}
