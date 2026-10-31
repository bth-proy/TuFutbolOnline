/* CONFIGURACIÓN DE SUPABASE */
        // Reemplaza con tus credenciales de tu proyecto en Supabase (https://supabase.com)
        const SUPABASE_URL = 'https://trbxnntrwfhspqnyjwkt.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYnhubnRyd2Zoc3Bxbnlqd2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MDUzNDEsImV4cCI6MjEwODk4MTM0MX0.F9XVl5EhKO9B6_xJV8yEbU8fUsRluHRI_NSwf66CnbQ';

        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        /* PRODUCTOS INICIALES (Fallback en caso de que la tabla esté vacía) */
        const initialProducts = [
            {
                id: '1',
                name: 'Camiseta Selección Boliviana 2026',
                category: 'nacionales',
                price: 350,
                sizes: ['S', 'M', 'L', 'XL'],
                image: 'imagenes/seleccion_bolivia.webp'
            },
            {
                id: '2',
                name: 'Camiseta Oficial Club Bolívar',
                category: 'bolivianos',
                price: 290,
                sizes: ['S', 'M', 'L'],
                image: 'imagenes/bolivar.webp'
            },
            {
                id: '3',
                name: 'Camiseta The Strongest Local',
                category: 'bolivianos',
                price: 290,
                sizes: ['M', 'L', 'XL'],
                image: 'imagenes/thestrongest.webp'
            },
            {
                id: '4',
                name: 'Camiseta Oriente Petrolero',
                category: 'bolivianos',
                price: 270,
                sizes: ['S', 'M', 'L'],
                image: 'imagenes/orientepetrolero.webp'
            },
            {
                id: '5',
                name: 'Camiseta Argentina 3 Estrellas',
                category: 'nacionales',
                price: 380,
                sizes: ['S', 'M', 'L', 'XL'],
                image: 'imagenes/argentina.jpg'
            },
            {
                id: '6',
                name: 'Camiseta Real Madrid LDC Edition',
                category: 'internacionales',
                price: 420,
                sizes: ['S', 'M', 'L'],
                image: 'imagenes/realmadrid.webp'
            },
            {
                id: '7',
                name: 'Balón Profesional FIFA Quality',
                category: 'accesorios',
                price: 220,
                sizes: ['Única'],
                image: 'imagenes/balon.webp'
            },
            {
                id: '8',
                name: 'Guantes de Arquero Pro Grip',
                category: 'accesorios',
                price: 180,
                sizes: ['8', '9', '10'],
                image: 'imagenes/guantes.webp'
            }
        ];

        /* STATE MANAGEMENT */
        let products = [];
        let cart = readStoredCart();
        let currentCategory = 'all';
        let searchQuery = '';
        const storedHero = readStoredHero();
        let siteImages = { hero: storedHero?.image || '', qr: readStoredQr() };
        let heroDetails = {
            title: storedHero?.title || 'Camiseta Selección Boliviana 2026',
            price: storedHero?.price || 350
        };
        let appDialogResolver = null;

        function readStoredCart() {
            try {
                const storedCart = JSON.parse(localStorage.getItem('bs_cart') || '[]');
                return Array.isArray(storedCart) ? storedCart : [];
            } catch (error) {
                return [];
            }
        }

        function readStoredQr() {
            try {
                return localStorage.getItem('bs_site_qr') || 'imagenes/qr.jpeg';
            } catch (error) {
                return 'imagenes/qr.jpeg';
            }
        }

        function readStoredHero() {
            try {
                const hero = JSON.parse(localStorage.getItem('bs_site_hero') || 'null');
                return hero && typeof hero.image === 'string' && typeof hero.title === 'string'
                    ? hero
                    : null;
            } catch (error) {
                return null;
            }
        }

        function saveCartToStorage() {
            try {
                localStorage.setItem('bs_cart', JSON.stringify(cart));
            } catch (error) {
                showNotice('No se pudo guardar el carrito en este navegador.');
            }
        }

        function applySavedTheme() {
            let theme = 'dark';
            try {
                theme = localStorage.getItem('bs_theme') || theme;
            } catch (error) {}
            const root = document.documentElement;
            root.classList.toggle('dark', theme === 'dark');
            requestAnimationFrame(() => {
                requestAnimationFrame(() => root.classList.remove('theme-switching'));
            });
        }

        /* CARGAR PRODUCTOS DESDE SUPABASE */
        async function fetchProductsFromSupabase() {
            const { data, error } = await supabaseClient
                .from('products')
                .select('*');

            if (error) {
                console.error('Error al conectar con Supabase:', error);
                await showNotice('Error al conectar con la base de datos en la nube.');
                return;
            }

            if (!data || data.length === 0) {
                // Si la tabla está vacía, insertamos los productos iniciales automáticamente
                const { error: insertError } = await supabaseClient
                    .from('products')
                    .insert(initialProducts);
                
                if (!insertError) {
                    products = [...initialProducts];
                }
            } else {
                products = data;
            }
            renderProducts();
        }

        /* INITIALIZATION */
        window.addEventListener('DOMContentLoaded', async () => {
            applySavedTheme();
            applySiteImages();
            await fetchProductsFromSupabase();
            updateCartUI();
            toggleAddressField();

            // Escuchar cambios en tiempo real desde otros dispositivos
            supabaseClient
                .channel('public:products')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, payload => {
                    fetchProductsFromSupabase();
                })
                .subscribe();

            // Spotlight Mouse Effect Binding
            document.addEventListener('mousemove', (e) => {
                const cards = document.querySelectorAll('.spotlight-card');
                cards.forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty('--mouse-x', `${x}px`);
                    card.style.setProperty('--mouse-y', `${y}px`);
                });
            });

            // Search Handlers
            document.getElementById('searchInput').addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                renderProducts();
                document.getElementById('clearSearch').classList.toggle('hidden', searchQuery === '');
            });
            document.getElementById('clearSearch').addEventListener('click', () => {
                document.getElementById('searchInput').value = '';
                searchQuery = '';
                renderProducts();
                document.getElementById('clearSearch').classList.add('hidden');
            });
            document.getElementById('mobileSearchInput').addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                renderProducts();
            });

            // Dark Mode Listener
            document.getElementById('themeToggle').addEventListener('click', () => {
                const root = document.documentElement;
                root.classList.add('theme-switching');
                const isDark = root.classList.toggle('dark');
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => root.classList.remove('theme-switching'));
                });
                try {
                    localStorage.setItem('bs_theme', isDark ? 'dark' : 'light');
                } catch (error) {}
            });
        });

        /* PRODUCT RENDER FUNCTION */
        function renderProducts() {
            const grid = document.getElementById('productGrid');
            const emptyState = document.getElementById('emptyState');
            grid.innerHTML = '';

            const filtered = products.filter(p => {
                const matchesCat = currentCategory === 'all' || p.category === currentCategory;
                const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.category.toLowerCase().includes(searchQuery);
                return matchesCat && matchesSearch;
            });

            if (filtered.length === 0) {
                emptyState.classList.remove('hidden');
                return;
            } else {
                emptyState.classList.add('hidden');
            }

            filtered.forEach(p => {
                const card = document.createElement('div');
                card.className = 'glass-card spotlight-card rounded-3xl p-4 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 group';
                
                card.innerHTML = `
                    <div>
                        <div class="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100 dark:bg-white/5">
                            <img src="${p.image}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError="this.src='https://placehold.co/600x600/1e293b/ffffff?text=Imagen+Deportiva'">
                            <span class="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                                ${p.category}
                            </span>
                        </div>
                        <h3 class="font-bold text-base text-gray-900 dark:text-white leading-snug line-clamp-2">${p.name}</h3>
                        
                        <!-- Size Badges -->
                        <div class="flex items-center gap-1.5 my-3 flex-wrap">
                            ${(Array.isArray(p.sizes) ? p.sizes : [p.sizes]).map(s => `<span class="text-[10px] font-semibold bg-gray-200/70 dark:bg-white/10 px-2 py-0.5 rounded-md text-gray-600 dark:text-gray-300">${s}</span>`).join('')}
                        </div>
                    </div>

                    <div class="pt-2 border-t border-gray-200/50 dark:border-white/5 flex items-center justify-between mt-2">
                        <div>
                            <span class="text-xs text-gray-400 font-medium block">Precio</span>
                            <span class="text-lg font-black text-brand-600 dark:text-brand-400">${p.price} Bs.</span>
                        </div>
                        <button onclick="addToCart('${p.id}')" class="bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-brand-500 dark:hover:text-white w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90">
                            <i class="fa-solid fa-cart-plus text-sm"></i>
                        </button>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        /* FILTER & SEARCH HANDLERS */
        function filterCategory(cat) {
            currentCategory = cat;
            document.querySelectorAll('.cat-pill').forEach(btn => {
                if (btn.dataset.cat === cat) {
                    btn.className = 'cat-pill active px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 bg-brand-600 text-white shadow-md shadow-brand-500/20';
                } else {
                    btn.className = 'cat-pill px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 bg-gray-200/60 dark:bg-white/5 hover:bg-gray-300 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300';
                }
            });
            renderProducts();
        }

        function resetFilters() {
            searchQuery = '';
            document.getElementById('searchInput').value = '';
            document.getElementById('mobileSearchInput').value = '';
            filterCategory('all');
        }

        /* CART OPERATIONS */
        function addToCart(productId) {
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const existing = cart.find(item => item.id === productId);
            const sizesArr = Array.isArray(product.sizes) ? product.sizes : [product.sizes];
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ ...product, quantity: 1, selectedSize: sizesArr[0] || 'M' });
            }

            updateCartUI();
            saveCartToStorage();
        }

        function updateCartQuantity(id, change) {
            const item = cart.find(i => i.id === id);
            if (!item) return;

            item.quantity += change;
            if (item.quantity <= 0) {
                cart = cart.filter(i => i.id !== id);
            }
            updateCartUI();
            saveCartToStorage();
        }

        function removeFromCart(id) {
            cart = cart.filter(i => i.id !== id);
            updateCartUI();
            saveCartToStorage();
        }

        function updateCartUI() {
            const list = document.getElementById('cartItemsList');
            const countBadge = document.getElementById('cartCountBadge');
            const subtotalEl = document.getElementById('cartSubtotal');
            const totalEl = document.getElementById('cartTotal');

            const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
            const totalBs = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            countBadge.textContent = totalItems;
            subtotalEl.textContent = `${totalBs} Bs.`;
            totalEl.textContent = `${totalBs} Bs.`;

            if (cart.length === 0) {
                list.innerHTML = `
                    <div class="text-center py-16 text-gray-400 space-y-3">
                        <i class="fa-solid fa-basket-shopping text-4xl"></i>
                        <p class="text-sm font-medium">Tu carrito está vacío</p>
                    </div>
                `;
                return;
            }

            list.innerHTML = cart.map(item => `
                <div class="flex items-center gap-3 p-3 rounded-2xl glass-card">
                    <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-xl bg-gray-100">
                    <div class="flex-1 min-w-0">
                        <h4 class="font-bold text-xs truncate text-gray-900 dark:text-white">${item.name}</h4>
                        <span class="text-xs text-brand-600 dark:text-brand-400 font-extrabold">${item.price} Bs.</span>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[10px] bg-gray-200 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono">Talla: ${item.selectedSize}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 bg-gray-100 dark:bg-white/10 p-1 rounded-xl">
                        <button onclick="updateCartQuantity('${item.id}', -1)" class="w-6 h-6 rounded-lg bg-white dark:bg-black/40 flex items-center justify-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20">-</button>
                        <span class="text-xs font-bold px-1">${item.quantity}</span>
                        <button onclick="updateCartQuantity('${item.id}', 1)" class="w-6 h-6 rounded-lg bg-white dark:bg-black/40 flex items-center justify-center text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20">+</button>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="text-gray-400 hover:text-red-500 p-1">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            `).join('');
        }

        function toggleCartDrawer(open = null) {
            const drawer = document.getElementById('cartDrawer');
            const content = document.getElementById('cartContent');
            const isOpen = drawer.classList.contains('pointer-events-auto');

            const shouldOpen = open !== null ? open : !isOpen;

            if (shouldOpen) {
                drawer.classList.remove('pointer-events-none', 'opacity-0');
                drawer.classList.add('pointer-events-auto', 'opacity-100');
                content.classList.remove('translate-x-full');
            } else {
                drawer.classList.add('pointer-events-none', 'opacity-0');
                drawer.classList.remove('pointer-events-auto', 'opacity-100');
                content.classList.add('translate-x-full');
            }
        }

        function toggleAddressField() {
            const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
            const container = document.getElementById('addressFieldContainer');
            const paymentContainer = document.getElementById('deliveryPaymentContainer');
            if (deliveryType === 'domicilio') {
                container.classList.remove('hidden');
                paymentContainer.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
                paymentContainer.classList.add('hidden');
            }
            togglePaymentMethod();
        }

        function togglePaymentMethod() {
            const paymentType = document.querySelector('input[name="paymentType"]:checked')?.value;
            const qrContainer = document.getElementById('checkoutQrContainer');
            qrContainer.classList.toggle('hidden', paymentType !== 'qr');
        }

        async function checkoutWhatsApp() {
            if (cart.length === 0) {
                await showNotice('El carrito está vacío.');
                return;
            }

            const name = document.getElementById('custName').value.trim();
            if (!name) {
                await showNotice('Por favor, ingresa tu nombre completo.');
                document.getElementById('custName').focus();
                return;
            }

            const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
            let address = "";
            if (deliveryType === 'domicilio') {
                address = document.getElementById('custAddress').value.trim();
                if (!address) {
                    await showNotice('Por favor, ingresa la dirección.');
                    document.getElementById('custAddress').focus();
                    return;
                }
            }

            const paymentType = deliveryType === 'domicilio'
                ? document.querySelector('input[name="paymentType"]:checked').value
                : '';

            let text = `⚽ *NUEVO PEDIDO - TU FÚTBOL ONLINE*\n`;
            text += `📍 *San José de Chiquitos*\n\n`;
            text += `👤 *Cliente:* ${name}\n`;
            text += `🚚 *Tipo de Entrega:* ${deliveryType === 'retiro' ? 'Retiro en Tienda' : 'Envío a Domicilio'}\n`;
            if (deliveryType === 'domicilio') {
                text += `🏠 *Dirección:* ${address}\n`;
                text += `💳 *Método de pago:* ${paymentType === 'qr' ? 'QR' : 'Efectivo'}\n`;
            }
            text += `\n*Detalle del Pedido:*\n`;

            let total = 0;
            cart.forEach((item, i) => {
                const sub = item.price * item.quantity;
                total += sub;
                text += `${i + 1}. ${item.name} (${item.selectedSize}) x${item.quantity} - ${sub} Bs.\n`;
            });

            text += `\n💰 *TOTAL FINAL:* ${total.toFixed(2)} Bs.`;

            const phone = "59168825429";
            const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        }

        /* ADMIN CRUD PANEL CON SUPABASE */
        async function promptAdminLogin() {
            const pin = await showAppModal({
                title: 'Acceso de administrador',
                message: 'Ingresa el PIN para abrir el panel de administrador',
                inputType: 'password',
                confirmText: 'Ingresar',
                cancelText: 'Cancelar'
            });
            if (pin === null) return;
            if (pin === '5050') {
                renderAdminList();
                openModal('adminModal');
            } else {
                await showNotice('PIN incorrecto.');
            }
        }

        function renderAdminList() {
            const container = document.getElementById('adminProductList');
            const qrPreview = document.getElementById('siteQrPreview');
            qrPreview.src = siteImages.qr;
            qrPreview.classList.remove('hidden');
            document.getElementById('siteQrImageData').value = siteImages.qr;
            
            container.innerHTML = products.map(p => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/5 text-xs">
                    <div class="flex items-center gap-3">
                        <img src="${p.image}" class="w-10 h-10 object-cover rounded-lg">
                        <div>
                            <p class="font-bold text-gray-900 dark:text-white">${p.name}</p>
                            <span class="text-gray-400">${p.price} Bs. | Categoría: ${p.category}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="useProductInHero('${p.id}')" class="px-2 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-600 hover:text-white rounded-lg font-semibold transition-all">
                            Hero
                        </button>
                        <button onclick="editProduct('${p.id}')" class="px-3 py-1 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg font-semibold transition-all">
                            Editar
                        </button>
                        <button onclick="deleteProduct('${p.id}')" class="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg font-semibold transition-all">
                            Eliminar
                        </button>
                    </div>
                </div>
            `).join('');
        }

        async function useProductInHero(id) {
            const product = products.find(item => item.id === id);
            if (!product) return;

            try {
                localStorage.setItem('bs_site_hero', JSON.stringify({
                    image: product.image,
                    title: product.name,
                    price: product.price
                }));
            } catch (error) {}

            siteImages.hero = product.image;
            heroDetails = { title: product.name, price: product.price };
            applySiteImages();
            await showNotice(`${product.name} fijado en el hero.`);
        }

        async function saveProduct(e) {
            e.preventDefault();
            const id = document.getElementById('prodId').value || Date.now().toString();
            const name = document.getElementById('prodName').value;
            const category = document.getElementById('prodCategory').value;
            const price = parseFloat(document.getElementById('prodPrice').value);
            const sizesStr = document.getElementById('prodSizes').value || 'M, L';
            const sizes = sizesStr.split(',').map(s => s.trim());
            const existing = products.find(p => p.id === id);
            const image = document.getElementById('prodImageBase64').value || existing?.image;

            if (!image) {
                await showNotice('Selecciona una imagen para el producto.');
                return;
            }

            const newProd = { id, name, category, price, sizes, image };

            // Guardar o actualizar en Supabase
            const { error } = await supabaseClient
                .from('products')
                .upsert([newProd]);

            if (error) {
                await showNotice('Error al guardar en Supabase.');
                console.error(error);
                return;
            }

            await fetchProductsFromSupabase();
            renderAdminList();
            resetForm();
            await showNotice('¡Producto guardado y sincronizado en la nube!');
        }

        function editProduct(id) {
            const p = products.find(prod => prod.id === id);
            if (!p) return;

            document.getElementById('formTitle').textContent = 'Editar Producto';
            document.getElementById('prodId').value = p.id;
            document.getElementById('prodName').value = p.name;
            document.getElementById('prodCategory').value = p.category;
            document.getElementById('prodPrice').value = p.price;
            document.getElementById('prodSizes').value = Array.isArray(p.sizes) ? p.sizes.join(', ') : p.sizes;
            document.getElementById('prodImageBase64').value = p.image;
            document.getElementById('imagePreview').src = p.image;
            document.getElementById('imagePreviewContainer').classList.remove('hidden');
        }

        async function deleteProduct(id) {
            if (await showConfirm('¿Estás seguro de eliminar este producto de la nube?')) {
                const { error } = await supabaseClient
                    .from('products')
                    .delete()
                    .eq('id', id);

                if (error) {
                    await showNotice('No se pudo eliminar el producto.');
                    return;
                }

                await fetchProductsFromSupabase();
                renderAdminList();
            }
        }

        function resetForm() {
            document.getElementById('formTitle').textContent = 'Agregar Nuevo Producto';
            document.getElementById('productForm').reset();
            document.getElementById('prodId').value = '';
            document.getElementById('prodImageBase64').value = '';
            document.getElementById('imagePreviewContainer').classList.add('hidden');
        }

        async function handleFileSelect(event, targetInputId = 'prodImageBase64', previewId = 'imagePreview') {
            const file = event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                await showNotice('Selecciona un archivo de imagen válido.');
                event.target.value = '';
                return;
            }

            try {
                const imageData = await compressImage(file);
                document.getElementById(targetInputId).value = imageData;
                const preview = document.getElementById(previewId);
                preview.src = imageData;
                preview.classList.remove('hidden');
                preview.parentElement.classList.remove('hidden');
            } catch (error) {
                await showNotice('No se pudo cargar la imagen.');
            }
        }

        function compressImage(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = reject;
                reader.onload = () => {
                    const image = new Image();
                    image.onerror = reject;
                    image.onload = () => {
                        const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.max(1, Math.round(image.width * scale));
                        canvas.height = Math.max(1, Math.round(image.height * scale));
                        const context = canvas.getContext('2d');
                        context.fillStyle = '#ffffff';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.drawImage(image, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    image.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }

        function applySiteImages() {
            if (siteImages.hero) document.getElementById('heroImage').src = siteImages.hero;
            document.getElementById('heroTitle').textContent = heroDetails.title;
            document.getElementById('heroPrice').textContent = `${heroDetails.price} Bs.`;
            const qrImage = document.getElementById('checkoutQrImage');
            const qrUnavailable = document.getElementById('checkoutQrUnavailable');
            if (siteImages.qr) {
                qrImage.src = siteImages.qr;
                qrImage.classList.remove('hidden');
                qrUnavailable.classList.add('hidden');
            } else {
                qrImage.classList.add('hidden');
                qrUnavailable.classList.remove('hidden');
            }
        }

        async function saveSiteImage() {
            const imageData = document.getElementById('siteQrImageData').value;
            if (!imageData) {
                await showNotice('Selecciona una imagen QR.');
                return;
            }
            try {
                localStorage.setItem('bs_site_qr', imageData);
            } catch (error) {}
            siteImages.qr = imageData;
            applySiteImages();
            await showNotice('Imagen QR actualizada.');
        }

        /* MODAL HELPERS */
        function showNotice(message) {
            return showAppModal({ title: 'Aviso', message });
        }

        function showConfirm(message) {
            return showAppModal({
                title: 'Confirmar acción',
                message,
                confirmText: 'Confirmar',
                cancelText: 'Cancelar'
            });
        }

        function showAppModal({ title, message, inputType = null, confirmText = 'Aceptar', cancelText = null }) {
            const modal = document.getElementById('appDialog');
            const input = document.getElementById('appDialogInput');
            document.getElementById('appDialogTitle').textContent = title;
            document.getElementById('appDialogMessage').textContent = message;
            document.getElementById('appDialogConfirm').textContent = confirmText;
            document.getElementById('appDialogCancel').textContent = cancelText || '';
            document.getElementById('appDialogCancel').classList.toggle('hidden', !cancelText);
            input.classList.toggle('hidden', !inputType);
            input.type = inputType || 'text';
            input.value = '';
            modal.classList.remove('hidden');

            return new Promise(resolve => {
                appDialogResolver = resolve;
                document.getElementById('appDialogConfirm').onclick = () => {
                    closeAppDialog(inputType ? input.value : true);
                };
                document.getElementById('appDialogCancel').onclick = () => closeAppDialog(null);
                if (inputType) input.focus();
                else document.getElementById('appDialogConfirm').focus();
            });
        }

        function closeAppDialog(result = null) {
            document.getElementById('appDialog').classList.add('hidden');
            if (appDialogResolver) {
                const resolve = appDialogResolver;
                appDialogResolver = null;
                resolve(result);
            }
        }

        function handleAppDialogKeydown(event) {
            if (event.key === 'Escape') {
                closeAppDialog(null);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                document.getElementById('appDialogConfirm').click();
            }
        }

        function openModal(id) {
            document.getElementById(id).classList.remove('hidden');
        }

        function closeModal(id) {
            document.getElementById(id).classList.add('hidden');
        }
