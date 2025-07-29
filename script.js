class QSellMarginAnalyzer {
    constructor() {
        this.products = [];
        this.setupEventListeners();
        this.setDefaultDate();
    }

    setupEventListeners() {
        const tradeWatchData = document.getElementById('tradeWatchData');
        tradeWatchData.addEventListener('input', () => {
            this.parseTradeWatchData();
        });

        const dateInput = document.getElementById('date');
        dateInput.addEventListener('change', () => {
            this.updatePreview();
        });

        const clientNameInput = document.getElementById('clientName');
        clientNameInput.addEventListener('input', () => {
            this.updatePreview();
        });
    }

    setDefaultDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        document.getElementById('date').value = `${year}-${month}-${day}`;
    }

    parseTradeWatchData() {
        const data = document.getElementById('tradeWatchData').value;
        if (!data.trim()) {
            this.products = [];
            this.updatePreview();
            return;
        }

        this.products = [];
        const lines = data.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Szukamy ID produktu (11-cyfrowa liczba)
            const productIdMatch = line.match(/\b\d{11}\b/);
            if (productIdMatch) {
                const productId = productIdMatch[0];
                
                // Szukamy kosztu sprzedaży (ostatni % w linii)
                const costMatch = line.match(/(\d+,\d+)\s*%$/);
                if (costMatch) {
                    const cost = costMatch[1];
                    
                    // Szukamy udziału w sprzedaży (przedostatni % w linii)
                    const shareMatch = line.match(/(\d+,\d+)\s*%\s*[^-]*-\d+,\d+/);
                    if (shareMatch) {
                        const share = shareMatch[1];
                        
                        this.products.push({
                            id: productId,
                            cost: parseFloat(cost.replace(',', '.')),
                            share: parseFloat(share.replace(',', '.'))
                        });
                    }
                }
            }
        }

        // Sortujemy po udziale w sprzedaży (malejąco)
        this.products.sort((a, b) => b.share - a.share);
        
        this.updatePreview();
    }

    updatePreview() {
        const previewSection = document.getElementById('previewSection');
        const outputSection = document.getElementById('outputSection');
        
        if (this.products.length > 0) {
            previewSection.style.display = 'block';
            outputSection.style.display = 'block';
            
            this.updateStats();
            this.updateTable();
        } else {
            previewSection.style.display = 'none';
            outputSection.style.display = 'none';
        }
    }

    updateStats() {
        const productCount = document.getElementById('productCount');
        const avgCost = document.getElementById('avgCost');
        const totalShare = document.getElementById('totalShare');
        
        productCount.textContent = this.products.length;
        
        if (this.products.length > 0) {
            const avgCostValue = this.products.reduce((sum, product) => sum + product.cost, 0) / this.products.length;
            avgCost.textContent = avgCostValue.toFixed(2) + '%';
            
            const totalShareValue = this.products.reduce((sum, product) => sum + product.share, 0);
            totalShare.textContent = totalShareValue.toFixed(1) + '%';
        } else {
            avgCost.textContent = '0%';
            totalShare.textContent = '0%';
        }
    }

    updateTable() {
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';
        
        this.products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.cost.toFixed(2)}%</td>
                <td>${product.share.toFixed(1)}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    generateMessage() {
        const date = document.getElementById('date').value;
        const clientName = document.getElementById('clientName').value;
        const presentationLink = document.getElementById('presentationLink').value;
        
        if (!date || !clientName) {
            this.showNotification('Wypełnij datę i nazwę klienta!', 'error');
            return;
        }
        
        if (this.products.length === 0) {
            this.showNotification('Brak danych do analizy!', 'error');
            return;
        }

        const dateObj = new Date(date);
        const monthName = dateObj.toLocaleDateString('pl-PL', { month: 'long' });
        const year = dateObj.getFullYear();
        
        let message = `Cześć! Poniżej przesyłam analizę marżowości i kosztów z ${monthName}.\n`;
        message += `W pierwszej kolejności są ID naszych produktów z Allegro oraz % kosztów jaki generuje oferta podczas sprzedaży.\n`;
        message += `Kolejnym punktem jest % obrotu jaki oferta wygenerowała w sprzedaży całkowitej od 1.${String(dateObj.getMonth() + 1).padStart(2, '0')} - ${String(dateObj.getDate()).padStart(2, '0')}.${year}\n\n`;
        message += `Analiza marżowości ofert (top ${Math.min(10, this.products.length)} ofert sprzedaży 1.${String(dateObj.getMonth() + 1).padStart(2, '0')} - ${String(dateObj.getDate()).padStart(2, '0')}.${year} - koszty sprzedaży, udział w porównaniu całkowitym)\n\n`;
        message += `${clientName} (id ofert):\n`;
        
        this.products.slice(0, 10).forEach(product => {
            message += `${product.id}\n`;
            message += `💰 koszt sprzedaży - ${product.cost.toFixed(2)} %\n`;
            message += `�� udział sprzedaży w porównaniu całej sprzedaży wygenerowanej - ${product.share.toFixed(1)} %\n\n`;
        });
        
        if (presentationLink) {
            message += `Na końcu znajdziesz link do prezentacji z analizą kosztów.\n`;
            message += presentationLink;
        }
        
        document.getElementById('generatedMessage').value = message;
        this.showNotification('Wiadomość wygenerowana!', 'success');
    }

    copyToClipboard() {
        const messageTextarea = document.getElementById('generatedMessage');
        messageTextarea.select();
        messageTextarea.setSelectionRange(0, 99999);
        
        try {
            document.execCommand('copy');
            this.showNotification('Skopiowano do schowka!', 'success');
        } catch (err) {
            // Fallback dla nowszych przeglądarek
            navigator.clipboard.writeText(messageTextarea.value).then(() => {
                this.showNotification('Skopiowano do schowka!', 'success');
            }).catch(() => {
                this.showNotification('Błąd kopiowania!', 'error');
            });
        }
    }

    editMessage() {
        const messageTextarea = document.getElementById('generatedMessage');
        messageTextarea.readOnly = false;
        messageTextarea.focus();
        
        const editBtn = document.querySelector('.btn-secondary');
        editBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz';
        editBtn.onclick = () => this.saveMessage();
    }

    saveMessage() {
        const messageTextarea = document.getElementById('generatedMessage');
        messageTextarea.readOnly = true;
        
        const editBtn = document.querySelector('.btn-secondary');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edytuj';
        editBtn.onclick = () => this.editMessage();
        
        this.showNotification('Wiadomość zapisana!', 'success');
    }

    clearData() {
        document.getElementById('tradeWatchData').value = '';
        document.getElementById('clientName').value = '';
        document.getElementById('presentationLink').value = '';
        document.getElementById('generatedMessage').value = '';
        
        this.products = [];
        this.updatePreview();
        
        this.showNotification('Dane wyczyszczone!', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Global functions
function generateMessage() {
    marginAnalyzer.generateMessage();
}

function copyToClipboard() {
    marginAnalyzer.copyToClipboard();
}

function editMessage() {
    marginAnalyzer.editMessage();
}

function clearData() {
    marginAnalyzer.clearData();
}

// Initialize
let marginAnalyzer;
document.addEventListener('DOMContentLoaded', () => {
    marginAnalyzer = new QSellMarginAnalyzer();
});
