 <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    
    const firebaseConfig = {
        apiKey: "AIzaSyAxyx7nZkDTnFIqNEa5seFRXqfulaL3Jzs",
        authDomain: "mri-site-database.firebaseapp.com",
        projectId: "mri-site-database",
        storageBucket: "mri-site-database.firebasestorage.app",
        messagingSenderId: "1039552209345",
        appId: "1:1039552209345:web:529e615704300b170d0f40",
        measurementId: "G-R3KEWE3SY2"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    
    let implants = [];
    let currentImageData = "";
    window.isAdminGlobal = false;

    const grid = document.getElementById('implantsGrid');
    const initialState = document.getElementById('initialState');
    const emptyState = document.getElementById('emptyState');

    // Inicialização
    window.onload = async () => {
        await fetchImplants();
        lucide.createIcons();
    };

    // --- SISTEMA DE AUTENTICAÇÃO (LOGIN) ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("Admin logado:", user.email);
            showAdminUI();
        } else {
            console.log("Ninguém logado");
            hideAdminUI();
        }
    });

    window.doLogin = async () => {
        const email = document.getElementById('loginUser').value;
        const pass = document.getElementById('loginPass').value;
        try {
            await signInWithEmailAndPassword(auth, email, pass);
            alert("Bem-vindo!");
            window.closeLoginModal();
        } catch (error) {
            alert("Erro: Email ou senha incorretos.");
        }
    };

    window.doLogout = async () => {
        try {
            await signOut(auth);
            alert("Sessão terminada.");
            location.reload();
        } catch (error) {
            alert("Erro ao sair.");
        }
    };

    // --- FUNÇÕES DE INTERFACE (UI) ---
    function showAdminUI() {
        window.isAdminGlobal = true;
        document.getElementById('loginBtn').classList.add('hidden');
        document.getElementById('logoutBtn').classList.remove('hidden');
        document.getElementById('adminActions').classList.remove('hidden');
        window.handleSearch(); 
    }

    function hideAdminUI() {
        window.isAdminGlobal = false;
        document.getElementById('loginBtn').classList.remove('hidden');
        document.getElementById('logoutBtn').classList.add('hidden');
        document.getElementById('adminActions').classList.add('hidden');
        window.handleSearch();
    }

    // --- MODALS ---
    window.openContactModal = () => document.getElementById('contactModal').classList.replace('hidden', 'flex');
    window.closeContactModal = () => document.getElementById('contactModal').classList.replace('flex', 'hidden');
    
    window.openLoginModal = () => document.getElementById('loginModal').classList.replace('hidden', 'flex');
    window.closeLoginModal = () => document.getElementById('loginModal').classList.replace('flex', 'hidden');

    window.openFormModal = () => document.getElementById('formModal').classList.replace('hidden', 'flex');
    window.closeFormModal = () => {
        document.getElementById('formModal').classList.replace('flex', 'hidden');
        document.getElementById('implantForm').reset();
        document.getElementById('imagePreview').innerHTML = `<i data-lucide="camera" class="w-10 h-10 mb-2"></i><span class="text-[10px] font-bold uppercase">Fotografia</span>`;
        currentImageData = "";
    };

    window.closeDetailModal = () => document.getElementById('detailModal').classList.replace('flex', 'hidden');

    // --- LÓGICA DE DADOS ---
    async function fetchImplants() {
        try {
            const querySnapshot = await getDocs(collection(db, "implantes"));
            implants = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Erro ao ler Firebase:", error);
        }
    }

    window.handleSearch = () => {
        const term = (document.getElementById('searchInput').value || "").toLowerCase().trim();
        const cat = document.getElementById('categorySelect').value;

        if (term === "" && cat === "todos") {
            grid.innerHTML = '';
            initialState.classList.remove('hidden');
            emptyState.classList.add('hidden');
            return;
        }

        initialState.classList.add('hidden');
        const filtered = implants.filter(imp => {
            const name = String(imp.name || "").toLowerCase();
            const manufacturer = String(imp.manufacturer || "").toLowerCase();
            const model = String(imp.modelRef || "").toLowerCase();
            const matchesText = name.includes(term) || manufacturer.includes(term) || model.includes(term);
            const matchesCat = cat === 'todos' || String(imp.category) === cat;
            return matchesText && matchesCat;
        });
        renderGrid(filtered);
    };

    function renderGrid(data) {
        grid.innerHTML = '';
        if (data.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }
        emptyState.classList.add('hidden');

        data.forEach(imp => {
            const statusClean = String(imp.status || "").toLowerCase().trim();
            let bgClass = "bg-white";
            let dotClass = "bg-slate-400";

            if (statusClean === 'unsafe') { bgClass = "bg-[#fef2f2] border-rose-100"; dotClass = "bg-rose-500"; }
            else if (statusClean === 'safe') { bgClass = "bg-[#f0fdf4] border-emerald-100"; dotClass = "bg-emerald-500"; }
            else if (statusClean.includes('conditional')) { bgClass = "bg-[#fffbeb] border-amber-100"; dotClass = "bg-amber-500"; }

            const card = document.createElement('div');
            card.className = `${bgClass} rounded-3xl shadow-sm border p-6 hover:shadow-xl transition-all cursor-pointer`;
            card.onclick = (e) => { if(!e.target.closest('button')) window.openDetailModal(imp.id); };
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <span class="text-[9px] font-extrabold uppercase px-3 py-1.5 bg-white/60 text-slate-600 rounded-lg">${imp.category || 'Geral'}</span>
                    ${window.isAdminGlobal ? `
                        <div class="flex gap-1">
                            <button onclick="window.editImplant('${imp.id}')" class="p-2 hover:bg-white/50 text-slate-400 hover:text-sky-600 rounded-lg">
                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deleteImplant('${imp.id}')" class="p-2 hover:bg-white/50 text-slate-400 hover:text-rose-600 rounded-lg">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <h3 class="font-bold text-slate-800 text-lg mb-1">${imp.name || 'Sem Nome'}</h3>
                <p class="text-slate-500 text-xs mb-5">${imp.manufacturer || 'Fabricante N/A'}</p>
                <div class="flex items-center justify-between pt-4 border-t border-black/5">
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full ${dotClass}"></div>
                        <span class="text-[10px] font-black uppercase text-slate-700">MRI ${imp.status}</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        lucide.createIcons();
    }

    window.openDetailModal = (id) => {
        const imp = implants.find(i => i.id === id);
        if(!imp) return;
        const statusClean = String(imp.status || "").toLowerCase();
        const statusColor = statusClean.includes('safe') ? 'text-emerald-600' : statusClean.includes('conditional') ? 'text-amber-600' : 'text-rose-600';
        
        document.getElementById('detailContent').innerHTML = `
            <div class="h-56 bg-sky-900 relative flex flex-col justify-end p-8 rounded-t-3xl overflow-hidden">
                ${imp.image ? `<img src="${imp.image}" class="absolute inset-0 w-full h-full object-cover opacity-40">` : ''}
                <button onclick="window.closeDetailModal()" class="absolute top-6 right-6 bg-white/20 p-2 rounded-full text-white">✕</button>
                <div class="relative z-10">
                    <h2 class="text-4xl font-black text-white">${imp.name}</h2>
                    <p class="text-slate-200">${imp.manufacturer}</p>
                </div>
            </div>
            <div class="p-8 space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-slate-50 p-4 rounded-2xl border">
                        <label class="text-[10px] font-black text-slate-400 uppercase block">MRI Status</label>
                        <span class="text-sm font-black ${statusColor}">MRI ${imp.status}</span>
                    </div>
                    <div class="bg-slate-50 p-4 rounded-2xl border">
                        <label class="text-[10px] font-black text-slate-400 uppercase block">Campo</label>
                        <p class="text-slate-700 font-bold text-sm">${imp.fieldStrength || 'N/A'}</p>
                    </div>
                </div>
                <div class="bg-sky-50 p-6 rounded-2xl border border-sky-100">
                    <label class="text-[10px] font-black text-sky-600 uppercase block mb-2">Condições Técnicas</label>
                    <p class="text-sm text-slate-700">${(imp.specificConditions || 'Sem condições específicas.').replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
        document.getElementById('detailModal').classList.replace('hidden', 'flex');
    };

    window.editImplant = (id) => {
        const imp = implants.find(i => i.id === id);
        if (!imp) return;
        document.getElementById('editId').value = imp.id;
        document.getElementById('name').value = imp.name;
        document.getElementById('manufacturer').value = imp.manufacturer;
        document.getElementById('modelRef').value = imp.modelRef || "";
        document.getElementById('status').value = imp.status;
        document.getElementById('category').value = imp.category;
        document.getElementById('fieldStrength').value = imp.fieldStrength || "";
        document.getElementById('sarLimit').value = imp.sarLimit || "";
        document.getElementById('gradientLimit').value = imp.gradientLimit || "";
        document.getElementById('specificConditions').value = imp.specificConditions || "";
        document.getElementById('docLink').value = imp.docLink || "";
        currentImageData = imp.image || "";
        if(imp.image) document.getElementById('imagePreview').innerHTML = `<img src="${imp.image}" class="w-full h-full object-cover rounded-xl">`;
        window.openFormModal();
    };

    window.deleteImplant = async (id) => {
        if (confirm("Eliminar permanentemente?")) {
            try {
                await deleteDoc(doc(db, "implantes", id));
                location.reload(); 
            } catch (error) { alert("Erro ao eliminar."); }
        }
    };

    document.getElementById('implantForm').onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const data = {
            name: document.getElementById('name').value,
            manufacturer: document.getElementById('manufacturer').value,
            modelRef: document.getElementById('modelRef').value,
            status: document.getElementById('status').value,
            category: document.getElementById('category').value,
            fieldStrength: document.getElementById('fieldStrength').value,
            sarLimit: document.getElementById('sarLimit').value,
            gradientLimit: document.getElementById('gradientLimit').value,
            specificConditions: document.getElementById('specificConditions').value,
            docLink: document.getElementById('docLink').value,
            image: currentImageData
        };

        try {
            if (id) await updateDoc(doc(db, "implantes", id), data);
            else await addDoc(collection(db, "implantes"), data);
            window.closeFormModal();
            location.reload(); 
        } catch (error) { alert("Erro ao salvar: " + error); }
    };

    document.getElementById('imageUpload').onchange = (e) => {
        const reader = new FileReader();
        reader.onload = () => {
            currentImageData = reader.result;
            document.getElementById('imagePreview').innerHTML = `<img src="${currentImageData}" class="w-full h-full object-cover rounded-xl">`;
        };
        if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
    };
</script>
</body>
</html>
