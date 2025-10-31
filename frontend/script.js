document.addEventListener('DOMContentLoaded', async () => {
    // Get the base URL dynamically
    const getBaseUrl = () => {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;
        // In Docker, use the same hostname, otherwise localhost
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    };

    const BASE_URL = getBaseUrl();
    console.log('🔗 Using base URL:', BASE_URL);

    const token = localStorage.getItem('token');
    
    // Enhanced connection check
    async function checkServerHealth() {
        try {
            console.log('🔍 Checking server health...');
            const response = await fetch(`${BASE_URL}/api/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const health = await response.json();
            console.log('✅ Server health:', health);
            return true;
        } catch (error) {
            console.error('❌ Server health check failed:', error);
            showError(`Cannot connect to server: ${error.message}. Please make sure the server is running.`);
            return false;
        }
    }

    // Check server health first
    const isServerHealthy = await checkServerHealth();
    if (!isServerHealthy) {
        return;
    }

    if(!token) {
        console.log('🔐 No token found, redirecting to login...');
        window.location.href='index.html';
        return;
    }

    console.log('🔑 Token found, proceeding with dashboard...');

    const nicknameEls = document.querySelectorAll('#nickname,#menuNickname');
    const sideMenu = document.getElementById('sideMenu');
    const addBtn = document.getElementById('addBtn');
    const entryModal = document.getElementById('entryModal');
    const modalTitle = document.getElementById('modalTitle');
    const entryTitle = document.getElementById('entryTitle');
    const entryContent = document.getElementById('entryContent');
    const saveEntryBtn = document.getElementById('saveEntryBtn');
    const cancelEntryBtn = document.getElementById('cancelEntryBtn');
    const deleteModal = document.getElementById('deleteModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const entriesContainer = document.getElementById('entries');

    let entries=[], editingId=null, deletingId=null, showFav=false;

    // Enhanced fetch function with better error handling
    async function apiFetch(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
            const response = await fetch(`${BASE_URL}${url}`, finalOptions);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.log('🚫 Unauthorized, redirecting to login...');
                    localStorage.removeItem('token');
                    window.location.href = 'index.html';
                    return null;
                }
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`💥 API Error for ${url}:`, error);
            throw error;
        }
    }

    // Error display function
    function showError(message) {
        // Create a better error display
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (document.body.contains(errorDiv)) {
                document.body.removeChild(errorDiv);
            }
        }, 5000);
    }

    function showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            if (document.body.contains(successDiv)) {
                document.body.removeChild(successDiv);
            }
        }, 3000);
    }

    // Fetch user info
    try {
        const user = await apiFetch('/api/users/me');
        if (user) {
            nicknameEls.forEach(el => el.innerText = user.nickname);
            console.log('✅ User loaded:', user.nickname);
        }
    } catch(err) {
        console.error('User fetch error:', err);
        showError('Failed to load user data');
        return;
    }

    // Fetch entries
    async function loadEntries() {
        try {
            console.log('📝 Loading entries...');
            const entriesData = await apiFetch('/api/entries');
            if (entriesData) {
                entries = entriesData;
                console.log(`✅ Loaded ${entries.length} entries`);
                renderEntries();
            }
        } catch(err) { 
            console.error('Entries load error:', err);
            showError('Failed to load entries');
        }
    }

    // Side Menu
    document.getElementById('menuBtn').onclick = () => {
        console.log('📱 Opening side menu');
        sideMenu.style.width='250px';
    };
    
    document.getElementById('closeMenu').onclick = () => {
        console.log('📱 Closing side menu');
        sideMenu.style.width='0';
    };

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
        if (sideMenu.style.width === '250px' && 
            !sideMenu.contains(event.target) && 
            event.target.id !== 'menuBtn') {
            sideMenu.style.width = '0';
        }
    });

    // Floating Add
    addBtn.onclick = () => {
        console.log('➕ Opening add entry modal');
        modalTitle.innerText='Add Entry';
        entryTitle.value='';
        entryContent.value='';
        editingId=null;
        entryModal.style.display='flex';
        entryTitle.focus();
    };
    
    cancelEntryBtn.onclick = () => {
        console.log('❌ Closing entry modal');
        entryModal.style.display='none';
    };

    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target === entryModal) {
            entryModal.style.display = 'none';
        }
        if (event.target === deleteModal) {
            deleteModal.style.display = 'none';
            deletingId = null;
        }
    };

    // Save Entry
    saveEntryBtn.onclick = async () => {
        const title = entryTitle.value.trim();
        const content = entryContent.value.trim();
        
        if(!title || !content) {
            showError("Title and content are required.");
            return;
        }

        try {
            console.log(editingId ? `✏️ Updating entry ${editingId}` : '📝 Creating new entry');
            
            let result;
            if(editingId) {
                result = await apiFetch(`/api/entries/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({title, content})
                });
            } else {
                result = await apiFetch('/api/entries', {
                    method: 'POST',
                    body: JSON.stringify({title, content})
                });
            }
            
            if (result) {
                entryModal.style.display='none';
                showSuccess(editingId ? 'Entry updated successfully!' : 'Entry created successfully!');
                await loadEntries();
            }
        } catch(err) { 
            console.error('Save entry error:', err);
            showError('Failed to save entry: ' + err.message);
        }
    };

    // Allow Enter key to save in modal
    entryContent.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            saveEntryBtn.click();
        }
    });

    // Delete functionality
    function confirmDelete(id) { 
        console.log(`🗑️ Confirm delete for entry ${id}`);
        deletingId = id; 
        deleteModal.style.display = 'flex'; 
    }
    
    confirmDeleteBtn.onclick = async () => {
        if(!deletingId) return;
        
        try {
            console.log(`🗑️ Deleting entry ${deletingId}`);
            const result = await apiFetch(`/api/entries/${deletingId}`, {
                method: 'DELETE'
            });
            
            if (result) {
                deletingId = null;
                deleteModal.style.display = 'none';
                showSuccess('Entry deleted successfully!');
                await loadEntries();
            }
        } catch(err) { 
            console.error('Delete error:', err);
            showError('Failed to delete entry: ' + err.message);
        }
    };
    
    cancelDeleteBtn.onclick = () => {
        console.log('❌ Cancel delete');
        deleteModal.style.display = 'none'; 
        deletingId = null;
    };

    // Logout
    document.getElementById('logoutBtn').onclick = () => {
        console.log('🚪 Logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('nickname');
        window.location.href='index.html';
    };

    // Favorites Filter
    document.getElementById('favFilterBtn').onclick = () => {
        showFav = !showFav;
        const favButton = document.getElementById('favFilterBtn');
        favButton.innerText = showFav ? 'Show All' : 'Favorites';
        console.log(`⭐ Filter: ${showFav ? 'Favorites only' : 'All entries'}`);
        renderEntries();
    };

    // Render entries
    function renderEntries() {
        console.log(`🔄 Rendering ${entries.length} entries (showFav: ${showFav})`);
        entriesContainer.innerHTML = '';
        
        const filteredEntries = showFav ? entries.filter(e => e.favorite) : entries;
        
        if (filteredEntries.length === 0) {
            const message = showFav ? 
                'No favorite entries found. Star an entry to add it to favorites!' : 
                'No entries yet. Click the + button to create your first entry!';
            
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <h3>${showFav ? 'No Favorites' : 'No Entries'}</h3>
                    <p>${message}</p>
                </div>
            `;
            entriesContainer.appendChild(emptyState);
            return;
        }
        
        filteredEntries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'entry';
            div.innerHTML = `
                <div class="entry-header">
                    <h4>${escapeHtml(entry.title)}</h4>
                    <span class="entry-date">${formatDate(entry.createdAt)}</span>
                </div>
                <p>${escapeHtml(entry.content)}</p>
                <div class="actions">
                    <button class="fav-btn ${entry.favorite ? 'favorited' : ''}" title="${entry.favorite ? 'Remove from favorites' : 'Add to favorites'}">
                        ${entry.favorite ? '★' : '☆'}
                    </button>
                    <button class="edit-btn" title="Edit entry">✎</button>
                    <button class="delete-btn" title="Delete entry">🗑</button>
                </div>
            `;
            
            // Edit button
            div.querySelector('.edit-btn').onclick = () => {
                console.log(`✏️ Editing entry ${entry._id}`);
                editingId = entry._id;
                entryTitle.value = entry.title;
                entryContent.value = entry.content;
                modalTitle.innerText = 'Edit Entry';
                entryModal.style.display = 'flex';
                entryTitle.focus();
            };
            
            // Delete button
            div.querySelector('.delete-btn').onclick = () => confirmDelete(entry._id);
            
            // Favorite button
            div.querySelector('.fav-btn').onclick = async () => {
                try {
                    console.log(`⭐ Toggling favorite for entry ${entry._id}`);
                    const result = await apiFetch(`/api/entries/${entry._id}/favorite`, {
                        method: 'PATCH'
                    });
                    
                    if (result) {
                        showSuccess(entry.favorite ? 'Removed from favorites!' : 'Added to favorites!');
                        await loadEntries();
                    }
                } catch(err) { 
                    console.error('Favorite toggle error:', err);
                    showError('Failed to update favorite: ' + err.message);
                }
            };
            
            entriesContainer.appendChild(div);
        });
        
        console.log(`✅ Rendered ${filteredEntries.length} entries`);
    }

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Load entries on startup
    await loadEntries();
    
    // Add some helpful CSS for empty states
    const style = document.createElement('style');
    style.textContent = `
        .empty-state {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        .empty-state h3 {
            margin-bottom: 1rem;
            font-weight: 300;
        }
        .entry-header {
            display: flex;
            justify-content: between;
            align-items: center;
            margin-bottom: 0.5rem;
        }
        .entry-date {
            font-size: 0.8rem;
            color: #888;
            margin-left: auto;
        }
        .fav-btn.favorited {
            color: #ffd700;
        }
        .actions button {
            transition: all 0.2s ease;
        }
        .actions button:hover {
            transform: scale(1.1);
        }
    `;
    document.head.appendChild(style);

    console.log('✅ Dashboard initialized successfully');
});