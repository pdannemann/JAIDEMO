// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let lastGeminiInput = '';
let lastGeminiOutput = '';

// Loading bar functions
function showLoadingBar() {
    const bar = document.getElementById('loading-bar');
    bar.style.width = '0%';
    bar.style.display = 'block';
    setTimeout(() => bar.style.width = '90%', 50); // Quickly go to 90%
}

function completeLoadingBar() {
    const bar = document.getElementById('loading-bar');
    bar.style.width = '100%';
    setTimeout(() => {
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.display = 'none';
        }, 300);
    }, 200);
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize PDF upload handler
    const pdfUpload = document.getElementById('pdf-upload');
    if (!pdfUpload) {
        console.error('PDF upload element not found');
        return;
    }

    pdfUpload.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            showLoadingBar();
            console.log('Processing PDF:', file.name); // Debug log
            
            // Read the PDF file
            const arrayBuffer = await file.arrayBuffer();
            console.log('File loaded as ArrayBuffer'); // Debug log
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            console.log('PDF loaded, pages:', pdf.numPages); // Debug log
            
            // Extract text from all pages
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
                console.log(`Extracted text from page ${i}`); // Debug log
            }

            if (!fullText.trim()) {
                throw new Error('No text could be extracted from the PDF');
            }

            console.log('Extracted text:', fullText.substring(0, 100) + '...'); // Debug log

            // Show analysis screen and activate first step
            document.querySelector('.hero').style.display = 'none';
            document.querySelector('.analysis-screen').style.display = 'block';
            setTimeout(() => {
                document.querySelector('.analysis-screen').classList.add('visible');
                document.querySelectorAll('.step-box')[0].classList.add('active');
            }, 100);

            // Analyze with Gemini
            const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': 'AIzaSyB_M-3Kd51M7pZ4lZA40TL8vqptNIiAWOI'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Du bist ein Experte für deutsche Nebenkostenabrechnungen. Analysiere die folgende Abrechnung und erstelle eine detaillierte Prüfung. Gib das Ergebnis AUSSCHLIESSLICH als JSON-Objekt zurück.

WICHTIGE REGELN FÜR DIE ANALYSE:
1. Prüfe ALLE folgenden Aspekte:
   - Fristgerechte Erstellung (12 Monate nach Abrechnungszeitraum)
   - Einzelne Kostenpositionen auf Plausibilität
   - Verteilerschlüssel (z.B. nach Wohnfläche, Personenzahl)
   - Heizkostenverordnung (mind. 50% nach Verbrauch)
   - Umlagefähigkeit der Kosten nach BetrKV
   - Vorauszahlungen und deren Anrechnung
   - Formale Anforderungen (Unterschrift, Zustellung)

2. Für jeden Prüfpunkt:
   - Bei Rechtsverstößen oder kritischen Fehlern: status "red"
   - Bei Unklarheiten oder möglichen Problemen: status "yellow"
   - Bei korrekten Punkten: status "green"

3. Berechne für jeden Punkt mögliche Einsparungen in Euro
   - Bei Rechtsverstößen: geschätzte Reduzierung
   - Bei unklaren Positionen: potenzielle Einsparung
   - Bei korrekten Punkten: 0 Euro

Hier ist die zu analysierende Nebenkostenabrechnung:
${fullText}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        topK: 1,
                        topP: 0.1,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Gemini response:', data); // Debug log

            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (!textResponse) {
                throw new Error('Empty response from Gemini API');
            }

            // Try to find JSON in the response
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const analysis = JSON.parse(jsonMatch[0]);
            console.log('Parsed analysis:', analysis); // Debug log

            // Process results
            if (analysis && analysis.analysis) {
                // Hide steps and show results
                document.querySelectorAll('.step-box')[0].classList.remove('active');
                document.querySelector('.results-table').style.display = 'block';
                
                setTimeout(() => {
                    document.querySelector('.results-table').classList.add('visible');
                    
                    // Calculate total savings
                    const totalSavings = analysis.analysis.reduce((sum, item) => {
                        const savings = parseFloat(item.savings.toString().replace(/[^0-9.-]/g, ''));
                        return sum + (isNaN(savings) ? 0 : savings);
                    }, 0);
                    
                    document.querySelector('.total-savings .amount').textContent = `${totalSavings} €`;
                    
                    // Create result rows
                    const container = document.getElementById('results-container');
                    container.innerHTML = '';
                    
                    analysis.analysis.forEach((item, index) => {
                        const row = document.createElement('div');
                        row.className = `table-row ${item.status}`;
                        row.innerHTML = `
                            <div class="row-content">
                                <div class="row-info">
                                    <h3>${item.point}</h3>
                                    <p>${item.problem}</p>
                                </div>
                                <div class="row-savings">${item.savings}</div>
                            </div>
                        `;
                        
                        container.appendChild(row);
                        setTimeout(() => row.classList.add('visible'), index * 100);
                    });
                }, 300);
            }
            
            completeLoadingBar();
        } catch (error) {
            completeLoadingBar();
            console.error('Error processing PDF:', error);
            showErrorModal('PDF Verarbeitung fehlgeschlagen', error.message, lastGeminiInput, lastGeminiOutput);
        }
    });
});

// Error modal functions
function showErrorModal(title, message, geminiInput, geminiOutput) {
    document.getElementById('error-modal-overlay').classList.add('visible');
    document.getElementById('error-modal').classList.add('visible');
    document.getElementById('error-message').textContent = message;
    document.getElementById('gemini-input').textContent = geminiInput;
    document.getElementById('gemini-output').textContent = geminiOutput;
}

function closeErrorModal() {
    document.getElementById('error-modal-overlay').classList.remove('visible');
    document.getElementById('error-modal').classList.remove('visible');
}

// Copy functionality
function addCopyButton(element, text) {
    const header = document.createElement('div');
    header.className = 'section-header';
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-button';
    copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyButton.onclick = () => {
        navigator.clipboard.writeText(text);
        showCopyNotification();
    };
    header.appendChild(copyButton);
    element.parentNode.insertBefore(header, element);
}

function showCopyNotification() {
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.textContent = 'Copied to clipboard!';
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('visible'), 100);
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Add copy buttons to error modal sections
document.querySelectorAll('.error-modal-section pre').forEach(pre => {
    addCopyButton(pre, pre.textContent);
});