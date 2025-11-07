// Firebase Init
const firebaseConfig = {
    apiKey: "AIzaSyDi7aTeTkTtJzM9KYFif4-XOx6noJDtJXk", // REPLACE WITH YOUR ACTUAL API KEY
    authDomain: "csc-new-549ef.firebaseapp.com",
    projectId: "csc-new-549ef",
    storageBucket: "csc-new-549ef.appspot.com",
    messagingSenderId: "201784389940",
    appId: "1:201784389940:web:0ffed10f59cc674feb3561"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Helper Functions ---
/**
 * Shows a temporary toast message.
 * @param {string} msg - The message to display.
 * @param {string} color - The background color of the toast (e.g., "green", "red").
 */
function showToast(msg, color = "green") {
    const d = document.createElement("div");
    d.innerText = msg;
    d.className = "toast";
    d.style.background = color;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 3000);
}

/**
 * Shows a specific section and hides others.
 * @param {string} id - The ID of the section to show.
 */
function showSection(id) {
    const sections = ["dashboard", "salesSection", "productSection", "customerSection", "ledgerSection", "expenseSection", "aepsSection", "pendingSection", "reportSection", "profileSection"];
    sections.forEach(secId => {
        const section = document.getElementById(secId);
        if (section) section.classList.add("hidden");
    });
    const targetSection = document.getElementById(id);
    if (targetSection) targetSection.classList.remove("hidden");

    // Special handling for sales tabs
    if (id === "salesSection") {
        openSaleTab('newSale'); // Default to new sale when sales section is opened
    }
}

/**
 * Opens a specific tab within the sales section.
 * @param {string} tabId - The ID of the sale tab to open (e.g., "newSale", "savedInvoices").
 */
