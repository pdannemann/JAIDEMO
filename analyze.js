// Loading bar functions
function showLoadingBar() {
    const bar = document.getElementById('loading-bar');
    if (bar) {
        bar.style.width = '0%';
        bar.style.display = 'block';
        setTimeout(() => bar.style.width = '90%', 50);
    }
}

function completeLoadingBar() {
    const bar = document.getElementById('loading-bar');
    if (bar) {
        bar.style.width = '100%';
        setTimeout(() => {
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.display = 'none';
            }, 300);
        }, 200);
    }
}

function updateLoadingStep(step) {
    document.querySelectorAll('.step').forEach((el, index) => {
        if (index < step - 1) {
            el.classList.remove('active');
            el.classList.add('completed');
        } else if (index === step - 1) {
            el.classList.add('active');
            el.classList.remove('completed');
        } else {
            el.classList.remove('active', 'completed');
        }
    });
}

async function reconstructPDFData() {
    try {
        const metadata = JSON.parse(sessionStorage.getItem('pdfMetadata'));
        if (!metadata) {
            throw new Error('Keine PDF-Metadaten gefunden');
        }

        let chunks = [];
        for (let i = 0; i < metadata.totalChunks; i++) {
            const chunk = sessionStorage.getItem(`pdfChunk_${i}`);
            if (!chunk) {
                throw new Error(`Fehlender PDF-Teil ${i}`);
            }
            chunks.push(chunk);
        }

        return chunks[0];  // Return first chunk which contains the complete data URL
    } catch (error) {
        throw new Error(`PDF-Daten konnten nicht wiederhergestellt werden: ${error.message}`);
    }
}

async function analyzePDF() {
    let currentStep = 1;
    
    try {
        showLoadingBar();
        
        // Step 1: Load PDF
        updateLoadingStep(currentStep);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Animation delay
        
        let pdfData;
        try {
            pdfData = await reconstructPDFData();
        } catch (error) {
            throw new Error(`PDF Daten konnten nicht geladen werden: ${error.message}`);
        }

        // Step 2: Extract Text
        currentStep = 2;
        updateLoadingStep(currentStep);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Animation delay
        
        let fullText = '';
        try {
            const loadingTask = pdfjsLib.getDocument(pdfData);
            const pdf = await loadingTask.promise;
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
        } catch (error) {
            throw new Error('Text konnte nicht aus dem PDF extrahiert werden: ' + error.message);
        }

        if (!fullText.trim()) {
            throw new Error('Kein Text im PDF gefunden. Bitte stellen Sie sicher, dass das PDF Text enthält und nicht nur gescannte Bilder.');
        }

        // Step 3: Legal Analysis
        currentStep = 3;
        updateLoadingStep(currentStep);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Animation delay

        // Step 4: Cost Analysis
        currentStep = 4;
        updateLoadingStep(currentStep);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Animation delay

        try {
            const { geminiClient } = await import('./src/geminiClient.js');
            const analysisResult = await geminiClient.analyze(fullText);

            if (!analysisResult) {
                throw new Error('Keine Antwort von der KI erhalten');
            }

            // Store the raw text for debugging
            sessionStorage.setItem('geminiInput', fullText);
            sessionStorage.setItem('geminiOutput', analysisResult);

            // Validate JSON structure
            let analysis;
            try {
                analysis = JSON.parse(analysisResult);
                if (!analysis.totalSavings || !Array.isArray(analysis.analysis)) {
                    throw new Error('Ungültiges Analyseergebnis Format');
                }
            } catch (error) {
                throw new Error('Fehler beim Verarbeiten der Analyse: ' + error.message);
            }

            // Store the validated analysis
            sessionStorage.setItem('analysisResult', analysisResult);
            window.location.href = 'report.html';

        } catch (error) {
            throw new Error('Analyse konnte nicht durchgeführt werden: ' + error.message);
        }

    } catch (error) {
        console.error('Analysefehler:', error);
        sessionStorage.setItem('analysisError', error.message);
        sessionStorage.setItem('lastStep', currentStep.toString());
        window.location.href = 'report.html';
    } finally {
        try {
            const metadata = JSON.parse(sessionStorage.getItem('pdfMetadata'));
            if (metadata) {
                for (let i = 0; i < metadata.totalChunks; i++) {
                    sessionStorage.removeItem(`pdfChunk_${i}`);
                }
                sessionStorage.removeItem('pdfMetadata');
            }
        } catch (error) {
            console.error('PDF-Daten konnten nicht gelöscht werden:', error);
        }
        completeLoadingBar();
    }
}

// Start analysis when page loads
document.addEventListener('DOMContentLoaded', analyzePDF);