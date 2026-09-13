// This is the "frontend brain" — it runs in your browser, talks to the
// server (via fetch) to load/save/delete recipes, and updates the page.

const recipeForm = document.getElementById('recipeForm');
const recipeList = document.getElementById('recipeList');
const searchInput = document.getElementById('searchInput');
const emptyMessage = document.getElementById('emptyMessage');
const toggleFormBtn = document.getElementById('toggleFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const addForm = document.getElementById('addForm');

let allRecipes = []; // cached copy of everything loaded from the server

// Show/hide the "add recipe" form
toggleFormBtn.addEventListener('click', () => {
  addForm.classList.toggle('hidden');
});
cancelFormBtn.addEventListener('click', () => {
  addForm.classList.add('hidden');
  recipeForm.reset();
});

// Load all recipes from the server and display them
async function loadRecipes() {
  const res = await fetch('/api/recipes');
  allRecipes = await res.json();
  renderRecipes(allRecipes);
}

// Turn a list of recipes into HTML cards on the page
function renderRecipes(recipes) {
  recipeList.innerHTML = '';

  if (recipes.length === 0) {
    const isSearching = searchInput.value.trim().length > 0;
    emptyMessage.textContent = isSearching
      ? 'No recipes match your search.'
      : 'No recipes yet. Add your first one above!';
    emptyMessage.classList.remove('hidden');
    return;
  }
  emptyMessage.classList.add('hidden');

  for (const recipe of recipes) {
    const card = document.createElement('div');
    card.className = 'recipe-card';

    const title = document.createElement('h3');
    title.textContent = recipe.name;
    card.appendChild(title);

    if (recipe.url) {
      const link = document.createElement('a');
      link.href = recipe.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = recipe.url;
      card.appendChild(link);
    }

    if (recipe.notes) {
      const notes = document.createElement('div');
      notes.className = 'notes';
      notes.textContent = recipe.notes;
      card.appendChild(notes);
    }

    if (recipe.tags && recipe.tags.length > 0) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'tags';
      for (const tag of recipe.tags) {
        const tagEl = document.createElement('span');
        tagEl.className = 'tag';
        tagEl.textContent = tag;
        tagsWrap.appendChild(tagEl);
      }
      card.appendChild(tagsWrap);
    }

    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteRecipe(recipe.id));
    footer.appendChild(deleteBtn);
    card.appendChild(footer);

    recipeList.appendChild(card);
  }
}

// Handle submitting the "add recipe" form
recipeForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(recipeForm);
  const payload = {
    name: formData.get('name'),
    url: formData.get('url'),
    notes: formData.get('notes'),
    tags: formData.get('tags'),
  };

  const res = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    recipeForm.reset();
    addForm.classList.add('hidden');
    await loadRecipes();
    searchInput.value = '';
  } else {
    const err = await res.json();
    alert(err.error || 'Something went wrong saving the recipe.');
  }
});

// Delete a recipe (with a confirmation so you don't lose one by accident)
async function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
  await loadRecipes();
}

// Live search-as-you-type, filtering by name or tags
searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderRecipes(allRecipes);
    return;
  }

  const filtered = allRecipes.filter((recipe) => {
    const nameMatch = recipe.name.toLowerCase().includes(query);
    const tagMatch = recipe.tags.some((tag) => tag.toLowerCase().includes(query));
    return nameMatch || tagMatch;
  });

  renderRecipes(filtered);
});

loadRecipes();