function openSaleTab(tabId) {
    document.querySelectorAll(".saleTab").forEach(t => t.classList.add("hidden"));
    document.getElementById(tabId).classList.remove("hidden");

    // Optional: Highlight active tab button
    document.querySelectorAll('.tabs button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tabs button[onclick*="${tabId}"]`).classList.add('active');
}


// --- Authentication ---
/**
 * Registers a new user with email and password.
 */
async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
        await db.collection("users").doc(cred.user.uid).set({ email: email, role: "staff" });
        showToast("✔ Registered as Staff");
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

/**
 * Logs in a user with email and password.
 */
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showToast("✔ Login Successful");
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

/**
 * Logs out the current user.
 */
async function logout() {
    try {
        await firebase.auth().signOut();
        showToast("✔ Logged Out");
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

// Firebase Auth State Listener
firebase.auth().onAuthStateChanged(async user => {
    document.getElementById("loadingScreen").style.display = "none";
    const authSection = document.getElementById("authSection");
    const dashboard = document.getElementById("dashboard");
    const saveShopBtn = document.getElementById("saveShopBtn");

    if (user) {
        let role = "staff"; // Default role
        try {
            const doc = await db.collection("users").doc(user.uid).get();
            if (doc.exists && doc.data().role) {
                role = doc.data().role;
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
        }

        authSection.classList.add("hidden");
        dashboard.classList.remove("hidden");
        // if (document.getElementById("globalSearchBar")) document.getElementById("globalSearchBar").classList.remove("hidden"); // Not present in HTML
        showSection("dashboard"); // Show dashboard by default after login
        openSaleTab("newSale"); // Reset sales tab

        // Load all data
        loadShopProfile(role);
        loadProducts();
        loadCustomers();
        loadLedger();
        loadExpenses();
        loadAeps();
        loadReports();
        loadInvoices();
        loadPendingTasks();
        loadDashboard(user, role);

        // Restrict shop profile editing for staff
        if (role === "staff") {
            if (saveShopBtn) saveShopBtn.style.display = "none";
            document.getElementById("shopName").readOnly = true;
            document.getElementById("gstNumber").readOnly = true;
            document.getElementById("mobile").readOnly = true;
            document.getElementById("address").readOnly = true;
        } else {
            if (saveShopBtn) saveShopBtn.style.display = "block";
            document.getElementById("shopName").readOnly = false;
            document.getElementById("gstNumber").readOnly = false;
            document.getElementById("mobile").readOnly = false;
            document.getElementById("address").readOnly = false;
        }
    } else {
        authSection.classList.remove("hidden");
        dashboard.classList.add("hidden");
        // if (document.getElementById("globalSearchBar")) document.getElementById("globalSearchBar").classList.add("hidden"); // Not present in HTML
    }
});


// --- Shop Profile ---
async function loadShopProfile(role) {
    try {
        const doc = await db.collection("settings").doc("shop_profile").get();
        if (doc.exists) {
            const d = doc.data();
            document.getElementById("shopName").value = d.shop_name || "";
            document.getElementById("gstNumber").value = d.gst_number || "";
            document.getElementById("mobile").value = d.mobile || "";
            document.getElementById("address").value = d.address || "";
        }
    } catch (e) {
        console.error("Error loading shop profile:", e);
        showToast("❌ Error loading shop profile", "red");
    }
}

async function saveShopProfile() {
    try {
        await db.collection("settings").doc("shop_profile").set({
            shop_name: document.getElementById("shopName").value,
            gst_number: document.getElementById("gstNumber").value,
            mobile: document.getElementById("mobile").value,
            address: document.getElementById("address").value
        });
        showToast("✔ Shop Profile Updated");
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}


// --- Products ---
async function saveProduct() {
    const productId = document.getElementById("productId");
    const productName = document.getElementById("productName");
    const costPrice = document.getElementById("costPrice");
    const salePrice = document.getElementById("salePrice");
    const unit = document.getElementById("unit");

    const id = productId.value;
    const data = {
        name: productName.value,
        cost_price: +costPrice.value,
        sale_price: +salePrice.value,
        unit: unit.value
    };

    try {
        if (id) {
            await db.collection("products").doc(id).update(data);
            showToast("✔ Product Updated");
        } else {
            await db.collection("products").add(data);
            showToast("✔ Product Added");
        }
        productName.value = costPrice.value = salePrice.value = unit.value = productId.value = ""; // Clear form
        loadProducts();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function loadProducts() {
    const productList = document.getElementById("productList");
    const saleProduct = document.getElementById("saleProduct");
    productList.innerHTML = "<tr><td colspan='5'>Loading products...</td></tr>"; // Show loading

    try {
        const snap = await db.collection("products").get();
        let listHtml = "";
        // saleProduct.innerHTML = "<option value=''>Select Product</option>"; // Removed for live search
        snap.forEach(doc => {
            const p = doc.data();
            listHtml += `<tr>
                <td>${p.name}</td>
                <td>₹${p.cost_price || 0}</td>
                <td>₹${p.sale_price || 0}</td>
                <td>${p.unit || ''}</td>
                <td>
                    <button onclick="editProduct('${doc.id}', '${p.name}', '${p.cost_price}', '${p.sale_price}', '${p.unit}')">✏ Edit</button>
                    <button onclick="deleteProduct('${doc.id}')" style="background-color:red;">🗑 Delete</button>
                </td>
            </tr>`;
        });
        productList.innerHTML = listHtml;
    } catch (e) {
        console.error("Error loading products:", e);
        productList.innerHTML = `<tr><td colspan='5' style="color:red;">Error loading products: ${e.message}</td></tr>`;
        showToast("❌ Error loading products", "red");
    }
}

function editProduct(id, n, c, s, u) {
    document.getElementById("productId").value = id;
    document.getElementById("productName").value = n;
    document.getElementById("costPrice").value = c;
    document.getElementById("salePrice").value = s;
    document.getElementById("unit").value = u;
    showToast("✔ Product loaded for editing");
}

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
        await db.collection("products").doc(id).delete();
        showToast("❌ Product Deleted", "red");
        loadProducts();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}


// --- Customers ---
async function saveCustomer() {
    const customerId = document.getElementById("customerId");
    const custName = document.getElementById("custName");
    const custMobile = document.getElementById("custMobile");
    const custAddress = document.getElementById("custAddress");

    const id = customerId.value;
    const data = {
        name: custName.value,
        mobile: custMobile.value,
        address: custAddress.value
    };

    try {
        if (id) {
            await db.collection("customers").doc(id).update(data);
            showToast("✔ Customer Updated");
        } else {
            data.pending_balance = 0;
            data.advance_balance = 0;
            await db.collection("customers").add(data);
            showToast("✔ Customer Added");
        }
        custName.value = custMobile.value = custAddress.value = customerId.value = ""; // Clear form
        loadCustomers();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function loadCustomers() {
    const customerList = document.getElementById("customerList");
    customerList.innerHTML = "<tr><td colspan='5'>Loading customers...</td></tr>"; // Show loading

    try {
        db.collection("customers").onSnapshot(snap => { // Use onSnapshot for real-time updates
            let listHtml = "";
            snap.forEach(doc => {
                const c = doc.data();
                listHtml += `<tr>
                    <td>${c.name}</td>
                    <td>${c.mobile || ''}</td>
                    <td>₹${c.pending_balance || 0}</td>
                    <td>₹${c.advance_balance || 0}</td>
                    <td>
                        <button onclick="editCustomer('${doc.id}', '${c.name}', '${c.mobile || ''}', '${c.address || ''}')">✏ Edit</button>
                        <button onclick="deleteCustomer('${doc.id}')" style="background-color:red;">🗑 Delete</button>
                    </td>
                </tr>`;
            });
            customerList.innerHTML = listHtml;
            loadLedger(); // Reload ledger when customers change
        });
    } catch (e) {
        console.error("Error loading customers:", e);
        customerList.innerHTML = `<tr><td colspan='5' style="color:red;">Error loading customers: ${e.message}</td></tr>`;
        showToast("❌ Error loading customers", "red");
    }
}

function editCustomer(id, n, m, a) {
    document.getElementById("customerId").value = id;
    document.getElementById("custName").value = n;
    document.getElementById("custMobile").value = m;
    document.getElementById("custAddress").value = a;
    showToast("✔ Customer loaded for editing");
}

async function deleteCustomer(id) {
    if (!confirm("Are you sure you want to delete this customer? This will not affect past invoices.")) return;
    try {
        await db.collection("customers").doc(id).delete();
        showToast("❌ Customer Deleted", "red");
        loadCustomers();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}


// --- Ledger ---
async function loadLedger() {
    const ledgerList = document.getElementById("ledgerList");
    ledgerList.innerHTML = "<tr><td colspan='4'>Loading ledger...</td></tr>";

    try {
        const customerSnap = await db.collection("customers").get();
        let listHtml = "", totalPending = 0, totalAdvance = 0, totalCust = 0;
        customerSnap.forEach(doc => {
            const c = doc.data();
            totalCust++;
            totalPending += (c.pending_balance || 0);
            totalAdvance += (c.advance_balance || 0);
            listHtml += `<tr>
                <td>${c.name}</td>
                <td>₹${c.pending_balance || 0}</td>
                <td>₹${c.advance_balance || 0}</td>
                <td><button onclick="editLedger('${doc.id}', '${c.name}', '${c.pending_balance || 0}', '${c.advance_balance || 0}')">✏ Adjust</button></td>
            </tr>`;
        });
        ledgerList.innerHTML = listHtml;

        document.getElementById("totalCustomers").innerText = totalCust;
        document.getElementById("totalPending").innerText = totalPending.toFixed(2);
        document.getElementById("totalAdvance").innerText = totalAdvance.toFixed(2);

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfYear = new Date(today.getFullYear(), 0, 1);

        let todayProfit = 0, monthProfit = 0, yearProfit = 0;
        let todayCost = 0, monthCost = 0, yearCost = 0;
        let todaySale = 0, monthSale = 0;

        const salesSnap = await db.collection("sales").get();
        salesSnap.forEach(doc => {
            const s = doc.data();
            if (s.date && s.date.toDate) {
                const d = s.date.toDate();
                const itemCost = (s.items || []).reduce((acc, it) => acc + ((it.cost_price || 0) * (it.qty || 1)), 0);
                const itemProfit = (s.items || []).reduce((acc, it) => acc + (((it.price || 0) - (it.cost_price || 0)) * (it.qty || 1)), 0);

                if (d >= startOfDay) {
                    todayProfit += itemProfit;
                    todayCost += itemCost;
                    todaySale += s.total || 0;
                }
                if (d >= startOfMonth) {
                    monthProfit += itemProfit;
                    monthCost += itemCost;
                    monthSale += s.total || 0;
                }
                if (d >= startOfYear) {
                    yearProfit += itemProfit;
                    yearCost += itemCost;
                }
            }
        });

        let todayExp = 0, monthExp = 0, yearExp = 0;
        const expSnap = await db.collection("expenses").get();
        expSnap.forEach(doc => {
            const e = doc.data();
            if (e.date && e.date.toDate) {
                const d = e.date.toDate();
                if (d >= startOfDay) todayExp += e.amount;
                if (d >= startOfMonth) monthExp += e.amount;
                if (d >= startOfYear) yearExp += e.amount;
            }
        });

        document.getElementById("todaySale").innerText = todaySale.toFixed(2);
        document.getElementById("monthSale").innerText = monthSale.toFixed(2);

        document.getElementById("todayProfit").innerText = todayProfit.toFixed(2);
        document.getElementById("monthProfit").innerText = monthProfit.toFixed(2);
        document.getElementById("yearProfit").innerText = yearProfit.toFixed(2);

        document.getElementById("todayCost").innerText = todayCost.toFixed(2);
        document.getElementById("monthCost").innerText = monthCost.toFixed(2);
        document.getElementById("yearCost").innerText = yearCost.toFixed(2);

        document.getElementById("todayExpense").innerText = todayExp.toFixed(2);
        document.getElementById("monthExpense").innerText = monthExp.toFixed(2);
        document.getElementById("yearExpense").innerText = yearExp.toFixed(2);

        document.getElementById("todayNet").innerText = (todayProfit - todayExp).toFixed(2);
        document.getElementById("monthNet").innerText = (monthProfit - monthExp).toFixed(2);
        document.getElementById("yearNet").innerText = (yearProfit - yearExp).toFixed(2);

    } catch (e) {
        console.error("Error loading ledger:", e);
        ledgerList.innerHTML = `<tr><td colspan='4' style="color:red;">Error loading ledger: ${e.message}</td></tr>`;
        showToast("❌ Error loading ledger", "red");
    }
}

async function editLedger(id, name) {
    let amount = prompt(`Enter Amount for ${name} (+ve = Customer Paid, -ve = To Collect/Adjust):`, "0");
    amount = parseFloat(amount);
    if (isNaN(amount) || amount === 0) return;

    try {
        const doc = await db.collection("customers").doc(id).get();
        if (doc.exists) {
            const c = doc.data();
            let newPending = c.pending_balance || 0;
            let newAdvance = c.advance_balance || 0;

            if (amount > 0) { // Customer paid
                if (amount >= newPending) {
                    amount -= newPending;
                    newPending = 0;
                    newAdvance += amount;
                } else {
                    newPending -= amount;
                }
            } else { // To collect or adjust (negative amount)
                let need = Math.abs(amount);
                if (newAdvance >= need) {
                    newAdvance -= need;
                } else {
                    need -= newAdvance;
                    newAdvance = 0;
                    newPending += need;
                }
            }

            await db.collection("customers").doc(id).update({
                pending_balance: newPending,
                advance_balance: newAdvance
            });
            showToast("✔ Ledger Updated for " + name);
            loadLedger();
        }
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}


// --- Sales (Cart & Invoicing) ---
let cart = []; // Global cart for new sales
window.editingInvoiceId = null; // Global flag for editing an invoice

async function addSaleItem() {
    const pid = document.getElementById("saleProduct").value;
    const qty = +document.getElementById("saleQty").value;
    const manualPrice = +document.getElementById("saleManualPrice").value;
    const remark = document.getElementById("saleRemark").value;
    const isWorkComplete = document.getElementById("workComplete").checked;

    if (!pid || qty <= 0) {
        showToast("Please select a product and enter a valid quantity.", "red");
        return;
    }

    try {
        const doc = await db.collection("products").doc(pid).get();
        if (!doc.exists) {
            showToast("Product not found!", "red");
            return;
        }

        const p = doc.data();
        const price = manualPrice || p.sale_price;
        const cost_price = p.cost_price || 0; // Capture cost price for profit calculation
        let discount = 0;
        if (manualPrice && manualPrice < p.sale_price) {
            discount = (p.sale_price - manualPrice) * qty;
        }
        const total = price * qty;

        cart.push({
            product_id: pid, // Store product ID for future reference
            product: p.name,
            qty: qty,
            price: price, // Final sale price per unit
            cost_price: cost_price, // Cost price per unit
            total: total, // Total price for this item (qty * price)
            remark: remark,
            work: isWorkComplete,
            discount: discount
        });
        renderCart();
        // Clear product selection and quantity fields
        document.getElementById("saleProdSearch").value = "";
        document.getElementById("saleProduct").value = "";
        document.getElementById("saleQty").value = "1";
        document.getElementById("saleManualPrice").value = "";
        document.getElementById("saleRemark").value = "";
        document.getElementById("productPriceInfo").innerHTML = "";
    } catch (e) {
        showToast("❌ Error adding item: " + e.message, "red");
    }
}

function renderCart() {
    const saleCart = document.getElementById("saleCart");
    saleCart.innerHTML = "";
    let overallGross = 0;
    let overallNet = 0;
    cart.forEach((item, index) => {
        overallGross += (item.price * item.qty) + (item.discount || 0); // Price without discount
        overallNet += item.total; // Price with discount applied
        saleCart.innerHTML += `<li>
            ${item.product} x${item.qty} = ₹${item.total.toFixed(2)}
            ${item.discount > 0 ? ` <span style="color:green; font-size:0.8em;">(Discount: ₹${item.discount.toFixed(2)})</span>` : ""}
            ${item.remark ? `<br><small>📝${item.remark}</small>` : ""}
            ${item.work ? "" : " <b style='color:red;'>(Pending Work)</b>"}
            <button onclick="removeCart(${index})" style="background-color:red;">❌</button>
        </li>`;
    });

    // Display total
    if (cart.length > 0) {
        saleCart.innerHTML += `<li style="font-weight:bold; background-color:#e0e0e0;">
            <span>Gross Total: ₹${overallGross.toFixed(2)}</span>
            <span>Net Payable: ₹${overallNet.toFixed(2)}</span>
        </li>`;
    }
}

function removeCart(index) {
    cart.splice(index, 1);
    renderCart();
    showToast("Item removed from cart", "orange");
}

async function saveInvoice() {
    if (cart.length === 0) {
        alert("Cart is empty. Add items to save an invoice.");
        return;
    }
    const custId = document.getElementById("saleCustomer").value;
    if (!custId) {
        alert("Please select a customer.");
        return;
    }

    let grossTotal = 0, discountTotal = 0, netTotal = 0;
    cart.forEach(item => {
        grossTotal += (item.price * item.qty) + (item.discount || 0);
        discountTotal += item.discount || 0;
        netTotal += item.total;
    });

    const cashReceived = +document.getElementById("cashReceived").value || 0;

    try {
        let customerDoc = await db.collection("customers").doc(custId).get();
        if (!customerDoc.exists) {
            alert("Customer not found!");
            return;
        }
        let customerData = customerDoc.data();
        let currentPending = customerData.pending_balance || 0;
        let currentAdvance = customerData.advance_balance || 0;

        let newPending = currentPending;
        let newAdvance = currentAdvance;
        let invoiceNo = null;

        // Calculate new pending/advance based on current sale
        let balanceDue = netTotal - cashReceived;
        if (balanceDue > 0) { // Customer owes money
            if (newAdvance >= balanceDue) {
                newAdvance -= balanceDue;
            } else {
                newPending += (balanceDue - newAdvance);
                newAdvance = 0;
            }
        } else if (balanceDue < 0) { // Customer overpaid
            let excess = Math.abs(balanceDue);
            newAdvance += excess;
        }

        // Handle existing invoice update
        if (window.editingInvoiceId) {
            if (!confirm("Are you sure you want to update this invoice? This will adjust the customer's ledger.")) return;

            const oldInvoiceDoc = await db.collection("sales").doc(window.editingInvoiceId).get();
            if (!oldInvoiceDoc.exists) {
                alert("Original invoice not found for update.");
                return;
            }
            const oldInvoiceData = oldInvoiceDoc.data();

            // Revert previous ledger impact of this invoice
            let oldNetTotal = oldInvoiceData.total || 0;
            let oldCashReceived = oldInvoiceData.cash_received || 0;
            let oldBalanceDue = oldNetTotal - oldCashReceived;

            if (oldBalanceDue > 0) { // Previously customer owed money
                newPending = Math.max(0, newPending - oldBalanceDue);
            } else if (oldBalanceDue < 0) { // Previously customer overpaid
                let oldExcess = Math.abs(oldBalanceDue);
                newAdvance = Math.max(0, newAdvance - oldExcess);
            }

            // Apply new ledger impact (already calculated above)
            await db.collection("customers").doc(custId).update({
                pending_balance: newPending,
                advance_balance: newAdvance
            });

            await db.collection("sales").doc(window.editingInvoiceId).update({
                items: cart,
                customer_id: custId,
                customer_name: customerData.name,
                customer_mobile: customerData.mobile || "",
                customer_address: customerData.address || "",
                gross_total: grossTotal,
                discount_total: discountTotal,
                total: netTotal,
                cash_received: cashReceived,
                date: firebase.firestore.FieldValue.serverTimestamp() // Update timestamp
            });
            invoiceNo = oldInvoiceData.invoice_no; // Keep old invoice number
            showToast(`✔ Invoice #${invoiceNo} Updated`);
            window.editingInvoiceId = null; // Clear editing flag

        } else { // New invoice
            const metaDoc = await db.collection("meta").doc("counters").get();
            invoiceNo = 1;
            if (metaDoc.exists && metaDoc.data().invoice_no) {
                invoiceNo = metaDoc.data().invoice_no + 1;
            }

            const invoiceData = {
                items: cart,
                customer_id: custId,
                customer_name: customerData.name,
                customer_mobile: customerData.mobile || "",
                customer_address: customerData.address || "",
                gross_total: grossTotal,
                discount_total: discountTotal,
                total: netTotal,
                cash_received: cashReceived,
                delivered: false, // For tracking pending tasks
                date: firebase.firestore.FieldValue.serverTimestamp(),
                invoice_no: invoiceNo,
                prev_pending: currentPending, // Store balances before this invoice
                prev_advance: currentAdvance
            };

            await db.collection("sales").add(invoiceData);
            await db.collection("meta").doc("counters").set({ invoice_no: invoiceNo }, { merge: true });
            await db.collection("customers").doc(custId).update({
                pending_balance: newPending,
                advance_balance: newAdvance
            });
            showToast(`✔ Invoice Saved #${invoiceNo}`);
        }

        // Reset UI after saving
        cart = [];
        renderCart();
        document.getElementById("cashReceived").value = "0";
        document.getElementById("saleCustomer").value = "";
        document.getElementById("custSearchResults").innerHTML = ""; // Clear customer search results
        document.getElementById("saleCustSearch").value = "";

        // Reload relevant sections
        loadReports();
        loadInvoices();
        loadPendingTasks();
        loadLedger();

    } catch (e) {
        showToast("❌ Error saving invoice: " + e.message, "red");
        console.error("Error saving invoice:", e);
    }
}


// --- Invoices (Viewing, Editing, Deleting, Printing) ---
async function loadInvoices() {
    const invoiceList = document.getElementById("invoiceList");
    invoiceList.innerHTML = "<tr><td colspan='5'>Loading invoices...</td></tr>";

    try {
        const snap = await db.collection("sales").orderBy("date", "desc").limit(20).get(); // Limit to last 20 by default
        renderInvoiceTable(snap);
    } catch (e) {
        console.error("Error loading invoices:", e);
        invoiceList.innerHTML = `<tr><td colspan='5' style="color:red;">Error loading invoices: ${e.message}</td></tr>`;
        showToast("❌ Error loading invoices", "red");
    }
}

function renderInvoiceTable(snap) {
    const invoiceList = document.getElementById("invoiceList");
    invoiceList.innerHTML = "";
    if (snap.empty) {
        invoiceList.innerHTML = "<tr><td colspan='5'>No invoices found.</td></tr>";
        return;
    }
    snap.forEach(doc => {
        const s = doc.data();
        const date = s.date && s.date.toDate ? s.date.toDate().toLocaleString() : "N/A";
        invoiceList.innerHTML += `<tr>
            <td>${date}</td>
            <td>#${s.invoice_no || "N/A"}</td>
            <td>${s.customer_name || "Walk-in"}</td>
            <td>₹${(s.total || 0).toFixed(2)}</td>
            <td>
                <button onclick="printInvoice('${doc.id}')">🖨 Print</button>
                <button onclick="editInvoice('${doc.id}')">✏ Edit</button>
                <button onclick="deleteInvoice('${doc.id}')" style="background-color:red;">❌ Delete</button>
            </td>
        </tr>`;
    });
}

async function editInvoice(id) {
    try {
        const doc = await db.collection("sales").doc(id).get();
        if (!doc.exists) {
            alert("Invoice not found!");
            return;
        }
        const s = doc.data();
        cart = s.items || [];
        renderCart();
        document.getElementById("saleCustomer").value = s.customer_id;

        // For live search, display customer name
        document.getElementById("custSearchResults").innerHTML = `<b>${s.customer_name || "Walk-in"}</b> (${s.customer_mobile || "-"})`;

        document.getElementById("cashReceived").value = s.cash_received || 0;
        showToast("✔ Invoice loaded for editing", "blue");
        openSaleTab("newSale");
        window.editingInvoiceId = id; // Set the flag for editing
    } catch (e) {
        showToast("❌ Error loading invoice for edit: " + e.message, "red");
        console.error("Error editing invoice:", e);
    }
}

async function deleteInvoice(id) {
    if (!confirm("⚠ Deleting this invoice will revert the customer's ledger balance. Are you sure?")) return;

    try {
        const doc = await db.collection("sales").doc(id).get();
        if (!doc.exists) return;
        const s = doc.data();

        // Revert ledger balance
        const custDoc = await db.collection("customers").doc(s.customer_id).get();
        if (custDoc.exists) {
            const c = custDoc.data();
            let newPending = c.pending_balance || 0;
            let newAdvance = c.advance_balance || 0;

            let balanceImpact = (s.total || 0) - (s.cash_received || 0);

            if (balanceImpact > 0) { // Invoice created pending (customer owed money)
                newPending = Math.max(0, newPending - balanceImpact);
            } else if (balanceImpact < 0) { // Invoice created advance (customer overpaid)
                let excess = Math.abs(balanceImpact);
                newAdvance = Math.max(0, newAdvance - excess);
            }

            await db.collection("customers").doc(s.customer_id).update({
                pending_balance: newPending,
                advance_balance: newAdvance
            });
        }

        await db.collection("sales").doc(id).delete();
        showToast("❌ Invoice Deleted", "red");
        loadReports();
        loadInvoices();
        loadPendingTasks();
        loadLedger();
    } catch (e) {
        showToast("❌ " + e.message, "red");
        console.error("Error deleting invoice:", e);
    }
}

async function searchInvoices() {
    const nameQuery = document.getElementById("invSearchCustomer").value.toLowerCase();
    const productQuery = document.getElementById("invSearchProduct").value.toLowerCase();
    const fromDate = document.getElementById("invSearchFrom").value ? new Date(document.getElementById("invSearchFrom").value) : null;
    const toDate = document.getElementById("invSearchTo").value ? new Date(document.getElementById("invSearchTo").value + " 23:59:59") : null; // End of day

    try {
        let query = db.collection("sales").orderBy("date", "desc");
        const snap = await query.get();
        const results = [];

        snap.forEach(doc => {
            const s = doc.data();
            let matches = true;

            // Filter by customer name/mobile
            if (nameQuery && !(s.customer_name || "").toLowerCase().includes(nameQuery) && !((s.customer_mobile || "")).includes(nameQuery)) {
                matches = false;
            }

            // Filter by product name within items
            if (productQuery) {
                const hasProduct = (s.items || []).some(item => (item.product || "").toLowerCase().includes(productQuery));
                if (!hasProduct) {
                    matches = false;
                }
            }

            // Filter by date range
            if (s.date && s.date.toDate) {
                const invoiceDate = s.date.toDate();
                if (fromDate && invoiceDate < fromDate) {
                    matches = false;
                }
                if (toDate && invoiceDate > toDate) {
                    matches = false;
                }
            } else if (fromDate || toDate) { // If date is missing but date filter is active
                matches = false;
            }

            if (matches) {
                results.push(doc);
            }
        });
        renderInvoiceTable(results);
    } catch (e) {
        showToast("❌ Error searching invoices: " + e.message, "red");
        console.error("Error searching invoices:", e);
    }
}

async function printInvoice(id) {
    try {
        const invoiceDoc = await db.collection("sales").doc(id).get();
        if (!invoiceDoc.exists) return alert("Invoice not found!");
        const s = invoiceDoc.data();

        const customerDoc = await db.collection("customers").doc(s.customer_id).get();
        const cust = customerDoc.exists ? customerDoc.data() : {};

        const shopDoc = await db.collection("settings").doc("shop_profile").get();
        const shop = shopDoc.exists ? shopDoc.data() : {};

        const totalAmount = (s.total || 0).toFixed(2);
        const cash = (s.cash_received || 0).toFixed(2);
        const totalDiscount = (s.discount_total || 0).toFixed(2);
        const gross = (s.gross_total || s.total || 0).toFixed(2);
        const invoiceDate = s.date && s.date.toDate ? s.date.toDate().toLocaleString() : "N/A";

        let itemsHtml = (s.items || []).map(item => {
            const sp = (item.price + (item.discount ? item.discount / item.qty : 0)).toFixed(2);
            return `<tr>
                <td>
                    ${item.product}
                    ${item.remark ? `<br><small>📝 ${item.remark}</small>` : ""}
                    ${item.work ? "" : " <b style='color:red;'>(Pending Work)</b>"}
                </td>
                <td>${item.qty}</td>
                <td>₹${sp}</td>
                <td>${item.discount > 0 ? `-₹${item.discount.toFixed(2)}` : "₹0.00"}</td>
                <td>₹${item.price.toFixed(2)}</td>
                <td>₹${item.total.toFixed(2)}</td>
            </tr>`;
        }).join('');

        let html = `
            <div style="font-family:Arial, sans-serif; padding:20px; max-width:700px; margin:auto; border:1px solid #ccc;">
                <h2 style="text-align:center; margin-bottom:5px;">${shop.shop_name || "My Shop"}</h2>
                <p style="text-align:center; font-size:0.9em; margin-top:0;">
                    GST: ${shop.gst_number || "-"}<br>
                    Mobile: ${shop.mobile || "-"}<br>
                    ${shop.address || ""}
                </p>
                <hr style="border:0; border-top:1px dashed #ccc; margin:15px 0;">
                <h3 style="text-align:center; margin-bottom:15px;">Invoice</h3>
                <p style="font-size:0.95em;"><b>Invoice No:</b> INV-${s.invoice_no || "N/A"}</p>
                <p style="font-size:0.95em;"><b>Date:</b> ${invoiceDate}</p>
                <p style="font-size:0.95em;">
                    <b>Customer:</b> ${s.customer_name || "Walk-in Customer"} (${s.customer_mobile || "-"})<br>
                    ${s.customer_address || ""}
                </p>
                <table style="width:100%; border-collapse:collapse; margin-top:20px;" border="1">
                    <thead>
                        <tr style="background-color:#f2f2f2;">
                            <th style="padding:8px; text-align:left;">Item</th>
                            <th style="padding:8px; text-align:left;">Qty</th>
                            <th style="padding:8px; text-align:left;">Sale Price</th>
                            <th style="padding:8px; text-align:left;">Discount</th>
                            <th style="padding:8px; text-align:left;">Final Price</th>
                            <th style="padding:8px; text-align:left;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div style="text-align:right; margin-top:20px;">
                    <p style="font-size:1em; margin:5px 0;"><b>Gross Total:</b> ₹${gross}</p>
                    ${totalDiscount > 0 ? `<p style="font-size:1em; margin:5px 0;"><b>Total Discount:</b> -₹${totalDiscount}</p>` : ""}
                    <h3 style="margin:10px 0; color:#333;">Net Payable: ₹${totalAmount}</h3>
                </div>
                <p style="font-size:1em; margin:15px 0;"><b>Cash Received:</b> ₹${cash}</p>
                <hr style="border:0; border-top:1px dashed #ccc; margin:15px 0;">
                <p style="font-size:0.9em;"><b>Real-time Ledger (Now)</b><br>
                    Pending: ₹${(cust.pending_balance || 0).toFixed(2)}<br>
                    Advance: ₹${(cust.advance_balance || 0).toFixed(2)}</p>
                <hr style="border:0; border-top:1px dashed #ccc; margin:15px 0;">
                <p style="text-align:center; font-style:italic; font-size:0.9em;">Thank you for shopping!</p>
            </div>
        `;

        const win = window.open("", "PRINT", "height=700,width=900");
        win.document.write("<html><head><title>Invoice</title>");
        win.document.write("<style>body{margin:0;font-family:Arial,sans-serif;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style>");
        win.document.write("</head><body>" + html + "</body></html>");
        win.document.close();
        win.focus();
        win.print();
    } catch (e) {
        showToast("❌ Error printing invoice: " + e.message, "red");
        console.error("Error printing invoice:", e);
    }
}


// --- Expenses ---
async function saveExpense() {
    const expTitle = document.getElementById("expTitle");
    const expAmount = document.getElementById("expAmount");
    const expNote = document.getElementById("expNote");

    if (!expTitle.value || !expAmount.value) {
        showToast("Please enter an expense title and amount.", "red");
        return;
    }

    try {
        await db.collection("expenses").add({
            title: expTitle.value,
            amount: +expAmount.value,
            note: expNote.value,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("✔ Expense Saved");
        expTitle.value = expAmount.value = expNote.value = ""; // Clear form
        loadExpenses();
        loadLedger(); // Update ledger stats
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function loadExpenses() {
    const expenseList = document.getElementById("expenseList");
    expenseList.innerHTML = "<li>Loading expenses...</li>";

    try {
        const snap = await db.collection("expenses").orderBy("date", "desc").limit(10).get(); // Show last 10 expenses
        let listHtml = "";
        if (snap.empty) {
            listHtml = "<li>No expenses recorded.</li>";
        } else {
            snap.forEach(doc => {
                const e = doc.data();
                const date = e.date && e.date.toDate ? e.date.toDate().toLocaleDateString() : "N/A";
                listHtml += `<li>
                    ${e.title} - ₹${(e.amount || 0).toFixed(2)}
                    ${e.note ? `<br><small>📝 ${e.note}</small>` : ""}
                    <small style="float:right; color:#888;">${date}</small>
                </li>`;
            });
        }
        expenseList.innerHTML = listHtml;
    } catch (e) {
        console.error("Error loading expenses:", e);
        expenseList.innerHTML = `<li>Error loading expenses: ${e.message}</li>`;
        showToast("❌ Error loading expenses", "red");
    }
}


// --- AEPS Transactions ---
async function saveAeps() {
    const aepsAadhaar = document.getElementById("aepsAadhaar");
    const aepsBank = document.getElementById("aepsBank");
    const aepsAmount = document.getElementById("aepsAmount");
    const aepsStatus = document.getElementById("aepsStatus");

    if (!aepsAadhaar.value || !aepsBank.value || !aepsAmount.value) {
        showToast("Please fill all AEPS fields.", "red");
        return;
    }

    try {
        await db.collection("aeps_txn").add({
            aadhaar: aepsAadhaar.value,
            bank: aepsBank.value,
            amount: +aepsAmount.value,
            status: aepsStatus.value,
            date: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("✔ AEPS Transaction Saved");
        aepsAadhaar.value = aepsBank.value = aepsAmount.value = ""; // Clear form
        aepsStatus.value = "success";
        loadAeps();
        loadReports(); // Update AEPS report
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function loadAeps() {
    const aepsList = document.getElementById("aepsList");
    aepsList.innerHTML = "<li>Loading AEPS transactions...</li>";

    try {
        const snap = await db.collection("aeps_txn").orderBy("date", "desc").limit(10).get(); // Show last 10
        let listHtml = "";
        if (snap.empty) {
            listHtml = "<li>No AEPS transactions recorded.</li>";
        } else {
            snap.forEach(doc => {
                const a = doc.data();
                const date = a.date && a.date.toDate ? a.date.toDate().toLocaleDateString() : "N/A";
                listHtml += `<li>
                    ${a.aadhaar} - ₹${(a.amount || 0).toFixed(2)} (${a.status})
                    <small style="float:right; color:#888;">${date}</small>
                </li>`;
            });
        }
        aepsList.innerHTML = listHtml;
    } catch (e) {
        console.error("Error loading AEPS transactions:", e);
        aepsList.innerHTML = `<li>Error loading AEPS transactions: ${e.message}</li>`;
        showToast("❌ Error loading AEPS transactions", "red");
    }
}


// --- Pending Tasks ---
async function addManualTask() {
    const title = document.getElementById("manualTaskTitle").value.trim();
    const note = document.getElementById("manualTaskNote").value.trim();
    const deadlineValue = document.getElementById("manualTaskDeadline").value;
    const deadline = deadlineValue ? new Date(deadlineValue) : null;

    if (!title) {
        alert("Please enter a task title.");
        return;
    }

    try {
        await db.collection("manual_tasks").add({
            title: title,
            note: note,
            created: firebase.firestore.FieldValue.serverTimestamp(),
            deadline: deadline,
            done: false
        });
        showToast("✔ Manual Task Added");
        document.getElementById("manualTaskTitle").value = "";
        document.getElementById("manualTaskNote").value = "";
        document.getElementById("manualTaskDeadline").value = "";
        loadPendingTasks();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function loadPendingTasks() {
    const pendingTasksDiv = document.getElementById("pendingTasks");
    pendingTasksDiv.innerHTML = "Loading pending tasks...";

    try {
        const [salesSnap, manualSnap] = await Promise.all([
            db.collection("sales").where("delivered", "==", false).get(),
            db.collection("manual_tasks").where("done", "==", false).get()
        ]);

        let tasksHtml = "";
        if (salesSnap.empty && manualSnap.empty) {
            tasksHtml = "<p>🎉 No pending tasks! Great job!</p>";
        }

        // Sales pending items
        salesSnap.forEach(doc => {
            const s = doc.data();
            const invoiceDate = s.date && s.date.toDate ? s.date.toDate() : new Date();
            const days = Math.floor((new Date() - invoiceDate) / (1000 * 60 * 60 * 24)); // Days since invoice

            (s.items || []).forEach(item => {
                if (!item.work) { // Only show items not marked as complete within the invoice
                    tasksHtml += `<div style="border-bottom:1px solid #ccc;padding:8px 0;">
                        <div style="flex:1;">
                            <b>${s.customer_name || "Walk-in"}</b> | Inv#${s.invoice_no || 'N/A'} | ${invoiceDate.toLocaleDateString()} | 📦 ${item.product}
                            ${item.remark ? ` - ${item.remark}` : ""}
                            <span style="color:#888;"> | Overdue: ${days} day(s)</span>
                        </div>
                        <div>
                            <button onclick="markDelivered('${doc.id}')" style="background:green;color:white;">✔ Mark Delivered</button>
                            <!-- Cancel pending item is complex without sub-item ID, so keeping invoice-level mark delivered -->
                        </div>
                    </div>`;
                }
            });
        });

        // Manual pending tasks
        manualSnap.forEach(doc => {
            const t = doc.data();
            const created = t.created && t.created.toDate ? t.created.toDate() : new Date();
            const deadline = t.deadline && t.deadline.toDate ? t.deadline.toDate() : created;
            const daysSinceCreated = Math.floor((new Date() - created) / (1000 * 60 * 60 * 24));

            let deadlineInfo = `Deadline: ${deadline.toLocaleDateString()}`;
            if (deadline < new Date() && !t.done) {
                deadlineInfo = `<b style="color:red;">Overdue: ${Math.abs(Math.floor((new Date() - deadline) / (1000 * 60 * 60 * 24)))} day(s)</b>`;
            }

            tasksHtml += `<div style="border-bottom:1px solid #ccc;padding:8px 0;">
                <div style="flex:1;">
                    📝 <b>${t.title}</b>
                    ${t.note ? ` - ${t.note}` : ""}
                    <br><small>Created: ${created.toLocaleDateString()} | ${deadlineInfo} | Age: ${daysSinceCreated} day(s)</small>
                </div>
                <div>
                    <button onclick="markManualDone('${doc.id}')" style="background:green;color:white;">✔ Done</button>
                    <button onclick="cancelManualTask('${doc.id}')" style="background:red;color:white;">❌ Delete</button>
                </div>
            </div>`;
        });
        pendingTasksDiv.innerHTML = tasksHtml;

    } catch (e) {
        console.error("Error loading pending tasks:", e);
        pendingTasksDiv.innerHTML = `<p style="color:red;">Error loading pending tasks: ${e.message}</p>`;
        showToast("❌ Error loading pending tasks", "red");
    }
}

async function markManualDone(id) {
    try {
        await db.collection("manual_tasks").doc(id).update({ done: true });
        showToast("✔ Task Completed");
        loadPendingTasks();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function cancelManualTask(id) {
    if (!confirm("Are you sure you want to delete this manual task?")) return;
    try {
        await db.collection("manual_tasks").doc(id).delete();
        showToast("❌ Task Deleted", "red");
        loadPendingTasks();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}

async function markDelivered(id) {
    // This marks the entire invoice as delivered. If you need item-level tracking,
    // you'd need to modify your sales structure to update individual item 'work' status.
    if (!confirm("Mark all items in this invoice as delivered?")) return;
    try {
        await db.collection("sales").doc(id).update({ delivered: true });
        showToast("✔ Invoice Items Marked Delivered");
        loadPendingTasks();
        loadReports();
    } catch (e) {
        showToast("❌ " + e.message, "red");
    }
}


// --- Reports ---
async function loadReports() {
    const reportBox = document.getElementById("reportBox");
    const expenseReport = document.getElementById("expenseReport");
    const aepsReport = document.getElementById("aepsReport");

    reportBox.innerHTML = "<p>Loading sales report...</p>";
    expenseReport.innerHTML = "<p>Loading expense report...</p>";
    aepsReport.innerHTML = "<p>Loading AEPS report...</p>";

    try {
        const salesSnap = await db.collection("sales").get();
        let totalSales = 0, pendingWorks = 0;
        salesSnap.forEach(doc => {
            const s = doc.data();
            totalSales += (s.total || 0);
            if (!s.delivered) {
                // Count individual items not marked as 'work' complete
                (s.items || []).forEach(item => {
                    if (!item.work) pendingWorks++;
                });
            }
        });
        reportBox.innerHTML = `<p><b>Total Sales:</b> ₹${totalSales.toFixed(2)}</p><p><b>Pending Work Items:</b> ${pendingWorks}</p>`;

        const expenseSnap = await db.collection("expenses").get();
        let totalExpenses = 0;
        expenseSnap.forEach(doc => totalExpenses += (doc.data().amount || 0));
        expenseReport.innerHTML = `<p><b>Total Expenses:</b> ₹${totalExpenses.toFixed(2)}</p>`;

        const aepsSnap = await db.collection("aeps_txn").get();
        let aepsSuccess = 0, aepsFail = 0, aepsTotalAmount = 0;
        aepsSnap.forEach(doc => {
            const a = doc.data();
            if (a.status === "success") {
                aepsSuccess++;
                aepsTotalAmount += (a.amount || 0);
            } else if (a.status === "fail") {
                aepsFail++;
            }
        });
        aepsReport.innerHTML = `<p><b>AEPS Success:</b> ${aepsSuccess}</p><p><b>AEPS Failed:</b> ${aepsFail}</p><p><b>AEPS Total Amount:</b> ₹${aepsTotalAmount.toFixed(2)}</p>`;
    } catch (e) {
        console.error("Error loading reports:", e);
        reportBox.innerHTML = `<p style="color:red;">Error loading sales report: ${e.message}</p>`;
        expenseReport.innerHTML = `<p style="color:red;">Error loading expense report: ${e.message}</p>`;
        aepsReport.innerHTML = `<p style="color:red;">Error loading AEPS report: ${e.message}</p>`;
        showToast("❌ Error loading reports", "red");
    }
}


// --- Live Search for Sales Section ---
async function liveSearchCustomer() {
    const query = document.getElementById("saleCustSearch").value.toLowerCase();
    const resultsDiv = document.getElementById("custSearchResults");
    resultsDiv.innerHTML = ""; // Clear previous results

    if (query.length < 2) return; // Start search after 2 characters

    try {
        const snap = await db.collection("customers").get();
        let found = false;
        snap.forEach(doc => {
            const c = doc.data();
            if ((c.name || "").toLowerCase().includes(query) || (c.mobile || "").includes(query)) {
                found = true;
                resultsDiv.innerHTML += `<div class="search-item" onclick="selectSaleCustomer('${doc.id}', '${c.name}', '${c.mobile || ''}')">
                    👤 ${c.name} (${c.mobile || ''})
                </div>`;
            }
        });

        if (!found) {
            resultsDiv.innerHTML += `
                <div style="color:red;padding:5px;">❌ No customer found.</div>
                <button onclick="quickAddSaleCustomer('${query}')">➕ Add New Customer "${query}"</button>
            `;
        }
    } catch (e) {
        console.error("Error searching customers:", e);
        resultsDiv.innerHTML = `<div style="color:red;padding:5px;">Error searching: ${e.message}</div>`;
    }
}

function selectSaleCustomer(id, name, mobile) {
    document.getElementById("saleCustomer").value = id;
    document.getElementById("custSearchResults").innerHTML = `<b>${name}</b> (${mobile})`;
    document.getElementById("saleCustSearch").value = "";
    showToast(`✔ Customer Selected: ${name}`);
}

async function quickAddSaleCustomer(name) {
    try {
        const docRef = await db.collection("customers").add({
            name: name,
            mobile: "",
            address: "",
            pending_balance: 0,
            advance_balance: 0
        });
        document.getElementById("saleCustomer").value = docRef.id;
        document.getElementById("custSearchResults").innerHTML = `<b>${name}</b>`;
        document.getElementById("saleCustSearch").value = "";
        showToast("✔ New Customer Added: " + name);
        loadCustomers(); // Reload customer list in customer section
    } catch (e) {
        showToast("❌ Error adding new customer: " + e.message, "red");
    }
}

async function liveSearchProduct() {
    const query = document.getElementById("saleProdSearch").value.toLowerCase();
    const resultsDiv = document.getElementById("prodSearchResults");
    const productPriceInfo = document.getElementById("productPriceInfo");
    resultsDiv.innerHTML = "";
    productPriceInfo.innerHTML = "";

    if (query.length < 2) return;

    try {
        const snap = await db.collection("products").get();
        let found = false;
        snap.forEach(doc => {
            const p = doc.data();
            if ((p.name || "").toLowerCase().includes(query)) {
                found = true;
                resultsDiv.innerHTML += `<div class="search-item" onclick="selectSaleProduct('${doc.id}', '${p.name}', '${p.sale_price || 0}')">
                    📦 ${p.name} (₹${(p.sale_price || 0).toFixed(2)})
                </div>`;
            }
        });

        if (!found) {
            resultsDiv.innerHTML += `
                <div style="color:red;padding:5px;">❌ No product found.</div>
                <button onclick="quickAddSaleProduct('${query}')">➕ Add New Product "${query}"</button>
            `;
        }
    } catch (e) {
        console.error("Error searching products:", e);
        resultsDiv.innerHTML = `<div style="color:red;padding:5px;">Error searching: ${e.message}</div>`;
    }
}

function selectSaleProduct(id, name, price) {
    document.getElementById("saleProduct").value = id;
    document.getElementById("prodSearchResults").innerHTML = `<b>${name}</b> (₹${parseFloat(price).toFixed(2)})`;
    document.getElementById("saleProdSearch").value = "";
    document.getElementById("productPriceInfo").innerHTML = `Sale Price: ₹${parseFloat(price).toFixed(2)}`;
    showToast(`✔ Product Selected: ${name}`);
}

async function quickAddSaleProduct(name) {
    try {
        const docRef = await db.collection("products").add({
            name: name,
            cost_price: 0,
            sale_price: 0,
            unit: "pcs"
        });
        document.getElementById("saleProduct").value = docRef.id;
        document.getElementById("prodSearchResults").innerHTML = `<b>${name}</b>`;
        document.getElementById("saleProdSearch").value = "";
        document.getElementById("productPriceInfo").innerHTML = "Sale Price: ₹0.00";
        showToast("✔ New Product Added: " + name);
        loadProducts(); // Reload product list in product section
    } catch (e) {
        showToast("❌ Error adding new product: " + e.message, "red");
    }
}


// --- Dashboard ---
function loadDashboard(user, role) {
    document.getElementById("welcomeUser").innerText = `Welcome, ${user.email.split("@")[0]} (${role.toUpperCase()})`;
    const dashboardStats = document.getElementById("dashboardStats");

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const renderDashboardStats = async () => {
        let todaySale = 0, monthSale = 0, todayExp = 0, monthExp = 0, newCustToday = 0, totalCust = 0, totalPendingBal = 0, pendingTasks = 0;

        try {
            const [salesSnap, custSnap, expSnap, manualTaskSnap] = await Promise.all([
                db.collection("sales").get(),
                db.collection("customers").get(),
                db.collection("expenses").get(),
                db.collection("manual_tasks").where("done", "==", false).get()
            ]);

            salesSnap.forEach(doc => {
                const s = doc.data();
                if (s.date && s.date.toDate) {
                    const d = s.date.toDate();
                    if (d >= startOfDay) todaySale += (s.total || 0);
                    if (d >= startOfMonth) monthSale += (s.total || 0);
                }
                // Count pending items from sales
                if (!s.delivered) {
                    (s.items || []).forEach(item => {
                        if (!item.work) pendingTasks++;
                    });
                }
            });

            custSnap.forEach(doc => {
                const c = doc.data();
                totalCust++;
                totalPendingBal += (c.pending_balance || 0);
                if (doc.createTime && doc.createTime.toDate && doc.createTime.toDate() >= startOfDay) {
                    newCustToday++;
                }
            });

            expSnap.forEach(doc => {
                const e = doc.data();
                if (e.date && e.date.toDate) {
                    const d = e.date.toDate();
                    if (d >= startOfDay) todayExp += (e.amount || 0);
                    if (d >= startOfMonth) monthExp += (e.amount || 0);
                }
            });

            // Add manual pending tasks
            pendingTasks += manualTaskSnap.size;

            dashboardStats.innerHTML = `
                <div class="statCard saleCard">📅 Today Sale<span>₹${todaySale.toFixed(2)}</span></div>
                <div class="statCard monthSaleCard">📆 Th
