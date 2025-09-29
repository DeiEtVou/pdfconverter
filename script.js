const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const convertBtn = document.getElementById('convertBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const imageCount = document.getElementById('imageCount');
const pdfNameInput = document.getElementById('pdfName');
const pageSizeSelect = document.getElementById('pageSize');
const orientationSelect = document.getElementById('orientation');
const imageQualitySelect = document.getElementById('imageQuality');
const textInput = document.getElementById('textInput');
const addTextBtn = document.getElementById('addTextBtn');
const contentList = document.getElementById('contentList');

let contentItems = []; // Array to store both text and images in order

// Click to upload
uploadArea.addEventListener('click', () => fileInput.click());

// Drag over effect
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

// Drag leave effect
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

// Drop files
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    handleFiles(files);
});

// File input change
fileInput.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
});

// Handle uploaded files
function handleFiles(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            contentItems.push({
                type: 'image',
                data: e.target.result,
                name: file.name
            });
            updateContentList();
            updateButtons();
            updateImageCount();
        };
        reader.readAsDataURL(file);
    });
}

// Add text block
addTextBtn.addEventListener('click', () => {
    const text = textInput.value.trim();
    if (text) {
        contentItems.push({
            type: 'text',
            content: text
        });
        textInput.value = '';
        updateContentList();
        updateButtons();
        updateImageCount();
    }
});

// Update content list display
function updateContentList() {
    contentList.innerHTML = '';
    
    contentItems.forEach((item, index) => {
        const contentItem = document.createElement('div');
        contentItem.className = `content-item ${item.type}-content`;
        
        if (item.type === 'text') {
            contentItem.innerHTML = `
                <span class="content-type">📝 Text</span>
                <div class="content-text">${item.content}</div>
                <div class="content-order">
                    ${index > 0 ? `<button class="order-btn" onclick="moveContent(${index}, -1)">⬆️ Up</button>` : ''}
                    ${index < contentItems.length - 1 ? `<button class="order-btn" onclick="moveContent(${index}, 1)">⬇️ Down</button>` : ''}
                </div>
                <button class="content-remove" onclick="removeContent(${index})">×</button>
            `;
        } else {
            contentItem.innerHTML = `
                <img src="${item.data}" class="content-image-thumb" alt="Image">
                <div style="flex: 1;">
                    <span class="content-type">🖼️ Image</span>
                    <div class="content-text">${item.name}</div>
                    <div class="content-order">
                        ${index > 0 ? `<button class="order-btn" onclick="moveContent(${index}, -1)">⬆️ Up</button>` : ''}
                        ${index < contentItems.length - 1 ? `<button class="order-btn" onclick="moveContent(${index}, 1)">⬇️ Down</button>` : ''}
                    </div>
                </div>
                <button class="content-remove" onclick="removeContent(${index})">×</button>
            `;
        }
        
        contentList.appendChild(contentItem);
    });
}

// Remove content item
window.removeContent = function(index) {
    contentItems.splice(index, 1);
    updateContentList();
    updateButtons();
    updateImageCount();
};

// Move content item up or down
window.moveContent = function(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < contentItems.length) {
        [contentItems[index], contentItems[newIndex]] = [contentItems[newIndex], contentItems[index]];
        updateContentList();
    }
};

// Update button states
function updateButtons() {
    const hasContent = contentItems.length > 0;
    convertBtn.disabled = !hasContent;
    clearBtn.disabled = !hasContent;
}

// Update image count display
function updateImageCount() {
    const imageCountNum = contentItems.filter(item => item.type === 'image').length;
    const textCount = contentItems.filter(item => item.type === 'text').length;
    
    const parts = [];
    if (imageCountNum > 0) parts.push(`${imageCountNum} image${imageCountNum > 1 ? 's' : ''}`);
    if (textCount > 0) parts.push(`${textCount} text block${textCount > 1 ? 's' : ''}`);
    
    if (parts.length > 0) {
        imageCount.textContent = parts.join(' & ') + ' 🎀';
    } else {
        imageCount.textContent = '';
    }
}

// Clear all content
clearBtn.addEventListener('click', () => {
    contentItems = [];
    updateContentList();
    updateButtons();
    updateImageCount();
    statusDiv.innerHTML = '<div class="status info">✨ All content cleared!</div>';
    setTimeout(() => {
        statusDiv.innerHTML = '';
    }, 2000);
});

// Convert to PDF with copyable text
convertBtn.addEventListener('click', async () => {
    if (contentItems.length === 0) return;

    try {
        statusDiv.innerHTML = '<div class="status info">💫 Converting to PDF...</div>';
        convertBtn.disabled = true;
        clearBtn.disabled = true;

        const { jsPDF } = window.jspdf;
        const pageSize = pageSizeSelect.value;
        const orientation = orientationSelect.value;
        const pdf = new jsPDF({
            orientation: orientation,
            unit: 'mm',
            format: pageSize
        });
        
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const usableWidth = pageWidth - (2 * margin);
        let currentY = margin;
        let isFirstPage = true;
        
        for (let i = 0; i < contentItems.length; i++) {
            const item = contentItems[i];
            
            if (item.type === 'text') {
                // Add text as actual selectable text
                pdf.setFontSize(12);
                pdf.setTextColor(0, 0, 0);
                
                const lines = pdf.splitTextToSize(item.content, usableWidth);
                const textHeight = lines.length * 7; // Approximate height
                
                // Check if we need a new page
                if (currentY + textHeight > pageHeight - margin && !isFirstPage) {
                    pdf.addPage();
                    currentY = margin;
                }
                
                pdf.text(lines, margin, currentY);
                currentY += textHeight + 10;
                isFirstPage = false;
                
            } else if (item.type === 'image') {
                // Add image
                const img = new Image();
                img.src = item.data;
                
                await new Promise((resolve) => {
                    img.onload = () => {
                        const imgRatio = img.width / img.height;
                        let imgWidth = usableWidth;
                        let imgHeight = imgWidth / imgRatio;
                        
                        // Scale down if too tall
                        if (imgHeight > pageHeight - (2 * margin)) {
                            imgHeight = pageHeight - (2 * margin);
                            imgWidth = imgHeight * imgRatio;
                        }
                        
                        // Check if we need a new page
                        if (currentY + imgHeight > pageHeight - margin && !isFirstPage) {
                            pdf.addPage();
                            currentY = margin;
                        }
                        
                        pdf.addImage(item.data, 'JPEG', margin, currentY, imgWidth, imgHeight);
                        currentY += imgHeight + 10;
                        isFirstPage = false;
                        resolve();
                    };
                });
            }
        }
        
        const pdfName = pdfNameInput.value.trim() || 'my-lovely-pdf';
        pdf.save(`${pdfName}.pdf`);
        statusDiv.innerHTML = '<div class="status success">💖 PDF created with copyable text! Download started! 💖</div>';
        
        setTimeout(() => {
            statusDiv.innerHTML = '';
        }, 4000);
        
    } catch (error) {
        console.error(error);
        statusDiv.innerHTML = '<div class="status error">😢 Error creating PDF. Please try again.</div>';
    } finally {
        convertBtn.disabled = false;
        clearBtn.disabled = false;
    }
});