// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- NEW: Dark Mode Logic ---
    const toggle = document.getElementById('dark-mode-toggle');
    const body = document.body;

    // Function to apply the saved theme
    function applyTheme(isDark) {
        if (isDark) {
            body.classList.add('dark-mode');
            toggle.checked = true;
        } else {
            body.classList.remove('dark-mode');
            toggle.checked = false;
        }
    }

    // Check localStorage for saved theme
    let savedTheme = localStorage.getItem('dark-mode');
    
    // If no theme is saved, check system preference
    if (savedTheme === null) {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark);
    } else {
        // Apply saved theme
        applyTheme(savedTheme === 'true');
    }

    // Event listener for the toggle
    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem('dark-mode', 'true');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem('dark-mode', 'false');
        }
    });
    
    // --- End of Dark Mode Logic ---


    // --- Get DOM Elements (Original) ---
    const uploaderSection = document.getElementById('uploader-section');
    const loadingSection = document.getElementById('loading-section');
    const resultSection = document.getElementById('result-section');

    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const browseBtn = document.getElementById('browse-btn');
    const fileNameDisplay = document.getElementById('file-name');
    const submitBtn = document.getElementById('submit-btn');

    const qrImage = document.getElementById('qr-image');
    const downloadBtn = document.getElementById('download-btn');
    const startOverBtn = document.getElementById('start-over-btn');

    let selectedFile = null;
    
    // --- Backend API URL ---
    const API_URL = 'http://localhost:3000/upload'; 

    // --- Functions to change UI states (FIXED LOGIC) ---
    function showUploader() {
        uploaderSection.style.display = 'block';
        loadingSection.style.display = 'none';
        resultSection.style.display = 'none';
        resetUploader();
    }

    function showLoading() {
        uploaderSection.style.display = 'none';
        loadingSection.style.display = 'flex'; // Use 'flex' to keep it centered
        resultSection.style.display = 'none';
    }

    function showResult(data) {
        uploaderSection.style.display = 'none';
        loadingSection.style.display = 'none';
        resultSection.style.display = 'block';

        qrImage.src = data.qrCodeDataUrl;
        downloadBtn.href = data.downloadUrl;
    }

    function resetUploader() {
        selectedFile = null;
        fileNameDisplay.textContent = '';
        submitBtn.disabled = true;
        uploadForm.reset();
    }

    // --- Event Listeners (No changes needed here) ---

    // Trigger file input when "Browse" button is clicked
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });

    // Handle drag-and-drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    // Handle file selection from "Browse"
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFile(file);
    });

    // Handle the selected file
    function handleFile(file) {
        if (file && file.type === 'application/pdf') {
            selectedFile = file;
            fileNameDisplay.textContent = file.name;
            submitBtn.disabled = false;
        } else {
            resetUploader();
            alert('Please select a valid PDF file.');
        }
    }

    // Handle form submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedFile) return;

        showLoading(); // This will now work correctly

        const formData = new FormData();
        formData.append('pdf', selectedFile);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'File upload failed');
            }

            const data = await response.json();
            showResult(data); // Show results on success

        } catch (error) {
            console.error('Error:', error);
            alert(`An error occurred: ${error.message}`);
            showUploader(); // Go back to uploader on error
        }
    });

    // Handle "Start Over" button
    startOverBtn.addEventListener('click', showUploader);

    // No need for the extra showUploader() at the end,
    // because the CSS now handles the default state.

});